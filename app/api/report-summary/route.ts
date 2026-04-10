import { NextRequest, NextResponse } from 'next/server'

function compactPrimaryResultsForPrompt(primaryResults: unknown[]): string {
  const rows = (primaryResults || []).filter((r: any) => {
    const c = r?.category
    return !c || c === 'primary'
  })

  return rows
    .map((r: any) => {
      const parts = [
        `리포트순서=${r.reportOrder ?? 'N/A'}`,
        `국가=${r.country ?? 'N/A'}`,
        `KPI=${r.kpiName ?? 'N/A'}`,
        `세그먼트=${r.device ?? r.segment ?? 'N/A'}`,
      ]
      if (r.errorMessage) {
        parts.push(`오류=${r.errorMessage}`)
        return parts.join(' | ')
      }
      if (Array.isArray(r.variations) && r.variations.length > 0) {
        const vtxt = r.variations
          .map((v: any) => {
            const u = v.uplift != null ? `${Number(v.uplift).toFixed(2)}%` : 'N/A'
            const conf = v.confidence != null ? `${Number(v.confidence).toFixed(1)}%` : '-'
            return `Var${v.variationNum}: uplift ${u}, verdict=${v.verdict ?? 'N/A'}, confidence=${conf}`
          })
          .join('; ')
        parts.push(vtxt)
      } else {
        const u = r.uplift != null ? `${Number(r.uplift).toFixed(2)}%` : 'N/A'
        const conf = r.confidence != null ? `${Number(r.confidence).toFixed(1)}%` : '-'
        parts.push(`uplift=${u}, verdict=${r.verdict ?? 'N/A'}, confidence=${conf}`)
      }
      return parts.join(' | ')
    })
    .join('\n')
}

function escapeControlCharsInsideJsonStrings(input: string): string {
  // Gemini가 JSON 문자열 내부에 실제 개행/탭 문자를 넣어 JSON.parse가 깨지는 케이스 보정
  let out = ''
  let inString = false
  let escaping = false

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]
    if (!inString) {
      if (ch === '"') {
        inString = true
        out += ch
        continue
      }
      out += ch
      continue
    }

    // inString === true
    if (escaping) {
      out += ch
      escaping = false
      continue
    }
    if (ch === '\\') {
      out += ch
      escaping = true
      continue
    }
    if (ch === '"') {
      inString = false
      out += ch
      continue
    }
    if (ch === '\n') {
      out += '\\n'
      continue
    }
    if (ch === '\r') {
      // drop or normalize
      continue
    }
    if (ch === '\t') {
      out += '\\t'
      continue
    }
    out += ch
  }

  return out
}

