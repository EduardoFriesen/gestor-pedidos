import React from 'react'

export default function ScrollArea({ label, variant = 'table', className = '', children }) {
  return (
    <div className={`scroll-10 scroll-${variant} ${className}`} role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  )
}
