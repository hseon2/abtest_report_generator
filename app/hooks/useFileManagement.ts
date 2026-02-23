import { useState, useEffect } from 'react'
import { FileMetadata } from '../types'
import { loadExcelPreview, extractMetrics, convertCsvToXlsx, isCsvFile } from '../utils/excelUtils'

export function useFileManagement() {
  const [files, setFiles] = useState<FileMetadata[]>([])
  const [pendingFiles, setPendingFiles] = useState<FileMetadata[]>([])
  const [previewData, setPreviewData] = useState<any[] | null>(null)
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([])
  const [availableMetrics, setAvailableMetrics] = useState<string[]>([])
  const [selectedPreviewFileId, setSelectedPreviewFileId] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) {
      return
    }

    // CSV 파일을 XLSX로 변환
    const processedFilesPromises = selectedFiles.map(async (file) => {
      let processedFile = file
      
      // CSV 파일이면 XLSX로 변환
      if (isCsvFile(file)) {
        console.log(`📄 CSV 파일 감지: ${file.name}, XLSX로 변환 중...`)
        try {
          processedFile = await convertCsvToXlsx(file)
        } catch (error) {
          console.error(`CSV 변환 실패: ${file.name}`, error)
          // 변환 실패 시 원본 파일 사용
          processedFile = file
        }
      }
      
      return {
        id: `${Date.now()}_${Math.random()}`,
        file: processedFile,
        country: 'UK',
        reportOrder: '1st report',
        isConfirmed: false,
      }
    })

    const newFiles: FileMetadata[] = await Promise.all(processedFilesPromises)

    setPendingFiles((prev) => [...prev, ...newFiles])

    if (newFiles.length > 0) {
      const firstFileId = newFiles[0].id
      setSelectedPreviewFileId(firstFileId)
      
      await loadFilePreviewHandler(newFiles[0].file, firstFileId)
      
      setTimeout(() => {
        const allFiles = [...pendingFiles, ...newFiles]
        const firstFile = allFiles.find((f) => f.id === firstFileId)
        if (firstFile?.previewData && firstFile?.previewHeaders) {
          setPreviewData(firstFile.previewData)
          setPreviewHeaders(firstFile.previewHeaders)
        }
      }, 200)
      
      for (let i = 1; i < newFiles.length; i++) {
        loadFilePreviewHandler(newFiles[i].file, newFiles[i].id)
      }
    }
    
    e.target.value = ''
  }

  const loadFilePreviewHandler = async (file: File, fileId: string) => {
    try {
      const { dataRows, columnHeaders } = await loadExcelPreview(file)
      
      setPendingFiles((prev) => {
        const updated = prev.map((f) =>
          f.id === fileId
            ? { ...f, previewData: dataRows, previewHeaders: columnHeaders }
            : f
        )
        
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
        
        if (fileId === selectedPreviewFileId) {
          setPreviewData(dataRows)
          setPreviewHeaders(columnHeaders)
        }
        
        return updated
      })
    } catch (error) {
      console.error('파일 미리보기 로드 오류:', error)
    }
  }

  const handleFileClick = (fileId: string) => {
    setSelectedPreviewFileId(fileId)
    const allFiles = [...pendingFiles, ...files]
    const selectedFile = allFiles.find((f) => f.id === fileId)
    
    if (selectedFile?.previewData && selectedFile?.previewHeaders) {
      setPreviewData(selectedFile.previewData)
      setPreviewHeaders(selectedFile.previewHeaders)
    } else if (selectedFile) {
      loadFilePreviewHandler(selectedFile.file, fileId)
    }
  }

  const updateFileMetadata = (id: string, field: keyof FileMetadata, value: any) => {
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
    const fileToConfirm = pendingFiles.find((f) => f.id === id)
    if (fileToConfirm) {
      setFiles((prev) => [...prev, { ...fileToConfirm, isConfirmed: true }])
      setPendingFiles((prev) => prev.filter((f) => f.id !== id))
      
      if (!selectedPreviewFileId && files.length === 0) {
        setSelectedPreviewFileId(id)
        if (fileToConfirm.previewData && fileToConfirm.previewHeaders) {
          setPreviewData(fileToConfirm.previewData)
          setPreviewHeaders(fileToConfirm.previewHeaders)
        }
      }
    }
  }

  const editFile = (id: string) => {
    const fileToEdit = files.find((f) => f.id === id)
    if (fileToEdit) {
      setPendingFiles((prev) => [...prev, { ...fileToEdit, isConfirmed: false }])
      setFiles((prev) => prev.filter((f) => f.id !== id))
      setSelectedPreviewFileId(id)
      if (fileToEdit.previewData && fileToEdit.previewHeaders) {
        setPreviewData(fileToEdit.previewData)
        setPreviewHeaders(fileToEdit.previewHeaders)
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
        
        const dataAsArray = selectedFile.previewData.map((row: any) => 
          selectedFile.previewHeaders!.map((header) => row[header])
        )
        
        console.log('=== 메트릭 추출 디버깅 ===')
        console.log('previewData 행 수:', selectedFile.previewData.length)
        console.log('첫 3개 행 (A 컬럼만):', dataAsArray.slice(0, 3).map(row => row[0]))
        
        const metrics = extractMetrics(dataAsArray)
        console.log('추출된 메트릭 개수:', metrics.length)
        console.log('추출된 메트릭 목록:', metrics)
        
        setAvailableMetrics(metrics)
      }
    }
  }, [selectedPreviewFileId, pendingFiles, files])

  return {
    files,
    pendingFiles,
    previewData,
    previewHeaders,
    availableMetrics,
    selectedPreviewFileId,
    handleFileChange,
    handleFileClick,
    updateFileMetadata,
    removeFile,
    confirmFile,
    editFile,
  }
}

