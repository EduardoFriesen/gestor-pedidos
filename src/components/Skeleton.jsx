import React from 'react'

const sx = {
  background: 'linear-gradient(90deg, var(--bg-hover) 25%, var(--border) 50%, var(--bg-hover) 75%)',
  backgroundSize: '800px 100%',
  animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
  borderRadius: 'var(--radius)'
}

export function SkeletonLine({ width = '100%', height = '1em', br, style, ...rest }) {
  return <div className="skeleton" style={{ ...sx, width, height, ...(br ? { borderRadius: br } : {}), ...style }} {...rest} />
}

export function SkeletonCircle({ size = '40px', style, ...rest }) {
  return <div className="skeleton" style={{ ...sx, width: size, height: size, borderRadius: '50%', ...style }} {...rest} />
}

export function SkeletonBar({ width = '100%', height = '8px', style, ...rest }) {
  return <div className="skeleton" style={{ ...sx, width, height, borderRadius: '100px', ...style }} {...rest} />
}

export function SkeletonCard({ style, ...rest }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', ...style }} {...rest}>
      <div className="skeleton" style={{ ...sx, width: '60%', height: '1.4em' }} />
      <div className="skeleton" style={{ ...sx, width: '40%', height: '0.9em' }} />
      <div className="skeleton" style={{ ...sx, width: '100%', height: '8px', borderRadius: '100px' }} />
      <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
        <div className="skeleton" style={{ ...sx, flex: 1, height: '1em' }} />
        <div className="skeleton" style={{ ...sx, flex: 1, height: '1em' }} />
        <div className="skeleton" style={{ ...sx, flex: 1, height: '1em' }} />
      </div>
      <div className="skeleton" style={{ ...sx, width: '100%', height: '2.5em' }} />
    </div>
  )
}

export function SkeletonOrderRow({ style, ...rest }) {
  return (
    <div className="card" style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', ...style }} {...rest}>
      <SkeletonCircle size="32px" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
        <div className="skeleton" style={{ ...sx, width: '30%', height: '1em' }} />
        <div className="skeleton" style={{ ...sx, width: '50%', height: '0.8em' }} />
      </div>
      <div className="skeleton" style={{ ...sx, width: '80px', height: '1em' }} />
    </div>
  )
}

export function SkeletonAnalytics() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
        {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ ...sx, flex: 1, height: '2em' }} />)}
      </div>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        <div className="skeleton" style={{ ...sx, width: '40%', height: '1.5em' }} />
        <div className="skeleton" style={{ ...sx, width: '100%', height: '6em' }} />
      </div>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        <div className="skeleton" style={{ ...sx, width: '30%', height: '1.5em' }} />
        <div className="skeleton" style={{ ...sx, width: '100%', height: '4em' }} />
      </div>
    </div>
  )
}
