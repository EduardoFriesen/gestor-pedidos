import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/', label: '📊 Producción', short: 'Prod' },
  { path: '/orders', label: '📝 Pedidos', short: 'Ped' },
  { path: '/menu', label: '🍽️ Menú', short: 'Menú' },
  { path: '/ingredients', label: '🥘 Ingredientes', short: 'Ingr' },
  { path: '/clients', label: '👥 Clientes', short: 'Cli' },
  { path: '/analytics', label: '📊 Análisis', short: 'Anal' }
]

export default function Layout({ children, theme, macroMode }) {
  const [weekInfo, setWeekInfo] = useState(null)

  useEffect(() => {
    window.piu?.getCurrentWeek().then(setWeekInfo)
  }, [])

  const formatDate = (str) => {
    if (!str) return ''
    const [y, m, d] = str.split('-')
    return `${d}/${m}/${y}`
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--bg)'
    }}>
      <header className="no-print" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--spacing-sm) var(--spacing-md)',
        background: 'var(--nav-bg)',
        borderBottom: '2px solid var(--border)',
        boxShadow: 'var(--shadow)',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <h1 style={{
            fontSize: 'var(--font-lg)',
            fontWeight: 900,
            color: 'var(--primary)',
            margin: 0,
            lineHeight: 1
          }}>PIU</h1>
          {weekInfo && (
            <span style={{
              fontSize: 'var(--font-sm)',
              color: 'var(--text-secondary)',
              fontWeight: 600
            }}>
              Semana {formatDate(weekInfo.week_start)} - {formatDate(weekInfo.week_end)}
            </span>
          )}
        </div>

        <nav style={{ display: 'flex', gap: '4px' }} aria-label="Navegación principal">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                textDecoration: 'none',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--radius)',
                fontSize: macroMode ? 'var(--font-sm)' : 'var(--font-body)',
                fontWeight: 700,
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--primary-light)' : 'transparent',
                border: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                transition: 'all var(--transition)',
                minHeight: macroMode ? 'var(--touch-size)' : 'calc(var(--touch-size) * 0.8)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-xs)'
              })}
              aria-current={({ isActive }) => isActive ? 'page' : undefined}
            >
              <span>{macroMode ? item.short : item.label}</span>
            </NavLink>
          ))}
        </nav>
      </header>

      <main style={{
        flex: 1,
        overflow: 'auto',
        padding: 'var(--spacing-md)'
      }}>
        {children}
      </main>

      <ProductionBar />
    </div>
  )
}

function ProductionBar() {
  const [dashboard, setDashboard] = useState({ totals: { total: 0, produced: 0 } })

  useEffect(() => {
    const load = () => window.piu?.getDashboard().then(setDashboard)
    load()
    const interval = setInterval(load, 30000)
    const handler = () => load()
    window.addEventListener('piu:production-update', handler)
    return () => {
      clearInterval(interval)
      window.removeEventListener('piu:production-update', handler)
    }
  }, [])

  const { total, produced } = dashboard.totals
  const pct = total > 0 ? Math.round((produced / total) * 100) : 0
  const remaining = total - produced

  return (
    <div className="no-print" style={{
      padding: 'var(--spacing-sm) var(--spacing-md)',
      background: 'var(--nav-bg)',
      borderTop: '2px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--spacing-md)',
      fontSize: 'var(--font-body)',
      fontWeight: 700
    }}>
      <div style={{ flex: 1, height: 'calc(var(--touch-size) * 0.5)', background: 'var(--border)', borderRadius: '100px', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: pct >= 100 ? 'var(--success)' : 'var(--primary)',
          borderRadius: '100px',
          transition: 'width 0.5s ease',
          minWidth: '20px'
        }} />
      </div>
      <span style={{ color: 'var(--text)' }}>
        Producido: <strong>{produced}</strong>/{total} ({pct}%)
      </span>
      {remaining > 0 && (
        <span style={{ color: 'var(--accent)' }}>
          Faltan <strong>{remaining}</strong> platos
        </span>
      )}
      {remaining <= 0 && total > 0 && (
        <span style={{ color: 'var(--success)' }}>
          ✓ Completado
        </span>
      )}
    </div>
  )
}
