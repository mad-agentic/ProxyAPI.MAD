import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetsDir = path.join(__dirname, '..', 'docs', 'assets');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const routes = [
  { path: '', name: '01-dashboard.png' },
  { path: 'keys', name: '02-apikeys.png' },
  { path: 'providers', name: '03-providers.png' },
  { path: 'chat', name: '04-chat.png' },
  { path: 'logs', name: '05-logs.png' },
  { path: 'settings', name: '06-settings.png' },
  { path: 'docs', name: '07-docs.png' }
];

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Set viewport to a good desktop size
  await page.setViewportSize({ width: 1280, height: 800 });
  
  for (const route of routes) {
    console.log(`Navigating to /${route.path}`);
    await page.goto(`http://localhost:5173/${route.path}`);
    // Wait for the page to be fully loaded and animations to finish
    await page.waitForTimeout(1000); 
    
    // Additional wait for specific elements if they load data asynchronously
    // e.g. await page.waitForLoadState('networkidle');
    
    const filePath = path.join(assetsDir, route.name);
    console.log(`Saving screenshot to ${filePath}`);
    await page.screenshot({ path: filePath, fullPage: true });
  }
  
  await browser.close();
  console.log('Done screenshots.');
}

run().catch(console.error);
