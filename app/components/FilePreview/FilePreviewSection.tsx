'use client'

import React, { useEffect, useState } from 'react'
import { FileMetadata } from '../../types'

interface FilePreviewSectionProps {
  files: FileMetadata[]
  pendingFiles: FileMetadata[]
  selectedPreviewFileId: string | null
  previewData: any[] | null
  previewHeaders: string[]
  onFileClick: (id: string) => void
  /**
   * 우측 데이터 미리보기 행 선택 시 호출.
   * - metricLabel: 해당 행의 A열(메트릭 라벨) 값
   * - rowData: 해당 행의 전체 컬럼 값 (key는 'A','B','C',... 등 컬럼 letter)
   * 이 prop이 있을 때만 행 클릭 인터랙션이 활성화됩니다.
   */
  onRowSelect?: (metricLabel: string, rowData: Record<string, any>) => void
  /**
   * 현재 행 클릭 시 값이 들어갈 KPI 입력 위치 정보 (KPI 설정 단계에서만 사용).
   */
  activeKpiTarget?: {
    kpiIndex: number
    kpiName: string
    field: 'numerator' | 'denominator'
  }
}

export function FilePreviewSection({
  files,
  pendingFiles,
  selectedPreviewFileId,
  previewData,
  previewHeaders,
  onFileClick,
  onRowSelect,
  activeKpiTarget,
}: FilePreviewSectionProps) {
  const [selectedRowIdx, setSelectedRowIdx] = useState<number | null>(null)
  const [hoveredRowIdx, setHoveredRowIdx] = useState<number | null>(null)
  const [flashRowIdx, setFlashRowIdx] = useState<number | null>(null)

  // active 입력 위치가 바뀌면 선택 강조를 초기화 (사용자가 다른 입력란을 고르면 새로 선택해야 함을 알림)
  useEffect(() => {
    setSelectedRowIdx(null)
  }, [activeKpiTarget?.kpiIndex, activeKpiTarget?.field])

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

  const rowSelectable = !!onRowSelect
  const fieldLabel = activeKpiTarget?.field === 'denominator' ? '분모(Denominator)' : '분자(Numerator)'
  const kpiLabel = activeKpiTarget?.kpiName?.trim() || (activeKpiTarget ? `KPI #${activeKpiTarget.kpiIndex + 1}` : '')

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

      {/* 행 클릭 안내 배너 (KPI 설정 단계 전용) */}
      {rowSelectable && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 5,
            padding: '10px 14px',
            marginBottom: '12px',
            borderRadius: '6px',
            border: `1px solid ${activeKpiTarget ? '#3498db' : '#ced4da'}`,
            backgroundColor: activeKpiTarget ? '#eaf3ff' : '#f8f9fa',
            color: activeKpiTarget ? '#1a5a8a' : '#495057',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: activeKpiTarget ? '0 2px 8px rgba(52, 152, 219, 0.15)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{ fontSize: '16px' }}>👆</span>
          {activeKpiTarget ? (
            <span>
              아래 표의 <strong>행을 클릭</strong>하면 첫 번째 컬럼(<strong>{previewHeaders?.[0] || 'A열'}</strong>) 값이{' '}
              <strong style={{ color: '#2c3e50' }}>{kpiLabel}</strong>의{' '}
              <strong style={{ color: '#1a5a8a' }}>{fieldLabel}</strong>에 입력됩니다.
            </span>
          ) : (
            <span>
              왼쪽 KPI 설정에서 <strong>분자/분모 입력란을 클릭</strong>한 뒤, 아래 표의 행을 클릭하면 값이 채워집니다.
            </span>
          )}
        </div>
      )}
      
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
                <th
                  key={idx}
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    backgroundColor: rowSelectable && idx === 0 ? '#2c80b4' : '#3498db',
                    minWidth: '100px',
                  }}
                >
                  {rowSelectable && idx === 0 ? `${header} (선택값)` : header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewData.map((row, rowIdx) => {
              const isSelected = rowSelectable && selectedRowIdx === rowIdx
              const isHovered = rowSelectable && hoveredRowIdx === rowIdx
              const isFlash = rowSelectable && flashRowIdx === rowIdx

              const rowBackground = isFlash
                ? '#fff7d6'
                : isSelected
                  ? '#d6eaff'
                  : isHovered
                    ? '#f1f7fd'
                    : undefined

              return (
                <tr
                  key={rowIdx}
                  onMouseEnter={() => rowSelectable && setHoveredRowIdx(rowIdx)}
                  onMouseLeave={() => rowSelectable && setHoveredRowIdx((prev) => (prev === rowIdx ? null : prev))}
                  onClick={() => {
                    if (!onRowSelect) return
                    const aHeader = previewHeaders?.[0]
                    const metricLabel = aHeader ? row?.[aHeader] : null
                    if (metricLabel === null || metricLabel === undefined || !String(metricLabel).trim()) return

                    setSelectedRowIdx(rowIdx)
                    setFlashRowIdx(rowIdx)
                    setTimeout(() => {
                      setFlashRowIdx((prev) => (prev === rowIdx ? null : prev))
                    }, 450)

                    // 행 전체를 그대로 전달 — 분석 시 메트릭 이름 재검색 없이 이 행 데이터가 사용된다
                    const rowSnapshot: Record<string, any> = {}
                    previewHeaders.forEach((header) => {
                      rowSnapshot[header] = row?.[header]
                    })
                    onRowSelect(String(metricLabel), rowSnapshot)
                  }}
                  style={{
                    cursor: rowSelectable ? 'pointer' : 'default',
                    backgroundColor: rowBackground,
                    transition: 'background-color 0.15s ease',
                    outline: isSelected ? '2px solid #3498db' : 'none',
                    outlineOffset: '-2px',
                  }}
                >
                  {previewHeaders.map((header, colIdx) => {
                    const isFirstCol = colIdx === 0
                    const cellValue =
                      row[header] !== undefined && row[header] !== null && row[header] !== ''
                        ? String(row[header])
                        : ''
                    return (
                      <td
                        key={colIdx}
                        style={{
                          minWidth: '100px',
                          fontWeight: rowSelectable && isFirstCol ? 600 : undefined,
                          color: rowSelectable && isFirstCol ? '#1a5a8a' : undefined,
                          position: 'relative',
                        }}
                      >
                        {rowSelectable && isFirstCol && isSelected && (
                          <span
                            style={{
                              display: 'inline-block',
                              marginRight: '6px',
                              color: '#3498db',
                              fontWeight: 700,
                            }}
                          >
                            ✓
                          </span>
                        )}
                        {cellValue}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      
      <p style={{ color: '#999', marginTop: '15px', fontSize: '13px' }}>
        KPI를 설정하고 분석을 실행하면 결과가 여기에 표시됩니다.
      </p>
    </div>
  )
}


