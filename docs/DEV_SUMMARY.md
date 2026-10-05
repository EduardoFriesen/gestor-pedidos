# Piu — Estado de desarrollo (resumen para continuar)

## Proyecto
Electron + React 18 + Vite 6 + React Router 6. JSON file store (`piu.json`, sin backend). IPC: `electron/store.js` → `electron/main.js` (ipcMain) → `electron/preload.js` (contextBridge `window.piu.*`). Semanas domingo→sábado, órdenes/producción scoped a semanas. Commands: `npm run dev`, `npm run build:vite`, `npm run start`, `npm run preview`, `node test.js` (108 tests), `node seed.js`.

## Trabajo reciente (todo sin commitear, HEAD=62bb5c18)

### 1. Feature "Hoja de Ruta" (completa, 13 tareas)
- Delivery day select en Orders.jsx + `delivery_day` whitelist en store.js (`lunes..domingo`, default `viernes`).
- `src/utils/geocode.js`: `buildRoute(orders)` → `{ route, startCoords, city }`, ordena por día + distancia (Haversine clamp), delays de ~1.1s.
- `src/components/RouteMap.jsx` (NUEVO, untracked): Leaflet map, `zoomControl/attributionControl: false`, markers divIcon (verde partida, rojos numerados), polyline dashed, `fitBounds`.
- `src/utils/pdf.js`: `generarHojaRuta(route, city, weekData, mapImage = null)`; sección "Mapa de ruta" si `mapImage`.
- `src/pages/Orders.jsx`: botón "Hoja de Ruta", `generateRoutePdf()` → `setPendingRouteData({ route, startCoords, city, weekData })`, carga dinámica de RouteMap, captura con html2canvas en div oculto (`position:fixed; left:-9999; 900x450`), fallback 4s sin mapa.

### 2. Feature "Ubicación del dispositivo" (completa, B1–B9)
- `getDeviceLocation()`: navigator.geolocation (GPS) → IP fallback (ipapi.co → bigdatacloud), cache por sesión, reverse geocode → city.
- Direcciones de clientes geocodificadas con sufijo de ciudad.
- Partida = ubicación del dispositivo; **se eliminó toda la funcionalidad de "dirección de partida manual"** (store, IPC `getStartAddress`/`setStartAddress`, preload, mocks, test). Limpio: `grep StartAddress|startAddress` → 0 matches.
- `main.js` ~L233: `session.defaultSession.setPermissionRequestHandler` permite `geolocation`.
- Mock: `deliverySettings: { defaultFee: 500 }`, sin startAddress.

### 3. Fix activo REAPLICADO (mapa blanco en PDF)
- **Bug**: capture mostraba solo marcadores + polyline, fondo de tiles en blanco.
- **Causa raíz**: Leaflet cargaba tiles sin `crossOrigin` (modo no-CORS) → html2canvas 1.4.1 no podía redibujarlas (OSM sí manda `ACAO:*`). Además `onReady` era timeout fijo (1.2s).
- **Fix aplicado**:
  - `RouteMap.jsx`: `L.tileLayer(..., { crossOrigin: true })` + espera evento `map.on('load')` en vez de setTimeout (fallback 8s, `fireReady` guard con `readyFired`).
  - `Orders.jsx`: `imageTimeout: 20000` en html2canvas (manteniendo `useCORS: true`).
- **Verificado**: `npm run build:vite` OK, `node test.js` 108/108.
- **Fix 2 (verificado E2E 2026-10-03)**: el fix anterior no funcionaba. `map.on('load')` nunca llegaba porque Leaflet dispara el `load` del mapa sincrónicamente en el primer `fitBounds`, así que ganaba el fallback de 4s de Orders y el PDF salía **sin mapa**. Cambios en `RouteMap.jsx`: `tiles.on('load', fireReady)` (load de la tileLayer), `fadeAnimation: false` (tiles capturados a medio fade) y `preferCanvas: true` (la polyline SVG quedaba desalineada en html2canvas). PDF verificado con Playwright + mock: calles nítidas, línea partida→destino alineada.

### 4. Localidad de clientes + link de Google Maps (2026-10-03)
- Cliente tiene `locality` (store, mock, `client_locality` en órdenes). En `Clients.jsx`, si se deja vacía se guarda la ciudad detectada (`getDeviceLocation()`).
- `buildRoute` geocodifica `address, client_locality || ciudad detectada` y guarda `_geoQuery`.
- `buildMapsLinks(route, startCoords)` en `geocode.js`: un link `maps/dir/?api=1` por día, tramos encadenados de máx. 9 waypoints.
- QR por día en el PDF (dep `qrcode`) + panel "Recorrido en Google Maps" en el PdfViewer (Abrir / Copiar / WhatsApp). `main.js` abre links https con `shell.openExternal`.
- Verificado: `node test.js` 112/112, E2E 85/85, Playwright: cliente sin localidad → ciudad detectada, QR del PDF idéntico al link del panel. Pendiente: probar "Abrir" dentro de Electron.

