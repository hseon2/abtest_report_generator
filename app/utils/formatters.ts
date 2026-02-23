import { REPORT_ORDER_SORT } from '../constants'

export function groupByKPI(results: any[]): { [key: string]: any[] } {
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

export function groupByReportOrder(results: any[]): { [key: string]: any[] } {
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

export function groupByCountry(results: any[]): { [key: string]: any[] } {
  const groups: { [key: string]: any[] } = {}
  results.forEach((r: any) => {
    const country = r.country || 'Unknown'
    if (!groups[country]) {
      groups[country] = []
    }
    groups[country].push(r)
  })
  return groups
}

export function getReportOrderSort(reportOrder: string): number {
  return REPORT_ORDER_SORT[reportOrder] || 999
}

/**
 * KPI 카테고리의 우선순위를 반환
 */
export function getKPICategorySort(category?: string): number {
  const sortOrder: { [key: string]: number } = {
    primary: 1,
    secondary: 2,
    additional: 3,
  }
  return sortOrder[category || 'primary'] || 999
}

/**
 * KPI 카테고리에 따른 표시 이름을 반환
 */
export function getKPICategoryLabel(category?: string): string {
  const labels: { [key: string]: string } = {
    primary: '[Primary KPI]',
    secondary: '[Secondary KPI]',
    additional: '[Additional Data]',
  }
  return labels[category || 'primary'] || ''
}
