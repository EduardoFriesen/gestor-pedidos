import React from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import InsightCard from './InsightCard'
import useInsight from './useInsight'
import ScrollArea from '../ui/ScrollArea'
import { ChartFrame, ChartLegend, axisProps, gridProps, tooltipProps, fmtCompact, COLORS } from '../charts/rc'
import { fmtMoney, formatDate, formatQty } from '../../utils/format'
import { whatsappUrl } from '../../utils/contact'

const pct = (n, decimals = 0) => n === null || n === undefined ? '—' : `${n.toLocaleString('es-AR', { maximumFractionDigits: decimals })}%`
const days = (n) => n === 1 ? '1 día' : `${n.toLocaleString('es-AR', { maximumFractionDigits: 1 })} días`

function debtTone(daysOwed) {
  if (daysOwed > 14) return 'badge-danger'
  if (daysOwed > 7) return 'badge-warning'
  return 'badge-info'
}

function PendingCollections({ insight }) {
  return (
    <InsightCard
      wide
      title="Cobranza pendiente"
      description="Pedidos entregados que todavía no se cobraron. Es la deuda de hoy: no depende del período elegido."
      insight={insight}
      isEmpty={d => d.byClient.length === 0}
      emptyText="No hay pedidos entregados sin cobrar."
    >
      {d => (
        <>
          <div className="insight-figures">
            <p className="insight-figure">
              <strong>{fmtMoney(d.total)}</strong>
              <span>sin cobrar de {d.byClient.length} {d.byClient.length === 1 ? 'cliente' : 'clientes'}</span>
            </p>
            {d.avgDaysToPay !== null && (
              <p className="insight-figure">
                <strong>{days(d.avgDaysToPay)}</strong>
                <span>tardan en promedio en pagar desde la entrega</span>
              </p>
            )}
          </div>
          {d.deliveryFees > 0 && (
            <p className="insight-note">Además hay {fmtMoney(d.deliveryFees)} de envíos para cobrar, que son del repartidor.</p>
          )}
          <ScrollArea label="Deuda por cliente">
            <table className="insight-table">
              <caption className="sr-only">Deuda por cliente</caption>
              <thead>
                <tr>
                  <th scope="col">Cliente</th>
                  <th scope="col" className="num">Debe</th>
                  <th scope="col" className="num">Pedidos</th>
                  <th scope="col">Desde</th>
                  <th scope="col"><span className="sr-only">Contacto</span></th>
                </tr>
              </thead>
              <tbody>
                {d.byClient.map(c => {
                  const wa = whatsappUrl(c.phone, `Hola ${c.name.split(' ')[0]}, te escribo por el pago pendiente de ${fmtMoney(c.amount + c.deliveryFees)}.`)
                  return (
                    <tr key={c.clientId}>
                      <th scope="row">{c.name}</th>
                      <td className="num">{fmtMoney(c.amount)}</td>
                      <td className="num">{c.orders}</td>
                      <td className="nowrap">
                        {c.oldestSince ? (
                          <>
                            {formatDate(c.oldestSince)}{' '}
                            <span className={`badge ${debtTone(c.daysOwed)}`}>hace {days(c.daysOwed)}</span>
                          </>
                        ) : '—'}
                      </td>
                      <td className="actions">
                        {wa && (
                          <a className="btn btn-outline btn-sm" href={wa} target="_blank" rel="noreferrer" aria-label={`Escribir a ${c.name} por WhatsApp`}>
                            WhatsApp
                          </a>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </ScrollArea>
          {d.payTimes.some(p => p.avgDays > 0) && (
            <details className="insight-details">
              <summary>Quiénes tardan más en pagar</summary>
              <ScrollArea label="Días promedio de pago por cliente" variant="list">
                <ul className="insight-list">
                  {d.payTimes.filter(p => p.avgDays > 0).map(p => (
                    <li key={p.clientId}>
                      <span>{p.name}</span>
                      <span className="num">{days(p.avgDays)} <small>({p.samples} {p.samples === 1 ? 'pago' : 'pagos'})</small></span>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </details>
          )}
        </>
      )}
    </InsightCard>
  )
}

function IngredientDrivers({ insight }) {
  return (
    <InsightCard
      wide
      title="Ingredientes que más pesan en el costo"
      description="Suma lo que se usó de cada ingrediente en los platos vendidos, con la receta y el costo actuales."
      insight={insight}
      isEmpty={d => d.items.length === 0}
      emptyText="No hay ventas cobradas de platos con receta en este período."
    >
      {d => {
        const top80 = d.items.findIndex(i => i.cumulativeShare >= 80) + 1
        const chart = d.items.map((i, idx) => ({ ...i, key: idx < top80 }))
        return (
          <>
            <p className="insight-note">
              Total en ingredientes: <strong>{fmtMoney(d.totalCost)}</strong>.
              {top80 > 0 && ` Los primeros ${top80} explican el 80% del gasto: ahí conviene negociar o buscar reemplazos.`}
            </p>
            <ChartLegend items={[
              { label: 'Costo (los que explican el 80%)', color: COLORS.accent },
              { label: '% acumulado', color: COLORS.primary }
            ]} />
            <ChartFrame height={280} label={`Pareto de ingredientes: ${d.items.slice(0, 5).map(i => `${i.name} ${pct(i.share, 1)}`).join(', ')}`}>
              <ComposedChart data={chart} margin={{ top: 10, right: 8, left: 4, bottom: 36 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="name" {...axisProps} interval={0} angle={-30} textAnchor="end" height={56} />
                <YAxis yAxisId="cost" tickFormatter={fmtCompact} {...axisProps} width={64} />
                <YAxis yAxisId="cum" orientation="right" domain={[0, 100]} tickFormatter={v => `${v}%`} {...axisProps} width={44} />
                <Tooltip {...tooltipProps({ formatValue: (v, p) => p.dataKey === 'cumulativeShare' ? pct(v, 1) : fmtMoney(v) })} />
                <Bar yAxisId="cost" dataKey="cost" name="Costo" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {chart.map(i => <Cell key={i.ingredientId} fill={i.key ? COLORS.accent : 'var(--border-strong)'} />)}
                </Bar>
                <Line yAxisId="cum" type="monotone" dataKey="cumulativeShare" name="% acumulado" stroke={COLORS.primary} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.primary, strokeWidth: 0 }} />
              </ComposedChart>
            </ChartFrame>
            <ScrollArea label="Ingredientes por costo">
              <table className="insight-table">
                <caption className="sr-only">Ingredientes por costo</caption>
                <thead>
                  <tr>
                    <th scope="col">Ingrediente</th>
                    <th scope="col" className="num">Usado</th>
                    <th scope="col" className="num">Costo</th>
                    <th scope="col" className="num">% del total</th>
                    <th scope="col" className="num">Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {d.items.map((i, idx) => (
                    <tr key={i.ingredientId}>
                      <th scope="row">{idx < top80 ? <strong>{i.name}</strong> : i.name}</th>
                      <td className="num">{formatQty(i.quantity, i.unit)}</td>
                      <td className="num">{fmtMoney(i.cost)}</td>
                      <td className="num">{pct(i.share, 1)}</td>
                      <td className="num">{pct(i.cumulativeShare, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
            {d.missingRecipe.length > 0 && (
              <p className="insight-note">Sin receta cargada (no suman): {d.missingRecipe.join(', ')}.</p>
            )}
          </>
        )
      }}
    </InsightCard>
  )
}

export default function FinanceTab({ range }) {
  const { startDate, endDate } = range
  const collections = useInsight(() => window.piu.getPendingCollections(), [])
  const drivers = useInsight(() => window.piu.getIngredientCostDrivers(startDate, endDate, 15), [startDate, endDate])

  return (
    <div className="insight-grid">
      <PendingCollections insight={collections} />
      <IngredientDrivers insight={drivers} />
    </div>
  )
}
