import React, { useState, useEffect, useCallback, useRef } from 'react'
import Modal from '../components/Modal'
import ErrorBanner from '../components/ErrorBanner'
import ConfirmPopup from '../components/ConfirmPopup'
import ClientForm from '../components/ClientForm'
import { useToast } from '../components/ToastProvider'
import { fmtMoney, formatDate, orderStatus } from '../utils/format'

export default function Clients() {
  const showToast = useToast()
  const savingRef = useRef(false)
  const [saving, setSaving] = useState(false)
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formKey, setFormKey] = useState(0)
  const [error, setError] = useState(null)
  const [showConfirmPopup, setShowConfirmPopup] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [historyClient, setHistoryClient] = useState(null)
  const [orderHistory, setOrderHistory] = useState([])
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [historyLoading, setHistoryLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      const c = await window.piu?.getClients()
      setClients(c || [])
      setError(null)
    } catch (e) {
      setError('No se pudieron cargar los clientes.')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditing(null)
    setFormKey(k => k + 1)
    setShowModal(true)
  }

  const openEdit = (client) => {
    setEditing(client)
    setFormKey(k => k + 1)
    setShowModal(true)
  }

  const handleSave = async (data) => {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    try {
      if (editing) {
        await window.piu?.updateClient({ id: editing.id, ...data })
        setShowModal(false)
      } else {
        await window.piu?.createClient(data)
        setShowConfirmPopup(true)
      }
      load()
      showToast('Cliente guardado', 'success')
    } catch (e) {
      setError('No se pudo guardar el cliente.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const handleContinueAdding = () => {
    setShowConfirmPopup(false)
    setFormKey(k => k + 1)
  }

  const handleStopAdding = () => {
    setShowConfirmPopup(false)
    setShowModal(false)
  }

  const handleDelete = (id) => {
    if (savingRef.current) return
    setDeleteConfirmId(id)
  }

  const confirmDelete = async () => {
    if (!deleteConfirmId) return
    const id = deleteConfirmId
    setDeleteConfirmId(null)
    savingRef.current = true
    setSaving(true)
    try {
      const res = await window.piu?.deleteClient(id)
      if (res && !res.success && res.reason === 'has_orders') {
        showToast('No se puede eliminar: el cliente tiene pedidos asociados.', 'error')
        return
      }
      load()
      showToast('Cliente eliminado', 'success')
    } catch (e) {
      setError('No se pudo eliminar el cliente.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const openHistory = async (client) => {
    setHistoryClient(client)
    setExpandedOrderId(null)
    setHistoryLoading(true)
    try {
      const orders = await window.piu?.getClientOrderHistory(client.id)
      setOrderHistory(orders || [])
      setError(null)
    } catch (e) {
      setError('No se pudo cargar el historial de pedidos.')
      setOrderHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const closeHistory = () => {
    setHistoryClient(null)
    setOrderHistory([])
    setExpandedOrderId(null)
  }

  const q = search.trim().toLowerCase()
  const filteredClients = (clients || []).filter(c =>
    !q || [`${c.name || ''} ${c.last_name || ''}`, c.phone, c.address, c.locality]
      .some(v => (v || '').toLowerCase().includes(q))
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
        <button className="btn btn-primary" onClick={openNew} style={{ width: '220px', fontSize: 'var(--font-body)' }}>
          + Cliente
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div style={{
        display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)',
        flexWrap: 'wrap'
      }}>
        <div className="card" style={{ flex: 1, minWidth: '120px', textAlign: 'center', padding: 'var(--spacing-sm) var(--spacing-md)' }}>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>Total</p>
          <p style={{ fontSize: 'var(--font-lg)', fontWeight: 900 }}>{filteredClients.length === clients.length ? clients.length : `${filteredClients.length} / ${clients.length}`}</p>
        </div>
      </div>

      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono, dirección o localidad..."
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
          <p>{search ? 'Probá con otro término de búsqueda.' : 'Agregá un cliente con el botón "+ Cliente" para empezar a tomar pedidos.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {filteredClients.map(client => (
            <div key={client.id} className="card" onClick={() => openHistory(client)} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--spacing-md)',
              cursor: 'pointer',
              transition: 'box-shadow 0.15s ease'
            }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 'var(--font-lg)', margin: 0 }}>
                  {client.name} {client.last_name}
                </h3>
                <div style={{
                  display: 'flex',
                  gap: 'var(--spacing-xs) var(--spacing-lg)',
                  flexWrap: 'wrap',
                  fontSize: 'var(--font-body)',
                  color: 'var(--text-secondary)',
                  marginTop: 'var(--spacing-xs)'
                }}>
                  {client.phone && <span>{client.phone}</span>}
                  {(client.address || client.locality) && <span>{[client.address, client.locality].filter(Boolean).join(', ')}</span>}
                  <span>
                    {client.order_count > 0
                      ? `${client.order_count} pedido${client.order_count !== 1 ? 's' : ''} · último ${formatDate(client.last_order_at)}`
                      : 'Sin pedidos'}
                  </span>
                </div>
                {client.notes && (
                  <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-xs)' }}>
                    {client.notes}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
                <button className="btn btn-sm btn-icon-edit" onClick={(e) => { e.stopPropagation(); openEdit(client) }} aria-label="Editar cliente">Editar</button>
                <button className="btn btn-sm btn-icon-delete" onClick={(e) => { e.stopPropagation(); handleDelete(client.id) }} aria-label="Eliminar cliente">Eliminar</button>
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
        <ClientForm
          key={formKey}
          initial={editing}
          clients={clients}
          excludeId={editing?.id ?? null}
          onSubmit={handleSave}
          onCancel={() => setShowModal(false)}
          submitLabel={editing ? 'Guardar cambios' : 'Crear cliente'}
        />
      </Modal>
      <Modal
        isOpen={historyClient !== null}
        onClose={closeHistory}
        title={`Historial de ${historyClient ? `${historyClient.name} ${historyClient.last_name}`.trim() : ''}`}
      >
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {historyLoading ? (
            <div className="empty-state">
              <p>Cargando historial...</p>
            </div>
          ) : orderHistory.length === 0 ? (
            <div className="empty-state card">
              <h3>Sin pedidos</h3>
              <p>Este cliente no tiene pedidos registrados.</p>
            </div>
          ) : (
            <>
              <div className="card" style={{
                display: 'flex',
                gap: 'var(--spacing-lg)',
                flexWrap: 'wrap',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                fontSize: 'var(--font-body)'
              }}>
                <span>Pedidos: <strong>{orderHistory.length}</strong></span>
                <span>Total gastado: <strong>{fmtMoney(orderHistory.reduce((s, o) => s + (o.total || 0), 0))}</strong></span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {orderHistory.map(order => {
                  const expanded = expandedOrderId === order.id
                  return (
                    <div key={order.id} className="card" style={{
                      padding: 'var(--spacing-sm) var(--spacing-md)',
                      cursor: 'pointer',
                      transition: 'box-shadow 0.15s ease'
                    }} onClick={() => setExpandedOrderId(expanded ? null : order.id)}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'var(--spacing-md)'
                      }}>
                        <span style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)' }}>
                          {formatDate(order.created_at)}
                        </span>
                        <span style={{
                          fontSize: 'var(--font-lg)',
                          fontWeight: 700
                        }}>
                          {fmtMoney(order.total || 0)}
                        </span>
                        <span className={order.has_delivery ? 'badge badge-info' : 'badge badge-warning'}>
                          {order.has_delivery ? 'Con envío' : 'Sin envío'}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>{expanded ? '▲' : '▼'}</span>
                      </div>
                      {expanded && (
                        <div style={{
                          marginTop: 'var(--spacing-sm)',
                          paddingTop: 'var(--spacing-sm)',
                          borderTop: '1px solid var(--border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 'var(--spacing-xs)'
                        }}>
                          {order.items?.map(item => (
                            <div key={item.id} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 'var(--spacing-md)',
                              fontSize: 'var(--font-body)'
                            }}>
                              <span>{item.quantity} × {item.dish_name}</span>
                              <span>{fmtMoney(item.subtotal || 0)}</span>
                            </div>
                          ))}
                          {order.has_delivery && (
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 'var(--spacing-md)',
                              fontSize: 'var(--font-body)',
                              color: 'var(--text-secondary)'
                            }}>
                              <span>Envío</span>
                              <span>{fmtMoney(order.delivery_fee || 0)}</span>
                            </div>
                          )}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 'var(--spacing-md)',
                            fontSize: 'var(--font-body)',
                            fontWeight: 700,
                            marginTop: 'var(--spacing-xs)',
                            paddingTop: 'var(--spacing-xs)',
                            borderTop: '1px solid var(--border)'
                          }}>
                            <span>Total</span>
                            <span>{fmtMoney(order.total || 0)}</span>
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-sm)',
                            flexWrap: 'wrap'
                          }}>
                            <span className={`badge ${orderStatus(order.status).badge}`}>
                              {orderStatus(order.status).label}
                            </span>
                            {order.notes && (
                              <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                                Nota: {order.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </Modal>
      <ConfirmPopup
        isOpen={showConfirmPopup}
        message="Cliente guardado. ¿Cargar otro?"
        confirmLabel="Sí"
        onConfirm={handleContinueAdding}
        onCancel={handleStopAdding}
      />
      <ConfirmPopup
        isOpen={deleteConfirmId !== null}
        message="¿Eliminar este cliente?"
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  )
}
