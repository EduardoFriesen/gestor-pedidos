import React, { useState, useEffect, useCallback } from 'react'
import Modal from '../components/Modal'
import PdfViewer from '../components/PdfViewer'
import { generarEtiquetasDelivery } from '../utils/pdf'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [dishes, setDishes] = useState([])
  const [clients, setClients] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [week, setWeek] = useState(null)
  const [ordersOpen, setOrdersOpen] = useState(true)
  const [form, setForm] = useState({ clientId: '', notes: '', items: [{ dishId: '', quantity: 1 }], has_delivery: false, delivery_fee: 500 })
  const [defaultDeliveryFee, setDefaultDeliveryFee] = useState(500)
  const [showWeekSelector, setShowWeekSelector] = useState(false)
  const [pdfPreview, setPdfPreview] = useState(null)
  const [alternateWeek, setAlternateWeek] = useState(null)
  const [orderSearch, setOrderSearch] = useState('')
  const [showUnpackedOnly, setShowUnpackedOnly] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [newClientForm, setNewClientForm] = useState({ name: '', last_name: '', phone: '', address: '', notes: '' })
  const [showClientDropdown, setShowClientDropdown] = useState(false)

  const load = useCallback(() => {
    Promise.all([
      (window.piu?.getOrders() || Promise.resolve([])).catch(() => []),
      (window.piu?.getDishes() || Promise.resolve([])).catch(() => []),
      (window.piu?.getClients() || Promise.resolve([])).catch(() => []),
      (window.piu?.getCurrentWeek() || Promise.resolve(null)).catch(() => null),
      (window.piu?.isOrdersOpen() || Promise.resolve(true)).catch(() => true),
      (window.piu?.getDefaultDeliveryFee() || Promise.resolve(500)).catch(() => 500)
    ]).then(([o, d, c, w, isOpen, fee]) => {
      setOrders(o || [])
      setDishes((d || []).filter(d => d && d.is_active))
      setClients(c || [])
      setWeek(w)
      setOrdersOpen(isOpen)
      if (fee !== undefined) setDefaultDeliveryFee(fee)
    })
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!showModal) {
      setShowClientDropdown(false)
      setClientSearch('')
      setShowNewClientModal(false)
    }
  }, [showModal])

  const handleCloseModal = useCallback(() => setShowModal(false), [])

  const activeDishes = dishes.filter(d => d.is_active)

  const openNew = async () => {
    const isOpen = await window.piu?.isOrdersOpen()
    setOrdersOpen(isOpen)

    if (!isOpen) {
      const resp = await window.piu?.getCurrentWeek()
      const nextWeekDate = new Date(resp.week_start)
      nextWeekDate.setDate(nextWeekDate.getDate() + 7)
      const fmt = (dt) => {
        const y = dt.getFullYear()
        const m = String(dt.getMonth() + 1).padStart(2, '0')
        const d = String(dt.getDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
      }
      const nextStart = fmt(nextWeekDate)
      const weeks = await window.piu?.getPreviousWeeks() || []
      const currentWeekStart = resp.week_start

      setAlternateWeek({ current: currentWeekStart, next: nextStart })
      setShowWeekSelector(true)
      return
    }

    setEditing(null)
    setForm({ clientId: '', notes: '', items: [{ dishId: '', quantity: 1 }], has_delivery: false, delivery_fee: defaultDeliveryFee })
    setShowModal(true)
  }

  const handleWeekChoice = (choice) => {
    setShowWeekSelector(false)
    if (choice === 'cancel') return
    setEditing(null)
    setForm({ clientId: '', notes: '', items: [{ dishId: '', quantity: 1 }], has_delivery: false, delivery_fee: defaultDeliveryFee, targetWeek: choice })
    setShowModal(true)
  }

  const openEdit = (order) => {
    setEditing(order)
    setForm({
      clientId: order.client_id,
      notes: order.notes || '',
      items: order.items?.map(i => ({ dishId: i.dish_id, quantity: i.quantity })) || [{ dishId: '', quantity: 1 }],
      has_delivery: !!order.has_delivery,
      delivery_fee: order.delivery_fee || defaultDeliveryFee
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.clientId || form.items.length === 0 || !form.items[0].dishId) return
    const data = {
      clientId: parseInt(form.clientId),
      weekId: week.id,
      items: form.items.filter(i => i.dishId).map(i => ({ dishId: parseInt(i.dishId), quantity: parseInt(i.quantity) || 1 })),
      notes: form.notes,
      has_delivery: form.has_delivery,
      delivery_fee: Number(form.delivery_fee) || 0
    }
    if (!editing && (await window.piu?.clientHasOrderThisWeek(parseInt(form.clientId)))) {
      const c = clients.find(x => x.id === parseInt(form.clientId))
      const name = c ? `${c.name} ${c.last_name}` : 'el cliente'
      if (!confirm(`⚠️ ${name} ya tiene un pedido esta semana. ¿Crear de todas formas?`)) return
    }
    if (editing) {
      await window.piu?.updateOrder({ id: editing.id, ...data })
    } else {
      await window.piu?.createOrder(data)
    }
    setShowModal(false)
    load()
  }

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar este pedido?')) {
      await window.piu?.deleteOrder(id)
      load()
    }
  }

  const handleAssemble = async (id) => {
    await window.piu?.markOrderAssembled(id)
    load()
  }

  const handleUnassemble = async (id) => {
    if (confirm('¿Desempaquetar este pedido? Volverá a estado Confirmado.')) {
      await window.piu?.unmarkOrderAssembled(id)
      load()
    }
  }

  const handlePrintLabelsView = async () => {
    const weekData = await window.piu?.getCurrentWeek()
    const allOrders = await window.piu?.getOrdersByWeekId(weekData.id)
    if (!allOrders || allOrders.length === 0) {
      alert('No hay pedidos para esta semana.')
      return
    }
    const doc = generarEtiquetasDelivery(allOrders)
    setPdfPreview(doc)
  }

  const addItem = () => {
    setForm(f => ({ ...f, items: [...f.items, { dishId: '', quantity: 1 }] }))
  }

  const removeItem = (idx) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  const updateItem = (idx, field, value) => {
    setForm(f => {
      const items = [...f.items]
      if (field === 'dishId' && value) {
        const alreadyExists = items.some((item, i) => i !== idx && item.dishId === value)
        if (alreadyExists) {
          alert('Ese plato ya está cargado en este pedido. Si querés más cantidad, aumentá la cantidad del existente.')
          return f
        }
      }
      items[idx] = { ...items[idx], [field]: value }
      if (field === 'dishId' && value && idx === items.length - 1) {
        items.push({ dishId: '', quantity: 1 })
      }
      return { ...f, items }
    })
  }

  const getClientName = (clientId) => {
    const c = clients.find(x => x.id === clientId)
    return c ? `${c.name} ${c.last_name}` : '—'
  }

  const oq = orderSearch.toLowerCase()
  const filteredOrders = (orders || []).filter(o => {
    if (oq && !(o.client_name || '').toLowerCase().includes(oq) &&
        !(o.items || []).some(i => (i.dish_name || '').toLowerCase().includes(oq))) return false
    if (showUnpackedOnly && o.status === 'assembled') return false
    if (showUnpackedOnly && o.status === 'delivered') return false
    return true
  })
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const w = (s) => s === 'pending' || s === 'confirmed' ? 0 : s === 'assembled' ? 1 : 2
    const diff = w(a.status) - w(b.status)
    if (diff !== 0) return diff
    const aQty = (a.items || []).reduce((s, i) => s + (i.quantity || 0), 0)
    const bQty = (b.items || []).reduce((s, i) => s + (i.quantity || 0), 0)
    return bQty - aQty
  })

  const selectedClientName = form.clientId
    ? clients.find(c => c.id === parseInt(form.clientId))
    : null

  const cq = clientSearch.toLowerCase()
  const filteredClientOptions = (clients || []).filter(c =>
    !cq || (c.name || '').toLowerCase().includes(cq) || (c.last_name || '').toLowerCase().includes(cq)
  )

  const handleNewClientSave = async () => {
    if (!newClientForm.name.trim()) return
    const data = {
      name: newClientForm.name.trim(),
      last_name: newClientForm.last_name.trim(),
      phone: newClientForm.phone.trim(),
      address: newClientForm.address.trim(),
      notes: newClientForm.notes.trim()
    }
    const result = await window.piu?.createClient(data)
    if (result?.success) {
      const updatedClients = await window.piu?.getClients()
      setClients(updatedClients || [])
      setForm(f => ({ ...f, clientId: result.id }))
    }
    setShowNewClientModal(false)
    setNewClientForm({ name: '', last_name: '', phone: '', address: '', notes: '' })
    setClientSearch('')
    setShowClientDropdown(false)
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--spacing-lg)'
      }}>
        <h2>Pedidos</h2>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <button className="btn btn-outline" onClick={handlePrintLabelsView}>
            🏷️ Etiquetas
          </button>
          <button className="btn btn-primary btn-lg" onClick={openNew}>
            + Nuevo Pedido
          </button>
        </div>
      </div>

      <WeekSelector
        open={showWeekSelector}
        onChoice={handleWeekChoice}
        currentStart={alternateWeek?.current}
        nextStart={alternateWeek?.next}
      />

      <div style={{
        display: 'flex',
        gap: 'var(--spacing-sm)',
        marginBottom: 'var(--spacing-md)',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <input
          type="text"
          placeholder="Buscar por cliente o plato..."
          value={orderSearch}
          onChange={e => setOrderSearch(e.target.value)}
          key="search-orders"
          aria-label="Buscar pedido"
          style={{ flex: '1', minWidth: '200px', maxWidth: '400px' }}
        />
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-xs)',
          fontSize: 'var(--font-body)',
          cursor: 'pointer',
          userSelect: 'none'
        }}>
          <input
            type="checkbox"
            checked={showUnpackedOnly}
            onChange={e => setShowUnpackedOnly(e.target.checked)}
            style={{ width: '24px', height: '24px' }}
          />
          Solo sin empaquetar
        </label>
      </div>

      {sortedOrders.length === 0 ? (
        <div className="empty-state card">
          <h3>{orderSearch || showUnpackedOnly ? 'Sin resultados' : 'No hay pedidos esta semana'}</h3>
          <p>{orderSearch || showUnpackedOnly ? 'Probá con otros filtros.' : 'Presioná + Nuevo Pedido para empezar.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {sortedOrders.map(order => (
            <div key={order.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--font-lg)', margin: 0 }}>
                    {order.client_name}
                  </h3>
                  <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                    {order.client_phone && `📞 ${order.client_phone}`}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
                  <span className={`badge ${order.status === 'delivered' ? 'badge-success' : order.status === 'assembled' ? 'badge-success' : order.status === 'confirmed' ? 'badge-warning' : 'badge-warning'}`}
                    style={{ fontSize: 'var(--font-sm)' }}>
                    {order.status === 'pending' ? 'Pendiente' : order.status === 'confirmed' ? 'Confirmado' : order.status === 'assembled' ? 'Ensamblado' : 'Entregado'}
                  </span>
                  {(order.status === 'pending' || order.status === 'confirmed') && (
                    <button className="btn btn-success btn-sm" onClick={() => handleAssemble(order.id)} aria-label="Marcar como ensamblado">
                      📦
                    </button>
                  )}
                  {order.status === 'assembled' && (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleUnassemble(order.id)} aria-label="Desempaquetar">
                      ↩ Desempaquetar
                    </button>
                  )}
                  {(order.status === 'pending' || order.status === 'confirmed') && (
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(order)} aria-label="Editar pedido">
                        ✏️
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(order.id)} aria-label="Eliminar pedido">
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                {order.items?.map((item, i) => (
                  <span key={i} style={{
                    background: 'var(--primary-light)',
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    borderRadius: 'var(--radius)',
                    fontSize: 'var(--font-body)',
                    fontWeight: 700
                  }}>
                    {item.dish_name} ×{item.quantity}
                  </span>
                ))}
                {order.has_delivery && (
                  <span style={{
                    background: 'var(--accent-light)',
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    borderRadius: 'var(--radius)',
                    fontSize: 'var(--font-body)',
                    fontWeight: 700
                  }}>
                    Envío $${order.delivery_fee || 0}
                  </span>
                )}
              </div>
              {order.notes && (
                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                  📝 {order.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editing ? 'Editar Pedido' : 'Nuevo Pedido'}
      >
        <div className="form-group" style={{ position: 'relative' }}>
          <label>Cliente</label>
          {selectedClientName ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              padding: 'var(--spacing-sm)',
              background: 'var(--primary-light)',
              borderRadius: 'var(--radius)'
            }}>
              <span style={{ flex: 1, fontWeight: 700 }}>
                {selectedClientName.name} {selectedClientName.last_name}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setForm(f => ({ ...f, clientId: '' }))
                  setClientSearch('')
                }}
                aria-label="Cambiar cliente"
              >
                ✕
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={clientSearch}
                onChange={e => {
                  setClientSearch(e.target.value)
                  setShowClientDropdown(true)
                }}
                onFocus={() => setShowClientDropdown(true)}
                aria-label="Buscar cliente"
              />
              {showClientDropdown && (
                <>
                  <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 45,
                    background: 'transparent'
                  }} onClick={() => setShowClientDropdown(false)} />
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'var(--bg)',
                    border: '2px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    zIndex: 50,
                    marginTop: '4px'
                  }}>
                  {filteredClientOptions.length === 0 ? (
                    <div style={{ padding: 'var(--spacing-sm)' }}>
                      <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                        No se encontraron clientes
                      </p>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          setShowNewClientModal(true)
                          setShowClientDropdown(false)
                        }}
                      >
                        + Nuevo Cliente
                      </button>
                    </div>
                  ) : (
                    filteredClientOptions.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: 'var(--spacing-sm)',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontSize: 'var(--font-body)',
                          fontWeight: parseInt(form.clientId) === c.id ? 700 : 400
                        }}
                        onClick={() => {
                          setForm(f => ({ ...f, clientId: c.id }))
                          setClientSearch('')
                          setShowClientDropdown(false)
                        }}
                        onMouseEnter={e => e.target.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.target.style.background = 'transparent'}
                      >
                        {c.name} {c.last_name} {c.phone ? `(${c.phone})` : ''}
                      </button>
                    ))
                  )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="form-group">
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Platos</span>
            <button type="button" className="btn btn-sm btn-ghost" onClick={addItem}>+ Agregar plato</button>
          </label>
          {form.items.map((item, idx) => (
            <div key={idx} className="form-row" style={{ marginBottom: 'var(--spacing-xs)', alignItems: 'end' }}>
              <div style={{ flex: 3 }}>
                <select
                  value={item.dishId}
                  onChange={e => updateItem(idx, 'dishId', e.target.value)}
                  aria-label={`Plato ${idx + 1}`}
                >
                  <option value="">Seleccionar...</option>
                  {activeDishes.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={e => updateItem(idx, 'quantity', e.target.value)}
                  aria-label={`Cantidad plato ${idx + 1}`}
                  style={{ textAlign: 'center' }}
                />
              </div>
              {form.items.length > 1 && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeItem(idx)} aria-label="Quitar plato">
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="form-group">
          <label>Envío a domicilio</label>
          <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
            <button
              type="button"
              className={`btn btn-sm ${!form.has_delivery ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setForm(f => ({ ...f, has_delivery: false }))}
            >
              🚚 No
            </button>
            <button
              type="button"
              className={`btn btn-sm ${form.has_delivery ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setForm(f => ({ ...f, has_delivery: true }))}
            >
              🚚 Sí
            </button>
          </div>
          {form.has_delivery && (
            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-xs)', alignItems: 'center' }}>
              <input
                type="number"
                min="0"
                value={form.delivery_fee}
                onChange={e => setForm(f => ({ ...f, delivery_fee: e.target.value }))}
                style={{ width: '130px' }}
                placeholder="Monto"
              />
              <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                Recargo por envío
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  window.piu?.setDefaultDeliveryFee(Number(form.delivery_fee) || 0)
                  setDefaultDeliveryFee(Number(form.delivery_fee) || 0)
                }}
                title="Guardar este monto como valor por defecto"
              >
                💾
              </button>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Notas</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={2}
            placeholder="Observaciones del pedido..."
          />
        </div>

        <div className="form-actions">
          <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
          <button className="btn btn-primary btn-lg" onClick={handleSave}>
            {editing ? 'Guardar cambios' : 'Crear pedido'}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        title="Nuevo Cliente"
      >
        <div className="form-row">
          <div className="form-group">
            <label>Nombre</label>
            <input
              value={newClientForm.name}
              onChange={e => setNewClientForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Nombre"
            />
          </div>
          <div className="form-group">
            <label>Apellido</label>
            <input
              value={newClientForm.last_name}
              onChange={e => setNewClientForm(f => ({ ...f, last_name: e.target.value }))}
              placeholder="Apellido"
            />
          </div>
        </div>
        <div className="form-group">
          <label>Teléfono</label>
          <input
            value={newClientForm.phone}
            onChange={e => setNewClientForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="Ej: 11 5555 6666"
            type="tel"
          />
        </div>
        <div className="form-group">
          <label>Dirección</label>
          <input
            value={newClientForm.address}
            onChange={e => setNewClientForm(f => ({ ...f, address: e.target.value }))}
            placeholder="Calle, número, localidad"
          />
        </div>
        <div className="form-group">
          <label>Notas</label>
          <textarea
            value={newClientForm.notes}
            onChange={e => setNewClientForm(f => ({ ...f, notes: e.target.value }))}
            rows={2}
            placeholder="Opcional"
          />
        </div>
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={() => setShowNewClientModal(false)}>Cancelar</button>
          <button className="btn btn-primary btn-lg" onClick={handleNewClientSave}>Crear cliente</button>
        </div>
      </Modal>

      {pdfPreview && (
        <PdfViewer
          pdfDoc={pdfPreview}
          title={`etiquetas-piu-${week?.week_start || 'semana'}`}
          onClose={() => setPdfPreview(null)}
        />
      )}
    </div>
  )
}

function WeekSelector({ open, onChoice, currentStart, nextStart }) {
  if (!open) return null

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onChoice('cancel') }}>
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>🕐 Fuera del horario de pedidos</h2>
        </div>
        <p style={{ marginBottom: 'var(--spacing-lg)', fontSize: 'var(--font-body)' }}>
          Los pedidos se cierran los viernes a las 12:00. ¿A qué semana querés agregar este pedido?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          <button className="btn btn-primary btn-lg" onClick={() => onChoice('current')}>
            Semana actual ({currentStart})
          </button>
          <button className="btn btn-outline btn-lg" onClick={() => onChoice('next')}>
            Semana siguiente ({nextStart})
          </button>
          <button className="btn btn-ghost" onClick={() => onChoice('cancel')}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
