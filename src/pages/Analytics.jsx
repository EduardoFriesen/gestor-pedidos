import React, { useState, useEffect, useCallback } from 'react'
import PdfViewer from '../components/PdfViewer'
import { generarHojaProduccion, generarListaCompras } from '../utils/pdf'

const PRESETS = [
  { id: 'week', label: 'Esta semana' },
  { id: 'month', label: 'Este mes' },
  { id: 'quarter', label: 'Este trimestre' },
  { id: 'year', label: 'Este año' },
  { id: 'all', label: 'Todo' },
  { id: 'custom', label: 'Personalizado' }
]

function getPresetRange(preset) {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const today = `${y}-${m}-${d}`

  const fmt = (dt) => {
    const y = dt.getFullYear()
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const d = String(dt.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  switch (preset) {
    case 'week': {
      const day = now.getDay()
      const sunday = new Date(now)
      sunday.setDate(now.getDate() - day)
      const saturday = new Date(sunday)
      saturday.setDate(sunday.getDate() + 6)
      return { startDate: fmt(sunday), endDate: fmt(saturday) }
    }
    case 'month': {
      const start = `${y}-${m}-01`
      return { startDate: start, endDate: today }
    }
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3) * 3 + 1
      const start = `${y}-${String(q).padStart(2, '0')}-01`
      return { startDate: start, endDate: today }
    }
    case 'year':
      return { startDate: `${y}-01-01`, endDate: today }
    case 'all':
    default:
      return { startDate: null, endDate: null }
  }
}

function formatDate(str) {
  if (!str) return ''
  const [y, m, d] = str.split('-')
  return `${d}/${m}`
}

function fmtMoney(n) {
  return n !== undefined && n !== null ? `$${(n).toFixed(2)}` : '—'
}

function pct(n) {
  return n !== undefined && n !== null ? `${(n).toFixed(1)}%` : '—'
}

