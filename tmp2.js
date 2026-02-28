const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({headless:true});
  const p = await b.newPage();
  
  p.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
  p.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  await p.goto('http://localhost:5174');
  await p.evaluate(() => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('authRole', 'site');
  });
  await p.reload();
  await p.waitForTimeout(3000);
  
  await b.close();
})();
