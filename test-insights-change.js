// Script to test Insights to Estadísticas change
const { chromium } = require('playwright');

async function testChange() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Navigate to login
  console.log('1. Navigating to http://localhost:3000/login');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  
  // Login with test credentials
  console.log('2. Logging in with test credentials');
  await page.fill('input[type="email"]', 'gerencia@ecoplaza.com');
  await page.fill('input[type="password"]', 'q0#CsgL8my3$');
  await page.click('button[type="submit"]');
  
  // Wait for redirect to main dashboard
  console.log('3. Waiting for dashboard to load');
  await page.waitForNavigation({ waitUntil: 'networkidle' });
  
  // Check if we're on the home page
  const url = page.url();
  console.log('4. Current URL:', url);
  
  // Take screenshot of the page
  console.log('5. Taking screenshot');
  await page.screenshot({ path: 'sidebar-estadisticas.png' });
  
  // Check if "Estadísticas" text appears in sidebar
  console.log('6. Checking for "Estadísticas" in page');
  const pageText = await page.evaluate(() => document.body.innerText);
  if (pageText.includes('Estadísticas')) {
    console.log('✅ SUCCESS: "Estadísticas" found in page!');
  } else {
    console.log('❌ FAIL: "Estadísticas" NOT found in page');
    console.log('Looking for "Insights":', pageText.includes('Insights'));
  }
  
  // Check page title
  const title = await page.title();
  console.log('7. Page title:', title);
  
  // Get DashboardHeader title
  const headerTitle = await page.evaluate(() => {
    const header = document.querySelector('h1');
    return header ? header.innerText : 'Not found';
  });
  console.log('8. Dashboard Header Title:', headerTitle);
  
  await browser.close();
  console.log('✅ Test complete!');
}

testChange().catch(console.error);
