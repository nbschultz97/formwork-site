// Formwork site — shared script for every page. All motion is driven by real material from one
// 133-sheet university lab TI bid set (walls, ducts, sheet thumbnails, RFI crops).
// No libraries: requestAnimationFrame + IntersectionObserver + scroll progress. Every block is guarded,
// so a page only runs what it contains.
(() => {
'use strict';

// ---- config ----------------------------------------------------------------------------------
// Local preview (localhost / 127.0.0.1 / file://) keeps the mailto fallback; deployed builds use the
// Cloudflare Pages Functions in /functions (R2 bucket "formwork-bids").
const IS_LOCAL = ['localhost', '127.0.0.1', '', '[::1]'].includes(location.hostname);
const SUBMIT_ENDPOINT = null; /* static hosting: email fallback until upload backend is live */     // functions/api/bid.ts
const UPLOAD_ENDPOINT = '/api/upload';                     // functions/api/upload.ts (chunked multipart → R2)
const CHUNK = 10 * 1024 * 1024;                            // 10 MB parts: R2 multipart min is 5 MB, Pages body limit 100 MB
// ===== OWNER SETTINGS: change these here; nothing else in the site needs editing ==============
// TODO(owner): CONTACT_EMAIL is used for every mailto (intake fallback, book-a-call, upload errors).
//              Swap it for a formwork address once one exists (also update the one <noscript> line in index.html).
const CONTACT_EMAIL = 'noah@ceradonsystems.com';
// TODO(owner): Cal.com (or similar) booking URL, e.g. 'https://cal.com/formwork/15min'. null = static placeholder + mailto.
const CAL_URL = null;
// TODO(owner): social links live in each page's footer (<div class="socials">, href="#" placeholders).
// ==============================================================================================

// ---- helpers ---------------------------------------------------------------------------------
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const sub = (p, a, b) => c01((p - a) / (b - a));
const eo = t => 1 - Math.pow(1 - c01(t), 3);
const eio = t => { t = c01(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const lerp = (a, b, t) => a + (b - a) * t;
const fmt = n => Math.round(n).toLocaleString('en-US');
const DPR = () => Math.min(window.devicePixelRatio || 1, 2);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const loadImg = src => new Promise(r => { const i = new Image(); i.decoding = 'async'; i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
const once = fn => { let v; return () => v || (v = fn()); };

$$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

// ---- FX: flash + slam ------------------------------------------------------------------------
const flashEl = $('#flash'); let lastFlash = 0;
const flash = () => {
  if (RM || !flashEl) return; const n = performance.now(); if (n - lastFlash < 220) return; lastFlash = n;
  flashEl.classList.remove('go'); void flashEl.offsetWidth; flashEl.classList.add('go');
};
const slam = el => { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); };
if (RM) $$('.slam').forEach(el => el.classList.add('hit'));
else {
  $$('.slam.now').forEach(el => setTimeout(() => slam(el), 180));
  const sio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { slam(e.target); flash(); sio.unobserve(e.target); } }), { threshold: .35 });
  $$('.slam').forEach(el => { if (!el.classList.contains('now') && !el.closest('.beat')) sio.observe(el); });
}
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
$$('.reveal').forEach(el => io.observe(el));

// ticker
const track = $('#track');
if (track) {
  const items = ['<b>133</b> sheets read', '<b>2,678</b> LF partitions', '<b>60</b> openings', '<b>206</b> air devices', '<b>370</b> light fixtures', '<b>19,600</b> lbs duct', '<b>381</b> data jacks', '<b>11</b> panels', '<b>4</b> scope gaps flagged', 'priced in <b>CSI</b> format', 'watching <b>CO · UT · CA</b>', 'delivered <b>before the pre-bid</b>'];
  track.innerHTML = [...items, ...items].map(i => `<span>■ ${i}</span>`).join('');
}

// ---- data ------------------------------------------------------------------------------------
const DIVS = [['01', 'General conditions', 440895], ['02', 'Demolition', 168008], ['08', 'Openings', 779650], ['09', 'Finishes', 1049418], ['21', 'Fire suppression', 189050], ['22', 'Plumbing', 179875], ['23', 'HVAC', 1726850], ['26', 'Electrical', 894750], ['27', 'Communications', 421830]];
const RFIS = [['RFI-01', 'Alternate sheets G2.4.x — referenced, not issued'], ['RFI-02', 'Server room S103 — no suppression shown'], ['RFI-03', 'DWH-1 water heater — not on E7.0'], ['RFI-04', 'S103 room use — M0.2 vs FP2.1 conflict']];
const FEED = [['06:02', 'University lab TI', '133'], ['06:41', 'K-12 elementary', '212'], ['07:15', 'Interchange rebuild', '88'], ['08:03', 'Medical office bldg', '164'], ['08:30', 'Middle school mod', '97'], ['09:12', 'Data hall fit-out', '241'], ['09:47', 'K-12 modernization', '156'], ['10:20', 'Fire station', '71']];
const LEVEL = [['Plumbing fixtures', '+++++++'], ['Demolition', '++x++++'], ['Firestopping', '+x+++x+'], ['Sealants', '+++x+++'], ['Cleanup', '++++x++']];
const BIDTAB = [['6.92', 41], ['7.08', 18], ['7.21', 27], ['7.40', 12], ['7.66', 9]];
const SCORE = [['Scope fit', 86], ['Competition', 72], ['Margin history', 64], ['Schedule risk', 58], ['Capacity', 90]];
const DISC = [['GEN', 4], ['STRUCT', 1], ['ARCH', 44], ['FIRE', 2], ['PLUMB', 8], ['MECH', 22], ['ELEC', 27], ['TECH', 20], ['SEC', 5]];
const SHORT = { GEN: 'Gen', STRUCT: 'Str', ARCH: 'Arch', FIRE: 'Fire', PLUMB: 'Plmb', MECH: 'Mech', ELEC: 'Elec', TECH: 'Tech', SEC: 'Sec' };
const TRADES = ['General contractor', 'Sitework / civil', 'Concrete', 'Steel', 'Framing / drywall', 'Doors / hardware', 'Finishes', 'Fire protection', 'Plumbing', 'Mechanical', 'Electrical', 'Low voltage'];
const WANTS = [['gap', 'Gap Check', 'Free · scope gaps + RFIs'], ['package', 'Bid Package', 'Quantities · estimate · RFIs'], ['desk', 'Bid Desk', 'Every bid, monthly'], ['owner', 'Owner-side', 'Budget · GMP · draws']];

// ---- plan renderer (shared by hero loops, the sequence, and mini panels) ---------------------
// A = A2.1.2 walls/doors (1600w); M = M2.1A ducts/devices, pre-registered to the same grid.
const OFF = [-47, 38]; // M2.1A sheet image offset to register with A2.1.2
function makePlan(A, M) {
  const key = p => p[0] + p[1] * .4; // sweep order: top-left -> bottom-right
  const segs = l => l.map(s => ({ a: s.a, b: s.b, w: s.w || 0, k: Math.min(key(s.a), key(s.b)) })).sort((x, y) => x.k - y.k);
  const pts = l => l.map(p => ({ p, k: key(p) })).sort((x, y) => x.k - y.k);
  const walls = segs(A.walls), ducts = segs(M.ducts), doors = pts(A.doors), devs = pts(M.devices.map(d => d.p));
  const K = 1600 + 1423 * .4;
  const each = (list, p, spread, fn) => { const f = (K + spread) * p; for (const s of list) { const q = (f - s.k) / spread; if (q <= 0) break; fn(s, Math.min(1, q)); } };
  let ctx;
  const seg = (s, q) => { ctx.moveTo(s.a[0], s.a[1]); ctx.lineTo(s.a[0] + (s.b[0] - s.a[0]) * q, s.a[1] + (s.b[1] - s.a[1]) * q); };
  return (c, W, H, o) => {
    ctx = c; const fade = o.fade ?? 1, k = 1 / o.z;
    ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.translate(W / 2, H / 2); ctx.scale(o.z, o.z); ctx.translate(-o.cx, -o.cy);
    if (o.imgA && o.a > 0) { ctx.globalAlpha = o.a * fade; ctx.drawImage(o.imgA, 0, 0, 1600, 1423); }
    if (o.imgM && o.m > 0) { ctx.globalAlpha = o.m * fade; ctx.drawImage(o.imgM, OFF[0], OFF[1], 1600, 1423); }
    ctx.globalAlpha = fade;
    if (o.walls > 0) { ctx.strokeStyle = '#ff4f12'; ctx.lineCap = 'square'; ctx.lineWidth = (o.wl || 3) * k; ctx.beginPath(); each(walls, o.walls, 120, seg); ctx.stroke(); }
    if (o.doors > 0) {
      ctx.strokeStyle = 'rgba(242,240,234,.75)'; ctx.lineWidth = 1.5 * k; ctx.beginPath();
      each(doors, o.doors, 60, (d, q) => { ctx.moveTo(d.p[0] + 9 * q, d.p[1]); ctx.arc(d.p[0], d.p[1], 9 * q, 0, Math.PI * 2); }); ctx.stroke();
    }
    if (o.ducts > 0) { ctx.strokeStyle = '#4fd1ff'; ctx.lineCap = 'butt'; each(ducts, o.ducts, 160, (s, q) => { ctx.lineWidth = Math.max(2 * k, Math.min(9, s.w * .4)); ctx.beginPath(); seg(s, q); ctx.stroke(); }); }
    if (o.devs > 0) { ctx.fillStyle = '#4fd1ff'; each(devs, o.devs, 60, (d, q) => { const r = 5 * q; ctx.fillRect(d.p[0] - r, d.p[1] - r, r * 2, r * 2); }); }
    ctx.globalAlpha = 1; ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0);
  };
}
const fitCanvas = cv => { const d = DPR(), W = cv.clientWidth, H = cv.clientHeight; if (cv.width !== Math.round(W * d) || cv.height !== Math.round(H * d)) { cv.width = Math.round(W * d); cv.height = Math.round(H * d); } return { W, H, d }; };
const getPlan = once(() => Promise.all([
  fetch('assets/a212.json').then(r => r.json()), fetch('assets/m21a.json').then(r => r.json()),
  loadImg('assets/a212.webp'), loadImg('assets/m21a.webp'),
]).then(([A, M, imgA, imgM]) => ({ draw: makePlan(A, M), imgA, imgM })));
const getBoxes = once(() => fetch('assets/sheets/boxes.json').then(r => r.json()).catch(() => ({})));

// run a frame loop only while `el` is on screen and the tab is visible
function loopWhileVisible(el, frame, still) {
  if (RM) { frame(still); addEventListener('resize', () => frame(still)); return; }
  const t0 = performance.now(); let run = false, looping = false;
  const tick = now => { if (!run || document.hidden) { looping = false; return; } frame(now - t0); requestAnimationFrame(tick); };
  const kick = () => { if (!looping && run && !document.hidden) { looping = true; requestAnimationFrame(tick); } };
  new IntersectionObserver(([e]) => { run = e.isIntersecting; kick(); }).observe(el);
  document.addEventListener('visibilitychange', kick);
  frame(still);
}

// ---- hero backdrops: looping live takeoff (canvas[data-plan]) --------------------------------
$$('canvas[data-plan]').forEach(cv => getPlan().then(({ draw, imgA, imgM }) => {
  const ctx = cv.getContext('2d'), host = cv.parentElement, tEl = $('[data-hud-t]', host), lEl = $('[data-hud-layer]', host);
  const LOOP = 18000, P = { walls: [.02, .36], doors: [.20, .42], ducts: [.40, .72], devs: [.55, .78], out: [.90, 1] };
  const pr = (t, [a, b]) => eo((t - a) / (b - a));
  const focusX = +(cv.dataset.cx || 720);
  let lastLayer = '';
  loopWhileVisible(host, ms => {
    const { W, H, d } = fitCanvas(cv), t = (ms % LOOP) / LOOP;
    const z = Math.max(W / 1480, H / 1240) * (1 + .14 * t), mx = pr(t, P.ducts);
    draw(ctx, W, H, { dpr: d, z, cx: focusX + Math.sin(t * Math.PI * 2) * 40 + t * 60, cy: 700 - t * 50, fade: 1 - pr(t, P.out), imgA, imgM, a: .32 * (1 - .6 * mx), m: .26 * mx, walls: pr(t, P.walls), doors: pr(t, P.doors), ducts: mx, devs: pr(t, P.devs) });
    const sp = t < .38 ? t / .38 : t < .74 ? (t - .38) / .36 : -1; // scan line rides the active layer
    if (sp >= 0 && !RM) {
      const x = -40 + (W + 80) * eo(sp), c = t < .38 ? '255,79,18' : '79,209,255', g = ctx.createLinearGradient(x - 120, 0, x + 4, 0);
      g.addColorStop(0, `rgba(${c},0)`); g.addColorStop(1, `rgba(${c},.35)`);
      ctx.fillStyle = g; ctx.fillRect(x - 120, 0, 124, H); ctx.fillStyle = `rgba(${c},.9)`; ctx.fillRect(x, 0, 2, H);
    }
    if (tEl) tEl.textContent = 'T+' + ((ms % LOOP) / 1000).toFixed(2).padStart(5, '0');
    const layer = t < .4 ? 'A2.1.2 · Level 1 · Arch' : 'M2.1A · Level 1 · Mech';
    if (lEl && layer !== lastLayer) { lEl.textContent = layer; lastLayer = layer; }
  }, .86 * LOOP);
}));

// ---- scroll engine ---------------------------------------------------------------------------
const scrollies = [];
const onScroll = (el, render, layout) => scrollies.push({ el, render, layout, last: -1 });
let pending = false;
const update = force => {
  pending = false; const vh = innerHeight;
  for (const s of scrollies) {
    const r = s.el.getBoundingClientRect();
    if (!force && (r.bottom < -vh || r.top > vh * 2)) continue;
    const span = s.el.classList.contains('scrolly') ? r.height - vh : r.height + vh * .2; // sticky stages vs. plain sections
    const p = s.el.classList.contains('scrolly') ? c01(-r.top / Math.max(1, span)) : c01((vh * .7 - r.top) / Math.max(1, span));
    if (!force && Math.abs(p - s.last) < 1e-4) continue;
    s.last = p; s.render(p);
  }
};
addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(() => update(false)); } }, { passive: true });
addEventListener('resize', () => { scrollies.forEach(s => s.layout && s.layout()); update(true); });

