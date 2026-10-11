import { useState, useEffect, useRef, useCallback } from 'react'

export default function useInsight(fetcher, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: false })
  const idRef = useRef(0)

  const load = useCallback(() => {
    const id = ++idRef.current
    setState(s => ({ ...s, loading: true, error: false }))
    Promise.resolve()
      .then(fetcher)
      .then(data => { if (id === idRef.current) setState({ data: data ?? null, loading: false, error: false }) })
      .catch(() => { if (id === idRef.current) setState({ data: null, loading: false, error: true }) })
  }, deps)

  useEffect(() => { load() }, [load])

  return { ...state, reload: load }
}
