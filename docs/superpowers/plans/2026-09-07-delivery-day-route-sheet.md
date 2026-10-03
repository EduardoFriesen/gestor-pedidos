# Delivery Day + Hoja de Ruta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a delivery day selector to the order form and generate a PDF route sheet that groups deliveries by day, orders by geographic proximity, and shows a map with the route.

**Architecture:** New `delivery_day` field on orders (string: 'lunes'...'domingo'). New `startAddress` in delivery settings. New `src/utils/geocode.js` for Nominatim geocoding + Haversine distance. New `src/components/RouteMap.jsx` for Leaflet map capture. New `generarHojaRuta()` in pdf.js. UI changes in Orders.jsx: day select in form, "Hoja de Ruta" button in header, start address prompt modal.

**Tech Stack:** jsPDF (existing), Leaflet (new), html2canvas (new), Nominatim API (free, no key).

## Global Constraints

- 99 tests must pass after each task (`node test.js`)
- Build must succeed after each task (`npm run build:vite`)
- Follow existing code patterns (no new frameworks, no comments)
- Spanish UI labels throughout
- Version stays at 1.1.3 until final release
- Do not commit unless explicitly asked

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `package.json` | Modify | Add leaflet, html2canvas dependencies |
| `electron/store.js` | Modify | Add `delivery_day` to createOrder/updateOrder/enrichOrder, add `startAddress` getters/setters, export new functions |
| `electron/main.js` | Modify | Add IPC handlers for startAddress |
| `electron/preload.js` | Modify | Expose startAddress getter/setter |
| `src/utils/geocode.js` | Create | geocodeAddress, getDistance, buildRoute |
| `src/components/RouteMap.jsx` | Create | Leaflet map with markers + polyline for capture |
| `src/utils/pdf.js` | Modify | Add generarHojaRuta function |
| `src/pages/Orders.jsx` | Modify | Day select in form, Hoja de Ruta button, start address prompt, route handler |
| `test.js` | Modify | Tests for delivery_day, startAddress, geocode utils |
| `test-e2e/mock.js` | Modify | Mocks for delivery_day, startAddress, geocode |

---

### Task 1: Install leaflet + html2canvas

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: none
- Produces: leaflet and html2canvas available for import

- [ ] **Step 1: Install dependencies**

