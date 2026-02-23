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
  onKPIUpdate: (index: number, field: keyof KPIConfig, value: string) => void
  onKPIAdd: () => void
  onKPIRemove: (index: number) => void
  onUseAIToggle: (value: boolean) => void
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
  onKPIUpdate,
  onKPIAdd,
  onKPIRemove,
  onUseAIToggle,
  onPrevious,
  onAnalyze,
}: KPISetupSectionProps) {
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
      
      {kpis.map((kpi, index) => (
        <div key={index} className="kpi-item">
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
              placeholder="예: Cart CVR"
            />
          </div>
          
          <div className="form-group">
            <label>분자 (Numerator)</label>
            {availableMetrics.length > 0 ? (
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  list={`numerator-list-${index}`}
                  value={kpi.numerator}
                  onChange={(e) => onKPIUpdate(index, 'numerator', e.target.value)}
                  placeholder="검색하거나 선택하세요..."
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                />
                <datalist id={`numerator-list-${index}`}>
                  {availableMetrics.map((metric, idx) => (
                    <option key={idx} value={metric}>{metric}</option>
                  ))}
                </datalist>
              </div>
            ) : (
              <input
                type="text"
                value={kpi.numerator}
                onChange={(e) => onKPIUpdate(index, 'numerator', e.target.value)}
                placeholder="예: Add To Cart"
              />
            )}
          </div>
          
          <div className="form-group">
            <label>분모 (Denominator)</label>
            {availableMetrics.length > 0 ? (
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  list={`denominator-list-${index}`}
                  value={kpi.denominator}
                  onChange={(e) => onKPIUpdate(index, 'denominator', e.target.value)}
                  placeholder="검색하거나 선택하세요... (선택사항)"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                />
                <datalist id={`denominator-list-${index}`}>
                  {availableMetrics.map((metric, idx) => (
                    <option key={idx} value={metric}>{metric}</option>
                  ))}
                </datalist>
              </div>
            ) : (
              <input
                type="text"
                value={kpi.denominator}
                onChange={(e) => onKPIUpdate(index, 'denominator', e.target.value)}
                placeholder="예: Visits (선택사항)"
              />
            )}
          </div>
          
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
              <option value="rpv">RPV (Revenue per Visit)</option>
            </select>
          </div>
          
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