### 5. Geocodificación por cercanía + mapa fuera del PDF (2026-10-03)
- `geocodeAddress(address, near, countryCode)`: pide 10 candidatos a Nominatim (viewbox ±0.5° + countrycodes) y elige el más cercano al productor (`pickNearest`). Si el mejor queda a más de 15 km, reintenta sin la altura (`stripStreetNumber`). Caso real: "Corrientes 300, Córdoba" iba a Río Cuarto porque OSM no tiene la altura en la capital.
- `getDeviceLocation()` ahora devuelve `countryCode`.
- El PDF de la Hoja de Ruta ya no lleva mapa. El mapa (Leaflet interactivo, `React.lazy`) se muestra en el modal, arriba del panel de links. Se eliminó el flujo de captura con html2canvas (estados `pendingRouteData`/`routeMapReady`, fallback de 4 s, div oculto). `html2canvas` quedó sin uso en `src/`, pero sigue en package.json.
- Verificado: test.js 112/112, E2E 85/85, Playwright con productor en Córdoba: el pedido "Corrientes 300, Córdoba" cae en (-31.42, -64.18), el PDF solo trae los QR y el modal muestra el mapa con zoom.

### 6. Punto de partida en Configuración (2026-10-03)
- Causa de la imprecisión: en Electron `navigator.geolocation` necesita una API key de Google. Sin ella cae al fallback por IP (ciudad, varios km de error).
- Store: `getStartLocation()` / `setStartLocation(loc|null)` en `deliverySettings.startLocation` (`{ address, lat, lng, city, countryCode }`), con validación de coords. IPC, preload y mock incluidos.
- `getDeviceLocation()` usa primero la partida guardada (`method: 'manual'`). La detección automática quedó en `getAutoLocation()`, y `clearDeviceLocationCache()` se llama al guardar o borrar.
- Settings: card "Punto de partida" con Buscar (geocode sesgado por la ubicación automática), un mini mapa, Guardar y "Usar detección automática". Avisa cuando el resultado es aproximado (`exact` = display_name empieza con número). OSM no tiene alturas en muchas calles de Córdoba (ej. Av. Colón) y Nominatim no entiende esquinas.
- Verificado: test.js 120/120, E2E 85/85, Playwright: con el navegador en BsAs y la partida en "Av. Colón 500, Córdoba", el origin del link de Maps es la coordenada guardada y el PDF dice "Partida: Córdoba". Al borrarla vuelve a la automática.

### 7. Orden óptimo de entregas (2026-10-03)
- `optimizeStops(start, stops)` en `geocode.js`: OSRM `/trip` (`source=first`, `roundtrip=false`, `destination=any`, geometría geojson, timeout 10 s, máx. 90 puntos). Si falla, cae a `optimizeStopsLocal` (vecino más cercano + 2-opt, camino abierto, línea recta).
- `buildRoute` optimiza cada día desde la partida; las órdenes sin coordenadas van al final. Devuelve `stats[day] = { distance, duration, geometry, method }`.
- PDF: línea "Recorrido estimado: X km · ~Y min" por día (o "en línea recta" con el respaldo). Mapa: prop `lines` en `RouteMap`, camino real por calles (sólido) o recta punteada.
- Medido con 6 direcciones de Córdoba: orden nuevo 22,8 km / 41 min contra 46,4 km / 83 min del orden anterior (por cercanía a la partida).
- Límite de datos OSM detectado: "Chacabuco 800, Córdoba" no resuelve en Córdoba capital (cae en Villa Allende, 16 km). Ni "Chacabuco" ni "Avenida Chacabuco" la encuentran en la capital.

