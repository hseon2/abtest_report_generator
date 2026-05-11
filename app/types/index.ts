export interface KPIConfig {
  name: string
  numerator: string
  denominator: string
  type: 'rate' | 'revenue' | 'aop' | 'simple' | 'variation_only' | string
  /**
   * Revenue 타입에서 현지통화를 USD로 환산하기 위한 환율.
   * 가정: `USD = 현지통화 / exchangeRate` (현지통화 1 USD = exchangeRate)
   */
  exchangeRate?: string
  category?: 'primary' | 'secondary' | 'additional'
  /**
   * 분자(Numerator)로 사용자가 미리보기 표에서 클릭한 행의 전체 데이터.
   * key는 컬럼 letter ('A', 'B', 'C', ...), value는 셀 값.
   * 이 데이터가 있으면 분석 시 메트릭 이름으로 재검색하지 않고 이 행의 값을 그대로 사용한다.
   */
  numeratorRow?: Record<string, any>
  /**
   * 분모(Denominator)로 사용자가 미리보기 표에서 클릭한 행의 전체 데이터.
   * 동작은 numeratorRow와 동일.
   */
  denominatorRow?: Record<string, any>
}

export interface Config {
  kpis: KPIConfig[]
}

export interface FileMetadata {
  id: string
  file: File
  country: string
  reportOrder: '1st report' | '2nd report' | '3rd report' | 'final report'
  previewData?: any[] | null
  previewHeaders?: string[]
  isConfirmed?: boolean
  startDate?: string | null
  endDate?: string | null
}

