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

const CURRENT_COST = {
  'Harina 0000': 1400, 'Agua': 2, 'Levadura fresca': 12, 'Sal': 1300, 'Muzzarella': 11000,
  'Aceite de oliva': 18000, 'Tomate perita': 2500, 'Ajo': 9000, 'Cebolla': 1500, 'Orégano': 30,
  'Jamón cocido': 16000, 'Morrón': 6000, 'Aceitunas verdes': 12000, 'Huevo': 250, 'Longaniza': 14000,
  'Tapas para empanada': 2500, 'Carne (cortada a cuchillo)': 14000, 'Comino': 40, 'Pimentón': 30,
  'Grasa de pella': 4000, 'Ají molido': 30, 'Pollo': 6500, 'Crema de leche': 9000, 'Choclo': 3500,
  'Salsa blanca': 6000, 'Albahaca': 40, 'Queso cremoso': 12000, 'Tapas de tarta': 3000,
  'Zapallito': 3000, 'Zanahoria': 1300, 'Calabaza': 1500, 'Nuez moscada': 80, 'Espinaca': 4000,
  'Ricota': 7000, 'Queso rallado': 18000, 'Carne picada': 11000, 'Papa': 1200, 'Láminas de pasta': 7000,
  'Lomo': 28000, 'Pan de miga': 700, 'Lechuga': 3500, 'Mayonesa': 6000, 'Milanesa de carne': 15000,
  'Medallón de garbanzo': 1500, 'Pan integral': 800, 'Palta': 9000, 'Mostaza': 5000, 'Bondiola': 13000,
  'Cebolla morada': 2500, 'Salsa criolla': 5000, 'Pan de hamburguesa': 600, 'Queso cheddar': 16000,
  'Panceta': 18000, 'Papas fritas (congeladas)': 5500, 'Harina integral': 1800, 'Fideos secos': 2500,
  'Lentejas': 4000, 'Arroz': 1800, 'Puré de tomate': 2200, 'Vino tinto': 6000, 'Laurel': 50,
  'Tomillo': 50, 'Perejil': 15, 'Caldo de carne': 300, 'Batata': 1800, 'Huevo duro': 280
}

const PACKAGES = {
  'Harina 0000': 25, 'Muzzarella': 10, 'Huevo': 30, 'Aceite de oliva': 5, 'Sal': 1,
  'Papa': 20, 'Cebolla': 10, 'Tapas para empanada': 1, 'Pan de hamburguesa': 12, 'Queso rallado': 1
}

const INACTIVE_INGREDIENTS = ['Harina integral', 'Arroz']

const PRICE_MULTIPLIER = { Pizzas: 3.2, Empanadas: 6.5, Tartas: 3.4, Sandwiches: 2.8, Pastas: 2.4, Guisos: 2.3, Extras: 2.2 }

const MONTHLY_INFLATION = {
  2024: [20.6, 13.2, 11.0, 8.8, 4.2, 4.6, 4.0, 4.2, 3.5, 2.7, 2.4, 2.7],
  2025: [2.2, 2.4, 3.7, 2.8, 1.5, 1.6, 1.9, 1.9, 2.1, 2.3, 2.5, 2.8],
  2026: [2.6, 2.4, 2.3, 2.2, 2.0, 1.9, 1.9, 1.8, 1.8, 1.7, 1.7, 1.7]
}

const START = new Date(2024, 0, 7)
const CURRENT_FEE = 2500

