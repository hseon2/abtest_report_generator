'use client'

import React from 'react'
import { KPIConfig } from '../../types'

interface KPISetupSectionProps {
  kpis: KPIConfig[]
  availableMetrics: string[]
  useAI: boolean
  pendingFilesCount: number
  loading: boolean
  hasConfirmedFiles: boolean
  /**
   * 현재 선택된 KPI 입력 위치(분자/분모). 행 클릭 시 이 위치에 값이 들어갑니다.
   */
  activeKpiInput?: { index: number; field: 'numerator' | 'denominator' }
  onKPIUpdate: (index: number, field: keyof KPIConfig, value: string) => void
  onKPIAdd: () => void
  onKPIRemove: (index: number) => void
  onUseAIToggle: (value: boolean) => void
  onKpiInputFocus?: (index: number, field: 'numerator' | 'denominator') => void
  onPrevious: () => void
  onAnalyze: () => void
}

export function KPISetupSection({
  kpis,
  availableMetrics,
  useAI,
  pendingFilesCount,
  loading,
  hasConfirmedFiles,
  activeKpiInput,
  onKPIUpdate,
  onKPIAdd,
  onKPIRemove,
  onUseAIToggle,
  onKpiInputFocus,
  onPrevious,
  onAnalyze,
}: KPISetupSectionProps) {
  const isActive = (index: number, field: 'numerator' | 'denominator') =>
    !!activeKpiInput && activeKpiInput.index === index && activeKpiInput.field === field

  const getRowSelectInputStyle = (active: boolean, hasValue: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '10px 36px 10px 12px',
    border: active ? '2px solid #3498db' : '1.5px dashed #b0bec5',
    borderRadius: '6px',
    fontSize: '13px',
    backgroundColor: active ? '#eaf3ff' : hasValue ? '#ffffff' : '#fafbfc',
    color: hasValue ? '#2c3e50' : '#95a5a6',
    cursor: 'pointer',
    boxShadow: active ? '0 0 0 3px rgba(52, 152, 219, 0.15)' : 'none',
    transition: 'all 0.15s ease',
    caretColor: 'transparent',
    outline: 'none',
  })

  return (
    <>
      {pendingFilesCount > 0 && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '4px',
          marginBottom: '15px',
          fontSize: '13px',
          color: '#856404'
        }}>
          ⚠️ 설정 중인 파일이 {pendingFilesCount}개 있습니다. 저장 버튼을 눌러 확정해주세요.
        </div>
      )}

      {/* 행 클릭 안내 배너 */}
      <div style={{
        padding: '12px 14px',
        backgroundColor: '#e8f4fd',
        border: '1px solid #b6dcfa',
        borderRadius: '6px',
        marginBottom: '16px',
        fontSize: '13px',
        color: '#1a5a8a',
        lineHeight: 1.6,
      }}>
        <div style={{ fontWeight: 700, marginBottom: '4px' }}>
          👉 분자/분모는 <span style={{ textDecoration: 'underline' }}>오른쪽 미리보기 표의 행을 클릭</span>해서 입력하세요.
        </div>
        <div style={{ color: '#3a6a8a', fontSize: '12px' }}>
          입력란을 클릭하면 어디로 값이 들어갈지 표시됩니다. 입력란에 직접 타이핑은 지원하지 않습니다.
        </div>
      </div>

      {kpis.map((kpi, index) => (
        <div key={index} className="kpi-item">
          <div className="form-group">
            <label>KPI 타입</label>
            <select
              value={kpi.type}
              onChange={(e) => onKPIUpdate(index, 'type', e.target.value)}
            >
              <option value="rate">Rate (비율)</option>
              <option value="simple">Simple (단순 메트릭)</option>
              <option value="variation_only">Variation Only (Variation만 계산)</option>
              <option value="revenue">Revenue</option>
              <option value="aop">AOP (Average Order Price)</option>
            </select>
          </div>
          
          {(kpi.type === 'revenue' || kpi.type === 'aop') && (
            <div className="form-group">
              <label>환율 (현지통화 1 USD = ?)</label>
              <input
                type="text"
                value={kpi.exchangeRate || ''}
                onChange={(e) => onKPIUpdate(index, 'exchangeRate', e.target.value)}
                placeholder="예: 1300"
              />
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#7f8c8d' }}>
                입력값을 기준으로 USD 환산: <strong>USD = 현지통화 / 환율</strong>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>카테고리</label>
            <select
              value={kpi.category || 'primary'}
              onChange={(e) => onKPIUpdate(index, 'category', e.target.value)}
            >
              <option value="primary">Primary KPI</option>
              <option value="secondary">Secondary KPI</option>
              <option value="additional">Additional Data</option>
            </select>
          </div>

          <div className="form-group">
            <label>KPI 이름</label>
            <input
              type="text"
              value={kpi.name}
              onChange={(e) => onKPIUpdate(index, 'name', e.target.value)}
              placeholder="예: Revenue (purchase event)"
            />
          </div>
          
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>분자 (Numerator)</span>
              {isActive(index, 'numerator') && (
                <span style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  backgroundColor: '#3498db',
                  color: 'white',
                  fontWeight: 600,
                }}>
                  ← 행 클릭 대기 중
                </span>
              )}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={kpi.numerator}
                readOnly
                onMouseDown={(e) => {
                  e.preventDefault()
                  onKpiInputFocus?.(index, 'numerator')
                  ;(e.currentTarget as HTMLInputElement).blur()
                }}
                onKeyDown={(e) => e.preventDefault()}
                placeholder={
                  isActive(index, 'numerator')
                    ? '오른쪽 미리보기의 행을 클릭해 선택하세요'
                    : '클릭 후, 오른쪽 미리보기에서 행을 선택하세요'
                }
                aria-label="분자 (행 클릭으로 선택)"
                style={getRowSelectInputStyle(isActive(index, 'numerator'), !!kpi.numerator)}
              />
              {kpi.numerator && (
                <button
                  type="button"
                  onClick={() => onKPIUpdate(index, 'numerator', '')}
                  title="선택 해제"
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: 'transparent',
                    color: '#7f8c8d',
                    cursor: 'pointer',
                    fontSize: '16px',
                    lineHeight: 1,
                    padding: '2px 6px',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {kpi.type !== 'revenue' && (
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>분모 (Denominator){kpi.type === 'aop' ? '' : ' (선택사항)'}</span>
                {isActive(index, 'denominator') && (
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: '#3498db',
                    color: 'white',
                    fontWeight: 600,
                  }}>
                    ← 행 클릭 대기 중
                  </span>
                )}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={kpi.denominator}
                  readOnly
                  onMouseDown={(e) => {
                    e.preventDefault()
                    onKpiInputFocus?.(index, 'denominator')
                    ;(e.currentTarget as HTMLInputElement).blur()
                  }}
                  onKeyDown={(e) => e.preventDefault()}
                  placeholder={
                    isActive(index, 'denominator')
                      ? '오른쪽 미리보기의 행을 클릭해 선택하세요'
                      : '클릭 후, 오른쪽 미리보기에서 행을 선택하세요'
                  }
                  aria-label="분모 (행 클릭으로 선택)"
                  style={getRowSelectInputStyle(isActive(index, 'denominator'), !!kpi.denominator)}
                />
                {kpi.denominator && (
                  <button
                    type="button"
                    onClick={() => onKPIUpdate(index, 'denominator', '')}
                    title="선택 해제"
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'transparent',
                      color: '#7f8c8d',
                      cursor: 'pointer',
                      fontSize: '16px',
                      lineHeight: 1,
                      padding: '2px 6px',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}

          {index > 0 && (
            <button
              type="button"
              onClick={() => onKPIRemove(index)}
              style={{
                marginTop: '8px',
                padding: '6px 12px',
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              KPI 제거
            </button>
          )}
        </div>
      ))}
      
      <button
        type="button"
        onClick={onKPIAdd}
        style={{
          padding: '10px 16px',
          backgroundColor: '#3498db',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '600',
          marginTop: '10px',
          marginBottom: '20px'
        }}
      >
        + KPI 추가
      </button>
      
      <div className="form-group" style={{ marginTop: '20px', marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={useAI}
            onChange={(e) => onUseAIToggle(e.target.checked)}
            style={{ width: 'auto', cursor: 'pointer' }}
          />
          <span>AI 인사이트 생성 (Gemini API)</span>
        </label>
      </div>
      
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
        <button
          type="button"
          onClick={onPrevious}
          style={{
            padding: '12px 24px',
            backgroundColor: '#95a5a6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          ← 이전
        </button>
        <button
          type="button"
          onClick={onAnalyze}
          disabled={loading || !hasConfirmedFiles}
          style={{
            padding: '12px 24px',
            backgroundColor: loading || !hasConfirmedFiles ? '#95a5a6' : '#27ae60',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading || !hasConfirmedFiles ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          {loading ? '분석 중...' : '분석 시작'}
        </button>
      </div>
    </>
  )
}


