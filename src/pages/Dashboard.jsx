import React, { useState, useEffect, useCallback } from 'react'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [search, setSearch] = useState('')

  const load = useCallback(() => {
    window.piu?.getDashboard().then(d => setData(d || null))
  }, [])

  useEffect(() => { load() }, [load])

  const refresh = () => {
    load()
    window.dispatchEvent(new CustomEvent('piu:production-update'))
  }

  const handleProduce = async (dishId) => {
    await window.piu?.addProduction(dishId, 1)
    refresh()
  }

  const handleUndo = async (dishId) => {
    await window.piu?.undoProduction(dishId)
    refresh()
  }

  const handleCompleteDish = async (dishId) => {
    await window.piu?.completeDishProduction(dishId)
    refresh()
  }

  if (!data) return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', fontSize: 'var(--font-lg)' }}>Cargando...</div>

  const { week, dishes, totals } = data

  const q = search.toLowerCase()
  const filteredDishes = dishes.filter(d =>
    !q || (d.name || '').toLowerCase().includes(q) || (d.category || '').toLowerCase().includes(q)
  )
  const sortedDishes = [...filteredDishes].sort((a, b) => {
    const aDone = a.total_ordered > 0 && a.total_produced >= a.total_ordered ? 1 : 0
    const bDone = b.total_ordered > 0 && b.total_produced >= b.total_ordered ? 1 : 0
    return aDone - bDone
  })

  const formatDate = (str) => {
    if (!str) return ''
    const [y, m, d] = str.split('-')
    return `${d}/${m}/${y}`
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--spacing-lg)'
      }}>
        <div>
          <h2>Producción Semanal</h2>
          <p style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)' }}>
            {formatDate(week.week_start)} - {formatDate(week.week_end)}
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={load} aria-label="Actualizar datos">
          ↻ Actualizar
        </button>
      </div>

      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <input
          type="text"
          placeholder="Buscar por plato o categoría..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          key="search-dashboard"
          aria-label="Buscar plato"
          style={{ width: '100%', maxWidth: '400px' }}
        />
      </div>

      {sortedDishes.length === 0 ? (
        <div className="empty-state card">
          <h3>{search ? 'Sin resultados' : 'No hay pedidos para esta semana'}</h3>
          <p>{search ? 'Probá con otro término de búsqueda.' : 'Los pedidos aparecen acá cuando se registran en la sección Pedidos.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {sortedDishes.map(dish => {
            const remaining = dish.total_ordered - dish.total_produced
            const done = dish.total_produced >= dish.total_ordered && dish.total_ordered > 0
            const pct = dish.total_ordered > 0
              ? Math.min(100, Math.round((dish.total_produced / dish.total_ordered) * 100))
              : 0

            let statusColor = 'var(--text-secondary)'
            let statusBg = 'var(--bg-hover)'
            let statusText = 'Sin pedidos'
            if (dish.total_ordered > 0) {
              if (done) {
                statusColor = 'var(--success)'
                statusBg = 'var(--success-light)'
                statusText = '✓ Completado'
              } else if (dish.total_produced > 0) {
                statusColor = 'var(--warning)'
                statusBg = 'var(--warning-light)'
                statusText = 'En producción'
              } else {
                statusColor = 'var(--accent)'
                statusBg = 'var(--accent-light)'
                statusText = 'Pendiente'
              }
            }

            return (
              <div key={dish.id} className="card" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-sm)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--spacing-md)'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                      <h3 style={{ margin: 0, fontSize: 'var(--font-lg)' }}>{dish.name}</h3>
                      <span className={`badge ${done ? 'badge-success' : dish.total_produced > 0 ? 'badge-warning' : dish.total_ordered > 0 ? 'badge-warning' : ''}`}
                        style={{
                          background: statusBg,
                          color: statusColor,
                          fontSize: 'var(--font-sm)',
                          padding: '4px var(--spacing-sm)'
                        }}>
                        {statusText}
                      </span>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)',
                    fontSize: 'var(--font-lg)',
                    fontWeight: 700,
                    whiteSpace: 'nowrap'
                  }}>
                    <span>{dish.total_produced}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-body)' }}>/</span>
                    <span>{dish.total_ordered}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                    {!done && dish.total_ordered > 0 && (
                      <>
                        <button
                          className="btn btn-success"
                          onClick={() => handleProduce(dish.id)}
                          style={{ minWidth: 'var(--touch-size)', fontSize: 'var(--font-lg)', padding: 'var(--spacing-sm) var(--spacing-md)' }}
                          aria-label={`Marcar ${dish.name} como producido`}
                        >
                          +1
                        </button>
                        {remaining > 0 && (
                          <button
                            className="btn btn-primary"
                            onClick={() => handleCompleteDish(dish.id)}
                            style={{ fontSize: 'var(--font-body)', padding: 'var(--spacing-sm) var(--spacing-md)' }}
                            aria-label={`Completar ${dish.name}`}
                          >
                            ✓ Completar
                          </button>
                        )}
                      </>
                    )}
                    {dish.total_produced > 0 && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleUndo(dish.id)}
                        style={{ fontSize: 'var(--font-sm)' }}
                        aria-label={`Deshacer producción de ${dish.name}`}
                      >
                        ↩
                      </button>
                    )}
                  </div>
                </div>

                <div style={{
                  height: 'calc(var(--touch-size) * 0.5)',
                  background: 'var(--border)',
                  borderRadius: '100px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: done ? 'var(--success)' : 'var(--primary)',
                    borderRadius: '100px',
                    transition: 'width 0.5s ease',
                    minWidth: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'var(--font-sm)',
                    color: '#FFFFFF',
                    fontWeight: 700
                  }}>
                    {pct > 15 && `${pct}%`}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: 'var(--spacing-lg)',
                  fontSize: 'var(--font-body)',
                  color: 'var(--text-secondary)'
                }}>
                  <span>Pedidos: <strong style={{ color: 'var(--text)' }}>{dish.total_ordered}</strong></span>
                  <span>Producido: <strong style={{ color: 'var(--text)' }}>{dish.total_produced}</strong></span>
                  {remaining > 0 && (
                    <span>Faltan: <strong style={{ color: 'var(--accent)' }}>{remaining}</strong></span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
