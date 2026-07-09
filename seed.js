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

// ============== INGREDIENT CATALOG ==============

const INGREDIENT_CATALOG = [
  { name: 'Harina 0000', unit: 'kg', cost: 150, category: 'Secos' },
  { name: 'Agua', unit: 'l', cost: 1, category: 'Básicos' },
  { name: 'Levadura fresca', unit: 'g', cost: 0.5, category: 'Secos' },
  { name: 'Sal', unit: 'kg', cost: 50, category: 'Secos' },
  { name: 'Muzzarella', unit: 'kg', cost: 800, category: 'Lácteos' },
  { name: 'Salsa de tomate', unit: 'l', cost: 300, category: 'Conservas' },
  { name: 'Aceite de oliva', unit: 'l', cost: 1500, category: 'Aceites' },
  { name: 'Tomate perita', unit: 'uni', cost: 80, category: 'Verduras' },
  { name: 'Ajo', unit: 'uni', cost: 60, category: 'Verduras' },
  { name: 'Cebolla', unit: 'uni', cost: 50, category: 'Verduras' },
  { name: 'Orégano', unit: 'g', cost: 1, category: 'Especias' },
  { name: 'Jamón cocido', unit: 'kg', cost: 1200, category: 'Fiambres' },
  { name: 'Morrón', unit: 'uni', cost: 100, category: 'Verduras' },
  { name: 'Aceitunas verdes', unit: 'kg', cost: 800, category: 'Conservas' },
  { name: 'Huevo', unit: 'uni', cost: 50, category: 'Huevos' },
  { name: 'Longaniza', unit: 'kg', cost: 1000, category: 'Carnes' },
  { name: 'Tapas para empanada', unit: 'doc', cost: 200, category: 'Masa' },
  { name: 'Carne (cortada a cuchillo)', unit: 'kg', cost: 1500, category: 'Carnes' },
  { name: 'Comino', unit: 'g', cost: 0.8, category: 'Especias' },
  { name: 'Pimentón', unit: 'g', cost: 0.6, category: 'Especias' },
  { name: 'Grasa de pella', unit: 'kg', cost: 300, category: 'Grasas' },
  { name: 'Ají molido', unit: 'g', cost: 0.7, category: 'Especias' },
  { name: 'Pollo', unit: 'kg', cost: 800, category: 'Carnes' },
  { name: 'Crema de leche', unit: 'l', cost: 600, category: 'Lácteos' },
  { name: 'Choclo', unit: 'uni', cost: 80, category: 'Verduras' },
  { name: 'Salsa blanca', unit: 'l', cost: 400, category: 'Salsas' },
  { name: 'Albahaca', unit: 'g', cost: 1, category: 'Especias' },
  { name: 'Queso cremoso', unit: 'kg', cost: 900, category: 'Lácteos' },
  { name: 'Tapas de tarta', unit: 'doc', cost: 250, category: 'Masa' },
  { name: 'Zapallito', unit: 'uni', cost: 60, category: 'Verduras' },
  { name: 'Zanahoria', unit: 'uni', cost: 40, category: 'Verduras' },
  { name: 'Calabaza', unit: 'kg', cost: 200, category: 'Verduras' },
  { name: 'Nuez moscada', unit: 'g', cost: 3, category: 'Especias' },
  { name: 'Espinaca', unit: 'kg', cost: 300, category: 'Verduras' },
  { name: 'Ricota', unit: 'kg', cost: 500, category: 'Lácteos' },
  { name: 'Queso rallado', unit: 'kg', cost: 700, category: 'Lácteos' },
  { name: 'Salsa bolognesa', unit: 'l', cost: 350, category: 'Salsas' },
  { name: 'Carne picada', unit: 'kg', cost: 1200, category: 'Carnes' },
  { name: 'Papa', unit: 'kg', cost: 100, category: 'Verduras' },
  { name: 'Salsa filetto', unit: 'l', cost: 300, category: 'Salsas' },
  { name: 'Láminas de pasta', unit: 'kg', cost: 400, category: 'Masa' },
  { name: 'Lomo', unit: 'kg', cost: 2500, category: 'Carnes' },
  { name: 'Pan de miga', unit: 'uni', cost: 150, category: 'Pan' },
  { name: 'Lechuga', unit: 'uni', cost: 40, category: 'Verduras' },
  { name: 'Mayonesa', unit: 'l', cost: 400, category: 'Salsas' },
  { name: 'Milanesa de carne', unit: 'kg', cost: 2000, category: 'Carnes' },
  { name: 'Medallón de garbanzo', unit: 'uni', cost: 300, category: 'Congelados' },
  { name: 'Pan integral', unit: 'uni', cost: 120, category: 'Pan' },
  { name: 'Palta', unit: 'uni', cost: 200, category: 'Verduras' },
  { name: 'Mostaza', unit: 'l', cost: 350, category: 'Salsas' },
  { name: 'Bondiola', unit: 'kg', cost: 1800, category: 'Carnes' },
  { name: 'Cebolla morada', unit: 'uni', cost: 60, category: 'Verduras' },
  { name: 'Salsa criolla', unit: 'l', cost: 300, category: 'Salsas' },
  { name: 'Pan de hamburguesa', unit: 'uni', cost: 100, category: 'Pan' },
  { name: 'Queso cheddar', unit: 'kg', cost: 1000, category: 'Lácteos' },
  { name: 'Panceta', unit: 'kg', cost: 1500, category: 'Fiambres' },
  { name: 'Papas fritas (congeladas)', unit: 'kg', cost: 400, category: 'Congelados' },
  { name: 'Huevo duro', unit: 'uni', cost: 55, category: 'Huevos' },
]

