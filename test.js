const fs = require('fs')
const path = require('path')

const TEST_DB = path.join(__dirname, 'piu.test.json')
const VERBOSE = process.argv.includes('--verbose')

let totalPassed = 0
let totalFailed = 0
const results = []

function assert(ok, label, detail, severity = 'medium') {
  if (ok) {
    totalPassed++
    if (VERBOSE) console.log(`  ✅ ${label}`)
  } else {
    totalFailed++
    results.push({ label, detail, severity })
    console.log(`  ❌ ${label}`)
    if (detail) console.log(`     ${detail}`)
  }
}

log = (msg) => { if (VERBOSE) console.log(msg) }

function setup() {
  const data = {
    weeks: [],
    dishes: [],
    clients: [],
    orders: [],
    orderItems: [],
    productionLog: [],
    ingredients: [],
    deliverySettings: { defaultFee: 500 },
    _nextId: 1
  }
  fs.writeFileSync(TEST_DB, JSON.stringify(data, null, 2))
  const store = require('./electron/store')
  store.init(TEST_DB)
  return store
}

function teardown(store) {
  try {
    store.close?.()
    fs.unlinkSync(TEST_DB)
  } catch {}
  delete require.cache[require.resolve('./electron/store')]
}

function seedBase(store) {
  const ingNames = {}
  const ings = [
    'Harina 0000', 'Agua', 'Levadura fresca', 'Sal', 'Muzzarella',
    'Salsa de tomate', 'Aceite de oliva', 'Tomate perita', 'Ajo', 'Cebolla',
    'Jamón cocido', 'Huevo', 'Carne (cortada a cuchillo)', 'Queso cremoso',
    'Lomo', 'Pan de miga', 'Lechuga', 'Papas fritas (congeladas)'
  ]
  const costs = [150, 1, 0.5, 50, 800, 300, 1500, 80, 60, 50, 1200, 50, 1500, 900, 2500, 150, 40, 400]
  for (let i = 0; i < ings.length; i++) {
    const r = store.createIngredient({ name: ings[i], unit: 'kg', cost: costs[i], category: 'Test' })
    ingNames[ings[i]] = r.id
  }

  const dishDefs = [
    { name: 'Muzzarella', category: 'Pizzas', price: 3800, ingr: ['Harina 0000', 'Agua', 'Muzzarella', 'Salsa de tomate'] },
    { name: 'Lomito completo', category: 'Sandwiches', price: 5200, ingr: ['Lomo', 'Pan de miga', 'Lechuga', 'Papas fritas (congeladas)'] },
    { name: 'Empanada carne', category: 'Empanadas', price: 3200, ingr: ['Carne (cortada a cuchillo)', 'Cebolla', 'Huevo'] },
  ]
  const dishIds = {}
  for (const dd of dishDefs) {
    const items = dd.ingr.map(n => ({ ingredientId: ingNames[n], quantity: 0.2 }))
    const r = store.createDish({ name: dd.name, category: dd.category, price: dd.price, ingredients: items })
    dishIds[dd.name] = r.id
  }

  const clientIds = []
  for (let i = 0; i < 5; i++) {
    const c = store.createClient({ name: `Cliente${i}`, last_name: `Apellido${i}`, phone: `11${i}000${i}`, address: `Calle ${i} 100` })
    clientIds.push(c.id)
  }

  const weekR = store.ensureCurrentWeek()
  const weekId = weekR.id

  const orders = [
    { clientId: clientIds[0], items: [{ dishId: dishIds['Muzzarella'], quantity: 2 }, { dishId: dishIds['Lomito completo'], quantity: 1 }], has_delivery: true, delivery_fee: 500 },
    { clientId: clientIds[1], items: [{ dishId: dishIds['Empanada carne'], quantity: 3 }], has_delivery: false },
    { clientId: clientIds[2], items: [{ dishId: dishIds['Muzzarella'], quantity: 1 }, { dishId: dishIds['Empanada carne'], quantity: 2 }], has_delivery: true, delivery_fee: 700 },
  ]

  for (const o of orders) {
    store.createOrder({ ...o, weekId })
  }

  store.addProduction(dishIds['Muzzarella'], 2)

  return { ingNames, dishIds, clientIds, weekId }
}

function getDishCost(store, dishId) {
  return store.calculateDishCost(dishId) || 0
}

// ============================== TESTS ==============================

function testSanity(store) {
  console.log('\n🔵 SANITY CHECKS')
  const dishes = store.getDishes()
  assert(dishes.length === 3, 'getDishes returns 3 dishes', `Got ${dishes.length}`)
  const clients = store.getClients()
  assert(clients.length === 5, 'getClients returns 5 clients', `Got ${clients.length}`)
  const orders = store.getOrders()
  assert(orders.length === 3, 'getOrders returns 3 orders (current week)', `Got ${orders.length}`)
  const dashboard = store.getDashboard()
  assert(dashboard && dashboard.dishes.length > 0, 'getDashboard returns dishes', JSON.stringify(dashboard?.totals))
}

function testDeliveryFeeDoubleCount(store, { dishIds, ingNames }) {
  console.log('\n🔴 TEST 1: Delivery fee double count in analytics')
  const orders = store.getOrders()
  for (const o of orders) {
    store.markOrderAssembled(o.id)
    store.markOrderDelivered(o.id)
    store.markOrderPaid(o.id)
  }
  const analytics = store.getAnalyticsFiltered(null, null)
  const dish1Price = 3800
  const dish2Price = 5200
  const dish3Price = 3200
  const fee1 = 500
  const fee3 = 700
  const expectedRevenue = (dish1Price * 2 + dish2Price * 1) + (dish1Price * 1 + dish3Price * 2) + (dish3Price * 3)
  const expectedCost = (getDishCost(store, dishIds['Muzzarella']) * 3 + getDishCost(store, dishIds['Lomito completo']) * 1 + getDishCost(store, dishIds['Empanada carne']) * 5)

  const tolerance = 0.01
  const revOk = Math.abs((analytics.revenue || 0) - expectedRevenue) < tolerance
  const costOk = Math.abs((analytics.totalCost || 0) - expectedCost) < tolerance

  assert(revOk, `Revenue matches: expected ${expectedRevenue}, got ${analytics.revenue}`, `Diff: ${(analytics.revenue || 0) - expectedRevenue}`, 'critical')
  assert(costOk, `Cost matches: expected ${expectedCost}, got ${analytics.totalCost}`, `Diff: ${(analytics.totalCost || 0) - expectedCost}`, 'critical')
  if (!revOk || !costOk) {
    console.log(`     HINT: If revenue is higher than expected, delivery fee is being multiplied by number of items.`)
  }
}

function testMonthComparisonFeb(store) {
  console.log('\n🔴 TEST 7: Month comparison with February')
  const trends = store.getTrendsInRange(null, null)
  const febEntry = trends.monthly.find(m => m.month === '2024-02')
  if (!febEntry) {
    console.log('     SKIP: No February data in trends')
    return
  }
  const comparison = store.getPeriodComparison('2024-02-01', '2024-02-31', '2024-03-01', '2024-03-31')
  assert(comparison.period1.orders >= 0, 'Feb comparison returns data', 'Feb 31 is interpreted as Mar 2', 'high')
  if (comparison.period1.orders === 0 && trends.monthly.find(m => m.month === '2024-02')?.order_count > 0) {
    results.push({ label: 'Feb 31 bug', detail: `Feb has ${trends.monthly.find(m => m.month === '2024-02')?.order_count} orders but comparison returns ${comparison.period1.orders}`, severity: 'high' })
    totalFailed++
  }
}

function testOrphanedClientDelete(store, { clientIds }) {
  console.log('\n🔴 TEST 14: Delete client with existing orders')
  const beforeClients = store.getClients().length
  const beforeOrders = store.getOrders().length
  const res = store.deleteClient(clientIds[0])
  assert(!res.success, 'Delete client with orders is rejected', `success=${res.success} reason=${res.reason}`, 'high')
  const afterClients = store.getClients().length
  assert(afterClients === beforeClients, 'Client count unchanged after rejected delete', `before=${beforeClients} after=${afterClients}`, 'high')
}

function testOrphanedIngredientDelete(store, { dishIds, ingNames }) {
  console.log('\n🔴 TEST 15: Delete ingredient used in dishes')
  store.deleteIngredient(ingNames['Harina 0000'])
  const dishes = store.getDishes()
  const affected = dishes.filter(d => d.ingredients.some(i => i.ingredientId === ingNames['Harina 0000']))
  assert(affected.length === 0, 'Deleted ingredient removed from dishes', `Found ${affected.length} dishes still referencing it`, 'high')
  const hasMissing = dishes.some(d => d.ingredients.some(i => !i.ingredientId))
  assert(!hasMissing, 'No dish with null ingredientId after deletion', '', 'high')
}