// ---- the sequence (film beats, scrubbed by scroll) -------------------------------------------
if ($('#seq')) {
  const sec = $('#seq'), beats = $$('#seq .beat'), label = $('#seqLabel'), tEl = $('#seqT'), bar = $('#seqBar');
  const B = [[0, .13, 'New solicitation'], [.13, .26, 'The market'], [.26, .50, 'Quantities / arch'], [.50, .63, 'Cost / CSI'], [.63, .79, 'Scope gaps / 4 flagged'], [.79, .86, 'How we operate'], [.86, .92, 'How we operate'], [.92, 1.001, 'Ready']];
  const LINES = [['Project     ', 'University lab TI'], ['Location    ', 'Colorado Springs, CO'], ['Scope       ', '26,877 GSF / interior / all trades'], ['Package     ', '133 sheets'], ['Status      ', 'Ingesting']];
  const total = LINES.reduce((n, l) => n + l[0].length + l[1].length, 0);
  const typed = $('#typed'), tile = $('#flipTile'), flipNo = $('#flipNo');
  let lastN = -1, cur = -1, lastLp = 0, plan = null;
  const b1 = lp => {
    const n = Math.round(c01(lp / .7) * total);
    if (n !== lastN) {
      lastN = n; let left = n, html = '';
      LINES.forEach(([k, v], i) => {
        if (left <= 0) return; const s = (k + v).slice(0, left); left -= (k + v).length;
        html += `<div class="${left < 0 || i === 4 ? 'cur' : ''}"><span class="dim">${s.slice(0, k.length)}</span><span class="${i === 4 ? 'cyan' : ''}">${s.slice(k.length)}</span></div>`;
      });
      typed.innerHTML = html;
    }
    const i = Math.min(132, Math.floor(c01(lp / .95) * 133)), tw = tile.clientWidth, th = tile.clientHeight;
    tile.style.backgroundPosition = `${-(i % 12) * tw}px ${-Math.floor(i / 12) * th}px`;
    flipNo.textContent = `Sheet ${String(i + 1).padStart(3, '0')} / 133`;
  };
  const dlPct = $('#dlPct'), dlBar = $('#dlBar');
  const b2 = lp => { const v = 3 + 6 * lp; dlPct.textContent = v.toFixed(0) + '%'; dlBar.style.width = v + '%'; };
  const cv = $('#seqCanvas'), ctx = cv.getContext('2d'), counts = $$('#seq .counts b');
  const CT = [[0, .42], [.25, .48], [.5, .9], [.6, .95], [.82, 1], [.86, 1]];
  const b3 = lp => {
    counts.forEach((el, i) => { el.textContent = fmt(+el.dataset.c * eo(sub(lp, ...CT[i]))); });
    label.textContent = 'Formwork // ' + (lp < .5 ? 'Quantities / arch' : 'Quantities / mech');
    if (!plan) return;
    const { W, H, d } = fitCanvas(cv), mx = sub(lp, .45, .6);
    const z = Math.max(W / 1350, H / 1200) * (1.04 + .22 * eio(lp));
    plan.draw(ctx, W, H, { dpr: d, z, cx: 600 + 160 * eio(lp), cy: 690 - 40 * lp, imgA: plan.imgA, imgM: plan.imgM, a: .45 * (1 - .7 * mx), m: .4 * mx, walls: eo(sub(lp, 0, .42)), doors: eo(sub(lp, .25, .48)), ducts: eo(sub(lp, .5, .9)), devs: eo(sub(lp, .6, .95)), wl: 3.5 });
  };
  getPlan().then(p => { plan = p; if (cur === 2) b3(lastLp); });
  const rows = $('#rows'); rows.innerHTML = DIVS.map(([d, n]) => `<div class="r"><i>${d}</i><span>${n}</span><b>$0</b></div>`).join('');
  const rowEls = $$('#rows .r');
  const b4 = lp => rowEls.forEach((r, i) => { const q = sub(lp, i * .07, i * .07 + .22); r.classList.toggle('in', q > 0); r.lastChild.textContent = '$' + fmt(DIVS[i][2] * eo(q)); });
  const rf = $('#seqRfis'); rf.innerHTML = RFIS.map(([id, t]) => `<div class="rfi"><i>${id}</i><span>${t}</span></div>`).join('');
  const rfEls = $$('#seqRfis .rfi'), rfOn = rfEls.map(() => false);
  const b5 = lp => rfEls.forEach((r, i) => { const on = lp > .04 + i * .16; if (on !== rfOn[i]) { rfOn[i] = on; r.classList.toggle('in', on); if (on) flash(); } });
  const FN = [b1, b2, b3, b4, b5];
  onScroll(sec, p => {
    let i = B.findIndex(b => p >= b[0] && p < b[1]); if (i < 0) i = B.length - 1;
    if (i !== cur) {
      beats.forEach((b, j) => b.classList.toggle('on', j === i));
      if (cur !== -1 && !RM) { flash(); beats[i].querySelectorAll('.slam').forEach(slam); } else beats[i].querySelectorAll('.slam').forEach(el => el.classList.add('hit'));
      cur = i; label.textContent = 'Formwork // ' + B[i][2];
    }
    const lp = sub(p, B[i][0], B[i][1]); lastLp = lp;
    tEl.textContent = 'T+' + (p * 24).toFixed(2).padStart(5, '0');
    bar.style.transform = `scaleX(${p})`;
    FN[i] && FN[i](lp);
  }, () => { if (cur === 2) b3(lastLp); });
}

