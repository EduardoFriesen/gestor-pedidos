import React, { useState, useEffect } from 'react'
import Modal from './Modal'

export default function PdfViewer({ pdfDoc, title, onClose }) {
  const [dataUrl, setDataUrl] = useState(null)

  useEffect(() => {
    if (!pdfDoc) return
    const url = pdfDoc.output('datauristring')
    setDataUrl(url)
  }, [pdfDoc])

  return (
    <Modal isOpen={true} onClose={onClose} title={title || 'Vista previa PDF'}>
      <div style={{
        width: '100%',
        height: '75vh',
        marginBottom: 'var(--spacing-md)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden'
      }}>
        {dataUrl ? (
          <iframe
            src={dataUrl}
            title="Vista previa PDF"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        ) : (
          <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
            Generando PDF...
          </div>
        )}
      </div>
      <div className="form-actions">
        <button className="btn btn-ghost btn-lg" onClick={onClose}>Cerrar</button>
        <button className="btn btn-primary btn-lg" onClick={() => pdfDoc?.save(`${title || 'documento'}.pdf`)}>
          Descargar PDF
        </button>
      </div>
    </Modal>
  )
}