// ============== 25 DISHES ==============

const DISH_TEMPLATES = {
  Pizzas: [
    { name: 'Muzzarella', price: 3800, ingr: [{ name: 'Harina 0000', qty: 0.25 }, { name: 'Agua', qty: 0.15 }, { name: 'Levadura fresca', qty: 10 }, { name: 'Sal', qty: 0.005 }, { name: 'Muzzarella', qty: 0.2 }, { name: 'Salsa de tomate', qty: 0.1 }, { name: 'Aceite de oliva', qty: 0.03 }] },
    { name: 'Napolitana', price: 4200, ingr: [{ name: 'Harina 0000', qty: 0.25 }, { name: 'Agua', qty: 0.15 }, { name: 'Levadura fresca', qty: 10 }, { name: 'Muzzarella', qty: 0.2 }, { name: 'Salsa de tomate', qty: 0.1 }, { name: 'Tomate perita', qty: 2 }, { name: 'Ajo', qty: 3 }, { name: 'Aceite de oliva', qty: 0.03 }] },
    { name: 'Fugazzeta', price: 4500, ingr: [{ name: 'Harina 0000', qty: 0.25 }, { name: 'Agua', qty: 0.15 }, { name: 'Levadura fresca', qty: 10 }, { name: 'Muzzarella', qty: 0.25 }, { name: 'Cebolla', qty: 2 }, { name: 'Aceite de oliva', qty: 0.03 }, { name: 'Orégano', qty: 5 }] },
    { name: 'Especial', price: 4800, ingr: [{ name: 'Harina 0000', qty: 0.25 }, { name: 'Agua', qty: 0.15 }, { name: 'Levadura fresca', qty: 10 }, { name: 'Muzzarella', qty: 0.2 }, { name: 'Salsa de tomate', qty: 0.1 }, { name: 'Jamón cocido', qty: 0.1 }, { name: 'Morrón', qty: 1 }, { name: 'Aceitunas verdes', qty: 0.05 }, { name: 'Huevo', qty: 1 }] },
    { name: 'Calabresa', price: 4600, ingr: [{ name: 'Harina 0000', qty: 0.25 }, { name: 'Agua', qty: 0.15 }, { name: 'Levadura fresca', qty: 10 }, { name: 'Muzzarella', qty: 0.2 }, { name: 'Salsa de tomate', qty: 0.1 }, { name: 'Longaniza', qty: 0.15 }, { name: 'Morrón', qty: 1 }, { name: 'Aceite de oliva', qty: 0.03 }] }
  ],
  Empanadas: [
    { name: 'Carne cortada a cuchillo', price: 3200, ingr: [{ name: 'Tapas para empanada', qty: 1 }, { name: 'Carne (cortada a cuchillo)', qty: 0.5 }, { name: 'Cebolla', qty: 2 }, { name: 'Huevo duro', qty: 3 }, { name: 'Aceitunas verdes', qty: 0.05 }, { name: 'Comino', qty: 5 }, { name: 'Pimentón', qty: 5 }, { name: 'Grasa de pella', qty: 0.05 }] },
    { name: 'Carne picante', price: 3400, ingr: [{ name: 'Tapas para empanada', qty: 1 }, { name: 'Carne (cortada a cuchillo)', qty: 0.5 }, { name: 'Cebolla', qty: 2 }, { name: 'Ají molido', qty: 10 }, { name: 'Huevo duro', qty: 3 }, { name: 'Aceitunas verdes', qty: 0.05 }, { name: 'Pimentón', qty: 5 }] },
    { name: 'Pollo', price: 3000, ingr: [{ name: 'Tapas para empanada', qty: 1 }, { name: 'Pollo', qty: 0.4 }, { name: 'Cebolla', qty: 2 }, { name: 'Morrón', qty: 1 }, { name: 'Crema de leche', qty: 0.1 }, { name: 'Comino', qty: 5 }, { name: 'Huevo duro', qty: 2 }] },
    { name: 'Jamón y queso', price: 2800, ingr: [{ name: 'Tapas para empanada', qty: 1 }, { name: 'Jamón cocido', qty: 0.2 }, { name: 'Muzzarella', qty: 0.2 }, { name: 'Crema de leche', qty: 0.05 }] },
    { name: 'Humita', price: 2900, ingr: [{ name: 'Tapas para empanada', qty: 1 }, { name: 'Choclo', qty: 3 }, { name: 'Cebolla', qty: 1 }, { name: 'Salsa blanca', qty: 0.2 }, { name: 'Albahaca', qty: 10 }, { name: 'Queso cremoso', qty: 0.1 }] }
  ],
  Tartas: [
    { name: 'Pollo y verduras', price: 3500, ingr: [{ name: 'Tapas de tarta', qty: 1 }, { name: 'Pollo', qty: 0.3 }, { name: 'Cebolla', qty: 1 }, { name: 'Zapallito', qty: 2 }, { name: 'Zanahoria', qty: 1 }, { name: 'Crema de leche', qty: 0.1 }, { name: 'Huevo', qty: 3 }] },
    { name: 'Calabaza', price: 3300, ingr: [{ name: 'Tapas de tarta', qty: 1 }, { name: 'Calabaza', qty: 0.5 }, { name: 'Cebolla', qty: 1 }, { name: 'Queso cremoso', qty: 0.1 }, { name: 'Crema de leche', qty: 0.1 }, { name: 'Nuez moscada', qty: 3 }, { name: 'Huevo', qty: 3 }] },
    { name: 'Espinaca y ricota', price: 3400, ingr: [{ name: 'Tapas de tarta', qty: 1 }, { name: 'Espinaca', qty: 0.4 }, { name: 'Ricota', qty: 0.2 }, { name: 'Ajo', qty: 2 }, { name: 'Huevo', qty: 3 }, { name: 'Queso rallado', qty: 0.05 }] },
    { name: 'Zapallito', price: 3200, ingr: [{ name: 'Tapas de tarta', qty: 1 }, { name: 'Zapallito', qty: 0.5 }, { name: 'Cebolla', qty: 2 }, { name: 'Queso cremoso', qty: 0.1 }, { name: 'Huevo', qty: 3 }, { name: 'Albahaca', qty: 10 }] },
    { name: 'Choclo', price: 3300, ingr: [{ name: 'Tapas de tarta', qty: 1 }, { name: 'Choclo', qty: 4 }, { name: 'Cebolla', qty: 1 }, { name: 'Crema de leche', qty: 0.15 }, { name: 'Huevo', qty: 3 }, { name: 'Pimentón', qty: 5 }] }
  ],
  Pastas: [
    { name: 'Ravioles de ricota y espinaca', price: 4200, ingr: [{ name: 'Harina 0000', qty: 0.3 }, { name: 'Huevo', qty: 4 }, { name: 'Ricota', qty: 0.25 }, { name: 'Espinaca', qty: 0.2 }, { name: 'Salsa de tomate', qty: 0.2 }, { name: 'Queso rallado', qty: 0.05 }] },
    { name: 'Tallarines al huevo', price: 3800, ingr: [{ name: 'Harina 0000', qty: 0.3 }, { name: 'Huevo', qty: 4 }, { name: 'Salsa bolognesa', qty: 0.2 }, { name: 'Carne picada', qty: 0.2 }, { name: 'Tomate perita', qty: 2 }, { name: 'Queso rallado', qty: 0.05 }] },
    { name: 'Ñoquis de papa', price: 3600, ingr: [{ name: 'Papa', qty: 0.5 }, { name: 'Harina 0000', qty: 0.2 }, { name: 'Huevo', qty: 1 }, { name: 'Salsa filetto', qty: 0.2 }, { name: 'Queso rallado', qty: 0.05 }, { name: 'Sal', qty: 0.005 }] },
    { name: 'Sorrentinos', price: 4400, ingr: [{ name: 'Harina 0000', qty: 0.3 }, { name: 'Huevo', qty: 4 }, { name: 'Jamón cocido', qty: 0.15 }, { name: 'Muzzarella', qty: 0.15 }, { name: 'Ricota', qty: 0.1 }, { name: 'Crema de leche', qty: 0.2 }] },
    { name: 'Lasagna', price: 4800, ingr: [{ name: 'Láminas de pasta', qty: 0.3 }, { name: 'Carne picada', qty: 0.3 }, { name: 'Salsa de tomate', qty: 0.3 }, { name: 'Muzzarella', qty: 0.2 }, { name: 'Ricota', qty: 0.15 }, { name: 'Espinaca', qty: 0.1 }] }
  ],
  Sandwiches: [
    { name: 'Lomito completo', price: 5200, ingr: [{ name: 'Lomo', qty: 0.2 }, { name: 'Pan de miga', qty: 1 }, { name: 'Lechuga', qty: 1 }, { name: 'Tomate perita', qty: 1 }, { name: 'Huevo', qty: 1 }, { name: 'Jamón cocido', qty: 0.05 }, { name: 'Queso cremoso', qty: 0.05 }, { name: 'Papas fritas (congeladas)', qty: 0.15 }] },
    { name: 'Milanesa', price: 4800, ingr: [{ name: 'Milanesa de carne', qty: 0.2 }, { name: 'Pan de miga', qty: 1 }, { name: 'Lechuga', qty: 1 }, { name: 'Tomate perita', qty: 1 }, { name: 'Mayonesa', qty: 0.03 }, { name: 'Jamón cocido', qty: 0.05 }, { name: 'Queso cremoso', qty: 0.05 }] },
    { name: 'Veggie', price: 4200, ingr: [{ name: 'Medallón de garbanzo', qty: 1 }, { name: 'Pan integral', qty: 1 }, { name: 'Lechuga', qty: 1 }, { name: 'Tomate perita', qty: 1 }, { name: 'Palta', qty: 0.5 }, { name: 'Mostaza', qty: 0.02 }] },
    { name: 'Bondiola', price: 5000, ingr: [{ name: 'Bondiola', qty: 0.2 }, { name: 'Pan de miga', qty: 1 }, { name: 'Lechuga', qty: 1 }, { name: 'Tomate perita', qty: 1 }, { name: 'Cebolla morada', qty: 0.5 }, { name: 'Salsa criolla', qty: 0.05 }] },
    { name: 'Hamburguesa artesanal', price: 4600, ingr: [{ name: 'Carne picada', qty: 0.2 }, { name: 'Pan de hamburguesa', qty: 1 }, { name: 'Lechuga', qty: 1 }, { name: 'Tomate perita', qty: 1 }, { name: 'Queso cheddar', qty: 0.05 }, { name: 'Panceta', qty: 0.05 }, { name: 'Papas fritas (congeladas)', qty: 0.15 }] }
  ]
}

