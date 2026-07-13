import React from 'react'

export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null

  return (
    <div
      role="alert"
      style={{
        background: 'var(--danger-light)',
        color: 'var(--danger)',
        padding: 'var(--spacing-sm) var(--spacing-md)',
        borderRadius: 'var(--radius)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--spacing-md)',
        fontWeight: 700,
        fontSize: 'var(--font-sm)',
        gap: 'var(--spacing-sm)'
      }}
    >
      <span>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="btn btn-ghost btn-sm" aria-label="Descartar error" style={{ flexShrink: 0 }}>
          ✕
        </button>
      )}
    </div>
  )
}
