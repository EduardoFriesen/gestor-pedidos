const STOP_FIELDS = ['_coords', '_distance', '_geoQuery', '_mapsQuery']

export function routeCacheKey(deliveryOrders, startLocation) {
  const orders = [...deliveryOrders]
    .sort((x, y) => x.id - y.id)
    .map(o => [o.id, o.client_address || o.address || '', o.client_locality || o.locality || '', o.delivery_day || 'viernes'])
  const start = startLocation && Number.isFinite(startLocation.lat) && Number.isFinite(startLocation.lng)
    ? [startLocation.lat, startLocation.lng]
    : 'auto'
  return JSON.stringify({ orders, start })
}

export function serializeRoute({ route, startCoords, city, stats }) {
  const days = {}
  const stops = {}
  for (const [day, orders] of Object.entries(route || {})) {
    days[day] = orders.map(o => o.id)
    for (const o of orders) {
      const stop = {}
      for (const field of STOP_FIELDS) stop[field] = o[field] ?? null
      if (!Number.isFinite(stop._distance)) stop._distance = null
      stops[o.id] = stop
    }
  }
  return { days, stops, startCoords: startCoords || null, city: city || null, stats: stats || {} }
}

export function restoreRoute(cache, deliveryOrders) {
  if (!cache?.days || !cache?.stops) return null
  const byId = new Map(deliveryOrders.map(o => [o.id, o]))
  const route = {}
  for (const [day, ids] of Object.entries(cache.days)) {
    route[day] = []
    for (const id of ids) {
      const order = byId.get(id)
      const stop = cache.stops[id]
      if (!order || !stop) return null
      route[day].push({ ...order, ...stop, _distance: stop._distance ?? Infinity })
    }
  }
  return { route, startCoords: cache.startCoords || null, city: cache.city || null, stats: cache.stats || {} }
}
