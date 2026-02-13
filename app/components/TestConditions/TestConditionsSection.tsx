'use client'

import React from 'react'

interface TestConditionsSectionProps {
  variationCount: number
  segments: string[]
  pendingFilesCount: number
  onVariationCountChange: (count: number) => void
  onSegmentsChange: (segments: string[]) => void
  onPrevious: () => void
  onNext: () => void
}

export function TestConditionsSection({
  variationCount,
  segments,
  pendingFilesCount,
  onVariationCountChange,
  onSegmentsChange,
  onPrevious,
  onNext,
}: TestConditionsSectionProps) {
  const addSegment = () => {
    onSegmentsChange([...segments, ''])
  }

  const removeSegment = (index: number) => {
    if (segments.length > 1) {
      onSegmentsChange(segments.filter((_, i) => i !== index))
    }
  }

  const updateSegment = (index: number, value: string) => {
    const newSegments = [...segments]
    newSegments[index] = value
    onSegmentsChange(newSegments)
  }

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
      
      <div className="form-group">
        <label htmlFor="variationCount">Variation 개수</label>
        <input
          type="number"
          id="variationCount"
          value={variationCount}
          onChange={(e) => onVariationCountChange(Math.max(1, parseInt(e.target.value) || 1))}
          min="1"
          max="10"
          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
        />
      </div>
      
      <div className="form-group">
        <label>상세 세그먼트</label>
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
          "All Visits"는 기본값입니다. 추가 세그먼트를 입력하세요.
        </p>
        {segments.map((segment, index) => (
          <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={segment}
              onChange={(e) => updateSegment(index, e.target.value)}
              placeholder="세그먼트 이름"
              style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
            />
            {segments.length > 1 && (
              <button
                type="button"
                onClick={() => removeSegment(index)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                삭제
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addSegment}
          style={{
            marginTop: '8px',
            padding: '8px 16px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600'
          }}
        >
          + 세그먼트 추가
        </button>
      </div>

      {/* 버튼 영역 */}
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
          onClick={onNext}
          style={{
            padding: '12px 24px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          다음 단계 →
        </button>
      </div>
    </>
  )
}


