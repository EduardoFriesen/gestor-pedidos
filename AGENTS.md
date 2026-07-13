# Piu — Gestión de producción de cocina comercial

## Stack

Electron + React 18 + Vite 6 + React Router 6. Sin backend — JSON file store (`piu.json`).

## Comandos

| Comando | Uso |
|---------|-----|
| `npm run dev` | Vite + Electron (concurrente) |
| `npm run build:vite` | Compila React a `dist/` |
| `npm run start` | Electron solo (producción) |
| `npm run preview` | build:vite + start |
| `npm run dist:win` | Build + empaquetar (NSIS installer) |
| `node test.js` | Tests unitarios (crea `piu.test.json`, lo borra al final) |
| `node seed.js` | Genera datos de ejemplo en `piu.json` |

## Arquitectura Electron IPC

store.js (backend lógica) → main.js (ipcMain.handle) → preload.js (contextBridge) → React (window.piu.*)

- Todos los canales IPC usan prefijo `piu:`.
- `store.js` recibe/guarda en un JSON (`store.init(filePath)`).
- La store se levanta en `main.js` con `store.init(app.getPath('userData') + '/piu.json')`.
- `preload.js` expone cada función como `window.piu.funcion()`.

## Sistema de semanas

- Las semanas van de **domingo a sábado**.
- `getCurrentWeek()` busca la semana actual o la crea si no existe.
- Órdenes y producción están scoped a semanas.

## Conversión de unidades

`src/utils/units.js` define familias (weight, volume, count, culinary).
`convertValue(v, from, to)` usa `TO_BASE` ratios. Inputs de display-unit guardan strings raw; `parseFloat` solo al calcular/guardar.

## Sub-productos

Ingredientes compuestos con `subIngredients: [{ ingredientId, quantity }]`.
`batchYield: N` significa que la cantidad de sub-ingredientes produce N unidades. Default `batchYield: 1`.
`calcCompositeCost(id)` usa batchYield. `getResolvedCost(id)` divide costo por batchYield.

## Funciones clave del store

- `getDishTimeSeries(dishId, start, end)` → `[{ period, ordered, produced }]` donde ordered = cantidad de **órdenes distintas** (no suma de quantities), produced = suma de quantity_produced
- `getClientTimeSeries(clientId, start, end)` → `[{ period, orders }]`
- `getPeriodComparison(p1Start, p1End, p2Start, p2End)` → compara dos rangos de fechas
- `getTrendsInRange(start, end)` → ingresos/costos/ganancias por período
- `expandForShoppingList(ingredients)` → expande sub-ingredientes usando batchYield

## Analytics (src/pages/Analytics.jsx)

- **filterPreset**: controla todas las pestañas. Presets: week/month/quarter/year/all/custom.
- `getPresetRange(preset)` computa fechas.
- `getPeriodOptions(preset, fullTrends)` genera opciones de período seleccionables.
- Vista expandida de plato: muestra cards de comparación en modo semana, cards + charts en otros modos.
- Charts de tendencias: 3 BarChart separados (Ingresos/Costos/Ganancias).

## Dashboard (src/pages/Dashboard.jsx)

- Sub-productos colapsables (default collapsed), toggle clickeando el header.
- `formatQty(value, unit)` auto-convierte l→ml / kg→g cuando < 1, máx 2 decimales.
- Botones "Lista Compras" + "Hoja Producción" en el header. Usan `src/utils/pdf.js`.
- PdfViewer renderiza inline.

## Convenciones

- Seguir estilo existente (mismas librerías, mismos patrones).
- No asumir librerías externas — verificar package.json primero.
- No agregar comentarios a menos que se pida explícitamente.
- No commitear a menos que se pida.

---

# Skills Instalados

Los siguientes skills están instalados globalmente en `~/.claude/skills/` y OpenCode los carga automáticamente.

## 🎨 **impeccable** — Diseño UI/UX profesional

