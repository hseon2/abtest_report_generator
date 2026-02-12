'use client'

import React, { useState, useRef, useEffect } from 'react'
import { StepIndicator } from './components/StepIndicator/StepIndicator'
import { FileUploadSection } from './components/FileUpload/FileUploadSection'
import { TestConditionsSection } from './components/TestConditions/TestConditionsSection'
import { KPISetupSection } from './components/KPISetup/KPISetupSection'
import { FilePreviewSection } from './components/FilePreview/FilePreviewSection'
import { AnalysisResultsSection } from './components/AnalysisResults/AnalysisResultsSection'
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
    handleFileChange: handleFileChangeFromHook,
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

  // 파일 변경 핸들러
  const handleFileChange = handleFileChangeFromHook

  // 분석 시작 핸들러
  const handleAnalyze = () => {
    performAnalysis(files, config, variationCount, segments, useAI)
    setCurrentStep(4)
  }

  // 단계 이동 핸들러
  const goToStep = (step: number) => {
    setCurrentStep(step)
  }

  return (
    <div className="app-container">
      {/* 사이드바 */}
      <div 
        ref={sidebarRef}
        className="sidebar" 
        style={{ 
          width: `${sidebarWidth}px`,
          minWidth: '250px',
          maxWidth: '70vw'
        }}
      >
        <div className="sidebar-content">
          <h1 className="app-title">A/B 테스트 리포트 생성기</h1>
          
          {/* 단계 표시 */}
          <StepIndicator currentStep={currentStep} />
          
          {/* 1단계: 파일 업로드 */}
          {currentStep === 1 && (
            <FileUploadSection
              pendingFiles={pendingFiles}
              files={files}
              selectedPreviewFileId={selectedPreviewFileId}
              onFileChange={handleFileChange}
              onFileClick={handleFileClick}
              onFileConfirm={confirmFile}
              onFileRemove={removeFile}
              onFileEdit={editFile}
              onFileMetadataUpdate={updateFileMetadata}
              onNext={() => setCurrentStep(2)}
            />
          )}
          
          {/* 2단계: 테스트 조건 설정 */}
          {currentStep === 2 && (
            <TestConditionsSection
              variationCount={variationCount}
              segments={segments}
              pendingFilesCount={pendingFiles.length}
              onVariationCountChange={setVariationCount}
              onSegmentsChange={setSegments}
              onPrevious={() => setCurrentStep(1)}
              onNext={() => setCurrentStep(3)}
            />
          )}
          
          {/* 3단계: KPI 설정 */}
          {currentStep === 3 && (
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
              onAnalyze={handleAnalyze}
            />
          )}
          
          {/* 4단계: 분석 결과 - 사이드바 버튼 영역 */}
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
                    // 상태 초기화
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
          
          {/* 에러 메시지 */}
          {error && <div className="error">{error}</div>}
        </div>
      </div>

      {/* 리사이즈 핸들 */}
      <div
        ref={resizeRef}
        className="resize-handle"
        onMouseDown={handleResizeStart}
        style={{
          width: '5px',
          cursor: 'col-resize',
          backgroundColor: isResizing ? '#3498db' : '#e0e0e0',
          transition: 'background-color 0.2s',
          flexShrink: 0,
          position: 'relative',
          zIndex: 10
        }}
        onMouseEnter={(e) => {
          if (!isResizing) {
            e.currentTarget.style.backgroundColor = '#3498db'
          }
        }}
        onMouseLeave={(e) => {
          if (!isResizing) {
            e.currentTarget.style.backgroundColor = '#e0e0e0'
          }
        }}
      />

      {/* 메인 콘텐츠 영역 */}
      <div className="main-content" style={{ padding: 0, margin: 0, width: '100%', flex: '1 1 auto' }}>
        {/* 상단 단계 표시 바 */}
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
          {/* 로딩 표시 */}
          {loading && (
            <div className="loading" style={{ 
              padding: '20px', 
              textAlign: 'center',
              backgroundColor: '#e8f4f8',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '2px solid #3498db'
            }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#2c3e50', marginBottom: '10px' }}>
                {loadingMessage}
              </div>
              <div style={{ 
                width: '100%', 
                height: '4px', 
                backgroundColor: '#d5e8f1',
                borderRadius: '2px',
                overflow: 'hidden',
                marginTop: '10px'
              }}>
                <div style={{
                  width: '30%',
                  height: '100%',
                  backgroundColor: '#3498db',
                  animation: 'loading 1.5s ease-in-out infinite',
                  borderRadius: '2px'
                }} />
              </div>
            </div>
          )}

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
                  <span style={{ fontSize: '20px', transition: 'transform 0.3s', transform: rawDataExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    ▼
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
  )
}