// ---- the 133-sheet wall ----------------------------------------------------------------------
if ($('#sheets')) {
  const sec = $('#sheets'), wall = $('#wall'), head = $('#sheets .head'), countEl = $('#wallCount'), state = $('#wallState'), bar = $('#wallBar');
  const R = 107 / 120, G = 3;
  const disc = []; DISC.forEach(([d, n], j) => { for (let m = 0; m < n; m++) disc.push({ d, j, m }); });
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const order = disc.map((_, i) => i); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const slotOf = []; order.forEach((tileIdx, slot) => { slotOf[tileIdx] = slot; });
  const tiles = disc.map(t => { const el = document.createElement('div'); el.className = 't ' + t.d; wall.appendChild(el); return el; });
  const labs = DISC.map(([d, n]) => { const el = document.createElement('div'); el.className = 'lab mono dim'; el.innerHTML = `<b>${n}</b>${SHORT[d]}`; wall.appendChild(el); return el; });
  let L = null;
  const layout = () => {
    const stage = wall.parentElement, hb = head.getBoundingClientRect().bottom - stage.getBoundingClientRect().top;
    const narrow = innerWidth < 700, labH = narrow ? 34 : 52;
    const W = wall.clientWidth, H = Math.max(160, stage.clientHeight - hb - 30 - (narrow ? 86 : 92) - labH);
    wall.style.height = H + 'px';
    let best = null;
    for (let c = 6; c <= 34; c++) { const rows = Math.ceil(133 / c), tw = Math.min((W - (c - 1) * G) / c, ((H - (rows - 1) * G) / rows) / R); if (!best || tw > best.tw) best = { c, tw }; }
    const { c, tw } = best, th = tw * R, ox = (W - (c * tw + (c - 1) * G)) / 2;
    const cg = Math.max(6, W * .018), colW = (W - 8 * cg) / 9;
    let e = null;
    for (let k = 1; k <= 8; k++) { const ew = (colW - (k - 1) * 2) / k, eh = ew * R, rows = Math.ceil(44 / k); if (rows * (eh + 2) <= H && (!e || ew > e.ew)) e = { k, ew, eh }; }
    if (!e) { const ew = (colW - 14) / 8; e = { k: 8, ew, eh: ew * R }; }
    L = { sc: e.ew / tw, start: [], end: [] };
    tiles.forEach((el, i) => {
      el.style.width = tw + 'px'; el.style.height = th + 'px';
      el.style.backgroundSize = `${12 * tw}px auto`; el.style.backgroundPosition = `${-(i % 12) * tw}px ${-Math.floor(i / 12) * th}px`;
      const s = slotOf[i]; L.start[i] = [ox + (s % c) * (tw + G), Math.floor(s / c) * (th + G)];
      const { j, m } = disc[i];
      L.end[i] = [j * (colW + cg) + (m % e.k) * (e.ew + 2), H - (Math.floor(m / e.k) + 1) * (e.eh + 2)];
    });
    labs.forEach((el, j) => { el.style.left = j * (colW + cg) + 'px'; });
  };
  let sorted = false;
  onScroll(sec, p => {
    if (!L) layout();
    const read = 133 * eo(sub(p, 0, .24));
    countEl.textContent = Math.round(read);
    tiles.forEach((el, i) => {
      const t0 = .3 + (disc[i].j / 8) * .22, tp = eio(sub(p, t0, t0 + .28));
      const [sx, sy] = L.start[i], [ex, ey] = L.end[i];
      el.style.transform = `translate(${lerp(sx, ex, tp).toFixed(1)}px,${lerp(sy, ey, tp).toFixed(1)}px) scale(${lerp(1, L.sc, tp).toFixed(4)})`;
      el.style.opacity = slotOf[i] < read ? 1 : .16;
    });
    const s = p > .86; if (s !== sorted) { sorted = s; wall.classList.toggle('sorted', s); if (s) flash(); }
    state.textContent = p < .26 ? 'Ingest' : p < .86 ? 'Sorting' : 'Sorted · 9 disciplines';
    bar.style.transform = `scaleX(${p})`;
  }, layout);
  document.fonts && document.fonts.ready.then(() => { layout(); update(true); });
}

