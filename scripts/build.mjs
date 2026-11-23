#!/usr/bin/env node
/**
 * Static site build — Braspaña Sabores.
 *
 * Reads src/template.html + src/place.json + src/i18n/{es,en}.json and emits:
 *   /      → Spanish (default)
 *   /en/   → English
 *
 * No dependencies. Each locale is real server-rendered HTML.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC = join(ROOT, 'src');
const SITE = 'https://yourdataweb.github.io/braspana-sabores';

const read = (p) => readFile(p, 'utf8');
const readJSON = async (p) => JSON.parse(await read(p));

/* ---------- helpers ---------- */

const escapeHTML = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

function interpolate(tpl, dict, extra = {}) {
  const ctx = { ...dict, ...extra };
  return tpl
    .replace(/\{\{\{([\w.]+)\}\}\}/g, (m, path) => {
      const v = get(ctx, path);
      return v == null ? '' : String(v);
    })
    .replace(/\{\{([\w.]+)\}\}/g, (m, path) => {
      const v = get(ctx, path);
      return v == null ? '' : escapeHTML(v);
    });
}

const fill = (str, vars) => String(str).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

const MONTHS = {
  es: ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December']
};

const todayLabel = (locale) => {
  const d = new Date();
  return `${MONTHS[locale][d.getMonth()]} ${d.getFullYear()}`;
};

const formatRating = (n, locale) => locale === 'es' ? n.toFixed(1).replace('.', ',') : n.toFixed(1);
const formatCount = (n, locale) => new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-GB').format(n);

/* ---------- business rules ---------- */

const RATING_BADGE_MIN = 4;
const REVIEW_COUNT_MIN = 50;

function isMobile(e164) {
  if (!e164) return false;
  const d = e164.replace(/\D/g, '');
  if (d.startsWith('34')) return /^[67]\d{8}$/.test(d.slice(2));
  return d.length >= 9 && d.length <= 15;
}

const showRatingBadge = (p) => Number(p.rating) > RATING_BADGE_MIN;
const showRatingCount = (p) => Number(p.userRatingCount) > REVIEW_COUNT_MIN;
const showWhatsApp = (p) => isMobile(p.phoneE164) && Boolean(p.whatsappNumber);

/** wa.me link. No ?text= parameter unless a prefill is explicitly configured. */
function whatsappHref(place) {
  const base = `https://wa.me/${place.whatsappNumber}`;
  const prefill = (place.whatsappPrefill || '').trim();
  return prefill ? `${base}?text=${encodeURIComponent(prefill)}` : base;
}

const WA_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07s.89 2.4 1.02 2.56c.12.17 1.75 2.67 4.25 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z"/></svg>';

/* ---------- icon set (coffee shop / Brazilian bakery) ---------- */

const ICONS = {
  pastel: '<path d="M4 12c0-3.3 3.6-6 8-6s8 2.7 8 6-3.6 6-8 6-8-2.7-8-6Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7.5 10.5c2-1.2 7-1.2 9 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/><path d="M8 14.5h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>',
  coxinha: '<path d="M12 3.5c3 0 5.5 3 5.5 6.6 0 3.3-2.2 5.4-3.4 6.6-.8.8-1.4 1.8-2.1 1.8s-1.3-1-2.1-1.8c-1.2-1.2-3.4-3.3-3.4-6.6C6.5 6.5 9 3.5 12 3.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.5 8.5c0 1.6.5 2.6 1.4 3.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/>',
  cane: '<path d="M8 21V9a4 4 0 0 1 8 0v12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M8 12.5h8M8 16.5h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M10.5 5.5c.8-.6 2.2-.6 3 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/>',
  tapioca: '<circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7.5 12.5c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/><circle cx="9.5" cy="9.5" r=".9" fill="currentColor"/><circle cx="14" cy="9" r=".7" fill="currentColor"/>',
  acai: '<path d="M5 10h14l-1.6 8.2a2 2 0 0 1-2 1.8H8.6a2 2 0 0 1-2-1.8L5 10Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.5 10c0-2.5 1.5-4.5 3.5-4.5S15.5 7.5 15.5 10" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="10" cy="14" r="1" fill="currentColor"/><circle cx="14" cy="14.5" r="1" fill="currentColor"/>',
  coffee: '<path d="M5 9h11v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V9Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M16 10.5h1.6a2.4 2.4 0 0 1 0 4.8H16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M8 5.5c0 1-.8 1.3-.8 2.2M11.5 5.5c0 1-.8 1.3-.8 2.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  check: '<path d="m4 12.5 5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  cross: '<path d="m5 5 14 14M19 5 5 19" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'
};

