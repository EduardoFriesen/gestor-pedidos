import React from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ReferenceLine, BarChart, Bar, Cell } from 'recharts'
import InsightCard from './InsightCard'
import useInsight from './useInsight'
import DishRanking from './DishRanking'
import ScrollArea from '../ui/ScrollArea'
import { ChartFrame, ChartLegend, axisProps, gridProps, tooltipProps, COLORS } from '../charts/rc'
import { fmtMoney, formatDate } from '../../utils/format'

const num = (n, decimals = 0) => n.toLocaleString('es-AR', { maximumFractionDigits: decimals })
const pct = (n, decimals = 0) => n === null || n === undefined ? '—' : `${num(n, decimals)}%`
const pp = (n) => n === null || n === undefined ? '—' : `${n > 0 ? '+' : ''}${num(n, 1)} pp`

const QUADRANTS = [
  { key: 'promote', title: 'Promocionar', hint: 'Se venden mucho y dejan buen margen.', tone: 'success', color: COLORS.success },
  { key: 'raisePrice', title: 'Subir precio', hint: 'Se venden mucho, pero dejan poco.', tone: 'warning', color: COLORS.warning },
  { key: 'review', title: 'Revisar', hint: 'Dejan buen margen, pero se venden poco.', tone: 'info', color: COLORS.info },
  { key: 'remove', title: 'Evaluar sacar', hint: 'Se venden poco y dejan poco.', tone: 'danger', color: COLORS.danger }
]

function MatrixTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{d.name}</p>
      <ul>
        <li><span>Unidades</span><strong>{num(d.units)}</strong></li>
        <li><span>Margen</span><strong>{pct(d.margin, 1)}</strong></li>
        <li><span>Ganancia</span><strong>{fmtMoney(d.profit)}</strong></li>
      </ul>
    </div>
  )
}