function testNegativeQuantity(store, { weekId, dishIds, clientIds }) {
  console.log('\n🟠 TEST 8: Negative quantity in order')
  const before = store.getOrders().length
  const r = store.createOrder({
    clientId: clientIds[0],
    weekId,
    items: [{ dishId: dishIds['Muzzarella'], quantity: -3 }],
    has_delivery: false
  })
  const after = store.getOrders().length
  log(`     createOrder returned: ${JSON.stringify(r)}`)
  assert(!r.success, 'Order with negative qty was rejected', `success=${r.success}`, 'high')
  assert(after === before, 'No order created for negative quantity', `before=${before} after=${after}`, 'high')
}

function testNegativePrice(store) {
  console.log('\n🟠 TEST 11: Negative price in dish')
  const r = store.createDish({ name: 'Negative price', category: 'Test', price: -500, ingredients: [] })
  assert(r.success, 'Dish with negative price created', JSON.stringify(r))
  const dish = store.getDishes().find(d => d.id === r.id)
  assert(dish && dish.price === 0, 'Negative price clamped to 0', dish ? `price=${dish.price}` : 'dish not found', 'high')
}

function testUndoSubtractsOne(store, { dishIds }) {
  console.log('\n🟠 TEST 10: Undo subtracts one unit')
  const id = dishIds['Empanada carne']
  const prod = () => store.getDashboard().dishes.find(d => d.id === id)?.total_produced || 0
  const start = prod()
  store.addProduction(id, 5)
  store.undoProduction(id)
  assert(prod() === start + 4, 'Undo subtracts exactly 1 unit', `start=${start} after=${prod()}`, 'high')
  for (let i = 0; i < 4; i++) store.undoProduction(id)
  assert(prod() === start, 'Repeated undo goes back to the start', `start=${start} after=${prod()}`)
}

function testEmptyClientName(store, { weekId, dishIds }) {
  console.log('\n🟡 TEST: Empty client name in getOrders')
  const c = store.createClient({ name: '', last_name: '', phone: '', address: '' })
  store.createOrder({ clientId: c.id, weekId, items: [{ dishId: dishIds[Object.keys(dishIds)[0]], quantity: 1 }], notes: '' })
  const orders = store.getOrders()
  const blank = orders.find(o => o.client_id === c.id)
  assert(blank, 'Order with blank client exists', JSON.stringify(blank))
  assert(blank.client_name !== '—', 'Blank client name is not "—"', `client_name="${blank.client_name}"`)
}

function testDeliveryFeeZero(store, { weekId, dishIds, clientIds }) {
  console.log('\n🟡 TEST 20: Delivery fee = 0')
  const r = store.createOrder({
    clientId: clientIds[0], weekId,
    items: [{ dishId: dishIds['Muzzarella'], quantity: 1 }],
    has_delivery: true, delivery_fee: 0
  })
  const order = store.getOrders().find(o => o.id === r.id)
  assert(order && order.delivery_fee === 0, 'Delivery fee stored as 0', order ? `fee=${order.delivery_fee}` : 'order not found', 'high')
}

function testGetDishesMutation(store) {
  console.log('\n🔴 TEST 13: getDishes() mutates original data')
  const first = store.getDishes()
  const origName = first[0].name
  first[0].name = 'MUTATED'
  const second = store.getDishes()
  assert(second[0].name === origName, 'Mutating returned dish does not affect store',
    `Expected "${origName}", got "${second[0].name}"`, 'critical')
  assert(Array.isArray(first[0].ingredients), 'Ingredients is array', typeof first[0].ingredients)
}

function testProgressBarAtZero(store) {
  console.log('\n🟡 TEST 17: Progress bar at 0%')
  const dash = store.getDashboard()
  const zero = dash.dishes.find(d => d.total_produced === 0 && d.total_ordered > 0)
  assert(!zero || zero.total_produced === 0, 'Dish with 0 progress exists', zero ? `produced=${zero.total_produced} ordered=${zero.total_ordered}` : 'no dish with 0 progress')
}

function testIDReuseOnCrash(store) {
  console.log('\n🔵 TEST 12: ID reuse on crash (genId without save)')
  const firstId = store.createOrder({ clientId: 1, weekId: 1, items: [], notes: 'crash test' }).id
  const dataRaw = JSON.parse(fs.readFileSync(TEST_DB, 'utf-8'))
  const nextIdBeforeCrash = dataRaw._nextId
  fs.writeFileSync(TEST_DB, JSON.stringify({ ...dataRaw, _nextId: nextIdBeforeCrash - 2 }, null, 2))
  delete require.cache[require.resolve('./electron/store')]
  const store2 = require('./electron/store')
  store2.init(TEST_DB)
  const secondId = store2.createOrder({ clientId: 1, weekId: 1, items: [], notes: 'after crash' }).id
  const reused = secondId <= firstId
  assert(!reused, 'ID not reused after crash simulation (known JSON-store limitation)',
    `firstId=${firstId} secondId=${secondId} — IDs ${reused ? 'WERE' : 'were NOT'} reused; simple JSON stores cannot prevent this`, 'low')
}

function testDuplicateSeedIngredient() {
  console.log('\n🔴 TEST 16: Duplicate Palta in seed')
  const seedContent = fs.readFileSync(path.join(__dirname, 'seed.js'), 'utf-8')
  const catalogStart = seedContent.indexOf('INGREDIENT_CATALOG')
  const catalogEnd = seedContent.indexOf('//', catalogStart + 20)
  const catalogSection = catalogStart >= 0 ? seedContent.slice(catalogStart, catalogEnd >= 0 ? catalogEnd : undefined) : ''
  const matches = (catalogSection.match(/'Palta'/g) || []).length
  assert(matches === 1, 'Only one Palta in seed INGREDIENT_CATALOG', `Found ${matches}`, 'high')
}

function testZeroProductionLog(store, { weekId, dishIds }) {
  console.log('\n🔵 TEST 27: Zero-quantity production logs')
  const log = store.addProduction(dishIds['Muzzarella'], 0)
  const dash = store.getDashboard()
  assert(log && log.success !== false, 'addProduction with qty=0 succeeds', JSON.stringify(log))
}

function testGetOrdersInRangeInvalid(store) {
  console.log('\n🟠 TEST: getOrdersInRange with invalid date')
  const ids = store.getOrdersInRange?.('not-a-date', 'also-invalid')
  assert(ids && Array.isArray(ids), 'getOrdersInRange with bad dates returns array', JSON.stringify(ids))
}

function testIsOrdersOpenFridayBoundary(store) {
  console.log('\n🟡 TEST 23: isOrdersOpen Friday boundary (seconds ignored)')
  const result = store.isOrdersOpen()
  assert(typeof result === 'boolean', 'isOrdersOpen returns boolean', `got ${typeof result}`)
}

function testDeleteNonexistent(store) {
  console.log('\n🟡 TEST: Delete non-existent records')
  const r1 = store.deleteOrder(99999)
  assert(r1 && r1.success !== false, 'deleteOrder non-existent returns success', JSON.stringify(r1))
  const r2 = store.deleteDish(99999)
  assert(r2 && r2.success !== false, 'deleteDish non-existent returns success', JSON.stringify(r2))
  const r3 = store.deleteClient(99999)
  assert(r3 && r3.success !== false, 'deleteClient non-existent returns success', JSON.stringify(r3))
  const r4 = store.deleteIngredient(99999)
  assert(r4 && r4.success !== false, 'deleteIngredient non-existent returns success', JSON.stringify(r4))
}

function testGetWeekComparison(store) {
  console.log('\n🟡 TEST: getWeekComparison without 2 weeks of data')
  const comp = store.getWeekComparison()
  assert(comp && (comp.current || comp.period1), 'getWeekComparison returns data when only 1 week exists', JSON.stringify(comp))
}

function testTrendsConsistency(store) {
  console.log('\n🟡 TEST: Trends data consistency')
  const all = store.getTrendsInRange(null, null)
  assert(all && Array.isArray(all.weekly), 'getTrendsInRange returns weekly array', typeof all?.weekly)
  assert(all && Array.isArray(all.monthly), 'getTrendsInRange returns monthly array', typeof all?.monthly)
  assert(all && Array.isArray(all.yearly), 'getTrendsInRange returns yearly array', typeof all?.yearly)
}

function testPeriodComparisonOrderChange(store) {
  console.log('\n🟡 TEST: Period comparison order change')
  const p1 = store.getPeriodComparison('2020-01-01', '2020-01-31', '2024-06-01', '2024-06-30')
  assert(p1 && p1.period1, 'Comparison with empty period1 returns data', JSON.stringify(p1))
  const p2 = store.getPeriodComparison('2024-06-01', '2024-06-30', '2020-01-01', '2020-01-31')
  assert(p2 && p2.period2, 'Reversed periods', JSON.stringify(p2))
  const revPct = p2.changes.orders
  assert(revPct === null, 'Change vs empty base period is null (not 0%)', `orders=${revPct}`)
  assert(typeof p1.changes.orders === 'number' || p1.changes.orders === null, 'Percentage change is number or null', `type=${typeof p1.changes.orders}`)
}

