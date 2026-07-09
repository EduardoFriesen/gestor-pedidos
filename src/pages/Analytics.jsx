import React, { useState, useEffect, useCallback } from 'react'
import PdfViewer from '../components/PdfViewer'
import { generarHojaProduccion, generarListaCompras } from '../utils/pdf'

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [ingredients, setIngredients] = useState([])
  const [comparison, setComparison] = useState(null)
  const [monthlyTrend, setMonthlyTrend] = useState([])
  const [yearlyTrend, setYearlyTrend] = useState([])
  const [monthComparison, setMonthComparison] = useState(null)
  const [yearComparison, setYearComparison] = useState(null)
  const [pdfPreview, setPdfPreview] = useState(null)
  const [tab, setTab] = useState('top')

  const load = useCallback(() => {
    Promise.all([
      window.piu?.getAnalytics(),
      window.piu?.getDashboard(),
      window.piu?.getIngredientsList(),
      window.piu?.getWeekComparison(),
      window.piu?.getMonthlyTrend(),
      window.piu?.getYearlyTrend(),
      window.piu?.getMonthComparison(),
      window.piu?.getYearComparison()
    ]).then(([a, d, i, c, mt, yt, mc, yc]) => {
      setAnalytics(a)
      setDashboard(d)
      setIngredients(i || [])
      setComparison(c)
      setMonthlyTrend(mt || [])
      setYearlyTrend(yt || [])
      setMonthComparison(mc)
      setYearComparison(yc)
    })
  }, [])

  useEffect(() => { load() }, [load])

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

  const formatDate = (str) => {
    if (!str) return ''
    const [y, m, d] = str.split('-')
    return `${d}/${m}`
  }

  const fmtMoney = (n) => `$${(n || 0).toFixed(2)}`

  const tabs = [
    { id: 'top', label: 'Top Platos' },
    { id: 'clients', label: 'Top Clientes' },
    { id: 'trend', label: 'Evolucion' },
    { id: 'monthly', label: 'Mensual' },
    { id: 'yearly', label: 'Anual' },
    { id: 'comparison', label: 'Comparativa' }
  ]

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--spacing-lg)'
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

      <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
        <StatCard label="Pedidos esta semana" value={comparison?.current?.order_count ?? '—'} />
        <StatCard label="Ingresos esta semana" value={fmtMoney(comparison?.current?.revenue)} />
        {comparison?.previous && (
          <>
            <StatCard
              label={comparison.orderChange > 0 ? '📈 Pedidos vs ant.' : '📉 Pedidos vs ant.'}
              value={`${comparison.orderChange}%`}
              highlight={comparison.orderChange > 0 ? 'var(--success)' : 'var(--danger)'}
            />
            <StatCard
              label={comparison.revenueChange > 0 ? '📈 Ingresos vs ant.' : '📉 Ingresos vs ant.'}
              value={`${comparison.revenueChange}%`}
              highlight={comparison.revenueChange > 0 ? 'var(--success)' : 'var(--danger)'}
            />
          </>
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
            <div className="empty-state card"><p>Todavía no hay datos suficientes.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {analytics.topDishes.map((d, i) => {
                const max = analytics.topDishes[0]?.total || 1
                const pct = Math.round((d.total / max) * 100)
                return (
                  <div key={d.name} className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                    <span style={{
                      fontSize: 'var(--font-lg)',
                      fontWeight: 900,
                      color: 'var(--primary)',
                      minWidth: '40px'
                    }}>
                      #{i + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
                        <strong style={{ fontSize: 'var(--font-lg)' }}>{d.name}</strong>
                        <span style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>{d.total}</span>
                      </div>
                      <div style={{
                        height: 'calc(var(--touch-size) * 0.4)',
                        background: 'var(--border)',
                        borderRadius: '100px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: 'var(--primary)',
                          borderRadius: '100px',
                          transition: 'width 0.5s ease',
                          minWidth: '20px'
                        }} />
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
            <div className="empty-state card"><p>Todavía no hay datos suficientes.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {analytics.topClients.map((c, i) => {
                const max = analytics.topClients[0]?.order_count || 1
                const pct = Math.round((c.order_count / max) * 100)
                return (
                  <div key={`${c.name}-${c.last_name}`} className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                    <span style={{
                      fontSize: 'var(--font-lg)',
                      fontWeight: 900,
                      color: 'var(--primary)',
                      minWidth: '40px'
                    }}>
                      #{i + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
                        <strong style={{ fontSize: 'var(--font-lg)' }}>
                          {c.name} {c.last_name}
                        </strong>
                        <span style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>{c.order_count}</span>
                      </div>
                      <div style={{
                        height: 'calc(var(--touch-size) * 0.4)',
                        background: 'var(--border)',
                        borderRadius: '100px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: 'var(--accent)',
                          borderRadius: '100px',
                          transition: 'width 0.5s ease',
                          minWidth: '20px'
                        }} />
                      </div>
                      <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-xs)' }}>
                        {c.order_count} pedidos
                      </p>
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
          {analytics.weeklyTrend.length === 0 ? (
            <div className="empty-state card"><p>Todavía no hay datos suficientes.</p></div>
          ) : (
            <>
              <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Pedidos por semana</h3>
              <BarChart
                data={analytics.weeklyTrend}
                labelKey="week_start"
                valueKey="order_count"
                formatLabel={formatDate}
                currentKey={dashboard?.week?.week_start}
                barColor="var(--primary)"
              />
              <h3 style={{ margin: 'var(--spacing-lg) 0 var(--spacing-md)' }}>Ingresos por semana</h3>
              <BarChart
                data={analytics.weeklyTrend}
                labelKey="week_start"
                valueKey="revenue"
                formatLabel={formatDate}
                currentKey={dashboard?.week?.week_start}
                barColor="var(--success)"
                formatValue={(v) => fmtMoney(v)}
              />
            </>
          )}
        </div>
      )}

      {tab === 'monthly' && (
        <div>
          {monthlyTrend.length === 0 ? (
            <div className="empty-state card"><p>Todavía no hay datos mensuales suficientes.</p></div>
          ) : (
            <>
              {monthComparison?.previous && (
                <>
                  <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                    <div className="card" style={{ flex: 1, textAlign: 'center' }}>
                      <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                        {monthComparison.previous.month}
                      </p>
                      <p style={{ fontSize: 'var(--font-xl)', fontWeight: 900, color: 'var(--text)' }}>
                        {monthComparison.previous.order_count}
                      </p>
                      <p style={{ fontSize: 'var(--font-body)' }}>pedidos</p>
                      <p style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)' }}>
                        {fmtMoney(monthComparison.previous.revenue)}
                      </p>
                    </div>
                    <div className="card" style={{ flex: 1, textAlign: 'center' }}>
                      <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                        {monthComparison.current.month}
                      </p>
                      <p style={{
                        fontSize: 'var(--font-xl)',
                        fontWeight: 900,
                        color: monthComparison.change > 0 ? 'var(--success)' : monthComparison.change < 0 ? 'var(--danger)' : 'var(--text)'
                      }}>
                        {monthComparison.current.order_count}
                      </p>
                      <p style={{ fontSize: 'var(--font-body)' }}>
                        pedidos ({monthComparison.change > 0 ? '+' : ''}{monthComparison.change}%)
                      </p>
                      <p style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)' }}>
                        {fmtMoney(monthComparison.current.revenue)}
                      </p>
                    </div>
                  </div>
                </>
              )}
              <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Pedidos por mes</h3>
              <BarChart
                data={monthlyTrend}
                labelKey="month"
                valueKey="order_count"
                formatLabel={(m) => `${m.slice(5)}/${m.slice(2, 4)}`}
                currentKey={monthlyTrend[monthlyTrend.length - 1]?.month}
                barColor="var(--primary)"
              />
              <h3 style={{ margin: 'var(--spacing-lg) 0 var(--spacing-md)' }}>Ingresos por mes</h3>
              <BarChart
                data={monthlyTrend}
                labelKey="month"
                valueKey="revenue"
                formatLabel={(m) => `${m.slice(5)}/${m.slice(2, 4)}`}
                currentKey={monthlyTrend[monthlyTrend.length - 1]?.month}
                barColor="var(--success)"
                formatValue={(v) => fmtMoney(v)}
              />
            </>
          )}
        </div>
      )}

      {tab === 'yearly' && (
        <div>
          {yearlyTrend.length === 0 ? (
            <div className="empty-state card"><p>Todavía no hay datos anuales suficientes.</p></div>
          ) : (
            <>
              {yearComparison?.previous && (
                <>
                  <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                    <div className="card" style={{ flex: 1, textAlign: 'center' }}>
                      <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                        {yearComparison.previous.year}
                      </p>
                      <p style={{ fontSize: 'var(--font-xl)', fontWeight: 900, color: 'var(--text)' }}>
                        {yearComparison.previous.order_count}
                      </p>
                      <p style={{ fontSize: 'var(--font-body)' }}>pedidos</p>
                      <p style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)' }}>
                        {fmtMoney(yearComparison.previous.revenue)}
                      </p>
                    </div>
                    <div className="card" style={{ flex: 1, textAlign: 'center' }}>
                      <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                        {yearComparison.current.year}
                      </p>
                      <p style={{
                        fontSize: 'var(--font-xl)',
                        fontWeight: 900,
                        color: yearComparison.change > 0 ? 'var(--success)' : yearComparison.change < 0 ? 'var(--danger)' : 'var(--text)'
                      }}>
                        {yearComparison.current.order_count}
                      </p>
                      <p style={{ fontSize: 'var(--font-body)' }}>
                        pedidos ({yearComparison.change > 0 ? '+' : ''}{yearComparison.change}%)
                      </p>
                      <p style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)' }}>
                        {fmtMoney(yearComparison.current.revenue)}
                      </p>
                    </div>
                  </div>
                </>
              )}
              <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Pedidos por año</h3>
              <BarChart
                data={yearlyTrend}
                labelKey="year"
                valueKey="order_count"
                currentKey={yearlyTrend[yearlyTrend.length - 1]?.year}
                barColor="var(--primary)"
              />
              <h3 style={{ margin: 'var(--spacing-lg) 0 var(--spacing-md)' }}>Ingresos por año</h3>
              <BarChart
                data={yearlyTrend}
                labelKey="year"
                valueKey="revenue"
                currentKey={yearlyTrend[yearlyTrend.length - 1]?.year}
                barColor="var(--success)"
                formatValue={(v) => fmtMoney(v)}
              />
            </>
          )}
        </div>
      )}

      {tab === 'comparison' && (
        <div>
          {!comparison?.previous ? (
            <div className="empty-state card"><p>Se necesita al menos 2 semanas de datos para comparar.</p></div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                <div className="card" style={{ flex: 1, textAlign: 'center' }}>
                  <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                    Semana anterior ({formatDate(comparison.previous.week.week_start)})
                  </p>
                  <p style={{ fontSize: 'var(--font-xl)', fontWeight: 900, color: 'var(--text)' }}>
                    {comparison.previous.order_count}
                  </p>
                  <p style={{ fontSize: 'var(--font-body)' }}>pedidos</p>
                  <p style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)' }}>
                    {fmtMoney(comparison.previous.revenue)}
                  </p>
                </div>
                <div className="card" style={{ flex: 1, textAlign: 'center' }}>
                  <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                    Semana actual
                  </p>
                  <p style={{
                    fontSize: 'var(--font-xl)',
                    fontWeight: 900,
                    color: comparison.orderChange > 0 ? 'var(--success)' : comparison.orderChange < 0 ? 'var(--danger)' : 'var(--text)'
                  }}>
                    {comparison.current.order_count}
                  </p>
                  <p style={{ fontSize: 'var(--font-body)' }}>
                    pedidos ({comparison.orderChange > 0 ? '+' : ''}{comparison.orderChange}%)
                  </p>
                  <p style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)' }}>
                    {fmtMoney(comparison.current.revenue)}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {pdfPreview && (
        <PdfViewer
          pdfDoc={pdfPreview.doc}
          title={pdfPreview.title}
          onClose={() => setPdfPreview(null)}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, highlight }) {
  return (
    <div className="card" style={{
      flex: 1,
      minWidth: '180px',
      textAlign: 'center'
    }}>
      <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
        {label}
      </p>
      <p style={{
        fontSize: 'var(--font-xl)',
        fontWeight: 900,
        color: highlight || 'var(--text)'
      }}>
        {value}
      </p>
    </div>
  )
}

function BarChart({ data, labelKey, valueKey, barColor, formatLabel, currentKey, formatValue }) {
  const max = Math.max(...data.map(x => x[valueKey] || 0), 1)
  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 'calc(var(--spacing-sm) * 0.5)',
        height: 'calc(var(--font-body) * 7 + 40px)',
        padding: 'var(--spacing-md)',
        minWidth: `${Math.max(data.length * 75, 300)}px`
      }}>
        {data.map((item) => {
          const val = item[valueKey] || 0
          const pct = val / max
          const key = item[labelKey]
          const isCurrent = currentKey === key
          return (
            <div key={key} style={{
              flex: '0 0 65px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              height: '100%'
            }}>
              <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700, flexShrink: 0 }}>
                {formatValue ? formatValue(val) : val}
              </span>
              <div style={{
                flex: 1,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end'
              }}>
                <div style={{
                  width: '100%',
                  height: `${Math.max(pct * 100, 2)}%`,
                  minHeight: '4px',
                  background: isCurrent ? 'var(--accent)' : barColor,
                  borderRadius: 'var(--radius) var(--radius) 0 0',
                  transition: 'height 0.5s ease'
                }} />
              </div>
              <span style={{
                fontSize: 'var(--font-xs)',
                color: 'var(--text-secondary)',
                fontWeight: isCurrent ? 700 : 400,
                flexShrink: 0
              }}>
                {formatLabel ? formatLabel(key) : key}
                {isCurrent ? ' *' : ''}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