// ---- scope gaps: zoom into the real sheets ---------------------------------------------------
if ($('#gaps')) {
  const sec = $('#gaps'), viewer = $('#viewer'), vin = $('#vIn'), img = $('#vImg'), svg = $('#vSvg'), flag = $('#vFlag'), vSheet = $('#vSheet'), vStep = $('#vStep'), bar = $('#gapBar');
  const S = [
    { img: 'g1', sheet: 'A2.1.2 / General notes', f: [420, 560], z: 1.7, box: null, flag: 'G2.4.x — referenced. Never issued.', d: 'The set points to sheets that were never issued.' },
    { img: 'g2', sheet: 'FP2.1 / Data-server S103', box: [340, 694, 119, 52], z: 3.2, flag: 'S103 — no suppression shown', d: 'The server room has no fire protection shown.' },
    { img: 'g3', sheet: 'P7.1 / DWH-1', box: [264, 432, 39, 24], z: 5, flag: 'DWH-1 · 6 kW · 208V/3Ø — no circuit', d: 'On the plumbing schedule. Not on the electrical one.' },
    { img: 'g2', sheet: 'M0.2 vs FP2.1 / S103', box: [381, 719, 38, 26], z: 5.5, flag: 'S103 — two sheets, two room uses', d: 'Mechanical and fire protection disagree on the room.' },
  ];
  S.forEach(s => loadImg(`assets/sheets/${s.img}.webp`));
  $('#gapCards').innerHTML = RFIS.map(([id, t], i) => `<div class="rfi"><i>${id}</i> <span>${t}</span><small>${S[i].d}</small></div>`).join('');
  const cards = $$('#gapCards .rfi');
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('fill', 'rgba(255,79,18,.14)'); rect.setAttribute('stroke', '#ff4f12'); svg.appendChild(rect);
  let step = -1, per = 0;
  onScroll(sec, p => {
    const i = Math.min(3, Math.floor(p * 4 * .9999)), lp = c01(p * 4 - i), s = S[i];
    if (i !== step) {
      if (step !== -1) flash();
      step = i; img.src = `assets/sheets/${s.img}.webp`; vSheet.textContent = s.sheet; vStep.textContent = `${i + 1} / 4`; flag.textContent = s.flag;
      cards.forEach((c, j) => c.classList.toggle('on', j === i));
      if (s.box) { const [x, y, w, h] = s.box; rect.setAttribute('x', x); rect.setAttribute('y', y); rect.setAttribute('width', w); rect.setAttribute('height', h); per = 2 * (w + h); rect.style.display = ''; rect.setAttribute('stroke-dasharray', per); }
      else rect.style.display = 'none';
    }
    const vw = viewer.clientWidth, vh = viewer.clientHeight, fit = Math.max(vw / 800, vh / 1422);
    const t = eio(sub(lp, .04, .55)), z = fit * lerp(1, s.z, t);
    const f = s.box ? [s.box[0] + s.box[2] / 2, s.box[1] + s.box[3] / 2] : s.f;
    const fx = lerp(400, f[0], t), fy = lerp(711, f[1], t);
    const tx = Math.min(0, Math.max(vw - 800 * z, vw / 2 - fx * z)), ty = Math.min(0, Math.max(vh - 1422 * z, vh / 2 - fy * z));
    vin.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${z.toFixed(4)})`;
    if (s.box) { rect.setAttribute('stroke-width', (2.5 / z).toFixed(3)); rect.setAttribute('stroke-dashoffset', (per * (1 - eo(sub(lp, .45, .65)))).toFixed(1)); rect.style.fillOpacity = sub(lp, .6, .7); }
    flag.classList.toggle('in', lp > .6);
    bar.style.transform = `scaleX(${p})`;
  });
}

// ---- onboarding timeline: line fills as you scroll -------------------------------------------
if ($('#timeline')) {
  const tl = $('#timeline'), fill = $('#tlFill'), steps = $$('#timeline .tstep');
  onScroll(tl, p => {
    fill.style.transform = `scaleY(${p})`;
    steps.forEach((s, i) => { const on = p >= (i / steps.length) * .92; if (on !== s.classList.contains('on')) { s.classList.toggle('on', on); if (on) flash(); } });
  });
}

// ---- mini live panels (.mini[data-mini]) -----------------------------------------------------
// types: feed · duct · walls · zoom:<crop> · scan:<crop> · lvl · bars · score · gmp
const MINI = {
  feed: () => `<div class="feed">${[...FEED, ...FEED].map((r, i) => `<div class="${i % 8 === 0 ? 'new' : ''}"><span>${r[0]} · ${r[1]}</span><em>${i % 8 === 0 ? 'New' : r[2] + ' sh'}</em></div>`).join('')}</div>`,
  lvl: () => `<div class="lvl"><span class="n h">Scope / sub</span>${'ABCDEFG'.split('').map(x => `<span class="h">${x}</span>`).join('')}` +
    LEVEL.map(([n, m]) => `<span class="n">${n}</span>` + m.split('').map(c => c === 'x' ? '<span class="x">EXCL</span>' : '<span>✓</span>').join('')).join('') +
    `<span class="n">Base bid ($M)</span>${[0, 1, 2, 3, 4, 5, 6].map(j => `<span class="lo${j === 1 ? ' hot' : ''}">${(6.8 + j * .13 + (j === 1 ? -.3 : 0)).toFixed(2)}</span>`).join('')}<span class="note">Low bid B excludes firestopping</span></div>`,
  bars: () => `<div class="bars">${BIDTAB.map(([b, w], i) => `<div><span>#${i + 1} $${b}M</span><i style="width:${(30 + (+b - 6.9) / (7.66 - 6.9) * 70).toFixed(0)}%;animation-delay:${i * .12}s"></i><b>${w}%</b></div>`).join('')}</div><small class="foot">Illustrative · public bid results</small>`,
  score: () => `<div class="bars score">${SCORE.map(([n, v], i) => `<div><span>${n}</span><i style="width:${v}%;animation-delay:${i * .12}s"></i><b>${v}</b></div>`).join('')}</div><div class="verdict"><b>78</b><span>Bid</span></div><small class="foot">Illustrative scoring</small>`,
  gmp: () => `<div class="pan"><img src="assets/sheets/o2.webp" alt="" loading="lazy" decoding="async" width="800" height="1422"><svg viewBox="0 0 800 1422" data-boxes="o2"></svg></div><div class="gmp">Contractor GMP<b>$7,400,000</b><div class="q">Is it?</div></div>`,
  zoom: (k) => `<div class="zoomer boxpulse" data-crop="${k}"><img src="assets/sheets/${k}.webp" alt="" loading="lazy" decoding="async" width="800" height="1422"><svg viewBox="0 0 800 1422" data-boxes="${k}"></svg></div>`,
  scan: (k) => `<div class="pan slow"><img src="assets/sheets/${k}.webp" alt="" loading="lazy" decoding="async" width="800" height="1422"></div><i class="scanbar"></i>`,
  duct: () => `<canvas data-mini-plan="duct"></canvas>`,
  walls: () => `<canvas data-mini-plan="walls"></canvas>`,
};
const pio = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('play', e.isIntersecting)), { threshold: .15 });
$$('.mini[data-mini]').forEach(m => {
  const [type, arg] = m.dataset.mini.split(':');
  m.setAttribute('aria-hidden', 'true');
  m.innerHTML = `<div class="ml"><span class="dot"></span>${esc(m.dataset.label || '')}</div>` + (MINI[type] ? MINI[type](arg) : '') + (m.dataset.chip ? `<div class="chip">${esc(m.dataset.chip)}</div>` : '');
  if (type === 'feed') m.classList.add('f');
  pio.observe(m);
});
// boxes from the real crops
if ($('[data-boxes]')) getBoxes().then(B => {
  $$('svg[data-boxes]').forEach(svg => {
    const bx = B[svg.dataset.boxes] || []; if (!bx.length) return;
    svg.innerHTML = bx.map(([x, y, w, h], i) => `<rect x="${x - 3}" y="${y - 3}" width="${w + 6}" height="${h + 6}" fill="rgba(255,79,18,.16)" stroke="#ff4f12" stroke-width="2" vector-effect="non-scaling-stroke" style="animation-delay:${(i * .06).toFixed(2)}s"/>`).join('');
    const z = svg.closest('.zoomer'); if (!z) return;
    // zoom target = bounding box of the boxes
    const x0 = Math.min(...bx.map(b => b[0])), y0 = Math.min(...bx.map(b => b[1])), x1 = Math.max(...bx.map(b => b[0] + b[2])), y1 = Math.max(...bx.map(b => b[1] + b[3]));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, zz = Math.max(1.4, Math.min(6, .6 * 800 / (x1 - x0 + 20), .7 * 500 / (y1 - y0 + 20)));
    z.style.setProperty('--ox', (cx / 8).toFixed(2) + '%'); z.style.setProperty('--oy', (cy / 14.22).toFixed(2) + '%'); z.style.setProperty('--z1', zz.toFixed(2));
  });
});
// plan canvases inside minis
if ($('[data-mini-plan]')) getPlan().then(({ draw, imgA, imgM }) => {
  $$('canvas[data-mini-plan]').forEach(cv => {
    const ctx = cv.getContext('2d'), kind = cv.dataset.miniPlan, LOOP = 7000;
    loopWhileVisible(cv, ms => {
      const { W, H, d } = fitCanvas(cv), t = (ms % LOOP) / LOOP;
      if (kind === 'duct') draw(ctx, W, H, { dpr: d, z: W / 640 * (1 + .08 * t), cx: 690, cy: 650, imgM, m: .35, a: 0, fade: 1 - sub(t, .9, 1), ducts: eo(sub(t, 0, .6)), devs: eo(sub(t, .3, .75)) });
      else draw(ctx, W, H, { dpr: d, z: W / 760 * (1 + .08 * t), cx: 520, cy: 600, imgA, a: .35, m: 0, fade: 1 - sub(t, .9, 1), walls: eo(sub(t, 0, .6)), doors: eo(sub(t, .35, .75)), wl: 2.5 });
    }, .85 * LOOP);
  });
});

// ---- film modal (brand film + vertical field reports share one player) -----------------------
const modal = $('#modal'), film = $('#film');
const openFilm = (src, poster, vert) => {
  if (!modal) return;
  if (film.getAttribute('src') !== src) { film.setAttribute('src', src); film.setAttribute('poster', poster); }
  modal.classList.toggle('vert', !!vert); modal.classList.add('open');
  film.muted = false; film.currentTime = 0; film.play().catch(() => {});
};
if (modal) {
  $$('[data-film]').forEach(b => b.addEventListener('click', () => openFilm(b.dataset.film, b.dataset.poster || 'assets/poster.jpg', false)));
  const close = () => { modal.classList.remove('open'); film.pause(); };
  $('#close').onclick = close; modal.onclick = e => { if (e.target === modal) close(); };
  addEventListener('keydown', e => e.key === 'Escape' && close());
  const spots = $$('.spot[data-src]'), canHover = matchMedia('(hover: hover)').matches;
  const startPreview = s => { const v = $('video', s); if (!v.src) v.src = s.dataset.src; v.play().catch(() => {}); };
  const stopPreview = s => $('video', s).pause();
  spots.forEach(s => {
    s.addEventListener('click', () => { stopPreview(s); openFilm(s.dataset.src, s.dataset.poster, true); });
    if (canHover && !RM) { s.addEventListener('mouseenter', () => startPreview(s)); s.addEventListener('mouseleave', () => stopPreview(s)); }
  });
  if (!canHover && !RM) {
    const vio = new IntersectionObserver(es => es.forEach(e => e.intersectionRatio > .6 ? startPreview(e.target) : stopPreview(e.target)), { threshold: [0, .6, 1] });
    spots.forEach(s => vio.observe(s));
  }
}

// ---- book a call -----------------------------------------------------------------------------
$$('[data-cal]').forEach(el => {
  if (CAL_URL) el.innerHTML = `<iframe src="${esc(CAL_URL)}?embed=true&theme=dark" title="Book a call with Formwork" loading="lazy" style="width:100%;height:100%;min-height:560px;border:0"></iframe>`;
  // else: the static placeholder in the markup stays (mailto link). TODO(owner): set CAL_URL above.
});
$$('[data-cal] a[data-book]').forEach(a => { a.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Book a call — Formwork')}`; });
if (CAL_URL) $$('a[data-book]').forEach(a => { if (!a.closest('[data-cal]')) { a.href = CAL_URL; a.target = '_blank'; a.rel = 'noopener'; } });