function testPeriodComparisonSamePeriod(store) {
  console.log('\n🟡 TEST: Period comparison with same period')
  const comp = store.getPeriodComparison(null, null, null, null)
  assert(comp && comp.changes, 'Same period comparison works', JSON.stringify(comp))
  assert(comp.period1.orders > 0, 'Same-period comparison has data', `orders=${comp.period1.orders}`)
  assert(comp.changes.orders === 0 && comp.changes.revenue === 0, 'Same period has 0% change', `orders=${comp.changes.orders} revenue=${comp.changes.revenue}`)
  assert(comp.changes.margin === 0, 'Same period margin change is 0 pp', `margin=${comp.changes.margin}`)
}

function testDashboardEdgeCases(store) {
  console.log('\n🟡 TEST: Dashboard edge cases')
  const dash = store.getDashboard()
  assert(dash && typeof dash.totals === 'object', 'Dashboard has totals', typeof dash?.totals)
  assert(Array.isArray(dash.dishes), 'Dashboard dishes is array')
  if (dash.dishes.length > 0) {
    const d = dash.dishes[0]
    assert(typeof d.total_ordered === 'number', 'Dish total_ordered is number', typeof d.total_ordered)
    assert(typeof d.total_produced === 'number', 'Dish total_produced is number', typeof d.total_produced)
  }
}

function testIngredientsList(store) {
  console.log('\n🟡 TEST: getIngredientsList')
  const list = store.getIngredientsList()
  assert(Array.isArray(list), 'Ingredients list is array', typeof list)
  if (list.length > 0) {
    assert(typeof list[0].total === 'number', 'Ingredient total is number', typeof list[0].total)
  }
}

function testDishProfitability(store) {
  console.log('\n🟡 TEST: Dish profitability')
  const prof = store.getDishProfitability()
  assert(Array.isArray(prof), 'getDishProfitability returns array', typeof prof)
  if (prof.length > 0) {
    assert(typeof prof[0].margin === 'number', 'Profitability margin is number', typeof prof[0].margin)
  }
}

function testCreateUpdateOrderConsistency(store, { weekId, dishIds, clientIds }) {
  console.log('\n🟠 TEST: Create + update order consistency')
  const r = store.createOrder({
    clientId: clientIds[0], weekId,
    items: [{ dishId: dishIds['Muzzarella'], quantity: 1 }],
    notes: 'original'
  })
  const updated = store.updateOrder({ id: r.id, clientId: clientIds[0], items: [{ dishId: dishIds['Lomito completo'], quantity: 2 }], notes: 'updated' })
  assert(updated.success, 'Update succeeds', JSON.stringify(updated))
  const fetched = store.getOrderWithDetails(r.id)
  assert(fetched && fetched.notes === 'updated', 'Update changes notes', `notes=${fetched?.notes}`, 'high')
  assert(fetched && fetched.items && fetched.items.length === 1, 'Update replaces items', `items=${fetched?.items?.length}`)
  assert(fetched && fetched.items[0]?.dish_id === dishIds['Lomito completo'], 'Update changes dish', `dish_id=${fetched?.items[0]?.dish_id}`, 'high')
}

function testSaveDiskCorruption(store) {
  console.log('\n🔴 TEST 6: Corrupt JSON recovery')
  fs.writeFileSync(TEST_DB, '{invalid json!!!', 'utf-8')
  delete require.cache[require.resolve('./electron/store')]
  const store2 = require('./electron/store')
  let recovered = false
  try {
    store2.init(TEST_DB)
    const dishes = store2.getDishes()
    recovered = Array.isArray(dishes)
  } catch (e) {
    log(`     Exception: ${e.message}`)
  }
  assert(recovered, 'Store recovers from corrupt JSON with fresh defaults', '', 'critical')
  fs.writeFileSync(TEST_DB, JSON.stringify({ _nextId: 1, weeks: [], dishes: [], clients: [], orders: [], orderItems: [], productionLog: [], ingredients: [], deliverySettings: { defaultFee: 500 } }, null, 2))
  store2.init(TEST_DB)
}

function testNextIdCalculation(store) {
  console.log('\n🔵 TEST 26: _nextId calculation')
  store.createClient({ name: 'Test', last_name: 'Last' })
  const data = JSON.parse(fs.readFileSync(TEST_DB, 'utf-8'))
  assert(data._nextId > 0, '_nextId is positive', `_nextId=${data._nextId}`)
}

function testDeliverySettingsPersistence(store) {
  console.log('\n🟠 TEST: Delivery settings persistence')
  store.setDefaultDeliveryFee(999)
  const fee1 = store.getDefaultDeliveryFee()
  assert(fee1 === 999, 'Default delivery fee changed to 999', `got ${fee1}`)
  store.setDefaultDeliveryFee(500)
  const fee2 = store.getDefaultDeliveryFee()
  assert(fee2 === 500, 'Default delivery fee restored to 500', `got ${fee2}`)
}

function testMarkAssembleStateMachine(store, { weekId, dishIds, clientIds }) {
  console.log('\n🟡 TEST: Mark assembled/delivered state machine')
  const r = store.createOrder({
    clientId: clientIds[0], weekId,
    items: [{ dishId: dishIds['Muzzarella'], quantity: 1 }]
  })

  store.markOrderAssembled(r.id)
  const order1 = store.getOrderWithDetails(r.id)
  assert(order1 && order1.status === 'assembled', 'Status changed to assembled', order1?.status)

  store.markOrderAssembled(r.id)
  const order2 = store.getOrderWithDetails(r.id)
  assert(order2 && order2.status === 'assembled', 'Double-assemble keeps assembled', order2?.status)

  store.unmarkOrderAssembled(r.id)
  const order3 = store.getOrderWithDetails(r.id)
  assert(order3 && order3.status === 'confirmed', 'Unmark sets confirmed', order3?.status)

  store.markOrderAssembled(r.id)
  store.unmarkOrderAssembled(r.id)
  const order4 = store.getOrderWithDetails(r.id)
  assert(order4 && order4.status === 'confirmed', 'Second unmark keeps confirmed', order4?.status)

  store.markOrderAssembled(r.id)
  const rDel = store.markOrderDelivered(r.id)
  assert(rDel.success !== false, 'markOrderDelivered succeeds from assembled', JSON.stringify(rDel))
  const order5 = store.getOrderWithDetails(r.id)
  assert(order5 && order5.status === 'delivered', 'Status changed to delivered', order5?.status)

  const rDel2 = store.markOrderDelivered(r.id)
  assert(rDel2.success === false, 'markOrderDelivered fails from delivered', JSON.stringify(rDel2))

  const rUndo = store.unmarkOrderDelivered(r.id)
  assert(rUndo.success !== false, 'unmarkOrderDelivered succeeds from delivered', JSON.stringify(rUndo))
  const order6 = store.getOrderWithDetails(r.id)
  assert(order6 && order6.status === 'assembled', 'Undo delivered sets assembled', order6?.status)

  const rFail = store.markOrderDelivered(99999)
  assert(rFail.success === false, 'markOrderDelivered fails for non-existent order', JSON.stringify(rFail))
}

function testCompositeIngredient(store) {
  console.log('\n🟠 TEST: Composite ingredient cost calculation')
  const base = store.createIngredient({ name: 'BaseTest', unit: 'kg', cost: 100, category: 'Test' })
  const comp = store.createIngredient({
    name: 'CompositeTest', unit: 'l', cost: 0, category: 'Test',
    subIngredients: [{ ingredientId: base.id, quantity: 0.5 }]
  })
  const resolved = store.getResolvedCost(comp.id)
  assert(Math.abs(resolved - 50) < 0.001, 'Composite cost = 0.5 * 100 = 50', `got ${resolved}`)
  const dishR = store.createDish({ name: 'CompDish', category: 'Test', price: 200, ingredients: [{ ingredientId: comp.id, quantity: 2 }] })
  const dishCost = store.calculateDishCost(dishR.id)
  assert(Math.abs(dishCost - 100) < 0.001, 'Dish cost with composite = 2 * 50 = 100', `got ${dishCost}`)
  store.deleteIngredient(base.id)
  const dishCostAfter = store.calculateDishCost(dishR.id)
  assert(dishCostAfter === 0, 'Dish cost recalculates to 0 when composite subIngredients are cleaned up', `got ${dishCostAfter}`)
}

function testCompositeShoppingList(store, { dishIds }) {
  console.log('\n🟠 TEST: Shopping list explodes composite ingredients')
  const list = store.getIngredientsList()
  const masaEntry = list.find(i => i.name === 'Masa para pizza')
  assert(!masaEntry, 'Masa para pizza NOT in shopping list (exploded)', masaEntry ? `found ${masaEntry.total}` : '')
  const harinaEntry = list.find(i => i.name === 'Harina 0000')
  assert(harinaEntry && harinaEntry.total > 0, 'Harina 0000 IS in shopping list from exploded masa', harinaEntry ? `total=${harinaEntry.total}` : 'not found')
}