```bash
cd /home/edu/proyectos/gestor-pedidos && npm install leaflet html2canvas
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('leaflet'); require('html2canvas'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Verify build still works**

```bash
npm run build:vite
```

Expected: builds successfully

---

### Task 2: Data model — delivery_day in store.js

**Files:**
- Modify: `electron/store.js:245-275` (createOrder)
- Modify: `electron/store.js:277-299` (updateOrder)
- Modify: `electron/store.js:205-233` (enrichOrder)
- Modify: `electron/store.js:1401-1409` (deliverySettings area)
- Modify: `electron/store.js:1565-1606` (exports)

**Interfaces:**
- Consumes: none
- Produces: `createOrder` accepts `delivery_day`, `updateOrder` accepts `delivery_day`, `enrichOrder` passes `delivery_day`, new `getStartAddress()` / `setStartAddress(addr)` functions

- [ ] **Step 1: Add delivery_day to createOrder (line 245)**

Change the function signature and the order record:

```js
function createOrder({ clientId, weekId, items, notes, has_delivery, delivery_fee, delivery_day }) {
```

And in the order object (line 251-260), add after `delivery_fee`:

```js
    delivery_day: has_delivery ? (delivery_day || 'viernes') : null,
```

- [ ] **Step 2: Add delivery_day to updateOrder (line 277)**

Change the function signature:

```js
function updateOrder({ id, clientId, items, notes, has_delivery, delivery_fee, delivery_day }) {
```

And after line 284 (`order.delivery_fee = Number(delivery_fee) || 0`), add:

```js
  order.delivery_day = has_delivery ? (delivery_day || 'viernes') : null
```

- [ ] **Step 3: Pass delivery_day through enrichOrder (line 222)**

In the return object of `enrichOrder`, the spread `...o` already passes `delivery_day` through since it's on the order record. No change needed here — verify by checking that `...o` at line 222 includes `delivery_day`.

- [ ] **Step 4: Add startAddress getters/setters (after line 1409)**

After `setDefaultDeliveryFee`, add:

```js
function getStartAddress() {
  return data.deliverySettings?.startAddress || ''
}

function setStartAddress(addr) {
  if (!data.deliverySettings) data.deliverySettings = {}
  data.deliverySettings.startAddress = addr || ''
  save()
}
```

- [ ] **Step 5: Export new functions (line 1565-1606)**

Add `getStartAddress` and `setStartAddress` to the exports object:

```js
  getDefaultDeliveryFee,
  setDefaultDeliveryFee,
  getStartAddress,
  setStartAddress,
```

- [ ] **Step 6: Run tests**

```bash
node test.js
```

Expected: 99 passed (delivery_day is backward-compatible — existing orders without it just get `undefined` which is fine)

---

### Task 3: IPC handlers + preload for startAddress

**Files:**
- Modify: `electron/main.js:64-65` (after setDefaultDeliveryFee handler)
- Modify: `electron/preload.js:58-59` (after setDefaultDeliveryFee exposure)

**Interfaces:**
- Consumes: `store.getStartAddress()`, `store.setStartAddress(addr)` from Task 2
- Produces: `window.piu.getStartAddress()`, `window.piu.setStartAddress(addr)` available in renderer

- [ ] **Step 1: Add IPC handlers in main.js (after line 65)**

```js
  ipcMain.handle('piu:getStartAddress', () => store.getStartAddress())
  ipcMain.handle('piu:setStartAddress', (_, { addr }) => store.setStartAddress(addr))
```

- [ ] **Step 2: Expose in preload.js (after line 59)**

```js
  getStartAddress: () => ipcRenderer.invoke('piu:getStartAddress'),
  setStartAddress: (addr) => ipcRenderer.invoke('piu:setStartAddress', { addr }),
```

- [ ] **Step 3: Run tests**

```bash
node test.js
```

Expected: 99 passed

---

### Task 4: Unit tests for delivery_day + startAddress

**Files:**
- Modify: `test.js` (add tests near existing createOrder/updateOrder tests)

**Interfaces:**
- Consumes: store.js with delivery_day and startAddress from Tasks 2-3
- Produces: passing tests

- [ ] **Step 1: Add test for createOrder with delivery_day**

Find the existing `testCreateOrder` function in test.js. After the existing assertions, add a new test function:

```js
function testCreateOrderDeliveryDay() {
  log('\n--- testCreateOrderDeliveryDay ---')
  const store = setup()

  const week = store.getCurrentWeek()
  const client = store.createClient({ name: 'Test', last_name: 'Client', phone: '111', address: 'Calle 123' })

  const r1 = store.createOrder({
    clientId: client.id, weekId: week.id,
    items: [{ dishId: 1, quantity: 1 }],
    has_delivery: true, delivery_fee: 500, delivery_day: 'sabado'
  })
  assert(r1.success, 'order created with delivery_day=sabado')

  const orders = store.getOrdersByWeekId(week.id)
  const order = orders.find(o => o.id === r1.id)
  assert(order?.delivery_day === 'sabado', 'delivery_day stored as sabado', `got: ${order?.delivery_day}`)

  const r2 = store.createOrder({
    clientId: client.id, weekId: week.id,
    items: [{ dishId: 2, quantity: 1 }],
    has_delivery: true, delivery_fee: 300
  })
  assert(r2.success, 'order created without delivery_day (default viernes)')

  const orders2 = store.getOrdersByWeekId(week.id)
  const order2 = orders2.find(o => o.id === r2.id)
  assert(order2?.delivery_day === 'viernes', 'default delivery_day is viernes', `got: ${order2?.delivery_day}`)

  const r3 = store.createOrder({
    clientId: client.id, weekId: week.id,
    items: [{ dishId: 3, quantity: 1 }],
    has_delivery: false
  })
  assert(r3.success, 'order created without delivery')

  const orders3 = store.getOrdersByWeekId(week.id)
  const order3 = orders3.find(o => o.id === r3.id)
  assert(order3?.delivery_day === null, 'delivery_day is null when no delivery', `got: ${order3?.delivery_day}`)

  teardown(store)
}
```

- [ ] **Step 2: Add test for updateOrder with delivery_day**

```js
function testUpdateOrderDeliveryDay() {
  log('\n--- testUpdateOrderDeliveryDay ---')
  const store = setup()

  const week = store.getCurrentWeek()
  const client = store.createClient({ name: 'Test', last_name: 'Client', phone: '111', address: 'Calle 123' })

  const r1 = store.createOrder({
    clientId: client.id, weekId: week.id,
    items: [{ dishId: 1, quantity: 1 }],
    has_delivery: true, delivery_fee: 500, delivery_day: 'lunes'
  })

  store.updateOrder({
    id: r1.id, clientId: client.id,
    items: [{ dishId: 1, quantity: 2 }],
    has_delivery: true, delivery_fee: 700, delivery_day: 'domingo'
  })

  const orders = store.getOrdersByWeekId(week.id)
  const order = orders.find(o => o.id === r1.id)
  assert(order?.delivery_day === 'domingo', 'delivery_day updated to domingo', `got: ${order?.delivery_day}`)
  assert(order?.delivery_fee === 700, 'delivery_fee updated to 700', `got: ${order?.delivery_fee}`)

  store.updateOrder({
    id: r1.id, clientId: client.id,
    items: [{ dishId: 1, quantity: 1 }],
    has_delivery: false, delivery_fee: 0
  })

  const orders2 = store.getOrdersByWeekId(week.id)
  const order2 = orders2.find(o => o.id === r1.id)
  assert(order2?.delivery_day === null, 'delivery_day cleared when delivery removed', `got: ${order2?.delivery_day}`)

  teardown(store)
}
```

- [ ] **Step 3: Add test for startAddress**

```js
function testStartAddress() {
  log('\n--- testStartAddress ---')
  const store = setup()

  const empty = store.getStartAddress()
  assert(empty === '', 'default startAddress is empty string', `got: ${empty}`)

  store.setStartAddress('Av. Corrientes 1234, CABA')
  const saved = store.getStartAddress()
  assert(saved === 'Av. Corrientes 1234, CABA', 'startAddress saved correctly', `got: ${saved}`)

  store.setStartAddress('')
  const cleared = store.getStartAddress()
  assert(cleared === '', 'startAddress cleared to empty', `got: ${cleared}`)

  teardown(store)
}
```

- [ ] **Step 4: Register tests in the test runner**

Find the test runner section at the bottom of test.js (look for the array of test functions or the section that calls them). Add the three new test calls:

```js
testCreateOrderDeliveryDay()
testUpdateOrderDeliveryDay()
testStartAddress()
```

- [ ] **Step 5: Run tests**

```bash
node test.js
```

Expected: 108+ passed (99 existing + 9 new assertions approximately)

---

### Task 5: Mock updates for delivery_day + startAddress

**Files:**
- Modify: `test-e2e/mock.js:62-69` (ORDERS data)
- Modify: `test-e2e/mock.js:102-126` (enrichMockOrder)
- Modify: `test-e2e/mock.js:313-333` (createOrder mock)
- Modify: `test-e2e/mock.js:335-355` (updateOrder mock)
- Modify: `test-e2e/mock.js:446-447` (deliverySettings area)

**Interfaces:**
- Consumes: delivery_day field on orders
- Produces: mock orders with delivery_day, mock startAddress functions

- [ ] **Step 1: Add delivery_day to ORDERS test data**

In the ORDERS array (lines 62-69), add `delivery_day` to orders that have `has_delivery: true`:

Order id 2 (has_delivery: true): add `delivery_day: 'viernes'`
Order id 4 (has_delivery: true): add `delivery_day: 'sabado'`

- [ ] **Step 2: Update enrichMockOrder (line 116-125)**

Add `delivery_day: o.delivery_day || null` to the return object:

```js
    return {
      ...o,
      has_delivery: !!o.has_delivery,
      delivery_fee: deliveryFee,
      delivery_day: o.delivery_day || null,
      client_name: client ? `${client.name} ${client.last_name}`.trim() : '—',
      client_phone: client?.phone || '',
      items,
      items_total: itemsTotal,
      total: o.has_delivery ? itemsTotal + deliveryFee : itemsTotal
    }
```

- [ ] **Step 3: Update createOrder mock (line 313-333)**

Add `delivery_day` to the order object:

```js
    createOrder(data) {
      const id = genId()
      const order = {
        id, week_id: currentWeekId, status: 'pending',
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
```

- [ ] **Step 4: Update updateOrder mock (line 335-355)**

Add `delivery_day` to the updated order:

```js
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
```

- [ ] **Step 5: Add startAddress mock functions (after line 447)**

```js
    getStartAddress() { return Promise.resolve(DATA.deliverySettings?.startAddress || '') },
    setStartAddress(addr) { if (!DATA.deliverySettings) DATA.deliverySettings = {}; DATA.deliverySettings.startAddress = addr; return Promise.resolve({ success: true }) },
```

Also add `deliverySettings: { defaultFee: 500, startAddress: '' }` to the DATA object (line 82-92).

- [ ] **Step 6: Run tests**

```bash
node test.js
```

Expected: all tests pass

---

### Task 6: Order form — delivery day select

**Files:**
- Modify: `src/pages/Orders.jsx:26` (form state)
- Modify: `src/pages/Orders.jsx:142,153,228` (form resets)
- Modify: `src/pages/Orders.jsx:157-167` (openEdit)
- Modify: `src/pages/Orders.jsx:193-213` (handleSave)
- Modify: `src/pages/Orders.jsx:800-845` (delivery form section)

**Interfaces:**
- Consumes: `window.piu.getStartAddress()` from Task 3
- Produces: form state includes `delivery_day`, UI shows day select, save includes delivery_day

- [ ] **Step 1: Add delivery_day to form initial state (line 26)**

Change line 26:

```js
  const [form, setForm] = useState({ clientId: '', notes: '', items: [{ _key: ++itemKeyRef.current, dishId: '', quantity: 1 }], has_delivery: false, delivery_fee: 500, delivery_day: 'viernes' })
```

- [ ] **Step 2: Update form resets to include delivery_day**

Line 142 — change to:
```js
      setForm({ clientId: '', notes: '', items: [makeItem()], has_delivery: false, delivery_fee: defaultDeliveryFee, delivery_day: 'viernes' })
```

Line 153 — change to:
```js
    setForm({ clientId: '', notes: '', items: [makeItem()], has_delivery: false, delivery_fee: defaultDeliveryFee, delivery_day: 'viernes', targetWeek: choice })
```

Line 228 — change to:
```js
    setForm({ clientId: '', notes: '', items: [makeItem()], has_delivery: false, delivery_fee: defaultDeliveryFee, delivery_day: 'viernes' })
```

- [ ] **Step 3: Update openEdit to load delivery_day (line 157-167)**

Change the setForm call in openEdit to include delivery_day:

```js
  const openEdit = (order) => {
    setEditing(order)
    setForm({
      clientId: order.client_id,
      notes: order.notes || '',
      items: order.items?.map(i => ({ _key: ++itemKeyRef.current, dishId: i.dish_id, quantity: i.quantity })) || [makeItem()],
      has_delivery: !!order.has_delivery,
      delivery_fee: order.delivery_fee || defaultDeliveryFee,
      delivery_day: order.delivery_day || 'viernes'
    })
    setShowModal(true)
  }
```

- [ ] **Step 4: Update handleSave to include delivery_day (line 193-213)**

In the data object construction (line 196-203), add delivery_day:

```js
    const data = {
      clientId: parseInt(form.clientId),
      weekId: week.id,
      items: form.items.filter(i => i.dishId).map(i => ({ dishId: parseInt(i.dishId), quantity: parseFloat(i.quantity) || 1 })),
      notes: form.notes,
      has_delivery: form.has_delivery,
      delivery_fee: Number(form.delivery_fee) || 0,
      delivery_day: form.has_delivery ? form.delivery_day : null
    }
```

- [ ] **Step 5: Add day select UI in the form (after line 844, inside the has_delivery conditional)**

After the delivery fee input block (line 843, before the closing `</div>` of the form-group), add the day select:

```jsx
            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-xs)', alignItems: 'center' }}>
              <label style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                Día de envío
              </label>
              <select
                value={form.delivery_day}
                onChange={e => setForm(f => ({ ...f, delivery_day: e.target.value }))}
                style={{ fontSize: 'var(--font-body)' }}
              >
                <option value="lunes">Lunes</option>
                <option value="martes">Martes</option>
                <option value="miercoles">Miércoles</option>
                <option value="jueves">Jueves</option>
                <option value="viernes">Viernes</option>
                <option value="sabado">Sábado</option>
                <option value="domingo">Domingo</option>
              </select>
            </div>
```

- [ ] **Step 6: Run tests + build**

```bash
node test.js && npm run build:vite
```

Expected: tests pass, build succeeds

---

### Task 7: Geocoding utility

**Files:**
- Create: `src/utils/geocode.js`

**Interfaces:**
- Consumes: none (uses Nominatim HTTP API)
- Produces: `geocodeAddress(address)`, `getDistance(lat1, lng1, lat2, lng2)`, `buildRoute(startAddress, orders)`

- [ ] **Step 1: Create src/utils/geocode.js**

```js
const DAY_ORDER = { lunes: 0, martes: 1, miercoles: 2, jueves: 3, viernes: 4, sabado: 5, domingo: 6 }

export async function geocodeAddress(address) {
  if (!address || !address.trim()) return null
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
    const res = await fetch(url, { headers: { 'User-Agent': 'PiuApp/1.1' } })
    if (!res.ok) return null
    const data = await res.json()
    if (!data || data.length === 0) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

export function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

export async function buildRoute(startAddress, orders) {
  const startCoords = await geocodeAddress(startAddress)
  const results = []

  for (const order of orders) {
    const addr = order.client_address || order.address || ''
    const coords = addr ? await geocodeAddress(addr) : null
    if (coords && startCoords) {
      order._distance = getDistance(startCoords.lat, startCoords.lng, coords.lat, coords.lng)
      order._coords = coords
    } else {
      order._distance = Infinity
      order._coords = null
    }
    results.push(order)
    await delay(1100)
  }

  const grouped = {}
  for (const order of results) {
    const day = order.delivery_day || 'viernes'
    if (!grouped[day]) grouped[day] = []
    grouped[day].push(order)
  }

  const sorted = {}
  for (const [day, dayOrders] of Object.entries(grouped)) {
    sorted[day] = dayOrders.sort((a, b) => a._distance - b._distance)
  }

  return sorted
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build:vite
```

Expected: builds successfully

---

### Task 8: Start address prompt + Hoja de Ruta button

**Files:**
- Modify: `src/pages/Orders.jsx` (imports, state, handler, button, modal)

**Interfaces:**
- Consumes: `buildRoute` from Task 7, `generarHojaRuta` from Task 9 (will be created next, stub for now), `window.piu.getStartAddress()` / `window.piu.setStartAddress()` from Task 3
- Produces: "Hoja de Ruta" button triggers route generation flow

- [ ] **Step 1: Add imports at top of Orders.jsx**

After line 5 (`import { generarEtiquetasDelivery } from '../utils/pdf'`), add:

```js
import { buildRoute } from '../utils/geocode'
```

- [ ] **Step 2: Add state variables**

After line 35 (`const [orderSearch, setOrderSearch] = useState('')`), add:

```js
  const [showStartAddressPrompt, setShowStartAddressPrompt] = useState(false)
  const [startAddressInput, setStartAddressInput] = useState('')
  const [routeLoading, setRouteLoading] = useState(false)
```

- [ ] **Step 3: Add the Hoja de Ruta button in the header**

After line 466 (`</button>` for Etiquetas), add:

```jsx
          <button className="btn btn-outline btn-sm" onClick={handlePrintRoute} disabled={isHistorical || routeLoading}>
            {routeLoading ? 'Generando...' : 'Hoja de Ruta'}
          </button>
```

- [ ] **Step 4: Add handlePrintRoute handler**

After `handlePrintLabelsView` (after line 330), add:

```js
  const handlePrintRoute = async () => {
    try {
      const savedAddr = await window.piu?.getStartAddress()
      if (!savedAddr) {
        setStartAddressInput('')
        setShowStartAddressPrompt(true)
        return
      }
      await generateRoutePdf(savedAddr)
    } catch (e) {
      setError('No se pudo generar la hoja de ruta.')
    }
  }

  const generateRoutePdf = async (startAddr) => {
    setRouteLoading(true)
    try {
      const weekData = await window.piu?.getCurrentWeek()
      if (!weekData) return
      const allOrders = await window.piu?.getOrdersByWeekId(weekData.id)
      if (!allOrders || allOrders.length === 0) {
        showToast('No hay pedidos para esta semana.', 'info')
        return
      }
      const deliveryOrders = allOrders.filter(o => o.has_delivery)
      if (deliveryOrders.length === 0) {
        showToast('No hay pedidos con envío.', 'info')
        return
      }
      const route = await buildRoute(startAddr, deliveryOrders)
      const { generarHojaRuta } = await import('../utils/pdf')
      const doc = generarHojaRuta(route, startAddr, weekData)
      setPdfPreview(doc)
    } catch (e) {
      setError('No se pudo generar la hoja de ruta.')
    } finally {
      setRouteLoading(false)
    }
  }
```

- [ ] **Step 5: Add start address prompt handler**

After `generateRoutePdf`, add:

```js
  const handleStartAddressSubmit = async () => {
    if (!startAddressInput.trim()) return
    await window.piu?.setStartAddress(startAddressInput.trim())
    setShowStartAddressPrompt(false)
    await generateRoutePdf(startAddressInput.trim())
  }
```

- [ ] **Step 6: Add the start address prompt modal**

Before the closing `</div>` of the component (before line 967), after the PdfViewer block, add:

```jsx
      {showStartAddressPrompt && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowStartAddressPrompt(false) }}>
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Dirección de partida</h2>
            </div>
            <p style={{ marginBottom: 'var(--spacing-lg)', fontSize: 'var(--font-body)' }}>
              Ingresá la dirección de partida para armar la hoja de ruta (ej: "Av. Corrientes 1234, CABA").
            </p>
            <input
              type="text"
              value={startAddressInput}
              onChange={e => setStartAddressInput(e.target.value)}
              placeholder="Dirección de partida..."
              style={{ width: '100%', marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-body)' }}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleStartAddressSubmit() }}
            />
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowStartAddressPrompt(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleStartAddressSubmit} disabled={!startAddressInput.trim()}>Generar</button>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 7: Run tests + build**

```bash
node test.js && npm run build:vite
```

Expected: tests pass, build succeeds

---

### Task 9: Route map component

**Files:**
- Create: `src/components/RouteMap.jsx`

**Interfaces:**
- Consumes: leaflet (installed in Task 1), coords arrays from buildRoute
- Produces: React component that renders a Leaflet map and exposes a capture function

- [ ] **Step 1: Create src/components/RouteMap.jsx**

```jsx
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const RouteMap = forwardRef(function RouteMap({ startCoords, deliveryCoords, onReady }, ref) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)

  useImperativeHandle(ref, () => ({
    getContainer: () => mapInstance.current?.getContainer() || null
  }))

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return
    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: true })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map)
    mapInstance.current = map

    if (startCoords) {
      const greenIcon = L.divIcon({
        className: '',
        html: '<div style="width:14px;height:14px;background:#16a34a;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      })
      L.marker([startCoords.lat, startCoords.lng], { icon: greenIcon })
        .addTo(map)
        .bindPopup('Partida')
    }

    const validCoords = (deliveryCoords || []).filter(c => c)
    validCoords.forEach((c, i) => {
      const numIcon = L.divIcon({
        className: '',
        html: `<div style="width:18px;height:18px;background:#dc2626;color:#fff;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;box-shadow:0 1px 3px rgba(0,0,0,0.3)">${i + 1}</div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      })
      L.marker([c.lat, c.lng], { icon: numIcon }).addTo(map)
    })

    if (startCoords && validCoords.length > 0) {
      const points = [[startCoords.lat, startCoords.lng], ...validCoords.map(c => [c.lat, c.lng])]
      L.polyline(points, { color: '#2563eb', weight: 3, opacity: 0.8, dashArray: '6 4' }).addTo(map)
    }

    const allPoints = []
    if (startCoords) allPoints.push([startCoords.lat, startCoords.lng])
    validCoords.forEach(c => allPoints.push([c.lat, c.lng]))

    if (allPoints.length > 0) {
      map.fitBounds(allPoints, { padding: [30, 30] })
    }

    setTimeout(() => {
      map.invalidateSize()
      if (onReady) onReady()
    }, 300)

    return () => { map.remove(); mapInstance.current = null }
  }, [startCoords, deliveryCoords])

  return (
    <div
      ref={mapRef}
      style={{ width: '100%', height: '300px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
    />
  )
})

