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
