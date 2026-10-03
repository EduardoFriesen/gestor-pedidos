const NEAR_RADIUS_M = 15000
const NEAR_VIEWBOX_DEG = 0.5

async function searchNominatim(query, near, countryCode) {
  const params = new URLSearchParams({ q: query, format: 'json', limit: '10' })
  if (near) {
    const d = NEAR_VIEWBOX_DEG
    params.set('viewbox', [near.lng - d, near.lat + d, near.lng + d, near.lat - d].join(','))
  }
  if (countryCode) params.set('countrycodes', countryCode.toLowerCase())
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { headers: { 'User-Agent': 'PiuApp/1.1' } })
    if (!res.ok) return []
    const data = await res.json()
    return (data || []).map(r => ({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), label: r.display_name || '', exact: /^\s*\d/.test(r.display_name || '') }))
  } catch {
    return []
  }
}

export function pickNearest(candidates, near) {
  if (!candidates || candidates.length === 0) return null
  if (!near) return candidates[0]
  let best = null
  let bestDist = Infinity
  for (const c of candidates) {
    const dist = getDistance(near.lat, near.lng, c.lat, c.lng)
    if (dist < bestDist) {
      best = c
      bestDist = dist
    }
  }
  return best
}

export function stripStreetNumber(address) {
  const [street, ...rest] = address.split(',')
  const bare = street.replace(/\s+\d+\s*$/, '').trim()
  return [bare, ...rest.map(r => r.trim())].filter(Boolean).join(', ')
}

export async function geocodeAddress(address, near = null, countryCode = null) {
  if (!address || !address.trim()) return null
  const candidates = await searchNominatim(address, near, countryCode)
  let best = pickNearest(candidates, near)
  if (near && (!best || getDistance(near.lat, near.lng, best.lat, best.lng) > NEAR_RADIUS_M)) {
    const bare = stripStreetNumber(address)
    if (bare && bare !== address) {
      await delay(1100)
      best = pickNearest([...candidates, ...await searchNominatim(bare, near, countryCode)], near)
    }
  }
  return best
}

export function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(Math.min(1, Math.max(0, a))), Math.sqrt(1 - Math.min(1, Math.max(0, a))))
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

let deviceLocationCache = null

export async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const addr = data.address || {}
    return {
      city: addr.city || addr.town || addr.village || addr.county || null,
      countryCode: addr.country_code || null
    }
  } catch {
    return null
  }
}

async function geolocateByIP() {
  try {
    const res = await fetch('https://ipapi.co/json/')
    if (res.ok) {
      const data = await res.json()
      if (data.latitude && data.longitude) {
        return { coords: { lat: data.latitude, lng: data.longitude }, city: data.city || null, countryCode: data.country_code || null }
      }
    }
  } catch {}
  try {
    const res = await fetch('https://api.bigdatacloud.net/data/client-ip-geolocation?localityLanguage=es')
    if (res.ok) {
      const data = await res.json()
      if (data.latitude && data.longitude) {
        return { coords: { lat: data.latitude, lng: data.longitude }, city: data.city || null, countryCode: data.countryCode || null }
      }
    }
  } catch {}
  return null
}

export function clearDeviceLocationCache() {
  deviceLocationCache = null
}

export async function getAutoLocation() {
  let result = null
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 5000, maximumAge: 120000 })
      })
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      const place = await reverseGeocode(coords.lat, coords.lng)
      result = { coords, city: place?.city || null, countryCode: place?.countryCode || null, method: 'gps' }
    } catch {}
  }
  if (!result) result = await geolocateByIP()
  return result
}

export async function getDeviceLocation() {
  if (deviceLocationCache) return deviceLocationCache
  let result = null
  try {
    const saved = await window.piu?.getStartLocation?.()
    if (saved && Number.isFinite(saved.lat) && Number.isFinite(saved.lng)) {
      result = { coords: { lat: saved.lat, lng: saved.lng }, city: saved.city || null, countryCode: saved.countryCode || null, method: 'manual' }
    }
  } catch {}
  if (!result) result = await getAutoLocation()
  if (!result) return null
  deviceLocationCache = result
  return result
}

export async function buildRoute(orders) {
  const deviceLoc = await getDeviceLocation()
  const startCoords = deviceLoc?.coords ?? null
  const city = deviceLoc?.city ?? null
  const results = []

  for (const order of orders) {
    await delay(1100)
    const addr = order.client_address || order.address || ''
    const locality = order.client_locality || order.locality || city
    const geoAddr = addr ? [addr, locality].filter(Boolean).join(', ') : ''
    order._geoQuery = geoAddr
    const coords = geoAddr ? await geocodeAddress(geoAddr, startCoords, deviceLoc?.countryCode) : null
    if (coords && startCoords) {
      order._distance = getDistance(startCoords.lat, startCoords.lng, coords.lat, coords.lng)
      order._coords = { lat: coords.lat, lng: coords.lng }
    } else {
      order._distance = Infinity
      order._coords = null
    }
    results.push(order)
  }

  const grouped = {}
  for (const order of results) {
    const day = order.delivery_day || 'viernes'
    if (!grouped[day]) grouped[day] = []
    grouped[day].push(order)
  }

  const sorted = {}
  const stats = {}
  for (const [day, dayOrders] of Object.entries(grouped)) {
    const located = dayOrders.filter(o => o._coords)
    const missing = dayOrders.filter(o => !o._coords)
    const result = await optimizeStops(startCoords, located.map(o => o._coords))
    sorted[day] = [...result.order.map(i => located[i]), ...missing]
    stats[day] = { distance: result.distance, duration: result.duration, geometry: result.geometry, method: result.method }
  }

  return { route: sorted, startCoords, city, stats }
}

