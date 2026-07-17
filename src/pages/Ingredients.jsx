import React, { useState, useEffect, useCallback, useRef } from 'react'
import Modal from '../components/Modal'
import ErrorBanner from '../components/ErrorBanner'
import ConfirmPopup from '../components/ConfirmPopup'
import { getCompatibleUnits, convertValue } from '../utils/units'
import { useToast } from '../components/ToastProvider'

export default function Ingredients() {
  const showToast = useToast()
  const savingRef = useRef(false)
  const itemKeyRef = useRef(0)
  const [saving, setSaving] = useState(false)
  const [justUpdatedId, setJustUpdatedId] = useState(null)
  const [ingredients, setIngredients] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', unit: 'uni', cost: '', category: '', is_active: true, subIngredients: [], batchYield: 1, package_qty: '', package_price: '' })
  const [error, setError] = useState(null)
  const [priceReview, setPriceReview] = useState(null)
  const [dismissedStale, setDismissedStale] = useState(false)
  const [showConfirmPopup, setShowConfirmPopup] = useState(false)
  const firstInputRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const [ing, pr] = await Promise.all([
        window.piu?.getIngredients() || Promise.resolve([]),
        window.piu?.getPriceReview(parseInt(localStorage.getItem('priceStalenessThreshold') || '30', 10)) || Promise.resolve(null)
      ])
      setIngredients(ing || [])
      setPriceReview(pr)
      setError(null)
    } catch (e) {
      setError('No se pudieron cargar los ingredientes.')
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (justUpdatedId !== null) {
      const t = setTimeout(() => setJustUpdatedId(null), 2000)
      return () => clearTimeout(t)
    }
  }, [justUpdatedId])

  const makeSubRow = (ingredientId = null, quantity = 0, displayUnit = null) => ({ _key: ++itemKeyRef.current, ingredientId, quantity, displayUnit })

  const dismissStaleBanner = () => setDismissedStale(true)

  const handleMarkUpdated = async (id) => {
    try {
      if (!window.piu?.markIngredientUpdated) return
      await window.piu.markIngredientUpdated(id)
      load()
      setJustUpdatedId(id)
      showToast('Costo actualizado', 'success')
    } catch (e) {
      console.error('Error updating ingredient cost:', e)
    }
  }

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', unit: 'uni', cost: '', category: '', is_active: true, subIngredients: [makeSubRow()], batchYield: 1, package_qty: '', package_price: '' })
    setShowModal(true)
  }

  const openEdit = (ing) => {
    setEditing(ing)
    setForm({
      name: ing.name,
      unit: ing.unit || 'uni',
      cost: ing.cost?.toString() || '',
      category: ing.category || '',
      is_active: !!ing.is_active,
      batchYield: ing.batchYield || 1,
      package_qty: ing.package_qty ? String(ing.package_qty) : '',
      package_price: ing.package_price ? String(ing.package_price) : '',
      subIngredients: (() => {
        const rows = (ing.subIngredients || []).map(si => {
          const subIng = ingredients.find(i => i.id === si.ingredientId)
          return { _key: ++itemKeyRef.current, ...si, displayUnit: subIng?.unit || null }
        })
        if (rows.length === 0 || rows[rows.length - 1].ingredientId) {
          rows.push(makeSubRow())
        }
        return rows
      })()
    })
    setShowModal(true)
  }

  const addSubRow = () => {
    setForm(f => ({ ...f, subIngredients: [...f.subIngredients, makeSubRow()] }))
  }

  const removeSubRow = (index) => {
    setForm(f => ({ ...f, subIngredients: f.subIngredients.filter((_, i) => i !== index) }))
  }

  const updateSubRow = (index, field, value) => {
    setForm(f => {
      const rows = [...f.subIngredients]
      if (field === 'ingredientId') {
        const ing = ingredients.find(i => i.id === value)
        rows[index] = { ...rows[index], ingredientId: value, displayUnit: ing?.unit || null }
        if (value && index === rows.length - 1) {
          rows.push(makeSubRow())
        }
      } else {
        rows[index] = { ...rows[index], [field]: value }
      }
      return { ...f, subIngredients: rows }
    })
  }

  const getIngInfo = (id) => ingredients.find(i => i.id === id)

  const calcSubTotal = () => {
    return form.subIngredients.reduce((sum, si) => {
      const ing = getIngInfo(si.ingredientId)
      if (!ing) return sum
      const rawQty = parseFloat(si.quantity) || 0
      const qtyInIngUnit = si.displayUnit
        ? convertValue(rawQty, si.displayUnit, ing.unit)
        : rawQty
      return sum + ing.cost * qtyInIngUnit
    }, 0)
  }

  const activeSimpleIngredients = ingredients.filter(i => i.is_active && (!i.subIngredients || i.subIngredients.length === 0))

  const handleSave = async () => {
    if (savingRef.current) return
    if (!form.name.trim()) return
    savingRef.current = true
    setSaving(true)
    const data = {
      name: form.name.trim(),
      unit: form.unit,
      cost: parseFloat(form.cost) || 0,
      category: form.category,
      is_active: form.is_active,
      package_qty: parseFloat(form.package_qty) || 0,
      package_price: parseFloat(form.package_price) || 0,
      batchYield: form.subIngredients.some(si => si.ingredientId) ? (parseFloat(form.batchYield) || 1) : 1,
      subIngredients: form.subIngredients
        .filter(si => si.ingredientId && parseFloat(si.quantity || '0') > 0)
        .map(si => {
          const ing = getIngInfo(si.ingredientId)
          const rawQty = parseFloat(si.quantity) || 0
          const qty = si.displayUnit && ing
            ? convertValue(rawQty, si.displayUnit, ing.unit)
            : rawQty
          return { ingredientId: si.ingredientId, quantity: qty }
        })
    }
    try {
      if (editing) {
        await window.piu?.updateIngredient({ id: editing.id, ...data })
        setShowModal(false)
      } else {
        await window.piu?.createIngredient(data)
        setShowConfirmPopup(true)
      }
      load()
      showToast('Ingrediente guardado', 'success')
    } catch (e) {
      setError('No se pudo guardar el ingrediente.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const handleContinueAdding = () => {
    setShowConfirmPopup(false)
    setForm({ name: '', unit: 'uni', cost: '', category: '', is_active: true, subIngredients: [makeSubRow()], batchYield: 1, package_qty: '', package_price: '' })
    requestAnimationFrame(() => {
      if (firstInputRef.current) firstInputRef.current.focus()
    })
  }

  const handleStopAdding = () => {
    setShowConfirmPopup(false)
    setShowModal(false)
  }

  const handleDelete = async (id) => {
    if (savingRef.current) return
    if (!confirm('¿Eliminar este ingrediente? Se eliminará de platos y sub-productos que lo usen.')) return
    savingRef.current = true
    setSaving(true)
    try {
      await window.piu?.deleteIngredient(id)
      load()
      showToast('Ingrediente eliminado', 'success')
    } catch (e) {
      setError('No se pudo eliminar el ingrediente.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const categories = [...new Set(ingredients.map(i => i.category).filter(Boolean))].sort()

  const q = search.toLowerCase()
  const filtered = ingredients
    .filter(i => !q || (i.name || '').toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q))
    .sort((a, b) => {
      const aComp = a.subIngredients?.length > 0 ? 0 : 1
      const bComp = b.subIngredients?.length > 0 ? 0 : 1
      if (aComp !== bComp) return aComp - bComp
      return a.name.localeCompare(b.name)
    })

  const fmtCost = (val) => {
    if (val === 0) return '0'
    if (val < 0.01) return val.toFixed(4)
    if (val < 1) return val.toFixed(3)
    return val.toFixed(2)
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--spacing-lg)'
      }}>
        <h2>Ingredientes</h2>
        <button className="btn btn-primary" onClick={openNew} style={{ width: '220px', fontSize: 'var(--font-body)' }}>
          + Ingrediente
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

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
              {staleCount} ingrediente{staleCount !== 1 ? 's' : ''} sin actualizar hace más de {threshold} días
            </span>
            <button className="btn btn-ghost btn-sm" onClick={dismissStaleBanner} aria-label="Descartar">✕</button>
          </div>
        )
      })()}

      <div style={{
        display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)',
        flexWrap: 'wrap'
      }}>
        <div className="card" style={{ flex: 1, minWidth: '100px', textAlign: 'center', padding: 'var(--spacing-sm) var(--spacing-md)' }}>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>Ingredientes</p>
          <p style={{ fontSize: 'var(--font-lg)', fontWeight: 900 }}>{ingredients.filter(i => !i.subIngredients || i.subIngredients.length === 0).length}</p>
        </div>
        <div className="card" style={{ flex: 1, minWidth: '100px', textAlign: 'center', padding: 'var(--spacing-sm) var(--spacing-md)' }}>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--accent)' }}>Sub-productos</p>
          <p style={{ fontSize: 'var(--font-lg)', fontWeight: 900, color: 'var(--accent)' }}>{ingredients.filter(i => i.subIngredients && i.subIngredients.length > 0).length}</p>
        </div>
        <div className="card" style={{ flex: 1, minWidth: '100px', textAlign: 'center', padding: 'var(--spacing-sm) var(--spacing-md)' }}>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>Total</p>
          <p style={{ fontSize: 'var(--font-lg)', fontWeight: 900 }}>{ingredients.length}</p>
        </div>
      </div>

      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <input
          type="text"
          placeholder="Buscar ingrediente o categoría..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          key="search-ingredients"
          aria-label="Buscar ingrediente"
          style={{ width: '100%', maxWidth: '400px' }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state card">
          <h3>{search ? 'Sin resultados' : 'No hay ingredientes cargados'}</h3>
          <p>{search ? 'Probá con otro término de búsqueda.' : 'Usá "+ Nuevo Ingrediente" para cargar ingredientes y sus costos unitarios.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {filtered.map(ing => {
            const isComposite = ing.subIngredients && ing.subIngredients.length > 0
            return (
              <div key={ing.id} className="card" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--spacing-md)',
                opacity: ing.is_active ? 1 : 0.5
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <h3 style={{ fontSize: 'var(--font-lg)', margin: 0 }}>
                      {ing.name}
                    </h3>
                    {ing.category && (
                      <span style={{
                        background: 'var(--primary-light)',
                        padding: '2px var(--spacing-sm)',
                        borderRadius: '100px',
                        fontSize: 'var(--font-sm)',
                        fontWeight: 600
                      }}>
                        {ing.category}
                      </span>
                    )}
                    {!ing.is_active && (
                      <span className="badge badge-warning" style={{ fontSize: 'var(--font-sm)' }}>
                        Inactivo
                      </span>
                    )}
                    {priceReview && (() => {
                      const ri = priceReview.ingredients.find(i => i.id === ing.id)
                      return ri?.isStale ? (
                        <span className="badge badge-warning" style={{ fontSize: 'var(--font-sm)' }}>
                          Hace {ri.daysSinceUpdate} días
                          {ri.staleSubNames && ri.staleSubNames.length > 0 && (
                            <span style={{ fontWeight: 400, marginLeft: '4px' }}>
                              ({ri.staleSubNames.join(', ')})
                            </span>
                          )}
                        </span>
                      ) : null
                    })()}
                    {isComposite && (
                      <span className="badge badge-info" style={{ fontSize: 'var(--font-sm)' }}>
                        Sub-producto
                      </span>
                    )}
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: 'var(--spacing-md)',
                    marginTop: 'var(--spacing-xs)',
                    fontSize: 'var(--font-body)',
                    color: 'var(--text-secondary)'
                  }}>
                    <span>Unidad: <strong>{ing.unit}</strong></span>
                    <span>
                      Costo: <strong>${fmtCost(ing.cost)}</strong> / {ing.unit}
                      {isComposite && <span style={{ fontStyle: 'italic', marginLeft: '4px' }}>(calculado)</span>}
                    </span>
                    {ing.package_qty > 0 && ing.package_price > 0 && (
                      <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                        Paquete: {ing.package_qty} × ${fmtCost(ing.package_price)}
                      </span>
                    )}
                  </div>
                  {isComposite && (
                    <details style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-xs)' }}>
                      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                        Sub-ingredientes ({ing.subIngredients.length})
                      </summary>
                      <div style={{ marginTop: 'var(--spacing-xs)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {ing.subIngredients.map((si, i) => {
                          const sub = getIngInfo(si.ingredientId)
                          return (
                            <span key={i} style={{ fontSize: 'var(--font-sm)' }}>
                              {sub ? `${sub.name}: ${fmtCost(si.quantity)} ${sub.unit}` : '(eliminado)'}
                              {sub ? ` ($${fmtCost(sub.cost * si.quantity)})` : ''}
                            </span>
                          )
                        })}
                      </div>
                    </details>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                    {justUpdatedId === ing.id ? (
                      <button className="btn btn-sm btn-icon-confirm" disabled>
                        ✓ Actualizado
                      </button>
                    ) : priceReview && (() => {
                      const ri = priceReview.ingredients.find(i => i.id === ing.id)
                      return ri?.isStale ? (
                        <button className="btn btn-sm btn-icon-action" onClick={() => handleMarkUpdated(ing.id)}>
                          Actualizar costo
                        </button>
                      ) : null
                    })()}
                  <button className="btn btn-sm btn-icon-edit" onClick={() => openEdit(ing)} aria-label="Editar ingrediente">Editar</button>
                  <button className="btn btn-sm btn-icon-delete" onClick={() => handleDelete(ing.id)} aria-label="Eliminar ingrediente">Eliminar</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
      >
        <div style={{ position: 'relative' }}>
          <div className="form-group">
          <label htmlFor="ing-name">Nombre del ingrediente</label>
          <input
            id="ing-name"
            ref={firstInputRef}
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ej: Harina 0000"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="ing-unit">Unidad</label>
            <select
              id="ing-unit"
              value={form.unit}
              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
            >
              {['kg', 'g', 'l', 'ml', 'uni', 'doc', 'cda', 'cdta', 'taza', 'pizca'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1.5 }}>
            <label htmlFor="ing-pkg-qty">Cant. del paquete</label>
            <input
              id="ing-pkg-qty"
              type="text"
              inputMode="decimal"
              value={form.package_qty}
              onChange={e => {
                const v = e.target.value
                const qty = parseFloat(v) || 0
                const pkgP = parseFloat(form.package_price) || 0
                const cost = (qty > 0 && pkgP > 0) ? String(pkgP / qty) : ''
                setForm(f => ({ ...f, package_qty: v, cost: cost || f.cost }))
              }}
              placeholder="Ej: 10"
              disabled={form.subIngredients.some(si => si.ingredientId)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="ing-pkg-price">Precio del paquete ($)</label>
            <input
              id="ing-pkg-price"
              type="text"
              inputMode="decimal"
              value={form.package_price}
              onChange={e => {
                const v = e.target.value
                const pkgP = parseFloat(v) || 0
                const qty = parseFloat(form.package_qty) || 0
                const cost = (qty > 0 && pkgP > 0) ? String(pkgP / qty) : ''
                setForm(f => ({ ...f, package_price: v, cost: cost || f.cost }))
              }}
              placeholder="Ej: 500"
              disabled={form.subIngredients.some(si => si.ingredientId)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="ing-cost">Costo por {form.unit} ($)</label>
            <input
              id="ing-cost"
              type="text"
              inputMode="decimal"
              value={form.cost}
              onChange={e => {
                setForm(f => ({ ...f, cost: e.target.value }))
              }}
              placeholder="0"
              disabled={form.subIngredients.some(si => si.ingredientId)}
            />
            {form.subIngredients.some(si => si.ingredientId) && (
              <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-xs)' }}>
                Costo auto-calculado: <strong>${fmtCost(calcSubTotal())}</strong> / {form.unit}
              </p>
            )}
          </div>
          {form.subIngredients.some(si => si.ingredientId) && (
            <div className="form-group">
              <label htmlFor="ing-batch-yield">Rendimiento ({form.unit})</label>
              <input
                id="ing-batch-yield"
                type="text"
                inputMode="numeric"
                value={form.batchYield || ''}
                onChange={e => {
                  const raw = e.target.value
                  if (raw === '' || raw === '.') {
                    setForm(f => ({ ...f, batchYield: raw }))
                    return
                  }
                  const num = parseFloat(raw)
                  if (!isNaN(num)) {
                    setForm(f => ({ ...f, batchYield: num }))
                  }
                }}
                placeholder="1"
              />
              <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-xs)' }}>
                Unidades que produce esta receta
              </p>
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="ing-category">Categoría</label>
          <input
            id="ing-category"
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            placeholder="Ej: Secos, Lácteos, Carnes"
            list="categories-ing"
          />
          <datalist id="categories-ing">
            {categories.map(c => <option key={c} value={c} />)}
          </datalist>
          <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-xs)' }}>
            Usada para agrupar ingredientes similares.
          </p>
        </div>

        <div className="form-group">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--spacing-sm)'
          }}>
            <label>Sub-productos</label>
            <button className="btn btn-outline btn-sm" onClick={addSubRow}>
              + Agregar sub-ingrediente
            </button>
          </div>
          <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
            Si este ingrediente está compuesto por otros, agregalos abajo. El costo se calculará automáticamente.
          </p>

          {form.subIngredients.map((si, index) => {
            const siInfo = si.ingredientId ? getIngInfo(si.ingredientId) : null
            const rawSiQty = parseFloat(si.quantity) || 0
            const siQtyInUnit = siInfo && si.displayUnit
              ? convertValue(rawSiQty, si.displayUnit, siInfo.unit)
              : rawSiQty
            const siSubtotal = siInfo ? siInfo.cost * siQtyInUnit : 0
            return (
              <div key={si._key} style={{
                display: 'flex',
                gap: 'var(--spacing-sm)',
                alignItems: 'flex-end',
                marginBottom: 'var(--spacing-sm)'
              }}>
                <div style={{ flex: 2 }}>
                  {index === 0 && <label style={{ fontSize: 'var(--font-xs)', display: 'block' }}>Ingrediente</label>}
                  <select
                    value={si.ingredientId || ''}
                    onChange={e => updateSubRow(index, 'ingredientId', e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">— Seleccionar —</option>
                    {activeSimpleIngredients.map(ing => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} (${fmtCost(ing.cost)}/{ing.unit})
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
                      value={si.quantity ?? ''}
                      onChange={e => updateSubRow(index, 'quantity', e.target.value)}
                      placeholder="0"
                      style={{ flex: 1 }}
                    />
                    {siInfo && (
                      <select
                        value={si.displayUnit || siInfo.unit}
                        onChange={e => updateSubRow(index, 'displayUnit', e.target.value)}
                        style={{ fontSize: 'var(--font-body)', width: '90px' }}
                      >
                        {getCompatibleUnits(siInfo.unit).map(u => (
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
                    color: siSubtotal > 0 ? 'var(--text)' : 'var(--text-secondary)'
                  }}>
                    ${fmtCost(siSubtotal)}
                  </span>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeSubRow(index)}
                  aria-label="Quitar sub-ingrediente"
                  style={{ paddingBottom: 'var(--spacing-sm)', marginBottom: 0 }}
                >
                  ✕
                </button>
              </div>
            )
          })}
          {form.subIngredients.some(si => si.ingredientId) && (
            <div style={{
              padding: 'var(--spacing-sm)',
              background: 'var(--primary-light)',
              borderRadius: 'var(--radius)',
              fontSize: 'var(--font-body)',
              fontWeight: 700,
              marginTop: 'var(--spacing-xs)'
            }}>
              Costo total calculado: ${fmtCost(calcSubTotal())} / {form.unit}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="ing-active" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <input
              id="ing-active"
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              style={{ width: '24px', height: '24px' }}
            />
            Ingrediente activo
          </label>
        </div>

        <div className="form-actions">
          <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
          <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
            {editing ? 'Guardar cambios' : 'Crear ingrediente'}
          </button>
        </div>
        </div>
      </Modal>
      <ConfirmPopup
        isOpen={showConfirmPopup}
        message="Ingrediente guardado. ¿Cargar otro?"
        confirmLabel="Sí"
        onConfirm={handleContinueAdding}
        onCancel={handleStopAdding}
      />
    </div>
  )
}