/* ---------- partials ---------- */

function socialBar(social, dict, { variant = 'header' } = {}) {
  const SOCIAL_ICONS = {
    google: '<path fill="currentColor" d="M21.35 11.1H12v2.9h5.35c-.25 1.35-1.7 3.95-5.35 3.95A5.95 5.95 0 0 1 6 12a5.95 5.95 0 0 1 6-5.95c1.7 0 2.85.72 3.5 1.34l2.4-2.31C16.35 3.6 14.4 2.7 12 2.7A9.3 9.3 0 0 0 2.7 12 9.3 9.3 0 0 0 12 21.3c5.35 0 8.9-3.76 8.9-9.05 0-.6-.07-1.06-.15-1.15Z"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="17.2" cy="6.8" r="1.25" fill="currentColor"/>',
    facebook: '<path fill="currentColor" d="M14.5 8.5h2.2V5.6h-2.4c-2.5 0-3.9 1.5-3.9 4v1.9H8.2v3h2.2V21h3.1v-6.5h2.3l.4-3h-2.7V9.9c0-1 .3-1.4 1-1.4Z"/>',
    tiktok: '<path fill="currentColor" d="M16.6 3h-2.9v11.3a2.1 2.1 0 1 1-1.8-2.08V9.28a5.02 5.02 0 1 0 4.7 5.01V8.9a5.6 5.6 0 0 0 3.3 1.07V7.03A3.36 3.36 0 0 1 16.6 3Z"/>',
    tripadvisor: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="8.6" cy="12" r="2.1" fill="currentColor"/><circle cx="15.4" cy="12" r="2.1" fill="currentColor"/>'
  };
  const LABELS = { google: 'Google', instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', tripadvisor: 'Tripadvisor' };

  const entries = Object.entries(social)
    .filter(([k, v]) => !k.startsWith('_') && typeof v === 'string' && v.startsWith('http') && SOCIAL_ICONS[k]);

  if (!entries.length) return '';

  const links = entries.map(([k, url]) => `
        <a class="social-link" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer me"
           aria-label="${escapeHTML(LABELS[k])} (${escapeHTML(dict.a11y.newWindow)})">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">${SOCIAL_ICONS[k]}</svg>
        </a>`).join('');

  return `
      <ul class="social-bar social-bar--${variant}" aria-label="${escapeHTML(dict.a11y.socialNav)}">${links}
      </ul>`;
}

function langSwitch(dict, linkEs, linkEn, { variant = 'header' } = {}) {
  const isEs = dict.locale === 'es';
  return `
      <div class="lang-switch lang-switch--${variant}" role="group" aria-label="${escapeHTML(dict.a11y.langSwitch)}">
        <a href="${escapeHTML(linkEs)}" class="lang-opt${isEs ? ' is-active' : ''}" lang="es" hreflang="es"
           aria-label="${escapeHTML(dict.langSwitch.esAria)}"${isEs ? ' aria-current="true"' : ''}>${dict.langSwitch.es}</a>
        <span class="lang-sep" aria-hidden="true">/</span>
        <a href="${escapeHTML(linkEn)}" class="lang-opt${!isEs ? ' is-active' : ''}" lang="en" hreflang="en"
           aria-label="${escapeHTML(dict.langSwitch.enAria)}"${!isEs ? ' aria-current="true"' : ''}>${dict.langSwitch.en}</a>
      </div>`;
}

function buildSpecialties(place, dict) {
  if (!Array.isArray(place.specialties) || !place.specialties.length) return '';

  return place.specialties.map((s) => {
    const t = dict.specialties[s.key];
    if (!t) return '';
    const icon = ICONS[s.icon] || ICONS.coffee;
    return `
        <li class="specialty">
          <span class="specialty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="30" height="30" focusable="false">${icon}</svg>
          </span>
          <h3>${escapeHTML(t.title)}</h3>
          <p>${escapeHTML(t.text)}</p>
        </li>`;
  }).join('');
}

function buildCapabilities(place, dict) {
  const order = ['serviceOptions', 'foodAndDrink', 'parking', 'accessibility', 'payments'];
  const label = (k) => dict.capabilities.labels[k] || k;

  const groups = order
    .map((key) => [key, place.features?.[key] || []])
    .filter(([, list]) => list.some((x) => x.value !== null && x.value !== undefined));

  if (!groups.length) return '';

  const body = groups.map(([key, list]) => {
    const items = list.filter((x) => x.value !== null && x.value !== undefined)
      .map((x) => `<li class="cap ${x.value ? 'is-yes' : 'is-no'}">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="cap-icon">${x.value ? ICONS.check : ICONS.cross}</svg>
            <span>${escapeHTML(label(x.key))}</span></li>`)
      .join('');
    return `
        <div class="cap-group">
          <h4>${escapeHTML(dict.capabilities[key])}</h4>
          <ul class="cap-list">${items}</ul>
        </div>`;
  }).join('');

  return `<div class="cap-inner">${body}\n      </div>`;
}

function buildReviews(place, dict) {
  const STAR = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="m12 2.6 2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.4l-5.8 3.06 1.1-6.46-4.69-4.58 6.49-.94L12 2.6Z"/></svg>';

  const positive = (place.reviews || [])
    .filter((r) => Number(r.rating) >= 4 && r.text && r.text.trim().length > 15)
    .sort((a, b) => b.text.length - a.text.length)
    .slice(0, 3);

  if (!positive.length) return '';

  return positive.map((r) => {
    const stars = Array.from({ length: 5 }, (_, i) =>
      `<span class="${i < Math.round(r.rating) ? '' : 'is-empty'}">${STAR}</span>`).join('');

    const initial = escapeHTML((r.author || '?').charAt(0));
    const avatar = r.avatar
      ? `<img src="${escapeHTML(r.avatar)}" alt="" width="44" height="44" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">`
      : '';
    const time = typeof r.relativeTime === 'object' ? r.relativeTime[dict.locale] : r.relativeTime;

    // The source review may be in Portuguese; say so rather than pretend it's native.
    const langNote = r.lang && r.lang !== dict.locale
      ? `<span class="review-lang">${escapeHTML(fill(dict.reviews.originalIn, { lang: dict.languageNames[r.lang] || r.lang }))}</span>`
      : '';

    return `
        <li class="review">
          <span class="review-stars" aria-label="${r.rating} / 5">${stars}</span>
          <blockquote>
            <p lang="${escapeHTML(r.lang || dict.locale)}">${escapeHTML(r.text)}</p>
            ${langNote}
          </blockquote>
          <footer>
            <span class="review-avatar">
              <span class="review-avatar-fallback" aria-hidden="true">${initial}</span>${avatar}
            </span>
            <span class="review-meta">
              <strong>${escapeHTML(r.author)}</strong>
              <small>${escapeHTML(time || '')}</small>
            </span>
          </footer>
        </li>`;
  }).join('');
}

function buildHours(place, dict) {
  const periods = new Map((place.hours?.periods || []).map((p) => [p.day, p]));
  const closed = new Set(place.hours?.closedDays || []);

  return [1, 2, 3, 4, 5, 6, 0].map((day) => {
    const p = periods.get(day);
    const dayName = dict.days[String(day)];
    const time = p
      ? `${escapeHTML(p.open)} – ${escapeHTML(p.close)}`
      : escapeHTML(dict.visit.closed);
    const cls = p ? '' : ' is-closed';
    return `
            <li data-day="${day}" class="${cls.trim()}">
              <span class="hours-day">${escapeHTML(dayName)}</span>
              <span class="hours-time">${time}</span>
            </li>`;
  }).join('');
}

function buildJsonLd(place, dict, url) {
  const days = (place.hours?.periods || []).map((p) => [
    'Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'
  ][p.day]);

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CafeOrCoffeeShop',
    '@id': url,
    name: place.name,
    alternateName: place.fullName,
    url,
    image: `${SITE}/assets/photos/og.png`,
    description: dict.meta.description,
    address: {
      '@type': 'PostalAddress',
      addressLocality: place.locality,
      addressRegion: place.region,
      postalCode: place.postalCode,
      addressCountry: place.country
    },
    geo: { '@type': 'GeoCoordinates', latitude: place.latitude, longitude: place.longitude },
    telephone: place.phoneInternational,
    inLanguage: dict.htmlLang,
    priceRange: '€10–20',
    currenciesAccepted: 'EUR',
    paymentAccepted: 'Cash, Credit Card, Debit Card, Contactless',
    servesCuisine: dict.locale === 'es' ? 'Brasileña' : 'Brazilian',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: place.rating,
      reviewCount: place.userRatingCount,
      bestRating: 5,
      worstRating: 1
    },
    openingHoursSpecification: days.length ? [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: days,
      opens: place.hours.periods[0].open,
      closes: place.hours.periods[0].close
    }] : undefined,
    hasMap: place.map.placeUri,
    sameAs: Object.entries(place.social)
      .filter(([k, v]) => !k.startsWith('_') && typeof v === 'string' && v.startsWith('http'))
      .map(([, v]) => v)
  }, null, 2);
}

