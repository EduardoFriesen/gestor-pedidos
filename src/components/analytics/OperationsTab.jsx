import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import InsightCard from './InsightCard'
import useInsight from './useInsight'
import ScrollArea from '../ui/ScrollArea'
import { ChartFrame, ChartLegend, axisProps, gridProps, tooltipProps, COLORS } from '../charts/rc'
import { formatDate } from '../../utils/format'
import { shortDate } from './periods'

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const num = (n, decimals = 0) => n.toLocaleString('es-AR', { maximumFractionDigits: decimals })
const pct = (n) => n === null || n === undefined ? '—' : `${num(n)}%`
const hourLabel = (h) => `${String(h).padStart(2, '0')} h`
const count = (v) => num(v)

const SERIES = [
  { key: 'onTime', label: 'A tiempo', color: COLORS.success },
  { key: 'late', label: 'Tarde', color: COLORS.warning },
  { key: 'open', label: 'Sin entregar', color: COLORS.danger },
  { key: 'inProgress', label: 'En curso', color: 'var(--border-strong)' }
]

function WeekFulfillment({ insight }) {
  return (
    <InsightCard
      wide
      title="Cumplimiento semanal"
      description="De los pedidos de cada semana, cuántos se entregaron a tiempo (hasta el sábado), cuántos tarde y cuántos quedaron sin entregar al cerrar la semana."
      insight={insight}
      isEmpty={d => d.totals.orders === 0}
      emptyText="No hay pedidos en este período."
    >
      {d => {
        const data = d.weeks.map(w => ({ ...w, inProgress: Math.max(0, w.orders - w.delivered - w.open) }))
        return (
          <>
            <div className="insight-figures">
              <p className="insight-figure">
                <strong className="text-success">{pct(d.totals.onTimePct)}</strong>
                <span>entregados a tiempo ({num(d.totals.onTime)} de {num(d.totals.orders)})</span>
              </p>
              <p className="insight-figure">
                <strong className={d.totals.late > 0 ? 'text-danger' : ''}>{num(d.totals.late)}</strong>
                <span>{d.totals.late === 1 ? 'entregado tarde' : 'entregados tarde'}</span>
              </p>
              <p className="insight-figure">
                <strong className={d.totals.open > 0 ? 'text-danger' : ''}>{num(d.totals.open)}</strong>
                <span>sin entregar en semanas cerradas</span>
              </p>
            </div>
            <ChartLegend items={SERIES.map(s => ({ label: s.label, color: s.color }))} />
            <ChartFrame height={240} label={`Cumplimiento por semana: ${pct(d.totals.onTimePct)} a tiempo en el período`}>
              <BarChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="week_start" tickFormatter={shortDate} {...axisProps} minTickGap={12} />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip {...tooltipProps({ formatValue: count, formatLabel: (l) => `Semana del ${formatDate(l)}` })} />
                {SERIES.map((s, i) => (
                  <Bar key={s.key} dataKey={s.key} name={s.label} stackId="w" fill={s.color} maxBarSize={44} radius={i === SERIES.length - 1 ? [8, 8, 0, 0] : 0} />
                ))}
              </BarChart>
            </ChartFrame>
            <ScrollArea label="Cumplimiento por semana">
              <table className="insight-table">
                <caption className="sr-only">Cumplimiento por semana</caption>
                <thead>
                  <tr>
                    <th scope="col">Semana</th>
                    <th scope="col" className="num">Pedidos</th>
                    <th scope="col" className="num">Armados</th>
                    <th scope="col" className="num">A tiempo</th>
                    <th scope="col" className="num">Tarde</th>
                    <th scope="col" className="num">Sin entregar</th>
                  </tr>
                </thead>
                <tbody>
                  {[...d.weeks].reverse().map(w => (
                    <tr key={w.week_start}>
                      <th scope="row">{formatDate(w.week_start)}{!w.closed && <small className="cell-sub">en curso</small>}</th>
                      <td className="num">{w.orders}</td>
                      <td className="num">{pct(w.assembledPct)}</td>
                      <td className="num">{pct(w.onTimePct)}</td>
                      <td className={`num ${w.late > 0 ? 'text-danger' : ''}`}>{w.late}</td>
                      <td className={`num ${w.open > 0 ? 'text-danger' : ''}`}>{w.open}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </>
        )
      }}
    </InsightCard>
  )
}

function OrderHeatmap({ insight }) {
  return (
    <InsightCard
      wide
      title="Cuándo se cargan los pedidos"
      description="Pedidos cargados según día y hora. Más oscuro = más pedidos. Sirve para saber cuándo conviene estar atento al teléfono."
      insight={insight}
      isEmpty={d => d.total === 0}
      emptyText="No hay pedidos con hora de carga en este período."
    >
      {d => {
        const max = d.peak?.count || 1
        const busiestDay = d.byDay.indexOf(Math.max(...d.byDay))
        return (
          <>
            <div className="insight-figures">
              {d.peak && (
                <p className="insight-figure">
                  <strong>{DAYS[d.peak.day]} {hourLabel(d.peak.hour)}</strong>
                  <span>hora pico ({d.peak.count} {d.peak.count === 1 ? 'pedido' : 'pedidos'})</span>
                </p>
              )}
              <p className="insight-figure">
                <strong>{DAYS[busiestDay]}</strong>
                <span>el día con más pedidos</span>
              </p>
              <p className="insight-figure">
                <strong>{pct(d.lateShare)}</strong>
                <span>se cargan viernes o sábado</span>
              </p>
            </div>
            <div className="heatmap-wrap" role="region" aria-label="Mapa de calor de pedidos por día y hora" tabIndex={0}>
              <table className="heatmap">
                <caption className="sr-only">Pedidos por día de la semana y hora de carga</caption>
                <thead>
                  <tr>
                    <td />
                    {Array.from({ length: 24 }, (_, h) => (
                      <th key={h} scope="col"><span className={h % 3 === 0 ? '' : 'sr-only'}>{String(h).padStart(2, '0')}</span></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.grid.map((row, day) => (
                    <tr key={day}>
                      <th scope="row">{DAYS[day].slice(0, 3)}</th>
                      {row.map((v, h) => {
                        const isPeak = d.peak && d.peak.day === day && d.peak.hour === h
                        return (
                          <td
                            key={h}
                            className={`heat-cell${v > 0 ? ' has-value' : ''}${isPeak ? ' is-peak' : ''}`}
                            style={{ '--v': v / max }}
                            title={`${DAYS[day]} ${hourLabel(h)}: ${v} ${v === 1 ? 'pedido' : 'pedidos'}`}
                          >
                            <span className="sr-only">{v}</span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="heat-scale" aria-hidden="true">
              <span>0</span><span className="heat-scale-bar" /><span>{max}</span>
            </div>
          </>
        )
      }}
    </InsightCard>
  )
}

export default function OperationsTab({ range }) {
  const { startDate, endDate } = range
  const fulfillment = useInsight(() => window.piu.getWeekFulfillment(startDate, endDate), [startDate, endDate])
  const heatmap = useInsight(() => window.piu.getOrderTimeHeatmap(startDate, endDate), [startDate, endDate])

  return (
    <div className="insight-grid">
      <WeekFulfillment insight={fulfillment} />
      <OrderHeatmap insight={heatmap} />
    </div>
  )
}
