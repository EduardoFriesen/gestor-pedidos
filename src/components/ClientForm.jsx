import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react'
import { getDeviceLocation, geocodeAddress } from '../utils/geocode'

const RouteMap = lazy(() => import('./RouteMap'))

function countryName(code) {
  if (!code) return null
  try {
    return new Intl.DisplayNames(['es'], { type: 'region' }).of(code.toUpperCase()) || null
  } catch {
    return null
  }
}

const EMPTY = { name: '', last_name: '', phone: '', address: '', locality: '', notes: '' }

function digits(s) {
  return (s || '').replace(/\D/g, '')
}

function norm(s) {
  return (s || '').trim().toLowerCase()
}

export function findDuplicateClient(clients, data, excludeId = null) {
  const phone = digits(data.phone)
  for (const c of clients || []) {
    if (c.id === excludeId) continue
    if (phone.length >= 6 && digits(c.phone) === phone) {
      return { client: c, reason: 'teléfono' }
    }
    if (norm(c.name) === norm(data.name) && norm(c.last_name) === norm(data.last_name)) {
      return { client: c, reason: 'nombre y apellido' }
    }
  }
  return null
}

export default function ClientForm({ initial = null, clients = [], excludeId = null, onSubmit, onCancel, submitLabel = 'Crear cliente' }) {
  const [form, setForm] = useState({ ...EMPTY, ...(initial || {}) })
  const [producerLoc, setProducerLoc] = useState(null)
  const producerCity = producerLoc?.city || null
  const [geo, setGeo] = useState({ status: 'idle', result: null })
  const geoRequestRef = useRef(0)
  const [saving, setSaving] = useState(false)
  const [duplicate, setDuplicate] = useState(null)
  const firstInputRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    getDeviceLocation().then(loc => {
      if (!cancelled) setProducerLoc(loc || {})
    }).catch(() => { if (!cancelled) setProducerLoc({}) })
    requestAnimationFrame(() => firstInputRef.current?.focus())
    return () => { cancelled = true }
  }, [])

  const geoQuery = [form.address.trim(), form.locality.trim() || producerCity].filter(Boolean).join(', ')

  useEffect(() => {
    const requestId = ++geoRequestRef.current
    if (!form.address.trim() || producerLoc === null) {
      setGeo({ status: 'idle', result: null })
      return
    }
    setGeo(g => ({ status: 'searching', result: g.result }))
    const timer = setTimeout(async () => {
      const result = await geocodeAddress(geoQuery, producerLoc?.coords || null, producerLoc?.countryCode || null).catch(() => null)
      if (requestId !== geoRequestRef.current) return
      setGeo(result ? { status: 'found', result } : { status: 'notfound', result: null })
    }, 1000)
    return () => clearTimeout(timer)
  }, [geoQuery, producerLoc])

  const markers = useMemo(
    () => geo.result ? [{ lat: geo.result.lat, lng: geo.result.lng, label: '•' }] : [],
    [geo.result?.lat, geo.result?.lng]
  )

  const googleMapsUrl = form.address.trim()
    ? `https://www.google.com/maps/search/?${new URLSearchParams({ api: '1', query: [geoQuery, countryName(producerLoc?.countryCode)].filter(Boolean).join(', ') }).toString()}`
    : null

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    setDuplicate(null)
  }

  const submit = async (force = false) => {
    if (saving || !form.name.trim()) return
    const data = {
      name: form.name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      locality: form.locality.trim(),
      notes: form.notes.trim()
    }
    if (!force) {
      const dup = findDuplicateClient(clients, data, excludeId)
      if (dup) {
        setDuplicate(dup)
        return
      }
    }
    setSaving(true)
    try {
      if (!data.locality) {
        const loc = producerCity ? { city: producerCity } : await getDeviceLocation().catch(() => null)
        data.locality = loc?.city || ''
      }
      await onSubmit(data)
    } finally {
      setSaving(false)
      setDuplicate(null)
    }
  }

  return (
    <div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="client-name">Nombre *</label>
          <input id="client-name" ref={firstInputRef} value={form.name} onChange={set('name')} placeholder="Nombre" required />
        </div>
        <div className="form-group">
          <label htmlFor="client-last-name">Apellido</label>
          <input id="client-last-name" value={form.last_name} onChange={set('last_name')} placeholder="Apellido" />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="client-phone">Teléfono</label>
        <input id="client-phone" value={form.phone} onChange={set('phone')} placeholder="Ej: 351 555 6666" type="tel" />
      </div>

      <div className="form-group">
        <label htmlFor="client-address">Dirección</label>
        <input id="client-address" value={form.address} onChange={set('address')} placeholder="Calle y número" />
      </div>

      <div className="form-group">
        <label htmlFor="client-locality">Localidad</label>
        <input
          id="client-locality"
          value={form.locality}
          onChange={set('locality')}
          placeholder={producerCity ? `Si se deja vacío: ${producerCity}` : 'Ej: Córdoba'}
        />
      </div>

      {form.address.trim() && (
        <div className="form-group" aria-live="polite">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-sm)', flexWrap: 'wrap', marginBottom: 'var(--spacing-xs)' }}>
            <span style={{ fontSize: 'var(--font-sm)', color: geo.status === 'notfound' ? 'var(--danger)' : 'var(--text-secondary)' }}>
              {geo.status === 'searching' && 'Buscando en el mapa…'}
              {geo.status === 'found' && `Ubicación encontrada: ${geo.result.label || `${geo.result.lat.toFixed(5)}, ${geo.result.lng.toFixed(5)}`}`}
              {geo.status === 'notfound' && 'No se encontró la dirección. Revisá calle y número.'}
            </span>
            {googleMapsUrl && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.open(googleMapsUrl, '_blank')}>
                Ver en Google Maps
              </button>
            )}
          </div>
          {geo.status === 'found' && !geo.result.exact && (
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--warning)', marginBottom: 'var(--spacing-xs)' }}>
              No se encontró la altura exacta; el punto marca la calle.
            </p>
          )}
          {geo.result && (
            <Suspense fallback={<div style={{ height: '200px' }} />}>
              <RouteMap key={`${geo.result.lat},${geo.result.lng}`} deliveryCoords={markers} height={200} singleZoom={16} />
            </Suspense>
          )}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="client-notes">Notas</label>
        <textarea id="client-notes" value={form.notes} onChange={set('notes')} rows={3} placeholder="Preferencias, observaciones..." />
      </div>

      {duplicate && (
        <div role="alert" style={{
          background: 'var(--warning-light)',
          border: '1.5px solid var(--warning)',
          borderRadius: 'var(--radius)',
          padding: 'var(--spacing-sm) var(--spacing-md)',
          marginBottom: 'var(--spacing-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--spacing-md)',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontWeight: 600 }}>
            Ya existe {`${duplicate.client.name} ${duplicate.client.last_name || ''}`.trim()} con el mismo {duplicate.reason}.
          </span>
          <button type="button" className="btn btn-sm btn-outline" onClick={() => submit(true)} disabled={saving}>
            Guardar igual
          </button>
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-lg" onClick={() => submit(false)} disabled={saving || !form.name.trim()}>
          {submitLabel}
        </button>
      </div>
    </div>
  )
}
