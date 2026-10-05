import React, { useState, useEffect, useRef, useCallback } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useHeaderContent } from './HeaderContext'
import Icon from './Icon'

const navItems = [
  { path: '/', section: 7, label: 'Inicio', icon: 'home', short: 'Inicio', key: '1' },
  { path: '/production', section: 0, label: 'Producción', icon: 'pot', short: 'Prod', key: '2' },
  { path: '/orders', section: 1, label: 'Pedidos', icon: 'receipt', short: 'Ped', key: '3' },
  { path: '/menu', section: 2, label: 'Menú', icon: 'utensils', short: 'Menú', key: '4' },
  { path: '/ingredients', section: 3, label: 'Ingredientes', icon: 'leaf', short: 'Ingr', key: '5' },
  { path: '/clients', section: 4, label: 'Clientes', icon: 'users', short: 'Cli', key: '6' },
  { path: '/analytics', section: 5, label: 'Análisis', icon: 'chart', short: 'Anal', key: '7' },
  { path: '/settings', section: 6, label: 'Ajustes', icon: 'sliders', short: 'Ajust', key: '8' }
]

const COLLAPSED_KEY = 'piu-sidebar-collapsed'

function readCollapsed() {
  try { return localStorage.getItem(COLLAPSED_KEY) === 'true' } catch { return false }
}

function shortDate(str) {
  if (!str) return ''
  const [, m, d] = str.split('-')
  return `${d}/${m}`
}

export default function Layout({ children, macroMode }) {
  const [weekInfo, setWeekInfo] = useState(null)
  const [orderCounts, setOrderCounts] = useState(null)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const mainRef = useRef(null)
  const navRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const initialPath = useRef(location.pathname)
  const { headerContent } = useHeaderContent()

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
      if (document.querySelector('.modal-overlay')) return
      const idx = ['1','2','3','4','5','6','7','8'].indexOf(e.key)
      if (idx >= 0 && navItems[idx]) {
        e.preventDefault()
        navigate(navItems[idx].path)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      try { localStorage.setItem(COLLAPSED_KEY, String(!prev)) } catch {}
      return !prev
    })
  }

  const handleNavKeyDown = useCallback((e, idx) => {
    const last = navItems.length - 1
    const target = {
      ArrowDown: idx === last ? 0 : idx + 1,
      ArrowRight: idx === last ? 0 : idx + 1,
      ArrowUp: idx === 0 ? last : idx - 1,
      ArrowLeft: idx === 0 ? last : idx - 1,
      Home: 0,
      End: last
    }[e.key]
    if (target === undefined) return
    e.preventDefault()
    navRef.current?.querySelectorAll('a')[target]?.focus()
  }, [])

  const pendingOrders = orderCounts ? orderCounts.pending + orderCounts.confirmed : 0

  return (
    <div className={`app-shell${collapsed ? ' is-collapsed' : ''}`}>
      <aside className="sidebar no-print">
        <div className="sidebar-brand">
          <svg className="sidebar-logo" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="48" fill="var(--primary)" />
            <text x="50" y="68" fontFamily="inherit" fontSize="54" fontWeight="800" fill="var(--on-primary)" textAnchor="middle">P</text>
          </svg>
          <div className="sidebar-label">
            <h1 className="sidebar-name">Piu</h1>
            {weekInfo && (
              <p className="sidebar-week">
                Semana <strong>{shortDate(weekInfo.week_start)} – {shortDate(weekInfo.week_end)}</strong>
              </p>
            )}
          </div>
        </div>

        <nav id="sidebar-nav" ref={navRef} aria-label="Navegación principal">
          <ul>
            {navItems.map((item, idx) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className="sidebar-link"
                  title={`${item.label} (Ctrl+${item.key})`}
                  aria-label={collapsed ? item.label : undefined}
                  onKeyDown={e => handleNavKeyDown(e, idx)}
                  style={{ '--link-accent': `var(--section-${item.section})` }}
                >
                  <Icon name={item.icon} className="sidebar-icon" />
                  <span className="sidebar-label">{macroMode ? item.short : item.label}</span>
                  {item.path === '/orders' && pendingOrders > 0 && (
                    <span className="sidebar-badge" aria-label={`${pendingOrders} sin armar`}>{pendingOrders}</span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <ProductionMeter collapsed={collapsed} />

        <button
          className="sidebar-toggle"
          onClick={toggleCollapsed}
          aria-controls="sidebar-nav"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          <Icon name="panel" className="sidebar-icon" />
          <span className="sidebar-label">Colapsar</span>
        </button>
      </aside>

      <div className="app-main">
        {headerContent}
        <main
          key={location.key}
          ref={mainRef}
          id="main-content"
          tabIndex={-1}
          className="app-content"
        >
          {children}
        </main>
      </div>
    </div>
  )
}

const MAX_SEGMENTS = 40

function ProductionMeter({ collapsed }) {
  const [totals, setTotals] = useState({ total: 0, produced: 0 })

  useEffect(() => {
    const load = () => window.piu?.getDashboard().then(d => { if (d?.totals) setTotals(d.totals) })
    load()
    const interval = setInterval(load, 30000)
    window.addEventListener('piu:production-update', load)
    return () => {
      clearInterval(interval)
      window.removeEventListener('piu:production-update', load)
    }
  }, [])

  const { total, produced } = totals
  const pct = total > 0 ? Math.min(100, Math.round((produced / total) * 100)) : 0
  const remaining = Math.max(0, total - produced)
  const done = total > 0 && remaining === 0
  const segmented = !collapsed && total > 0 && total <= MAX_SEGMENTS

  return (
    <div className={`meter${done ? ' is-done' : ''}`} data-testid="production-meter">
      <div className="meter-head">
        <span className="sidebar-label meter-title">Producido</span>
        {collapsed ? (
          <span className="meter-num meter-pct">{pct}%</span>
        ) : (
          <span className="meter-num">
            {produced}<span className="meter-of">/{total}</span>
          </span>
        )}
      </div>
      <div
        className={`meter-track${segmented ? ' is-segmented' : ''}`}
        role="progressbar"
        aria-label="Producción de la semana"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${produced} de ${total} platos`}
      >
        {segmented
          ? Array.from({ length: total }, (_, i) => <span key={i} className={i < produced ? 'is-on' : undefined} />)
          : <span className="is-on" style={{ width: `${pct}%` }} />}
      </div>
      <p className="sidebar-label meter-foot">
        {total === 0 ? 'Sin pedidos esta semana' : done ? '✓ Semana completa' : `Faltan ${remaining} · ${pct}%`}
      </p>
    </div>
  )
}