export default RouteMap
```

- [ ] **Step 2: Verify build**

```bash
npm run build:vite
```

Expected: builds successfully

---

### Task 10: PDF hoja de ruta function

**Files:**
- Modify: `src/utils/pdf.js` (add generarHojaRuta after existing functions)

**Interfaces:**
- Consumes: route object (sorted by day, then distance), startAddress string, weekData object
- Produces: jsPDF document with tables per day + optional map image

- [ ] **Step 1: Add generarHojaRuta to pdf.js**

After the existing `generarListaCompras` function (after line 242), add:

```js
const DAY_LABELS = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' }
const DAY_ORDER = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']

export function generarHojaRuta(route, startAddress, weekData, mapImage) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = 210
  const margin = 15
  const colN = 10
  const colName = 45
  const colAddr = 85
  const colAmt = 30
  const rowH = 8
  const headerH = 10

  let y = margin

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('PIU - Hoja de Ruta', margin, y)
  y += 8

  if (weekData?.week_start) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`${weekData.week_start} - ${weekData.week_end}`, margin, y)
    y += 6
  }

  if (startAddress) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Partida: ${startAddress}`, margin, y)
    y += 8
  }

  const days = DAY_ORDER.filter(d => route[d] && route[d].length > 0)

  for (const day of days) {
    const dayOrders = route[day]

    if (y + rowH * (dayOrders.length + 1) + 20 > 297 - margin) {
      doc.addPage()
      y = margin
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(DAY_LABELS[day] || day, margin, y)
    y += 8

    doc.setDrawColor(180)
    doc.setLineWidth(0.3)
    doc.setFillColor(240, 240, 240)
    doc.rect(margin, y, pageWidth - margin * 2, headerH, 'F')
    doc.setLineWidth(0.2)
    doc.line(margin, y, pageWidth - margin, y)
    doc.line(margin, y + headerH, pageWidth - margin, y + headerH)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    let cx = margin + 2
    doc.text('#', cx, y + 6.5); cx += colN
    doc.text('Nombre', cx, y + 6.5); cx += colName
    doc.text('Dirección', cx, y + 6.5); cx += colAddr
    doc.text('Monto', cx, y + 6.5)

    y += headerH

    dayOrders.forEach((order, i) => {
      if (y + rowH > 297 - margin) {
        doc.addPage()
        y = margin
      }

      doc.setLineWidth(0.1)
      doc.setDrawColor(220)
      doc.line(margin, y, pageWidth - margin, y)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      cx = margin + 2
      doc.text(String(i + 1), cx, y + 5.5); cx += colN
      const name = (order.client_name || '—').slice(0, 22)
      doc.text(name, cx, y + 5.5); cx += colName
      const addr = (order.client_address || order.address || '—').slice(0, 35)
      doc.text(addr, cx, y + 5.5); cx += colAddr
      doc.text('$' + (order.total || 0).toLocaleString('es-AR'), cx, y + 5.5)

      y += rowH
    })

    doc.setDrawColor(180)
    doc.setLineWidth(0.2)
    doc.line(margin, y, pageWidth - margin, y)
    y += 6
  }

  if (mapImage) {
    if (y + 110 > 297 - margin) {
      doc.addPage()
      y = margin
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('Mapa de ruta', margin, y)
    y += 5
    const imgW = pageWidth - margin * 2
    const imgH = 90
    doc.addImage(mapImage, 'PNG', margin, y, imgW, imgH)
  }

  return doc
}
```

