const fs = require('fs')
const path = require('path')
const os = require('os')

const NOW = new Date()
const RNG = (() => {
  let seed = 42
  return () => { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646 }
})()

function randInt(min, max) {
  return Math.floor(RNG() * (max - min + 1)) + min
}

function pick(arr, count) {
  const shuffled = [...arr].sort(() => RNG() - 0.5)
  return shuffled.slice(0, count)
}

function pickOne(arr) {
  return arr[Math.floor(RNG() * arr.length)]
}

function fmtDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtDatetime(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}:${s}`
}

function getSunday(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d
}

function getSaturday(date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  const day = d.getDay()
  d.setDate(d.getDate() + (6 - day))
  return d
}

function getMonthlyRate(year) {
  if (year <= 2022) return 0.04
  if (year === 2023) return 0.065
  if (year === 2024) return 0.055
  if (year === 2025) return 0.045
  return 0.035
}

// ============== INGREDIENT CATALOG ==============
// Base prices as of 2022-01

const INGREDIENT_CATALOG = [
  { name: 'Harina 0000', unit: 'kg', cost: 45, category: 'Secos' },
  { name: 'Agua', unit: 'l', cost: 0.3, category: 'Básicos' },
  { name: 'Levadura fresca', unit: 'g', cost: 0.15, category: 'Secos' },
  { name: 'Sal', unit: 'kg', cost: 15, category: 'Secos' },
  { name: 'Muzzarella', unit: 'kg', cost: 240, category: 'Lácteos' },
  { name: 'Salsa de tomate', unit: 'l', cost: 90, category: 'Conservas' },
  { name: 'Aceite de oliva', unit: 'l', cost: 450, category: 'Aceites' },
  { name: 'Tomate perita', unit: 'kg', cost: 25, category: 'Verduras' },
  { name: 'Ajo', unit: 'kg', cost: 180, category: 'Verduras' },
  { name: 'Cebolla', unit: 'kg', cost: 15, category: 'Verduras' },
  { name: 'Orégano', unit: 'g', cost: 0.3, category: 'Especias' },
  { name: 'Jamón cocido', unit: 'kg', cost: 360, category: 'Fiambres' },
  { name: 'Morrón', unit: 'kg', cost: 150, category: 'Verduras' },
  { name: 'Aceitunas verdes', unit: 'kg', cost: 250, category: 'Conservas' },
  { name: 'Huevo', unit: 'uni', cost: 15, category: 'Huevos' },
  { name: 'Longaniza', unit: 'kg', cost: 300, category: 'Carnes' },
  { name: 'Tapas para empanada', unit: 'doc', cost: 60, category: 'Masa' },
  { name: 'Carne (cortada a cuchillo)', unit: 'kg', cost: 450, category: 'Carnes' },
  { name: 'Comino', unit: 'g', cost: 0.25, category: 'Especias' },
  { name: 'Pimentón', unit: 'g', cost: 0.2, category: 'Especias' },
  { name: 'Grasa de pella', unit: 'kg', cost: 90, category: 'Grasas' },
  { name: 'Ají molido', unit: 'g', cost: 0.2, category: 'Especias' },
  { name: 'Pollo', unit: 'kg', cost: 240, category: 'Carnes' },
  { name: 'Crema de leche', unit: 'l', cost: 180, category: 'Lácteos' },
  { name: 'Choclo', unit: 'kg', cost: 120, category: 'Verduras' },
  { name: 'Salsa blanca', unit: 'l', cost: 120, category: 'Salsas' },
  { name: 'Albahaca', unit: 'g', cost: 0.3, category: 'Especias' },
  { name: 'Queso cremoso', unit: 'kg', cost: 270, category: 'Lácteos' },
  { name: 'Tapas de tarta', unit: 'doc', cost: 75, category: 'Masa' },
  { name: 'Zapallito', unit: 'kg', cost: 80, category: 'Verduras' },
  { name: 'Zanahoria', unit: 'kg', cost: 12, category: 'Verduras' },
  { name: 'Calabaza', unit: 'kg', cost: 60, category: 'Verduras' },
  { name: 'Nuez moscada', unit: 'g', cost: 1, category: 'Especias' },
  { name: 'Espinaca', unit: 'kg', cost: 90, category: 'Verduras' },
  { name: 'Ricota', unit: 'kg', cost: 150, category: 'Lácteos' },
  { name: 'Queso rallado', unit: 'kg', cost: 210, category: 'Lácteos' },
  { name: 'Carne picada', unit: 'kg', cost: 360, category: 'Carnes' },
  { name: 'Papa', unit: 'kg', cost: 30, category: 'Verduras' },
  { name: 'Láminas de pasta', unit: 'kg', cost: 120, category: 'Masa' },
  { name: 'Lomo', unit: 'kg', cost: 750, category: 'Carnes' },
  { name: 'Pan de miga', unit: 'uni', cost: 45, category: 'Pan' },
  { name: 'Lechuga', unit: 'kg', cost: 60, category: 'Verduras' },
  { name: 'Mayonesa', unit: 'l', cost: 120, category: 'Salsas' },
  { name: 'Milanesa de carne', unit: 'kg', cost: 600, category: 'Carnes' },
  { name: 'Medallón de garbanzo', unit: 'uni', cost: 90, category: 'Congelados' },
  { name: 'Pan integral', unit: 'uni', cost: 36, category: 'Pan' },
  { name: 'Palta', unit: 'kg', cost: 300, category: 'Verduras' },
  { name: 'Mostaza', unit: 'l', cost: 105, category: 'Salsas' },
  { name: 'Bondiola', unit: 'kg', cost: 540, category: 'Carnes' },
  { name: 'Cebolla morada', unit: 'kg', cost: 110, category: 'Verduras' },
  { name: 'Salsa criolla', unit: 'l', cost: 90, category: 'Salsas' },
  { name: 'Pan de hamburguesa', unit: 'uni', cost: 30, category: 'Pan' },
  { name: 'Queso cheddar', unit: 'kg', cost: 300, category: 'Lácteos' },
  { name: 'Panceta', unit: 'kg', cost: 450, category: 'Fiambres' },
  { name: 'Papas fritas (congeladas)', unit: 'kg', cost: 120, category: 'Congelados' },
  { name: 'Harina integral', unit: 'kg', cost: 55, category: 'Secos' },
  { name: 'Fideos secos', unit: 'kg', cost: 50, category: 'Pasta' },
  { name: 'Lentejas', unit: 'kg', cost: 80, category: 'Legumbres' },
  { name: 'Arroz', unit: 'kg', cost: 35, category: 'Secos' },
  { name: 'Puré de tomate', unit: 'l', cost: 60, category: 'Conservas' },
  { name: 'Vino tinto', unit: 'l', cost: 200, category: 'Bebidas' },
  { name: 'Laurel', unit: 'g', cost: 0.3, category: 'Especias' },
  { name: 'Tomillo', unit: 'g', cost: 0.4, category: 'Especias' },
  { name: 'Perejil', unit: 'g', cost: 0.2, category: 'Especias' },
  { name: 'Caldo de carne', unit: 'uni', cost: 10, category: 'Caldos' },
  { name: 'Batata', unit: 'kg', cost: 45, category: 'Verduras' },
  { name: 'Huevo duro', unit: 'uni', cost: 16, category: 'Huevos' },
  { name: 'Masa para pizza', unit: 'uni', cost: 0, category: 'Masa' },
  { name: 'Salsa filetto', unit: 'l', cost: 0, category: 'Salsas' },
  { name: 'Salsa bolognesa', unit: 'l', cost: 0, category: 'Salsas' },
]

// ============== DISHES ==============

const DISH_TEMPLATES = {
  Pizzas: [
    { name: 'Muzzarella', price: 3800, ingr: [{ name: 'Masa para pizza', qty: 1 }, { name: 'Muzzarella', qty: 0.2 }, { name: 'Salsa de tomate', qty: 0.1 }, { name: 'Aceite de oliva', qty: 0.03 }] },
    { name: 'Napolitana', price: 4200, ingr: [{ name: 'Masa para pizza', qty: 1 }, { name: 'Muzzarella', qty: 0.2 }, { name: 'Salsa de tomate', qty: 0.1 }, { name: 'Tomate perita', qty: 0.3 }, { name: 'Ajo', qty: 0.01 }, { name: 'Aceite de oliva', qty: 0.03 }] },
    { name: 'Fugazzeta', price: 4500, ingr: [{ name: 'Masa para pizza', qty: 1 }, { name: 'Muzzarella', qty: 0.25 }, { name: 'Cebolla', qty: 0.3 }, { name: 'Aceite de oliva', qty: 0.03 }, { name: 'Orégano', qty: 5 }] },
    { name: 'Especial', price: 4800, ingr: [{ name: 'Masa para pizza', qty: 1 }, { name: 'Muzzarella', qty: 0.2 }, { name: 'Salsa de tomate', qty: 0.1 }, { name: 'Jamón cocido', qty: 0.1 }, { name: 'Morrón', qty: 0.15 }, { name: 'Aceitunas verdes', qty: 0.05 }, { name: 'Huevo', qty: 1 }] },
    { name: 'Calabresa', price: 4600, ingr: [{ name: 'Masa para pizza', qty: 1 }, { name: 'Muzzarella', qty: 0.2 }, { name: 'Salsa de tomate', qty: 0.1 }, { name: 'Longaniza', qty: 0.15 }, { name: 'Morrón', qty: 0.15 }, { name: 'Aceite de oliva', qty: 0.03 }] },
  ],
  Empanadas: [
    { name: 'Carne cortada a cuchillo', price: 3200, ingr: [{ name: 'Tapas para empanada', qty: 1 }, { name: 'Carne (cortada a cuchillo)', qty: 0.08 }, { name: 'Cebolla', qty: 0.06 }, { name: 'Huevo duro', qty: 0.2 }, { name: 'Aceitunas verdes', qty: 0.01 }, { name: 'Comino', qty: 2 }, { name: 'Pimentón', qty: 2 }, { name: 'Grasa de pella', qty: 0.01 }] },
    { name: 'Carne picante', price: 3400, ingr: [{ name: 'Tapas para empanada', qty: 1 }, { name: 'Carne (cortada a cuchillo)', qty: 0.08 }, { name: 'Cebolla', qty: 0.06 }, { name: 'Ají molido', qty: 3 }, { name: 'Huevo duro', qty: 0.2 }, { name: 'Aceitunas verdes', qty: 0.01 }, { name: 'Pimentón', qty: 2 }] },
    { name: 'Pollo', price: 3000, ingr: [{ name: 'Tapas para empanada', qty: 1 }, { name: 'Pollo', qty: 0.06 }, { name: 'Cebolla', qty: 0.05 }, { name: 'Morrón', qty: 0.03 }, { name: 'Crema de leche', qty: 0.02 }, { name: 'Comino', qty: 2 }, { name: 'Huevo duro', qty: 0.15 }] },
    { name: 'Jamón y queso', price: 2800, ingr: [{ name: 'Tapas para empanada', qty: 1 }, { name: 'Jamón cocido', qty: 0.03 }, { name: 'Muzzarella', qty: 0.04 }, { name: 'Crema de leche', qty: 0.01 }] },
    { name: 'Humita', price: 2900, ingr: [{ name: 'Tapas para empanada', qty: 1 }, { name: 'Choclo', qty: 0.08 }, { name: 'Cebolla', qty: 0.03 }, { name: 'Salsa blanca', qty: 0.04 }, { name: 'Albahaca', qty: 3 }, { name: 'Queso cremoso', qty: 0.02 }] },
  ],
  Tartas: [
    { name: 'Pollo y verduras', price: 3500, ingr: [{ name: 'Tapas de tarta', qty: 1 }, { name: 'Pollo', qty: 0.06 }, { name: 'Cebolla', qty: 0.05 }, { name: 'Zapallito', qty: 0.05 }, { name: 'Zanahoria', qty: 0.05 }, { name: 'Crema de leche', qty: 0.02 }, { name: 'Huevo', qty: 0.5 }] },
    { name: 'Calabaza', price: 3300, ingr: [{ name: 'Tapas de tarta', qty: 1 }, { name: 'Calabaza', qty: 0.15 }, { name: 'Cebolla', qty: 0.04 }, { name: 'Queso cremoso', qty: 0.03 }, { name: 'Crema de leche', qty: 0.02 }, { name: 'Nuez moscada', qty: 1 }, { name: 'Huevo', qty: 0.5 }] },
    { name: 'Espinaca y ricota', price: 3400, ingr: [{ name: 'Tapas de tarta', qty: 1 }, { name: 'Espinaca', qty: 0.1 }, { name: 'Ricota', qty: 0.05 }, { name: 'Ajo', qty: 0.005 }, { name: 'Huevo', qty: 0.5 }, { name: 'Queso rallado', qty: 0.01 }] },
    { name: 'Zapallito', price: 3200, ingr: [{ name: 'Tapas de tarta', qty: 1 }, { name: 'Zapallito', qty: 0.15 }, { name: 'Cebolla', qty: 0.05 }, { name: 'Queso cremoso', qty: 0.03 }, { name: 'Huevo', qty: 0.5 }, { name: 'Albahaca', qty: 3 }] },
    { name: 'Choclo', price: 3300, ingr: [{ name: 'Tapas de tarta', qty: 1 }, { name: 'Choclo', qty: 0.15 }, { name: 'Cebolla', qty: 0.04 }, { name: 'Crema de leche', qty: 0.03 }, { name: 'Huevo', qty: 0.5 }, { name: 'Pimentón', qty: 2 }] },
  ],
  Sandwiches: [
    { name: 'Lomito completo', price: 5200, ingr: [{ name: 'Lomo', qty: 0.15 }, { name: 'Pan de miga', qty: 1 }, { name: 'Lechuga', qty: 0.02 }, { name: 'Tomate perita', qty: 0.05 }, { name: 'Huevo', qty: 0.5 }, { name: 'Jamón cocido', qty: 0.03 }, { name: 'Queso cremoso', qty: 0.03 }, { name: 'Papas fritas (congeladas)', qty: 0.1 }] },
    { name: 'Milanesa', price: 4800, ingr: [{ name: 'Milanesa de carne', qty: 0.15 }, { name: 'Pan de miga', qty: 1 }, { name: 'Lechuga', qty: 0.02 }, { name: 'Tomate perita', qty: 0.05 }, { name: 'Mayonesa', qty: 0.02 }, { name: 'Jamón cocido', qty: 0.03 }, { name: 'Queso cremoso', qty: 0.03 }] },
    { name: 'Veggie', price: 4200, ingr: [{ name: 'Medallón de garbanzo', qty: 1 }, { name: 'Pan integral', qty: 1 }, { name: 'Lechuga', qty: 0.02 }, { name: 'Tomate perita', qty: 0.05 }, { name: 'Palta', qty: 0.05 }, { name: 'Mostaza', qty: 0.01 }] },
    { name: 'Bondiola', price: 5000, ingr: [{ name: 'Bondiola', qty: 0.15 }, { name: 'Pan de miga', qty: 1 }, { name: 'Lechuga', qty: 0.02 }, { name: 'Tomate perita', qty: 0.05 }, { name: 'Cebolla morada', qty: 0.03 }, { name: 'Salsa criolla', qty: 0.02 }] },
    { name: 'Hamburguesa artesanal', price: 4600, ingr: [{ name: 'Carne picada', qty: 0.15 }, { name: 'Pan de hamburguesa', qty: 1 }, { name: 'Lechuga', qty: 0.02 }, { name: 'Tomate perita', qty: 0.05 }, { name: 'Queso cheddar', qty: 0.03 }, { name: 'Panceta', qty: 0.03 }, { name: 'Papas fritas (congeladas)', qty: 0.1 }] },
  ],
  Pastas: [
    { name: 'Ravioles de ricota y espinaca', price: 4200, ingr: [{ name: 'Harina 0000', qty: 0.1 }, { name: 'Huevo', qty: 1.5 }, { name: 'Ricota', qty: 0.08 }, { name: 'Espinaca', qty: 0.05 }, { name: 'Salsa filetto', qty: 0.12 }, { name: 'Queso rallado', qty: 0.01 }] },
    { name: 'Tallarines al huevo', price: 3800, ingr: [{ name: 'Harina 0000', qty: 0.1 }, { name: 'Huevo', qty: 1.5 }, { name: 'Salsa bolognesa', qty: 0.15 }, { name: 'Queso rallado', qty: 0.01 }] },
    { name: 'Ñoquis de papa', price: 3600, ingr: [{ name: 'Papa', qty: 0.2 }, { name: 'Harina 0000', qty: 0.06 }, { name: 'Huevo', qty: 0.3 }, { name: 'Salsa filetto', qty: 0.12 }, { name: 'Queso rallado', qty: 0.01 }, { name: 'Sal', qty: 0.002 }] },
    { name: 'Sorrentinos de jamón y queso', price: 4400, ingr: [{ name: 'Harina 0000', qty: 0.1 }, { name: 'Huevo', qty: 1.5 }, { name: 'Jamón cocido', qty: 0.05 }, { name: 'Muzzarella', qty: 0.05 }, { name: 'Ricota', qty: 0.03 }, { name: 'Crema de leche', qty: 0.05 }] },
    { name: 'Lasagna', price: 4800, ingr: [{ name: 'Láminas de pasta', qty: 0.12 }, { name: 'Carne picada', qty: 0.1 }, { name: 'Salsa filetto', qty: 0.08 }, { name: 'Salsa blanca', qty: 0.06 }, { name: 'Muzzarella', qty: 0.08 }, { name: 'Ricota', qty: 0.04 }] },
    { name: 'Fettuccine Alfredo', price: 4000, ingr: [{ name: 'Harina 0000', qty: 0.1 }, { name: 'Huevo', qty: 1.5 }, { name: 'Crema de leche', qty: 0.1 }, { name: 'Queso rallado', qty: 0.03 }, { name: 'Nuez moscada', qty: 1 }] },
    { name: 'Canelones', price: 4300, ingr: [{ name: 'Láminas de pasta', qty: 0.1 }, { name: 'Espinaca', qty: 0.08 }, { name: 'Ricota', qty: 0.06 }, { name: 'Salsa filetto', qty: 0.1 }, { name: 'Salsa blanca', qty: 0.06 }, { name: 'Queso rallado', qty: 0.01 }] },
    { name: 'Pappardelle al ragú', price: 4500, ingr: [{ name: 'Harina 0000', qty: 0.1 }, { name: 'Huevo', qty: 1.5 }, { name: 'Carne picada', qty: 0.1 }, { name: 'Puré de tomate', qty: 0.08 }, { name: 'Vino tinto', qty: 0.03 }, { name: 'Zanahoria', qty: 0.03 }, { name: 'Laurel', qty: 1 }, { name: 'Queso rallado', qty: 0.01 }] },
  ],
  Guisos: [
    { name: 'Goulash', price: 4000, ingr: [{ name: 'Carne picada', qty: 0.15 }, { name: 'Cebolla', qty: 0.08 }, { name: 'Morrón', qty: 0.05 }, { name: 'Papa', qty: 0.1 }, { name: 'Puré de tomate', qty: 0.08 }, { name: 'Vino tinto', qty: 0.03 }, { name: 'Pimentón', qty: 5 }, { name: 'Laurel', qty: 1 }] },
    { name: 'Estofado de carne', price: 4200, ingr: [{ name: 'Carne (cortada a cuchillo)', qty: 0.15 }, { name: 'Cebolla', qty: 0.08 }, { name: 'Zanahoria', qty: 0.05 }, { name: 'Papa', qty: 0.1 }, { name: 'Calabaza', qty: 0.08 }, { name: 'Puré de tomate', qty: 0.06 }, { name: 'Vino tinto', qty: 0.03 }, { name: 'Laurel', qty: 1 }] },
    { name: 'Pollo al horno', price: 3800, ingr: [{ name: 'Pollo', qty: 0.2 }, { name: 'Papa', qty: 0.15 }, { name: 'Batata', qty: 0.1 }, { name: 'Cebolla', qty: 0.05 }, { name: 'Aceite de oliva', qty: 0.03 }, { name: 'Tomillo', qty: 3 }, { name: 'Sal', qty: 0.003 }] },
    { name: 'Carbonada', price: 4000, ingr: [{ name: 'Carne (cortada a cuchillo)', qty: 0.12 }, { name: 'Batata', qty: 0.1 }, { name: 'Calabaza', qty: 0.08 }, { name: 'Choclo', qty: 0.08 }, { name: 'Papa', qty: 0.08 }, { name: 'Arroz', qty: 0.05 }] },
    { name: 'Guiso de lentejas', price: 3500, ingr: [{ name: 'Lentejas', qty: 0.12 }, { name: 'Zanahoria', qty: 0.05 }, { name: 'Cebolla', qty: 0.05 }, { name: 'Papa', qty: 0.08 }, { name: 'Caldo de carne', qty: 1 }, { name: 'Pimentón', qty: 3 }, { name: 'Laurel', qty: 1 }] },
    { name: 'Milanesa a la napolitana', price: 4500, ingr: [{ name: 'Milanesa de carne', qty: 0.15 }, { name: 'Salsa de tomate', qty: 0.08 }, { name: 'Muzzarella', qty: 0.08 }, { name: 'Jamón cocido', qty: 0.05 }, { name: 'Papas fritas (congeladas)', qty: 0.15 }, { name: 'Orégano', qty: 3 }] },
  ],
  Extras: [
    { name: 'Ensalada César', price: 3200, ingr: [{ name: 'Lechuga', qty: 0.1 }, { name: 'Queso rallado', qty: 0.02 }, { name: 'Huevo duro', qty: 0.5 }, { name: 'Mayonesa', qty: 0.02 }, { name: 'Mostaza', qty: 0.01 }] },
    { name: 'Ensalada tropical', price: 3400, ingr: [{ name: 'Lechuga', qty: 0.1 }, { name: 'Palta', qty: 0.05 }, { name: 'Zanahoria', qty: 0.05 }, { name: 'Choclo', qty: 0.05 }, { name: 'Cebolla morada', qty: 0.02 }] },
    { name: 'Bruschetta', price: 2800, ingr: [{ name: 'Pan de miga', qty: 0.5 }, { name: 'Tomate perita', qty: 0.08 }, { name: 'Albahaca', qty: 5 }, { name: 'Aceite de oliva', qty: 0.02 }, { name: 'Ajo', qty: 0.005 }] },
    { name: 'Tostado de jamón y queso', price: 3000, ingr: [{ name: 'Pan de miga', qty: 1 }, { name: 'Jamón cocido', qty: 0.05 }, { name: 'Queso cremoso', qty: 0.05 }] },
  ],
}

const CORE_CATEGORIES = ['Pizzas', 'Empanadas', 'Tartas', 'Sandwiches']
const ROTATION_CATEGORIES = ['Pastas', 'Guisos', 'Extras']

// ============== 200 CLIENTS ==============

const NAMES = [
  'Juan', 'Carlos', 'María', 'Laura', 'Diego', 'Ana', 'Pablo', 'Florencia',
  'Martín', 'Romina', 'Lucas', 'Sofía', 'Nicolás', 'Julieta', 'Fernando',
  'Valeria', 'Alejandro', 'Carolina', 'Gustavo', 'Luciana', 'Marcelo',
  'Gabriela', 'Sebastián', 'Verónica', 'Javier', 'Marcela', 'Leandro',
  'Silvina', 'Damián', 'Nadia', 'Federico', 'Belén', 'Andrés', 'Melina',
  'Ezequiel', 'Cinthia', 'Emiliano', 'Noelia', 'Cristian', 'Yamila',
  'Sergio', 'Evelyn', 'Matías', 'Daiana', 'Rodrigo', 'Ayelen', 'Julián',
  'Candela', 'Brian', 'Aldana', 'Kevin', 'Morena', 'Jonathan', 'Brisa',
  'Hernán', 'Milagros', 'Esteban', 'Lourdes', 'Maximiliano', 'Ramiro',
  'Soledad', 'Guillermo', 'Paula', 'Ignacio', 'Lorena', 'Franco', 'Virginia',
  'Agustín', 'Mercedes', 'Tomás', 'Celeste', 'Mauro', 'Andrea', 'Bruno',
  'Daniela', 'Facundo', 'Gisela', 'Leonardo', 'Tamara', 'Ricardo', 'Roxana',
  'Mario', 'Bárbara', 'Alberto', 'Gladys', 'Raúl', 'Stella', 'Oscar',
  'Mónica', 'Hugo', 'Patricia', 'Enrique', 'Graciela', 'Omar', 'Liliana',
  'Claudio', 'Adriana', 'Jorge', 'Mabel', 'Alfredo', 'Alicia', 'Rubén',
  'Elsa', 'Norberto', 'Susana', 'Osvaldo', 'Mirta', 'Pedro', 'Beatriz',
  'Angel', 'Norma', 'Walter', 'Irene', 'Néstor', 'Haydée', 'Víctor',
  'Nelida', 'Luis', 'Rosa', 'Mónica', 'Hector', 'Stella', 'Daniel',
  'Margarita', 'Ismael', 'Elena', 'Rolando', 'Carmen', 'César', 'Teresa',
  'Lorenzo', 'Claudia', 'Fabián', 'Pilar', 'Rafael', 'Eva', 'Mauricio',
  'Sandra', 'René', 'Diana', 'Gonzalo', 'Cecilia', 'Emilio', 'Ruth',
  'Raúl', 'Nora', 'Iván', 'Amalia', 'Alberto', 'Lidia', 'Vicente',
]

const LASTNAMES = [
  'González', 'Rodríguez', 'Martínez', 'López', 'Fernández', 'García',
  'Sánchez', 'Pérez', 'Gómez', 'Díaz', 'Torres', 'Álvarez', 'Ruiz',
  'Castro', 'Romero', 'Molina', 'Silva', 'Paz', 'Acosta', 'Ríos',
  'Medina', 'Herrera', 'Pereyra', 'Quintana', 'Vega', 'Ferreyra',
  'Campos', 'Aguirre', 'Luna', 'Bustos', 'Godoy', 'Sosa', 'Cabrera',
  'Villalba', 'Ojeda', 'Navarro', 'Ortiz', 'Chávez', 'Arias', 'Ramos',
  'Muñoz', 'Correa', 'Rivero', 'Peralta', 'Escobar', 'Benítez', 'Cuello',
  'Vázquez', 'Olivera', 'Ponce', 'Moreno', 'Castillo', 'Rivas', 'Suárez',
  'Santiago', 'Domínguez', 'Carrizo', 'Ledesma', 'Ávila', 'Roldán',
  'Juárez', 'Pereyra', 'Morales', 'Córdoba', 'Paz', 'Iglesias',
  'Giménez', 'Mendoza', 'Barrios', 'Montenegro', 'Santillán', 'Leiva',
  'Moyano', 'Moreira', 'Vera', 'Ferreira', 'Toledo', 'Aguilera',
  'Varela', 'Méndez', 'Roldán', 'Cruz', 'Velázquez', 'Rivas',
  'Barrionuevo', 'Lucero', 'Cortéz', 'Cabaña', 'Quiroga', 'Lobo',
  'Bazán', 'Villegas', 'Carranza', 'Martí', 'Guerra', 'Alarcón',
  'Vidal', 'Ponce', 'Calderón', 'Figueroa', 'Villagra', 'Maldonado',
  'Duarte', 'Britez', 'Oviedo', 'Mansilla', 'Saavedra', 'Funes',
  'Troncoso', 'Lencina', 'Cáceres', 'Benegas', 'Zalazar', 'Yañez',
  'Barreto', 'Cáceres', 'Aquino', 'Villalba', 'Leguizamón', 'Bogado',
  'Fernández', 'Báez', 'Ayala', 'Rojas', 'Alcaraz', 'Insaurralde',
]

const STREETS = [
  'Av. Corrientes', 'Av. Santa Fe', 'Callao', 'Córdoba', 'Florida',
  'Lavalle', 'Av. de Mayo', 'Belgrano', 'Rivadavia', 'San Martín',
  'Av. Cabildo', 'Av. Libertador', 'Bulnes', 'Acuña de Figueroa',
  'Av. Pueyrredón', 'Juncal', 'Paraguay', 'Uruguay', 'Viamonte',
  'Tucumán', 'Montevideo', 'Brasil', 'Carlos Calvo', 'Independencia',
  'Adolfo Alsina', 'Moreno', 'Cochabamba', 'Caseros', 'México',
  'Venezuela', 'Chacabuco', 'Piedras', 'Saavedra', 'Salta', 'Jujuy',
  'Lima', 'Cerrito', 'Talcalguano', 'Riobamba', 'Azcuénaga',
]

const LOCALITIES = [
  'Palermo', 'Recoleta', 'Belgrano', 'Nuñez', 'Caballito', 'Almagro',
  'Villa Crespo', 'La Boca', 'San Telmo', 'Barracas', 'Flores',
  'Floresta', 'Villa Urquiza', 'Saavedra', 'Devoto', 'Villa Pueyrredón',
  'Villa del Parque', 'Villa Luro', 'Mataderos', 'Liniers', 'Villa Devoto',
]

const NOTES_TEMPLATES = [
  'Sin cebolla', 'Con extra queso', 'Bien cocido', 'Sin sal',
  'Enviar después de las 20:00', 'Llamar antes de enviar', 'Poco condimento',
  'Sin TACC', 'Para celíaco', 'Acompañar con salsas extra',
  '', '', '', '', '', '', '', '', '', '', '', '', '', '',
]

const STATUSES = ['pending', 'confirmed', 'assembled', 'delivered']

function generateClients() {
  const used = new Set()
  const clients = []
  let id = 1
  let ni = 0
  let li = 0

  for (let i = 0; i < 200; i++) {
    const name = NAMES[ni]
    let lastName = LASTNAMES[li]
    const key = `${name}|${lastName}`
    if (used.has(key)) {
      lastName += ' ' + LASTNAMES[(li + 1) % LASTNAMES.length]
    }
    used.add(`${name}|${lastName}`)

    const street = pickOne(STREETS)
    const number = randInt(100, 3500)
    const locality = pickOne(LOCALITIES)
    const phone = `11 ${String(randInt(1000, 9999))}-${String(randInt(1000, 9999))}`

    clients.push({
      id: id++,
      name,
      last_name: lastName,
      phone,
      address: `${street} ${number}, ${locality}`,
      notes: RNG() > 0.7 ? `Cliente desde ${2020 + randInt(0, 5)}` : ''
    })

    ni = (ni + 1) % NAMES.length
    if (ni === 0) li = (li + 1) % LASTNAMES.length
  }
  return clients
}

function generateSubProducts(ingByName) {
  const subs = []

  // Salsa de tomate
  if (ingByName['Salsa de tomate']) {
    ingByName['Salsa de tomate'].batchYield = 2
    ingByName['Salsa de tomate'].subIngredients = [
      { ingredientId: ingByName['Tomate perita'].id, quantity: 0.4 },
      { ingredientId: ingByName['Ajo'].id, quantity: 0.008 },
      { ingredientId: ingByName['Aceite de oliva'].id, quantity: 0.03 },
      { ingredientId: ingByName['Sal'].id, quantity: 0.005 },
      { ingredientId: ingByName['Albahaca'].id, quantity: 5 },
    ]
  }

  // Masa para pizza
  if (ingByName['Masa para pizza']) {
    ingByName['Masa para pizza'].batchYield = 3
    ingByName['Masa para pizza'].subIngredients = [
      { ingredientId: ingByName['Harina 0000'].id, quantity: 0.75 },
      { ingredientId: ingByName['Agua'].id, quantity: 0.45 },
      { ingredientId: ingByName['Levadura fresca'].id, quantity: 30 },
      { ingredientId: ingByName['Sal'].id, quantity: 0.015 },
    ]
  }

  // Salsa filetto
  if (ingByName['Salsa filetto']) {
    ingByName['Salsa filetto'].batchYield = 2
    ingByName['Salsa filetto'].subIngredients = [
      { ingredientId: ingByName['Puré de tomate'].id, quantity: 0.6 },
      { ingredientId: ingByName['Ajo'].id, quantity: 0.005 },
      { ingredientId: ingByName['Aceite de oliva'].id, quantity: 0.02 },
      { ingredientId: ingByName['Albahaca'].id, quantity: 3 },
      { ingredientId: ingByName['Sal'].id, quantity: 0.003 },
    ]
  }

  // Salsa bolognesa
  if (ingByName['Salsa bolognesa']) {
    ingByName['Salsa bolognesa'].batchYield = 2
    ingByName['Salsa bolognesa'].subIngredients = [
      { ingredientId: ingByName['Carne picada'].id, quantity: 0.3 },
      { ingredientId: ingByName['Puré de tomate'].id, quantity: 0.2 },
      { ingredientId: ingByName['Cebolla'].id, quantity: 0.1 },
      { ingredientId: ingByName['Zanahoria'].id, quantity: 0.05 },
      { ingredientId: ingByName['Vino tinto'].id, quantity: 0.03 },
      { ingredientId: ingByName['Laurel'].id, quantity: 1 },
    ]
  }
}

function calcCompositeCost(ing, ingByName) {
  if (!ing.subIngredients || ing.subIngredients.length === 0) return ing.cost || 0
  const total = ing.subIngredients.reduce((sum, si) => {
    const subIng = Object.values(ingByName).find(i => i.id === si.ingredientId)
    return sum + (subIng?.cost || 0) * si.quantity
  }, 0)
  return ing.batchYield > 0 ? total / ing.batchYield : total
}

function generateIngredients(monthIndex) {
  const ingredients = INGREDIENT_CATALOG.map((item, i) => {
    const createDate = new Date(2022, 0, 1)
    createDate.setFullYear(2022 + Math.floor(i / 10))
    return {
      id: i + 1,
      name: item.name,
      unit: item.unit,
      cost: item.cost,
      category: item.category,
      is_active: true,
      batchYield: 1,
      subIngredients: [],
      last_cost_update: fmtDatetime(createDate)
    }
  })

  const byName = {}
  for (const ing of ingredients) byName[ing.name] = ing

  generateSubProducts(byName)

  for (const ing of ingredients) {
    if (ing.subIngredients && ing.subIngredients.length > 0) {
      ing.cost = calcCompositeCost(ing, byName)
    }
  }

  return ingredients
}

function generateDishes(ingredients) {
  const ingByName = {}
  for (const ing of ingredients) {
    ingByName[ing.name] = ing
  }

  let id = 1
  const dishes = []
  for (const [category, items] of Object.entries(DISH_TEMPLATES)) {
    for (const item of items) {
      const structuredIngredients = item.ingr.map(i => {
        const ing = ingByName[i.name]
        return { ingredientId: ing ? ing.id : null, quantity: i.qty }
      })
      const isCore = CORE_CATEGORIES.includes(category)
      dishes.push({
        id: id++,
        name: item.name,
        category,
        price: item.price,
        ingredients: structuredIngredients,
        is_active: true,
        is_core: isCore
      })
    }
  }
  return dishes
}

function getActiveRotationForMonth(rotationDishes, year, month) {
  const monthSeed = year * 12 + month
  const localRng = (() => {
    let s = monthSeed * 16807
    return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646 }
  })()
  const shuffled = [...rotationDishes].sort(() => localRng() - 0.5)
  return shuffled.slice(0, 10)
}

function generateWeeks(allDishes, clients, ingredients) {
  const byName = {}
  for (const ing of ingredients) byName[ing.name] = ing

  const weeks = []
  let weekId = 1
  let orderId = 1
  let itemId = 1
  let prodId = 1

  const allClientIds = clients.map(c => c.id)

  const coreDishes = allDishes.filter(d => CORE_CATEGORIES.includes(d.category))
  const rotationDishes = allDishes.filter(d => ROTATION_CATEGORIES.includes(d.category))

  const currentSunday = getSunday(NOW)
  const startDate = getSunday(new Date(2022, 0, 2))
  const totalWeeks = Math.ceil((currentSunday.getTime() - startDate.getTime()) / (7 * 86400000))
  const weekData = []

  for (let i = 0; i <= totalWeeks; i++) {
    const weekStart = new Date(startDate)
    weekStart.setDate(weekStart.getDate() + i * 7)
    const weekEnd = getSaturday(new Date(weekStart))
    const ws = fmtDate(weekStart)
    const we = fmtDate(weekEnd)
    const isCurrent = fmtDate(currentSunday) === ws

    // Calculate inflation for this week
    const weekDate = new Date(weekStart)
    const monthsSinceStart = (weekDate.getFullYear() - 2022) * 12 + weekDate.getMonth()
    let cumulativeFactor = 1
    for (let m = 0; m < monthsSinceStart; m++) {
      const y = 2022 + Math.floor((weekDate.getMonth() - m + 12) / 12) - 1
      cumulativeFactor *= (1 + getMonthlyRate(y))
    }

    const week = { id: weekId++, week_start: ws, week_end: we, is_current: isCurrent }
    weeks.push(week)

    // Determine which rotation dishes are active this month
    const activeRotation = getActiveRotationForMonth(rotationDishes, weekDate.getFullYear(), weekDate.getMonth())
    const availableDishes = [...coreDishes, ...activeRotation]
    availableDishes.sort((a, b) => a.id - b.id)

    const numOrders = randInt(20, 40)
    const pctClients = 0.1 + RNG() * 0.3
    const numClients = Math.max(5, Math.min(allClientIds.length, Math.floor(allClientIds.length * pctClients)))
    const participatingClients = pick(allClientIds, numClients)

    const orders = []
    const orderItems = []
    const productionLogs = []

    for (let o = 0; o < numOrders; o++) {
      const clientId = pickOne(participatingClients)
      const numItems = randInt(1, 4)
      const itemDishes = pick(availableDishes, numItems)
      const status = isCurrent ? pickOne(['pending', 'confirmed']) : pickOne(STATUSES)

      const notes = pickOne(NOTES_TEMPLATES)
      const orderDay = new Date(weekStart)
      const dayOffset = randInt(0, Math.min(5, isCurrent ? 5 : 6))
      orderDay.setDate(orderDay.getDate() + dayOffset)
      orderDay.setHours(randInt(10, 20), randInt(0, 59), randInt(0, 59))

      const order = {
        id: orderId++,
        client_id: clientId,
        week_id: week.id,
        status,
        notes,
        has_delivery: RNG() > 0.5,
        delivery_fee: RNG() > 0.5 ? (RNG() > 0.5 ? 500 : 700) : 0,
        created_at: fmtDatetime(orderDay)
      }
      orders.push(order)

      for (const dish of itemDishes) {
        const qty = randInt(1, 3)
        orderItems.push({ id: itemId++, order_id: order.id, dish_id: dish.id, quantity: qty })
      }
    }

    // Production: past weeks 90-110%, current 30-70%
    for (const dish of availableDishes) {
      const totalOrdered = orderItems
        .filter(oi => oi.dish_id === dish.id)
        .reduce((sum, oi) => sum + oi.quantity, 0)

      if (totalOrdered > 0) {
        if (isCurrent) {
          const pct = 30 + randInt(0, 40)
          const produced = Math.round(totalOrdered * pct / 100)
          if (produced > 0) {
            const prodDay = new Date(weekStart)
            prodDay.setDate(prodDay.getDate() + randInt(4, Math.min(6, isCurrent ? 5 : 6)))
            productionLogs.push({
              id: prodId++,
              week_id: week.id,
              dish_id: dish.id,
              quantity_produced: produced,
              date_produced: fmtDate(prodDay)
            })
          }
        } else {
          const overPct = 90 + randInt(-10, 20)
          const produced = Math.round(totalOrdered * overPct / 100)
          if (produced > 0) {
            const prodDay = new Date(weekStart)
            prodDay.setDate(prodDay.getDate() + randInt(5, 6))
            productionLogs.push({
              id: prodId++,
              week_id: week.id,
              dish_id: dish.id,
              quantity_produced: produced,
              date_produced: fmtDate(prodDay)
            })
          }
        }
      }
    }

    weekData.push({ week, orders, orderItems, productionLogs, month: weekDate.getMonth(), year: weekDate.getFullYear() })
  }

  const allOrders = weekData.flatMap(wd => wd.orders)
  const allOrderItems = weekData.flatMap(wd => wd.orderItems)
  const allProductionLogs = weekData.flatMap(wd => wd.productionLogs)

  // Apply cumulative inflation to ingredient costs (2022 -> now)
  const nowDate = new Date()
  const finalMonths = (nowDate.getFullYear() - 2022) * 12 + nowDate.getMonth()
  let cumFactor = 1
  for (let m = 0; m < finalMonths; m++) {
    const y = 2022 + Math.floor(m / 12)
    cumFactor *= (1 + getMonthlyRate(y))
  }

  // First pass: update all base ingredient costs
  for (const ing of ingredients) {
    if (!ing.subIngredients || ing.subIngredients.length === 0) {
      const base = INGREDIENT_CATALOG.find(c => c.name === ing.name)
      if (base) {
        const variation = 0.85 + RNG() * 0.3
        ing.cost = Math.round(base.cost * cumFactor * variation * 100) / 100
      }
    }
  }
  // Rebuild map with updated costs
  const updatedIngMap = {}
  for (const ing of ingredients) updatedIngMap[ing.name] = ing
  // Second pass: recalculate composites with updated base costs
  for (const ing of ingredients) {
    if (ing.subIngredients && ing.subIngredients.length > 0) {
      ing.cost = calcCompositeCost(ing, updatedIngMap)
    }
  }

  // Update dish prices
  const ingMap = {}
  for (const ing of ingredients) ingMap[ing.name] = ing

  for (const dish of allDishes) {
    let costEst = 0
    for (const item of dish.ingredients) {
      const ing = ingredients.find(i => i.id === item.ingredientId)
      costEst += (ing?.cost || 0) * item.quantity
    }
    dish.price = Math.round(costEst * (1.5 + RNG() * 0.5) / 100) * 100
    if (dish.price < 1000) dish.price = 1000 + randInt(0, 20) * 100
  }

  return {
    weeks,
    dishes: allDishes,
    clients,
    ingredients,
    orders: allOrders,
    orderItems: allOrderItems,
    productionLog: allProductionLogs,
    deliverySettings: { defaultFee: 500 },
    _nextId: prodId + itemId + orderId + weekId + allDishes.length + clients.length + allDishes.length + 2000
  }
}

function main() {
  const ingredients = generateIngredients(0)
  const allDishes = generateDishes(ingredients)
  const clients = generateClients()
  const data = generateWeeks(allDishes, clients, ingredients)

  const configDir = process.platform === 'win32'
    ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'piu')
    : process.env.XDG_CONFIG_HOME
      ? path.join(process.env.XDG_CONFIG_HOME, 'piu')
      : path.join(os.homedir(), '.config', 'piu')

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
  }

  const filePath = path.join(configDir, 'piu.json')
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')

  const totalOrders = data.orders.length
  const totalItems = data.orderItems.length
  const activeWeeks = data.weeks.filter(w => {
    const wo = data.orders.filter(o => o.week_id === w.id)
    return wo.length > 0
  })

  const weekSummaries = activeWeeks.slice(0, 10).map(w => {
    const wo = data.orders.filter(o => o.week_id === w.id)
    const wc = new Set(wo.map(o => o.client_id)).size
    return `  ${w.week_start} → ${w.week_end}${w.is_current ? ' (actual)' : ''}: ${wo.length} pedidos, ${wc} clientes`
  })

  const totalRevenue = data.orders.reduce((s, o) => s + (o.delivery_fee || 0), 0)
  let dishRevenue = 0
  for (const oi of data.orderItems) {
    const dish = data.dishes.find(d => d.id === oi.dish_id)
    if (dish) dishRevenue += (dish.price || 0) * oi.quantity
  }

  console.log(`