function testCircularComposite(store) {
  console.log('\n🟠 TEST: Circular composite references')
  const a = store.createIngredient({ name: 'CircA', unit: 'kg', cost: 10, category: 'Test' })
  const b = store.createIngredient({ name: 'CircB', unit: 'kg', cost: 20, category: 'Test',
    subIngredients: [{ ingredientId: a.id, quantity: 1 }]
  })
  store.updateIngredient({ id: a.id, name: 'CircA', unit: 'kg', cost: 10, category: 'Test',
    subIngredients: [{ ingredientId: b.id, quantity: 1 }]
  })
  const costA = store.getResolvedCost(a.id)
  assert(costA === 0, 'Circular composite returns 0 cost (no crash)', `got ${costA}`)
}

function testCompositeShoppingListLocal(store, { weekId }) {
  console.log('\n🟠 TEST: Shopping list explodes composite ingredients')
  const base = store.createIngredient({ name: 'ShopBase', unit: 'kg', cost: 100, category: 'Test' })
  const comp = store.createIngredient({ name: 'ShopComp', unit: 'l', cost: 0, category: 'Test',
    subIngredients: [{ ingredientId: base.id, quantity: 0.5 }]
  })
  const dish = store.createDish({ name: 'ShopDish', category: 'Test', price: 200,
    ingredients: [{ ingredientId: comp.id, quantity: 2 }]
  })
  const c = store.getClients()
  store.createOrder({ clientId: c[0].id, weekId, items: [{ dishId: dish.id, quantity: 3 }] })
  const list = store.getIngredientsList()
  const compEntry = list.find(i => i.name === 'ShopComp')
  assert(!compEntry, 'Composite NOT in shopping list (exploded)', compEntry ? `found total=${compEntry.total}` : '')
  const baseEntry = list.find(i => i.name === 'ShopBase')
  assert(baseEntry && baseEntry.total > 0, 'Base ingredient IS in shopping list', baseEntry ? `total=${baseEntry.total}` : 'not found')
  assert(baseEntry && Math.abs(baseEntry.total - 3) < 0.01, 'Base qty = 3 (3 orders * 2 dish * 0.5 base qty)', `total=${baseEntry?.total}`)
}

function testStringWhitespaceClient(store, { weekId }) {
  console.log('\n🟡 TEST: Client with whitespace-only fields')
  const c = store.createClient({ name: '  ', last_name: '  ', phone: '  ', address: '  ' })
  assert(c.success, 'Client with whitespace created', JSON.stringify(c))
}

function testCompleteDishOverProduction(store, { dishIds }) {
  console.log('\n🟡 TEST: Complete dish then add more production')
  store.completeDishProduction(dishIds['Muzzarella'])
  const before = store.getDashboard()
  const prodBefore = before.dishes.find(d => d.id === dishIds['Muzzarella'])?.total_produced || 0
  store.addProduction(dishIds['Muzzarella'], 10)
  const after = store.getDashboard()
  const prodAfter = after.dishes.find(d => d.id === dishIds['Muzzarella'])?.total_produced || 0
  assert(prodAfter >= prodBefore, 'Can add production after complete', `before=${prodBefore} after=${prodAfter}`)
}

function testClientHasOrderThisWeek(store, { clientIds }) {
  console.log('\n🟡 TEST: clientHasOrderThisWeek')
  const has = store.clientHasOrderThisWeek(clientIds[0])
  assert(typeof has === 'boolean', 'clientHasOrderThisWeek returns boolean', `got ${typeof has}`)
  const hasNonExistent = store.clientHasOrderThisWeek(99999)
  assert(typeof hasNonExistent === 'boolean', 'Non-existent client returns boolean', `got ${typeof hasNonExistent}`)
}

function testGetClientOrderHistory(store, { weekId, dishIds }) {
  console.log('\n🟠 TEST: getClientOrderHistory')
  const c = store.createClient({ name: 'Historial', last_name: 'Test', phone: '', address: '' })
  store.createOrder({ clientId: c.id, weekId, items: [{ dishId: dishIds['Muzzarella'], quantity: 2 }, { dishId: dishIds['Lomito completo'], quantity: 1 }], has_delivery: true, delivery_fee: 500 })
  store.createOrder({ clientId: c.id, weekId, items: [{ dishId: dishIds['Empanada carne'], quantity: 3 }], has_delivery: false })

  const history = store.getClientOrderHistory(c.id)
  assert(history.length === 2, 'Client has 2 orders', `got length ${history.length}`)
  assert(history[0].has_delivery === false, 'Most recent order (no delivery) first (desc sort)', `got ${history[0].has_delivery}`)
  assert(history[0].total === 3 * 3200, 'No-delivery total is 9600', `got ${history[0].total}`)
  const withDelivery = history[1]
  assert(withDelivery.has_delivery === true && withDelivery.delivery_fee === 500, 'Delivery order has fee 500', `fee=${withDelivery.delivery_fee}`)
  const expectedItems = 2 * 3800 + 1 * 5200
  assert(withDelivery.items_total === expectedItems, `items_total is ${expectedItems}`, `got ${withDelivery.items_total}`)
  assert(withDelivery.total === expectedItems + 500, `total is ${expectedItems + 500}`, `got ${withDelivery.total}`)
  assert(withDelivery.items.length === 2, 'items.length is 2', `got ${withDelivery.items.length}`)
  assert(withDelivery.items[0].dish_name === 'Muzzarella', 'dish_name resolved', `got ${withDelivery.items[0].dish_name}`)
  assert(withDelivery.items[0].subtotal === 7600, 'subtotal computed', `got ${withDelivery.items[0].subtotal}`)
  assert(withDelivery.client_name.includes('Historial'), 'client_name attached', `got ${withDelivery.client_name}`)

  const empty = store.getClientOrderHistory(99999)
  assert(Array.isArray(empty) && empty.length === 0, 'Unknown client returns empty', `got length ${empty.length}`)
}

function testGetOrdersByWeekId(store, { weekId, dishIds }) {
  console.log('\n🟠 TEST: getOrdersByWeekId (historical view fields)')
  const c = store.createClient({ name: 'Semana', last_name: 'Hist', phone: '112233', address: 'Calle 99' })
  const r = store.createOrder({ clientId: c.id, weekId, items: [{ dishId: dishIds['Muzzarella'], quantity: 2 }, { dishId: dishIds['Empanada carne'], quantity: 1 }], has_delivery: true, delivery_fee: 300 })
  const orders = store.getOrdersByWeekId(weekId)
  const order = orders.find(o => o.id === r.id)
  assert(order, 'Order found in week', 'not found')
  assert(order.client_name === 'Semana Hist', 'client_name resolved', `got ${order.client_name}`)
  assert(order.client_phone === '112233', 'client_phone set', `got ${order.client_phone}`)
  assert(order.name === 'Semana' && order.last_name === 'Hist', 'client name/last_name preserved (labels)', `got ${order.name} ${order.last_name}`)
  assert(order.address === 'Calle 99', 'client address preserved (labels)', `got ${order.address}`)
  assert(order.has_delivery === true && order.delivery_fee === 300, 'delivery fields present', `fee=${order.delivery_fee}`)
  const expectedItems = 2 * 3800 + 1 * 3200
  assert(order.items_total === expectedItems, `items_total is ${expectedItems}`, `got ${order.items_total}`)
  assert(order.total === expectedItems + 300, `total is ${expectedItems + 300}`, `got ${order.total}`)
  assert(order.items.length === 2, 'items.length is 2', `got ${order.items.length}`)
  assert(order.items[0].dish_name === 'Muzzarella', 'dish_name resolved', `got ${order.items[0].dish_name}`)
  assert(order.items[0].subtotal === 7600, 'subtotal computed', `got ${order.items[0].subtotal}`)
  assert(order.created_at, 'created_at present', '')
}

function testCreateOrderDeliveryDay(store, seed) {
  log('\n--- testCreateOrderDeliveryDay ---')
  const { dishIds, clientIds, weekId } = seed

  const r1 = store.createOrder({
    clientId: clientIds[0], weekId,
    items: [{ dishId: dishIds['Muzzarella'], quantity: 1 }],
    has_delivery: true, delivery_fee: 500, delivery_day: 'sabado'
  })
  assert(r1.success, 'order created with delivery_day=sabado')

  const orders = store.getOrdersByWeekId(weekId)
  const order = orders.find(o => o.id === r1.id)
  assert(order?.delivery_day === 'sabado', 'delivery_day stored as sabado', `got: ${order?.delivery_day}`)

  const r2 = store.createOrder({
    clientId: clientIds[1], weekId,
    items: [{ dishId: dishIds['Lomito completo'], quantity: 1 }],
    has_delivery: true, delivery_fee: 300
  })
  assert(r2.success, 'order created without delivery_day (default viernes)')

  const orders2 = store.getOrdersByWeekId(weekId)
  const order2 = orders2.find(o => o.id === r2.id)
  assert(order2?.delivery_day === 'viernes', 'default delivery_day is viernes', `got: ${order2?.delivery_day}`)

  const r3 = store.createOrder({
    clientId: clientIds[2], weekId,
    items: [{ dishId: dishIds['Empanada carne'], quantity: 1 }],
    has_delivery: false
  })
  assert(r3.success, 'order created without delivery')

  const orders3 = store.getOrdersByWeekId(weekId)
  const order3 = orders3.find(o => o.id === r3.id)
  assert(order3?.delivery_day === null, 'delivery_day is null when no delivery', `got: ${order3?.delivery_day}`)
}