- [ ] **Step 2: Run tests + build**

```bash
node test.js && npm run build:vite
```

Expected: tests pass, build succeeds

---

### Task 11: Wire map capture into route handler

**Files:**
- Modify: `src/pages/Orders.jsx` (update generateRoutePdf to use RouteMap + html2canvas)

**Interfaces:**
- Consumes: RouteMap from Task 9, html2canvas, generarHojaRuta from Task 10
- Produces: full route PDF with map image

- [ ] **Step 1: Add imports**

Add to the top of Orders.jsx (after the geocode import):

```js
import html2canvas from 'html2canvas'
import RouteMap from '../components/RouteMap'
import React, { useRef, useState as useStateRef } from 'react'
```

Wait — React is already imported on line 1. Just add `useRef` to the existing import if not already there, and add the other imports:

After line 5 (`import { generarEtiquetasDelivery } from '../utils/pdf'`), these are already added from Task 8:
```js
import { buildRoute } from '../utils/geocode'
```

Add after the geocode import:
```js
import html2canvas from 'html2canvas'
import RouteMap from '../components/RouteMap'
```

Also add `useRef` to the React import on line 1 if not already present (it IS already there on line 1: `useRef`).

- [ ] **Step 2: Add routeMapRef state**

After the route-related state variables (from Task 8), add:

