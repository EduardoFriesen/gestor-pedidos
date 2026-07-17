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
  ingredients: [],
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
  const tmpPath = filePath + '.tmp'
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
  fs.renameSync(tmpPath, filePath)
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
      const overproduction = Math.max(0, produced - ordered)
      return { id: d.id, name: d.name, category: d.category, total_ordered: ordered, total_produced: produced, overproduction }
    })
    .filter(d => d.total_ordered > 0 || d.total_produced > 0)
    .sort((a, b) => b.total_ordered - a.total_ordered)

  const totalOrdered = dishes.reduce((s, d) => s + d.total_ordered, 0)
  const totalProduced = dishes.reduce((s, d) => s + d.total_produced, 0)
  const totalOverproduction = Math.max(0, totalProduced - totalOrdered)

  return { week, dishes, totals: { total: totalOrdered, produced: totalProduced, overproduction: totalOverproduction } }
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
        has_delivery: !!o.has_delivery,
        delivery_fee: o.delivery_fee || 0,
        client_name: c ? `${c.name} ${c.last_name}`.trim() : '—',
        client_phone: c?.phone || '',
        items
      }
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return orders
}

function createOrder({ clientId, weekId, items, notes, has_delivery, delivery_fee }) {
  if (!data.clients.some(c => c.id === clientId)) return { success: false, reason: 'invalid_client' }
  if (!data.weeks.some(w => w.id === weekId)) return { success: false, reason: 'invalid_week' }
  const validItems = (items || []).filter(item => item.dishId && data.dishes.some(d => d.id === item.dishId) && (item.quantity || 0) > 0)
  if (validItems.length === 0) return { success: false, reason: 'no_valid_items' }

  const order = {
    id: genId(),
    client_id: clientId,
    week_id: weekId,
    status: 'pending',
    notes: notes || '',
    has_delivery: !!has_delivery,
    delivery_fee: Number(delivery_fee) || 0,
    created_at: getLocaleDatetime()
  }
  data.orders.push(order)

  for (const item of validItems) {
    data.orderItems.push({
      id: genId(),
      order_id: order.id,
      dish_id: item.dishId,
      quantity: Math.max(1, item.quantity || 1),
      unit_price: snapUnitPrice(item.dishId),
      unit_cost: snapUnitCost(item.dishId)
    })
  }
  save()
  return { id: order.id, success: true }
}

