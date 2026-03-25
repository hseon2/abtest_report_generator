'use client'

import React, { useState } from 'react'
import { groupByKPI, groupByReportOrder, groupByCountry, getReportOrderSort, getKPICategorySort, getKPICategoryLabel } from '../../utils/formatters'

interface AnalysisResultsTableProps {
  results: any[]
  variationCount: number
  selectedReportOrder: string | null
  onReportOrderChange: (order: string) => void
  getCountryDateInfo?: (country: string, reportOrder: string) => { startDate: string; endDate: string; days: number } | null
}

export function AnalysisResultsTable({
  results,
  variationCount,
  selectedReportOrder,
  onReportOrderChange,
  getCountryDateInfo,
}: AnalysisResultsTableProps) {
  const [bayesianExpanded, setBayesianExpanded] = useState(false)

  const calculateAdditionalPeriod = (
    verdict: string,
    controlValue: number | null | undefined,
    variationValue: number | null | undefined,
    country: string,
    reportOrder: string
  ): number | null => {
    if (!verdict || !verdict.includes('모수 부족')) return null
    if (controlValue === null || controlValue === undefined || variationValue === null || variationValue === undefined) return null
    const dateInfo = getCountryDateInfo ? getCountryDateInfo(country, reportOrder) : null
    if (!dateInfo) return null
    const dataRange = dateInfo.days
    const minSampleSize = 100
    const additionalPeriodControl = controlValue < minSampleSize
      ? Math.ceil(((minSampleSize - controlValue) * dataRange) / controlValue)
      : 0
    const additionalPeriodVariation = variationValue < minSampleSize
      ? Math.ceil(((minSampleSize - variationValue) * dataRange) / variationValue)
      : 0
    return Math.max(additionalPeriodControl, additionalPeriodVariation)
  }

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

  // 확률 열 순서: P(>3%), P(<-3%), P(-3%~3%), P(>0), P(<0)
  const probKeys = ['p_gt3', 'p_lt3', 'p_neutral', 'p_gt0', 'p_lt0'] as const
  const probLabels: Record<string, string> = {
    p_gt3: 'Uplift > 3%',
    p_lt3: 'Uplift < -3%',
    p_neutral: '-3% < Uplift < 3%',
    p_gt0: 'Uplift > 0',
    p_lt0: 'Uplift < 0',
  }

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

            {Object.entries(groupByCountry(reportResults))
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([country, countryResults]: [string, any[]]) => {
                const dateInfo = getCountryDateInfo ? getCountryDateInfo(country, reportOrder) : null
                return (
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
                      {dateInfo && (
                        <span style={{ fontSize: '15px', fontWeight: '500', color: '#5a6c7d', marginLeft: '8px' }}>
                          ({dateInfo.startDate}~{dateInfo.endDate}, {dateInfo.days} days)
                        </span>
                      )}
                    </h4>

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
                                  {variationCount > 1 ? (
                                    <tr>
                                      <th>세그먼트</th>
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
                                            <th key={`var-verdict-${i}`}>Variation {i + 1} Decision</th>
                                          ))}
                                        </>
                                      )}
                                    </tr>
                                  ) : (
                                    /* 단일 variation: 펼치면 2행 헤더 */
                                    <>
                                      {/* 1행 */}
                                      <tr>
                                        <th rowSpan={bayesianExpanded ? 2 : 1}>세그먼트</th>
                                        {!isVariationOnly && (
                                          <th rowSpan={bayesianExpanded ? 2 : 1}>{isSimpleType ? 'Control Count' : 'Control Rate (%)'}</th>
                                        )}
                                        <th rowSpan={bayesianExpanded ? 2 : 1}>{isSimpleType ? 'Variation Count' : 'Variation Rate (%)'}</th>
                                        {!isVariationOnly && (
                                          <>
                                            <th rowSpan={bayesianExpanded ? 2 : 1}>Uplift (%) (Confidence)</th>
                                            <th rowSpan={bayesianExpanded ? 2 : 1}>
                                              Decision
                                              <span style={{ fontSize: '10px', color: '#ffffff', fontWeight: 'normal', marginLeft: '4px' }}>(빈도주의)</span>
                                            </th>
                                            <th
                                              rowSpan={bayesianExpanded ? 2 : 1}
                                              onClick={() => setBayesianExpanded(prev => !prev)}
                                              style={{
                                                backgroundColor: '#1a6a99',
                                                color: '#ffffff',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                userSelect: 'none',
                                                whiteSpace: 'nowrap',
                                              }}
                                            >
                                              Decision
                                              <span style={{ fontSize: '10px', color: '#b3d9f2', fontWeight: 'normal', marginLeft: '4px' }}>(베이지안)</span>
                                              <span style={{ marginLeft: '6px', fontSize: '11px' }}>{bayesianExpanded ? '▲' : '▼'}</span>
                                            </th>
                                            {bayesianExpanded && (
                                              <th
                                                colSpan={probKeys.length}
                                                style={{
                                                  backgroundColor: '#1a6a99',
                                                  color: '#ffffff',
                                                  textAlign: 'center',
                                                  fontSize: '13px',
                                                  fontWeight: 'bold',
                                                  letterSpacing: '0.5px',
                                                }}
                                              >
                                                베이지안 사후확률
                                              </th>
                                            )}
                                          </>
                                        )}
                                      </tr>
                                      {/* 2행: 확률 세부 항목 */}
                                      {bayesianExpanded && !isVariationOnly && (
                                        <tr>
                                          {probKeys.map(key => (
                                            <th key={key} style={{ backgroundColor: '#eaf4fb', color: '#1a6a99', fontSize: '12px', textAlign: 'center' }}>
                                              {probLabels[key]}
                                            </th>
                                          ))}
                                        </tr>
                                      )}
                                    </>
                                  )}
                                </thead>
                                <tbody>
                                  {kpiResults.map((r: any, i: number) => {
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
                                      const isAllVisits = i === 0 || (r.device && r.device.toLowerCase().includes('all visits'))
                                      return (
                                        <tr key={i} style={isAllVisits ? { backgroundColor: '#f0f8ff', fontWeight: '600' } : {}}>
                                          <td style={{ backgroundColor: '#e8f4f8', fontWeight: '700', color: '#2c3e50', borderRight: '2px solid #3498db' }}>
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
                                                        <strong style={{ color: upliftColor }}>{upliftValue.toFixed(2)}%</strong>
                                                        {confidenceValue !== null && confidenceValue !== undefined && (
                                                          <span style={{ color: '#000000', fontWeight: confidenceValue >= 95 ? '700' : '400', marginLeft: '4px' }}>
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
                                                const additionalDays = varData?.verdict
                                                  ? calculateAdditionalPeriod(varData.verdict, r.controlValue, varData.variationValue, r.country, reportOrder)
                                                  : null
                                                return (
                                                  <td key={`verdict-${idx}`} style={!varData || !varData.verdict ? { backgroundColor: '#e0e0e0' } : {}}>
                                                    {varData?.verdict ? (
                                                      <>
                                                        <span className={`verdict-${varData.verdict.replace(/\s/g, '-').replace('(', '').replace(')', '').toLowerCase()}`}>
                                                          {varData.verdict}
                                                        </span>
                                                        {additionalDays !== null && additionalDays > 0 && (
                                                          <div style={{ fontSize: '11px', color: '#e67e22', marginTop: '4px', fontStyle: 'italic' }}>
                                                            *모수 확보까지 {additionalDays}일 소요 예상
                                                          </div>
                                                        )}
                                                      </>
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
                                          <td style={{ backgroundColor: '#e8f4f8', fontWeight: '700', color: '#2c3e50', borderRight: '2px solid #3498db' }}>
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
                                              {/* Uplift */}
                                              <td style={(r.uplift === null || r.uplift === undefined) ? { backgroundColor: '#e0e0e0' } : {}}>
                                                {r.uplift !== null && r.uplift !== undefined ? (
                                                  <>
                                                    <strong style={{ color: r.uplift < 0 ? '#e74c3c' : '#233ffa' }}>
                                                      {r.uplift.toFixed(2)}%
                                                    </strong>
                                                    {r.confidence !== null && r.confidence !== undefined && (
                                                      <span style={{ color: '#000000', fontWeight: r.confidence >= 95 ? '700' : '400', marginLeft: '4px' }}>
                                                        ({r.confidence.toFixed(2)}%)
                                                      </span>
                                                    )}
                                                  </>
                                                ) : (
                                                  <span style={{ color: '#999' }}>N/A</span>
                                                )}
                                              </td>
                                              {/* Decision (빈도주의) */}
                                              <td style={!r.verdict ? { backgroundColor: '#e0e0e0' } : {}}>
                                                {r.verdict ? (
                                                  <>
                                                    <span className={`verdict-${r.verdict.replace(/\s/g, '-').replace('(', '').replace(')', '').toLowerCase()}`}>
                                                      {r.verdict}
                                                    </span>
                                                    {(() => {
                                                      const additionalDays = calculateAdditionalPeriod(r.verdict, r.controlValue, r.variationValue, r.country, reportOrder)
                                                      return additionalDays !== null && additionalDays > 0 ? (
                                                        <div style={{ fontSize: '11px', color: '#e67e22', marginTop: '4px', fontStyle: 'italic' }}>
                                                          *모수 확보까지 {additionalDays}일 소요 예상
                                                        </div>
                                                      ) : null
                                                    })()}
                                                  </>
                                                ) : (
                                                  <span style={{ color: '#999' }}>N/A</span>
                                                )}
                                              </td>
                                              {/* Decision (베이지안) */}
                                              <td style={{ backgroundColor: '#f0f7ff', textAlign: 'center', fontSize: '13px' }}>
                                                {r.decision === '모수부족 (60건 미만)' ? (
                                                  <span style={{ color: '#aaa', fontSize: '12px' }}>모수부족 (60건 미만)</span>
                                                ) : r.decision ? (
                                                  <strong style={{
                                                    color: r.decision.includes('Strong Variation') ? '#1a7a3c'
                                                      : r.decision.includes('Strong Control') ? '#c0392b'
                                                      : r.decision.includes('Soft Variation') ? '#27ae60'
                                                      : r.decision.includes('Soft Control') ? '#e74c3c'
                                                      : '#666'
                                                  }}>
                                                    {r.decision}
                                                  </strong>
                                                ) : (
                                                  <span style={{ color: '#bbb' }}>—</span>
                                                )}
                                              </td>
                                              {/* 베이지안 확률 (펼쳤을 때만) */}
                                              {bayesianExpanded && probKeys.map(key => {
                                                const val = r[key]
                                                const pct = val !== null && val !== undefined ? val * 100 : null
                                                const isHigh = pct !== null && pct >= 90
                                                const isMid = pct !== null && pct >= 80 && pct < 90
                                                return (
                                                  <td key={key} style={{ backgroundColor: '#f5fbff', textAlign: 'center', fontSize: '13px' }}>
                                                    {pct !== null ? (
                                                      <strong style={{
                                                        color: isHigh ? '#c0392b' : isMid ? '#e67e22' : '#555',
                                                        fontWeight: isHigh || isMid ? '700' : '400'
                                                      }}>
                                                        {pct.toFixed(1)}%
                                                      </strong>
                                                    ) : (
                                                      <span style={{ color: '#bbb' }}>—</span>
                                                    )}
                                                  </td>
                                                )
                                              })}
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
                )
              })}
          </div>
        ))}
    </>
  )
}