```js
  const routeMapRef = useRef(null)
  const [routeMapReady, setRouteMapReady] = useState(false)
  const [pendingRouteData, setPendingRouteData] = useState(null)
```

- [ ] **Step 3: Update generateRoutePdf to render map first**

Replace the `generateRoutePdf` function with:

```js
  const generateRoutePdf = async (startAddr) => {
    setRouteLoading(true)
    try {
      const weekData = await window.piu?.getCurrentWeek()
      if (!weekData) return
      const allOrders = await window.piu?.getOrdersByWeekId(weekData.id)
      if (!allOrders || allOrders.length === 0) {
        showToast('No hay pedidos para esta semana.', 'info')
        return
      }
      const deliveryOrders = allOrders.filter(o => o.has_delivery)
      if (deliveryOrders.length === 0) {
        showToast('No hay pedidos con envío.', 'info')
        return
      }
      const route = await buildRoute(startAddr, deliveryOrders)
      setPendingRouteData({ route, startAddr, weekData })
      setRouteMapReady(false)
    } catch (e) {
      setError('No se pudo generar la hoja de ruta.')
      setRouteLoading(false)
    }
  }
```

- [ ] **Step 4: Add effect to capture map when ready**

After the handlers, add a useEffect:

```js
  useEffect(() => {
    if (!pendingRouteData || !routeMapReady || !routeMapRef.current) return
    const capture = async () => {
      try {
        const container = routeMapRef.current?.getContainer?.()
        if (!container) {
          const { generarHojaRuta } = await import('../utils/pdf')
          const doc = generarHojaRuta(pendingRouteData.route, pendingRouteData.startAddr, pendingRouteData.weekData)
          setPdfPreview(doc)
          return
        }
        const canvas = await html2canvas(container, { useCORS: true, scale: 2 })
        const mapImage = canvas.toDataURL('image/png')
        const { generarHojaRuta } = await import('../utils/pdf')
        const doc = generarHojaRuta(pendingRouteData.route, pendingRouteData.startAddr, pendingRouteData.weekData, mapImage)
        setPdfPreview(doc)
      } catch (e) {
        const { generarHojaRuta } = await import('../utils/pdf')
        const doc = generarHojaRuta(pendingRouteData.route, pendingRouteData.startAddr, pendingRouteData.weekData)
        setPdfPreview(doc)
      } finally {
        setPendingRouteData(null)
        setRouteLoading(false)
      }
    }
    capture()
  }, [pendingRouteData, routeMapReady])
```