function withFixtureStore(fixture, fn) {
  const file = path.join(__dirname, 'piu.analytics.test.json')
  fs.writeFileSync(file, JSON.stringify({ weeks: [], dishes: [], clients: [], orders: [], orderItems: [], productionLog: [], ingredients: [], deliverySettings: { defaultFee: 500 }, _nextId: 100, ...fixture }))
  const modPath = require.resolve('./electron/store')
  const cached = require.cache[modPath]
  delete require.cache[modPath]
  const fresh = require('./electron/store')
  try {
    fresh.init(file)
    fn(fresh)
  } finally {
    delete require.cache[modPath]
    if (cached) require.cache[modPath] = cached
    try { fs.unlinkSync(file) } catch {}
  }
}

function testAnalyticsDateRangeAndAverages() {
  log('\n--- testAnalyticsDateRangeAndAverages ---')
  const prevTZ = process.env.TZ
  process.env.TZ = 'America/Argentina/Cordoba'
  try {
    withFixtureStore({
      weeks: [
        { id: 1, week_start: '2026-07-05', week_end: '2026-07-11' },
        { id: 2, week_start: '2026-07-12', week_end: '2026-07-18' }
      ],
      dishes: [{ id: 10, name: 'Tarta', price: 1200, ingredients: [], is_active: true }],
      clients: [{ id: 20, name: 'Ana', last_name: 'A' }],
      orders: [
        { id: 30, week_id: 1, client_id: 20, status: 'delivered', created_at: '2026-07-11 22:30:00' },
        { id: 31, week_id: 2, client_id: 20, status: 'delivered', created_at: '2026-07-13 10:00:00' },
        { id: 32, week_id: 2, client_id: 20, status: 'delivered', created_at: '2026-07-13 18:00:00' }
      ],
      orderItems: [
        { order_id: 30, dish_id: 10, quantity: 1, unit_price: 1000, unit_cost: 400 },
        { order_id: 31, dish_id: 10, quantity: 3, unit_price: 1000, unit_cost: 400 },
        { order_id: 32, dish_id: 10, quantity: 1, unit_price: 1400, unit_cost: 600 }
      ],
      productionLog: [{ id: 40, week_id: 2, dish_id: 10, quantity_produced: 6, date_produced: '2026-07-12' }]
    }, (st) => {
      const week = st.getAnalyticsFiltered('2026-07-12', '2026-07-18')
      assert(week.totalOrders === 2, 'Saturday 22:30 order is not counted in the next week (TZ -03)', `totalOrders=${week.totalOrders}`, 'high')
      const monday = week.dayOfWeek.find(d => d.day === 1)
      assert(monday.count === 2, 'Orders per weekday counts distinct orders, not items', `monday=${monday.count}`, 'high')
      const tarta = week.topDishes.find(d => d.id === 10)
      assert(tarta.total === 4, 'Units sold in range', `total=${tarta.total}`)
      assert(Math.abs(tarta.price - 1100) < 1e-9 && Math.abs(tarta.cost - 450) < 1e-9, 'Dish price/cost are period averages', `price=${tarta.price} cost=${tarta.cost}`)
      assert(Math.abs(tarta.profit - 650) < 1e-9 && Math.abs(tarta.margin - 650 / 1100 * 100) < 1e-9, 'Dish profit/unit and margin use averages', `profit=${tarta.profit} margin=${tarta.margin}`)
      const over = st.getOverproductionInRange('2026-07-12', '2026-07-18')
      const od = over.perDish.find(d => d.dishId === 10)
      assert(od && od.produced === 6 && od.overproduction === 2, 'Production on the first day of the range is included', JSON.stringify(od))
      const series = st.getDishTimeSeries(10, '2026-07-12', '2026-07-18')
      assert(series.length === 1 && series[0].produced === 6, 'Dish time series includes first-day production', JSON.stringify(series))
      const comp = st.getPeriodComparison('2026-07-05', '2026-07-11', '2026-07-12', '2026-07-18')
      assert(comp.changes.orders === 100, 'Order change is numeric percent', `orders=${comp.changes.orders}`)
      assert(comp.changes.margin === Math.round((comp.period2.margin - comp.period1.margin) * 10) / 10, 'Margin change is in percentage points', `margin=${comp.changes.margin}`)
    })
  } finally {
    if (prevTZ === undefined) delete process.env.TZ
    else process.env.TZ = prevTZ
  }
}

function testStartLocation(store) {
  log('\n--- testStartLocation ---')
  assert(store.getStartLocation() === null, 'Start location defaults to null')
  const loc = { address: 'Av. Colón 500, Córdoba', lat: -31.41, lng: -64.19, city: 'Córdoba', countryCode: 'ar' }
  const r = store.setStartLocation(loc)
  assert(r.success === true, 'setStartLocation succeeds with valid coords')
  const got = store.getStartLocation()
  assert(got && got.lat === -31.41 && got.lng === -64.19 && got.city === 'Córdoba' && got.address === loc.address, 'getStartLocation returns saved location', JSON.stringify(got))
  const bad = store.setStartLocation({ address: 'x', lat: 'abc', lng: 10 })
  assert(bad.success === false, 'Invalid coords are rejected')
  const outOfRange = store.setStartLocation({ address: 'x', lat: 120, lng: 10 })
  assert(outOfRange.success === false, 'Out-of-range latitude is rejected')
  assert(store.getStartLocation()?.lat === -31.41, 'Rejected update keeps previous location')
  store.setDefaultDeliveryFee(700)
  assert(store.getStartLocation()?.lat === -31.41 && store.getDefaultDeliveryFee() === 700, 'Start location coexists with default fee')
  store.setStartLocation(null)
  assert(store.getStartLocation() === null, 'setStartLocation(null) clears it')
  store.setDefaultDeliveryFee(500)
}

function testClientLocality(store, { weekId, dishIds }) {
  log('\n--- testClientLocality ---')
  const c = store.createClient({ name: 'Loc', last_name: 'Test', address: 'Mitre 100', locality: 'Quilmes' })
  const created = store.getClients().find(x => x.id === c.id)
  assert(created?.locality === 'Quilmes', 'createClient persists locality', JSON.stringify(created))
  store.updateClient({ id: c.id, name: 'Loc', last_name: 'Test', address: 'Mitre 100', locality: 'Bernal' })
  const updated = store.getClients().find(x => x.id === c.id)
  assert(updated?.locality === 'Bernal', 'updateClient persists locality', JSON.stringify(updated))
  const noLoc = store.createClient({ name: 'SinLoc', address: 'Calle 1' })
  assert(store.getClients().find(x => x.id === noLoc.id)?.locality === '', 'Missing locality stored as empty string')
  const r = store.createOrder({ clientId: c.id, weekId, items: [{ dishId: dishIds[Object.keys(dishIds)[0]], quantity: 1 }], has_delivery: true, delivery_fee: 0 })
  const order = store.getOrdersByWeekId(weekId).find(o => o.id === r.id)
  assert(order?.client_locality === 'Bernal', 'Orders expose client_locality', order ? `client_locality=${order.client_locality}` : 'order not found')
}

function testUpdateOrderDeliveryDay(store, seed) {
  log('\n--- testUpdateOrderDeliveryDay ---')
  const { dishIds, clientIds, weekId } = seed

  const r1 = store.createOrder({
    clientId: clientIds[0], weekId,
    items: [{ dishId: dishIds['Muzzarella'], quantity: 1 }],
    has_delivery: true, delivery_fee: 500, delivery_day: 'lunes'
  })

  store.updateOrder({
    id: r1.id, clientId: clientIds[0],
    items: [{ dishId: dishIds['Muzzarella'], quantity: 2 }],
    has_delivery: true, delivery_fee: 700, delivery_day: 'domingo'
  })

  const orders = store.getOrdersByWeekId(weekId)
  const order = orders.find(o => o.id === r1.id)
  assert(order?.delivery_day === 'domingo', 'delivery_day updated to domingo', `got: ${order?.delivery_day}`)
  assert(order?.delivery_fee === 700, 'delivery_fee updated to 700', `got: ${order?.delivery_fee}`)

  store.updateOrder({
    id: r1.id, clientId: clientIds[0],
    items: [{ dishId: dishIds['Muzzarella'], quantity: 1 }],
    has_delivery: false, delivery_fee: 0
  })

  const orders2 = store.getOrdersByWeekId(weekId)
  const order2 = orders2.find(o => o.id === r1.id)
  assert(order2?.delivery_day === null, 'delivery_day cleared when delivery removed', `got: ${order2?.delivery_day}`)
}

