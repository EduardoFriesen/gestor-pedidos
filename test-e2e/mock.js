(function() {
  const WEEKS = [
    { id: 1, week_start: '2026-07-12', week_end: '2026-07-18' },
    { id: 2, week_start: '2026-07-19', week_end: '2026-07-25' },
    { id: 3, week_start: '2026-07-26', week_end: '2026-08-01' },
    { id: 4, week_start: '2026-07-05', week_end: '2026-07-11' },
  ]

  const INGREDIENTS = [
    { id: 1, name: 'Harina 0000', unit: 'kg', cost: 120, category: 'Secos', is_active: true, package_qty: 0, package_price: 0, batchYield: 1, subIngredients: [], last_cost_update: new Date().toISOString() },
    { id: 2, name: 'Huevo', unit: 'uni', cost: 80, category: 'Lácteos', is_active: true, package_qty: 0, package_price: 0, batchYield: 1, subIngredients: [], last_cost_update: new Date().toISOString() },
    { id: 3, name: 'Leche entera', unit: 'l', cost: 250, category: 'Lácteos', is_active: true, package_qty: 0, package_price: 0, batchYield: 1, subIngredients: [], last_cost_update: new Date().toISOString() },
    { id: 4, name: 'Manteca', unit: 'kg', cost: 400, category: 'Lácteos', is_active: true, package_qty: 0, package_price: 0, batchYield: 1, subIngredients: [], last_cost_update: new Date().toISOString() },
    { id: 5, name: 'Sal', unit: 'kg', cost: 50, category: 'Secos', is_active: true, package_qty: 0, package_price: 0, batchYield: 1, subIngredients: [], last_cost_update: new Date().toISOString() },
    { id: 6, name: 'Carne molida', unit: 'kg', cost: 800, category: 'Carnes', is_active: true, package_qty: 0, package_price: 0, batchYield: 1, subIngredients: [], last_cost_update: new Date().toISOString() },
    { id: 7, name: 'Queso muzzarella', unit: 'kg', cost: 600, category: 'Lácteos', is_active: true, package_qty: 0, package_price: 0, batchYield: 1, subIngredients: [], last_cost_update: new Date().toISOString() },
    { id: 8, name: 'Tomate triturado', unit: 'l', cost: 150, category: 'Conservas', is_active: true, package_qty: 0, package_price: 0, batchYield: 1, subIngredients: [], last_cost_update: new Date().toISOString() },
    { id: 9, name: 'Cebolla', unit: 'kg', cost: 100, category: 'Verduras', is_active: true, package_qty: 0, package_price: 0, batchYield: 1, subIngredients: [], last_cost_update: new Date().toISOString() },
    { id: 10, name: 'Pan rallado', unit: 'kg', cost: 180, category: 'Secos', is_active: true, package_qty: 0, package_price: 0, batchYield: 1, subIngredients: [], last_cost_update: new Date().toISOString() },
    { id: 11, name: 'Papa', unit: 'kg', cost: 90, category: 'Verduras', is_active: true, package_qty: 0, package_price: 0, batchYield: 1, subIngredients: [], last_cost_update: new Date().toISOString() },
    { id: 12, name: 'Aceite', unit: 'l', cost: 200, category: 'Aceites', is_active: true, package_qty: 0, package_price: 0, batchYield: 1, subIngredients: [], last_cost_update: new Date().toISOString() },
    { id: 13, name: 'Prepizza', unit: 'uni', cost: 250, category: 'Masa', is_active: true, package_qty: 0, package_price: 0, batchYield: 1, subIngredients: [], last_cost_update: new Date().toISOString() },
    { id: 14, name: 'Salsa pizza base', unit: 'kg', cost: 100, category: 'Elaborados', is_active: true, package_qty: 0, package_price: 0, batchYield: 1, subIngredients: [], last_cost_update: new Date().toISOString() },
    { id: 15, name: 'Panceta', unit: 'kg', cost: 550, category: 'Carnes', is_active: true, package_qty: 0, package_price: 0, batchYield: 1, subIngredients: [], last_cost_update: new Date().toISOString() },
    { id: 16, name: 'Cheddar', unit: 'kg', cost: 700, category: 'Lácteos', is_active: true, package_qty: 0, package_price: 0, batchYield: 1, subIngredients: [], last_cost_update: new Date().toISOString() },
    { id: 17, name: 'Mix lechuga', unit: 'kg', cost: 150, category: 'Verduras', is_active: false, package_qty: 0, package_price: 0, batchYield: 1, subIngredients: [], last_cost_update: new Date().toISOString() },
    { id: 18, name: 'Medallon veggie', unit: 'uni', cost: 350, category: 'Elaborados', is_active: true, package_qty: 12, package_price: 3600, batchYield: 1, subIngredients: [], last_cost_update: new Date().toISOString() },
    { id: 19, name: 'Masa de pizza', unit: 'uni', cost: 250, category: 'Elaborados', is_active: true, package_qty: 0, package_price: 0, batchYield: 1, subIngredients: [{ ingredientId: 1, quantity: 0.25, displayUnit: 'kg' }, { ingredientId: 5, quantity: 0.01, displayUnit: 'kg' }, { ingredientId: 12, quantity: 0.02, displayUnit: 'l' }], last_cost_update: new Date().toISOString() },
    { id: 20, name: 'Milanesa napo completa', unit: 'uni', cost: 800, category: 'Elaborados', is_active: true, package_qty: 0, package_price: 0, batchYield: 1, subIngredients: [{ ingredientId: 6, quantity: 0.2, displayUnit: 'kg' }, { ingredientId: 8, quantity: 0.1, displayUnit: 'l' }, { ingredientId: 9, quantity: 0.05, displayUnit: 'kg' }, { ingredientId: 7, quantity: 0.1, displayUnit: 'kg' }], last_cost_update: new Date().toISOString() },
  ]

  const nextIngredientId = 21

  const DISHES = [
    { id: 1, name: 'Milanesa napolitana', category: 'Principal', price: 1800, is_active: true, originalCost: 500, computedCost: 500, ingredients: [{ ingredientId: 6, quantity: 0.2, displayUnit: 'kg' }, { ingredientId: 8, quantity: 0.1, displayUnit: 'l' }, { ingredientId: 9, quantity: 0.05, displayUnit: 'kg' }, { ingredientId: 7, quantity: 0.1, displayUnit: 'kg' }, { ingredientId: 10, quantity: 0.1, displayUnit: 'kg' }, { ingredientId: 2, quantity: 2, displayUnit: 'uni' }], last_price_review: new Date(Date.now() - 10 * 86400000).toISOString() },
    { id: 2, name: 'Pizza muzzarella', category: 'Principal', price: 1500, is_active: true, originalCost: 350, computedCost: 350, ingredients: [{ ingredientId: 13, quantity: 1, displayUnit: 'uni' }, { ingredientId: 14, quantity: 0.15, displayUnit: 'kg' }, { ingredientId: 7, quantity: 0.15, displayUnit: 'kg' }], last_price_review: new Date(Date.now() - 5 * 86400000).toISOString() },
    { id: 3, name: 'Pizza napolitana', category: 'Principal', price: 1700, is_active: true, originalCost: 380, computedCost: 380, ingredients: [{ ingredientId: 13, quantity: 1, displayUnit: 'uni' }, { ingredientId: 14, quantity: 0.15, displayUnit: 'kg' }, { ingredientId: 8, quantity: 0.08, displayUnit: 'l' }, { ingredientId: 7, quantity: 0.1, displayUnit: 'kg' }], last_price_review: new Date(Date.now() - 15 * 86400000).toISOString() },
    { id: 4, name: 'Pizza fugazzeta', category: 'Principal', price: 1600, is_active: true, originalCost: 320, computedCost: 320, ingredients: [{ ingredientId: 13, quantity: 1, displayUnit: 'uni' }, { ingredientId: 9, quantity: 0.1, displayUnit: 'kg' }, { ingredientId: 7, quantity: 0.1, displayUnit: 'kg' }], last_price_review: new Date(Date.now() - 20 * 86400000).toISOString() },
    { id: 5, name: 'Hamburguesa clasica', category: 'Principal', price: 1300, is_active: true, originalCost: 300, computedCost: 300, ingredients: [{ ingredientId: 6, quantity: 0.15, displayUnit: 'kg' }, { ingredientId: 9, quantity: 0.03, displayUnit: 'kg' }, { ingredientId: 5, quantity: 0.005, displayUnit: 'kg' }], last_price_review: new Date(Date.now() - 3 * 86400000).toISOString() },
    { id: 6, name: 'Hamburguesa cheddar', category: 'Principal', price: 1500, is_active: true, originalCost: 350, computedCost: 350, ingredients: [{ ingredientId: 6, quantity: 0.15, displayUnit: 'kg' }, { ingredientId: 16, quantity: 0.05, displayUnit: 'kg' }], last_price_review: new Date(Date.now() - 3 * 86400000).toISOString() },
    { id: 7, name: 'Hamburguesa completa', category: 'Principal', price: 1700, is_active: true, originalCost: 400, computedCost: 400, ingredients: [{ ingredientId: 6, quantity: 0.15, displayUnit: 'kg' }, { ingredientId: 16, quantity: 0.05, displayUnit: 'kg' }, { ingredientId: 15, quantity: 0.03, displayUnit: 'kg' }], last_price_review: new Date(Date.now() - 3 * 86400000).toISOString() },
    { id: 8, name: 'Papas fritas', category: 'Guarnicion', price: 400, is_active: true, originalCost: 80, computedCost: 80, ingredients: [{ ingredientId: 11, quantity: 0.3, displayUnit: 'kg' }, { ingredientId: 12, quantity: 0.05, displayUnit: 'l' }], last_price_review: new Date(Date.now() - 7 * 86400000).toISOString() },
    { id: 9, name: 'Ensalada mixta', category: 'Guarnicion', price: 350, is_active: true, originalCost: 50, computedCost: 50, ingredients: [{ ingredientId: 17, quantity: 0.2, displayUnit: 'kg' }], last_price_review: new Date(Date.now() - 25 * 86400000).toISOString() },
    { id: 10, name: 'Flan casero', category: 'Postre', price: 300, is_active: true, originalCost: 60, computedCost: 60, ingredients: [{ ingredientId: 2, quantity: 3, displayUnit: 'uni' }, { ingredientId: 3, quantity: 0.5, displayUnit: 'l' }], last_price_review: new Date().toISOString() },
    { id: 11, name: 'Tarta de pollo', category: 'Principal', price: 250, is_active: false, originalCost: 100, computedCost: 100, ingredients: [], last_price_review: new Date().toISOString() },
  ]

  const nextDishId = 12

  const CLIENTS = [
    { id: 1, name: 'Juan', last_name: 'Perez', phone: '11 5555 0101', address: 'Av. Siempre Viva 123', notes: '' },
    { id: 2, name: 'Maria', last_name: 'Garcia', phone: '11 5555 0202', address: 'Calle Falsa 456', locality: 'Buenos Aires', notes: 'Toca timbre 3 veces' },
    { id: 3, name: 'Pedro', last_name: 'Lopez', phone: '', address: '', notes: '' },
    { id: 4, name: 'Ana', last_name: 'Martinez', phone: '11 5555 0303', address: 'Belgrano 789', locality: 'Quilmes', notes: '' },
    { id: 5, name: 'Carlos', last_name: 'Rodriguez', phone: '11 5555 0404', address: 'San Martin 321', notes: 'Sin cebolla' },
    { id: 6, name: 'Lucia', last_name: 'Fernandez', phone: '11 5555 0505', address: 'Rivadavia 654', notes: '' },
    { id: 7, name: 'Sofia', last_name: 'Gonzalez', phone: '', address: '', notes: '' },
    { id: 8, name: 'Diego', last_name: 'Ramirez', phone: '11 5555 0606', address: 'Mitre 987', notes: 'Delivery' },
  ]

  const nextClientId = 9

  const ORDERS = [
    { id: 1, week_id: 1, client_id: 1, status: 'delivered', notes: '', has_delivery: false, delivery_fee: 0, created_at: '2026-07-13T10:00:00', items: [{ dishId: 1, quantity: 2, unit_price: 1800, unit_cost: 500 }, { dishId: 8, quantity: 1, unit_price: 400, unit_cost: 80 }] },
    { id: 2, week_id: 1, client_id: 2, status: 'delivered', notes: 'Sin sal', has_delivery: true, delivery_fee: 300, delivery_day: 'viernes', created_at: '2026-07-13T12:00:00', items: [{ dishId: 2, quantity: 1, unit_price: 1500, unit_cost: 350 }, { dishId: 10, quantity: 2, unit_price: 300, unit_cost: 60 }] },
    { id: 3, week_id: 1, client_id: 3, status: 'assembled', notes: '', has_delivery: false, delivery_fee: 0, created_at: '2026-07-14T09:00:00', items: [{ dishId: 3, quantity: 1, unit_price: 1700, unit_cost: 380 }] },
    { id: 7, week_id: 4, client_id: 2, status: 'confirmed', notes: '', has_delivery: false, delivery_fee: 0, created_at: '2026-07-06T10:00:00', items: [{ dishId: 1, quantity: 1, unit_price: 1800, unit_cost: 500 }] },
    { id: 4, week_id: 2, client_id: 4, status: 'confirmed', notes: 'Llamar antes', has_delivery: true, delivery_fee: 500, delivery_day: 'sabado', created_at: '2026-07-20T11:00:00', items: [{ dishId: 4, quantity: 2, unit_price: 1600, unit_cost: 320 }, { dishId: 9, quantity: 1, unit_price: 350, unit_cost: 50 }, { dishId: 10, quantity: 3, unit_price: 300, unit_cost: 60 }] },
    { id: 5, week_id: 2, client_id: 1, status: 'pending', notes: '', has_delivery: false, delivery_fee: 0, created_at: '2026-07-20T15:00:00', items: [{ dishId: 5, quantity: 3, unit_price: 1300, unit_cost: 300 }] },
    { id: 6, week_id: 2, client_id: 5, status: 'pending', notes: 'Sin cebolla', has_delivery: false, delivery_fee: 0, created_at: '2026-07-21T08:00:00', items: [{ dishId: 6, quantity: 1, unit_price: 1500, unit_cost: 350 }, { dishId: 7, quantity: 1, unit_price: 1700, unit_cost: 400 }] },
  ]

  const nextOrderId = 7

  const PRODUCTION = [
    { dish_id: 1, quantity_produced: 3, date: '2026-07-13' },
    { dish_id: 2, quantity_produced: 2, date: '2026-07-13' },
    { dish_id: 1, quantity_produced: 2, date: '2026-07-14' },
    { dish_id: 3, quantity_produced: 1, date: '2026-07-14' },
  ]

  const currentWeekId = 2

  ORDERS.forEach(o => { o.paid = o.status === 'delivered'; o.paid_at = null })
  const isRevenueOrder = o => o.status === 'delivered' && !!o.paid
  const orderDate = o => WEEKS.find(w => w.id === o.week_id)?.week_start || o.created_at
  const inRange = (o, start, end) => orderDate(o) >= start && orderDate(o) <= end + 'T23:59:59'

  const DATA = {
    weeks: WEEKS,
    ingredients: INGREDIENTS,
    dishes: DISHES,
    clients: CLIENTS,
    orders: ORDERS,
    orderItems: ORDERS.flatMap(o => o.items.map(item => ({ ...item, order_id: o.id }))),
    production: PRODUCTION,
    _nextId: 1000,
    deliveryFee: 500,
    deliverySettings: { defaultFee: 500 },
  }

  const statusOrder = ['pending', 'confirmed', 'assembled', 'delivered']

  function genId() { return DATA._nextId++ }

  function getWeekOrders(weekId) {
    return DATA.orders.filter(o => o.week_id === weekId)
  }

  function enrichMockOrder(o) {
    const client = DATA.clients.find(c => c.id === o.client_id)
    const items = (o.items || []).map(item => {
      const dish = DATA.dishes.find(d => d.id === item.dishId)
      const quantity = item.quantity || 0
      const unitPrice = item.unit_price ?? (dish ? dish.price : 0)
      return {
        ...item,
        dish_id: item.dishId,
        dish_name: dish ? dish.name : '?',
        subtotal: unitPrice * quantity
      }
    })
    const itemsTotal = items.reduce((s, i) => s + i.subtotal, 0)
    const deliveryFee = o.delivery_fee || 0
    return {
      ...o,
      has_delivery: !!o.has_delivery,
      delivery_fee: deliveryFee,
      delivery_day: o.delivery_day || null,
      paid: !!o.paid,
      paid_at: o.paid_at || null,
      assembled_at: o.assembled_at || null,
      delivered_at: o.delivered_at || null,
      client_name: client ? `${client.name} ${client.last_name}`.trim() : '—',
      client_phone: client?.phone || '',
      client_address: client?.address || '',
      client_locality: client?.locality || '',
      items,
      items_total: itemsTotal,
      total: o.has_delivery ? itemsTotal + deliveryFee : itemsTotal
    }
  }

  function getWeekProduction(weekId) {
    const week = DATA.weeks.find(w => w.id === weekId)
    if (!week) return []
    return DATA.production
  }

  window.piu = {
    getCurrentWeek() { return Promise.resolve(WEEKS.find(w => w.id === currentWeekId)) },

    isOrdersOpen() { return Promise.resolve(true) },

    getPreviousWeeks() { return Promise.resolve(WEEKS.filter(w => w.id !== currentWeekId)) },

    getDashboard() {
      const week = WEEKS.find(w => w.id === currentWeekId)
      const weekOrders = getWeekOrders(currentWeekId)
      const weekProduction = getWeekProduction(currentWeekId)
      const dishes = DATA.dishes.filter(d => d.is_active).map(d => {
        const produced = weekProduction.filter(p => p.dish_id === d.id).reduce((s, p) => s + p.quantity_produced, 0)
        const ordered = weekOrders.flatMap(o => o.items).filter(i => i.dishId === d.id).reduce((s, i) => s + i.quantity, 0)
        const completed = produced >= ordered && ordered > 0
        return { ...d, total_ordered: ordered, total_produced: produced, overproduction: Math.max(0, produced - ordered), completed }
      })
      return Promise.resolve({
        week,
        dishes: dishes.filter(d => d.total_ordered > 0),
        totals: {
          total: dishes.filter(d => d.total_ordered > 0).reduce((s, d) => s + d.total_ordered, 0),
          produced: dishes.reduce((s, d) => s + d.total_produced, 0),
          overproduction: dishes.reduce((s, d) => s + d.overproduction, 0),
        }
      })
    },

    addProduction(dishId, quantity) {
      const today = new Date().toISOString().split('T')[0]
      PRODUCTION.push({ dish_id: dishId, quantity_produced: quantity, date: today })
      window.dispatchEvent(new CustomEvent('piu:production-update'))
      return Promise.resolve({ success: true })
    },

    undoProduction(dishId) {
      const idx = PRODUCTION.map(p => p.dish_id + p.date).lastIndexOf(dishId + new Date().toISOString().split('T')[0])
      if (idx >= 0) { PRODUCTION.splice(idx, 1) }
      window.dispatchEvent(new CustomEvent('piu:production-update'))
      return Promise.resolve({ success: true })
    },

    completeDishProduction(dishId) {
      const week = WEEKS.find(w => w.id === currentWeekId)
      if (!week) return Promise.resolve()
      const weekOrders = getWeekOrders(currentWeekId)
      const ordered = weekOrders.flatMap(o => o.items).filter(i => i.dishId === dishId).reduce((s, i) => s + i.quantity, 0)
      const produced = PRODUCTION.filter(p => p.dish_id === dishId).reduce((s, p) => s + p.quantity_produced, 0)
      const needed = ordered - produced
      if (needed > 0) {
        PRODUCTION.push({ dish_id: dishId, quantity_produced: needed, date: new Date().toISOString().split('T')[0] })
      }
      window.dispatchEvent(new CustomEvent('piu:production-update'))
      return Promise.resolve({ success: true })
    },

    getSubProductQuantities() {
      const subs = DATA.ingredients.filter(i => i.subIngredients && i.subIngredients.length > 0)
      return Promise.resolve(subs.map(s => ({
        id: s.id, name: s.name, unit: s.unit,
        total: 4,
        remaining: 2,
        breakdown: s.subIngredients.map(si => {
          const ing = DATA.ingredients.find(i => i.id === si.ingredientId)
          return { name: ing ? ing.name : '?', total: si.quantity * 4, remaining: si.quantity * 2, unit: ing ? ing.unit : si.displayUnit }
        })
      })))
    },

    getDishes() { return Promise.resolve([...DATA.dishes]) },

    createDish(data) {
      const id = genId()
      const dish = { id, ...data, originalCost: 0, computedCost: 0, last_price_review: new Date().toISOString() }
      DATA.dishes.push(dish)
      return Promise.resolve({ success: true, id })
    },

    updateDish(data) {
      const idx = DATA.dishes.findIndex(d => d.id === data.id)
      if (idx >= 0) {
        const existing = DATA.dishes[idx]
        DATA.dishes[idx] = { ...existing, ...data, id: existing.id }
      }
      return Promise.resolve({ success: true })
    },

    deleteDish(id) {
      const currentWeekOrders = DATA.orders.filter(o => o.week_id === currentWeekId)
      const hasOrdersThisWeek = currentWeekOrders.some(o => o.items.some(i => i.dishId === id))
      if (hasOrdersThisWeek) return Promise.resolve({ success: false, reason: 'has_orders_this_week' })
      DATA.dishes = DATA.dishes.filter(d => d.id !== id)
      return Promise.resolve({ success: true })
    },

    getClients() {
      return Promise.resolve(DATA.clients.map(c => {
        const orders = DATA.orders.filter(o => o.client_id === c.id)
        const last = orders.map(o => o.created_at).sort().pop() || null
        return { ...c, order_count: orders.length, last_order_at: last }
      }))
    },

    createClient(data) {
      const id = genId()
      DATA.clients.push({ id, ...data })
      return Promise.resolve({ success: true, id })
    },

    updateClient(data) {
      const idx = DATA.clients.findIndex(c => c.id === data.id)
      if (idx >= 0) DATA.clients[idx] = { ...DATA.clients[idx], ...data, id: data.id }
      return Promise.resolve({ success: true })
    },

    deleteClient(id) {
      const hasOrders = DATA.orders.some(o => o.client_id === id)
      if (hasOrders) return Promise.resolve({ success: false, reason: 'has_orders' })
      DATA.clients = DATA.clients.filter(c => c.id !== id)
      return Promise.resolve({ success: true })
    },

    getIngredients() { return Promise.resolve([...DATA.ingredients]) },

    createIngredient(data) {
      const id = genId()
      DATA.ingredients.push({ id, ...data, last_cost_update: new Date().toISOString() })
      return Promise.resolve({ success: true, id })
    },

    updateIngredient(data) {
      const idx = DATA.ingredients.findIndex(i => i.id === data.id)
      if (idx >= 0) {
        DATA.ingredients[idx] = { ...DATA.ingredients[idx], ...data, id: data.id, last_cost_update: new Date().toISOString() }
      }
      return Promise.resolve({ success: true })
    },

    deleteIngredient(id) {
      DATA.ingredients = DATA.ingredients.filter(i => i.id !== id)
      return Promise.resolve({ success: true })
    },

    getIngredientUsage(id) {
      return Promise.resolve({
        dishes: DATA.dishes.filter(d => (d.ingredients || []).some(i => i.ingredientId === id)).map(d => d.name),
        subProducts: DATA.ingredients.filter(i => i.id !== id && (i.subIngredients || []).some(si => si.ingredientId === id)).map(i => i.name)
      })
    },

    getIngredientsList() {
      return Promise.resolve(DATA.ingredients.filter(i => i.is_active).map(i => ({
        name: i.name, quantity: Math.random() * 2 + 0.5, unit: i.unit,
        subtotal: Math.round(Math.random() * 500 + 100),
        subIngredients: i.subIngredients ? i.subIngredients.map(si => {
          const ing = DATA.ingredients.find(x => x.id === si.ingredientId)
          return { name: ing ? ing.name : '?', quantity: si.quantity, unit: si.displayUnit }
        }) : []
      })))
    },

    getIngredientCategories() {
      const cats = [...new Set(DATA.ingredients.map(i => i.category))].filter(Boolean)
      return Promise.resolve(cats)
    },

    calculateDishCost(dishId) {
      return this.getDishes().then(d => {
        const dish = DATA.dishes.find(x => x.id === dishId)
        return dish ? dish.computedCost || 0 : 0
      })
    },

    getResolvedCost(ingredientId) {
      const ing = DATA.ingredients.find(i => i.id === ingredientId)
      return Promise.resolve(ing ? ing.cost || 0 : 0)
    },

    markIngredientUpdated(id) {
      const ing = DATA.ingredients.find(i => i.id === id)
      if (ing) ing.last_cost_update = new Date().toISOString()
      return Promise.resolve({ success: true })
    },

    markDishPriceUpdated(id) {
      const dish = DATA.dishes.find(d => d.id === id)
      if (dish) dish.last_price_review = new Date().toISOString()
      return Promise.resolve({ success: true })
    },

    getOrders() {
      return Promise.resolve(getWeekOrders(currentWeekId).map(enrichMockOrder))
    },

    createOrder(data) {
      const id = genId()
      const order = {
        id, week_id: data.weekId || currentWeekId, status: 'pending', paid: false, paid_at: null,
        client_id: data.clientId, notes: data.notes || '',
        has_delivery: data.has_delivery || false,
        delivery_fee: data.delivery_fee || 0,
        delivery_day: data.has_delivery ? (data.delivery_day || 'viernes') : null,
        created_at: new Date().toISOString(),
        items: data.items.map(item => {
          const dish = DATA.dishes.find(d => d.id === item.dishId)
          return {
            dishId: item.dishId, quantity: item.quantity,
            unit_price: dish ? dish.price : 0, unit_cost: dish ? dish.computedCost || dish.originalCost || 0 : 0
          }
        })
      }
      DATA.orders.push(order)
      DATA.orderItems.push(...order.items.map(item => ({ ...item, order_id: id })))
      window.dispatchEvent(new CustomEvent('piu:production-update'))
      return Promise.resolve({ success: true, id })
    },

    updateOrder(data) {
      const idx = DATA.orders.findIndex(o => o.id === data.id)
      if (idx >= 0) {
        DATA.orders[idx] = {
          ...DATA.orders[idx],
          client_id: data.clientId, notes: data.notes,
          has_delivery: data.has_delivery, delivery_fee: data.delivery_fee,
          delivery_day: data.has_delivery ? (data.delivery_day || 'viernes') : null,
          items: data.items.map(item => {
            const dish = DATA.dishes.find(d => d.id === item.dishId)
            return {
              dishId: item.dishId, quantity: item.quantity,
              unit_price: dish ? dish.price : 0, unit_cost: dish ? dish.computedCost || dish.originalCost || 0 : 0
            }
          })
        }
        DATA.orderItems = DATA.orderItems.filter(oi => oi.order_id !== data.id)
        DATA.orderItems.push(...DATA.orders[idx].items.map(item => ({ ...item, order_id: data.id })))
      }
      window.dispatchEvent(new CustomEvent('piu:production-update'))
      return Promise.resolve({ success: true })
    },

    deleteOrder(id) {
      DATA.orders = DATA.orders.filter(o => o.id !== id)
      DATA.orderItems = DATA.orderItems.filter(oi => oi.order_id !== id)
      window.dispatchEvent(new CustomEvent('piu:production-update'))
      return Promise.resolve({ success: true })
    },

    getOrderWithDetails(id) {
      const order = DATA.orders.find(o => o.id === id)
      if (!order) return Promise.resolve(null)
      const client = DATA.clients.find(c => c.id === order.client_id)
      return Promise.resolve({
        ...order,
        client_name: client ? `${client.name} ${client.last_name}` : '',
        client_phone: client ? client.phone : '',
        client_address: client ? client.address : '',
        client_locality: client ? client.locality || '' : '',
        items: order.items.map(item => {
          const dish = DATA.dishes.find(d => d.id === item.dishId)
          return { ...item, dish_name: dish ? dish.name : '?' }
        })
      })
    },

    getOrdersByWeekId(weekId) {
      return Promise.resolve(DATA.orders.filter(o => o.week_id === weekId).map(o => {
        const client = DATA.clients.find(c => c.id === o.client_id)
        return { ...client, ...enrichMockOrder(o) }
      }))
    },

    getUndeliveredPastWeeks() {
      const current = WEEKS.find(w => w.id === currentWeekId)
      return Promise.resolve(WEEKS
        .filter(w => w.week_start < current.week_start)
        .sort((a, b) => b.week_start.localeCompare(a.week_start))
        .map(week => ({
          week,
          orders: DATA.orders.filter(o => o.week_id === week.id && o.status !== 'delivered').map(o => {
            const client = DATA.clients.find(c => c.id === o.client_id)
            return { ...client, ...enrichMockOrder(o) }
          })
        }))
        .filter(w => w.orders.length > 0))
    },

    markPastOrdersDelivered(ids) {
      const current = WEEKS.find(w => w.id === currentWeekId)
      const pastWeekIds = new Set(WEEKS.filter(w => w.week_start < current.week_start).map(w => w.id))
      let updated = 0
      for (const id of ids || []) {
        const order = DATA.orders.find(o => o.id === id)
        if (!order || !pastWeekIds.has(order.week_id) || order.status === 'delivered') continue
        order.status = 'delivered'
        order.delivered_at = new Date().toISOString()
        updated++
      }
      return Promise.resolve({ success: true, updated })
    },

    getClientOrderHistory(clientId) {
      return Promise.resolve(DATA.orders.filter(o => o.client_id === clientId).map(o => {
        const client = DATA.clients.find(c => c.id === o.client_id)
        return { ...client, ...enrichMockOrder(o) }
      }).sort((a, b) => {
        const d = new Date(b.created_at) - new Date(a.created_at)
        if (d !== 0) return d
        return b.id - a.id
      }))
    },

    markOrderAssembled(id) {
      const order = DATA.orders.find(o => o.id === id)
      if (order && (order.status === 'pending' || order.status === 'confirmed')) {
        order.status = 'assembled'
        order.assembled_at = new Date().toISOString()
      }
      return Promise.resolve({ success: true })
    },

    unmarkOrderAssembled(id) {
      const order = DATA.orders.find(o => o.id === id)
      if (order && order.status === 'assembled') { order.status = 'confirmed'; order.assembled_at = null }
      return Promise.resolve({ success: true })
    },

    markOrderDelivered(id) {
      const order = DATA.orders.find(o => o.id === id)
      if (order && order.status === 'assembled') { order.status = 'delivered'; order.delivered_at = new Date().toISOString() }
      return Promise.resolve({ success: true })
    },

    unmarkOrderDelivered(id) {
      const order = DATA.orders.find(o => o.id === id)
      if (order && order.status === 'delivered') { order.status = 'assembled'; order.delivered_at = null }
      return Promise.resolve({ success: true })
    },

    markOrderPaid(id) {
      const order = DATA.orders.find(o => o.id === id)
      if (!order || order.paid) return Promise.resolve({ success: false })
      order.paid = true
      order.paid_at = new Date().toISOString()
      return Promise.resolve({ success: true })
    },

    unmarkOrderPaid(id) {
      const order = DATA.orders.find(o => o.id === id)
      if (!order || !order.paid) return Promise.resolve({ success: false })
      order.paid = false
      order.paid_at = null
      return Promise.resolve({ success: true })
    },

    clientHasOrderThisWeek(clientId, weekId) {
      const wid = weekId ?? currentWeekId
      return Promise.resolve(DATA.orders.some(o => o.week_id === wid && o.client_id === clientId))
    },

    getOrCreateNextWeek() {
      return Promise.resolve(WEEKS.find(w => w.id === 3))
    },

    getWeekOrderCounts() {
      const weekOrders = getWeekOrders(currentWeekId)
      return Promise.resolve({
        pending: weekOrders.filter(o => o.status === 'pending').length,
        confirmed: weekOrders.filter(o => o.status === 'confirmed').length,
        assembled: weekOrders.filter(o => o.status === 'assembled').length,
        delivered: weekOrders.filter(o => o.status === 'delivered').length,
        total: weekOrders.length,
      })
    },

    getEntityCounts() {
      return Promise.resolve({
        dishes: DATA.dishes.filter(d => d.is_active).length,
        ingredients: DATA.ingredients.filter(i => i.is_active).length,
        clients: DATA.clients.length
      })
    },

    getDefaultDeliveryFee() { return Promise.resolve(DATA.deliveryFee || 500) },
    setDefaultDeliveryFee(fee) { DATA.deliveryFee = fee; return Promise.resolve({ success: true }) },
    getStartLocation() { return Promise.resolve(DATA.deliverySettings.startLocation || null) },
    setStartLocation(loc) {
      if (loc === null) delete DATA.deliverySettings.startLocation
      else DATA.deliverySettings.startLocation = { ...loc }
      return Promise.resolve({ success: true })
    },
    getRouteCache(weekId) {
      const c = DATA.routeCache
      return Promise.resolve(c && c.weekId === weekId ? JSON.parse(JSON.stringify(c)) : null)
    },
    setRouteCache(weekId, cache) {
      DATA.routeCache = JSON.parse(JSON.stringify({ ...cache, weekId }))
      return Promise.resolve({ success: true })
    },

    getPendingCollections() {
      const byClient = {}
      let total = 0
      let deliveryFees = 0
      for (const o of DATA.orders) {
        if (o.status !== 'delivered' || o.paid) continue
        const amount = o.items.reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0)
        const fee = o.has_delivery ? (o.delivery_fee || 0) : 0
        const since = (o.delivered_at || orderDate(o)).slice(0, 10)
        const client = DATA.clients.find(c => c.id === o.client_id)
        const c = byClient[o.client_id] || (byClient[o.client_id] = { clientId: o.client_id, name: client ? `${client.name} ${client.last_name}`.trim() : '—', phone: client?.phone || '', amount: 0, deliveryFees: 0, orders: 0, oldestSince: since })
        c.amount += amount
        c.deliveryFees += fee
        c.orders++
        if (since < c.oldestSince) c.oldestSince = since
        total += amount
        deliveryFees += fee
      }
      const list = Object.values(byClient).map(c => ({ ...c, daysOwed: Math.max(0, Math.round((Date.now() - new Date(c.oldestSince + 'T00:00:00')) / 864e5)) })).sort((a, b) => b.amount - a.amount)
      return Promise.resolve({ total, deliveryFees, byClient: list, payTimes: [{ clientId: 1, name: 'Juan Perez', avgDays: 2, samples: 3 }], avgDaysToPay: 2 })
    },

    getMarginErosion(startDate, endDate) {
      const byDish = {}
      DATA.orders.filter(o => isRevenueOrder(o) && (!startDate || inRange(o, startDate, endDate))).forEach(o => {
        o.items.forEach(i => {
          const d = byDish[i.dishId] || (byDish[i.dishId] = { revenue: 0, cost: 0, quantity: 0, week: orderDate(o) })
          d.revenue += (i.unit_price || 0) * i.quantity
          d.cost += (i.unit_cost || 0) * i.quantity
          d.quantity += i.quantity
        })
      })
      return Promise.resolve(Object.entries(byDish).map(([id, v]) => {
        const dish = DATA.dishes.find(d => d.id === parseInt(id))
        const marginStart = Math.round((v.revenue - v.cost) / v.revenue * 10000) / 100
        const costNow = (dish?.computedCost || 0) * 1.4
        const priceNow = dish?.price || 0
        const marginNow = priceNow > 0 ? Math.round((priceNow - costNow) / priceNow * 10000) / 100 : null
        return { dishId: parseInt(id), name: dish?.name || '?', firstWeek: v.week, lastWeek: v.week, priceStart: v.revenue / v.quantity, costStart: v.cost / v.quantity, priceNow, costNow, marginStart, marginEnd: marginStart, marginNow, deltaPp: marginNow === null ? null : Math.round((marginNow - marginStart) * 100) / 100, costChangePct: 40, priceChangePct: 0, suggestedPrice: Math.ceil(costNow / (1 - marginStart / 100) / 10) * 10 }
      }).sort((a, b) => a.deltaPp - b.deltaPp))
    },

    getIngredientCostDrivers(startDate, endDate, limit = 10) {
      const agg = {}
      DATA.orders.filter(o => isRevenueOrder(o) && (!startDate || inRange(o, startDate, endDate))).forEach(o => {
        o.items.forEach(i => {
          const dish = DATA.dishes.find(d => d.id === i.dishId)
          ;(dish?.ingredients || []).forEach(r => {
            const ing = DATA.ingredients.find(x => x.id === r.ingredientId)
            if (!ing) return
            const a = agg[ing.id] || (agg[ing.id] = { ingredientId: ing.id, name: ing.name, unit: ing.unit, quantity: 0, cost: 0 })
            a.quantity += r.quantity * i.quantity
            a.cost += r.quantity * i.quantity * ing.cost
          })
        })
      })
      const sorted = Object.values(agg).sort((a, b) => b.cost - a.cost)
      const totalCost = sorted.reduce((s, a) => s + a.cost, 0)
      let running = 0
      const items = sorted.slice(0, limit).map(a => { running += a.cost; return { ...a, share: a.cost / totalCost * 100, cumulativeShare: running / totalCost * 100 } })
      return Promise.resolve({ totalCost, items, missingRecipe: [] })
    },

    getDishMatrix(startDate, endDate) {
      const byDish = {}
      DATA.orders.filter(o => isRevenueOrder(o) && (!startDate || inRange(o, startDate, endDate))).forEach(o => {
        o.items.forEach(i => {
          const dish = DATA.dishes.find(d => d.id === i.dishId)
          const d = byDish[i.dishId] || (byDish[i.dishId] = { dishId: i.dishId, name: dish?.name || '?', units: 0, revenue: 0, cost: 0 })
          d.units += i.quantity
          d.revenue += (i.unit_price || 0) * i.quantity
          d.cost += (i.unit_cost || 0) * i.quantity
        })
      })
      const dishes = Object.values(byDish).map(d => ({ ...d, profit: d.revenue - d.cost, margin: d.revenue > 0 ? Math.round((d.revenue - d.cost) / d.revenue * 10000) / 100 : 0 }))
      const med = (arr) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
      const medianUnits = med(dishes.map(d => d.units))
      const medianMargin = med(dishes.map(d => d.margin))
      const groups = { promote: [], raisePrice: [], review: [], remove: [] }
      dishes.forEach(d => {
        const popular = d.units >= medianUnits
        const profitable = d.margin >= medianMargin
        groups[popular ? (profitable ? 'promote' : 'raisePrice') : (profitable ? 'review' : 'remove')].push(d)
      })
      return Promise.resolve({ medianUnits, medianMargin, groups })
    },

    getLapsedClients() {
      return Promise.resolve([{ clientId: 4, name: 'Ana Martinez', phone: '11 5555 0303', orders: 6, medianIntervalDays: 7, thresholdDays: 21, daysSince: 45, lastOrderAt: '2026-06-05' }])
    },

    getClientValue(startDate, endDate) {
      const byClient = {}
      DATA.orders.filter(o => isRevenueOrder(o) && (!startDate || inRange(o, startDate, endDate))).forEach(o => {
        const c = byClient[o.client_id] || (byClient[o.client_id] = { orders: 0, total: 0, weeks: new Set() })
        c.orders++
        c.total += o.items.reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0)
        c.weeks.add(orderDate(o))
      })
      return Promise.resolve(Object.entries(byClient).map(([id, c]) => {
        const client = DATA.clients.find(x => x.id === parseInt(id))
        const firstOrder = DATA.orders.filter(o => o.client_id === parseInt(id)).map(orderDate).sort()[0].slice(0, 10)
        return { clientId: parseInt(id), name: client ? `${client.name} ${client.last_name}`.trim() : '—', orders: c.orders, total: c.total, avgTicket: c.total / c.orders, firstOrder, tenureDays: 30, activeWeeks: c.weeks.size, weeksSinceFirst: 2, frequency: c.orders / 2, segment: c.orders >= 2 ? 'fiel' : 'ocasional' }
      }).sort((a, b) => b.total - a.total))
    },

    getDishPairs(startDate, endDate, minSupport = 2) {
      const baskets = DATA.orders.filter(o => isRevenueOrder(o) && (!startDate || inRange(o, startDate, endDate))).map(o => [...new Set(o.items.map(i => i.dishId))].sort((a, b) => a - b))
      const single = {}
      const pairs = {}
      baskets.forEach(b => {
        b.forEach(id => { single[id] = (single[id] || 0) + 1 })
        for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) pairs[`${b[i]}-${b[j]}`] = (pairs[`${b[i]}-${b[j]}`] || 0) + 1
      })
      const name = id => DATA.dishes.find(d => d.id === id)?.name || '?'
      return Promise.resolve({
        totalOrders: baskets.length,
        pairs: Object.entries(pairs).filter(([, n]) => n >= minSupport).map(([k, count]) => {
          const [a, b] = k.split('-').map(Number)
          return { a: { dishId: a, name: name(a) }, b: { dishId: b, name: name(b) }, count, support: Math.round(count / baskets.length * 10000) / 100, lift: Math.round(count * baskets.length / (single[a] * single[b]) * 100) / 100 }
        }).sort((x, y) => y.count - x.count || y.lift - x.lift).slice(0, 15)
      })
    },

    getSalesByZone(startDate, endDate) {
      const zones = {}
      DATA.orders.filter(o => isRevenueOrder(o) && (!startDate || inRange(o, startDate, endDate))).forEach(o => {
        const client = DATA.clients.find(c => c.id === o.client_id)
        const zone = (client?.locality || '').trim() || 'Sin localidad'
        const z = zones[zone] || (zones[zone] = { zone, clients: new Set(), orders: 0, revenue: 0, deliveries: 0, fees: 0 })
        z.clients.add(o.client_id)
        z.orders++
        z.revenue += o.items.reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0)
        if (o.has_delivery) { z.deliveries++; z.fees += o.delivery_fee || 0 }
      })
      return Promise.resolve(Object.values(zones).map(z => ({ zone: z.zone, clients: z.clients.size, orders: z.orders, revenue: z.revenue, avgTicket: z.revenue / z.orders, deliveryShare: Math.round(z.deliveries / z.orders * 10000) / 100, avgDeliveryFee: z.deliveries ? z.fees / z.deliveries : null })).sort((a, b) => b.revenue - a.revenue))
    },

    getOverproductionTrend(startDate, endDate) {
      const byDish = {}
      const weeks = [...WEEKS].filter(w => (!startDate || w.week_start >= startDate) && (!endDate || w.week_start <= endDate)).sort((a, b) => a.week_start.localeCompare(b.week_start)).map(w => {
        const produced = {}
        DATA.production.filter(p => p.date >= w.week_start && p.date <= w.week_end).forEach(p => { produced[p.dish_id] = (produced[p.dish_id] || 0) + p.quantity_produced })
        const ordered = {}
        DATA.orders.filter(o => o.week_id === w.id).forEach(o => o.items.forEach(i => { ordered[i.dishId] = (ordered[i.dishId] || 0) + i.quantity }))
        let units = 0
        let cost = 0
        Object.entries(produced).forEach(([id, qty]) => {
          const over = Math.max(0, qty - (ordered[id] || 0))
          if (!over) return
          const dish = DATA.dishes.find(d => d.id === parseInt(id))
          const c = over * (dish?.computedCost || 0)
          units += over
          cost += c
          const d = byDish[id] || (byDish[id] = { dishId: parseInt(id), name: dish?.name || '?', units: 0, cost: 0 })
          d.units += over
          d.cost += c
        })
        return { week_start: w.week_start, units, cost }
      })
      const costs = weeks.map(w => w.cost)
      const trend = costs.length >= 3 ? (costs[costs.length - 1] < costs[0] ? 'down' : costs[costs.length - 1] > costs[0] ? 'up' : 'flat') : null
      return Promise.resolve({ weeks, totalUnits: weeks.reduce((s, w) => s + w.units, 0), totalCost: costs.reduce((s, c) => s + c, 0), trend, slope: trend ? (costs[costs.length - 1] - costs[0]) / (costs.length - 1) : null, byDish: Object.values(byDish).sort((a, b) => b.cost - a.cost).slice(0, 5) })
    },

    getWeekForecast(weekStart) {
      const target = weekStart || '2026-07-26'
      const recent = WEEKS
      const demand = recent.map(w => {
        const o = {}
        DATA.orders.filter(x => x.week_id === w.id).forEach(x => x.items.forEach(i => { o[i.dishId] = (o[i.dishId] || 0) + i.quantity }))
        return o
      })
      const ids = new Set(demand.flatMap(o => Object.keys(o)))
      const dishes = [...ids].map(id => {
        const dish = DATA.dishes.find(d => d.id === parseInt(id))
        if (!dish || dish.is_active === false) return null
        const values = demand.map(o => o[id] || 0)
        const mean = values.reduce((a, b) => a + b, 0) / values.length
        const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length)
        return { dishId: dish.id, name: dish.name, forecast: Math.ceil(mean), low: Math.max(0, Math.floor(mean - sd)), high: Math.ceil(mean + sd), basis: { recent: Math.round(mean * 100) / 100, lastYearWeek: null, lastYearMonth: null } }
      }).filter(d => d && d.forecast > 0).sort((a, b) => b.forecast - a.forecast || a.name.localeCompare(b.name))
      return Promise.resolve({ weekStart: target, weights: { recent: recent.length ? 1 : null, lastYearWeek: null, lastYearMonth: null }, dishes, totalForecast: dishes.reduce((s, d) => s + d.forecast, 0) })
    },

    async getProjectedShopping(weekStart) {
      const fc = await window.piu.getWeekForecast(weekStart)
      const agg = {}
      const missingRecipe = []
      fc.dishes.forEach(f => {
        const dish = DATA.dishes.find(d => d.id === f.dishId)
        if (!dish?.ingredients?.length) { missingRecipe.push(f.name); return }
        dish.ingredients.forEach(r => {
          const ing = DATA.ingredients.find(i => i.id === r.ingredientId)
          if (!ing) return
          const a = agg[ing.id] || (agg[ing.id] = { ingredientId: ing.id, name: ing.name, unit: ing.unit, total: 0, cost: ing.cost })
          a.total += r.quantity * f.forecast
        })
      })
      const items = Object.values(agg).map(a => ({ ...a, total: Math.round(a.total * 10000) / 10000, totalCost: Math.round(a.total * a.cost * 100) / 100 })).sort((a, b) => a.name.localeCompare(b.name))
      return { weekStart: fc.weekStart, items, totalCost: items.reduce((s, i) => s + i.totalCost, 0), missingRecipe }
    },

    getWeekFulfillment(startDate, endDate) {
      const today = new Date().toISOString().slice(0, 10)
      const pct = (n, t) => t > 0 ? n / t * 100 : null
      const weeks = [...WEEKS].filter(w => (!startDate || w.week_start >= startDate) && (!endDate || w.week_start <= endDate)).sort((a, b) => a.week_start.localeCompare(b.week_start)).map(w => {
        const closed = w.week_end < today
        const row = { week_start: w.week_start, closed, orders: 0, assembled: 0, delivered: 0, onTime: 0, late: 0, open: 0 }
        DATA.orders.filter(o => o.week_id === w.id).forEach(o => {
          row.orders++
          if (o.status === 'assembled' || o.status === 'delivered') row.assembled++
          if (o.status === 'delivered') {
            row.delivered++
            if (o.delivered_at && o.delivered_at.replace('T', ' ') > `${w.week_end} 23:59:59`) row.late++
            else row.onTime++
          } else if (closed) row.open++
        })
        return { ...row, assembledPct: pct(row.assembled, row.orders), onTimePct: pct(row.onTime, row.orders) }
      })
      const totals = { orders: 0, assembled: 0, delivered: 0, onTime: 0, late: 0, open: 0 }
      weeks.forEach(w => Object.keys(totals).forEach(k => { totals[k] += w[k] }))
      return Promise.resolve({ weeks, totals: { ...totals, onTimePct: pct(totals.onTime, totals.orders) } })
    },

    getOrderTimeHeatmap(startDate, endDate) {
      const grid = Array.from({ length: 7 }, () => Array(24).fill(0))
      let total = 0
      DATA.orders.filter(o => !startDate || inRange(o, startDate, endDate)).forEach(o => {
        const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2})/.exec(o.created_at || '')
        if (!m) return
        grid[new Date(+m[1], +m[2] - 1, +m[3]).getDay()][+m[4]]++
        total++
      })
      let peak = null
      grid.forEach((row, day) => row.forEach((count, hour) => { if (count > 0 && (!peak || count > peak.count)) peak = { day, hour, count } }))
      const byDay = grid.map(r => r.reduce((a, b) => a + b, 0))
      const byHour = Array.from({ length: 24 }, (_, h) => grid.reduce((s, r) => s + r[h], 0))
      return Promise.resolve({ grid, total, byDay, byHour, peak, lateShare: total ? (byDay[5] + byDay[6]) / total * 100 : null })
    },

    getAnalytics() { return this.getAnalyticsFiltered(null, null) },

    getAnalyticsFiltered(startDate, endDate) {
      let filteredOrders = DATA.orders.filter(isRevenueOrder)
      if (startDate && endDate) {
        filteredOrders = filteredOrders.filter(o => inRange(o, startDate, endDate))
      }
      const totalOrders = filteredOrders.length
      const totalItems = filteredOrders.flatMap(o => o.items)
      const revenue = totalItems.reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0)
      const totalCost = totalItems.reduce((s, i) => s + (i.unit_cost || 0) * i.quantity, 0)
      const dishMap = {}
      totalItems.forEach(item => {
        if (!dishMap[item.dishId]) {
          const dish = DATA.dishes.find(d => d.id === item.dishId)
          dishMap[item.dishId] = { id: item.dishId, name: dish ? dish.name : '?', total: 0, totalRevenue: 0, totalCost: 0 }
        }
        dishMap[item.dishId].total += item.quantity
        dishMap[item.dishId].totalRevenue += (item.unit_price || 0) * item.quantity
        dishMap[item.dishId].totalCost += (item.unit_cost || 0) * item.quantity
      })
      const topDishes = Object.values(dishMap).map(d => {
        const price = d.total > 0 ? d.totalRevenue / d.total : 0
        const cost = d.total > 0 ? d.totalCost / d.total : 0
        return { ...d, price, cost, profit: price - cost, margin: price > 0 ? (price - cost) / price * 100 : null, totalProfit: d.totalRevenue - d.totalCost }
      })

      const clientMap = {}
      filteredOrders.forEach(o => {
        const client = DATA.clients.find(c => c.id === o.client_id)
        if (!clientMap[o.client_id]) {
          clientMap[o.client_id] = { clientId: o.client_id, name: client ? client.name : '?', last_name: client ? client.last_name : '', order_count: 0, total_dishes: 0, totalRevenue: 0, favorite_dish: '' }
        }
        clientMap[o.client_id].order_count++
        clientMap[o.client_id].total_dishes += o.items.reduce((s, i) => s + i.quantity, 0)
        clientMap[o.client_id].totalRevenue += o.items.reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0)
      })

      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']
      const dayCount = {}
      filteredOrders.forEach(o => {
        const d = new Date(o.created_at)
        const name = dayNames[d.getDay()]
        dayCount[name] = (dayCount[name] || 0) + 1
      })

      return Promise.resolve({
        totalOrders,
        revenue,
        totalCost,
        totalProfit: revenue - totalCost,
        topDishes: topDishes.sort((a, b) => b.total - a.total),
        topClients: Object.values(clientMap).sort((a, b) => b.totalRevenue - a.totalRevenue),
        dayOfWeek: Object.entries(dayCount).map(([name, count]) => ({ name, count })),
      })
    },

    getTrendsInRange(startDate, endDate) {
      const makePeriod = (periods, label) => periods.map(p => ({
        period: label(p),
        revenue: Math.round(Math.random() * 50000 + 10000),
        cost: Math.round(Math.random() * 30000 + 5000),
        profit: Math.round(Math.random() * 20000 + 5000),
        order_count: Math.round(Math.random() * 20 + 5),
      }))

      const weeksData = WEEKS.map(w => ({
        week_start: w.week_start,
        revenue: Math.round(Math.random() * 50000 + 10000),
        cost: Math.round(Math.random() * 30000 + 5000),
        profit: Math.round(Math.random() * 20000 + 5000),
        order_count: Math.round(Math.random() * 20 + 5),
      }))

      const monthData = [{
        month: '2026-07',
        revenue: Math.round(Math.random() * 50000 + 10000),
        cost: Math.round(Math.random() * 30000 + 5000),
        profit: Math.round(Math.random() * 20000 + 5000),
        order_count: Math.round(Math.random() * 20 + 5),
      }]

      const quarterData = [{
        quarter: '2026-T3',
        revenue: Math.round(Math.random() * 50000 + 10000),
        cost: Math.round(Math.random() * 30000 + 5000),
        profit: Math.round(Math.random() * 20000 + 5000),
        order_count: Math.round(Math.random() * 20 + 5),
      }]

      const yearData = [{
        year: '2026',
        revenue: Math.round(Math.random() * 50000 + 10000),
        cost: Math.round(Math.random() * 30000 + 5000),
        profit: Math.round(Math.random() * 20000 + 5000),
        order_count: Math.round(Math.random() * 20 + 5),
      }]

      return Promise.resolve({
        weekly: weeksData,
        monthly: monthData,
        quarterly: quarterData,
        yearly: yearData,
      })
    },

    getOverproductionInRange(startDate, endDate) {
      const weekOrders = getWeekOrders(currentWeekId)
      const totalOP = Math.round(Math.random() * 5000 + 1000)
      return Promise.resolve({ totalOverproductionCost: totalOP })
    },

    getPeriodComparison(p1Start, p1End, p2Start, p2End) {
      const ordersP1 = DATA.orders.filter(o => isRevenueOrder(o) && inRange(o, p1Start, p1End))
      const ordersP2 = DATA.orders.filter(o => isRevenueOrder(o) && inRange(o, p2Start, p2End))
      const calc = (orders) => {
        const items = orders.flatMap(o => o.items)
        const revenue = items.reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0)
        const cost = items.reduce((s, i) => s + (i.unit_cost || 0) * i.quantity, 0)
        return { orders: orders.length, revenue, cost, profit: revenue - cost, margin: revenue > 0 ? (revenue - cost) / revenue * 100 : null }
      }
      const p1 = calc(ordersP1)
      const p2 = calc(ordersP2)
      const changes = {}
      for (const key of ['orders', 'revenue', 'cost', 'profit']) {
        changes[key] = p1[key] !== 0 ? Math.round((p2[key] - p1[key]) / Math.abs(p1[key]) * 1000) / 10 : null
      }
      changes.margin = p1.revenue > 0 && p2.revenue > 0 ? Math.round((p2.margin - p1.margin) * 10) / 10 : null
      return Promise.resolve({ period1: p1, period2: p2, changes })
    },

    getDishTimeSeries(dishId, start, end) {
      const weeks = WEEKS.map(w => ({
        period: w.week_start,
        ordered: Math.round(Math.random() * 10 + 1),
        produced: Math.round(Math.random() * 8 + 1),
        overproduction: Math.round(Math.random() * 3),
      }))
      return Promise.resolve(weeks)
    },

    getClientTimeSeries(clientId, start, end) {
      const weeks = WEEKS.map(w => ({ period: w.week_start, orders: Math.round(Math.random() * 3 + 1) }))
      return Promise.resolve(weeks)
    },

    getWeekComparison() { return Promise.resolve({ week1: { orders: 5, revenue: 8500 }, week2: { orders: 8, revenue: 12000 }, changes: { orders: 60, revenue: 41.2 } }) },
    getWeeklyTrend() { return Promise.resolve({ trend: 'up', pct: 15 }) },
    getMonthlyTrend() { return Promise.resolve({ trend: 'up', pct: 25 }) },
    getQuarterlyTrend() { return Promise.resolve({ trend: 'stable', pct: 0 }) },
    getYearlyTrend() { return Promise.resolve({ trend: 'up', pct: 40 }) },
    getMonthComparison() { return Promise.resolve({ changes: { orders: 20, revenue: 15 } }) },
    getYearComparison() { return Promise.resolve({ changes: { orders: 120, revenue: 95 } }) },
    getDayOfWeekDistribution() {
      return Promise.resolve([
        { name: 'Lunes', count: 12 }, { name: 'Martes', count: 8 }, { name: 'Miercoles', count: 15 },
        { name: 'Jueves', count: 20 }, { name: 'Viernes', count: 25 }, { name: 'Sabado', count: 5 },
      ])
    },
    getDishProfitability() {
      return Promise.resolve(DATA.dishes.map(d => ({
        id: d.id, name: d.name, price: d.price, cost: d.computedCost || d.originalCost || 0,
        margin: d.price > 0 ? ((d.price - (d.computedCost || d.originalCost || 0)) / d.price * 100) : 0,
        totalSold: Math.round(Math.random() * 20 + 1),
      })))
    },

    getPriceReview(threshold) {
      const now = Date.now()
      const staleDays = threshold || 30
      const staleIngredients = DATA.ingredients.filter(i => i.is_active && i.last_cost_update && (now - new Date(i.last_cost_update).getTime()) > staleDays * 86400000).map(i => ({
        id: i.id, name: i.name, isStale: true, daysSinceUpdate: Math.floor((now - new Date(i.last_cost_update).getTime()) / 86400000), staleSubNames: []
      }))
      const staleDishes = DATA.dishes.filter(d => d.is_active && (now - new Date(d.last_price_review).getTime()) > staleDays * 86400000).map(d => ({
        id: d.id, name: d.name, price: d.price, computedCost: d.computedCost || d.originalCost || 0,
        margin: d.price > 0 ? Math.round(((d.price - (d.computedCost || d.originalCost || 0)) / d.price) * 100) : 0,
        last_price_review: d.last_price_review
      }))
      return Promise.resolve({ ingredients: staleIngredients, dishPrices: staleDishes })
    },

    getExportData() {
      return Promise.resolve({
        weeks: DATA.weeks, ingredients: DATA.ingredients, dishes: DATA.dishes,
        orders: DATA.orders, orderItems: DATA.orderItems, clients: DATA.clients,
        production: DATA.production, deliveryFee: DATA.deliveryFee
      })
    },

    importData(newData) {
      Object.assign(DATA, newData)
      return Promise.resolve({ success: true })
    },

    saveFile({ content, defaultName, ext }) {
      console.log('MOCK: saveFile', defaultName, ext)
      return Promise.resolve({ success: true })
    },

    getSalesForExport(startDate, endDate) {
      return this.getAnalyticsFiltered(startDate, endDate)
    },

    exportAnalyticsExcel(range) {
      console.log('MOCK: exportAnalyticsExcel', JSON.stringify(range || null))
      return Promise.resolve({ success: true })
    },

    __clearData(entity) {
      if (entity === 'orders') { DATA.orders = []; DATA.orderItems = [] }
      else if (entity === 'dishes') DATA.dishes = []
      else if (entity === 'ingredients') DATA.ingredients = []
      else if (entity === 'clients') DATA.clients = []
      else if (entity === 'production') DATA.production = []
      else if (entity === 'all') {
        DATA.orders = []; DATA.orderItems = []; DATA.dishes = []; DATA.ingredients = []; DATA.clients = []; DATA.production = []
      }
      return Promise.resolve({ success: true })
    },
    __resetData() {
      DATA.weeks = WEEKS
      DATA.ingredients = INGREDIENTS
      DATA.dishes = DISHES
      DATA.clients = CLIENTS
      DATA.orders = ORDERS
      DATA.orderItems = ORDERS.flatMap(o => o.items.map(item => ({ ...item, order_id: o.id })))
      DATA.production = PRODUCTION
      DATA._nextId = 1000
      DATA.deliveryFee = 500
      return Promise.resolve({ success: true })
    },
  }

  const emptyParam = window.location.search.match(/empty=(\w+)/) || window.location.hash.match(/empty=(\w+)/)
  if (emptyParam) {
    const entity = emptyParam[1]
    if (entity === 'orders' || entity === 'all') { DATA.orders = []; DATA.orderItems = [] }
    if (entity === 'dishes' || entity === 'all') DATA.dishes = []
    if (entity === 'ingredients' || entity === 'all') DATA.ingredients = []
    if (entity === 'clients' || entity === 'all') DATA.clients = []
    if (entity === 'production' || entity === 'all') DATA.production = []
  }

  const errorParam = window.location.search.match(/error=(\w+)/) || window.location.hash.match(/error=(\w+)/)
  if (errorParam) {
    const channel = errorParam[1]
    const err = () => Promise.reject(new Error('MOCK_ERROR'))
    if (channel === 'getDashboard' || channel === 'all') window.piu.getDashboard = err
    if (channel === 'getDishes' || channel === 'all') window.piu.getDishes = err
    if (channel === 'getOrders' || channel === 'all') window.piu.getOrders = err
    if (channel === 'getClients' || channel === 'all') window.piu.getClients = err
    if (channel === 'getIngredients' || channel === 'all') window.piu.getIngredients = err
  }
})()
