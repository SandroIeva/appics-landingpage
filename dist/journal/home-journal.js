(async()=>{
 const grid=document.querySelector('#workshops .workshop-grid');if(!grid)return;
 try{const response=await fetch('/api/journal?action=list');if(!response.ok)return;const {posts}=await response.json();if(!posts?.length)return;
 const fragment=document.createDocumentFragment();
 posts.slice(0,3).forEach(post=>{
  const a=document.createElement('a');a.href='/journal/story/'+encodeURIComponent(post.slug)+'/';
  const visual=document.createElement('div');visual.className='workshop-image';const image=document.createElement('img');image.src=post.image;image.alt=post.imageAlt;image.loading='lazy';visual.append(image);
  const meta=document.createElement('div');meta.className='workshop-meta';const category=document.createElement('span');category.textContent=post.category;const arrow=document.createElement('span');arrow.textContent='↗';meta.append(category,arrow);
  const title=document.createElement('h3');title.textContent=post.title;const excerpt=document.createElement('p');excerpt.textContent=post.excerpt;a.append(visual,meta,title,excerpt);fragment.append(a);
 });grid.replaceChildren(fragment);
 }catch{}
})();