function parseSummaryJson(text: string): { abTestSummary: string; abTestResults: string } | null {
  let jsonText = text.trim()
  jsonText = jsonText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const start = jsonText.indexOf('{')
  const end = jsonText.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  jsonText = jsonText.slice(start, end + 1)
  const candidates = [jsonText, escapeControlCharsInsideJsonStrings(jsonText)]

  for (const c of candidates) {
    try {
      const obj = JSON.parse(c)
      if (typeof obj.abTestSummary === 'string' && typeof obj.abTestResults === 'string') {
        return { abTestSummary: obj.abTestSummary.trim(), abTestResults: obj.abTestResults.trim() }
      }
    } catch {
      // try next
    }
  }
  return null
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function callGeminiWithFallback(
  apiKey: string,
  modelCandidates: string[],
  prompt: string
): Promise<{ ok: true; raw: string } | { ok: false; status?: number; reason: string }> {
  const tried: string[] = []

  for (const model of modelCandidates) {
    // 혼잡(503) 대비: 모델당 최대 2회 재시도
    for (let attempt = 0; attempt < 2; attempt += 1) {
      tried.push(`${model}#${attempt + 1}`)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.25,
              maxOutputTokens: 2048,
            },
          }),
        }
      )

      if (response.ok) {
        const result = await response.json()
        const raw =
          result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
          result.candidates?.[0]?.content?.parts
            ?.map((p: { text?: string }) => p.text)
            .join('')
            ?.trim()
        if (raw) return { ok: true, raw }
        return { ok: false, reason: '모델 응답이 비어 있습니다.' }
      }

      const errText = await response.text()
      console.error(`Gemini report-summary error (${model}, try ${attempt + 1}):`, errText)
      const isTemporary = response.status === 429 || response.status === 500 || response.status === 503
      if (isTemporary && attempt === 0) {
        await sleep(700)
        continue
      }
      break
    }
  }

  return {
    ok: false,
    status: 502,
    reason: `Gemini API 혼잡/오류로 요약 생성에 실패했습니다. (시도: ${tried.join(', ')})`,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const scenario = typeof body.scenario === 'string' ? body.scenario.trim() : ''
    const primaryResults = Array.isArray(body.primaryResults) ? body.primaryResults : []

    if (!scenario) {
      return NextResponse.json({ error: '시나리오를 한 줄 입력해 주세요.' }, { status: 400 })
    }
    if (primaryResults.length === 0) {
      return NextResponse.json({ error: 'Primary KPI 분석 결과가 없습니다.' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' }, { status: 500 })
    }

    let modelCandidates = ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-pro']
    try {
      const listResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      )
      if (listResponse.ok) {
        const modelsData = await listResponse.json()
        if (modelsData.models) {
          const supported = modelsData.models
            .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: any) => m.name.replace('models/', ''))
          if (supported.length > 0) {
            const preferred = [
              'gemini-2.0-flash',
              'gemini-2.0-flash-001',
              'gemini-2.0-flash-lite-001',
              'gemini-1.5-flash-latest',
              'gemini-1.5-pro-latest',
              'gemini-pro',
            ]
            const ordered = preferred.filter((p) => supported.includes(p))
            const extras = supported.filter((s: string) => !ordered.includes(s))
            modelCandidates = [...ordered, ...extras].slice(0, 6)
          }
        }
      }
    } catch {
      // keep default
    }

    const dataBlock = compactPrimaryResultsForPrompt(primaryResults)
    if (!dataBlock.trim()) {
      return NextResponse.json(
        { error: 'Primary KPI 행이 없어 요약을 만들 수 없습니다.' },
        { status: 400 }
      )
    }

    const prompt = `당신은 A/B 테스트 리포트용 요약 작성자입니다. 아래 분석 데이터에 없는 수치·판정·세그먼트는 절대 만들지 마세요.

## 사용자가 입력한 테스트 시나리오 (한 줄)
${scenario}

## Primary KPI 분석 행 (리포트 순서, 국가, KPI, 세그먼트별. 세그먼트에는 All Visits, 방문 횟수·첫방문·재방문, 디바이스 MO/PC 등이 올 수 있음)
${dataBlock}

## 말투·형식 (반드시 이 스타일을 따를 것)

### "abTestSummary" (화면 제목: AB 테스트 결과 요약)
- **첫 줄**: 시나리오(변경 내용) + Primary KPI들을 한 문장으로 묶어 결론을 씀. "~에 따른 [KPI1] 및 [KPI2] 영향 없음" / "~ 유의미한 변화 없음" 처럼 간결한 보고체.
- **둘째 줄(선택)**: 세그먼트가 데이터에 있으면, 첫 줄 다음에 줄바꿈 후 공백 3칸 + "- " 로 한 줄만 더 써도 됨. 예: "   - 방문 횟수별/디바이스별 모두 그룹간 차이 없음"
- 이모지·따옴표 없이 한국어만.

### "abTestResults" (화면 제목: AB 테스트 결과)
- **Primary KPI마다** 아래 패턴을 따름 (데이터에 있는 KPI·세그먼트만).
- KPI별 첫 줄을 반드시 "- KPI 명: 결과" 형식으로 작성.
  - 예: "- Cart CVR: 차이 없음"
  - 결과는 "차이 없음", "Variation 우세", "Control 우세", "모수 부족" 등 verdict 기반으로 작성.
- KPI별 두 번째 줄부터는 반드시 공백 3칸 + "- " 로 시작하는 상세 줄 작성.
  - 예: "   - 방문 횟수별: 첫 방문 차이 없음, 재방문 모수 부족"
  - 예: "   - 디바이스별: MO 차이 없음, PC 차이 없음"
- KPI가 여러 개면 위 2줄 패턴을 KPI 개수만큼 반복 (KPI 블록 사이 빈 줄 1줄 허용).

## JSON 출력
- **JSON 한 덩어리만** 출력. 마크다운 코드 블록 금지.
- 키: "abTestSummary", "abTestResults" 만 사용.
- 들여쓰기는 탭 대신 공백 사용 권장.

응답 형식 예:
{"abTestSummary":"Promotion Banner 노출 순서 변경에 따른 Cart CVR 및 배너 클릭률 영향 없음\\n   - 방문 횟수별/디바이스별 모두 그룹간 차이 없음","abTestResults":"- Cart CVR: 차이 없음\\n   - 방문 횟수별: 첫 방문 차이 없음, 재방문 그룹별 모수 다소 부족하나 차이 없음 트렌드\\n\\n- Banner CTR: 차이 없음\\n   - 디바이스별: MO 차이 없음, PC 차이 없음"}`

    const geminiResult = await callGeminiWithFallback(apiKey, modelCandidates, prompt)
    if (!geminiResult.ok) {
      // Gemini 사용이 어려우면 빈칸으로 반환 + 상태 전달
      return NextResponse.json({ abTestSummary: '', abTestResults: '', aiStatus: 'unavailable' })
    }

    const raw = geminiResult.raw
    const parsed = parseSummaryJson(raw)
    if (!parsed) {
      console.error('report-summary parse fail, raw:', raw.slice(0, 500))
      // 파싱 실패 시에도 빈칸으로 반환
      return NextResponse.json({ abTestSummary: '', abTestResults: '', aiStatus: 'unavailable' })
    }

    return NextResponse.json({ ...parsed, aiStatus: 'ok' })
  } catch (e) {
    console.error('report-summary route:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
