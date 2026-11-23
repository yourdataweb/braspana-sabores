# Braspaña Sabores

Bilingual static website for **Braspaña Sabores**, a Brazilian café, bakery and food store in Vilanova i la Geltrú (Barcelona).

**Live:** https://yourdataweb.github.io/braspana-sabores/
**English:** https://yourdataweb.github.io/braspana-sabores/en/

---

## Project identity

| Field | Value |
|---|---|
| Code name | `braspana-sabores` |
| DNS label | `braspana-sabores` (RFC 1123, 16 chars) |
| Repository | `braspana-sabores` |
| S3 prefix | `braspana-sabores/` |

Derived from the business name `BRASPAÑA SABORES ( Breston)`. The ñ is transliterated to `n` and the parenthetical dropped, so the string is pure ASCII lowercase with hyphens — safe as a subdomain, a GitHub repository, and an S3 prefix.

## Stack

Hand-written HTML, CSS and vanilla JS with a small dependency-free build. No framework, no runtime libraries.

```
src/template.html      one template with {{i18n}} holes
src/place.json         business data
src/i18n/{es,en}.json  strings per locale
scripts/build.mjs      emits index.html (es) + en/index.html (en)
scripts/make-icons.mjs generates og.png + apple-touch-icon.png
scripts/verify.mjs     headless assertions
```

### Build

```bash
node scripts/build.mjs
```

Emits both locales plus `sitemap.xml`, `manifest.webmanifest`, `robots.txt`. Fails non-zero if any `{{hole}}` or `<!--MARKER-->` survives into the output.

## Theme

The business is a `coffee_shop` (types: `coffee_shop`, `cafe`, `food_store`, `food`, `store`) serving Brazilian street food — so the design is a warm coffee house, not a generic template: roasted browns, cream paper, brass accents, with tropical green and açaí purple for the specialty cards. The hero artwork is a hand-drawn SVG of a counter with pastel, coxinha, caldo de cana, coffee and an açaí bowl. Six themed line icons match each specialty.

## Localization

- Spanish default at `/`
- English at `/en/`
- Each locale is **real server-rendered HTML** with its own `<html lang>`, canonical, `og:locale` and reciprocal `hreflang` — so both index independently, and the switch works with JS disabled
- Numbers and dates formatted per locale (`4,7` vs `4.7`)
- Address country is localized (`España` / `Spain`)

## Business rules implemented in the build

| Rule | Result |
|---|---|
| `rating > 4` → big star badge | 4.7 → shown |
| `user_rating_count > 50` → show count | 58 → shown |
| phone is a mobile → WhatsApp link | `+34 667…` is a Spanish mobile → shown |
| review rating ≥ 4 → testimonial | 5 eligible, 3 longest rendered |
| no pre-filled WhatsApp message | link is bare `https://wa.me/34667340175` |

Mobile detection is `+34` followed by 6 or 7. A landline would get a call link only, with the WhatsApp affordance removed from the DOM.

## Opening hours

Monday–Friday 06:00–21:30, Saturday 06:00–20:00, **Sunday closed**. The Sunday row renders as "Cerrado" / "Closed" (not a fake time range), and the live status line says "Hoy cerrado" when it is Sunday in Madrid.

## Accessibility

Skip link, single `h1` with sequential headings, visible focus rings, `aria-expanded`/`aria-controls` on the drawer, Escape closes it, `aria-label` on icon-only links with "opens in a new tab" announced, decorative SVGs `aria-hidden`, review text carries `lang="pt"` (its real language) with an "Original en portugués" note, `prefers-reduced-motion` respected, print stylesheet.

## SEO

Per-locale title/description, reciprocal `hreflang` in HTML and sitemap, canonical per locale, Open Graph + Twitter card with a generated 1200×630 image, `CafeOrCoffeeShop` structured data (address, geo, rating, hours, `sameAs`), `robots.txt`, `sitemap.xml`, web manifest.

## Social links

The Places payload contains **no social profiles** — only the Google Maps listing. The social bar is generic: add a URL under `social` in `src/place.json` and the icon appears.

```json
"social": {
  "google": "https://maps.google.com/?cid=…",
  "instagram": "https://instagram.com/…",
  "facebook": "https://facebook.com/…",
  "tiktok": "https://tiktok.com/@…"
}
```

Supported: `google`, `instagram`, `facebook`, `tiktok`, `tripadvisor`.

## Photos

`raw_photos` are Places API resource names, not URLs, and cannot be hotlinked without an API key. The site ships SVG artwork instead — fast, dependency-free and on-theme. To use the real photographs, fetch them with a Places API key, save into `assets/photos/`, and point the build at them.

## Deploy

Push to `main`. The workflow builds, gates on unresolved template holes, and deploys to Pages. First-time setup: **Settings → Pages → Source: GitHub Actions**.

Asset paths are relative, so it also works from a subpath or an S3 prefix unchanged.

## Credits

Business data from the Google Maps Places API. Review text and reviewer avatars belong to their authors and are shown as attributed testimonials. Map embed served by Google Maps.
