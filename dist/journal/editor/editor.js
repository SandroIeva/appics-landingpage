const $=id=>document.getElementById(id);
let posts=[],current=null,dirty=false,busy=false;
const fields=['title','slug','category','excerpt','image','alt','body','author','order','featured'];
const slugify=value=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100);
async function api(action,body,params=''){
 const response=await fetch('/api/journal?action='+action+params,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},credentials:'same-origin',...(body?{body:JSON.stringify(body)}:{})});
 const data=await response.json();if(!response.ok)throw new Error(data.error||'Please try again.');return data;
}
function notice(text,error=false){$('editor-notice').textContent=text;$('editor-notice').classList.toggle('is-error',error)}
function setBusy(value){busy=value;['save-article','publish-article','preview-article','unpublish-article','new-article'].forEach(id=>$(id).disabled=value)}
function bodyText(post){return post.blocks.map(b=>(b.type==='heading'?'## ':b.type==='quote'?'> ':'')+b.text).join('\n\n')}
function blocks(text){return text.trim().split(/\n\s*\n/).filter(Boolean).map(text=>({type:text.startsWith('## ')?'heading':text.startsWith('> ')?'quote':'paragraph',text:text.replace(/^(## |> )/,'').trim()}))}
function cover(){const src=$('article-image').value.trim();$('editor-cover-preview').hidden=!src;if(src)$('editor-cover-preview').src=src}
function list(){
 const q=$('editor-search').value.toLowerCase();$('editor-article-list').replaceChildren();
 posts.filter(p=>(p.title+' '+p.category).toLowerCase().includes(q)).forEach(post=>{const b=document.createElement('button');b.type='button';b.className=post.id===current?.id?'is-active':'';const title=document.createElement('span');title.textContent=post.title;const meta=document.createElement('small');meta.textContent=(post.status==='published'?'Published':'Draft')+' · '+post.category;b.append(title,meta);b.addEventListener('click',()=>{if(dirty&&!confirm('Leave your unsaved changes?'))return;open(post)});$('editor-article-list').append(b)});
}
function open(post=null){
 current=post?structuredClone(post):null;
 const p=post||{title:'',slug:'',category:'Creativity',excerpt:'',image:'',imageAlt:'',blocks:[],author:'APPICS Journal',order:0,featured:false};
 fields.forEach(key=>{const el=$('article-'+key);if(key==='featured')el.checked=p.featured;else el.value=key==='body'?bodyText(p):key==='alt'?p.imageAlt:p[key]??''});
 $('article-slug').readOnly=!!post;
 $('article-state').textContent=post?(post.status==='published'?'Published':'Draft'):'New draft';
 $('save-article').textContent=post?.status==='published'?'Save changes':'Save draft';
 $('publish-article').hidden=post?.status==='published';$('unpublish-article').hidden=post?.status!=='published';
 dirty=false;notice('');cover();list();
}
async function load(){posts=(await api('list',null,'&admin=1')).posts;$('editor-login').hidden=true;$('editor-workspace').hidden=false;list();open(posts[0]||null)}
$('login-form').addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;$('login-notice').textContent='Signing in…';try{await api('login',{password:$('editor-password').value});$('editor-password').value='';await load()}catch(e){$('login-notice').textContent=e.message}finally{button.disabled=false}});
$('sign-out').addEventListener('click',async()=>{if(dirty&&!confirm('Sign out and leave unsaved changes?'))return;await api('logout',{});posts=[];current=null;$('editor-workspace').hidden=true;$('editor-login').hidden=false;$('login-notice').textContent='Signed out.'});
$('new-article').addEventListener('click',()=>{if(dirty&&!confirm('Leave your unsaved changes?'))return;open();$('article-title').focus()});
$('editor-search').addEventListener('input',list);
$('article-title').addEventListener('input',()=>{if(!current)$('article-slug').value=slugify($('article-title').value)});
$('article-form').addEventListener('input',()=>{dirty=true;notice('Unsaved changes')});
$('article-image').addEventListener('change',cover);
async function save(status,preview=false){
 if(busy||!$('article-form').reportValidity())return;
 const previewWindow=preview?window.open('about:blank','_blank'):null;
 setBusy(true);notice(status==='published'?'Publishing…':'Saving draft…');
 try{const post={...current,title:$('article-title').value,slug:$('article-slug').value,category:$('article-category').value,excerpt:$('article-excerpt').value,image:$('article-image').value,imageAlt:$('article-alt').value,blocks:blocks($('article-body').value),author:$('article-author').value,order:+$('article-order').value,featured:$('article-featured').checked,status};
 const result=await api('save',{post,revision:current?.revision});const index=posts.findIndex(p=>p.id===result.post.id);if(index<0)posts.unshift(result.post);else posts[index]=result.post;open(result.post);notice(status==='published'?'Published. Your article is now live.':'Draft saved. Only editors can see it.');
 if(previewWindow){previewWindow.opener=null;previewWindow.location='/api/journal?action=preview&slug='+encodeURIComponent(result.post.slug);}
 }catch(e){if(previewWindow)previewWindow.close();notice(e.message,true)}finally{setBusy(false)}
}
$('article-form').addEventListener('submit',e=>{e.preventDefault();save(current?.status==='published'?'published':'draft')});
$('publish-article').addEventListener('click',()=>save('published'));
$('preview-article').addEventListener('click',()=>save(current?.status==='published'?'published':'draft',true));
$('unpublish-article').addEventListener('click',()=>{if(confirm('Move this article back to drafts? It will no longer appear in the public journal.'))save('draft')});
$('article-upload').addEventListener('change',async()=>{
 const file=$('article-upload').files[0];if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)){notice('Choose a JPG, PNG, or WebP image.',true);return}
 setBusy(true);notice('Optimizing and uploading your image…');
 try{const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const dataUrl=canvas.toDataURL('image/webp',.84);const result=await api('upload',{type:'image/webp',data:dataUrl.split(',')[1]});$('article-image').value=result.image;dirty=true;cover();notice('Image uploaded. Add an image description, then save your article.')}catch(e){notice(e.message,true)}finally{setBusy(false)}
});
addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue=''}});
(async()=>{try{const session=await api('session');if(session.authenticated)await load();else if(!session.configured)$('login-notice').textContent='The editor is being configured. Please try again shortly.'}catch(e){$('login-notice').textContent=e.message}})();