const OSRM_TRIP_URL = 'https://router.project-osrm.org/trip/v1/driving/'
const OSRM_MAX_POINTS = 90
const OSRM_TIMEOUT_MS = 10000

function pathLength(start, stops, order) {
  let total = 0
  let prev = start
  for (const i of order) {
    if (prev) total += getDistance(prev.lat, prev.lng, stops[i].lat, stops[i].lng)
    prev = stops[i]
  }
  return total
}

export function optimizeStopsLocal(start, stops) {
  const n = stops.length
  if (n === 0) return []
  const remaining = new Set(stops.map((_, i) => i))
  const order = []
  let current = start
  if (!current) {
    order.push(0)
    remaining.delete(0)
    current = stops[0]
  }
  while (remaining.size > 0) {
    let best = null
    let bestDist = Infinity
    for (const i of remaining) {
      const d = getDistance(current.lat, current.lng, stops[i].lat, stops[i].lng)
      if (d < bestDist) {
        best = i
        bestDist = d
      }
    }
    order.push(best)
    remaining.delete(best)
    current = stops[best]
  }
  let improved = true
  let bestLen = pathLength(start, stops, order)
  while (improved) {
    improved = false
    for (let i = start ? 0 : 1; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const candidate = [...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)]
        const len = pathLength(start, stops, candidate)
        if (len < bestLen - 1e-6) {
          order.splice(0, n, ...candidate)
          bestLen = len
          improved = true
        }
      }
    }
  }
  return order
}

async function optimizeStopsOsrm(start, stops, baseUrl) {
  const points = start ? [start, ...stops] : stops
  const coordStr = points.map(p => `${p.lng},${p.lat}`).join(';')
  const params = new URLSearchParams({
    source: start ? 'first' : 'any',
    destination: 'any',
    roundtrip: 'false',
    overview: 'full',
    geometries: 'geojson'
  })
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS)
  try {
    const res = await fetch(`${baseUrl}${coordStr}?${params.toString()}`, { signal: controller.signal })
    if (!res.ok) return null
    const data = await res.json()
    if (data.code !== 'Ok' || !data.trips?.[0] || !data.waypoints) return null
    const offset = start ? 1 : 0
    const order = data.waypoints
      .map((w, i) => ({ input: i, pos: w.waypoint_index }))
      .filter(w => w.input >= offset)
      .sort((a, b) => a.pos - b.pos)
      .map(w => w.input - offset)
    if (order.length !== stops.length) return null
    const trip = data.trips[0]
    return {
      order,
      distance: trip.distance,
      duration: trip.duration,
      geometry: (trip.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng]),
      method: 'osrm'
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function optimizeStops(start, stops, { osrmUrl = OSRM_TRIP_URL } = {}) {
  if (!stops || stops.length === 0) return { order: [], distance: 0, duration: 0, geometry: null, method: 'recta' }
  const pointCount = stops.length + (start ? 1 : 0)
  if (pointCount >= 2 && pointCount <= OSRM_MAX_POINTS) {
    const osrm = await optimizeStopsOsrm(start, stops, osrmUrl)
    if (osrm) return osrm
  }
  const order = optimizeStopsLocal(start, stops)
  return { order, distance: pathLength(start, stops, order), duration: null, geometry: null, method: 'recta' }
}

const MAPS_MAX_WAYPOINTS = 9

function mapsStop(order) {
  if (order._coords) return `${order._coords.lat},${order._coords.lng}`
  return order._geoQuery || null
}

function mapsDirUrl(origin, stops) {
  const params = new URLSearchParams({ api: '1', travelmode: 'driving' })
  if (origin) params.set('origin', origin)
  params.set('destination', stops[stops.length - 1])
  if (stops.length > 1) params.set('waypoints', stops.slice(0, -1).join('|'))
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export function buildMapsLinks(route, startCoords) {
  const links = {}
  for (const [day, orders] of Object.entries(route || {})) {
    const stops = orders.map(mapsStop).filter(Boolean)
    if (stops.length === 0) continue
    const urls = []
    let origin = startCoords ? `${startCoords.lat},${startCoords.lng}` : null
    for (let i = 0; i < stops.length; i += MAPS_MAX_WAYPOINTS + 1) {
      const chunk = stops.slice(i, i + MAPS_MAX_WAYPOINTS + 1)
      urls.push(mapsDirUrl(origin, chunk))
      origin = chunk[chunk.length - 1]
    }
    links[day] = urls
  }
  return links
}
