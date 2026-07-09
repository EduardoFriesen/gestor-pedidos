import React, { useState, useEffect, useCallback } from 'react'
import Modal from '../components/Modal'

export default function Clients() {
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', last_name: '', phone: '', address: '', notes: '' })

  const load = useCallback(() => {
    window.piu?.getClients().then(c => setClients(c || []))
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', last_name: '', phone: '', address: '', notes: '' })
    setShowModal(true)
  }

  const openEdit = (client) => {
    setEditing(client)
    setForm({
      name: client.name,
      last_name: client.last_name || '',
      phone: client.phone || '',
      address: client.address || '',
      notes: client.notes || ''
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    const data = {
      name: form.name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      notes: form.notes.trim()
    }
    if (editing) {
      await window.piu?.updateClient({ id: editing.id, ...data })
    } else {
      await window.piu?.createClient(data)
    }
    setShowModal(false)
    load()
  }

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar este cliente?')) {
      await window.piu?.deleteClient(id)
      load()
    }
  }

  const q = search.toLowerCase()
  const filteredClients = (clients || []).filter(c =>
    !q || (c.name || '').toLowerCase().includes(q) || (c.last_name || '').toLowerCase().includes(q)
  )

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--spacing-lg)'
      }}>
        <h2>Clientes</h2>
        <button className="btn btn-primary btn-lg" onClick={openNew}>
          + Nuevo Cliente
        </button>
      </div>

      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <input
          type="text"
          placeholder="Buscar cliente por nombre o apellido..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          key="search-clients"
          aria-label="Buscar cliente"
          style={{ width: '100%', maxWidth: '400px' }}
        />
      </div>

      {filteredClients.length === 0 ? (
        <div className="empty-state card">
          <h3>{search ? 'Sin resultados' : 'No hay clientes registrados'}</h3>
          <p>{search ? 'Probá con otro término de búsqueda.' : 'Agregá clientes para poder tomar pedidos.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {filteredClients.map(client => (
            <div key={client.id} className="card" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--spacing-md)'
            }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 'var(--font-lg)', margin: 0 }}>
                  {client.name} {client.last_name}
                </h3>
                <div style={{
                  display: 'flex',
                  gap: 'var(--spacing-lg)',
                  fontSize: 'var(--font-body)',
                  color: 'var(--text-secondary)',
                  marginTop: 'var(--spacing-xs)'
                }}>
                  {client.phone && <span>📞 {client.phone}</span>}
                  {client.address && <span>📍 {client.address}</span>}
                </div>
                {client.notes && (
                  <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-xs)' }}>
                    📝 {client.notes}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(client)} aria-label="Editar cliente">✏️</button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(client.id)} aria-label="Eliminar cliente">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Editar Cliente' : 'Nuevo Cliente'}
      >
        <div className="form-row">
          <div className="form-group">
            <label>Nombre</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Nombre"
            />
          </div>
          <div className="form-group">
            <label>Apellido</label>
            <input
              value={form.last_name}
              onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
              placeholder="Apellido"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Teléfono</label>
          <input
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="Ej: 11 5555 6666"
            type="tel"
          />
        </div>

        <div className="form-group">
          <label>Dirección</label>
          <input
            value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            placeholder="Calle, número, localidad"
          />
        </div>

        <div className="form-group">
          <label>Notas</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={3}
            placeholder="Preferencias, observaciones..."
          />
        </div>

        <div className="form-actions">
          <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
          <button className="btn btn-primary btn-lg" onClick={handleSave}>
            {editing ? 'Guardar cambios' : 'Crear cliente'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
