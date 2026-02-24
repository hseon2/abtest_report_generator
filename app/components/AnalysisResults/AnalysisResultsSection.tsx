'use client'

import React from 'react'
import { AnalysisResultsTable } from './AnalysisResultsTable'
import { FileMetadata } from '../../types'

interface AnalysisResultsSectionProps {
  results: any
  variationCount: number
  selectedReportOrder: string | null
  files?: FileMetadata[]
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
  files,
  excelBase64,
  excelUrl,
  parsedDataBase64,
  parsedDataUrl,
  onReportOrderChange,
}: AnalysisResultsSectionProps) {
  // 모든 결과를 플랫하게 가져오기
  const getAllResults = () => {
    if (!results) return []
    // Python에서 반환하는 primaryResults 사용
    if (results.primaryResults && Array.isArray(results.primaryResults)) {
      return results.primaryResults
    }
    // 레거시: results.results도 지원
    if (results.results && Array.isArray(results.results)) {
      return results.results
    }
    return []
  }

  const allResults = getAllResults()

  // 국가별 날짜 정보 생성 (reportOrder별로)
  const getCountryDateInfo = (country: string, reportOrder: string) => {
    if (!files || files.length === 0) return null
    
    const fileForCountry = files.find(
      f => f.country === country && f.reportOrder === reportOrder
    )
    
    if (!fileForCountry || !fileForCountry.startDate || !fileForCountry.endDate) return null
    
    // 날짜 계산
    const start = new Date(fileForCountry.startDate)
    const end = new Date(fileForCountry.endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // 시작일 포함
    
    // 날짜 포맷 (YY/M/D)
    const formatDate = (date: Date) => {
      const year = date.getFullYear().toString().slice(-2)
      const month = date.getMonth() + 1
      const day = date.getDate()
      return `${year}/${month}/${day}`
    }
    
    return {
      startDate: formatDate(start),
      endDate: formatDate(end),
      days: diffDays
    }
  }

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
      
      {/* 결과 테이블만 표시 (다운로드 버튼과 인사이트는 사이드바에 있음) */}
      <AnalysisResultsTable
        results={allResults}
        variationCount={variationCount}
        selectedReportOrder={selectedReportOrder}
        onReportOrderChange={onReportOrderChange}
        getCountryDateInfo={getCountryDateInfo}
      />
    </div>
  )
}


