/**
 * KPI별로 결과 그룹화
 */
export function groupByKPI(results: any[]): { [kpiName: string]: any[] } {
  const groups: { [kpiName: string]: any[] } = {}
  results.forEach((r: any) => {
    const kpiName = r.kpiName || 'Unknown KPI'
    if (!groups[kpiName]) {
      groups[kpiName] = []
    }
    groups[kpiName].push(r)
  })
  return groups
}

/**
 * 리포트 순서별로 결과 그룹화
 */
export function groupByReportOrder(results: any[]): { [reportOrder: string]: any[] } {
  const groups: { [reportOrder: string]: any[] } = {}
  results.forEach((r: any) => {
    const reportOrder = r.reportOrder || '1st report'
    if (!groups[reportOrder]) {
      groups[reportOrder] = []
    }
    groups[reportOrder].push(r)
  })
  return groups
}

/**
 * 국가별로 결과 그룹화
 */
export function groupByCountry(results: any[]): { [country: string]: any[] } {
  const groups: { [country: string]: any[] } = {}
  results.forEach((r: any) => {
    const country = r.country || 'Unknown'
    if (!groups[country]) {
      groups[country] = []
    }
    groups[country].push(r)
  })
  return groups
}

/**
 * 리포트 순서에 따른 정렬 숫자 반환
 */
export function getReportOrderSort(reportOrder: string): number {
  const sortMap: { [key: string]: number } = {
    '1st report': 1,
    '2nd report': 2,
    '3rd report': 3,
    'final report': 4,
  }
  return sortMap[reportOrder] || 999
}

