import React, { useRef, useEffect, useId, useCallback } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({ isOpen, onClose, title, children }) {
  const ref = useRef(null)
  const prevFocus = useRef(null)
  const titleId = useId()

  useEffect(() => {
    if (isOpen) {
      prevFocus.current = document.activeElement
      const raf = requestAnimationFrame(() => {
        if (ref.current) {
          const firstInput = ref.current.querySelector(FOCUSABLE)
          firstInput?.focus()
        }
      })
      return () => cancelAnimationFrame(raf)
    } else if (prevFocus.current) {
      if (document.body.contains(prevFocus.current)) {
        prevFocus.current.focus()
      }
      prevFocus.current = null
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab') {
        const el = ref.current
        if (!el) return
        const focusable = Array.from(el.querySelectorAll(FOCUSABLE))
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
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
      aria-labelledby={titleId}
    >
      <div className="modal-content" ref={ref}>
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Cerrar">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
