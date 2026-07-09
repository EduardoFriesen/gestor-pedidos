const fs = require('fs')
const path = require('path')

let data = null
let filePath = null
let nextId = 1

const defaultData = () => ({
  weeks: [],
  dishes: [],
  clients: [],
  orders: [],
  orderItems: [],
  productionLog: [],
  _nextId: 1
})

function init(dbPath) {
  filePath = dbPath
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    data = JSON.parse(raw)
    nextId = data._nextId || 1
  } catch {
    data = defaultData()
    save()
  }
}

function save() {
  data._nextId = nextId
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

function genId() {
  return nextId++
}

function getWeekRange(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diffToSunday = day === 0 ? 0 : -day
  const sunday = new Date(d)
  sunday.setDate(d.getDate() + diffToSunday)
  const saturday = new Date(sunday)
  saturday.setDate(sunday.getDate() + 6)

  const fmt = (dt) => {
    const y = dt.getFullYear()
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const d = String(dt.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return { weekStart: fmt(sunday), weekEnd: fmt(saturday) }
}

function ensureCurrentWeek() {
  const today = new Date()
  const { weekStart, weekEnd } = getWeekRange(today)

  let existing = data.weeks.find(w => w.week_start === weekStart && w.is_current)
  if (existing) return existing

  data.weeks.forEach(w => w.is_current = false)

  const week = { id: genId(), week_start: weekStart, week_end: weekEnd, is_current: true }
  data.weeks.push(week)
  save()
  return week
}

function getCurrentWeek() {
  const today = new Date()
  const { weekStart } = getWeekRange(today)
  let week = data.weeks.find(w => w.week_start === weekStart && w.is_current)
  if (!week) {
    week = ensureCurrentWeek()
  }
  return week
}

function isOrdersOpen() {
  const now = new Date()
  const day = now.getDay()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  if (day === 0) return true
  if (day >= 1 && day <= 4) return true
  if (day === 5) {
    if (hours < 12 || (hours === 12 && minutes === 0)) return true
    return false
  }
  if (day === 6) return false
  return true
}

function getLocaleDate() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getLocaleDatetime() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}:${s}`
}

function getDashboard() {
  const week = getCurrentWeek()
  const weekOrders = data.orders.filter(o => o.week_id === week.id)
  const weekOrderIds = weekOrders.map(o => o.id)
  const weekItems = data.orderItems.filter(oi => weekOrderIds.includes(oi.order_id))
  const weekProduced = data.productionLog.filter(pl => pl.week_id === week.id)

  const prodMap = {}
  for (const pl of weekProduced) {
    prodMap[pl.dish_id] = (prodMap[pl.dish_id] || 0) + pl.quantity_produced
  }

  const dishes = data.dishes
    .filter(d => d.is_active)
    .map(d => {
      const ordered = weekItems
        .filter(oi => oi.dish_id === d.id)
        .reduce((sum, oi) => sum + oi.quantity, 0)
      const produced = prodMap[d.id] || 0
      return { id: d.id, name: d.name, category: d.category, total_ordered: ordered, total_produced: produced }
    })
    .filter(d => d.total_ordered > 0)
    .sort((a, b) => b.total_ordered - a.total_ordered)

  const totalOrdered = dishes.reduce((s, d) => s + d.total_ordered, 0)
  const totalProduced = dishes.reduce((s, d) => s + d.total_produced, 0)

  return { week, dishes, totals: { total: totalOrdered, produced: totalProduced } }
}

function addProduction(dishId, quantity) {
  const week = getCurrentWeek()
  const today = getLocaleDate()

  const existing = data.productionLog.find(
    pl => pl.week_id === week.id && pl.dish_id === dishId && pl.date_produced === today
  )
  if (existing) {
    existing.quantity_produced += quantity
  } else {
    data.productionLog.push({
      id: genId(),
      week_id: week.id,
      dish_id: dishId,
      quantity_produced: quantity,
      date_produced: today
    })
  }
  save()
  return { success: true }
}

function undoProduction(dishId) {
  const week = getCurrentWeek()
  const today = getLocaleDate()
  const idx = data.productionLog.findIndex(
    pl => pl.week_id === week.id && pl.dish_id === dishId && pl.date_produced === today
  )
  if (idx !== -1) {
    data.productionLog.splice(idx, 1)
    save()
  }
  return { success: true }
}

function completeDishProduction(dishId) {
  const week = getCurrentWeek()
  const today = getLocaleDate()
  const dashboard = getDashboard()
  const dish = dashboard.dishes.find(d => d.id === dishId)
  if (!dish || dish.total_ordered <= 0) return { success: false }
  const remaining = dish.total_ordered - dish.total_produced
  if (remaining <= 0) return { success: false }
  data.productionLog.push({
    id: genId(),
    week_id: week.id,
    dish_id: dishId,
    quantity_produced: remaining,
    date_produced: today
  })
  save()
  return { success: true }
}

function getOrders() {
  const week = getCurrentWeek()
  const orders = data.orders
    .filter(o => o.week_id === week.id)
    .map(o => {
      const c = data.clients.find(cl => cl.id === o.client_id)
      const items = data.orderItems.filter(oi => oi.order_id === o.id).map(oi => {
        const d = data.dishes.find(dh => dh.id === oi.dish_id)
        return { ...oi, dish_name: d?.name || '—', price: d?.price || 0 }
      })
      return {
        ...o,
        client_name: c ? `${c.name} ${c.last_name}`.trim() : '—',
        client_phone: c?.phone || '',
        items
      }
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return orders
}

function createOrder({ clientId, weekId, items, notes }) {
  const order = {
    id: genId(),
    client_id: clientId,
    week_id: weekId,
    status: 'pending',
    notes: notes || '',
    created_at: getLocaleDatetime()
  }
  data.orders.push(order)

  for (const item of items) {
    data.orderItems.push({
      id: genId(),
      order_id: order.id,
      dish_id: item.dishId,
      quantity: item.quantity
    })
  }
  save()
  return { id: order.id, success: true }
}

function updateOrder({ id, clientId, items, notes }) {
  const order = data.orders.find(o => o.id === id)
  if (!order) return { success: false }
  order.client_id = clientId
  order.notes = notes || ''

  data.orderItems = data.orderItems.filter(oi => oi.order_id !== id)
  for (const item of items) {
    data.orderItems.push({
      id: genId(),
      order_id: id,
      dish_id: item.dishId,
      quantity: item.quantity
    })
  }
  save()
  return { success: true }
}

function deleteOrder(id) {
  data.orders = data.orders.filter(o => o.id !== id)
  data.orderItems = data.orderItems.filter(oi => oi.order_id !== id)
  save()
  return { success: true }
}

function markOrderAssembled(id) {
  const order = data.orders.find(o => o.id === id)
  if (!order) return { success: false }
  order.status = 'assembled'
  save()
  return { success: true }
}

function unmarkOrderAssembled(id) {
  const order = data.orders.find(o => o.id === id)
  if (!order) return { success: false }
  order.status = 'confirmed'
  save()
  return { success: true }
}

function clientHasOrderThisWeek(clientId) {
  const week = getCurrentWeek()
  return data.orders.some(o => o.client_id === clientId && o.week_id === week.id)
}

function getOrderWithDetails(id) {
  const order = data.orders.find(o => o.id === id)
  if (!order) return null

  const c = data.clients.find(cl => cl.id === order.client_id)
  const items = data.orderItems.filter(oi => oi.order_id === id).map(oi => {
    const d = data.dishes.find(dh => dh.id === oi.dish_id)
    return { ...oi, dish_name: d?.name || '—' }
  })

  return { ...c, ...order, items }
}

function getOrdersByWeekId(weekId) {
  const orders = data.orders
    .filter(o => o.week_id === weekId)
    .map(o => {
      const c = data.clients.find(cl => cl.id === o.client_id)
      const items = data.orderItems.filter(oi => oi.order_id === o.id).map(oi => {
        const d = data.dishes.find(dh => dh.id === oi.dish_id)
        return { ...oi, dish_name: d?.name || '—', price: d?.price || 0 }
      })
      return { ...c, ...o, items }
    })
    .sort((a, b) => {
      const nameA = `${a.last_name || ''} ${a.name || ''}`.trim()
      const nameB = `${b.last_name || ''} ${b.name || ''}`.trim()
      return nameA.localeCompare(nameB)
    })
  return orders
}

function getDishes() {
  return [...data.dishes].sort((a, b) => a.name.localeCompare(b.name))
}

function createDish(d) {
  const dish = {
    id: genId(),
    name: d.name,
    category: d.category || '',
    price: d.price || 0,
    ingredients: d.ingredients || '',
    is_active: d.is_active !== false
  }
  data.dishes.push(dish)
  save()
  return { id: dish.id, success: true }
}

function updateDish(d) {
  const dish = data.dishes.find(x => x.id === d.id)
  if (!dish) return { success: false }
  dish.name = d.name
  dish.category = d.category || ''
  dish.price = d.price || 0
  dish.ingredients = d.ingredients || ''
  dish.is_active = d.is_active !== false
  save()
  return { success: true }
}

function deleteDish(id) {
  data.dishes = data.dishes.filter(d => d.id !== id)
  save()
  return { success: true }
}

function getClients() {
  return [...data.clients].sort((a, b) => {
    const nameA = `${a.last_name || ''} ${a.name || ''}`.trim().toLowerCase()
    const nameB = `${b.last_name || ''} ${b.name || ''}`.trim().toLowerCase()
    return nameA.localeCompare(nameB)
  })
}

function createClient(c) {
  const client = {
    id: genId(),
    name: c.name,
    last_name: c.last_name || '',
    phone: c.phone || '',
    address: c.address || '',
    notes: c.notes || ''
  }
  data.clients.push(client)
  save()
  return { id: client.id, success: true }
}

function updateClient(c) {
  const client = data.clients.find(x => x.id === c.id)
  if (!client) return { success: false }
  client.name = c.name
  client.last_name = c.last_name || ''
  client.phone = c.phone || ''
  client.address = c.address || ''
  client.notes = c.notes || ''
  save()
  return { success: true }
}

function deleteClient(id) {
  data.clients = data.clients.filter(c => c.id !== id)
  save()
  return { success: true }
}

function getAnalytics() {
  const dishTotals = {}
  const clientTotals = {}
  let totalRevenue = 0

  for (const oi of data.orderItems) {
    const order = data.orders.find(o => o.id === oi.order_id)
    if (!order) continue
    const dish = data.dishes.find(d => d.id === oi.dish_id)
    if (!dish) continue
    const client = data.clients.find(c => c.id === order.client_id)

    dishTotals[dish.name] = (dishTotals[dish.name] || 0) + oi.quantity
    totalRevenue += (dish.price || 0) * oi.quantity

    const key = client ? `${client.name}|${client.last_name}` : 'unknown'
    if (!clientTotals[key]) {
      clientTotals[key] = { name: client?.name || '', last_name: client?.last_name || '', order_count: 0, total_dishes: 0 }
    }
    clientTotals[key].total_dishes += oi.quantity
  }

  const orderCounts = {}
  for (const o of data.orders) {
    const c = data.clients.find(cl => cl.id === o.client_id)
    const key = c ? `${c.name}|${c.last_name}` : 'unknown'
    if (!orderCounts[key]) orderCounts[key] = new Set()
    orderCounts[key].add(o.id)
  }
  for (const [key, ids] of Object.entries(orderCounts)) {
    if (clientTotals[key]) clientTotals[key].order_count = ids.size
  }

  const topDishes = Object.entries(dishTotals)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)

  const topClients = Object.values(clientTotals)
    .sort((a, b) => b.order_count - a.order_count)

  const weeklyTrend = data.weeks
    .map(w => {
      const wOrders = data.orders.filter(o => o.week_id === w.id)
      const wOrderIds = wOrders.map(o => o.id)
      const items = data.orderItems.filter(oi => wOrderIds.includes(oi.order_id))
      const total = items.reduce((s, oi) => s + oi.quantity, 0)
      const revenue = items.reduce((s, oi) => {
        const dish = data.dishes.find(d => d.id === oi.dish_id)
        return s + (dish?.price || 0) * oi.quantity
      }, 0)
      return { week_start: w.week_start, total_dishes: total, revenue, order_count: wOrders.length }
    })
    .sort((a, b) => a.week_start.localeCompare(b.week_start))
    .slice(-8)

  return {
    topDishes,
    topClients,
    revenue: totalRevenue,
    weeklyTrend,
    totalOrders: data.orders.length
  }
}

function getIngredientsList() {
  const week = getCurrentWeek()
  const weekOrders = data.orders.filter(o => o.week_id === week.id)
  const weekOrderIds = weekOrders.map(o => o.id)
  const weekItems = data.orderItems.filter(oi => weekOrderIds.includes(oi.order_id))

  const agg = {}
  for (const wi of weekItems) {
    const dish = data.dishes.find(d => d.id === wi.dish_id)
    if (!dish || !dish.ingredients) continue

    const lines = dish.ingredients.split('\n').filter(Boolean)
    for (const line of lines) {
      const [name, qty] = line.split(':').map(s => s.trim())
      if (!name || !qty) continue
      const match = qty.match(/^([\d.]+)?\s*(.*)$/)
      const amount = parseFloat(match?.[1] || 1) * wi.quantity
      const unit = match?.[2] || ''
      const key = `${name}|${unit}`
      if (!agg[key]) agg[key] = { name, unit, total: 0 }
      agg[key].total += amount
    }
  }

  return Object.values(agg).sort((a, b) => a.name.localeCompare(b.name))
}

function getWeekComparison() {
  const current = getCurrentWeek()
  const prev = [...data.weeks]
    .filter(w => w.week_start < current.week_start)
    .sort((a, b) => b.week_start.localeCompare(a.week_start))[0]

  const getStats = (weekId) => {
    const wOrders = data.orders.filter(o => o.week_id === weekId)
    const ids = wOrders.map(o => o.id)
    const items = data.orderItems.filter(oi => ids.includes(oi.order_id))
    const totalDishes = items.reduce((s, oi) => s + oi.quantity, 0)
    const totalRevenue = items.reduce((s, oi) => {
      const dish = data.dishes.find(d => d.id === oi.dish_id)
      return s + (dish?.price || 0) * oi.quantity
    }, 0)
    return { total: totalDishes, revenue: totalRevenue, order_count: wOrders.length }
  }

  const currentStats = getStats(current.id)
  const previousStats = prev ? getStats(prev.id) : { total: 0, revenue: 0, order_count: 0 }

  const change = previousStats.total > 0
    ? ((currentStats.total - previousStats.total) / previousStats.total * 100).toFixed(1)
    : 0
  const revenueChange = previousStats.revenue > 0
    ? ((currentStats.revenue - previousStats.revenue) / previousStats.revenue * 100).toFixed(1)
    : 0
  const orderChange = previousStats.order_count > 0
    ? ((currentStats.order_count - previousStats.order_count) / previousStats.order_count * 100).toFixed(1)
    : 0

  return {
    current: { week: current, ...currentStats },
    previous: prev ? { week: prev, ...previousStats } : null,
    change,
    revenueChange,
    orderChange
  }
}

function getPreviousWeeks() {
  return data.weeks
    .filter(w => !w.is_current)
    .sort((a, b) => b.week_start.localeCompare(a.week_start))
    .slice(0, 20)
}

function getMonthKey(dateStr) {
  return dateStr.slice(0, 7)
}

function getYearKey(dateStr) {
  return dateStr.slice(0, 4)
}

function getOrderRevenueItems(orderIds) {
  let totalDishes = 0
  let totalRevenue = 0
  const dishCounts = {}
  const clientIds = new Set()

  for (const oi of data.orderItems) {
    if (!orderIds.has(oi.order_id)) continue
    totalDishes += oi.quantity
    const dish = data.dishes.find(d => d.id === oi.dish_id)
    if (dish) totalRevenue += dish.price * oi.quantity
    const key = `${oi.dish_id}`
    dishCounts[key] = (dishCounts[key] || 0) + oi.quantity
  }

  for (const o of data.orders) {
    if (orderIds.has(o.id)) clientIds.add(o.client_id)
  }

  return { totalDishes, totalRevenue, dishCounts, clientCount: clientIds.size }
}

function getMonthlyTrend() {
  const months = {}
  for (const o of data.orders) {
    const wk = data.weeks.find(w => w.id === o.week_id)
    if (!wk) continue
    const key = getMonthKey(wk.week_start)
    if (!months[key]) months[key] = { orders: new Set(), revenue: 0, dishes: 0 }
    months[key].orders.add(o.id)
  }

  for (const [key, val] of Object.entries(months)) {
    const rev = data.orderItems
      .filter(oi => val.orders.has(oi.order_id))
      .reduce((s, oi) => {
        const dish = data.dishes.find(d => d.id === oi.dish_id)
        return s + (dish?.price || 0) * oi.quantity
      }, 0)
    const dishes = data.orderItems
      .filter(oi => val.orders.has(oi.order_id))
      .reduce((s, oi) => s + oi.quantity, 0)
    months[key] = { month: key, order_count: val.orders.size, revenue: rev, total_dishes: dishes }
  }

  return Object.values(months)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12)
}

function getYearlyTrend() {
  const years = {}
  for (const o of data.orders) {
    const wk = data.weeks.find(w => w.id === o.week_id)
    if (!wk) continue
    const key = getYearKey(wk.week_start)
    if (!years[key]) years[key] = { orders: new Set(), revenue: 0, dishes: 0 }
    years[key].orders.add(o.id)
  }

  for (const [key, val] of Object.entries(years)) {
    const rev = data.orderItems
      .filter(oi => val.orders.has(oi.order_id))
      .reduce((s, oi) => {
        const dish = data.dishes.find(d => d.id === oi.dish_id)
        return s + (dish?.price || 0) * oi.quantity
      }, 0)
    const dishes = data.orderItems
      .filter(oi => val.orders.has(oi.order_id))
      .reduce((s, oi) => s + oi.quantity, 0)
    years[key] = { year: key, order_count: val.orders.size, revenue: rev, total_dishes: dishes }
  }

  return Object.values(years).sort((a, b) => a.year.localeCompare(b.year))
}

function getMonthComparison() {
  const months = getMonthlyTrend()
  if (months.length < 2) return { current: null, previous: null, change: 0 }
  const current = months[months.length - 1]
  const previous = months[months.length - 2]
  const change = previous.total_dishes > 0
    ? ((current.total_dishes - previous.total_dishes) / previous.total_dishes * 100).toFixed(1)
    : 0
  return { current, previous, change }
}

function getYearComparison() {
  const years = getYearlyTrend()
  if (years.length < 2) return { current: null, previous: null, change: 0 }
  const current = years[years.length - 1]
  const previous = years[years.length - 2]
  const change = previous.total_dishes > 0
    ? ((current.total_dishes - previous.total_dishes) / previous.total_dishes * 100).toFixed(1)
    : 0
  return { current, previous, change }
}

function close() {
  save()
}

module.exports = {
  init,
  close,
  isOrdersOpen,
  getCurrentWeek,
  ensureCurrentWeek,
  getDashboard,
  addProduction,
  undoProduction,
  getOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  getOrderWithDetails,
  getOrdersByWeekId,
  getDishes,
  createDish,
  updateDish,
  deleteDish,
  getClients,
  createClient,
  updateClient,
  deleteClient,
  getAnalytics,
  getIngredientsList,
  getWeekComparison,
  getPreviousWeeks,
  completeDishProduction,
  markOrderAssembled,
  unmarkOrderAssembled,
  clientHasOrderThisWeek,
  getMonthlyTrend,
  getYearlyTrend,
  getMonthComparison,
  getYearComparison
}