// ============== 60 CLIENTS ==============

const NAMES = [
  'Juan', 'Carlos', 'María', 'Laura', 'Diego', 'Ana', 'Pablo', 'Florencia',
  'Martín', 'Romina', 'Lucas', 'Sofía', 'Nicolás', 'Julieta', 'Fernando',
  'Valeria', 'Alejandro', 'Carolina', 'Gustavo', 'Luciana', 'Marcelo',
  'Gabriela', 'Sebastián', 'Verónica', 'Javier', 'Marcela', 'Leandro',
  'Silvina', 'Damián', 'Nadia', 'Federico', 'Belén', 'Andrés', 'Melina',
  'Ezequiel', 'Cinthia', 'Emiliano', 'Noelia', 'Cristian', 'Yamila',
  'Sergio', 'Evelyn', 'Matías', 'Daiana', 'Rodrigo', 'Ayelen', 'Julián',
  'Candela', 'Brian', 'Aldana', 'Kevin', 'Morena', 'Jonathan', 'Brisa',
  'Hernán', 'Milagros', 'Esteban', 'Lourdes', 'Maximiliano'
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
  'Santiago', 'Domínguez', 'Carrizo', 'Ledesma', 'Ávila'
]

const STREETS = [
  'Av. Corrientes', 'Av. Santa Fe', 'Callao', 'Córdoba', 'Florida',
  'Lavalle', 'Av. de Mayo', 'Belgrano', 'Rivadavia', 'San Martín',
  'Av. Cabildo', 'Av. Libertador', 'Bulnes', 'Acuña de Figueroa',
  'Av. Pueyrredón', 'Juncal', 'Paraguay', 'Uruguay', 'Viamonte',
  'Tucumán', 'Montevideo', 'Brasil', 'Carlos Calvo', 'Independencia',
  'Adolfo Alsina', 'Moreno', 'Cochabamba', 'Caseros', 'México',
  'Venezuela', 'Chacabuco', 'Piedras', 'Saavedra', 'Salta', 'Jujuy',
  'Lima', 'Bernardo de Irigoyen', 'Cerrito', 'Talcalguano',
  'Riobamba', 'Azcuénaga', 'Fray Justo Sarmiento', 'Rodríguez Peña'
]

