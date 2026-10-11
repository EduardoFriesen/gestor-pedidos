import React, { useId } from 'react'
import { SkeletonLine } from '../Skeleton'

function InsightSkeleton() {
  return (
    <div className="insight-skeleton" aria-hidden="true">
      <SkeletonLine width="35%" height="1.6em" />
      <SkeletonLine />
      <SkeletonLine width="90%" />
      <SkeletonLine width="70%" />
    </div>
  )
}

export default function InsightCard({ title, description, insight, isEmpty, emptyText, wide = false, actions, children }) {
  const headingId = useId()
  const { data, loading, error, reload } = insight

  let body
  if (loading && !data) body = <InsightSkeleton />
  else if (error) {
    body = (
      <div className="insight-error" role="alert">
        <span>No se pudo calcular este análisis.</span>
        <button className="btn btn-outline btn-sm" onClick={reload}>Reintentar</button>
      </div>
    )
  } else if (!data || isEmpty(data)) body = <p className="insight-empty">{emptyText}</p>
  else body = children(data)

  return (
    <section className={`insight card${wide ? ' insight-wide' : ''}`} aria-labelledby={headingId} aria-busy={loading}>
      <header className="insight-head">
        <div>
          <h3 id={headingId}>{title}</h3>
          {description && <p className="insight-desc">{description}</p>}
        </div>
        {actions}
      </header>
      {body}
    </section>
  )
}
