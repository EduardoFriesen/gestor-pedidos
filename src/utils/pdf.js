import { jsPDF } from 'jspdf'

export function generarEtiquetasDelivery(orders) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = 210
  const pageHeight = 297
  const margin = 8
  const gapX = 0
  const gapY = 0
  const cols = 2
  const labelW = (pageWidth - margin * 2 - gapX) / cols
  const baseLabelH = (pageHeight - margin * 2 - gapY * 2) / 3
  const maxNameChars = Math.floor((labelW - 6) / 2.5)
  const maxAddrChars = Math.floor((labelW - 6) / 2.5)
  const maxDishChars = Math.floor((labelW - 6) / 2.8)

  function neededHeight(order) {
    const itemsH = order.items ? order.items.length * 9 : 0
    const deliveryH = order.has_delivery ? 3.5 : 0
    return 22 + itemsH + deliveryH + 5 + 3
  }

  function drawLabel(x, y, w, h, order) {
    doc.setDrawColor(180)
    doc.setLineWidth(0.5)
    doc.rect(x, y, w, h)

    const padX = 4
    let ty = y + 4

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    const nameStr = `${order.name} ${order.last_name}`
    doc.text(nameStr.length > maxNameChars ? nameStr.slice(0, maxNameChars - 2) + '…' : nameStr, x + padX, ty)

    ty += 4.5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Tel: ${order.phone || '—'}`, x + padX, ty)

    ty += 3.5
    const addrStr = order.address || '—'
    doc.text(addrStr.length > maxAddrChars ? addrStr.slice(0, maxAddrChars - 2) + '…' : addrStr, x + padX, ty)

    ty += 5
    doc.setDrawColor(200)
    doc.setLineWidth(0.2)
    doc.line(x + padX, ty, x + w - padX, ty)
    ty += 3

    let orderTotal = 0
    for (const item of order.items) {
      const unitPrice = item.price || 0
      const subTotal = unitPrice * item.quantity
      orderTotal += subTotal

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      const nameParts = (item.dish_name || '').split(' ')
      const shortName = nameParts.length > 1
        ? `${nameParts[0].slice(0, 3)} ${nameParts.slice(1).join(' ')}`
        : nameParts[0]
      const dishLine = `${shortName} ×${item.quantity}`
      doc.text(dishLine.length > maxDishChars ? dishLine.slice(0, maxDishChars - 2) + '…' : dishLine, x + padX, ty)

      ty += 4.5
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`$${unitPrice.toFixed(0)}/u`, x + padX, ty)
      doc.text(`$${subTotal.toFixed(0)}`, x + w - padX - 12, ty)

      ty += 4.5
    }

    if (order.has_delivery) {
      orderTotal += order.delivery_fee || 0
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(`Envío: $${(order.delivery_fee || 0).toFixed(0)}`, x + padX, ty)
      ty += 3.5
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(`Total: $${orderTotal.toFixed(0)}`, x + padX, y + h - 5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`#${order.id}`, x + w - padX - 8, y + h - 5)
  }

  const rows = []
  for (let i = 0; i < orders.length; i += cols) {
    const rowOrders = orders.slice(i, i + cols)
    const entries = rowOrders.map((order, idx) => ({
      order,
      h: Math.max(baseLabelH, neededHeight(order)),
      col: idx
    }))
    rows.push({ entries, h: Math.max(...entries.map(e => e.h)) })
  }

  const pages = []
  let currentPage = []
  let usedH = 0

  for (const row of rows) {
    if (currentPage.length > 0 && usedH + row.h + gapY > pageHeight - margin * 2) {
      pages.push(currentPage)
      currentPage = []
      usedH = 0
    }
    currentPage.push(row)
    usedH += row.h + gapY
  }
  if (currentPage.length > 0) pages.push(currentPage)

  for (let p = 0; p < pages.length; p++) {
    if (p > 0) doc.addPage()
    let y = margin
    for (const row of pages[p]) {
      for (const e of row.entries) {
        const x = margin + e.col * (labelW + gapX)
        drawLabel(x, y, labelW, row.h, e.order)
      }
      y += row.h + gapY
    }
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