const LOCALITIES = [
  'Palermo', 'Recoleta', 'Belgrano', 'Nuñez', 'Caballito', 'Almagro',
  'Villa Crespo', 'La Boca', 'San Telmo', 'Barracas', 'Flores',
  'Floresta', 'Villa Urquiza', 'Saavedra', 'Devoto'
]

const NOTES_TEMPLATES = [
  'Sin cebolla', 'Con extra queso', 'Bien cocido', 'Sin sal',
  'Enviar después de las 20:00', 'Llamar antes de enviar', 'Poco condimento',
  'Sin TACC', 'Para celíaco', 'Acompañar con salsas extra', '',
  '', '', '', '', ''
]

const STATUSES = ['pending', 'confirmed', 'assembled', 'delivered']

function generateClients() {
  const used = new Set()
  const clients = []
  let id = 1

  for (let i = 0; i < 60; i++) {
    const name = NAMES[i]
    let lastName = LASTNAMES[i]
    while (used.has(`${name}|${lastName}`)) {
      lastName += randInt(0, 1) ? ' ' + LASTNAMES[randInt(0, LASTNAMES.length - 1)] : ''
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
  }
  return clients
}

function generateIngredients() {
  return INGREDIENT_CATALOG.map((ing, i) => ({
    id: i + 1,
    name: ing.name,
    unit: ing.unit,
    cost: ing.cost,
    category: ing.category,
    is_active: true
  }))
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
      dishes.push({
        id: id++,
        name: item.name,
        category,
        price: item.price,
        ingredients: structuredIngredients,
        is_active: true
      })
    }
  }
  return dishes
}

