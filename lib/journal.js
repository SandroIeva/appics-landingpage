import { readFileSync } from 'node:fs';
import { scryptSync, timingSafeEqual, createHmac, randomBytes } from 'node:crypto';
export const seed = JSON.parse(readFileSync(new URL('../content/journal-seed.json', import.meta.url), 'utf8'));
export const categories = ['Creativity','Music','Community','Creation Lab','Culture','Creators','Interviews'];
export const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const slugify = value => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100);
export function validatePost(input) {
  if (!input || typeof input !== 'object') throw new Error('An article is required.');
  const title = String(input.title || '').trim().slice(0,180);
  const slug = slugify(input.slug || title);
  const id = slugify(input.id || slug);
  if (title.length < 3 || !slug || !id) throw new Error('Add a title and a valid URL.');
  if (!categories.includes(input.category)) throw new Error('Choose an article category.');
  const image = String(input.image || '');
  if (!/^\/(assets\/creators\/[a-zA-Z0-9._/-]+|api\/journal\?action=media&id=[a-zA-Z0-9.-]+)$/.test(image)) throw new Error('Choose or upload a cover image.');
  const blocks = Array.isArray(input.blocks) ? input.blocks.filter(b=>b && ['paragraph','heading','quote'].includes(b.type)).map(b=>({type:b.type,text:String(b.text || '').trim().slice(0,12000)})).filter(b=>b.text) : [];
  if (!blocks.length || blocks.length > 120) throw new Error('Add article text (up to 120 paragraphs).');
  return {id,slug,title,category:input.category,excerpt:String(input.excerpt || '').trim().slice(0,500),image,imageAlt:String(input.imageAlt || '').slice(0,250),author:String(input.author || 'APPICS Journal').slice(0,100),status:input.status==='published'?'published':'draft',featured:!!input.featured,order:Math.max(0,Math.min(1000,Number(input.order)||0)),publishedAt:input.publishedAt||null,updatedAt:new Date().toISOString(),blocks};
}
export function passwordMatches(password, encoded=process.env.JOURNAL_PASSWORD_HASH) {
  if (!encoded || typeof password !== 'string' || password.length > 500) return false;
  const [salt,hash]=encoded.split(':');
  if (!salt || !hash) return false;
  const actual=scryptSync(password,salt,32), expected=Buffer.from(hash,'hex');
  return expected.length===actual.length && timingSafeEqual(actual,expected);
}
export function issueSession(secret=process.env.JOURNAL_SESSION_SECRET) {
  if (!secret) throw new Error('Editor login is not configured.');
  const payload=Buffer.from(JSON.stringify({exp:Date.now()+8*60*60*1000,nonce:randomBytes(16).toString('hex')})).toString('base64url');
  return `${payload}.${createHmac('sha256',secret).update(payload).digest('base64url')}`;
}
export function validSession(cookie='',secret=process.env.JOURNAL_SESSION_SECRET) {
  if (!secret) return false;
  const token=cookie.split(';').map(v=>v.trim()).find(v=>v.startsWith('appics_editor='))?.slice(14);
  if (!token) return false;
  const [payload,signature]=token.split('.');
  if (!payload || !signature) return false;
  const expected=createHmac('sha256',secret).update(payload).digest();
  const actual=Buffer.from(signature,'base64url');
  if (actual.length!==expected.length || !timingSafeEqual(actual,expected)) return false;
  try { return JSON.parse(Buffer.from(payload,'base64url')).exp > Date.now(); } catch { return false; }
}
export const readingTime = p => Math.max(1,Math.ceil(p.blocks.map(b=>b.text).join(' ').split(/\s+/).length/180));
export const publicPost = p => {const {revision,...post}=p;return post;};
