import React, { useState, useEffect, useCallback } from 'react'
import Modal from '../components/Modal'
import { getCompatibleUnits, convertValue } from '../utils/units'

export default function Menu() {
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

  const load = useCallback(() => {
    window.piu?.getDishes().then(setDishes)
    window.piu?.getIngredients().then(setAllIngredients)
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', category: '', price: '', ingredientRows: [{ ingredientId: null, quantity: 0, displayUnit: null }], is_active: true })
    setShowModal(true)
  }

  const openEdit = (dish) => {
    setEditing(dish)
    const rows = (dish.ingredients || []).length > 0
      ? dish.ingredients.map(i => {
          const ing = allIngredients.find(x => x.id === i.ingredientId)
          return { ingredientId: i.ingredientId, quantity: i.quantity, displayUnit: ing?.unit || null }
        })
      : [{ ingredientId: null, quantity: 0, displayUnit: null }]
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
    setForm(f => ({ ...f, ingredientRows: [...f.ingredientRows, { ingredientId: null, quantity: 0, displayUnit: null }] }))
  }

  const removeRow = (index) => {
    setForm(f => {
      const rows = f.ingredientRows.filter((_, i) => i !== index)
      return { ...f, ingredientRows: rows.length === 0 ? [{ ingredientId: null, quantity: 0 }] : rows }
    })
  }

  const updateRow = (index, field, value) => {
    setForm(f => {
      const rows = [...f.ingredientRows]
      if (field === 'ingredientId') {
        const ing = allIngredients.find(i => i.id === value)
        rows[index] = { ingredientId: value, quantity: rows[index].quantity, displayUnit: ing?.unit || null }
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
    if (!form.name.trim()) return
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
    if (editing) {
      await window.piu?.updateDish({ id: editing.id, ...data })
    } else {
      await window.piu?.createDish(data)
    }
    setShowModal(false)
    load()
  }

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar este plato?')) {
      await window.piu?.deleteDish(id)
      load()
    }
  }

  const categories = [...new Set(dishes.map(d => d.category).filter(Boolean))].sort()
  const activeIngredients = allIngredients.filter(i => i.is_active)

  const q = search.toLowerCase()
  const filteredDishes = dishes.filter(d =>
    !q || (d.name || '').toLowerCase().includes(q) || (d.category || '').toLowerCase().includes(q)
  )

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--spacing-lg)'
      }}>
        <h2>Menú</h2>
        <button className="btn btn-primary btn-lg" onClick={openNew}>
          + Nuevo Plato
        </button>
      </div>

      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <input
          type="text"
          placeholder="Buscar por plato o categoría..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          key="search-menu"
          aria-label="Buscar plato"
          style={{ width: '100%', maxWidth: '400px' }}
        />
      </div>

      {filteredDishes.length === 0 ? (
        <div className="empty-state card">
          <h3>{search ? 'Sin resultados' : 'No hay platos en el menú'}</h3>
          <p>{search ? 'Probá con otro término de búsqueda.' : 'Agregá platos para empezar a recibir pedidos.'}</p>
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
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(dish)} aria-label="Editar plato">✏️</button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(dish.id)} aria-label="Eliminar plato">🗑️</button>
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
        <div className="form-group">
          <label>Nombre del plato</label>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ej: Milanesa napolitana"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Categoría</label>
            <input
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
            <label>Precio ($)</label>
              <input
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
            <label>Ingredientes</label>
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
              <div key={index} style={{
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
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <input
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
          <button className="btn btn-primary btn-lg" onClick={handleSave}>
            {editing ? 'Guardar cambios' : 'Crear plato'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
