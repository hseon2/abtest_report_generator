import { useState } from 'react'
import { KPIConfig } from '../types'

export function useAnalysis() {
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState<string>('데이터를 분석하고 있습니다...')
  const [progressPercent, setProgressPercent] = useState<number | null>(null)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [excelUrl, setExcelUrl] = useState<string | null>(null)
  const [parsedDataUrl, setParsedDataUrl] = useState<string | null>(null)
  const [excelBase64, setExcelBase64] = useState<string | null>(null)
  const [parsedDataBase64, setParsedDataBase64] = useState<string | null>(null)
  const [rawDataInfo, setRawDataInfo] = useState<string[] | null>(null)
  const [rawDataExpanded, setRawDataExpanded] = useState<boolean>(false)
  const [selectedReportOrder, setSelectedReportOrder] = useState<string | null>(null)

  const handleAnalyze = async (
    confirmedFiles: any[],
    config: { kpis: KPIConfig[] },
    variationCount: number,
    segments: string[],
    useAI: boolean
  ) => {
    if (confirmedFiles.length === 0) {
      setError('파일을 업로드하고 저장해주세요.')
      return
    }

    setLoading(true)
    setLoadingMessage('파일을 업로드하고 있습니다...')
    setProgressPercent(0)
    setError(null)
    setResults(null)
    setExcelUrl(null)
    setParsedDataUrl(null)

    try {
      const primaryKPIs: KPIConfig[] = []

      console.log('=== KPI 디버깅 ===')
      console.log('전달받은 config.kpis:', config.kpis)
      console.log('KPI 개수:', config.kpis.length)

      config.kpis.forEach((kpi, index) => {
        console.log(`KPI ${index + 1}:`, kpi)
        console.log(`  - name: "${kpi.name}"`)
        console.log(`  - numerator: "${kpi.numerator}"`)
        console.log(`  - denominator: "${kpi.denominator}"`)
        console.log(`  - type: "${kpi.type}"`)
        
        if (kpi.name || kpi.numerator) {
          if (kpi.type === 'revenue') {
            primaryKPIs.push(kpi)
          } else if (kpi.type === 'simple' || kpi.type === 'variation_only') {
            primaryKPIs.push({
              name: kpi.name || kpi.numerator || 'Unknown',
              numerator: kpi.numerator || kpi.name || '',
              denominator: kpi.denominator || '',
              type: kpi.type
            })
          } else {
            primaryKPIs.push(kpi)
          }
        } else {
          console.log(`  ⚠️ KPI ${index + 1} 제외됨: name과 numerator가 모두 비어있음`)
        }
      })

      console.log('필터링 후 primaryKPIs:', primaryKPIs)
      console.log('primaryKPIs 개수:', primaryKPIs.length)

      const formData = new FormData()
      
      confirmedFiles.forEach((fileMeta) => {
        formData.append('files', fileMeta.file)
      })
      
      formData.append('fileMetadata', JSON.stringify(
        confirmedFiles.map((f) => ({
          country: f.country,
          reportOrder: f.reportOrder,
          startDate: f.startDate || null,
          endDate: f.endDate || null,
        }))
      ))
      
      // 디버깅: 전달되는 fileMetadata 확인
      console.log('=== 전달되는 fileMetadata ===')
      console.log(JSON.stringify(
        confirmedFiles.map((f) => ({
          country: f.country,
          reportOrder: f.reportOrder,
          startDate: f.startDate || null,
          endDate: f.endDate || null,
        })),
        null,
        2
      ))
      
      formData.append('config', JSON.stringify({
        kpis: primaryKPIs,
        variationCount,
        segments,
        useAI
      }))

      setLoadingMessage('데이터를 분석하고 있습니다...')
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`분석 실패: ${response.status} ${response.statusText}\n${errorText}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      if (!reader) throw new Error('스트림을 읽을 수 없습니다.')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const event = JSON.parse(trimmed) as { type: string; percent?: number; message?: string; error?: string; data?: any }
            if (event.type === 'progress') {
              setProgressPercent(event.percent ?? 0)
              if (event.message) setLoadingMessage(event.message)
            } else if (event.type === 'done' && event.data) {
              const data = event.data
              setResults(data.results)
              if (data.results?.primaryResults) {
                const allResults = [...(data.results.primaryResults || [])]
                const countries = [...new Set(allResults.map((r: any) => r.country).filter(Boolean))]
                console.log('받은 결과에 포함된 국가:', countries)
              }
              if (data.excelBase64) setExcelBase64(data.excelBase64)
              if (data.parsedDataBase64) setParsedDataBase64(data.parsedDataBase64)
              if (data.excelUrl) setExcelUrl(data.excelUrl)
              if (data.parsedDataUrl) setParsedDataUrl(data.parsedDataUrl)
              if (data.rawDataInfo) setRawDataInfo(data.rawDataInfo)
            } else if (event.type === 'error') {
              throw new Error(event.error || '분석 실패')
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue
            throw e
          }
        }
      }
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer.trim()) as { type: string; percent?: number; message?: string; error?: string; data?: any }
          if (event.type === 'done' && event.data) {
            const data = event.data
            setResults(data.results)
            if (data.excelBase64) setExcelBase64(data.excelBase64)
            if (data.parsedDataBase64) setParsedDataBase64(data.parsedDataBase64)
            if (data.excelUrl) setExcelUrl(data.excelUrl)
            if (data.parsedDataUrl) setParsedDataUrl(data.parsedDataUrl)
            if (data.rawDataInfo) setRawDataInfo(data.rawDataInfo)
          } else if (event.type === 'error') {
            throw new Error(event.error || '분석 실패')
          }
        } catch (e) {
          if (!(e instanceof SyntaxError)) throw e
        }
      }
    } catch (err: any) {
      console.error('분석 중 오류:', err)
      setError(err.message || '분석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
      setProgressPercent(null)
    }
  }

  return {
    loading,
    loadingMessage,
    progressPercent,
    results,
    error,
    excelUrl,
    parsedDataUrl,
    excelBase64,
    parsedDataBase64,
    rawDataInfo,
    rawDataExpanded,
    selectedReportOrder,
    handleAnalyze,
    setRawDataExpanded,
    setSelectedReportOrder,
  }
}

