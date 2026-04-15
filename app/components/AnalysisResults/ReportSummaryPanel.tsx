'use client'

import React, { useEffect, useMemo, useState } from 'react'

interface ReportSummaryPanelProps {
  primaryResults: any[]
  summaryResetToken?: number
  onSummarySave?: (data: { testTitle: string; abTestSummary: string; abTestResults: string }) => void
}

export function ReportSummaryPanel({ primaryResults, summaryResetToken, onSummarySave }: ReportSummaryPanelProps) {
  const [testTitle, setTestTitle] = useState('')
  const [scenario, setScenario] = useState('')
  const [abTestSummary, setAbTestSummary] = useState<string>('')
  const [abTestResults, setAbTestResults] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [aiStatus, setAiStatus] = useState<'idle' | 'ok' | 'unavailable'>('idle')
  const [editMode, setEditMode] = useState(false)
  const [beforeEdit, setBeforeEdit] = useState<{ abTestSummary: string; abTestResults: string } | null>(null)
  const [previousSignature, setPreviousSignature] = useState<string>('')

  const storageKey = useMemo(() => {
    try {
      const signature = (primaryResults || [])
        .map((r: any) => `${r.reportOrder ?? ''}|${r.country ?? ''}|${r.kpiName ?? ''}|${r.device ?? r.segment ?? ''}|${r.verdict ?? ''}`)
        .join('||')
        .slice(0, 4000)
      const scenarioPart = scenario.trim().slice(0, 200)
      return `abtest_report_summary::v1::${scenarioPart}::${signature.length}::${signature}`
    } catch {
      return `abtest_report_summary::v1::${scenario.trim().slice(0, 200)}`
    }
  }, [primaryResults, scenario])

  const analysisSignature = useMemo(() => {
    return (primaryResults || [])
      .map((r: any) => `${r.reportOrder ?? ''}|${r.country ?? ''}|${r.kpiName ?? ''}|${r.device ?? r.segment ?? ''}|${r.verdict ?? ''}|${r.uplift ?? ''}`)
      .join('||')
      .slice(0, 4000)
  }, [primaryResults])

  useEffect(() => {
    // scenario가 바뀌거나 결과가 바뀌었을 때 저장된 내용이 있으면 자동 로드
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as { testTitle?: string; abTestSummary?: string; abTestResults?: string; savedAt?: number }
      if (typeof parsed.testTitle === 'string') setTestTitle(parsed.testTitle)
      if (typeof parsed.abTestSummary === 'string') setAbTestSummary(parsed.abTestSummary)
      if (typeof parsed.abTestResults === 'string') setAbTestResults(parsed.abTestResults)
      if (typeof parsed.savedAt === 'number') setSavedAt(parsed.savedAt)
      setHasGenerated(true)
      setAiStatus('idle')
      setEditMode(false)
    } catch {
      // ignore
    }
  }, [storageKey])

  useEffect(() => {
    if (!summaryResetToken) return
    setTestTitle('')
    setScenario('')
    setAbTestSummary('')
    setAbTestResults('')
    setHasGenerated(false)
    setSavedAt(null)
    setAiStatus('idle')
    setEditMode(false)
    setBeforeEdit(null)
    setError(null)
    setPreviousSignature('')

    try {
      const prefix = 'abtest_report_summary::v1::'
      const keysToDelete: string[] = []
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i)
        if (key && key.startsWith(prefix)) keysToDelete.push(key)
      }
      keysToDelete.forEach((k) => localStorage.removeItem(k))
    } catch {
      // ignore
    }
  }, [summaryResetToken])

  useEffect(() => {
    // 분석 결과가 새로 갱신되면 기존 저장/화면 요약 초기화
    if (!analysisSignature) return
    if (!previousSignature) {
      setPreviousSignature(analysisSignature)
      return
    }
    if (analysisSignature !== previousSignature) {
      setAbTestSummary('')
      setAbTestResults('')
      setHasGenerated(false)
      setSavedAt(null)
      setAiStatus('idle')
      setEditMode(false)
      setBeforeEdit(null)
      setError(null)
      setPreviousSignature(analysisSignature)
      // 이전 시나리오 기준 저장본도 정리
      try {
        if (scenario.trim()) {
          const oldPrefix = `abtest_report_summary::v1::${scenario.trim().slice(0, 200)}::`
          const keysToDelete: string[] = []
          for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i)
            if (key && key.startsWith(oldPrefix)) keysToDelete.push(key)
          }
          keysToDelete.forEach((k) => localStorage.removeItem(k))
        }
      } catch {
        // ignore
      }
      onSummarySave?.({ testTitle: '', abTestSummary: '', abTestResults: '' })
    }
  }, [analysisSignature, previousSignature, scenario, onSummarySave])

  useEffect(() => {
    // 다운로드 버튼이 최신 요약 텍스트를 즉시 참조하도록 부모 상태와 동기화
    onSummarySave?.({
      testTitle: testTitle.trim(),
      abTestSummary,
      abTestResults,
    })
  }, [testTitle, abTestSummary, abTestResults, onSummarySave])

  const handleGenerate = async () => {
    const trimmed = scenario.trim()
    if (!trimmed) {
      setError('시나리오를 한 줄 입력해 주세요.')
      return
    }
    if (!primaryResults.length) {
      setError('분석 결과가 없습니다.')
      return
    }

    setLoading(true)
    setError(null)
    setHasGenerated(false)
    setSavedAt(null)
    setAiStatus('idle')
    setEditMode(false)
    setBeforeEdit(null)
    try {
      const res = await fetch('/api/report-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: trimmed, primaryResults }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '요약 생성에 실패했습니다.')
      }
      setAbTestSummary(String(data.abTestSummary ?? ''))
      setAbTestResults(String(data.abTestResults ?? ''))
      setAiStatus(data.aiStatus === 'ok' ? 'ok' : 'unavailable')
      setHasGenerated(true)
    } catch (e: unknown) {
      setAbTestSummary('')
      setAbTestResults('')
      setError(e instanceof Error ? e.message : '요약 생성 중 오류가 발생했습니다.')
      setAiStatus('unavailable')
    } finally {
      setLoading(false)
    }
  }

  const normalizeSummaryText = (text: string) => {
    return (text || '')
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, '    ')
      .replace(/\u00a0/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^-\s*(.+?)\s+:\s+/gm, '- $1: ')
      .trim()
  }

  const normalizedSummary = normalizeSummaryText(abTestSummary)
  const normalizedResults = normalizeSummaryText(abTestResults)

  const handleSave = () => {
    try {
      const payload = {
        testTitle,
        abTestSummary,
        abTestResults,
        savedAt: Date.now(),
      }
      localStorage.setItem(storageKey, JSON.stringify(payload))
      setSavedAt(payload.savedAt)
      setHasGenerated(true)
      setEditMode(false)
      setBeforeEdit(null)
      onSummarySave?.({
        testTitle: testTitle.trim(),
        abTestSummary,
        abTestResults,
      })
    } catch {
      setError('저장에 실패했습니다. (브라우저 저장소 접근 불가)')
    }
  }

  const handleEdit = () => {
    setBeforeEdit({ abTestSummary, abTestResults })
    setEditMode(true)
  }

  const handleCancelEdit = () => {
    if (beforeEdit) {
      setAbTestSummary(beforeEdit.abTestSummary)
      setAbTestResults(beforeEdit.abTestResults)
    }
    setEditMode(false)
    setBeforeEdit(null)
  }

  const showAiUnavailable = hasGenerated && aiStatus === 'unavailable'

  return (
    <div className="report-summary-panel">
      <div className="report-summary-panel-title">분석 결과 요약</div>

      <div className="report-summary-field">
        <label className="report-summary-label" htmlFor="report-test-title">
          테스트명
        </label>
        <input
          id="report-test-title"
          type="text"
          className="report-summary-input"
          value={testTitle}
          onChange={(e) => setTestTitle(e.target.value)}
          placeholder="예: Promotion Banner Order Test"
          disabled={loading}
        />
      </div>

      <div className="report-summary-field">
        <label className="report-summary-label" htmlFor="report-scenario">
          테스트 시나리오
        </label>
        <input
          id="report-scenario"
          type="text"
          className="report-summary-input"
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          placeholder="예: Promotion Banner 노출 순서 변경"
          disabled={loading}
        />
      </div>

      <div className="report-summary-actions">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="report-summary-btn"
            onClick={handleGenerate}
            disabled={loading || !primaryResults.length}
          >
            {loading ? '요약 생성 중…' : '요약 생성'}
          </button>
          <button
            type="button"
            className="report-summary-btn"
            onClick={handleEdit}
            disabled={loading || !hasGenerated || editMode}
            style={{ backgroundColor: '#5d6d7e' }}
          >
            편집
          </button>
          <button
            type="button"
            className="report-summary-btn"
            onClick={handleSave}
            disabled={loading || !editMode}
            style={{ backgroundColor: '#27ae60' }}
          >
            저장
          </button>
          {editMode && (
            <button
              type="button"
              className="report-summary-btn"
              onClick={handleCancelEdit}
              disabled={loading}
              style={{ backgroundColor: '#95a5a6' }}
            >
              취소
            </button>
          )}
          {savedAt && (
            <span style={{ fontSize: '12px', color: '#2c3e50' }}>
              저장됨 ({new Date(savedAt).toLocaleString()})
            </span>
          )}
          {showAiUnavailable && (
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#856404',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeeba',
                padding: '4px 8px',
                borderRadius: '999px',
              }}
            >
              AI 요약 불가
            </span>
          )}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {hasGenerated && (
        <div className="report-summary-output">
          <div className="report-summary-output-block">
            <div className="report-summary-output-heading">AB 테스트 결과 요약</div>
            {editMode ? (
              <textarea
                className="report-summary-textarea"
                value={abTestSummary}
                onChange={(e) => setAbTestSummary(e.target.value)}
                placeholder={showAiUnavailable ? 'AI 요약 불가' : '요약이 비어 있습니다.'}
                rows={3}
                disabled={loading}
              />
            ) : (
              <div className="report-summary-output-body">
                {normalizedSummary || (showAiUnavailable ? 'AI 요약 불가' : '')}
              </div>
            )}
          </div>
          <div className="report-summary-output-block">
            <div className="report-summary-output-heading">AB 테스트 결과</div>
            {editMode ? (
              <textarea
                className="report-summary-textarea"
                value={abTestResults}
                onChange={(e) => setAbTestResults(e.target.value)}
                placeholder={showAiUnavailable ? 'AI 요약 불가' : '결과 요약이 비어 있습니다.'}
                rows={8}
                disabled={loading}
              />
            ) : (
              <div className="report-summary-output-body">
                {normalizedResults || (showAiUnavailable ? 'AI 요약 불가' : '')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
