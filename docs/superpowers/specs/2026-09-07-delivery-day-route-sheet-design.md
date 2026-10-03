# Delivery Day Selection + Route Sheet PDF

## Overview

Add a delivery day selector to the order form and generate a PDF route sheet ("Hoja de Ruta") that groups deliveries by day, orders them by geographic proximity, and shows a map with the route.

## Requirements

1. **Delivery day field**: When `has_delivery = true`, a day-of-week selector appears (Lunes–Domingo, default: Viernes).
2. **Route sheet PDF**: Groups deliveries by day, orders by proximity from a starting address, shows a map with markers and route polyline.
3. **Geocoding**: Uses Nominatim (OSM) to geocode addresses. Addresses that fail geocoding go at the end of the list.
4. **Map in PDF**: Leaflet map rendered in a hidden div, captured with html2canvas, embedded in the PDF.
5. **Starting address**: Stored in `data.deliverySettings.startAddress`. Prompted on first use if not set.

## Data Model Changes

### Order record (store.js)

```js
{
  // ... existing fields ...
  delivery_day: 'viernes'  // string: 'lunes'|'martes'|...'|'domingo', null if no delivery
}
```

### Settings (store.js)

```js
data.deliverySettings = {
  defaultFee: 500,
  startAddress: 'Av. Corrientes 1234, CABA'  // NEW: kitchen/start address for routing
}
```

## UI Changes

### Order form (Orders.jsx lines 800-845)

When `has_delivery = true`, below the delivery fee input:

```
Envío a domicilio          [No] [Sí]
  $500  Recargo por envío      [Guardar]
  📅 Día de envío    [Viernes ▾]
```

The `<select>` offers all 7 days. Default value is `'viernes'`.

### Orders page header (Orders.jsx lines 464-471)

New button "Hoja de Ruta" next to "Etiquetas":

```
[Etiquetas] [Hoja de Ruta] [+ Pedido]
```

Disabled in historical mode. On click:
1. If no `startAddress` saved → show input prompt
2. Fetch orders for current week
3. Filter `has_delivery === true`
4. Geocode start address + all delivery addresses
5. Sort by distance within each delivery_day group
6. Generate PDF with map + tables

### Start address prompt

A simple modal with a text input for the starting address. Only shown once (stored in settings). Can be changed later via a settings mechanism or re-prompted.

## PDF Layout

### Page per delivery day

Each day with deliveries gets its own section (or page if many deliveries):

```
PIU — Hoja de Ruta
Viernes 05/09/2026
Partida: Av. Corrientes 1234, CABA

┌────┬──────────────┬─────────────────────┬────────┐
│ N° │ Nombre       │ Dirección           │ Monto  │
├────┼──────────────┼─────────────────────┼────────┤
│ 1  │ Juan Pérez   │ Av. Libertador 500  │ $4.300 │
│ 2  │ Ana Gómez    │ Corrientes 348      │ $1.920 │
│ 3  │ Carlos López │ Belgrano 890        │ $4.500 │
└────┴──────────────┴─────────────────────┴────────┘

[Mapa: markers + polyline route]
```

### Map rendering

- Leaflet map with OpenStreetMap tiles
- Markers: green for start point, red for deliveries (numbered)
- Polyline: blue line connecting points in route order
- Captured as PNG via html2canvas, embedded in PDF
- Map size: full page width, ~100mm height

### Ungeocoded addresses

Addresses that Nominatim cannot resolve:
- Placed at the end of the day's table
- No N° assigned (or assigned after geocoded ones)
- Marker on map: grey, no polyline connection

## Geocoding (src/utils/geocode.js)

### Functions

```js
geocodeAddress(address) → { lat, lng } | null
// Calls Nominatim API. Returns null on failure.

getDistance(lat1, lng1, lat2, lng2) → number (meters)
// Haversine formula.

buildRoute(startAddress, orders) → { sorted: Order[], ungeocoded: Order[] }
// Geocodes start + all addresses. Sorts by distance from start.
// Ungeocoded orders go to ungeocoded array.
```

### Nominatim API

```
GET https://nominatim.openstreetmap.org/search?q={address}&format=json&limit=1
Headers: { 'User-Agent': 'PiuApp/1.1' }
Rate limit: 1 req/sec (enforced with delay between requests)
```

### Error handling

- Network error → all orders go to ungeocoded
- Individual address failure → that order goes to ungeocoded
- No start address → prompt user, don't generate PDF

## New Dependencies

| Package | Purpose | Size |
|---------|---------|------|
| `leaflet` | Map rendering in hidden div | ~40KB |
| `html2canvas` | Capture map as PNG for PDF | ~30KB |

Both are well-maintained, widely used, and MIT licensed.

## Files to Modify

| File | Change |
|------|--------|
| `electron/store.js` | Add `delivery_day` to createOrder/updateOrder/enrichOrder, add `startAddress` to deliverySettings |
| `electron/main.js` | IPC handlers for startAddress |
| `electron/preload.js` | Expose startAddress getter/setter |
| `src/pages/Orders.jsx` | Day select in form, "Hoja de Ruta" button, start address prompt, geocoding flow |
| `src/utils/pdf.js` | New `generarHojaRuta(orders, startAddress, routeData)` |
| `src/utils/geocode.js` | **New** — geocoding + Haversine + route building |
| `src/components/RouteMap.jsx` | **New** — Leaflet map component for capture |
| `test.js` | Tests for delivery_day, geocode, route building |
| `test-e2e/mock.js` | Mocks for new IPC channels and geocode |
| `package.json` | Add leaflet, html2canvas |

## Testing Strategy

- Unit tests: `delivery_day` in createOrder/updateOrder, geocodeAddress mock, getDistance, buildRoute
- Integration: route sheet PDF generation with mocked geocode results
- Manual: verify map renders correctly, markers in right positions, polyline connects them