### 8. Revisión de Análisis (2026-10-03)
- Store: `parseLocalDate` en los rangos (antes el inicio se interpretaba en UTC y una semana incluía pedidos del sábado anterior desde las 21 h). "Pedidos por día" cuenta pedidos distintos. Precio, costo y margen por plato son promedios del período (`margin` nuevo). `getPeriodComparison` devuelve números, `null` si la base es 0, margen en pp, y `margin: null` sin ventas.
- Excel: `exportAnalyticsExcel(range)` exporta el período filtrado (hoja Resumen con "Período"). `runAutoExport` sigue exportando todo.
- UI: orden "Mayor/Menor primero" (antes invertido), paginación segura al cambiar de filtro, limpieza y "Cargando…" al expandir, barras con máximo global, tortas = unidades/pedidos, tendencia Semanal con período por defecto según filtro, plata es-AR, valores sobre las barras, negativos en rojo, comparativa con etiquetas, ticket y costo promedio por pedido (reemplaza "Tasa de inflación"), validación de fechas.
- Envíos fuera de ingresos a propósito (los cobra el delivery tercerizado). El mock sumaba envíos y se corrigió.
- Verificado: test.js 132/132, E2E 85/85, recorrido con Playwright de las 4 pestañas.
- Pendiente aparte: la barra de navegación (`Layout`) desborda ~54 px a 1500 px de ancho.

## 9. Revisión de Clientes, Pedidos, Ingredientes y Producción
Plan: `~/.claude/plans/quiero-que-las-localidades-binary-pebble.md`.
- Nuevos: `src/utils/format.js` (fmtMoney, fmtUnitCost, formatQty, parseDecimal, formatDate, formatWeekRange, ORDER_STATUS) y `src/components/ClientForm.jsx`, compartido entre Clientes y el alta rápida en Pedidos (localidad por defecto, aviso de duplicado).
- Store:
  - `getOrCreateNextWeek` (IPC nueva). `ensureCurrentWeek` reutiliza una semana por `week_start`. `clientHasOrderThisWeek(clientId, weekId)`.
  - `updateOrder` conserva `unit_price`/`unit_cost`.
  - `getClients` devuelve `order_count`/`last_order_at`.
  - `recalcCompositeCosts` corre en init y en cada cambio de ingrediente.
  - Al cambiar a una unidad compatible, se convierten las cantidades en platos y sub-productos. Una unidad incompatible devuelve `unit_in_use`.
  - `getIngredientUsage` (IPC nueva).
  - `undoProduction` resta 1 del registro más reciente de la semana.
  - `completeDishProduction` se suma al registro del día.
  - `getDashboard` incluye platos inactivos con pedidos y suma la sobreproducción por plato.
  - `getSubProductQuantities` agrega `remaining`.
- UI:
  - Pedidos:
    - "Semana siguiente" funciona y la semana es visible y editable en el selector;
    - total en vivo; plato inactivo conservado al editar;
    - estados Pendiente → Armado → Entregado.
  - Ingredientes:
    - tipo comprado/receta; coma decimal;
    - costo del lote vs. por unidad; filtro por categoría;
    - borrar lista dónde se usa.
  - Producción:
    - botón −1;
    - cantidades "para lo que falta".
- Mock: `_nextId` arranca en 1000 (antes chocaba con los IDs de la semilla), y los ítems traen `dish_id`.
- El test `testUndoRemovesAll` se reemplazó por `testUndoSubtractsOne`.
- Verificado: test.js 160/160, E2E 85/85, 20 chequeos con Playwright sobre el mock.

## 10. Datos de prueba (`seed.js` reescrito)
- Genera desde 2024-01 hasta la semana siguiente a la actual.
- Clientes: 150, todos en Córdoba capital, con localidad. Algunos son solo de retiro (sin dirección).
- Precios: ingredientes y platos a valores de 2026, llevados hacia atrás con inflación mensual aproximada del INDEC.
- Pedidos:
  - los envíos tienen día y recargo; las semanas pasadas están todas entregadas;
  - la semana actual tiene estados mezclados; la semana siguiente tiene 3 pedidos.
- Producción coherente con los pedidos.
- Ingredientes y platos:
  - algunos ingredientes con precio viejo y algunos con paquete; 2 ingredientes inactivos;
  - los platos de rotación del mes están activos y el resto inactivos.
- Conserva `deliverySettings.startLocation`. Hace un respaldo en `userData/backups/piu-antes-de-seed-*.json` antes de escribir.

## 11. Links de Google Maps por parada
- Los links mandaban coordenadas de Nominatim. En Córdoba OSM casi no tiene alturas: devuelve el centro de la calle, y Google mostraba otra dirección.
- Ahora `buildStopLinks(route)` arma un link por entrega con `destination=<dirección, localidad, país>`, sin origin. No hay límite de paradas.
- PDF: se sacaron los QR y hay una columna "Mapa" con "Ir" enlazado.
- Panel: lista numerada por día con un botón "Ir" por entrega, más "Copiar lista" y "WhatsApp" con todas las paradas y sus links.
- Se desinstaló `qrcode`.

