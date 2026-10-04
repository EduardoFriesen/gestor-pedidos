import React, { useState, useRef, useEffect, useId, useCallback } from 'react'
import { pushModal, removeModal, isTopModal } from '../utils/modalStack'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function isToggleInput(el) {
  return el?.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio')
}

export function handleArrowNavigation(e, container) {
  const el = document.activeElement
  if (!container || !container.contains(el)) return false
  if (el.tagName !== 'BUTTON' && !isToggleInput(el)) return false
  const all = Array.from(container.querySelectorAll(FOCUSABLE)).filter(x => x.offsetParent !== null || x === el)
  let list = all
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const siblings = Array.from(el.parentElement?.children || []).filter(x => x.matches?.(FOCUSABLE))
    if (siblings.length > 1) list = siblings
  }
  const idx = list.indexOf(el)
  if (idx === -1 || list.length < 2) return false
  const back = e.key === 'ArrowLeft' || e.key === 'ArrowUp'
  const next = list[(idx + (back ? -1 : 1) + list.length) % list.length]
  e.preventDefault()
  next.focus()
  return true
}

export default function Modal({ isOpen, onClose, onSubmit, title, children }) {
  const ref = useRef(null)
  const prevFocus = useRef(null)
  const titleId = useId()
  const stackId = useId()
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
        if (ref.current.contains(document.activeElement)) return
        const firstInput = ref.current.querySelector('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])')
          || ref.current.querySelector('.modal-body button:not([disabled]), .form-actions .btn-primary:not([disabled])')
          || Array.from(ref.current.querySelectorAll(FOCUSABLE)).find(el => el.getAttribute('aria-label') !== 'Cerrar')
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
    pushModal(stackId)
    return () => removeModal(stackId)
  }, [animState === 'closed', stackId])

  useEffect(() => {
    if (animState === 'closed') return
    const submit = () => {
      if (onSubmit) {
        onSubmit()
        return
      }
      const buttons = Array.from(ref.current?.querySelectorAll('.form-actions .btn-primary') || []).filter(b => !b.disabled)
      buttons[buttons.length - 1]?.click()
    }
    const handler = (e) => {
      if (!isTopModal(stackId) || e.defaultPrevented) return
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Enter' && !e.isComposing) {
        const target = e.target
        if (!ref.current?.contains(target)) return
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          submit()
          return
        }
        if ((target.tagName === 'INPUT' && target.type !== 'button' && target.type !== 'submit') || target.tagName === 'SELECT') {
          e.preventDefault()
          submit()
        }
        return
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        handleArrowNavigation(e, ref.current)
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
  }, [animState, onClose, onSubmit, stackId])

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
