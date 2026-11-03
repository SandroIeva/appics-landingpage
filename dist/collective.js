const categoryDirectory = document.querySelector('.category-directory');
if (categoryDirectory) {
  const rows = [...categoryDirectory.querySelectorAll('[data-category-index]')];
  const scenes = [...categoryDirectory.querySelectorAll('.category-scene')];
  const preview = categoryDirectory.querySelector('.category-preview-images');
  const caption = categoryDirectory.querySelector('[data-category-caption]');
  const number = categoryDirectory.querySelector('[data-category-number]');
  function activate(button) {
    const index = button.dataset.categoryIndex;
    rows.forEach(row=>row.setAttribute('aria-pressed',String(row===button)));
    scenes.forEach(scene=>scene.classList.toggle('is-active',scene.dataset.categoryScene===index));
    if (caption) caption.textContent = `${button.querySelector('.category-name').textContent.toUpperCase()}`;
    if (number) number.textContent = `${String(+index+1).padStart(2,'0')} / ${rows.length}`;
    categoryDirectory.classList.add('is-interacting');
  }
  rows.forEach(button=>{
    button.addEventListener('pointerenter',()=>activate(button));
    button.addEventListener('focus',()=>activate(button));
    button.addEventListener('click',()=>activate(button));
  });
  categoryDirectory.addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse')return;
    const hoveredRow = rows.find(button => {
      const rect = button.getBoundingClientRect();
      return event.clientY >= rect.top && event.clientY < rect.bottom;
    });
    if (hoveredRow && hoveredRow.getAttribute('aria-pressed') !== 'true') activate(hoveredRow);
    const bounds=categoryDirectory.getBoundingClientRect();
    const relative=Math.max(0,Math.min(1,(event.clientY-bounds.top)/bounds.height));
    preview.style.setProperty('--preview-y',`${(relative-.5)*32}px`);
  },{passive:true});
  categoryDirectory.addEventListener('pointerleave',()=>{
    categoryDirectory.classList.remove('is-interacting');
    preview.style.setProperty('--preview-y','0px');
  });
}
