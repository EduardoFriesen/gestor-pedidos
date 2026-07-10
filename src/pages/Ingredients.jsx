import React, { useState, useEffect, useCallback } from 'react'
import Modal from '../components/Modal'
import { getCompatibleUnits, convertValue } from '../utils/units'

export default function Ingredients() {
  const [ingredients, setIngredients] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', unit: 'uni', cost: '', category: '', is_active: true, subIngredients: [], batchYield: 1 })

  const load = useCallback(() => {
    window.piu?.getIngredients().then(setIngredients)
  }, [])

  useEffect(() => { load() }, [load])

  const getResolvedCostDisplay = async (ingId) => {
    if (!window.piu?.getResolvedCost) return null
    return window.piu.getResolvedCost(ingId)
  }

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', unit: 'uni', cost: '', category: '', is_active: true, subIngredients: [{ ingredientId: null, quantity: 0, displayUnit: null }], batchYield: 1 })
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
      subIngredients: (() => {
        const rows = (ing.subIngredients || []).map(si => {
          const subIng = ingredients.find(i => i.id === si.ingredientId)
          return { ...si, displayUnit: subIng?.unit || null }
        })
        if (rows.length === 0 || rows[rows.length - 1].ingredientId) {
          rows.push({ ingredientId: null, quantity: 0, displayUnit: null })
        }
        return rows
      })()
    })
    setShowModal(true)
  }

  const addSubRow = () => {
    setForm(f => ({ ...f, subIngredients: [...f.subIngredients, { ingredientId: null, quantity: 0, displayUnit: null }] }))
  }

  const removeSubRow = (index) => {
    setForm(f => ({ ...f, subIngredients: f.subIngredients.filter((_, i) => i !== index) }))
  }

  const updateSubRow = (index, field, value) => {
    setForm(f => {
      const rows = [...f.subIngredients]
      if (field === 'ingredientId') {
        const ing = ingredients.find(i => i.id === value)
        rows[index] = { ingredientId: value, quantity: rows[index].quantity, displayUnit: ing?.unit || null }
        if (value && index === rows.length - 1) {
          rows.push({ ingredientId: null, quantity: 0, displayUnit: null })
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
    if (!form.name.trim()) return
    const data = {
      name: form.name.trim(),
      unit: form.unit,
      cost: parseFloat(form.cost) || 0,
      category: form.category,
      is_active: form.is_active,
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
    if (editing) {
      await window.piu?.updateIngredient({ id: editing.id, ...data })
    } else {
      await window.piu?.createIngredient(data)
    }
    setShowModal(false)
    load()
  }

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar este ingrediente? Se eliminará de platos y sub-productos que lo usen.')) {
      await window.piu?.deleteIngredient(id)
      load()
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
        <button className="btn btn-primary btn-lg" onClick={openNew}>
          + Nuevo Ingrediente
        </button>
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
          <p>{search ? 'Probá con otro término de búsqueda.' : 'Agregá ingredientes para usarlos en los platos y calcular costos.'}</p>
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
                      {isComposite && <span style={{ marginRight: '4px' }}>🧩</span>}
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
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(ing)} aria-label="Editar ingrediente">✏️</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(ing.id)} aria-label="Eliminar ingrediente">🗑️</button>
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
        <div className="form-group">
          <label>Nombre del ingrediente</label>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ej: Harina 0000"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Unidad</label>
            <select
              value={form.unit}
              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
            >
              {['kg', 'g', 'l', 'ml', 'uni', 'doc', 'cda', 'cdta', 'taza', 'pizca'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Costo por unidad ($)</label>
            <input
              type="text"
              inputMode="decimal"
              value={form.cost}
              onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
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
              <label>Rendimiento ({form.unit})</label>
              <input
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
          <label>Categoría</label>
          <input
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
              <div key={index} style={{
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
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <input
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
          <button className="btn btn-primary btn-lg" onClick={handleSave}>
            {editing ? 'Guardar cambios' : 'Crear ingrediente'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
