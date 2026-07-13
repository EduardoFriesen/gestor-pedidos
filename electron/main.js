const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const XLSX = require('xlsx')
const store = require('./store')

let mainWindow = null

function registerIpcHandlers() {
  ipcMain.handle('piu:getCurrentWeek', () => store.getCurrentWeek())
  ipcMain.handle('piu:isOrdersOpen', () => store.isOrdersOpen())
  ipcMain.handle('piu:getDashboard', () => store.getDashboard())
  ipcMain.handle('piu:addProduction', (_, { dishId, quantity }) => store.addProduction(dishId, quantity))
  ipcMain.handle('piu:undoProduction', (_, { dishId }) => store.undoProduction(dishId))
  ipcMain.handle('piu:getOrders', () => store.getOrders())
  ipcMain.handle('piu:createOrder', (_, data) => store.createOrder(data))
  ipcMain.handle('piu:updateOrder', (_, data) => store.updateOrder(data))
  ipcMain.handle('piu:deleteOrder', (_, { id }) => store.deleteOrder(id))
  ipcMain.handle('piu:getOrderWithDetails', (_, { id }) => store.getOrderWithDetails(id))
  ipcMain.handle('piu:getOrdersByWeekId', (_, { weekId }) => store.getOrdersByWeekId(weekId))
  ipcMain.handle('piu:getDishes', () => store.getDishes())
  ipcMain.handle('piu:createDish', (_, data) => store.createDish(data))
  ipcMain.handle('piu:updateDish', (_, data) => store.updateDish(data))
  ipcMain.handle('piu:deleteDish', (_, { id }) => store.deleteDish(id))
  ipcMain.handle('piu:getClients', () => store.getClients())
  ipcMain.handle('piu:createClient', (_, data) => store.createClient(data))
  ipcMain.handle('piu:updateClient', (_, data) => store.updateClient(data))
  ipcMain.handle('piu:deleteClient', (_, { id }) => store.deleteClient(id))
  ipcMain.handle('piu:getAnalytics', () => store.getAnalytics())
  ipcMain.handle('piu:getIngredientsList', () => store.getIngredientsList())
  ipcMain.handle('piu:getSubProductQuantities', () => store.getSubProductQuantities())
  ipcMain.handle('piu:getWeekComparison', () => store.getWeekComparison())
  ipcMain.handle('piu:getPreviousWeeks', () => store.getPreviousWeeks())
  ipcMain.handle('piu:completeDishProduction', (_, { dishId }) => store.completeDishProduction(dishId))
  ipcMain.handle('piu:markOrderAssembled', (_, { id }) => store.markOrderAssembled(id))
  ipcMain.handle('piu:unmarkOrderAssembled', (_, { id }) => store.unmarkOrderAssembled(id))
  ipcMain.handle('piu:markOrderDelivered', (_, { id }) => store.markOrderDelivered(id))
  ipcMain.handle('piu:unmarkOrderDelivered', (_, { id }) => store.unmarkOrderDelivered(id))
  ipcMain.handle('piu:clientHasOrderThisWeek', (_, { clientId }) => store.clientHasOrderThisWeek(clientId))
  ipcMain.handle('piu:getMonthlyTrend', () => store.getMonthlyTrend())
  ipcMain.handle('piu:getYearlyTrend', () => store.getYearlyTrend())
  ipcMain.handle('piu:getMonthComparison', () => store.getMonthComparison())
  ipcMain.handle('piu:getYearComparison', () => store.getYearComparison())
  ipcMain.handle('piu:getWeeklyTrend', () => store.getWeeklyTrend())
  ipcMain.handle('piu:getQuarterlyTrend', () => store.getQuarterlyTrend())
  ipcMain.handle('piu:getOverproductionInRange', (_, start, end) => store.getOverproductionInRange(start, end))
  ipcMain.handle('piu:getWeekOrderCounts', () => store.getWeekOrderCounts())
  ipcMain.handle('piu:getEntityCounts', () => store.getEntityCounts())
  ipcMain.handle('piu:getDayOfWeekDistribution', () => store.getDayOfWeekDistribution())
  ipcMain.handle('piu:getDishProfitability', () => store.getDishProfitability())
  ipcMain.handle('piu:getAnalyticsFiltered', (_, { startDate, endDate }) => store.getAnalyticsFiltered(startDate, endDate))
  ipcMain.handle('piu:getPeriodComparison', (_, { p1Start, p1End, p2Start, p2End }) => store.getPeriodComparison(p1Start, p1End, p2Start, p2End))
  ipcMain.handle('piu:getTrendsInRange', (_, { startDate, endDate }) => store.getTrendsInRange(startDate, endDate))
  ipcMain.handle('piu:getDishTimeSeries', (_, { dishId, startDate, endDate }) => store.getDishTimeSeries(dishId, startDate, endDate))
  ipcMain.handle('piu:getClientTimeSeries', (_, { clientId, startDate, endDate }) => store.getClientTimeSeries(clientId, startDate, endDate))
  ipcMain.handle('piu:getIngredients', () => store.getIngredients())
  ipcMain.handle('piu:createIngredient', (_, data) => store.createIngredient(data))
  ipcMain.handle('piu:updateIngredient', (_, data) => store.updateIngredient(data))
  ipcMain.handle('piu:deleteIngredient', (_, { id }) => store.deleteIngredient(id))
  ipcMain.handle('piu:calculateDishCost', (_, { dishId }) => store.calculateDishCost(dishId))
  ipcMain.handle('piu:getResolvedCost', (_, { ingredientId }) => store.getResolvedCost(ingredientId))
  ipcMain.handle('piu:getIngredientCategories', () => store.getIngredientCategories())
  ipcMain.handle('piu:getDefaultDeliveryFee', () => store.getDefaultDeliveryFee())
  ipcMain.handle('piu:setDefaultDeliveryFee', (_, { fee }) => store.setDefaultDeliveryFee(fee))
  ipcMain.handle('piu:getPriceReview', () => store.getPriceReview())
  ipcMain.handle('piu:markIngredientUpdated', (_, { id }) => store.markIngredientUpdated(id))
  ipcMain.handle('piu:markDishPriceUpdated', (_, { id }) => store.markDishPriceUpdated(id))
  ipcMain.handle('piu:getExportData', () => store.getExportData())
  ipcMain.handle('piu:importData', (_, newData) => store.importData(newData))
  ipcMain.handle('piu:saveFile', async (_, { content, defaultName, ext }) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
    })
    if (canceled || !filePath) return null
    fs.writeFileSync(filePath, Buffer.from(content))
    return filePath
  })
  ipcMain.handle('piu:getSalesForExport', (_, { startDate, endDate }) => store.getSalesForExport(startDate, endDate))
  ipcMain.handle('piu:exportAnalyticsExcel', async () => {
    try {
      const wb = buildExcelWorkbook()
      const defaultName = `piu_datos_${new Date().toISOString().split('T')[0]}.xlsx`
      const { canceled, filePath } = await dialog.showSaveDialog({
        defaultPath: defaultName,
        filters: [{ name: 'Excel', extensions: ['xlsx'] }]
      })
      if (canceled || !filePath) return null
      XLSX.writeFile(wb, filePath)
      return filePath
    } catch (e) {
      console.error('Export Excel error:', e.message)
      return null
    }
  })
}

