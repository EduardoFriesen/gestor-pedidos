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
    recalcCompositeCosts()
  } catch {
    data = defaultData()
    save()
  }
  migratePaidFlag()
}

function migratePaidFlag() {
  if (data._paidMigrated) return
  for (const o of data.orders) {
    o.paid = o.status === 'delivered'
    o.paid_at = null
  }
  data._paidMigrated = true
  save()
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

  let week = data.weeks.find(w => w.week_start === weekStart)
  if (week && week.is_current) return week

  data.weeks.forEach(w => w.is_current = false)

  if (!week) {
    week = { id: genId(), week_start: weekStart, week_end: weekEnd, is_current: true }
    data.weeks.push(week)
  }
  week.is_current = true
  save()
  return week
}

function getOrCreateNextWeek() {
  const current = getCurrentWeek()
  const [y, m, d] = current.week_start.split('-').map(Number)
  const { weekStart, weekEnd } = getWeekRange(new Date(y, m - 1, d + 7))
  let week = data.weeks.find(w => w.week_start === weekStart)
  if (!week) {
    week = { id: genId(), week_start: weekStart, week_end: weekEnd, is_current: false }
    data.weeks.push(week)
    save()
  }
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
  const totalOverproduction = dishes.reduce((s, d) => s + d.overproduction, 0)

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
  const entries = data.productionLog
    .filter(pl => pl.week_id === week.id && pl.dish_id === dishId && pl.quantity_produced > 0)
    .sort((a, b) => (b.date_produced || '').localeCompare(a.date_produced || '') || b.id - a.id)
  const latest = entries[0]
  if (!latest) return { success: false }
  latest.quantity_produced -= 1
  if (latest.quantity_produced <= 0) {
    data.productionLog = data.productionLog.filter(pl => pl !== latest)
  }
  save()
  return { success: true }
}

function completeDishProduction(dishId) {
  const dashboard = getDashboard()
  const dish = dashboard.dishes.find(d => d.id === dishId)
  if (!dish || dish.total_ordered <= 0) return { success: false }
  const remaining = dish.total_ordered - dish.total_produced
  if (remaining <= 0) return { success: false }
  return addProduction(dishId, remaining)
}

function enrichOrder(o) {
  const c = data.clients.find(cl => cl.id === o.client_id)
  const items = data.orderItems.filter(oi => oi.order_id === o.id).map(oi => {
    const d = data.dishes.find(dh => dh.id === oi.dish_id)
    const quantity = oi.quantity || 0
    const unitPrice = oi.unit_price ?? d?.price ?? 0
    return {
      ...oi,
      dish_name: d?.name || '—',
      price: d?.price || 0,
      unit_price: unitPrice,
      subtotal: unitPrice * quantity
    }
  })
  const itemsTotal = items.reduce((s, i) => s + i.subtotal, 0)
  const deliveryFee = o.delivery_fee || 0
  const total = o.has_delivery ? itemsTotal + deliveryFee : itemsTotal
  return {
    ...o,
    has_delivery: !!o.has_delivery,
    delivery_fee: deliveryFee,
    paid: !!o.paid,
    paid_at: o.paid_at || null,
    assembled_at: o.assembled_at || null,
    delivered_at: o.delivered_at || null,
    client_name: c ? `${c.name} ${c.last_name}`.trim() : '—',
    client_phone: c?.phone || '',
    client_address: c?.address || '',
    client_locality: c?.locality || '',
    items,
    items_total: itemsTotal,
    total
  }
}

function getOrders() {
  const week = getCurrentWeek()
  const orders = data.orders
    .filter(o => o.week_id === week.id)
    .map(enrichOrder)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return orders
}