**Cómo usarlo:** El skill se activa automáticamente al hablar de diseño frontend. También tiene comandos tipo `/impeccable init`, `/impeccable polish`, `/impeccable audit`, `/impeccable animate`.

**Recomendado para:** Diseñar interfaces atractivas que no parezcan genéricas de AI. Tiene 44 reglas detectoras de anti-patrones visuales. Usarlo al crear o modificar componentes React, páginas, layouts.

## 🧪 **webapp-testing** — Tests con Playwright

**Cómo usarlo:** Se activa al pedir testear una webapp local. Escribe scripts de Python Playwright para navegar, hacer screenshots y capturar logs del navegador.

**Recomendado para:** Verificar comportamiento UI, debuggear flujos del cliente, capturar screenshots antes de release. Trabaja mejor cuando el servidor de desarrollo ya está corriendo.

## 🖌️ **frontend-design** — Guía de diseño visual (Anthropic oficial)

**Cómo usarlo:** Se activa automáticamente al trabajar en frontend. Proporciona dirección estética: paletas, tipografía, animaciones.

**Recomendado para:** Tomar decisiones de diseño con intención, evitar estilos por defecto. Complementa a impeccable — frontend-design da la teoría, impeccable da los comandos prácticos.

## 🔒 **infosec** — Auditoría de seguridad y compliance

**Cómo usarlo:** Se activa al mencionar "security", "audit", "compliance", "ISO 27001". Hace revisión de encriptación, control de acceso, logging, manejo de secrets, IAM, exposición de red, supply chain.

**Recomendado para:** Auditar PRs por compliance ISO 27001, revisar seguridad de la app antes de deploy. Es read-only — identifica problemas pero no modifica código.

## 📝 **code-reviewer** — Code review exhaustivo

**Cómo usarlo:** Se activa automáticamente cuando hablás de calidad de código. También se puede invocar explícitamente: `@code-reviewer` como sub-agent para review profunda.

**Recomendado para:** Detectar code smells, anti-patrones, problemas de naming, chequeos básicos de seguridad, consistencia de estilo. Ideal antes de commitear o al revisar PRs.

## ✍️ **git-commit-writer** — Mensajes de commit convencionales

**Cómo usarlo:** Decile "write a commit message for my staged changes" o pasale un diff. El skill genera mensajes en formato Conventional Commits (feat, fix, chore, etc.).

**Recomendado para:** Escribir mensajes de commit consistentes con tipo/scope bien elegidos. Ejecutar antes de cada commit para mantener el historial limpio.

## 🧹 **stop-slop** — Eliminar patrones de escritura AI

**Cómo usarlo:** Se activa al pedir redactar o editar texto. Elimina frases predecibles, vocabulario AI ("delve", "leverage", "seamless"), estructuras formulaicas.

**Recomendado para:** Limpiar texto generado por AI para que suene humano. Útil en descripciones de productos, documentación, comunicaciones.

## 🏗️ **mcp-builder** — Crear servidores MCP

**Cómo usarlo:** Se activa al hablar de construir un MCP server. Guía en TypeScript o Python, tool design, testing con MCP Inspector, evaluación.

**Recomendado para:** Construir MCP servers que conecten LLMs a APIs externas. Incluye reference docs para ambos SDKs y un workflow de 4 fases.

## 🧠 **skill-creator** — Crear skills para Claude/OpenCode

**Cómo usarlo:** Se activa al decir "create a skill", "build a skill". Guía todo el proceso: definición del caso de uso, frontmatter, instrucciones, validación.

**Recomendado para:** Empaquetar conocimientos o workflows reutilizables como skills. Ideal cuando encontrás un patrón de tarea que repetís seguido.

## 🚫 No instalados (incompatibles con OpenCode)

Estos son plugins de Claude Code (no skills puros) y no funcionan en OpenCode:

| Skill | Razón |
|-------|-------|
| obra/superpowers | Plugin system de Claude Code |
| composio/skills | MCP server + plugin marketplace |
| firecrawl | Plugin + API key requerida |
| shannon | Docker + API key Anthropic + plugin system |