function buildExcelWorkbook() {
  const wb = XLSX.utils.book_new()

  const analytics = store.getAnalyticsFiltered(null, null)
  const clients = store.getClients()
  const sales = store.getSalesForExport(null, null)
  const fmtMoney = (n) => n != null ? Number(n.toFixed(2)) : 0

  const revenue = analytics.revenue || 0
  const cost = analytics.totalCost || 0
  const profit = analytics.totalProfit || 0
  const margin = revenue > 0 ? (profit / revenue * 100).toFixed(1) : '0'
  const avgTicket = analytics.totalOrders > 0 ? (revenue / analytics.totalOrders).toFixed(2) : '0'

  const resumenRows = [
    ['Métrica', 'Valor'],
    ['Pedidos Totales', analytics.totalOrders || 0],
    ['Ingresos', revenue],
    ['Costos', cost],
    ['Ganancia', profit],
    ['Margen', `${margin}%`],
    ['Ticket Promedio', avgTicket]
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumenRows), 'Resumen')

  const allClients = clients.map(c => ({
    ID: c.id, Nombre: c.name, Apellido: c.last_name,
    Teléfono: c.phone || '', Dirección: c.address || '', Notas: c.notes || ''
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allClients), 'Clientes')

  const orderMap = {}
  for (const s of sales) {
    const key = s.order_id
    if (!orderMap[key]) {
      orderMap[key] = { order_id: s.order_id, cliente: s.cliente, fecha: s.fecha, ingreso: 0, costo: 0, ganancia: 0 }
    }
    orderMap[key].ingreso += s.ingreso
    orderMap[key].costo += s.costo
    orderMap[key].ganancia += s.ganancia
  }
  const salesRows = Object.values(orderMap).map(o => ({
    '# Pedido': o.order_id,
    Cliente: o.cliente,
    Fecha: o.fecha,
    Ingreso: fmtMoney(o.ingreso),
    Costo: fmtMoney(o.costo),
    Ganancia: fmtMoney(o.ganancia),
    Margen: o.ingreso > 0 ? `${((o.ganancia / o.ingreso) * 100).toFixed(1)}%` : '0%'
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesRows), 'Ventas')

  const exportData = store.getExportData()
  const weekMap = {}
  for (const w of exportData.weeks) {
    weekMap[w.id] = { start: w.week_start, end: w.week_end }
  }
  const weekCounts = {}
  for (const o of exportData.orders) {
    const wid = o.week_id
    if (!weekCounts[wid]) weekCounts[wid] = { semana: wid, pedidos: 0, clientes: new Set() }
    weekCounts[wid].pedidos++
    if (o.client_id) weekCounts[wid].clientes.add(o.client_id)
  }
  const fmtDate = (s) => {
    const [y, m, d] = s.split('-')
    return `${d}/${m}/${y}`
  }
  const weekRows = Object.values(weekCounts)
    .sort((a, b) => a.semana - b.semana)
    .map(w => {
      const dates = weekMap[w.semana]
      const rango = dates ? `${fmtDate(dates.start)} - ${fmtDate(dates.end)}` : `Semana ${w.semana}`
      return { Semana: rango, Pedidos: w.pedidos, Clientes: w.clientes.size }
    })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(weekRows), 'Pedidos por semana')

  return wb
}

function runAutoExport() {
  try {
    const backupsDir = path.join(app.getPath('userData'), 'backups')
    if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true })

    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const week = store.getCurrentWeek()
    const weekFile = `semana_${week.id}_${dateStr}`

    const jsonPath = path.join(backupsDir, `${weekFile}.json`)
    if (!fs.existsSync(jsonPath)) {
      const exportData = store.getExportData()
      fs.writeFileSync(jsonPath, JSON.stringify(exportData, null, 2), 'utf-8')
    }

    const xlsxPath = path.join(backupsDir, `${weekFile}.xlsx`)
    if (!fs.existsSync(xlsxPath)) {
      const wb = buildExcelWorkbook()
      XLSX.writeFile(wb, xlsxPath)
    }
  } catch (e) {
    console.error('Auto-export error:', e.message)
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'Piu'
  })

  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev')

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(() => {
  const dbPath = path.join(app.getPath('userData'), 'piu.json')
  store.init(dbPath)
  store.ensureCurrentWeek()
  registerIpcHandlers()
  runAutoExport()
  createWindow()
})

app.on('window-all-closed', () => {
  store.close()
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
