import { useState } from 'react'
import { Config, KPIConfig } from '../types'

export function useKPIConfig() {
  const [config, setConfig] = useState<Config>({
    kpis: [{ name: '', numerator: '', denominator: '', type: 'rate', exchangeRate: '', category: 'primary' }],
  })

  const addKPI = () => {
    setConfig({
      ...config,
      kpis: [
        ...config.kpis,
        { name: '', numerator: '', denominator: '', type: 'rate', exchangeRate: '', category: 'primary' },
      ],
    })
  }

  const removeKPI = (index: number) => {
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
    const next: KPIConfig = { ...updated[index], [field]: value }
    // numerator/denominator를 빈 문자열로 지우면 연결된 row 데이터도 함께 클리어
    if (field === 'numerator' && value === '') {
      next.numeratorRow = undefined
    }
    if (field === 'denominator' && value === '') {
      next.denominatorRow = undefined
    }
    updated[index] = next
    setConfig({ ...config, kpis: updated })
  }

  /**
   * 미리보기 표의 행을 클릭했을 때 호출. 선택된 행의 라벨(A열)과 행 전체 데이터를 KPI에 함께 저장한다.
   * 분석 시 Python이 이 row 데이터를 우선 사용해 정확히 선택된 행의 값으로 분석한다.
   */
  const setKPIRowSelection = (
    index: number,
    field: 'numerator' | 'denominator',
    label: string,
    rowData: Record<string, any>,
  ) => {
    const updated = [...config.kpis]
    if (field === 'numerator') {
      updated[index] = { ...updated[index], numerator: label, numeratorRow: rowData }
    } else {
      updated[index] = { ...updated[index], denominator: label, denominatorRow: rowData }
    }
    setConfig({ ...config, kpis: updated })
  }

  return {
    config,
    addKPI,
    removeKPI,
    updateKPI,
    setKPIRowSelection,
  }
}

