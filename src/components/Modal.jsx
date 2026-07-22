import React, { useState, useRef, useEffect, useId, useCallback } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({ isOpen, onClose, title, children }) {
  const ref = useRef(null)
  const prevFocus = useRef(null)
  const titleId = useId()
  const [animState, setAnimState] = useState('closed')
  const prevOpen = useRef(false)

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

  useEffect(() => {
    if (animState !== 'open') {
      if (prevFocus.current && document.body.contains(prevFocus.current)) {
        prevFocus.current.focus()
      }
      prevFocus.current = null
      return
    }
    prevFocus.current = document.activeElement
    const raf = requestAnimationFrame(() => {
      if (ref.current) {
        const firstInput = ref.current.querySelector(FOCUSABLE)
        if (firstInput) {
          firstInput.focus()
        } else {
          ref.current.focus()
        }
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [animState])

  useEffect(() => {
    if (animState === 'closed') return
    const handler = (e) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab') {
        const el = ref.current
        if (!el) return
        const focusable = Array.from(el.querySelectorAll(FOCUSABLE))
        if (focusable.length === 0) {
          e.preventDefault()
          el.focus()
          return
        }
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
  }, [animState, onClose])

  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  if (animState === 'closed') return null

  const isEntering = animState === 'entering'
  const isExiting = animState === 'exiting'

  return (
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={{
        animation: isEntering ? 'fadeIn 200ms var(--ease-out-quart)' : isExiting ? 'fadeOut 150ms ease-in' : undefined
      }}
    >
      <div className="modal-content" ref={ref} tabIndex={-1}
        style={{
          animation: isEntering ? 'scaleIn 250ms var(--ease-out-quart)' : isExiting ? 'scaleOut 150ms ease-in' : undefined
        }}
      >
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
