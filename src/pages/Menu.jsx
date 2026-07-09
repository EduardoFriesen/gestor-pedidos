import React, { useState, useEffect, useCallback } from 'react'
import Modal from '../components/Modal'

export default function Menu() {
  const [dishes, setDishes] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', category: '', price: '', ingredients: '', is_active: true })

  const load = useCallback(() => {
    window.piu?.getDishes().then(setDishes)
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', category: '', price: '', ingredients: '', is_active: true })
    setShowModal(true)
  }

  const openEdit = (dish) => {
    setEditing(dish)
    setForm({
      name: dish.name,
      category: dish.category || '',
      price: dish.price?.toString() || '',
      ingredients: dish.ingredients || '',
      is_active: !!dish.is_active
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    const data = {
      name: form.name.trim(),
      category: form.category,
      price: parseFloat(form.price) || 0,
      ingredients: form.ingredients,
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
                {dish.price > 0 && (
                  <p style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-xs)' }}>
                    ${dish.price.toFixed(2)}
                  </p>
                )}
                {dish.ingredients && (
                  <details style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-xs)' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Ingredientes</summary>
                    <pre style={{ whiteSpace: 'pre-wrap', marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-sm)' }}>
                      {dish.ingredients}
                    </pre>
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
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Ingredientes</label>
          <textarea
            value={form.ingredients}
            onChange={e => setForm(f => ({ ...f, ingredients: e.target.value }))}
            rows={4}
            placeholder={"Ej:\nPapa: 1 kg\nCarne picada: 500 g\nCebolla: 2 uni"}
          />
          <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-xs)' }}>
            Formato: ingrediente: cantidad (uno por línea). Se usa para la lista de compras.
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
