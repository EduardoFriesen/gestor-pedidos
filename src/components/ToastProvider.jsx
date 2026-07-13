import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import Snackbar from './Snackbar'

const ToastContext = createContext()

export function useToast() {
  return useContext(ToastContext)
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const counter = useRef(0)

  const showToast = useCallback((message, type = 'success') => {
    const id = ++counter.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
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
            onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
