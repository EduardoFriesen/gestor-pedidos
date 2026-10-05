import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { useToast } from '../components/ToastProvider'
import { geocodeAddress, reverseGeocode, getAutoLocation, clearDeviceLocationCache } from '../utils/geocode'

const RouteMap = lazy(() => import('../components/RouteMap'))
const NO_DELIVERIES = []

const themes = [
  { id: 'claro', label: '☀️ Claro', desc: 'Fondo gris claro, texto oscuro' },
  { id: 'oscuro', label: '🌙 Oscuro', desc: 'Fondo oscuro, texto claro' },
  { id: 'daltonico', label: '🎨 Daltonico', desc: 'Azul y naranja en lugar de verde y rojo' }
]

function getThreshold() {
  return parseInt(localStorage.getItem('priceStalenessThreshold') || '30', 10)
}

function setThreshold(days) {
  localStorage.setItem('priceStalenessThreshold', String(days))
}

export default function Settings({ theme, setTheme, macroMode, setMacroMode, fontSize, setFontSize }) {
  const [threshold, setLocalThreshold] = React.useState(getThreshold)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  const handleThresholdChange = (e) => {
    const v = Math.max(1, parseInt(e.target.value, 10) || 1)
    setLocalThreshold(v)
    setThreshold(v)
  }

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const data = await window.piu?.getExportData()
      if (!data) return
      const content = JSON.stringify(data, null, 2)
      const now = new Date()
      const defaultName = `piu_backup_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}.json`
      await window.piu?.saveFile({ content, defaultName, ext: 'json' })
    } catch (e) {
      console.error('Export error:', e)
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async () => {
    if (importing) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      setImporting(true)
      try {
        const text = await file.text()
        const parsed = JSON.parse(text)
        if (!parsed?.weeks || !parsed?.ingredients || !parsed?.dishes || !parsed?.orders || !parsed?.orderItems || !parsed?.clients) {
          alert('El archivo no parece ser un backup válido de Piu.')
          return
        }
        const confirmed = window.confirm(
          'Esto reemplazará TODOS los datos actuales con el backup.\n\n¿Continuar?'
        )
        if (!confirmed) return
        await window.piu?.importData(parsed)
        window.location.reload()
      } catch (err) {
        alert('Error al leer el archivo: ' + err.message)
      } finally {
        setImporting(false)
      }
    }
    input.click()
  }

  return (
    <div>
      <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Configuración</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', maxWidth: '100%' }}>
        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Tema visual</h3>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
            {themes.map(t => (
              <button
                key={t.id}
                className={theme === t.id ? 'btn btn-primary btn-lg' : 'btn btn-outline btn-lg'}
                onClick={() => setTheme(t.id)}
                style={{
                  flex: 1,
                  minWidth: '180px',
                  flexDirection: 'column',
                  gap: 'var(--spacing-xs)',
                  textAlign: 'center'
                }}
                aria-pressed={theme === t.id}
              >
                <span style={{ fontSize: 'var(--font-lg)' }}>{t.label.split(' ')[0]}</span>
                <span style={{ fontSize: 'var(--font-sm)', fontWeight: 400 }}>
                  {t.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--spacing-md)'
          }}>
            <div>
              <h3 style={{ marginBottom: 'var(--spacing-xs)' }}>Modo Macro</h3>
              <p style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)' }}>
                Agranda todos los textos y botones al 200% para facilitar la lectura.
              </p>
            </div>
            <button
              className={macroMode ? 'btn btn-success btn-lg' : 'btn btn-outline btn-lg'}
              onClick={() => setMacroMode(!macroMode)}
              style={{ minWidth: '160px' }}
              aria-pressed={macroMode}
            >
              {macroMode ? 'Activo' : 'Inactivo'}
            </button>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Tamaño de texto</h3>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
            {[
              { id: 'small', label: 'Pequeña', desc: 'Textos más compactos' },
              { id: 'medium', label: 'Mediana', desc: 'Tamaño estándar' },
              { id: 'large', label: 'Grande', desc: 'Textos más grandes' }
            ].map(s => (
              <button
                key={s.id}
                className={fontSize === s.id ? 'btn btn-primary btn-lg' : 'btn btn-outline btn-lg'}
                onClick={() => setFontSize(s.id)}
                style={{
                  flex: 1,
                  minWidth: '150px',
                  flexDirection: 'column',
                  gap: 'var(--spacing-xs)',
                  textAlign: 'center'
                }}
                aria-pressed={fontSize === s.id}
              >
                <span style={{ fontSize: 'var(--font-body)' }}>{s.label}</span>
                <span style={{ fontSize: 'var(--font-xs)', fontWeight: 400 }}>{s.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Actualización de precios</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
            <p style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)', flex: 1 }}>
              Alertar si un precio de ingrediente no se actualizó en los últimos
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <input
                type="number"
                min="1"
                max="365"
                value={threshold}
                onChange={handleThresholdChange}
                style={{ width: '120px', textAlign: 'center', fontSize: 'var(--font-xl)' }}
              />
              <span style={{ fontWeight: 700 }}>días</span>
            </div>
          </div>
        </div>

        <StartLocationCard />

        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Backup y Restauración</h3>
          <p style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
            Exportá todos los datos como archivo JSON para migrar a otra PC o restaurar después de un problema.
          </p>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm" onClick={handleExport} disabled={exporting}>
              {exporting ? 'Exportando...' : '↓ Exportar Datos'}
            </button>
            <button className="btn btn-outline btn-sm" onClick={handleImport} disabled={importing}>
              {importing ? 'Importando...' : '↑ Importar Datos'}
            </button>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Ayuda</h3>
          <ul style={{
            fontSize: 'var(--font-body)',
            color: 'var(--text-secondary)',
            lineHeight: 2,
            paddingLeft: 'var(--spacing-md)'
          }}>
            <li><strong>Dashboard (Producción):</strong> Presioná <strong>+1</strong> cada vez que produzcas un plato. La barra de progreso se actualiza al instante.</li>
            <li><strong>Pedidos:</strong> Los pedidos se toman de <strong>domingo a viernes 12:00</strong>. Después de ese horario, podés elegir si va a la semana actual o siguiente.</li>
            <li><strong>Etiquetas:</strong> Desde Pedidos, presioná <strong>"Etiquetas"</strong> para generar un PDF con los datos de delivery.</li>
            <li><strong>Lista de compras:</strong> Desde Análisis, generá la lista de ingredientes agregados de todos los platos pedidos.</li>
            <li><strong>Cada domingo</strong> se inicia una nueva semana automáticamente y el dashboard se limpia.</li>
          </ul>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Acerca de</h3>
          <p style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)' }}>
            <strong>Piu</strong> v1.0.0 — Gestión de producción para cocina comercial.
          </p>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
            Diseñada para ser accesible y fácil de usar.
          </p>
        </div>
      </div>
    </div>
  )
}

function StartLocationCard() {
  const showToast = useToast()
  const [saved, setSaved] = useState(null)
  const [address, setAddress] = useState('')
  const [found, setFound] = useState(null)
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    window.piu?.getStartLocation?.().then(loc => {
      setSaved(loc || null)
      if (loc?.address) setAddress(loc.address)
    }).catch(() => {})
  }, [])

  const handleSearch = async () => {
    if (!address.trim() || searching) return
    setSearching(true)
    setNotFound(false)
    setFound(null)
    try {
      const auto = await getAutoLocation().catch(() => null)
      const result = await geocodeAddress(address.trim(), auto?.coords || null, auto?.countryCode || null)
      if (result) setFound(result)
      else setNotFound(true)
    } finally {
      setSearching(false)
    }
  }

  const handleSave = async () => {
    if (!found || saving) return
    setSaving(true)
    try {
      const place = await reverseGeocode(found.lat, found.lng)
      const loc = { address: address.trim(), lat: found.lat, lng: found.lng, city: place?.city || null, countryCode: place?.countryCode || null }
      const res = await window.piu?.setStartLocation(loc)
      if (res && res.success === false) throw new Error(res.reason)
      clearDeviceLocationCache()
      setSaved(loc)
      setFound(null)
      showToast('Punto de partida guardado', 'success')
    } catch {
      showToast('No se pudo guardar el punto de partida', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    try {
      await window.piu?.setStartLocation(null)
      clearDeviceLocationCache()
      setSaved(null)
      setFound(null)
      setAddress('')
      showToast('Se usará la detección automática', 'success')
    } catch {
      showToast('No se pudo borrar el punto de partida', 'error')
    }
  }

  const preview = found || saved
  const previewCoords = useMemo(() => preview ? { lat: preview.lat, lng: preview.lng } : null, [preview?.lat, preview?.lng])

  return (
    <div className="card">
      <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Punto de partida</h3>
      <p style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
        {saved
          ? `La Hoja de Ruta arranca en: ${saved.address}${saved.city ? ` (${saved.city})` : ''}`
          : 'Sin configurar: se usa la ubicación detectada automáticamente, que puede tener varios km de error.'}
      </p>
      <div className="form-group">
        <label htmlFor="start-address">Dirección de partida</label>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
          <input
            id="start-address"
            value={address}
            onChange={e => { setAddress(e.target.value); setFound(null); setNotFound(false) }}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
            placeholder="Calle, número, localidad"
            style={{ flex: 1, minWidth: '220px' }}
          />
          <button className="btn btn-outline btn-sm" onClick={handleSearch} disabled={searching || !address.trim()}>
            {searching ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>
      {notFound && (
        <p style={{ color: 'var(--danger)', marginBottom: 'var(--spacing-md)' }}>No se encontró la dirección.</p>
      )}
      {found && (
        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
          Encontrado: {found.label || `${found.lat.toFixed(5)}, ${found.lng.toFixed(5)}`}
        </p>
      )}
      {found && !found.exact && (
        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--danger)', marginBottom: 'var(--spacing-sm)' }}>
          Ubicación aproximada: el mapa no tiene la altura exacta de esta calle y el punto puede quedar a algunas cuadras.
        </p>
      )}
      {preview && (
        <div style={{ marginBottom: 'var(--spacing-md)' }}>
          <Suspense fallback={<div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cargando mapa…</div>}>
            <RouteMap key={`${preview.lat},${preview.lng}`} startCoords={previewCoords} deliveryCoords={NO_DELIVERIES} />
          </Suspense>
        </div>
      )}
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
        {found && (
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        )}
        {saved && (
          <button className="btn btn-ghost btn-sm" onClick={handleClear}>Usar detección automática</button>
        )}
      </div>
    </div>
  )
}
