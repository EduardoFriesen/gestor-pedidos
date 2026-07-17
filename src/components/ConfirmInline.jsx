import React, { useRef } from 'react'

export default function ConfirmInline({ message, onConfirm, onCancel }) {
  const confirmBtnRef = useRef(null)
  return (
    <div style={{
      marginTop: 'var(--spacing-md)',
      padding: 'var(--spacing-md)',
      background: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-md)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--spacing-sm)',
      flexWrap: 'wrap'
    }}>
      <span style={{ fontSize: 'var(--font-sm)', flex: 1 }}>{message}</span>
      <button ref={confirmBtnRef} className="btn btn-primary btn-sm" onClick={onConfirm}>Sí</button>
      <button className="btn btn-ghost btn-sm" onClick={onCancel}>No</button>
    </div>
  )
}
