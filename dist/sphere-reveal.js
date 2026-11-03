const sphere = document.querySelector('.sphere-frame');
if (sphere) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let pending = false;
  function update() {
    pending = false;
    if (reduced.matches) {
      sphere.style.setProperty('--sphere-presence', '1');
      return;
    }
    const rect = sphere.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const distance = Math.abs(center - innerHeight / 2);
    const outer = innerHeight * .38 + rect.height / 2;
    const inner = innerHeight * .1;
    const progress = Math.max(0, Math.min(1, (outer - distance) / (outer - inner)));
    const eased = progress * progress * (3 - 2 * progress);
    sphere.style.setProperty('--sphere-presence', String(eased));
  }
  function requestUpdate() {
    if (!pending && visible) {
      pending = true;
      requestAnimationFrame(update);
    }
  }
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) requestUpdate();
    else sphere.style.setProperty('--sphere-presence', reduced.matches ? '1' : '0');
  }).observe(sphere);
  addEventListener('scroll', requestUpdate, {passive:true});
  addEventListener('resize', requestUpdate);
  reduced.addEventListener('change', update);
}
