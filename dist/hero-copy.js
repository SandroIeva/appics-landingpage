const editorialHero = document.querySelector('.hero-editorial');
if (editorialHero) {
  const hero = document.querySelector('.wh-hero');
  const rows = [...editorialHero.querySelectorAll('.hero-row')];
  const photos = [...editorialHero.querySelectorAll('.hero-inline-image')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let requested = false;
  const clamp = value => Math.max(0,Math.min(1,value));
  const ease = value => 1-Math.pow(1-value,3);
  function render() {
    requested = false;
    const progress = clamp(-hero.getBoundingClientRect().top/(innerHeight*1.22));
    rows.forEach((row,index)=>{
      const amount = reduced.matches ? 1 : ease(clamp((progress-.36-index*.075)/.42));
      row.style.transform = `translateY(${(1-amount)*35}px)`;
      row.style.opacity = String(.15+amount*.85);
    });
    photos.forEach((photo,index)=>{
      const amount = reduced.matches ? 1 : ease(clamp((progress-.43-index*.08)/.39));
      photo.style.clipPath = `inset(${(1-amount)*40}% ${(1-amount)*45}% round 9px)`;
      photo.style.transform = `translateY(${(1-amount)*25}px) rotate(${(1-amount)*(index ? 9 : -9)}deg) scale(${.8+.2*amount})`;
    });
  }
  function update(){if(!requested){requested=true;requestAnimationFrame(render);}}
  addEventListener('scroll',update,{passive:true});
  addEventListener('resize',update);
  reduced.addEventListener('change',update);
  render();
}
