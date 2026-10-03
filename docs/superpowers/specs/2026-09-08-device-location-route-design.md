# Mapa base: ubicación del dispositivo (GPS + IP) y contexto de ciudad

Fecha: 2026-09-08 · Proyecto: Piu

## Problema

La Hoja de Ruta actual (feature delivery_day + route sheet, completada hoy) geocodifica:

1. una "dirección de partida" guardada manualmente (prompt la primera vez), y
2. las direcciones de clientes **crudas** (sin ciudad).

Problemas reales: (a) un PC de cocina típico no tiene GPS, por lo que `navigator.geolocation`
de Electron suele fallar sin un proveedor activo; (b) geocodificar `"Av 7 1234"` sin ciudad da
coincidencias malas o nulas en Nominatim.

## Decisiones (aprobadas por el usuario)

1. **Partida = ubicación real del dispositivo host.** Cascade: `navigator.geolocation`
   (GPS/WiFi) → fallback a geolocalización por IP (ipapi.co → bigdatacloud).
2. **Se elimina por completo la "dirección de partida"**: prompt/modal, states/handlers de
   Orders.jsx, `getStartAddress`/`setStartAddress` en store.js, IPC en main.js, exposiciones en
   preload.js, mocks en test-e2e/mock.js y `testStartAddress` en test.js.
3. **Las direcciones de clientes se geocodifican con contexto de ciudad del dispositivo**:
   `"<dirección>, <ciudad>"`, omitiendo la ciudad si la dirección ya la contiene.
4. **Todo en el renderer** (`src/utils/geocode.js`). `main.js` solo toca para quitar 2 IPC
   handlers y agregar un permission handler explícito de geolocation.

## Fuente de ubicación (`getDeviceLocation()` en geocode.js)

- Paso 1 (GPS): `navigator.geolocation.getCurrentPosition()` promisificado,
  `{ enableHighAccuracy: false, timeout: 5000, maximumAge: 120000 }` → `coords`.
- Paso 2 (IP, si GPS falla): `fetch('https://ipapi.co/json/')` → `{ latitude, longitude, city }`.
  Si falla → `fetch('https://api.bigdatacloud.net/data/client-ip-geolocation?localityLanguage=es')`
  → `{ latitude, longitude, city }`.
- Retorna `{ coords, city, method: 'gps' | 'ip' }`, o `null` si ambos fallan.
- **Cache por sesión** (scope de módulo): el host es la cocina, no se mueve; se evita re-consultar
  en cada generación.
- Ciudad: en el path IP viene del API (`city`). En el path GPS, es necesario reverse-geocode en
  Nominatim: `https://nominatim.openstreetmap.org/reverse?lat=..&lon=..&format=json&addressdetails=1`
  → `address.city ?? address.town ?? address.village ?? address.county`.

## `buildRoute` (geocode.js) — nueva firma

- `async function buildRoute(orders)` — **sin** `startAddress`.
- Obtiene `const { coords: startCoords, city } = await getDeviceLocation() ?? {}`.
- Por pedido: `addr = order.client_address || order.address || ''`;
  `geoAddr = (city && addr && !addr.toLowerCase().includes(city.toLowerCase())) ? \`${addr}, ${city}\` : addr`;
  `coords = geoAddr ? await geocodeAddress(geoAddr) : null`.
- Si `coords && startCoords` → `_distance = getDistance(...)`, `_coords = coords`; si no →
  `_distance = Infinity`, `_coords = null`.
- Pacing Nominatim: `await delay(1100)` al inicio de cada iteración (antes del geocode del cliente).
- Agrupa por `delivery_day`, ordena por `_distance`, retorna `{ route, startCoords, city }`.

## Permissions (main.js)

- En `app.whenReady()`, antes de `createWindow()`:
  `session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(perm === 'geolocation'))`.
  (Electron auto-aprueba por defecto; esto es explícito y evita prompts.)
- Se quitan `ipcMain.handle('piu:getStartAddress', ...)` y `ipcMain.handle('piu:setStartAddress', ...)`.

## UI (src/pages/Orders.jsx)

- Se eliminan: `showStartAddressPrompt`, `startAddressInput`, `handleStartAddressSubmit`, el
  modal (L1094-1114) y la rama `getStartAddress` en `handlePrintRoute`.
- `handlePrintRoute()` → llama directo `generateRoutePdf()` (sin argumento).
- `generateRoutePdf()` (sin parámetro):
  `const { route, startCoords, city } = await buildRoute(deliveryOrders)`.
  Si `!startCoords` → `showToast('No se pudo obtener la ubicación del dispositivo', 'warning')`
  (se genera igual el PDF: tabla sin ordenar y sin mapa).
  `setPendingRouteData({ route, startCoords, city, weekData })`; `setRouteMapReady(false)`.
- El capture flow (RouteMap + html2canvas + fallback 4s) queda igual; el RouteMap recibe
  `startCoords={pendingRouteData.startCoords}` (null si no hay) y
  `deliveryCoords={...}` (los `_coords` no-null).
- `generarHojaRuta(route, pendingRouteData.city, pendingRouteData.weekData, mapImage)`.

## PDF (src/utils/pdf.js)

- `generarHojaRuta(route, city, weekData, mapImage = null)`: el header muestra
  `Partida: ${city}` solo cuando `city` no es null/empty. (Reemplaza el bloque de `startAddress`.)

## RouteMap (src/components/RouteMap.jsx)

- Sin cambios estructurales. Con `startCoords=null`, ya renderiza solo los clientes o un div
  vacío; el popup del marcador sigue diciendo "Partida".

## Borrado de startAddress — archivos y líneas exactas

- `electron/store.js`: funciones `getStartAddress` (L1413-1414) y `setStartAddress`
  (L1417-1421) + exports `getStartAddress, setStartAddress` (L1612-1613).
- `electron/main.js`: IPC handlers L66-67.
- `electron/preload.js`: exposiciones L60-61.
- `test.js`: `testStartAddress` (L661-673) + registro `testStartAddress(store)` (L720).
  Nuevo total esperado: **108 asserts** (111 - 3).
- `test-e2e/mock.js`: `startAddress: ''` en `deliverySettings` (L92) y los 2 mocks
  `getStartAddress`/`setStartAddress` (L452-453).

## Verificación

- `node test.js` → 108 passed, 0 failed.
- `npm run build:vite` → éxito.
- Smoke manual (en el dispositivo): Pedidos → Hoja de Ruta → **no aparece prompt de dirección**;
  mapa centrado en la ubicación del dispositivo; tabla por día ordenada por cercanía desde la
  partida; header del PDF con `Partida: <ciudad>`.

## Testing

- Sin tests unitarios nuevos en geocode.js (depende de `navigator.geolocation`/fetch externos y
  hoy no tiene tests; consistente con el estado actual). Los cambios de store no rompen tests
  existentes (se elimina `testStartAddress`).