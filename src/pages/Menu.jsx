import React, { useState, useEffect, useCallback, useRef } from 'react'
import Modal from '../components/Modal'
import ErrorBanner from '../components/ErrorBanner'
import ConfirmPopup from '../components/ConfirmPopup'
import { getCompatibleUnits, convertValue } from '../utils/units'
import { useToast } from '../components/ToastProvider'

export default function Menu() {
  const showToast = useToast()
  const savingRef = useRef(false)
  const itemKeyRef = useRef(0)
  const [saving, setSaving] = useState(false)
  const [dishes, setDishes] = useState([])
  const [allIngredients, setAllIngredients] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    name: '', category: '', price: '',
    ingredientRows: [{ ingredientId: null, quantity: 0, displayUnit: null }],
    is_active: true
  })
  const [error, setError] = useState(null)
  const [dishSort, setDishSort] = useState('name')
  const [dishSortDir, setDishSortDir] = useState('asc')
  const [priceReview, setPriceReview] = useState(null)
  const [dismissedStale, setDismissedStale] = useState(false)
  const [dismissedPriceReview, setDismissedPriceReview] = useState(false)
  const [showConfirmPopup, setShowConfirmPopup] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const firstInputRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const [d, ing, pr] = await Promise.all([
        (window.piu?.getDishes() || Promise.resolve([])),
        (window.piu?.getIngredients() || Promise.resolve([])),
        (window.piu?.getPriceReview(parseInt(localStorage.getItem('priceStalenessThreshold') || '30', 10)) || Promise.resolve(null))
      ])
      setDishes(d || [])
      setAllIngredients(ing || [])
      setPriceReview(pr)
      setError(null)
    } catch (e) {
      setError('No se pudieron cargar los platos.')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const makeRow = (ingredientId = null, quantity = 0, displayUnit = null) => ({ _key: ++itemKeyRef.current, ingredientId, quantity, displayUnit })

  const handleMarkDishUpdated = async (id) => {
    try {
      if (!window.piu?.markDishPriceUpdated) return
      await window.piu.markDishPriceUpdated(id)
      load()
      showToast('Revisión de precio actualizada', 'success')
    } catch (e) {
      console.error('Error updating dish price:', e)
    }
  }

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', category: '', price: '', ingredientRows: [makeRow()], is_active: true })
    setShowModal(true)
  }

  const openEdit = (dish) => {
    setEditing(dish)
    const rows = (dish.ingredients || []).length > 0
      ? dish.ingredients.map(i => {
          const ing = allIngredients.find(x => x.id === i.ingredientId)
          return makeRow(i.ingredientId, i.quantity, ing?.unit || null)
        })
      : [makeRow()]
    setForm({
      name: dish.name,
      category: dish.category || '',
      price: dish.price?.toString() || '',
      ingredientRows: rows,
      is_active: !!dish.is_active
    })
    setShowModal(true)
  }

  const addRow = () => {
    setForm(f => ({ ...f, ingredientRows: [...f.ingredientRows, makeRow()] }))
  }

  const removeRow = (index) => {
    setForm(f => {
      const rows = f.ingredientRows.filter((_, i) => i !== index)
      return { ...f, ingredientRows: rows.length === 0 ? [makeRow()] : rows }
    })
  }

  const updateRow = (index, field, value) => {
    setForm(f => {
      const rows = [...f.ingredientRows]
      if (field === 'ingredientId') {
        const alreadyUsed = rows.some((r, i) => i !== index && r.ingredientId === value)
        if (alreadyUsed && value) {
          showToast('Ese ingrediente ya está cargado en otra fila.', 'info')
          return f
        }
        const ing = allIngredients.find(i => i.id === value)
        rows[index] = { ...rows[index], ingredientId: value, displayUnit: ing?.unit || null }
        if (value && index === rows.length - 1) {
          rows.push(makeRow())
        }
      } else {
        rows[index] = { ...rows[index], [field]: value }
      }
      return { ...f, ingredientRows: rows }
    })
  }

  const getIngredientInfo = (id) => {
    return allIngredients.find(i => i.id === id)
  }

  const calcRowSubtotal = (row) => {
    const qty = parseFloat(row.quantity) || 0
    if (!row.ingredientId || !qty) return 0
    const ing = getIngredientInfo(row.ingredientId)
    if (!ing) return 0
    const qtyInIngUnit = row.displayUnit
      ? convertValue(qty, row.displayUnit, ing.unit)
      : qty
    return ing.cost * qtyInIngUnit
  }

  const totalCost = form.ingredientRows.reduce((s, r) => s + calcRowSubtotal(r), 0)
  const dishPrice = parseFloat(form.price) || 0
  const margin = dishPrice > 0 ? ((dishPrice - totalCost) / dishPrice * 100) : 0

  const handleSave = async () => {
    if (savingRef.current) return
    if (!form.name.trim()) return
    savingRef.current = true
    setSaving(true)
    const data = {
      name: form.name.trim(),
      category: form.category,
      price: parseFloat(form.price) || 0,
      ingredients: form.ingredientRows
        .filter(r => r.ingredientId && parseFloat(r.quantity || '0') > 0)
        .map(r => {
          const ing = getIngredientInfo(r.ingredientId)
          const rawQty = parseFloat(r.quantity) || 0
          const qty = r.displayUnit && ing
            ? convertValue(rawQty, r.displayUnit, ing.unit)
            : rawQty
          return { ingredientId: r.ingredientId, quantity: qty }
        }),
      is_active: form.is_active
    }
    try {
      if (editing) {
        await window.piu?.updateDish({ id: editing.id, ...data })
        setShowModal(false)
      } else {
        await window.piu?.createDish(data)
        setShowConfirmPopup(true)
      }
      load()
      showToast('Plato guardado', 'success')
    } catch (e) {
      setError('No se pudo guardar el plato.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const handleContinueAdding = () => {
    setShowConfirmPopup(false)
    setForm({ name: '', category: '', price: '', ingredientRows: [makeRow()], is_active: true })
    requestAnimationFrame(() => {
      if (firstInputRef.current) firstInputRef.current.focus()
    })
  }

  const handleStopAdding = () => {
    setShowConfirmPopup(false)
    setShowModal(false)
  }

  const handleDelete = (id) => {
    setDeleteConfirmId(id)
  }

  const confirmDelete = async () => {
    if (!deleteConfirmId) return
    const id = deleteConfirmId
    setDeleteConfirmId(null)
    savingRef.current = true
    setSaving(true)
    try {
      const res = await window.piu?.deleteDish(id)
      if (res && !res.success && res.reason === 'has_orders') {
        showToast('No se puede eliminar: el plato tiene pedidos asociados.', 'error')
        return
      }
      load()
      showToast('Plato eliminado', 'success')
    } catch (e) {
      setError('No se pudo eliminar el plato.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const categories = [...new Set(dishes.map(d => d.category).filter(Boolean))].sort()
  const activeIngredients = allIngredients.filter(i => i.is_active)

  const q = search.toLowerCase()
  const filteredDishes = dishes
    .filter(d =>
      !q || (d.name || '').toLowerCase().includes(q) || (d.category || '').toLowerCase().includes(q)
    )
    .sort((a, b) => {
      const dir = dishSortDir === 'asc' ? 1 : -1
      if (dishSort === 'name') return a.name.localeCompare(b.name) * dir
      if (dishSort === 'price') return ((b.price || 0) - (a.price || 0)) * dir
      if (dishSort === 'cost') return ((b.computedCost || 0) - (a.computedCost || 0)) * dir
      if (dishSort === 'margin') {
        const aP = (a.price || 0) - (a.computedCost || 0)
        const bP = (b.price || 0) - (b.computedCost || 0)
        return (bP - aP) * dir
      }
      return 0
    })

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--spacing-lg)'
      }}>
        <h2>Menú</h2>
        <button className="btn btn-primary" onClick={openNew} style={{ width: '220px', fontSize: 'var(--font-body)' }}>
          + Plato
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div style={{
        display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)',
        flexWrap: 'wrap'
      }}>
        <div className="card" style={{ flex: 1, minWidth: '100px', textAlign: 'center', padding: 'var(--spacing-sm) var(--spacing-md)' }}>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>Activos</p>
          <p style={{ fontSize: 'var(--font-lg)', fontWeight: 900, color: 'var(--success)' }}>{dishes.filter(d => d.is_active).length}</p>
        </div>
        <div className="card" style={{ flex: 1, minWidth: '100px', textAlign: 'center', padding: 'var(--spacing-sm) var(--spacing-md)' }}>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>Inactivos</p>
          <p style={{ fontSize: 'var(--font-lg)', fontWeight: 900, color: 'var(--text-secondary)' }}>{dishes.filter(d => !d.is_active).length}</p>
        </div>
        <div className="card" style={{ flex: 1, minWidth: '100px', textAlign: 'center', padding: 'var(--spacing-sm) var(--spacing-md)' }}>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>Total</p>
          <p style={{ fontSize: 'var(--font-lg)', fontWeight: 900 }}>{dishes.length}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por plato o categoría..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          key="search-menu"
          aria-label="Buscar plato"
          style={{ flex: '1', minWidth: '200px', maxWidth: '400px' }}
        />
        <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', fontWeight: 600 }}>Orden:</span>
        {[
          { id: 'name', label: 'Nombre' },
          { id: 'price', label: 'Precio' },
          { id: 'cost', label: 'Costo' },
          { id: 'margin', label: 'Ganancia' }
        ].map(s => (
          <button
            key={s.id}
            className={dishSort === s.id ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            onClick={() => {
              if (dishSort === s.id) {
                setDishSortDir(d => d === 'asc' ? 'desc' : 'asc')
              } else {
                setDishSort(s.id)
                setDishSortDir(s.id === 'name' ? 'asc' : 'desc')
              }
            }}
            style={{ fontSize: 'var(--font-sm)' }}
          >
            {s.label}
          </button>
        ))}
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setDishSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          style={{ fontSize: 'var(--font-md)', fontWeight: 900, padding: 'var(--spacing-xs) var(--spacing-sm)' }}
          aria-label="Cambiar dirección de orden"
        >
          {dishSortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
        </button>
      </div>

      {priceReview && !dismissedStale && (() => {
        const staleCount = priceReview.ingredients.filter(i => i.isStale).length
        if (!staleCount) return null
        const threshold = parseInt(localStorage.getItem('priceStalenessThreshold') || '30', 10)
        return (
          <div style={{
            background: 'var(--warning-light)',
            border: '1.5px solid var(--warning)',
            borderRadius: 'var(--radius)',
            padding: 'var(--spacing-sm) var(--spacing-md)',
            marginBottom: 'var(--spacing-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--spacing-md)'
          }}>
            <span style={{ fontWeight: 600, color: 'var(--warning)' }}>
              Hay ingredientes desactualizados. Actualizá sus precios en la sección Ingredientes antes de revisar los platos.
              <span style={{ fontWeight: 400, marginLeft: '8px' }}>
                ({staleCount} hace más de {threshold} días)
              </span>
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => setDismissedStale(true)} aria-label="Descartar">✕</button>
          </div>
        )
      })()}

      {priceReview && !dismissedPriceReview && priceReview.ingredients.filter(i => i.isStale).length === 0 && (() => {
        const threshold = parseInt(localStorage.getItem('priceStalenessThreshold') || '30', 10)
        const pendingDishes = priceReview.dishPrices.filter(dp => {
          if (!dp.last_price_review) return true
          return (Date.now() - new Date(dp.last_price_review).getTime()) / 86400000 >= threshold
        })
        if (pendingDishes.length === 0) return null
        return (
          <div className="card" style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--spacing-sm)'
            }}>
              <h3 style={{ margin: 0 }}>Revisión de precios ({pendingDishes.length})</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setDismissedPriceReview(true)} aria-label="Cerrar">✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {pendingDishes.sort((a, b) => a.margin - b.margin).slice(0, 20).map(dp => (
              <div key={dp.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--spacing-md)',
                padding: 'var(--spacing-xs) var(--spacing-sm)',
                borderRadius: 'var(--radius)',
                background: dp.margin < 20 ? 'var(--warning-light)' : dp.margin < 40 ? 'var(--bg-hover)' : 'var(--success-light)'
              }}>
                <span style={{ fontWeight: 600, flex: 1 }}>{dp.name}</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Costo: <strong>${dp.computedCost.toFixed(2)}</strong>
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Precio: <strong>${dp.price.toFixed(2)}</strong>
                </span>
                <span style={{
                  fontWeight: 700,
                  color: dp.margin >= 40 ? 'var(--success)' : dp.margin >= 20 ? 'var(--accent)' : 'var(--danger)'
                }}>
                  {dp.margin.toFixed(0)}%
                </span>
              </div>
              ))}
            </div>
          </div>
        )
      })()}

      {filteredDishes.length === 0 ? (
        <div className="empty-state card">
          <h3>{search ? 'Sin resultados' : 'No hay platos en el menú'}</h3>
          <p>{search ? 'Probá con otro término de búsqueda.' : 'Usá "+ Nuevo Plato" para crear tu primer plato con ingredientes y precios.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {filteredDishes.map(dish => (
            <div key={dish.id} className="card" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--spacing-md)',
              opacity: dish.is_active ? 1 : 0.5
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <h3 style={{ fontSize: 'var(--font-lg)', margin: 0 }}>{dish.name}</h3>
                  {dish.category && (
                    <span style={{
                      background: 'var(--primary-light)',
                      padding: '2px var(--spacing-sm)',
                      borderRadius: '100px',
                      fontSize: 'var(--font-sm)',
                      fontWeight: 600
                    }}>
                      {dish.category}
                    </span>
                  )}
                  {!dish.is_active && (
                    <span className="badge badge-warning" style={{ fontSize: 'var(--font-sm)' }}>
                      Inactivo
                    </span>
                  )}
                </div>
                <div style={{
                  display: 'flex',
                  gap: 'var(--spacing-md)',
                  marginTop: 'var(--spacing-xs)',
                  fontSize: 'var(--font-body)',
                  color: 'var(--text-secondary)',
                  flexWrap: 'wrap'
                }}>
                  {dish.price > 0 && (
                    <span>Precio: <strong>${dish.price.toFixed(2)}</strong></span>
                  )}
                  {dish.computedCost > 0 && (
                    <span>Costo: <strong>${dish.computedCost.toFixed(2)}</strong></span>
                  )}
                  {dish.price > 0 && dish.computedCost > 0 && (() => {
                    const m = (dish.price - dish.computedCost) / dish.price * 100
                    return (
                      <span style={{
                        color: m > 30 ? 'var(--success)' : m > 10 ? 'var(--accent)' : 'var(--danger)',
                        fontWeight: 700
                      }}>
                        Margen: {m.toFixed(0)}%
                      </span>
                    )
                  })()}
                </div>
                {dish.ingredients?.length > 0 && (
                  <details style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-xs)' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Ingredientes ({dish.ingredients.length})</summary>
                    <div style={{ marginTop: 'var(--spacing-xs)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {dish.ingredients.map((ing, i) => (
                        <div key={i}>
                          <span style={{ fontSize: 'var(--font-sm)' }}>
                            {ing.name && `${ing.name}: `}{ing.quantity} {ing.unit}{ing.subtotal > 0 ? ` ($${ing.subtotal.toFixed(2)})` : ''}
                          </span>
                          {ing.subIngredients && ing.subIngredients.length > 0 && (
                            <div style={{ marginLeft: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '1px' }}>
                              {ing.subIngredients.map((si, j) => (
                                <span key={j} style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                                  └ {si.name}: {(si.quantity * ing.quantity).toFixed(3)} {si.unit} (${(si.cost * si.quantity * ing.quantity).toFixed(2)})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                {(() => {
                  const reviewDate = dish.last_price_review
                  const threshold = parseInt(localStorage.getItem('priceStalenessThreshold') || '30', 10)
                  const isRecent = reviewDate && (Date.now() - new Date(reviewDate).getTime()) / 86400000 < threshold
                  return (
                    <button
                      className={`btn btn-sm ${isRecent ? 'btn-icon-confirm' : 'btn-icon-action'}`}
                      onClick={() => handleMarkDishUpdated(dish.id)}
                      disabled={isRecent}
                    >
                      {isRecent ? '✓ Actualizado' : 'Actualizar precio'}
                    </button>
                  )
                })()}
                <button className="btn btn-sm btn-icon-edit" onClick={() => openEdit(dish)} aria-label="Editar plato">Editar</button>
                <button className="btn btn-sm btn-icon-delete" onClick={() => handleDelete(dish.id)} aria-label="Eliminar plato">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Editar Plato' : 'Nuevo Plato'}
      >
        <div style={{ position: 'relative' }}>
          <div className="form-group">
          <label htmlFor="dish-name">Nombre del plato</label>
          <input
            id="dish-name"
            ref={firstInputRef}
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ej: Milanesa napolitana"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="dish-category">Categoría</label>
            <input
              id="dish-category"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              placeholder="Ej: Principal, Postre"
              list="categories"
            />
            <datalist id="categories">
              {categories.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="form-group">
            <label htmlFor="dish-price">Precio ($)</label>
              <input
                  id="dish-price"
                  type="text"
                  inputMode="decimal"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="0.00"
                />
          </div>
        </div>

        <div className="form-group">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--spacing-sm)'
          }}>
            <label htmlFor="add-ingredient-btn">Ingredientes</label>
            <button className="btn btn-outline btn-sm" onClick={addRow}>
              + Agregar ingrediente
            </button>
          </div>

          {activeIngredients.length === 0 && (
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
              No hay ingredientes cargados. Primero agregá ingredientes desde la sección "Ingredientes".
            </p>
          )}

          {form.ingredientRows.map((row, index) => {
            const ingInfo = row.ingredientId ? getIngredientInfo(row.ingredientId) : null
            const subtotal = calcRowSubtotal(row)
            return (
              <div key={row._key} style={{
                display: 'flex',
                gap: 'var(--spacing-sm)',
                alignItems: 'flex-end',
                marginBottom: 'var(--spacing-sm)'
              }}>
                <div style={{ flex: 2 }}>
                  {index === 0 && <label style={{ fontSize: 'var(--font-xs)', display: 'block' }}>Ingrediente</label>}
                  <select
                    value={row.ingredientId || ''}
                    onChange={e => updateRow(index, 'ingredientId', e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">— Seleccionar —</option>
                    {activeIngredients.map(ing => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} (${ing.cost.toFixed(2)}/{ing.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  {index === 0 && <label style={{ fontSize: 'var(--font-xs)', display: 'block' }}>Cantidad</label>}
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.quantity ?? ''}
                      onChange={e => updateRow(index, 'quantity', e.target.value)}
                      placeholder="0"
                      style={{ flex: 1 }}
                    />
                    {ingInfo && (
                      <select
                        value={row.displayUnit || ingInfo.unit}
                        onChange={e => updateRow(index, 'displayUnit', e.target.value)}
                        style={{ fontSize: 'var(--font-body)', width: '90px' }}
                      >
                        {getCompatibleUnits(ingInfo.unit).map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <div style={{ flex: 1, paddingBottom: 'var(--spacing-sm)' }}>
                  {index === 0 && <label style={{ fontSize: 'var(--font-xs)', display: 'block' }}>Subtotal</label>}
                  <span style={{
                    fontSize: 'var(--font-body)',
                    fontWeight: 700,
                    color: subtotal > 0 ? 'var(--text)' : 'var(--text-secondary)'
                  }}>
                    ${subtotal.toFixed(2)}
                  </span>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeRow(index)}
                  aria-label="Quitar ingrediente"
                  style={{ paddingBottom: 'var(--spacing-sm)', marginBottom: 0 }}
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>

        {(totalCost > 0 || dishPrice > 0) && (
          <div className="card" style={{
            padding: 'var(--spacing-md)',
            marginBottom: 'var(--spacing-md)',
            background: 'var(--primary-light)'
          }}>
            <div style={{ display: 'flex', gap: 'var(--spacing-lg)', flexWrap: 'wrap', fontSize: 'var(--font-body)' }}>
              {totalCost > 0 && (
                <span>Costo producción: <strong>${totalCost.toFixed(2)}</strong></span>
              )}
              {dishPrice > 0 && (
                <span>Precio venta: <strong>${dishPrice.toFixed(2)}</strong></span>
              )}
              {dishPrice > 0 && totalCost > 0 && (
                <span style={{
                  color: margin >= 30 ? 'var(--success)' : margin >= 10 ? 'var(--accent)' : 'var(--danger)',
                  fontWeight: 700
                }}>
                  Margen: {margin.toFixed(0)}% (${(dishPrice - totalCost).toFixed(2)})
                </span>
              )}
            </div>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="dish-active" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <input
              id="dish-active"
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              style={{ width: '24px', height: '24px' }}
            />
            Plato activo (visible en pedidos)
          </label>
        </div>

        <div className="form-actions">
          <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
          <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
            {editing ? 'Guardar cambios' : 'Crear plato'}
          </button>
        </div>
        </div>
      </Modal>
      <ConfirmPopup
        isOpen={showConfirmPopup}
        message="Plato guardado. ¿Cargar otro?"
        confirmLabel="Sí"
        onConfirm={handleContinueAdding}
        onCancel={handleStopAdding}
      />
      <ConfirmPopup
        isOpen={deleteConfirmId !== null}
        message="¿Eliminar este plato?"
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  )
}
