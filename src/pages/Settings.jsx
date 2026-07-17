import React, { useState } from 'react'

const themes = [
  { id: 'claro', label: '☀️ Claro', desc: 'Fondo crema suave, texto oscuro' },
  { id: 'oscuro', label: '🌙 Oscuro', desc: 'Fondo negro, texto blanco, alto contraste' },
  { id: 'daltonico', label: '🎨 Daltonico', desc: 'Colores amigables para daltonismo' }
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
