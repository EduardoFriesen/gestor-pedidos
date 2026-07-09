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

// ============== 25 DISHES ==============

const DISH_TEMPLATES = {
  Pizzas: [
    { name: 'Muzzarella', price: 3800, ingr: 'Harina 0000: 250 g\nAgua: 150 ml\nLevadura: 10 g\nSal: 5 g\nMuzzarella: 200 g\nSalsa de tomate: 100 ml\nAceite de oliva: 30 ml' },
    { name: 'Napolitana', price: 4200, ingr: 'Harina 0000: 250 g\nAgua: 150 ml\nLevadura: 10 g\nMuzzarella: 200 g\nSalsa de tomate: 100 ml\nTomate: 2 uni\nAjo: 3 dientes\nAceite de oliva: 30 ml' },
    { name: 'Fugazzeta', price: 4500, ingr: 'Harina 0000: 250 g\nAgua: 150 ml\nLevadura: 10 g\nMuzzarella: 250 g\nCebolla: 2 uni\nAceite de oliva: 30 ml\nOrégano: 5 g' },
    { name: 'Especial', price: 4800, ingr: 'Harina 0000: 250 g\nAgua: 150 ml\nLevadura: 10 g\nMuzzarella: 200 g\nSalsa de tomate: 100 ml\nJamón: 100 g\nMorrón: 1 uni\nAceitunas: 50 g\nHuevo: 1 uni' },
    { name: 'Calabresa', price: 4600, ingr: 'Harina 0000: 250 g\nAgua: 150 ml\nLevadura: 10 g\nMuzzarella: 200 g\nSalsa de tomate: 100 ml\nLonganiza: 150 g\nMorrón: 1 uni\nAceite de oliva: 30 ml' }
  ],
  Empanadas: [
    { name: 'Carne cortada a cuchillo', price: 3200, ingr: 'Tapas para empanada: 12 uni\nCarne: 500 g\nCebolla: 2 uni\nHuevo duro: 3 uni\nAceitunas: 50 g\nComino: 5 g\nPimentón: 5 g\nGrasa de pella: 50 g' },
    { name: 'Carne picante', price: 3400, ingr: 'Tapas para empanada: 12 uni\nCarne: 500 g\nCebolla: 2 uni\nAjí molido: 10 g\nHuevo duro: 3 uni\nAceitunas: 50 g\nPimentón: 5 g' },
    { name: 'Pollo', price: 3000, ingr: 'Tapas para empanada: 12 uni\nPollo: 400 g\nCebolla: 2 uni\nMorrón: 1 uni\nCrema: 100 ml\nComino: 5 g\nHuevo duro: 2 uni' },
    { name: 'Jamón y queso', price: 2800, ingr: 'Tapas para empanada: 12 uni\nJamón cocido: 200 g\nMuzzarella: 200 g\nCrema: 50 ml' },
    { name: 'Humita', price: 2900, ingr: 'Tapas para empanada: 12 uni\nChoclo: 3 uni\nCebolla: 1 uni\nSalsa blanca: 200 ml\nAlbahaca: 10 g\nQueso cremoso: 100 g' }
  ],
  Tartas: [
    { name: 'Pollo y verduras', price: 3500, ingr: 'Tapas de tarta: 2 uni\nPollo: 300 g\nCebolla: 1 uni\nZapallito: 2 uni\nZanahoria: 1 uni\nCrema: 100 ml\nHuevo: 3 uni' },
    { name: 'Calabaza', price: 3300, ingr: 'Tapas de tarta: 2 uni\nCalabaza: 500 g\nCebolla: 1 uni\nQueso cremoso: 100 g\nCrema: 100 ml\nNuez moscada: 3 g\nHuevo: 3 uni' },
    { name: 'Espinaca y ricota', price: 3400, ingr: 'Tapas de tarta: 2 uni\nEspinaca: 400 g\nRicota: 200 g\nAjo: 2 dientes\nHuevo: 3 uni\nQueso rallado: 50 g' },
    { name: 'Zapallito', price: 3200, ingr: 'Tapas de tarta: 2 uni\nZapallito: 500 g\nCebolla: 2 uni\nQueso cremoso: 100 g\nHuevo: 3 uni\nAlbahaca: 10 g' },
    { name: 'Choclo', price: 3300, ingr: 'Tapas de tarta: 2 uni\nChoclo: 4 uni\nCebolla: 1 uni\nCrema: 150 ml\nHuevo: 3 uni\nPimentón: 5 g' }
  ],
  Pastas: [
    { name: 'Ravioles de ricota y espinaca', price: 4200, ingr: 'Harina 0000: 300 g\nHuevo: 4 uni\nRicota: 250 g\nEspinaca: 200 g\nSalsa de tomate: 200 ml\nQueso rallado: 50 g' },
    { name: 'Tallarines al huevo', price: 3800, ingr: 'Harina 0000: 300 g\nHuevo: 4 uni\nSalsa bolognesa: 200 ml\nCarne picada: 200 g\nTomate: 2 uni\nQueso rallado: 50 g' },
    { name: 'Ñoquis de papa', price: 3600, ingr: 'Papa: 500 g\nHarina 0000: 200 g\nHuevo: 1 uni\nSalsa filetto: 200 ml\nQueso rallado: 50 g\nSal: 5 g' },
    { name: 'Sorrentinos', price: 4400, ingr: 'Harina 0000: 300 g\nHuevo: 4 uni\nJamón: 150 g\nMuzzarella: 150 g\nRicota: 100 g\nSalsa crema: 200 ml' },
    { name: 'Lasagna', price: 4800, ingr: 'Láminas de pasta: 300 g\nCarne picada: 300 g\nSalsa de tomate: 300 ml\nMuzzarella: 200 g\nRicota: 150 g\nEspinaca: 100 g' }
  ],
  Sandwiches: [
    { name: 'Lomito completo', price: 5200, ingr: 'Lomo: 200 g\nPan de miga: 1 uni\nLechuga: 50 g\nTomate: 1 uni\nHuevo: 1 uni\nJamón: 50 g\nQueso: 50 g\nPapas fritas: 150 g' },
    { name: 'Milanesa', price: 4800, ingr: 'Milanesa de carne: 200 g\nPan de miga: 1 uni\nLechuga: 50 g\nTomate: 1 uni\nMayonesa: 30 ml\nJamón: 50 g\nQueso: 50 g' },
    { name: 'Veggie', price: 4200, ingr: 'Medallón de garbanzo: 200 g\nPan integral: 1 uni\nLechuga: 50 g\nTomate: 1 uni\nPalta: 50 g\nMostaza: 20 ml' },
    { name: 'Bondiola', price: 5000, ingr: 'Bondiola: 200 g\nPan de miga: 1 uni\nLechuga: 50 g\nTomate: 1 uni\nCebolla morada: 50 g\nSalsa criolla: 50 ml' },
    { name: 'Hamburguesa artesanal', price: 4600, ingr: 'Carne picada: 200 g\nPan de hamburguesa: 1 uni\nLechuga: 50 g\nTomate: 1 uni\nQueso cheddar: 50 g\nPanceta: 50 g\nPapas fritas: 150 g' }
  ]
}

