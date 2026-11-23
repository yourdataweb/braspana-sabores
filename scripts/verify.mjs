import { createRequire } from 'node:module';
const require = createRequire('/home/davidoc/.openclaw/workspace/');
const puppeteer = require('puppeteer');
const fs = require('node:fs');

const BASE = process.env.BASE || 'http://127.0.0.1:8098/';
const SHOTS = process.env.SHOTS || '/tmp/braspana';
fs.mkdirSync(SHOTS, { recursive: true });

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
page.on('requestfailed', (r) => {
  const u = r.url();
  if (!/fonts\.g|googleusercontent|maps\.g|gstatic/.test(u)) errors.push('REQFAIL: ' + u + ' — ' + r.failure()?.errorText);
});

async function inspect(url, label) {
  await page.setViewport({ width: 1440, height: 960 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 40000 });
  await new Promise((r) => setTimeout(r, 900));

  const d = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const qa = (s) => [...document.querySelectorAll(s)];
    return {
      htmlLang: document.documentElement.lang,
      title: document.title,
      desc: q('meta[name="description"]')?.content?.slice(0, 70),
      h1: q('#hero-title')?.innerText?.replace(/\s+/g, ' ').trim(),
      nav: qa('.nav a').map((a) => a.textContent.trim()),
      langOpts: qa('.header-tools .lang-switch .lang-opt').map((a) => `${a.textContent.trim()}${a.classList.contains('is-active') ? '*' : ''}→${a.getAttribute('href')}`),
      social: qa('.social-bar .social-link').map((a) => a.getAttribute('aria-label')),
      specialties: qa('.specialty').length,
      specialtyTitles: qa('.specialty h3').map((h) => h.textContent.trim()),
      reviews: qa('#review-grid .review').length,
      reviewLangs: [...new Set(qa('#review-grid .review-lang').map((e) => e.textContent.trim()))],
      reviewHasLangAttr: qa('#review-grid blockquote p').map((p) => p.lang),
      ratingBadge: !!q('.rating-badge'),
      ratingValue: q('.rating-value')?.textContent?.trim(),
      reviewCount: q('.rating-meta span')?.textContent?.trim(),
      waLinks: qa('a[href*="wa.me"]').length,
      waHref: q('a[href*="wa.me"]')?.href,
      waHasText: (q('a[href*="wa.me"]')?.href || '').includes('?text='),
      tel: [...new Set(qa('a[href^="tel:"]').map((a) => a.getAttribute('href')))],
      hours: qa('#hours-list li').map((li) => li.textContent.replace(/\s+/g, ' ').trim()),
      closedRow: q('#hours-list li.is-closed')?.textContent?.replace(/\s+/g, ' ').trim(),
      todayRow: q('#hours-list li.is-today')?.dataset?.day,
      status: q('#open-status')?.textContent?.trim(),
      caps: qa('.cap').length,
      capHeads: qa('.cap-group h4').map((h) => h.textContent.trim()),
      canonical: q('link[rel="canonical"]')?.href,
      hreflang: qa('link[rel="alternate"][hreflang]').map((l) => l.hreflang),
      ogLocale: q('meta[property="og:locale"]')?.content,
      mapSrc: (q('#map-frame')?.src || '').includes('output=embed'),
      jsonld: (() => { try { const j = JSON.parse(q('script[type="application/ld+json"]').textContent); return { type: j['@type'], name: j.name, alt: j.alternateName, rating: j.aggregateRating?.ratingValue, count: j.aggregateRating?.reviewCount, lang: j.inLanguage, sameAs: j.sameAs?.length, hours: j.openingHoursSpecification?.[0]?.dayOfWeek?.length }; } catch (e) { return 'INVALID: ' + e.message; } })(),
      skip: q('.skip')?.textContent?.trim(),
      headings: qa('h1,h2,h3').map((h) => h.tagName).join(','),
      imgs: qa('img').map((i) => ({ alt: i.alt, ok: i.naturalWidth > 0 })),
      overflow: document.documentElement.scrollWidth - window.innerWidth
    };
  });

  console.log(`\n===== ${label} =====`);
  console.log(JSON.stringify(d, null, 2));
  return d;
}

const es = await inspect(BASE, 'ES /');
const en = await inspect(BASE + 'en/', 'EN /en/');

/* ---- screenshots ---- */
for (const [name, url] of [['es', BASE], ['en', BASE + 'en/']]) {
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(url, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: `${SHOTS}/${name}-desktop.png`, fullPage: true });

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: `${SHOTS}/${name}-mobile.png`, fullPage: true });
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(`\n${name} mobile overflow: ${ov > 1 ? '❌ ' + ov + 'px' : '✓ none'}`);
}

/* ---- language switching ---- */
await page.setViewport({ width: 1440, height: 900 });
await page.goto(BASE, { waitUntil: 'networkidle2' });
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }), page.click('.header-tools .lang-switch .lang-opt[lang="en"]')]);
console.log('\nES→EN:', page.url(), '| lang:', await page.evaluate(() => document.documentElement.lang));
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }), page.click('.header-tools .lang-switch .lang-opt[lang="es"]')]);
console.log('EN→ES:', page.url(), '| lang:', await page.evaluate(() => document.documentElement.lang));

/* ---- drawer ---- */
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: 'networkidle2' });
await page.click('.nav-toggle');
await new Promise((r) => setTimeout(r, 350));
console.log('drawer open:', JSON.stringify(await page.evaluate(() => ({
  expanded: document.querySelector('.nav-toggle').getAttribute('aria-expanded'),
  hidden: document.querySelector('#mobile-nav').hidden,
  label: document.querySelector('.nav-toggle').getAttribute('aria-label'),
  social: document.querySelectorAll('.social-bar--mobile .social-link').length,
  lang: document.querySelectorAll('.lang-switch--mobile .lang-opt').length
}))));
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 300));
console.log('escape closes:', await page.evaluate(() => document.querySelector('#mobile-nav').hidden));
console.log('label restored:', await page.evaluate(() => document.querySelector('.nav-toggle').getAttribute('aria-label')));

/* ---- breakpoints ---- */
console.log('\n--- overflow sweep ---');
for (const w of [360, 390, 480, 768, 1024, 1280, 1920]) {
  await page.setViewport({ width: w, height: 900 });
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 350));
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(`  ${String(w).padStart(5)}px  ${ov > 1 ? '❌ ' + ov : '✓'}`);
}

console.log('\nERRORS:', errors.length ? JSON.stringify([...new Set(errors)], null, 2) : 'none');
await browser.close();
