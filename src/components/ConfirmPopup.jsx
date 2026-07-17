import React, { useState, useEffect, useRef, useCallback } from 'react'

export default function ConfirmPopup({ isOpen, message, onConfirm, onCancel, confirmLabel }) {
  const confirmBtnRef = useRef(null)
  const [animState, setAnimState] = useState('closed')
  const prevOpen = useRef(isOpen)

  useEffect(() => {
    if (isOpen && !prevOpen.current) {
      setAnimState('entering')
      const id = requestAnimationFrame(() => setAnimState('open'))
      prevOpen.current = true
      return () => cancelAnimationFrame(id)
    } else if (!isOpen && prevOpen.current) {
      setAnimState('exiting')
      const timer = setTimeout(() => { setAnimState('closed'); prevOpen.current = false }, 150)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onCancel()
  }, [onCancel])

  useEffect(() => {
    if (animState !== 'open') return
    document.addEventListener('keydown', handleKeyDown)
    requestAnimationFrame(() => {
      if (confirmBtnRef.current) confirmBtnRef.current.focus()
    })
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [animState, handleKeyDown])

  if (animState === 'closed') return null

  const isEntering = animState === 'entering'
  const isExiting = animState === 'exiting'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
        animation: isEntering ? 'fadeIn 200ms var(--ease-out-quart)' : isExiting ? 'fadeOut 150ms ease-in' : undefined
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          background: 'var(--bg)',
          borderRadius: '16px',
          padding: 'var(--spacing-xl) var(--spacing-lg)',
          maxWidth: '420px',
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 12px 48px rgba(0,0,0,0.2)',
          animation: isEntering ? 'scaleIn 250ms var(--ease-out-quart)' : isExiting ? 'scaleOut 150ms ease-in' : undefined
        }}
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          style={{ marginBottom: 'var(--spacing-md)', color: 'var(--success)' }}
        >
          <circle cx="24" cy="24" r="24" fill="var(--success-light)" />
          <path d="M15 24l6 6 12-12" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <p style={{
          fontSize: 'var(--font-body)',
          fontWeight: 700,
          margin: '0 0 var(--spacing-lg)',
          color: 'var(--text)',
          lineHeight: 1.4
        }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'center' }}>
          <button
            ref={confirmBtnRef}
            className="btn btn-primary"
            onClick={onConfirm}
            style={{ minWidth: '120px', fontSize: 'var(--font-body)', padding: 'var(--spacing-sm) var(--spacing-lg)' }}
          >
            {confirmLabel}
          </button>
          <button
            className="btn btn-ghost"
            onClick={onCancel}
            style={{ minWidth: '80px', fontSize: 'var(--font-body)' }}
          >
            No
          </button>
        </div>
      </div>
    </div>
  )
}