function updateOrder({ id, clientId, items, notes, has_delivery, delivery_fee }) {
  const order = data.orders.find(o => o.id === id)
  if (!order) return { success: false }
  if (!data.clients.some(c => c.id === clientId)) return { success: false, reason: 'invalid_client' }
  order.client_id = clientId
  order.notes = notes || ''
  order.has_delivery = !!has_delivery
  order.delivery_fee = Number(delivery_fee) || 0

  const validItems = (items || []).filter(item => item.dishId && data.dishes.some(d => d.id === item.dishId) && (item.quantity || 0) > 0)
  data.orderItems = data.orderItems.filter(oi => oi.order_id !== id)
  for (const item of validItems) {
    data.orderItems.push({
      id: genId(),
      order_id: id,
      dish_id: item.dishId,
      quantity: Math.max(1, item.quantity || 1),
      unit_price: snapUnitPrice(item.dishId),
      unit_cost: snapUnitCost(item.dishId)
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

function markOrderDelivered(id) {
  const order = data.orders.find(o => o.id === id)
  if (!order || order.status !== 'assembled') return { success: false }
  order.status = 'delivered'
  save()
  return { success: true }
}

function unmarkOrderDelivered(id) {
  const order = data.orders.find(o => o.id === id)
  if (!order || order.status !== 'delivered') return { success: false }
  order.status = 'assembled'
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
  return data.dishes.map(d => {
    const ings = (typeof d.ingredients === 'string' ? [] : (d.ingredients || []))
    const ingredients = ings.map(item => {
      const ing = data.ingredients.find(i => i.id === item.ingredientId)
      const cost = ing?.cost || 0
      const batchYield = ing?.batchYield || 1
      const subIngs = (ing?.subIngredients || []).map(si => {
        const sIng = data.ingredients.find(i => i.id === si.ingredientId)
        const perUnit = batchYield > 0 ? si.quantity / batchYield : si.quantity
        return { ...si, quantity: perUnit, name: sIng?.name || '(eliminado)', unit: sIng?.unit || '', cost: sIng?.cost || 0 }
      })
      return {
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        name: ing?.name || '(sin ingrediente)',
        unit: ing?.unit || '',
        cost,
        subtotal: cost * item.quantity,
        subIngredients: subIngs.length > 0 ? subIngs : undefined
      }
    })
    const computedCost = ingredients.reduce((s, i) => s + i.subtotal, 0)
    return { ...d, ingredients, computedCost, last_price_review: d.last_price_review || null }
  }).sort((a, b) => a.name.localeCompare(b.name))
}

function createDish(d) {
  const dish = {
    id: genId(),
    name: d.name,
    category: d.category || '',
    price: Math.max(0, d.price || 0),
    ingredients: Array.isArray(d.ingredients) ? d.ingredients.map(i => ({ ingredientId: i.ingredientId, quantity: i.quantity })) : [],
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
  dish.price = Math.max(0, d.price || 0)
  dish.ingredients = Array.isArray(d.ingredients) ? d.ingredients.map(i => ({ ingredientId: i.ingredientId, quantity: i.quantity })) : []
  dish.is_active = d.is_active !== false
  save()
  return { success: true }
}

function deleteDish(id) {
  const hasOrders = data.orderItems.some(oi => oi.dish_id === id)
  if (hasOrders) return { success: false, reason: 'has_orders' }
  data.dishes = data.dishes.filter(d => d.id !== id)
  save()
  return { success: true }
}

function getIngredients() {
  return [...data.ingredients].sort((a, b) => a.name.localeCompare(b.name))
}

function getResolvedCost(ingId, depth = 0, visited = new Set()) {
  if (depth > 10 || visited.has(ingId)) return 0
  visited.add(ingId)
  const ing = data.ingredients.find(i => i.id === ingId)
  if (!ing) return 0
  if (ing.subIngredients && ing.subIngredients.length > 0) {
    const batchYield = ing.batchYield || 1
    const total = ing.subIngredients.reduce((sum, si) => {
      return sum + getResolvedCost(si.ingredientId, depth + 1, new Set(visited)) * si.quantity
    }, 0)
    return batchYield > 0 ? total / batchYield : total
  }
  return ing.cost || 0
}

function snapUnitPrice(dishId) {
  const dish = data.dishes.find(d => d.id === dishId)
  return dish?.price || 0
}

function snapUnitCost(dishId) {
  return calculateDishCost(dishId)
}

function expandForShoppingList(ingId, quantity, depth = 0, visited = new Set()) {
  const results = []
  if (depth > 10 || visited.has(ingId)) return results
  visited.add(ingId)
  const ing = data.ingredients.find(i => i.id === ingId)
  if (!ing) return results
  if (ing.subIngredients && ing.subIngredients.length > 0) {
    const batchYield = ing.batchYield || 1
    for (const si of ing.subIngredients) {
      const perUnit = batchYield > 0 ? si.quantity / batchYield : si.quantity
      const expanded = expandForShoppingList(si.ingredientId, quantity * perUnit, depth + 1, new Set(visited))
      results.push(...expanded)
    }
  } else {
    results.push({ ingredientId: ingId, quantity })
  }
  return results
}

function createIngredient(ing) {
  const ingredient = {
    id: genId(),
    name: ing.name,
    unit: ing.unit || 'uni',
    cost: ing.cost || 0,
    category: ing.category || '',
    is_active: ing.is_active !== false,
    subIngredients: ing.subIngredients || [],
    batchYield: ing.batchYield || 1,
    last_cost_update: ing.last_cost_update || new Date().toISOString(),
    package_qty: ing.package_qty || 0,
    package_price: ing.package_price || 0
  }
  if (ingredient.subIngredients.length > 0) {
    ingredient.cost = calcCompositeCost(ingredient.subIngredients, ingredient.batchYield)
  }
  data.ingredients.push(ingredient)
  save()
  return { id: ingredient.id, success: true }
}

function calcCompositeCost(subIngs, batchYield = 1) {
  const total = subIngs.reduce((sum, si) => {
    return sum + getResolvedCost(si.ingredientId, 0, new Set()) * si.quantity
  }, 0)
  return batchYield > 0 ? total / batchYield : total
}

function updateIngredient(ing) {
  const item = data.ingredients.find(x => x.id === ing.id)
  if (!item) return { success: false }
  item.name = ing.name
  item.unit = ing.unit || 'uni'
  item.cost = ing.cost || 0
  item.category = ing.category || ''
  item.is_active = ing.is_active !== false
  item.subIngredients = ing.subIngredients || []
  item.batchYield = ing.batchYield || 1
  item.last_cost_update = new Date().toISOString()
  item.package_qty = ing.package_qty || 0
  item.package_price = ing.package_price || 0
  if (item.subIngredients.length > 0) {
    item.cost = calcCompositeCost(item.subIngredients, item.batchYield)
  }
  save()
  return { success: true }
}

function deleteIngredient(id) {
  data.ingredients = data.ingredients.filter(i => i.id !== id)
  for (const dish of data.dishes) {
    dish.ingredients = (dish.ingredients || []).filter(i => i.ingredientId !== id)
  }
  for (const ing of data.ingredients) {
    if (ing.subIngredients) {
      ing.subIngredients = ing.subIngredients.filter(si => si.ingredientId !== id)
      if (ing.subIngredients.length === 0) {
        ing.cost = 0
      }
    }
  }
  save()
  return { success: true }
}

function calculateDishCost(dishId) {
  const dish = data.dishes.find(d => d.id === dishId)
  if (!dish) return 0
  const dishIngredients = typeof dish.ingredients === 'string' ? [] : (dish.ingredients || [])
  return dishIngredients.reduce((total, item) => {
    return total + getResolvedCost(item.ingredientId, 0, new Set()) * item.quantity
  }, 0)
}

function getIngredientCategories() {
  return [...new Set(data.ingredients.map(i => i.category).filter(Boolean))].sort()
}

function getDishCostMap() {
  const map = {}
  for (const dish of data.dishes) {
    const dishIngredients = typeof dish.ingredients === 'string' ? [] : (dish.ingredients || [])
    map[dish.id] = dishIngredients.reduce((total, item) => {
      return total + getResolvedCost(item.ingredientId, 0, new Set()) * item.quantity
    }, 0)
  }
  return map
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
  const hasOrders = data.orders.some(o => o.client_id === id)
  if (hasOrders) return { success: false, reason: 'has_orders' }
  data.clients = data.clients.filter(c => c.id !== id)
  save()
  return { success: true }
}

function getAnalytics() {
  const costMap = getDishCostMap()
  const dishData = {}
  const clientDishes = {}
  let totalRevenue = 0
  let totalCost = 0

  for (const oi of data.orderItems) {
    const order = data.orders.find(o => o.id === oi.order_id)
    if (!order) continue
    const dish = data.dishes.find(d => d.id === oi.dish_id)
    if (!dish) continue
    const client = data.clients.find(c => c.id === order.client_id)

    const cost = oi.unit_cost ?? costMap[dish.id] ?? 0
    const revenue = (oi.unit_price ?? dish.price ?? 0) * oi.quantity
    const itemCost = cost * oi.quantity

    if (!dishData[dish.id]) {
      dishData[dish.id] = {
        name: dish.name,
        price: dish.price || 0,
        costPerUnit: cost,
        total: 0,
        totalCost: 0,
        totalRevenue: 0
      }
    }
    dishData[dish.id].total += oi.quantity
    dishData[dish.id].totalCost += itemCost
    dishData[dish.id].totalRevenue += revenue

    totalRevenue += revenue
    totalCost += itemCost

    if (client) {
      const key = `${client.id}`
      if (!clientDishes[key]) {
        clientDishes[key] = {
          clientId: client.id,
          name: client.name,
          last_name: client.last_name,
          orderIds: new Set(),
          total_dishes: 0,
          dishCounts: {}
        }
      }
      clientDishes[key].orderIds.add(order.id)
      clientDishes[key].total_dishes += oi.quantity
      const dk = `${dish.id}`
      clientDishes[key].dishCounts[dk] = (clientDishes[key].dishCounts[dk] || 0) + oi.quantity
    }
  }

  const topDishes = Object.values(dishData)
    .map(d => ({
      name: d.name,
      total: d.total,
      price: d.price,
      cost: d.costPerUnit,
      profit: d.price - d.costPerUnit,
      totalRevenue: d.totalRevenue,
      totalCost: d.totalCost,
      totalProfit: d.totalRevenue - d.totalCost
    }))
    .sort((a, b) => b.total - a.total)

  const topClients = Object.values(clientDishes)
    .map(c => {
      let favoriteId = null
      let maxCount = 0
      for (const [did, count] of Object.entries(c.dishCounts)) {
        if (count > maxCount) { maxCount = count; favoriteId = parseInt(did) }
      }
      const favDish = favoriteId ? data.dishes.find(d => d.id === favoriteId) : null
      return {
        name: c.name,
        last_name: c.last_name,
        order_count: c.orderIds.size,
        total_dishes: c.total_dishes,
        favorite_dish: favDish?.name || null
      }
    })
    .sort((a, b) => b.order_count - a.order_count)

  const totalProfit = totalRevenue - totalCost

  return {
    topDishes,
    topClients,
    revenue: totalRevenue,
    totalCost,
    totalProfit,
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
    if (!dish) continue
    const dishIngredients = typeof dish.ingredients === 'string' ? [] : (dish.ingredients || [])

    for (const item of dishIngredients) {
      const expanded = expandForShoppingList(item.ingredientId, item.quantity, 0, new Set())
      for (const ex of expanded) {
        const ing = data.ingredients.find(i => i.id === ex.ingredientId)
        if (!ing) continue
        const key = `${ing.id}`
        if (!agg[key]) {
          agg[key] = { name: ing.name, unit: ing.unit, total: 0, cost: ing.cost }
        }
        agg[key].total += ex.quantity * wi.quantity
      }
    }
  }

  return Object.values(agg).sort((a, b) => a.name.localeCompare(b.name))
}

function getSubProductQuantities() {
  const week = getCurrentWeek()
  const weekOrders = data.orders.filter(o => o.week_id === week.id)
  const weekOrderIds = weekOrders.map(o => o.id)
  const weekItems = data.orderItems.filter(oi => weekOrderIds.includes(oi.order_id))

  const agg = {}
  for (const wi of weekItems) {
    const dish = data.dishes.find(d => d.id === wi.dish_id)
    if (!dish) continue
    const dishIngredients = typeof dish.ingredients === 'string' ? [] : (dish.ingredients || [])
    for (const item of dishIngredients) {
      const ing = data.ingredients.find(i => i.id === item.ingredientId)
      if (!ing || !ing.subIngredients || ing.subIngredients.length === 0) continue
      const key = `${ing.id}`
      if (!agg[key]) {
        agg[key] = { id: ing.id, name: ing.name, unit: ing.unit, total: 0, breakdown: {} }
      }
      agg[key].total += item.quantity * wi.quantity
    }
  }

  const result = Object.values(agg)
  for (const sp of result) {
    const ing = data.ingredients.find(i => i.id === sp.id)
    if (!ing) continue
    const batchYield = ing.batchYield || 1
    for (const si of ing.subIngredients || []) {
      const baseIng = data.ingredients.find(i => i.id === si.ingredientId)
      if (!baseIng) continue
      const perUnit = batchYield > 0 ? si.quantity / batchYield : si.quantity
      if (!sp.breakdown[si.ingredientId]) {
        sp.breakdown[si.ingredientId] = { name: baseIng.name, unit: baseIng.unit, total: 0 }
      }
      sp.breakdown[si.ingredientId].total += perUnit * sp.total
    }
  }

  for (const sp of result) {
    sp.breakdown = Object.values(sp.breakdown).sort((a, b) => a.name.localeCompare(b.name))
  }

  return result.sort((a, b) => a.name.localeCompare(b.name))
}

function getWeeklyTrend() {
  const costMap = getDishCostMap()
  return data.weeks
    .map(w => {
      const wOrders = data.orders.filter(o => o.week_id === w.id)
      const ids = wOrders.map(o => o.id)
      const items = data.orderItems.filter(oi => ids.includes(oi.order_id))
      const totalDishes = items.reduce((s, oi) => s + oi.quantity, 0)
      let revenue = 0
      let cost = 0
      for (const oi of items) {
        const dish = data.dishes.find(d => d.id === oi.dish_id)
        revenue += (oi.unit_price ?? dish?.price ?? 0) * oi.quantity
        cost += (oi.unit_cost ?? costMap[dish?.id] ?? 0) * oi.quantity
      }
      return {
        week_start: w.week_start,
        total_dishes: totalDishes,
        revenue,
        cost,
        profit: revenue - cost,
        order_count: wOrders.length
      }
    })
    .sort((a, b) => a.week_start.localeCompare(b.week_start))
    .slice(-8)
}

function getWeekComparison() {
  const current = getCurrentWeek()
  const prev = [...data.weeks]
    .filter(w => w.week_start < current.week_start)
    .sort((a, b) => b.week_start.localeCompare(a.week_start))[0]

  const costMap = getDishCostMap()
  const getStats = (weekId) => {
    const wOrders = data.orders.filter(o => o.week_id === weekId)
    const ids = wOrders.map(o => o.id)
    const items = data.orderItems.filter(oi => ids.includes(oi.order_id))
    const totalDishes = items.reduce((s, oi) => s + oi.quantity, 0)
    let revenue = 0
    let cost = 0
    for (const oi of items) {
      const dish = data.dishes.find(d => d.id === oi.dish_id)
      revenue += (oi.unit_price ?? dish?.price ?? 0) * oi.quantity
      cost += (oi.unit_cost ?? costMap[dish?.id] ?? 0) * oi.quantity
    }
    return { total: totalDishes, revenue, cost, profit: revenue - cost, order_count: wOrders.length }
  }

  const currentStats = getStats(current.id)
  const previousStats = prev ? getStats(prev.id) : { total: 0, revenue: 0, cost: 0, profit: 0, order_count: 0 }

  const change = previousStats.total > 0
    ? ((currentStats.total - previousStats.total) / previousStats.total * 100).toFixed(1)
    : 0
  const revenueChange = previousStats.revenue > 0
    ? ((currentStats.revenue - previousStats.revenue) / previousStats.revenue * 100).toFixed(1)
    : 0
  const orderChange = previousStats.order_count > 0
    ? ((currentStats.order_count - previousStats.order_count) / previousStats.order_count * 100).toFixed(1)
    : 0
  const costChange = previousStats.cost > 0
    ? ((currentStats.cost - previousStats.cost) / previousStats.cost * 100).toFixed(1)
    : 0
  const profitChange = previousStats.profit !== 0
    ? previousStats.profit > 0
      ? ((currentStats.profit - previousStats.profit) / Math.abs(previousStats.profit) * 100).toFixed(1)
      : 0
    : 0

  return {
    current: { week: current, ...currentStats },
    previous: prev ? { week: prev, ...previousStats } : null,
    change,
    revenueChange,
    costChange,
    profitChange,
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
  const costMap = getDishCostMap()
  const months = {}
  for (const o of data.orders) {
    const wk = data.weeks.find(w => w.id === o.week_id)
    if (!wk) continue
    const key = getMonthKey(wk.week_start)
    if (!months[key]) months[key] = { orders: new Set(), revenue: 0, cost: 0, dishes: 0 }
    months[key].orders.add(o.id)
  }

  for (const [key, val] of Object.entries(months)) {
    const items = data.orderItems.filter(oi => val.orders.has(oi.order_id))
    let revenue = 0
    let cost = 0
    let dishes = 0
    for (const oi of items) {
      const dish = data.dishes.find(d => d.id === oi.dish_id)
      revenue += (dish?.price || 0) * oi.quantity
      cost += (costMap[dish?.id] || 0) * oi.quantity
      dishes += oi.quantity
    }
    months[key] = {
      month: key,
      order_count: val.orders.size,
      revenue,
      cost,
      profit: revenue - cost,
      total_dishes: dishes
    }
  }

  return Object.values(months)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12)
}

function getQuarterlyTrend() {
  const months = getMonthlyTrend()
  const quarters = {}
  for (const m of months) {
    const q = Math.ceil(parseInt(m.month.slice(5)) / 3)
    const key = `${m.month.slice(0, 4)}-T${q}`
    if (!quarters[key]) {
      quarters[key] = { quarter: key, order_count: 0, revenue: 0, cost: 0, total_dishes: 0 }
    }
    quarters[key].order_count += m.order_count
    quarters[key].revenue += m.revenue
    quarters[key].cost += m.cost
    quarters[key].total_dishes += m.total_dishes
    quarters[key].profit = quarters[key].revenue - quarters[key].cost
  }
  return Object.values(quarters).sort((a, b) => a.quarter.localeCompare(b.quarter)).slice(-8)
}

function getYearlyTrend() {
  const costMap = getDishCostMap()
  const years = {}
  for (const o of data.orders) {
    const wk = data.weeks.find(w => w.id === o.week_id)
    if (!wk) continue
    const key = getYearKey(wk.week_start)
    if (!years[key]) years[key] = { orders: new Set(), revenue: 0, cost: 0, dishes: 0 }
    years[key].orders.add(o.id)
  }

  for (const [key, val] of Object.entries(years)) {
    const items = data.orderItems.filter(oi => val.orders.has(oi.order_id))
    let revenue = 0
    let cost = 0
    let dishes = 0
    for (const oi of items) {
      const dish = data.dishes.find(d => d.id === oi.dish_id)
      revenue += (dish?.price || 0) * oi.quantity
      cost += (costMap[dish?.id] || 0) * oi.quantity
      dishes += oi.quantity
    }
    years[key] = {
      year: key,
      order_count: val.orders.size,
      revenue,
      cost,
      profit: revenue - cost,
      total_dishes: dishes
    }
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
  const revenueChange = previous.revenue > 0
    ? ((current.revenue - previous.revenue) / previous.revenue * 100).toFixed(1)
    : 0
  const costChange = previous.cost > 0
    ? ((current.cost - previous.cost) / previous.cost * 100).toFixed(1)
    : 0
  const profitChange = previous.profit !== 0
    ? previous.profit > 0
      ? ((current.profit - previous.profit) / Math.abs(previous.profit) * 100).toFixed(1)
      : 0
    : 0
  return { current, previous, change, revenueChange, costChange, profitChange }
}

function getYearComparison() {
  const years = getYearlyTrend()
  if (years.length < 2) return { current: null, previous: null, change: 0 }
  const current = years[years.length - 1]
  const previous = years[years.length - 2]
  const change = previous.total_dishes > 0
    ? ((current.total_dishes - previous.total_dishes) / previous.total_dishes * 100).toFixed(1)
    : 0
  const revenueChange = previous.revenue > 0
    ? ((current.revenue - previous.revenue) / previous.revenue * 100).toFixed(1)
    : 0
  const costChange = previous.cost > 0
    ? ((current.cost - previous.cost) / previous.cost * 100).toFixed(1)
    : 0
  const profitChange = previous.profit !== 0
    ? previous.profit > 0
      ? ((current.profit - previous.profit) / Math.abs(previous.profit) * 100).toFixed(1)
      : 0
    : 0
  return { current, previous, change, revenueChange, costChange, profitChange }
}

function getDayOfWeekDistribution() {
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const counts = [0, 0, 0, 0, 0, 0, 0]
  for (const o of data.orders) {
    const d = new Date(o.created_at)
    const day = d.getDay()
    counts[day]++
  }
  return dayNames.map((name, i) => ({ day: i, name, count: counts[i] }))
}

function getDishProfitability() {
  const costMap = getDishCostMap()
  return data.dishes
    .filter(d => d.is_active)
    .map(d => {
      const cost = costMap[d.id] || 0
      const price = d.price || 0
      const margin = price > 0 ? ((price - cost) / price * 100) : 0
      const hasIngredients = Array.isArray(d.ingredients) && d.ingredients.length > 0
      return {
        id: d.id,
        name: d.name,
        price,
        cost,
        profit: price - cost,
        margin,
        hasIngredients
      }
    })
    .sort((a, b) => b.margin - a.margin)
}

function getTrendsInRange(startDate, endDate) {
  const orderIds = new Set(getOrdersInRange(startDate, endDate))
  const costMap = getDishCostMap()
  const weekly = {}
  const monthly = {}
  const yearly = {}

  for (const oi of data.orderItems) {
    if (!orderIds.has(oi.order_id)) continue
    const order = data.orders.find(o => o.id === oi.order_id)
    const dish = data.dishes.find(d => d.id === oi.dish_id)
    if (!order || !dish) continue
    const revenue = (oi.unit_price ?? dish.price ?? 0) * oi.quantity
    const cost = (oi.unit_cost ?? costMap[dish.id] ?? 0) * oi.quantity

    const wk = data.weeks.find(w => w.id === order.week_id)
    if (wk) {
      const wkey = wk.week_start
      if (!weekly[wkey]) weekly[wkey] = { dishes: 0, revenue: 0, cost: 0, orderIds: new Set() }
      weekly[wkey].dishes += oi.quantity
      weekly[wkey].revenue += revenue
      weekly[wkey].cost += cost
      weekly[wkey].orderIds.add(order.id)

      const mk = getMonthKey(wk.week_start)
      if (!monthly[mk]) monthly[mk] = { dishes: 0, revenue: 0, cost: 0, orderIds: new Set() }
      monthly[mk].dishes += oi.quantity
      monthly[mk].revenue += revenue
      monthly[mk].cost += cost
      monthly[mk].orderIds.add(order.id)

      const yk = getYearKey(wk.week_start)
      if (!yearly[yk]) yearly[yk] = { dishes: 0, revenue: 0, cost: 0, orderIds: new Set() }
      yearly[yk].dishes += oi.quantity
      yearly[yk].revenue += revenue
      yearly[yk].cost += cost
      yearly[yk].orderIds.add(order.id)
    }
  }

  const mapResult = (obj, keyName) => Object.entries(obj)
    .map(([k, v]) => ({ [keyName]: k, total_dishes: v.dishes, revenue: v.revenue, cost: v.cost, profit: v.revenue - v.cost, order_count: v.orderIds.size }))
    .sort((a, b) => a[keyName].localeCompare(b[keyName]))

  const quarterly = {}
  for (const m of mapResult(monthly, 'month')) {
    const q = Math.ceil(parseInt(m.month.slice(5)) / 3)
    const key = `${m.month.slice(0, 4)}-T${q}`
    if (!quarterly[key]) quarterly[key] = { total_dishes: 0, revenue: 0, cost: 0, order_count: 0 }
    quarterly[key].total_dishes += m.total_dishes
    quarterly[key].revenue += m.revenue
    quarterly[key].cost += m.cost
    quarterly[key].order_count += m.order_count
    quarterly[key].profit = quarterly[key].revenue - quarterly[key].cost
  }

  return {
    weekly: mapResult(weekly, 'week_start'),
    monthly: mapResult(monthly, 'month'),
    quarterly: Object.entries(quarterly).map(([k, v]) => ({ quarter: k, ...v })).sort((a, b) => a.quarter.localeCompare(b.quarter)),
    yearly: mapResult(yearly, 'year')
  }
}

function getDishTimeSeries(dishId, startDate, endDate) {
  const orderIdSet = new Set(getOrdersInRange(startDate, endDate))
  const costMap = getDishCostMap()
  const periods = {}

  for (const oi of data.orderItems) {
    if (oi.dish_id !== dishId) continue
    if (!orderIdSet.has(oi.order_id)) continue
    const order = data.orders.find(o => o.id === oi.order_id)
    if (!order) continue
    const wk = data.weeks.find(w => w.id === order.week_id)
    if (!wk) continue
    if (!periods[wk.week_start]) periods[wk.week_start] = { ordered: 0, produced: 0 }
    periods[wk.week_start].ordered += oi.quantity
  }

  const start = startDate ? new Date(startDate) : null
  const end = endDate ? new Date(endDate + 'T23:59:59') : null
  for (const pl of data.productionLog) {
    if (pl.dish_id !== dishId) continue
    const plDate = new Date(pl.date_produced)
    if (start && plDate < start) continue
    if (end && plDate > end) continue
    const wk = data.weeks.find(w => w.week_start <= pl.date_produced && w.week_end >= pl.date_produced)
    if (!wk) continue
    if (!periods[wk.week_start]) periods[wk.week_start] = { ordered: 0, produced: 0 }
    periods[wk.week_start].produced += pl.quantity_produced
  }

  return Object.entries(periods)
    .map(([k, v]) => ({ period: k, ordered: v.ordered, produced: v.produced, overproduction: Math.max(0, v.produced - v.ordered) }))
    .sort((a, b) => a.period.localeCompare(b.period))
}

function getClientTimeSeries(clientId, startDate, endDate) {
  const orderIds = getOrdersInRange(startDate, endDate)
  const orderSet = new Set(orderIds)
  const periods = {}

  for (const o of data.orders) {
    if (o.client_id !== clientId) continue
    if (!orderSet.has(o.id)) continue
    const wk = data.weeks.find(w => w.id === o.week_id)
    if (!wk) continue
    if (!periods[wk.week_start]) periods[wk.week_start] = 0
    periods[wk.week_start]++
  }

  return Object.entries(periods)
    .map(([k, v]) => ({ period: k, orders: v }))
    .sort((a, b) => a.period.localeCompare(b.period))
}

function getOrdersInRange(startDate, endDate) {
  if (!startDate && !endDate) return data.orders.map(o => o.id)
  const start = startDate ? new Date(startDate) : new Date(0)
  const end = endDate ? new Date(endDate + 'T23:59:59') : new Date(864e12)
  return data.orders
    .filter(o => {
      const d = new Date(o.created_at)
      return d >= start && d <= end
    })
    .map(o => o.id)
}

function getStatsForOrderIds(orderIds) {
  const orderSet = new Set(orderIds)
  const costMap = getDishCostMap()
  const dishData = {}
  const clientData = {}
  const dayCounts = [0, 0, 0, 0, 0, 0, 0]
  let totalRevenue = 0
  let totalCost = 0

  for (const oi of data.orderItems) {
    if (!orderSet.has(oi.order_id)) continue
    const order = data.orders.find(o => o.id === oi.order_id)
    const dish = data.dishes.find(d => d.id === oi.dish_id)
    if (!dish) continue

    const cost = oi.unit_cost ?? costMap[dish.id] ?? 0
    const revenue = (oi.unit_price ?? dish.price ?? 0) * oi.quantity
    const itemCost = cost * oi.quantity

    totalRevenue += revenue
    totalCost += itemCost

    if (!dishData[dish.id]) {
      dishData[dish.id] = { id: dish.id, name: dish.name, price: dish.price || 0, costPerUnit: cost, total: 0, totalCost: 0, totalRevenue: 0, orderIds: new Set() }
    }
    dishData[dish.id].total += oi.quantity
    dishData[dish.id].totalCost += itemCost
    dishData[dish.id].totalRevenue += revenue
    dishData[dish.id].orderIds.add(oi.order_id)

    if (order && order.client_id) {
      const ckey = `${order.client_id}`
      if (!clientData[ckey]) {
        const client = data.clients.find(c => c.id === order.client_id)
        clientData[ckey] = {
          clientId: order.client_id,
          name: client?.name || '',
          last_name: client?.last_name || '',
          orderIds: new Set(),
          total_dishes: 0,
          dishCounts: {},
          totalRevenue: 0
        }
      }
      clientData[ckey].orderIds.add(order.id)
      clientData[ckey].total_dishes += oi.quantity
      clientData[ckey].dishCounts[`${dish.id}`] = (clientData[ckey].dishCounts[`${dish.id}`] || 0) + oi.quantity
      clientData[ckey].totalRevenue += revenue
    }

    if (order) {
      const d = new Date(order.created_at)
      dayCounts[d.getDay()]++
    }
  }

  const topDishes = Object.values(dishData)
    .map(d => ({
      id: d.id,
      name: d.name, total: d.total, price: d.price,
      cost: d.costPerUnit, profit: d.price - d.costPerUnit,
      totalRevenue: d.totalRevenue, totalCost: d.totalCost,
      totalProfit: d.totalRevenue - d.totalCost,
      orderCount: d.orderIds.size
    }))
    .sort((a, b) => b.total - a.total)

  const topClients = Object.values(clientData)
    .map(c => {
      let favoriteId = null, maxCount = 0
      for (const [did, count] of Object.entries(c.dishCounts)) {
        if (count > maxCount) { maxCount = count; favoriteId = parseInt(did) }
      }
      const favDish = favoriteId ? data.dishes.find(d => d.id === favoriteId) : null
      return { clientId: c.clientId, name: c.name, last_name: c.last_name, order_count: c.orderIds.size, total_dishes: c.total_dishes, totalRevenue: c.totalRevenue, favorite_dish: favDish?.name || null }
    })
    .sort((a, b) => b.order_count - a.order_count)

  const totalProfit = totalRevenue - totalCost

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const dayOfWeek = dayNames.map((name, i) => ({ day: i, name, count: dayCounts[i] }))

  const dishProfitability = data.dishes
    .filter(d => d.is_active)
    .map(d => {
      const cost = costMap[d.id] || 0
      const price = d.price || 0
      const margin = price > 0 ? ((price - cost) / price * 100) : 0
      return { id: d.id, name: d.name, price, cost, profit: price - cost, margin, hasIngredients: Array.isArray(d.ingredients) && d.ingredients.length > 0 }
    })
    .sort((a, b) => b.margin - a.margin)

  return { topDishes, topClients, revenue: totalRevenue, totalCost, totalProfit, totalOrders: orderIds.length, dayOfWeek, dishProfitability }
}

function getOverproductionInRange(startDate, endDate) {
  const orderIds = getOrdersInRange(startDate, endDate)
  const orderSet = new Set(orderIds)
  const costMap = getDishCostMap()
  const dishMap = {}

  const start = startDate ? new Date(startDate) : null
  const end = endDate ? new Date(endDate + 'T23:59:59') : null

  for (const pl of data.productionLog) {
    const plDate = new Date(pl.date_produced)
    if (start && plDate < start) continue
    if (end && plDate > end) continue
    if (!dishMap[pl.dish_id]) dishMap[pl.dish_id] = { produced: 0, ordered: 0 }
    dishMap[pl.dish_id].produced += pl.quantity_produced
  }

  for (const oi of data.orderItems) {
    if (!orderSet.has(oi.order_id)) continue
    if (!dishMap[oi.dish_id]) dishMap[oi.dish_id] = { produced: 0, ordered: 0 }
    dishMap[oi.dish_id].ordered += oi.quantity
  }

  let totalOverproduction = 0
  let totalOverproductionCost = 0
  const perDish = Object.entries(dishMap).map(([id, v]) => {
    const dish = data.dishes.find(d => d.id === parseInt(id))
    const over = Math.max(0, v.produced - v.ordered)
    const cost = costMap[parseInt(id)] || 0
    totalOverproduction += over
    totalOverproductionCost += over * cost
    return {
      dishId: parseInt(id),
      dishName: dish?.name || 'Desconocido',
      ordered: v.ordered,
      produced: v.produced,
      overproduction: over,
      cost
    }
  }).filter(d => d.ordered > 0 || d.produced > 0)

  return { totalOverproduction, totalOverproductionCost, perDish }
}

function getAnalyticsFiltered(startDate, endDate) {
  const orderIds = getOrdersInRange(startDate, endDate)
  return getStatsForOrderIds(orderIds)
}

function getPeriodComparison(p1Start, p1End, p2Start, p2End) {
  const p1Ids = getOrdersInRange(p1Start, p1End)
  const p2Ids = getOrdersInRange(p2Start, p2End)

  const compute = (ids) => {
    let revenue = 0, cost = 0, profit = 0
    const costMap = getDishCostMap()
    const idSet = new Set(ids)
    for (const oi of data.orderItems) {
      if (!idSet.has(oi.order_id)) continue
      const dish = data.dishes.find(d => d.id === oi.dish_id)
      if (!dish) continue
      revenue += (oi.unit_price ?? dish.price ?? 0) * oi.quantity
      cost += (oi.unit_cost ?? costMap[dish.id] ?? 0) * oi.quantity
    }
    profit = revenue - cost
    return { orders: ids.length, revenue, cost, profit, margin: revenue > 0 ? ((revenue - cost) / revenue * 100) : 0 }
  }

  const p1 = compute(p1Ids)
  const p2 = compute(p2Ids)

  const pct = (a, b) => b !== 0 ? ((a - b) / Math.abs(b) * 100).toFixed(1) : 0

  return {
    period1: p1,
    period2: p2,
    changes: {
      orders: pct(p2.orders, p1.orders),
      revenue: pct(p2.revenue, p1.revenue),
      cost: pct(p2.cost, p1.cost),
      profit: pct(p2.profit, p1.profit),
      margin: (p2.margin - p1.margin).toFixed(1)
    }
  }
}

function getDefaultDeliveryFee() {
  return data.deliverySettings?.defaultFee || 500
}

function setDefaultDeliveryFee(fee) {
  if (!data.deliverySettings) data.deliverySettings = {}
  data.deliverySettings.defaultFee = Number(fee) || 0
  save()
}

function getWeekOrderCounts() {
  const week = getCurrentWeek()
  const counts = { pending: 0, confirmed: 0, assembled: 0, delivered: 0, total: 0 }
  for (const o of data.orders) {
    if (o.week_id !== week.id) continue
    counts.total++
    if (counts[o.status] !== undefined) counts[o.status]++
  }
  return counts
}

function getEntityCounts() {
  const allDishes = data.dishes || []
  const allClients = data.clients || []
  const allIngredients = data.ingredients || []
  return {
    totalClients: allClients.length,
    totalDishes: allDishes.length,
    activeDishes: allDishes.filter(d => d.is_active).length,
    inactiveDishes: allDishes.filter(d => !d.is_active).length,
    totalIngredients: allIngredients.length,
    activeIngredients: allIngredients.filter(i => i.is_active !== false).length
  }
}

function getPriceReview(threshold = 30) {
  const now = Date.now()
  const ingredients = data.ingredients
    .filter(i => i.is_active !== false)
    .map(i => {
      const lastUpdate = i.last_cost_update ? new Date(i.last_cost_update).getTime() : 0
      const daysSince = lastUpdate ? Math.floor((now - lastUpdate) / 86400000) : 999
      return { ...i, daysSinceUpdate: daysSince, isStale: daysSince >= threshold }
    })
    .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate)

  const staleIds = new Set(ingredients.filter(i => i.isStale).map(i => i.id))
  const ingById = {}
  for (const i of data.ingredients) ingById[i.id] = i
  const adjusted = ingredients.map(i => {
    if (i.subIngredients && i.subIngredients.length > 0) {
      const staleSubs = i.subIngredients
        .filter(si => staleIds.has(si.ingredientId))
        .map(si => ingById[si.ingredientId]?.name || 'Ingrediente eliminado')
      return { ...i, isStale: staleSubs.length > 0, staleSubNames: staleSubs }
    }
    return i
  })
    .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate)

  const dishPrices = data.dishes.filter(d => d.is_active !== false).map(d => {
    const computedCost = calculateDishCost(d.id)
    return {
      id: d.id, name: d.name, price: d.price || 0, category: d.category || '',
      computedCost: computedCost || 0,
      margin: d.price > 0 ? ((d.price - computedCost) / d.price * 100) : 0,
      profit: (d.price || 0) - (computedCost || 0),
      last_price_review: d.last_price_review || null
    }
  })

  return { ingredients: adjusted, dishPrices }
}

function close() {
  save()
}

function getExportData() {
  return JSON.parse(JSON.stringify(data))
}

function importData(newData) {
  const required = ['weeks', 'dishes', 'clients', 'orders', 'orderItems', 'ingredients']
  for (const key of required) {
    if (!Array.isArray(newData[key])) throw new Error(`Campo inválido: ${key}`)
  }
  data = { ...defaultData(), ...newData }
  nextId = data._nextId || 1
  save()
}

function getSalesForExport(startDate, endDate) {
  const orderIds = getOrdersInRange(startDate, endDate)
  const orderSet = new Set(orderIds)
  const costMap = getDishCostMap()
  const rows = []
  for (const oi of data.orderItems) {
    if (!orderSet.has(oi.order_id)) continue
    const order = data.orders.find(o => o.id === oi.order_id)
    const dish = data.dishes.find(d => d.id === oi.dish_id)
    if (!dish || !order) continue
    const client = data.clients.find(c => c.id === order.client_id)
    const cost = oi.unit_cost ?? costMap[dish.id] ?? 0
    const revenue = (oi.unit_price ?? dish.price ?? 0) * oi.quantity
    const itemCost = cost * oi.quantity
    rows.push({
      order_id: `#${order.id}`,
      fecha: order.created_at?.split(' ')[0] || '',
      cliente: client ? `${client.name} ${client.last_name}`.trim() : '—',
      plato: dish.name,
      cantidad: oi.quantity,
      precio_unitario: oi.unit_price ?? dish.price ?? 0,
      ingreso: revenue,
      costo: itemCost,
      ganancia: revenue - itemCost,
      estado: order.status || '',
      semana: order.week_id
    })
  }
  return rows
}

function markIngredientUpdated(id) {
  const item = data.ingredients.find(i => i.id === id)
  if (!item) return { success: false }
  item.last_cost_update = new Date().toISOString()
  save()
  return { success: true }
}

function markDishPriceUpdated(id) {
  const dish = data.dishes.find(d => d.id === id)
  if (!dish) return { success: false }
  dish.last_price_review = new Date().toISOString()
  save()
  return { success: true }
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
  getSubProductQuantities,
  getWeeklyTrend,
  getWeekComparison,
  getPreviousWeeks,
  completeDishProduction,
  markOrderAssembled,
  unmarkOrderAssembled,
  markOrderDelivered,
  unmarkOrderDelivered,
  clientHasOrderThisWeek,
  getMonthlyTrend,
  getYearlyTrend,
  getMonthComparison,
  getYearComparison,
  getIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  getOrdersInRange,
  calculateDishCost,
  getResolvedCost,
  getIngredientCategories,
  getDayOfWeekDistribution,
  getDishProfitability,
  getAnalyticsFiltered,
  getPeriodComparison,
  getTrendsInRange,
  getDishTimeSeries,
  getClientTimeSeries,
  getOverproductionInRange,
  getWeekOrderCounts,
  getEntityCounts,
  getDefaultDeliveryFee,
  setDefaultDeliveryFee,
  getPriceReview,
  getExportData,
  importData,
  getSalesForExport,
  markIngredientUpdated,
  markDishPriceUpdated
}
