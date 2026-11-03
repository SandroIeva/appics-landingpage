const section = document.querySelector('.world-section');
if (section) {
  const track = section.querySelector('.world-track');
  const cards = [...track.querySelectorAll('.world-card')];
  const back = section.querySelector('[data-world-prev]');
  const next = section.querySelector('[data-world-next]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function updateArrows() {
    back.disabled = track.scrollLeft < 3;
    next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 3;
  }
  function move(direction) {
    stopMomentum();
    const card = cards.find(card => !card.hidden);
    if (!card) return;
    const distance = card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap);
    track.scrollBy({left: distance * direction, behavior: reduced.matches ? 'instant' : 'smooth'});
  }
  back.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('scroll', updateArrows, {passive:true});
  track.addEventListener('keydown', event => {
    if (event.target !== track) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  section.querySelectorAll('[data-art-color]').forEach(button => button.addEventListener('click', () => {
    const visual = button.closest('.color-play');
    visual.style.setProperty('--art-color', button.dataset.artColor);
    visual.querySelector('[data-color-code]').textContent = button.dataset.artColor;
    visual.querySelectorAll('[data-art-color]').forEach(swatch => swatch.setAttribute('aria-pressed', String(swatch === button)));
  }));
  // Only horizontal mouse drags are handled here. Vertical wheel and touch
  // gestures remain with the page/browser, including Lenis scrolling.
  let drag = null;
  let suppressClick = false;
  let momentumFrame = null;
  function stopMomentum() {
    if (momentumFrame !== null) cancelAnimationFrame(momentumFrame);
    momentumFrame = null;
    track.classList.remove('is-coasting');
  }
  function coast(velocity) {
    if (reduced.matches || Math.abs(velocity) < .04) return;
    track.classList.add('is-coasting');
    let previous = performance.now();
    function tick(now) {
      const delta = Math.min(32, now - previous);
      previous = now;
      const before = track.scrollLeft;
      track.scrollLeft += velocity * delta;
      velocity *= Math.exp(-delta / 290);
      if (Math.abs(velocity) < .025 || Math.abs(track.scrollLeft - before) < .1) {
        stopMomentum();
        return;
      }
      momentumFrame = requestAnimationFrame(tick);
    }
    momentumFrame = requestAnimationFrame(tick);
  }
  track.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('button, a, input, select, textarea')) return;
    stopMomentum();
    suppressClick = false;
    drag = {id:event.pointerId, x:event.clientX, y:event.clientY, left:track.scrollLeft, active:false, lastX:event.clientX, lastTime:performance.now(), velocity:0};
  });
  track.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.active) {
      if (Math.abs(dx) < 7) return;
      if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
      drag.active = true;
      track.classList.add('is-dragging');
      track.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    suppressClick = true;
    const now = performance.now();
    const elapsed = Math.max(1, now - drag.lastTime);
    const speed = (drag.lastX - event.clientX) / elapsed;
    drag.velocity = drag.velocity * .35 + speed * .65;
    drag.lastX = event.clientX;
    drag.lastTime = now;
    track.scrollLeft = drag.left - dx;
  });
  function endDrag(event) {
    if (!drag) return;
    const id = drag.id;
    const velocity = drag.active && performance.now() - drag.lastTime < 100 && event?.type === 'pointerup'
      ? Math.max(-2.8, Math.min(2.8, drag.velocity)) : 0;
    drag = null;
    if (velocity) coast(velocity);
    track.classList.remove('is-dragging');
    if (track.hasPointerCapture(id)) track.releasePointerCapture(id);
    updateArrows();
  }
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('lostpointercapture', endDrag);
  track.addEventListener('pointerleave', () => { if (drag && !drag.active) drag = null; });
  track.addEventListener('click', event => {
    if (suppressClick) { event.preventDefault(); event.stopPropagation(); suppressClick = false; }
  }, true);
  track.addEventListener('dragstart', event => event.preventDefault());
  new ResizeObserver(updateArrows).observe(track);
  updateArrows();
}