function generateDishes() {
  let id = 1
  const dishes = []
  for (const [category, items] of Object.entries(DISH_TEMPLATES)) {
    for (const item of items) {
      dishes.push({
        id: id++,
        name: item.name,
        category,
        price: item.price,
        ingredients: item.ingr,
        is_active: true
      })
    }
  }
  return dishes
}

// ============== WEEKS ==============

function generateWeeks(allDishes) {
  const weeks = []
  let weekId = 1
  let orderId = 1
  let itemId = 1
  let prodId = 1
  const clients = generateClients()
  const allClients = clients.map(c => c.id)

  // Generate weeks from Jan 2024 to current week
  const currentSunday = getSunday(NOW)
  const startDate = getSunday(new Date(2024, 0, 1))
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

    if (ws < '2024-05-01') {
      // Early weeks: fewer clients, smaller orders
      weekData.push({ week, orders: [], orderItems: [], productionLogs: [] })
      continue
    }

    // Vary the menu: 10-15 dishes available each week, some rotation
    const availableDishes = pick(allDishes, 10 + randInt(0, 5))
    availableDishes.sort((a, b) => a.id - b.id)

    // Seasonality: more orders in summer (Dec-Feb), fewer in winter (Jun-Aug)
    const month = weekStart.getMonth()
    let seasonalBase = 25
    if (month >= 11 || month <= 1) seasonalBase = 35
    else if (month >= 5 && month <= 7) seasonalBase = 18
    const numOrders = Math.min(allClients.length, seasonalBase + randInt(-5, 10))

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
        created_at: fmtDatetime(orderDay)
      }
      orders.push(order)

      for (const dish of itemDishes) {
        const qty = randInt(1, 3)
        orderItems.push({ id: itemId++, order_id: order.id, dish_id: dish.id, quantity: qty })
      }
    }

    // Production logs
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

  // Combine all weeks' data
  const allOrders = weekData.flatMap(wd => wd.orders)
  const allOrderItems = weekData.flatMap(wd => wd.orderItems)
  const allProductionLogs = weekData.flatMap(wd => wd.productionLogs)

  return {
    weeks,
    dishes: allDishes,
    clients,
    orders: allOrders,
    orderItems: allOrderItems,
    productionLog: allProductionLogs,
    _nextId: prodId + itemId + orderId + weekId + allDishes.length + clients.length + 100
  }
}

