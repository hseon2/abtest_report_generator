import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()
    
    if (!text) {
      return NextResponse.json({ error: '텍스트가 없습니다.' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      console.warn('GEMINI_API_KEY가 설정되지 않았습니다.')
      return NextResponse.json({ 
        error: 'GEMINI_API_KEY가 설정되지 않았습니다.',
        rawText: text 
      }, { status: 500 })
    }

    // 먼저 사용 가능한 모델 목록 조회
    console.log('📋 사용 가능한 모델 목록 조회 중...')
    const listModelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    
    let modelToUse = 'gemini-pro' // 기본값
    
    try {
      const listResponse = await fetch(listModelsUrl)
      
      if (listResponse.ok) {
        const modelsData = await listResponse.json()
        if (modelsData.models) {
          // generateContent를 지원하는 모델 찾기
          const supportedModels = modelsData.models
            .filter((model: any) => 
              model.supportedGenerationMethods?.includes('generateContent')
            )
            .map((model: any) => model.name.replace('models/', ''))
          
          console.log('✅ 사용 가능한 모델:', supportedModels.slice(0, 5))
          
          if (supportedModels.length > 0) {
            modelToUse = supportedModels[0]
          }
        }
      }
    } catch (error) {
      console.error('모델 목록 조회 실패, 기본 모델 사용:', error)
    }

    console.log(`📡 선택된 모델: ${modelToUse}`)

    // Gemini API로 날짜 파싱
    const prompt = `다음 텍스트에서 데이터 기간(날짜 범위)을 추출해주세요. 
텍스트: "${text}"

응답 형식을 반드시 JSON으로만 제공하고, 다른 설명은 포함하지 마세요:
{
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "displayText": "사용자에게 보여줄 간단한 텍스트"
}

예시:
- "Data: 2024-01-01 ~ 2024-01-31" → {"startDate": "2024-01-01", "endDate": "2024-01-31", "displayText": "2024-01-01 ~ 2024-01-31"}
- "# Date: Jan 22, 2026 - Jan 29, 2026" → {"startDate": "2026-01-22", "endDate": "2026-01-29", "displayText": "2026-01-22 ~ 2026-01-29"}
- "테스트 기간: 1월 1일 - 1월 31일 (2024)" → {"startDate": "2024-01-01", "endDate": "2024-01-31", "displayText": "2024-01-01 ~ 2024-01-31"}
- "2024.1.1-2024.1.31" → {"startDate": "2024-01-01", "endDate": "2024-01-31", "displayText": "2024-01-01 ~ 2024-01-31"}

날짜를 찾을 수 없으면 null을 반환하세요.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024, // 256 → 1024로 증가
          }
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Gemini API 오류 (${modelToUse}):`, errorText)
      return NextResponse.json({ 
        error: 'Gemini API 호출 실패',
        rawText: text 
      }, { status: 500 })
    }

    const result = await response.json()

    if (result.candidates && result.candidates[0]?.content?.parts?.[0]?.text) {
      const geminiText = result.candidates[0].content.parts[0].text.trim()
      
      console.log('📄 Gemini 원본 응답:', geminiText)
      
      // JSON 파싱 시도
      try {
        // 마크다운 코드 블록 제거 (더 강력한 방식)
        let jsonText = geminiText
        
        // ```json ... ``` 형태 제거
        jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '')
        
        // 앞뒤 공백 제거
        jsonText = jsonText.trim()
        
        // JSON 시작/끝 찾기 (혹시 다른 텍스트가 있을 경우 대비)
        const jsonStart = jsonText.indexOf('{')
        const jsonEnd = jsonText.lastIndexOf('}')
        
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          jsonText = jsonText.substring(jsonStart, jsonEnd + 1)
        }
        
        console.log('🔧 정제된 JSON:', jsonText)
        
        const parsed = JSON.parse(jsonText)
        
        console.log(`✅ 날짜 파싱 성공:`, parsed)
        
        return NextResponse.json({
          success: true,
          dateRange: parsed,
          rawText: text
        })
      } catch (parseError) {
        console.error('JSON 파싱 오류:', parseError)
        console.error('원본 응답:', geminiText)
        return NextResponse.json({
          success: false,
          error: 'JSON 파싱 실패',
          rawText: text,
          geminiResponse: geminiText
        })
      }
    }

    return NextResponse.json({ 
      error: '날짜 파싱 실패',
      rawText: text 
    }, { status: 500 })

  } catch (error) {
    console.error('날짜 파싱 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

