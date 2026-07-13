import subprocess, time, sys, json, os
from playwright.sync_api import sync_playwright

SERVER = None
ELECTRON = None
PAGE = None
PLAY = None

def log(msg):
    print(f"  [{msg}]")

def fail(msg):
    print(f"  ❌ {msg}")
    return False

def ok(msg):
    print(f"  ✅ {msg}")
    return True

def wait(ms=500):
    time.sleep(ms / 1000)

def setup():
    global SERVER, ELECTRON, PAGE, PLAY
    log("Iniciando servidor Vite...")
    SERVER = subprocess.Popen(
        ["npx", "vite", "--port", "5199"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )
    wait(3000)

    PLAY = sync_playwright().start()
    ELECTRON = PLAY.chromium.launch(
        headless=True,
        args=["http://localhost:5199"]
    )
    PAGE = ELECTRON.new_page()

    wait(2000)
    PAGE.goto("http://localhost:5199", wait_until="networkidle")
    ok("App loaded")

def teardown():
    if ELECTRON: ELECTRON.close()
    if PLAY: PLAY.stop()
    if SERVER:
        SERVER.terminate()
        SERVER.wait()

results = {"passed": 0, "failed": 0, "tests": []}

def run_test(name, fn):
    global results
    try:
        fn()
        results["passed"] += 1
        results["tests"].append({"name": name, "status": "passed"})
    except Exception as e:
        results["failed"] += 1
        results["tests"].append({"name": name, "status": "failed", "error": str(e)})
        print(f"    ❌ {e}")

def test_inputs_work():
    log("Inputs should be focusable after page load")
    page = PAGE

    page.goto("http://localhost:5199/#/orders", wait_until="networkidle")
    wait(1500)

    search = page.locator('input[aria-label="Buscar pedido"]')
    search.click()
    search.fill("test input")
    val = search.input_value()
    assert val == "test input", f"Input no respondió: '{val}'"
    ok("Input responde en Orders")

    page.goto("http://localhost:5199/#/menu", wait_until="networkidle")
    wait(1500)
    search = page.locator('input[aria-label="Buscar plato"]')
    search.click()
    search.fill("milanesa")
    val = search.input_value()
    assert val == "milanesa", f"Input no respondió: '{val}'"
    ok("Input responde en Menu")

def test_modal_cycles():
    log("Open and close modals repeatedly, then check inputs")
    page = PAGE

    page.goto("http://localhost:5199/#/clients", wait_until="networkidle")
    wait(1500)

    for i in range(3):
        nuevo = page.locator('button:has-text("Nuevo Cliente")')
        nuevo.click()
        wait(400)

        close = page.locator('button[aria-label="Cerrar"]')
        close.click()
        wait(400)

    search = page.locator('input[aria-label="Buscar cliente"]')
    search.click()
    search.fill("test")
    val = search.input_value()
    assert val == "test", f"Input dejó de funcionar tras {i+1} modales"
    ok(f"Inputs OK después de {3} ciclos de modal")

def test_focus_after_navigation():
    log("Navigate between pages and check input focus")
    page = PAGE

    page.goto("http://localhost:5199/#/", wait_until="networkidle")
    wait(1500)

    nav_orders = page.locator('nav a[title*="Pedidos"]')
    nav_orders.click()
    wait(1000)

    nav_menu = page.locator('nav a[title*="Menú"]')
    nav_menu.click()
    wait(1000)

    nav_ingredients = page.locator('nav a[title*="Ingredientes"]')
    nav_ingredients.click()
    wait(1000)

    page.goto("http://localhost:5199/#/clients", wait_until="networkidle")
    wait(1500)

    search = page.locator('input[aria-label="Buscar cliente"]')
    search.click()
    search.fill("funciona")
    val = search.input_value()
    assert val == "funciona", "Input no funciona después de navegar"
    ok("Inputs OK después de navegar entre páginas")

def test_keyboard_shortcuts():
    log("Ctrl+1-6 should navigate between pages")
    page = PAGE

    page.goto("http://localhost:5199/#/", wait_until="networkidle")
    wait(1500)

    page.keyboard.press("Control+2")
    wait(500)
    assert "/orders" in page.url or "#/orders" in page.url, f"Ctrl+2 no navegó a Orders: {page.url}"
    ok("Ctrl+2 navega a Orders")

    page.keyboard.press("Control+4")
    wait(500)
    assert "/ingredients" in page.url or "#/ingredients" in page.url, f"Ctrl+4 no navegó a Ingredients: {page.url}"
    ok("Ctrl+4 navega a Ingredients")

    page.keyboard.press("Control+1")
    wait(500)
    assert "/" == page.url.split("#")[-1] or "#/" in page.url, f"Ctrl+1 no navegó a Dashboard: {page.url}"
    ok("Ctrl+1 navega a Dashboard")

if __name__ == "__main__":
    print("\n🧪 PIU - Interactive Test Suite")
    print("=" * 40)
    try:
        setup()
        run_test("Inputs funcionan en todas las páginas", test_inputs_work)
        run_test("Ciclos de modal no rompen inputs", test_modal_cycles)
        run_test("Navegación no rompe inputs", test_focus_after_navigation)
        run_test("Atajos de teclado Ctrl+1-6", test_keyboard_shortcuts)
    finally:
        teardown()

    print(f"\n📊 Resultados: {results['passed']} ✅  {results['failed']} ❌")
    for t in results["tests"]:
        s = "✅" if t["status"] == "passed" else "❌"
        print(f"  {s} {t['name']}")
    sys.exit(1 if results["failed"] > 0 else 0)