/* ---------- page ---------- */

function buildPage({ dict, place, template }) {
  const isEs = dict.locale === 'es';

  const url = `${SITE}/${dict.pathPrefix}`;
  const root = dict.pathPrefix ? '../' : './';

  const linkEs = isEs ? './' : '../';
  const linkEn = isEs ? 'en/' : './';

  const wa = showWhatsApp(place);
  const ratingBadge = showRatingBadge(place);
  const ratingCount = showRatingCount(place);

  const statusFallback = isEs
    ? 'Abierto de lunes a sábado · desde las 6:00'
    : 'Open Monday to Saturday · from 6:00';

  const missing = [];
  if (!place.locality) missing.push('place.locality');
  if (!place.phoneE164) missing.push('place.phoneE164');
  if (!place.map?.embedUrl) missing.push('map.embedUrl');

  const replacements = {
    '<!--SOCIAL-->': socialBar(place.social, dict, { variant: 'header' }),
    '<!--SOCIAL_MOBILE-->': socialBar(place.social, dict, { variant: 'mobile' }),
    '<!--LANG-->': langSwitch(dict, linkEs, linkEn, { variant: 'header' }),
    '<!--LANG_MOBILE-->': langSwitch(dict, linkEs, linkEn, { variant: 'mobile' }),

    '<!--WHATSAPP_HERO-->': wa
      ? `<a class="btn btn-ghost" href="${whatsappHref(place)}" target="_blank" rel="noopener noreferrer">${WA_ICON}${escapeHTML(dict.hero.ctaWhatsapp)}<span class="sr-only"> (${escapeHTML(dict.a11y.newWindow)})</span></a>`
      : '',

    '<!--WHATSAPP_CONTACT-->': wa
      ? `<a class="contact-btn" href="${whatsappHref(place)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHTML(dict.a11y.waAria)}">
            <span class="contact-icon" aria-hidden="true">${WA_ICON}</span>
            <span class="contact-text"><strong>${escapeHTML(dict.visit.whatsapp)}</strong><small>${escapeHTML(place.phoneNational)}</small></span>
          </a>`
      : '',

    '<!--WHATSAPP_FAB-->': wa
      ? `<a class="wa-fab" href="${whatsappHref(place)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHTML(dict.a11y.waAria)}">${WA_ICON.replace('width="20" height="20"', 'width="30" height="30"')}</a>`
      : '',

    '<!--RATING_COUNT_STAT-->': ratingCount
      ? `<li>
          <span class="stat-value">${formatCount(place.userRatingCount, dict.locale)}</span>
          <span class="stat-label">${escapeHTML(dict.hero.statReviews)}</span>
        </li>`
      : '',

    '<!--RATING_BADGE-->': ratingBadge
      ? `<div class="rating-badge" role="img" aria-label="${escapeHTML(fill(dict.a11y.ratingAria, {
          rating: formatRating(place.rating, dict.locale),
          count: formatCount(place.userRatingCount, dict.locale)
        }))}">
          <span class="rating-star" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="56" height="56" focusable="false"><path fill="currentColor" d="m12 2.6 2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.4l-5.8 3.06 1.1-6.46-4.69-4.58 6.49-.94L12 2.6Z"/></svg>
          </span>
          <span class="rating-body">
            <span class="rating-value">${formatRating(place.rating, dict.locale)}</span>
            <span class="rating-meta"><span>${ratingCount ? escapeHTML(fill(dict.reviews.count, { count: formatCount(place.userRatingCount, dict.locale) })) : ''}</span> ${escapeHTML(dict.reviews.onGoogle)}</span>
          </span>
        </div>`
      : '',

    '<!--SPECIALTIES-->': buildSpecialties(place, dict),
    '<!--CAPABILITIES-->': buildCapabilities(place, dict),
    '<!--REVIEWS-->': buildReviews(place, dict),
    '<!--HOURS-->': buildHours(place, dict)
  };

  let html = template;
  for (const [marker, value] of Object.entries(replacements)) {
    html = html.split(marker).join(value);
  }

  const extra = {
    htmlLang: dict.htmlLang,
    dir: dict.dir,
    url,
    altEsUrl: `${SITE}/`,
    altEnUrl: `${SITE}/en/`,
    root,
    ogLocale: dict.ogLocale,
    ogLocaleAlternate: dict.ogLocaleAlternate,
    jsonLd: buildJsonLd(place, dict, url),
    statusFallback,
    countryName: (dict.place && dict.place.country) || 'Spain',
    year: new Date().getFullYear(),
    footerCredit: fill(dict.footer.dataNote, { date: todayLabel(dict.locale) }),
    place: {
      ...place,
      ratingFormatted: formatRating(place.rating, dict.locale),
      priceRangeLabel: `€${place.priceRange.start}–${place.priceRange.end}`
    },
    map: place.map
  };

  html = interpolate(html, dict, extra);
  html = html.replace(/^[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');

  return { html, missing };
}

/* ---------- assets ---------- */

function buildSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${SITE}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="es" href="${SITE}/"/>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}/en/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/"/>
  </url>
  <url>
    <loc>${SITE}/en/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
    <xhtml:link rel="alternate" hreflang="es" href="${SITE}/"/>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}/en/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/"/>
  </url>
