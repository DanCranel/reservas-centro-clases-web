// Recorrido E2E contra el servidor real (npm run demo). Uso: npm i --no-save playwright axe-core && npx playwright install chromium && node e2e/recorrido.cjs docs/evidencias
const { chromium } = require('playwright');
const fs = require('fs');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = 'http://localhost:8080';
const OUT = process.argv[2];
const FECHA = '2026-11-17';
const log = [];
const ok = (cond, msg) => { log.push(`${cond ? '✔' : '✖'} ${msg}`); if (!cond) process.exitCode = 1; };

async function axe(page, nombre) {
  await page.addScriptTag({ content: AXE });
  const r = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] })));
  ok(r.violations.length === 0, `axe ${nombre}: ${r.violations.length} infracciones, ${r.passes.length} reglas superadas` + (r.violations.length ? ' → ' + r.violations.map((v) => v.id + ':' + v.nodes.map(n=>n.target).join('|')).join(', ') : ''));
  return r;
}

async function ingresar(page, email, pass) {
  await page.goto(BASE + '/ingresar');
  await page.fill('#email', email); await page.fill('#password', pass);
  await page.click('form button[type=submit]');
  await page.waitForURL(/\/reservas/);
}

(async () => {
  const b = await chromium.launch();
  const movil = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const escritorio = await b.newContext({ viewport: { width: 1280, height: 860 } });
  const m = await movil.newPage(); const a = await escritorio.newPage();
  [m, a].forEach((p) => { p.on('dialog', (d) => d.accept()); p.on('pageerror', (e) => ok(false, 'error JS: ' + e.message)); });

  // 1. Catálogo público (móvil)
  await m.goto(BASE + '/servicios');
  await m.waitForSelector('.servicio');
  ok((await m.locator('.servicio').count()) === 4, 'catálogo muestra 4 servicios');
  await m.screenshot({ path: `${OUT}/01-servicios-movil.png` });
  await axe(m, '/servicios');
  const scroll = await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  ok(scroll, 'sin desplazamiento horizontal a 390 px');

  // 2. Ruta privada sin sesión -> login
  await m.goto(BASE + '/reservas');
  await m.waitForURL(/\/ingresar\?volver=/);
  ok(true, 'ruta privada redirige a /ingresar?volver=/reservas');
  await m.click('form button[type=submit]');
  ok((await m.locator('#email-error').count()) === 1, 'login vacío muestra error por campo');
  await axe(m, '/ingresar');
  await m.fill('#email', 'maria@correo.com'); await m.fill('#password', 'mala');
  await m.click('form button[type=submit]');
  await m.waitForSelector('.error-general');
  ok(/Correo o contraseña incorrectos/.test(await m.textContent('.error-general')), 'credenciales malas -> mensaje de la API (401)');
  await m.fill('#password', 'Maria123!'); await m.click('form button[type=submit]');
  await m.waitForURL(/\/reservas$/);
  await m.waitForSelector('.estado--vacio');
  ok(true, 'estado vacío en "Mis reservas"');
  await m.screenshot({ path: `${OUT}/02-vacio-movil.png` });

  // 3. Admin en escritorio, a la escucha
  await ingresar(a, 'admin@tejiendoredes.ec', 'Admin123!');
  await a.waitForSelector('.estado--vacio');

  // 4. Nueva reserva con errores de cliente y de servidor
  await m.goto(BASE + '/reservas/nueva?servicioId=2');
  await m.waitForSelector('#estudiante');
  await m.click('form button[type=submit]');
  ok(/Revise/.test(await m.textContent('.resumen')), 'validación del cliente muestra resumen');
  ok(await m.evaluate(() => document.activeElement.id === 'estudiante'), 'el foco va al primer campo inválido');
  await m.screenshot({ path: `${OUT}/03-validacion-movil.png`, fullPage: true });
  await m.fill('#estudiante', 'Sofía Pérez'); await m.fill('#fecha', FECHA); await m.fill('#hora', '15:00');
  await m.click('form button[type=submit]');
  await m.waitForURL(/\/reservas\/\d+$/);
  ok(true, 'reserva creada (201) -> detalle');
  await a.waitForSelector('.aviso:has-text("Nueva reserva")', { timeout: 5000 }).then(() => ok(true, 'tiempo real: admin recibe aviso de la nueva reserva'), () => ok(false, 'tiempo real: admin recibe aviso de la nueva reserva'));
  await a.waitForSelector('.reserva');
  ok((await a.locator('.reserva').count()) === 1, 'tiempo real: lista del admin se actualiza sola');

  // 5. Conflicto 409 de la API mostrado al usuario
  await m.goto(BASE + '/reservas/nueva?servicioId=2');
  await m.waitForSelector('#estudiante');
  await m.fill('#estudiante', 'Sofía Pérez'); await m.fill('#fecha', FECHA); await m.fill('#hora', '15:30');
  await m.click('form button[type=submit]');
  await m.waitForSelector('.alerta[role=alert]');
  ok(/se cruza/.test(await m.textContent('.alerta')), '409 RESERVA_DUPLICADA se muestra como alerta');
  await m.screenshot({ path: `${OUT}/04-conflicto-409-movil.png` });
  await m.fill('#estudiante', 'Mateo Pérez'); await m.selectOption('#servicio', { index: 1 }).catch(() => {});
  await m.click('form button[type=submit]');
  await m.waitForURL(/\/reservas\/\d+$/);

  // 6. Admin confirma; la estudiante ve el cambio en su detalle sin recargar
  await a.waitForFunction(() => document.querySelectorAll('.reserva').length === 2);
  await a.screenshot({ path: `${OUT}/05-admin-escritorio.png` });
  await axe(a, '/reservas (admin)');
  const idMateo = Number(m.url().split('/').pop());
  await a.click(`#reserva-${idMateo} ~ * button, article[aria-labelledby="reserva-${idMateo}"] button:has-text("Confirmar")`);
  await m.waitForSelector('.etiqueta--confirmada');
  ok(true, 'tiempo real: el detalle de la estudiante pasa a "confirmada"');
  await m.screenshot({ path: `${OUT}/06-detalle-confirmado-movil.png`, fullPage: true });
  await axe(m, '/reservas/:id');

  // 7. Conflicto de versión: el admin tiene una versión vieja en otra pestaña
  const a2 = await escritorio.newPage(); a2.on('dialog', (d) => d.accept());
  await a2.goto(BASE + '/reservas'); await a2.waitForSelector('.reserva');
  await a2.evaluate(() => {}); // a2 mantiene versión 1 de Sofía en pantalla
  const idSofia = idMateo - 1;
  await m.goto(BASE + `/reservas/${idSofia}`); await m.waitForSelector('h1');
  await m.click('button:has-text("Reprogramar")');
  await m.waitForSelector('.edicion #hora');
  await m.fill('.edicion #hora', '16:30'); await m.click('.edicion button[type=submit]');
  await m.waitForSelector('text=16:30–17:30');
  ok(true, 'reprogramar (PATCH con version) actualiza el detalle');
  // a2 se refresca por tiempo real; forzamos una versión vieja simulando un clic con datos desactualizados
  const r409 = await a2.evaluate(async (id) => (await fetch(`/api/reservas/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: 1, estado: 'confirmada' }) })).status, idSofia);
  ok(r409 === 409, 'versión obsoleta -> 409 VERSION_CONFLICTO');

  // 8. Filtros en la URL (admin)
  await a.goto(BASE + '/reservas?estado=confirmada');
  await a.waitForSelector('.reserva');
  ok((await a.locator('.reserva').count()) === 1, 'filtro por estado desde la URL');
  await a.selectOption('#f-estado', 'cancelada');
  await a.waitForSelector('.estado--vacio');
  ok(/estado=cancelada/.test(a.url()), 'el filtro se refleja en la URL y muestra estado vacío');

  // 9. PWA: manifest + service worker instalable
  await a.goto(BASE + '/');
  const swListo = await a.evaluate(async () => { const r = await navigator.serviceWorker.ready; return Boolean(r.active); });
  ok(swListo, 'service worker activo');
  const cdp = await escritorio.newCDPSession(a);
  const inst = await cdp.send('Page.getInstallabilityErrors');
  await cdp.detach();
  ok(inst.installabilityErrors.length === 0, `instalable (errores de instalabilidad: ${inst.installabilityErrors.length})`);
  const man = await (await a.request.get(BASE + '/manifest.webmanifest')).json();
  ok(man.display === 'standalone' && man.icons.length === 3, 'manifest: standalone + 3 íconos (incl. maskable)');

  // 10. Offline: catálogo desde caché, datos privados NO
  await a.goto(BASE + '/servicios'); await a.waitForSelector('.servicio');
  await a.reload(); await a.waitForSelector('.servicio'); // ya controlada por el SW
  await escritorio.setOffline(true);
  await a.goto(BASE + '/servicios');
  await a.waitForSelector('.servicio');
  await a.waitForSelector('.sin-conexion', { timeout: 5000 }).then(() => ok(true, 'offline: abre la app (precache) con aviso "Sin conexión"'), () => ok(false, 'offline: aviso sin conexión'));
  ok((await a.locator('nav >> text=Todas las reservas').count()) === 1, 'offline: la pestaña recuerda la sesión (copia mínima en sessionStorage)');
  ok((await a.locator('.servicio').count()) === 4, 'offline: catálogo desde caché (StaleWhileRevalidate)');
  await a.screenshot({ path: `${OUT}/07-offline-servicios.png` });
  await a.click('nav >> text=Todas las reservas');
  await a.waitForSelector('.estado--error');
  ok(/No hay conexión/.test(await a.textContent('.estado--error')), 'offline: reservas NO se sirven de caché (NetworkOnly) -> error con Reintentar');
  await a.screenshot({ path: `${OUT}/08-offline-reservas.png` });
  const cacheadas = await a.evaluate(async () => { const out = []; for (const n of await caches.keys()) { const c = await caches.open(n); for (const r of await c.keys()) if (r.url.includes('/api/')) out.push(r.url); } return out; });
  ok(cacheadas.every((u) => u.endsWith('/api/servicios')), `cachés solo contienen /api/servicios (${cacheadas.length} entrada/s de API)`);
  await escritorio.setOffline(false);
  await a.click('text=Reintentar');
  await a.waitForSelector('.reserva');
  ok(true, 'al volver la conexión, "Reintentar" carga las reservas');

  await b.close();
  fs.writeFileSync(`${OUT}/recorrido-e2e.txt`, log.join('\n') + '\n');
  console.log(log.join('\n'));
})().catch((e) => { console.error(e); console.log(log.join('\n')); process.exit(1); });
