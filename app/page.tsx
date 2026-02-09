'use client'

import React, { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'

interface KPIConfig {
  name: string
  numerator: string
  denominator: string
  type: 'rate' | 'revenue' | 'rpv' | 'simple' | 'variation_only' | string
}

interface Config {
  kpis: KPIConfig[]
}

interface FileMetadata {
  id: string
  file: File
  country: string
  reportOrder: '1st report' | '2nd report' | '3rd report' | 'final report'
  previewData?: any[] | null
  previewHeaders?: string[]
  isConfirmed?: boolean // 저장 버튼으로 확정되었는지 여부
}

export default function Home() {
  const [files, setFiles] = useState<FileMetadata[]>([]) // 확정된 파일 목록
  const [pendingFiles, setPendingFiles] = useState<FileMetadata[]>([]) // 임시 파일 목록 (저장 전)
  const [config, setConfig] = useState<Config>({
    kpis: [{ name: '', numerator: '', denominator: '', type: 'rate' }],
  })
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState<string>('데이터를 분석하고 있습니다...')
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [excelUrl, setExcelUrl] = useState<string | null>(null)
  const [parsedDataUrl, setParsedDataUrl] = useState<string | null>(null)
  const [excelBase64, setExcelBase64] = useState<string | null>(null)
  const [parsedDataBase64, setParsedDataBase64] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<any[] | null>(null)
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([])
  const [availableMetrics, setAvailableMetrics] = useState<string[]>([])
  const [selectedPreviewFileId, setSelectedPreviewFileId] = useState<string | null>(null) // 현재 선택된 파일 ID
  const [rawDataInfo, setRawDataInfo] = useState<string[] | null>(null)
  const [rawDataExpanded, setRawDataExpanded] = useState<boolean>(false)
  const [variationCount, setVariationCount] = useState<number>(1) // Variation 개수 (기본값: 1)
  const [segments, setSegments] = useState<string[]>(['All Visits']) // 세그먼트 목록 (기본값: ['All Visits'])
  const [useAI, setUseAI] = useState<boolean>(false) // AI 사용 여부
  const [currentStep, setCurrentStep] = useState<number>(1) // 현재 단계 (1: 파일 업로드, 2: Variation/세그먼트, 3: KPI, 4: 분석)
  const [sidebarWidth, setSidebarWidth] = useState<number>(380) // 사이드바 폭
  const [isResizing, setIsResizing] = useState<boolean>(false)
  const [selectedReportOrder, setSelectedReportOrder] = useState<string | null>(null) // 현재 선택된 리포트 순서
  const sidebarRef = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<HTMLDivElement>(null)

  const addKPI = () => {
    setConfig({
      ...config,
      kpis: [
        ...config.kpis,
        { name: '', numerator: '', denominator: '', type: 'rate' },
      ],
    })
  }

  const removeKPI = (index: number) => {
    // 첫 번째 KPI는 제거할 수 없음
    if (index === 0 || config.kpis.length <= 1) {
      return
    }
    setConfig({
      ...config,
      kpis: config.kpis.filter((_, i) => i !== index),
    })
  }

  const updateKPI = (index: number, field: keyof KPIConfig, value: string) => {
    const updated = [...config.kpis]
    updated[index] = { ...updated[index], [field]: value }
    setConfig({ ...config, kpis: updated })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) {
      return
    }

    const newFiles: FileMetadata[] = selectedFiles.map((file) => ({
      id: `${Date.now()}_${Math.random()}`,
      file,
      country: 'UK',
      reportOrder: '1st report',
      isConfirmed: false, // 초기에는 확정되지 않음
    }))

    setPendingFiles((prev) => [...prev, ...newFiles])

    // 첫 번째 파일을 먼저 선택하고 미리보기 표시
    if (newFiles.length > 0) {
      const firstFileId = newFiles[0].id
      setSelectedPreviewFileId(firstFileId)
      
      // 첫 번째 파일의 미리보기를 먼저 로드하고 표시 (동기적으로)
      await loadFilePreview(newFiles[0].file, firstFileId)
      
      // 로드 후에도 미리보기가 표시되지 않았으면 강제로 표시
      setTimeout(() => {
        const allFiles = [...pendingFiles, ...newFiles]
        const firstFile = allFiles.find((f) => f.id === firstFileId)
        if (firstFile?.previewData && firstFile?.previewHeaders) {
          setPreviewData(firstFile.previewData)
          setPreviewHeaders(firstFile.previewHeaders)
        }
      }, 200)
      
      // 나머지 파일들의 미리보기는 백그라운드에서 로드
      for (let i = 1; i < newFiles.length; i++) {
        loadFilePreview(newFiles[i].file, newFiles[i].id)
      }
    }
    
    // 파일 입력 초기화
    e.target.value = ''
  }

  const loadFilePreview = async (file: File, fileId: string) => {
    // Excel 파일 미리보기
    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          
          // 첫 번째 시트 읽기
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          
          // JSON으로 변환 (헤더 없이 모든 행을 배열로)
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
          
          if (jsonData.length > 0) {
            // 최대 컬럼 개수 찾기
            const typedJsonData = jsonData as any[][]
            const rowLengths = typedJsonData.map((row: any[]) => row ? row.length : 0)
            const maxCols = rowLengths.length > 0 ? Math.max(...rowLengths, 0) : 0
            
            let columnHeaders: string[] = []
            let dataRows: any[] = []
            
            if (maxCols > 0) {
              // 컬럼 헤더 생성 (A, B, C, ..., Z, AA, AB, ...)
              columnHeaders = []
              for (let i = 0; i < maxCols; i++) {
                let colLetter = ''
                if (i < 26) {
                  colLetter = String.fromCharCode(65 + i)
                } else {
                  const firstLetter = String.fromCharCode(65 + Math.floor((i - 26) / 26))
                  const secondLetter = String.fromCharCode(65 + ((i - 26) % 26))
                  colLetter = firstLetter + secondLetter
                }
                columnHeaders.push(colLetter)
              }
            
            // 전체 데이터 행
              dataRows = typedJsonData.map((row: any[]) => {
                const rowObj: any = {}
                columnHeaders.forEach((header, idx) => {
                  const value = row && row[idx] !== undefined && row[idx] !== null ? row[idx] : ''
                  rowObj[header] = value === '' ? '' : String(value)
                })
                return rowObj
              })
            } else {
              columnHeaders = ['A']
              dataRows = [{ A: '데이터가 없습니다.' }]
            }
            
            // 파일 메타데이터에 미리보기 데이터 저장
            setPendingFiles((prev) => {
              const updated = prev.map((f) =>
                f.id === fileId
                  ? { ...f, previewData: dataRows, previewHeaders: columnHeaders }
                  : f
              )
              
              // 선택된 파일이면 즉시 미리보기 표시
              if (fileId === selectedPreviewFileId) {
            setPreviewData(dataRows)
                setPreviewHeaders(columnHeaders)
              }
              
              return updated
            })
            setFiles((prev) => {
              const updated = prev.map((f) =>
                f.id === fileId
                  ? { ...f, previewData: dataRows, previewHeaders: columnHeaders }
                  : f
              )
              
              // 선택된 파일이면 즉시 미리보기 표시
              if (fileId === selectedPreviewFileId) {
                setPreviewData(dataRows)
                setPreviewHeaders(columnHeaders)
              }
              
              return updated
            })
            
            // 사용 가능한 메트릭 추출 (선택된 파일이거나 첫 번째 파일인 경우)
            if (fileId === selectedPreviewFileId || (!selectedPreviewFileId && pendingFiles.length === 0 && files.length === 0)) {
              const metrics: string[] = []
              const nameCounts: { [key: string]: number } = {}
              
              typedJsonData.slice(1).forEach((row: any[]) => {
                if (row.length > 0 && row[0]) {
                  let strVal = String(row[0]).trim()
                  if (strVal && strVal !== '' && strVal !== 'NaN' && !strVal.startsWith('#')) {
                    // 이미 (숫자) 형식이 있으면 제거
                    const cleanValue = strVal.replace(/\s*\(\d+\)\s*$/, '').trim()
                    
                    // 중복 카운트
                    if (!nameCounts[cleanValue]) {
                      nameCounts[cleanValue] = 0
                    }
                    nameCounts[cleanValue]++
                    const count = nameCounts[cleanValue]
                    
                    // 첫 번째는 그대로, 두 번째부터는 (2), (3) 추가
                    if (count === 1) {
                      metrics.push(cleanValue)
                    } else {
                      metrics.push(`${cleanValue} (${count})`)
                    }
                  }
                }
              })
              
              const sortedMetrics = metrics.sort()
              setAvailableMetrics(sortedMetrics)
            }
            
            // 선택된 파일이면 미리보기 표시 (또는 첫 번째 파일이고 아직 선택된 파일이 없으면)
            if (fileId === selectedPreviewFileId) {
              setPreviewData(dataRows)
              setPreviewHeaders(columnHeaders)
            } else if (!selectedPreviewFileId && (fileId === pendingFiles[0]?.id || fileId === files[0]?.id)) {
              setPreviewData(dataRows)
              setPreviewHeaders(columnHeaders)
              setSelectedPreviewFileId(fileId)
            }
          }
        } catch (err) {
          console.error('Excel 파일 읽기 오류:', err)
        }
      }
      reader.readAsArrayBuffer(file)
    } catch (err) {
      console.error('파일 읽기 오류:', err)
    }
  }
  
  // 파일 클릭 시 미리보기 표시
  const handleFileClick = (fileId: string) => {
    setSelectedPreviewFileId(fileId)
    
    // 해당 파일의 미리보기 데이터 찾기
    const allFiles = [...pendingFiles, ...files]
    const selectedFile = allFiles.find((f) => f.id === fileId)
    
    if (selectedFile?.previewData && selectedFile?.previewHeaders) {
      setPreviewData(selectedFile.previewData)
      setPreviewHeaders(selectedFile.previewHeaders)
    } else {
      // 미리보기 데이터가 없으면 로드
      const file = selectedFile?.file
      if (file) {
        loadFilePreview(file, fileId).then(() => {
          // 로드 후 다시 시도
          const updatedFiles = [...pendingFiles, ...files]
          const updatedFile = updatedFiles.find((f) => f.id === fileId)
          if (updatedFile?.previewData && updatedFile?.previewHeaders) {
            setPreviewData(updatedFile.previewData)
            setPreviewHeaders(updatedFile.previewHeaders)
          }
        })
      }
    }
  }

  const updateFileMetadata = (id: string, field: keyof FileMetadata, value: any) => {
    // 확정된 파일과 임시 파일 모두 업데이트
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    )
    setPendingFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    )
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
    setPendingFiles((prev) => prev.filter((f) => f.id !== id))
    if (files.length === 1 && pendingFiles.length === 0) {
          setPreviewData(null)
          setPreviewHeaders([])
        }
      }

  const confirmFile = (id: string) => {
    // 임시 파일을 확정된 파일 목록으로 이동
    const fileToConfirm = pendingFiles.find((f) => f.id === id)
    if (fileToConfirm) {
      setFiles((prev) => [...prev, { ...fileToConfirm, isConfirmed: true }])
      setPendingFiles((prev) => prev.filter((f) => f.id !== id))
      
      // 확정된 파일이 첫 번째 파일이고 선택된 파일이 없으면 선택
      if (!selectedPreviewFileId && files.length === 0) {
        setSelectedPreviewFileId(id)
        if (fileToConfirm.previewData && fileToConfirm.previewHeaders) {
          setPreviewData(fileToConfirm.previewData)
          setPreviewHeaders(fileToConfirm.previewHeaders)
        }
      }
    }
  }
  
  // 선택된 파일의 미리보기 자동 표시 및 메트릭 추출
  useEffect(() => {
    if (selectedPreviewFileId) {
      const allFiles = [...pendingFiles, ...files]
      const selectedFile = allFiles.find((f) => f.id === selectedPreviewFileId)
      
      if (selectedFile?.previewData && selectedFile?.previewHeaders) {
        setPreviewData(selectedFile.previewData)
        setPreviewHeaders(selectedFile.previewHeaders)
        
        // 선택된 파일의 메트릭 추출 (중복 처리 포함)
        const metrics: string[] = []
        const nameCounts: { [key: string]: number } = {}
        
        selectedFile.previewData.forEach((row: any) => {
          if (row && row['A']) {
            let strVal = String(row['A']).trim()
            if (strVal && strVal !== '' && strVal !== 'NaN' && !strVal.startsWith('#')) {
              // 이미 (숫자) 형식이 있으면 제거
              const cleanValue = strVal.replace(/\s*\(\d+\)\s*$/, '').trim()
              
              // 중복 카운트
              if (!nameCounts[cleanValue]) {
                nameCounts[cleanValue] = 0
              }
              nameCounts[cleanValue]++
              const count = nameCounts[cleanValue]
              
              // 첫 번째는 그대로, 두 번째부터는 (2), (3) 추가
              if (count === 1) {
                metrics.push(cleanValue)
                      } else {
                metrics.push(`${cleanValue} (${count})`)
                    }
                  }
                }
              })
              
        const sortedMetrics = metrics.sort()
        setAvailableMetrics(sortedMetrics)
      } else if (selectedFile?.file) {
        // 미리보기 데이터가 없으면 로드
        loadFilePreview(selectedFile.file, selectedPreviewFileId)
      }
    }
  }, [selectedPreviewFileId, pendingFiles, files])

  // 확정된 파일이 있고 선택된 파일이 없으면 첫 번째 파일 선택
  useEffect(() => {
    if (files.length > 0 && !selectedPreviewFileId) {
      const firstFile = files[0]
      if (firstFile) {
        setSelectedPreviewFileId(firstFile.id)
      }
    } else if (pendingFiles.length > 0 && !selectedPreviewFileId && files.length === 0) {
      // 확정된 파일이 없고 임시 파일만 있으면 첫 번째 임시 파일 선택
      const firstPendingFile = pendingFiles[0]
      if (firstPendingFile) {
        setSelectedPreviewFileId(firstPendingFile.id)
      }
    }
  }, [files.length, pendingFiles.length, selectedPreviewFileId])

  const handleAnalyze = async () => {
    // 확정된 파일만 사용
    const confirmedFiles = files.filter((f) => f.isConfirmed !== false)
    if (confirmedFiles.length === 0) {
      setError('파일을 업로드하고 저장해주세요.')
      return
    }

    setLoading(true)
    setLoadingMessage('파일을 업로드하고 있습니다...')
    setError(null)
    setResults(null)
    setExcelUrl(null)
    setParsedDataUrl(null)

    try {
      // 모든 KPI를 하나로 통합
      const primaryKPIs: KPIConfig[] = []

      config.kpis.forEach((kpi) => {
        // 모든 KPI를 포함하되, name 또는 numerator가 있어야 함
        if (kpi.name || kpi.numerator) {
          // revenue 타입은 denominator 불필요
          if (kpi.type === 'revenue') {
            primaryKPIs.push(kpi)
          }
          // simple과 variation_only 타입도 denominator 불필요
          else if (kpi.type === 'simple' || kpi.type === 'variation_only') {
            primaryKPIs.push({
              name: kpi.name || kpi.numerator || 'Unknown',
              numerator: kpi.numerator || kpi.name || '',
              denominator: kpi.denominator || '',
              type: kpi.type
            })
          }
          // 다른 타입은 denominator가 있으면 포함, 없어도 포함 (선택사항으로 처리)
          else {
            primaryKPIs.push(kpi)
          }
        }
      })

      const formData = new FormData()
      
      // 확정된 파일만 추가
      confirmedFiles.forEach((fileMeta) => {
        formData.append('files', fileMeta.file)
      })
      
      // 파일 메타데이터 추가
      formData.append('fileMetadata', JSON.stringify(
        confirmedFiles.map((f) => ({
          country: f.country,
          reportOrder: f.reportOrder,
        }))
      ))
      
      formData.append('config', JSON.stringify({
        primaryKPIs,
        variationCount: variationCount,
        segments: segments.filter(s => s.trim() !== ''),
        useAI: useAI,
      }))

      setLoadingMessage('파일을 분석하고 있습니다...')

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '분석 중 오류가 발생했습니다.')
      }

      const data = await response.json()
      
      // 디버그: 결과에 포함된 국가 정보 확인
      if (data.results) {
        const allResults = [
          ...(data.results.primaryResults || []),
        ]
        const countries = [...new Set(allResults.map((r: any) => r.country).filter(Boolean))]
        console.log('받은 결과에 포함된 국가:', countries)
        console.log('각 국가별 결과 개수:', countries.map(c => ({
          country: c,
          count: allResults.filter((r: any) => r.country === c).length
        })))
      }
      
      setResults(data.results)
      
      // 결과가 변경되면 선택된 리포트 순서 초기화
      setSelectedReportOrder(null)
      
      if (data.excelUrl) {
        setExcelUrl(data.excelUrl)
      }
      if (data.parsedDataUrl) {
        setParsedDataUrl(data.parsedDataUrl)
      }
      if (data.excelBase64) {
        setExcelBase64(data.excelBase64)
      }
      if (data.parsedDataBase64) {
        setParsedDataBase64(data.parsedDataBase64)
      }
    } catch (err: any) {
      setError(err.message || '분석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const downloadExcel = () => {
    if (excelBase64) {
      // Base64 데이터를 Blob으로 변환하여 다운로드
      const byteCharacters = atob(excelBase64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'ab_test_report.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } else if (excelUrl) {
      window.open(excelUrl, '_blank')
    }
  }

  const downloadParsedData = () => {
    if (parsedDataBase64) {
      // Base64 데이터를 Blob으로 변환하여 다운로드
      const byteCharacters = atob(parsedDataBase64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'parsed_data.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } else if (parsedDataUrl) {
      window.open(parsedDataUrl, '_blank')
    }
  }

  // 사이드바 리사이즈 핸들러
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      
      const newWidth = e.clientX
      const minWidth = 250
      const maxWidth = window.innerWidth * 0.7
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }
  
  // KPI별로 그룹화
  const groupByKPI = (results: any[]) => {
    const groups: { [key: string]: any[] } = {}
    results.forEach((r: any) => {
      const kpiName = r.kpiName || 'Unknown'
      if (!groups[kpiName]) {
        groups[kpiName] = []
      }
      groups[kpiName].push(r)
    })
    return groups
  }

  // 리포트 순서별로 그룹화
  const groupByReportOrder = (results: any[]) => {
    const groups: { [key: string]: any[] } = {}
    results.forEach((r: any) => {
      const reportOrder = r.reportOrder || 'Unknown'
      if (!groups[reportOrder]) {
        groups[reportOrder] = []
      }
      groups[reportOrder].push(r)
    })
    return groups
  }

  // 국가별로 그룹화
  const groupByCountry = (results: any[]) => {
    const groups: { [key: string]: any[] } = {}
    results.forEach((r: any) => {
      const country = r.country || 'Unknown'
      if (!groups[country]) {
        groups[country] = []
      }
      groups[country].push(r)
    })
    // 디버그: 그룹화된 국가 정보 출력
    const countries = Object.keys(groups)
    if (countries.length > 0) {
      console.log('그룹화된 국가:', countries)
      console.log('각 국가별 결과 개수:', countries.map(c => ({ country: c, count: groups[c].length })))
    }
    return groups
  }

  // 리포트 순서 정렬 순서 정의
  const reportOrderSort = (order: string) => {
    const orderMap: { [key: string]: number } = {
      '1st report': 1,
      '2nd report': 2,
      '3rd report': 3,
      'final report': 4,
    }
    return orderMap[order] || 999
  }

  // 모든 결과를 하나로 합치기
  const getAllResults = () => {
    const allResults: any[] = []
    if (results?.primaryResults) {
      allResults.push(...results.primaryResults)
    }
    return allResults
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
          {/* 1단계: 파일 업로드 */}
          {currentStep === 1 && (
        <div className="form-section">
          <h2>1. 파일 업로드</h2>
          <div className="form-group">
            <label htmlFor="file">Excel/CSV 파일 (여러 개 선택 가능)</label>
            <input
              type="file"
              id="file"
              accept=".xlsx,.csv"
              multiple
              onChange={handleFileChange}
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
                  onClick={() => handleFileClick(fileMeta.id)}
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
                        removeFile(fileMeta.id)
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
                    {/* 드롭다운 한 줄 배치 */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>국가</label>
              <select
                          value={fileMeta.country}
                          onChange={(e) => updateFileMetadata(fileMeta.id, 'country', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }}
              >
                {['AE', 'AE_AR', 'AFRICA_EN', 'AFRICA_FR', 'AFRICA_PT', 'AL', 'AR', 'AT', 'AU', 'AZ', 'BA', 'BD', 'BE', 'BE_FR', 'BG', 'BR', 'CA', 'CA_FR', 'CH', 'CH_FR', 'CL', 'CN', 'CO', 'CZ', 'DE', 'DK', 'EE', 'EG', 'ES', 'FI', 'FR', 'GE', 'GR', 'HK', 'HK_EN', 'HR', 'HU', 'ID', 'IE', 'IL', 'IN', 'IQ_AR', 'IQ_KU', 'IRAN', 'IT', 'JP', 'KB', 'KZ_KZ', 'KZ_RU', 'LATIN', 'LATIN_EN', 'LEVANT', 'LEVANT_AR', 'LT', 'LV', 'MK', 'MM', 'MN', 'MX', 'MY', 'N_AFRICA', 'NL', 'NO', 'NZ', 'PE', 'PH', 'PK', 'PL', 'PS', 'PT', 'PY', 'RO', 'RS', 'SA', 'SA_EN', 'SE', 'SEC', 'SG', 'SI', 'SK', 'TH', 'TR', 'TW', 'UA', 'UK', 'US', 'UY', 'UZ_RU', 'UZ_UZ', 'VN', 'ZA'].map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>리포트 순서</label>
                        <select
                          value={fileMeta.reportOrder}
                          onChange={(e) => updateFileMetadata(fileMeta.id, 'reportOrder', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }}
                        >
                          <option value="1st report">1st report</option>
                          <option value="2nd report">2nd report</option>
                          <option value="3rd report">3rd report</option>
                          <option value="final report">final report</option>
                        </select>
                      </div>
                    </div>
                    {/* 저장 버튼 */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        confirmFile(fileMeta.id)
                      }}
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: '#27ae60',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600'
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
                  onClick={() => handleFileClick(fileMeta.id)}
                  style={{ 
                    marginBottom: '15px', 
                    padding: '12px', 
                    border: `2px solid ${selectedPreviewFileId === fileMeta.id ? '#3498db' : '#27ae60'}`,
                    borderRadius: '4px',
                    backgroundColor: selectedPreviewFileId === fileMeta.id ? '#e3f2fd' : '#e8f5e9',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '13px', fontWeight: '600' }}>
                        {fileMeta.file.name}
                        {selectedPreviewFileId === fileMeta.id && ' 👁️'}
                      </span>
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                        국가: {fileMeta.country} | 리포트 순서: {fileMeta.reportOrder}
        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          // 파일을 다시 pendingFiles로 이동
                          const fileToEdit = files.find((f) => f.id === fileMeta.id)
                          if (fileToEdit) {
                            setFiles((prev) => prev.filter((f) => f.id !== fileMeta.id))
                            setPendingFiles((prev) => [...prev, { ...fileToEdit, isConfirmed: false }])
                          }
                        }}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#ffffff',
                          color: '#495057',
                          border: '1px solid #ced4da',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(fileMeta.id)
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
          
          {/* 다음 버튼 */}
          {files.length > 0 && (
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                style={{
                  padding: '10px 20px',
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
          )}
        </div>
        )}

        {/* 2단계: Variation 및 세그먼트 설정 */}
        {currentStep === 2 && (
        <div className="form-section">
          <h2>2. 테스트 조건 설정</h2>
            <div className="form-group">
              <label htmlFor="variationCount">Variation 개수</label>
              <input
                type="number"
                id="variationCount"
                value={variationCount}
                onChange={(e) => setVariationCount(Math.max(1, parseInt(e.target.value) || 1))}
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
                    onChange={(e) => {
                      const newSegments = [...segments]
                      newSegments[index] = e.target.value
                      setSegments(newSegments)
                    }}
                    placeholder="세그먼트 이름"
                    style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                  />
                  {index > 0 && segments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newSegments = segments.filter((_, i) => i !== index)
                        setSegments(newSegments)
                      }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      삭제
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setSegments([...segments, ''])}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  marginTop: '8px'
                }}
              >
                세그먼트 추가
              </button>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                *Adobe Analytics에서 추출한 원본 파일과 동일한 순서로 세그먼트를 추가해주세요<br />
                ex. All Visits, PC, MO
              </p>
            </div>
          
          {/* 경고 메시지 */}
          {segments.some(seg => !seg || seg.trim() === '') && (
            <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px' }}>
              <span style={{ fontSize: '13px', color: '#856404' }}>
                ⚠️ 모든 세그먼트 이름을 입력해주세요.
              </span>
            </div>
          )}
          
          {/* 설정 중인 파일 경고 */}
          {pendingFiles.length > 0 && (
            <p style={{ 
              fontSize: '12px', 
              color: '#e67e22', 
              marginTop: '15px', 
              textAlign: 'center',
              padding: '10px',
              backgroundColor: '#fff8e1',
              border: '1px solid #ffc107',
              borderRadius: '4px'
            }}>
              ⚠️ 설정 중인 파일이 있습니다. 저장 버튼을 눌러 확정해주세요.
            </p>
          )}
          
          {/* 이전/다음 버튼 */}
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={() => {
                setCurrentStep(1)
                // 첫 번째 파일 선택하여 미리보기 표시
                const allFiles = [...pendingFiles, ...files]
                if (allFiles.length > 0) {
                  setSelectedPreviewFileId(allFiles[0].id)
                }
              }}
              style={{
                padding: '10px 20px',
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
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              disabled={segments.some(seg => !seg || seg.trim() === '')}
              style={{
                padding: '10px 20px',
                backgroundColor: segments.some(seg => !seg || seg.trim() === '') ? '#95a5a6' : '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: segments.some(seg => !seg || seg.trim() === '') ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                opacity: segments.some(seg => !seg || seg.trim() === '') ? 0.6 : 1
              }}
            >
              다음 단계 →
            </button>
          </div>
        </div>
        )}

        {/* 3단계: KPI 설정 */}
        {currentStep === 3 && (
        <div className="form-section">
          <h2>3. KPI 설정</h2>
          {config.kpis.map((kpi, index) => (
            <div key={index} className="kpi-item">
              <div className="form-group">
                <label>KPI 이름</label>
                <input
                  type="text"
                  value={kpi.name}
                  onChange={(e) => updateKPI(index, 'name', e.target.value)}
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
                      onChange={(e) => updateKPI(index, 'numerator', e.target.value)}
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
                    onChange={(e) => updateKPI(index, 'numerator', e.target.value)}
                    placeholder="예: (OR 2) Cart count"
                  />
                )}
              </div>
              <div className="form-group">
                <label>분모 (Denominator) {(kpi.type === 'simple' || kpi.type === 'variation_only') && '(선택사항)'}</label>
                {(kpi.type !== 'simple' && kpi.type !== 'variation_only') && availableMetrics.length > 0 ? (
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      list={`denominator-list-${index}`}
                      value={kpi.denominator}
                      onChange={(e) => updateKPI(index, 'denominator', e.target.value)}
                      placeholder="검색하거나 선택하세요..."
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                    />
                    <datalist id={`denominator-list-${index}`}>
                      {availableMetrics.map((metric, idx) => (
                        <option key={idx} value={metric}>{metric}</option>
                      ))}
                    </datalist>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      list={`denominator-list-${index}`}
                      value={kpi.denominator}
                      onChange={(e) => updateKPI(index, 'denominator', e.target.value)}
                      placeholder={(kpi.type === 'simple' || kpi.type === 'variation_only') ? '비율 계산 시에만 입력' : '예: (OR 2) Visits count'}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                    />
                    {availableMetrics.length > 0 && (
                      <datalist id={`denominator-list-${index}`}>
                        {availableMetrics.map((metric, idx) => (
                          <option key={idx} value={metric}>{metric}</option>
                        ))}
                      </datalist>
                    )}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>타입</label>
                <select
                  value={kpi.type}
                  onChange={(e) => updateKPI(index, 'type', e.target.value as any)}
                >
                  <option value="rate">Rate (비율)</option>
                  <option value="revenue">Revenue (매출)</option>
                  <option value="rpv">RPV (Revenue per Visit)</option>
                  <option value="simple">Simple (단순 메트릭)</option>
                  <option value="variation_only">Variation Only (Variation 비율만)</option>
                </select>
              </div>
              {index > 0 && config.kpis.length > 1 && (
              <button
                className="remove-btn"
                onClick={() => removeKPI(index)}
              >
                  삭제
              </button>
              )}
            </div>
          ))}
          <button 
            onClick={addKPI}
            style={{
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
            KPI 추가
          </button>

          <div className="form-group" style={{ marginTop: '25px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                style={{ marginRight: '8px', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span>AI 인사이트 생성 (Google Gemini 사용)</span>
            </label>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px', marginLeft: '26px' }}>
              AI를 사용하면 더 상세한 인사이트가 생성됩니다.
            </p>
          </div>
          {/* 이전/분석 버튼 */}
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              style={{
                flex: 1,
                padding: '10px 20px',
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
            <button 
              onClick={() => {
                setCurrentStep(4)
                handleAnalyze()
              }} 
              disabled={loading || files.filter((f) => f.isConfirmed !== false).length === 0} 
              style={{ 
                flex: 1,
                padding: '10px 20px',
                backgroundColor: loading || files.filter((f) => f.isConfirmed !== false).length === 0 ? '#95a5a6' : '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading || files.filter((f) => f.isConfirmed !== false).length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
            {loading ? '분석 중...' : '분석 실행'}
          </button>
        </div>
          {pendingFiles.length > 0 && (
            <p style={{ fontSize: '12px', color: '#e67e22', marginTop: '10px', textAlign: 'center' }}>
              ⚠️ 설정 중인 파일이 있습니다. 저장 버튼을 눌러 확정해주세요.
            </p>
          )}
        </div>
        )}

        {/* 4단계: 분석 결과 */}
        {currentStep === 4 && (
        <div className="form-section">
          <h2>4. 분석 결과 확인</h2>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>분석 중입니다...</p>
            </div>
          ) : results ? (
            <div>
              <p style={{ color: '#27ae60', fontWeight: '600', marginBottom: '20px' }}>✓ 분석이 완료되었습니다.</p>
              
              {/* 다운로드 버튼 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(excelUrl || excelBase64) && (
                  <button 
                    className="btn-secondary" 
                    onClick={downloadExcel}
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Excel 리포트 다운로드
                  </button>
                )}
                {(parsedDataUrl || parsedDataBase64) && (
                  <button 
                    onClick={downloadParsedData}
                    style={{
                      width: '100%',
                      backgroundColor: '#2c3e50',
                      color: 'white',
                      padding: '10px',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      transition: 'background-color 0.3s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#34495e'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2c3e50'}
                  >
                    파싱된 데이터 다운로드
                  </button>
                )}
              </div>
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

        {/* 인사이트 섹션 (form-section 밖) */}
        {currentStep === 4 && results && results.insights && (
          <div style={{ 
            marginTop: '20px',
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ 
              margin: 0, 
              marginBottom: '15px',
              color: '#34495e',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingBottom: '10px',
              borderBottom: '2px solid #3498db'
            }}>
              인사이트
              {results.useAI && results.insights && results.insights.summary && results.insights.summary.length > 0 && (
                <span style={{
                  display: 'inline-block',
                  backgroundColor: '#4285f4',
                  color: 'white',
                  fontSize: '10px',
                  padding: '3px 8px',
                  borderRadius: '10px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  AI
                </span>
              )}
            </h3>
            
            {results.insights.summary && results.insights.summary.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                {results.insights.summary
                  .filter((item: string) => item && item.trim() !== '')
                  .map((item: string, i: number) => {
                    const trimmedItem = item.trim()
                    // 구분선 (=== 로 시작하는 경우) 처리
                    if (trimmedItem.startsWith('===')) {
                      return (
                        <div key={i} style={{
                          marginTop: i > 0 ? '15px' : '0',
                          marginBottom: '8px',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: '#34495e',
                          paddingBottom: '6px',
                          borderBottom: '2px solid #3498db'
                        }}>
                          {trimmedItem.replace(/=/g, '').trim()}
                        </div>
                      )
                    }
                    // AI 심층 분석 텍스트 파싱 및 스타일링
                    const parseAIText = (text: string) => {
                      // 줄바꿈 처리
                      const lines = text.split('\n').filter(line => line.trim())
                      return lines.map((line, lineIdx) => {
                        // **볼드** 처리
                        const boldRegex = /\*\*(.+?)\*\*/g
                        const parts: (string | JSX.Element)[] = []
                        let lastIndex = 0
                        let match
                        
                        while ((match = boldRegex.exec(line)) !== null) {
                          if (match.index > lastIndex) {
                            parts.push(line.substring(lastIndex, match.index))
                          }
                          // 중요 키워드에 따라 색상 결정
                          const boldText = match[1]
                          let color = '#2c3e50'
                          if (boldText.includes('증가') || boldText.includes('상승') || boldText.includes('개선') || boldText.includes('우세')) {
                            color = '#27ae60' // 녹색
                          } else if (boldText.includes('감소') || boldText.includes('하락') || boldText.includes('부족') || boldText.includes('실패')) {
                            color = '#e74c3c' // 빨간색
                          } else if (boldText.includes('변화') || boldText.includes('비교') || boldText.includes('분석')) {
                            color = '#3498db' // 파란색
                          }
                          
                          parts.push(
                            <strong key={`bold-${lineIdx}-${match.index}`} style={{ color, fontWeight: '700' }}>
                              {boldText}
                            </strong>
                          )
                          lastIndex = match.index + match[0].length
                        }
                        if (lastIndex < line.length) {
                          parts.push(line.substring(lastIndex))
                        }
                        
                        return (
                          <div key={lineIdx} style={{ marginBottom: lineIdx < lines.length - 1 ? '8px' : '0' }}>
                            {parts.length > 0 ? parts : line}
                          </div>
                        )
                      })
                    }
                    
                    // 일반 항목
                    return (
                      <div key={i} style={{ 
                        padding: '12px 15px', 
                        marginBottom: '10px', 
                        background: '#f8f9fa',
                        borderRadius: '4px',
                        borderLeft: '4px solid #3498db',
                        fontSize: '14px',
                        lineHeight: '1.8',
                        color: '#2c3e50',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {trimmedItem.startsWith('•') || trimmedItem.startsWith('-') || trimmedItem.startsWith('└') 
                          ? parseAIText(trimmedItem.substring(1).trim())
                          : parseAIText(trimmedItem)}
                      </div>
                    )
                  })}
              </div>
            )}
            
            {results.insights.recommendation && (
              <div style={{
                padding: '15px',
                background: '#fff3cd',
                border: '2px solid #ffc107',
                borderRadius: '6px',
                marginTop: '15px'
              }}>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: 'bold', 
                  color: '#856404',
                  marginBottom: '8px'
                }}>
                  최종 추천
                </div>
                <div style={{ 
                  fontSize: '15px', 
                  color: '#856404',
                  fontWeight: '600',
                  lineHeight: '1.6'
                }}>
                  {results.insights.recommendation}
                </div>
              </div>
            )}
          </div>
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
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                이전으로
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentStep(1)
                  // 첫 번째 파일 선택하여 미리보기 표시
                  const allFiles = [...pendingFiles, ...files]
                  if (allFiles.length > 0) {
                    setSelectedPreviewFileId(allFiles[0].id)
                  }
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                처음으로
              </button>
            </div>
          </div>
        )}
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
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: currentStep === 1 ? '#3498db' : currentStep > 1 ? '#27ae60' : '#999',
              fontSize: '14px',
              fontWeight: currentStep === 1 ? '700' : currentStep > 1 ? '600' : '400'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: currentStep === 1 ? '#3498db' : currentStep > 1 ? '#27ae60' : '#e0e0e0',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {currentStep > 1 ? '✓' : '1'}
              </div>
              <span>파일 업로드</span>
            </div>
            <div style={{ 
              width: '40px', 
              height: '2px', 
              backgroundColor: currentStep > 1 ? '#27ae60' : '#e0e0e0' 
            }} />
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: currentStep === 2 ? '#3498db' : currentStep > 2 ? '#27ae60' : '#999',
              fontSize: '14px',
              fontWeight: currentStep === 2 ? '700' : currentStep > 2 ? '600' : '400'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: currentStep === 2 ? '#3498db' : currentStep > 2 ? '#27ae60' : '#e0e0e0',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {currentStep > 2 ? '✓' : '2'}
              </div>
              <span>테스트 조건 설정</span>
            </div>
            <div style={{ 
              width: '40px', 
              height: '2px', 
              backgroundColor: currentStep > 2 ? '#27ae60' : '#e0e0e0' 
            }} />
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: currentStep === 3 ? '#3498db' : currentStep > 3 ? '#27ae60' : '#999',
              fontSize: '14px',
              fontWeight: currentStep === 3 ? '700' : currentStep > 3 ? '600' : '400'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: currentStep === 3 ? '#3498db' : currentStep > 3 ? '#27ae60' : '#e0e0e0',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {currentStep > 3 ? '✓' : '3'}
              </div>
              <span>KPI 설정</span>
            </div>
            <div style={{ 
              width: '40px', 
              height: '2px', 
              backgroundColor: currentStep > 3 ? '#27ae60' : '#e0e0e0' 
            }} />
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: currentStep === 4 ? '#3498db' : '#999',
              fontSize: '14px',
              fontWeight: currentStep === 4 ? '700' : '400'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: currentStep === 4 ? '#3498db' : '#e0e0e0',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                4
              </div>
              <span>분석 결과 확인</span>
            </div>
          </div>
        </div>
        
        <div style={{ padding: '0 20px' }}>
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
            <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
              잠시만 기다려주세요...
            </div>
          </div>
        )}

        {/* Raw Data 정보 - 분석 완료 후에만 표시, 접었다 폈다 가능 */}
        {!loading && results && rawDataInfo && rawDataInfo.length > 0 && (
          <div className="results-section" style={{ marginBottom: '20px' }}>
            <div style={{ 
              background: '#f8f9fa', 
              padding: '15px', 
              borderRadius: '6px', 
              border: '1px solid #e0e0e0',
              fontSize: '14px',
              lineHeight: '1.8'
            }}>
              <div 
                style={{ 
                  fontWeight: '600', 
                  marginBottom: rawDataExpanded ? '10px' : '0',
                  color: '#34495e',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
                onClick={() => setRawDataExpanded(!rawDataExpanded)}
              >
                <span>Raw Data 정보</span>
                <span style={{ fontSize: '12px', color: '#999' }}>
                  {rawDataExpanded ? '▼ 접기' : '▶ 펼치기'}
                </span>
              </div>
              {rawDataExpanded && rawDataInfo.map((info, idx) => (
                <div key={idx} style={{ marginBottom: '8px', color: '#555' }}>
                  {info}
                </div>
              ))}
            </div>
          </div>
        )}

        {results && (
          <div className="results-section">
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>분석 결과</h2>
            </div>
            
            {results.warning && (
              <div className="error" style={{ marginBottom: '20px' }}>
                ⚠️ {results.warning}
              </div>
            )}
            
            {getAllResults().length === 0 && (
              <div className="error">
                <h3>결과가 없습니다</h3>
                <p>가능한 원인:</p>
                <ul>
                  <li>Excel 파일 형식이 예상과 다를 수 있습니다</li>
                  <li>메트릭 라벨이 정확하지 않을 수 있습니다 (대소문자, 공백 확인)</li>
                  <li>국가 코드가 일치하지 않을 수 있습니다</li>
                  <li>서버 콘솔에서 디버그 로그를 확인해주세요</li>
                </ul>
              </div>
            )}

            {getAllResults().length > 0 && (() => {
              const reportOrderGroups = Object.entries(groupByReportOrder(getAllResults()))
                .sort(([a], [b]) => reportOrderSort(a) - reportOrderSort(b))
              
              // 디버깅: 리포트 순서 그룹 확인
              console.log('리포트 순서 그룹:', reportOrderGroups.map(([order, results]) => ({ order, count: results.length })))
              
              // 첫 번째 리포트 순서를 기본 선택
              const defaultReportOrder = reportOrderGroups.length > 0 ? reportOrderGroups[0][0] : null
              const currentReportOrder = selectedReportOrder || defaultReportOrder
              
              console.log('현재 선택된 리포트 순서:', currentReportOrder)
              console.log('리포트 순서 개수:', reportOrderGroups.length)
              
              return (
                <>
                  {/* 리포트 순서별 탭 */}
                  {reportOrderGroups.length > 0 && (
                    <div style={{ 
                      marginBottom: '20px', 
                      borderBottom: '2px solid #e0e0e0',
                      display: 'flex',
                      gap: '5px'
                    }}>
                      {reportOrderGroups.map(([reportOrder]) => (
                        <button
                          key={reportOrder}
                          onClick={() => setSelectedReportOrder(reportOrder)}
                          disabled={reportOrderGroups.length === 1}
                          style={{
                            padding: '12px 24px',
                            border: 'none',
                            borderBottom: currentReportOrder === reportOrder ? '3px solid #3498db' : '3px solid transparent',
                            backgroundColor: currentReportOrder === reportOrder ? '#ffffff' : '#f5f5f5',
                            color: currentReportOrder === reportOrder ? '#3498db' : '#666',
                            fontWeight: currentReportOrder === reportOrder ? 'bold' : 'normal',
                            cursor: reportOrderGroups.length === 1 ? 'default' : 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.2s',
                            marginBottom: '-2px',
                            opacity: reportOrderGroups.length === 1 ? 0.7 : 1
                          }}
                        >
                          {reportOrder}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* 선택된 리포트 순서의 결과만 표시 */}
                  {reportOrderGroups
                    .filter(([reportOrder]) => reportOrder === currentReportOrder)
                    .map(([reportOrder, reportResults]: [string, any[]]) => (
                      <div key={reportOrder} style={{ marginBottom: '50px' }}>
                        {reportOrderGroups.length === 1 && (
                          <h3 style={{ 
                            color: '#2c3e50', 
                            marginBottom: '25px', 
                            paddingBottom: '10px', 
                            borderBottom: '3px solid #3498db',
                            fontSize: '20px',
                            fontWeight: 'bold'
                          }}>
                            {reportOrder}
                          </h3>
                        )}
                      {/* 각 리포트 순서 내에서 국가별로 그룹화 */}
                      {Object.entries(groupByCountry(reportResults))
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([country, countryResults]: [string, any[]]) => (
                          <div key={country} style={{ marginBottom: '35px' }}>
                            <h4 style={{ 
                              color: '#34495e', 
                              marginBottom: '20px', 
                              paddingBottom: '8px', 
                              borderBottom: '2px solid #95a5a6',
                              fontSize: '18px',
                              fontWeight: '600'
                            }}>
                              {country}
                    </h4>
                            {/* 각 국가 내에서 KPI별로 그룹화 */}
                            {Object.entries(groupByKPI(countryResults)).map(([kpiName, kpiResults]: [string, any[]]) => {
                              // 타입 확인
                              const firstResult = kpiResults[0]
                              
                              // Variation Only 타입: controlValue가 null이고 variationValue가 있으면
                              const isVariationOnly = firstResult && 
                                (firstResult.controlValue === null || firstResult.controlValue === undefined) &&
                                (firstResult.variationValue !== null && firstResult.variationValue !== undefined)
                              
                              // Simple 타입(분모 없음): controlRate가 null이고 controlValue가 있으면
                              const isSimpleType = firstResult && 
                                firstResult.controlRate === null && 
                                firstResult.controlValue !== null && 
                                firstResult.controlValue !== undefined
                              
                              return (
                              <div key={kpiName} style={{ marginBottom: '25px' }}>
                                <h5 style={{ color: '#7f8c8d', marginBottom: '12px', paddingBottom: '5px', borderBottom: '1px solid #bdc3c7', fontSize: '16px' }}>
                                  {kpiName}
                                </h5>
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>세그먼트</th>
                                            {variationCount > 1 ? (
                                          <>
                                            {!isVariationOnly && (
                                              <th>{isSimpleType ? 'Control Count' : 'Control Rate (%)'}</th>
                                            )}
                                            {Array.from({ length: variationCount }, (_, i) => (
                                              <th key={`var-rate-${i}`}>{isSimpleType ? `Variation ${i + 1} Count` : `Variation ${i + 1} Rate (%)`}</th>
                                            ))}
                                            {!isVariationOnly && (
                                              <>
                                                {Array.from({ length: variationCount }, (_, i) => (
                                                  <th key={`var-uplift-${i}`}>Variation {i + 1} Uplift (%)</th>
                                                ))}
                                                {Array.from({ length: variationCount }, (_, i) => (
                                                  <th key={`var-verdict-${i}`}>Variation {i + 1} Verdict</th>
                                                ))}
                                              </>
                                            )}
                                          </>
                                        ) : (
                                          <>
                            {!isVariationOnly && (
                              <th>{isSimpleType ? 'Control Count' : 'Control Rate (%)'}</th>
                            )}
                            <th>{isSimpleType ? 'Variation Count' : 'Variation Rate (%)'}</th>
                            {!isVariationOnly && (
                              <>
                                <th>Uplift (%) (Confidence)</th>
                                <th>Verdict</th>
                              </>
                            )}
                                          </>
                                        )}
                          </tr>
                        </thead>
                        <tbody>
                                      {kpiResults.map((r: any, i: number) => {
                                        // 에러 메시지가 있는 경우
                                        if (r.error && r.errorMessage) {
                                          const errorColSpan = variationCount > 1 
                                            ? (isVariationOnly ? 1 + variationCount : 1 + variationCount * 3)
                                            : (isVariationOnly ? 2 : 4)
                                          return (
                                            <tr key={i} style={{ backgroundColor: '#fff3cd' }}>
                                              <td colSpan={errorColSpan} style={{ color: '#856404', padding: '15px', textAlign: 'center' }}>
                                                <strong>⚠️ {r.errorMessage}</strong>
                              </td>
                            </tr>
                                          )
                                        }
                                        
                                        if (variationCount > 1 && r.variations && r.variations.length > 0) {
                                          // Variation이 여러 개인 경우
                                          const isAllVisits = i === 0 || (r.device && r.device.toLowerCase().includes('all visits'))
                                          return (
                            <tr key={i} style={isAllVisits ? { backgroundColor: '#f0f8ff', fontWeight: '600' } : {}}>
                                              <td style={{ 
                                                backgroundColor: '#e8f4f8', 
                                                fontWeight: '700', 
                                                color: '#2c3e50',
                                                borderRight: '2px solid #3498db'
                                              }}>
                                                {r.device || 'N/A'}
                                              </td>
                                  {!isVariationOnly && (
                                    <td style={(r.controlRate === null || r.controlRate === undefined) && (r.controlValue === null || r.controlValue === undefined) ? { backgroundColor: '#e0e0e0' } : {}}>
                                      {r.controlRate !== null && r.controlRate !== undefined ? (
                                        <>
                                          <strong>{(r.controlRate * 100).toFixed(2)}%</strong>
                                          {r.controlValue !== null && r.controlValue !== undefined && r.denominatorSizeControl !== null && r.denominatorSizeControl !== undefined && (
                                            <span style={{ fontSize: '11px', color: '#666', marginLeft: '5px' }}>
                                              ({Math.round(r.controlValue)}/{Math.round(r.denominatorSizeControl)})
                                </span>
                                          )}
                                        </>
                                      ) : r.controlValue !== null && r.controlValue !== undefined ? (
                                        <strong>{Math.round(r.controlValue).toLocaleString()}</strong>
                                      ) : (
                                        <span style={{ color: '#999' }}>N/A</span>
                                      )}
                                    </td>
                                  )}
                                  {Array.from({ length: variationCount }, (_, idx) => {
                                    const varData = r.variations.find((v: any) => v.variationNum === idx + 1)
                                    return (
                                      <td key={`rate-${idx}`} style={varData && (varData.variationRate === null || varData.variationRate === undefined) && (varData.variationValue === null || varData.variationValue === undefined) ? { backgroundColor: '#e0e0e0' } : {}}>
                                        {varData && varData.variationRate !== null && varData.variationRate !== undefined ? (
                                          <>
                                            <strong>{(varData.variationRate * 100).toFixed(2)}%</strong>
                                            {varData.variationValue !== null && varData.variationValue !== undefined && varData.denominatorSizeVariation !== null && varData.denominatorSizeVariation !== undefined && (
                                              <span style={{ fontSize: '11px', color: '#666', marginLeft: '5px' }}>
                                                ({Math.round(varData.variationValue)}/{Math.round(varData.denominatorSizeVariation)})
                                              </span>
                                            )}
                                          </>
                                        ) : varData && varData.variationValue !== null && varData.variationValue !== undefined ? (
                                          <strong>{Math.round(varData.variationValue).toLocaleString()}</strong>
                                        ) : (
                                          <span style={{ color: '#999' }}>N/A</span>
                                        )}
                                      </td>
                                    )
                                  })}
                                  {!isVariationOnly && (
                                    <>
                                      {Array.from({ length: variationCount }, (_, idx) => {
                                        const varData = r.variations.find((v: any) => v.variationNum === idx + 1)
                                        const upliftValue = varData?.uplift
                                        const confidenceValue = varData?.confidence
                                        const upliftColor = upliftValue !== null && upliftValue !== undefined
                                          ? upliftValue < 0 ? '#e74c3c' : '#233ffa'
                                          : '#2c3e50'
                                        return (
                                          <td key={`uplift-${idx}`} style={varData && (upliftValue === null || upliftValue === undefined) ? { backgroundColor: '#e0e0e0' } : {}}>
                                            {varData && upliftValue !== null && upliftValue !== undefined ? (
                                              <>
                                                <strong style={{ color: upliftColor }}>
                                                  {upliftValue.toFixed(2)}%
                                                </strong>
                                                {confidenceValue !== null && confidenceValue !== undefined && (
                                                  <span style={{ 
                                                    color: '#000000',
                                                    fontWeight: confidenceValue >= 95 ? '700' : '400',
                                                    marginLeft: '4px'
                                                  }}>
                                                    ({confidenceValue.toFixed(2)}%)
                                </span>
                                                )}
                                              </>
                                            ) : (
                                              <span style={{ color: '#999' }}>N/A</span>
                                            )}
                              </td>
                                        )
                                      })}
                                      {Array.from({ length: variationCount }, (_, idx) => {
                                        const varData = r.variations.find((v: any) => v.variationNum === idx + 1)
                                        return (
                                          <td key={`verdict-${idx}`} style={!varData || !varData.verdict ? { backgroundColor: '#e0e0e0' } : {}}>
                                            {varData?.verdict ? (
                                              <span className={`verdict-${varData.verdict.replace(/\s/g, '-').replace('(', '').replace(')', '').toLowerCase()}`}>
                                                {varData.verdict}
                                              </span>
                                            ) : (
                                              <span style={{ color: '#999' }}>N/A</span>
                                            )}
                                          </td>
                                        )
                                      })}
                                    </>
                                  )}
                            </tr>
                              )
                                        } else {
                                          // Variation이 1개인 경우 (기존 로직)
                                          const isAllVisits = i === 0 || (r.device && r.device.toLowerCase().includes('all visits'))
                                          return (
                            <tr key={i} style={isAllVisits ? { backgroundColor: '#f0f8ff', fontWeight: '600' } : {}}>
                                              <td style={{ 
                                                backgroundColor: '#e8f4f8', 
                                                fontWeight: '700', 
                                                color: '#2c3e50',
                                                borderRight: '2px solid #3498db'
                                              }}>
                                                {r.device || 'N/A'}
                                              </td>
                                              {!isVariationOnly && (
                                                <td style={(r.controlRate === null || r.controlRate === undefined) && (r.controlValue === null || r.controlValue === undefined) ? { backgroundColor: '#e0e0e0' } : {}}>
                                                  {r.controlRate !== null && r.controlRate !== undefined ? (
                                                    <>
                                                      <strong>{(r.controlRate * 100).toFixed(2)}%</strong>
                                                      {r.controlValue !== null && r.controlValue !== undefined && r.denominatorSizeControl !== null && r.denominatorSizeControl !== undefined && (
                                                        <span style={{ fontSize: '11px', color: '#666', marginLeft: '5px' }}>
                                                          ({Math.round(r.controlValue)}/{Math.round(r.denominatorSizeControl)})
                                </span>
                                                      )}
                                                    </>
                                                  ) : r.controlValue !== null && r.controlValue !== undefined ? (
                                                    <strong>{Math.round(r.controlValue).toLocaleString()}</strong>
                                                  ) : (
                                                    <span style={{ color: '#999' }}>N/A</span>
                                                  )}
                                                </td>
                                              )}
                                              <td style={(r.variationRate === null || r.variationRate === undefined) && (r.variationValue === null || r.variationValue === undefined) ? { backgroundColor: '#e0e0e0' } : {}}>
                                                {r.variationRate !== null && r.variationRate !== undefined ? (
              <>
                                                    <strong>{(r.variationRate * 100).toFixed(2)}%</strong>
                                                    {r.variationValue !== null && r.variationValue !== undefined && r.denominatorSizeVariation !== null && r.denominatorSizeVariation !== undefined && (
                                                      <span style={{ fontSize: '11px', color: '#666', marginLeft: '5px' }}>
                                                        ({Math.round(r.variationValue)}/{Math.round(r.denominatorSizeVariation)})
                                                      </span>
                                                    )}
                                                  </>
                                                ) : r.variationValue !== null && r.variationValue !== undefined ? (
                                                  <strong>{Math.round(r.variationValue).toLocaleString()}</strong>
                                                ) : (
                                                  <span style={{ color: '#999' }}>N/A</span>
                                                )}
                                              </td>
                                              {!isVariationOnly && (
                                                <>
                                                  <td style={(r.uplift === null || r.uplift === undefined) ? { backgroundColor: '#e0e0e0' } : {}}>
                                                    {r.uplift !== null && r.uplift !== undefined ? (
                                                      <>
                                                        <strong style={{ 
                                                          color: r.uplift < 0 ? '#e74c3c' : '#233ffa'
                                                        }}>
                                                          {r.uplift.toFixed(2)}%
                                                        </strong>
                                                        {r.confidence !== null && r.confidence !== undefined && (
                                                          <span style={{ 
                                                            color: '#000000',
                                                            fontWeight: r.confidence >= 95 ? '700' : '400',
                                                            marginLeft: '4px'
                                                          }}>
                                                            ({r.confidence.toFixed(2)}%)
                                                          </span>
                                                        )}
                                                      </>
                                                    ) : (
                                                      <span style={{ color: '#999' }}>N/A</span>
                                                    )}
                                                  </td>
                                                  <td style={!r.verdict ? { backgroundColor: '#e0e0e0' } : {}}>
                                                    {r.verdict ? (
                                                      <span className={`verdict-${r.verdict.replace(/\s/g, '-').replace('(', '').replace(')', '').toLowerCase()}`}>
                                                        {r.verdict}
                                                      </span>
                                                    ) : (
                                                      <span style={{ color: '#999' }}>N/A</span>
                                                    )}
                                                  </td>
                                                </>
                                              )}
                            </tr>
                                          )
                                        }
                                      })}
                        </tbody>
                      </table>
                    </div>
                              </div>
                            )
                            })}
                          </div>
                        ))}
                      </div>
                    ))
                  }
                </>
              )
            })()}

          </div>
        )}


        {!loading && (
          <>
            {!results && previewData && previewData.length > 0 ? (
              <div className="results-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h2 style={{ margin: 0 }}>Excel 파일 미리보기</h2>
                  
                  {/* 선택한 파일 미리보기 버튼 */}
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
                            onClick={() => handleFileClick(fileMeta.id)}
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
                
                {(() => {
                  const allFiles = [...pendingFiles, ...files]
                  const selectedFile = selectedPreviewFileId ? allFiles.find((f) => f.id === selectedPreviewFileId) : (files.length > 0 ? files[0] : (pendingFiles.length > 0 ? pendingFiles[0] : null))
                  return selectedFile ? (
                <p style={{ color: '#666', marginBottom: '15px' }}>
                      <strong>{selectedFile.file.name}</strong> 파일의 전체 데이터를 미리보기로 표시합니다. (총 {previewData?.length || 0}행, {previewHeaders?.length || 0}컬럼)
                    </p>
                  ) : (
                    <p style={{ color: '#666', marginBottom: '15px' }}>
                      업로드된 파일의 전체 데이터를 미리보기로 표시합니다. (총 {previewData?.length || 0}행, {previewHeaders?.length || 0}컬럼)
                    </p>
                  )
                })()}
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
            ) : !results && !previewData ? (
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
            ) : null}
          </>
        )}
        </div>
      </div>
      </div>
    </div>
  )
}
