/**
 * Quick visual check - No requiere autenticación
 * Solo verifica que la página compile sin errores
 */

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capturar errores de consola
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    console.log('Navegando a la home...');
    await page.goto('http://localhost:3000', { timeout: 10000 });

    console.log('Esperando carga...');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Screenshot de la home
    await page.screenshot({ path: 'tests/screenshots/home-check.png' });
    console.log('✓ Screenshot guardado: tests/screenshots/home-check.png');

    // Verificar errores
    if (consoleErrors.length > 0) {
      console.log('\n⚠️ Errores encontrados en la consola:');
      consoleErrors.forEach(err => console.log('  -', err));
    } else {
      console.log('✓ No hay errores en la consola');
    }

    console.log('\n✓ Verificación completada');
  } catch (error) {
    console.error('✗ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
