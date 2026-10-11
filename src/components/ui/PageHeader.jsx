import React from 'react'

export default function PageHeader({ title, subtitle, actions, children }) {
  return (
    <header className="page-header">
      <div className="page-header-main">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {children}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}