const CORDOBA_STREETS = [
  'Av. Colón', 'Av. Vélez Sarsfield', 'Bv. San Juan', 'Av. Hipólito Yrigoyen', 'Obispo Trejo',
  'Deán Funes', 'La Rioja', 'Santa Rosa', '27 de Abril', 'Av. Olmos', 'Bv. Chacabuco', 'Av. Maipú',
  'Rivera Indarte', 'Ituzaingó', 'Bv. Arturo Illia', 'Av. Fernando Fader', 'Av. Rafael Núñez',
  'Tristán Malbrán', 'Av. Pueyrredón', 'Belgrano', 'Independencia', 'Buenos Aires', 'Paraná',
  'Laprida', 'Fructuoso Rivera', 'Av. Duarte Quirós', 'Caseros', 'Jujuy', 'Av. Castro Barros',
  'Bv. Los Andes', 'Av. Juan B. Justo', 'Sucre', 'Tucumán', 'Mendoza', 'Av. Emilio Caraffa',
  'Av. Amadeo Sabattini', 'Av. Ricchieri', 'Av. Santa Ana', 'Av. Octavio Pinto', 'Achával Rodríguez'
]

const FIRST_NAMES = [
  'Juan', 'Carlos', 'María', 'Laura', 'Diego', 'Ana', 'Pablo', 'Florencia', 'Martín', 'Romina',
  'Lucas', 'Sofía', 'Nicolás', 'Julieta', 'Fernando', 'Valeria', 'Alejandro', 'Carolina', 'Gustavo',
  'Luciana', 'Marcelo', 'Gabriela', 'Sebastián', 'Verónica', 'Javier', 'Marcela', 'Leandro', 'Silvina',
  'Damián', 'Nadia', 'Federico', 'Belén', 'Andrés', 'Melina', 'Ezequiel', 'Emiliano', 'Noelia',
  'Cristian', 'Yamila', 'Sergio', 'Matías', 'Daiana', 'Rodrigo', 'Julián', 'Candela', 'Hernán',
  'Milagros', 'Esteban', 'Lourdes', 'Ramiro', 'Soledad', 'Guillermo', 'Paula', 'Ignacio', 'Lorena',
  'Franco', 'Agustín', 'Mercedes', 'Tomás', 'Celeste', 'Mauro', 'Andrea', 'Bruno', 'Daniela',
  'Facundo', 'Gisela', 'Leonardo', 'Tamara', 'Ricardo', 'Roxana', 'Mario', 'Graciela', 'Hugo',
  'Patricia', 'Jorge', 'Susana', 'Pedro', 'Beatriz', 'Claudia', 'Gonzalo', 'Cecilia', 'Emilio'
]
const LAST_NAMES = [
  'González', 'Rodríguez', 'Martínez', 'López', 'Fernández', 'García', 'Sánchez', 'Pérez', 'Gómez',
  'Díaz', 'Torres', 'Álvarez', 'Ruiz', 'Castro', 'Romero', 'Molina', 'Silva', 'Paz', 'Acosta', 'Ríos',
  'Medina', 'Herrera', 'Pereyra', 'Vega', 'Ferreyra', 'Aguirre', 'Luna', 'Bustos', 'Godoy', 'Sosa',
  'Cabrera', 'Ojeda', 'Navarro', 'Ortiz', 'Arias', 'Ramos', 'Correa', 'Rivero', 'Peralta', 'Moreno',
  'Suárez', 'Domínguez', 'Carrizo', 'Ledesma', 'Ávila', 'Roldán', 'Juárez', 'Giménez', 'Barrios',
  'Moyano', 'Vera', 'Toledo', 'Quiroga', 'Bazán', 'Figueroa', 'Funes', 'Oviedo', 'Lucero', 'Altamirano'
]
const CLIENT_NOTES = ['Depto 4B', 'Timbre no anda, llamar al llegar', 'Portería: dejar en recepción', 'Casa con portón verde', 'Celíaca: sin TACC', 'Paga con transferencia', '', '', '', '', '', '', '', '']
const ORDER_NOTES = ['Sin cebolla', 'Bien cocido', 'Sin sal', 'Llamar antes de enviar', 'Enviar después de las 20', 'Poco condimento', 'Cortar en 8', '', '', '', '', '', '', '', '', '', '', '', '', '']

let nextId = 1
const genId = () => nextId++

function monthKey(d) { return `${d.getFullYear()}-${d.getMonth()}` }

