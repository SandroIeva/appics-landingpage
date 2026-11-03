// One global spotlight mapped into each transformed image's screen rectangle.
// The original image remains underneath a navy-tinted duplicate.
const imageStage = document.querySelector('.wh-stage');
if (imageStage) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pointer = null;
  let x = 0, y = 0, strength = 0, targetStrength = 0;
  let frame = null;
  function decorate() {
    imageStage.querySelectorAll('.wc:not(.placeholder)').forEach(card => {
      if (card.querySelector('.hero-blue-image')) return;
      const original = card.querySelector('img');
      if (!original) return;
      const blue = original.cloneNode();
      blue.className = 'hero-blue-image';
      blue.alt = '';
      blue.setAttribute('aria-hidden', 'true');
      blue.draggable = false;
      card.append(blue);
    });
  }
  decorate();
  const imageWorld = imageStage.querySelector('.wh-world');
  if (imageWorld) new MutationObserver(decorate).observe(imageWorld, {childList:true});
  function draw() {
    strength += (targetStrength - strength) * (reduced ? 1 : .17);
    if (pointer) {
      x += (pointer.x - x) * (reduced ? 1 : .2);
      y += (pointer.y - y) * (reduced ? 1 : .2);
    }
    const radius = Math.min(960, innerWidth * 1.25);
    imageStage.querySelectorAll('.wc:not(.placeholder)').forEach(card => {
      if (card.style.visibility !== 'visible') return;
      const rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const localX = (x - rect.left) / rect.width * card.offsetWidth;
      const localY = (y - rect.top) / rect.height * card.offsetHeight;
      const rx = radius / rect.width * card.offsetWidth;
      const ry = radius / rect.height * card.offsetHeight;
      card.style.setProperty('--reveal-x', `${localX.toFixed(1)}px`);
      card.style.setProperty('--reveal-y', `${localY.toFixed(1)}px`);
      card.style.setProperty('--reveal-rx', `${rx.toFixed(1)}px`);
      card.style.setProperty('--reveal-ry', `${ry.toFixed(1)}px`);
      card.style.setProperty('--reveal-cover', (1-strength).toFixed(3));
    });
    if (pointer || strength > .003) frame = requestAnimationFrame(draw);
    else frame = null;
  }
  function move(event) {
    if (event.pointerType === 'touch') return;
    if (!pointer) {x=event.clientX;y=event.clientY;}
    pointer = {x:event.clientX,y:event.clientY};
    targetStrength = 1;
    if (!frame) frame = requestAnimationFrame(draw);
  }
  imageStage.addEventListener('pointermove',move,{passive:true});
  imageStage.addEventListener('pointerleave',()=>{pointer=null;targetStrength=0;if(!frame)frame=requestAnimationFrame(draw);});
}
