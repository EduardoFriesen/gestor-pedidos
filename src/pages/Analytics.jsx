import React, { useState, useEffect, useCallback, useRef } from 'react'
import { SkeletonAnalytics } from '../components/Skeleton'
import ErrorBanner from '../components/ErrorBanner'
import { useHeaderContent } from '../components/HeaderContext'
import { fmtMoney } from '../utils/format'
import PageHeader from '../components/ui/PageHeader'
import MetricStrip from '../components/ui/MetricStrip'
import Segmented from '../components/ui/Segmented'
import Tabs from '../components/ui/Tabs'
import SalesTab from '../components/analytics/SalesTab'
import DishesTab from '../components/analytics/DishesTab'
import ClientsTab from '../components/analytics/ClientsTab'
import FinanceTab from '../components/analytics/FinanceTab'
import PlanningTab from '../components/analytics/PlanningTab'
import OperationsTab from '../components/analytics/OperationsTab'
import AnalyticsBoundary from '../components/analytics/AnalyticsBoundary'
import { PRESETS, getPresetRange, pct } from '../components/analytics/periods'

const TABS = [
  { id: 'sales', label: 'Ventas' },
  { id: 'dishes', label: 'Platos' },
  { id: 'clients', label: 'Clientes' },
  { id: 'finance', label: 'Finanzas' },
  { id: 'planning', label: 'Planificación' },
  { id: 'operations', label: 'Operación' }
]

const EMPTY_TRENDS = { weekly: [], monthly: [], quarterly: [], yearly: [] }

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null)
  const [trends, setTrends] = useState(EMPTY_TRENDS)
  const [fullTrends, setFullTrends] = useState(EMPTY_TRENDS)
  const [overproduction, setOverproduction] = useState(null)
  const [tab, setTab] = useState('sales')
  const [filterPreset, setFilterPreset] = useState('week')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [appliedRange, setAppliedRange] = useState(getPresetRange('week'))
  const [error, setError] = useState(null)
  const loadIdRef = useRef(0)
  const { setHeaderContent } = useHeaderContent()

  const loadAll = useCallback(async (preset, start, end) => {
    const id = ++loadIdRef.current
    try {
      const { startDate, endDate } = preset === 'custom'
        ? { startDate: start || null, endDate: end || null }
        : getPresetRange(preset)
      const [a, t, ov] = await Promise.all([
        window.piu?.getAnalyticsFiltered(startDate, endDate) || Promise.resolve(null),
        window.piu?.getTrendsInRange(startDate, endDate) || Promise.resolve(null),
        window.piu?.getOverproductionInRange(startDate, endDate) || Promise.resolve(null)
      ])
      if (id !== loadIdRef.current) return
      setAppliedRange({ startDate, endDate })
      setAnalytics(a)
      setTrends(t || EMPTY_TRENDS)
      setOverproduction(ov || null)
      setError(null)
    } catch {
      if (id === loadIdRef.current) setError('No se pudieron cargar los datos de analytics.')
    }
  }, [])

  useEffect(() => {
    if (filterPreset !== 'custom') loadAll(filterPreset)
  }, [loadAll, filterPreset])

  useEffect(() => {
    window.piu?.getTrendsInRange(null, null)
      .then(t => { if (t) setFullTrends(t) })
      .catch(() => {})
  }, [])

  const handleFilterChange = (preset) => {
    setFilterPreset(preset)
    if (preset !== 'custom') {
      setCustomStart('')
      setCustomEnd('')
    }
  }

  const handleCustomFilter = () => {
    if (!customStart || !customEnd) { setError('Elegí la fecha de inicio y la de fin.'); return }
    if (customStart > customEnd) { setError('La fecha de inicio es posterior a la de fin.'); return }
    loadAll('custom', customStart, customEnd)
  }

  const handleExcelExport = async () => {
    try {
      await window.piu?.exportAnalyticsExcel(appliedRange)
    } catch {
      setError('No se pudo exportar el Excel.')
    }
  }

  useEffect(() => {
    const metrics = [
      { label: 'Pedidos', value: analytics?.totalOrders || 0 },
      { label: 'Ingresos', value: fmtMoney(analytics?.revenue || 0), tone: 'success' },
      { label: 'Costo total', value: fmtMoney(analytics?.totalCost || 0), tone: 'danger' },
      { label: 'Ganancia neta', value: fmtMoney(analytics?.totalProfit || 0), tone: (analytics?.totalProfit || 0) >= 0 ? 'success' : 'danger' }
    ]
    if (analytics?.revenue > 0 && analytics?.totalCost > 0) {
      metrics.push({ label: 'Margen', value: pct((analytics.revenue - analytics.totalCost) / analytics.revenue * 100), tone: 'accent' })
    }
    if (overproduction) {
      metrics.push({
        label: 'Desperdicio',
        hint: 'Costo de lo producido que no se vendió en el período',
        value: fmtMoney(overproduction.totalOverproductionCost),
        tone: overproduction.totalOverproductionCost > 0 ? 'danger' : 'muted'
      })
    }

    setHeaderContent(
      <div className="analytics-head no-print">
        <PageHeader
          title="Análisis"
          subtitle="Ingresos y ganancias incluyen solo pedidos entregados y cobrados."
          actions={
            <>
              <Segmented label="Período" options={PRESETS.map(p => ({ value: p.id, label: p.label }))} value={filterPreset} onChange={handleFilterChange} />
              {filterPreset === 'custom' && (
                <div className="date-range">
                  <input type="date" aria-label="Desde" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                  <span aria-hidden="true">a</span>
                  <input type="date" aria-label="Hasta" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                  <button className="btn btn-primary btn-sm" onClick={handleCustomFilter}>Filtrar</button>
                </div>
              )}
              <button className="btn btn-outline btn-sm" onClick={handleExcelExport}>↓ Excel</button>
            </>
          }
        />
        <MetricStrip label="Resumen del período" items={metrics} />
        <div className="analytics-tabs-row">
          <Tabs label="Vistas de análisis" tabs={TABS} value={tab} onChange={setTab} idPrefix="analytics-tab" panelId="analytics-panel" />
        </div>
      </div>
    )
    return () => setHeaderContent(null)
  }, [analytics, tab, filterPreset, customStart, customEnd, overproduction, appliedRange])

  if (!analytics) return <SkeletonAnalytics />

  const shared = { analytics, preset: filterPreset, range: appliedRange, fullTrends, onError: setError }

  return (
    <div>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <div
        key={tab}
        id="analytics-panel"
        role="tabpanel"
        aria-labelledby={`analytics-tab-${tab}`}
        style={{ animation: 'slideUp 250ms var(--ease-out-quart)' }}
      >
        <AnalyticsBoundary>
        {tab === 'sales' && <SalesTab {...shared} trends={trends} />}
        {tab === 'dishes' && <DishesTab {...shared} />}
        {tab === 'clients' && <ClientsTab {...shared} />}
        {tab === 'finance' && <FinanceTab range={appliedRange} />}
        {tab === 'planning' && <PlanningTab range={appliedRange} />}
        {tab === 'operations' && <OperationsTab range={appliedRange} />}
        </AnalyticsBoundary>
      </div>
    </div>
  )
}
