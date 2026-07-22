import React, { useState, useEffect, useRef } from 'react'
import Modal from './Modal'

export default function PdfViewer({ pdfDoc, title, onClose }) {
  const [dataUrl, setDataUrl] = useState(null)
  const blobUrlRef = useRef(null)

  useEffect(() => {
    if (!pdfDoc) return
    try {
      const blob = pdfDoc.output('blob')
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url
      setDataUrl(url)
    } catch (e) {
      console.error('PdfViewer: error al generar blob URL', e)
    }
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
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
