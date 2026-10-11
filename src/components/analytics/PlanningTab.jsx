import React, { useState } from 'react'
import InsightCard from './InsightCard'
import useInsight from './useInsight'
import Segmented from '../ui/Segmented'
import { AreaChart, Area, BarChart, Bar, ErrorBar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import ScrollArea from '../ui/ScrollArea'
import { ChartFrame, Gradient, ChartLegend, axisProps, gridProps, tooltipProps, fmtCompact, COLORS } from '../charts/rc'
import PdfViewer from '../PdfViewer'
import { fmtMoney, formatDate, formatQty } from '../../utils/format'
import { generarListaCompras } from '../../utils/pdf'

const num = (n, decimals = 0) => n.toLocaleString('es-AR', { maximumFractionDigits: decimals })
const shortDate = (key) => key ? `${key.slice(8, 10)}/${key.slice(5, 7)}` : ''

const TREND = {
  down: { label: 'Bajando', tone: 'badge-success' },
  up: { label: 'Subiendo', tone: 'badge-danger' },
  flat: { label: 'Estable', tone: 'badge-info' }
}

const BASIS_LABELS = {
  recent: 'últimas 8 semanas',
  lastYearWeek: 'misma semana del año pasado',
  lastYearMonth: 'mismo mes del año pasado'
}

function sundayOf(offsetWeeks) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay() + offsetWeeks * 7)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function weightsNote(weights) {
  const parts = Object.entries(weights)
    .filter(([, w]) => w !== null)
    .map(([k, w]) => `${num(w * 100)}% ${BASIS_LABELS[k]}`)
  return parts.length ? `Se calcula con ${parts.join(', ')}.` : ''
}

