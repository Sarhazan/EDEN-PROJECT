const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({headless:true});
  const p = await b.newPage();
  
  await p.goto('http://localhost:5174/tasks');
  await p.evaluate(() => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('authRole', 'site');
  });
  await p.reload();
  await p.waitForTimeout(3000);
  
  await p.screenshot({path: 'tasks.png'});
  const btns = await p.$$eval('button', (els) => els.map(e => e.textContent.trim().replace(/\s+/g, ' ')));
  console.log('Tasks buttons:', btns);
  
  await b.close();
})();
