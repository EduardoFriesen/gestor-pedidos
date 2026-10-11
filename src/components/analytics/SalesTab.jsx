import React, { useState, useEffect, useRef } from 'react'
import { ComposedChart, Area, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import Segmented from '../ui/Segmented'
import ScrollArea from '../ui/ScrollArea'
import { ChartFrame, Gradient, ChartLegend, axisProps, gridProps, tooltipProps, fmtCompact, COLORS } from '../charts/rc'
import { fmtMoney } from '../../utils/format'
import {
  TREND_PERIODS, defaultTrendPeriod, getPeriodOptions, isCustomLike, trendLabelFormatters,
  pct, pctChange, changeOf, rangeLabel
} from './periods'

const count = (v) => v.toLocaleString('es-AR')

function SectionHead({ id, title, description, children }) {
  return (
    <header className="insight-head">
      <div>
        <h3 id={id}>{title}</h3>
        {description && <p className="insight-desc">{description}</p>}
      </div>
      {children}
    </header>
  )
}

function Evolution({ trends, analytics, preset }) {
  const [period, setPeriod] = useState(defaultTrendPeriod(preset))
  useEffect(() => { setPeriod(defaultTrendPeriod(preset)) }, [preset])

  const def = TREND_PERIODS.find(p => p.id === period) || TREND_PERIODS[1]
  const data = trends[def.id] || []
  const { short, long } = trendLabelFormatters(def.id)
  const days = analytics.dayOfWeek || []
  const totalRevenue = data.reduce((s, r) => s + r.revenue, 0)

  return (
    <>
      <section className="insight card insight-wide" aria-labelledby="sales-evolution">
        <header className="insight-head">
          <div>
            <h3 id="sales-evolution">Evolución de ventas</h3>
            <p className="insight-desc">Ingresos, costos y ganancia de los pedidos entregados y cobrados.</p>
          </div>
          <Segmented label="Agrupar por" options={TREND_PERIODS.map(p => ({ value: p.id, label: p.label }))} value={period} onChange={setPeriod} />
        </header>
        {data.length === 0 ? (
          <p className="insight-empty">No hay ventas para este período. Probá con un rango de fechas más amplio.</p>
        ) : (
          <>
            <ChartLegend items={[
              { label: 'Ingresos', color: COLORS.success },
              { label: 'Costos', color: COLORS.danger },
              { label: 'Ganancia', color: COLORS.primary }
            ]} />
            <ChartFrame height={300} label={`Ingresos, costos y ganancia por ${def.unit}. Ingresos totales ${fmtMoney(totalRevenue)}.`}>
              <ComposedChart data={data} margin={{ top: 10, right: 12, left: 4, bottom: 0 }}>
                <defs>
                  <Gradient id="g-rev" color={COLORS.success} />
                  <Gradient id="g-cost" color={COLORS.danger} from={0.3} />
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey={def.key} tickFormatter={short} {...axisProps} minTickGap={16} />
                <YAxis tickFormatter={fmtCompact} {...axisProps} width={64} />
                <Tooltip {...tooltipProps({ formatLabel: long })} />
                {data.length >= 3 ? (
                  <>
                    <Area type="monotone" dataKey="revenue" name="Ingresos" stroke={COLORS.success} strokeWidth={2.5} fill="url(#g-rev)" />
                    <Area type="monotone" dataKey="cost" name="Costos" stroke={COLORS.danger} strokeWidth={2} fill="url(#g-cost)" />
                  </>
                ) : (
                  <>
                    <Bar dataKey="revenue" name="Ingresos" fill={COLORS.success} radius={[8, 8, 0, 0]} maxBarSize={56} />
                    <Bar dataKey="cost" name="Costos" fill={COLORS.danger} radius={[8, 8, 0, 0]} maxBarSize={56} />
                    <Bar dataKey="profit" name="Ganancia" fill={COLORS.primary} radius={[8, 8, 0, 0]} maxBarSize={56} />
                  </>
                )}
                {data.length >= 3 && <Line type="monotone" dataKey="profit" name="Ganancia" stroke={COLORS.primary} strokeWidth={3} dot={{ r: 3, strokeWidth: 0, fill: COLORS.primary }} activeDot={{ r: 6 }} />}
              </ComposedChart>
            </ChartFrame>
          </>
        )}
      </section>

      {data.length > 0 && (
        <section className="insight card" aria-labelledby="sales-orders">
          <SectionHead id="sales-orders" title={`Pedidos por ${def.unit}`} />
          <ChartFrame height={220} label={`Cantidad de pedidos por ${def.unit}`}>
            <BarChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
              <defs><Gradient id="g-orders" color={COLORS.accent} from={1} to={0.55} /></defs>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey={def.key} tickFormatter={short} {...axisProps} minTickGap={12} />
              <YAxis allowDecimals={false} {...axisProps} />
              <Tooltip {...tooltipProps({ formatValue: count, formatLabel: long })} />
              <Bar dataKey="order_count" name="Pedidos" fill="url(#g-orders)" radius={[8, 8, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ChartFrame>
        </section>
      )}

      {days.some(d => d.count > 0) && (
        <section className="insight card" aria-labelledby="sales-days">
          <SectionHead id="sales-days" title="Pedidos por día de la semana" />
          <ChartFrame height={220} label={`Pedidos por día: ${days.map(d => `${d.name} ${d.count}`).join(', ')}`}>
            <BarChart data={days} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" {...axisProps} width={78} />
              <Tooltip {...tooltipProps({ formatValue: count })} />
              <Bar dataKey="count" name="Pedidos" radius={[0, 8, 8, 0]} barSize={16}>
                {days.map(d => {
                  const max = Math.max(...days.map(x => x.count))
                  return <Cell key={d.name} fill={d.count === max ? COLORS.accent : 'var(--border-strong)'} />
                })}
              </Bar>
            </BarChart>
          </ChartFrame>
        </section>
      )}

      {data.length > 0 && (
        <section className="insight card insight-wide" aria-labelledby="sales-table">
          <SectionHead id="sales-table" title="Datos por período" />
          <ScrollArea label="Datos por período">
            <table className="insight-table">
              <thead>
                <tr>
                  <th scope="col">Período</th>
                  <th scope="col" className="num">Ingresos</th>
                  <th scope="col" className="num">Costos</th>
                  <th scope="col" className="num">Ganancia</th>
                  <th scope="col" className="num">Margen</th>
                  <th scope="col" className="num">Pedidos</th>
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map(row => {
                  const margin = row.revenue > 0 ? row.profit / row.revenue * 100 : null
                  return (
                    <tr key={row[def.key]}>
                      <th scope="row">{long(row[def.key])}</th>
                      <td className="num text-success">{fmtMoney(row.revenue)}</td>
                      <td className="num text-danger">{fmtMoney(row.cost)}</td>
                      <td className={`num ${row.profit >= 0 ? 'text-success' : 'text-danger'}`}><strong>{fmtMoney(row.profit)}</strong></td>
                      <td className="num">{pct(margin)}</td>
                      <td className="num">{row.order_count}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </ScrollArea>
        </section>
      )}
    </>
  )
}

function Comparison({ preset, fullTrends, onError }) {
  const custom = isCustomLike(preset)
  const opts = getPeriodOptions(preset, fullTrends)
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [dates, setDates] = useState({ p1Start: '', p1End: '', p2Start: '', p2End: '' })
  const [comparison, setComparison] = useState(null)
  const [loading, setLoading] = useState(false)
  const idRef = useRef(0)

  const fetchComparison = (a, b) => {
    const id = ++idRef.current
    setLoading(true)
    window.piu.getPeriodComparison(a.startDate, a.endDate, b.startDate, b.endDate)
      .then(r => { if (id === idRef.current) setComparison(r) })
      .catch(() => { if (id === idRef.current) onError('No se pudo generar la comparación.') })
      .finally(() => { if (id === idRef.current) setLoading(false) })
  }

  const runOptions = (v1, v2) => {
    const a = opts.find(o => o.value === v1)
    const b = opts.find(o => o.value === v2)
    if (a && b) fetchComparison(a, b)
  }

  const runCustom = () => {
    const { p1Start, p1End, p2Start, p2End } = dates
    if (!p1Start || !p2Start) { onError('Elegí al menos la fecha de inicio de cada período.'); return }
    if ((p1End && p1Start > p1End) || (p2End && p2Start > p2End)) { onError('En algún período la fecha de inicio es posterior a la de fin.'); return }
    fetchComparison({ startDate: p1Start, endDate: p1End || null }, { startDate: p2Start, endDate: p2End || null })
  }

  useEffect(() => {
    setComparison(null)
    if (custom || opts.length < 2) return
    const a = opts[opts.length - 2].value
    const b = opts[opts.length - 1].value
    setP1(a)
    setP2(b)
    runOptions(a, b)
  }, [preset, fullTrends])

  const p1Label = custom ? rangeLabel(dates.p1Start, dates.p1End) : (opts.find(o => o.value === p1)?.label || 'Período A')
  const p2Label = custom ? rangeLabel(dates.p2Start, dates.p2End) : (opts.find(o => o.value === p2)?.label || 'Período B')
  const setDate = (k) => (e) => setDates(d => ({ ...d, [k]: e.target.value }))

  return (
    <section className="insight card insight-wide" aria-labelledby="sales-comparison" aria-busy={loading}>
      <header className="insight-head">
        <div>
          <h3 id="sales-comparison">Comparar períodos</h3>
          <p className="insight-desc">Elegí dos períodos para ver cómo cambiaron pedidos, ingresos, costos y margen.</p>
        </div>
      </header>
      <div className="compare-pickers">
        {custom ? (
          <>
            <fieldset className="compare-picker">
              <legend>Período A</legend>
              <input type="date" aria-label="Período A desde" value={dates.p1Start} onChange={setDate('p1Start')} />
              <input type="date" aria-label="Período A hasta" value={dates.p1End} onChange={setDate('p1End')} />
            </fieldset>
            <fieldset className="compare-picker">
              <legend>Período B</legend>
              <input type="date" aria-label="Período B desde" value={dates.p2Start} onChange={setDate('p2Start')} />
              <input type="date" aria-label="Período B hasta" value={dates.p2End} onChange={setDate('p2End')} />
            </fieldset>
            <button className="btn btn-primary btn-sm" onClick={runCustom}>Comparar</button>
          </>
        ) : (
          <>
            <label className="compare-picker">
              <span>Período A</span>
              <select value={p1} onChange={e => { setP1(e.target.value); runOptions(e.target.value, p2) }}>
                <option value="">— Seleccionar —</option>
                {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label className="compare-picker">
              <span>Período B</span>
              <select value={p2} onChange={e => { setP2(e.target.value); runOptions(p1, e.target.value) }}>
                <option value="">— Seleccionar —</option>
                {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </>
        )}
      </div>

      {!comparison ? (
        <p className="insight-empty">{loading ? 'Comparando…' : custom ? 'Elegí las fechas de los dos períodos y tocá Comparar.' : 'Hace falta historial de al menos dos períodos para comparar.'}</p>
      ) : (() => {
        const { period1: a, period2: b, changes } = comparison
        const chartData = [
          { label: 'Ingresos', p1: a.revenue, p2: b.revenue },
          { label: 'Costos', p1: a.cost, p2: b.cost },
          { label: 'Ganancia', p1: a.profit, p2: b.profit }
        ]
        const avg = (p, key) => p.orders > 0 ? p[key] / p.orders : null
        const perOrder = [
          { label: 'Ticket promedio', hint: 'Ingresos por pedido', v1: avg(a, 'revenue'), v2: avg(b, 'revenue'), upIsGood: true },
          { label: 'Costo por pedido', hint: 'Sube si los pedidos traen más platos o si aumentaron los ingredientes', v1: avg(a, 'cost'), v2: avg(b, 'cost'), upIsGood: false }
        ]
        const rows = [
          { key: 'orders', label: 'Pedidos', fmt: (v) => v },
          { key: 'revenue', label: 'Ingresos', fmt: fmtMoney },
          { key: 'cost', label: 'Costos', fmt: fmtMoney },
          { key: 'profit', label: 'Ganancia', fmt: fmtMoney },
          { key: 'margin', label: 'Margen %', fmt: pct, unit: 'pp' }
        ]
        return (
          <div className="compare-body">
            <div className="compare-chart">
              <ChartLegend items={[{ label: p1Label, color: COLORS.muted }, { label: p2Label, color: COLORS.primary }]} />
              <ChartFrame height={240} label={`Comparación de ingresos, costos y ganancia entre ${p1Label} y ${p2Label}`}>
                <BarChart data={chartData} margin={{ top: 10, right: 8, left: 4, bottom: 0 }} barGap={4}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis tickFormatter={fmtCompact} {...axisProps} width={64} />
                  <Tooltip {...tooltipProps()} />
                  <Bar dataKey="p1" name={p1Label} fill="var(--border-strong)" radius={[8, 8, 0, 0]} maxBarSize={48} />
                  <Bar dataKey="p2" name={p2Label} fill={COLORS.primary} radius={[8, 8, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ChartFrame>
            </div>
            <div className="compare-side">
              {perOrder.map(m => {
                const ch = m.v1 !== null && m.v2 !== null ? changeOf(m.v1, m.v2) : null
                const tone = ch === null || ch === 0 ? '' : (ch > 0) === m.upIsGood ? 'text-success' : 'text-danger'
                return (
                  <p key={m.label} className="insight-figure" title={m.hint}>
                    <strong className={tone}>{pctChange(ch)}</strong>
                    <span>{m.label}: {fmtMoney(m.v1)} → {fmtMoney(m.v2)}</span>
                  </p>
                )
              })}
            </div>
            <div className="insight-table-wrap compare-table">
              <table className="insight-table">
                <caption className="sr-only">Comparación entre {p1Label} y {p2Label}</caption>
                <thead>
                  <tr>
                    <th scope="col">Métrica</th>
                    <th scope="col" className="num">{p1Label}</th>
                    <th scope="col" className="num">{p2Label}</th>
                    <th scope="col" className="num">Cambio</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const v1 = a?.[row.key]
                    const v2 = b?.[row.key]
                    const change = changes?.[row.key]
                    const good = row.key === 'cost' ? change < 0 : change > 0
                    const isNew = (change === null || change === undefined) && !v1 && v2 > 0
                    const tone = change === null || change === undefined || change === 0 ? '' : good ? 'text-success' : 'text-danger'
                    return (
                      <tr key={row.key}>
                        <th scope="row">{row.label}</th>
                        <td className="num">{row.fmt(v1)}</td>
                        <td className="num"><strong>{row.fmt(v2)}</strong></td>
                        <td className={`num ${tone}`}>
                          {isNew ? 'nuevo' : change !== undefined && change !== null ? `${change > 0 ? '↑ ' : change < 0 ? '↓ ' : ''}${pctChange(change, row.unit)}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}
    </section>
  )
}

export default function SalesTab({ analytics, trends, fullTrends, preset, onError }) {
  return (
    <div className="insight-grid">
      <Evolution trends={trends} analytics={analytics} preset={preset} />
      <Comparison key={preset} preset={preset} fullTrends={fullTrends} onError={onError} />
    </div>
  )
}
