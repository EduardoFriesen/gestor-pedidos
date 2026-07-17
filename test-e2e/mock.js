(function() {
  const WEEKS = [
    { id: 1, week_start: '2026-07-12', week_end: '2026-07-18' },
    { id: 2, week_start: '2026-07-19', week_end: '2026-07-25' },
    { id: 3, week_start: '2026-07-26', week_end: '2026-08-01' },
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
    { id: 2, name: 'Maria', last_name: 'Garcia', phone: '11 5555 0202', address: 'Calle Falsa 456', notes: 'Toca timbre 3 veces' },
    { id: 3, name: 'Pedro', last_name: 'Lopez', phone: '', address: '', notes: '' },
    { id: 4, name: 'Ana', last_name: 'Martinez', phone: '11 5555 0303', address: 'Belgrano 789', notes: '' },
    { id: 5, name: 'Carlos', last_name: 'Rodriguez', phone: '11 5555 0404', address: 'San Martin 321', notes: 'Sin cebolla' },
    { id: 6, name: 'Lucia', last_name: 'Fernandez', phone: '11 5555 0505', address: 'Rivadavia 654', notes: '' },
    { id: 7, name: 'Sofia', last_name: 'Gonzalez', phone: '', address: '', notes: '' },
    { id: 8, name: 'Diego', last_name: 'Ramirez', phone: '11 5555 0606', address: 'Mitre 987', notes: 'Delivery' },
  ]

  const nextClientId = 9

  const ORDERS = [
    { id: 1, week_id: 1, client_id: 1, status: 'delivered', notes: '', has_delivery: false, delivery_fee: 0, created_at: '2026-07-13T10:00:00', items: [{ dishId: 1, quantity: 2, unit_price: 1800, unit_cost: 500 }, { dishId: 8, quantity: 1, unit_price: 400, unit_cost: 80 }] },
    { id: 2, week_id: 1, client_id: 2, status: 'delivered', notes: 'Sin sal', has_delivery: true, delivery_fee: 300, created_at: '2026-07-13T12:00:00', items: [{ dishId: 2, quantity: 1, unit_price: 1500, unit_cost: 350 }, { dishId: 10, quantity: 2, unit_price: 300, unit_cost: 60 }] },
    { id: 3, week_id: 1, client_id: 3, status: 'assembled', notes: '', has_delivery: false, delivery_fee: 0, created_at: '2026-07-14T09:00:00', items: [{ dishId: 3, quantity: 1, unit_price: 1700, unit_cost: 380 }] },
    { id: 4, week_id: 2, client_id: 4, status: 'confirmed', notes: 'Llamar antes', has_delivery: true, delivery_fee: 500, created_at: '2026-07-20T11:00:00', items: [{ dishId: 4, quantity: 2, unit_price: 1600, unit_cost: 320 }, { dishId: 9, quantity: 1, unit_price: 350, unit_cost: 50 }, { dishId: 10, quantity: 3, unit_price: 300, unit_cost: 60 }] },
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

  const DATA = {
    weeks: WEEKS,
    ingredients: INGREDIENTS,
    dishes: DISHES,
    clients: CLIENTS,
    orders: ORDERS,
    orderItems: ORDERS.flatMap(o => o.items.map(item => ({ ...item, order_id: o.id }))),
    production: PRODUCTION,
    _nextId: nextOrderId,
    deliveryFee: 500,
  }

  const statusOrder = ['pending', 'confirmed', 'assembled', 'delivered']

  function genId() { return DATA._nextId++ }

  function getWeekOrders(weekId) {
    return DATA.orders.filter(o => o.week_id === weekId)
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
        return { ...d, total_ordered: ordered, total_produced: produced, completed }
      })
      return Promise.resolve({
        week,
        dishes: dishes.filter(d => d.total_ordered > 0),
        totals: {
          total: dishes.filter(d => d.total_ordered > 0).reduce((s, d) => s + d.total_ordered, 0),
          produced: dishes.reduce((s, d) => s + d.total_produced, 0),
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
        total: Math.round(Math.random() * 5 + 1),
        breakdown: s.subIngredients.map(si => {
          const ing = DATA.ingredients.find(i => i.id === si.ingredientId)
          return { name: ing ? ing.name : '?', quantity: si.quantity, unit: si.displayUnit }
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
      const hasOrders = DATA.orders.some(o => o.items.some(i => i.dishId === id))
      if (hasOrders) return Promise.resolve({ success: false, reason: 'has_orders' })
      DATA.dishes = DATA.dishes.filter(d => d.id !== id)
      return Promise.resolve({ success: true })
    },

    getClients() { return Promise.resolve([...DATA.clients]) },

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
      return Promise.resolve(getWeekOrders(currentWeekId).map(o => ({
        ...o,
        client_name: (DATA.clients.find(c => c.id === o.client_id)?.name || '') + ' ' + (DATA.clients.find(c => c.id === o.client_id)?.last_name || '')
      })))
    },

    createOrder(data) {
      const id = genId()
      const order = {
        id, week_id: currentWeekId, status: 'pending',
        client_id: data.clientId, notes: data.notes || '',
        has_delivery: data.has_delivery || false,
        delivery_fee: data.delivery_fee || 0,
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
        items: order.items.map(item => {
          const dish = DATA.dishes.find(d => d.id === item.dishId)
          return { ...item, dish_name: dish ? dish.name : '?' }
        })
      })
    },

    getOrdersByWeekId(weekId) {
      return Promise.resolve(DATA.orders.filter(o => o.week_id === weekId).map(o => ({
        ...o,
        client_name: (DATA.clients.find(c => c.id === o.client_id)?.name || '') + ' ' + (DATA.clients.find(c => c.id === o.client_id)?.last_name || '')
      })))
    },

    markOrderAssembled(id) {
      const order = DATA.orders.find(o => o.id === id)
      if (order && (order.status === 'pending' || order.status === 'confirmed')) {
        order.status = 'assembled'
      }
      return Promise.resolve({ success: true })
    },

    unmarkOrderAssembled(id) {
      const order = DATA.orders.find(o => o.id === id)
      if (order && order.status === 'assembled') order.status = 'confirmed'
      return Promise.resolve({ success: true })
    },

    markOrderDelivered(id) {
      const order = DATA.orders.find(o => o.id === id)
      if (order && order.status === 'assembled') order.status = 'delivered'
      return Promise.resolve({ success: true })
    },

    unmarkOrderDelivered(id) {
      const order = DATA.orders.find(o => o.id === id)
      if (order && order.status === 'delivered') order.status = 'assembled'
      return Promise.resolve({ success: true })
    },

    clientHasOrderThisWeek(clientId) {
      return Promise.resolve(DATA.orders.some(o => o.week_id === currentWeekId && o.client_id === clientId))
    },

    getWeekOrderCounts() {
      const weekOrders = getWeekOrders(currentWeekId)
      return Promise.resolve({
        pending: weekOrders.filter(o => o.status === 'pending').length,
        confirmed: weekOrders.filter(o => o.status === 'confirmed').length,
        assembled: weekOrders.filter(o => o.status === 'assembled').length,
        delivered: weekOrders.filter(o => o.status === 'delivered').length,
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

    getAnalytics() { return this.getAnalyticsFiltered(null, null) },

    getAnalyticsFiltered(startDate, endDate) {
      let filteredOrders = DATA.orders
      if (startDate && endDate) {
        filteredOrders = DATA.orders.filter(o => o.created_at >= startDate && o.created_at <= endDate + 'T23:59:59')
      }
      const totalOrders = filteredOrders.length
      const totalItems = filteredOrders.flatMap(o => o.items)
      const revenue = totalItems.reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0)
      const totalCost = totalItems.reduce((s, i) => s + (i.unit_cost || 0) * i.quantity, 0)
      const deliveryTotal = filteredOrders.filter(o => o.has_delivery).reduce((s, o) => s + (o.delivery_fee || 0), 0)

      const dishMap = {}
      totalItems.forEach(item => {
        if (!dishMap[item.dishId]) {
          const dish = DATA.dishes.find(d => d.id === item.dishId)
          dishMap[item.dishId] = { id: item.dishId, name: dish ? dish.name : '?', price: item.unit_price, cost: item.unit_cost, total: 0, totalProfit: 0, profit: item.unit_price - item.unit_cost }
        }
        dishMap[item.dishId].total += item.quantity
        dishMap[item.dishId].totalProfit += (item.unit_price - item.unit_cost) * item.quantity
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
        revenue: revenue + deliveryTotal,
        totalCost,
        totalProfit: revenue - totalCost + deliveryTotal,
        topDishes: Object.values(dishMap).sort((a, b) => b.total - a.total),
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
      const ordersP1 = DATA.orders.filter(o => o.created_at >= p1Start && o.created_at <= p1End + 'T23:59:59')
      const ordersP2 = DATA.orders.filter(o => o.created_at >= p2Start && o.created_at <= p2End + 'T23:59:59')
      const calc = (orders) => {
        const items = orders.flatMap(o => o.items)
        const revenue = items.reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0)
        const cost = items.reduce((s, i) => s + (i.unit_cost || 0) * i.quantity, 0)
        return { orders: orders.length, revenue, cost, profit: revenue - cost, margin: revenue > 0 ? (revenue - cost) / revenue * 100 : 0 }
      }
      const p1 = calc(ordersP1)
      const p2 = calc(ordersP2)
      const changes = {}
      for (const key of ['orders', 'revenue', 'cost', 'profit', 'margin']) {
        changes[key] = p1[key] !== 0 ? Math.round((p2[key] - p1[key]) / p1[key] * 100) : 0
      }
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

    exportAnalyticsExcel() {
      console.log('MOCK: exportAnalyticsExcel')
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
      DATA._nextId = nextOrderId
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