function buildInflation() {
  const table = new Map()
  let cum = 1
  const d = new Date(START.getFullYear(), START.getMonth(), 1)
  const end = new Date(NOW.getFullYear(), NOW.getMonth(), 1)
  table.set(monthKey(d), cum)
  while (d < end) {
    cum *= 1 + (MONTHLY_INFLATION[d.getFullYear()]?.[d.getMonth()] ?? 2) / 100
    d.setMonth(d.getMonth() + 1)
    table.set(monthKey(d), cum)
  }
  return { table, now: cum }
}

function weightedPick(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = RNG() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

function generateClients() {
  const used = new Set()
  const clients = []
  while (clients.length < 150) {
    const name = pickOne(FIRST_NAMES)
    const last = pickOne(LAST_NAMES)
    if (used.has(name + last)) continue
    used.add(name + last)
    const pickupOnly = RNG() < 0.12
    const address = pickupOnly ? '' : `${pickOne(CORDOBA_STREETS)} ${randInt(1, 30) * 100 + randInt(0, 99)}`
    clients.push({
      id: genId(),
      name,
      last_name: last,
      phone: RNG() < 0.93 ? `351 ${randInt(400, 799)}-${String(randInt(0, 9999)).padStart(4, '0')}` : '',
      address,
      locality: 'Córdoba',
      notes: pickOne(CLIENT_NOTES),
      _weight: Math.pow(RNG(), 2.5) * 10 + 0.2,
      _since: new Date(START.getTime() + RNG() * (NOW.getTime() - START.getTime()) * 0.8)
    })
  }
  return clients
}

function generateIngredients() {
  const ingredients = INGREDIENT_CATALOG.map(item => ({
    id: genId(),
    name: item.name,
    unit: item.unit,
    cost: CURRENT_COST[item.name] ?? item.cost,
    category: item.category,
    is_active: !INACTIVE_INGREDIENTS.includes(item.name),
    batchYield: 1,
    subIngredients: [],
    package_qty: 0,
    package_price: 0,
    last_cost_update: null
  }))
  const byName = {}
  for (const ing of ingredients) byName[ing.name] = ing
  generateSubProducts(byName)
  return { ingredients, byName }
}

function resolveCost(ing, byId, depth = 0) {
  if (!ing) return 0
  if (!ing.subIngredients || ing.subIngredients.length === 0 || depth > 5) return ing.cost || 0
  const total = ing.subIngredients.reduce((s, si) => s + resolveCost(byId[si.ingredientId], byId, depth + 1) * si.quantity, 0)
  return total / (ing.batchYield || 1)
}

function generateDishes(byName) {
  const dishes = []
  for (const [category, items] of Object.entries(DISH_TEMPLATES)) {
    for (const item of items) {
      dishes.push({
        id: genId(),
        name: item.name,
        category,
        _currentPrice: Math.round(item.price * PRICE_MULTIPLIER[category] / 100) * 100,
        price: 0,
        ingredients: item.ingr.filter(i => byName[i.name]).map(i => ({ ingredientId: byName[i.name].id, quantity: i.qty })),
        is_active: true,
        last_price_review: null
      })
    }
  }
  return dishes
}

function rotationForMonth(rotation, year, month) {
  let s = (year * 12 + month) * 16807
  const local = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
  return [...rotation].sort(() => local() - 0.5).slice(0, 8)
}

function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }

