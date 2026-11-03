import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {seed,escape} from '../lib/journal.js';
import {renderIndex,renderArticle} from '../lib/journal-views.js';
const root=new URL('../dist/',import.meta.url);
mkdirSync(new URL('journal/',root),{recursive:true});
writeFileSync(new URL('journal/index.html',root),renderIndex(seed));
for(const post of seed){const directory=new URL(`journal/story/${post.slug}/`,root);mkdirSync(directory,{recursive:true});writeFileSync(new URL('index.html',directory),renderArticle(post,seed));}
const home=new URL('index.html',root);let html=readFileSync(home,'utf8');
const stories=seed.slice(0,3).map(p=>`<a href="/journal/story/${escape(p.slug)}/"><div class="workshop-image"><img src="${escape(p.image)}" alt="${escape(p.imageAlt)}" loading="lazy"></div><div class="workshop-meta"><span>${escape(p.category)}</span><span>↗</span></div><h3>${escape(p.title)}</h3><p>${escape(p.excerpt)}</p></a>`).join('');
const section=`<section class="workshop-section" id="workshops"><div class="journal-home-heading"><span class="tiny-label">LATEST UPDATES</span><a class="text-link" href="/journal/">Explore the journal <span>↗</span></a></div><h2 class="mega">IDEAS &amp;<br>EXPERIMENTS.</h2><div class="workshop-grid">${stories}</div></section>`;
html=html.replace(/<section class="workshop-section".*?<\/section>/s,section);
if(!html.includes('/journal/home-journal.css'))html=html.replace('</head>','<link rel="stylesheet" href="/journal/home-journal.css?v=1"></head>');
if(!html.includes('/journal/home-journal.js'))html=html.replace('</body>','<script defer src="/journal/home-journal.js?v=1"></script></body>');
writeFileSync(home,html);
console.log(`Built journal, ${seed.length} article pages, and homepage links.`);
