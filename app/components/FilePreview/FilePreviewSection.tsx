'use client'

import React from 'react'
import { FileMetadata } from '../../types'

interface FilePreviewSectionProps {
  files: FileMetadata[]
  pendingFiles: FileMetadata[]
  selectedPreviewFileId: string | null
  previewData: any[] | null
  previewHeaders: string[]
  onFileClick: (id: string) => void
}

export function FilePreviewSection({
  files,
  pendingFiles,
  selectedPreviewFileId,
  previewData,
  previewHeaders,
  onFileClick,
}: FilePreviewSectionProps) {
  if (!previewData || previewData.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '100px 20px', 
        color: '#999'
      }}>
        <h2>Excel 파일 미리보기</h2>
        <p>왼쪽 사이드바에서 파일을 업로드하면 여기에 미리보기가 표시됩니다.</p>
        <p style={{ marginTop: '10px', fontSize: '14px' }}>
          파일을 업로드하고 KPI를 설정한 후 분석을 실행하세요.
        </p>
      </div>
    )
  }

  const allFiles = [...pendingFiles, ...files]
  const selectedFile = selectedPreviewFileId 
    ? allFiles.find((f) => f.id === selectedPreviewFileId) 
    : (files.length > 0 ? files[0] : (pendingFiles.length > 0 ? pendingFiles[0] : null))

  return (
    <div className="results-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: 0 }}>Excel 파일 미리보기</h2>
        
        {files.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#495057' }}>
              선택한 파일 미리보기:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {files.map((fileMeta) => (
                <button
                  key={fileMeta.id}
                  type="button"
                  onClick={() => onFileClick(fileMeta.id)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: selectedPreviewFileId === fileMeta.id ? '#3498db' : '#e9ecef',
                    color: selectedPreviewFileId === fileMeta.id ? 'white' : '#495057',
                    border: `1px solid ${selectedPreviewFileId === fileMeta.id ? '#3498db' : '#ced4da'}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: selectedPreviewFileId === fileMeta.id ? '600' : '400',
                    transition: 'all 0.2s'
                  }}
                >
                  {fileMeta.file.name}
                  {selectedPreviewFileId === fileMeta.id && ' ✓'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {selectedFile ? (
        <p style={{ color: '#666', marginBottom: '15px' }}>
          <strong>{selectedFile.file.name}</strong> 파일의 전체 데이터를 미리보기로 표시합니다. (총 {previewData?.length || 0}행, {previewHeaders?.length || 0}컬럼)
        </p>
      ) : (
        <p style={{ color: '#666', marginBottom: '15px' }}>
          업로드된 파일의 전체 데이터를 미리보기로 표시합니다. (총 {previewData?.length || 0}행, {previewHeaders?.length || 0}컬럼)
        </p>
      )}
      
      <div className="table-container" style={{ maxHeight: '600px', overflowY: 'auto', overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              {previewHeaders.map((header, idx) => (
                <th key={idx} style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#3498db', minWidth: '100px' }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewData.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {previewHeaders.map((header, colIdx) => (
                  <td key={colIdx} style={{ minWidth: '100px' }}>
                    {row[header] !== undefined && row[header] !== null && row[header] !== '' 
                      ? String(row[header]) 
                      : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <p style={{ color: '#999', marginTop: '15px', fontSize: '13px' }}>
        KPI를 설정하고 분석을 실행하면 결과가 여기에 표시됩니다.
      </p>
    </div>
  )
}

