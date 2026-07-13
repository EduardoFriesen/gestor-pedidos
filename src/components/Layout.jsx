import React, { useState, useEffect, useRef, useCallback } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'Producción', icon: '📊', short: 'Prod', key: '1' },
  { path: '/orders', label: 'Pedidos', icon: '📝', short: 'Ped', key: '2' },
  { path: '/menu', label: 'Menú', icon: '🍽️', short: 'Menú', key: '3' },
  { path: '/ingredients', label: 'Ingredientes', icon: '🥘', short: 'Ingr', key: '4' },
  { path: '/clients', label: 'Clientes', icon: '👥', short: 'Cli', key: '5' },
  { path: '/analytics', label: 'Análisis', icon: '📊', short: 'Anal', key: '6' },
  { path: '/settings', label: 'Ajustes', icon: '⚙️', short: 'Ajust', key: '7' }
]

export default function Layout({ children, theme, macroMode }) {
  const [weekInfo, setWeekInfo] = useState(null)
  const [orderCounts, setOrderCounts] = useState(null)
  const mainRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const initialPath = useRef(location.pathname)

  useEffect(() => {
    window.piu?.getCurrentWeek().then(setWeekInfo)
  }, [])

  useEffect(() => {
    const load = () => window.piu?.getWeekOrderCounts().then(setOrderCounts)
    load()
    window.addEventListener('piu:production-update', load)
    return () => window.removeEventListener('piu:production-update', load)
  }, [])

  useEffect(() => {
    if (location.pathname !== initialPath.current) {
      initialPath.current = location.pathname
      mainRef.current?.focus()
    }
  }, [location.pathname])

  useEffect(() => {
    const handler = (e) => {
      if (!e.ctrlKey && !e.metaKey) return
      const idx = ['1','2','3','4','5','6','7'].indexOf(e.key)
      if (idx >= 0 && navItems[idx]) {
        e.preventDefault()
        navigate(navItems[idx].path)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  const formatDate = (str) => {
    if (!str) return ''
    const [y, m, d] = str.split('-')
    return `${d}/${m}/${y}`
  }

  const handleNavKeyDown = useCallback((e, idx) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = (idx + 1) % navItems.length
      document.querySelectorAll('nav a')[next]?.focus()
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = (idx - 1 + navItems.length) % navItems.length
      document.querySelectorAll('nav a')[prev]?.focus()
    }
    if (e.key === 'Home') {
      e.preventDefault()
      document.querySelectorAll('nav a')[0]?.focus()
    }
    if (e.key === 'End') {
      e.preventDefault()
      document.querySelectorAll('nav a')[navItems.length - 1]?.focus()
    }
  }, [])

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
            <svg width="32" height="32" viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="48" fill="var(--primary)" />
              <text x="50" y="68" fontFamily="system-ui" fontSize="54" fontWeight="900" fill="white" textAnchor="middle">P</text>
            </svg>
            <h1 style={{
              fontSize: 'var(--font-lg)',
              fontWeight: 900,
              color: 'var(--primary)',
              margin: 0,
              lineHeight: 1
            }}>PIU</h1>
          </div>
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
          {navItems.map((item, idx) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={`${item.label} (Ctrl+${item.key})`}
              onKeyDown={e => handleNavKeyDown(e, idx)}
              style={({ isActive }) => ({
                textDecoration: 'none',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--radius)',
                fontSize: macroMode ? 'var(--font-sm)' : 'var(--font-body)',
                fontWeight: 700,
                color: isActive ? `var(--section-${idx})` : 'var(--text-secondary)',
                background: isActive ? `var(--section-${idx}-light)` : 'transparent',
                border: isActive ? `3px solid var(--section-${idx})` : '3px solid transparent',
                transition: 'all var(--transition)',
                minHeight: macroMode ? 'var(--touch-size)' : 'calc(var(--touch-size) * 0.8)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-xs)'
              })}
              aria-current={({ isActive }) => isActive ? 'page' : undefined}
            >
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: macroMode ? 22 : 26,
                height: macroMode ? 22 : 26,
                borderRadius: '6px',
                background: `var(--section-${idx}-light)`,
                fontSize: macroMode ? '0.8rem' : '1rem',
                lineHeight: 1,
                flexShrink: 0
              }}>
                {item.icon}
              </span>
              <span>{macroMode ? item.short : item.label}</span>
              {item.path === '/orders' && orderCounts && (orderCounts.pending + orderCounts.confirmed) > 0 && (
                <span style={{
                  background: 'var(--danger)',
                  color: '#FFF',
                  fontSize: 'var(--font-xs)',
                  fontWeight: 900,
                  padding: '0 6px',
                  borderRadius: '999px',
                  minWidth: '18px',
                  height: '18px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1
                }}>
                  {orderCounts.pending + orderCounts.confirmed}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </header>

      <main
        ref={mainRef}
        id="main-content"
        tabIndex={-1}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 'var(--spacing-md)',
          outline: 'none'
        }}
      >
        {children}
      </main>

      <ProductionBar />
    </div>
  )
}

function ProductionBar() {
  const [dashboard, setDashboard] = useState({ totals: { total: 0, produced: 0 } })

  useEffect(() => {
    const load = () => window.piu?.getDashboard().then(d => { if (d?.totals) setDashboard(d) })
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
  const pct = total > 0 ? Math.min(100, Math.round((produced / total) * 100)) : 0
  const remaining = Math.max(0, total - produced)

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