function createOrder({ clientId, weekId, items, notes, has_delivery, delivery_fee, delivery_day }) {
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
    delivery_day: has_delivery ? (['lunes','martes','miercoles','jueves','viernes','sabado','domingo'].includes(delivery_day) ? delivery_day : 'viernes') : null,
    paid: false,
    paid_at: null,
    assembled_at: null,
    delivered_at: null,
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

function updateOrder({ id, clientId, items, notes, has_delivery, delivery_fee, delivery_day }) {
  const order = data.orders.find(o => o.id === id)
  if (!order) return { success: false }
  if (!data.clients.some(c => c.id === clientId)) return { success: false, reason: 'invalid_client' }
  order.client_id = clientId
  order.notes = notes || ''
  order.has_delivery = !!has_delivery
  order.delivery_fee = Number(delivery_fee) || 0
  order.delivery_day = has_delivery ? (['lunes','martes','miercoles','jueves','viernes','sabado','domingo'].includes(delivery_day) ? delivery_day : 'viernes') : null

  const validItems = (items || []).filter(item => item.dishId && data.dishes.some(d => d.id === item.dishId) && (item.quantity || 0) > 0)
  const previous = new Map(data.orderItems.filter(oi => oi.order_id === id).map(oi => [oi.dish_id, oi]))
  data.orderItems = data.orderItems.filter(oi => oi.order_id !== id)
  for (const item of validItems) {
    const prev = previous.get(item.dishId)
    data.orderItems.push({
      id: genId(),
      order_id: id,
      dish_id: item.dishId,
      quantity: Math.max(1, item.quantity || 1),
      unit_price: prev?.unit_price ?? snapUnitPrice(item.dishId),
      unit_cost: prev?.unit_cost ?? snapUnitCost(item.dishId)
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
  order.assembled_at = getLocaleDatetime()
  save()
  return { success: true }
}

function unmarkOrderAssembled(id) {
  const order = data.orders.find(o => o.id === id)
  if (!order) return { success: false }
  order.status = 'confirmed'
  order.assembled_at = null
  save()
  return { success: true }
}

function markOrderDelivered(id) {
  const order = data.orders.find(o => o.id === id)
  if (!order || order.status !== 'assembled') return { success: false }
  order.status = 'delivered'
  order.delivered_at = getLocaleDatetime()
  save()
  return { success: true }
}

function unmarkOrderDelivered(id) {
  const order = data.orders.find(o => o.id === id)
  if (!order || order.status !== 'delivered') return { success: false }
  order.status = 'assembled'
  order.delivered_at = null
  save()
  return { success: true }
}

function markOrderPaid(id) {
  const order = data.orders.find(o => o.id === id)
  if (!order || order.paid) return { success: false }
  order.paid = true
  order.paid_at = getLocaleDatetime()
  save()
  return { success: true }
}

function unmarkOrderPaid(id) {
  const order = data.orders.find(o => o.id === id)
  if (!order || !order.paid) return { success: false }
  order.paid = false
  order.paid_at = null
  save()
  return { success: true }
}

function clientHasOrderThisWeek(clientId, weekId = null) {
  const wid = weekId ?? getCurrentWeek().id
  return data.orders.some(o => o.client_id === clientId && o.week_id === wid)
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
      return { ...c, ...enrichOrder(o) }
    })
    .sort((a, b) => {
      const nameA = `${a.last_name || ''} ${a.name || ''}`.trim()
      const nameB = `${b.last_name || ''} ${b.name || ''}`.trim()
      return nameA.localeCompare(nameB)
    })
  return orders
}

function getUndeliveredPastWeeks() {
  const current = getCurrentWeek()
  return data.weeks
    .filter(w => w.week_start < current.week_start)
    .sort((a, b) => b.week_start.localeCompare(a.week_start))
    .map(week => ({
      week,
      orders: getOrdersByWeekId(week.id).filter(o => o.status !== 'delivered')
    }))
    .filter(w => w.orders.length > 0)
}

function markPastOrdersDelivered(ids) {
  if (!Array.isArray(ids)) return { success: false, updated: 0 }
  const current = getCurrentWeek()
  const pastWeekIds = new Set(data.weeks.filter(w => w.week_start < current.week_start).map(w => w.id))
  let updated = 0
  for (const id of ids) {
    const order = data.orders.find(o => o.id === id)
    if (!order || !pastWeekIds.has(order.week_id) || order.status === 'delivered') continue
    order.status = 'delivered'
    order.delivered_at = getLocaleDatetime()
    updated++
  }
  if (updated > 0) save()
  return { success: true, updated }
}

function getClientOrderHistory(clientId) {
  const orders = data.orders
    .filter(o => o.client_id === clientId)
    .map(o => { const c = data.clients.find(cl => cl.id === o.client_id); return { ...c, ...enrichOrder(o) } })
    .sort((a, b) => {
      const d = new Date(b.created_at) - new Date(a.created_at)
      if (d !== 0) return d
      return b.id - a.id
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
    is_active: d.is_active !== false,
    last_price_review: new Date().toISOString()
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
  const currentWeek = getCurrentWeek()
  const currentWeekOrderIds = new Set(
    data.orders.filter(o => o.week_id === currentWeek.id).map(o => o.id)
  )
  const hasOrdersThisWeek = data.orderItems.some(
    oi => oi.dish_id === id && currentWeekOrderIds.has(oi.order_id)
  )
  if (hasOrdersThisWeek) return { success: false, reason: 'has_orders_this_week' }
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
  recalcCompositeCosts()
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
  const newUnit = ing.unit || 'uni'
  if (item.unit && newUnit !== item.unit) {
    const factor = unitFactor(item.unit, newUnit)
    const usage = getIngredientUsage(item.id)
    if (factor === null && (usage.dishes.length > 0 || usage.subProducts.length > 0)) {
      return { success: false, reason: 'unit_in_use' }
    }
    if (factor !== null) convertIngredientReferences(item.id, factor)
  }
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
  recalcCompositeCosts()
  save()
  return { success: true }
}

const UNIT_FAMILIES = [['kg', 'g', 'mg'], ['l', 'ml'], ['uni', 'doc'], ['cda', 'cdta', 'taza', 'pizca']]
const UNIT_TO_BASE = { kg: 1, g: 0.001, mg: 0.000001, l: 1, ml: 0.001, uni: 1, doc: 12, cda: 1, cdta: 1 / 3, taza: 16, pizca: 1 / 16 }

function unitFactor(fromUnit, toUnit) {
  if (fromUnit === toUnit) return 1
  const family = UNIT_FAMILIES.find(f => f.includes(fromUnit))
  if (!family || !family.includes(toUnit)) return null
  return UNIT_TO_BASE[fromUnit] / UNIT_TO_BASE[toUnit]
}

function convertIngredientReferences(ingId, factor) {
  for (const dish of data.dishes) {
    if (!Array.isArray(dish.ingredients)) continue
    for (const di of dish.ingredients) {
      if (di.ingredientId === ingId) di.quantity = di.quantity * factor
    }
  }
  for (const other of data.ingredients) {
    for (const si of other.subIngredients || []) {
      if (si.ingredientId === ingId) si.quantity = si.quantity * factor
    }
  }
}

function recalcCompositeCosts() {
  for (const ing of data.ingredients || []) {
    if (ing.subIngredients && ing.subIngredients.length > 0) {
      ing.cost = getResolvedCost(ing.id)
    }
  }
}

function getIngredientUsage(id) {
  const dishes = data.dishes
    .filter(d => Array.isArray(d.ingredients) && d.ingredients.some(i => i.ingredientId === id))
    .map(d => d.name)
  const subProducts = data.ingredients
    .filter(i => i.id !== id && (i.subIngredients || []).some(si => si.ingredientId === id))
    .map(i => i.name)
  return { dishes, subProducts }
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
  recalcCompositeCosts()
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
  const stats = {}
  for (const o of data.orders) {
    const s = stats[o.client_id] || (stats[o.client_id] = { order_count: 0, last_order_at: null })
    s.order_count++
    if (!s.last_order_at || (o.created_at || '') > s.last_order_at) s.last_order_at = o.created_at || null
  }
  return data.clients.map(c => ({ ...c, order_count: stats[c.id]?.order_count || 0, last_order_at: stats[c.id]?.last_order_at || null })).sort((a, b) => {
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
    locality: c.locality || '',
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
  client.locality = c.locality || ''
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

  const orderedByDish = {}
  for (const wi of weekItems) {
    orderedByDish[wi.dish_id] = (orderedByDish[wi.dish_id] || 0) + wi.quantity
  }
  const producedByDish = {}
  for (const pl of data.productionLog) {
    if (pl.week_id === week.id) producedByDish[pl.dish_id] = (producedByDish[pl.dish_id] || 0) + pl.quantity_produced
  }

  const agg = {}
  for (const [dishIdStr, ordered] of Object.entries(orderedByDish)) {
    const dishId = Number(dishIdStr)
    const dish = data.dishes.find(d => d.id === dishId)
    if (!dish) continue
    const pending = Math.max(0, ordered - (producedByDish[dishId] || 0))
    const dishIngredients = typeof dish.ingredients === 'string' ? [] : (dish.ingredients || [])
    for (const item of dishIngredients) {
      const ing = data.ingredients.find(i => i.id === item.ingredientId)
      if (!ing || !ing.subIngredients || ing.subIngredients.length === 0) continue
      const key = `${ing.id}`
      if (!agg[key]) {
        agg[key] = { id: ing.id, name: ing.name, unit: ing.unit, total: 0, remaining: 0, breakdown: {} }
      }
      agg[key].total += item.quantity * ordered
      agg[key].remaining += item.quantity * pending
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
        sp.breakdown[si.ingredientId] = { name: baseIng.name, unit: baseIng.unit, total: 0, remaining: 0 }
      }
      sp.breakdown[si.ingredientId].total += perUnit * sp.total
      sp.breakdown[si.ingredientId].remaining += perUnit * sp.remaining
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
  const orderIds = new Set(getRevenueOrdersInRange(startDate, endDate))
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

  const start = startDate ? parseLocalDate(startDate) : null
  const end = endDate ? new Date(endDate + 'T23:59:59') : null
  for (const pl of data.productionLog) {
    if (pl.dish_id !== dishId) continue
    const plDate = parseLocalDate(pl.date_produced)
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

function parseLocalDate(str) {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(str) ? str + 'T00:00:00' : str)
}

function getOrdersInRange(startDate, endDate) {
  if (!startDate && !endDate) return data.orders.map(o => o.id)
  const start = startDate ? parseLocalDate(startDate) : new Date(0)
  const end = endDate ? new Date(endDate + 'T23:59:59') : new Date(864e12)
  const weekStarts = new Map(data.weeks.map(w => [w.id, w.week_start]))
  return data.orders
    .filter(o => {
      const d = parseLocalDate(weekStarts.get(o.week_id) || o.created_at)
      return d >= start && d <= end
    })
    .map(o => o.id)
}

function isRevenueOrder(o) {
  return o.status === 'delivered' && !!o.paid
}

function getRevenueOrdersInRange(startDate, endDate) {
  const ids = new Set(getOrdersInRange(startDate, endDate))
  return data.orders.filter(o => ids.has(o.id) && isRevenueOrder(o)).map(o => o.id)
}

function getStatsForOrderIds(orderIds) {
  const orderSet = new Set(orderIds)
  const costMap = getDishCostMap()
  const dishData = {}
  const clientData = {}
  const dayOrderIds = [new Set(), new Set(), new Set(), new Set(), new Set(), new Set(), new Set()]
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
      dayOrderIds[parseLocalDate(order.created_at).getDay()].add(order.id)
    }
  }

  const topDishes = Object.values(dishData)
    .map(d => {
      const avgPrice = d.total > 0 ? d.totalRevenue / d.total : d.price
      const avgCost = d.total > 0 ? d.totalCost / d.total : d.costPerUnit
      return {
        id: d.id,
        name: d.name, total: d.total, price: avgPrice,
        cost: avgCost, profit: avgPrice - avgCost,
        margin: avgPrice > 0 ? (avgPrice - avgCost) / avgPrice * 100 : null,
        totalRevenue: d.totalRevenue, totalCost: d.totalCost,
        totalProfit: d.totalRevenue - d.totalCost,
        orderCount: d.orderIds.size
      }
    })
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
  const dayOfWeek = dayNames.map((name, i) => ({ day: i, name, count: dayOrderIds[i].size }))

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

  const start = startDate ? parseLocalDate(startDate) : null
  const end = endDate ? new Date(endDate + 'T23:59:59') : null

  for (const pl of data.productionLog) {
    const plDate = parseLocalDate(pl.date_produced)
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
  const orderIds = getRevenueOrdersInRange(startDate, endDate)
  return getStatsForOrderIds(orderIds)
}

function getPeriodComparison(p1Start, p1End, p2Start, p2End) {
  const p1Ids = getRevenueOrdersInRange(p1Start, p1End)
  const p2Ids = getRevenueOrdersInRange(p2Start, p2End)

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
    return { orders: ids.length, revenue, cost, profit, margin: revenue > 0 ? ((revenue - cost) / revenue * 100) : null }
  }

  const p1 = compute(p1Ids)
  const p2 = compute(p2Ids)

  const pct = (a, b) => b !== 0 ? Math.round((a - b) / Math.abs(b) * 1000) / 10 : null

  return {
    period1: p1,
    period2: p2,
    changes: {
      orders: pct(p2.orders, p1.orders),
      revenue: pct(p2.revenue, p1.revenue),
      cost: pct(p2.cost, p1.cost),
      profit: pct(p2.profit, p1.profit),
      margin: p1.revenue > 0 && p2.revenue > 0 ? Math.round((p2.margin - p1.margin) * 10) / 10 : null
    }
  }
}

const DELIVERY_DAY_OFFSET = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 }

function isDateKey(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(parseLocalDate(v))
}

function cleanDate(v) {
  return isDateKey(v) ? v : null
}

function toDateKey(dt) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

function daysBetween(fromKey, toKey) {
  return Math.round((parseLocalDate(toKey) - parseLocalDate(fromKey)) / 864e5)
}

function round2(n) {
  return Math.round(n * 100) / 100
}

function median(values) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function orderDeliveryDate(o) {
  if (o.delivered_at) return o.delivered_at.slice(0, 10)
  const week = data.weeks.find(w => w.id === o.week_id)
  if (!week) {
    const created = (o.created_at || '').slice(0, 10)
    return isDateKey(created) ? created : null
  }
  const d = parseLocalDate(week.week_start)
  d.setDate(d.getDate() + (DELIVERY_DAY_OFFSET[o.delivery_day] ?? DELIVERY_DAY_OFFSET.viernes))
  return toDateKey(d)
}

function clientContact(clientId) {
  const c = data.clients.find(cl => cl.id === clientId)
  return { name: c ? `${c.name || ''} ${c.last_name || ''}`.trim() : '—', phone: c?.phone || '' }
}

function orderItemsTotals() {
  const totals = {}
  for (const oi of data.orderItems) {
    const dish = data.dishes.find(d => d.id === oi.dish_id)
    totals[oi.order_id] = (totals[oi.order_id] || 0) + (oi.unit_price ?? dish?.price ?? 0) * (oi.quantity || 0)
  }
  return totals
}

function getPendingCollections(today) {
  const ref = cleanDate(today) || getLocaleDate()
  const totals = orderItemsTotals()
  const byClient = {}
  let total = 0
  let deliveryFees = 0

  for (const o of data.orders) {
    if (o.status !== 'delivered' || o.paid) continue
    const amount = totals[o.id] || 0
    const fee = o.has_delivery ? (o.delivery_fee || 0) : 0
    const since = orderDeliveryDate(o)
    total += amount
    deliveryFees += fee
    const c = byClient[o.client_id] || (byClient[o.client_id] = { clientId: o.client_id, ...clientContact(o.client_id), amount: 0, deliveryFees: 0, orders: 0, oldestSince: null })
    c.amount += amount
    c.deliveryFees += fee
    c.orders++
    if (since && (!c.oldestSince || since < c.oldestSince)) c.oldestSince = since
  }

  const samplesByClient = {}
  const allSamples = []
  for (const o of data.orders) {
    if (!o.paid || !o.paid_at) continue
    const from = orderDeliveryDate(o)
    const paidKey = o.paid_at.slice(0, 10)
    if (!from || !isDateKey(paidKey)) continue
    const days = Math.max(0, daysBetween(from, paidKey))
    ;(samplesByClient[o.client_id] || (samplesByClient[o.client_id] = [])).push(days)
    allSamples.push(days)
  }
  const avg = (arr) => round2(arr.reduce((a, b) => a + b, 0) / arr.length)
  const payTimes = Object.entries(samplesByClient)
    .map(([id, days]) => ({ clientId: parseInt(id), name: clientContact(parseInt(id)).name, avgDays: avg(days), samples: days.length }))
    .sort((a, b) => b.avgDays - a.avgDays)

  return {
    total,
    deliveryFees,
    byClient: Object.values(byClient)
      .map(c => ({ ...c, daysOwed: c.oldestSince ? Math.max(0, daysBetween(c.oldestSince, ref)) : null }))
      .sort((a, b) => b.amount - a.amount),
    payTimes,
    avgDaysToPay: allSamples.length > 0 ? avg(allSamples) : null
  }
}

function getRevenueItems(startDate, endDate) {
  const orderSet = new Set(getRevenueOrdersInRange(cleanDate(startDate), cleanDate(endDate)))
  const weekStarts = new Map(data.weeks.map(w => [w.id, w.week_start]))
  const costMap = getDishCostMap()
  const items = []
  for (const oi of data.orderItems) {
    if (!orderSet.has(oi.order_id)) continue
    const dish = data.dishes.find(d => d.id === oi.dish_id)
    if (!dish) continue
    const order = data.orders.find(o => o.id === oi.order_id)
    const quantity = oi.quantity || 0
    items.push({
      dish,
      orderId: oi.order_id,
      quantity,
      week: weekStarts.get(order?.week_id) || (order?.created_at || '').slice(0, 10),
      revenue: (oi.unit_price ?? dish.price ?? 0) * quantity,
      cost: (oi.unit_cost ?? costMap[dish.id] ?? 0) * quantity
    })
  }
  return items
}

function getMarginErosion(startDate, endDate) {
  const byDish = {}
  for (const it of getRevenueItems(startDate, endDate)) {
    const entry = byDish[it.dish.id] || (byDish[it.dish.id] = { dish: it.dish, weeks: {} })
    const w = entry.weeks[it.week] || (entry.weeks[it.week] = { revenue: 0, cost: 0, quantity: 0 })
    w.revenue += it.revenue
    w.cost += it.cost
    w.quantity += it.quantity
  }

  const marginOf = (w) => w.revenue > 0 ? round2((w.revenue - w.cost) / w.revenue * 100) : null
  return Object.values(byDish)
    .map(({ dish, weeks }) => {
      const keys = Object.keys(weeks).sort()
      const first = weeks[keys[0]]
      const last = weeks[keys[keys.length - 1]]
      const marginStart = marginOf(first)
      if (marginStart === null || first.quantity === 0) return null
      const priceStart = first.revenue / first.quantity
      const costStart = first.cost / first.quantity
      const priceNow = dish.price || 0
      const costNow = calculateDishCost(dish.id)
      const marginNow = priceNow > 0 ? round2((priceNow - costNow) / priceNow * 100) : null
      return {
        dishId: dish.id,
        name: dish.name,
        firstWeek: keys[0],
        lastWeek: keys[keys.length - 1],
        priceStart,
        costStart,
        priceNow,
        costNow,
        marginStart,
        marginEnd: marginOf(last),
        marginNow,
        deltaPp: marginNow === null ? null : round2(marginNow - marginStart),
        costChangePct: costStart > 0 ? (costNow - costStart) / costStart * 100 : null,
        priceChangePct: priceStart > 0 ? (priceNow - priceStart) / priceStart * 100 : null,
        suggestedPrice: marginStart < 100 && costNow > 0 ? Math.ceil(costNow / (1 - marginStart / 100) / 10) * 10 : null
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a.deltaPp ?? Infinity) - (b.deltaPp ?? Infinity))
}

function getIngredientCostDrivers(startDate, endDate, limit = 10) {
  const max = Math.min(100, Math.max(1, parseInt(limit) || 10))
  const agg = {}
  const missingRecipe = new Set()
  for (const it of getRevenueItems(startDate, endDate)) {
    const recipe = Array.isArray(it.dish.ingredients) ? it.dish.ingredients : []
    if (recipe.length === 0) missingRecipe.add(it.dish.name)
    for (const item of recipe) {
      for (const ex of expandForShoppingList(item.ingredientId, item.quantity, 0, new Set())) {
        const ing = data.ingredients.find(i => i.id === ex.ingredientId)
        if (!ing) continue
        const a = agg[ing.id] || (agg[ing.id] = { ingredientId: ing.id, name: ing.name, unit: ing.unit || '', quantity: 0, cost: 0 })
        a.quantity += ex.quantity * it.quantity
        a.cost += ex.quantity * it.quantity * (ing.cost || 0)
      }
    }
  }
  const sorted = Object.values(agg).sort((a, b) => b.cost - a.cost)
  const totalCost = sorted.reduce((sum, a) => sum + a.cost, 0)
  let running = 0
  const items = sorted.slice(0, max).map(a => {
    running += a.cost
    return { ...a, share: totalCost > 0 ? a.cost / totalCost * 100 : 0, cumulativeShare: totalCost > 0 ? running / totalCost * 100 : 0 }
  })
  return { totalCost, items, missingRecipe: [...missingRecipe].sort() }
}

function getDishMatrix(startDate, endDate) {
  const byDish = {}
  for (const it of getRevenueItems(startDate, endDate)) {
    const d = byDish[it.dish.id] || (byDish[it.dish.id] = { dishId: it.dish.id, name: it.dish.name, units: 0, revenue: 0, cost: 0 })
    d.units += it.quantity
    d.revenue += it.revenue
    d.cost += it.cost
  }
  const dishes = Object.values(byDish).map(d => ({
    ...d,
    profit: d.revenue - d.cost,
    margin: d.revenue > 0 ? round2((d.revenue - d.cost) / d.revenue * 100) : 0
  }))
  const medianUnits = median(dishes.map(d => d.units))
  const medianMargin = median(dishes.map(d => d.margin))
  const groups = { promote: [], raisePrice: [], review: [], remove: [] }
  for (const d of dishes) {
    const popular = d.units >= medianUnits
    const profitable = d.margin >= medianMargin
    groups[popular ? (profitable ? 'promote' : 'raisePrice') : (profitable ? 'review' : 'remove')].push(d)
  }
  for (const g of Object.values(groups)) g.sort((a, b) => b.profit - a.profit)
  return { medianUnits, medianMargin, groups }
}

function getLapsedClients(today) {
  const ref = cleanDate(today) || getLocaleDate()
  const clientIds = new Set(data.clients.map(c => c.id))
  const datesByClient = {}
  for (const o of data.orders) {
    if (!clientIds.has(o.client_id)) continue
    const d = orderDeliveryDate(o)
    if (d) (datesByClient[o.client_id] || (datesByClient[o.client_id] = [])).push(d)
  }

  const lapsed = []
  for (const [id, dates] of Object.entries(datesByClient)) {
    if (dates.length < 3) continue
    const distinct = [...new Set(dates)].sort()
    const intervals = distinct.slice(1).map((d, i) => daysBetween(distinct[i], d))
    const medianIntervalDays = median(intervals)
    const thresholdDays = Math.max(21, Math.round(2 * (medianIntervalDays || 0)))
    const lastOrderAt = distinct[distinct.length - 1]
    const daysSince = Math.max(0, daysBetween(lastOrderAt, ref))
    if (daysSince <= thresholdDays) continue
    const clientId = parseInt(id)
    lapsed.push({ clientId, ...clientContact(clientId), orders: dates.length, medianIntervalDays, thresholdDays, daysSince, lastOrderAt })
  }
  return lapsed.sort((a, b) => b.daysSince - a.daysSince)
}

function weekStartOf(dateKey) {
  const d = parseLocalDate(dateKey)
  d.setDate(d.getDate() - d.getDay())
  return toDateKey(d)
}

function orderWeekKey(o, weekStarts) {
  return weekStarts.get(o.week_id) || (o.created_at || '').slice(0, 10)
}

function getClientValue(startDate, endDate, today) {
  const start = cleanDate(startDate)
  const end = cleanDate(endDate)
  const ref = cleanDate(today) || getLocaleDate()
  const weekStarts = new Map(data.weeks.map(w => [w.id, w.week_start]))
  const totals = orderItemsTotals()
  const clientIds = new Set(data.clients.map(c => c.id))

  const firstWeek = {}
  for (const o of data.orders) {
    const key = orderWeekKey(o, weekStarts)
    if (isDateKey(key) && (!firstWeek[o.client_id] || key < firstWeek[o.client_id])) firstWeek[o.client_id] = key
  }

  const byClient = {}
  const revenueIds = new Set(getRevenueOrdersInRange(start, end))
  for (const o of data.orders) {
    if (!revenueIds.has(o.id) || !clientIds.has(o.client_id)) continue
    const c = byClient[o.client_id] || (byClient[o.client_id] = { orders: 0, total: 0, weeks: new Set() })
    c.orders++
    c.total += totals[o.id] || 0
    c.weeks.add(orderWeekKey(o, weekStarts))
  }

  const windowEnd = weekStartOf(end && end < ref ? end : ref)
  return Object.entries(byClient)
    .map(([id, c]) => {
      const clientId = parseInt(id)
      const firstOrder = firstWeek[clientId]
      const windowStart = start && weekStartOf(start) > firstOrder ? weekStartOf(start) : firstOrder
      const weeksSinceFirst = Math.max(1, Math.floor(daysBetween(windowStart, windowEnd) / 7) + 1)
      const activeWeeks = c.weeks.size
      return {
        clientId,
        name: clientContact(clientId).name,
        orders: c.orders,
        total: c.total,
        avgTicket: c.total / c.orders,
        firstOrder,
        tenureDays: Math.max(0, daysBetween(firstOrder, ref)),
        activeWeeks,
        weeksSinceFirst,
        frequency: round2(c.orders / weeksSinceFirst),
        segment: c.orders >= 2 && activeWeeks / weeksSinceFirst >= 0.5 ? 'fiel' : 'ocasional'
      }
    })
    .sort((a, b) => b.total - a.total || b.orders - a.orders)
}

function getDishPairs(startDate, endDate, minSupport = 2) {
  const min = Math.min(100, Math.max(1, parseInt(minSupport) || 2))
  const dishesByOrder = {}
  const names = {}
  for (const it of getRevenueItems(startDate, endDate)) {
    ;(dishesByOrder[it.orderId] || (dishesByOrder[it.orderId] = new Set())).add(it.dish.id)
    names[it.dish.id] = it.dish.name
  }

  const baskets = Object.values(dishesByOrder).map(set => [...set].sort((a, b) => a - b))
  const single = {}
  const pairs = {}
  for (const dishes of baskets) {
    for (const id of dishes) single[id] = (single[id] || 0) + 1
    for (let i = 0; i < dishes.length; i++) {
      for (let j = i + 1; j < dishes.length; j++) {
        const key = `${dishes[i]}-${dishes[j]}`
        pairs[key] = (pairs[key] || 0) + 1
      }
    }
  }

  const total = baskets.length
  return {
    totalOrders: total,
    pairs: Object.entries(pairs)
      .filter(([, count]) => count >= min)
      .map(([key, count]) => {
        const [a, b] = key.split('-').map(Number)
        return {
          a: { dishId: a, name: names[a] },
          b: { dishId: b, name: names[b] },
          count,
          support: round2(count / total * 100),
          lift: round2(count * total / (single[a] * single[b]))
        }
      })
      .sort((x, y) => y.count - x.count || y.lift - x.lift)
      .slice(0, 15)
  }
}

const NO_ZONE = 'Sin localidad'

function zoneKey(locality) {
  return locality.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ')
}

function getSalesByZone(startDate, endDate) {
  const revenueIds = new Set(getRevenueOrdersInRange(cleanDate(startDate), cleanDate(endDate)))
  const totals = orderItemsTotals()
  const zones = {}
  for (const o of data.orders) {
    if (!revenueIds.has(o.id)) continue
    const client = data.clients.find(c => c.id === o.client_id)
    const label = String(client?.locality || '').trim().replace(/\s+/g, ' ') || NO_ZONE
    const key = label === NO_ZONE ? '' : zoneKey(label)
    const z = zones[key] || (zones[key] = { variants: {}, clients: new Set(), orders: 0, revenue: 0, deliveries: 0, fees: 0 })
    z.variants[label] = (z.variants[label] || 0) + 1
    z.clients.add(o.client_id)
    z.orders++
    z.revenue += totals[o.id] || 0
    if (o.has_delivery) {
      z.deliveries++
      z.fees += o.delivery_fee || 0
    }
  }

  return Object.values(zones)
    .map(z => ({
      zone: Object.entries(z.variants).sort((a, b) => b[1] - a[1])[0][0],
      clients: z.clients.size,
      orders: z.orders,
      revenue: z.revenue,
      avgTicket: z.revenue / z.orders,
      deliveryShare: round2(z.deliveries / z.orders * 100),
      avgDeliveryFee: z.deliveries > 0 ? round2(z.fees / z.deliveries) : null
    }))
    .sort((a, b) => b.revenue - a.revenue)
}

function weeksInRange(startDate, endDate) {
  const start = cleanDate(startDate)
  const end = cleanDate(endDate)
  return data.weeks
    .filter(w => isDateKey(w.week_start) && (!start || w.week_start >= start) && (!end || w.week_start <= end))
    .sort((a, b) => a.week_start.localeCompare(b.week_start))
}

function orderedByDishInWeek(weekId) {
  const orderIds = new Set(data.orders.filter(o => o.week_id === weekId).map(o => o.id))
  const ordered = {}
  for (const oi of data.orderItems) {
    if (orderIds.has(oi.order_id)) ordered[oi.dish_id] = (ordered[oi.dish_id] || 0) + (oi.quantity || 0)
  }
  return ordered
}

function linearSlope(values) {
  const n = values.length
  const meanX = (n - 1) / 2
  const meanY = values.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  values.forEach((y, x) => {
    num += (x - meanX) * (y - meanY)
    den += (x - meanX) ** 2
  })
  return den === 0 ? 0 : num / den
}

function getOverproductionTrend(startDate, endDate) {
  const costMap = getDishCostMap()
  const byDish = {}
  const weeks = weeksInRange(startDate, endDate).map(w => {
    const ordered = orderedByDishInWeek(w.id)
    const produced = {}
    for (const pl of data.productionLog) {
      if (pl.week_id === w.id) produced[pl.dish_id] = (produced[pl.dish_id] || 0) + (pl.quantity_produced || 0)
    }
    let units = 0
    let cost = 0
    for (const [id, qty] of Object.entries(produced)) {
      const over = Math.max(0, qty - (ordered[id] || 0))
      if (over === 0) continue
      const dish = data.dishes.find(d => d.id === parseInt(id))
      const dishCost = over * (costMap[id] || 0)
      units += over
      cost += dishCost
      const d = byDish[id] || (byDish[id] = { dishId: parseInt(id), name: dish?.name || 'Desconocido', units: 0, cost: 0 })
      d.units += over
      d.cost += dishCost
    }
    return { week_start: w.week_start, units, cost: round2(cost) }
  })

  const recent = weeks.slice(-8).map(w => w.cost)
  let trend = null
  let slope = null
  if (recent.length >= 3) {
    slope = round2(linearSlope(recent))
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length
    trend = Math.abs(slope) <= avg * 0.05 ? 'flat' : slope > 0 ? 'up' : 'down'
  }

  return {
    weeks,
    totalUnits: weeks.reduce((s, w) => s + w.units, 0),
    totalCost: round2(weeks.reduce((s, w) => s + w.cost, 0)),
    trend,
    slope,
    byDish: Object.values(byDish).map(d => ({ ...d, cost: round2(d.cost) })).sort((a, b) => b.cost - a.cost).slice(0, 5)
  }
}

const FORECAST_WEIGHTS = { recent: 0.5, lastYearWeek: 0.3, lastYearMonth: 0.2 }

function addDays(dateKey, n) {
  const d = parseLocalDate(dateKey)
  d.setDate(d.getDate() + n)
  return toDateKey(d)
}

function forecastWeekStart(weekStart) {
  const key = cleanDate(weekStart)
  return key ? weekStartOf(key) : addDays(weekStartOf(getLocaleDate()), 7)
}

function getWeekForecast(weekStart) {
  const target = forecastWeekStart(weekStart)
  const lastYear = addDays(target, -364)
  const lastYearMonth = `${parseInt(target.slice(0, 4)) - 1}${target.slice(4, 7)}`
  const recentFrom = addDays(target, -56)
  const components = {
    recent: data.weeks.filter(w => w.week_start >= recentFrom && w.week_start < target),
    lastYearWeek: data.weeks.filter(w => w.week_start >= addDays(lastYear, -7) && w.week_start <= addDays(lastYear, 7)),
    lastYearMonth: data.weeks.filter(w => (w.week_start || '').slice(0, 7) === lastYearMonth)
  }

  const present = Object.keys(components).filter(k => components[k].length > 0)
  const weightSum = present.reduce((s, k) => s + FORECAST_WEIGHTS[k], 0)
  const weights = {}
  for (const k of Object.keys(components)) weights[k] = present.includes(k) ? Math.round(FORECAST_WEIGHTS[k] / weightSum * 1000) / 1000 : null

  const demand = {}
  for (const [k, weeks] of Object.entries(components)) {
    demand[k] = weeks.map(w => orderedByDishInWeek(w.id))
  }
  const dishIds = new Set(Object.values(demand).flatMap(list => list.flatMap(o => Object.keys(o))))

  const dishes = []
  for (const id of dishIds) {
    const dish = data.dishes.find(d => d.id === parseInt(id))
    if (!dish || dish.is_active === false) continue
    const basis = {}
    let raw = 0
    for (const k of Object.keys(components)) {
      if (!present.includes(k)) { basis[k] = null; continue }
      const values = demand[k].map(o => o[id] || 0)
      const avg = values.reduce((a, b) => a + b, 0) / values.length
      basis[k] = round2(avg)
      raw += weights[k] * avg
    }
    if (raw <= 0) continue
    const recent = demand.recent.map(o => o[id] || 0)
    const mean = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0
    const sd = recent.length ? Math.sqrt(recent.reduce((s, v) => s + (v - mean) ** 2, 0) / recent.length) : 0
    dishes.push({
      dishId: dish.id,
      name: dish.name,
      forecast: Math.ceil(raw - 1e-9),
      low: Math.max(0, Math.floor(raw - sd)),
      high: Math.ceil(raw + sd - 1e-9),
      basis
    })
  }
  dishes.sort((a, b) => b.forecast - a.forecast || a.name.localeCompare(b.name))
  return { weekStart: target, weights, dishes, totalForecast: dishes.reduce((s, d) => s + d.forecast, 0) }
}

function getProjectedShopping(weekStart) {
  const forecast = getWeekForecast(weekStart)
  const agg = {}
  const missingRecipe = []
  for (const f of forecast.dishes) {
    const dish = data.dishes.find(d => d.id === f.dishId)
    const recipe = Array.isArray(dish?.ingredients) ? dish.ingredients : []
    if (recipe.length === 0) missingRecipe.push(f.name)
    for (const item of recipe) {
      for (const ex of expandForShoppingList(item.ingredientId, item.quantity, 0, new Set())) {
        const ing = data.ingredients.find(i => i.id === ex.ingredientId)
        if (!ing) continue
        const a = agg[ing.id] || (agg[ing.id] = { ingredientId: ing.id, name: ing.name, unit: ing.unit || '', total: 0, cost: ing.cost || 0 })
        a.total += ex.quantity * f.forecast
      }
    }
  }
  const items = Object.values(agg)
    .map(a => {
      const total = Math.round(a.total * 10000) / 10000
      return { ...a, total, totalCost: round2(total * a.cost) }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
  return {
    weekStart: forecast.weekStart,
    items,
    totalCost: round2(items.reduce((s, i) => s + i.totalCost, 0)),
    missingRecipe: missingRecipe.sort()
  }
}

function getWeekFulfillment(startDate, endDate, today) {
  const ref = cleanDate(today) || getLocaleDate()
  const pct = (n, total) => total > 0 ? n / total * 100 : null
  const weeks = weeksInRange(startDate, endDate).map(w => {
    const weekEnd = w.week_end || addDays(w.week_start, 6)
    const closeAt = `${weekEnd} 23:59:59`
    const closed = weekEnd < ref
    const row = { week_start: w.week_start, closed, orders: 0, assembled: 0, delivered: 0, onTime: 0, late: 0, open: 0 }
    for (const o of data.orders) {
      if (o.week_id !== w.id) continue
      row.orders++
      if (o.status === 'assembled' || o.status === 'delivered') row.assembled++
      if (o.status === 'delivered') {
        row.delivered++
        if (o.delivered_at && o.delivered_at.replace('T', ' ') > closeAt) row.late++
        else row.onTime++
      } else if (closed) row.open++
    }
    return { ...row, assembledPct: pct(row.assembled, row.orders), onTimePct: pct(row.onTime, row.orders) }
  })
  const totals = { orders: 0, assembled: 0, delivered: 0, onTime: 0, late: 0, open: 0 }
  for (const w of weeks) for (const k of Object.keys(totals)) totals[k] += w[k]
  return { weeks, totals: { ...totals, onTimePct: pct(totals.onTime, totals.orders) } }
}

function parseCreatedAt(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(value || ''))
  if (!m) return null
  const d = new Date(+m[1], +m[2] - 1, +m[3])
  const hour = +m[4]
  if (isNaN(d) || hour > 23) return null
  return { day: d.getDay(), hour }
}

function getOrderTimeHeatmap(startDate, endDate) {
  const ids = new Set(getOrdersInRange(cleanDate(startDate), cleanDate(endDate)))
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0))
  let total = 0
  for (const o of data.orders) {
    if (!ids.has(o.id)) continue
    const at = parseCreatedAt(o.created_at)
    if (!at) continue
    grid[at.day][at.hour]++
    total++
  }

  let peak = null
  grid.forEach((row, day) => row.forEach((count, hour) => {
    if (count > 0 && (!peak || count > peak.count)) peak = { day, hour, count }
  }))
  const byDay = grid.map(row => row.reduce((a, b) => a + b, 0))
  const byHour = Array.from({ length: 24 }, (_, h) => grid.reduce((s, row) => s + row[h], 0))
  return { grid, total, byDay, byHour, peak, lateShare: total > 0 ? (byDay[5] + byDay[6]) / total * 100 : null }
}

function getDefaultDeliveryFee() {
  return data.deliverySettings?.defaultFee || 500
}

function setDefaultDeliveryFee(fee) {
  if (!data.deliverySettings) data.deliverySettings = {}
  data.deliverySettings.defaultFee = Number(fee) || 0
  save()
}

function getStartLocation() {
  return data.deliverySettings?.startLocation || null
}

function setStartLocation(loc) {
  if (!data.deliverySettings) data.deliverySettings = {}
  if (loc === null) {
    delete data.deliverySettings.startLocation
    save()
    return { success: true }
  }
  const lat = Number(loc?.lat)
  const lng = Number(loc?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { success: false, reason: 'invalid_coords' }
  }
  data.deliverySettings.startLocation = {
    address: String(loc.address || '').trim(),
    lat,
    lng,
    city: loc.city || null,
    countryCode: loc.countryCode || null
  }
  save()
  return { success: true }
}

function getRouteCache(weekId) {
  const cache = data.routeCache
  return cache && cache.weekId === weekId ? cache : null
}

function setRouteCache(weekId, cache) {
  const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v)
  if (!isObject(cache) || typeof cache.key !== 'string' || !isObject(cache.days) || !isObject(cache.stops) ||
      !Object.values(cache.days).every(Array.isArray)) {
    return { success: false, reason: 'invalid_cache' }
  }
  data.routeCache = {
    weekId,
    key: cache.key,
    days: cache.days,
    stops: cache.stops,
    startCoords: cache.startCoords || null,
    city: cache.city || null,
    stats: isObject(cache.stats) ? cache.stats : {}
  }
  save()
  return { success: true }
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
  migratePaidFlag()
}

function getSalesForExport(startDate, endDate) {
  const orderIds = getRevenueOrdersInRange(startDate, endDate)
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
  getPendingCollections,
  getMarginErosion,
  getIngredientCostDrivers,
  getDishMatrix,
  getLapsedClients,
  getClientValue,
  getDishPairs,
  getSalesByZone,
  getOverproductionTrend,
  getWeekForecast,
  getProjectedShopping,
  getWeekFulfillment,
  getOrderTimeHeatmap,
  init,
  close,
  isOrdersOpen,
  getCurrentWeek,
  ensureCurrentWeek,
  getOrCreateNextWeek,
  getDashboard,
  addProduction,
  undoProduction,
  getOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  getOrderWithDetails,
  getOrdersByWeekId,
  getUndeliveredPastWeeks,
  markPastOrdersDelivered,
  getClientOrderHistory,
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
  markOrderPaid,
  unmarkOrderPaid,
  clientHasOrderThisWeek,
  getMonthlyTrend,
  getYearlyTrend,
  getMonthComparison,
  getYearComparison,
  getIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  getIngredientUsage,
  recalcCompositeCosts,
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
  getStartLocation,
  setStartLocation,
  getRouteCache,
  setRouteCache,
  getPriceReview,
  getExportData,
  importData,
  getSalesForExport,
  markIngredientUpdated,
  markDishPriceUpdated
}
