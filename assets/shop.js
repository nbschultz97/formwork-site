// Formwork shop — Silhouette Hoodie. No API keys live here: checkout is a Stripe Payment Link.
(() => {
'use strict';

// ===== OWNER SETTINGS ===========================================================================
// One Stripe Payment Link per size (Dashboard → Payment Links). Set each link's
// "After payment" → "Don't show confirmation page" → redirect to https://tryformwork.com/shop-thanks.html
// Alternatively use ONE link with a "Size" custom field: set STRIPE_PAYMENT_LINK_ANY and leave the per-size ones null.
const STRIPE_PAYMENT_LINKS = { S: null, M: null, L: null, XL: null, XXL: null };
const STRIPE_PAYMENT_LINK_ANY = null;
const PRICE = null;        // e.g. '$85' — null shows "Price to be announced"
const SHIP_WEEKS = null;   // e.g. '4–6' — null hides the pre-order line
const CONTACT_EMAIL = 'hello@tryformwork.com';
// ===============================================================================================

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];

// gallery
const main = $('#gMain'), cap = $('#gCap'), ths = $$('.thumbs .th');
ths.forEach((t, i) => t.addEventListener('click', () => {
  ths.forEach(x => { x.classList.toggle('on', x === t); x.setAttribute('aria-selected', x === t); });
  main.src = t.dataset.src; main.alt = t.dataset.alt;
  cap.innerHTML = `<span class="dim">0${i + 1} / 0${ths.length}</span><span>${t.dataset.cap}</span>`;
}));
// preload full images after first paint
addEventListener('load', () => ths.forEach(t => { const i = new Image(); i.src = t.dataset.src; }));

// price / ship note
if (PRICE) $('#price').textContent = PRICE;
if (SHIP_WEEKS) $('#buyBtn').insertAdjacentHTML('afterend', `<div class="preorder mono"><span class="dot"></span><span>Pre-order — ships in ${SHIP_WEEKS} weeks</span></div>`);

// checkout button
const btn = $('#buyBtn');
const size = () => ($('input[name=size]:checked') || {}).value || 'M';
const render = () => {
  const s = size(), link = STRIPE_PAYMENT_LINKS[s] || STRIPE_PAYMENT_LINK_ANY;
  if (link) {
    btn.textContent = `Pre-order · ${s}`;
    btn.href = link; btn.target = '_blank'; btn.rel = 'noopener';
  } else {
    btn.textContent = 'Join the waitlist';
    btn.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Waitlist — Silhouette Hoodie (${s})`)}&body=${encodeURIComponent(`Add me to the waitlist for the Silhouette Hoodie, size ${s}.`)}`;
    btn.removeAttribute('target');
  }
};
$$('input[name=size]').forEach(r => r.addEventListener('change', render));
render();
})();