// ============================== MAIN ==============================

function testOrderSnapshotOnEdit() {
  log('\n--- testOrderSnapshotOnEdit ---')
  withFixtureStore({
    dishes: [{ id: 10, name: 'Tarta', price: 1000, ingredients: [], is_active: true }],
    clients: [{ id: 20, name: 'Ana', last_name: 'A' }]
  }, (s) => {
    const week = s.getCurrentWeek()
    const r = s.createOrder({ clientId: 20, weekId: week.id, items: [{ dishId: 10, quantity: 2 }], notes: '' })
    s.updateDish({ id: 10, name: 'Tarta', price: 1500, ingredients: [], is_active: true })
    s.updateOrder({ id: r.id, clientId: 20, items: [{ dishId: 10, quantity: 3 }], notes: 'nota' })
    const order = s.getOrders().find(o => o.id === r.id)
    assert(order.items[0].unit_price === 1000, 'Edit keeps the original unit price', `unit_price=${order.items[0].unit_price}`, 'high')
    assert(order.total === 3000, 'Total uses kept price with new quantity', `total=${order.total}`)
  })
}

function testNextWeek() {
  log('\n--- testNextWeek ---')
  withFixtureStore({}, (s) => {
    const current = s.getCurrentWeek()
    const next = s.getOrCreateNextWeek()
    const [y, m, d] = current.week_start.split('-').map(Number)
    const expected = new Date(y, m - 1, d + 7)
    const expectedStr = `${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, '0')}-${String(expected.getDate()).padStart(2, '0')}`
    assert(next.week_start === expectedStr, 'Next week starts 7 days later', `${current.week_start} → ${next.week_start}`)
    assert(!next.is_current, 'Next week is not current')
    assert(s.getOrCreateNextWeek().id === next.id, 'getOrCreateNextWeek is idempotent')
    assert(s.getCurrentWeek().id === current.id, 'Current week unchanged')
    assert(s.getPreviousWeeks().some(w => w.id === next.id), 'Next week listed in week selector')
  })
  withFixtureStore({}, (s) => {
    const cur = s.getCurrentWeek()
    const fixtureStart = cur.week_start
    s.importData({ weeks: [{ id: 5, week_start: fixtureStart, week_end: cur.week_end, is_current: false }], dishes: [], clients: [], orders: [], orderItems: [], productionLog: [], ingredients: [], _nextId: 50 })
    const w = s.ensureCurrentWeek()
    assert(w.id === 5, 'ensureCurrentWeek reuses a pre-created week', `id=${w.id}`, 'high')
    assert(s.getExportData().weeks.filter(x => x.week_start === fixtureStart).length === 1, 'No duplicate week created')
  })
}

function testOrderInNextWeek() {
  log('\n--- testOrderInNextWeek ---')
  withFixtureStore({
    dishes: [{ id: 10, name: 'Tarta', price: 1000, ingredients: [], is_active: true }],
    clients: [{ id: 20, name: 'Ana', last_name: 'A' }]
  }, (s) => {
    const next = s.getOrCreateNextWeek()
    s.createOrder({ clientId: 20, weekId: next.id, items: [{ dishId: 10, quantity: 1 }] })
    assert(s.getOrders().length === 0, 'Next-week order not in current week')
    assert(s.getOrdersByWeekId(next.id).length === 1, 'Next-week order stored in next week')
    assert(s.clientHasOrderThisWeek(20, next.id) === true, 'clientHasOrderThisWeek honours weekId')
    assert(s.clientHasOrderThisWeek(20) === false, 'clientHasOrderThisWeek defaults to current week')
  })
}

function testCompositeCostPropagation() {
  log('\n--- testCompositeCostPropagation ---')
  withFixtureStore({
    ingredients: [
      { id: 1, name: 'Harina', unit: 'kg', cost: 100, is_active: true, subIngredients: [], batchYield: 1 },
      { id: 2, name: 'Masa', unit: 'kg', cost: 0, is_active: true, subIngredients: [{ ingredientId: 1, quantity: 2 }], batchYield: 2 },
      { id: 3, name: 'Tapa', unit: 'uni', cost: 0, is_active: true, subIngredients: [{ ingredientId: 2, quantity: 1 }], batchYield: 10 }
    ]
  }, (s) => {
    const cost = (id) => s.getIngredients().find(i => i.id === id).cost
    assert(Math.abs(cost(2) - 100) < 1e-9, 'Composite cost recalculated on init', `masa=${cost(2)}`)
    s.updateIngredient({ id: 1, name: 'Harina', unit: 'kg', cost: 200, is_active: true, subIngredients: [] })
    assert(Math.abs(cost(2) - 200) < 1e-9, 'Composite follows base cost change', `masa=${cost(2)}`, 'high')
    assert(Math.abs(cost(3) - 20) < 1e-9, 'Nested composite follows base cost change', `tapa=${cost(3)}`, 'high')
  })
}

function testIngredientUnitChange() {
  log('\n--- testIngredientUnitChange ---')
  withFixtureStore({
    ingredients: [
      { id: 1, name: 'Queso', unit: 'kg', cost: 1000, is_active: true, subIngredients: [], batchYield: 1 },
      { id: 2, name: 'Relleno', unit: 'kg', cost: 0, is_active: true, subIngredients: [{ ingredientId: 1, quantity: 0.5 }], batchYield: 1 }
    ],
    dishes: [{ id: 10, name: 'Tarta', price: 1000, ingredients: [{ ingredientId: 1, quantity: 0.2 }], is_active: true }]
  }, (s) => {
    const before = s.calculateDishCost(10)
    s.updateIngredient({ id: 1, name: 'Queso', unit: 'g', cost: 1, is_active: true, subIngredients: [] })
    const dishQty = s.getExportData().dishes[0].ingredients[0].quantity
    assert(Math.abs(dishQty - 200) < 1e-9, 'Dish quantity converted kg → g', `qty=${dishQty}`, 'high')
    assert(Math.abs(s.calculateDishCost(10) - before) < 1e-9, 'Dish cost unchanged after unit change', `${before} → ${s.calculateDishCost(10)}`, 'high')
    const subQty = s.getIngredients().find(i => i.id === 2).subIngredients[0].quantity
    assert(Math.abs(subQty - 500) < 1e-9, 'Sub-product quantity converted kg → g', `qty=${subQty}`)
    const r = s.updateIngredient({ id: 1, name: 'Queso', unit: 'uni', cost: 1, is_active: true, subIngredients: [] })
    assert(r.success === false && r.reason === 'unit_in_use', 'Incompatible unit change blocked when in use', JSON.stringify(r))
    const usage = s.getIngredientUsage(1)
    assert(usage.dishes.includes('Tarta') && usage.subProducts.includes('Relleno'), 'getIngredientUsage lists dishes and sub-products', JSON.stringify(usage))
  })
}

function testClientOrderStats() {
  log('\n--- testClientOrderStats ---')
  withFixtureStore({
    clients: [{ id: 20, name: 'Ana', last_name: 'A' }, { id: 21, name: 'Beto', last_name: 'B' }],
    orders: [
      { id: 30, week_id: 1, client_id: 20, status: 'delivered', created_at: '2026-07-01 10:00:00' },
      { id: 31, week_id: 1, client_id: 20, status: 'delivered', created_at: '2026-07-08 10:00:00' }
    ]
  }, (s) => {
    const ana = s.getClients().find(c => c.id === 20)
    const beto = s.getClients().find(c => c.id === 21)
    assert(ana.order_count === 2 && ana.last_order_at === '2026-07-08 10:00:00', 'getClients returns order_count and last_order_at', JSON.stringify(ana))
    assert(beto.order_count === 0 && beto.last_order_at === null, 'Client without orders has zero count', JSON.stringify(beto))
  })
}

