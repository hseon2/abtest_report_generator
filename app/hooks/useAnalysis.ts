import { useState } from 'react'
import { KPIConfig } from '../types'

export function useAnalysis() {
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState<string>('데이터를 분석하고 있습니다...')
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

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setResults(data.results)
      
      if (data.results?.primaryResults) {
        const allResults = [...(data.results.primaryResults || [])]
        const countries = [...new Set(allResults.map((r: any) => r.country).filter(Boolean))]
        console.log('받은 결과에 포함된 국가:', countries)
      }

      if (data.excelBase64) {
        setExcelBase64(data.excelBase64)
      }
      if (data.parsedDataBase64) {
        setParsedDataBase64(data.parsedDataBase64)
      }
      if (data.excelUrl) {
        setExcelUrl(data.excelUrl)
      }
      if (data.parsedDataUrl) {
        setParsedDataUrl(data.parsedDataUrl)
      }
      if (data.rawDataInfo) {
        setRawDataInfo(data.rawDataInfo)
      }
    } catch (err: any) {
      console.error('분석 중 오류:', err)
      setError(err.message || '분석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return {
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
    handleAnalyze,
    setRawDataExpanded,
    setSelectedReportOrder,
  }
}

