'use client'

import React from 'react'

interface InsightsPanelProps {
  insights: {
    summary?: string[]
    recommendation?: string
  }
  useAI?: boolean
}

export function InsightsPanel({ insights, useAI }: InsightsPanelProps) {
  const parseAIText = (text: string) => {
    // 줄바꿈 처리
    const lines = text.split('\n').filter(line => line.trim())
    return lines.map((line, lineIdx) => {
      // **볼드** 처리
      const boldRegex = /\*\*(.+?)\*\*/g
      const parts: (string | JSX.Element)[] = []
      let lastIndex = 0
      let match
      
      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index))
        }
        // 중요 키워드에 따라 색상 결정
        const boldText = match[1]
        let color = '#2c3e50'
        if (boldText.includes('증가') || boldText.includes('상승') || boldText.includes('개선') || boldText.includes('우세')) {
          color = '#27ae60' // 녹색
        } else if (boldText.includes('감소') || boldText.includes('하락') || boldText.includes('부족') || boldText.includes('실패')) {
          color = '#e74c3c' // 빨간색
        } else if (boldText.includes('변화') || boldText.includes('비교') || boldText.includes('분석')) {
          color = '#3498db' // 파란색
        }
        
        parts.push(
          <strong key={`bold-${lineIdx}-${match.index}`} style={{ color, fontWeight: '700' }}>
            {boldText}
          </strong>
        )
        lastIndex = match.index + match[0].length
      }
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex))
      }
      
      return (
        <div key={lineIdx} style={{ marginBottom: lineIdx < lines.length - 1 ? '8px' : '0' }}>
          {parts.length > 0 ? parts : line}
        </div>
      )
    })
  }

  return (
    <div style={{ 
      marginTop: '20px',
      background: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      border: '1px solid #e0e0e0'
    }}>
      <h3 style={{ 
        margin: 0, 
        marginBottom: '15px',
        color: '#34495e',
        fontSize: '18px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        paddingBottom: '10px',
        borderBottom: '2px solid #3498db'
      }}>
        인사이트
        {useAI && insights && insights.summary && insights.summary.length > 0 && (
          <span style={{
            display: 'inline-block',
            backgroundColor: '#4285f4',
            color: 'white',
            fontSize: '10px',
            padding: '3px 8px',
            borderRadius: '10px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            AI
          </span>
        )}
      </h3>
      
      {insights.summary && insights.summary.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          {insights.summary
            .filter((item: string) => item && item.trim() !== '')
            .map((item: string, i: number) => {
              const trimmedItem = item.trim()
              // 구분선 (=== 로 시작하는 경우) 처리
              if (trimmedItem.startsWith('===')) {
                return (
                  <div key={i} style={{
                    marginTop: i > 0 ? '15px' : '0',
                    marginBottom: '8px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#34495e',
                    paddingBottom: '6px',
                    borderBottom: '2px solid #3498db'
                  }}>
                    {trimmedItem.replace(/=/g, '').trim()}
                  </div>
                )
              }
              
              // 일반 항목
              return (
                <div key={i} style={{ 
                  padding: '12px 15px', 
                  marginBottom: '10px', 
                  background: '#f8f9fa',
                  borderRadius: '4px',
                  borderLeft: '4px solid #3498db',
                  fontSize: '14px',
                  lineHeight: '1.8',
                  color: '#2c3e50',
                  whiteSpace: 'pre-wrap'
                }}>
                  {trimmedItem.startsWith('•') || trimmedItem.startsWith('-') || trimmedItem.startsWith('└') 
                    ? parseAIText(trimmedItem.substring(1).trim())
                    : parseAIText(trimmedItem)}
                </div>
              )
            })}
        </div>
      )}
      
      {insights.recommendation && (
        <div style={{
          padding: '15px',
          background: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '6px',
          marginTop: '15px'
        }}>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            color: '#856404',
            marginBottom: '8px'
          }}>
            최종 추천
          </div>
          <div style={{ 
            fontSize: '15px', 
            color: '#856404',
            fontWeight: '600',
            lineHeight: '1.6'
          }}>
            {insights.recommendation}
          </div>
        </div>
      )}
    </div>
  )
}

