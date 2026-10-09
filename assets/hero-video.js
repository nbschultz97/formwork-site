// Homepage hero background loop (Option C, ghosted). 960w on phones, AV1/WebM where supported,
// nothing loads under prefers-reduced-motion or Save-Data, starts after load, pauses off-screen.
(() => {
  const v = document.querySelector('video.hv-video');
  if (!v) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (navigator.connection && navigator.connection.saveData) return;
  const w = matchMedia('(max-width: 760px)').matches ? 960 : 1920;
  const av1 = v.canPlayType('video/webm; codecs="av01.0.05M.08"');
  const src = `assets/hero/loop-mono-${w}.${av1 ? 'webm' : 'mp4'}`;
  let started = false;
  const start = () => { if (started) return; started = true; v.src = src; v.load(); v.play().catch(() => {}); };
  const kick = () => ('requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 1500 }) : setTimeout(start, 600));
  if (document.readyState === 'complete') kick(); else addEventListener('load', kick, { once: true });
  new IntersectionObserver(([e]) => { if (!started) return; (e.isIntersecting && !document.hidden) ? v.play().catch(() => {}) : v.pause(); }, { threshold: 0.05 }).observe(v);
  document.addEventListener('visibilitychange', () => { if (started) document.hidden ? v.pause() : v.play().catch(() => {}); });
  v.addEventListener('playing', () => v.classList.add('on'), { once: true });
})();
