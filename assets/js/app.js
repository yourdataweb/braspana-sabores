/* ==========================================================================
   Braspaña Sabores — behaviour only.
   All content is server-rendered per locale; nothing here is needed to read
   the page.
   ========================================================================== */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- opening hours (mirrors src/place.json) ---------- */
  const HOURS = new Map([
    [1, { open: '06:00', close: '21:30' }],
    [2, { open: '06:00', close: '21:30' }],
    [3, { open: '06:00', close: '21:30' }],
    [4, { open: '06:00', close: '21:30' }],
    [5, { open: '06:00', close: '21:30' }],
    [6, { open: '06:00', close: '20:00' }]
  ]);
  const TIME_ZONE = 'Europe/Madrid';

  /* ---------- header ---------- */
  function initHeader() {
    const header = $('.site-header');
    const toggle = $('.nav-toggle');
    const drawer = $('#mobile-nav');
    if (!header) return;

    const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    if (!toggle || !drawer) return;

    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      const labelOpen = toggle.dataset.labelOpen || 'Abrir menú';
      const labelClose = toggle.dataset.labelClose || 'Cerrar menú';
      toggle.setAttribute('aria-label', open ? labelClose : labelOpen);
      drawer.hidden = !open;
    };

    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    drawer.addEventListener('click', (e) => {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    const mq = window.matchMedia('(min-width: 781px)');
    const onChange = (e) => { if (e.matches) setOpen(false); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
  }

  /* ---------- local time in Madrid ---------- */
  function localNow() {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: TIME_ZONE,
        hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false
      }).formatToParts(new Date());
      const get = (t) => parts.find((p) => p.type === t)?.value;
      const idx = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return { day: idx[get('weekday')] ?? new Date().getDay(), minutes: Number(get('hour')) * 60 + Number(get('minute')) };
    } catch {
      const d = new Date();
      return { day: d.getDay(), minutes: d.getHours() * 60 + d.getMinutes() };
    }
  }

  const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };

  /* ---------- live open/closed ---------- */
  function initStatus() {
    const el = $('#open-status');
    const dot = $('#status-dot');
    if (!el) return;

    const { day, minutes } = localNow();
    const today = HOURS.get(day);

    const openTpl = el.dataset.openTemplate || 'Abierto ahora · hasta las {close}';
    const closedTpl = el.dataset.closedTemplate || 'Cerrado · abre {open}';
    const closedTodayTpl = el.dataset.closedToday || 'Hoy cerrado';

    let isOpen = false;
    let nextOpen = null;

    if (today) {
      const openM = toMinutes(today.open);
      const closeM = toMinutes(today.close);
      isOpen = minutes >= openM && minutes < closeM;
      if (!isOpen && minutes < openM) nextOpen = today.open;
    }

    // still open past midnight? these hours are same-day, so no.
    el.textContent = isOpen
      ? openTpl.replace('{close}', today.close)
      : today
        ? closedTpl.replace('{open}', nextOpen || today.open)
        : closedTodayTpl;

    if (dot && !isOpen) dot.classList.add('is-closed');

    // find the next opening day for the "closed" message
    const row = $(`#hours-list li[data-day="${day}"]`);
    if (row) {
      row.classList.add('is-today');
      const dayCell = $('.hours-day', row);
      if (dayCell && !dayCell.dataset.suffix) {
        const badge = document.createElement('span');
        badge.className = 'hours-today';
        badge.textContent = el.dataset.todayLabel || 'Hoy';
        dayCell.appendChild(badge);
        dayCell.dataset.suffix = '1';
      }
    }
  }

  /* ---------- misc ---------- */
  function initMisc() {
    const y = $('#year');
    if (y) y.textContent = String(new Date().getFullYear());

    $$('a[target="_blank"]').forEach((a) => {
      if (!a.getAttribute('rel')?.includes('noopener')) {
        a.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }

  function boot() {
    initHeader();
    initStatus();
    initMisc();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
