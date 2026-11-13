/* SIGNAL flowline: native scroll-linked rails, inspired by the motion pattern observed on mindmarket.com.
   No remote dependency: duplicate each rail pattern, pause outside the viewport, and tie speed to scroll velocity. */
(() => {
  'use strict';
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const rails = [...document.querySelectorAll('[data-flow-rail]')];
  const state = { y: window.scrollY || 0, previous: window.scrollY || 0, velocity: 0, direction: 1, progress: 0, last: 0, raf: 0 };
  const active = new WeakMap();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const repeat = (rail) => {
    const track = rail.querySelector('[data-flow-container]');
    const pattern = rail.querySelector('[data-flow-pattern]');
    if (!track || !pattern) return;
    track.querySelectorAll('[data-flow-clone]').forEach(el => el.remove());
    const width = pattern.getBoundingClientRect().width || 1;
    const copies = Math.max(2, Math.ceil(window.innerWidth / width) + 2);
    for (let i=0; i<copies; i++) { const clone = pattern.cloneNode(true); clone.dataset.flowClone = 'true'; clone.setAttribute('aria-hidden','true'); track.appendChild(clone); }
    rail._patternWidth = width;
    rail._x = Number(rail.dataset.flowDirection || 1) > 0 ? -width : 0;
  };
  rails.forEach(rail => { repeat(rail); active.set(rail, false); });
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(entry => active.set(entry.target, entry.isIntersecting)), {rootMargin:'120px 0px'}) : null;
  rails.forEach(rail => observer?.observe(rail));
  const onScroll = () => { const y = window.scrollY || 0; state.direction = y >= state.y ? 1 : -1; state.y = y; };
  const onResize = () => rails.forEach(repeat);
  window.addEventListener('scroll', onScroll, {passive:true}); window.addEventListener('resize', onResize, {passive:true});
  const update = (now) => {
    const dt = Math.min(48, state.last ? now - state.last : 16); state.last = now;
    const raw = state.y - state.previous; state.previous = state.y;
    state.velocity += (raw - state.velocity) * .12;
    state.velocity *= .88;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    state.progress = clamp(state.y / maxScroll, 0, 1);
    document.documentElement.style.setProperty('--flow-progress', String(state.progress));
    document.documentElement.style.setProperty('--flow-progress-width', `${Math.round(state.progress * 100)}%`);
    if (!reduced) rails.forEach(rail => {
      if (!active.get(rail)) return;
      const track = rail.querySelector('[data-flow-container]'); if (!track || !rail._patternWidth) return;
      const idle = Number(rail.dataset.flowVelocity || .35); const dir = Number(rail.dataset.flowDirection || 1); const speed = idle + Math.abs(state.velocity) * .6;
      rail._x += speed * dir * (state.direction || 1);
      if (rail._x <= -rail._patternWidth) rail._x += rail._patternWidth;
      if (rail._x >= 0) rail._x -= rail._patternWidth;
      track.style.transform = `translate3d(${rail._x}px,0,0)`;
    });
    state.raf = requestAnimationFrame(update);
  };
  state.raf = requestAnimationFrame(update);
  window.addEventListener('pagehide', () => { cancelAnimationFrame(state.raf); observer?.disconnect(); });
})();
