const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.resolve('public/screenshots');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function capture() {
  console.log('🚀 Launching Chrome via puppeteer-core...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1.5 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  // Helper login function
  async function performLogin(email, password, expectedPath) {
    console.log(`🔑 Logging in as ${email}...`);
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[name="email"]');
    await page.type('input[name="email"]', email);
    await page.type('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 3500));
    console.log(`Current URL after login for ${email}:`, page.url());
  }

  // 1. Landing Page (Top / Hero)
  console.log('📸 1. Capturing Landing Page...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(outputDir, '01-landing-hero.png') });
  console.log('✅ Captured 01-landing-hero.png');

  // 2. Marketplace Page
  console.log('📸 2. Capturing Marketplace...');
  await page.goto('http://localhost:3000/marketplace', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(outputDir, '02-marketplace.png') });
  console.log('✅ Captured 02-marketplace.png');

  // 3. Login Page
  console.log('📸 3. Capturing Login Page...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(outputDir, '03-login.png') });
  console.log('✅ Captured 03-login.png');

  // 4. Register Page
  console.log('📸 4. Capturing Register Page...');
  await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(outputDir, '04-register.png') });
  console.log('✅ Captured 04-register.png');

  // 5. Farmer / Seller Dashboard
  console.log('📸 5. Capturing Farmer Dashboard...');
  await performLogin('farmer.rajesh@carbonbazaar.in', 'Password@123', '/seller/dashboard');
  if (!page.url().includes('/seller/dashboard')) {
    await page.goto('http://localhost:3000/seller/dashboard', { waitUntil: 'networkidle2' });
  }
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(outputDir, '05-farmer-seller-dashboard.png') });
  console.log('✅ Captured 05-farmer-seller-dashboard.png');

  // 6. Corporate Buyer Dashboard
  console.log('📸 6. Capturing Corporate Buyer Dashboard...');
  // Clear cookies & storage
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await performLogin('esg@indiacements.com', 'Password@123', '/buyer/dashboard');
  if (!page.url().includes('/buyer/dashboard')) {
    await page.goto('http://localhost:3000/buyer/dashboard', { waitUntil: 'networkidle2' });
  }
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(outputDir, '06-buyer-company-dashboard.png') });
  console.log('✅ Captured 06-buyer-company-dashboard.png');

  // 7. Admin Dashboard
  console.log('📸 7. Capturing Admin Dashboard...');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await performLogin('admin@carbonbazaar.com', 'admin123', '/admin/dashboard');
  if (!page.url().includes('/admin/dashboard')) {
    await page.goto('http://localhost:3000/admin/dashboard', { waitUntil: 'networkidle2' });
  }
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(outputDir, '07-admin-dashboard.png') });
  console.log('✅ Captured 07-admin-dashboard.png');

  await browser.close();
  console.log('\n🎉 All high-resolution screenshots captured successfully!');
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
