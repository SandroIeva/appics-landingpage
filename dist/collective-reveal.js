const statement = document.querySelector('.collective-statement h2');
if (statement) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const copy = statement.textContent.trim();
  const words = copy.split(/\s+/).map((word, index, all) => {
    const wrap = document.createElement('span');
    wrap.className = 'collective-word-wrap';
    const span = document.createElement('span');
    span.className = 'collective-word';
    span.textContent = word;
    wrap.append(span);
    return {wrap, span};
  });
  statement.replaceChildren();
  words.forEach(({wrap}, index) => {
    statement.append(wrap);
    if (index < words.length - 1) statement.append(document.createTextNode(' '));
  });
  let visible = false, frame = null, current = 0, target = 0, previous = 0;
  const clamp = value => Math.max(0, Math.min(1, value));
  function measure() {
    const bounds = statement.getBoundingClientRect();
    target = reduced.matches ? 1 : clamp((innerHeight * .76 - bounds.top) / (bounds.height + innerHeight * .3));
  }
  function paint() {
    words.forEach(({span}, index) => {
      const progress = reduced.matches ? 1 : clamp((current - index / words.length * .91) / .09);
      const eased = 1 - Math.pow(1 - progress, 3);
      span.style.opacity = String(.12 + .88 * eased);
      span.style.filter = `blur(${6 * (1 - eased)}px)`;
      span.style.transform = `translateY(${16 * (1 - eased)}px) scale(${.92 + .08 * eased}) rotateX(${24 * (1 - eased)}deg)`;
    });
  }
  function tick(now) {
    frame = null;
    const delta = previous ? Math.min(now - previous, 50) : 16;
    previous = now;
    current += (target - current) * (1 - Math.exp(-delta / 340));
    if (Math.abs(target - current) < .0001) current = target;
    paint();
    if (visible && current !== target) frame = requestAnimationFrame(tick);
  }
  function update() {
    measure();
    if (reduced.matches) { current = 1; paint(); return; }
    if (visible && frame === null) { previous = 0; frame = requestAnimationFrame(tick); }
  }
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) update();
    else if (frame !== null) { cancelAnimationFrame(frame); frame = null; }
  }, {rootMargin:'80px 0px'}).observe(statement);
  addEventListener('scroll', () => { if (visible) update(); }, {passive:true});
  addEventListener('resize', update);
  reduced.addEventListener('change', update);
  measure(); current = target; paint();
}