// ---- fast bid intake ([data-intake]) ---------------------------------------------------------
const mb = n => n >= 1e9 ? (n / 1e9).toFixed(2) + ' GB' : n >= 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB';
const intakeHTML = u => `
  <div class="ihead">
    <div class="mono orange ititle"><span class="dot"></span>Send a bid in 60 seconds</div>
    <div class="isteps" aria-hidden="true"><i class="on"></i><i></i><i></i></div>
    <div class="mono dim istepl" aria-live="polite">Step 1 of 3 · The set</div>
  </div>
  <form novalidate>
    <fieldset class="ist" data-step="0">
      <legend class="sr">The bid set</legend>
      <div class="field"><label class="mono dim" for="${u}-link">Paste a plan-room link</label><input id="${u}-link" name="link" type="url" inputmode="url" placeholder="https://  BuildingConnected · agency portal · Dropbox"></div>
      <div class="or mono dim"><span>or</span></div>
      <label class="bigdrop" for="${u}-files"><input id="${u}-files" type="file" multiple accept=".pdf,.zip,.dwg,.dwf,.xlsx,.xls,.docx,application/pdf,application/zip" hidden>
        <b>Drop the bid set</b><span class="mono dim">PDF · ZIP · DWG · multi-file · 500 MB+ is fine</span><span class="mono orange pick">or click to choose files</span></label>
      <ul class="flist"></ul>
      <div class="ierr mono orange" role="alert"></div>
      <div class="inav"><span class="mono dim">No account. No login.</span><button type="button" class="btn solid inext">Next →</button></div>
    </fieldset>
    <fieldset class="ist" data-step="1" hidden>
      <legend class="sr">The bid</legend>
      <div class="field"><label class="mono dim" for="${u}-due">Bid due</label><input id="${u}-due" name="biddate" type="date"></div>
      <div class="mono dim glabel">Your trade(s)</div>
      <div class="chips">${TRADES.map((t, i) => `<label class="ck"><input type="checkbox" name="trades" value="${esc(t)}"${i === 0 ? '' : ''}><span>${esc(t)}</span></label>`).join('')}</div>
      <div class="mono dim glabel">What you want back</div>
      <div class="wants">${WANTS.map(([v, n, d], i) => `<label class="want"><input type="radio" name="want" value="${v}"${i === 0 ? ' checked' : ''}><span><b>${n}</b><small class="mono dim">${d}</small></span></label>`).join('')}</div>
      <div class="inav"><button type="button" class="btn iback">← Back</button><button type="button" class="btn solid inext">Next →</button></div>
    </fieldset>
    <fieldset class="ist" data-step="2" hidden>
      <legend class="sr">You</legend>
      <div class="two">
        <div class="field"><label class="mono dim" for="${u}-name">Name</label><input id="${u}-name" name="name" autocomplete="name" required></div>
        <div class="field"><label class="mono dim" for="${u}-co">Company</label><input id="${u}-co" name="company" autocomplete="organization" required></div>
        <div class="field"><label class="mono dim" for="${u}-email">Email</label><input id="${u}-email" name="email" type="email" autocomplete="email" required></div>
        <div class="field"><label class="mono dim" for="${u}-phone">Phone <span class="mute">(optional)</span></label><input id="${u}-phone" name="phone" type="tel" autocomplete="tel"></div>
      </div>
      <div class="ierr mono orange" role="alert"></div>
      <div class="iprog" hidden><div class="mono dim"><span class="iprogl">Uploading</span><span class="iprogp">0%</span></div><div class="track"><i></i></div></div>
      <div class="inav"><button type="button" class="btn iback">← Back</button><button type="submit" class="btn solid isend">Send the bid →</button></div>
    </fieldset>
  </form>
  <div class="iok" hidden>
    <div class="mono orange ititle"><span class="dot"></span>Received</div>
    <h3 class="slam">We're on it.</h3>
    <ol class="next">
      <li><i></i><b>Received</b><span class="mono dim">Now</span><p>Your set is in. Nobody else sees it.</p></li>
      <li><i></i><b>Gap check</b><span class="mono dim">Within 24 hours</span><p>Missing sheets, conflicts and scope holes, written up as RFIs.</p></li>
      <li><i></i><b>Call</b><span class="mono dim">Day 1</span><p>15 minutes. We walk you through what we found and what you want priced.</p></li>
      <li><i></i><b>The number</b><span class="mono dim">Before your pre-bid</span><p>Quantities and a priced estimate in your format.</p></li>
    </ol>
  </div>`;