</urlset>
`;
}

/* ---------- main ---------- */

async function main() {
  const template = await read(join(SRC, 'template.html'));
  const raw = await readJSON(join(SRC, 'place.json'));
  const es = await readJSON(join(SRC, 'i18n', 'es.json'));
  const en = await readJSON(join(SRC, 'i18n', 'en.json'));

  const merged = {
    ...raw.place,
    map: raw.map || {},
    social: raw.social || {},
    hours: raw.hours || { periods: [], closedDays: [] },
    reviews: raw.reviews || [],
    features: raw.features || {},
    specialties: raw.specialties || []
  };

  const esRes = buildPage({ dict: es, place: merged, template });
  const enRes = buildPage({ dict: en, place: merged, template });

  await mkdir(join(ROOT, 'en'), { recursive: true });
  await writeFile(join(ROOT, 'index.html'), esRes.html, 'utf8');
  await writeFile(join(ROOT, 'en', 'index.html'), enRes.html, 'utf8');
  await writeFile(join(ROOT, 'sitemap.xml'), buildSitemap(), 'utf8');
  await writeFile(join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`, 'utf8');
  await writeFile(join(ROOT, 'manifest.webmanifest'), JSON.stringify({
    name: merged.fullName,
    short_name: 'Braspaña',
    description: en.meta.description,
    start_url: './',
    scope: './',
    display: 'standalone',
    background_color: '#faf6ef',
    theme_color: '#2a1810',
    lang: 'es',
    icons: [
      { src: 'assets/photos/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: 'assets/photos/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  }, null, 2) + '\n', 'utf8');

  console.log('Built:');
  console.log(`  index.html       (es, ${esRes.html.length} bytes)`);
  console.log(`  en/index.html    (en, ${enRes.html.length} bytes)`);
  console.log('  sitemap.xml, manifest.webmanifest, robots.txt');

  let failed = false;
  for (const [name, res] of [['es', esRes], ['en', enRes]]) {
    const holes = res.html.match(/\{\{[^}]+\}\}/g);
    const markers = res.html.match(/<!--(SOCIAL|LANG|WHATSAPP_\w+|RATING_\w+|SPECIALTIES|CAPABILITIES|REVIEWS|HOURS)\w*-->/g);
    if (holes) { console.error(`  ✗ ${name}: unresolved holes ${[...new Set(holes)].join(', ')}`); failed = true; }
    if (markers) { console.error(`  ✗ ${name}: unresolved markers ${[...new Set(markers)].join(', ')}`); failed = true; }
  }
  if (failed) process.exit(1);
  console.log('  ✓ no unresolved holes or markers');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
