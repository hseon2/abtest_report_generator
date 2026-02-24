'use client'

import React, { useState } from 'react'
import { FileUploadSection } from './components/FileUpload/FileUploadSection'
import { TestConditionsSection } from './components/TestConditions/TestConditionsSection'
import { KPISetupSection } from './components/KPISetup/KPISetupSection'
import { FilePreviewSection } from './components/FilePreview/FilePreviewSection'
import { AnalysisResultsSection } from './components/AnalysisResults/AnalysisResultsSection'
import { InsightsPanel } from './components/AnalysisResults/InsightsPanel'
import { DownloadButtons } from './components/AnalysisResults/DownloadButtons'
import { LoadingModal } from './components/LoadingModal/LoadingModal'
import { useKPIConfig } from './hooks/useKPIConfig'
import { useFileManagement } from './hooks/useFileManagement'
import { useSidebarResize } from './hooks/useSidebarResize'
import { useAnalysis } from './hooks/useAnalysis'

export default function Home() {
  // 전역 상태
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [variationCount, setVariationCount] = useState<number>(1)
  const [segments, setSegments] = useState<string[]>(['All Visits'])
  const [useAI, setUseAI] = useState<boolean>(false)

  // Custom Hooks
  const { config, addKPI, removeKPI, updateKPI } = useKPIConfig()
  const { 
    files, 
    pendingFiles, 
    selectedPreviewFileId, 
    previewData, 
    previewHeaders,
    availableMetrics,
    isUploading,
    handleFileChange,
    confirmFile, 
    removeFile, 
    updateFileMetadata, 
    handleFileClick,
    editFile
  } = useFileManagement()
  
  const { sidebarWidth, isResizing, sidebarRef, resizeRef, handleResizeStart } = useSidebarResize()
  
  const {
    loading,
    loadingMessage,
    results,
    error,
    excelUrl,
    parsedDataUrl,
    excelBase64,
    parsedDataBase64,
    rawDataInfo,
    rawDataExpanded,
    selectedReportOrder,
    handleAnalyze: performAnalysis,
    setRawDataExpanded,
    setSelectedReportOrder,
  } = useAnalysis()

  // 분석 시작 핸들러
  const handleAnalyze = () => {
    performAnalysis(files, config, variationCount, segments, useAI)
  }

  return (
    <div className="app-container" style={{ margin: 0, padding: 0, width: '100%' }}>
      <div style={{ display: 'flex', width: '100%', flex: 1 }}>
      {/* 왼쪽 사이드바 */}
      <div 
        className="sidebar" 
        ref={sidebarRef}
        style={{ width: `${sidebarWidth}px`, minWidth: '250px', maxWidth: '70vw' }}
      >
          <div className="sidebar-content">
            <h1 className="app-title">A/B 테스트 리포트 생성기</h1>

            {/* 1단계: 파일 업로드 */}
            {currentStep === 1 && (
        <div className="form-section">
          <h2>1. 파일 업로드</h2>
                <FileUploadSection
                  pendingFiles={pendingFiles}
                  files={files}
                  selectedPreviewFileId={selectedPreviewFileId}
                  isUploading={isUploading}
                  onFileChange={handleFileChange}
                  onFileClick={handleFileClick}
                  onFileConfirm={confirmFile}
                  onFileRemove={removeFile}
                  onFileEdit={editFile}
                  onFileMetadataUpdate={updateFileMetadata}
                  onNext={() => setCurrentStep(2)}
            />
          </div>
            )}

            {/* 2단계: 테스트 조건 설정 */}
            {currentStep === 2 && (
              <div className="form-section">
                <h2>2. 테스트 조건 설정</h2>
                <TestConditionsSection
                  variationCount={variationCount}
                  segments={segments}
                  pendingFilesCount={pendingFiles.length}
                  onVariationCountChange={setVariationCount}
                  onSegmentsChange={setSegments}
                  onPrevious={() => setCurrentStep(1)}
                  onNext={() => setCurrentStep(3)}
                />
            </div>
          )}

            {/* 3단계: KPI 설정 */}
            {currentStep === 3 && (
        <div className="form-section">
                <h2>3. KPI 설정</h2>
                <KPISetupSection
                  kpis={config.kpis}
                  availableMetrics={availableMetrics}
                  useAI={useAI}
                  pendingFilesCount={pendingFiles.length}
                  loading={loading}
                  hasConfirmedFiles={files.length > 0}
                  onKPIUpdate={updateKPI}
                  onKPIAdd={addKPI}
                  onKPIRemove={removeKPI}
                  onUseAIToggle={setUseAI}
                  onPrevious={() => setCurrentStep(2)}
                  onAnalyze={() => {
                    setCurrentStep(4)
                    handleAnalyze()
                  }}
                />
              </div>
            )}

            {/* 4단계: 분석 결과 */}
            {currentStep === 4 && (
              <div className="form-section">
                <h2>4. 분석 결과 확인</h2>
                {results ? (
                  <div>
                    <p style={{ color: '#27ae60', fontWeight: '600', marginBottom: '20px' }}>
                      ✓ 분석이 완료되었습니다.
                    </p>
                    
                    {/* 다운로드 버튼 */}
                    <DownloadButtons
                      excelBase64={excelBase64 || undefined}
                      excelUrl={excelUrl || undefined}
                      parsedDataBase64={parsedDataBase64 || undefined}
                      parsedDataUrl={parsedDataUrl || undefined}
                    />
                  </div>
                ) : (
                  <div>
                    <p>분석을 실행해주세요.</p>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      style={{
                        width: '100%',
                        marginTop: '15px',
                        padding: '10px',
                        backgroundColor: '#5d6d7e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      ← 이전 단계
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 인사이트 섹션 (form-section 밖, 사이드바 안) */}
            {currentStep === 4 && results && results.insights && (
              <InsightsPanel insights={results.insights} useAI={results.useAI} />
            )}

            {error && <div className="error">{error}</div>}

            {/* 버튼 영역 (사이드바 최하단) */}
            {currentStep === 4 && results && (
              <div style={{ 
                position: 'sticky',
                bottom: 0,
                backgroundColor: '#f8f9fa',
                padding: '15px',
                borderTop: '1px solid #e0e0e0',
                marginTop: 'auto',
                marginBottom: 0
              }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      backgroundColor: '#5d6d7e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
                  >
                    ← KPI 재설정
                  </button>
              <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(1)
                      setSelectedReportOrder(null)
                    }}
                    style={{
                      flex: 1,
                      padding: '12px',
                      backgroundColor: '#3498db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
              >
                    🔄 새로 시작
              </button>
            </div>
        </div>
            )}
          </div>
      </div>

      {/* 리사이저 */}
      <div
        ref={resizeRef}
        className="sidebar-resizer"
        onMouseDown={handleResizeStart}
      />

      {/* 오른쪽 메인 영역 */}
        <div className="main-content" style={{ padding: 0, margin: 0, width: '100%', flex: '1 1 auto' }}>
          {/* 미리보기 상단 단계 표시 바 */}
          <div style={{ 
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            backgroundColor: '#ffffff',
            borderBottom: '2px solid #e8e8e8',
            padding: '15px 20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            marginBottom: '20px',
            width: '100%'
          }}>
            <div style={{ 
              display: 'flex', 
              gap: '20px',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              maxWidth: '1200px',
              margin: '0 auto'
            }}>
              {[
                { step: 1, label: '파일 업로드' },
                { step: 2, label: '테스트 조건 설정' },
                { step: 3, label: 'KPI 설정' },
                { step: 4, label: '분석 결과 확인' }
              ].map((item, index, arr) => (
                <React.Fragment key={item.step}>
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: currentStep === item.step ? '#3498db' : currentStep > item.step ? '#27ae60' : '#999',
              fontSize: '14px',
                    fontWeight: currentStep === item.step ? '700' : currentStep > item.step ? '600' : '400'
            }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: currentStep === item.step ? '#3498db' : currentStep > item.step ? '#27ae60' : '#e0e0e0',
                      color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {currentStep > item.step ? '✓' : item.step}
              </div>
                    <span>{item.label}</span>
                </div>
                  {index < arr.length - 1 && (
                    <div style={{ 
                      width: '40px', 
                      height: '2px', 
                      backgroundColor: currentStep > item.step ? '#27ae60' : '#e0e0e0' 
                    }} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
          
          <div style={{ padding: '0 20px' }}>
            {/* Raw Data 정보 */}
            {!loading && results && rawDataInfo && rawDataInfo.length > 0 && (
              <div className="results-section" style={{ marginBottom: '20px' }}>
            <div style={{ 
                          background: '#f8f9fa',
                  padding: '15px', 
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0'
                }}>
                  <div 
                    onClick={() => setRawDataExpanded(!rawDataExpanded)}
                    style={{ 
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontWeight: '600',
                      color: '#2c3e50',
                      fontSize: '15px'
                    }}
                  >
                    <span>📊 Raw Data 정보</span>
                    <span style={{ fontSize: '12px', color: '#999' }}>
                      {rawDataExpanded ? '▼ 접기' : '▶ 펼치기'}
                    </span>
                  </div>
                  {rawDataExpanded && (
                  <div style={{ 
                      marginTop: '15px',
                      maxHeight: '400px',
                      overflowY: 'auto',
                      fontSize: '13px',
                      lineHeight: '1.8',
                      color: '#34495e',
                      whiteSpace: 'pre-wrap',
                      backgroundColor: '#ffffff',
                      padding: '15px',
                      borderRadius: '4px',
                      border: '1px solid #dee2e6'
                  }}>
                      {rawDataInfo.map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                </div>
              )}
            </div>
          </div>
        )}

            {/* 분석 결과 */}
            {!loading && results && (
              <AnalysisResultsSection
                results={results}
                variationCount={variationCount}
                selectedReportOrder={selectedReportOrder}
                files={files}
                excelBase64={excelBase64 || undefined}
                excelUrl={excelUrl || undefined}
                parsedDataBase64={parsedDataBase64 || undefined}
                parsedDataUrl={parsedDataUrl || undefined}
                onReportOrderChange={setSelectedReportOrder}
              />
            )}

            {/* 파일 미리보기 */}
            {!loading && !results && (
              <FilePreviewSection
                files={files}
                pendingFiles={pendingFiles}
                selectedPreviewFileId={selectedPreviewFileId}
                previewData={previewData}
                previewHeaders={previewHeaders}
                onFileClick={handleFileClick}
              />
            )}
          </div>
        </div>
      </div>
      
      {/* 분석 중 로딩 모달 */}
      {loading && (
        <LoadingModal message={loadingMessage || "📊 데이터 분석 중입니다..."} />
      )}
    </div>
  )
}
