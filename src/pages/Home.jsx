import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ErrorBanner from '../components/ErrorBanner'
import { useToast } from '../components/ToastProvider'
import UndeliveredPanel from '../components/home/UndeliveredPanel'
import PendingProductionPanel from '../components/home/PendingProductionPanel'
import StatTile from '../components/home/StatTile'

function getThreshold() {
  return parseInt(localStorage.getItem('priceStalenessThreshold') || '30', 10)
}

function countStale(priceReview, threshold) {
  if (!priceReview) return { ingredients: 0, dishes: 0 }
  const ingredients = priceReview.ingredients.filter(i => i.isStale).length
  const dishes = priceReview.dishPrices.filter(dp => {
    if (!dp.last_price_review) return true
    return (Date.now() - new Date(dp.last_price_review).getTime()) / 86400000 >= threshold
  }).length
  return { ingredients, dishes }
}

function groupPending(dishes) {
  const categories = {}
  for (const d of dishes) {
    const name = d.category || 'Sin categoría'
    if (!categories[name]) categories[name] = { name, missing: 0, ordered: 0, produced: 0, dishes: [] }
    const missing = Math.max(0, d.total_ordered - d.total_produced)
    categories[name].missing += missing
    categories[name].ordered += d.total_ordered
    categories[name].produced += Math.min(d.total_produced, d.total_ordered)
    categories[name].dishes.push({ ...d, missing })
  }
  return Object.values(categories)
    .map(c => ({ ...c, dishes: c.dishes.sort((a, b) => b.missing - a.missing) }))
    .sort((a, b) => b.missing - a.missing)
}

function plural(n, word) {
  return `${n} ${word}${n !== 1 ? 's' : ''}`
}

function HomeSkeleton() {
  return (
    <div className="home-grid" aria-busy="true" aria-label="Cargando inicio">
      <div className="home-panel home-left skeleton" />
      <div className="home-panel skeleton" />
      <div className="home-stats">
        <div className="home-panel skeleton" />
        <div className="home-panel skeleton" />
      </div>
    </div>
  )
}

export default function Home() {
  const showToast = useToast()
  const navigate = useNavigate()
  const savingRef = useRef(false)
  const [data, setData] = useState(null)
  const [selectedWeekId, setSelectedWeekId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      const threshold = getThreshold()
      const [dashboard, pastWeeks, counts, priceReview] = await Promise.all([
        (window.piu?.getDashboard() || Promise.resolve(null)),
        (window.piu?.getUndeliveredPastWeeks() || Promise.resolve([])),
        (window.piu?.getWeekOrderCounts() || Promise.resolve(null)),
        (window.piu?.getPriceReview(threshold) || Promise.resolve(null))
      ])
      if (!dashboard) throw new Error('no dashboard')
      setData({
        categories: groupPending(dashboard.dishes),
        pastWeeks: pastWeeks || [],
        counts: counts || { pending: 0, confirmed: 0, assembled: 0, delivered: 0, total: 0 },
        stale: countStale(priceReview, threshold)
      })
      setError(null)
    } catch (e) {
      setError('No se pudieron cargar los datos del inicio.')
    }
  }, [])

  useEffect(() => {
    load()
    window.addEventListener('piu:production-update', load)
    return () => window.removeEventListener('piu:production-update', load)
  }, [load])

  useEffect(() => {
    if (!data) return
    if (!data.pastWeeks.some(w => w.week.id === selectedWeekId)) {
      setSelectedWeekId(data.pastWeeks[0]?.week.id ?? null)
    }
  }, [data, selectedWeekId])

  const deliver = async (ids) => {
    if (savingRef.current || ids.length === 0) return
    savingRef.current = true
    setSaving(true)
    try {
      const r = await window.piu?.markPastOrdersDelivered(ids)
      window.dispatchEvent(new Event('piu:production-update'))
      showToast(r?.updated > 1 ? `${r.updated} pedidos entregados` : 'Pedido entregado', 'success')
    } catch (e) {
      setError('No se pudo marcar como entregado.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const header = <h2>Inicio</h2>

  if (!data) return (
    <div className="home">
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      {header}
      <HomeSkeleton />
    </div>
  )

  const { counts, stale } = data
  const open = counts.total - counts.delivered
  const notAssembled = counts.pending + counts.confirmed
  const staleTotal = stale.ingredients + stale.dishes

  return (
    <div className="home">
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      {header}

      <div className="home-grid">
        <UndeliveredPanel
          weeks={data.pastWeeks}
          selectedWeekId={selectedWeekId}
          onSelectWeek={setSelectedWeekId}
          onDeliver={deliver}
          saving={saving}
        />

        <PendingProductionPanel categories={data.categories} />

        <div className="home-stats">
          <StatTile
            testId="week-undelivered"
            label="Sin entregar esta semana"
            value={open}
            detail={counts.total === 0 ? 'Sin pedidos todavía' : open === 0 ? '✓ Todo entregado' : `${plural(notAssembled, 'pendiente')} · ${plural(counts.assembled, 'armado')}`}
            tone={open === 0 ? 'ok' : 'alert'}
            onClick={() => navigate('/orders')}
          />
          <StatTile
            testId="stale-box"
            label="Precios desactualizados"
            value={staleTotal === 0 ? '✓' : staleTotal}
            detail={staleTotal === 0 ? 'Al día' : `${plural(stale.ingredients, 'ingrediente')} · ${plural(stale.dishes, 'plato')}`}
            tone={staleTotal === 0 ? 'ok' : 'warn'}
            onClick={() => navigate(stale.ingredients === 0 && stale.dishes > 0 ? '/menu' : '/ingredients')}
          />
        </div>
      </div>
    </div>
  )
}