╔══════════════════════════════════════╗
║        PIU - SEED COMPLETADO         ║
╠══════════════════════════════════════╣
║  Archivo: ${filePath}
╠══════════════════════════════════════╣
║  Ingredientes: ${String(ingredients.length).padStart(4)}
║  Sub-productos: ${String(ingredients.filter(i => i.subIngredients?.length > 0).length).padStart(4)}
║  Platos totales: ${String(allDishes.length).padStart(4)}
║    Core: ${String(allDishes.filter(d => CORE_CATEGORIES.includes(d.category)).length).padStart(4)}
║    Rotación: ${String(allDishes.filter(d => ROTATION_CATEGORIES.includes(d.category)).length).padStart(4)}
║  Clientes:     ${String(clients.length).padStart(4)}
║  Pedidos:      ${String(totalOrders).padStart(4)}
║  Items:        ${String(totalItems).padStart(4)}
║  Semanas activas: ${String(activeWeeks.length).padStart(4)}
╠══════════════════════════════════════╣
║  Revenue platos: $${dishRevenue.toLocaleString()}
║  Delivery fees:  $${totalRevenue.toLocaleString()}
╠══════════════════════════════════════╣
║  Primeras 10 semanas:               ║`)
  for (const s of weekSummaries) {
    console.log(s)
  }
  console.log(`╠══════════════════════════════════════╣