// ============== WEEKS ==============

function generateWeeks(allDishes, clients, ingredients) {
  const weeks = []
  let weekId = 1
  let orderId = 1
  let itemId = 1
  let prodId = 1
  let ingId = ingredients.length + 1
  const allClients = clients.map(c => c.id)

  const currentSunday = getSunday(NOW)
  const startDate = getSunday(new Date(2020, 0, 1))
  const totalWeeks = Math.ceil((currentSunday.getTime() - startDate.getTime()) / (7 * 86400000))
  const weekData = []

  for (let i = 0; i <= totalWeeks; i++) {
    const weekStart = new Date(startDate)
    weekStart.setDate(weekStart.getDate() + i * 7)
    const weekEnd = getSaturday(new Date(weekStart))

    const ws = fmtDate(weekStart)
    const we = fmtDate(weekEnd)
    const isCurrent = fmtDate(currentSunday) === ws

    const week = {
      id: weekId++,
      week_start: ws,
      week_end: we,
      is_current: isCurrent
    }
    weeks.push(week)

    if (ws < '2023-01-01') {
      weekData.push({ week, orders: [], orderItems: [], productionLogs: [] })
      continue
    }

    const availableDishes = pick(allDishes, 10 + randInt(0, 5))
    availableDishes.sort((a, b) => a.id - b.id)

    const numOrders = randInt(10, 30)

    const participatingClients = pick(allClients, Math.min(allClients.length, Math.floor(numOrders * 0.7) + randInt(0, 10)))

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
      const dayOffset = randInt(0, 4)
      orderDay.setDate(orderDay.getDate() + dayOffset)
      orderDay.setHours(randInt(10, 20), randInt(0, 59), randInt(0, 59))

      const order = {
        id: orderId++,
        client_id: clientId,
        week_id: week.id,
        status: isCurrent && dayOffset > 4 ? 'pending' : status,
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
            prodDay.setDate(prodDay.getDate() + randInt(4, 6))
            productionLogs.push({
              id: prodId++,
              week_id: week.id,
              dish_id: dish.id,
              quantity_produced: produced,
              date_produced: fmtDate(prodDay)
            })
          }
        } else {
          const prodDay = new Date(weekStart)
          prodDay.setDate(prodDay.getDate() + randInt(5, 6))
          for (let d = 0; d < randInt(1, 2); d++) {
            const day = new Date(prodDay)
            day.setDate(day.getDate() - d)
            productionLogs.push({
              id: prodId++,
              week_id: week.id,
              dish_id: dish.id,
              quantity_produced: d === 0 ? totalOrdered : 0,
              date_produced: fmtDate(day)
            })
          }
        }
      }
    }

    weekData.push({ week, orders, orderItems, productionLogs })
  }

  const allOrders = weekData.flatMap(wd => wd.orders)
  const allOrderItems = weekData.flatMap(wd => wd.orderItems)
  const allProductionLogs = weekData.flatMap(wd => wd.productionLogs)

  return {
    weeks,
    dishes: allDishes,
    clients,
    ingredients,
    orders: allOrders,
    orderItems: allOrderItems,
    productionLog: allProductionLogs,
    deliverySettings: { defaultFee: 500 },
    _nextId: prodId + itemId + orderId + weekId + allDishes.length + clients.length + allDishes.length + 100
  }
}

