const filters=[...document.querySelectorAll('[data-filter]')];
const search=document.querySelector('#journal-search');
let selected=new URLSearchParams(location.search).get('category')||'all';
if(!filters.some(b=>b.dataset.filter===selected))selected='all';
if(search)search.value=new URLSearchParams(location.search).get('q')||'';
function applyFilters(){
 const query=(search?.value||'').trim().toLowerCase();let shown=0;
 document.querySelectorAll('.journal-grid .journal-card').forEach(card=>{
  const visible=(!card.classList.contains('search-featured')||!!query)&&(selected==='all'||card.dataset.category===selected)&&(!query||card.dataset.search.includes(query));card.hidden=!visible;if(visible)shown++;
 });
 filters.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===selected)));
 const empty=document.querySelector('.journal-empty');if(empty)empty.hidden=shown>0;
 const more=document.querySelector('.journal-more');if(more)more.hidden=![...more.querySelectorAll('.journal-card')].some(card=>!card.hidden);
 const status=document.querySelector('.journal-results');if(status)status.textContent=`${shown} ${shown===1?'story':'stories'} found`;
 const url=new URL(location.href);selected==='all'?url.searchParams.delete('category'):url.searchParams.set('category',selected);query?url.searchParams.set('q',search.value.trim()):url.searchParams.delete('q');history.replaceState(null,'',url);
}
filters.forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.filter;applyFilters()}));
search?.addEventListener('input',applyFilters);
document.querySelector('.journal-search')?.addEventListener('submit',e=>{e.preventDefault();applyFilters()});
if(filters.length)applyFilters();
// Bounded sticky notes move more slowly than the story column, without hijacking scroll.
const editorialReduced=matchMedia('(prefers-reduced-motion: reduce)');
const editorialWide=matchMedia('(min-width: 901px)');
const rails=[...document.querySelectorAll('.journal-notes-inner')];
function sizeRails(){rails.forEach(rail=>rail.style.setProperty('--notes-top',`${Math.min(32,innerHeight-rail.offsetHeight-100)}px`))}
const railObserver=new ResizeObserver(sizeRails);rails.forEach(rail=>railObserver.observe(rail));
addEventListener('resize',sizeRails);sizeRails();
const visibleEditorialCards=new Set();
let editorialFrame=null;
const cardObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting)visibleEditorialCards.add(entry.target);else visibleEditorialCards.delete(entry.target)});scheduleEditorial()},{rootMargin:'80px 0px'});
document.querySelectorAll('.journal-grid .journal-card-image').forEach(image=>cardObserver.observe(image));
function updateEditorial(){editorialFrame=null;if(editorialReduced.matches||!editorialWide.matches)return;visibleEditorialCards.forEach(image=>{const rect=image.getBoundingClientRect();const drift=Math.max(-22,Math.min(22,(innerHeight/2-rect.top-rect.height/2)*.055));image.style.setProperty('--editorial-drift',`${drift.toFixed(2)}px`)})}
function scheduleEditorial(){if(editorialFrame===null&&visibleEditorialCards.size)editorialFrame=requestAnimationFrame(updateEditorial)}
addEventListener('scroll',scheduleEditorial,{passive:true});
editorialReduced.addEventListener('change',()=>{document.querySelectorAll('.journal-card-image').forEach(image=>image.style.removeProperty('--editorial-drift'));scheduleEditorial()});
const conversationTrack=document.querySelector('.conversation-track');
if(conversationTrack){
 const previous=document.querySelector('[data-conversation-prev]'),next=document.querySelector('[data-conversation-next]');
 function arrows(){previous.disabled=conversationTrack.scrollLeft<3;next.disabled=conversationTrack.scrollLeft>=conversationTrack.scrollWidth-conversationTrack.clientWidth-3}
 function move(direction){conversationTrack.scrollBy({left:direction*(conversationTrack.querySelector('.conversation-card').getBoundingClientRect().width+24),behavior:editorialReduced.matches?'instant':'smooth'})}
 previous.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));conversationTrack.addEventListener('scroll',arrows,{passive:true});new ResizeObserver(arrows).observe(conversationTrack);
 conversationTrack.addEventListener('keydown',event=>{if(event.target===conversationTrack&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();move(event.key==='ArrowRight'?1:-1)}});
 let dragging=null,suppress=false;
 conversationTrack.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse'||event.button!==0)return;dragging={x:event.clientX,y:event.clientY,left:conversationTrack.scrollLeft,id:event.pointerId,active:false};suppress=false});
 conversationTrack.addEventListener('pointermove',event=>{if(!dragging||event.pointerId!==dragging.id)return;const dx=event.clientX-dragging.x;if(!dragging.active){if(Math.abs(dx)<7)return;if(Math.abs(event.clientY-dragging.y)>Math.abs(dx)){dragging=null;return}dragging.active=true;conversationTrack.classList.add('is-dragging');conversationTrack.setPointerCapture(event.pointerId)}event.preventDefault();suppress=true;conversationTrack.scrollLeft=dragging.left-dx});
 function end(){if(!dragging)return;const id=dragging.id;dragging=null;conversationTrack.classList.remove('is-dragging');if(conversationTrack.hasPointerCapture(id))conversationTrack.releasePointerCapture(id)}
 conversationTrack.addEventListener('pointerup',end);conversationTrack.addEventListener('pointercancel',end);conversationTrack.addEventListener('lostpointercapture',end);conversationTrack.addEventListener('dragstart',event=>event.preventDefault());conversationTrack.addEventListener('click',event=>{if(suppress){event.preventDefault();suppress=false}},true);arrows();
}

 document.querySelector('.newsletter-form')?.addEventListener('submit',async event=>{
 event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;
 const button=form.querySelector('button'),status=form.querySelector('.newsletter-status');button.disabled=true;status.textContent='Saving your signup…';
 try{const response=await fetch('/api/journal?action=subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:form.elements.email.value,consent:true,website:form.elements.website.value})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Please try again.');form.reset();status.textContent="You're on the list. Thanks for joining APPICS.";}catch(error){status.textContent=error.message||'We could not save your signup. Please try again.';}finally{button.disabled=false}
 });

const chapterLinks = [...document.querySelectorAll('.article-chapters a')];
if (chapterLinks.length) {
 const desktop = matchMedia('(min-width: 901px)');
 const headings = chapterLinks.map(link => document.getElementById(link.hash.slice(1)));
 let activeLink;
 let frame;

 function updateActiveChapter() {
  frame = undefined;
  let nextLink;
  if (desktop.matches) {
   const readingLine = Math.max(48, innerHeight * .25);
   nextLink = chapterLinks[0];
   for (let index = 0; index < headings.length; index++) {
    if (headings[index].getBoundingClientRect().top > readingLine) break;
    nextLink = chapterLinks[index];
   }
  }
  if (nextLink === activeLink) return;
  activeLink?.removeAttribute('aria-current');
  nextLink?.setAttribute('aria-current', 'location');
  activeLink = nextLink;
 }

 function scheduleChapterUpdate() {
  if (frame === undefined) frame = requestAnimationFrame(updateActiveChapter);
 }

 addEventListener('scroll', scheduleChapterUpdate, { passive: true });
 addEventListener('resize', scheduleChapterUpdate);
 addEventListener('hashchange', scheduleChapterUpdate);
 addEventListener('load', scheduleChapterUpdate);
 updateActiveChapter();
}
