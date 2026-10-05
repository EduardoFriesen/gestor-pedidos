# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

The imported `AGENTS.md` above is the main project guide: stack, commands, IPC architecture, week system, units, sub-products, key store functions and conventions. This file only adds what AGENTS.md doesn't cover.

## Testing

- There is no lint script and no linter config. Other scripts not in the AGENTS.md table: `npm run dist:linux`, and `npm run pack` (an unpacked build in `release/`).
- `node test.js` runs the store unit tests directly against `electron/store.js`, with no Electron and no framework. It writes a temp `piu.test.json`, exits non-zero on failure, and writes `test-report.json` when anything fails. Use `node test.js --verbose` to print passing assertions too.
- There is no single-test runner. Each test is a plain `testXxx(store, seed)` function called from `main()` at the bottom of `test.js`. To run one, comment out the other calls in `main()`, or add the new function there.
- E2E tests (`node test-e2e/runner.js`) use Playwright against the Vite dev server at `http://localhost:5173`, so start `npx vite` first. They don't use Electron. Instead, `test-e2e/mock.js` is injected with `addInitScript` and stubs `window.piu.*` with in-memory data. They write `test-e2e/report.json` and exit non-zero on failure.
- `test-interactive.mjs` and `test-interactive.py` in the root are old ad-hoc Playwright scripts. The `.mjs` one targets port 5199. They are not part of the main suites.
- **When you add or rename an IPC function, update all four layers:** `store.js` (plus its `module.exports`), the `main.js` handler, `preload.js`, and `test-e2e/mock.js`. If the mock is missing it, the E2E tests break.

## Runtime details that span files

- The renderer uses `HashRouter` (routes look like `/#/orders`), and Vite's `base: './'` makes the built `dist/` loadable with `file://`.
- `main.js` loads `http://localhost:5173` when it gets `--dev` or `NODE_ENV=development`, and `dist/index.html` otherwise.
- Startup order in `main.js`: `store.init` → `ensureCurrentWeek` → geolocation permission handler → IPC handlers → `runAutoExport` (writes a weekly JSON + XLSX backup to `userData/backups/` once per week/date) → window.
- `store.js` holds the whole DB in memory and `save()` writes it atomically after each mutation (write to `.tmp`, then rename). IDs come from one global `_nextId` counter that is shared by every collection.
- `isOrdersOpen()`: orders are open Sunday–Thursday and on Friday until 12:00.
- Route sheet ("Hoja de Ruta") flow: `buildRoute` in `src/utils/geocode.js` takes its start point from `getDeviceLocation()`. That uses the start address saved in Settings (`getStartLocation`, stored in `deliverySettings.startLocation`) and falls back to GPS, then IP. In Electron, GPS needs a Google API key, so the fallback is usually IP-level. It geocodes each client as `address, locality`. When Nominatim returns several candidates, `geocodeAddress` keeps the one closest to the producer. If that is still more than 15 km away, it retries without the house number. Deliveries are ordered per day with `optimizeStops`, which calls OSRM `/trip` (by road, open path from the start point, ending at the last delivery). If OSRM fails, it falls back to nearest-neighbour + 2-opt on straight-line distance. Then `buildStopLinks` builds one Google Maps navigation link per delivery. It uses the written address (`address, locality, country`), not the Nominatim coordinates, because OSM in Córdoba often only resolves to the middle of the street. `Orders.jsx` renders the PDF (`generarHojaRuta` in `src/utils/pdf.js`: tables, estimated km/min per day, an "Ir" link per row; no map, no QR) and shows an interactive `RouteMap` (Leaflet, lazy-loaded) plus the links panel inside `PdfViewer`.

## Project notes

- `docs/DEV_SUMMARY.md` tracks in-progress or uncommitted work and pending verification steps. Read it when you resume work.
- `docs/superpowers/` contains specs and plans for past features.
