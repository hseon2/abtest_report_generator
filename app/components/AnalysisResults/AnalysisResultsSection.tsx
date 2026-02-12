'use client'

import React from 'react'
import { DownloadButtons } from './DownloadButtons'
import { InsightsPanel } from './InsightsPanel'
import { AnalysisResultsTable } from './AnalysisResultsTable'

interface AnalysisResultsSectionProps {
  results: any
  variationCount: number
  selectedReportOrder: string | null
  excelBase64?: string
  excelUrl?: string
  parsedDataBase64?: string
  parsedDataUrl?: string
  onReportOrderChange: (order: string) => void
}

export function AnalysisResultsSection({
  results,
  variationCount,
  selectedReportOrder,
  excelBase64,
  excelUrl,
  parsedDataBase64,
  parsedDataUrl,
  onReportOrderChange,
}: AnalysisResultsSectionProps) {
  // 모든 결과를 플랫하게 가져오기
  const getAllResults = () => {
    if (!results) return []
    if (results.results && Array.isArray(results.results)) {
      return results.results
    }
    return []
  }

  const allResults = getAllResults()

  return (
    <div className="results-section">
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>분석 결과</h2>
      </div>
      
      {/* 경고 메시지 */}
      {results.warning && (
        <div className="error" style={{ marginBottom: '20px' }}>
          ⚠️ {results.warning}
        </div>
      )}
      
      {/* 다운로드 버튼 */}
      <DownloadButtons
        excelBase64={excelBase64}
        excelUrl={excelUrl}
        parsedDataBase64={parsedDataBase64}
        parsedDataUrl={parsedDataUrl}
      />
      
      {/* 인사이트 패널 */}
      {results.insights && (
        <InsightsPanel insights={results.insights} useAI={results.useAI} />
      )}
      
      {/* 결과 테이블 */}
      <AnalysisResultsTable
        results={allResults}
        variationCount={variationCount}
        selectedReportOrder={selectedReportOrder}
        onReportOrderChange={onReportOrderChange}
      />
    </div>
  )
}

