export const COUNTRIES = [
  'AE', 'AE_AR', 'AFRICA_EN', 'AFRICA_FR', 'AFRICA_PT', 'AL', 'AR', 'AT', 'AU', 'AZ', 
  'BA', 'BD', 'BE', 'BE_FR', 'BG', 'BR', 'CA', 'CA_FR', 'CH', 'CH_FR', 'CL', 'CN', 
  'CO', 'CZ', 'DE', 'DK', 'EE', 'EG', 'ES', 'FI', 'FR', 'GE', 'GR', 'HK', 'HK_EN', 
  'HR', 'HU', 'ID', 'IE', 'IL', 'IN', 'IQ_AR', 'IQ_KU', 'IRAN', 'IT', 'JP', 'KB', 
  'KZ_KZ', 'KZ_RU', 'LATIN', 'LATIN_EN', 'LEVANT', 'LEVANT_AR', 'LT', 'LV', 'MK', 
  'MM', 'MN', 'MX', 'MY', 'N_AFRICA', 'NL', 'NO', 'NZ', 'PE', 'PH', 'PK', 'PL', 
  'PS', 'PT', 'PY', 'RO', 'RS', 'SA', 'SA_EN', 'SE', 'SEC', 'SG', 'SI', 'SK', 
  'TH', 'TR', 'TW', 'UA', 'UK', 'US', 'UY', 'UZ_RU', 'UZ_UZ', 'VN', 'ZA'
] as const

export const REPORT_ORDERS = ['1st report', '2nd report', '3rd report', 'final report'] as const

export const REPORT_ORDER_SORT: { [key: string]: number } = {
  '1st report': 1,
  '2nd report': 2,
  '3rd report': 3,
  'final report': 4,
}

export const DEFAULT_SIDEBAR_WIDTH = 380
export const MIN_SIDEBAR_WIDTH = 250
export const MAX_SIDEBAR_WIDTH_RATIO = 0.7

