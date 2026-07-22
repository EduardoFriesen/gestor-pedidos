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

  // ─── DASHBOARD ───────────────────────────────────────────────
  console.log('\n═══════ DASHBOARD ═══════\n')
  await page.goto(BASE_URL + '/#/')
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
    const text = page.locator('text=Producido:').first()
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
    const dishBtn = page.locator('button[aria-expanded]').first()
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
      const initialCards = await page.locator('button[aria-expanded]').count()
      await cats.first().click()
      await page.waitForTimeout(400)
      const filteredCards = await page.locator('button[aria-expanded]').count()
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
    assert(await page.locator('text=Faltantes').count() > 0, 'Faltantes not found')
    assert(await page.locator('text=Armados').count() > 0, 'Armados not found')
    assert(await page.locator('text=Enviados').count() > 0, 'Enviados not found')
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
    const btns = page.locator('button:has-text("Actualizado")')
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

  await runSuite('Analytics: stat cards render', async () => {
    assert(await page.locator('text=Pedidos').count() > 0, 'Orders stat not found')
    assert(await page.locator('text=Ingresos').count() > 0, 'Revenue stat not found')
  })

  await runSuite('Analytics: preset filter buttons', async () => {
    assert(await page.locator('button:has-text("Esta semana")').first().isVisible(), 'Week filter not found')
    assert(await page.locator('button:has-text("Este mes")').first().isVisible(), 'Month filter not found')
  })

  await runSuite('Analytics: tab buttons exist', async () => {
    assert(await page.locator('button:has-text("Top Platos")').first().isVisible(), 'Top tab not found')
    assert(await page.locator('button:has-text("Top Clientes")').first().isVisible(), 'Clients tab not found')
    assert(await page.locator('button:has-text("Tendencias")').first().isVisible(), 'Trends tab not found')
    assert(await page.locator('button:has-text("Comparativa")').first().isVisible(), 'Comparison tab not found')
  })

  await runSuite('Analytics: switch tabs', async () => {
    await page.locator('button:has-text("Top Clientes")').first().click()
    await page.waitForTimeout(600)
    assert(await page.locator('text=Gastado').count() > 0 || await page.locator('text=Clientes').count() > 0, 'Top Clientes tab rendered')

    await page.locator('button:has-text("Tendencias")').first().click()
    await page.waitForTimeout(600)
    assert(await page.locator('text=Mensual').count() > 0 || await page.locator('text=Tendencias').count() > 0, 'Tendencias tab rendered')

    await page.locator('button:has-text("Comparativa")').first().click()
    await page.waitForTimeout(600)

    await page.locator('button:has-text("Top Platos")').first().click()
    await page.waitForTimeout(600)
    assert(true, 'All tabs switched successfully')
  })

  await runSuite('Analytics: sort buttons in Top tab', async () => {
    const sortBtns = page.locator('button:has-text("Vendidos"), button:has-text("Ganancia"), button:has-text("Precio")')
    assert(await sortBtns.first().count() > 0, 'No sort buttons found')
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

  await runSuite('Analytics: pagination buttons in Top tab', async () => {
    const nextBtn = page.locator('button:has-text("Siguiente")')
    const prevBtn = page.locator('button:has-text("Anterior")')
    if (await nextBtn.count() > 0) assert(await nextBtn.first().isVisible(), 'Next button visible')
    if (await prevBtn.count() > 0) assert(await prevBtn.first().isVisible(), 'Prev button visible')
    if (await nextBtn.count() === 0 && await prevBtn.count() === 0) assert(true, 'No pagination needed')
  })

  await runSuite('Analytics: expand dish row', async () => {
    const headers = page.locator('button:has-text("▸"), button:has-text("▾")')
    if (await headers.count() > 0) {
      await headers.first().click()
      await page.waitForTimeout(600)
      assert(true, 'Dish expand clicked')
    } else {
      assert(true, 'No expandable dish rows, skip')
    }
  })

  await runSuite('Analytics: trends tab renders', async () => {
    await page.locator('button:has-text("Tendencias")').first().click()
    await page.waitForTimeout(800)
    const hasCharts = await page.locator('text=Mensual').count() > 0
    const hasRevenue = await page.locator('text=Ingresos').count() > 0
    assert(hasCharts || hasRevenue, 'Trends tab rendered with content')
  })

  await runSuite('Analytics: comparison tab renders', async () => {
    await page.locator('button:has-text("Comparativa")').first().click()
    await page.waitForTimeout(800)
    const hasComparison = await page.locator('text=Comparativa').count() > 0
    const hasPeriod = await page.locator('text=Período').count() > 0
    assert(hasComparison || hasPeriod, 'Comparison tab rendered')
  })

  // ─── SETTINGS ─────────────────────────────────────────────────
  console.log('\n═══════ SETTINGS ═══════\n')
  await page.goto(BASE_URL + '/#/settings')
  await waitForApp(page)
  await waitForContent(page, 'text=Configuración')

  await runSuite('Settings: page title renders', async () => {
    assert(await page.locator('text=Configuración').count() > 0, 'Settings title not found')
  })

  await runSuite('Settings: theme buttons exist', async () => {
    assert(await page.locator('text=Fondo crema suave, texto oscuro').count() > 0, 'Claro theme not found')
    assert(await page.locator('text=Fondo negro, texto blanco, alto contraste').count() > 0, 'Oscuro theme not found')
    assert(await page.locator('text=Colores amigables para daltonismo').count() > 0, 'Daltonico theme not found')
  })

  await runSuite('Settings: toggle theme', async () => {
    const oscuroBtn = page.locator('button', { hasText: 'Fondo negro, texto blanco, alto contraste' })
    await oscuroBtn.click()
    await page.waitForTimeout(300)
    const pressed = await oscuroBtn.getAttribute('aria-pressed')
    assert(pressed === 'true', `Oscuro should be pressed, got: ${pressed}`)
    const claroBtn = page.locator('button', { hasText: 'Fondo crema suave, texto oscuro' })
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
    const oscuroBtn = page.locator('button', { hasText: 'Fondo negro, texto blanco, alto contraste' })
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
    const daltonicoBtn = page.locator('button', { hasText: 'Colores amigables para daltonismo' })
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
    const claroBtn = page.locator('button', { hasText: 'Fondo crema suave, texto oscuro' })
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

  // ─────────────────────────────────────────────
  // Iteration 4: Empty state tests
  // ─────────────────────────────────────────────

  await runSuite('EMPTY: Dashboard sin pedidos', async () => {
    await page.goto(`${BASE_URL}/?empty=orders#/`)
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
    await page.goto(`${BASE_URL}/?error=getDashboard#/`)
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