let intakeN = 0;
$$('[data-intake]').forEach(root => {
  const u = 'in' + (++intakeN); root.innerHTML = intakeHTML(u);
  const form = $('form', root), sets = $$('fieldset', root), segs = $$('.isteps i', root), stepl = $('.istepl', root);
  const fileIn = $(`#${u}-files`, root), drop = $('.bigdrop', root), flist = $('.flist', root);
  const NAMES = ['The set', 'The bid', 'You'];
  let step = 0, picked = [];
  const want = new URLSearchParams(location.search).get('want');
  if (want) { const r = $(`input[name=want][value="${CSS.escape(want)}"]`, root); if (r) r.checked = true; }
  const err = (msg) => { const e = $('.ierr', sets[step]); if (e) e.textContent = msg || ''; };
  const go = i => {
    step = i; sets.forEach((s, j) => { s.hidden = j !== i; });
    segs.forEach((s, j) => s.classList.toggle('on', j <= i));
    stepl.textContent = `Step ${i + 1} of 3 · ${NAMES[i]}`;
    const f = $('input:not([type=checkbox]):not([type=radio]):not([hidden])', sets[i]); if (f && i > 0) f.focus({ preventScroll: true });
  };
  const renderFiles = () => {
    const tot = picked.reduce((n, f) => n + f.size, 0);
    flist.innerHTML = picked.map((f, i) => `<li><span class="fn">${esc(f.name)}</span><span class="mono dim">${mb(f.size)}</span><button type="button" class="mono dim" data-rm="${i}" aria-label="Remove ${esc(f.name)}">✕</button></li>`).join('') +
      (picked.length ? `<li class="tot mono dim"><span>${picked.length} file${picked.length > 1 ? 's' : ''}</span><span>${mb(tot)}</span><span></span></li>` : '');
    drop.classList.toggle('has', picked.length > 0);
  };
  const add = list => { for (const f of list) if (!picked.some(p => p.name === f.name && p.size === f.size)) picked.push(f); renderFiles(); err(''); };
  fileIn.addEventListener('change', () => { add(fileIn.files); fileIn.value = ''; });
  ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => add(e.dataTransfer.files));
  flist.addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (b) { picked.splice(+b.dataset.rm, 1); renderFiles(); } });
  const valid = i => {
    if (i === 0) {
      const l = form.link.value.trim();
      if (!l && !picked.length) { err('Paste a link or drop the set.'); return false; }
      if (l && !/^https?:\/\/\S+\.\S+/.test(l)) { err('That link doesn\'t look right. It should start with https://'); return false; }
    }
    if (i === 2) for (const n of ['name', 'company', 'email']) if (!form[n].checkValidity()) { err(n === 'email' ? 'Need a valid email.' : `Need your ${n}.`); form[n].focus(); return false; }
    err(''); return true;
  };
  $$('.inext', root).forEach(b => b.addEventListener('click', () => { if (valid(step)) go(step + 1); }));
  $$('.iback', root).forEach(b => b.addEventListener('click', () => go(step - 1)));
  form.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && step < 2) { e.preventDefault(); if (valid(step)) go(step + 1); } });
  const prog = $('.iprog', root), progBar = $('.iprog i', root), progP = $('.iprogp', root), progL = $('.iprogl', root);
  form.addEventListener('submit', async e => {
    e.preventDefault(); if (step < 2) { if (valid(step)) go(step + 1); return; } if (!valid(2)) return;
    const meta = {
      link: form.link.value.trim(), biddate: form.biddate.value, trades: $$('input[name=trades]:checked', form).map(c => c.value),
      want: (form.querySelector('input[name=want]:checked') || {}).value || 'gap', name: form.name.value.trim(), company: form.company.value.trim(),
      email: form.email.value.trim(), phone: form.phone.value.trim(), page: location.pathname,
    };
    const send = $('.isend', root);
    if (SUBMIT_ENDPOINT) {
      send.disabled = true; prog.hidden = false;
      try {
        await uploadBid(meta, picked, (p, label) => { progBar.style.width = (p * 100).toFixed(1) + '%'; progP.textContent = Math.round(p * 100) + '%'; progL.textContent = label; });
      } catch (x) {
        send.disabled = false; prog.hidden = true;
        err(`Upload didn't go through. Paste a plan-room link instead, or email ${CONTACT_EMAIL}.`); return;
      }
    } else {
      // local preview / no backend: hand off to email (files can't ride along — list them)
      const lines = [`Name: ${meta.name}`, `Company: ${meta.company}`, `Email: ${meta.email}`, `Phone: ${meta.phone}`, `Bid due: ${meta.biddate}`, `Trades: ${meta.trades.join(', ')}`, `Wants: ${meta.want}`, `Plan room: ${meta.link}`, ...(picked.length ? ['Files (attach or share a link):', ...picked.map(f => `  - ${f.name} (${mb(f.size)})`)] : [])];
      location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Bid set — ' + meta.company)}&body=${encodeURIComponent(lines.join('\n'))}`;
    }
    form.hidden = true; $('.ihead', root).hidden = true; const ok = $('.iok', root); ok.hidden = false;
    const h = $('.slam', ok); RM ? h.classList.add('hit') : slam(h); flash();
    root.scrollIntoView({ block: 'start', behavior: RM ? 'auto' : 'smooth' });
  });
});