// ============== MAIN ==============

function main() {
  const allDishes = generateDishes()
  const data = generateWeeks(allDishes)

  // Determine path: use XDG config or fallback
  const configDir = process.env.XDG_CONFIG_HOME
    ? path.join(process.env.XDG_CONFIG_HOME, 'piu')
    : path.join(os.homedir(), '.config', 'piu')

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
  }

  const filePath = path.join(configDir, 'piu.json')
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')

  // Summary
  const totalOrders = data.orders.length
  const totalItems = data.orderItems.length
  const weekSummaries = data.weeks.map(w => {
    const weekOrders = data.orders.filter(o => o.week_id === w.id)
    const weekClients = new Set(weekOrders.map(o => o.client_id)).size
    return `  ${w.week_start} → ${w.week_end}${w.is_current ? ' (actual)' : ''}: ${weekOrders.length} pedidos, ${weekClients} clientes`
  })

  const topClients = {}
  for (const o of data.orders) {
    topClients[o.client_id] = (topClients[o.client_id] || 0) + 1
  }
  const topClientId = Object.entries(topClients).sort((a, b) => b[1] - a[1])[0]
  const topClient = data.clients.find(c => c.id === parseInt(topClientId[0]))

  console.log(`
╔══════════════════════════════════════╗
║          PIU - SEED COMPLETADO       ║
╠══════════════════════════════════════╣
║  Archivo: ${filePath}
╠══════════════════════════════════════╣
║  Clientes:      ${String(data.clients.length).padStart(4)}
║  Platos:        ${String(data.dishes.length).padStart(4)}
║  Pedidos total: ${String(totalOrders).padStart(4)}
║  Items total:   ${String(totalItems).padStart(4)}
╠══════════════════════════════════════╣`)
  for (const s of weekSummaries) {
    console.log(s)
  }
  console.log(`╠══════════════════════════════════════╣`)
  console.log(`║  Cliente top: ${(topClient?.name + ' ' + topClient?.last_name).padEnd(24)}║`)
  console.log(`║  Pedidos del top: ${String(topClientId[1]).padStart(18)}║`)
  console.log(`╚══════════════════════════════════════╝`)
}

main()
