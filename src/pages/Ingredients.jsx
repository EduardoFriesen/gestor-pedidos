import React, { useState, useEffect, useCallback } from 'react'
import Modal from '../components/Modal'

const UNITS = ['kg', 'g', 'l', 'ml', 'uni', 'doc']

export default function Ingredients() {
  const [ingredients, setIngredients] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', unit: 'uni', cost: '', category: '', is_active: true })

  const load = useCallback(() => {
    window.piu?.getIngredients().then(setIngredients)
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', unit: 'uni', cost: '', category: '', is_active: true })
    setShowModal(true)
  }

  const openEdit = (ing) => {
    setEditing(ing)
    setForm({
      name: ing.name,
      unit: ing.unit || 'uni',
      cost: ing.cost?.toString() || '',
      category: ing.category || '',
      is_active: !!ing.is_active
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    const data = {
      name: form.name.trim(),
      unit: form.unit,
      cost: parseFloat(form.cost) || 0,
      category: form.category,
      is_active: form.is_active
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
    if (confirm('¿Eliminar este ingrediente? No se eliminará de los platos que lo usen.')) {
      await window.piu?.deleteIngredient(id)
      load()
    }
  }

  const categories = [...new Set(ingredients.map(i => i.category).filter(Boolean))].sort()

  const q = search.toLowerCase()
  const filtered = ingredients.filter(i =>
    !q || (i.name || '').toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q)
  )

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
          {filtered.map(ing => (
            <div key={ing.id} className="card" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--spacing-md)',
              opacity: ing.is_active ? 1 : 0.5
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <h3 style={{ fontSize: 'var(--font-lg)', margin: 0 }}>{ing.name}</h3>
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
                </div>
                <div style={{
                  display: 'flex',
                  gap: 'var(--spacing-md)',
                  marginTop: 'var(--spacing-xs)',
                  fontSize: 'var(--font-body)',
                  color: 'var(--text-secondary)'
                }}>
                  <span>Unidad: <strong>{ing.unit}</strong></span>
                  <span>Costo: <strong>${ing.cost.toFixed(2)}</strong> / {ing.unit}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(ing)} aria-label="Editar ingrediente">✏️</button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(ing.id)} aria-label="Eliminar ingrediente">🗑️</button>
              </div>
            </div>
          ))}
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
              {UNITS.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Costo por unidad ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.cost}
              onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
              placeholder="0.00"
            />
          </div>
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
