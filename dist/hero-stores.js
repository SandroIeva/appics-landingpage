const storeHero = document.querySelector('.wh-stage');
const storeLinks = document.querySelectorAll('.download-row a');
if (storeHero && storeLinks.length) {
  const group = document.createElement('nav');
  group.className = 'hero-store-links';
  group.setAttribute('aria-label','Download APPICS');
  const icons = [
    '<img src="/assets/appics/Apple.svg" alt="" aria-hidden="true">',
    '<img src="/assets/appics/GooglePlay-Color.svg" alt="" aria-hidden="true">'
  ];
  storeLinks.forEach((link,index)=>{
    const copy = link.cloneNode(true);
    copy.innerHTML = `${icons[index]}<span>${index===0?'App Store':'Google Play'}</span>`;
    group.append(copy);
  });
  storeHero.append(group);
  let queued = false;
  function updateStores() {
    queued = false;
    const hero = document.querySelector('.wh-hero').getBoundingClientRect();
    const progress = Math.max(0,Math.min(1,-hero.top/(innerHeight*1.22)));
    const visible = progress > .37 && hero.bottom > innerHeight * .35;
    group.classList.toggle('is-visible',visible);
    group.inert = !visible;
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(updateStores);}}
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule);
  updateStores();
}
