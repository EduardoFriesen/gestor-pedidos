import React, { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts'
import Segmented from '../ui/Segmented'
import ScrollArea from '../ui/ScrollArea'
import { ChartFrame, Gradient, ChartLegend, axisProps, gridProps, tooltipProps, COLORS, PALETTE } from '../charts/rc'
import { fmtMoney } from '../../utils/format'
import { getPeriodOptions, isCustomLike, formatDate, shortDate, pct, pctChange, changeOf } from './periods'

const DISH_SORTS = [
  { value: 'total', label: 'Vendidos' },
  { value: 'totalProfit', label: 'Ganancia' },
  { value: 'margin', label: 'Margen %' },
  { value: 'price', label: 'Precio' }
]

const count = (v) => v.toLocaleString('es-AR')

const sumSeries = (arr) => arr.reduce((a, i) => ({
  ordered: a.ordered + (i.ordered || 0),
  produced: a.produced + (i.produced || 0),
  overproduction: a.overproduction + (i.overproduction || 0)
}), { ordered: 0, produced: 0, overproduction: 0 })

function sortValue(d, sort) {
  if (sort === 'total') return d.total
  if (sort === 'totalProfit') return d.totalProfit
  if (sort === 'margin') return d.margin ?? 0
  return d.price
}

function PeriodSummary({ title, data }) {
  return (
    <div className="dish-period">
      <p className="dish-period-title">{title}</p>
      <p><strong>{data.ordered}</strong> veces pedido</p>
      <p><strong>{data.produced}</strong> producidos</p>
      {data.overproduction > 0 && <p className="text-danger"><strong>{data.overproduction}</strong> sobraron</p>}
    </div>
  )
}

function DishDetail({ dish, preset, range, fullTrends, onError }) {
  const custom = isCustomLike(preset)
  const opts = getPeriodOptions(preset, fullTrends)
  const [sel, setSel] = useState({ p1: '', p2: '', p1Start: '', p1End: '', p2Start: range.startDate || '', p2End: range.endDate || '' })
  const [summary, setSummary] = useState(null)
  const [series, setSeries] = useState([])
  const [loading, setLoading] = useState(false)

  const compare = async (p1s, p1e, p2s, p2e) => {
    setLoading(true)
    try {
      const [prev, curr] = await Promise.all([
        window.piu.getDishTimeSeries(dish.id, p1s || null, p1e || null),
        window.piu.getDishTimeSeries(dish.id, p2s || null, p2e || null)
      ])
      setSummary({ prev: sumSeries(prev || []), curr: sumSeries(curr || []) })
      const start = p1s && p2s ? (p1s < p2s ? p1s : p2s) : (p1s || p2s)
      const end = p1e && p2e ? (p1e > p2e ? p1e : p2e) : (p1e || p2e)
      if (start && end) setSeries(await window.piu.getDishTimeSeries(dish.id, start, end) || [])
    } catch {
      onError('No se pudieron cargar los datos del plato.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (custom) {
      setLoading(true)
      window.piu.getDishTimeSeries(dish.id, range.startDate, range.endDate)
        .then(d => setSeries(d || []))
        .catch(() => onError('No se pudieron cargar los datos del plato.'))
        .finally(() => setLoading(false))
      return
    }
    const cur = opts[opts.length - 1]
    const prev = opts.length >= 2 ? opts[opts.length - 2] : opts[0]
    setSel(s => ({ ...s, p1: prev?.value || '', p2: cur?.value || '' }))
    if (prev && cur) compare(prev.startDate, prev.endDate, cur.startDate, cur.endDate)
  }, [])

  const pick = (key) => (e) => {
    const next = { ...sel, [key]: e.target.value }
    setSel(next)
    const a = opts.find(o => o.value === next.p1)
    const b = opts.find(o => o.value === next.p2)
    if (a && b) compare(a.startDate, a.endDate, b.startDate, b.endDate)
  }
  const setDate = (key) => (e) => setSel(s => ({ ...s, [key]: e.target.value }))

  return (
    <div className="rank-detail" aria-busy={loading}>
      <div className="compare-pickers">
        {custom ? (
          <>
            <fieldset className="compare-picker">
              <legend>Período A</legend>
              <input type="date" aria-label="Período A desde" value={sel.p1Start} onChange={setDate('p1Start')} />
              <input type="date" aria-label="Período A hasta" value={sel.p1End} onChange={setDate('p1End')} />
            </fieldset>
            <fieldset className="compare-picker">
              <legend>Período B</legend>
              <input type="date" aria-label="Período B desde" value={sel.p2Start} onChange={setDate('p2Start')} />
              <input type="date" aria-label="Período B hasta" value={sel.p2End} onChange={setDate('p2End')} />
            </fieldset>
            <button className="btn btn-primary btn-sm" onClick={() => compare(sel.p1Start, sel.p1End, sel.p2Start, sel.p2End)}>Comparar</button>
          </>
        ) : (
          <>
            <label className="compare-picker">
              <span>Período A</span>
              <select value={sel.p1} onChange={pick('p1')}>
                <option value="">— Seleccionar —</option>
                {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label className="compare-picker">
              <span>Período B</span>
              <select value={sel.p2} onChange={pick('p2')}>
                <option value="">— Seleccionar —</option>
                {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </>
        )}
      </div>

      {loading && <p className="insight-empty">Cargando…</p>}

      {summary && (
        <div className="dish-periods">
          <PeriodSummary title="Período A" data={summary.prev} />
          <PeriodSummary title="Período B" data={summary.curr} />
          <div className="dish-period">
            <p className="dish-period-title">Cambio</p>
            {[
              { label: 'veces pedido', change: changeOf(summary.prev.ordered, summary.curr.ordered), upIsGood: true },
              { label: 'producción', change: changeOf(summary.prev.produced, summary.curr.produced), upIsGood: true },
              { label: 'sobrante', change: changeOf(summary.prev.overproduction, summary.curr.overproduction), upIsGood: false }
            ].map(r => (
              <p key={r.label} className={r.change === null || r.change === 0 ? '' : (r.change > 0) === r.upIsGood ? 'text-success' : 'text-danger'}>
                <strong>{pctChange(r.change)}</strong> {r.label}
              </p>
            ))}
          </div>
        </div>
      )}

      {preset !== 'week' && series.length > 0 && (
        <>
          <ChartLegend items={[
            { label: 'Pedidos', color: COLORS.primary },
            { label: 'Producido', color: COLORS.success },
            { label: 'Sobrante', color: COLORS.danger }
          ]} />
          <ChartFrame height={200} label={`Pedidos y producción de ${dish.name} por semana`}>
            <AreaChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <Gradient id={`g-do-${dish.id}`} color={COLORS.primary} />
                <Gradient id={`g-dp-${dish.id}`} color={COLORS.success} from={0.25} />
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="period" tickFormatter={shortDate} {...axisProps} minTickGap={12} />
              <YAxis allowDecimals={false} {...axisProps} />
              <Tooltip {...tooltipProps({ formatValue: count, formatLabel: (l) => `Semana del ${formatDate(l)}` })} />
              <Area type="monotone" dataKey="produced" name="Producido" stroke={COLORS.success} strokeWidth={2} fill={`url(#g-dp-${dish.id})`} />
              <Area type="monotone" dataKey="ordered" name="Pedidos" stroke={COLORS.primary} strokeWidth={2.5} fill={`url(#g-do-${dish.id})`} />
              <Area type="monotone" dataKey="overproduction" name="Sobrante" stroke={COLORS.danger} strokeWidth={2} strokeDasharray="4 3" fill="none" />
            </AreaChart>
          </ChartFrame>
        </>
      )}
    </div>
  )
}

export default function DishRanking({ analytics, preset, range, fullTrends, onError }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('total')
  const [dir, setDir] = useState('desc')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => { setExpanded(null) }, [preset, range.startDate, range.endDate])

  const dishes = analytics.topDishes
    .filter(d => !search || (d.name || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (sortValue(b, sort) - sortValue(a, sort)) * (dir === 'desc' ? 1 : -1))
  const max = Math.max(...dishes.map(d => sortValue(d, sort)), 0)

  const byUnits = [...analytics.topDishes].sort((a, b) => b.total - a.total)
  const pie = byUnits.slice(0, 7).map((d, i) => ({ name: d.name, value: d.total, color: PALETTE[i] }))
  const rest = byUnits.slice(7).reduce((s, d) => s + d.total, 0)
  if (rest > 0) pie.push({ name: 'Otros', value: rest, color: 'var(--border-strong)' })
  const totalUnits = byUnits.reduce((s, d) => s + d.total, 0)

  return (
    <section className="insight card insight-wide" aria-labelledby="dish-ranking">
      <header className="insight-head">
        <div>
          <h3 id="dish-ranking">Ranking de platos</h3>
          <p className="insight-desc">Tocá un plato para comparar dos períodos y ver su evolución.</p>
        </div>
        <div className="toolbar" style={{ margin: 0 }}>
          <input type="text" placeholder="Buscar plato..." aria-label="Buscar plato" value={search} onChange={e => setSearch(e.target.value)} />
          <Segmented label="Ordenar platos" options={DISH_SORTS} value={sort} onChange={setSort} />
          <button className="btn btn-outline btn-sm" onClick={() => setDir(d => d === 'asc' ? 'desc' : 'asc')} aria-label="Cambiar dirección de orden">
            {dir === 'desc' ? '↓ Mayor primero' : '↑ Menor primero'}
          </button>
        </div>
      </header>

      {analytics.topDishes.length === 0 ? (
        <p className="insight-empty">No hay platos con pedidos en este período. Probá cambiando el filtro de fecha.</p>
      ) : (
        <div className="rank-layout">
          <ScrollArea label="Ranking de platos" variant="cards">
            {dishes.length === 0 && <p className="insight-empty">Ningún plato coincide con la búsqueda.</p>}
            <ol className="rank-list">
              {dishes.map((d, i) => {
                const isOpen = expanded === d.id
                const value = sortValue(d, sort)
                return (
                  <li key={d.id} className={`rank-item${isOpen ? ' is-open' : ''}`}>
                    <div className="rank-row">
                      <span className="rank-pos">#{i + 1}</span>
                      <div className="rank-main">
                        <div className="rank-title">
                          <button type="button" className="rank-toggle" onClick={() => setExpanded(isOpen ? null : d.id)} aria-expanded={isOpen}>
                            <svg className={`chevron${isOpen ? ' is-open' : ''}`} viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            {d.name}
                          </button>
                          <span className="rank-value">{d.total} {d.total === 1 ? 'vendido' : 'vendidos'}</span>
                        </div>
                        <div className="rank-bar" aria-hidden="true"><span style={{ width: `${max > 0 ? Math.max(0, value / max * 100) : 0}%` }} /></div>
                        <p className="rank-meta">
                          <span title="Precio promedio cobrado en el período">Precio prom.: <strong>{fmtMoney(d.price, 2)}</strong></span>
                          {d.cost > 0 ? (
                            <>
                              <span>Costo prom.: <strong>{fmtMoney(d.cost, 2)}</strong></span>
                              <span>Margen: <strong className={(d.margin ?? 0) > 0 ? 'text-success' : 'text-danger'}>{pct(d.margin)}</strong></span>
                              <span>Ganancia total: <strong className={d.totalProfit > 0 ? 'text-success' : 'text-danger'}>{fmtMoney(d.totalProfit)}</strong></span>
                            </>
                          ) : (
                            <em>Sin ingredientes cargados</em>
                          )}
                        </p>
                      </div>
                    </div>
                    {isOpen && <DishDetail dish={d} preset={preset} range={range} fullTrends={fullTrends} onError={onError} />}
                  </li>
                )
              })}
            </ol>
          </ScrollArea>

          <figure className="rank-donut">
            <ChartFrame height={240} label={`Reparto de unidades vendidas: ${pie.map(p => `${p.name} ${p.value}`).join(', ')}`}>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} cornerRadius={4} stroke="none" isAnimationActive={false}>
                  {pie.map(p => <Cell key={p.name} fill={p.color} />)}
                </Pie>
                <Tooltip {...tooltipProps({ formatValue: (v) => `${count(v)} u (${pct(v / totalUnits * 100)})`, cursor: false })} />
              </PieChart>
            </ChartFrame>
            <figcaption>
              <strong>{count(totalUnits)}</strong>
              <span>unidades vendidas</span>
            </figcaption>
            <ChartLegend items={pie.map(p => ({ label: p.name, color: p.color }))} />
          </figure>
        </div>
      )}
    </section>
  )
}
