// Formwork shop — Field Series drop. No API keys live here: checkout is a Stripe Payment Link.
(() => {
'use strict';

// ===== OWNER SETTINGS ===========================================================================
// Per product (keyed by the section id / data-slug):
//   links: one Stripe Payment Link per size, or `any` for one link with a "Size" custom field.
//   Set each link's "After payment" redirect to https://tryformwork.com/shop-thanks.html
//   price: e.g. '$85' (null shows "Price to be announced")
//   shipWeeks: e.g. '4–6' (null hides the pre-order line)
const PRODUCTS = {
  tower1934:      { links: { S: null, M: null, L: null, XL: null, XXL: null }, any: null, price: null, shipWeeks: null },
  ironworker1930: { links: { S: null, M: null, L: null, XL: null, XXL: null }, any: null, price: null, shipWeeks: null },
  icarus1930:     { links: { S: null, M: null, L: null, XL: null, XXL: null }, any: null, price: null, shipWeeks: null },
};
const CONTACT_EMAIL = 'hello@tryformwork.com';
// ===============================================================================================

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];

$$('.product').forEach(sec => {
  const slug = sec.dataset.slug, name = sec.dataset.product, cfg = PRODUCTS[slug] || { links: {} };
  // gallery
  const main = $('.gmain', sec), cap = $('.gcap', sec), ths = $$('.th', sec);
  ths.forEach((t, i) => t.addEventListener('click', () => {
    ths.forEach(x => { x.classList.toggle('on', x === t); x.setAttribute('aria-selected', x === t); });
    main.src = t.dataset.src; main.alt = t.dataset.alt;
    cap.innerHTML = `<span class="dim">${String(i + 1).padStart(2, '0')} / ${String(ths.length).padStart(2, '0')}</span><span>${t.dataset.cap}</span>`;
  }));
  // price / ship note
  if (cfg.price) $('.price', sec).textContent = cfg.price;
  const btn = $('.buybtn', sec);
  if (cfg.shipWeeks) btn.insertAdjacentHTML('afterend', `<div class="preorder mono"><span class="dot"></span><span>Pre-order — ships in ${cfg.shipWeeks} weeks</span></div>`);
  // checkout button
  const size = () => ($(`input[name="size-${slug}"]:checked`, sec) || {}).value || 'M';
  const render = () => {
    const s = size(), link = (cfg.links || {})[s] || cfg.any;
    if (link) {
      btn.textContent = `Pre-order · ${s}`; btn.href = link; btn.target = '_blank'; btn.rel = 'noopener';
    } else {
      btn.textContent = 'Join the waitlist';
      btn.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Waitlist — ${name} (${s})`)}&body=${encodeURIComponent(`Add me to the waitlist for the ${name}, size ${s}.`)}`;
      btn.removeAttribute('target');
    }
  };
  $$(`input[name="size-${slug}"]`, sec).forEach(r => r.addEventListener('change', render));
  render();
});

// preload full gallery images once the page has loaded
addEventListener('load', () => setTimeout(() => $$('.th').forEach(t => { const i = new Image(); i.src = t.dataset.src; }), 1500));
})();
