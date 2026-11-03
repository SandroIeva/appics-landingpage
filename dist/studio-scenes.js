const studioLinks = [...document.querySelectorAll('.giant-links>a')];
const sceneLayers = [...document.querySelectorAll('.spot-scene')];
function showStudio(index) {
  sceneLayers.forEach(layer => layer.classList.toggle('is-active', layer.dataset.scene === String(index)));
}
studioLinks.forEach((link,index)=>{
  link.addEventListener('pointerenter',()=>showStudio(index));
  link.addEventListener('focus',()=>showStudio(index));
});