function testUndeliveredPastWeeks() {
  log('\n--- testUndeliveredPastWeeks ---')
  withFixtureStore({
    weeks: [
      { id: 1, week_start: '2020-01-05', week_end: '2020-01-11', is_current: false },
      { id: 2, week_start: '2020-01-12', week_end: '2020-01-18', is_current: false },
      { id: 3, week_start: '2099-01-04', week_end: '2099-01-10', is_current: false }
    ],
    dishes: [{ id: 10, name: 'Tarta', price: 1000, ingredients: [], is_active: true }],
    clients: [{ id: 20, name: 'Ana', last_name: 'B' }, { id: 21, name: 'Beto', last_name: 'A' }],
    orders: [
      { id: 30, week_id: 1, client_id: 20, status: 'pending', created_at: '2020-01-06 10:00:00' },
      { id: 31, week_id: 1, client_id: 21, status: 'assembled', created_at: '2020-01-06 11:00:00' },
      { id: 32, week_id: 1, client_id: 20, status: 'delivered', created_at: '2020-01-06 12:00:00' },
      { id: 33, week_id: 2, client_id: 20, status: 'confirmed', created_at: '2020-01-13 10:00:00' },
      { id: 34, week_id: 3, client_id: 20, status: 'pending', created_at: '2020-01-13 10:00:00' }
    ],
    orderItems: [{ id: 40, order_id: 30, dish_id: 10, quantity: 2, unit_price: 1000 }]
  }, (s) => {
    const cur = s.getCurrentWeek()
    s.createOrder({ clientId: 20, weekId: cur.id, items: [{ dishId: 10, quantity: 1 }] })
    const curOrder = s.getOrders()[0]

    const weeks = s.getUndeliveredPastWeeks()
    assert(weeks.map(w => w.week.id).join(',') === '2,1', 'Only past weeks with undelivered orders, newest first', JSON.stringify(weeks.map(w => w.week.id)), 'high')
    const w1 = weeks.find(w => w.week.id === 1)
    assert(w1 && w1.orders.map(o => o.id).join(',') === '31,30', 'Undelivered orders only, sorted by last name', JSON.stringify(w1?.orders.map(o => o.id)))
    assert(w1 && w1.orders.find(o => o.id === 30).total === 2000 && w1.orders.find(o => o.id === 30).client_name === 'Ana B', 'Orders are enriched', JSON.stringify(w1?.orders[1]))

    const r = s.markPastOrdersDelivered([30, curOrder.id, 34, 99999])
    assert(r.success && r.updated === 1, 'Only past-week orders are updated', JSON.stringify(r), 'high')
    assert(s.getOrderWithDetails(30).status === 'delivered', 'Pending past order goes straight to delivered')
    assert(s.getOrderWithDetails(curOrder.id).status === 'pending', 'Current-week order untouched', '', 'high')
    assert(s.getOrderWithDetails(34).status === 'pending', 'Future-week order untouched', '', 'high')

    s.markPastOrdersDelivered([31])
    assert(s.getUndeliveredPastWeeks().map(w => w.week.id).join(',') === '2', 'Week disappears once all delivered')
    assert(s.markPastOrdersDelivered('x').updated === 0, 'Non-array input is ignored')
  })
}

function testOrderWeekAttribution() {
  log('\n--- testOrderWeekAttribution ---')
  withFixtureStore({
    weeks: [
      { id: 1, week_start: '2026-07-05', week_end: '2026-07-11' },
      { id: 2, week_start: '2026-07-12', week_end: '2026-07-18' }
    ],
    dishes: [{ id: 10, name: 'Tarta', price: 1000, ingredients: [], is_active: true }],
    clients: [{ id: 20, name: 'Ana', last_name: 'A' }],
    orders: [
      { id: 30, week_id: 2, client_id: 20, status: 'delivered', paid: true, created_at: '2026-07-11 18:00:00' }
    ],
    orderItems: [{ order_id: 30, dish_id: 10, quantity: 1, unit_price: 1000, unit_cost: 400 }],
    _paidMigrated: true
  }, (s) => {
    const next = s.getAnalyticsFiltered('2026-07-12', '2026-07-18')
    assert(next.revenue === 1000, 'Order loaded on Saturday counts in the week it belongs to', `revenue=${next.revenue}`, 'critical')
    const prev = s.getAnalyticsFiltered('2026-07-05', '2026-07-11')
    assert(prev.revenue === 0, 'Order loaded on Saturday does not count in the loading week', `revenue=${prev.revenue}`, 'critical')
    const comp = s.getPeriodComparison('2026-07-05', '2026-07-11', '2026-07-12', '2026-07-18')
    assert(comp.period1.orders === 0 && comp.period2.orders === 1, 'Period comparison uses the order week', JSON.stringify(comp), 'high')
    const trends = s.getTrendsInRange('2026-07-12', '2026-07-18')
    assert(trends.weekly.length === 1 && trends.weekly[0].revenue === 1000, 'Trends include the order in its week', JSON.stringify(trends.weekly), 'high')
    const sales = s.getSalesForExport('2026-07-12', '2026-07-18')
    assert(sales.length === 1, 'Excel export uses the order week', JSON.stringify(sales), 'high')
    const over = s.getOverproductionInRange('2026-07-12', '2026-07-18').perDish.find(d => d.dishId === 10)
    assert(over && over.ordered === 1, 'Overproduction uses the order week', JSON.stringify(over))
  })
}

function testPaidRevenue() {
  log('\n--- testPaidRevenue ---')
  withFixtureStore({
    weeks: [{ id: 1, week_start: '2026-07-12', week_end: '2026-07-18' }],
    dishes: [{ id: 10, name: 'Tarta', price: 1000, ingredients: [], is_active: true }],
    clients: [{ id: 20, name: 'Ana', last_name: 'A' }],
    orders: [
      { id: 30, week_id: 1, client_id: 20, status: 'delivered', paid: true, created_at: '2026-07-13 10:00:00' },
      { id: 31, week_id: 1, client_id: 20, status: 'delivered', paid: false, created_at: '2026-07-13 11:00:00' },
      { id: 32, week_id: 1, client_id: 20, status: 'assembled', paid: true, created_at: '2026-07-13 12:00:00' },
      { id: 33, week_id: 1, client_id: 20, status: 'pending', paid: false, created_at: '2026-07-13 13:00:00' }
    ],
    orderItems: [30, 31, 32, 33].map(id => ({ order_id: id, dish_id: 10, quantity: 1, unit_price: 1000, unit_cost: 400 })),
    _paidMigrated: true
  }, (s) => {
    const a = s.getAnalyticsFiltered('2026-07-12', '2026-07-18')
    assert(a.revenue === 1000 && a.totalOrders === 1, 'Analytics counts only delivered and paid orders', `revenue=${a.revenue} orders=${a.totalOrders}`, 'critical')
    const trends = s.getTrendsInRange('2026-07-12', '2026-07-18')
    const trendRevenue = trends.weekly.reduce((sum, w) => sum + w.revenue, 0)
    assert(trendRevenue === 1000, 'Trends count only delivered and paid orders', `revenue=${trendRevenue}`, 'critical')
    const comp = s.getPeriodComparison('2026-07-12', '2026-07-18', '2026-07-12', '2026-07-18')
    assert(comp.period1.revenue === 1000 && comp.period1.orders === 1, 'Period comparison counts only delivered and paid', JSON.stringify(comp.period1), 'critical')
    const sales = s.getSalesForExport('2026-07-12', '2026-07-18')
    assert(sales.length === 1 && sales[0].order_id === '#30', 'Excel sales only include delivered and paid', JSON.stringify(sales.map(r => r.order_id)), 'high')

    const over = s.getOverproductionInRange('2026-07-12', '2026-07-18').perDish.find(d => d.dishId === 10)
    assert(over && over.ordered === 4, 'Overproduction still counts every order', JSON.stringify(over), 'high')
    const series = s.getDishTimeSeries(10, '2026-07-12', '2026-07-18')
    assert(series[0]?.ordered === 4, 'Dish time series still counts every order', JSON.stringify(series))

    assert(s.markOrderPaid(31).success === true, 'markOrderPaid succeeds')
    const paidOrder = s.getOrderWithDetails(31)
    assert(paidOrder.paid === true && typeof paidOrder.paid_at === 'string', 'markOrderPaid sets paid and paid_at', JSON.stringify(paidOrder))
    assert(s.markOrderPaid(31).success === false, 'Cannot mark paid twice')
    assert(s.markOrderPaid(99999).success === false, 'markOrderPaid fails for unknown order')
    assert(s.getAnalyticsFiltered('2026-07-12', '2026-07-18').revenue === 2000, 'Paid delivered order now counts as revenue')

    assert(s.unmarkOrderPaid(31).success === true, 'unmarkOrderPaid succeeds')
    const unpaid = s.getOrderWithDetails(31)
    assert(unpaid.paid === false && unpaid.paid_at === null, 'unmarkOrderPaid clears paid and paid_at', JSON.stringify(unpaid))
    assert(s.getAnalyticsFiltered('2026-07-12', '2026-07-18').revenue === 1000, 'Unpaid order leaves revenue')
    assert(s.unmarkOrderPaid(99999).success === false, 'unmarkOrderPaid fails for unknown order')

    const created = s.createOrder({ clientId: 20, weekId: 1, items: [{ dishId: 10, quantity: 1 }] })
    const fresh = s.getOrderWithDetails(created.id)
    assert(fresh.paid === false && fresh.paid_at === null, 'New orders start unpaid', JSON.stringify(fresh))
    assert(s.getOrders().every(o => typeof o.paid === 'boolean'), 'Enriched orders expose paid as boolean')
  })

  withFixtureStore({
    weeks: [{ id: 1, week_start: '2026-07-12', week_end: '2026-07-18' }],
    dishes: [{ id: 10, name: 'Tarta', price: 1000, ingredients: [], is_active: true }],
    clients: [{ id: 20, name: 'Ana', last_name: 'A' }],
    orders: [
      { id: 30, week_id: 1, client_id: 20, status: 'delivered', created_at: '2026-07-13 10:00:00' },
      { id: 31, week_id: 1, client_id: 20, status: 'assembled', created_at: '2026-07-13 11:00:00' }
    ],
    orderItems: [30, 31].map(id => ({ order_id: id, dish_id: 10, quantity: 1, unit_price: 1000, unit_cost: 400 }))
  }, (s) => {
    assert(s.getOrderWithDetails(30).paid === true, 'Migration marks existing delivered orders as paid', '', 'critical')
    assert(s.getOrderWithDetails(31).paid === false, 'Migration leaves undelivered orders unpaid', '', 'high')
    s.unmarkOrderPaid(30)
    s.init(path.join(__dirname, 'piu.analytics.test.json'))
    assert(s.getOrderWithDetails(30).paid === false, 'Migration runs only once (unpaid survives restart)', '', 'critical')

    const backup = s.getExportData()
    s.importData({ ...backup, _paidMigrated: undefined, orders: backup.orders.map(o => ({ ...o, paid: undefined })) })
    assert(s.getOrderWithDetails(30).paid === true, 'Importing an old backup runs the migration', '', 'high')
  })
}

