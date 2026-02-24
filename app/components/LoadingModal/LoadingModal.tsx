'use client'

import React from 'react'

interface LoadingModalProps {
  message?: string
}

export function LoadingModal({ message = '처리 중입니다...' }: LoadingModalProps) {
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
            {message}
          </p>
        </div>
      </div>
    </>
  )
}

