export interface KPIConfig {
  name: string
  numerator: string
  denominator: string
  type: 'rate' | 'revenue' | 'rpv' | 'simple' | 'variation_only' | string
  category?: 'primary' | 'secondary' | 'additional'
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
}