## 12. Teclado en modales y mapa en el formulario de cliente
- `src/utils/modalStack.js`: solo el modal de arriba responde al teclado. Antes, un Esc en "¿Cargar otro?" cerraba también el formulario de abajo.
- `Modal.jsx`:
  - Enter en un input o select hace click en el último `.form-actions .btn-primary` habilitado, o llama a la prop `onSubmit`. Ctrl+Enter funciona desde cualquier campo.
  - Con el foco en un botón o checkbox, las flechas ←/→ se mueven entre hermanos y ↑/↓ por el modal. Se ignoran los eventos con `defaultPrevented`.
  - El foco inicial va al primer campo, ya no al ✕.
- `ConfirmPopup.jsx`: entra en la pila; Esc cancela; las flechas y Tab alternan Confirmar/No.
- `WeekSelector` (Orders) ahora usa `<Modal>`.
- Buscador de cliente del pedido: ↑/↓ resaltan, Enter elige (o abre "+ Nuevo cliente") y Esc cierra la lista si hay texto.
- `ClientForm`: geocodifica la dirección un segundo después de tipear y muestra un mini-mapa (`RouteMap` con `height`/`singleZoom`), un aviso de altura aproximada o de dirección no encontrada, y "Ver en Google Maps".
- Tests E2E de teclado en `runner.js`: 91/91.

## Convenciones
- Sin comentarios en código salvo pedidos. Sin commits salvo pedido explícito. No asumir librerías externas (check package.json). Estilo existente (clases CSS con vars `--radius`, `--border`).
- Skills instalados: impeccable, webapp-testing, frontend-design, infosec, code-reviewer, git-commit-writer, stop-slop, mcp-builder, skill-creator + superpowers (brainstorming, systematic-debugging, test-driven-development, writing-plans, etc.).

## Archivos clave modificados/no commiteados
- `src/pages/Orders.jsx`, `src/components/RouteMap.jsx` (untracked), `src/utils/geocode.js` (untracked), `src/utils/pdf.js`, `electron/main.js`, `electron/store.js`, `electron/preload.js`, `test.js`, `test-e2e/mock.js`, `src/pages/Clients.jsx`, `package.json`/`package-lock.json`, `dist/index.html` (built).
- Untracked: `docs/superpowers/` (specs + plans), `piu.json`, `src/img/`, `test-results/`.

## Siguiente paso sugerido
1. ~~Verificación E2E visual del fix del mapa~~ (hecho).
2. Cuando el usuario lo pida: commit (mensaje conventional, skill git-commit-writer).

### Cache de la Hoja de Ruta (2026-10-05, sin commitear)
- `store.getRouteCache(weekId)` / `setRouteCache(weekId, cache)` guardan en `piu.json` (`data.routeCache`, una sola entrada para la semana actual) las coordenadas, el orden de paradas y los stats de OSRM. Están en las 4 capas: store, main, preload y mock.
- `src/utils/routeCache.js`: `routeCacheKey` (pedidos con envío: id, dirección, localidad y día, más el punto de partida guardado), `serializeRoute` y `restoreRoute`.
- `Orders.jsx` › `generateRoutePdf(force)`: si la clave coincide, rearma la ruta con datos frescos de los pedidos sin geocodificar. El botón "Recalcular ruta" en el visor la fuerza.
- Tests: `testRouteCache` y `testRouteCacheHelpers` (test.js), y E2E "ROUTE: hoja de ruta se reusa…".
- Verificado en Electron con una copia de los datos reales (6 envíos): primera vez ~8 s, reabrir ~0,4 s, tras reiniciar ~0,7 s, tras cambiar el pago 0 geocodificaciones, tras editar una dirección recalcula.
- `npm audit fix` (compatible) bajó las vulnerabilidades de 22 a 7. Quedan las que requieren major: electron y extract-zip (alta, v44) y react-router (moderada, v7).
- xlsx 0.18.5 → 0.20.3 instalado desde el tarball oficial `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (SheetJS ya no publica en npm). El hash de integridad queda fijado en el lockfile. npm audit no lo revisa: las próximas actualizaciones son manuales (ver cdn.sheetjs.com). El backup XLSX con datos reales sale igual celda por celda.
- jsPDF 2.5.2 → 4.2.1 (resuelve la crítica y dompurify). Los PDFs de producción, compras y ruta salen idénticos a v2; el de etiquetas, idéntico píxel a píxel a 200 dpi (v4 incrusta el logo sin canal alfa, pero sus píxeles transparentes son blancos). `addImage` del logo ahora declara `'PNG'` en vez de `'JPEG'`.
- gitleaks 8.30.1: historial limpio; los hallazgos en `release/` (ignorado por git) son falsos positivos de binarios.
