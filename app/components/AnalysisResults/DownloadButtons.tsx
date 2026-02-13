'use client'

import React from 'react'
import { downloadFile } from '../../utils/fileUtils'

interface DownloadButtonsProps {
  excelBase64?: string
  excelUrl?: string
  parsedDataBase64?: string
  parsedDataUrl?: string
}

export function DownloadButtons({
  excelBase64,
  excelUrl,
  parsedDataBase64,
  parsedDataUrl,
}: DownloadButtonsProps) {
  const handleDownloadExcel = () => {
    downloadFile(excelBase64, excelUrl, 'ab_test_report.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  }

  const handleDownloadParsedData = () => {
    downloadFile(parsedDataBase64, parsedDataUrl, 'parsed_data.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  }

  return (
    <div style={{ 
      marginTop: '20px',
      marginBottom: '20px',
      padding: '15px', 
      backgroundColor: '#f8f9fa',
      borderRadius: '4px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px',
      justifyContent: 'center'
    }}>
      <button
        onClick={handleDownloadExcel}
        disabled={!excelBase64 && !excelUrl}
        style={{
          padding: '12px 24px',
          backgroundColor: excelBase64 || excelUrl ? '#27ae60' : '#95a5a6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: excelBase64 || excelUrl ? 'pointer' : 'not-allowed',
          fontSize: '14px',
          fontWeight: '600',
          transition: 'background-color 0.2s'
        }}
      >
        📊 리포트 다운로드 (Excel)
      </button>
      
      <button
        onClick={handleDownloadParsedData}
        disabled={!parsedDataBase64 && !parsedDataUrl}
        style={{
          padding: '12px 24px',
          backgroundColor: parsedDataBase64 || parsedDataUrl ? '#3498db' : '#95a5a6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: parsedDataBase64 || parsedDataUrl ? 'pointer' : 'not-allowed',
          fontSize: '14px',
          fontWeight: '600',
          transition: 'background-color 0.2s'
        }}
      >
        📄 파싱 데이터 다운로드 (Excel)
      </button>
    </div>
  )
}


