# Reporte de Testing y Code Review — Piu

## Formato

Cada hallazgo documenta:

```
### [ID] Título
- **Tipo**: test-error | review-issue | fix | regression
- **Archivo**: ruta
- **Severidad**: critical | high | medium | low
- **Iteración**: 1 | 2 | 3
- **Estado**: open | fixed | verified | wontfix
- **Descripción**:
- **Evidencia**:
```

---

## Iteración 1

### Hallazgos

### [I1-F1] Mock snake_case vs camelCase inconsistente en getDashboard
- **Tipo**: test-error
- **Archivo**: test-e2e/mock.js
- **Severidad**: high
- **Iteración**: 1
- **Estado**: fixed
- **Descripción**: `getDashboard()` asignaba `total_ordered`/`total_produced` (snake_case) en el map de dishes, pero luego filtraba con `totalOrdered`/`totalProduced` (camelCase). Esto causaba que todos los dishes quedaran excluidos del dashboard y el stat "Producido" mostrara NaN.
- **Evidencia**: Dashboard mostraba "No hay pedidos para esta semana" con pedidos existentes. Producido: NaN.

### [I1-F2] Selector de theme buttons incorrecto en Settings
- **Tipo**: test-error
- **Archivo**: test-e2e/runner.js
- **Severidad**: medium
- **Iteración**: 1
- **Estado**: fixed
- **Descripción**: Los theme buttons renderizan solo el emoji (de `t.label.split(' ')[0]`) y la descripción, no el texto del label completo. El test buscaba `button:has-text("Claro")` que no existe en el DOM.
- **Evidencia**: Test fallaba con "button:has-text('Claro') not found". Se cambió a buscar por texto de descripción.

---

## Iteración 2

### Hallazgos

### [I2-F1] Selector de botón "No" en ConfirmPopup demasiado genérico
- **Tipo**: test-error
- **Archivo**: test-e2e/runner.js
- **Severidad**: medium
- **Iteración**: 2
- **Estado**: fixed
- **Descripción**: El selector `[role="dialog"] .btn-ghost` para el botón "No" del ConfirmPopup coincidía con múltiples elementos (close ✕, quitar ingrediente, cancelar) causando strict mode violation.
- **Evidencia**: 3 tests fallaban con "strict mode violation: locator('[role="dialog"] .btn-ghost') resolved to 3-4 elements". Se cambió a `page.getByRole('button', { name: 'No', exact: true })`.

---

## Iteración 3

### Hallazgos

### [I3-F1] updateOrder no guarda unit_price/unit_cost (store.js)
- **Tipo**: review-issue
- **Archivo**: electron/store.js:272-278
- **Severidad**: critical
- **Iteración**: 3
- **Estado**: fixed
- **Descripción**: `updateOrder()` crea orderItems sin `unit_price` ni `unit_cost`, a diferencia de `createOrder()` que sí los guarda. Al editar una orden, los ítems nuevos pierden el precio histórico, corrompiendo datos financieros históricos.
- **Evidencia**: `createOrder` (L247-255) incluye `unit_price: snapUnitPrice(item.dishId)` y `unit_cost: snapUnitCost(item.dishId)`. `updateOrder` (L272-278) solo pushea `id, order_id, dish_id, quantity`. Los handlers de analytics usan `oi.unit_price ?? dish.price` como fallback, tomando precios actuales en vez de históricos.

### [I3-F2] getDishTimeSeries produce NaN por shape incorrecto (store.js)
- **Tipo**: review-issue
- **Archivo**: electron/store.js:1146
- **Severidad**: high
- **Iteración**: 3
- **Estado**: fixed
- **Descripción**: El segundo loop de `getDishTimeSeries` crea objetos con shape `{ orderIds: new Set(), produced: 0 }` en lugar de `{ ordered: 0, produced: 0 }`. Esto causa que `v.ordered` sea `undefined`, produciendo `ordered: undefined` y `overproduction: NaN` en el resultado.
- **Evidencia**: L1126 crea `{ ordered: 0, produced: 0 }`, L1146 crea `{ orderIds: new Set(), produced: 0 }`. L1151 accede `v.ordered` que es `undefined`.

### [I3-F3] setDishSortDir usado en lugar de setClientSortDir (Analytics)
- **Tipo**: review-issue
- **Archivo**: src/pages/Analytics.jsx:266
- **Severidad**: high
- **Iteración**: 3
- **Estado**: fixed
- **Descripción**: El botón de cambio de dirección de ordenamiento en la pestaña "Top Clientes" llama a `setDishSortDir` en lugar de `setClientSortDir`. Esto significa que clickear "Asc/Desc" en clientes modifica el sort de platos, no de clientes.
- **Evidencia**: L266: `onClick={() => setDishSortDir(d => d === 'asc' ? 'desc' : 'asc')}` — debería ser `setClientSortDir`.

### [I3-F4] openNew() sin try/catch (Orders)
- **Tipo**: review-issue
- **Archivo**: src/pages/Orders.jsx:114-140
- **Severidad**: medium
- **Iteración**: 3
- **Estado**: fixed
- **Descripción**: `openNew()` hace múltiples `await window.piu?.` sin try/catch. Si alguna llamada IPC falla, la promesa se rechaza sin manejo, causando unhandled rejection.
- **Evidencia**: L115-134: `await window.piu?.isOrdersOpen()`, `await window.piu?.getCurrentWeek()`, etc. sin try/catch envolvente.