function DishMatrix({ insight }) {
  return (
    <InsightCard
      wide
      title="Qué hacer con cada plato"
      description="Cruza unidades vendidas con margen. Las líneas marcan la mediana del período; el tamaño del punto es la ganancia."
      insight={insight}
      isEmpty={d => d.medianUnits === null}
      emptyText="No hay ventas cobradas en este período."
    >
      {d => (
        <>
          <ChartLegend items={QUADRANTS.map(q => ({ label: q.title, color: q.color }))} />
          <ChartFrame height={300} label={`Matriz de platos. Corte en ${num(d.medianUnits)} unidades y ${pct(d.medianMargin, 1)} de margen.`}>
            <ScatterChart margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
              <CartesianGrid {...gridProps} vertical />
              <XAxis type="number" dataKey="units" name="Unidades" {...axisProps} allowDecimals={false} domain={[0, 'dataMax + 1']} label={{ value: 'Unidades vendidas', position: 'insideBottom', offset: -4, fill: 'var(--text-secondary)', fontSize: 12 }} height={40} />
              <YAxis type="number" dataKey="margin" name="Margen" unit="%" {...axisProps} width={52} domain={[dataMin => Math.min(0, Math.floor(dataMin / 10) * 10), dataMax => Math.min(100, Math.ceil((dataMax + 5) / 10) * 10)]} />
              <ZAxis type="number" dataKey="profit" range={[60, 520]} />
              <ReferenceLine x={d.medianUnits} stroke="var(--border-strong)" strokeDasharray="5 4" />
              <ReferenceLine y={d.medianMargin} stroke="var(--border-strong)" strokeDasharray="5 4" />
              <Tooltip content={<MatrixTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'var(--border-strong)' }} isAnimationActive={false} />
              {QUADRANTS.map(q => (
                <Scatter key={q.key} name={q.title} data={d.groups[q.key]} fill={q.color} fillOpacity={0.85} stroke="var(--bg-card)" strokeWidth={1.5} />
              ))}
            </ScatterChart>
          </ChartFrame>
          <div className="matrix">
            {QUADRANTS.map(q => (
              <section key={q.key} className={`matrix-cell tone-${q.tone}`} aria-label={`${q.title}: ${q.hint}`}>
                <h4>{q.title} <span className="matrix-count">{d.groups[q.key].length}</span></h4>
                <p className="matrix-hint">{q.hint}</p>
                {d.groups[q.key].length === 0 ? (
                  <p className="matrix-none">Ninguno</p>
                ) : (
                  <ScrollArea label={`Platos para ${q.title.toLowerCase()}`} variant="list">
                    <ul>
                      {d.groups[q.key].map(dish => (
                        <li key={dish.dishId}>
                          <span>{dish.name}</span>
                          <span className="num">{dish.units} u · {pct(dish.margin)}</span>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                )}
              </section>
            ))}
          </div>
          <p className="insight-note">Corte: {num(d.medianUnits)} unidades y {pct(d.medianMargin, 1)} de margen.</p>
        </>
      )}
    </InsightCard>
  )
}

function MarginErosion({ insight }) {
  return (
    <InsightCard
      wide
      title="Margen perdido por aumentos de costo"
      description="Compara el margen de la primera semana vendida en el período con el que dejaría hoy, con el precio y el costo actuales."
      insight={insight}
      isEmpty={d => d.length === 0}
      emptyText="No hay ventas cobradas en este período."
    >
      {d => {
        const losing = d.filter(x => x.deltaPp !== null && x.deltaPp < 0).length
        const chart = d.filter(x => x.deltaPp !== null).slice(0, 10)
        return (
          <>
            <p className="insight-note">
              {losing === 0 ? 'Ningún plato perdió margen.' : `${losing} ${losing === 1 ? 'plato perdió' : 'platos perdieron'} margen.`}
              {' '}El precio sugerido recupera el margen inicial con el costo de hoy.
            </p>
            {chart.length > 0 && (
              <ChartFrame height={Math.max(140, chart.length * 32 + 44)} label={`Cambio de margen por plato: ${chart.map(x => `${x.name} ${pp(x.deltaPp)}`).join(', ')}`}>
                <BarChart data={chart} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                  <XAxis type="number" {...axisProps} tickFormatter={v => `${v} pp`} domain={[dataMin => Math.min(0, Math.floor(dataMin)), dataMax => Math.max(0, Math.ceil(dataMax))]} />
                  <YAxis type="category" dataKey="name" {...axisProps} width={140} />
                  <ReferenceLine x={0} stroke="var(--border-strong)" />
                  <Tooltip {...tooltipProps({ formatValue: pp })} />
                  <Bar dataKey="deltaPp" name="Cambio de margen" radius={4} barSize={14}>
                    {chart.map(x => <Cell key={x.dishId} fill={x.deltaPp < 0 ? COLORS.danger : COLORS.success} />)}
                  </Bar>
                </BarChart>
              </ChartFrame>
            )}
            <ScrollArea label="Margen por plato">
              <table className="insight-table">
                <caption className="sr-only">Margen por plato: inicio contra hoy</caption>
                <thead>
                  <tr>
                    <th scope="col">Plato</th>
                    <th scope="col" className="num">Margen inicial</th>
                    <th scope="col" className="num">Margen hoy</th>
                    <th scope="col" className="num">Cambio</th>
                    <th scope="col" className="num">Suba de costo</th>
                    <th scope="col" className="num">Precio hoy</th>
                    <th scope="col" className="num">Sugerido</th>
                  </tr>
                </thead>
                <tbody>
                  {d.map(x => {
                    const showSuggested = x.suggestedPrice !== null && x.suggestedPrice > x.priceNow
                    return (
                      <tr key={x.dishId}>
                        <th scope="row">{x.name}<small className="cell-sub">desde {formatDate(x.firstWeek)}</small></th>
                        <td className="num">{pct(x.marginStart, 1)}</td>
                        <td className="num">{pct(x.marginNow, 1)}</td>
                        <td className={`num ${x.deltaPp < 0 ? 'text-danger' : x.deltaPp > 0 ? 'text-success' : ''}`}>{pp(x.deltaPp)}</td>
                        <td className="num">{x.costChangePct === null ? '—' : `${x.costChangePct > 0 ? '+' : ''}${pct(x.costChangePct)}`}</td>
                        <td className="num">{fmtMoney(x.priceNow)}</td>
                        <td className="num"><strong>{showSuggested ? fmtMoney(x.suggestedPrice) : '—'}</strong></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </ScrollArea>
          </>
        )
      }}
    </InsightCard>
  )
}

function DishPairs({ insight }) {
  return (
    <InsightCard
      wide
      title="Platos que se piden juntos"
      description="Pares de platos que aparecen en el mismo pedido al menos 2 veces. Sirve para armar combos o sugerir un acompañamiento."
      insight={insight}
      isEmpty={d => d.pairs.length === 0}
      emptyText="Todavía no hay platos que se repitan juntos en este período."
    >
      {d => (
        <>
          <p className="insight-note">
            Sobre {num(d.totalOrders)} {d.totalOrders === 1 ? 'pedido cobrado' : 'pedidos cobrados'}. La afinidad compara con lo esperable por azar: más de ×1 indica que se eligen juntos a propósito.
          </p>
          <ScrollArea label="Pares de platos" variant="list">
            <ol className="pareto">
              {d.pairs.map(p => (
                <li key={`${p.a.dishId}-${p.b.dishId}`} className={p.lift >= 1.2 ? 'is-key' : ''}>
                  <div className="pareto-row">
                    <span className="pareto-name">{p.a.name} + {p.b.name}</span>
                    <span className="num">{p.count} {p.count === 1 ? 'pedido' : 'pedidos'} · {pct(p.support)}</span>
                  </div>
                  <div className="pareto-bar" aria-hidden="true"><span style={{ width: `${Math.max(1, p.support)}%` }} /></div>
                  <small className="cell-sub">Afinidad ×{num(p.lift, 2)}</small>
                </li>
              ))}
            </ol>
          </ScrollArea>
        </>
      )}
    </InsightCard>
  )
}

export default function DishesTab({ analytics, preset, range, fullTrends, onError }) {
  const { startDate, endDate } = range
  const matrix = useInsight(() => window.piu.getDishMatrix(startDate, endDate), [startDate, endDate])
  const erosion = useInsight(() => window.piu.getMarginErosion(startDate, endDate), [startDate, endDate])
  const pairs = useInsight(() => window.piu.getDishPairs(startDate, endDate, 2), [startDate, endDate])

  return (
    <div className="insight-grid">
      <DishRanking analytics={analytics} preset={preset} range={range} fullTrends={fullTrends} onError={onError} />
      <DishMatrix insight={matrix} />
      <MarginErosion insight={erosion} />
      <DishPairs insight={pairs} />
    </div>
  )
}
