import React, { useState, useEffect } from 'react'

const BG = {
  success: 'var(--success)',
  error: 'var(--danger)',
  info: 'var(--accent)'
}

export default function Snackbar({ message, type = 'success', onClose }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: BG[type] || BG.info,
        color: '#fff',
        padding: 'var(--spacing-sm) var(--spacing-md)',
        borderRadius: 'var(--radius)',
        fontWeight: 700,
        fontSize: 'var(--font-sm)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        transform: visible ? 'translateX(0)' : 'translateX(120%)',
        opacity: visible ? 1 : 0,
        transition: 'all 0.3s ease',
        maxWidth: '400px',
        pointerEvents: 'auto'
      }}
    >
      <span>{message}</span>
      <button
        onClick={onClose}
        aria-label="Cerrar"
        style={{
          background: 'none',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          padding: '4px',
          minHeight: 'auto',
          fontWeight: 700,
          fontSize: 'var(--font-body)',
          lineHeight: 1,
          flexShrink: 0
        }}
      >
        ✕
      </button>
    </div>
  )
}
