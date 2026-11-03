const edgeStage = document.querySelector('.wh-stage');
if (edgeStage) {
  const edge = document.createElement('div');
  edge.className = 'hero-edge-shade';
  edge.setAttribute('aria-hidden', 'true');
  edgeStage.append(edge);
  let pointer = null;
  let x = 0, y = 0, reveal = 0, target = 0, frame;
  function update() {
    if (pointer) {x += (pointer.x-x)*.2;y += (pointer.y-y)*.2;}
    reveal += (target-reveal)*.17;
    const bounds = edgeStage.getBoundingClientRect();
    edge.style.setProperty('--edge-x', `${x-bounds.left}px`);
    edge.style.setProperty('--edge-y', `${y-bounds.top}px`);
    edge.style.setProperty('--edge-radius', `${Math.min(960,innerWidth*1.25)}px`);
    edge.style.setProperty('--edge-cover', `${1-reveal}`);
    if(pointer || reveal>.003)frame=requestAnimationFrame(update);else frame=null;
  }
  edgeStage.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch')return;
    if(!pointer){x=event.clientX;y=event.clientY;}
    pointer={x:event.clientX,y:event.clientY};target=1;
    if(!frame)frame=requestAnimationFrame(update);
  },{passive:true});
  edgeStage.addEventListener('pointerleave',()=>{pointer=null;target=0;if(!frame)frame=requestAnimationFrame(update);});
}
