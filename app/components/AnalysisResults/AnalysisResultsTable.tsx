'use client'

import React from 'react'
import { groupByKPI, groupByReportOrder, groupByCountry, getReportOrderSort, getKPICategorySort, getKPICategoryLabel } from '../../utils/formatters'

interface AnalysisResultsTableProps {
  results: any[]
  variationCount: number
  selectedReportOrder: string | null
  onReportOrderChange: (order: string) => void
}

export function AnalysisResultsTable({
  results,
  variationCount,
  selectedReportOrder,
  onReportOrderChange,
}: AnalysisResultsTableProps) {
  if (!results || results.length === 0) {
    return (
      <div className="error">
        <h3>결과가 없습니다</h3>
        <p>가능한 원인:</p>
        <ul>
          <li>Excel 파일 형식이 예상과 다를 수 있습니다</li>
          <li>메트릭 라벨이 정확하지 않을 수 있습니다 (대소문자, 공백 확인)</li>
          <li>국가 코드가 일치하지 않을 수 있습니다</li>
          <li>서버 콘솔에서 디버그 로그를 확인해주세요</li>
        </ul>
      </div>
    )
  }

  const reportOrderGroups = Object.entries(groupByReportOrder(results))
    .sort(([a], [b]) => getReportOrderSort(a) - getReportOrderSort(b))
  
  const defaultReportOrder = reportOrderGroups.length > 0 ? reportOrderGroups[0][0] : null
  const currentReportOrder = selectedReportOrder || defaultReportOrder

  return (
    <>
      {/* 리포트 순서별 탭 */}
      {reportOrderGroups.length > 0 && (
        <div style={{ 
          marginBottom: '20px', 
          borderBottom: '2px solid #e0e0e0',
          display: 'flex',
          gap: '5px'
        }}>
          {reportOrderGroups.map(([reportOrder]) => (
            <button
              key={reportOrder}
              onClick={() => onReportOrderChange(reportOrder)}
              disabled={reportOrderGroups.length === 1}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderBottom: currentReportOrder === reportOrder ? '3px solid #3498db' : '3px solid transparent',
                backgroundColor: currentReportOrder === reportOrder ? '#ffffff' : '#f5f5f5',
                color: currentReportOrder === reportOrder ? '#3498db' : '#666',
                fontWeight: currentReportOrder === reportOrder ? 'bold' : 'normal',
                cursor: reportOrderGroups.length === 1 ? 'default' : 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s',
                marginBottom: '-2px',
                opacity: reportOrderGroups.length === 1 ? 0.7 : 1
              }}
            >
              {reportOrder}
            </button>
          ))}
        </div>
      )}
      
      {/* 선택된 리포트 순서의 결과만 표시 */}
      {reportOrderGroups
        .filter(([reportOrder]) => reportOrder === currentReportOrder)
        .map(([reportOrder, reportResults]: [string, any[]]) => (
          <div key={reportOrder} style={{ marginBottom: '50px' }}>
            {reportOrderGroups.length === 1 && (
              <h3 style={{ 
                color: '#2c3e50', 
                marginBottom: '25px', 
                paddingBottom: '10px', 
                borderBottom: '3px solid #3498db',
                fontSize: '20px',
                fontWeight: 'bold'
              }}>
                {reportOrder}
              </h3>
            )}
            
            {/* 각 리포트 순서 내에서 국가별로 그룹화 */}
            {Object.entries(groupByCountry(reportResults))
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([country, countryResults]: [string, any[]]) => (
                <div key={country} style={{ marginBottom: '35px' }}>
                  <h4 style={{ 
                    color: '#34495e', 
                    marginBottom: '20px', 
                    paddingBottom: '8px', 
                    borderBottom: '2px solid #95a5a6',
                    fontSize: '18px',
                    fontWeight: '600'
                  }}>
                    {country}
                  </h4>
                  
                  {/* 각 국가 내에서 KPI별로 그룹화하고 카테고리별로 정렬 */}
                  {Object.entries(groupByKPI(countryResults))
                    .sort(([, kpiResultsA]: [string, any[]], [, kpiResultsB]: [string, any[]]) => {
                      const categoryA = kpiResultsA[0]?.category
                      const categoryB = kpiResultsB[0]?.category
                      return getKPICategorySort(categoryA) - getKPICategorySort(categoryB)
                    })
                    .map(([kpiName, kpiResults]: [string, any[]]) => {
                    const firstResult = kpiResults[0]
                    const kpiCategory = firstResult?.category
                    const categoryLabel = getKPICategoryLabel(kpiCategory)
                    
                    const isVariationOnly = firstResult && 
                      (firstResult.controlValue === null || firstResult.controlValue === undefined) &&
                      (firstResult.variationValue !== null && firstResult.variationValue !== undefined)
                    
                    const isSimpleType = firstResult && 
                      firstResult.controlRate === null && 
                      firstResult.controlValue !== null && 
                      firstResult.controlValue !== undefined
                    
                    return (
                      <div key={kpiName} style={{ marginBottom: '25px' }}>
                        <h5 style={{ color: '#7f8c8d', marginBottom: '12px', paddingBottom: '5px', borderBottom: '1px solid #bdc3c7', fontSize: '16px' }}>
                          {categoryLabel && <span style={{ color: '#3498db', fontWeight: 'bold', marginRight: '8px' }}>{categoryLabel}</span>}
                          {kpiName}
                        </h5>
                        
                        <div className="table-container">
                          <table>
                            <thead>
                              <tr>
                                <th>세그먼트</th>
                                {variationCount > 1 ? (
                                  <>
                                    {!isVariationOnly && (
                                      <th>{isSimpleType ? 'Control Count' : 'Control Rate (%)'}</th>
                                    )}
                                    {Array.from({ length: variationCount }, (_, i) => (
                                      <th key={`var-rate-${i}`}>{isSimpleType ? `Variation ${i + 1} Count` : `Variation ${i + 1} Rate (%)`}</th>
                                    ))}
                                    {!isVariationOnly && (
                                      <>
                                        {Array.from({ length: variationCount }, (_, i) => (
                                          <th key={`var-uplift-${i}`}>Variation {i + 1} Uplift (%)</th>
                                        ))}
                                        {Array.from({ length: variationCount }, (_, i) => (
                                          <th key={`var-verdict-${i}`}>Variation {i + 1} Verdict</th>
                                        ))}
                                      </>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {!isVariationOnly && (
                                      <th>{isSimpleType ? 'Control Count' : 'Control Rate (%)'}</th>
                                    )}
                                    <th>{isSimpleType ? 'Variation Count' : 'Variation Rate (%)'}</th>
                                    {!isVariationOnly && (
                                      <>
                                        <th>Uplift (%) (Confidence)</th>
                                        <th>Verdict</th>
                                      </>
                                    )}
                                  </>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {kpiResults.map((r: any, i: number) => {
                                // 에러 메시지가 있는 경우
                                if (r.error && r.errorMessage) {
                                  const errorColSpan = variationCount > 1 
                                    ? (isVariationOnly ? 1 + variationCount : 1 + variationCount * 3)
                                    : (isVariationOnly ? 2 : 4)
                                  return (
                                    <tr key={i} style={{ backgroundColor: '#fff3cd' }}>
                                      <td colSpan={errorColSpan} style={{ color: '#856404', padding: '15px', textAlign: 'center' }}>
                                        <strong>⚠️ {r.errorMessage}</strong>
                                      </td>
                                    </tr>
                                  )
                                }
                                
                                if (variationCount > 1 && r.variations && r.variations.length > 0) {
                                  // Variation이 여러 개인 경우
                                  const isAllVisits = i === 0 || (r.device && r.device.toLowerCase().includes('all visits'))
                                  return (
                                    <tr key={i} style={isAllVisits ? { backgroundColor: '#f0f8ff', fontWeight: '600' } : {}}>
                                      <td style={{ 
                                        backgroundColor: '#e8f4f8', 
                                        fontWeight: '700', 
                                        color: '#2c3e50',
                                        borderRight: '2px solid #3498db'
                                      }}>
                                        {r.device || 'N/A'}
                                      </td>
                                      {!isVariationOnly && (
                                        <td style={(r.controlRate === null || r.controlRate === undefined) && (r.controlValue === null || r.controlValue === undefined) ? { backgroundColor: '#e0e0e0' } : {}}>
                                          {r.controlRate !== null && r.controlRate !== undefined ? (
                                            <>
                                              <strong>{(r.controlRate * 100).toFixed(2)}%</strong>
                                              {r.controlValue !== null && r.controlValue !== undefined && r.denominatorSizeControl !== null && r.denominatorSizeControl !== undefined && (
                                                <span style={{ fontSize: '11px', color: '#666', marginLeft: '5px' }}>
                                                  ({Math.round(r.controlValue)}/{Math.round(r.denominatorSizeControl)})
                                                </span>
                                              )}
                                            </>
                                          ) : r.controlValue !== null && r.controlValue !== undefined ? (
                                            <strong>{Math.round(r.controlValue).toLocaleString()}</strong>
                                          ) : (
                                            <span style={{ color: '#999' }}>N/A</span>
                                          )}
                                        </td>
                                      )}
                                      {Array.from({ length: variationCount }, (_, idx) => {
                                        const varData = r.variations.find((v: any) => v.variationNum === idx + 1)
                                        return (
                                          <td key={`rate-${idx}`} style={varData && (varData.variationRate === null || varData.variationRate === undefined) && (varData.variationValue === null || varData.variationValue === undefined) ? { backgroundColor: '#e0e0e0' } : {}}>
                                            {varData && varData.variationRate !== null && varData.variationRate !== undefined ? (
                                              <>
                                                <strong>{(varData.variationRate * 100).toFixed(2)}%</strong>
                                                {varData.variationValue !== null && varData.variationValue !== undefined && varData.denominatorSizeVariation !== null && varData.denominatorSizeVariation !== undefined && (
                                                  <span style={{ fontSize: '11px', color: '#666', marginLeft: '5px' }}>
                                                    ({Math.round(varData.variationValue)}/{Math.round(varData.denominatorSizeVariation)})
                                                  </span>
                                                )}
                                              </>
                                            ) : varData && varData.variationValue !== null && varData.variationValue !== undefined ? (
                                              <strong>{Math.round(varData.variationValue).toLocaleString()}</strong>
                                            ) : (
                                              <span style={{ color: '#999' }}>N/A</span>
                                            )}
                                          </td>
                                        )
                                      })}
                                      {!isVariationOnly && (
                                        <>
                                          {Array.from({ length: variationCount }, (_, idx) => {
                                            const varData = r.variations.find((v: any) => v.variationNum === idx + 1)
                                            const upliftValue = varData?.uplift
                                            const confidenceValue = varData?.confidence
                                            const upliftColor = upliftValue !== null && upliftValue !== undefined
                                              ? upliftValue < 0 ? '#e74c3c' : '#233ffa'
                                              : '#2c3e50'
                                            return (
                                              <td key={`uplift-${idx}`} style={varData && (upliftValue === null || upliftValue === undefined) ? { backgroundColor: '#e0e0e0' } : {}}>
                                                {varData && upliftValue !== null && upliftValue !== undefined ? (
                                                  <>
                                                    <strong style={{ color: upliftColor }}>
                                                      {upliftValue.toFixed(2)}%
                                                    </strong>
                                                    {confidenceValue !== null && confidenceValue !== undefined && (
                                                      <span style={{ 
                                                        color: '#000000',
                                                        fontWeight: confidenceValue >= 95 ? '700' : '400',
                                                        marginLeft: '4px'
                                                      }}>
                                                        ({confidenceValue.toFixed(2)}%)
                                                      </span>
                                                    )}
                                                  </>
                                                ) : (
                                                  <span style={{ color: '#999' }}>N/A</span>
                                                )}
                                              </td>
                                            )
                                          })}
                                          {Array.from({ length: variationCount }, (_, idx) => {
                                            const varData = r.variations.find((v: any) => v.variationNum === idx + 1)
                                            return (
                                              <td key={`verdict-${idx}`} style={!varData || !varData.verdict ? { backgroundColor: '#e0e0e0' } : {}}>
                                                {varData?.verdict ? (
                                                  <span className={`verdict-${varData.verdict.replace(/\s/g, '-').replace('(', '').replace(')', '').toLowerCase()}`}>
                                                    {varData.verdict}
                                                  </span>
                                                ) : (
                                                  <span style={{ color: '#999' }}>N/A</span>
                                                )}
                                              </td>
                                            )
                                          })}
                                        </>
                                      )}
                                    </tr>
                                  )
                                } else {
                                  // Variation이 1개인 경우
                                  const isAllVisits = i === 0 || (r.device && r.device.toLowerCase().includes('all visits'))
                                  return (
                                    <tr key={i} style={isAllVisits ? { backgroundColor: '#f0f8ff', fontWeight: '600' } : {}}>
                                      <td style={{ 
                                        backgroundColor: '#e8f4f8', 
                                        fontWeight: '700', 
                                        color: '#2c3e50',
                                        borderRight: '2px solid #3498db'
                                      }}>
                                        {r.device || 'N/A'}
                                      </td>
                                      {!isVariationOnly && (
                                        <td style={(r.controlRate === null || r.controlRate === undefined) && (r.controlValue === null || r.controlValue === undefined) ? { backgroundColor: '#e0e0e0' } : {}}>
                                          {r.controlRate !== null && r.controlRate !== undefined ? (
                                            <>
                                              <strong>{(r.controlRate * 100).toFixed(2)}%</strong>
                                              {r.controlValue !== null && r.controlValue !== undefined && r.denominatorSizeControl !== null && r.denominatorSizeControl !== undefined && (
                                                <span style={{ fontSize: '11px', color: '#666', marginLeft: '5px' }}>
                                                  ({Math.round(r.controlValue)}/{Math.round(r.denominatorSizeControl)})
                                                </span>
                                              )}
                                            </>
                                          ) : r.controlValue !== null && r.controlValue !== undefined ? (
                                            <strong>{Math.round(r.controlValue).toLocaleString()}</strong>
                                          ) : (
                                            <span style={{ color: '#999' }}>N/A</span>
                                          )}
                                        </td>
                                      )}
                                      <td style={(r.variationRate === null || r.variationRate === undefined) && (r.variationValue === null || r.variationValue === undefined) ? { backgroundColor: '#e0e0e0' } : {}}>
                                        {r.variationRate !== null && r.variationRate !== undefined ? (
                                          <>
                                            <strong>{(r.variationRate * 100).toFixed(2)}%</strong>
                                            {r.variationValue !== null && r.variationValue !== undefined && r.denominatorSizeVariation !== null && r.denominatorSizeVariation !== undefined && (
                                              <span style={{ fontSize: '11px', color: '#666', marginLeft: '5px' }}>
                                                ({Math.round(r.variationValue)}/{Math.round(r.denominatorSizeVariation)})
                                              </span>
                                            )}
                                          </>
                                        ) : r.variationValue !== null && r.variationValue !== undefined ? (
                                          <strong>{Math.round(r.variationValue).toLocaleString()}</strong>
                                        ) : (
                                          <span style={{ color: '#999' }}>N/A</span>
                                        )}
                                      </td>
                                      {!isVariationOnly && (
                                        <>
                                          <td style={(r.uplift === null || r.uplift === undefined) ? { backgroundColor: '#e0e0e0' } : {}}>
                                            {r.uplift !== null && r.uplift !== undefined ? (
                                              <>
                                                <strong style={{ 
                                                  color: r.uplift < 0 ? '#e74c3c' : '#233ffa'
                                                }}>
                                                  {r.uplift.toFixed(2)}%
                                                </strong>
                                                {r.confidence !== null && r.confidence !== undefined && (
                                                  <span style={{ 
                                                    color: '#000000',
                                                    fontWeight: r.confidence >= 95 ? '700' : '400',
                                                    marginLeft: '4px'
                                                  }}>
                                                    ({r.confidence.toFixed(2)}%)
                                                  </span>
                                                )}
                                              </>
                                            ) : (
                                              <span style={{ color: '#999' }}>N/A</span>
                                            )}
                                          </td>
                                          <td style={!r.verdict ? { backgroundColor: '#e0e0e0' } : {}}>
                                            {r.verdict ? (
                                              <span className={`verdict-${r.verdict.replace(/\s/g, '-').replace('(', '').replace(')', '').toLowerCase()}`}>
                                                {r.verdict}
                                              </span>
                                            ) : (
                                              <span style={{ color: '#999' }}>N/A</span>
                                            )}
                                          </td>
                                        </>
                                      )}
                                    </tr>
                                  )
                                }
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
          </div>
        ))}
    </>
  )
}


