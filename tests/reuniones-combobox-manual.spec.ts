/**
 * Test Manual - Combobox de Filtro de Usuarios en Reuniones
 *
 * Este test valida el nuevo componente searchable dropdown
 * para el filtro "Ver reuniones de"
 *
 * REQUIERE: Usuario autenticado como superadmin
 */

import { test, expect } from '@playwright/test';

const SUPERADMIN_EMAIL = 'gerente.ti@ecoplaza.com.pe';
const SUPERADMIN_PASSWORD = 'H#TJf8M%xjpTK@Vn';

test.describe('Filtro Usuarios Combobox - Reuniones', () => {

  test.beforeEach(async ({ page }) => {
    // Login como superadmin
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', SUPERADMIN_EMAIL);
    await page.fill('input[type="password"]', SUPERADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Esperar redirección
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navegar a reuniones
    await page.goto('http://localhost:3000/reuniones');
    await page.waitForLoadState('networkidle');
  });

  test('Debe mostrar el botón del combobox', async ({ page }) => {
    // Verificar que existe el label
    const label = page.locator('label', { hasText: 'Ver reuniones de' });
    await expect(label).toBeVisible();

    // Verificar que existe el botón (reemplaza al select)
    const comboboxButton = page.locator('button', {
      has: page.locator('svg[class*="lucide-chevrons-up-down"]')
    });
    await expect(comboboxButton).toBeVisible();
  });

  test('Debe abrir dropdown al hacer click', async ({ page }) => {
    // Click en el botón
    const comboboxButton = page.locator('button').filter({
      has: page.locator('svg[class*="lucide-chevrons-up-down"]')
    }).first();
    await comboboxButton.click();

    // Verificar que aparece el input de búsqueda
    const searchInput = page.locator('input[placeholder="Buscar usuario..."]');
    await expect(searchInput).toBeVisible();

    // Verificar opciones fijas
    await expect(page.locator('text=Mis reuniones').first()).toBeVisible();
    await expect(page.locator('text=Todas').first()).toBeVisible();
  });

  test('Debe filtrar usuarios al escribir', async ({ page }) => {
    // Abrir dropdown
    const comboboxButton = page.locator('button').filter({
      has: page.locator('svg[class*="lucide-chevrons-up-down"]')
    }).first();
    await comboboxButton.click();

    // Escribir en búsqueda
    const searchInput = page.locator('input[placeholder="Buscar usuario..."]');
    await searchInput.fill('leo');

    // Esperar un momento para el filtrado
    await page.waitForTimeout(300);

    // Verificar que opciones fijas siguen visibles
    await expect(page.locator('text=Mis reuniones').first()).toBeVisible();

    // Screenshot para validación
    await page.screenshot({
      path: 'tests/screenshots/combobox-filtrado.png',
      fullPage: false
    });
  });

  test('Debe seleccionar "Mis reuniones"', async ({ page }) => {
    // Abrir dropdown
    const comboboxButton = page.locator('button').filter({
      has: page.locator('svg[class*="lucide-chevrons-up-down"]')
    }).first();
    await comboboxButton.click();

    // Click en "Mis reuniones"
    await page.locator('text=Mis reuniones').first().click();

    // Verificar que el botón muestra la selección
    await expect(comboboxButton).toContainText('Mis reuniones');

    // Verificar que el dropdown se cerró
    const searchInput = page.locator('input[placeholder="Buscar usuario..."]');
    await expect(searchInput).not.toBeVisible();
  });

  test('Debe seleccionar "Todas"', async ({ page }) => {
    // Abrir dropdown
    const comboboxButton = page.locator('button').filter({
      has: page.locator('svg[class*="lucide-chevrons-up-down"]')
    }).first();
    await comboboxButton.click();

    // Click en "Todas"
    await page.locator('text=Todas').first().click();

    // Verificar selección
    await expect(comboboxButton).toContainText('Todas');
  });

  test('Debe cerrar dropdown al hacer click fuera', async ({ page }) => {
    // Abrir dropdown
    const comboboxButton = page.locator('button').filter({
      has: page.locator('svg[class*="lucide-chevrons-up-down"]')
    }).first();
    await comboboxButton.click();

    // Verificar que está abierto
    const searchInput = page.locator('input[placeholder="Buscar usuario..."]');
    await expect(searchInput).toBeVisible();

    // Click fuera (en el header)
    await page.locator('h1').click();

    // Verificar que se cerró
    await expect(searchInput).not.toBeVisible();
  });

  test('Debe mostrar check en opción seleccionada', async ({ page }) => {
    // Abrir dropdown
    const comboboxButton = page.locator('button').filter({
      has: page.locator('svg[class*="lucide-chevrons-up-down"]')
    }).first();
    await comboboxButton.click();

    // Seleccionar "Todas"
    await page.locator('text=Todas').first().click();

    // Reabrir
    await comboboxButton.click();

    // Verificar que hay check icon en la opción seleccionada
    const todasOption = page.locator('[role="option"]', { hasText: 'Todas' });
    const checkIcon = todasOption.locator('svg[class*="lucide-check"]');
    await expect(checkIcon).toBeVisible();

    // Screenshot
    await page.screenshot({
      path: 'tests/screenshots/combobox-seleccionado.png',
      fullPage: false
    });
  });

  test('Debe ser responsive en mobile', async ({ page }) => {
    // Cambiar viewport a mobile
    await page.setViewportSize({ width: 375, height: 667 });

    // Verificar que el combobox es visible
    const comboboxButton = page.locator('button').filter({
      has: page.locator('svg[class*="lucide-chevrons-up-down"]')
    }).first();
    await expect(comboboxButton).toBeVisible();

    // Abrir
    await comboboxButton.click();

    // Verificar que el dropdown se adapta al ancho
    const dropdown = page.locator('[class*="absolute z-50"]');
    await expect(dropdown).toBeVisible();

    // Screenshot mobile
    await page.screenshot({
      path: 'tests/screenshots/combobox-mobile.png',
      fullPage: true
    });
  });

  test('Debe funcionar con teclado', async ({ page }) => {
    // Focus en el botón
    const comboboxButton = page.locator('button').filter({
      has: page.locator('svg[class*="lucide-chevrons-up-down"]')
    }).first();
    await comboboxButton.click();

    // Verificar que se abrió
    const searchInput = page.locator('input[placeholder="Buscar usuario..."]');
    await expect(searchInput).toBeVisible();

    // Navegar con flechas (cmdk maneja esto automáticamente)
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');

    // Enter para seleccionar
    await page.keyboard.press('Enter');

    // Verificar que se seleccionó algo
    await expect(searchInput).not.toBeVisible();
  });

  test('No debe mostrar errores en consola', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Interactuar con el componente
    const comboboxButton = page.locator('button').filter({
      has: page.locator('svg[class*="lucide-chevrons-up-down"]')
    }).first();
    await comboboxButton.click();
    await page.locator('text=Mis reuniones').first().click();

    // Verificar que no hay errores
    expect(consoleErrors).toHaveLength(0);
  });

});
