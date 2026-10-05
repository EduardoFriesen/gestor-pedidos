import React, { useState } from 'react'

export default function PendingProductionPanel({ categories }) {
  const [open, setOpen] = useState(null)
  const totalMissing = categories.reduce((s, c) => s + c.missing, 0)

  return (
    <section className="home-panel" aria-labelledby="home-missing">
      <div className="home-panel-head">
        <h3 id="home-missing" className="home-panel-title">Falta producir</h3>
        {categories.length > 0 && (
          <span className="home-muted">
            {totalMissing > 0 ? <><span className="home-num">{totalMissing}</span> unidades esta semana</> : 'Semana completa'}
          </span>
        )}
      </div>

      <div className="home-panel-body">
        {categories.length === 0 ? (
          <div className="home-empty">
            <span>No hay pedidos esta semana.</span>
          </div>
        ) : (
          <ul className="home-categories">
            {categories.map((cat, idx) => {
              const isOpen = open === cat.name
              const done = cat.missing === 0
              const pct = cat.ordered > 0 ? Math.min(100, Math.round((cat.produced / cat.ordered) * 100)) : 100
              return (
                <li key={cat.name}>
                  <button
                    className="home-category"
                    aria-expanded={isOpen}
                    aria-controls={isOpen ? `home-cat-${idx}` : undefined}
                    onClick={() => setOpen(isOpen ? null : cat.name)}
                    style={{ opacity: done && !isOpen ? 0.6 : 1 }}
                  >
                    <span style={{ fontWeight: 700 }}>
                      <svg className="home-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      {cat.name}
                    </span>
                    {done ? (
                      <span style={{ color: 'var(--success)', fontWeight: 700 }}>✓ completo</span>
                    ) : (
                      <span><span className="home-num">{cat.missing}</span> <span className="home-muted">por hacer</span></span>
                    )}
                    <span className={`home-progress${done ? ' is-done' : ''}`} aria-hidden="true">
                      <span style={{ width: `${pct}%` }} />
                    </span>
                  </button>
                  {isOpen && (
                    <ul className="home-dishes" id={`home-cat-${idx}`}>
                      {cat.dishes.map(d => (
                        <li key={d.id} className={d.missing === 0 ? 'is-done' : undefined}>
                          <span>{d.name}</span>
                          <span className="home-num" style={{ fontWeight: 700 }}>
                            {d.missing === 0 ? '✓' : d.missing}
                            <span className="home-muted" style={{ fontWeight: 400 }}> / {d.total_ordered}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
