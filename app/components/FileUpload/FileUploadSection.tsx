'use client'

import React from 'react'
import { FileMetadata } from '../../types'
import { COUNTRIES } from '../../constants'

interface FileUploadSectionProps {
  pendingFiles: FileMetadata[]
  files: FileMetadata[]
  selectedPreviewFileId: string | null
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onFileClick: (id: string) => void
  onFileConfirm: (id: string) => void
  onFileRemove: (id: string) => void
  onFileEdit: (id: string) => void
  onFileMetadataUpdate: (id: string, field: keyof FileMetadata, value: any) => void
  onNext: () => void
}

export function FileUploadSection({
  pendingFiles,
  files,
  selectedPreviewFileId,
  onFileChange,
  onFileClick,
  onFileConfirm,
  onFileRemove,
  onFileEdit,
  onFileMetadataUpdate,
  onNext,
}: FileUploadSectionProps) {
  return (
    <div className="form-section">
      <h2>1. 파일 업로드</h2>
      <div className="form-group">
        <label htmlFor="file">Excel/CSV 파일 (여러 개 선택 가능)</label>
        <input
          type="file"
          id="file"
          accept=".xlsx,.csv"
          multiple
          onChange={onFileChange}
        />
      </div>
      
      {/* 임시 파일 목록 (저장 전) */}
      {pendingFiles.length > 0 && (
        <div className="form-group" style={{ marginTop: '15px' }}>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#e67e22', marginBottom: '10px', display: 'block' }}>
            📝 국가/리포트 순서 설정 필요 ({pendingFiles.length}개)
          </label>
          {pendingFiles.map((fileMeta) => (
            <div 
              key={fileMeta.id} 
              onClick={() => onFileClick(fileMeta.id)}
              style={{ 
                marginBottom: '15px', 
                padding: '12px', 
                border: `2px solid ${selectedPreviewFileId === fileMeta.id ? '#3498db' : '#e67e22'}`,
                borderRadius: '4px',
                backgroundColor: selectedPreviewFileId === fileMeta.id ? '#e3f2fd' : '#fff8e1',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>
                  {fileMeta.file.name}
                  {selectedPreviewFileId === fileMeta.id && ' 👁️'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onFileRemove(fileMeta.id)
                  }}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  삭제
                </button>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>국가</label>
                    <select
                      value={fileMeta.country}
                      onChange={(e) => onFileMetadataUpdate(fileMeta.id, 'country', e.target.value)}
                      style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }}
                    >
                      {COUNTRIES.map((code) => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>리포트 순서</label>
                    <select
                      value={fileMeta.reportOrder}
                      onChange={(e) => onFileMetadataUpdate(fileMeta.id, 'reportOrder', e.target.value)}
                      style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }}
                    >
                      <option value="1st report">1st report</option>
                      <option value="2nd report">2nd report</option>
                      <option value="3rd report">3rd report</option>
                      <option value="final report">final report</option>
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onFileConfirm(fileMeta.id)
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#27ae60',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '12px'
                  }}
                >
                  ✓ 저장
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 확정된 파일 목록 */}
      {files.length > 0 && (
        <div className="form-group" style={{ marginTop: '15px' }}>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#27ae60', marginBottom: '10px', display: 'block' }}>
            ✓ 설정 완료 ({files.length}개)
          </label>
          {files.map((fileMeta) => (
            <div 
              key={fileMeta.id}
              onClick={() => onFileClick(fileMeta.id)}
              style={{ 
                marginBottom: '10px', 
                padding: '12px', 
                border: `2px solid ${selectedPreviewFileId === fileMeta.id ? '#3498db' : '#27ae60'}`,
                borderRadius: '4px',
                backgroundColor: selectedPreviewFileId === fileMeta.id ? '#e3f2fd' : '#d5f4e6',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                    {fileMeta.file.name}
                    {selectedPreviewFileId === fileMeta.id && ' 👁️'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#555' }}>
                    {fileMeta.country} | {fileMeta.reportOrder}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onFileEdit(fileMeta.id)
                    }}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: 'white',
                      color: '#3498db',
                      border: '1px solid #3498db',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onFileRemove(fileMeta.id)
                    }}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 다음 단계 버튼 */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onNext}
          disabled={files.length === 0}
          style={{
            padding: '12px 24px',
            backgroundColor: files.length > 0 ? '#3498db' : '#cccccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: files.length > 0 ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          다음 단계 →
        </button>
      </div>
    </div>
  )
}

