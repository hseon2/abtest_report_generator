'use client'

import React from 'react'

interface LoadingModalProps {
  message?: string
  progressPercent?: number | null
}

export function LoadingModal({ message = '처리 중입니다...', progressPercent = null }: LoadingModalProps) {
  const showProgress = progressPercent != null && progressPercent >= 0
  const displayPercent = showProgress ? Math.floor(Number(progressPercent)) : 0
  const displayMessage =
    progressPercent === 75 ? 'Excel 리포트 생성 중' : progressPercent === 100 ? '완료' : message
  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        animation: 'fadeIn 0.2s ease-in',
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '50px 60px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          textAlign: 'center',
          minWidth: '350px',
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '5px solid #ecf0f1',
            borderTop: '5px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 25px',
          }} />
          <p style={{
            fontSize: '17px',
            color: '#2c3e50',
            fontWeight: '600',
            margin: 0,
            lineHeight: '1.5',
          }}>
            {displayMessage}
          </p>
          {showProgress && (
            <div style={{ marginTop: '20px' }}>
              <div style={{
                height: '8px',
                backgroundColor: '#ecf0f1',
                borderRadius: '4px',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, Math.max(0, displayPercent))}%`,
                  backgroundColor: '#3498db',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <p style={{
                fontSize: '14px',
                color: '#7f8c8d',
                fontWeight: '600',
                margin: '8px 0 0',
              }}>
                {displayPercent}%
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

