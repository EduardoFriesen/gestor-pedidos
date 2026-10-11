import React, { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts'
import Segmented from '../ui/Segmented'
import ScrollArea from '../ui/ScrollArea'
import { ChartFrame, Gradient, ChartLegend, axisProps, gridProps, tooltipProps, COLORS, PALETTE } from '../charts/rc'
import { fmtMoney } from '../../utils/format'
import { formatDate, shortDate, pct } from './periods'

const CLIENT_SORTS = [
  { value: 'orders', label: 'Pedidos' },
  { value: 'dishes', label: 'Platos' },
  { value: 'revenue', label: 'Gastado' }
]

const count = (v) => v.toLocaleString('es-AR')
const fullName = (c) => `${c.name} ${c.last_name || ''}`.trim()

function sortValue(c, sort) {
  if (sort === 'orders') return c.order_count
  if (sort === 'dishes') return c.total_dishes
  return c.totalRevenue || 0
}

function ClientDetail({ client, preset, range, onError }) {
  const [series, setSeries] = useState(null)

  useEffect(() => {
    window.piu.getClientTimeSeries(client.clientId, range.startDate, range.endDate)
      .then(d => setSeries(d || []))
      .catch(() => { setSeries([]); onError('No se pudieron cargar los datos del cliente.') })
  }, [client.clientId, range.startDate, range.endDate])

  if (series === null) return <div className="rank-detail"><p className="insight-empty">Cargando…</p></div>
  if (series.length === 0) return <div className="rank-detail"><p className="insight-empty">Sin pedidos en el período.</p></div>
  if (preset === 'week') {
    return (
      <div className="rank-detail">
        <p className="insight-figure"><strong>{series[0]?.orders || 0}</strong><span>pedidos esta semana</span></p>
      </div>
    )
  }
  return (
    <div className="rank-detail">
      <ChartFrame height={180} label={`Pedidos de ${fullName(client)} por semana`}>
        <AreaChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs><Gradient id={`g-c-${client.clientId}`} color={COLORS.accent} /></defs>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="period" tickFormatter={shortDate} {...axisProps} minTickGap={12} />
          <YAxis allowDecimals={false} {...axisProps} />
          <Tooltip {...tooltipProps({ formatValue: count, formatLabel: (l) => `Semana del ${formatDate(l)}` })} />
          <Area type="monotone" dataKey="orders" name="Pedidos" stroke={COLORS.accent} strokeWidth={2.5} fill={`url(#g-c-${client.clientId})`} dot={{ r: 3, strokeWidth: 0, fill: COLORS.accent }} />
        </AreaChart>
      </ChartFrame>
    </div>
  )
}

export default function ClientRanking({ analytics, preset, range, onError }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('orders')
  const [dir, setDir] = useState('desc')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => { setExpanded(null) }, [preset, range.startDate, range.endDate])

  const clients = analytics.topClients
    .filter(c => !search || fullName(c).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (sortValue(b, sort) - sortValue(a, sort)) * (dir === 'desc' ? 1 : -1))
  const max = Math.max(...clients.map(c => sortValue(c, sort)), 0)

  const byOrders = [...analytics.topClients].sort((a, b) => b.order_count - a.order_count)
  const pie = byOrders.slice(0, 7).map((c, i) => ({ name: fullName(c), value: c.order_count, color: PALETTE[i] }))
  const rest = byOrders.slice(7).reduce((s, c) => s + c.order_count, 0)
  if (rest > 0) pie.push({ name: 'Otros', value: rest, color: 'var(--border-strong)' })
  const totalOrders = byOrders.reduce((s, c) => s + c.order_count, 0)

  return (
    <section className="insight card insight-wide" aria-labelledby="client-ranking">
      <header className="insight-head">
        <div>
          <h3 id="client-ranking">Ranking de clientes</h3>
          <p className="insight-desc">Tocá un cliente para ver cómo vino pidiendo en el período.</p>
        </div>
        <div className="toolbar" style={{ margin: 0 }}>
          <input type="text" placeholder="Buscar cliente..." aria-label="Buscar cliente" value={search} onChange={e => setSearch(e.target.value)} />
          <Segmented label="Ordenar clientes" options={CLIENT_SORTS} value={sort} onChange={setSort} />
          <button className="btn btn-outline btn-sm" onClick={() => setDir(d => d === 'asc' ? 'desc' : 'asc')} aria-label="Cambiar dirección de orden">
            {dir === 'desc' ? '↓ Mayor primero' : '↑ Menor primero'}
          </button>
        </div>
      </header>

      {analytics.topClients.length === 0 ? (
        <p className="insight-empty">No hay clientes con pedidos en este período. Probá cambiando el filtro de fecha.</p>
      ) : (
        <div className="rank-layout">
          <ScrollArea label="Ranking de clientes" variant="cards">
            {clients.length === 0 && <p className="insight-empty">Ningún cliente coincide con la búsqueda.</p>}
            <ol className="rank-list">
              {clients.map((c, i) => {
                const key = `${c.clientId}`
                const isOpen = expanded === key
                return (
                  <li key={key} className={`rank-item${isOpen ? ' is-open' : ''}`}>
                    <div className="rank-row">
                      <span className="rank-pos">#{i + 1}</span>
                      <div className="rank-main">
                        <div className="rank-title">
                          <button type="button" className="rank-toggle" onClick={() => setExpanded(isOpen ? null : key)} aria-expanded={isOpen}>
                            <svg className={`chevron${isOpen ? ' is-open' : ''}`} viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            {fullName(c)}
                          </button>
                          <span className="rank-value">{sort === 'dishes' ? c.total_dishes : sort === 'revenue' ? fmtMoney(c.totalRevenue) : c.order_count}</span>
                        </div>
                        <div className="rank-bar is-accent" aria-hidden="true"><span style={{ width: `${max > 0 ? sortValue(c, sort) / max * 100 : 0}%` }} /></div>
                        <p className="rank-meta">
                          <span>{c.order_count} pedidos</span>
                          <span>{c.total_dishes} platos</span>
                          {c.totalRevenue > 0 && <span>Gastó: <strong>{fmtMoney(c.totalRevenue)}</strong></span>}
                          {c.favorite_dish && <span>Plato favorito: <strong>{c.favorite_dish}</strong></span>}
                        </p>
                      </div>
                    </div>
                    {isOpen && <ClientDetail client={c} preset={preset} range={range} onError={onError} />}
                  </li>
                )
              })}
            </ol>
          </ScrollArea>

          <figure className="rank-donut">
            <ChartFrame height={240} label={`Reparto de pedidos: ${pie.map(p => `${p.name} ${p.value}`).join(', ')}`}>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} cornerRadius={4} stroke="none" isAnimationActive={false}>
                  {pie.map(p => <Cell key={p.name} fill={p.color} />)}
                </Pie>
                <Tooltip {...tooltipProps({ formatValue: (v) => `${count(v)} pedidos (${pct(v / totalOrders * 100)})`, cursor: false })} />
              </PieChart>
            </ChartFrame>
            <figcaption>
              <strong>{count(totalOrders)}</strong>
              <span>pedidos</span>
            </figcaption>
            <ChartLegend items={pie.map(p => ({ label: p.name, color: p.color }))} />
          </figure>
        </div>
      )}
    </section>
  )
}