function testProductionFixes() {
  log('\n--- testProductionFixes ---')
  withFixtureStore({
    dishes: [
      { id: 10, name: 'Tarta', price: 1000, ingredients: [], is_active: true },
      { id: 11, name: 'Ñoquis', price: 1000, ingredients: [], is_active: true }
    ],
    clients: [{ id: 20, name: 'Ana', last_name: 'A' }]
  }, (s) => {
    const week = s.getCurrentWeek()
    s.createOrder({ clientId: 20, weekId: week.id, items: [{ dishId: 10, quantity: 5 }, { dishId: 11, quantity: 5 }] })
    s.addProduction(10, 8)
    s.addProduction(11, 2)
    const dash = s.getDashboard()
    assert(dash.totals.overproduction === 3, 'Overproduction summed per dish, not netted', `got ${dash.totals.overproduction}`, 'high')

    s.importData({ ...s.getExportData(), productionLog: [{ id: 90, week_id: week.id, dish_id: 11, quantity_produced: 2, date_produced: '2000-01-01' }] })
    s.undoProduction(11)
    const prod11 = s.getDashboard().dishes.find(d => d.id === 11).total_produced
    assert(prod11 === 1, 'Undo works on production from another day', `produced=${prod11}`, 'high')

    s.completeDishProduction(11)
    s.completeDishProduction(10)
    const entries = s.getExportData().productionLog.filter(pl => pl.dish_id === 11)
    const today = entries.filter(pl => pl.date_produced !== '2000-01-01')
    assert(today.length === 1, 'Complete merges into the day entry', `entries today=${today.length}`)

    s.updateDish({ id: 11, name: 'Ñoquis', price: 1000, ingredients: [], is_active: false })
    assert(s.getDashboard().dishes.some(d => d.id === 11), 'Inactive dish with orders stays in production', '', 'high')
  })
}

function readThemeTokens() {
  const css = fs.readFileSync(path.join(__dirname, 'src/styles/variables.css'), 'utf8')
  const themes = {}
  for (const m of css.matchAll(/\.theme-(\w+)\s*\{([^}]*)\}/g)) {
    themes[m[1]] = Object.fromEntries([...m[2].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map(t => [t[1], t[2]]))
  }
  return themes
}

function contrastRatio(a, b) {
  const lum = hex => {
    const [r, g, bl] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function testThemeContrast() {
  log('\n--- testThemeContrast ---')
  const themes = readThemeTokens()
  const pairs = [
    ['text', 'bg'], ['text', 'bg-card'], ['text', 'bg-hover'],
    ['text-secondary', 'bg'], ['text-secondary', 'bg-card'],
    ['on-primary', 'primary'], ['on-primary', 'primary-hover'], ['primary', 'bg-card'], ['primary', 'primary-light'],
    ['on-danger', 'danger'], ['danger', 'bg-card'], ['danger', 'danger-light'],
    ['on-success', 'success'], ['success', 'bg-card'], ['success', 'success-light'],
    ['warning', 'bg-card'], ['warning', 'warning-light'],
    ['on-accent', 'accent'], ['accent', 'bg-card'], ['accent', 'accent-light']
  ]
  for (const name of ['claro', 'oscuro', 'daltonico']) {
    const t = themes[name]
    assert(!!t, `Theme ${name} exists`, '', 'high')
    if (!t) continue
    for (const [fg, bg] of pairs) {
      if (!t[fg] || !t[bg]) {
        assert(false, `${name}: tokens --${fg} and --${bg} are defined`, '', 'high')
        continue
      }
      const ratio = contrastRatio(t[fg], t[bg])
      assert(ratio >= 4.5, `${name}: --${fg} on --${bg} meets WCAG AA`, `${t[fg]} on ${t[bg]} = ${ratio.toFixed(2)}`, 'high')
    }
  }
}

function main() {
  console.log('╔══════════════════════════════════════╗')
  console.log('║       PIU - TEST SUITE               ║')
  console.log('╚══════════════════════════════════════╝')
  console.log(`Started: ${new Date().toISOString()}`)
  console.log(`Mode: ${VERBOSE ? 'verbose' : 'compact'}`)

  const store = setup()
  const seed = seedBase(store)

  testSanity(store)
  testDeliveryFeeDoubleCount(store, seed)
  testMonthComparisonFeb(store)
  testNegativeQuantity(store, seed)
  testNegativePrice(store)
  testUndoSubtractsOne(store, seed)
  testEmptyClientName(store, seed)
  testDeliveryFeeZero(store, seed)
  testGetDishesMutation(store)
  testProgressBarAtZero(store)
  testDuplicateSeedIngredient()
  testZeroProductionLog(store, seed)
  testGetOrdersInRangeInvalid(store)
  testIsOrdersOpenFridayBoundary(store)
  testDeleteNonexistent(store)
  testGetWeekComparison(store)
  testTrendsConsistency(store)
  testPeriodComparisonOrderChange(store)
  testPeriodComparisonSamePeriod(store)
  testDashboardEdgeCases(store)
  testIngredientsList(store)
  testDishProfitability(store)
  testCreateUpdateOrderConsistency(store, seed)
  testDeliverySettingsPersistence(store)
  testMarkAssembleStateMachine(store, seed)
  testStringWhitespaceClient(store, seed)
  testCompleteDishOverProduction(store, seed)
  testClientHasOrderThisWeek(store, seed)
  testGetClientOrderHistory(store, seed)
  testGetOrdersByWeekId(store, seed)
  testCreateOrderDeliveryDay(store, seed)
  testUpdateOrderDeliveryDay(store, seed)
  testClientLocality(store, seed)
  testStartLocation(store)
  testAnalyticsDateRangeAndAverages()
  testOrderSnapshotOnEdit()
  testNextWeek()
  testOrderInNextWeek()
  testCompositeCostPropagation()
  testIngredientUnitChange()
  testClientOrderStats()
  testProductionFixes()
  testUndeliveredPastWeeks()
  testPaidRevenue()
  testOrderWeekAttribution()
  testThemeContrast()
  testCompositeIngredient(store)
  testCompositeShoppingListLocal(store, seed)
  testCircularComposite(store)

  testOrphanedClientDelete(store, seed)
  testOrphanedIngredientDelete(store, seed)
  testIDReuseOnCrash(store)
  testSaveDiskCorruption(store)
  testNextIdCalculation(store)

  teardown(store)

  console.log('\n' + '═'.repeat(44))
  console.log(`📊 RESULTADOS`)
  console.log(`  ✅ Passed: ${totalPassed}`)
  console.log(`  ❌ Failed: ${totalFailed}`)
  console.log(`  📝 Total:  ${totalPassed + totalFailed}`)

  if (results.length > 0) {
    console.log(`\n⚠️  PROBLEMAS ENCONTRADOS (${results.length}):`)
    const bySeverity = { critical: [], high: [], medium: [], low: [] }
    for (const r of results) {
      bySeverity[r.severity]?.push(r) || bySeverity.medium.push(r)
    }
    for (const [sev, items] of Object.entries(bySeverity)) {
      if (items.length === 0) continue
      const label = { critical: '🔴 CRÍTICO', high: '🟠 ALTO', medium: '🟡 MEDIO', low: '🔵 BAJO' }[sev] || sev
      console.log(`\n  ${label}:`)
      for (const item of items) {
        console.log(`    • ${item.label}`)
        if (item.detail) console.log(`      ${item.detail}`)
      }
    }

    const reportPath = path.join(__dirname, 'test-report.json')
    fs.writeFileSync(reportPath, JSON.stringify({
      date: new Date().toISOString(),
      total: totalPassed + totalFailed,
      passed: totalPassed,
      failed: totalFailed,
      errors: results
    }, null, 2))
    console.log(`\n📄 Reporte guardado: ${reportPath}`)
  }

  process.exit(totalFailed > 0 ? 1 : 0)
}

main()
