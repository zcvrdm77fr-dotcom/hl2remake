import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const errors = [];
const badResponses = [];
const server = spawn('python3', ['-m', 'http.server', '4173', '--bind', '127.0.0.1'], {
  stdio: 'ignore',
  env: process.env
});
let browser;

try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Static server did not start')), 5000);
    server.once('spawn', () => { clearTimeout(timer); resolve(); });
    server.once('error', (error) => { clearTimeout(timer); reject(error); });
  });

  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']
  });
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  page.on('pageerror', error => errors.push('PAGE: ' + error.stack));
  page.on('console', message => {
    if (message.type() === 'error') errors.push('CONSOLE: ' + message.text());
  });
  page.on('requestfailed', request => errors.push('REQUEST: ' + request.url() + ' :: ' + request.failure()?.errorText));
  page.on('response', response => {
    if (response.status() >= 400) badResponses.push(response.status() + ' ' + response.url());
  });

  const response = await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle', timeout: 30000 });
  if (!response || !response.ok()) throw new Error('Index did not load successfully');
  await page.waitForFunction(() => typeof window.__startGame === 'function', null, { timeout: 15000 });
  const boot = await page.evaluate(() => ({
    startType: typeof window.__startGame,
    canvasCount: document.querySelectorAll('canvas').length,
    bootError: window.__bootError || null,
    threeRevision: window.THREE?.REVISION || null
  }));
  console.log('BOOT:', JSON.stringify(boot));

  await page.evaluate(() => window.__startGame());
  await page.waitForTimeout(1200);
  const game = await page.evaluate(() => ({
    hudActive: document.getElementById('hud')?.classList.contains('active'),
    startHidden: document.getElementById('startScreen')?.classList.contains('hidden'),
    canvasCount: document.querySelectorAll('#gameCanvas').length,
    bootError: window.__bootError || null,
    lowerChapterExists: !!window.__gameDebug?.lowerChapter
  }));
  console.log('GAME:', JSON.stringify(game));

  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/browser-smoke.png', fullPage: true });
  if (!game.hudActive || !game.startHidden || game.canvasCount !== 1) {
    throw new Error('Start-game transition did not activate the game HUD');
  }
  if (errors.length || badResponses.length) {
    throw new Error('Browser reported errors or failed resources');
  }
  console.log('PASS: Chromium loaded the game module and started the game.');
} catch (error) {
  console.error('BROWSER SMOKE TEST FAILED:', error);
  console.error('BROWSER ERRORS:', JSON.stringify(errors, null, 2));
  console.error('BAD RESPONSES:', JSON.stringify(badResponses, null, 2));
  if (browser) {
    try {
      const pages = browser.contexts().flatMap(context => context.pages());
      if (pages[0]) {
        await mkdir('artifacts', { recursive: true });
        await pages[0].screenshot({ path: 'artifacts/browser-smoke.png', fullPage: true });
        console.error('BOOT ERROR:', await pages[0].evaluate(() => window.__bootError || null).catch(() => null));
      }
    } catch {}
  }
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