async function uploadBid(meta, files, onp) {
  const total = files.reduce((n, f) => n + f.size, 0) || 1; let done = 0;
  const j = async (url, opt) => { const r = await fetch(url, opt); if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); };
  const retry = async fn => { for (let a = 0; ; a++) { try { return await fn(); } catch (x) { if (a >= 2) throw x; await new Promise(r => setTimeout(r, 800 * (a + 1))); } } };
  onp(0, 'Starting');
  const start = await j(SUBMIT_ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...meta, files: files.map(f => ({ name: f.name, size: f.size, type: f.type || 'application/octet-stream' })) }) });
  for (let i = 0; i < files.length; i++) {
    const f = files[i], up = start.uploads[i], q = `key=${encodeURIComponent(up.key)}&uploadId=${encodeURIComponent(up.uploadId)}`, parts = [];
    for (let n = 0, off = 0; off < f.size; n++, off += CHUNK) {
      const blob = f.slice(off, off + CHUNK);
      parts.push(await retry(() => j(`${UPLOAD_ENDPOINT}?${q}&part=${n + 1}`, { method: 'PUT', body: blob })));
      done += blob.size; onp(done / total, `Uploading ${i + 1} of ${files.length} · ${f.name}`);
    }
    await retry(() => j(`${UPLOAD_ENDPOINT}?${q}&action=complete`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ parts }) }));
  }
  await j(`${SUBMIT_ENDPOINT}?id=${encodeURIComponent(start.id)}&action=done`, { method: 'POST' });
  onp(1, 'Done');
}

// ---- mobile sticky CTA bar: hidden over the hero and whenever an intake is on screen ---------
const mbar = $('#mbar');
if (mbar) {
  let overIntake = false;
  const intakes = $$('[data-intake]');
  const vis = () => mbar.classList.toggle('show', scrollY > innerHeight * .6 && !overIntake);
  if (intakes.length) new IntersectionObserver(es => { overIntake = es.some(e => e.isIntersecting) || intakes.some(el => { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }); vis(); }).observe(intakes[0]);
  addEventListener('scroll', vis, { passive: true }); vis();
}

update(true);
})();