║  Costos de producción (ejemplos):   ║`)
  const sampleDishes = allDishes.slice(0, 5)
  for (const d of sampleDishes) {
    let cost = 0
    for (const item of d.ingredients) {
      const ing = ingredients.find(i => i.id === item.ingredientId)
      cost += (ing?.cost || 0) * item.quantity
    }
    const margin = d.price > 0 ? ((d.price - cost) / d.price * 100) : 0
    console.log(`  ${d.name}: costo $${cost.toFixed(2)} → precio $${d.price.toFixed(2)} (${margin.toFixed(0)}%)`)
  }

  const topClientId = Object.entries(
    data.orders.reduce((acc, o) => { acc[o.client_id] = (acc[o.client_id] || 0) + 1; return acc }, {})
  ).sort((a, b) => b[1] - a[1])[0]
  const topClient = data.clients.find(c => c.id === parseInt(topClientId?.[0]))

  console.log(`╠══════════════════════════════════════╣`)
  if (topClient) {
    console.log(`║  Cliente top: ${(topClient.name + ' ' + topClient.last_name).padEnd(24)}║`)
    console.log(`║  Pedidos del top: ${String(topClientId[1]).padStart(18)}║`)
  }
  console.log(`╚══════════════════════════════════════╝`)
}

main()