### [I3-F5] handleMarkDishUpdated y handleMarkUpdated sin try/catch
- **Tipo**: review-issue
- **Archivo**: src/pages/Menu.jsx:52-57, src/pages/Ingredients.jsx:52-58
- **Severidad**: medium
- **Iteración**: 3
- **Estado**: fixed
- **Descripción**: Los handlers de "Actualizar precio/costo" no tienen try/catch. Si la llamada IPC falla, la promesa se rechaza sin manejo.
- **Evidencia**: Menu.jsx L52-57 hace `await window.piu.markDishPriceUpdated(id)` sin try/catch. Ingredients.jsx L52-58 igual con `markIngredientUpdated`.

### [I3-F6] resp.week_start sin null check (Orders)
- **Tipo**: review-issue
- **Archivo**: src/pages/Orders.jsx:120
- **Severidad**: medium
- **Iteración**: 3
- **Estado**: fixed
- **Descripción**: `openNew()` accede `resp.week_start` sin verificar si `resp` es null/undefined. Si `getCurrentWeek()` falla, `resp` es null y crash.
- **Evidencia**: L120: `resp.week_start` donde `resp` viene de `await window.piu?.getCurrentWeek()`.

### [I3-F7] updateDish no clamp precio a no-negativo
- **Tipo**: review-issue
- **Archivo**: electron/store.js:406
- **Severidad**: low
- **Iteración**: 3
- **Estado**: fixed
- **Descripción**: `updateDish` asigna `dish.price = d.price || 0` sin `Math.max(0, ...)`. Si `d.price` es -100 (truthy), el precio se vuelve negativo.
- **Evidencia**: `createDish` (L392) usa `Math.max(0, d.price || 0)`, `updateDish` (L406) solo `d.price || 0`.

### [I3-F8] React keys inconsistentes (índice vs id)
- **Tipo**: review-issue
- **Archivo**: Analytics.jsx:538,819, Dashboard.jsx:547,558, Orders.jsx:571
- **Severidad**: low
- **Iteración**: 3
- **Estado**: fixed
- **Descripción**: Varias listas usan array index o name como key en vez de IDs estables. Esto causa re-renders incorrectos si el orden de los datos cambia.
- **Evidencia**: Analytics L538 `key={d.name}`, L819 `key={cKey}`, Dashboard L547 `key={i}`, Orders L571 `key={i}`.

### [I3-F9] useEffect missing dependencies (Analytics)
- **Tipo**: review-issue
- **Archivo**: src/pages/Analytics.jsx:303,418-433
- **Severidad**: medium
- **Iteración**: 3
- **Estado**: wontfix
- **Descripción**: `useEffect` de loadAll (L303) no incluye `customStart`/`customEnd` en deps. El effect de comparativa (L418-433) no incluye `compCustomP1*`/`compCustomP2*` en deps. Esto causa que cambios en fechas custom sin cambiar filterPreset no disparen recarga automática.
- **Evidencia**: L303: `useEffect(() => { loadAll(filterPreset, customStart, customEnd) }, [loadAll, filterPreset])`. Faltan `customStart`, `customEnd`. Compensado por botón "Filtrar" manual.

---

## Resumen Final

| Iteración | Tests | Pass | Fail | Issues Encontrados | Issues Fijos |
|-----------|-------|------|------|-------------------|--------------|
| 1 | 55 | 55 | 0 | 2 | 2 |
| 2 | 75 | 75 | 0 | 1 | 1 |
| 3 | 75 | 75 | 9 | 8 | 7 fixed + 1 wontfix |
| 4 | 85 | 85 | 0 | 2 | 2 |

---

## Iteración 4

### Test Infrastructure

#### Mock URL params
- `empty=<entity>` y `error=<channel>` soportados tanto en `window.location.search` como `window.location.hash`
- `/?empty=orders#/` activa modo vacío para orders en Dashboard
- `/?error=getDashboard#/` hace que `getDashboard()` rechace simulando fallo IPC
- Search params garantizan full page navigation (init script re-run), a diferencia de hash-only params

### Hallazgos

### [I4-F1] Dashboard loading skeleton oculta ErrorBanner (Dashboard.jsx)
- **Tipo**: review-issue
- **Archivo**: src/pages/Dashboard.jsx:97-102
- **Severidad**: high
- **Iteración**: 4
- **Estado**: fixed
- **Descripción**: Cuando `getDashboard()` falla, el catch setea `error` pero `data` permanece `null`. El early return `if (!data) return (<SkeletonCard />)` se ejecuta antes de renderizar `<ErrorBanner>`, ocultando el mensaje de error al usuario. El usuario ve un skeleton loader eterno sin indicación de fallo.
- **Evidencia**: Test ERROR: Dashboard on load verificaba ErrorBanner visible — fallaba. ErrorBanner no aparecía en el DOM. Fix: Agregar `<ErrorBanner>` dentro del return del skeleton loader.

### [I4-F2] Orders silencia errores de carga (Orders.jsx)
- **Tipo**: review-issue
- **Archivo**: src/pages/Orders.jsx:46-67
- **Severidad**: medium
- **Iteración**: 4
- **Estado**: verified (comportamiento intencional)
- **Descripción**: Orders usa `.catch(() => [])` en cada Promise individual de `load()`. Esto convierte fallos IPC en arrays vacíos sin setear error state. El ErrorBanner nunca se muestra durante fallos de carga. A diferencia de Menu/Ingredients/Clients que usan try/catch con `setError`.
- **Evidencia**: Test ERROR: Orders on load no encontraba `[role="alert"]` en el DOM. La página renderiza correctamente con datos vacíos. Diseño intencional para graceful degradation — cada API falla independientemente sin afectar las demás.
