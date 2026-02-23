'use client'

import React from 'react'

interface LoadingModalProps {
  isOpen: boolean
  message?: string
}

export function LoadingModal({ isOpen, message = '처리 중입니다...' }: LoadingModalProps) {
  if (!isOpen) return null

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          textAlign: 'center',
          minWidth: '300px',
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px',
          }} />
          <p style={{
            fontSize: '16px',
            color: '#2c3e50',
            fontWeight: '600',
            margin: 0,
          }}>
            {message}
          </p>
        </div>
      </div>
    </>
  )
}

