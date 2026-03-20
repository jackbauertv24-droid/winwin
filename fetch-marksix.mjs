import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const TARGET_URL = 'https://bet.hkjc.com/en/marksix/results';

async function fetchMarkSix() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1920,1080',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'Asia/Hong_Kong',
    javaScriptEnabled: true,
    hasTouch: false,
    isMobile: false,
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    window.chrome = { runtime: {} };
  });

  const page = await context.newPage();

  try {
    console.log('Navigating to:', TARGET_URL);
    
    await page.goto(TARGET_URL, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log('Page title:', title);

    const results = await page.evaluate(() => {
      const rows = document.querySelectorAll('.table-row');
      const draws = [];
      
      rows.forEach(row => {
        const idLink = row.querySelector('.cell-id a');
        const dateCell = row.querySelector('.cell-date');
        const sbNameCell = row.querySelector('.cell-sbName');
        const ballImgs = row.querySelectorAll('.cell-ball-list img[alt]');
        
        if (idLink && ballImgs.length > 0) {
          const drawId = idLink.textContent?.trim() || '';
          const date = dateCell?.textContent?.trim() || '';
          const sbName = sbNameCell?.textContent?.trim() || '';
          
          const numbers = [];
          ballImgs.forEach((img) => {
            const alt = img.getAttribute('alt');
            if (alt) {
              const num = parseInt(alt, 10);
              if (!isNaN(num)) {
                numbers.push(num);
              }
            }
          });
          
          draws.push({
            drawId,
            date,
            sbName,
            mainNumbers: numbers.slice(0, 6),
            extraNumber: numbers[6] || null
          });
        }
      });
      
      return draws;
    });

    console.log('\n=== Mark Six Results ===\n');
    results.forEach(draw => {
      console.log(`Draw: ${draw.drawId}`);
      console.log(`Date: ${draw.date}`);
      if (draw.sbName) console.log(`Type: ${draw.sbName}`);
      console.log(`Numbers: ${draw.mainNumbers.join(', ')} + Extra: ${draw.extraNumber}`);
      console.log('---');
    });

    writeFileSync('marksix-results.json', JSON.stringify(results, null, 2));
    console.log('\nResults saved to marksix-results.json');

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'marksix-error.png' });
  } finally {
    await browser.close();
  }
}

fetchMarkSix();