- [ ] **Step 5: Add hidden RouteMap in the JSX**

Before the closing `</div>` of the component (before the start address prompt modal), add:

```jsx
      {pendingRouteData && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
          <RouteMap
            ref={routeMapRef}
            startCoords={(() => {
              const startOrders = Object.values(pendingRouteData.route).flat()
              const withCoords = startOrders.filter(o => o._coords)
              return withCoords.length > 0 ? { lat: withCoords[0]._coords.lat - 0.001, lng: withCoords[0]._coords.lng } : null
            })()}
            deliveryCoords={Object.values(pendingRouteData.route).flat().map(o => o._coords)}
            onReady={() => setRouteMapReady(true)}
          />
        </div>
      )}
```

Wait — this is getting complex. The RouteMap needs startCoords from the geocoded start address. But `buildRoute` doesn't return the start coords. Let me simplify: modify `buildRoute` to also return `startCoords`.

Go back to `src/utils/geocode.js` and update `buildRoute` to return an object with `startCoords`:

```js
export async function buildRoute(startAddress, orders) {
  const startCoords = await geocodeAddress(startAddress)
  const results = []

  for (const order of orders) {
    const addr = order.client_address || order.address || ''
    const coords = addr ? await geocodeAddress(addr) : null
    if (coords && startCoords) {
      order._distance = getDistance(startCoords.lat, startCoords.lng, coords.lat, coords.lng)
      order._coords = coords
    } else {
      order._distance = Infinity
      order._coords = null
    }
    results.push(order)
    await delay(1100)
  }

  const grouped = {}
  for (const order of results) {
    const day = order.delivery_day || 'viernes'
    if (!grouped[day]) grouped[day] = []
    grouped[day].push(order)
  }

  const sorted = {}
  for (const [day, dayOrders] of Object.entries(grouped)) {
    sorted[day] = dayOrders.sort((a, b) => a._distance - b._distance)
  }

  return { route: sorted, startCoords }
}
```