function OverproductionTrend({ insight }) {
  return (
    <InsightCard
      wide
      title="Plata perdida por producir de más"
      description="Lo que se produjo y no se pidió, semana a semana, valuado al costo actual de cada plato."
      insight={insight}
      isEmpty={d => d.weeks.length === 0 || d.totalUnits === 0}
      emptyText="No hubo sobreproducción en este período."
    >
      {d => {
        const trend = d.trend ? TREND[d.trend] : null
        return (
          <>
            <div className="insight-figures">
              <p className="insight-figure">
                <strong className="text-danger">{fmtMoney(d.totalCost)}</strong>
                <span>en {num(d.totalUnits)} {d.totalUnits === 1 ? 'unidad sobrante' : 'unidades sobrantes'}</span>
              </p>
              {trend && (
                <p className="insight-figure">
                  <strong><span className={`badge ${trend.tone}`}>{trend.label}</span></strong>
                  <span>{d.trend === 'flat' ? 'sin cambios claros' : `${fmtMoney(Math.abs(d.slope))} por semana`} en las últimas semanas</span>
                </p>
              )}
            </div>
            <ChartFrame height={220} label={`Costo de sobreproducción por semana, total ${fmtMoney(d.totalCost)}`}>
              <AreaChart data={d.weeks} margin={{ top: 10, right: 8, left: 4, bottom: 0 }}>
                <defs><Gradient id="g-waste" color={COLORS.danger} from={0.5} /></defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="week_start" tickFormatter={shortDate} {...axisProps} minTickGap={12} />
                <YAxis tickFormatter={fmtCompact} {...axisProps} width={60} />
                <Tooltip {...tooltipProps({ formatLabel: (l) => `Semana del ${formatDate(l)}` })} />
                <Area type="monotone" dataKey="cost" name="Costo sobrante" stroke={COLORS.danger} strokeWidth={2.5} fill="url(#g-waste)" dot={{ r: 3, strokeWidth: 0, fill: COLORS.danger }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ChartFrame>
            <table className="sr-only">
              <caption>Costo de sobreproducción por semana</caption>
              <thead><tr><th scope="col">Semana</th><th scope="col">Unidades</th><th scope="col">Costo</th></tr></thead>
              <tbody>
                {d.weeks.map(w => (
                  <tr key={w.week_start}><th scope="row">{formatDate(w.week_start)}</th><td>{w.units}</td><td>{fmtMoney(w.cost)}</td></tr>
                ))}
              </tbody>
            </table>
            {d.byDish.length > 0 && (
              <details className="insight-details">
                <summary>Platos que más sobran</summary>
                <ul className="insight-list">
                  {d.byDish.map(x => (
                    <li key={x.dishId}>
                      <span>{x.name}</span>
                      <span className="num">{num(x.units)} u · {fmtMoney(x.cost)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )
      }}
    </InsightCard>
  )
}

function WeekForecast({ insight }) {
  return (
    <InsightCard
      wide
      title="Pronóstico de la semana"
      description="Cuántas unidades se esperan de cada plato según el historial. El rango muestra cuánto suele variar."
      insight={insight}
      isEmpty={d => d.dishes.length === 0}
      emptyText="Todavía no hay historial suficiente para pronosticar esta semana."
    >
      {d => (
        <>
          <div className="insight-figures">
            <p className="insight-figure">
              <strong>{num(d.totalForecast)}</strong>
              <span>unidades esperadas para la semana del {formatDate(d.weekStart)}</span>
            </p>
          </div>
          <p className="insight-note">{weightsNote(d.weights)} Si falta alguna parte del historial, su peso se reparte entre las demás.</p>
          <ChartLegend items={[{ label: 'Pronóstico', color: COLORS.primary }, { label: 'Rango habitual', color: COLORS.muted }]} />
          <ChartFrame height={Math.min(12, d.dishes.length) * 30 + 24} label={`Pronóstico por plato: ${d.dishes.slice(0, 12).map(x => `${x.name} ${x.forecast}`).join(', ')}`}>
            <BarChart data={d.dishes.slice(0, 12).map(x => ({ ...x, range: [x.forecast - x.low, x.high - x.forecast] }))} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
              <CartesianGrid {...gridProps} vertical horizontal={false} />
              <XAxis type="number" allowDecimals={false} {...axisProps} />
              <YAxis type="category" dataKey="name" {...axisProps} width={150} />
              <Tooltip {...tooltipProps({ formatValue: (v, p) => { const x = p.payload; return `${x.forecast} u (${x.low} a ${x.high})` } })} />
              <Bar dataKey="forecast" name="Pronóstico" fill={COLORS.primary} radius={[0, 6, 6, 0]} barSize={14}>
                <ErrorBar dataKey="range" width={6} strokeWidth={1.5} stroke="var(--text-secondary)" direction="x" />
              </Bar>
            </BarChart>
          </ChartFrame>
          <ScrollArea label="Pronóstico por plato">
            <table className="insight-table">
              <caption className="sr-only">Pronóstico por plato</caption>
              <thead>
                <tr>
                  <th scope="col">Plato</th>
                  <th scope="col" className="num">Pronóstico</th>
                  <th scope="col" className="num">Rango</th>
                  <th scope="col" className="num">Últimas 8 sem.</th>
                  <th scope="col" className="num">Sem. año pasado</th>
                  <th scope="col" className="num">Mes año pasado</th>
                </tr>
              </thead>
              <tbody>
                {d.dishes.map(x => (
                  <tr key={x.dishId}>
                    <th scope="row">{x.name}</th>
                    <td className="num"><strong>{x.forecast}</strong></td>
                    <td className="num nowrap">{x.low === x.high ? x.low : `${x.low} a ${x.high}`}</td>
                    {['recent', 'lastYearWeek', 'lastYearMonth'].map(k => (
                      <td key={k} className="num">{x.basis[k] === null ? '—' : num(x.basis[k], 1)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </>
      )}
    </InsightCard>
  )
}

function ProjectedShopping({ insight, onPdf }) {
  return (
    <InsightCard
      wide
      title="Compra proyectada"
      description="Ingredientes que harían falta para producir el pronóstico, con la receta y el costo actuales."
      insight={insight}
      isEmpty={d => d.items.length === 0}
      emptyText="No hay pronóstico con recetas cargadas para esta semana."
      actions={insight.data?.items?.length > 0 && (
        <button type="button" className="btn btn-outline btn-sm" onClick={() => onPdf(insight.data)}>Lista de compras (PDF)</button>
      )}
    >
      {d => (
        <>
          <div className="insight-figures">
            <p className="insight-figure">
              <strong>{fmtMoney(d.totalCost)}</strong>
              <span>de costo estimado en {num(d.items.length)} {d.items.length === 1 ? 'ingrediente' : 'ingredientes'}</span>
            </p>
          </div>
          <ScrollArea label="Ingredientes a comprar">
            <table className="insight-table">
              <caption className="sr-only">Ingredientes a comprar</caption>
              <thead>
                <tr>
                  <th scope="col">Ingrediente</th>
                  <th scope="col" className="num">Cantidad</th>
                  <th scope="col" className="num">Costo</th>
                </tr>
              </thead>
              <tbody>
                {d.items.map(i => (
                  <tr key={i.ingredientId}>
                    <th scope="row">{i.name}</th>
                    <td className="num">{formatQty(i.total, i.unit)}</td>
                    <td className="num">{fmtMoney(i.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
          {d.missingRecipe.length > 0 && (
            <p className="insight-note">Sin receta cargada (no suman): {d.missingRecipe.join(', ')}.</p>
          )}
        </>
      )}
    </InsightCard>
  )
}

export default function PlanningTab({ range }) {
  const { startDate, endDate } = range
  const thisWeek = sundayOf(0)
  const nextWeek = sundayOf(1)
  const [week, setWeek] = useState(nextWeek)
  const [pdf, setPdf] = useState(null)
  const [pdfError, setPdfError] = useState(false)

  const trend = useInsight(() => window.piu.getOverproductionTrend(startDate, endDate), [startDate, endDate])
  const forecast = useInsight(() => window.piu.getWeekForecast(week), [week])
  const shopping = useInsight(() => window.piu.getProjectedShopping(week), [week])

  const openPdf = (data) => {
    try {
      setPdfError(false)
      setPdf({ doc: generarListaCompras(data.items), title: `compra-proyectada-${data.weekStart}` })
    } catch {
      setPdfError(true)
    }
  }

  return (
    <>
      <div className="insight-toolbar">
        <Segmented
          label="Semana a planificar"
          options={[
            { value: thisWeek, label: `Esta semana (${shortDate(thisWeek)})` },
            { value: nextWeek, label: `Próxima semana (${shortDate(nextWeek)})` }
          ]}
          value={week}
          onChange={setWeek}
        />
        <span className="insight-toolbar-hint">El pronóstico y la compra no dependen del período elegido arriba.</span>
      </div>
      {pdfError && <p className="insight-error" role="alert">No se pudo generar el PDF.</p>}
      <div className="insight-grid">
        <WeekForecast insight={forecast} />
        <ProjectedShopping insight={shopping} onPdf={openPdf} />
        <OverproductionTrend insight={trend} />
      </div>
      {pdf && <PdfViewer pdfDoc={pdf.doc} title={pdf.title} onClose={() => setPdf(null)} />}
    </>
  )
}
