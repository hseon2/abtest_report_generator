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
  const [bayesianModal, setBayesianModal] = useState<{
    isOpen: boolean
    title: string
    decision: string | null
    values: Partial<Record<(typeof probKeys)[number], number | null | undefined>>
  }>({
    isOpen: false,
    title: '',
    decision: null,
    values: {},
  })

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
  const openBayesianModal = (
    title: string,
    decision: string | null | undefined,
    values: Partial<Record<(typeof probKeys)[number], number | null | undefined>>
  ) => {
    setBayesianModal({ isOpen: true, title, decision: decision || null, values })
  }
  const getDecisionBadgeStyle = (decision: string | null | undefined) => {
    if (!decision) return { color: '#5d6d7e', backgroundColor: '#f4f6f8', border: '1px solid #d7dde4' }
    if (decision.includes('Strong Variation')) return { color: '#1a7a3c', backgroundColor: '#e9f8ef', border: '1px solid #bfe8cc' }
    if (decision.includes('Soft Variation')) return { color: '#27ae60', backgroundColor: '#effaf4', border: '1px solid #c9ecd8' }
    if (decision.includes('Strong Control')) return { color: '#c0392b', backgroundColor: '#fdeeee', border: '1px solid #f1c3be' }
    if (decision.includes('Soft Control')) return { color: '#e74c3c', backgroundColor: '#fff1f0', border: '1px solid #f4c7c2' }
    if (decision.includes('모수부족')) return { color: '#7f8c8d', backgroundColor: '#f1f3f5', border: '1px solid #d9dee3' }
    return { color: '#5d6d7e', backgroundColor: '#f4f6f8', border: '1px solid #d7dde4' }
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
                                          {Array.from({ length: variationCount }, (_, i) => (
                                            <th key={`var-bayes-${i}`} style={{ backgroundColor: '#1a6a99', color: '#ffffff' }}>
                                              Variation {i + 1} Decision
                                              <span style={{ fontSize: '10px', color: '#b3d9f2', fontWeight: 'normal', marginLeft: '4px' }}>(베이지안)</span>
                                            </th>
                                          ))}
                                        </>
                                      )}
                                    </tr>
                                  ) : (
                                    <tr>
                                      <th>세그먼트</th>
                                      {!isVariationOnly && (
                                        <th>{isSimpleType ? 'Control Count' : 'Control Rate (%)'}</th>
                                      )}
                                      <th>{isSimpleType ? 'Variation Count' : 'Variation Rate (%)'}</th>
                                      {!isVariationOnly && (
                                        <>
                                          <th>Uplift (%) (Confidence)</th>
                                          <th>
                                            Decision
                                            <span style={{ fontSize: '10px', color: '#ffffff', fontWeight: 'normal', marginLeft: '4px' }}>(빈도주의)</span>
                                          </th>
                                          <th style={{ backgroundColor: '#1a6a99', color: '#ffffff' }}>
                                            Decision
                                            <span style={{ fontSize: '10px', color: '#b3d9f2', fontWeight: 'normal', marginLeft: '4px' }}>(베이지안)</span>
                                          </th>
                                        </>
                                      )}
                                    </tr>
                                  )}
                                </thead>
                                <tbody>
                                  {kpiResults.map((r: any, i: number) => {
                                    if (r.error && r.errorMessage) {
                                      const errorColSpan = variationCount > 1
                                        ? (isVariationOnly ? 1 + variationCount : 2 + variationCount * 4)
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
                                        <React.Fragment key={i}>
                                          <tr style={isAllVisits ? { backgroundColor: '#f0f8ff', fontWeight: '600' } : {}}>
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
                                                {Array.from({ length: variationCount }, (_, idx) => {
                                                  const varData = r.variations.find((v: any) => v.variationNum === idx + 1)
                                                  return (
                                                    <td
                                                      key={`bayes-${idx}`}
                                                      style={{ backgroundColor: '#f0f7ff', textAlign: 'center', fontSize: '13px' }}
                                                    >
                                                      <div style={{ minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {varData?.decision === '모수부족 (60건 미만)' ? (
                                                          <span style={{ color: '#aaa', fontSize: '12px' }}>모수부족 (60건 미만)</span>
                                                        ) : varData?.decision ? (
                                                          <strong style={{
                                                            color: varData.decision.includes('Strong Variation') ? '#1a7a3c'
                                                              : varData.decision.includes('Strong Control') ? '#c0392b'
                                                              : varData.decision.includes('Soft Variation') ? '#27ae60'
                                                              : varData.decision.includes('Soft Control') ? '#e74c3c'
                                                              : '#666',
                                                            lineHeight: 1.3
                                                          }}>
                                                            {varData.decision}
                                                          </strong>
                                                        ) : (
                                                          <span style={{ color: '#bbb' }}>—</span>
                                                        )}
                                                      </div>
                                                      <button
                                                        type="button"
                                                        onClick={() => openBayesianModal(
                                                          `${country} / ${kpiName} / ${r.device || 'N/A'} / Variation ${idx + 1}`,
                                                          varData?.decision,
                                                          {
                                                            p_gt3: varData?.p_gt3,
                                                            p_lt3: varData?.p_lt3,
                                                            p_neutral: varData?.p_neutral,
                                                            p_gt0: varData?.p_gt0,
                                                            p_lt0: varData?.p_lt0,
                                                          }
                                                        )}
                                                        style={{
                                                          marginTop: '6px',
                                                          padding: '3px 8px',
                                                          fontSize: '11px',
                                                          color: '#1a6a99',
                                                          border: '1px solid #9fc4df',
                                                          borderRadius: '12px',
                                                          background: '#fff',
                                                          cursor: 'pointer'
                                                        }}
                                                      >
                                                        확률 보기
                                                      </button>
                                                    </td>
                                                  )
                                                })}
                                              </>
                                            )}
                                          </tr>
                                        </React.Fragment>
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
                                                <div style={{ minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                  {r.decision === '모수부족 (60건 미만)' ? (
                                                    <span style={{ color: '#aaa', fontSize: '12px' }}>모수부족 (60건 미만)</span>
                                                  ) : r.decision ? (
                                                    <strong style={{
                                                      color: r.decision.includes('Strong Variation') ? '#1a7a3c'
                                                        : r.decision.includes('Strong Control') ? '#c0392b'
                                                        : r.decision.includes('Soft Variation') ? '#27ae60'
                                                        : r.decision.includes('Soft Control') ? '#e74c3c'
                                                        : '#666',
                                                      lineHeight: 1.3
                                                    }}>
                                                      {r.decision}
                                                    </strong>
                                                  ) : (
                                                    <span style={{ color: '#bbb' }}>—</span>
                                                  )}
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => openBayesianModal(
                                                    `${country} / ${kpiName} / ${r.device || 'N/A'} / Variation 1`,
                                                    r.decision,
                                                    {
                                                      p_gt3: r.p_gt3,
                                                      p_lt3: r.p_lt3,
                                                      p_neutral: r.p_neutral,
                                                      p_gt0: r.p_gt0,
                                                      p_lt0: r.p_lt0,
                                                    }
                                                  )}
                                                  style={{
                                                    marginTop: '6px',
                                                    padding: '3px 8px',
                                                    fontSize: '11px',
                                                    color: '#1a6a99',
                                                    border: '1px solid #9fc4df',
                                                    borderRadius: '12px',
                                                    background: '#fff',
                                                    cursor: 'pointer'
                                                  }}
                                                >
                                                  확률 보기
                                                </button>
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
                )
              })}
          </div>
        ))}
      {bayesianModal.isOpen && (
        <div
          onClick={() => setBayesianModal({ isOpen: false, title: '', decision: null, values: {} })}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(520px, 92vw)',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              boxShadow: '0 16px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
          >
            <div style={{ backgroundColor: '#1a6a99', color: '#fff', padding: '12px 16px', fontWeight: 700 }}>
              베이지안 확률 상세
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: '13px', color: '#516273', marginBottom: '12px' }}>{bayesianModal.title}</div>
              <div style={{ marginBottom: '12px' }}>
                <span style={{
                  ...getDecisionBadgeStyle(bayesianModal.decision),
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  {bayesianModal.decision || 'Decision 없음'}
                </span>
              </div>
              {probKeys.map((key) => {
                const val = bayesianModal.values[key]
                const pct = val !== null && val !== undefined ? val * 100 : null
                return (
                  <div key={`modal-${key}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #eef3f7' }}>
                    <span style={{ color: '#2c3e50', fontSize: '13px' }}>{probLabels[key]}</span>
                    <strong style={{ color: '#1f2d3a', fontSize: '13px' }}>{pct !== null ? `${pct.toFixed(1)}%` : '—'}</strong>
                  </div>
                )
              })}
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid #edf2f6', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setBayesianModal({ isOpen: false, title: '', decision: null, values: {} })}
                style={{ padding: '7px 14px', border: '1px solid #cad8e5', borderRadius: '6px', background: '#fff', color: '#2c3e50', fontWeight: 600, cursor: 'pointer' }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
