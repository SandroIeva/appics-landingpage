(() => {
  const root=document.documentElement;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  if(reduced.matches){root.classList.remove('journal-entering');return;}
  const targets=new Map();
  function add(selector,{delay=0,step=0,kind='rise',duration=1200}={}){
    document.querySelectorAll(selector).forEach((element,index)=>{
      if(!targets.has(element))targets.set(element,{delay:delay+Math.min(index,4)*step,kind,duration});
    });
  }
  // The cover leads, then the masthead and story copy follow in soft waves.
  add('.feature-image,.article-cover',{kind:'cover',duration:1450});
  add('.journal-masthead .eyebrow',{delay:140});
  add('.journal-masthead h1',{delay:230,duration:1400});
  add('.journal-masthead>p',{delay:350});
  add('.feature-copy>*',{delay:320,step:85});
  add('.journal-section-head>*,.journal-filters',{step:90});
  add('.journal-grid .journal-card,.related-grid .journal-card',{kind:'card',duration:1350});
  add('.journal-notes-inner>*',{delay:180,step:80,duration:1350});
  add('.conversation-heading .eyebrow,.conversation-heading h2,.conversation-heading>div>p:last-child',{step:85,duration:1350});
  add('.conversation-controls',{delay:220});
  add('.conversation-card',{step:90,kind:'card',duration:1350});
  add('.journal-newsletter>*,.journal-invitation>*',{step:100,duration:1350});
  add('.article-header>*',{delay:180,step:90,duration:1300});
  add('.article-body>*,.article-reading>aside>*',{duration:1150});
  const running=new Set();
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      const element=entry.target,config=targets.get(element);
      observer.unobserve(element);
      const from=config.kind==='cover'
        ? {opacity:0,transform:'translateY(28px) scale(.975)',clipPath:'inset(7% 0 0 round 12px)'}
        : config.kind==='card'
          ? {opacity:0,transform:'translateY(38px) scale(.985)'}
          : {opacity:0,transform:'translateY(24px)'};
      const to=config.kind==='cover'
        ? {opacity:1,transform:'translateY(0) scale(1)',clipPath:'inset(0 0 0 round 8px)'}
        : {opacity:1,transform:'translateY(0) scale(1)'};
      element.classList.add('is-revealed');
      const animation=element.animate([from,to],{duration:config.duration,delay:config.delay,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
      running.add(animation);
      animation.finished.then(()=>{running.delete(animation);animation.cancel();}).catch(()=>running.delete(animation));
    });
  },{threshold:0,rootMargin:'0px 0px -45px 0px'});
  targets.forEach((config,element)=>{element.setAttribute('data-journal-reveal','');observer.observe(element)});
  root.classList.add('journal-motion-ready');
  root.classList.remove('journal-entering');
  reduced.addEventListener('change',()=>{
    if(!reduced.matches)return;
    observer.disconnect();running.forEach(animation=>animation.cancel());running.clear();
    targets.forEach((config,element)=>element.classList.add('is-revealed'));
    root.classList.remove('journal-entering');
  });
})();
