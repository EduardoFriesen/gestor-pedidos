import React from 'react'
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, LabelList } from 'recharts'
import InsightCard from './InsightCard'
import useInsight from './useInsight'
import ClientRanking from './ClientRanking'
import ScrollArea from '../ui/ScrollArea'
import { ChartFrame, axisProps, tooltipProps, fmtCompact, COLORS } from '../charts/rc'
import { fmtMoney, formatDate } from '../../utils/format'
import { whatsappUrl } from '../../utils/contact'

const num = (n, decimals = 0) => n.toLocaleString('es-AR', { maximumFractionDigits: decimals })
const pct = (n) => n === null || n === undefined ? '—' : `${num(n)}%`
const days = (n) => n === 1 ? '1 día' : `${num(n, 1)} días`
const plural = (n, one, many) => `${num(n)} ${n === 1 ? one : many}`

function LapsedClients({ insight }) {
  return (
    <InsightCard
      wide
      title="Clientes que dejaron de pedir"
      description="Clientes con 3 o más pedidos que llevan más del doble de su ritmo habitual sin pedir (mínimo 21 días). No depende del período elegido."
      insight={insight}
      isEmpty={d => d.length === 0}
      emptyText="Ningún cliente habitual dejó de pedir."
    >
      {d => (
        <>
          <div className="insight-figures">
            <p className="insight-figure">
              <strong>{num(d.length)}</strong>
              <span>{d.length === 1 ? 'cliente para recuperar' : 'clientes para recuperar'}</span>
            </p>
          </div>
          <ScrollArea label="Clientes inactivos">
            <table className="insight-table">
              <caption className="sr-only">Clientes inactivos</caption>
              <thead>
                <tr>
                  <th scope="col">Cliente</th>
                  <th scope="col">Último pedido</th>
                  <th scope="col">Ritmo habitual</th>
                  <th scope="col" className="num">Pedidos</th>
                  <th scope="col"><span className="sr-only">Contacto</span></th>
                </tr>
              </thead>
              <tbody>
                {d.map(c => {
                  const wa = whatsappUrl(c.phone, `Hola ${c.name.split(' ')[0]}, ¿cómo estás? Hace un tiempo que no pedís. ¿Te paso el menú de esta semana?`)
                  return (
                    <tr key={c.clientId}>
                      <th scope="row">{c.name}</th>
                      <td className="nowrap">
                        {formatDate(c.lastOrderAt)}{' '}
                        <span className={`badge ${c.daysSince > 2 * c.thresholdDays ? 'badge-danger' : 'badge-warning'}`}>hace {days(c.daysSince)}</span>
                      </td>
                      <td>{c.medianIntervalDays ? `cada ${days(c.medianIntervalDays)}` : '—'}</td>
                      <td className="num">{c.orders}</td>
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
        </>
      )}
    </InsightCard>
  )
}

function ClientValue({ insight }) {
  return (
    <InsightCard
      wide
      title="Valor de cada cliente"
      description="Gasto en platos (sin envío), ticket promedio y constancia. Es fiel quien pidió en la mitad o más de las semanas desde su primer pedido."
      insight={insight}
      isEmpty={d => d.length === 0}
      emptyText="No hay ventas cobradas en este período."
    >
      {d => {
        const loyal = d.filter(c => c.segment === 'fiel')
        const total = d.reduce((s, c) => s + c.total, 0)
        const loyalTotal = loyal.reduce((s, c) => s + c.total, 0)
        const pie = [
          { name: 'Fieles', value: loyalTotal, color: COLORS.success },
          { name: 'Ocasionales', value: total - loyalTotal, color: COLORS.info }
        ]
        return (
          <div className="value-layout">
            <figure className="rank-donut is-small">
              <ChartFrame height={200} label={`Ventas de clientes fieles: ${fmtMoney(loyalTotal)} de ${fmtMoney(total)}`}>
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="94%" paddingAngle={2} cornerRadius={4} stroke="none" startAngle={90} endAngle={-270} isAnimationActive={false}>
                    {pie.map(p => <Cell key={p.name} fill={p.color} />)}
                  </Pie>
                  <Tooltip {...tooltipProps({ cursor: false })} />
                </PieChart>
              </ChartFrame>
              <figcaption>
                <strong>{total > 0 ? pct(loyalTotal / total * 100) : '—'}</strong>
                <span>en fieles</span>
              </figcaption>
              <p className="insight-note">{num(loyal.length)} de {num(d.length)} clientes son fieles.</p>
            </figure>
            <ScrollArea label="Gasto y constancia por cliente">
              <table className="insight-table">
                <caption className="sr-only">Gasto y constancia por cliente</caption>
                <thead>
                  <tr>
                    <th scope="col">Cliente</th>
                    <th scope="col" className="num">Gastó</th>
                    <th scope="col" className="num">Pedidos</th>
                    <th scope="col" className="num">Ticket prom.</th>
                    <th scope="col">Constancia</th>
                    <th scope="col">Segmento</th>
                  </tr>
                </thead>
                <tbody>
                  {d.map(c => (
                    <tr key={c.clientId}>
                      <th scope="row">{c.name}<small className="cell-sub">cliente desde {formatDate(c.firstOrder)}</small></th>
                      <td className="num">{fmtMoney(c.total)}</td>
                      <td className="num">{c.orders}</td>
                      <td className="num">{fmtMoney(c.avgTicket)}</td>
                      <td className="nowrap">{num(c.activeWeeks)} de {plural(c.weeksSinceFirst, 'semana', 'semanas')}</td>
                      <td><span className={`badge ${c.segment === 'fiel' ? 'badge-success' : 'badge-info'}`}>{c.segment === 'fiel' ? 'Fiel' : 'Ocasional'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        )
      }}
    </InsightCard>
  )
}

function SalesByZone({ insight }) {
  return (
    <InsightCard
      wide
      title="Ventas por zona"
      description="Agrupa por la localidad del cliente. Las ventas no incluyen el envío, que es del repartidor; se muestra aparte lo que se cobra en promedio."
      insight={insight}
      isEmpty={d => d.length === 0}
      emptyText="No hay ventas cobradas en este período."
    >
      {d => {
        const total = d.reduce((s, z) => s + z.revenue, 0)
        const chart = d.slice(0, 8)
        return (
          <>
            {total > 0 && (
              <p className="insight-note"><strong>{d[0].zone}</strong> concentra el {pct(d[0].revenue / total * 100)} de las ventas.</p>
            )}
            <ChartFrame height={chart.length * 34 + 16} label={`Ventas por zona: ${chart.map(z => `${z.zone} ${fmtMoney(z.revenue)}`).join(', ')}`}>
              <BarChart data={chart} layout="vertical" margin={{ top: 0, right: 64, left: 8, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="zone" {...axisProps} width={130} />
                <Tooltip {...tooltipProps()} />
                <Bar dataKey="revenue" name="Ventas" radius={[0, 8, 8, 0]} barSize={18}>
                  {chart.map((z, i) => <Cell key={z.zone} fill={i === 0 ? COLORS.primary : 'var(--border-strong)'} />)}
                  <LabelList dataKey="revenue" position="right" formatter={fmtCompact} style={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                </Bar>
              </BarChart>
            </ChartFrame>
            <ScrollArea label="Ventas por localidad">
              <table className="insight-table">
                <caption className="sr-only">Ventas por localidad</caption>
                <thead>
                  <tr>
                    <th scope="col">Zona</th>
                    <th scope="col" className="num">Clientes</th>
                    <th scope="col" className="num">Pedidos</th>
                    <th scope="col" className="num">Ventas</th>
                    <th scope="col" className="num">Ticket prom.</th>
                    <th scope="col" className="num">Con envío</th>
                    <th scope="col" className="num">Envío prom.</th>
                  </tr>
                </thead>
                <tbody>
                  {d.map(z => (
                    <tr key={z.zone}>
                      <th scope="row">{z.zone}</th>
                      <td className="num">{z.clients}</td>
                      <td className="num">{z.orders}</td>
                      <td className="num">{fmtMoney(z.revenue)}</td>
                      <td className="num">{fmtMoney(z.avgTicket)}</td>
                      <td className="num">{pct(z.deliveryShare)}</td>
                      <td className="num">{z.avgDeliveryFee === null ? '—' : fmtMoney(z.avgDeliveryFee)}</td>
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

export default function ClientsTab({ analytics, preset, range, onError }) {
  const { startDate, endDate } = range
  const lapsed = useInsight(() => window.piu.getLapsedClients(), [])
  const value = useInsight(() => window.piu.getClientValue(startDate, endDate), [startDate, endDate])
  const zones = useInsight(() => window.piu.getSalesByZone(startDate, endDate), [startDate, endDate])

  return (
    <div className="insight-grid">
      <ClientRanking analytics={analytics} preset={preset} range={range} onError={onError} />
      <LapsedClients insight={lapsed} />
      <ClientValue insight={value} />
      <SalesByZone insight={zones} />
    </div>
  )
}
