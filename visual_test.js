const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  
  // Collect console errors and network failures
  const errors = [];
  const failedRequests = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text());
  });
  page.on('pageerror', err => errors.push('PAGE ERROR: ' + err.message));
  page.on('requestfailed', req => {
    failedRequests.push(req.url() + ' - ' + req.failure().errorText);
  });
  
  // Track all requests
  const allRequests = [];
  page.on('request', req => allRequests.push(req.url()));
  
  // Navigate to the deployed site
  console.log('Navigating to https://sudo-prog.github.io/aura-clone/ ...');
  try {
    await page.goto('https://sudo-prog.github.io/aura-clone/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
  } catch(e) {
    console.log('Navigation timeout (may be OK):', e.message);
  }
  
  // Wait a bit for React to render
  await new Promise(r => setTimeout(r, 5000));
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/aura-clone-screenshot.png', fullPage: true });
  
  // Check page state
  const title = await page.title();
  const rootHtml = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root ? root.innerHTML.substring(0, 500) : 'NO ROOT ELEMENT';
  });
  const hasContent = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root && root.children.length > 0;
  });
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 300));
  
  console.log('=== RESULTS ===');
  console.log('Page title:', title);
  console.log('Root has content:', hasContent);
  console.log('Root HTML (first 500 chars):', rootHtml);
  console.log('Body text (first 300 chars):', bodyText);
  console.log('Total requests:', allRequests.length);
  console.log('Failed requests:', failedRequests.length);
  failedRequests.forEach(r => console.log('  FAILED:', r));
  console.log('Console errors:', errors.length);
  errors.forEach(e => console.log('  ERROR:', e));
  
  // Check for external requests
  const externalReqs = allRequests.filter(u => 
    !u.includes('sudo-prog.github.io') && 
    !u.includes('localhost') &&
    !u.startsWith('data:')
  );
  console.log('External requests:', externalReqs.length);
  externalReqs.forEach(u => console.log('  EXTERNAL:', u));
  
  await browser.close();
  
  // Report screenshot size
  const stats = fs.statSync('/tmp/aura-clone-screenshot.png');
  console.log('Screenshot size:', stats.size, 'bytes');
  
  process.exit(0);
})().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});