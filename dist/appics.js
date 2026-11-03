import './hero-stores.js?v=color-icon';
import './collective-reveal.js?v=word-stagger';
import './sphere-reveal.js?v=deeper-later';
import './collective.js?v=no-captions';
import './studio-scenes.js';
import './creation-lab.js';
import './hero-copy.js';
import './hero-edge-shade.js';
import './hero-image-reveal.js';
import './hero-liquid.js?v=sphere-mask';
import './categories.js?v=momentum';
import './smooth-scroll.js';

const hero = document.querySelector('.wh-hero');
const pause = document.querySelector('.wh-pause');
if (hero && pause) new IntersectionObserver(([entry]) => {
  pause.hidden = !entry.isIntersecting;
}, {threshold: 0, rootMargin: '0px 0px -50% 0px'}).observe(hero);

// The menu moves from the centre of the opening gallery to a persistent bottom dock.
const menu = document.querySelector('.orbit-menu');
let pending = false;
let menuExpansion = 0, menuVelocity = 0, menuTarget = 0, menuSpringFrame = null;
const menuReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function animateMenuWidth() {
  menuSpringFrame = null;
  menuVelocity = (menuVelocity + (menuTarget - menuExpansion) * .075) * .76;
  menuExpansion += menuVelocity;
  if (Math.abs(menuTarget - menuExpansion) < .0005 && Math.abs(menuVelocity) < .0005) {
    menuExpansion = menuTarget; menuVelocity = 0;
  } else menuSpringFrame = requestAnimationFrame(animateMenuWidth);
  menu.style.setProperty('--menu-expansion', String(menuExpansion));
}
function expandMenu(target) {
  menuTarget = target;
  if (menuReducedMotion.matches) {
    menuExpansion = target; menu.style.setProperty('--menu-expansion', String(target));
  } else if (menuSpringFrame === null) menuSpringFrame = requestAnimationFrame(animateMenuWidth);
}
function layoutMenu() {
  pending = false;
  const liquidProgress = Math.min(1, Math.max(0, (window.scrollY / innerHeight - 0.08) / 0.95));
  const liquidFade = liquidProgress * liquidProgress * (3 - 2 * liquidProgress);
  document.querySelector('.wh-stage')?.style.setProperty('--liquid-opacity', String(0.045 + liquidFade * 0.73));
  const progress = Math.min(1, Math.max(0, (window.scrollY - innerHeight * 0.28) / (innerHeight * 0.9)));
  const eased = 1 - Math.pow(1 - progress, 3);
  const halfHeight = menu.getBoundingClientRect().height / 2;
  const start = innerHeight * 0.5 - 28;
  const bottom = innerHeight - halfHeight - 46;
  menu.style.top = `${start + (bottom - start) * eased}px`;
  expandMenu(eased);
  const menuReveal = Math.min(1, Math.max(0, (progress - .12) / .62));
  menu.style.setProperty('--menu-reveal', String(menuReveal));
  menu.querySelectorAll('.orbit-secondary').forEach(link => { link.inert = menuReveal < .15; });
  menu.dataset.docked = progress === 1 ? 'true' : 'false';
}
function requestLayout() {
  if (!pending) { pending = true; requestAnimationFrame(layoutMenu); }
}
if (menu) {
  addEventListener('scroll', requestLayout, {passive: true});
  addEventListener('resize', requestLayout);
  visualViewport?.addEventListener('resize', requestLayout);
  layoutMenu();
}

// A feathered reveal of the brighter image follows the pointer with gentle lag.
const spotlight = document.querySelector('.light-section');
if (spotlight) {
  let x = 0.55, y = 0.4, tx = x, ty = y, frame = null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function tick() {
    x += (tx - x) * 0.13;
    y += (ty - y) * 0.13;
    spotlight.style.setProperty('--spot-x', `${(x * 100).toFixed(2)}%`);
    spotlight.style.setProperty('--spot-y', `${(y * 100).toFixed(2)}%`);
    if (Math.abs(tx - x) + Math.abs(ty - y) > 0.0005) frame = requestAnimationFrame(tick);
    else frame = null;
  }
  function target(event) {
    const bounds = spotlight.getBoundingClientRect();
    tx = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    ty = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    if (!reduced && !frame) frame = requestAnimationFrame(tick);
  }
  spotlight.addEventListener('pointermove', target, {passive: true});
  spotlight.addEventListener('pointerdown', target, {passive: true});
  spotlight.addEventListener('pointerleave', () => {
    tx = 0.55; ty = 0.4;
    if (!reduced && !frame) frame = requestAnimationFrame(tick);
  });
}

const film = document.querySelector('#movement-film');
const filmButton = document.querySelector('#film-toggle');
if (film && filmButton) {
  function sync() {
    filmButton.textContent = film.paused ? 'PLAY FILM ↗' : 'PAUSE FILM Ⅱ';
    filmButton.setAttribute('aria-label', film.paused ? 'Play video' : 'Pause video');
  }
  filmButton.addEventListener('click', async () => {
    if (film.paused) { try { await film.play(); } catch { film.controls = true; } }
    else film.pause();
    sync();
  });
  film.addEventListener('play', sync);
  film.addEventListener('pause', sync);
  new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) film.pause(); }, {threshold: 0.05}).observe(film);
  sync();
}