function pctChange(n) {
  if (n === undefined || n === null) return '—'
  const val = parseFloat(n)
  return `${val > 0 ? '+' : ''}${val.toFixed(1)}%`
}

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null)
  const [trends, setTrends] = useState({ weekly: [], monthly: [], yearly: [] })
  const [fullTrends, setFullTrends] = useState({ weekly: [], monthly: [], yearly: [] })
  const [dashboard, setDashboard] = useState(null)
  const [ingredients, setIngredients] = useState([])
  const [comparison, setComparison] = useState(null)
  const [pdfPreview, setPdfPreview] = useState(null)
  const [tab, setTab] = useState('top')
  const [trendPeriod, setTrendPeriod] = useState('weekly')
  const [filterPreset, setFilterPreset] = useState('week')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [compType, setCompType] = useState('week')
  const [compVal1, setCompVal1] = useState('')
  const [compVal2, setCompVal2] = useState('')
  const [customComp1Start, setCustomComp1Start] = useState('')
  const [customComp1End, setCustomComp1End] = useState('')
  const [customComp2Start, setCustomComp2Start] = useState('')
  const [customComp2End, setCustomComp2End] = useState('')

  const loadAll = useCallback((preset, start, end) => {
    const { startDate, endDate } = preset === 'custom'
      ? { startDate: start || null, endDate: end || null }
      : getPresetRange(preset)

    Promise.all([
      window.piu?.getAnalyticsFiltered(startDate, endDate),
      window.piu?.getTrendsInRange(startDate, endDate),
      window.piu?.getDashboard(),
      window.piu?.getIngredientsList()
    ]).then(([a, t, d, i]) => {
      setAnalytics(a)
      setTrends(t || { weekly: [], monthly: [], yearly: [] })
      setDashboard(d)
      setIngredients(i || [])
    })
  }, [])

  useEffect(() => { loadAll(filterPreset, customStart, customEnd) }, [loadAll, filterPreset, customStart, customEnd])

  useEffect(() => {
    window.piu?.getTrendsInRange(null, null).then(t => {
      if (t) setFullTrends(t)
    })
  }, [])

  useEffect(() => {
    setComparison(null)
  }, [compType])

  useEffect(() => {
    const w = fullTrends.weekly, m = fullTrends.monthly, y = fullTrends.yearly
    if (!w.length) return
    switch (compType) {
      case 'week':
        if (w.length >= 2) { setCompVal1(w[w.length - 2].week_start); setCompVal2(w[w.length - 1].week_start) }
        break
      case 'month':
        if (m.length >= 2) { setCompVal1(m[m.length - 2].month); setCompVal2(m[m.length - 1].month) }
        break
      case 'year':
        if (y.length >= 2) { setCompVal1(y[y.length - 2].year); setCompVal2(y[y.length - 1].year) }
        break
    }
  }, [compType, fullTrends])

  const handleFilterChange = (preset) => {
    setFilterPreset(preset)
    if (preset !== 'custom') {
      setCustomStart('')
      setCustomEnd('')
    }
  }

  const handleCustomFilter = () => {
    if (customStart && customEnd) {
      loadAll('custom', customStart, customEnd)
    }
  }

  const runCustomComparison = () => {
    let p1Start, p1End, p2Start, p2End

    switch (compType) {
      case 'week': {
        if (compVal1 && compVal2) {
          p1Start = compVal1
          p1End = compVal1
          p2Start = compVal2
          p2End = compVal2
        }
        break
      }
      case 'month': {
        const months = fullTrends.monthly
        const m1 = months.find(m => m.month === compVal1)
        const m2 = months.find(m => m.month === compVal2)
        if (m1 && m2) {
          p1Start = m1.month + '-01'
          p1End = m1.month + '-31'
          p2Start = m2.month + '-01'
          p2End = m2.month + '-31'
        }
        break
      }
      case 'year': {
        const y1 = parseInt(compVal1)
        const y2 = parseInt(compVal2)
        if (y1 && y2) {
          p1Start = `${y1}-01-01`
          p1End = `${y1}-12-31`
          p2Start = `${y2}-01-01`
          p2End = `${y2}-12-31`
        }
        break
      }
      case 'custom': {
        p1Start = customComp1Start || null
        p1End = customComp1End || null
        p2Start = customComp2Start || null
        p2End = customComp2End || null
        break
      }
    }

    if (p1Start && p2Start) {
      window.piu?.getPeriodComparison(p1Start, p1End, p2Start, p2End).then(setComparison)
    }
  }

  useEffect(() => {
    runCustomComparison()
  }, [compType, compVal1, compVal2, customComp1Start, customComp1End, customComp2Start, customComp2End])

  const handlePrintProduction = () => {
    if (!dashboard) return
    const doc = generarHojaProduccion(dashboard)
    setPdfPreview({ doc, title: `produccion-piu-${dashboard.week.week_start}` })
  }

  const handlePrintShopping = () => {
    if (ingredients.length === 0) {
      alert('No hay ingredientes configurados en los platos para generar la lista de compras.')
      return
    }
    const doc = generarListaCompras(ingredients)
    setPdfPreview({ doc, title: `compras-piu-${dashboard?.week?.week_start || 'semana'}` })
  }

  if (!analytics) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', fontSize: 'var(--font-lg)' }}>Cargando...</div>
  }

  const tabs = [
    { id: 'top', label: 'Top Platos' },
    { id: 'clients', label: 'Top Clientes' },
    { id: 'trend', label: 'Tendencias' },
    { id: 'comparison', label: 'Comparativa' },
    { id: 'profitability', label: 'Rentabilidad' }
  ]

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--spacing-md)'
      }}>
        <h2>Análisis</h2>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <button className="btn btn-outline btn-sm" onClick={handlePrintShopping}>
            📋 Lista Compras
          </button>
          <button className="btn btn-outline btn-sm" onClick={handlePrintProduction}>
            🖨️ Hoja Producción
          </button>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: 'var(--spacing-xs)',
        marginBottom: 'var(--spacing-md)',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700, color: 'var(--text-secondary)', marginRight: 'var(--spacing-sm)' }}>
          Período:
        </span>
        {PRESETS.map(p => (
          <button
            key={p.id}
            className={filterPreset === p.id ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            onClick={() => handleFilterChange(p.id)}
            style={{ fontSize: 'var(--font-sm)' }}
          >
            {p.label}
          </button>
        ))}
        {filterPreset === 'custom' && (
          <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center', marginLeft: 'var(--spacing-sm)' }}>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ width: '150px', fontSize: 'var(--font-sm)' }} />
            <span style={{ fontSize: 'var(--font-sm)' }}>a</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ width: '150px', fontSize: 'var(--font-sm)' }} />
            <button className="btn btn-primary btn-sm" onClick={handleCustomFilter}>Filtrar</button>
          </div>
        )}
      </div>

      <div style={{
        display: 'flex',
        gap: 'var(--spacing-md)',
        marginBottom: 'var(--spacing-lg)',
        flexWrap: 'wrap'
      }}>
        <StatCard label="Pedidos" value={analytics.totalOrders} />
        <StatCard label="Ingresos" value={fmtMoney(analytics.revenue)} highlight="var(--success)" />
        <StatCard label="Costo total" value={fmtMoney(analytics.totalCost)} highlight="var(--danger)" />
        <StatCard
          label="Ganancia neta"
          value={fmtMoney(analytics.totalProfit)}
          highlight={(analytics.totalProfit || 0) >= 0 ? 'var(--primary)' : 'var(--danger)'}
        />
        {analytics.revenue > 0 && analytics.totalCost > 0 && (
          <StatCard
            label="Margen %"
            value={pct((analytics.revenue - analytics.totalCost) / analytics.revenue * 100)}
            highlight="var(--accent)"
          />
        )}
      </div>

      <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            className={tab === t.id ? 'btn btn-primary' : 'btn btn-ghost'}
            onClick={() => setTab(t.id)}
            style={{ fontSize: 'var(--font-body)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'top' && (
        <div>
          {analytics.topDishes.length === 0 ? (
            <div className="empty-state card"><p>Sin datos en este período.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {analytics.topDishes.map((d, i) => {
                const max = analytics.topDishes[0]?.total || 1
                const barPct = Math.round((d.total / max) * 100)
                const hasIngredients = d.cost > 0
                return (
                  <div key={d.name} className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                    <span style={{ fontSize: 'var(--font-lg)', fontWeight: 900, color: 'var(--primary)', minWidth: '40px' }}>#{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
                        <div>
                          <strong style={{ fontSize: 'var(--font-lg)' }}>{d.name}</strong>
                          <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginLeft: 'var(--spacing-sm)' }}>
                            {d.total} vendidos
                          </span>
                        </div>
                      </div>
                      <div style={{ height: 'calc(var(--touch-size) * 0.4)', background: 'var(--border)', borderRadius: '100px', overflow: 'hidden', marginBottom: 'var(--spacing-xs)' }}>
                        <div style={{ width: `${barPct}%`, height: '100%', background: 'var(--primary)', borderRadius: '100px', transition: 'width 0.5s ease', minWidth: '20px' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--spacing-md)', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                        <span>Precio: <strong>${d.price.toFixed(2)}</strong></span>
                        {hasIngredients ? (
                          <>
                            <span>Costo: <strong>${d.cost.toFixed(2)}</strong></span>
                            <span>Ganancia/ud: <strong style={{ color: d.profit > 0 ? 'var(--success)' : 'var(--danger)' }}>${d.profit.toFixed(2)}</strong></span>
                            <span>Ganancia total: <strong style={{ color: d.totalProfit > 0 ? 'var(--success)' : 'var(--danger)' }}>${d.totalProfit.toFixed(2)}</strong></span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Sin ingredientes cargados</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'clients' && (
        <div>
          {analytics.topClients.length === 0 ? (
            <div className="empty-state card"><p>Sin datos en este período.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {analytics.topClients.map((c, i) => {
                const max = analytics.topClients[0]?.order_count || 1
                const barPct = Math.round((c.order_count / max) * 100)
                return (
                  <div key={`${c.name}-${c.last_name}`} className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                    <span style={{ fontSize: 'var(--font-lg)', fontWeight: 900, color: 'var(--primary)', minWidth: '40px' }}>#{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
                        <strong style={{ fontSize: 'var(--font-lg)' }}>{c.name} {c.last_name}</strong>
                        <span style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>{c.order_count}</span>
                      </div>
                      <div style={{ height: 'calc(var(--touch-size) * 0.4)', background: 'var(--border)', borderRadius: '100px', overflow: 'hidden' }}>
                        <div style={{ width: `${barPct}%`, height: '100%', background: 'var(--accent)', borderRadius: '100px', transition: 'width 0.5s ease', minWidth: '20px' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                        <span>{c.order_count} pedidos</span>
                        {c.favorite_dish && <span>Plato favorito: <strong>{c.favorite_dish}</strong></span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'trend' && (
        <div>
          <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)' }}>
            {[
              { id: 'weekly', label: 'Semanal' },
              { id: 'monthly', label: 'Mensual' },
              { id: 'yearly', label: 'Anual' }
            ].map(p => (
              <button
                key={p.id}
                className={trendPeriod === p.id ? 'btn btn-primary' : 'btn btn-ghost'}
                onClick={() => setTrendPeriod(p.id)}
                style={{ fontSize: 'var(--font-body)' }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {(() => {
            const data = trendPeriod === 'weekly' ? trends.weekly
              : trendPeriod === 'monthly' ? trends.monthly
              : trends.yearly
            const labelKey = trendPeriod === 'weekly' ? 'week_start' : trendPeriod === 'monthly' ? 'month' : 'year'
            const fmtLabel = trendPeriod === 'weekly' ? formatDate
              : trendPeriod === 'monthly' ? (m) => `${m.slice(5)}/${m.slice(2, 4)}`
              : (y) => y

            if (data.length === 0) return <div className="empty-state card"><p>No hay datos en este período.</p></div>

            return (
              <>
                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Ingresos, Costos y Ganancias</h3>
                <GroupedBarChart
                  data={data}
                  labelKey={labelKey}
                  formatLabel={fmtLabel}
                  currentKey={trendPeriod === 'weekly' ? dashboard?.week?.week_start : undefined}
                  series={[
                    { key: 'revenue', label: 'Ingresos', color: 'var(--success)' },
                    { key: 'cost', label: 'Costos', color: 'var(--danger)' },
                    { key: 'profit', label: 'Ganancia', color: 'var(--primary)' }
                  ]}
                  formatValue={fmtMoney}
                />

                <h3 style={{ margin: 'var(--spacing-lg) 0 var(--spacing-md)' }}>Datos por período</h3>
                <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-sm)' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-card)' }}>
                        <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left' }}>Período</th>
                        <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>Ingresos</th>
                        <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>Costos</th>
                        <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>Ganancia</th>
                        <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>Margen</th>
                        <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>Pedidos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row) => {
                        const label = row[labelKey]
                        const margin = row.revenue > 0 ? (row.profit / row.revenue * 100) : 0
                        return (
                          <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontWeight: 600 }}>
                              {typeof fmtLabel === 'function' ? fmtLabel(label) : label}
                            </td>
                            <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right', color: 'var(--success)' }}>
                              {fmtMoney(row.revenue)}
                            </td>
                            <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right', color: 'var(--danger)' }}>
                              {fmtMoney(row.cost)}
                            </td>
                            <td style={{
                              padding: 'var(--spacing-sm) var(--spacing-md)',
                              textAlign: 'right',
                              fontWeight: 700,
                              color: row.profit >= 0 ? 'var(--success)' : 'var(--danger)'
                            }}>
                              {fmtMoney(row.profit)}
                            </td>
                            <td style={{
                              padding: 'var(--spacing-sm) var(--spacing-md)',
                              textAlign: 'right',
                              color: margin >= 30 ? 'var(--success)' : margin >= 10 ? 'var(--accent)' : 'var(--danger)'
                            }}>
                              {margin.toFixed(1)}%
                            </td>
                            <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>
                              {row.order_count}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )
          })()}
        </div>
      )}

      {tab === 'comparison' && (
        <div>
          <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { id: 'week', label: 'Semanal' },
              { id: 'month', label: 'Mensual' },
              { id: 'year', label: 'Anual' },
              { id: 'custom', label: 'Personalizado' }
            ].map(t => (
              <button
                key={t.id}
                className={compType === t.id ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                onClick={() => setCompType(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {compType === 'week' && fullTrends.weekly.length >= 2 && (
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={compVal1} onChange={e => setCompVal1(e.target.value)} style={{ width: '200px' }}>
                <option value="">— Seleccionar semana —</option>
                {fullTrends.weekly.map(w => (
                  <option key={w.week_start} value={w.week_start}>
                    Semana del {formatDate(w.week_start)}
                  </option>
                ))}
              </select>
              <span style={{ fontWeight: 700 }}>vs</span>
              <select value={compVal2} onChange={e => setCompVal2(e.target.value)} style={{ width: '200px' }}>
                <option value="">— Seleccionar semana —</option>
                {fullTrends.weekly.map(w => (
                  <option key={w.week_start} value={w.week_start}>
                    Semana del {formatDate(w.week_start)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {compType === 'month' && fullTrends.monthly.length >= 2 && (
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={compVal1} onChange={e => setCompVal1(e.target.value)} style={{ width: '180px' }}>
                <option value="">— Seleccionar —</option>
                {fullTrends.monthly.map(m => <option key={m.month} value={m.month}>{m.month}</option>)}
              </select>
              <span style={{ fontWeight: 700 }}>vs</span>
              <select value={compVal2} onChange={e => setCompVal2(e.target.value)} style={{ width: '180px' }}>
                <option value="">— Seleccionar —</option>
                {fullTrends.monthly.map(m => <option key={m.month} value={m.month}>{m.month}</option>)}
              </select>
            </div>
          )}

          {compType === 'year' && (
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={compVal1} onChange={e => setCompVal1(e.target.value)} style={{ width: '150px' }}>
                <option value="">— Año —</option>
                {fullTrends.yearly.map(y => <option key={y.year} value={y.year}>{y.year}</option>)}
              </select>
              <span style={{ fontWeight: 700 }}>vs</span>
              <select value={compVal2} onChange={e => setCompVal2(e.target.value)} style={{ width: '150px' }}>
                <option value="">— Año —</option>
                {fullTrends.yearly.map(y => <option key={y.year} value={y.year}>{y.year}</option>)}
              </select>
            </div>
          )}

          {compType === 'custom' && (
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <label style={{ fontSize: 'var(--font-xs)', display: 'block' }}>Período 1</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input type="date" value={customComp1Start} onChange={e => setCustomComp1Start(e.target.value)} style={{ width: '150px', fontSize: 'var(--font-sm)' }} />
                  <input type="date" value={customComp1End} onChange={e => setCustomComp1End(e.target.value)} style={{ width: '150px', fontSize: 'var(--font-sm)' }} />
                </div>
              </div>
              <span style={{ fontWeight: 700, marginTop: 'var(--spacing-md)' }}>vs</span>
              <div>
                <label style={{ fontSize: 'var(--font-xs)', display: 'block' }}>Período 2</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input type="date" value={customComp2Start} onChange={e => setCustomComp2Start(e.target.value)} style={{ width: '150px', fontSize: 'var(--font-sm)' }} />
                  <input type="date" value={customComp2End} onChange={e => setCustomComp2End(e.target.value)} style={{ width: '150px', fontSize: 'var(--font-sm)' }} />
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={runCustomComparison} style={{ marginTop: 'var(--spacing-md)' }}>
                Comparar
              </button>
            </div>
          )}

          {!comparison && (
            <div className="empty-state card"><p>Seleccioná dos períodos para comparar.</p></div>
          )}

          {comparison && (() => {
            const chartData = [
              { label: 'Pedidos', p1: comparison.period1.orders, p2: comparison.period2.orders },
              { label: 'Ingresos', p1: comparison.period1.revenue, p2: comparison.period2.revenue },
              { label: 'Costos', p1: comparison.period1.cost, p2: comparison.period2.cost },
              { label: 'Ganancia', p1: comparison.period1.profit, p2: comparison.period2.profit },
            ]
            const p1Label = compType === 'week' ? `Semana del ${formatDate(compVal1)}` :
                            compType === 'month' ? compVal1 :
                            compType === 'year' ? compVal1 : 'Período 1'
            const p2Label = compType === 'week' ? `Semana del ${formatDate(compVal2)}` :
                            compType === 'month' ? compVal2 :
                            compType === 'year' ? compVal2 : 'Período 2'
            return (
              <>
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                  <div className="card" style={{ flex: 1, textAlign: 'center' }}>
                    <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>{p1Label}</p>
                    <p style={{ fontSize: 'var(--font-xl)', fontWeight: 900 }}>{comparison.period1.orders}</p>
                    <p>pedidos</p>
                    <p style={{ color: 'var(--success)' }}>{fmtMoney(comparison.period1.revenue)}</p>
                    <p style={{ color: 'var(--danger)' }}>{fmtMoney(comparison.period1.cost)}</p>
                    <p style={{ color: 'var(--primary)', fontWeight: 700 }}>{fmtMoney(comparison.period1.profit)}</p>
                  </div>
                  <div className="card" style={{ flex: 1, textAlign: 'center' }}>
                    <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>{p2Label}</p>
                    <p style={{ fontSize: 'var(--font-xl)', fontWeight: 900 }}>{comparison.period2.orders}</p>
                    <p>pedidos</p>
                    <p style={{ color: 'var(--success)' }}>{fmtMoney(comparison.period2.revenue)}</p>
                    <p style={{ color: 'var(--danger)' }}>{fmtMoney(comparison.period2.cost)}</p>
                    <p style={{ color: 'var(--primary)', fontWeight: 700 }}>{fmtMoney(comparison.period2.profit)}</p>
                  </div>
                </div>

                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                  <GroupedBarChart
                    data={chartData}
                    labelKey="label"
                    series={[
                      { key: 'p1', label: p1Label, color: 'var(--primary)' },
                      { key: 'p2', label: p2Label, color: 'var(--accent)' }
                    ]}
                    formatValue={(v) => {
                      if (typeof v === 'number') {
                        return Number.isInteger(v) ? v : `$${(v).toFixed(0)}`
                      }
                      return v
                    }}
                  />
                </div>

                <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-body)' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-card)' }}>
                        <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left' }}>Métrica</th>
                        <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>{p1Label}</th>
                        <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>{p2Label}</th>
                        <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>Cambio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: 'orders', label: 'Pedidos', fmt: (v) => v },
                        { key: 'revenue', label: 'Ingresos', fmt: fmtMoney },
                        { key: 'cost', label: 'Costos', fmt: fmtMoney },
                        { key: 'profit', label: 'Ganancia', fmt: fmtMoney },
                        { key: 'margin', label: 'Margen %', fmt: (v) => `${(v || 0).toFixed(1)}%` }
                      ].map(row => {
                        const p1 = comparison.period1?.[row.key]
                        const p2 = comparison.period2?.[row.key]
                        const change = comparison.changes?.[row.key]
                        const isPositive = row.key === 'cost' ? (change < 0) : (change > 0)
                        return (
                          <tr key={row.key} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontWeight: 600 }}>{row.label}</td>
                            <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>{row.fmt(p1)}</td>
                            <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right', fontWeight: 700 }}>{row.fmt(p2)}</td>
                            <td style={{
                              padding: 'var(--spacing-sm) var(--spacing-md)',
                              textAlign: 'right',
                              fontWeight: 700,
                              color: change === 0 ? 'var(--text-secondary)' : isPositive ? 'var(--success)' : 'var(--danger)'
                            }}>
                              {change !== undefined && change !== null ? (change > 0 ? '↑ ' : change < 0 ? '↓ ' : '') + pctChange(change) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )
          })()}
        </div>
      )}

      {tab === 'profitability' && (
        <div>
          {analytics.dishProfitability.length === 0 ? (
            <div className="empty-state card"><p>No hay platos activos para mostrar.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {analytics.dishProfitability.map((d, i) => {
                const maxMargin = analytics.dishProfitability[0]?.margin || 1
                const barPct = Math.round((d.margin / maxMargin) * 100)
                return (
                  <div key={d.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                    <span style={{ fontSize: 'var(--font-lg)', fontWeight: 900, color: 'var(--accent)', minWidth: '40px' }}>#{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
                        <strong style={{ fontSize: 'var(--font-lg)' }}>{d.name}</strong>
                        <span style={{
                          fontSize: 'var(--font-lg)', fontWeight: 900,
                          color: d.margin > 30 ? 'var(--success)' : d.margin > 10 ? 'var(--accent)' : 'var(--danger)'
                        }}>
                          {d.margin.toFixed(0)}%
                        </span>
                      </div>
                      <div style={{ height: 'calc(var(--touch-size) * 0.4)', background: 'var(--border)', borderRadius: '100px', overflow: 'hidden', marginBottom: 'var(--spacing-xs)' }}>
                        <div style={{
                          width: `${Math.max(barPct, 2)}%`, height: '100%',
                          background: d.margin > 30 ? 'var(--success)' : d.margin > 10 ? 'var(--accent)' : 'var(--danger)',
                          borderRadius: '100px', transition: 'width 0.5s ease', minWidth: '20px'
                        }} />
                      </div>
                      {d.hasIngredients ? (
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                          <span>Precio: <strong>${d.price.toFixed(2)}</strong></span>
                          <span>Costo: <strong>${d.cost.toFixed(2)}</strong></span>
                          <span>Ganancia/ud: <strong>${d.profit.toFixed(2)}</strong></span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Sin ingredientes cargados</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {pdfPreview && (
        <PdfViewer pdfDoc={pdfPreview.doc} title={pdfPreview.title} onClose={() => setPdfPreview(null)} />
      )}
    </div>
  )
}

function StatCard({ label, value, highlight }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: '160px', textAlign: 'center' }}>
      <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>{label}</p>
      <p style={{ fontSize: 'var(--font-xl)', fontWeight: 900, color: highlight || 'var(--text)' }}>{value}</p>
    </div>
  )
}

function BarChart({ data, labelKey, valueKey, barColor, formatLabel, currentKey, formatValue }) {
  const max = Math.max(...data.map(x => x[valueKey] || 0), 1)
  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 'calc(var(--spacing-sm) * 0.5)',
        height: 'calc(var(--font-body) * 7 + 40px)', padding: 'var(--spacing-md)',
        minWidth: `${Math.max(data.length * 65, 300)}px`
      }}>
        {data.map((item) => {
          const val = item[valueKey] || 0
          const p = val / max
          const key = item[labelKey]
          const isCurrent = currentKey === key
          return (
            <div key={key} style={{ flex: '0 0 55px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
              <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>
                {formatValue ? formatValue(val) : val}
              </span>
              <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{
                  width: '100%', height: `${Math.max(p * 100, 2)}%`, minHeight: '4px',
                  background: isCurrent ? 'var(--accent)' : barColor,
                  borderRadius: 'var(--radius) var(--radius) 0 0', transition: 'height 0.5s ease'
                }} />
              </div>
              <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', fontWeight: isCurrent ? 700 : 400, textAlign: 'center' }}>
                {formatLabel ? formatLabel(key) : key}{isCurrent ? ' *' : ''}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GroupedBarChart({ data, labelKey, series, formatLabel, currentKey, formatValue }) {
  const maxVal = Math.max(...data.flatMap(item => series.map(s => item[s.key] || 0)), 1)
  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 'var(--spacing-md)',
        height: 'calc(var(--font-body) * 7 + 50px)', padding: 'var(--spacing-md)',
        minWidth: `${Math.max(data.length * 120, 300)}px`
      }}>
        {data.map((item) => {
          const key = item[labelKey]
          const isCurrent = currentKey === key
          return (
            <div key={key} style={{ flex: '0 0 100px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
              <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '3px' }}>
                {series.map(s => {
                  const val = item[s.key] || 0
                  const pct = val / maxVal * 100
                  return (
                    <div key={s.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, lineHeight: 1, marginBottom: '2px', whiteSpace: 'nowrap' }}>
                        {formatValue ? formatValue(val) : val}
                      </span>
                      <div style={{
                        width: '100%', height: `${Math.max(pct, 2)}%`, minHeight: '4px',
                        background: s.color, borderRadius: '3px 3px 0 0', transition: 'height 0.5s ease',
                        opacity: isCurrent ? 1 : 0.8
                      }} />
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-xs)' }}>
                {series.map(s => (
                  <span key={s.key} style={{ fontSize: '9px', color: s.color, fontWeight: 700 }}>{s.label[0]}</span>
                ))}
              </div>
              <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', fontWeight: isCurrent ? 700 : 400, textAlign: 'center', marginTop: '2px' }}>
                {formatLabel ? formatLabel(key) : key}{isCurrent ? ' *' : ''}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
