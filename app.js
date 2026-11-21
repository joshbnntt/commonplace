const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ls={g(k,d){try{return localStorage.getItem(k)??d}catch(e){return d}},s(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const S={entries:[],per:+ls.g('per',4),theme:ls.g('theme','system'),v:{n:'page'},h:[],f:null,sq:'',sf:'all',dl:null,del:null,T:{},ed:false,sw:false,ip:null};
let idb=null,mem=new Map();
/* ---- storage ---- */
const open=()=>new Promise(r=>{try{const q=indexedDB.open('commonplace',2);q.onupgradeneeded=()=>{const d=q.result;if(!d.objectStoreNames.contains('entries'))d.createObjectStore('entries',{keyPath:'id'});if(!d.objectStoreNames.contains('pages'))d.createObjectStore('pages')};q.onsuccess=()=>{idb=q.result;r()};q.onerror=()=>r()}catch(e){r()}});
const all=()=>idb?new Promise(r=>{const q=idb.transaction('entries').objectStore('entries').getAll();q.onsuccess=()=>r(q.result);q.onerror=()=>r([])}):Promise.resolve([...mem.values()]);
const put=e=>{mem.set(e.id,e);if(idb)try{idb.transaction('entries','readwrite').objectStore('entries').put(e)}catch(x){}};
const del=id=>{mem.delete(id);if(idb)try{idb.transaction('entries','readwrite').objectStore('entries').delete(id)}catch(x){}};
const allT=()=>idb?new Promise(r=>{const o={},q=idb.transaction('pages').objectStore('pages').openCursor();q.onsuccess=()=>{const c=q.result;if(c){o[c.key]=c.value;c.continue()}else r(o)};q.onerror=()=>r({})}):Promise.resolve({});
const putT=(n,v)=>{if(idb)try{const o=idb.transaction('pages','readwrite').objectStore('pages');v?o.put(v,n):o.delete(n)}catch(x){}};
/* ---- domain ---- */
const B='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ulid=()=>{let t=Date.now(),s='';for(let i=0;i<10;i++){s=B[t%32]+s;t=Math.floor(t/32)}for(let i=0;i<16;i++)s+=B[Math.random()*32|0];return s};
const slug=(s,n=40)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,n).replace(/-+$/,'');
const commitTag=()=>{const t=$('#tnew');if(!t)return;const s=slug(t.value.replace(/,/g,' '));if(s&&!S.f.tags.includes(s))S.f.tags.push(s);S.f.addTag=false;render()};
const tname=t=>{t=t.replace(/-/g,' ');return t.charAt(0).toUpperCase()+t.slice(1)};
const pad=n=>String(n).padStart(2,'0'),today=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const fdate=d=>{const x=new Date(d+'T00:00');return isNaN(x)?d:x.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})};
const fname=e=>e.date+'-'+(slug(e.quote.split(/\s+/).slice(0,8).join(' '),48)||'entry')+'-'+e.id.slice(-6).toLowerCase()+'.md';
const sorted=()=>S.entries.slice().sort((a,b)=>a.page-b.page||a.order-b.order);
const pages=()=>[...new Set(S.entries.map(e=>e.page))].sort((a,b)=>a-b);
const lastPage=()=>Math.max(1,...S.entries.map(e=>e.page));
const slot=pg=>{const E=S.entries;if(pg)return{page:pg,order:Math.max(0,...E.filter(e=>e.page==pg).map(e=>e.order))+1};const l=lastPage(),c=E.filter(e=>e.page==l).length;return c<S.per?{page:l,order:c+1}:{page:l+1,order:1}};
const autoTopic=p=>{const c={};for(const e of S.entries.filter(e=>e.page==p))for(const t of e.tags)c[t]=(c[t]||0)+1;return Object.keys(c).sort((a,b)=>c[b]-c[a]).slice(0,2).map(tname).join(' · ')};
const topic=p=>S.T[p]||autoTopic(p);
const fld=k=>k=='authors'?'author':'source';
const sk=(k,n)=>k=='authors'?n.trim().split(/\s+/).pop().toLowerCase():n.toLowerCase();
const groups=k=>{const m=new Map();for(const e of S.entries){const ks=k=='tags'?e.tags.map(t=>[t,tname(t)]):e[fld(k)]?[[e[fld(k)],e[fld(k)]]]:[];for(const[a,n]of ks){const g=m.get(a)||{k:a,n,p:new Set,c:0};g.p.add(e.page);g.c++;m.set(a,g)}}return[...m.values()].sort((a,b)=>sk(k,a.n).localeCompare(sk(k,b.n)))};
const pgs=g=>[...g.p].sort((a,b)=>a-b).join(', ');
const listFor=(k,key)=>sorted().filter(e=>k=='tags'?e.tags.includes(key):e[fld(k)]==key);
/* ---- markdown ---- */
const ys=v=>/^[\s\-?:,\[\]{}#&*!|>'"%@`]|[:#]\s|\s$|^(true|false|null|~|[\d.]+)$/i.test(v)||v.includes('\n')?JSON.stringify(v):v;
const toMd=e=>{let y='---\nid: '+e.id+'\n';if(e.tags.length)y+='tags:\n'+e.tags.map(t=>'  - '+t+'\n').join('');for(const k of['author','source','locator'])if(e[k])y+=k+': '+ys(e[k])+'\n';y+='date: '+e.date+'\npage: '+e.page+'\norder: '+e.order+'\n';if(e.see.length)y+='see:\n'+e.see.map(n=>'  - '+n+'\n').join('');y+='created: '+e.created+'\nupdated: '+e.updated+'\n';for(const k of Object.keys(e.extra||{}).sort())y+=k+': '+ys(String(e.extra[k]))+'\n';y+='---\n'+e.quote.split('\n').map(l=>l?'> '+l:'>').join('\n')+'\n';if(e.note)y+='\n'+e.note.split('\n').map((l,i)=>i?l:'→ '+l).join('\n')+'\n';return y};
const sv=v=>{try{return v[0]=='"'?JSON.parse(v):v[0]=="'"?v.slice(1,-1):v}catch(e){return v}};
const fromMd=(txt,name)=>{txt=txt.replace(/\r\n?/g,'\n');const fm={};let body=txt;const m=txt.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
if(m){body=m[2];let key=null,a;for(const l of m[1].split('\n')){if(a=l.match(/^\s+-\s+(.*)$/)){if(key){if(!Array.isArray(fm[key]))fm[key]=[];fm[key].push(sv(a[1]))}}else if(a=l.match(/^([A-Za-z_]+):\s*(.*)$/)){key=a[1];fm[key]=/^\[.*\]$/.test(a[2])?a[2].slice(1,-1).split(',').map(s=>sv(s.trim())).filter(Boolean):a[2]===''?'':sv(a[2])}}}
const L=body.replace(/^\n+/,'').split('\n');let s=L.findIndex(l=>l.startsWith('>')),quote,note='';
if(s<0)quote=body.trim();else{let i=s,q=[];while(i<L.length&&L[i].startsWith('>'))q.push(L[i++].replace(/^> ?/,''));quote=q.join('\n').trim();note=L.slice(i).join('\n').trim().replace(/^(→|->)\s?/,'')}
if(!quote)throw new Error('empty quote');
const tg=[].concat(fm.tags??fm.tag??fm.Tags??[]).flatMap(t=>String(t).split(',')).map(t=>slug(t.replace(/^#/,''))).filter(Boolean);
const known=['id','tags','tag','Tags','author','source','locator','date','page','order','see','created','updated'],extra={};for(const k in fm)if(!known.includes(k))extra[k]=fm[k];
const now=new Date().toISOString();
const e={id:fm.id||ulid(),fileName:name,quote,note,tags:[...new Set(tg)],author:fm.author||'',source:fm.source||'',locator:String(fm.locator||''),date:fm.date||today(),page:+fm.page>=1?+fm.page:0,order:+fm.order>=1?+fm.order:0,see:[...new Set([].concat(fm.see||[]).map(Number).filter(n=>n>=1))].sort((a,b)=>a-b),created:fm.created||now,updated:fm.updated||now,extra};
e.fileName=name||fname(e);return e};
const indexMd=()=>{const g=groups('tags'),by={};for(const x of g)(by[x.n[0].toUpperCase()]??=[]).push(x);let o='# Index\n';for(const l of Object.keys(by).sort())o+='\n## '+l+'\n'+by[l].map(x=>'- '+x.n+': '+pgs(x)).join('\n')+'\n';const u=S.entries.filter(e=>!e.tags.length);if(u.length)o+='\n## Untagged\n- '+[...new Set(u.map(e=>e.page))].sort((a,b)=>a-b).join(', ')+'\n';return o};
const notebookMd=()=>{let o='# Commonplace\n';for(const p of pages()){const t=topic(p);o+='\n## p. '+p+(t?' — '+t:'')+'\n';for(const e of sorted().filter(x=>x.page==p)){o+='\n'+e.quote.split('\n').map(l=>'> '+l).join('\n')+'\n';const r=[e.author,e.source&&'*'+e.source+'*',e.locator].filter(Boolean).join(', ');if(r)o+='\n— '+r+(e.tags.length?' · '+e.tags.map(tname).join(', '):'')+'\n';if(e.note)o+='\n→ '+e.note+'\n'}}return o};
/* ---- io ---- */
const enc=s=>fflate.strToU8(s);
async function save(name,data){try{if(S.dl){await S.dl.save({filename:name,data});toast('Saved')}else{const u=URL.createObjectURL(new Blob([data])),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4e3);toast('Download started')}}catch(e){if(e.code!='declined')toast('Could not save file')}}
function exportZip(){const f={};for(const e of sorted())f['commonplace/entries/'+e.fileName]=enc(toMd(e));f['commonplace/Index.md']=enc(indexMd());f['commonplace/manifest.json']=enc(JSON.stringify({version:1,exportedAt:new Date().toISOString(),entryCount:S.entries.length,pageTitles:S.T}));ls.s('lastExport',Date.now());save('commonplace-'+today()+'.zip',fflate.zipSync(f))}
async function importFiles(files){const items=[];for(const f of files){if(/\.zip$/i.test(f.name)){const z=fflate.unzipSync(new Uint8Array(await f.arrayBuffer()));for(const p in z)items.push([p.split('/').pop(),fflate.strFromU8(z[p])])}else items.push([f.name,await f.text()])}
const r={added:0,updated:0,skipped:0,bad:[]},fresh=[];
for(const[n,t]of items){if(n=='manifest.json'){try{const m=JSON.parse(t);for(const k in m.pageTitles||{})if(!S.T[k]){S.T[k]=m.pageTitles[k];putT(+k,m.pageTitles[k])}}catch(x){}continue}if(!/\.md$/i.test(n)||n=='Index.md')continue;let e;try{e=fromMd(t,n)}catch(x){r.bad.push(n+': '+x.message);continue}const ex=S.entries.find(y=>y.id==e.id);
if(ex){if(e.updated>ex.updated){Object.assign(ex,e,{page:e.page||ex.page,order:e.order||ex.order});put(ex);r.updated++}else r.skipped++}else{fresh.push(e);r.added++}}
fresh.sort((a,b)=>a.fileName.localeCompare(b.fileName));for(const e of fresh){if(!e.page){const s=slot(0);e.page=s.page;e.order=s.order}S.entries.push(e);put(e)}
toast('Imported: '+r.added+' added, '+r.updated+' updated, '+r.skipped+' skipped'+(r.bad.length?', '+r.bad.length+' invalid':''));render()}
/* ---- ui helpers ---- */
let tt;const toast=m=>{const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(tt);tt=setTimeout(()=>t.hidden=true,2600)};
let own=null,nav=0;
const b64=x=>btoa(unescape(encodeURIComponent(x))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64=x=>{try{return decodeURIComponent(escape(atob(x.replace(/-/g,'+').replace(/_/g,'/'))))}catch(e){return''}};
const toHash=v=>({page:()=>'page-'+(v.p||''),entry:()=>'entry-'+v.id,form:()=>S.f&&S.f.id?'edit-'+S.f.id:'new',index:()=>'index-'+(v.k||'tags'),list:()=>'list-'+v.k+'-'+b64(v.key),search:()=>'search-'+S.sf+'-'+b64(S.sq),settings:()=>'settings'}[v.n]||(()=>'page-'))();
const sync=()=>{try{history.replaceState(null,'','#'+toHash(S.v))}catch(e){}};
function route(){if(own===location.hash){own=null;return}const s=location.hash.replace(/^#/,''),i=s.indexOf('-'),k=i<0?s:s.slice(0,i),r=i<0?'':s.slice(i+1);let v={n:'page'};
if(k=='page')v={n:'page',p:+r||undefined};else if(k=='entry')v={n:'entry',id:r};
else if(k=='new'){if(!S.f)S.f=newForm();v={n:'form'}}
else if(k=='edit'){const e=S.entries.find(x=>x.id==r);if(e){if(!S.f||S.f.id!=r)S.f=newForm(e);v={n:'form'}}}
else if(k=='index')v={n:'index',k:r||'tags'};
else if(k=='list'){const j=r.indexOf('-');v={n:'list',k:r.slice(0,j),key:unb64(r.slice(j+1))}}
else if(k=='search'){const j=r.indexOf('-');S.sf=r.slice(0,j)||'all';S.sq=unb64(r.slice(j+1));v={n:'search'}}
else if(k=='settings')v={n:'settings'};
if(v.n!='form')S.f=null;S.v=v;S.del=null;S.ed=false;render();scrollTo(0,0)}
const go=v=>{nav++;S.v=v;S.del=null;S.ed=false;const h='#'+toHash(v);render();scrollTo(0,0);if(location.hash!=h){own=h;try{location.hash=h}catch(e){own=null}}};
function saveHead(){const i=$('#hd');if(!S.ed||!i)return;const p=S.v.p||lastPage(),v=i.value.trim();if(v)S.T[p]=v;else delete S.T[p];putT(p,v||null);S.ed=false;render()}
const back=()=>history.length>1&&nav>0?history.back():go({n:'page'});
const svg=p=>`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const I={s:svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),b:svg('<path d="M15 5l-7 7 7 7"/>'),e:svg('<path d="M4 20l1-4L16 5l3 3L8 19z"/>'),p:svg('<path d="M12 5v14M5 12h14"/>')};
/* ---- markdown (small, safe subset: everything is escaped first) ---- */
const mdi=(s,plain)=>{const st=[],k=h=>'\u0000'+(st.push(h)-1)+'\u0000',A=(u,t)=>k(plain?`<span class="mdl">${t}</span>`:`<a class="mdl" href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`);
let h=esc(String(s??'').replace(/\u0000/g,''))
.replace(/`([^`\n]+)`/g,(_,c)=>k('<code>'+c+'</code>'))
.replace(/\[([^\]\n]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g,(_,t,u)=>A(u,t))
.replace(/(^|[\s(])(https?:\/\/[^\s<]*[^\s<.,;:!?)\]'])/g,(_,p,u)=>p+A(u,u))
.replace(/\*\*(\S(?:[\s\S]*?\S)?)\*\*/g,'<strong>$1</strong>').replace(/(^|\W)__(\S(?:[\s\S]*?\S)?)__(?!\w)/g,'$1<strong>$2</strong>')
.replace(/\*(\S(?:[^*]*?\S)?)\*/g,'<em>$1</em>').replace(/(^|\W)_(\S(?:[^_]*?\S)?)_(?!\w)/g,'$1<em>$2</em>')
.replace(/~~(\S(?:[\s\S]*?\S)?)~~/g,'<del>$1</del>');
return h.replace(/\u0000(\d+)\u0000/g,(_,i)=>st[i])};
const LI=/^\s*([-*+]|\d+[.)])\s+(.*)$/,BLK=/^(```|#{1,6}\s|>|\s*([-*+]|\d+[.)])\s)/,HR=/^\s*([-*_])(\s*\1){2,}\s*$/;
const md=s=>{const L=String(s??'').replace(/\r\n?/g,'\n').split('\n'),o=[];let i=0,m;
while(i<L.length){const l=L[i];
if(!l.trim()){i++;continue}
if(/^```/.test(l)){const b=[];i++;while(i<L.length&&!/^```/.test(L[i]))b.push(L[i++]);i++;o.push('<pre><code>'+esc(b.join('\n'))+'</code></pre>');continue}
if(m=l.match(/^(#{1,6})\s+(.*)$/)){const n=Math.min(m[1].length+2,6);o.push(`<h${n}>${mdi(m[2])}</h${n}>`);i++;continue}
if(HR.test(l)){o.push('<hr>');i++;continue}
if(/^>/.test(l)){const b=[];while(i<L.length&&/^>/.test(L[i]))b.push(L[i++].replace(/^> ?/,''));o.push('<blockquote>'+md(b.join('\n'))+'</blockquote>');continue}
if(m=l.match(LI)){const ol=/\d/.test(m[1]),start=ol?parseInt(m[1]):1,it=[];
while(i<L.length&&(m=L[i].match(LI))&&/\d/.test(m[1])==ol){it.push(m[2]);i++;while(i<L.length&&/^\s+\S/.test(L[i])&&!LI.test(L[i]))it[it.length-1]+='\n'+L[i++].trim()}
const lis=it.map(x=>'<li>'+mdi(x).replace(/\n/g,'<br>')+'</li>').join('');o.push(ol?`<ol${start>1?` start="${start}"`:''}>${lis}</ol>`:`<ul>${lis}</ul>`);continue}
const b=[l];i++;while(i<L.length&&L[i].trim()&&!BLK.test(L[i])&&!HR.test(L[i]))b.push(L[i++]);o.push('<p>'+mdi(b.join('\n')).replace(/\n/g,'<br>')+'</p>')}
return o.join('')};
const mdRow=(s,t)=>{let h=mdi(String(s??'').split('\n').filter(l=>!/^```/.test(l)).map(l=>l.replace(/^#{1,6}\s+/,'').replace(/^>\s?/,'').replace(/^\s*[-*+]\s+/,'• ').replace(/^\s*([-*_])(\s*\1){2,}\s*$/,'')).join('\n').replace(/\n{3,}/g,'\n\n').trim(),1);
if(!t||!t.length)return h;const re=new RegExp('('+t.map(x=>esc(x).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','gi');
return h.split(/(<[^>]+>|&\w+;)/).map(p=>/^(<|&\w+;$)/.test(p)?p:p.replace(re,'<mark>$1</mark>')).join('')};
const hl=(s,t)=>{if(!t||!t.length)return esc(s);const re=new RegExp('('+t.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','gi');return String(s).split(re).map((p,i)=>i%2?'<mark>'+esc(p)+'</mark>':esc(p)).join('')};
/* notes in the Zettelkasten (same site) that cite each entry, read-only */
let CITED={};
const zread=()=>new Promise(r=>{try{const q=indexedDB.open('zettel');q.onupgradeneeded=e=>e.target.transaction.abort();q.onerror=e=>{if(e.preventDefault)e.preventDefault();r({})};q.onblocked=()=>r({});
q.onsuccess=()=>{const d=q.result;if(!d.objectStoreNames.contains('notes')){d.close();return r({})}d.onversionchange=()=>d.close();const g=d.transaction('notes').objectStore('notes').getAll();
g.onsuccess=()=>{d.close();const m={};for(const n of g.result)for(const s of n.sources||[])(m[s.entry]=m[s.entry]||[]).push({id:n.id,title:n.title||'Untitled'});for(const k in m)m[k].sort((a,b)=>a.title.localeCompare(b.title));r(m)};g.onerror=()=>{d.close();r({})}}}catch(e){r({})}});
const loadCited=async()=>{CITED=await zread()};
const citeLinks=(e,max)=>{const c=CITED[e.id]||[];return c.slice(0,max).map(n=>`<a href="notes/#note-${n.id}" class="cl">${esc(n.title)}</a>`).join('')+(c.length>max?`<span class="mut">+${c.length-max} more</span>`:'')};
const refreshView=()=>{const x=document.activeElement;if(S.v.n=='form'||S.v.n=='search'||S.v.n=='settings'||document.querySelector('input[type=file]')||(x&&/^(INPUT|TEXTAREA|SELECT)$/.test(x.tagName)))return;render()};
const refCol=(e,t)=>`<aside class="ref">${e.tags[0]?`<span class="tag">${hl(tname(e.tags[0]),t)}</span>`:''}${e.author?`<span>${hl(e.author,t)}</span>`:''}${e.source?`<span class="mut" style="font-style:italic">${hl(e.source,t)}</span>`:''}<span class="mut">${esc(fdate(e.date))}</span>${e.see[0]?`<button class="lnk" data-a="page" data-n="${e.see[0]}">see p. ${e.see[0]} →</button>`:''}${CITED[e.id]?`<div class="cites"><span class="mut">Cited in</span>${citeLinks(e,3)}</div>`:''}</aside>`;
const row=(e,t)=>`<article class="row"><div><a href="#" class="q" data-a="entry" data-id="${e.id}">“${mdRow(e.quote,t)}”</a>${e.note?`<div class="note">→ ${mdRow(e.note,t)}</div>`:''}</div>${refCol(e,t)}</article>`;
const rail=()=>`<nav class="rail" aria-label="Notebook"><div class="serif" style="font-size:24px">Commonplace</div><div><a href="#" class="rl" data-a="page" data-n="${lastPage()}">Pages</a><a href="#" class="rl" data-a="index" data-k="tags">Index</a><a href="#" class="rl" data-a="settings">Settings</a><a href="notes/" class="rl">Notebook ↗</a></div><div><div class="lbl" style="margin-bottom:8px">Tags</div>${groups('tags').map(g=>`<a href="#" class="rl" data-a="list" data-k="tags" data-key="${esc(g.k)}"><span>${esc(g.n)}</span><span class="mut">${pgs(g)}</span></a>`).join('')||'<span class="mut">None yet</span>'}</div><div class="mut" style="margin-top:auto;font-size:12px">${S.entries.length} entries · ${pages().length} pages</div></nav>`;
const bar=()=>{const n=S.v.n;return`<nav class="bar" aria-label="Main"><button data-a="page" data-n="${lastPage()}" class="${n=='page'?'on':''}">Pages</button><button data-a="index" data-k="tags" class="${n=='index'||n=='list'?'on':''}">Index</button><button data-a="settings" class="${n=='settings'?'on':''}">Settings</button></nav>`};
const topbar=t=>`<header class="top"><div class="serif">${t}</div><button class="ic" data-a="search" aria-label="Search entries">${I.s}</button><button class="btn" data-a="new" style="display:none" id="nb">New entry</button></header>`;
const shell=(inner,fab=1)=>`${rail()}<main class="main">${inner}</main>${fab?`<button class="fab" data-a="new" aria-label="New entry">${I.p}</button>`:''}${bar()}`;
/* ---- views ---- */
const segIx=k=>`<div class="seg" role="group" aria-label="Index by">${['tags','authors','sources','pages'].map(x=>`<button data-a="index" data-k="${x}" class="${x==k?'on':''}" aria-pressed="${x==k}">${tname(x)}</button>`).join('')}</div>`;
const V={
page(){const p=S.v.p||lastPage(),E=sorted().filter(e=>e.page==p),ps=pages(),i=ps.indexOf(p);
const nav=`<span><button class="ic" style="display:inline-flex" data-a="page" data-n="${ps[i-1]}" aria-label="Previous page" ${i>0?'':'disabled'}>${I.b}</button><button class="ic" style="display:inline-flex;transform:scaleX(-1)" data-a="page" data-n="${ps[i+1]}" aria-label="Next page" ${i>=0&&i<ps.length-1?'':'disabled'}>${I.b}</button></span>`;
return shell(`<header class="top"><div class="serif">Commonplace</div><button class="ic" data-a="search" aria-label="Search entries">${I.s}</button><button class="btn" data-a="new" id="nb">New entry</button></header>
<div class="strip"><span class="serif">p. ${p}</span>${S.ed?`<input id="hd" class="in" style="flex:1;margin:0 12px;height:36px" aria-label="Page heading" value="${esc(S.T[p]||'')}" placeholder="${esc(autoTopic(p)||'Heading')}">`:`<button class="lnk lbl" style="flex:1;text-align:left;margin-left:12px;min-height:44px" data-a="edithead" aria-label="Edit page heading">${esc(topic(p))||'Add a heading'}</button>`}${E.length||ps.length>1?nav:''}</div>
${E.length?E.map(e=>row(e)).join(''):`<div class="empty"><p class="serif" style="font-size:24px">Your first page is empty</p><p class="mut">Capture a quote, or bring your notes in from Markdown files.</p><button class="btn" data-a="new">New entry</button> <button class="btn ghost" data-a="sample">Load samples</button> <button class="btn ghost" data-a="settings">Import</button></div>`}`)},
entry(){const e=S.entries.find(x=>x.id==S.v.id);if(!e)return V.page();const P=sorted().filter(x=>x.page==e.page),i=P.indexOf(e);
const r=(l,v)=>v?`<div><dt>${l}</dt><dd>${v}</dd></div>`:'',url=/^https?:\/\/\S+$/.test(e.locator);
const by=[e.author&&`<a href="#" class="ent-au" data-a="list" data-k="authors" data-key="${esc(e.author)}">${esc(e.author)}</a>`,e.source&&`<a href="#" data-a="list" data-k="sources" data-key="${esc(e.source)}"><cite>${esc(e.source)}</cite></a>`,e.locator&&!url&&`<span class="mut">${esc(e.locator)}</span>`].filter(Boolean).join(', ');
return shell(`<header class="top"><button class="crumb" data-a="page" data-n="${e.page}" aria-label="Back to page ${e.page}">${I.b}<span class="crumb-p">p. ${e.page}</span>${topic(e.page)?`<span class="crumb-t">${esc(topic(e.page))}</span>`:''}</button><button class="ic" data-a="edit" data-id="${e.id}" aria-label="Edit entry">${I.e}</button></header>
<article class="ent">
<div class="ent-eye">${e.tags.map(t=>`<a href="#" class="ent-tag" data-a="list" data-k="tags" data-key="${esc(t)}">${esc(tname(t))}</a>`).join('')}<span class="lbl">${esc(fdate(e.date))}</span></div>
<blockquote class="ent-q md">${md(e.quote)}</blockquote>
${by?`<p class="ent-by"><span aria-hidden="true">— </span>${by}</p>`:''}
${e.note?`<section class="ent-note"><h2 class="lbl">Note</h2><div class="md">${md(e.note)}</div></section>`:''}
<div class="ent-cta"><a class="btn" href="notes/#new-${e.id}" style="display:inline-flex;align-items:center;text-decoration:none">Write a note about this</a></div>
<dl class="ent-dl">${url?r('Link',`<a class="mdl" href="${esc(e.locator)}" target="_blank" rel="noopener noreferrer">${esc(e.locator.replace(/^https?:\/\/(www\.)?/,''))}</a>`):''}${r('See also',e.see.map(n=>`<button class="lnk" data-a="page" data-n="${n}">p. ${n} →</button>`).join(' '))}${r('Cited in',(CITED[e.id]||[]).length?`<div class="cites">${citeLinks(e,20)}</div>`:'')}</dl>
<nav class="ent-nav" aria-label="Entries on this page"><button class="lnk big" data-a="entry" data-id="${(P[i-1]||{}).id}" ${i>0?'':'disabled'}>‹ Previous</button><span class="mut" style="font-size:12px">${i+1} of ${P.length} on this page</span><button class="lnk big" data-a="entry" data-id="${(P[i+1]||{}).id}" ${i<P.length-1?'':'disabled'}>Next ›</button></nav>
<footer class="ent-tools">
<div class="chips" style="align-items:center"><label class="lbl" for="mv">Move to page</label><input id="mv" class="in" type="number" min="1" style="width:90px" value="${e.page}"><button class="btn ghost" data-a="move" data-id="${e.id}">Move</button></div>
<div class="chips"><button class="btn ghost" data-a="copyq" data-id="${e.id}">Copy quote</button><button class="btn ghost" data-a="copymd" data-id="${e.id}">Copy as Markdown</button><button class="btn ghost" data-a="del" data-id="${e.id}">${S.del==e.id?'Tap again to delete':'Delete'}</button></div>
</footer></article>`,0)},
form(){const f=S.f,tags=[...new Set([...groups('tags').map(g=>g.k),...f.tags])],e=f.id?null:slot(+f.page||0);
const inp=(k,l,ph='',t='text',list='')=>`<div class="fld"><label class="lbl" for="f-${k}">${l}</label><input class="in" id="f-${k}" data-f="${k}" type="${t}" value="${esc(f[k])}" placeholder="${ph}" ${list?`list="${list}"`:''}></div>`;
return`<main class="main" style="max-width:640px;margin:0 auto;width:100%"><header class="top"><button class="lnk big" data-a="cancel" style="color:var(--muted)">Cancel</button><div class="serif" style="font-size:20px;text-align:center">${f.id?'Edit entry':'New entry'}</div><button class="btn" data-a="save" ${f.quote.trim()?'':'disabled style="opacity:.4"'}>Save</button></header>
<div class="fld"><label class="lbl" for="f-quote">Quote <span class="mdhint">Markdown</span></label><textarea class="qin" id="f-quote" data-f="quote">${esc(f.quote)}</textarea></div>
<div class="fld"><span class="lbl">Tag</span><div class="chips">${tags.map(t=>`<button class="chip" data-a="tag" data-t="${esc(t)}" aria-pressed="${f.tags.includes(t)}">${esc(tname(t))}</button>`).join('')}${f.addTag?`<input class="in" id="tnew" aria-label="New tag" style="width:140px" placeholder="New tag" enterkeyhint="done" autocomplete="off" autocapitalize="none"><button class="chip" data-a="addtag" style="min-height:44px">Add</button>`:`<button class="chip" data-a="newtag" style="border-style:dashed;color:var(--muted)">+ New</button>`}</div></div>
${inp('author','Author','','text','dl-a')}${inp('source','Source','','text','dl-s')}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">${inp('locator','Page or URL','p. 91')}${inp('date','Date','','date')}</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">${inp('see','See also','12, 31')}${inp('page','Notebook page','auto','number')}</div>
${f.showNote||f.note?`<div class="fld"><label class="lbl" for="f-note">Note <span class="mdhint">Markdown</span></label><textarea class="in" id="f-note" data-f="note" style="height:90px">${esc(f.note)}</textarea></div>`:`<button class="lnk big" data-a="addnote">+ Add a note</button>`}
<datalist id="dl-a">${groups('authors').map(g=>`<option value="${esc(g.n)}">`).join('')}</datalist><datalist id="dl-s">${groups('sources').map(g=>`<option value="${esc(g.n)}">`).join('')}</datalist>
<p class="mut" style="font-size:12px">${e?`Will be added to p. ${e.page} · entry ${e.order} of ${S.entries.filter(x=>x.page==e.page).length+1}`:'Editing an existing entry'}</p></main>`},
index(){const k=S.v.k;if(k=='pages')return V.pagesIndex();const G=groups(k);let pl='';
return shell(`<header class="top"><div class="serif">Index</div><button class="ic" data-a="search" aria-label="Search entries">${I.s}</button></header>
${segIx(k)}
<div style="border-bottom:1px solid var(--rule)">${G.map(g=>{const l=sk(k,g.n)[0].toUpperCase(),s=l!=pl;pl=l;return`<div class="ix"><span class="g serif">${s?esc(l):''}</span><a href="#" class="n" data-a="list" data-k="${k}" data-key="${esc(g.k)}">${esc(g.n)}</a><span style="color:var(--accent)">${pgs(g)}</span></div>`}).join('')||'<p class="mut">Nothing here yet.</p>'}</div>
<p class="mut" style="font-size:12px;margin-top:14px">${groups('tags').length} tags · ${S.entries.length} entries · ${pages().length} pages</p>`)},
pagesIndex(){const ps=pages();return shell(`<header class="top"><div class="serif">Index</div><button class="ic" data-a="search" aria-label="Search entries">${I.s}</button></header>
${segIx('pages')}<div style="border-bottom:1px solid var(--rule)">${ps.map(p=>{const E=S.entries.filter(e=>e.page==p),c={};for(const e of E)for(const t of e.tags)c[t]=(c[t]||0)+1;const tg=Object.keys(c).sort((a,b)=>c[b]-c[a]),t=topic(p);return`<a href="#" class="ix" style="min-height:64px;padding:8px 0;gap:12px" data-a="page" data-n="${p}"><span class="serif" style="width:44px;font-size:20px;color:var(--muted)">${p}</span><span style="flex:1;min-width:0"><span class="serif" style="display:block;font-size:20px">${esc(t)||'Untitled'}</span><span class="mut" style="display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(tg.map(tname).join(' · '))||'No tags'}</span></span><span class="mut" style="font-size:12px">${E.length} ${E.length==1?'entry':'entries'}</span></a>`}).join('')||'<p class="mut">No pages yet.</p>'}</div>
<p class="mut" style="font-size:12px;margin-top:14px">${ps.length} pages · ${S.entries.length} entries</p>`)},
list(){const{k,key}=S.v,E=listFor(k,key);return shell(`<header class="top"><button class="lnk big" data-a="back" style="display:flex;align-items:center;gap:6px;color:var(--ink)">${I.b}Index</button></header><div class="strip"><span class="serif">${esc(k=='tags'?tname(key):key)}</span><span class="mut">${E.length} ${E.length==1?'entry':'entries'}</span></div>${E.map(e=>row(e)).join('')}`)},
search(){return shell(`<header class="top"><label style="flex:1;display:flex;align-items:center;gap:10px;height:44px;padding:0 12px;border:1px solid var(--accent);border-radius:8px">${I.s}<input id="sq" type="search" class="in" style="border:0;height:40px" aria-label="Search entries" value="${esc(S.sq)}" placeholder="Search quotes, authors, tags"></label><button class="lnk big" data-a="back" style="color:var(--muted)">Cancel</button></header><div class="chips" role="group" aria-label="Filter">${['all','quotes','tags','notes','authors'].map(x=>`<button class="chip" data-a="sf" data-x="${x}" aria-pressed="${S.sf==x}">${tname(x)}</button>`).join('')}</div><div id="res" style="margin-top:24px"></div>`,0)},
settings(){const le=+ls.g('lastExport',0),old=!le||Date.now()-le>2592e6,st=[['Entries',S.entries.length],['Pages',pages().length],['Tags',groups('tags').length],['Authors',groups('authors').length],['Sources',groups('sources').length]],nt=Object.keys(S.T).length;
return shell(`<header class="top"><div class="serif">Settings</div></header>
<section class="sec"><h2>Your notebook</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:12px">${st.map(([k,v])=>`<div style="border:1px solid var(--rule);border-radius:8px;padding:12px"><div class="serif" style="font-size:26px">${v}</div><div class="lbl">${k}</div></div>`).join('')}</div></section>
<section class="sec"><h2>Notebook</h2><p class="mut">Your own notes, written from these entries.</p><a href="notes/" style="color:var(--accent)">Open the Zettelkasten →</a></section>
<section class="sec"><h2>Download your notes</h2><p class="mut">${le?'Last backup: '+new Date(le).toLocaleDateString()+'.':'No backup yet.'}${old&&S.entries.length?' A fresh backup is a good idea.':''}</p><div class="chips"><button class="btn" data-a="export">Backup zip</button><button class="btn ghost" data-a="exportnb">Readable notebook (.md)</button><button class="btn ghost" data-a="copyall">Copy all as Markdown</button></div><p class="mut" style="font-size:12px">The zip holds one Markdown file per entry, an index and your page headings, and can be imported back.</p></section>
<section class="sec"><h2>Import</h2><label class="btn ghost" style="display:inline-flex;align-items:center;cursor:pointer">Choose files<input type="file" id="imp" accept=".zip,.md,.json,application/zip,application/x-zip-compressed,text/markdown,text/plain,application/octet-stream" multiple hidden></label><p class="mut" style="font-size:12px">Accepts a backup zip or Markdown entry files. Existing entries are replaced only by newer versions.</p></section>
<section class="sec"><h2>Page headings</h2><p class="mut">Each page shows a heading. By default it lists the most-used tags on that page. Tap the heading on any page to write your own.</p>${nt?`<button class="btn ghost" data-a="resethead">Reset ${nt} custom ${nt==1?'heading':'headings'}</button>`:''}</section>
<section class="sec"><h2>Notebook</h2><label class="lbl" for="per">Entries per page for new entries</label><br><select id="per" class="in" style="width:120px">${Array.from({length:12},(_,i)=>`<option ${i+1==S.per?'selected':''}>${i+1}</option>`).join('')}</select></section>
<section class="sec"><h2>Appearance</h2><div class="seg" style="max-width:320px">${['system','light','dark'].map(x=>`<button data-a="theme" data-x="${x}" class="${S.theme==x?'on':''}" aria-pressed="${S.theme==x}">${tname(x)}</button>`).join('')}</div></section>
<section class="sec"><h2>App</h2><p class="mut">${S.sw?'Offline support is active. The app works without a connection.':'Offline support runs only in the hosted, installable version of the app.'}</p>${S.ip?'<button class="btn" data-a="install">Install app</button>':'<p class="mut" style="font-size:12px">To install, use your browser’s Install option, or on iPhone choose Share, then Add to Home Screen.</p>'}<button class="btn ghost" data-a="persist" style="margin-top:8px">Request persistent storage</button>${idb?'':'<p><b>Storage is unavailable; changes last only for this session.</b></p>'}</section>
<section class="sec"><h2>Danger zone</h2><div class="fld" style="max-width:320px"><label class="lbl" for="wipe">Type DELETE to erase everything</label><input class="in" id="wipe" autocomplete="off"></div><button class="btn ghost" data-a="wipe">Delete all data</button></section>`,0)}
};
const lev=(a,b)=>{const m=a.length,n=b.length,d=Array.from({length:m+1},(_,i)=>[i]);for(let j=1;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]==b[j-1]?0:1));return d[m][n]};
const fz=(h,x)=>{if(h.includes(x))return 2;if(x.length<4)return 0;const tol=x.length>=8?2:1;return h.split(/[^\p{L}\p{N}]+/u).some(w=>w&&(lev(x,w.slice(0,x.length))<=tol||lev(x,w)<=tol))?1:0};
function results(){const q=S.sq.trim().toLowerCase(),t=q.split(/\s+/).filter(Boolean),f=S.sf;if(!t.length)return'<p class="mut" style="font-size:12px">Searches quotes, authors, sources, tags and your notes.</p>';
const fields={all:e=>[e.quote,e.note,e.author,e.source,e.tags.map(tname).join(' ')],quotes:e=>[e.quote],notes:e=>[e.note],authors:e=>[e.author],tags:e=>e.tags.map(tname)};
const hit=sorted().map(e=>{const h=fields[f](e).join(' ').toLowerCase();let sc=0;for(const x of t){const v=fz(h,x);if(!v)return null;sc+=v}return[e,sc]}).filter(Boolean).sort((a,b)=>b[1]-a[1]).map(a=>a[0]);
const tg=['all','tags'].includes(f)?groups('tags').filter(g=>g.n.toLowerCase().includes(q)):[];
if(!hit.length&&!tg.length)return'<p class="mut">No matches. Check the spelling or try another filter.</p>';
return(tg.length?`<section class="sec"><h2>Tag</h2>${tg.map(g=>`<div class="ix"><a href="#" class="n" data-a="list" data-k="tags" data-key="${esc(g.k)}">${hl(g.n,t)}</a><span style="color:var(--accent)">${pgs(g)}</span></div>`).join('')}</section>`:'')+(hit.length?`<section class="sec"><h2>${f=='all'||f=='quotes'?'Entries':tname(f)} (${hit.length})</h2>${hit.map(e=>row(e,t)).join('')}</section>`:'')}
function render(){const v=S.v.n==='form'?'form':S.v.n;$('#app').innerHTML=(V[v]||V.page)();if(v=='form'&&!S.f.id&&!S.f.quote&&document.activeElement===document.body)$('#f-quote')?.focus();if(v=='search'){const i=$('#sq');i.focus();i.setSelectionRange(99,99);$('#res').innerHTML=results()}}
/* ---- events ---- */
const newForm=e=>({id:e?.id||null,quote:e?.quote||'',note:e?.note||'',tags:e?[...e.tags]:[],author:e?.author||'',source:e?.source||'',locator:e?.locator||'',date:e?.date||today(),see:e?e.see.join(', '):'',page:e?String(e.page):'',showNote:false,addTag:false,orig:e?e.page:0});
function saveForm(){if(S.f&&S.f.addTag){const t=$('#tnew');if(t&&t.value.trim()){const s=slug(t.value.replace(/,/g,' '));if(s&&!S.f.tags.includes(s))S.f.tags.push(s)}}const f=S.f;if(!f.quote.trim())return;const see=f.see.split(/[,\s]+/).filter(Boolean).map(Number);if(see.some(n=>!Number.isInteger(n)||n<1))return toast('See also: use page numbers like 12, 31');
const now=new Date().toISOString(),v={quote:f.quote.trim(),note:f.note.trim(),tags:f.tags,author:f.author.trim(),source:f.source.trim(),locator:f.locator.trim(),date:f.date||today(),see:[...new Set(see)].sort((a,b)=>a-b),updated:now};
let e;if(f.id){e=S.entries.find(x=>x.id==f.id);Object.assign(e,v);const p=+f.page;if(p>=1&&p!=f.orig){const s=slot(p);e.page=s.page;e.order=s.order}put(e);S.f=null;go({n:'entry',id:e.id});toast('Saved')}
else{e={id:ulid(),extra:{},created:now,...v,...slot(+f.page||0)};e.fileName=fname(e);S.entries.push(e);put(e);S.f=null;go({n:'page',p:e.page});toast('Added to p. '+e.page)}}
const SAMPLES=[['It is not enough to be industrious; so are the ants. What are you industrious about?','craft','Henry David Thoreau','Letter to H. G. O. Blake, 1860','2026-10-27','Ask this at the start of the day, not the end.'],['We suffer more often in imagination than in reality.','imagination','Seneca','Letters to Lucilius, 13','2026-10-24',''],['I have gathered a posy of other men’s flowers, and nothing but the thread that binds them is my own.','craft','Michel de Montaigne','Essays, “Of Experience”','2026-10-21','The thread is the point.']];
document.addEventListener('click',async ev=>{const el=ev.target.closest('[data-a]');if(!el||el.disabled)return;ev.preventDefault();const a=el.dataset.a,d=el.dataset;
switch(a){case'page':go({n:'page',p:+d.n});break;case'entry':go({n:'entry',id:d.id});break;case'new':S.f=newForm();go({n:'form'});break;
case'edit':S.f=newForm(S.entries.find(e=>e.id==d.id));go({n:'form'});break;case'cancel':{const f=S.f,dirty=f&&(f.quote||f.author||f.source||f.note);if(dirty&&!f.id&&!confirm('Discard this entry?'))break;S.f=null;back();break}
case'save':saveForm();break;case'tag':{const f=S.f,i=f.tags.indexOf(d.t);i<0?f.tags.push(d.t):f.tags.splice(i,1);render();break}
case'addtag':commitTag();break;case'newtag':S.f.addTag=true;render();$('#tnew').focus();break;case'addnote':S.f.showNote=true;render();$('#f-note').focus();break;
case'index':go({n:'index',k:d.k});break;case'list':go({n:'list',k:d.k,key:d.key});break;case'back':back();break;
case'search':go({n:'search'});break;case'sf':S.sf=d.x;sync();render();break;case'theme':S.theme=d.x;ls.s('theme',d.x);document.documentElement.dataset.theme=d.x=='system'?'':d.x;render();break;
case'copyq':{const e=S.entries.find(x=>x.id==d.id);cp('“'+e.quote+'”'+(e.author||e.source?'\n— '+[e.author,e.source].filter(Boolean).join(', '):''));break}
case'settings':go({n:'settings'});break;case'move':{const e=S.entries.find(x=>x.id==d.id),p=Math.floor(+$('#mv').value);if(!(p>=1)||p==e.page)break;const z=slot(p);e.page=z.page;e.order=z.order;e.updated=new Date().toISOString();put(e);render();toast('Moved to p. '+p);break}case'edithead':S.ed=true;render();$('#hd').focus();break;case'exportnb':save('commonplace-notebook-'+today()+'.md',notebookMd());break;case'copyall':cp(notebookMd());break;case'resethead':for(const k in S.T)putT(+k,null);S.T={};render();toast('Headings reset');break;case'install':if(S.ip){S.ip.prompt();S.ip=null;render()}break;case'copymd':cp(toMd(S.entries.find(x=>x.id==d.id)));break;
case'del':if(S.del==d.id){S.entries=S.entries.filter(e=>e.id!=d.id);del(d.id);S.del=null;go({n:'page'});toast('Entry deleted')}else{S.del=d.id;render()}break;
case'export':exportZip();break;case'persist':{try{const ok=await navigator.storage.persist();toast(ok?'Storage is now persistent':'The browser declined')}catch(e){toast('Not supported here')}break}
case'wipe':if($('#wipe').value=='DELETE'){for(const e of S.entries)del(e.id);S.entries=[];go({n:'page'});toast('All data deleted')}else toast('Type DELETE to confirm');break;
case'sample':for(const s of SAMPLES){const now=new Date().toISOString(),e={id:ulid(),extra:{},quote:s[0],note:s[5],tags:[s[1]],author:s[2],source:s[3],locator:'',date:s[4],see:[],created:now,updated:now,...slot(0)};e.fileName=fname(e);S.entries.push(e);put(e)}render();break}});
async function cp(t){try{await navigator.clipboard.writeText(t);toast('Copied')}catch(e){toast('Copy is blocked in this view')}}
document.addEventListener('input',ev=>{const t=ev.target;if(t.dataset.f&&S.f){S.f[t.dataset.f]=t.value;if(t.dataset.f=='quote'){const b=document.querySelector('[data-a=save]');b.disabled=!t.value.trim();b.style.opacity=t.value.trim()?1:.4}}else if(t.id=='tnew'&&t.value.includes(',')){commitTag()}else if(t.id=='sq'){S.sq=t.value;sync();$('#res').innerHTML=results()}});
document.addEventListener('change',async ev=>{const t=ev.target;if(t.id=='per'){S.per=+t.value;ls.s('per',S.per)}else if(t.id=='imp'){const fl=[...t.files];if(!fl.length){toast('No file was received. Try choosing it again.');return}toast('Reading '+fl.length+' file'+(fl.length>1?'s':'')+'…');try{await importFiles(fl)}catch(x){toast('Could not import that file: '+(x&&x.message||x))}t.value=''}});
document.addEventListener('focusout',ev=>{if(ev.target.id=='hd')saveHead()});
document.addEventListener('keydown',ev=>{const t=ev.target;if(t.id=='hd'){if(ev.key=='Enter')saveHead();else if(ev.key=='Escape'){S.ed=false;render()}return}if((ev.key=='Enter'||ev.keyCode==13)&&t.id=='tnew'){ev.preventDefault();commitTag()}
else if(ev.key=='Enter'&&(ev.metaKey||ev.ctrlKey)&&S.f)saveForm();
else if(ev.key=='Escape'&&S.v.n=='search')back();
else if(!/INPUT|TEXTAREA|SELECT/.test(t.tagName)&&!S.f){if(ev.key=='n')document.querySelector('[data-a=new]')?.click();else if(ev.key=='/'){ev.preventDefault();go({n:'search'})}
else if(S.v.n=='page'&&(ev.key=='ArrowLeft'||ev.key=='ArrowRight')){const ps=pages(),p=S.v.p||lastPage(),i=ps.indexOf(p)+(ev.key=='ArrowLeft'?-1:1);if(ps[i])go({n:'page',p:ps[i]})}}});
let sx=null;document.addEventListener('touchstart',e=>sx=e.touches[0].clientX,{passive:true});
document.addEventListener('touchend',e=>{if(sx==null||S.v.n!='page')return;const dx=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(dx)<80)return;const ps=pages(),i=ps.indexOf(S.v.p||lastPage())+(dx>0?-1:1);if(ps[i])go({n:'page',p:ps[i]})},{passive:true});
addEventListener('beforeinstallprompt',e=>{e.preventDefault();S.ip=e;if(S.v.n=='settings')render()});
(async()=>{if(S.theme!='system')document.documentElement.dataset.theme=S.theme;await open();S.entries=await all();S.T=await allT();await loadCited();route();addEventListener('hashchange',route);addEventListener('pageshow',e=>{if(e.persisted)loadCited().then(refreshView)});document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadCited().then(refreshView)});if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{S.sw=true;if(S.v.n=='settings')render()}).catch(()=>{});try{S.dl=typeof claude!='undefined'?await claude.use('downloads'):null}catch(e){S.dl=null}if(S.v.n=='settings')render()})();
