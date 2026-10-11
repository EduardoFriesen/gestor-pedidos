import React, { useState, useEffect, useCallback, useRef } from 'react'
import PdfViewer from '../components/PdfViewer'
import { generarHojaProduccion, generarListaCompras } from '../utils/pdf'
import { SkeletonCard } from '../components/Skeleton'
import ErrorBanner from '../components/ErrorBanner'
import { useToast } from '../components/ToastProvider'
import { formatQty } from '../utils/format'
import PageHeader from '../components/ui/PageHeader'
import MetricStrip from '../components/ui/MetricStrip'
import Segmented from '../components/ui/Segmented'

function Chevron({ open }) {
  return (
    <svg className={`chevron${open ? ' is-open' : ''}`} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Dashboard() {
  const showToast = useToast()
  const savingRef = useRef(false)
  const [savingAction, setSavingAction] = useState(null)
  const [data, setData] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [subProducts, setSubProducts] = useState([])
  const [expandedSub, setExpandedSub] = useState(null)
  const [allDishes, setAllDishes] = useState([])
  const [expandedDish, setExpandedDish] = useState(null)
  const [showSubProducts, setShowSubProducts] = useState(false)
  const [pdfPreview, setPdfPreview] = useState(null)
  const [ingredients, setIngredients] = useState([])
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      const [d, sp, ds, ing] = await Promise.all([
        (window.piu?.getDashboard() || Promise.resolve(null)),
        (window.piu?.getSubProductQuantities() || Promise.resolve([])),
        (window.piu?.getDishes() || Promise.resolve([])),
        (window.piu?.getIngredientsList() || Promise.resolve([]))
      ])
      setData(d || null)
      setSubProducts(sp || [])
      setAllDishes(ds || [])
      setIngredients(ing || [])
      setError(null)
    } catch (e) {
      setError('No se pudieron cargar los datos de producción.')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const refresh = () => {
    load()
    window.dispatchEvent(new CustomEvent('piu:production-update'))
  }

  const handleProduce = async (dishId) => {
    if (savingRef.current) return
    savingRef.current = true
    setSavingAction(`produce-${dishId}`)
    try {
      await window.piu?.addProduction(dishId, 1)
      refresh()
      showToast('Producción registrada', 'success')
    } catch (e) {
      setError('No se pudo registrar la producción.')
    } finally {
      savingRef.current = false
      setSavingAction(null)
    }
  }

  const handleUndo = async (dishId) => {
    if (savingRef.current) return
    savingRef.current = true
    setSavingAction(`undo-${dishId}`)
    try {
      await window.piu?.undoProduction(dishId)
      refresh()
      showToast('Se restó 1 unidad', 'success')
    } catch (e) {
      setError('No se pudo deshacer la producción.')
    } finally {
      savingRef.current = false
      setSavingAction(null)
    }
  }

  const handleCompleteDish = async (dishId) => {
    if (savingRef.current) return
    savingRef.current = true
    setSavingAction(`complete-${dishId}`)
    try {
      await window.piu?.completeDishProduction(dishId)
      refresh()
      showToast('Producción completada', 'success')
    } catch (e) {
      setError('No se pudo completar la producción del plato.')
    } finally {
      savingRef.current = false
      setSavingAction(null)
    }
  }

  if (!data) return (
    <div>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)' }}>
        <div className="skeleton" style={{ height: '2.5em', width: '300px', marginBottom: 'var(--spacing-md)' }} />
        {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  )

  const { week, dishes, totals } = data

  const categories = {}
  for (const d of dishes) {
    const cat = d.category || 'Sin categoría'
    if (!categories[cat]) categories[cat] = { name: cat, count: 0, total: 0, produced: 0 }
    categories[cat].count++
    categories[cat].total += d.total_ordered
    categories[cat].produced += d.total_produced
  }
  const categoryList = Object.values(categories).sort((a, b) => b.total - a.total)

  const q = search.toLowerCase()
  const catFiltered = selectedCategory
    ? dishes.filter(d => (d.category || 'Sin categoría') === selectedCategory)
    : dishes
  const searchFiltered = catFiltered.filter(d =>
    !q || (d.name || '').toLowerCase().includes(q) || (d.category || '').toLowerCase().includes(q)
  )
  const sortedDishes = [...searchFiltered].sort((a, b) => {
    const aDone = a.total_ordered > 0 && a.total_produced >= a.total_ordered ? 1 : 0
    const bDone = b.total_ordered > 0 && b.total_produced >= b.total_ordered ? 1 : 0
    return aDone - bDone
  })

  const formatDate = (str) => {
    if (!str) return ''
    const [y, m, d] = str.split('-')
    return `${d}/${m}/${y}`
  }

  const handlePrintProduction = () => {
    if (!data) return
    try {
      const doc = generarHojaProduccion(data)
      setPdfPreview({ doc, title: `produccion-piu-${data.week.week_start}` })
    } catch (e) {
      console.error('Error al generar hoja de producción:', e)
      showToast('Error al generar el PDF.', 'error')
    }
  }

  const handlePrintShopping = () => {
    if (ingredients.length === 0) {
      showToast('No hay ingredientes configurados en los platos para generar la lista de compras.', 'info')
      return
    }
    try {
      const doc = generarListaCompras(ingredients)
      setPdfPreview({ doc, title: `compras-piu-${data?.week?.week_start || 'semana'}` })
    } catch (e) {
      console.error('Error al generar lista de compras:', e)
      showToast('Error al generar el PDF.', 'error')
    }
  }

  return (
    <div>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <PageHeader
        title="Producción semanal"
        subtitle={`${formatDate(week.week_start)} – ${formatDate(week.week_end)}`}
        actions={
          <>
            <button className="btn btn-outline btn-sm" onClick={handlePrintShopping}>Lista Compras</button>
            <button className="btn btn-outline btn-sm" onClick={handlePrintProduction}>Hoja Producción</button>
          </>
        }
      />

      <MetricStrip
        label="Resumen de producción"
        items={[
          { label: 'Unidades pedidas', value: totals.total },
          { label: 'Producido', value: totals.produced },
          { label: 'Sobreproducción', value: totals.overproduction, tone: totals.overproduction > 0 ? 'danger' : 'muted' }
        ]}
      />

      <div className="toolbar">
        <input
          type="text"
          placeholder="Buscar por plato o categoría..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          key="search-dashboard"
          aria-label="Buscar plato"
        />
        {categoryList.length > 0 && (
          <Segmented
            label="Filtrar por categoría"
            value={selectedCategory}
            onChange={setSelectedCategory}
            options={[
              { value: null, label: 'Todas', count: dishes.length },
              ...categoryList.map(cat => {
                const pct = cat.total > 0 ? Math.min(100, Math.round((cat.produced / cat.total) * 100)) : 0
                return {
                  value: cat.name,
                  label: (
                    <>
                      {cat.name}
                      <span className={`mini-progress${pct >= 100 ? ' is-done' : ''}`} aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
                    </>
                  ),
                  count: cat.count
                }
              })
            ]}
          />
        )}
      </div>

      {subProducts.length > 0 && (
        <div className="disclosure-panel">
          <button
            type="button"
            className="disclosure"
            onClick={() => setShowSubProducts(!showSubProducts)}
            aria-expanded={showSubProducts}
          >
            <Chevron open={showSubProducts} />
            Sub-productos
            <span className="segmented-count">{subProducts.length}</span>
          </button>
          {showSubProducts && (
            <ul className="disclosure-body">
              {subProducts.map(sp => (
                <li key={sp.id}>
                  <button
                    type="button"
                    className="subproduct"
                    onClick={() => setExpandedSub(expandedSub === sp.id ? null : sp.id)}
                    aria-expanded={expandedSub === sp.id}
                  >
                    <span>
                      <strong>{sp.name}</strong>: falta {formatQty(sp.remaining ?? sp.total, sp.unit)}
                      <span className="muted"> de {formatQty(sp.total, sp.unit)}</span>
                    </span>
                    <Chevron open={expandedSub === sp.id} />
                  </button>
                  {expandedSub === sp.id && (
                    <dl className="subproduct-breakdown">
                      {sp.breakdown.map(b => (
                        <div key={b.name}>
                          <dt>{b.name}</dt>
                          <dd>
                            {formatQty(b.remaining ?? b.total, b.unit)}
                            <span className="muted"> de {formatQty(b.total, b.unit)}</span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {sortedDishes.length === 0 ? (
        <div className="empty-state card">
          <h3>{search || selectedCategory ? 'Sin resultados' : 'No hay pedidos para esta semana'}</h3>
          <p>{search ? 'Probá con otro término de búsqueda.' : selectedCategory ? 'No hay platos en esta categoría con pedidos.' : 'Andá a la sección Pedidos para registrar órdenes. La producción se organiza automáticamente acá.'}</p>
        </div>
      ) : (
        <ul className="list">
          {sortedDishes.map(dish => {
            const remaining = dish.total_ordered - dish.total_produced
            const done = dish.total_produced >= dish.total_ordered && dish.total_ordered > 0
            const pct = dish.total_ordered > 0
              ? Math.min(100, Math.round((dish.total_produced / dish.total_ordered) * 100))
              : 0

            const status = dish.total_ordered === 0
              ? { text: 'Sin pedidos', badge: '' }
              : done
                ? { text: '✓ Completado', badge: 'badge-success' }
                : dish.total_produced > 0
                  ? { text: 'En producción', badge: 'badge-warning' }
                  : { text: 'Pendiente', badge: 'badge-accent' }

            return (
              <li key={dish.id} className={`prod-card${done ? ' is-done' : ''}`}>
                <div className="prod-card-head">
                  <div className="list-card-title">
                    <h3>
                      <button
                        type="button"
                        className="prod-card-toggle"
                        onClick={() => setExpandedDish(expandedDish === dish.id ? null : dish.id)}
                        aria-expanded={expandedDish === dish.id}
                      >
                        <Chevron open={expandedDish === dish.id} />
                        {dish.name}
                      </button>
                    </h3>
                    <span className={`badge ${status.badge}`}>{status.text}</span>
                    {dish.overproduction > 0 && <span className="badge badge-danger">Sobró {dish.overproduction}</span>}
                  </div>

                  <div className="prod-count" aria-label={`${dish.total_produced} de ${dish.total_ordered} producidos`}>
                    <span>{dish.total_produced}</span>
                    <span className="prod-count-of">/ {dish.total_ordered}</span>
                  </div>

                  <div className="prod-actions">
                    {dish.total_produced > 0 && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleUndo(dish.id)}
                        disabled={savingAction !== null}
                        aria-label={`Restar 1 a la producción de ${dish.name}`}
                        title="Restar 1 unidad producida"
                      >
                        −1
                      </button>
                    )}
                    {!done && dish.total_ordered > 0 && (
                      <>
                        {remaining > 0 && (
                          <button
                            className="btn btn-outline"
                            onClick={() => handleCompleteDish(dish.id)}
                            disabled={savingAction !== null}
                            aria-label={`Completar ${dish.name}`}
                          >
                            {savingAction === `complete-${dish.id}` ? '...' : '✓ Completar'}
                          </button>
                        )}
                        <button
                          className="btn btn-primary prod-plus"
                          onClick={() => handleProduce(dish.id)}
                          disabled={savingAction !== null}
                          aria-label={`Marcar ${dish.name} como producido`}
                        >
                          {savingAction === `produce-${dish.id}` ? '...' : '+1'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="prod-progress" aria-hidden="true">
                  <span style={{ width: `${pct}%` }} />
                </div>

                {expandedDish === dish.id && (() => {
                  const fullDish = allDishes.find(d => d.id === dish.id)
                  if (!fullDish || !fullDish.ingredients || fullDish.ingredients.length === 0) return null
                  return (
                    <div className="prod-ingredients">
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-sm)', fontWeight: 600, marginBottom: 'var(--spacing-xs)', color: 'var(--text)' }}>
                        <span>Ingredientes</span>
                        <span>{remaining > 0 ? `Para lo que falta (${remaining} u.)` : 'Por unidad'}</span>
                      </div>
                      {fullDish.ingredients.map((ing, i) => {
                        const factor = remaining > 0 ? remaining : 1
                        return (
                          <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-sm)' }}>
                              <span>{ing.name}</span>
                              <span>
                                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{formatQty(ing.quantity * factor, ing.unit)}</span>
                                {remaining > 0 && <span> · {formatQty(ing.quantity, ing.unit)} por unidad</span>}
                              </span>
                            </div>
                            {ing.subIngredients && ing.subIngredients.length > 0 && (
                              <div style={{ marginLeft: 'var(--spacing-md)', marginBottom: 'var(--spacing-xs)' }}>
                                {ing.subIngredients.map((si, j) => (
                                  <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-xs)' }}>
                                    <span>└ {si.name}</span>
                                    <span>{formatQty(si.quantity * ing.quantity * factor, si.unit)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </li>
            )
          })}
        </ul>
      )}
      {pdfPreview && (
        <PdfViewer pdfDoc={pdfPreview.doc} title={pdfPreview.title} onClose={() => setPdfPreview(null)} />
      )}
    </div>
  )
}
