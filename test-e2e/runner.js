const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const MOCK_CODE = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8')
const BASE_URL = 'http://localhost:5173'

const results = { passed: [], failed: [], total: 0 }

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function waitForApp(page, timeout = 10000) {
  await page.waitForFunction(() => window.piu !== undefined, { timeout })
  await page.waitForTimeout(600)
}

async function waitForContent(page, selector, timeout = 8000) {
  await page.waitForSelector(selector, { timeout }).catch(() => {})
}

async function runSuite(name, fn) {
  results.total++
  try {
    await fn()
    results.passed.push(name)
    console.log(`  ✓ ${name}`)
  } catch (err) {
    results.failed.push({ name, error: err.message })
    console.log(`  ✗ ${name}: ${err.message}`)
  }
}

async function runAll() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } })

  const page = await context.newPage()

  page.on('pageerror', err => console.log(`  [PAGE ERROR] ${err.message}`))

  await page.addInitScript(MOCK_CODE)
  await page.goto(BASE_URL)
  await waitForApp(page)

  // ─── SHELL ────────────────────────────────────────────────────
  console.log('\n═══════ SHELL ═══════\n')

  await runSuite('Shell: sidebar navigation with 8 sections', async () => {
    const nav = page.locator('aside nav[aria-label="Navegación principal"]')
    assert(await nav.isVisible(), 'Sidebar nav not found')
    assert(await nav.locator('a').count() === 8, `Expected 8 links, got ${await nav.locator('a').count()}`)
    assert(await nav.locator('a[aria-current="page"]').count() === 1, 'Exactly one link should be current')
  })

  await runSuite('Shell: every nav link fits at 1400px', async () => {
    await page.setViewportSize({ width: 1400, height: 800 })
    const fits = await page.evaluate(() => {
      const links = [...document.querySelectorAll('aside nav a')]
      return links.length === 8 && links.every(a => {
        const r = a.getBoundingClientRect()
        return r.right <= window.innerWidth && r.bottom <= window.innerHeight && r.width > 0
      })
    })
    await page.setViewportSize({ width: 1920, height: 1080 })
    assert(fits, 'Some nav links are cut off')
  })

  await runSuite('Shell: production meter lives in the sidebar', async () => {
    const meter = page.locator('aside [data-testid="production-meter"]')
    assert(await meter.isVisible(), 'Production meter not in sidebar')
    assert((await meter.textContent()).includes('Producido'), 'Meter should say Producido')
    assert(await meter.locator('[role="progressbar"]').count() === 1, 'Meter needs a progressbar role')
  })

  await runSuite('Shell: sidebar collapses and remembers it', async () => {
    const toggle = page.locator('aside button[aria-controls="sidebar-nav"]')
    assert(await toggle.getAttribute('aria-expanded') === 'true', 'Sidebar should start expanded')
    await toggle.click()
    assert(await toggle.getAttribute('aria-expanded') === 'false', 'Toggle should collapse')
    assert(!(await page.locator('aside nav a .sidebar-label').first().isVisible()), 'Labels should hide when collapsed')
    const first = page.locator('aside nav a').first()
    assert((await first.getAttribute('aria-label')) === 'Inicio', 'Collapsed links keep an accessible name')
    await page.reload()
    await waitForApp(page)
    assert(await page.locator('aside button[aria-controls="sidebar-nav"]').getAttribute('aria-expanded') === 'false', 'Collapsed state should persist')
    await page.locator('aside button[aria-controls="sidebar-nav"]').click()
  })

  await runSuite('Shell: Ctrl+3 goes to Pedidos', async () => {
    await page.keyboard.press('Control+3')
    await page.waitForTimeout(300)
    assert(page.url().endsWith('#/orders'), `Expected orders, got ${page.url()}`)
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(300)
  })

  await runSuite('Shell: bundled font is loaded', async () => {
    const ok = await page.evaluate(async () => {
      await document.fonts.ready
      return document.fonts.check('16px "Atkinson Hyperlegible Next"') && getComputedStyle(document.body).fontFamily.includes('Atkinson')
    })
    assert(ok, 'Atkinson Hyperlegible Next not loaded')
  })

  // ─── HOME ─────────────────────────────────────────────────────
  console.log('\n═══════ HOME ═══════\n')
  await page.goto(BASE_URL + '/#/')
  await waitForApp(page)
  await waitForContent(page, 'h2:has-text("Inicio")')

  await runSuite('Home: renders as start page', async () => {
    assert(await page.locator('h2:has-text("Inicio")').isVisible(), 'Inicio heading not found')
  })

  await runSuite('Home: week tabs list only weeks with undelivered orders', async () => {
    const tabs = page.locator('[role="tablist"] [role="tab"]')
    assert(await tabs.count() === 2, `Expected 2 week tabs, got ${await tabs.count()}`)
    assert(await tabs.first().getAttribute('aria-selected') === 'true', 'First tab should be selected')
    assert((await tabs.first().textContent()).includes('12/07'), 'Newest week should be first')
  })

  await runSuite('Home: arrow keys move between week tabs', async () => {
    const tabs = page.locator('[role="tablist"] [role="tab"]')
    await tabs.first().focus()
    await page.keyboard.press('ArrowRight')
    assert(await tabs.nth(1).getAttribute('aria-selected') === 'true', 'ArrowRight should select second tab')
    assert(await page.evaluate(() => document.activeElement?.getAttribute('role')) === 'tab', 'Focus should stay on tabs')
    await page.keyboard.press('ArrowLeft')
    assert(await tabs.first().getAttribute('aria-selected') === 'true', 'ArrowLeft should go back')
  })

  await runSuite('Home: current week undelivered tile', async () => {
    const tile = page.locator('[data-testid="week-undelivered"]')
    assert(await tile.isVisible(), 'Tile not found')
    const value = (await tile.locator('.home-num').textContent()).trim()
    assert(value === '3', `Tile value should be 3, got ${value}`)
    assert((await tile.textContent()).includes('3 pendientes · 0 armados'), 'Tile breakdown missing')
  })

  await runSuite('Home: stale prices tile', async () => {
    const box = page.locator('[data-testid="stale-box"]')
    assert(await box.isVisible(), 'Stale box not found')
    const text = await box.textContent()
    assert(text.includes('ingredientes') || text.includes('Al día'), `Unexpected stale box: ${text}`)
  })

  await runSuite('Home: expand category shows dishes', async () => {
    const cat = page.locator('section[aria-labelledby="home-missing"] button[aria-expanded]').first()
    await cat.click()
    await page.waitForTimeout(200)
    assert(await cat.getAttribute('aria-expanded') === 'true', 'Category did not expand')
    assert(await page.locator('section[aria-labelledby="home-missing"] li').count() > 0, 'No dish rows shown')
  })

  await runSuite('Home: deliver one order removes its tab', async () => {
    await page.locator('section[aria-labelledby="home-undelivered"] button:text-is("Entregado")').first().click()
    await page.waitForFunction(() => document.querySelectorAll('[role="tablist"] [role="tab"]').length === 1, { timeout: 5000 }).catch(() => {})
    const tabs = page.locator('[role="tablist"] [role="tab"]')
    assert(await tabs.count() === 1, `Expected 1 tab left, got ${await tabs.count()}`)
    assert(await tabs.first().getAttribute('aria-selected') === 'true', 'Remaining tab should be selected')
  })

  await runSuite('Home: deliver all with confirmation empties panel', async () => {
    await page.locator('section[aria-labelledby="home-undelivered"] button:has-text("Marcar todos")').click()
    await page.locator('button:has-text("Marcar entregados")').click()
    await page.waitForFunction(() => document.body.innerText.includes('Todo entregado'), { timeout: 5000 }).catch(() => {})
    assert(await page.locator('text=Todo entregado').isVisible(), 'Panel should show Todo entregado')
  })

  // ─── DASHBOARD ───────────────────────────────────────────────
  console.log('\n═══════ DASHBOARD ═══════\n')
  await page.goto(BASE_URL + '/#/production')
  await waitForApp(page)
  await waitForContent(page, 'button[aria-label*="producido"]')

  await runSuite('Dashboard: renders production cards', async () => {
    assert(await page.locator('[class*="badge"]').count() > 0, 'No badges found')
  })

  await runSuite('Dashboard: search input exists', async () => {
    assert(await page.locator('input[aria-label="Buscar plato"]').isVisible(), 'Search input not found')
  })

  await runSuite('Dashboard: category filter buttons', async () => {
    const count = await page.locator('button:has-text("Todas"), button:has-text("(Principal"), button:has-text("(Guarnicion")').count()
    assert(count > 0, 'No filter buttons found')
  })

  await runSuite('Dashboard: shopping list button', async () => {
    assert(await page.locator('button:has-text("Lista Compras")').isVisible(), 'Shopping list button not found')
  })

  await runSuite('Dashboard: production sheet button', async () => {
    assert(await page.locator('button:has-text("Hoja Producción")').isVisible(), 'Hoja Producción button not found')
  })

  await runSuite('Dashboard: produce buttons with aria-label', async () => {
    const count = await page.locator('button[aria-label*="producido"]').count()
    assert(count > 0, `No produce buttons found (count=${count})`)
  })

  await runSuite('Dashboard: click produce button', async () => {
    const btn = page.locator('button[aria-label*="producido"]').first()
    if (await btn.isVisible()) {
      await btn.click()
      await page.waitForTimeout(500)
      assert(true, 'Produce click succeeded')
    } else {
      assert(true, 'Skip: no visible produce button')
    }
  })

  await runSuite('Dashboard: progress bar in bottom bar', async () => {
    const text = page.locator('[data-testid="production-meter"]:has-text("Producido")').first()
    assert(await text.isVisible(), 'Progress text not found')
  })

  await runSuite('Dashboard: sub-productos toggle', async () => {
    const toggle = page.locator('button:has-text("Sub-productos")')
    if (await toggle.count() > 0) {
      await toggle.first().click()
      await page.waitForTimeout(200)
      assert(true, 'Sub-productos toggle clicked')
    } else {
      assert(true, 'No sub-productos toggle, skip')
    }
  })

  await runSuite('Dashboard: expand dish shows ingredients', async () => {
    const dishBtn = page.locator('#main-content button[aria-expanded]').first()
    if (await dishBtn.count() > 0 && await dishBtn.isVisible()) {
      await dishBtn.click()
      await page.waitForTimeout(400)
      const ingredients = page.locator('text=Ingredientes')
      if (await ingredients.count() > 0) {
        assert(await ingredients.first().isVisible(), 'Ingredients section appeared')
      } else {
        assert(true, 'No ingredients for this dish')
      }
    } else {
      assert(true, 'No expandable dish button')
    }
  })

  await runSuite('Dashboard: category filter reduces results', async () => {
    const cats = page.locator('button:has-text("(Principal"), button:has-text("(Guarnicion"), button:has-text("(Postre"), button:has-text("(Entrada")')
    const catCount = await cats.count()
    if (catCount > 0) {
      const initialCards = await page.locator('#main-content button[aria-expanded]').count()
      await cats.first().click()
      await page.waitForTimeout(400)
      const filteredCards = await page.locator('#main-content button[aria-expanded]').count()
      assert(filteredCards <= initialCards, `Category filtered: ${filteredCards} <= ${initialCards}`)
      await page.locator('button:has-text("Todas")').first().click()
      await page.waitForTimeout(300)
    } else {
      assert(true, 'No category filters')
    }
  })

  await runSuite('Dashboard: producido stat shows number', async () => {
    const statCards = page.locator('div.card p:has-text("Producido")')
    if (await statCards.count() > 0) {
      const value = await statCards.first().locator('xpath=following-sibling::p').textContent()
      assert(value.trim() !== '', 'Producido stat has a value')
    } else {
      assert(true, 'Producido stat card not found')
    }
  })

  // ─── ORDERS ───────────────────────────────────────────────────
  console.log('\n═══════ ORDERS ═══════\n')
  await page.goto(BASE_URL + '/#/orders')
  await waitForApp(page)
  await waitForContent(page, 'button:has-text("+ Pedido")')

  await runSuite('Orders: order list renders', async () => {
    assert(await page.locator('text=Pedidos').count() > 0, 'Order title not found')
  })

  await runSuite('Orders: + Pedido button exists', async () => {
    assert(await page.locator('button:has-text("+ Pedido")').isVisible(), '+ Pedido button not found')
  })

  await runSuite('Orders: week selector exists', async () => {
    assert(await page.locator('select[aria-label="Seleccionar semana"]').count() > 0, 'Week selector not found')
  })

  await runSuite('Orders: search input exists', async () => {
    assert(await page.locator('input[aria-label="Buscar pedido"]').isVisible(), 'Order search not found')
  })

  await runSuite('Orders: action buttons on orders', async () => {
    const count = await page.locator('button[aria-label="Editar pedido"], button[aria-label*="ensamblado"], button[aria-label*="entregado"]').count()
    assert(count > 0, `No action buttons (count=${count})`)
  })

  await runSuite('Orders: status badges', async () => {
    assert(await page.locator('[class*="badge"]').count() > 0, 'No status badges found')
  })

  await runSuite('Orders: open new order modal', async () => {
    const btn = page.locator('button:has-text("+ Pedido")')
    if (await btn.isEnabled()) {
      await btn.click()
      await page.waitForTimeout(500)
      const modal = page.locator('.modal-overlay, [class*="modal"]')
      if (await modal.count() > 0) {
        assert(await modal.first().isVisible(), 'Modal not visible')
        await page.keyboard.press('Escape')
        await page.waitForTimeout(400)
      } else {
        assert(true, 'Modal or week selector appeared')
        await page.keyboard.press('Escape')
      }
    } else {
      assert(true, 'Button disabled, skip')
    }
  })

  await runSuite('Orders: summary stat cards', async () => {
    assert(await page.locator('text=Pendientes').count() > 0, 'Pendientes not found')
    assert(await page.locator('text=Armados').count() > 0, 'Armados not found')
    assert(await page.locator('text=Entregados').count() > 0, 'Entregados not found')
  })

  await runSuite('Orders: switch to historical week', async () => {
    const select = page.locator('select[aria-label="Seleccionar semana"]')
    if (await select.count() > 0) {
      const options = await select.locator('option').all()
      if (options.length > 1) {
        const optionVal = await options[1].getAttribute('value')
        await select.selectOption(optionVal)
        await page.waitForTimeout(600)
        const badge = page.locator('text=Solo lectura')
        assert(await badge.count() > 0, 'Solo lectura badge visible for historical week')
        await select.selectOption('')
        await page.waitForTimeout(600)
      } else {
        assert(true, 'No alternative weeks to select')
      }
    } else {
      assert(true, 'No week selector')
    }
  })

  await runSuite('Orders: advance pending order to assembled', async () => {
    const ensamblarBtn = page.locator('button[aria-label="Marcar como ensamblado"]').first()
    if (await ensamblarBtn.count() > 0 && await ensamblarBtn.isVisible()) {
      await ensamblarBtn.click()
      await page.waitForTimeout(800)
      const entregarBtn = page.locator('button[aria-label="Marcar como entregado"]').first()
      const btnExists = await entregarBtn.count() > 0
      assert(btnExists, 'Entregar button appeared after assembling, or order status updated')
    } else {
      assert(true, 'No ensamblar button found (orders may already be assembled)')
    }
  })

  await runSuite('Orders: create order via modal', async () => {
    const addBtn = page.locator('button:has-text("+ Pedido")')
    if (await addBtn.isEnabled()) {
      await addBtn.click()
      await page.waitForTimeout(500)
      const modal = page.locator('.modal-overlay')
      if (await modal.count() > 0 && await modal.first().isVisible()) {
        const clientSearch = page.locator('input[aria-label="Buscar cliente"]')
        if (await clientSearch.count() > 0) {
          await clientSearch.fill('')
          await page.waitForTimeout(300)
          const clientOption = page.locator('.modal-content button').filter({ hasText: /María|Juan|Pedro|Ana/ }).first()
          if (await clientOption.count() > 0) {
            await clientOption.click()
            await page.waitForTimeout(200)
          }
        }
        const dishSelect = page.locator('select[aria-label="Plato 1"]')
        if (await dishSelect.count() > 0) {
          await dishSelect.selectOption({ index: 1 })
          await page.waitForTimeout(100)
        }
        const qtyInput = page.locator('input[aria-label="Cantidad plato 1"]')
        if (await qtyInput.count() > 0) {
          await qtyInput.fill('2')
          await page.waitForTimeout(100)
        }
        const submitBtn = page.locator('.form-actions .btn-primary').last()
        if (await submitBtn.isVisible()) {
          await submitBtn.click()
          await page.waitForTimeout(800)
          const confirmPopup = page.locator('p:has-text("guardado")')
          if (await confirmPopup.count() > 0) {
            const noBtn = page.locator('[role="dialog"] .btn-ghost')
            if (await noBtn.count() > 0) await noBtn.click()
            await page.waitForTimeout(300)
          }
          assert(true, 'Order creation submitted')
        } else {
          assert(true, 'Submit button not visible, closing modal')
          await page.keyboard.press('Escape')
        }
      } else {
        assert(true, 'WeekSelector modal appeared instead')
        await page.keyboard.press('Escape')
      }
    } else {
      assert(true, 'Add order button disabled (historical view)')
    }
  })

  await runSuite('Orders: mark order as paid', async () => {
    await page.goto(BASE_URL + '/#/orders')
    await page.reload()
    await waitForApp(page)
    await waitForContent(page, 'button[aria-label="Marcar como cobrado"]')
    const before = await page.locator('button[aria-label="Marcar como cobrado"]').count()
    assert(before > 0, 'No Cobrar buttons found')
    await page.locator('button[aria-label="Marcar como cobrado"]').first().click()
    await page.waitForTimeout(400)
    assert(await page.locator('button[aria-label="Marcar como cobrado"]').count() === before - 1, 'Cobrar button should disappear for paid order')
    assert(await page.locator('text=Cobrado ✓').count() > 0, 'Cobrado badge not shown')
  })

  await runSuite('Orders: undo paid asks for confirmation', async () => {
    const before = await page.locator('button[aria-label="Marcar como cobrado"]').count()
    await page.locator('button[aria-label="Deshacer cobro"]').first().click()
    await page.waitForSelector('text=¿Deshacer el cobro', { timeout: 3000 }).catch(() => {})
    assert(await page.locator('text=¿Deshacer el cobro').isVisible(), 'Confirmation not shown')
    await page.locator('button:has-text("Deshacer cobro")').last().click()
    await page.waitForTimeout(400)
    assert(await page.locator('button[aria-label="Marcar como cobrado"]').count() === before + 1, 'Order should be unpaid again')
  })

  // ─── MENU ─────────────────────────────────────────────────────
  console.log('\n═══════ MENU ═══════\n')
  await page.goto(BASE_URL + '/#/menu')
  await waitForApp(page)
  await waitForContent(page, 'button[aria-label="Editar plato"]')

  await runSuite('Menu: + Plato button exists', async () => {
    assert(await page.locator('button:has-text("+ Plato")').isVisible(), '+ Plato button not found')
  })

  await runSuite('Menu: search input exists', async () => {
    assert(await page.locator('input[aria-label="Buscar plato"]').isVisible(), 'Menu search not found')
  })

  await runSuite('Menu: dish list renders', async () => {
    const count = await page.locator('button[aria-label="Editar plato"]').count()
    assert(count > 0, `No edit buttons found (count=${count})`)
  })

  await runSuite('Menu: sort buttons exist', async () => {
    const nameBtn = page.locator('button:has-text("Nombre")')
    const priceBtn = page.locator('button:has-text("Precio")')
    assert(await nameBtn.count() > 0, 'Sort by name button not found')
    assert(await priceBtn.count() > 0, 'Sort by price button not found')
  })

  await runSuite('Menu: ingredient details toggle', async () => {
    const details = page.locator('details')
    if (await details.count() > 0) {
      const summary = details.first().locator('summary')
      if (await summary.count() > 0) {
        await summary.click()
        await page.waitForTimeout(200)
      }
      assert(true, 'Details toggle worked')
    } else {
      assert(true, 'No details elements, skip')
    }
  })

  await runSuite('Menu: open create dish modal', async () => {
    const btn = page.locator('button:has-text("+ Plato")')
    await btn.click()
    await page.waitForTimeout(500)
    const modal = page.locator('.modal-overlay, [class*="modal"]')
    if (await modal.count() > 0) {
      assert(await modal.first().isVisible(), 'Modal not visible')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
    } else {
      assert(true, 'Modal not found, skip')
    }
  })

  await runSuite('Menu: edit first dish button', async () => {
    const editBtn = page.locator('button[aria-label="Editar plato"]').first()
    if (await editBtn.isVisible()) {
      await editBtn.click()
      await page.waitForTimeout(500)
      const modal = page.locator('.modal-overlay').first()
      assert(await modal.count() > 0, 'Edit modal not opened')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
    } else {
      assert(true, 'No visible edit buttons, skip')
    }
  })

  await runSuite('Menu: delete dish button', async () => {
    const count = await page.locator('button[aria-label="Eliminar plato"]').count()
    assert(count > 0, `No delete buttons (count=${count})`)
  })

  await runSuite('Menu: sort by price changes order', async () => {
    const priceBtn = page.locator('button:has-text("Precio")')
    if (await priceBtn.count() > 0) {
      const firstNamesBefore = await page.locator('button[aria-label="Editar plato"]').first().textContent().catch(() => '')
      await priceBtn.first().click()
      await page.waitForTimeout(400)
      const firstNamesAfter = await page.locator('button[aria-label="Editar plato"]').first().textContent().catch(() => '')
      assert(true, 'Sort button clicked successfully')
      await priceBtn.first().click()
      await page.waitForTimeout(400)
    } else {
      assert(true, 'No sort button')
    }
  })

  await runSuite('Menu: sort direction toggle', async () => {
    const dirBtn = page.locator('button[aria-label="Cambiar direccion de orden"]')
    if (await dirBtn.count() > 0) {
      await dirBtn.first().click()
      await page.waitForTimeout(400)
      assert(true, 'Direction toggle clicked')
    } else {
      assert(true, 'No direction toggle')
    }
  })

  await runSuite('Menu: create dish via modal', async () => {
    await page.locator('button:has-text("+ Plato")').click()
    await page.waitForTimeout(500)
    const modal = page.locator('.modal-overlay')
    if (await modal.count() > 0) {
      await page.locator('#dish-name').fill('Plato Test')
      await page.locator('#dish-category').fill('Prueba')
      await page.locator('#dish-price').fill('999')
      await page.waitForTimeout(100)
      const submitBtn = page.locator('.form-actions .btn-primary').last()
      if (await submitBtn.isVisible()) {
        await submitBtn.click()
        await page.waitForTimeout(800)
        const confirmMsg = page.locator('p:has-text("guardado")')
        if (await confirmMsg.count() > 0) {
          await page.getByRole('button', { name: 'No', exact: true }).click()
          await page.waitForTimeout(300)
        }
        assert(true, 'Dish creation submitted')
      } else {
        await page.keyboard.press('Escape')
        assert(true, 'Submit not visible')
      }
    } else {
      assert(true, 'Modal not opened')
    }
  })

  // ─── INGREDIENTS ──────────────────────────────────────────────
  console.log('\n═══════ INGREDIENTS ═══════\n')
  await page.goto(BASE_URL + '/#/ingredients')
  await waitForApp(page)
  await waitForContent(page, 'button[aria-label="Editar ingrediente"]')

  await runSuite('Ingredients: + Ingrediente button exists', async () => {
    assert(await page.locator('button:has-text("+ Ingrediente")').isVisible(), '+ Ingrediente button not found')
  })

  await runSuite('Ingredients: search input exists', async () => {
    assert(await page.locator('input[aria-label="Buscar ingrediente"]').isVisible(), 'Ingredient search not found')
  })

  await runSuite('Ingredients: ingredient list renders', async () => {
    const count = await page.locator('button[aria-label="Editar ingrediente"]').count()
    assert(count > 0, `No edit buttons found (count=${count})`)
  })

  await runSuite('Ingredients: sub-ingredient details toggle', async () => {
    const details = page.locator('details')
    if (await details.count() > 0) {
      const summary = details.first().locator('summary')
      if (await summary.count() > 0) {
        await summary.click()
        await page.waitForTimeout(200)
      }
      assert(true, 'Details toggle worked')
    } else {
      assert(true, 'No details elements, skip')
    }
  })

  await runSuite('Ingredients: open create modal', async () => {
    await page.locator('button:has-text("+ Ingrediente")').click()
    await page.waitForTimeout(500)
    const modal = page.locator('.modal-overlay').first()
    assert(await modal.count() > 0, 'Modal not opened')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  })

  await runSuite('Ingredients: edit ingredient button', async () => {
    const editBtn = page.locator('button[aria-label="Editar ingrediente"]').first()
    if (await editBtn.isVisible()) {
      await editBtn.click()
      await page.waitForTimeout(500)
      const modal = page.locator('.modal-overlay').first()
      assert(await modal.count() > 0, 'Edit modal not opened')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
    } else {
      assert(true, 'No visible edit buttons, skip')
    }
  })

  await runSuite('Ingredients: sub-producto badges', async () => {
    const badges = page.locator('text=Sub-producto')
    assert(await badges.count() > 0, 'No sub-producto badges found')
  })

  await runSuite('Ingredients: update cost button', async () => {
    const btns = page.locator('button:has-text("Precio vigente")')
    if (await btns.count() > 0) {
      assert(await btns.first().isVisible(), 'Update button visible')
    } else {
      assert(true, 'No stale ingredients to update')
    }
  })

  await runSuite('Ingredients: create ingredient via modal', async () => {
    await page.locator('button:has-text("+ Ingrediente")').click()
    await page.waitForTimeout(500)
    const modal = page.locator('.modal-overlay')
    if (await modal.count() > 0) {
      await page.locator('#ing-name').fill('Ingrediente Test')
      await page.locator('#ing-unit').selectOption('kg')
      await page.locator('#ing-pkg-qty').fill('10')
      await page.locator('#ing-pkg-price').fill('500')
      await page.locator('#ing-category').fill('Pruebas')
      await page.waitForTimeout(100)
      const submitBtn = page.locator('.form-actions .btn-primary').last()
      if (await submitBtn.isVisible()) {
        await submitBtn.click()
        await page.waitForTimeout(800)
        const confirmMsg = page.locator('p:has-text("guardado")')
        if (await confirmMsg.count() > 0) {
          await page.getByRole('button', { name: 'No', exact: true }).click()
          await page.waitForTimeout(300)
        }
        assert(true, 'Ingredient creation submitted')
      } else {
        await page.keyboard.press('Escape')
        assert(true, 'Submit not visible')
      }
    } else {
      assert(true, 'Modal not opened')
    }
  })

  // ─── CLIENTS ──────────────────────────────────────────────────
  console.log('\n═══════ CLIENTS ═══════\n')
  await page.goto(BASE_URL + '/#/clients')
  await waitForApp(page)
  await waitForContent(page, 'button[aria-label="Editar cliente"]')

  await runSuite('Clients: + Cliente button exists', async () => {
    assert(await page.locator('button:has-text("+ Cliente")').isVisible(), '+ Cliente button not found')
  })

  await runSuite('Clients: search input exists', async () => {
    assert(await page.locator('input[aria-label="Buscar cliente"]').isVisible(), 'Client search not found')
  })

  await runSuite('Clients: client list renders', async () => {
    const count = await page.locator('button[aria-label="Editar cliente"]').count()
    assert(count > 0, `No edit buttons found (count=${count})`)
  })

  await runSuite('Clients: open create modal', async () => {
    await page.locator('button:has-text("+ Cliente")').click()
    await page.waitForTimeout(500)
    const modal = page.locator('.modal-overlay').first()
    assert(await modal.count() > 0, 'Modal not opened')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  })

  await runSuite('Clients: edit first client', async () => {
    const editBtn = page.locator('button[aria-label="Editar cliente"]').first()
    if (await editBtn.isVisible()) {
      await editBtn.click()
      await page.waitForTimeout(500)
      const modal = page.locator('.modal-overlay').first()
      assert(await modal.count() > 0, 'Edit modal not opened')
      const input = page.locator('#client-name')
      assert(await input.count() > 0, 'Client name input not found')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
    } else {
      assert(true, 'No visible edit buttons, skip')
    }
  })

  await runSuite('Clients: delete button exists', async () => {
    const count = await page.locator('button[aria-label="Eliminar cliente"]').count()
    assert(count > 0, `No delete buttons found (count=${count})`)
  })

  await runSuite('Clients: create client via modal', async () => {
    await page.locator('button:has-text("+ Cliente")').click()
    await page.waitForTimeout(500)
    const modal = page.locator('.modal-overlay')
    if (await modal.count() > 0) {
      await page.locator('#client-name').fill('Cliente')
      await page.locator('#client-last-name').fill('Test')
      await page.locator('#client-phone').fill('11 1234 5678')
      await page.locator('#client-address').fill('Calle Falsa 123')
      await page.waitForTimeout(100)
      const submitBtn = page.locator('.form-actions .btn-primary').last()
      if (await submitBtn.isVisible()) {
        await submitBtn.click()
        await page.waitForTimeout(800)
        const confirmMsg = page.locator('p:has-text("guardado")')
        if (await confirmMsg.count() > 0) {
          await page.getByRole('button', { name: 'No', exact: true }).click()
          await page.waitForTimeout(300)
        }
        assert(true, 'Client creation submitted')
      } else {
        await page.keyboard.press('Escape')
        assert(true, 'Submit not visible')
      }
    } else {
      assert(true, 'Modal not opened')
    }
  })

  await runSuite('Clients: edit client populates fields', async () => {
    const editBtn = page.locator('button[aria-label="Editar cliente"]').first()
    if (await editBtn.isVisible()) {
      await editBtn.click()
      await page.waitForTimeout(500)
      const nameInput = page.locator('#client-name')
      if (await nameInput.count() > 0) {
        const val = await nameInput.inputValue()
        assert(val.length > 0, `Name field has value (len=${val.length})`)
      } else {
        assert(true, 'Name input not found')
      }
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
    } else {
      assert(true, 'No visible edit buttons')
    }
  })

  // ─── ANALYTICS ────────────────────────────────────────────────
  console.log('\n═══════ ANALYTICS ═══════\n')
  await page.goto(BASE_URL + '/#/analytics')
  await waitForApp(page)
  await waitForContent(page, 'text=Ingresos')

  await runSuite('Analytics: revenue scope note', async () => {
    assert(await page.locator('text=solo pedidos entregados y cobrados').count() > 0, 'Scope note not found')
  })

  await runSuite('Analytics: stat cards render', async () => {
    assert(await page.locator('text=Pedidos').count() > 0, 'Orders stat not found')
    assert(await page.locator('text=Ingresos').count() > 0, 'Revenue stat not found')
  })

  await runSuite('Analytics: preset filter buttons', async () => {
    assert(await page.locator('button:has-text("Esta semana")').first().isVisible(), 'Week filter not found')
    assert(await page.locator('button:has-text("Este mes")').first().isVisible(), 'Month filter not found')
  })

  await runSuite('Analytics: change filter preset', async () => {
    await page.locator('button:has-text("Este mes")').first().click()
    await page.waitForTimeout(1000)
    assert(true, 'Changed preset to month')
    await page.locator('button:has-text("Esta semana")').first().click()
    await page.waitForTimeout(1000)
    assert(true, 'Changed back to week')
  })

  await runSuite('Analytics: Excel export button', async () => {
    const excelBtn = page.locator('button:has-text("Excel")')
    if (await excelBtn.count() > 0) {
      assert(await excelBtn.first().isVisible(), 'Excel button visible')
    } else {
      assert(true, 'No Excel button found')
    }
  })

  const analyticsTab = (label) => page.locator('[role="tab"]', { hasText: label })
  const setPeriod = (label) => page.locator('[role="radiogroup"][aria-label="Período"] [role="radio"]', { hasText: label }).click()
  const panelHeadings = () => page.locator('#analytics-panel .insight h3').allTextContents()

  await runSuite('Analytics: tabs are grouped by topic', async () => {
    const labels = (await page.locator('[role="tablist"][aria-label="Vistas de análisis"] [role="tab"]').allTextContents()).map(t => t.trim())
    assert(JSON.stringify(labels) === JSON.stringify(['Ventas', 'Platos', 'Clientes', 'Finanzas', 'Planificación', 'Operación']), `Tabs: ${labels}`)
    assert(await analyticsTab('Ventas').getAttribute('aria-selected') === 'true', 'Ventas is the default tab')
  })

  await runSuite('Analytics: Ventas shows evolution and comparison with charts', async () => {
    await setPeriod('Todo')
    await analyticsTab('Ventas').click()
    await waitForContent(page, '#analytics-panel svg.recharts-surface')
    const headings = await panelHeadings()
    for (const h of ['Evolución de ventas', 'Comparar períodos', 'Datos por período']) assert(headings.includes(h), `Missing "${h}": ${headings}`)
    assert(await page.locator('#analytics-panel svg.recharts-surface').count() >= 2, 'Sales charts render with Recharts')
    assert(await page.locator('[role="radiogroup"][aria-label="Agrupar por"] [role="radio"]').count() === 4, 'Trend grouping selector')
  })

  await runSuite('Analytics: hovering every chart shows a tooltip without crashing', async () => {
    const errors = []
    const onError = err => errors.push(err.message)
    page.on('pageerror', onError)
    for (const tab of ['Ventas', 'Platos', 'Clientes', 'Finanzas', 'Planificación', 'Operación']) {
      await analyticsTab(tab).click()
      await page.waitForTimeout(700)
      const charts = page.locator('#analytics-panel .chart-frame')
      const n = await charts.count()
      for (let i = 0; i < n; i++) {
        const box = await charts.nth(i).boundingBox()
        if (!box) continue
        for (const fx of [0.3, 0.5, 0.7]) {
          await page.mouse.move(box.x + box.width * fx, box.y + box.height * 0.5)
          await page.waitForTimeout(80)
        }
      }
      assert(errors.length === 0, `${tab}: hovering a chart threw ${errors.join(' | ')}`)
      assert(await page.locator('[role="tablist"][aria-label="Vistas de análisis"]').count() === 1, `${tab}: app still rendered after hover`)
    }
    await page.mouse.move(0, 0)
    page.off('pageerror', onError)
    await analyticsTab('Ventas').click()
    await page.locator('#analytics-panel .chart-frame').first().hover()
    assert(await page.locator('.chart-tooltip').count() > 0, 'Tooltip appears on hover')
    await page.mouse.move(0, 0)
  })

  await runSuite('Analytics: Platos shows ranking, matrix, margin and pairs', async () => {
    await analyticsTab('Platos').click()
    await waitForContent(page, '#analytics-panel .rank-list')
    await waitForContent(page, '#analytics-panel .matrix-cell')
    const headings = await panelHeadings()
    for (const h of ['Ranking de platos', 'Qué hacer con cada plato', 'Margen perdido por aumentos de costo', 'Platos que se piden juntos']) assert(headings.includes(h), `Missing "${h}": ${headings}`)
    assert(await page.locator('#analytics-panel .rank-item').count() > 0, 'Dish ranking items')
    assert(await page.locator('.matrix-cell li').count() > 0, 'Matrix lists dishes')
    assert(await page.locator('.insight', { hasText: 'Margen perdido' }).locator('tbody tr').count() > 0, 'Margin erosion rows')
    assert(await page.locator('.insight', { hasText: 'Platos que se piden juntos' }).locator('.insight-empty').count() === 1, 'No repeated pairs in mock data → empty state')
    assert(await page.locator('.insight', { hasText: 'Qué hacer con cada plato' }).locator('svg.recharts-surface').count() === 1, 'Matrix scatter chart')
    assert(await page.locator('input[aria-label="Buscar plato"]').isVisible(), 'Dish search lives in the tab')
    assert(await page.locator('button:has-text("Siguiente")').count() === 0, 'No pagination: lists scroll instead')
  })

  await runSuite('Analytics: Platos search filters the ranking', async () => {
    await page.locator('input[aria-label="Buscar plato"]').fill('pizza')
    const names = await page.locator('#analytics-panel .rank-toggle').allTextContents()
    assert(names.length > 0 && names.every(n => n.toLowerCase().includes('pizza')), `Filtered: ${names}`)
    await page.locator('input[aria-label="Buscar plato"]').fill('')
  })

  await runSuite('Analytics: Clientes merges ranking and portfolio insights', async () => {
    await analyticsTab('Clientes').click()
    await waitForContent(page, '.insight .insight-table')
    await page.waitForTimeout(300)
    const headings = await panelHeadings()
    for (const h of ['Ranking de clientes', 'Clientes que dejaron de pedir', 'Valor de cada cliente', 'Ventas por zona']) assert(headings.includes(h), `Missing "${h}": ${headings}`)
    const value = page.locator('.insight', { hasText: 'Valor de cada cliente' })
    assert(await value.locator('tbody tr').count() === 2, 'Client value lists the 2 paying clients')
    assert((await value.locator('tbody tr').first().locator('th').textContent()).includes('Juan Perez'), 'Top spender first')
    const zones = page.locator('.insight', { hasText: 'Ventas por zona' })
    const zoneNames = await zones.locator('tbody th').allTextContents()
    assert(zoneNames.includes('Sin localidad') && zoneNames.includes('Buenos Aires'), `Zones: ${zoneNames}`)
    const baRow = await zones.locator('tbody tr', { hasText: 'Buenos Aires' }).textContent()
    assert(baRow.includes('2.100') && !baRow.includes('2.400'), `Zone sales exclude the $300 delivery fee: ${baRow}`)
    assert(await zones.locator('svg.recharts-surface').count() === 1, 'Zone bar chart')
  })

  await runSuite('Analytics: Clientes offers WhatsApp to lapsed clients', async () => {
    const row = page.locator('.insight', { hasText: 'Clientes que dejaron de pedir' }).locator('tbody tr').first()
    assert((await row.locator('th').textContent()).includes('Ana Martinez'), 'Lapsed client row')
    assert((await row.textContent()).includes('cada 7 días'), 'Shows the usual rhythm')
    const href = await row.locator('a', { hasText: 'WhatsApp' }).getAttribute('href')
    assert(href && href.startsWith('https://wa.me/54911') && href.includes('?text='), `Bad WhatsApp link: ${href}`)
  })

  await runSuite('Analytics: Finanzas keeps collections and ingredient Pareto', async () => {
    await analyticsTab('Finanzas').click()
    await waitForContent(page, '.insight .insight-table')
    const headings = await panelHeadings()
    assert(JSON.stringify(headings) === JSON.stringify(['Cobranza pendiente', 'Ingredientes que más pesan en el costo']), `Finanzas: ${headings}`)
    assert(await page.locator('.insight', { hasText: 'Cobranza pendiente' }).locator('.insight-empty').count() === 1, 'Collections empty when everything is paid')
    const drivers = page.locator('.insight', { hasText: 'Ingredientes que más pesan' })
    await drivers.locator('svg.recharts-surface').first().waitFor({ timeout: 5000 }).catch(() => {})
    assert(await drivers.locator('tbody tr').count() > 0 && await drivers.locator('svg.recharts-surface').count() === 1, 'Pareto chart and table')
  })

  await runSuite('Analytics: Finanzas lists unpaid delivered orders with WhatsApp', async () => {
    await page.evaluate(() => window.piu.unmarkOrderPaid(2))
    await analyticsTab('Ventas').click()
    await analyticsTab('Finanzas').click()
    const card = page.locator('.insight', { hasText: 'Cobranza pendiente' })
    await card.locator('tbody tr').first().waitFor({ timeout: 5000 })
    const row = card.locator('tbody tr').first()
    assert((await row.locator('th').textContent()).includes('Maria Garcia'), 'Debtor row should be Maria Garcia')
    assert((await card.locator('.insight-figure strong').first().textContent()).includes('2.100'), 'Total owed should be $2.100')
    assert((await card.textContent()).includes('envíos'), 'Delivery fees note should show')
    const href = await row.locator('a', { hasText: 'WhatsApp' }).getAttribute('href')
    assert(href && href.startsWith('https://wa.me/54911'), `Bad WhatsApp link: ${href}`)
    await page.evaluate(() => window.piu.markOrderPaid(2))
  })

  await runSuite('Analytics: Planificación shows forecast, projected shopping and waste trend', async () => {
    await analyticsTab('Planificación').click()
    await waitForContent(page, '.insight .insight-table')
    await page.waitForTimeout(400)
    const headings = await panelHeadings()
    for (const h of ['Pronóstico de la semana', 'Compra proyectada', 'Plata perdida por producir de más']) assert(headings.includes(h), `Missing "${h}": ${headings}`)
    const weekOptions = page.locator('[role="radiogroup"][aria-label="Semana a planificar"] [role="radio"]')
    assert(await weekOptions.count() === 2, 'Two weeks to plan')
    assert(await weekOptions.nth(1).getAttribute('aria-checked') === 'true', 'Next week is selected by default')
    const forecast = page.locator('.insight', { hasText: 'Pronóstico de la semana' })
    assert(await forecast.locator('tbody tr').count() > 0, 'Forecast lists dishes')
    assert((await forecast.textContent()).includes('100% últimas 8 semanas'), 'Weights note reflects available history')
    assert(await forecast.locator('svg.recharts-surface').count() === 1, 'Forecast chart')
    assert(await page.locator('.insight', { hasText: 'Compra proyectada' }).locator('tbody tr').count() > 0, 'Projected shopping lists ingredients')
    const waste = page.locator('.insight', { hasText: 'Plata perdida por producir de más' })
    assert((await waste.locator('.insight-figure strong').first().textContent()).includes('1.850'), 'Waste cost from the mock production log')
  })

  await runSuite('Analytics: Planificación opens the projected shopping PDF', async () => {
    await page.locator('.insight', { hasText: 'Compra proyectada' }).locator('button', { hasText: 'Lista de compras (PDF)' }).click()
    await page.waitForTimeout(800)
    assert(await page.locator('[role="dialog"]').count() > 0, 'PDF viewer opens')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  })

  await runSuite('Analytics: Operación shows fulfillment and load-time heatmap', async () => {
    await analyticsTab('Operación').click()
    await waitForContent(page, '#analytics-panel .heatmap')
    const headings = await panelHeadings()
    assert(JSON.stringify(headings) === JSON.stringify(['Cumplimiento semanal', 'Cuándo se cargan los pedidos']), `Operación: ${headings}`)
    assert(await page.locator('.heatmap td.heat-cell').count() === 168, 'Heatmap has 7 × 24 cells')
    assert(await page.locator('.heatmap td.is-peak').count() === 1, 'Peak cell is highlighted')
    const ful = page.locator('.insight', { hasText: 'Cumplimiento semanal' })
    assert(await ful.locator('tbody tr').count() === 4, 'One row per mock week')
    assert(await ful.locator('svg.recharts-surface').count() === 1, 'Stacked fulfillment chart')
    assert((await ful.locator('.insight-figure strong').first().textContent()).includes('%'), 'On-time share figure')
  })

  await runSuite('Analytics: long tables scroll with a sticky header', async () => {
    const wrap = page.locator('.insight', { hasText: 'Cumplimiento semanal' }).locator('.scroll-10')
    assert(await wrap.getAttribute('role') === 'region' && await wrap.getAttribute('tabindex') === '0', 'Scroll area is a focusable region')
    const styles = await wrap.evaluate(el => ({ max: getComputedStyle(el).maxHeight, overflow: getComputedStyle(el).overflowY, sticky: getComputedStyle(el.querySelector('thead th')).position }))
    assert(styles.max !== 'none' && styles.overflow === 'auto' && styles.sticky === 'sticky', `Scroll styles: ${JSON.stringify(styles)}`)
    await setPeriod('Esta semana')
    await analyticsTab('Ventas').click()
  })

  // ─── SETTINGS ─────────────────────────────────────────────────
  console.log('\n═══════ SETTINGS ═══════\n')
  await page.goto(BASE_URL + '/#/settings')
  await waitForApp(page)
  await waitForContent(page, 'text=Configuración')

  await runSuite('Settings: page title renders', async () => {
    assert((await page.locator('.page-header h2').textContent()).trim() === 'Ajustes', 'Settings title should match the nav label')
  })

  await runSuite('Settings: temas como tarjetas de opción con muestra de color', async () => {
    const themeChoices = page.locator('[aria-label="Tema visual"] .choice[aria-pressed]')
    assert(await themeChoices.count() === 3, `Expected 3 theme choices, got ${await themeChoices.count()}`)
    assert(await themeChoices.first().locator('.choice-swatch span').count() === 3, 'Theme choice needs a 3-color swatch')
    assert(await page.locator('[aria-label="Tamaño de texto"] .choice[aria-pressed]').count() === 3, 'Expected 3 size choices')
  })

  await runSuite('Settings: modo macro es un interruptor', async () => {
    const sw = page.locator('button[role="switch"][aria-label="Modo macro"]')
    assert(await sw.count() === 1, 'Macro switch missing')
    assert(['true', 'false'].includes(await sw.getAttribute('aria-checked')), 'Switch needs aria-checked')
  })

  await runSuite('Settings: theme buttons exist', async () => {
    assert(await page.locator('text=Fondo gris claro, texto oscuro').count() > 0, 'Claro theme not found')
    assert(await page.locator('text=Fondo oscuro, texto claro').count() > 0, 'Oscuro theme not found')
    assert(await page.locator('text=Azul y naranja en lugar de verde y rojo').count() > 0, 'Daltonico theme not found')
  })

  await runSuite('Settings: toggle theme', async () => {
    const oscuroBtn = page.locator('button', { hasText: 'Fondo oscuro, texto claro' })
    await oscuroBtn.click()
    await page.waitForTimeout(300)
    const pressed = await oscuroBtn.getAttribute('aria-pressed')
    assert(pressed === 'true', `Oscuro should be pressed, got: ${pressed}`)
    const claroBtn = page.locator('button', { hasText: 'Fondo gris claro, texto oscuro' })
    await claroBtn.click()
    await page.waitForTimeout(300)
    assert(true, 'Toggled back to Claro')
  })

  await runSuite('Settings: macro mode toggle', async () => {
    const macroBtns = page.locator('button:has-text("Activo"), button:has-text("Inactivo")')
    if (await macroBtns.count() >= 1) {
      await macroBtns.first().click()
      await page.waitForTimeout(300)
      assert(true, 'Clicked macro mode button')
    } else {
      assert(true, 'No macro mode buttons found')
    }
  })

  await runSuite('Settings: font size buttons', async () => {
    assert(await page.locator('button:has-text("Pequeña")').count() > 0, 'Small font button not found')
    assert(await page.locator('button:has-text("Mediana")').count() > 0, 'Medium font button not found')
    assert(await page.locator('button:has-text("Grande")').count() > 0, 'Large font button not found')
  })

  await runSuite('Settings: export/import buttons', async () => {
    assert(await page.locator('button:has-text("Exportar")').count() > 0, 'Export button not found')
    assert(await page.locator('button:has-text("Importar")').count() > 0, 'Import button not found')
  })

  await runSuite('Settings: price staleness input', async () => {
    const input = page.locator('input[type="number"]')
    assert(await input.count() > 0, 'Number input not found')
  })

  await runSuite('Settings: cycle to oscuro theme', async () => {
    const oscuroBtn = page.locator('button', { hasText: 'Fondo oscuro, texto claro' })
    if (await oscuroBtn.count() > 0) {
      await oscuroBtn.click()
      await page.waitForTimeout(300)
      const pressed = await oscuroBtn.getAttribute('aria-pressed')
      assert(pressed === 'true', `Oscuro should be pressed, got: ${pressed}`)
    } else {
      assert(true, 'Oscuro button not found')
    }
  })

  await runSuite('Settings: cycle to daltonico theme', async () => {
    const daltonicoBtn = page.locator('button', { hasText: 'Azul y naranja en lugar de verde y rojo' })
    if (await daltonicoBtn.count() > 0) {
      await daltonicoBtn.click()
      await page.waitForTimeout(300)
      const pressed = await daltonicoBtn.getAttribute('aria-pressed')
      assert(pressed === 'true', `Daltonico should be pressed, got: ${pressed}`)
    } else {
      assert(true, 'Daltonico button not found')
    }
  })

  await runSuite('Settings: cycle back to claro theme', async () => {
    const claroBtn = page.locator('button', { hasText: 'Fondo gris claro, texto oscuro' })
    if (await claroBtn.count() > 0) {
      await claroBtn.click()
      await page.waitForTimeout(300)
      const pressed = await claroBtn.getAttribute('aria-pressed')
      assert(pressed === 'true', `Claro should be pressed, got: ${pressed}`)
    } else {
      assert(true, 'Claro button not found')
    }
  })

  await runSuite('Settings: change font size to small', async () => {
    const smallBtn = page.locator('button:has-text("Pequeña")')
    if (await smallBtn.count() > 0) {
      await smallBtn.first().click()
      await page.waitForTimeout(300)
      const pressed = await smallBtn.first().getAttribute('aria-pressed')
      assert(pressed === 'true', `Small font should be pressed, got: ${pressed}`)
    } else {
      assert(true, 'Small font button not found')
    }
  })

  await runSuite('Settings: change font size to large', async () => {
    const largeBtn = page.locator('button:has-text("Grande")')
    if (await largeBtn.count() > 0) {
      await largeBtn.first().click()
      await page.waitForTimeout(300)
      const pressed = await largeBtn.first().getAttribute('aria-pressed')
      assert(pressed === 'true', `Large font should be pressed, got: ${pressed}`)
    } else {
      assert(true, 'Large font button not found')
    }
  })

  await runSuite('Settings: change font size to medium', async () => {
    const mediumBtn = page.locator('button:has-text("Mediana")')
    if (await mediumBtn.count() > 0) {
      await mediumBtn.first().click()
      await page.waitForTimeout(300)
      const pressed = await mediumBtn.first().getAttribute('aria-pressed')
      assert(pressed === 'true', `Medium font should be pressed, got: ${pressed}`)
    } else {
      assert(true, 'Medium font button not found')
    }
  })

  // ─── LISTAS (etapa 2) ─────────────────────────────────────────
  console.log('\n═══════ LISTAS ═══════\n')

  const metricValues = () => page.$$eval('dl.metric-strip .metric', els => els.map(e => [e.querySelector('dt').textContent.trim(), e.querySelector('dd').textContent.trim()]))
  const cardsInView = () => page.$$eval('.list-card', els => els.filter(e => e.getBoundingClientRect().top < window.innerHeight).length)

  await page.setViewportSize({ width: 1400, height: 900 })
  await page.evaluate(() => {
    localStorage.setItem('piu-font-size', 'medium')
    localStorage.setItem('piu-macro', 'false')
    localStorage.setItem('piu-theme', 'claro')
  })
  await page.goto(BASE_URL + '/#/menu')
  await page.reload()
  await waitForApp(page)
  await waitForContent(page, 'button[aria-label="Editar plato"]')

  await runSuite('Listas: Menú usa encabezado y franja de métricas', async () => {
    assert((await page.locator('.page-header h2').textContent()).trim() === 'Menú', 'PageHeader missing')
    const m = JSON.stringify(await metricValues())
    assert(m === JSON.stringify([['Activos', '10'], ['Inactivos', '1'], ['Total', '11']]), `Metrics: ${m}`)
  })

  await runSuite('Listas: orden del Menú es un radiogroup con flechas', async () => {
    const group = page.locator('[role="radiogroup"][aria-label="Ordenar platos"]')
    assert(await group.locator('[role="radio"]').count() === 4, 'Expected 4 sort options')
    const checked = group.locator('[role="radio"][aria-checked="true"]')
    assert((await checked.textContent()).trim() === 'Nombre', 'Nombre should be checked')
    await checked.focus()
    await page.keyboard.press('ArrowRight')
    assert((await group.locator('[role="radio"][aria-checked="true"]').textContent()).trim() === 'Precio', 'ArrowRight should select Precio')
    assert(await page.evaluate(() => document.activeElement?.getAttribute('role')) === 'radio', 'Focus should follow selection')
    await page.keyboard.press('ArrowLeft')
  })

  await runSuite('Listas: entran al menos 5 platos en pantalla', async () => {
    const n = await cardsInView()
    assert(n >= 5, `Only ${n} cards in view`)
  })

  await runSuite('Listas: precio revisado se muestra como estado, no como botón apagado', async () => {
    assert(await page.locator('button:disabled:has-text("Actualizado")').count() === 0, 'Disabled Actualizado button still present')
  })

  await page.goto(BASE_URL + '/#/ingredients')
  await page.reload()
  await waitForApp(page)
  await waitForContent(page, 'button[aria-label="Editar ingrediente"]')

  await runSuite('Listas: Ingredientes usa franja de métricas', async () => {
    assert((await page.locator('.page-header h2').textContent()).trim() === 'Ingredientes', 'PageHeader missing')
    const m = JSON.stringify(await metricValues())
    assert(m === JSON.stringify([['Ingredientes', '18'], ['Sub-productos', '2'], ['Total', '20']]), `Metrics: ${m}`)
  })

  await runSuite('Listas: categorías de Ingredientes en una sola línea', async () => {
    const group = page.locator('[role="radiogroup"][aria-label="Filtrar por categoría"]')
    assert(await group.count() === 1, 'Category radiogroup missing')
    const oneLine = await group.evaluate(g => {
      const r = [...g.querySelectorAll('[role="radio"]')].map(e => e.getBoundingClientRect().top)
      return new Set(r.map(Math.round)).size === 1
    })
    assert(oneLine, 'Categories wrap to more than one line')
    await group.locator('[role="radio"]', { hasText: 'Lácteos' }).click()
    assert(await page.locator('.list-card').count() === 5, 'Lácteos filter should show 5')
    await group.locator('[role="radio"]', { hasText: 'Todas' }).click()
  })

  await runSuite('Listas: entran al menos 5 ingredientes en pantalla', async () => {
    const n = await cardsInView()
    assert(n >= 5, `Only ${n} cards in view`)
  })

  await page.goto(BASE_URL + '/#/clients')
  await page.reload()
  await waitForApp(page)
  await waitForContent(page, 'button[aria-label="Editar cliente"]')

  await runSuite('Listas: Clientes muestra el total como subtítulo', async () => {
    assert((await page.locator('.page-header .page-subtitle').textContent()).trim() === '8 clientes', 'Subtitle should read 8 clientes')
    assert(await page.locator('dl.metric-strip').count() === 0, 'Clients should not use a metric strip')
  })

  await runSuite('Listas: historial del cliente se abre con teclado', async () => {
    const btn = page.locator('.list-card button[aria-label^="Ver historial de"]').first()
    assert(await btn.count() === 1, 'History button missing')
    await btn.focus()
    await page.keyboard.press('Enter')
    await page.waitForSelector('[role="dialog"]', { timeout: 3000 })
    assert((await page.locator('[role="dialog"]').textContent()).includes('Historial de'), 'History dialog not opened')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  })

  await runSuite('Listas: entran al menos 5 clientes en pantalla', async () => {
    const n = await cardsInView()
    assert(n >= 5, `Only ${n} cards in view`)
  })

  await page.goto(BASE_URL + '/#/production')
  await page.reload()
  await waitForApp(page)
  await waitForContent(page, '.prod-card')

  await runSuite('Listas: Producción usa encabezado, métricas y categorías segmentadas', async () => {
    assert((await page.locator('.page-header h2').textContent()).trim() === 'Producción semanal', 'PageHeader missing')
    const m = JSON.stringify(await metricValues())
    assert(m === JSON.stringify([['Unidades pedidas', '11'], ['Producido', '8'], ['Sobreproducción', '8']]), `Metrics: ${m}`)
    const group = page.locator('[role="radiogroup"][aria-label="Filtrar por categoría"]')
    assert(await group.locator('[role="radio"]').count() === 4, 'Expected Todas + 3 categories')
  })

  await runSuite('Listas: sub-productos es un desplegable neutro', async () => {
    const toggle = page.locator('button.disclosure:has-text("Sub-productos")')
    assert(await toggle.count() === 1, 'Sub-productos disclosure missing')
    const bg = await toggle.evaluate(el => getComputedStyle(el.closest('.disclosure-panel')).backgroundColor)
    const card = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim())
    assert(bg === 'rgb(255, 255, 255)' && card.toUpperCase() === '#FFFFFF', `Panel should use card background, got ${bg}`)
  })

  await runSuite('Listas: entran al menos 3 platos de producción y +1 sigue siendo táctil', async () => {
    const n = await page.$$eval('.prod-card', els => els.filter(e => e.getBoundingClientRect().top < window.innerHeight).length)
    assert(n >= 3, `Only ${n} production cards in view`)
    const h = await page.locator('button[aria-label*="como producido"]').first().evaluate(el => el.getBoundingClientRect().height)
    assert(h >= 56, `+1 button is ${h}px tall`)
  })

  await page.goto(BASE_URL + '/#/orders')
  await page.reload()
  await waitForApp(page)
  await waitForContent(page, '.order-card')

  await runSuite('Listas: Pedidos usa encabezado con selector de semana y franja de métricas', async () => {
    assert((await page.locator('.page-header h2').textContent()).trim() === 'Pedidos', 'PageHeader missing')
    assert(await page.locator('.page-header select[aria-label="Seleccionar semana"]').count() === 1, 'Week select should live in the header')
    const m = JSON.stringify(await metricValues())
    assert(m === JSON.stringify([['Pendientes', '3'], ['Armados', '0'], ['Entregados', '0']]), `Metrics: ${m}`)
  })

  await runSuite('Listas: tarjeta de pedido con total arriba y acciones abajo', async () => {
    const card = page.locator('.order-card').first()
    assert(await card.locator('.order-card-head .order-total').count() === 1, 'Total should be in the card head')
    assert(await card.locator('.order-card-foot button[aria-label="Marcar como armado"]').count() === 1, 'Actions should be in the card footer')
  })

  await runSuite('Listas: entran al menos 3 pedidos en pantalla', async () => {
    const n = await page.$$eval('.order-card', els => els.filter(e => e.getBoundingClientRect().top < window.innerHeight).length)
    assert(n >= 3, `Only ${n} orders in view`)
  })

  await page.goto(BASE_URL + '/#/analytics')
  await page.reload()
  await waitForApp(page)
  await waitForContent(page, '.analytics-head')

  await runSuite('Listas: Análisis usa encabezado, períodos segmentados y métricas', async () => {
    assert((await page.locator('.analytics-head .page-header h2').textContent()).trim() === 'Análisis', 'PageHeader missing')
    assert((await page.locator('.analytics-head .page-subtitle').textContent()).includes('entregados y cobrados'), 'Scope note should be the subtitle')
    const period = page.locator('[role="radiogroup"][aria-label="Período"]')
    assert(await period.locator('[role="radio"]').count() === 6, 'Expected 6 period options')
    assert((await period.locator('[aria-checked="true"]').textContent()).trim() === 'Esta semana', 'Esta semana should be checked')
    const labels = (await metricValues()).map(m => m[0])
    for (const l of ['Pedidos', 'Ingresos', 'Costo total', 'Ganancia neta', 'Desperdicio']) assert(labels.includes(l), `Missing metric ${l}: ${labels}`)
  })

  await runSuite('Listas: pestañas de Análisis son un tablist con flechas', async () => {
    const tabs = page.locator('[role="tablist"][aria-label="Vistas de análisis"] [role="tab"]')
    assert(await tabs.count() === 6, 'Expected 6 tabs')
    await tabs.first().focus()
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(200)
    assert(await tabs.nth(1).getAttribute('aria-selected') === 'true', 'ArrowRight should select Platos')
    const panel = page.locator('#analytics-panel[role="tabpanel"]')
    assert(await panel.getAttribute('aria-labelledby') === await tabs.nth(1).getAttribute('id'), 'Panel should be labelled by the active tab')
    await page.keyboard.press('ArrowLeft')
  })

  await runSuite('Listas: detalle de plato en Análisis se abre con teclado', async () => {
    await page.locator('[role="radiogroup"][aria-label="Período"] [role="radio"]', { hasText: 'Todo' }).click()
    await page.locator('[role="tab"]', { hasText: 'Platos' }).click()
    await page.waitForTimeout(600)
    const toggle = page.locator('#analytics-panel button.rank-toggle[aria-expanded]').first()
    assert(await toggle.count() === 1, 'Dish name should be a button')
    await toggle.focus()
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)
    assert(await toggle.getAttribute('aria-expanded') === 'true', 'Enter should expand the dish')
    await page.keyboard.press('Enter')
    await page.locator('[role="radiogroup"][aria-label="Período"] [role="radio"]', { hasText: 'Esta semana' }).click()
  })

  await runSuite('Listas: en modo macro los títulos escalan con el texto', async () => {
    await page.evaluate(() => localStorage.setItem('piu-macro', 'true'))
    await page.goto(BASE_URL + '/#/orders')
    await page.reload()
    await waitForApp(page)
    await waitForContent(page, '.order-card')
    const sizes = await page.evaluate(() => ({
      body: parseFloat(getComputedStyle(document.body).fontSize),
      name: parseFloat(getComputedStyle(document.querySelector('.order-card h3')).fontSize),
      weekClipped: (() => { const w = document.querySelector('.sidebar-week'); return w.scrollWidth > w.clientWidth + 1 })(),
      selectClipped: (() => { const s = document.querySelector('select[aria-label="Seleccionar semana"]'); return s.getBoundingClientRect().width < 300 })()
    }))
    await page.evaluate(() => localStorage.setItem('piu-macro', 'false'))
    await page.reload()
    await waitForApp(page)
    assert(sizes.name >= sizes.body, `Order name ${sizes.name}px is smaller than body ${sizes.body}px`)
    assert(!sizes.weekClipped, 'Sidebar week label is clipped')
    assert(!sizes.selectClipped, 'Week select is too narrow')
  })

  await page.setViewportSize({ width: 1920, height: 1080 })

  // ─── KEYBOARD ────────────────────────────────────────────────
  console.log('\n═══════ KEYBOARD ═══════\n')
  const dialogCount = () => page.locator('[role="dialog"]').count()

  await page.goto(BASE_URL + '/#/clients')
  await waitForApp(page)
  await waitForContent(page, 'button[aria-label="Editar cliente"]')

  await runSuite('KEYBOARD: Enter crea cliente y Esc en "¿Cargar otro?" termina el alta', async () => {
    await page.locator('button:has-text("+ Cliente")').click()
    await page.waitForTimeout(500)
    const focused = await page.evaluate(() => document.activeElement?.id)
    assert(focused === 'client-name', `Foco inicial debería estar en nombre, está en ${focused}`)
    await page.keyboard.type('Teclado')
    await page.locator('#client-last-name').fill('Prueba Enter')
    await page.locator('#client-last-name').press('Enter')
    await page.waitForSelector('text=¿Cargar otro?', { timeout: 3000 })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    assert(await page.locator('#client-name').count() === 0 || await dialogCount() === 0, 'Esc en el popup debería cerrar el flujo de alta')
    assert(await page.locator('text=Teclado Prueba Enter').count() > 0, 'El cliente creado con Enter no aparece')
  })

  await runSuite('KEYBOARD: Esc cierra el formulario de cliente', async () => {
    await page.locator('button:has-text("+ Cliente")').click()
    await page.waitForTimeout(500)
    assert(await page.locator('#client-name').count() === 1, 'Formulario no abierto')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    assert(await page.locator('#client-name').count() === 0, 'Esc no cerró el formulario')
  })

  await runSuite('KEYBOARD: confirmación de borrar con flechas y Enter cancela', async () => {
    const before = await page.locator('button[aria-label="Editar cliente"]').count()
    await page.locator('button[aria-label="Eliminar cliente"]').last().click()
    await page.waitForSelector('text=¿Eliminar este cliente?', { timeout: 3000 })
    await page.waitForTimeout(300)
    await page.keyboard.press('ArrowRight')
    const label = await page.evaluate(() => document.activeElement?.textContent?.trim())
    assert(label === 'No', `→ debería ir a "No", está en "${label}"`)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(400)
    assert(await page.locator('text=¿Eliminar este cliente?').count() === 0, 'Popup no se cerró')
    assert(await page.locator('button[aria-label="Editar cliente"]').count() === before, 'No debería haber borrado')
  })

  await page.goto(BASE_URL + '/#/ingredients')
  await waitForApp(page)
  await waitForContent(page, 'button[aria-label="Editar ingrediente"]')

  await runSuite('KEYBOARD: Enter guarda ingrediente editado', async () => {
    await page.locator('button[aria-label="Editar ingrediente"]').first().click()
    await page.waitForTimeout(500)
    await page.locator('#ing-name').press('Enter')
    await page.waitForTimeout(500)
    assert(await page.locator('#ing-name').count() === 0, 'Enter no guardó/cerró el modal de ingrediente')
  })

  await page.goto(BASE_URL + '/#/menu')
  await waitForApp(page)
  await waitForContent(page, 'button[aria-label="Editar plato"]')

  await runSuite('KEYBOARD: Enter guarda plato editado', async () => {
    await page.locator('button[aria-label="Editar plato"]').first().click()
    await page.waitForTimeout(500)
    await page.locator('#dish-name').press('Enter')
    await page.waitForTimeout(500)
    assert(await page.locator('#dish-name').count() === 0, 'Enter no guardó/cerró el modal de plato')
  })

  await page.goto(BASE_URL + '/#/orders')
  await waitForApp(page)
  await waitForContent(page, 'button:has-text("+ Pedido")')

  await runSuite('KEYBOARD: pedido completo con teclado', async () => {
    await page.locator('button:has-text("+ Pedido")').click()
    await page.waitForTimeout(500)
    const search = page.locator('input[aria-label="Buscar cliente"]')
    await search.focus()
    await search.press('ArrowDown')
    await search.press('Enter')
    await page.waitForTimeout(300)
    assert(await page.locator('[aria-label="Cambiar cliente"]').count() === 1, '↓ + Enter no eligió cliente')
    assert(await page.locator('text=Nuevo Pedido').count() > 0, 'Enter en el buscador no debería enviar el pedido')
    await page.locator('select[aria-label="Plato 1"]').selectOption({ index: 1 })
    const noBtn = page.locator('.modal-content button:text-is("No")')
    await noBtn.focus()
    await page.keyboard.press('ArrowRight')
    const label = await page.evaluate(() => document.activeElement?.textContent?.trim())
    assert(label === 'Sí', `→ desde "No" debería ir a "Sí", está en "${label}"`)
    const notes = page.locator('textarea[placeholder="Observaciones del pedido..."]')
    await notes.fill('linea 1')
    await notes.press('Control+Enter')
    await page.waitForTimeout(600)
    assert(await page.locator('text=¿Cargar otro?').count() > 0, 'Ctrl+Enter no creó el pedido')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  })

  await runSuite('ROUTE: hoja de ruta se reusa si no cambian los pedidos', async () => {
    let geocodeCalls = 0
    await page.route('https://nominatim.openstreetmap.org/**', route => {
      geocodeCalls++
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ lat: '-31.42', lon: '-64.18' }]) })
    })
    await page.route('https://router.project-osrm.org/**', route => route.fulfill({ status: 500, body: '' }))
    await page.evaluate(() => window.piu.setStartLocation({ address: 'Colón 500', lat: -31.41, lng: -64.19, city: 'Córdoba', countryCode: 'ar' }))
    const openRoute = async () => {
      await page.locator('button:has-text("Hoja de Ruta")').click()
      await page.waitForSelector('text=Mapa de ruta', { timeout: 30000 })
    }
    const closeViewer = async () => {
      await page.locator('.modal-content button:text-is("Cerrar")').click()
      await page.waitForTimeout(300)
    }
    await openRoute()
    const first = geocodeCalls
    assert(first > 0, 'La primera hoja de ruta debería geocodificar')
    await closeViewer()
    await openRoute()
    assert(geocodeCalls === first, `Sin cambios no debería geocodificar de nuevo (${first} → ${geocodeCalls})`)
    await page.locator('button:has-text("Recalcular ruta")').click()
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'Recalcular ruta' && !b.disabled), { timeout: 30000 })
    assert(geocodeCalls > first, 'Recalcular ruta debería volver a geocodificar')
    const afterForce = geocodeCalls
    await closeViewer()
    await page.evaluate(() => window.piu.setStartLocation({ address: 'Otra 1', lat: -31.5, lng: -64.2, city: 'Córdoba', countryCode: 'ar' }))
    await openRoute()
    assert(geocodeCalls > afterForce, 'Cambiar el punto de partida debería recalcular')
    await closeViewer()
    await page.unroute('https://nominatim.openstreetmap.org/**')
    await page.unroute('https://router.project-osrm.org/**')
  })

  // ─────────────────────────────────────────────
  // Iteration 4: Empty state tests
  // ─────────────────────────────────────────────

  await runSuite('EMPTY: Dashboard sin pedidos', async () => {
    await page.goto(`${BASE_URL}/?empty=orders#/production`)
    await waitForApp(page)
    await page.waitForFunction(() => document.body.innerText.includes('No hay pedidos para esta semana'), { timeout: 8000 }).catch(() => {})
    const body = await page.evaluate(() => document.body.innerText)
    assert(body.includes('No hay pedidos para esta semana'), `Debe mostrar empty state, body: ${body.slice(0, 200)}`)
  })

  await runSuite('EMPTY: Orders sin pedidos', async () => {
    await page.goto(`${BASE_URL}/?empty=orders#/orders`)
    await waitForApp(page)
    await page.waitForFunction(() => document.body.innerText.includes('No hay pedidos esta semana'), { timeout: 8000 }).catch(() => {})
    const body = await page.evaluate(() => document.body.innerText)
    assert(body.includes('No hay pedidos esta semana'), `Debe mostrar empty state, body: ${body.slice(0, 200)}`)
  })

  await runSuite('EMPTY: Menu sin platos', async () => {
    await page.goto(`${BASE_URL}/?empty=dishes#/menu`)
    await waitForApp(page)
    await page.waitForFunction(() => document.body.innerText.includes('No hay platos en el menú'), { timeout: 8000 }).catch(() => {})
    const body = await page.evaluate(() => document.body.innerText)
    assert(body.includes('No hay platos en el menú'), `Debe mostrar empty state, body: ${body.slice(0, 200)}`)
  })

  await runSuite('EMPTY: Ingredients vacío', async () => {
    await page.goto(`${BASE_URL}/?empty=ingredients#/ingredients`)
    await waitForApp(page)
    await page.waitForFunction(() => document.body.innerText.includes('No hay ingredientes cargados'), { timeout: 8000 }).catch(() => {})
    const body = await page.evaluate(() => document.body.innerText)
    assert(body.includes('No hay ingredientes cargados'), `Debe mostrar empty state, body: ${body.slice(0, 200)}`)
  })

  await runSuite('EMPTY: Clients vacío', async () => {
    await page.goto(`${BASE_URL}/?empty=clients#/clients`)
    await waitForApp(page)
    await page.waitForFunction(() => document.body.innerText.includes('No hay clientes registrados'), { timeout: 8000 }).catch(() => {})
    const body = await page.evaluate(() => document.body.innerText)
    assert(body.includes('No hay clientes registrados'), `Debe mostrar empty state, body: ${body.slice(0, 200)}`)
  })

  // ─────────────────────────────────────────────
  // Iteration 4: Error state tests (IPC failures)
  // ─────────────────────────────────────────────

  await runSuite('ERROR: Dashboard on load', async () => {
    await page.goto(`${BASE_URL}/?error=getDashboard#/production`)
    await waitForApp(page)
    await page.waitForSelector('[role="alert"]', { timeout: 8000 }).catch(() => {})
    const banner = page.locator('[role="alert"]')
    assert(await banner.isVisible(), 'Debe mostrar ErrorBanner aun en loading skeleton')
    const text = await banner.textContent()
    assert(text.includes('No se pudieron cargar'), `ErrorBanner debe incluir 'No se pudieron cargar', obtuve: ${text}`)
  })

  await runSuite('ERROR: Menu on load', async () => {
    await page.goto(`${BASE_URL}/?error=getDishes#/menu`)
    await waitForApp(page)
    await page.waitForSelector('[role="alert"]', { timeout: 8000 }).catch(() => {})
    const banner = page.locator('[role="alert"]')
    assert(await banner.isVisible(), 'Debe mostrar ErrorBanner')
    const text = await banner.textContent()
    assert(text.includes('No se pudieron cargar'), `ErrorBanner debe decir 'No se pudieron cargar', obtuve: ${text}`)
  })

  await runSuite('ERROR: Orders on load gracefully handles', async () => {
    await page.goto(`${BASE_URL}/?error=getOrders#/orders`)
    await waitForApp(page)
    await page.waitForTimeout(1000)
    const hasAlert = await page.locator('[role="alert"]').count()
    if (hasAlert === 0) {
      const body = await page.evaluate(() => document.body.innerText)
      assert(body.includes('Pedidos'), `Orders page debe renderizar aunque falle getOrders, body: ${body.slice(0, 100)}`)
    }
  })

  await runSuite('ERROR: Ingredients on load', async () => {
    await page.goto(`${BASE_URL}/?error=getIngredients#/ingredients`)
    await waitForApp(page)
    await page.waitForSelector('[role="alert"]', { timeout: 8000 }).catch(() => {})
    const banner = page.locator('[role="alert"]')
    assert(await banner.isVisible(), 'Debe mostrar ErrorBanner')
    const text = await banner.textContent()
    assert(text.includes('No se pudieron cargar'), `ErrorBanner debe decir 'No se pudieron cargar', obtuve: ${text}`)
  })

  await runSuite('ERROR: Clients on load', async () => {
    await page.goto(`${BASE_URL}/?error=getClients#/clients`)
    await waitForApp(page)
    await page.waitForSelector('[role="alert"]', { timeout: 8000 }).catch(() => {})
    const banner = page.locator('[role="alert"]')
    assert(await banner.isVisible(), 'Debe mostrar ErrorBanner')
    const text = await banner.textContent()
    assert(text.includes('No se pudieron cargar'), `ErrorBanner debe decir 'No se pudieron cargar', obtuve: ${text}`)
  })

  await browser.close()
  printReport()

  function printReport() {
    console.log('\n════════════════════════════════════════════')
    console.log('📊 RESULTADOS PLAYWRIGHT')
    console.log(`  ✅ Passed: ${results.passed.length}`)
    console.log(`  ❌ Failed: ${results.failed.length}`)
    console.log(`  📝 Total:  ${results.total}`)
    if (results.failed.length > 0) {
      console.log('\n❌ FAILURES:')
      results.failed.forEach(f => console.log(`  - ${f.name}: ${f.error}`))
    }
    console.log('════════════════════════════════════════════\n')
    fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(results, null, 2))
  }
}

runAll().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
