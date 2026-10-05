import React from 'react'

export default function StatTile({ label, value, detail, tone = 'ok', onClick, testId }) {
  return (
    <button className={`home-tile tone-${tone}`} onClick={onClick} data-testid={testId}>
      <span className="home-muted" style={{ fontWeight: 700 }}>{label}</span>
      <span className="home-tile-value">
        <span className="home-num">{value}</span>
        <span className="home-muted">{detail}</span>
      </span>
    </button>
  )
}
