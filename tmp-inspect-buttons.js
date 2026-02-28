const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.goto('http://localhost:5174');
  await p.evaluate(() => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('authRole', 'site');
  });
  await p.reload();
  await p.waitForTimeout(2500);

  const btns = await p.$$eval('button', (els) =>
    els.map((e, i) => ({
      i,
      text: (e.textContent || '').trim().replace(/\s+/g, ' '),
      cls: e.className,
      title: e.getAttribute('title') || ''
    }))
  );

  console.log(JSON.stringify(btns.slice(0, 120), null, 2));
  await b.close();
})();
