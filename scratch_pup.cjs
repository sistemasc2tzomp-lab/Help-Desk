const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => {
        if(msg.type() === 'error' || msg.type() === 'warning') {
            console.log('[BROWSER]', msg.type(), msg.text());
        }
    });
    try {
        await page.goto('http://localhost:5173/Help-Desk/#/app');
        await page.waitForSelector('input[type="email"]', {timeout: 5000});
        await page.type('input[type="email"]', 'romeronava33@gmail.com');
        await page.type('input[type="password"]', 'Sist3m@sc2*');
        await page.click('button[type="submit"]');
        await new Promise(r => setTimeout(r, 4000));
    } catch(e) {
        console.log('Script Error:', e.message);
    } finally {
        await browser.close();
    }
})();
