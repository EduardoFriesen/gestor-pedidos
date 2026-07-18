import React, { useState, useEffect, useCallback, useRef } from 'react'
import Modal from '../components/Modal'
import PdfViewer from '../components/PdfViewer'
import ConfirmPopup from '../components/ConfirmPopup'
import { generarEtiquetasDelivery } from '../utils/pdf'
import { SkeletonOrderRow } from '../components/Skeleton'
import ErrorBanner from '../components/ErrorBanner'
import { useToast } from '../components/ToastProvider'

export default function Orders() {
  const showToast = useToast()
  const blurTimeoutRef = useRef(null)
  const savingRef = useRef(false)
  const loadIdRef = useRef(0)
  const itemKeyRef = useRef(0)
  const [saving, setSaving] = useState(false)
  const [orders, setOrders] = useState([])
  const [dishes, setDishes] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [week, setWeek] = useState(null)
  const [ordersOpen, setOrdersOpen] = useState(true)
  const [form, setForm] = useState({ clientId: '', notes: '', items: [{ _key: ++itemKeyRef.current, dishId: '', quantity: 1 }], has_delivery: false, delivery_fee: 500 })
  const [showConfirmPopup, setShowConfirmPopup] = useState(false)
  const [showSecondOrderPopup, setShowSecondOrderPopup] = useState(false)
  const [secondOrderMessage, setSecondOrderMessage] = useState('')
  const [pendingData, setPendingData] = useState(null)
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
  const [orderCounts, setOrderCounts] = useState(null)
  const [selectedWeekId, setSelectedWeekId] = useState(null)
  const [previousWeeks, setPreviousWeeks] = useState([])
  const [weekOrders, setWeekOrders] = useState([])
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [unassembleConfirmId, setUnassembleConfirmId] = useState(null)
  const [reopenConfirmId, setReopenConfirmId] = useState(null)

  const load = useCallback(() => {
    const id = ++loadIdRef.current
    setLoading(true)
    Promise.all([
      (window.piu?.getOrders() || Promise.resolve([])).catch(() => []),
      (window.piu?.getDishes() || Promise.resolve([])).catch(() => []),
      (window.piu?.getClients() || Promise.resolve([])).catch(() => []),
      (window.piu?.getCurrentWeek() || Promise.resolve(null)).catch(() => null),
      (window.piu?.isOrdersOpen() || Promise.resolve(true)).catch(() => true),
      (window.piu?.getDefaultDeliveryFee() || Promise.resolve(500)).catch(() => 500),
      (window.piu?.getPreviousWeeks() || Promise.resolve([])).catch(() => [])
    ]).then(([o, d, c, w, isOpen, fee, pw]) => {
      if (id !== loadIdRef.current) return
      setOrders(o || [])
      setDishes((d || []).filter(d => d && d.is_active))
      setClients(c || [])
      setWeek(w)
      setOrdersOpen(isOpen)
      if (fee !== undefined) setDefaultDeliveryFee(fee)
      setPreviousWeeks(pw || [])
      setLoading(false)
    })
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const loadCounts = () => window.piu?.getWeekOrderCounts().then(setOrderCounts)
    loadCounts()
    window.addEventListener('piu:production-update', loadCounts)
    return () => window.removeEventListener('piu:production-update', loadCounts)
  }, [])

  useEffect(() => {
    return () => clearTimeout(blurTimeoutRef.current)
  }, [])

  useEffect(() => {
    if (!showModal) {
      setShowClientDropdown(false)
      setClientSearch('')
      setShowNewClientModal(false)
    }
  }, [showModal])

  const makeItem = (dishId = '', quantity = 1) => ({ _key: ++itemKeyRef.current, dishId, quantity })

  const handleWeekSelect = async (e) => {
    const weekId = e.target.value ? parseInt(e.target.value, 10) : null
    setSelectedWeekId(weekId)
    if (weekId) {
      try {
        const wo = await window.piu?.getOrdersByWeekId(weekId)
        setWeekOrders(wo || [])
      } catch {
        setWeekOrders([])
      }
    } else {
      setWeekOrders([])
    }
  }

  const isHistorical = selectedWeekId !== null

  const handleCloseModal = useCallback(() => setShowModal(false), [])

  const activeDishes = dishes.filter(d => d.is_active)

  const openNew = async () => {
    try {
      const isOpen = await window.piu?.isOrdersOpen()
      setOrdersOpen(isOpen)

      if (!isOpen) {
        const resp = await window.piu?.getCurrentWeek()
        if (!resp) return
        const nextWeekDate = new Date(resp.week_start)
        nextWeekDate.setDate(nextWeekDate.getDate() + 7)
        const fmt = (dt) => {
          const y = dt.getFullYear()
          const m = String(dt.getMonth() + 1).padStart(2, '0')
          const d = String(dt.getDate()).padStart(2, '0')
          return `${y}-${m}-${d}`
        }
        const nextStart = fmt(nextWeekDate)
        const currentWeekStart = resp.week_start

        setAlternateWeek({ current: currentWeekStart, next: nextStart })
        setShowWeekSelector(true)
        return
      }

      setEditing(null)
      setForm({ clientId: '', notes: '', items: [makeItem()], has_delivery: false, delivery_fee: defaultDeliveryFee })
      setShowModal(true)
    } catch (e) {
      console.error('Error opening new order:', e)
    }
  }

  const handleWeekChoice = (choice) => {
    setShowWeekSelector(false)
    if (choice === 'cancel') return
    setEditing(null)
    setForm({ clientId: '', notes: '', items: [makeItem()], has_delivery: false, delivery_fee: defaultDeliveryFee, targetWeek: choice })
    setShowModal(true)
  }

  const openEdit = (order) => {
    setEditing(order)
    setForm({
      clientId: order.client_id,
      notes: order.notes || '',
      items: order.items?.map(i => ({ _key: ++itemKeyRef.current, dishId: i.dish_id, quantity: i.quantity })) || [makeItem()],
      has_delivery: !!order.has_delivery,
      delivery_fee: order.delivery_fee || defaultDeliveryFee
    })
    setShowModal(true)
  }

  const executeSave = async (data, suppressAnother) => {
    savingRef.current = true
    setSaving(true)
    try {
      if (editing) {
        await window.piu?.updateOrder({ id: editing.id, ...data })
        setShowModal(false)
      } else {
        await window.piu?.createOrder(data)
      }
      load()
      window.dispatchEvent(new Event('piu:production-update'))
      showToast('Pedido guardado', 'success')
      if (!editing && !suppressAnother) {
        setShowConfirmPopup(true)
      }
    } catch (e) {
      setError('No se pudo guardar el pedido.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (savingRef.current) return
    if (!form.clientId || form.items.length === 0 || !form.items[0].dishId) return
    const data = {
      clientId: parseInt(form.clientId),
      weekId: week.id,
      items: form.items.filter(i => i.dishId).map(i => ({ dishId: parseInt(i.dishId), quantity: parseFloat(i.quantity) || 1 })),
      notes: form.notes,
      has_delivery: form.has_delivery,
      delivery_fee: Number(form.delivery_fee) || 0
    }
    if (!editing && (await window.piu?.clientHasOrderThisWeek(parseInt(form.clientId)))) {
      const c = clients.find(x => x.id === parseInt(form.clientId))
      const name = c ? `${c.name} ${c.last_name}` : 'El cliente'
      setSecondOrderMessage(`${name} ya tiene un pedido esta semana. ¿Crear otro?`)
      setPendingData(data)
      setShowSecondOrderPopup(true)
      return
    }
    await executeSave(data)
  }

  const handleSecondOrderConfirm = async () => {
    setShowSecondOrderPopup(false)
    setPendingData(null)
    await executeSave(pendingData, true)
  }

  const handleSecondOrderCancel = () => {
    setShowSecondOrderPopup(false)
    setPendingData(null)
  }

  const handleContinueAdding = () => {
    setShowConfirmPopup(false)
    setForm({ clientId: '', notes: '', items: [makeItem()], has_delivery: false, delivery_fee: defaultDeliveryFee })
    requestAnimationFrame(() => {
      const input = document.querySelector('.modal-content input, .modal-content select')
      if (input) input.focus()
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
    try {
      await window.piu?.deleteOrder(id)
      load()
      window.dispatchEvent(new Event('piu:production-update'))
      showToast('Pedido eliminado', 'success')
    } catch (e) {
      setError('No se pudo eliminar el pedido.')
    }
  }

  const handleAssemble = async (id) => {
    try {
      await window.piu?.markOrderAssembled(id)
      load()
      window.dispatchEvent(new Event('piu:production-update'))
      showToast('Pedido ensamblado', 'success')
    } catch (e) {
      setError('No se pudo ensamblar el pedido.')
    }
  }

  const handleUnassemble = (id) => {
    setUnassembleConfirmId(id)
  }

  const confirmUnassemble = async () => {
    if (!unassembleConfirmId) return
    const id = unassembleConfirmId
    setUnassembleConfirmId(null)
    try {
      await window.piu?.unmarkOrderAssembled(id)
      load()
      window.dispatchEvent(new Event('piu:production-update'))
      showToast('Pedido desempaquetado', 'success')
    } catch (e) {
      setError('No se pudo desempaquetar el pedido.')
    }
  }

  const handleDeliver = async (id) => {
    try {
      await window.piu?.markOrderDelivered(id)
      load()
      window.dispatchEvent(new Event('piu:production-update'))
      showToast('Pedido entregado', 'success')
    } catch (e) {
      setError('No se pudo marcar como entregado.')
    }
  }

  const handleUndoDeliver = (id) => {
    setReopenConfirmId(id)
  }

  const confirmUndoDeliver = async () => {
    if (!reopenConfirmId) return
    const id = reopenConfirmId
    setReopenConfirmId(null)
    try {
      await window.piu?.unmarkOrderDelivered(id)
      load()
      window.dispatchEvent(new Event('piu:production-update'))
      showToast('Pedido reabierto', 'success')
    } catch (e) {
      setError('No se pudo reabrir el pedido.')
    }
  }

  const handlePrintLabelsView = async () => {
    try {
      const weekData = await window.piu?.getCurrentWeek()
      if (!weekData) return
      const allOrders = await window.piu?.getOrdersByWeekId(weekData.id)
      if (!allOrders || allOrders.length === 0) {
        showToast('No hay pedidos para esta semana.', 'info')
        return
      }
      const doc = generarEtiquetasDelivery(allOrders)
      setPdfPreview(doc)
    } catch (e) {
      setError('No se pudieron generar las etiquetas.')
    }
  }

  const addItem = () => {
    setForm(f => ({ ...f, items: [...f.items, makeItem()] }))
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
          showToast('Ese plato ya está cargado. Aumentá la cantidad del existente.', 'info')
          return f
        }
      }
      items[idx] = { ...items[idx], [field]: value }
      if (field === 'dishId' && value && idx === items.length - 1) {
        items.push(makeItem())
      }
      return { ...f, items }
    })
  }

  const getClientName = (clientId) => {
    const c = clients.find(x => x.id === clientId)
    return c ? `${c.name} ${c.last_name}` : '—'
  }

  const oq = orderSearch.toLowerCase()
  const sourceOrders = isHistorical ? weekOrders : orders
  const filteredOrders = (sourceOrders || []).filter(o => {
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
    !cq || (c.name || '').toLowerCase().includes(cq)
      || (c.last_name || '').toLowerCase().includes(cq)
      || (c.phone || '').toLowerCase().includes(cq)
      || (c.address || '').toLowerCase().includes(cq)
      || (c.notes || '').toLowerCase().includes(cq)
  )

  const handleNewClientSave = async () => {
    if (savingRef.current) return
    if (!newClientForm.name.trim()) return
    savingRef.current = true
    setSaving(true)
    try {
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
        setShowNewClientModal(false)
        setNewClientForm({ name: '', last_name: '', phone: '', address: '', notes: '' })
        setClientSearch('')
        setShowClientDropdown(false)
        showToast('Cliente creado', 'success')
      }
    } catch (e) {
      setError('No se pudo crear el cliente.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--spacing-lg)',
        gap: 'var(--spacing-md)',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <h2 style={{ margin: 0 }}>Pedidos</h2>
          <select
            value={selectedWeekId ?? ''}
            onChange={handleWeekSelect}
            style={{ maxWidth: '280px', fontSize: 'var(--font-body)' }}
            aria-label="Seleccionar semana"
          >
            <option value="">Semana actual</option>
            {previousWeeks.map(w => (
              <option key={w.id} value={w.id}>
                {w.week_start} — {w.week_end}
              </option>
            ))}
          </select>
          {isHistorical && (
            <span className="badge badge-warning" style={{ fontSize: 'var(--font-sm)' }}>
              Solo lectura
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <button className="btn btn-outline btn-sm" onClick={handlePrintLabelsView} disabled={isHistorical}>
            Etiquetas
          </button>
          <button className="btn btn-primary" onClick={openNew} disabled={isHistorical} style={{ width: '220px', fontSize: 'var(--font-body)' }}>
            + Pedido
          </button>
        </div>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <WeekSelector
        open={showWeekSelector}
        onChoice={handleWeekChoice}
        currentStart={alternateWeek?.current}
        nextStart={alternateWeek?.next}
      />

      {!isHistorical && orderCounts && (
        <div style={{
          display: 'flex',
          gap: 'var(--spacing-md)',
          marginBottom: 'var(--spacing-md)',
          flexWrap: 'wrap'
        }}>
          <div className="card" style={{ flex: 1, minWidth: '100px', textAlign: 'center', padding: 'var(--spacing-sm) var(--spacing-md)', borderColor: (orderCounts.pending + orderCounts.confirmed) > 0 ? 'var(--accent)' : undefined }}>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--accent)' }}>Faltantes</p>
            <p style={{ fontSize: 'var(--font-lg)', fontWeight: 900, color: 'var(--accent)' }}>{orderCounts.pending + orderCounts.confirmed}</p>
          </div>
          <div className="card" style={{ flex: 1, minWidth: '100px', textAlign: 'center', padding: 'var(--spacing-sm) var(--spacing-md)' }}>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--warning)' }}>Armados</p>
            <p style={{ fontSize: 'var(--font-lg)', fontWeight: 900, color: 'var(--warning)' }}>{orderCounts.assembled}</p>
          </div>
          <div className="card" style={{ flex: 1, minWidth: '100px', textAlign: 'center', padding: 'var(--spacing-sm) var(--spacing-md)' }}>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--success)' }}>Enviados</p>
            <p style={{ fontSize: 'var(--font-lg)', fontWeight: 900, color: 'var(--success)' }}>{orderCounts.delivered}</p>
          </div>
        </div>
      )}

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
        {!isHistorical && <label style={{
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
        </label>}
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          {[1,2,3,4,5].map(i => <SkeletonOrderRow key={i} />)}
        </div>
      )}

      {!loading && sortedOrders.length === 0 && (
        <div className="empty-state card">
          <h3>{orderSearch || showUnpackedOnly ? 'Sin resultados' : isHistorical ? 'No hay pedidos en esta semana' : 'No hay pedidos esta semana'}</h3>
          <p>{orderSearch || showUnpackedOnly ? 'Probá con otros filtros.' : isHistorical ? 'Seleccioná otra semana para ver sus pedidos.' : 'Usá el botón "+ Nuevo Pedido" para registrar el primer pedido de la semana.'}</p>
        </div>
      )}

      {!loading && sortedOrders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {sortedOrders.map(order => (
            <div key={order.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--font-lg)', margin: 0 }}>
                    {order.client_name}
                  </h3>
                  <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                    {order.client_phone && `${order.client_phone}`}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
                  <span className={`badge ${order.status === 'delivered' ? 'badge-success' : order.status === 'assembled' ? 'badge-success' : order.status === 'confirmed' ? 'badge-warning' : 'badge-warning'}`}
                    style={{ fontSize: 'var(--font-sm)' }}>
                    {order.status === 'pending' ? 'Pendiente' : order.status === 'confirmed' ? 'Confirmado' : order.status === 'assembled' ? 'Ensamblado' : 'Entregado'}
                  </span>
                  {!isHistorical && (order.status === 'pending' || order.status === 'confirmed') && (
                    <button className="btn btn-sm btn-status-assemble" onClick={() => handleAssemble(order.id)} aria-label="Marcar como ensamblado">
                      Ensamblar
                    </button>
                  )}
                  {!isHistorical && order.status === 'assembled' && (
                    <>
                      <button className="btn btn-sm btn-status-deliver" onClick={() => handleDeliver(order.id)} aria-label="Marcar como entregado">
                        Entregar
                      </button>
                      <button className="btn btn-sm btn-status-undo" onClick={() => handleUnassemble(order.id)} aria-label="Desempaquetar">
                        Desempaquetar
                      </button>
                    </>
                  )}
                  {!isHistorical && order.status === 'delivered' && (
                    <button className="btn btn-sm btn-status-reopen" onClick={() => handleUndoDeliver(order.id)} aria-label="Reabrir pedido">
                      Reabrir
                    </button>
                  )}
                  {!isHistorical && (order.status === 'pending' || order.status === 'confirmed') && (
                    <>
                      <button className="btn btn-sm btn-icon-edit" onClick={() => openEdit(order)} aria-label="Editar pedido">
                        Editar
                      </button>
                      <button className="btn btn-sm btn-icon-delete" onClick={() => handleDelete(order.id)} aria-label="Eliminar pedido">
                        Eliminar
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
                    Envío ${order.delivery_fee || 0}
                  </span>
                )}
              </div>
              {order.notes && (
                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                  {order.notes}
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
                onFocus={() => { clearTimeout(blurTimeoutRef.current); setShowClientDropdown(true) }}
                onBlur={() => { blurTimeoutRef.current = setTimeout(() => setShowClientDropdown(false), 200) }}
                aria-label="Buscar cliente"
              />
              {showClientDropdown && (
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
                }}
                onMouseDown={e => e.preventDefault()}
                >
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
                        style={{ width: '220px', fontSize: 'var(--font-body)' }}
                      >
                        + Cliente
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
              )}
            </>
          )}
        </div>

        <div className="form-group">
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Platos</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}>+ Agregar plato</button>
          </label>
          {form.items.map((item, idx) => (
            <div key={item._key} className="form-row" style={{ marginBottom: 'var(--spacing-xs)', alignItems: 'end' }}>
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
                  type="text"
                  inputMode="decimal"
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
              No
            </button>
            <button
              type="button"
              className={`btn btn-sm ${form.has_delivery ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setForm(f => ({ ...f, has_delivery: true }))}
            >
              Sí
            </button>
          </div>
          {form.has_delivery && (
            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-xs)', alignItems: 'center' }}>
              <input
                type="text"
                inputMode="decimal"
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
                  onClick={async () => {
                    await window.piu?.setDefaultDeliveryFee(Number(form.delivery_fee) || 0)
                    setDefaultDeliveryFee(Number(form.delivery_fee) || 0)
                    showToast('Valor por defecto guardado', 'success')
                  }}
                title="Guardar este monto como valor por defecto"
              >
                Guardar
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
          <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
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

      <ConfirmPopup
        isOpen={showConfirmPopup}
        message="Pedido guardado. ¿Cargar otro?"
        confirmLabel="Crear otro pedido"
        onConfirm={handleContinueAdding}
        onCancel={handleStopAdding}
      />

      <ConfirmPopup
        isOpen={showSecondOrderPopup}
        message={secondOrderMessage}
        confirmLabel="Crear otro pedido"
        onConfirm={handleSecondOrderConfirm}
        onCancel={handleSecondOrderCancel}
      />

      <ConfirmPopup
        isOpen={deleteConfirmId !== null}
        message="¿Eliminar este pedido?"
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />

      <ConfirmPopup
        isOpen={unassembleConfirmId !== null}
        message="¿Desempaquetar este pedido? Volverá a estado Confirmado."
        confirmLabel="Desempaquetar"
        onConfirm={confirmUnassemble}
        onCancel={() => setUnassembleConfirmId(null)}
      />

      <ConfirmPopup
        isOpen={reopenConfirmId !== null}
        message="¿Reabrir este pedido? Volverá a estado Ensamblado."
        confirmLabel="Reabrir"
        onConfirm={confirmUndoDeliver}
        onCancel={() => setReopenConfirmId(null)}
      />

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
          <h2>Fuera del horario de pedidos</h2>
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
