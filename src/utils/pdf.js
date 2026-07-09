import { jsPDF } from 'jspdf'

function calcLabelHeight(items) {
  const topGap = 3
  const nameRow = 4
  const phoneRow = 3
  const addrRow = 3
  const itemStart = 1
  const itemRow = items.length * 5
  const totalRow = 3
  const idRow = 3
  const bottomGap = 2
  return topGap + nameRow + phoneRow + addrRow + itemStart + itemRow + totalRow + idRow + bottomGap
}

export function generarEtiquetasDelivery(orders) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = 210
  const pageHeight = 297
  const margin = 10
  const cols = 3
  const labelW = (pageWidth - margin * 2) / cols
  const rowGap = 2
  let y = margin

  for (let i = 0; i < orders.length; i += cols) {
    const batch = orders.slice(i, i + cols)
    const rowHeight = Math.max(...batch.map(o => calcLabelHeight(o.items)), 30)

    if (y + rowHeight > pageHeight - margin) {
      doc.addPage()
      y = margin
    }

    const rowLabelH = rowHeight

    batch.forEach((order, colIdx) => {
      const x = margin + colIdx * labelW
      const maxChars = Math.floor((labelW - 6) / 2.2)

      doc.setDrawColor(200)
      doc.setLineWidth(0.5)
      doc.rect(x, y, labelW, rowLabelH)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      const nameStr = `${order.name} ${order.last_name}`
      doc.text(nameStr.length > maxChars + 5 ? nameStr.slice(0, maxChars + 2) + '...' : nameStr, x + 2, y + 4)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      const phoneStr = `Tel: ${order.phone}`
      doc.text(phoneStr, x + 2, y + 7.5)

      const addrMax = Math.floor((labelW - 6) / 2.2)
      const addrStr = `${order.address}`.length > addrMax ? `${order.address.slice(0, addrMax - 3)}...` : order.address
      doc.text(addrStr, x + 2, y + 10.5)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      let ty = y + 14
      let orderTotal = 0
      for (const item of order.items) {
        const line = `${item.dish_name} x${item.quantity}`
        const lineMax = Math.floor((labelW - 6) / 3)
        const truncated = line.length > lineMax ? line.slice(0, lineMax - 3) + '...' : line
        doc.text(truncated, x + 2, ty)
        const unitPrice = item.price || 0
        const subTotal = unitPrice * item.quantity
        orderTotal += subTotal
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(5.5)
        doc.text(`$${unitPrice.toFixed(0)}/u`, x + 2, ty + 3.5)
        doc.text(`$${subTotal.toFixed(0)}`, x + labelW - 12, ty + 3.5)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        ty += 5
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      doc.text(`Total: $${orderTotal.toFixed(0)}`, x + 2, ty)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6)
      doc.text(`#${order.id}`, x + labelW - 8, y + rowLabelH - 2)
    })

    y += rowHeight + rowGap
  }

  return doc
}

export function generarHojaProduccion(dashboard) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = 210
  const margin = 15
  const yStart = 30

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.text('PIU - Producción Semanal', pageWidth / 2, 15, { align: 'center' })

  const { week_start, week_end } = dashboard.week
  doc.setFontSize(16)
  doc.text(`Semana: ${week_start} al ${week_end}`, pageWidth / 2, 24, { align: 'center' })

  let y = yStart
  for (const dish of dashboard.dishes) {
    if (y > 270) {
      doc.addPage()
      y = 20
    }

    const remaining = dish.total_ordered - dish.total_produced
    const done = dish.total_produced >= dish.total_ordered

    doc.setDrawColor(done ? 100 : 200)
    doc.setLineWidth(1)
    doc.rect(margin, y, pageWidth - margin * 2, 20)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(dish.name, margin + 5, y + 7)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    const status = done
      ? `✓ ${dish.total_ordered} completado`
      : `Faltan ${remaining} (${dish.total_produced}/${dish.total_ordered})`
    doc.text(status, margin + 5, y + 16)

    y += 26
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  const totalPct = dashboard.totals.total > 0
    ? Math.round((dashboard.totals.produced / dashboard.totals.total) * 100)
    : 0
  doc.text(`Total: ${dashboard.totals.produced}/${dashboard.totals.total} (${totalPct}%)`, margin, y + 10)

  return doc
}

export function generarListaCompras(ingredients) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = 210
  const margin = 20

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.text('PIU - Lista de Compras', pageWidth / 2, 15, { align: 'center' })

  let y = 35
  for (const ing of ingredients) {
    if (y > 275) {
      doc.addPage()
      y = 20
    }

    const qty = ing.total % 1 === 0 ? ing.total.toString() : ing.total.toFixed(2)
    const line = `${qty} ${ing.unit} - ${ing.name}`

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text(`• ${line}`, margin, y)

    y += 12
  }

  if (ingredients.length === 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(14)
    doc.text('No hay ingredientes configurados en los platos.', margin, 40)
  }

  return doc
}
