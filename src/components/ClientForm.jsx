import React, { useState, useEffect, useRef } from 'react'
import { getDeviceLocation } from '../utils/geocode'

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
  const [producerCity, setProducerCity] = useState(null)
  const [saving, setSaving] = useState(false)
  const [duplicate, setDuplicate] = useState(null)
  const firstInputRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    getDeviceLocation().then(loc => {
      if (!cancelled && loc?.city) setProducerCity(loc.city)
    }).catch(() => {})
    requestAnimationFrame(() => firstInputRef.current?.focus())
    return () => { cancelled = true }
  }, [])

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
