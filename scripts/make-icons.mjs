#!/usr/bin/env node
/**
 * Render assets/photos/og.png (1200×630) and apple-touch-icon.png (180×180)
 * for Braspaña Sabores.
 */
import { createRequire } from 'node:module';
const require = createRequire('/home/davidoc/.openclaw/workspace/');
const puppeteer = require('puppeteer');

import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PHOTOS = join(ROOT, 'assets', 'photos');

const hero = await readFile(join(PHOTOS, 'hero.svg'), 'utf8');
const heroData = `data:image/svg+xml;base64,${Buffer.from(hero).toString('base64')}`;

const fav = await readFile(join(PHOTOS, 'favicon.svg'), 'utf8');
const favData = `data:image/svg+xml;base64,${Buffer.from(fav).toString('base64')}`;

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();

/* ---------- OG 1200×630 ---------- */
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await page.setContent(`<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,900&family=Inter:wght@500;600&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1200px;height:630px;position:relative;overflow:hidden;background:#2a1810;
       font-family:Inter,system-ui,sans-serif}
  .bg{position:absolute;inset:0;background-image:url('${heroData}');
      background-size:cover;background-position:center 48%}
  .scrim{position:absolute;inset:0;
    background:linear-gradient(100deg,rgba(42,24,16,.96) 0%,rgba(42,24,16,.84) 44%,rgba(42,24,16,.28) 80%,rgba(42,24,16,.55) 100%)}
  .inner{position:relative;height:100%;display:flex;flex-direction:column;justify-content:center;padding:0 78px}
  .brand{display:flex;align-items:center;gap:15px;margin-bottom:30px}
  .brand img{width:50px;height:50px}
  .brand span{color:rgba(232,213,176,.78);font-size:15px;letter-spacing:.22em;text-transform:uppercase;font-weight:600}
  h1{font-family:Fraunces,Georgia,serif;font-weight:900;font-size:74px;line-height:1.03;
     letter-spacing:-.03em;color:#fff;max-width:13ch}
  .rule{width:76px;height:5px;background:#c8a15a;border-radius:3px;margin:28px 0 22px}
  p{color:rgba(255,255,255,.93);font-size:24px;line-height:1.45;max-width:23ch;font-weight:500}
  .bottom{position:absolute;left:78px;bottom:50px;display:flex;align-items:center;gap:16px;
          color:rgba(232,213,176,.82);font-size:16px;letter-spacing:.05em}
  .star{display:flex;align-items:center;gap:7px;color:#c8a15a;font-weight:700;font-size:21px}
  .dot{width:4px;height:4px;border-radius:50%;background:rgba(200,161,90,.55)}
</style></head><body>
  <div class="bg"></div><div class="scrim"></div>
  <div class="inner">
    <div class="brand"><img src="${favData}" alt=""><span>Pastelería brasileña · Vilanova i la Geltrú</span></div>
    <h1>Braspaña Sabores</h1>
    <div class="rule"></div>
    <p>Sabor de Brasil, hecho al momento</p>
  </div>
  <div class="bottom">
    <span class="star">★ 4,7</span>
    <span class="dot"></span>
    <span>58 reseñas</span>
    <span class="dot"></span>
    <span>Lun–Sáb · desde las 6:00</span>
  </div>
</body></html>`, { waitUntil: 'networkidle2' });

await new Promise((r) => setTimeout(r, 1400));
await page.screenshot({ path: join(PHOTOS, 'og.png'), type: 'png' });
console.log('og.png 1200x630');

/* ---------- touch icon 180×180 ---------- */
await page.setViewport({ width: 180, height: 180, deviceScaleFactor: 1 });
await page.setContent(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0}
  body{width:180px;height:180px}
  img{width:180px;height:180px;display:block}
</style></head><body><img src="${favData}" alt=""></body></html>`, { waitUntil: 'load' });

await new Promise((r) => setTimeout(r, 600));
await page.screenshot({ path: join(PHOTOS, 'apple-touch-icon.png'), type: 'png', omitBackground: true });
console.log('apple-touch-icon.png 180x180');

await browser.close();