Then update `generateRoutePdf` in Orders.jsx to destructure:

```js
      const { route, startCoords } = await buildRoute(startAddr, deliveryOrders)
      setPendingRouteData({ route, startCoords, startAddr, weekData })
```

And update the RouteMap hidden div:

```jsx
      {pendingRouteData && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
          <RouteMap
            ref={routeMapRef}
            startCoords={pendingRouteData.startCoords}
            deliveryCoords={Object.values(pendingRouteData.route).flat().map(o => o._coords)}
            onReady={() => setRouteMapReady(true)}
          />
        </div>
      )}
```

- [ ] **Step 6: Run tests + build**

```bash
node test.js && npm run build:vite
```

Expected: tests pass, build succeeds

---

### Task 12: Mock updates for geocode

**Files:**
- Modify: `test-e2e/mock.js` (add geocode mocks)

**Interfaces:**
- Consumes: geocode module functions
- Produces: mock geocodeAddress, getDistance, buildRoute in window.piu or as imports

- [ ] **Step 1: Add geocode mock functions to mock.js**

Since `geocode.js` is imported as a module (not via IPC), the mock system doesn't need to mock it via `window.piu`. The geocode functions are called directly in the renderer. For e2e testing, the mock doesn't need to geocode — the PDF will just render without map coordinates.

However, if the e2e tests import `buildRoute`, it will try to call Nominatim. To handle this gracefully, the existing try/catch in `generateRoutePdf` already handles failures. No mock changes needed for geocode — it's a network utility that degrades gracefully.

But we should add the `getStartAddress`/`setStartAddress` mocks if not already done in Task 5. Verify they're present.

- [ ] **Step 2: Run tests**

```bash
node test.js
```

Expected: all tests pass

---

### Task 13: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run all tests**

```bash
node test.js
```

Expected: 108+ tests pass

- [ ] **Step 2: Run build**

```bash
npm run build:vite
```

Expected: builds successfully

- [ ] **Step 3: Verify no regressions in existing PDF functions**

The existing `generarEtiquetasDelivery`, `generarHojaProduccion`, `generarListaCompras` should be untouched and working.

- [ ] **Step 4: Check that delivery_day shows in order form**

Open the app, create a new order, select "Sí" on delivery → verify day select appears with "Viernes" default. Edit an existing delivery order → verify day loads correctly.

- [ ] **Step 5: Check Hoja de Ruta button**

Click "Hoja de Ruta" → verify start address prompt appears if not set. Enter address, verify route PDF generates with tables grouped by day.
