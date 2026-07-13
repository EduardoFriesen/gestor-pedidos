import { chromium } from 'playwright';

const URL = 'http://localhost:5199';
let passed = 0, failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.log(`  ❌ ${msg}`);
    failed++;
  }
}

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('\n🧪 PIU - Interactive Test Suite\n');

  // Test 1: Inputs work on Orders page
  console.log('[Inputs funcionan en todas las páginas]');
  await page.goto(`${URL}/#/orders`, { waitUntil: 'networkidle' });
  await wait(1500);

  let search = page.locator('input[aria-label="Buscar pedido"]');
  await search.click();
  await search.fill('test input');
  let val = await search.inputValue();
  assert(val === 'test input', `Input responde en Orders (value: "${val}")`);

  await page.goto(`${URL}/#/menu`, { waitUntil: 'networkidle' });
  await wait(1500);
  search = page.locator('input[aria-label="Buscar plato"]');
  await search.click();
  await search.fill('milanesa');
  val = await search.inputValue();
  assert(val === 'milanesa', `Input responde en Menu (value: "${val}")`);

  await page.goto(`${URL}/#/clients`, { waitUntil: 'networkidle' });
  await wait(1500);
  search = page.locator('input[aria-label="Buscar cliente"]');
  await search.click();
  await search.fill('test client');
  val = await search.inputValue();
  assert(val === 'test client', `Input responde en Clients (value: "${val}")`);

  // Test 2: Modal cycles
  console.log('\n[Ciclos de modal no rompen inputs]');
  for (let i = 0; i < 3; i++) {
    const nuevo = page.locator('button:has-text("Nuevo Cliente")');
    await nuevo.click();
    await wait(500);

    const close = page.locator('button[aria-label="Cerrar"]');
    await close.click();
    await wait(500);
  }

  search = page.locator('input[aria-label="Buscar cliente"]');
  await search.click();
  await search.fill('modal test');
  val = await search.inputValue();
  assert(val === 'modal test', `Input OK después de ${3} ciclos de modal (value: "${val}")`);

  // Test 3: Navigation doesn't break inputs
  console.log('\n[Navegación no rompe inputs]');

  const navLinks = [
    { name: 'Producción', selector: 'nav a[title*="Producción"]' },
    { name: 'Pedidos', selector: 'nav a[title*="Pedidos"]' },
    { name: 'Menú', selector: 'nav a[title*="Menú"]' },
    { name: 'Ingredientes', selector: 'nav a[title*="Ingredientes"]' },
    { name: 'Clientes', selector: 'nav a[title*="Clientes"]' },
    { name: 'Análisis', selector: 'nav a[title*="Análisis"]' },
  ];

  for (const link of navLinks) {
    const navItem = page.locator(link.selector);
    if (await navItem.count() > 0) {
      await navItem.click();
      await wait(800);
    }
  }

  // Back to clients and check input
  await page.goto(`${URL}/#/clients`, { waitUntil: 'networkidle' });
  await wait(1500);
  search = page.locator('input[aria-label="Buscar cliente"]');
  await search.click();
  await search.fill('navegacion ok');
  val = await search.inputValue();
  assert(val === 'navegacion ok', `Input OK después de navegar (value: "${val}")`);

  // Test 4: Keyboard shortcuts
  console.log('\n[Atajos de teclado Ctrl+1-6]');
  await page.goto(`${URL}/#/`, { waitUntil: 'networkidle' });
  await wait(1500);

  await page.keyboard.press('Control+2');
  await wait(800);
  const urlAfter2 = page.url();
  assert(urlAfter2.includes('#/orders') || urlAfter2.includes('/orders'),
    `Ctrl+2 navega a Orders (url: ${urlAfter2})`);

  await page.keyboard.press('Control+4');
  await wait(800);
  const urlAfter4 = page.url();
  assert(urlAfter4.includes('#/ingredients') || urlAfter4.includes('/ingredients'),
    `Ctrl+4 navega a Ingredients (url: ${urlAfter4})`);

  await browser.close();

  console.log(`\n📊 Resultados: ${passed} ✅  ${failed} ❌`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error(`\n  ❌ Error: ${e.message}`);
  process.exit(1);
});
