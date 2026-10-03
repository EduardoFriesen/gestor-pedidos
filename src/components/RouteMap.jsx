import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const RouteMap = forwardRef(function RouteMap({ startCoords, deliveryCoords, lines, onReady }, ref) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)

  useImperativeHandle(ref, () => ({
    getContainer: () => mapInstance.current?.getContainer() || null
  }))

  const start = startCoords || null
  let deliveries = deliveryCoords
  if (!deliveries) deliveries = []
  const validCoords = (deliveries || []).filter(c => c)

  useEffect(() => {
    if (mapInstance.current) return
    if (!start && validCoords.length === 0) {
      if (onReady) onReady()
      return
    }
    if (!mapRef.current) return

    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false, preferCanvas: true })
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map)
    mapInstance.current = map

    if (start) {
      const greenIcon = L.divIcon({
        className: '',
        html: '<div style="width:14px;height:14px;background:#16a34a;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      })
      L.marker([start.lat, start.lng], { icon: greenIcon })
        .addTo(map)
        .bindPopup('Partida')
    }

    validCoords.forEach((c, i) => {
      const numIcon = L.divIcon({
        className: '',
        html: `<div style="width:18px;height:18px;background:#dc2626;color:#fff;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;box-shadow:0 1px 3px rgba(0,0,0,0.3)">${c.label ?? i + 1}</div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      })
      L.marker([c.lat, c.lng], { icon: numIcon }).addTo(map)
    })

    if (lines) {
      lines.forEach(line => {
        L.polyline(line.points, { color: '#2563eb', weight: line.dashed ? 3 : 4, opacity: 0.8, dashArray: line.dashed ? '6 4' : null }).addTo(map)
      })
    } else if (start && validCoords.length > 0) {
      const points = [[start.lat, start.lng], ...validCoords.map(c => [c.lat, c.lng])]
      L.polyline(points, { color: '#2563eb', weight: 3, opacity: 0.8, dashArray: '6 4' }).addTo(map)
    }

    const allPoints = []
    if (start) allPoints.push([start.lat, start.lng])
    validCoords.forEach(c => allPoints.push([c.lat, c.lng]))
    if (lines) lines.forEach(line => line.points.forEach(p => allPoints.push(p)))

    if (allPoints.length === 1) {
      map.setView(allPoints[0], 13)
    } else if (allPoints.length > 0) {
      map.fitBounds(allPoints, { padding: [30, 30] })
    }

    let readyFired = false

    const fireReady = () => {
      if (readyFired) return
      readyFired = true
      clearTimeout(fallbackTimer)
      map.invalidateSize()
      if (onReady) onReady()
    }

    const fallbackTimer = setTimeout(() => fireReady(), 8000)
    const sizeTimer = setTimeout(() => map.invalidateSize(), 0)

    tiles.on('load', fireReady)

    return () => {
      clearTimeout(fallbackTimer)
      clearTimeout(sizeTimer)
      tiles.off('load', fireReady)
      map.remove()
      mapInstance.current = null
    }
  }, [startCoords, deliveryCoords, lines])

  if (!start && validCoords.length === 0) {
    return <div style={{ width: '100%', height: '300px' }} />
  }

  return (
    <div
      ref={mapRef}
      style={{ width: '100%', height: '300px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
    />
  )
})

export default RouteMap