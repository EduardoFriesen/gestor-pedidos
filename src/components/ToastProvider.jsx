import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import Snackbar from './Snackbar'

const ToastContext = createContext()
const MAX_TOASTS = 5

export function useToast() {
  return useContext(ToastContext)
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const counter = useRef(0)
  const timers = useRef({})

  const showToast = useCallback((message, type = 'success') => {
    const id = ++counter.current
    setToasts(prev => {
      const next = prev.length >= MAX_TOASTS ? prev.slice(1) : prev
      return [...next, { id, message, type }]
    })
    timers.current[id] = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      delete timers.current[id]
    }, 3000)
  }, [])

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout)
    }
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: 'var(--spacing-md)',
        right: 'var(--spacing-md)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-sm)',
        pointerEvents: 'none'
      }}>
        {toasts.map(t => (
          <Snackbar
            key={t.id}
            message={t.message}
            type={t.type}
            onClose={() => {
              clearTimeout(timers.current[t.id])
              delete timers.current[t.id]
              setToasts(prev => prev.filter(x => x.id !== t.id))
            }}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
