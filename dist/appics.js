const hero = document.querySelector('.wh-hero');
const pause = document.querySelector('.wh-pause');
if (hero && pause) new IntersectionObserver(([entry]) => {
  pause.hidden = !entry.isIntersecting;
}, {threshold: 0}).observe(hero);
