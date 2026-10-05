import React, { useRef, useState } from 'react'
import ConfirmPopup from '../ConfirmPopup'
import { fmtMoney, orderStatus } from '../../utils/format'

function shortRange(start, end) {
  const [, sm, sd] = start.split('-')
  const [, em, ed] = end.split('-')
  return `${sd}/${sm} – ${ed}/${em}`
}

function initials(name) {
  return (name || '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

export default function UndeliveredPanel({ weeks, selectedWeekId, onSelectWeek, onDeliver, saving }) {
  const tabRefs = useRef([])
  const [leaving, setLeaving] = useState(null)
  const [confirmAll, setConfirmAll] = useState(false)
  const selected = weeks.find(w => w.week.id === selectedWeekId)
  const pendingTotal = weeks.reduce((s, w) => s + w.orders.length, 0)

  const handleTabKeyDown = (e, idx) => {
    const last = weeks.length - 1
    const next = { ArrowRight: idx === last ? 0 : idx + 1, ArrowLeft: idx === 0 ? last : idx - 1, Home: 0, End: last }[e.key]
    if (next === undefined) return
    e.preventDefault()
    onSelectWeek(weeks[next].week.id)
    tabRefs.current[next]?.focus()
  }

  const deliverOne = (id) => {
    if (saving) return
    setLeaving(id)
    setTimeout(() => {
      onDeliver([id])
      setLeaving(null)
    }, 180)
  }

  return (
    <section className="home-panel home-left" aria-labelledby="home-undelivered">
      <div className="home-panel-head">
        <h3 id="home-undelivered" className="home-panel-title">Pedidos sin entregar</h3>
        <span className="home-muted">
          {pendingTotal > 0 ? `${pendingTotal} de semanas anteriores` : 'Semanas anteriores'}
        </span>
      </div>

      {weeks.length === 0 ? (
        <div className="home-panel-body">
          <div className="home-empty">
            <strong>Todo entregado ✓</strong>
            <span>No quedan pedidos abiertos de semanas anteriores.</span>
          </div>
        </div>
      ) : (
        <>
          <div className="home-rail">
            <div className="home-tabs" role="tablist" aria-label="Semanas con pedidos sin entregar">
              {weeks.map((w, idx) => {
                const active = w.week.id === selectedWeekId
                return (
                  <button
                    key={w.week.id}
                    ref={el => { tabRefs.current[idx] = el }}
                    role="tab"
                    id={`home-tab-${w.week.id}`}
                    aria-selected={active}
                    aria-controls="home-tabpanel"
                    tabIndex={active ? 0 : -1}
                    className="home-tab"
                    onClick={() => onSelectWeek(w.week.id)}
                    onKeyDown={e => handleTabKeyDown(e, idx)}
                  >
                    {shortRange(w.week.week_start, w.week.week_end)}
                    <span className="home-count" aria-label={`${w.orders.length} pedido${w.orders.length !== 1 ? 's' : ''}`}>{w.orders.length}</span>
                  </button>
                )
              })}
            </div>
            <button
              className="btn btn-primary btn-sm home-rail-action"
              onClick={() => setConfirmAll(true)}
              disabled={!selected || !!saving}
            >
              Marcar todos
            </button>
          </div>

          <div
            className="home-panel-body"
            role="tabpanel"
            id="home-tabpanel"
            aria-labelledby={selected ? `home-tab-${selected.week.id}` : undefined}
            style={{ padding: 0, background: 'var(--bg)' }}
          >
            {selected && (
              <ul className="home-tickets">
                {selected.orders.map(order => (
                  <li key={order.id} className={`home-ticket${leaving === order.id ? ' is-leaving' : ''}`}>
                    <span className="home-avatar" aria-hidden="true">{initials(order.client_name)}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                        <strong>{order.client_name}</strong>
                        <span className={`badge ${orderStatus(order.status).badge}`} style={{ fontSize: 'var(--font-xs)' }}>
                          {orderStatus(order.status).label}
                        </span>
                      </div>
                      <p className="home-ticket-items" title={order.items.map(i => `${i.quantity}× ${i.dish_name}`).join(', ')}>
                        {order.items.map(i => `${i.quantity}× ${i.dish_name}`).join(', ')}
                      </p>
                    </div>
                    <span className="home-num" style={{ fontSize: 'var(--font-body)' }}>{fmtMoney(order.total)}</span>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => deliverOne(order.id)}
                      disabled={!!saving || leaving !== null}
                      aria-label={`Marcar entregado el pedido de ${order.client_name}`}
                    >
                      Entregado
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <ConfirmPopup
        isOpen={confirmAll}
        message={`¿Marcar como entregados los ${selected?.orders.length || 0} pedidos de la semana ${selected ? shortRange(selected.week.week_start, selected.week.week_end) : ''}?`}
        confirmLabel="Marcar entregados"
        onConfirm={() => {
          setConfirmAll(false)
          onDeliver(selected?.orders.map(o => o.id) || [])
        }}
        onCancel={() => setConfirmAll(false)}
      />
    </section>
  )
}
