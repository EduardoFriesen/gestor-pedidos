export const UNIT_FAMILIES = {
  weight: ['kg', 'g', 'mg'],
  volume: ['l', 'ml'],
  count: ['uni', 'doc'],
  culinary: ['cda', 'cdta', 'taza', 'pizca']
}

export const TO_BASE = {
  kg: 1,
  g: 0.001,
  mg: 0.000001,
  l: 1,
  ml: 0.001,
  uni: 1,
  doc: 12,
  cda: 1,
  cdta: 1 / 3,
  taza: 16,
  pizca: 1 / 16
}

export function getFamily(unit) {
  for (const [, members] of Object.entries(UNIT_FAMILIES)) {
    if (members.includes(unit)) return members
  }
  return null
}

export function getCompatibleUnits(unit) {
  return getFamily(unit) || [unit]
}

export function convertValue(value, fromUnit, toUnit) {
  if (!fromUnit || !toUnit || fromUnit === toUnit) return value
  const base = TO_BASE[fromUnit]
  const target = TO_BASE[toUnit]
  if (base == null || target == null) return value
  return (value * base) / target
}