function main() {
  const configDir = process.platform === 'win32'
    ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'piu')
    : process.env.XDG_CONFIG_HOME
      ? path.join(process.env.XDG_CONFIG_HOME, 'piu')
      : path.join(os.homedir(), '.config', 'piu')
  fs.mkdirSync(configDir, { recursive: true })
  const filePath = path.join(configDir, 'piu.json')

  let previousSettings = {}
  if (fs.existsSync(filePath)) {
    try { previousSettings = JSON.parse(fs.readFileSync(filePath, 'utf-8')).deliverySettings || {} } catch {}
    const backupDir = path.join(configDir, 'backups')
    fs.mkdirSync(backupDir, { recursive: true })
    const stamp = fmtDatetime(NOW).replace(/[: ]/g, '-')
    const backupPath = path.join(backupDir, `piu-antes-de-seed-${stamp}.json`)
    fs.copyFileSync(filePath, backupPath)
    console.log(`Respaldo de la base anterior: ${backupPath}`)
  }

  const { table: inflation, now: inflationNow } = buildInflation()
  const factorAt = (d) => (inflation.get(monthKey(d)) ?? inflationNow) / inflationNow

  const { ingredients, byName } = generateIngredients()
  const byId = {}
  for (const ing of ingredients) byId[ing.id] = ing
  const ingNoise = {}
  for (const ing of ingredients) ingNoise[ing.id] = 0.92 + RNG() * 0.16

  const dishes = generateDishes(byName)
  const core = dishes.filter(d => CORE_CATEGORIES.includes(d.category))
  const rotation = dishes.filter(d => ROTATION_CATEGORIES.includes(d.category))
  const clients = generateClients()

  const weeks = []
  const orders = []
  const orderItems = []
  const productionLog = []

  const currentSunday = getSunday(NOW)
  const repriceMonth = (d) => {
    const f = factorAt(d)
    for (const ing of ingredients) {
      if (ing.subIngredients.length === 0) {
        const jitter = 0.97 + RNG() * 0.06
        ing.cost = Math.round((CURRENT_COST[ing.name] ?? ing.cost) * f * ingNoise[ing.id] * jitter * 100) / 100
      }
    }
    for (const ing of ingredients) if (ing.subIngredients.length > 0) ing.cost = resolveCost(ing, byId)
  }
  const repriceDishes = (d) => {
    const f = factorAt(d)
    for (const dish of dishes) dish.price = Math.max(1000, Math.round(dish._currentPrice * f / 100) * 100)
  }
  const dishCost = (dish) => dish.ingredients.reduce((s, i) => s + resolveCost(byId[i.ingredientId], byId) * i.quantity, 0)

  let lastMonth = null
  let lastDishUpdate = null
  for (let ws = new Date(START); ws <= currentSunday; ws = addDays(ws, 7)) {
    const isCurrent = fmtDate(ws) === fmtDate(currentSunday)
    const week = { id: genId(), week_start: fmtDate(ws), week_end: fmtDate(addDays(ws, 6)), is_current: isCurrent }
    weeks.push(week)

    const mk = monthKey(ws)
    if (mk !== lastMonth) {
      lastMonth = mk
      repriceMonth(ws)
      if (!lastDishUpdate || (ws.getFullYear() * 12 + ws.getMonth()) - lastDishUpdate >= 2) {
        lastDishUpdate = ws.getFullYear() * 12 + ws.getMonth()
        repriceDishes(ws)
      }
    }

    const month = ws.getMonth()
    const available = [...core, ...rotationForMonth(rotation, ws.getFullYear(), month)]
    const winter = month >= 4 && month <= 7
    const dishWeights = available.map(d => {
      if (d.category === 'Empanadas') return 3
      if (d.category === 'Pizzas') return 2.5
      if (d.category === 'Guisos') return winter ? 2.5 : 0.6
      if (d.category === 'Extras') return winter ? 0.6 : 1.5
      return 1.2
    })
    const fee = Math.max(300, Math.round(CURRENT_FEE * factorAt(ws) / 100) * 100)

    const progress = (ws - START) / (currentSunday - START)
    const seasonal = month === 0 || month === 1 ? 0.75 : month === 6 ? 0.85 : 1
    const numOrders = Math.round((22 + progress * 18 + randInt(-4, 6)) * seasonal)
    const activeClients = clients.filter(c => c._since <= addDays(ws, 6))
    const usedThisWeek = new Set()
    const weekOrders = []

    for (let n = 0; n < numOrders && activeClients.length > 0; n++) {
      let client = weightedPick(activeClients, activeClients.map(c => c._weight))
      if (usedThisWeek.has(client.id) && RNG() < 0.85) continue
      usedThisWeek.add(client.id)

      const dayOffset = randInt(0, 5)
      const created = addDays(ws, dayOffset)
      created.setHours(dayOffset === 5 ? randInt(8, 11) : randInt(9, 21), randInt(0, 59), randInt(0, 59))
      if (created > NOW) continue

      const hasDelivery = !!client.address && RNG() < 0.6
      const deliveryDay = hasDelivery ? weightedPick(['viernes', 'sabado', 'jueves'], [60, 35, 5]) : null
      const order = {
        id: genId(),
        client_id: client.id,
        week_id: week.id,
        status: 'delivered',
        notes: pickOne(ORDER_NOTES),
        has_delivery: hasDelivery,
        delivery_fee: hasDelivery ? fee : 0,
        delivery_day: deliveryDay,
        created_at: fmtDatetime(created)
      }
      const numItems = weightedPick([1, 2, 3, 4], [45, 35, 15, 5])
      const chosen = new Set()
      for (let k = 0; k < numItems; k++) {
        const dish = weightedPick(available, dishWeights)
        if (chosen.has(dish.id)) continue
        chosen.add(dish.id)
        orderItems.push({
          id: genId(),
          order_id: order.id,
          dish_id: dish.id,
          quantity: weightedPick([1, 2, 3, 4], [55, 30, 10, 5]),
          unit_price: dish.price,
          unit_cost: Math.round(dishCost(dish) * 100) / 100
        })
      }
      weekOrders.push(order)
      orders.push(order)
    }

    if (isCurrent) {
      for (const o of weekOrders) {
        const r = RNG()
        o.status = r < 0.35 ? 'delivered' : r < 0.65 ? 'assembled' : 'pending'
        if (o.status === 'delivered' && o.delivery_day === 'sabado') o.status = 'assembled'
      }
    }

    const ordered = {}
    const needed = {}
    for (const o of weekOrders) {
      for (const it of orderItems.filter(x => x.order_id === o.id)) {
        ordered[it.dish_id] = (ordered[it.dish_id] || 0) + it.quantity
        if (!isCurrent || o.status !== 'pending') needed[it.dish_id] = (needed[it.dish_id] || 0) + it.quantity
        else needed[it.dish_id] = (needed[it.dish_id] || 0) + (RNG() < 0.4 ? it.quantity : 0)
      }
    }
    for (const [dishIdStr, qty] of Object.entries(isCurrent ? needed : ordered)) {
      const extra = !isCurrent && RNG() < 0.25 ? randInt(1, 3) : 0
      let total = qty + extra
      if (total <= 0) continue
      const first = isCurrent ? Math.ceil(total / 2) : Math.ceil(total * 0.6)
      const days = isCurrent ? [3, 4] : [4, 5]
      for (const [idx, part] of [first, total - first].entries()) {
        if (part <= 0) continue
        const day = addDays(ws, days[idx])
        if (day > NOW) continue
        productionLog.push({ id: genId(), week_id: week.id, dish_id: Number(dishIdStr), quantity_produced: part, date_produced: fmtDate(day) })
      }
    }
  }

  const nextSunday = addDays(currentSunday, 7)
  const nextWeek = { id: genId(), week_start: fmtDate(nextSunday), week_end: fmtDate(addDays(nextSunday, 6)), is_current: false }
  weeks.push(nextWeek)
  const nowMonthRotation = rotationForMonth(rotation, NOW.getFullYear(), NOW.getMonth())
  const activeNow = [...core, ...nowMonthRotation]
  for (let n = 0; n < 3; n++) {
    const client = clients[randInt(0, clients.length - 1)]
    const created = new Date(NOW)
    created.setHours(Math.max(12, NOW.getHours() - n - 1), randInt(0, 59), 0)
    const hasDelivery = !!client.address
    const order = {
      id: genId(), client_id: client.id, week_id: nextWeek.id, status: 'pending', notes: '',
      has_delivery: hasDelivery, delivery_fee: hasDelivery ? CURRENT_FEE : 0, delivery_day: hasDelivery ? 'viernes' : null,
      created_at: fmtDatetime(created)
    }
    orders.push(order)
    const dish = pickOne(activeNow)
    orderItems.push({ id: genId(), order_id: order.id, dish_id: dish.id, quantity: randInt(1, 2), unit_price: dish.price, unit_cost: Math.round(dishCost(dish) * 100) / 100 })
  }

  repriceMonth(NOW)
  repriceDishes(NOW)
  const nowIds = new Set(activeNow.map(d => d.id))
  for (const dish of dishes) {
    dish.is_active = nowIds.has(dish.id)
    const daysAgo = RNG() < 0.15 ? randInt(40, 80) : randInt(1, 25)
    dish.last_price_review = addDays(NOW, -daysAgo).toISOString()
    delete dish._currentPrice
  }
  for (const ing of ingredients) {
    const stale = ing.subIngredients.length === 0 && RNG() < 0.12
    ing.last_cost_update = addDays(NOW, -(stale ? randInt(35, 70) : randInt(0, 20))).toISOString()
    if (PACKAGES[ing.name] && ing.subIngredients.length === 0) {
      ing.package_qty = PACKAGES[ing.name]
      ing.package_price = Math.round(ing.cost * PACKAGES[ing.name] * 0.95)
      ing.cost = Math.round(ing.package_price / ing.package_qty * 10000) / 10000
    }
  }
  for (const ing of ingredients) if (ing.subIngredients.length > 0) ing.cost = resolveCost(ing, byId)

  for (const c of clients) { delete c._weight; delete c._since }

  const deliverySettings = { defaultFee: CURRENT_FEE }
  if (previousSettings.startLocation) deliverySettings.startLocation = previousSettings.startLocation

  const data = { weeks, dishes, clients, orders, orderItems, productionLog, ingredients, deliverySettings, _nextId: nextId }
  const tmp = filePath + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8')
  fs.renameSync(tmp, filePath)

  const revenue = orderItems.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const cost = orderItems.reduce((s, i) => s + i.unit_cost * i.quantity, 0)
  const cur = weeks.find(w => w.is_current)
  const curOrders = orders.filter(o => o.week_id === cur.id)
  console.log(`Base generada en ${filePath}`)
  console.log(`  Semanas: ${weeks.length} (${weeks[0].week_start} → ${weeks[weeks.length - 1].week_start})`)
  console.log(`  Clientes: ${clients.length} | Ingredientes: ${ingredients.length} (${ingredients.filter(i => i.subIngredients.length).length} sub-productos) | Platos: ${dishes.length} (${dishes.filter(d => d.is_active).length} activos)`)
  console.log(`  Pedidos: ${orders.length} | Ítems: ${orderItems.length} | Producción: ${productionLog.length} registros`)
  console.log(`  Semana actual: ${curOrders.length} pedidos (${['pending', 'assembled', 'delivered'].map(s => `${s}: ${curOrders.filter(o => o.status === s).length}`).join(', ')})`)
  console.log(`  Próxima semana: ${orders.filter(o => o.week_id === nextWeek.id).length} pedidos`)
  console.log(`  Ingresos históricos (sin envíos): $${Math.round(revenue).toLocaleString('es-AR')} | margen ${(100 * (revenue - cost) / revenue).toFixed(1)}%`)
  console.log(`  Punto de partida: ${deliverySettings.startLocation ? deliverySettings.startLocation.address : '(sin configurar)'}`)
  console.log('  Platos actuales (precio / costo / margen):')
  for (const d of dishes.filter(x => x.is_active)) {
    const c = dishCost(d)
    console.log(`    ${d.category.padEnd(10)} ${d.name.padEnd(30)} $${String(d.price).padStart(6)}  $${Math.round(c).toString().padStart(6)}  ${(100 * (d.price - c) / d.price).toFixed(0)}%`)
  }
}

main()
