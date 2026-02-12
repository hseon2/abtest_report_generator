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

      config.kpis.forEach((kpi) => {
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
        }
      })

      const formData = new FormData()
      
      confirmedFiles.forEach((fileMeta) => {
        formData.append('files', fileMeta.file)
      })
      
      formData.append('fileMetadata', JSON.stringify(
        confirmedFiles.map((f) => ({
          country: f.country,
          reportOrder: f.reportOrder,
        }))
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
    handleAnalyze,
  }
}

