import { useState } from 'react'
import { Config, KPIConfig } from '../types'

export function useKPIConfig() {
  const [config, setConfig] = useState<Config>({
    kpis: [{ name: '', numerator: '', denominator: '', type: 'rate', category: 'primary' }],
  })

  const addKPI = () => {
    setConfig({
      ...config,
      kpis: [
        ...config.kpis,
        { name: '', numerator: '', denominator: '', type: 'rate', category: 'primary' },
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

  return {
    config,
    addKPI,
    removeKPI,
    updateKPI,
  }
}

