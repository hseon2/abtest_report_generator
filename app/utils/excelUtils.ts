import * as XLSX from 'xlsx'

/**
 * Excel 파일을 읽어 미리보기 데이터 생성
 */
export async function loadExcelPreview(file: File): Promise<{
  dataRows: any[]
  columnHeaders: string[]
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
        
        if (jsonData.length > 0) {
          const typedJsonData = jsonData as any[][]
          const rowLengths = typedJsonData.map((row: any[]) => row ? row.length : 0)
          const maxCols = rowLengths.length > 0 ? Math.max(...rowLengths, 0) : 0
          
          let columnHeaders: string[] = []
          let dataRows: any[] = []
          
          if (maxCols > 0) {
            columnHeaders = []
            for (let i = 0; i < maxCols; i++) {
              let colLetter = ''
              if (i < 26) {
                colLetter = String.fromCharCode(65 + i)
              } else {
                const firstLetter = String.fromCharCode(65 + Math.floor((i - 26) / 26))
                const secondLetter = String.fromCharCode(65 + ((i - 26) % 26))
                colLetter = firstLetter + secondLetter
              }
              columnHeaders.push(colLetter)
            }
            
            dataRows = typedJsonData.map((row: any[]) => {
              const rowObj: any = {}
              columnHeaders.forEach((header, idx) => {
                const value = row && row[idx] !== undefined && row[idx] !== null ? row[idx] : ''
                rowObj[header] = value === '' ? '' : String(value)
              })
              return rowObj
            })
          } else {
            columnHeaders = ['A']
            dataRows = [{ A: '데이터가 없습니다.' }]
          }
          
          resolve({ dataRows, columnHeaders })
        } else {
          resolve({ dataRows: [], columnHeaders: [] })
        }
      } catch (error) {
        console.error('Excel 파일 읽기 오류:', error)
        reject(error)
      }
    }
    
    reader.onerror = () => {
      reject(new Error('파일 읽기 실패'))
    }
    
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Excel 데이터에서 메트릭 추출 (중복 처리 포함)
 */
export function extractMetrics(jsonData: any[][]): string[] {
  const metrics: string[] = []
  const metricCount: { [key: string]: number } = {}
  
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i]
    if (row && row.length > 0 && typeof row[0] === 'string') {
      let metric = row[0].trim()
      
      // 필터링 조건 강화:
      // 1. 빈 문자열 제외
      // 2. Unnamed: 로 시작하는 것 제외
      // 3. # 으로 시작하는 주석 제외
      // 4. Segments 같은 헤더 제외
      if (
        metric && 
        !metric.startsWith('Unnamed:') &&
        !metric.startsWith('#') &&
        !metric.match(/^Segments(\s*\(\d+\))?$/) // "Segments" 또는 "Segments (2)" 같은 패턴 제외
      ) {
        if (metricCount[metric]) {
          metricCount[metric]++
          metric = `${metric} (${metricCount[metric]})`
        } else {
          metricCount[metric] = 1
        }
        metrics.push(metric)
      }
    }
  }
  
  return metrics
}