// ============== MAIN ==============

function main() {
  const ingredients = generateIngredients()
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
  const weekSummaries = data.weeks.map(w => {
    const weekOrders = data.orders.filter(o => o.week_id === w.id)
    const weekClients = new Set(weekOrders.map(o => o.client_id)).size
    return `  ${w.week_start} → ${w.week_end}${w.is_current ? ' (actual)' : ''}: ${weekOrders.length} pedidos, ${weekClients} clientes`
  })

  const topClientId = Object.entries(
    data.orders.reduce((acc, o) => { acc[o.client_id] = (acc[o.client_id] || 0) + 1; return acc }, {})
  ).sort((a, b) => b[1] - a[1])[0]
  const topClient = data.clients.find(c => c.id === parseInt(topClientId?.[0]))

  const costExamples = allDishes.slice(0, 5).map(d => {
    const cost = d.ingredients.reduce((sum, item) => {
      const ing = ingredients.find(i => i.id === item.ingredientId)
      return sum + (ing?.cost || 0) * item.quantity
    }, 0)
    return `  ${d.name}: costo $${cost.toFixed(2)} → precio $${d.price.toFixed(2)} (margen ${((d.price - cost) / d.price * 100).toFixed(0)}%)`
  })

  console.log(`
╔══════════════════════════════════════╗
║          PIU - SEED COMPLETADO       ║
╠══════════════════════════════════════╣
║  Archivo: ${filePath}
╠══════════════════════════════════════╣
║  Ingredientes: ${String(ingredients.length).padStart(4)}
║  Platos:       ${String(allDishes.length).padStart(4)}
║  Clientes:     ${String(clients.length).padStart(4)}
║  Pedidos:      ${String(totalOrders).padStart(4)}
║  Items:        ${String(totalItems).padStart(4)}
╠══════════════════════════════════════╣`)
  for (const s of weekSummaries) {
    console.log(s)
  }
  console.log(`╠══════════════════════════════════════╣`)
  console.log(`║  Costos de producción (ejemplos):     ║`)
  for (const c of costExamples) {
    console.log(c.padEnd(42))
  }
  console.log(`╠══════════════════════════════════════╣`)
  if (topClient) {
    console.log(`║  Cliente top: ${(topClient.name + ' ' + topClient.last_name).padEnd(24)}║`)
    console.log(`║  Pedidos del top: ${String(topClientId[1]).padStart(18)}║`)
  }
  console.log(`╚══════════════════════════════════════╝`)
}

main()
