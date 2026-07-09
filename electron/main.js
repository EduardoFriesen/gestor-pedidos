const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
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
  ipcMain.handle('piu:getWeekComparison', () => store.getWeekComparison())
  ipcMain.handle('piu:getPreviousWeeks', () => store.getPreviousWeeks())
  ipcMain.handle('piu:completeDishProduction', (_, { dishId }) => store.completeDishProduction(dishId))
  ipcMain.handle('piu:markOrderAssembled', (_, { id }) => store.markOrderAssembled(id))
  ipcMain.handle('piu:unmarkOrderAssembled', (_, { id }) => store.unmarkOrderAssembled(id))
  ipcMain.handle('piu:clientHasOrderThisWeek', (_, { clientId }) => store.clientHasOrderThisWeek(clientId))
  ipcMain.handle('piu:getMonthlyTrend', () => store.getMonthlyTrend())
  ipcMain.handle('piu:getYearlyTrend', () => store.getYearlyTrend())
  ipcMain.handle('piu:getMonthComparison', () => store.getMonthComparison())
  ipcMain.handle('piu:getYearComparison', () => store.getYearComparison())
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
  createWindow()
})

app.on('window-all-closed', () => {
  store.close()
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
