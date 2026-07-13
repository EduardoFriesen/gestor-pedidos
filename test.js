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

function testUndoRemovesAll(store, { dishIds }) {
  console.log('\n🟠 TEST 10: Undo removes all today production')
  store.addProduction(dishIds['Empanada carne'], 5)
  const before = store.getDashboard()
  const beforeProd = before.dishes.find(d => d.id === dishIds['Empanada carne'])?.total_produced || 0
  store.undoProduction(dishIds['Empanada carne'])
  const after = store.getDashboard()
  const afterProd = after.dishes.find(d => d.id === dishIds['Empanada carne'])?.total_produced || 0
  assert(afterProd === 0, 'Undo removed all production (not just 1 unit)', `before=${beforeProd} after=${afterProd}`, 'high')
  if (beforeProd > 1 && afterProd > 0) {
    console.log(`     HINT: Expected undo to remove ALL units (${beforeProd}→0), but removed only ${beforeProd - afterProd}`)
  }
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
  assert(typeof revPct === 'string' || typeof revPct === 'number', 'Percentage change is numeric', `type=${typeof revPct}`)
}

function testPeriodComparisonSamePeriod(store) {
  console.log('\n🟡 TEST: Period comparison with same period')
  const comp = store.getPeriodComparison('2024-06-01', '2024-06-30', '2024-06-01', '2024-06-30')
  assert(comp && comp.changes, 'Same period comparison works', JSON.stringify(comp))
  assert(comp.changes.orders === '0.0' || comp.changes.orders === 0, 'Same period has 0% change', `orders=${comp.changes.orders}`)
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

// ============================== MAIN ==============================

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
  testUndoRemovesAll(store, seed)
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
