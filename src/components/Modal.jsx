import React, { useRef, useEffect, useCallback } from 'react'

export default function Modal({ isOpen, onClose, title, children }) {
  const ref = useRef(null)

  useEffect(() => {
    if (isOpen) {
      const firstInput = ref.current?.querySelector('input, select, textarea, button')
      firstInput?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="modal-content" ref={ref}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Cerrar">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
