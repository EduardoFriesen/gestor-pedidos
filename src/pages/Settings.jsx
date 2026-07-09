import React from 'react'

const themes = [
  { id: 'claro', label: '☀️ Claro', desc: 'Fondo crema suave, texto oscuro' },
  { id: 'oscuro', label: '🌙 Oscuro', desc: 'Fondo negro, texto blanco, alto contraste' },
  { id: 'daltonico', label: '🎨 Daltonico', desc: 'Colores amigables para daltonismo' }
]

export default function Settings({ theme, setTheme, macroMode, setMacroMode }) {
  return (
    <div>
      <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Configuración</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', maxWidth: '700px' }}>
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
              <h3 style={{ marginBottom: 'var(--spacing-xs)' }}>👁️ Modo Macro</h3>
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
