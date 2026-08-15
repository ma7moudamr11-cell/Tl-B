(function(){
'use strict';
const D=window.TECH_LIBRARY||{categories:[],services:[],glossary:[],phoneCodes:[]};
/* UPDATE 6.6: Centralized developer info */
const DEVELOPER_INFO={
  name:'1shad0w.x1',
  role:'مطور ويب ومطور مشروع Tech Library',
  email:'contact.with.1shad0w.x1@gmail.com',
  facebook:'https://www.facebook.com/profile.php?id=61592938689006&mibextid=ZbWKwL',
  description:'مطور متخصص في بناء التطبيقات التفاعلية والمكتبات الذكية'
};
const $=(s,r=document)=>r.querySelector(s); const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const root=document.documentElement;
const norm=s=>String(s??'').toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[ـ]/g,'').replace(/\s+/g,' ').trim();
const escape=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const catMap=Object.fromEntries((D.categories||[]).map(c=>[c.id,c]));
const allTerms=()=>D.glossary||[]; const allServices=()=>D.services||[];

/* ---------- StorageManager ---------- */
const DB_NAME='tech-library-db',DB_VERSION=2;
const stores=['favorites','history','memory','userProfile'];
let dbPromise;
function openDB(){
 if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  if(!('indexedDB' in window)){resolve(null);return;}
  const req=indexedDB.open(DB_NAME,DB_VERSION);
  req.onupgradeneeded=()=>{const db=req.result;stores.forEach(s=>{if(!db.objectStoreNames.contains(s))db.createObjectStore(s,{keyPath:'id',autoIncrement:true})})};
  req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
 }); return dbPromise;
}
async function idbGetAll(store){const db=await openDB();if(!db)return[];return new Promise((res,rej)=>{const r=db.transaction(store,'readonly').objectStore(store).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})}
async function idbPut(store,value){const db=await openDB();if(!db)return;return new Promise((res,rej)=>{const r=db.transaction(store,'readwrite').objectStore(store).put(value);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function idbClear(store){const db=await openDB();if(!db)return;return new Promise((res,rej)=>{const r=db.transaction(store,'readwrite').objectStore(store).clear();r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
const Settings={
 defaults:{theme:'dark',background:'network',particles:true,effects:true},
 get(){try{return {...this.defaults,...JSON.parse(localStorage.getItem('tl_settings')||'{}')}}catch{return {...this.defaults}}},
 set(v){localStorage.setItem('tl_settings',JSON.stringify(v));applySettings();particles(true)},
 reset(){localStorage.removeItem('tl_settings');applySettings();particles(true)}
};
function applySettings(){const s=Settings.get();document.body.dataset.theme=s.theme||'dark';document.body.dataset.background=s.background||'network';root.classList.toggle('reduced',!s.effects);root.classList.toggle('no-particles',!s.particles)}
async function getUserName(){const rows=await idbGetAll('userProfile');return rows.find(x=>x.key==='name')?.value||''}
async function setUserName(name){const db=await openDB();if(!db)return;const rows=await idbGetAll('userProfile');for(const x of rows){await new Promise((res,rej)=>{const r=db.transaction('userProfile','readwrite').objectStore('userProfile').delete(x.id);r.onsuccess=res;r.onerror=()=>rej(r.error)})}if(name.trim())await idbPut('userProfile',{key:'name',value:name.trim(),createdAt:Date.now()})}
async function favIds(){return (await idbGetAll('favorites')).map(x=>x.serviceId)}
async function toggleFav(id){const db=await openDB();if(!db)return false;const all=await idbGetAll('favorites');const hit=all.find(x=>x.serviceId===id);if(hit){await new Promise((res,rej)=>{const r=db.transaction('favorites','readwrite').objectStore('favorites').delete(hit.id);r.onsuccess=res;r.onerror=()=>rej(r.error)});toast('⭐ تمت إزالة الخدمة من المفضلة.');return false}await idbPut('favorites',{serviceId:id,createdAt:Date.now()});toast('⭐ تمت الإضافة إلى المفضلة.');return true}
async function saveHistory(q){const clean=String(q).trim();if(!clean)return;const all=await idbGetAll('history');const same=all.filter(x=>norm(x.q)===norm(clean));const db=await openDB();for(const x of same){await new Promise((res,rej)=>{const r=db.transaction('history','readwrite').objectStore('history').delete(x.id);r.onsuccess=res;r.onerror=()=>rej(r.error)})}await idbPut('history',{q:clean,createdAt:Date.now()});const latest=(await idbGetAll('history')).sort((a,b)=>b.createdAt-a.createdAt);if(db&&latest.length>20){for(const x of latest.slice(20))await new Promise((res,rej)=>{const r=db.transaction('history','readwrite').objectStore('history').delete(x.id);r.onsuccess=res;r.onerror=()=>rej(r.error)})}}
async function purgeConversationHistory(){const all=await idbGetAll('history');const db=await openDB();if(!db)return;for(const x of all){const q=String(x.q||'').trim();if(!q)continue;let conversational=false;try{const t=intent(q);conversational=['smart','user-name','about-tl','outside','developer','about-library'].includes(t)||isSmartQuestion(q);}catch{conversational=false}if(conversational){await new Promise((res,rej)=>{const r=db.transaction('history','readwrite').objectStore('history').delete(x.id);r.onsuccess=res;r.onerror=()=>rej(r.error)})}}}
async function saveMemory(data){await idbPut('memory',{...data,createdAt:Date.now()});const all=(await idbGetAll('memory')).sort((a,b)=>b.createdAt-a.createdAt);const db=await openDB();if(db&&all.length>12){for(const x of all.slice(12))await new Promise((res,rej)=>{const r=db.transaction('memory','readwrite').objectStore('memory').delete(x.id);r.onsuccess=res;r.onerror=()=>rej(r.error)})}}
function toast(text){const wrap=$('#toasts');if(!wrap)return;const el=document.createElement('div');el.className='toast';el.textContent=text;wrap.appendChild(el);setTimeout(()=>el.remove(),2600)}

/* ---------- Search / ranking ---------- */
const serviceText=x=>[x.name,x.nameAr,x.description,x.type,x.category,...(x.features||[]),...(x.keywords||[]),...(x.aliases||[])].map(norm).join(' ');
const termText=x=>[x.term,x.termAr,x.description,x.category,...(x.keywords||[]),...(x.aliases||[])].map(norm).join(' ');
const aliases={
  /* برامج وتطبيقات */
  'سامسونج':'samsung','شاومي':'xiaomi','شاومي ريدمي':'xiaomi','بايثون':'python','جافاسكربت':'javascript','جافا سكريبت':'javascript','سي بلس بلس':'c++','شات جي بي تي':'chatgpt','نوتبوك':'notebooklm','واي فاي':'wifi',
  /* أقسام ومفاهيم */
  'شبكات':'network','حماية':'security','امن':'security','العاب':'gaming','ألعاب':'gaming','تعليم':'education','ذكاء اصطناعي':'ai','تطبيق':'app','برنامج':'app','مصطلح':'glossary','مواقع مفيده':'useful sites','مواقع مفيدة':'useful sites','متابعين تيك توك':'tiktok followers','لايكات فيس':'facebook likes',
  /* مرادفات إضافية */
  'كود':'code','برمجة':'programming','مبرمج':'developer','تطوير':'development','صور':'images','فيديو':'video','صوت':'audio','موسيقى':'music','خط':'font','تصميم':'design','الوان':'colors','ألوان':'colors',
  'حفظ':'save','تحميل':'download','رفع':'upload','ارسال':'send','استقبال':'receive','حذف':'delete','نسخ':'copy','لصق':'paste',
  'انترنت':'internet','موقع':'website','ويب':'web','اون لاين':'online','اوفلاين':'offline','سيرفر':'server','ديتابيس':'database',
  'جديد':'new','قديم':'old','حديث':'modern','قديم':'legacy','اساسي':'basic','متقدم':'advanced','احترافي':'professional',
  'مجاني':'free','مدفوع':'paid','مشروط':'freemium','اشتراك':'subscription',
  /* اختصارات */
  'pdf':'pdf','png':'png','jpg':'jpeg','zip':'zip','apk':'apk','hd':'hd','4k':'4k','3d':'3d','2d':'2d','ai':'ai','ml':'machine learning','vr':'virtual reality','ar':'augmented reality',
  /* UPDATE 6.5.1: broader Arabic/English vocabulary */
  'جوجل':'google','بينج':'bing','فيسبوك':'facebook','تويتر':'twitter','اكس':'x','انستجرام':'instagram','انستغرام':'instagram','واتساب':'whatsapp','واتس':'whatsapp','تليجرام':'telegram','تلجرام':'telegram','جيميل':'gmail','اوتلوك':'outlook','درايف':'google drive','دروبوكس':'dropbox','امازون':'amazon','أمازون':'amazon','ايباي':'ebay','باي بال':'paypal','سترايب':'stripe','يوتيوب':'youtube','نتفليكس':'netflix','سبوتيفاي':'spotify','تويتش':'twitch','ويكيبيديا':'wikipedia','خان اكاديمي':'khan academy','لينكد':'linkedin','ريديت':'reddit','كورا':'quora','ستاك اوفرفلو':'stack overflow','ميديوم':'medium','جيتهاب':'github','جيتهاب بيجز':'github pages','جوجل مابس':'google maps','بوكينج':'booking','ايربي ان بي':'airbnb','ام دي ان':'mdn','ان بي ام':'npm','دبليو ثري سكولز':'w3schools','فايروس توتال':'virustotal','كلاودفلير':'cloudflare','هجنغ فيس':'hugging face','هَجِنغ فيس':'hugging face',
  'اداة':'tool','ادوات':'tools','موقع':'website','منصة':'platform','تعلم':'education','شرح':'explanation','كورس':'course','دروس':'tutorial','ذكاء':'ai','شبكه':'network','شبكات':'network','واي فاي':'wifi','انترنت':'internet','حساب':'account','حسابات':'accounts','تحليل':'analytics','صور':'images','فيديوهات':'video','موسيقى':'music','صوتيات':'audio','مطورين':'developers','مطور':'developer'
};
function expandQuery(q){let n=norm(q);for(const [a,b] of Object.entries(aliases)){if(n.includes(a))n+=' '+b}return n}
function scoreItem(x,q,isTerm=false){const raw=norm(q),n=expandQuery(q),name=norm(isTerm?x.term:x.name),nameAr=norm(isTerm?x.termAr:x.nameAr),fields=isTerm?termText(x):serviceText(x);if(!raw)return 0;let score=0;const exact=[raw,name,nameAr].includes(raw);if(exact)score+=220;if(name===raw||nameAr===raw)score+=100;const tokens=raw.split(/\s+/).filter(Boolean);if(tokens.length>1){const allTokens=tokens.every(t=>name.includes(t)||nameAr.includes(t)||fields.includes(t));if(allTokens)score+=90}if(fields.includes(raw))score+=70;for(const t of tokens){if(t.length<2)continue;if(name===t||nameAr===t)score+=60;else if(name.includes(t)||nameAr.includes(t))score+=36;else if(fields.includes(t))score+=8}if(n!==raw&&fields.includes(n))score+=75;return score}
/* UPDATE 6.1: Improved scoring thresholds (55 instead of 22) */
function searchServices(q,limit=12){const results=allServices().map(x=>[x,scoreItem(x,q)]).filter(x=>x[1]>=55).sort((a,b)=>b[1]-a[1]).slice(0,limit).map(x=>x[0]);return results}
function searchTerms(q,limit=8){const results=allTerms().map(x=>[x,scoreItem(x,q,true)]).filter(x=>x[1]>=55).sort((a,b)=>b[1]-a[1]).slice(0,limit).map(x=>x[0]);return results}
function findCategory(q){const n=expandQuery(q);return D.categories.map(c=>{const text=[c.id,c.name,c.description,...(c.keywords||[])].map(norm).join(' ');let s=0;for(const t of n.split(/\s+/)){if(t&&text.includes(t))s+=t.length>3?25:12}if(norm(c.name)===norm(q))s+=100;return[c,s]}).sort((a,b)=>b[1]-a[1])[0]||null}
function libraryHref(item){return `library.html?item=${encodeURIComponent(item.id)}`}
/* UPDATE 6.9: Better favorites UX */
function serviceCard(x){const c=catMap[x.category];const fav=window.__favSet?.has(x.id);return `<article class="card"><div class="icon">${x.icon||'🧰'}</div><span class="tag">${escape(c?.name||x.category||'خدمة')}</span><h3>${escape(x.name)}</h3><p class="muted">${escape(x.description||'خدمة تقنية داخل Tech Library.')}</p><div class="toolbar"><a class="btn small primary" target="_blank" rel="noopener noreferrer" href="${escape(x.url||'#')}">${x.category==='phone'?'تحميل من المكتبة':'فتح الخدمة'} ↗</a><button class="btn small" data-fav="${escape(x.id)}" title="${fav?'إزالة من المفضلة':'إضافة إلى المفضلة'}">${fav?'❤️ محفوظة':'🤍 مفضلة'}</button></div></article>`}
function termCard(x){return `<article class="card"><div class="icon">${x.icon||'📚'}</div><span class="tag">📚 مصطلح تقني</span><h3>${escape(x.term)} — ${escape(x.termAr)}</h3><p class="muted">${escape(x.description)}</p><div class="source-line">المصدر: Tech Library — قاموس المصطلحات</div><a class="btn small" href="assistant.html?q=${encodeURIComponent(x.term)}">🤖 اسأل TL عن المصطلح</a></article>`}
function codeCard(x){return `<article class="card"><div class="icon">${x.icon||'🔢'}</div><span class="tag">${escape(x.brand)} — أكواد الهاتف</span><h3 dir="ltr">${escape(x.code)}</h3><p class="muted">${escape(x.description)}</p>${x.warning?`<p class="muted warning">${escape(x.warning)}</p>`:''}<button class="btn small" data-copy-code="${escape(x.code)}">📋 نسخ الكود</button></article>`}
/* UPDATE 6.8: Improved code search */
function searchCodes(q,limit=8){
  const n=norm(q);
  return (D.phoneCodes||[]).map(x=>{
    const text=[x.brand,x.code,x.description,x.type].map(norm).join(' ');
    let score=0;
    if(text.includes(n))score+=90;
    const tokens=n.split(/\s+/).filter(Boolean);
    for(const t of tokens){if(t.length>1&&text.includes(t))score+=40;}
    return [x,score];
  }).filter(x=>x[1]>=40).sort((a,b)=>b[1]-a[1]).slice(0,limit).map(x=>x[0]);
}

/* ---------- Library ---------- */
async function renderLibrary(){
 const grid=$('#grid');if(!grid)return;const input=$('#q');const chips=$('#chips');const params=new URLSearchParams(location.search);let q=params.get('q')||'';let cat=params.get('category')||'';const item=params.get('item');input.value=q;window.__favSet=new Set(await favIds());
 if(item){const found=allServices().find(x=>x.id===item)||allTerms().find(x=>x.id===item);if(found){input.value=found.name||found.term;q=found.name||found.term}}
 chips.innerHTML=D.categories.map(c=>`<a class="btn small ${cat===c.id?'primary':''}" href="library.html?category=${encodeURIComponent(c.id)}">${c.icon} ${escape(c.name)}</a>`).join('');
 function render(){q=input.value.trim();const termMode=cat==='glossary';let list;if(q){list=[...searchServices(q,40).map(x=>({kind:'service',x})),...searchTerms(q,20).map(x=>({kind:'term',x})),...searchCodes(q,10).map(x=>({kind:'code',x}))].slice(0,45)}else if(params.get('favorites')==='1'){list=allServices().filter(x=>window.__favSet.has(x.id)).map(x=>({kind:'service',x}))}else if(cat==='phone-codes')list=(D.phoneCodes||[]).map(x=>({kind:'code',x}));else if(termMode)list=allTerms().map(x=>({kind:'term',x}));else if(cat)list=allServices().filter(x=>x.category===cat).map(x=>({kind:'service',x}));else list=allServices().map(x=>({kind:'service',x}));
  const c=catMap[cat];$('#title').textContent=q?`🔎 نتائج البحث: ${q}`:(c?`${c.icon} ${c.name}`:'📚 المكتبة التقنية');const currentCount=cat==='glossary'?allTerms().length:cat==='phone-codes'?(D.phoneCodes||[]).length:cat?allServices().filter(x=>x.category===cat).length:allServices().length;$('#subtitle').textContent=c?`${c.description} — ${currentCount} عنصر`:`${allServices().length} خدمة/مصدر + ${allTerms().length} مصطلح تقني + ${(D.phoneCodes||[]).length} كود هاتف`;
  grid.innerHTML=list.length?list.map(o=>o.kind==='term'?termCard(o.x):o.kind==='code'?codeCard(o.x):serviceCard(o.x)).join(''):`<div class="card empty">لم نجد نتيجة مرتبطة بالطلب داخل المكتبة.</div>`;
  $$('#grid [data-fav]').forEach(b=>b.onclick=async()=>{const on=await toggleFav(b.dataset.fav);b.textContent=on?'★ إزالة':'☆ مفضلة';window.__favSet=new Set(await favIds())});
  $$('#grid [data-copy-code]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copyCode);toast('📋 تم نسخ الكود.')}catch{toast('⚠️ تعذر النسخ تلقائيًا.')}})
 }
 input.oninput=()=>render();$('#clearSearch')?.addEventListener('click',()=>{input.value='';history.replaceState(null,'','library.html');render()});
 const hb=$('#historyBox');if(hb){const h=(await idbGetAll('history')).sort((a,b)=>b.createdAt-a.createdAt).slice(0,8);hb.innerHTML=h.length?`<div class="card" style="margin:12px 0"><b>🕘 سجل البحث</b><div class="chips" style="margin-top:8px">${h.map(x=>`<button class="btn small" data-history="${escape(x.q)}">${escape(x.q)}</button>`).join('')}<button class="btn small" id="clearHistoryList">🗑️ مسح</button></div></div>`:'';hb.querySelectorAll('[data-history]').forEach(b=>b.onclick=()=>{input.value=b.dataset.history;history.replaceState(null,'',`library.html?q=${encodeURIComponent(b.dataset.history)}`);render()});hb.querySelector('#clearHistoryList')?.addEventListener('click',async()=>{await idbClear('history');toast('🗑️ تم مسح سجل البحث.');await renderLibrary()})}
 render();
}

/* ---------- TL Local AI Knowledge Engine — High Precision Mode ---------- */
const TL_KB=Array.isArray(window.TL_KNOWLEDGE_BASE)?window.TL_KNOWLEDGE_BASE:[];
const TL_QUALITY={
  targetErrorRate:0.001,          // 0.1% target; measured, not a mathematical guarantee
  minConfidence:0.86,
  strongConfidence:0.94,
  ambiguityGap:0.07,
  maxCandidates:80
};
const TL_STOPWORDS=new Set(['ما','ماذا','هل','هو','هي','انت','أنت','انا','أنا','من','في','عن','على','الى','إلى','ايه','إيه','كيف','لماذا','ليه','the','is','are','you','what','who','how','do','does','a','an','to','of','in']);
const TL_INDEX={ready:false,exact:new Map(),token:new Map(),entries:[]};
function tlArabizi(s){return String(s).replace(/3/g,'ع').replace(/7/g,'ح').replace(/5/g,'خ').replace(/6/g,'ط').replace(/9/g,'ص').replace(/2/g,'ا').replace(/8/g,'غ');}
function tlNorm(s){
  return norm(tlArabizi(s))
    .replace(/[؟?!.,،؛:()[\]{}"'`~_\-+/\\|]/g,' ')
    .replace(/(.)\1{2,}/g,'$1')
    .replace(/\s+/g,' ')
    .trim();
}
function tlTokens(s){return [...new Set(tlNorm(s).split(/\s+/).filter(t=>t.length>1&&!TL_STOPWORDS.has(t)))];}
function tlGrams(s){const a=tlNorm(s).replace(/\s+/g,' '),r=[];for(let i=0;i<a.length-2;i++)r.push(a.slice(i,i+3));return r;}
function tlPrepare(){
  if(TL_INDEX.ready)return;
  TL_INDEX.entries=TL_KB.map(e=>{
    const candidates=[...(e.questions||[]),...(e.patternsText||[]),...(e.aliases||[])].map(tlNorm).filter(Boolean);
    const keywords=[...(e.keywords||[])].map(tlNorm).filter(Boolean);
    const tokens=[...new Set(candidates.flatMap(tlTokens))];
    const grams=[...new Set(candidates.flatMap(tlGrams))];
    return {...e,__candidates:candidates,__keywords:keywords,__tokens:tokens,__grams:grams};
  });
  for(const e of TL_INDEX.entries){
    for(const c of e.__candidates){
      if(!TL_INDEX.exact.has(c))TL_INDEX.exact.set(c,[]);
      TL_INDEX.exact.get(c).push(e);
    }
    for(const t of e.__tokens){
      if(!TL_INDEX.token.has(t))TL_INDEX.token.set(t,[]);
      TL_INDEX.token.get(t).push(e);
    }
  }
  TL_INDEX.ready=true;
}
function tlCandidateSet(q){
  tlPrepare();
  const raw=tlNorm(q),tokens=tlTokens(q);
  const exact=TL_INDEX.exact.get(raw);
  if(exact?.length)return exact;
  const set=new Map();
  for(const t of tokens){
    for(const e of (TL_INDEX.token.get(t)||[])){
      const old=set.get(e.id)||0;set.set(e.id,old+1);
    }
  }
  let arr=[...set.keys()].map(id=>TL_INDEX.entries.find(e=>e.id===id)).filter(Boolean);
  arr.sort((a,b)=>(set.get(b.id)||0)-(set.get(a.id)||0));
  if(arr.length)return arr.slice(0,TL_QUALITY.maxCandidates);
  return TL_INDEX.entries.length<=5000?TL_INDEX.entries:[];
}
function tlSimilarity(q,entry){
  const raw=tlNorm(q),qs=tlTokens(q);
  if(!raw)return 0;
  let best=0;
  for(const c of entry.__candidates){
    if(c===raw)return 1;
    const ct=tlTokens(c);
    const qSet=new Set(qs),cSet=new Set(ct);
    const overlap=qs.filter(t=>cSet.has(t)).length;
    const reverse=ct.filter(t=>qSet.has(t)).length;
    const overlapQ=qs.length?overlap/qs.length:0;
    const overlapC=ct.length?reverse/ct.length:0;
    if(overlapQ===1&&overlapC===1)best=Math.max(best,0.985);
    else if(overlapQ>=0.85&&overlapC>=0.85)best=Math.max(best,0.955);
    else if(overlapQ>=0.75&&overlapC>=0.75)best=Math.max(best,0.92);
    else if(overlapQ>=0.6&&overlapC>=0.6)best=Math.max(best,0.88);
    if(c.includes(raw)||raw.includes(c))best=Math.max(best,0.91);
    if(overlap){
      const weighted=(overlapQ*.62)+(overlapC*.28);
      best=Math.max(best,Math.min(.89,.42+weighted));
    }
    const a=new Set(tlGrams(raw));if(a.size){
      let hit=0;const b=new Set(entry.__grams);for(const g of a)if(b.has(g))hit++;
      const ratio=hit/Math.max(a.size,b.size||1);
      if(ratio>.35)best=Math.max(best,Math.min(.84,.45+ratio*.75));
    }
  }
  if(entry.__keywords?.length){
    const ko=qs.filter(t=>entry.__keywords.some(k=>k===t||k.includes(t)||t.includes(k))).length;
    if(ko>=2)best=Math.max(best,.74);
    else if(ko===1)best=Math.max(best,.60);
  }
  return best;
}
function fillTLAnswer(text){return String(text||'').replace(/\{serviceCount\}/g,allServices().length).replace(/\{termCount\}/g,allTerms().length).replace(/\{codeCount\}/g,(D.phoneCodes||[]).length);}
function searchTLKnowledge(q,limit=3){
  const candidates=tlCandidateSet(q);
  if(!candidates.length)return [];
  return candidates.map(e=>({e,score:tlSimilarity(q,e)}))
    .filter(x=>x.score>=TL_QUALITY.minConfidence)
    .sort((a,b)=>b.score-a.score)
    .slice(0,limit);
}
function getKnowledgeResponse(q){
  const hits=searchTLKnowledge(q,3);
  if(!hits.length)return null;
  const top=hits[0],second=hits[1];
  const gap=second?top.score-second.score:1;
  if(top.score<TL_QUALITY.minConfidence)return null;
  if(top.score<TL_QUALITY.strongConfidence && gap<TL_QUALITY.ambiguityGap)return null;
  if(!top.e.answer)return null;
  const answer=Array.isArray(top.e.answer)?top.e.answer[Math.floor(Math.random()*top.e.answer.length)]:top.e.answer;
  return {
    html:fillTLAnswer(answer),
    key:'knowledge-'+top.e.id,
    smart:true,
    knowledge:true,
    confidence:Number(top.score.toFixed(3))
  };
}
/* ---------- TL Conversation State ---------- */
const TL_SESSION={pendingName:false};
function tlHandleConversationState(q){
 const raw=String(q||'').trim(), n=tlNorm(raw);
 if(TL_SESSION.pendingName){
   const m=raw.match(/^(?:اسمي|انا اسمي|أنا اسمي|اسمى|ناديني|call me)\s+(.+)$/i);
   const candidate=(m?m[1]:raw).trim();
   const looksSearch=/(خدمة|خدمات|موقع|مواقع|برنامج|تطبيق|اداة|أداة|كود|اكواد|أكواد|مصطلح|برمجة|شبكة|واي فاي|ذكاء اصطناعي|ai|python|javascript|html|css)/i.test(candidate);
   if(candidate && candidate.length<=40 && !looksSearch && !/[?؟]/.test(candidate)){
     TL_SESSION.pendingName=false;
     try{if(typeof setUserName==='function')setUserName(candidate)}catch(e){}
     return {html:`تشرفت بيك يا <b>${escape(candidate)}</b> 👋 هاناديك بالاسم ده من دلوقتي.`,key:'name-set',smart:true,conversation:true};
   }
 }
 if(/^(?:اسمي ايه|اسمي إيه|ايه اسمي|إيه اسمي|ما اسمي|ما هو اسمي|what is my name|whats my name)$/i.test(n)){
   TL_SESSION.pendingName=true;
   return {html:'لو عايزني أناديك باسم معين، قولي اسمك 😊',key:'ask-name',smart:true,conversation:true};
 }
 const cm=raw.match(/^(?:ممكن تناديني|ناديني|call me)\s+(.+)$/i);
 if(cm){const candidate=cm[1].trim();if(candidate&&candidate.length<=40){try{if(typeof setUserName==='function')setUserName(candidate)}catch(e){}return {html:`تمام يا <b>${escape(candidate)}</b> 👋`,key:'name-set',smart:true,conversation:true};}}
 return null;
}
/* ---------- TL ---------- */
const TL_PERSONALITY={name:'TL',tone:'ودود واحترافي',role:'مساعد AI محلي محدود يفهم السؤال ويبحث ويجيب من معرفة Tech Library'};
const SMART_RESPONSES=[
  {id:'greeting',patterns:[/^(السلام عليكم|السلام عليكم ورحمة الله وبركاته|سلام عليكم|السلامو عليكم|مرحبا|مرحباً|اهلا|أهلا|اهلين|هاي|هلو|hello|hi|hey)$/],responses:['وعليكم السلام ورحمة الله وبركاته 👋']},
  {id:'age',patterns:[/(كم عمرك|كام عمرك|ما عمرك|سنك|عندك كام سنه|عندك كم سنة)/],responses:['أنا مش بشري 🤖، لذلك ماعنديش عمر. أنا TL، مساعد رقمي محدود يعمل محليًا داخل Tech Library.']},
  {id:'human',patterns:[/(هل انت بشري|انت انسان|أنت انسان|انت شخص|انت روبوت|انت بوت|هل انت روبوت|هل انت ai)/],responses:['لا، أنا مش إنسان 🤖. أنا TL، مساعد رقمي محدود مصمم للبحث والفهم داخل Tech Library.']},
  {id:'feelings',patterns:[/(ما شعورك|ايه شعورك|كيف تشعر|بتحس|عندك مشاعر|زعلان|فرحان)/],responses:['أنا لا أملك مشاعر بشرية، لكن أقدر أفهم سؤالك وأرد عليك بطريقة ودودة وواضحة 🤖.']},
  {id:'how-are-you',patterns:[/^(ازيك|إزيك|ازيّك|كيف حالك|عامل ايه|عاملة ايه|اخبارك|أخبارك|كويس|تمام)$/],responses:['أنا تمام 🤖 وجاهز أساعدك في Tech Library. وإنت لو حابب تبحث، اكتب طلبك مباشرة.']},
  {id:'thanks',patterns:[/^(شكرا|شكرًا|متشكر|تسلم|تسلمي|thank you|thanks)$/],responses:['العفو 🤍 سعيد إني قدرت أساعدك.','العفو! 🌟']},
  {id:'farewell',patterns:[/^(باي|سلام|مع السلامة|اشوفك|الى اللقاء|إلى اللقاء|goodbye|bye)$/],responses:['مع السلامة 👋 نورت Tech Library.','باي 👋 ولو احتجت تبحث عن خدمة أو مصطلح ارجع لي.']},
  {id:'love',patterns:[/(هل تحبني|بتحبني|انت بتحبني|تحبني)/],responses:['أنا مساعد رقمي وماعنديش مشاعر أو علاقات شخصية، لكن أقدر أساعدك بكل احترام 🤖.']},
  {id:'capabilities',patterns:[/(تقدر تعمل ايه|تقدر تعمل ايه|ايه اللي تقدر تعمله|ماذا تستطيع|قدراتك|بتعمل ايه|وظيفتك)/],responses:['أقدر أبحث داخل Tech Library عن الخدمات والمواقع والأدوات والمصطلحات وأكواد الهواتف، وأفهم صيغ عربية وإنجليزية ومرادفات شائعة. لكني مش مساعدًا عامًا مثل ChatGPT ولا أنفذ مهام خارج المكتبة.']},
  {id:'identity',patterns:[/(مين انت|من انت|انت مين|إنت مين|اسمك ايه|ما اسمك|ما هو اسمك)/],responses:['أنا TL 🤖 — Tech Library Assistant. دوري الأساسي البحث الذكي داخل مكتبة Tech Library، وليس إجراء محادثة عامة بلا حدود.']},
  {id:'origin',patterns:[/(مين صنعك|مين عملك|من صنعك|المطور بتاعك|مين مطورك)/],responses:['تم تطويري ضمن مشروع Tech Library بواسطة مطور المشروع. لو عايز بيانات المطور اكتب: معلومات المطور.']},
  {id:'thanks-after-help',patterns:[/^(تمام|حلو|ممتاز|جامد|رائع)$/],responses:['تمام 🤝 لو عندك طلب تقني اكتبه وأنا أبحث لك داخل المكتبة.']}
];
function getSmartResponse(q){const kb=getKnowledgeResponse(q);if(kb)return kb;const n=norm(q);for(const item of SMART_RESPONSES){if(item.patterns.some(p=>p.test(n)))return {html:item.responses[Math.floor(Math.random()*item.responses.length)],key:'smart-'+item.id,smart:true};}return null}
function isSmartQuestion(q){return !!getSmartResponse(q)}
function isOutsideQuestion(q){
  const n=norm(q);
  if(isSmartQuestion(q)) return false;
  if(/^(كم|كام|متى|اين|أين|كيف|ازاي|لماذا|ليه|لم|هل)/.test(n) && !/(اداه|ادوات|موقع|منصه|خدمه|برنامج|تطبيق|كود|مصطلح|برمجه|تعلم|شبكه|واي فاي|حمايه|ai|python|javascript|html|css|phone|هاتف)/.test(n)) return true;
  if(/(عمر|سن|ميلاد|حياتك|شعورك|مشاعرك|لونك|طعم|رائحة|رأيك الشخصي|بتحبني|تحبني)/.test(n)) return true;
  return false;
}

function intent(q){
  const n=norm(q);
  if(isSmartQuestion(q)) return 'smart';
  
  if(/^(اسمي|انا اسمي|أنا اسمي|ناديني|ما اسمي|ايه اسمي|إيه اسمي)/.test(n)||/\bاسمي\b/.test(n))return 'user-name';
  if(/^(اسمك|ايه اسمك|ما اسمك|مين انت|من انت|انت مين|إنت مين|مين حضرتك)/.test(n)||/(بتعمل ايه|وظيفتك|دورك|تقدر تعمل ايه|اقدر اسالك عن ايه|قدراتك|ماذا تستطيع)/.test(n))return 'about-tl';
  
  /* UPDATE 6.3: Better outside detection */
  if(isOutsideQuestion(q)) return 'outside';
  if(/(اعمل|انشئ|اكتب لي|ارسم|صمم|برمج لي|اصور|اغني|حل لي|جاوبني عن|اكتب كود)/.test(n))return 'outside';
  
  if(/(المطور|صاحب الموقع|مين المطور|بيانات المطور|تواصل|contact|gmail|facebook)/.test(n))return 'developer';
  if(/(الموقع|tech library|المكتبه|المكتبة|الاقسام|الأقسام|عن)/.test(n))return 'about-library';
  if(/(كود|اكواد|أكواد|رمز هاتف|رموز الهاتف)/.test(n))return 'phone-codes';
  if(/(قسم|تصنيف|category)/.test(n)&&findCategory(q)?.[1]>30)return 'category';
  if(/(ايه هو|ما هو|يعني ايه|يعنى ايه|شرح|اشرح|معنى|ماذا يعني|تعريف)/.test(n)&&searchTerms(q).length>0)return 'term';
  
  return 'search';
}
function sourceButtons(item,term=false){const href=term?`library.html?item=${encodeURIComponent(item.id)}`:libraryHref(item);return `<div class="msg-actions"><a class="btn small" href="${href}">📚 المصدر</a>${!term&&item.url?`<a class="btn small primary" target="_blank" rel="noopener noreferrer" href="${escape(item.url)}">${item.category==='phone'?'تحميل من المكتبة':'فتح الخدمة'} ↗</a>`:''}</div>`}
async function reply(q){
 const stateReply=tlHandleConversationState(q);
 if(stateReply)return stateReply;
 const type=intent(q),n=norm(q),name=await getUserName();
 const smart=getSmartResponse(q);
 if(smart)return smart;
 /* High-precision knowledge routing happens before generic outside detection. */
 const knowledge=getKnowledgeResponse(q);
 if(knowledge)return knowledge;
 if(type==='user-name'){
  const m=q.match(/(?:اسمي|انا اسمي|أنا اسمي|ناديني)\s+(.+)/i);if(m){const newName=m[1].trim().replace(/[.!؟?]+$/,'');if(newName){await setUserName(newName);return {html:`تمام 👋 هاناديك <b>${escape(newName)}</b> من دلوقتي.`,key:'user-name'}}}
  return {html:name?`اسمك المحفوظ عندي هو <b>${escape(name)}</b> 😊`:'لسه ما حفظتش اسم ليك. قول لي: <b>اسمي + اسمك</b> وأنا هاحفظه محليًا.',key:'user-name'}
 }
 const recent=(await idbGetAll('memory')).filter(x=>x.results?.length).sort((a,b)=>b.createdAt-a.createdAt)[0];
 if(recent&&/(منها|منهم|من دول|المجاني|المجانية|مجاني|مجانية|التاني|التانيه|الثاني|الثانية|كمان|المزيد|هات كمان)/.test(n)){
  const previous=recent.results.map(id=>allServices().find(x=>x.id===id)).filter(Boolean);if(previous.length){return {html:'بناءً على النتائج السابقة، دي نتائج إضافية مرتبطة بطلبك:<br><br>'+previous.slice(0,5).map(x=>`${x.icon||'🧰'} <b>${escape(x.name)}</b><br><span class="muted">${escape(x.description)}</span>${sourceButtons(x)}`).join('<hr>'),key:previous[0].id,results:previous.map(x=>x.id)}}
 }
 if(type==='about-tl')return {html:`أنا TL 🤖، مساعد Tech Library${name?`، وأقدر أناديك <b>${escape(name)}</b>`:''}. دوري أبحث داخل محتوى المكتبة وأساعدك في الوصول إلى الخدمات والأقسام والمصطلحات والمصادر الموجودة فيها.`,key:null};
 if(type==='about-library')return {html:`Tech Library مكتبة تقنية تفاعلية تضم <b>${allServices().length}</b> خدمة ومصدر، و<b>${allTerms().length}</b> مصطلحًا تقنيًا، بالإضافة إلى <b>${(D.phoneCodes||[]).length}</b> كود هاتف وأقسام متنوعة.`,key:null};
 if(type==='developer')return {html:`👨‍💻 <b>${escape(DEVELOPER_INFO.name)}</b><br><span class="muted">${escape(DEVELOPER_INFO.description)}</span><br><br><b>الدور:</b> ${escape(DEVELOPER_INFO.role)}<br><b>البريد:</b> <a href="mailto:${escape(DEVELOPER_INFO.email)}">${escape(DEVELOPER_INFO.email)}</a><br><b>Facebook:</b> <a href="${escape(DEVELOPER_INFO.facebook)}" target="_blank" rel="noopener">صفحة المطور ↗</a>`,key:null};
 if(type==='outside')return {html:'🤔 أنا TL ومصدري الوحيد هو Tech Library. سؤالك ليس متعلقاً بـ المكتبة مباشرة، لكن أقدر أبحث لك عن أداة أو خدمة في المكتبة قد تساعدك إذا كان الموضوع تقني. جرب: \"أداة لتحليل الشبكات\" أو \"أفضل IDE للبرمجة\"',key:null};
 if(type==='term'){const t=searchTerms(q.replace(/^(ايه هو|ما هو|يعني ايه|يعنى ايه|شرح|اشرح|معنى|ماذا يعني)\s*/i,''),3)[0]||searchTerms(q,3)[0];if(t)return {html:`${t.icon||'📚'} <b>${escape(t.term)}</b><br>${escape(t.description)}<div class="source-line">المصدر: Tech Library — قاموس المصطلحات</div>${sourceButtons(t,true)}`,key:t.id,librarySearch:true};}
 if(type==='phone-codes'){const codes=searchCodes(q,5);if(codes.length)return {html:'وجدت أكواد مرتبطة بالطلب داخل المكتبة:<br><br>'+codes.map(c=>`${c.icon} <b dir="ltr">${escape(c.code)}</b><br>${escape(c.description)}${c.warning?`<br><span class="warning">${escape(c.warning)}</span>`:''}<div class="msg-actions"><a class="btn small" href="library.html?category=phone-codes">📚 المصدر</a><button class="btn small" data-copy-code="${escape(c.code)}">📋 نسخ الكود</button></div>`).join('<hr>'),key:codes[0].id,librarySearch:true};return {html:'قسم أكواد الهواتف موجود في المكتبة.',key:null}}
 if(type==='category'){const pair=findCategory(q);if(pair&&pair[1]>25){const c=pair[0];const count=c.id==='glossary'?allTerms().length:c.id==='phone-codes'?(D.phoneCodes||[]).length:allServices().filter(x=>x.category===c.id).length;return {html:`${c.icon} <b>${escape(c.name)}</b><br>${escape(c.description)}<br><br><b>${count}</b> خدمة/مصدر داخل المكتبة.<div class="msg-actions"><a class="btn small primary" href="library.html?category=${encodeURIComponent(c.id)}">فتح القسم</a></div>`,key:c.id,librarySearch:true}}}
 /* UPDATE 6.5: Strict result validation */
 const results=searchServices(q,5);
 if(results.length){
   // تحقق من أن النتيجة الأولى لديها score عالي بما يكفي
   const topScore=scoreItem(results[0],q);
   if(topScore>=55){
     return {html:'بحثت داخل مكتبة Tech Library ووجدت:<br><br>'+results.map(x=>`${x.icon||'🧰'} <b>${escape(x.name)}</b><br><span class="muted">${escape(x.description)}</span>${sourceButtons(x)}`).join('<hr>'),key:results[0].id,results:results.map(x=>x.id),librarySearch:true};
   }
 }
 const terms=searchTerms(q,3);
 if(terms.length){
   const topScore=scoreItem(terms[0],q,true);
   if(topScore>=55){
     const t=terms[0];
     return {html:`📚 <b>${escape(t.term)}</b><br>${escape(t.description)}<div class="source-line">المصدر: Tech Library — قاموس المصطلحات</div>${sourceButtons(t,true)}`,key:t.id,librarySearch:true};
   }
 }
 return {html:'🤔 لم أجد شيئًا مرتبطًا بهذا الطلب داخل Tech Library. <br><br>جرّب:<br>• اسم تطبيق أو موقع<br>• منصة AI أو أداة برمجة<br>• مصطلح تقني<br>• اسم قسم مثل \"AI\" أو \"تعليم\"',key:null};
}
async function assistant(){const box=$('#messages'),input=$('#chatInput'),send=$('#send');if(!box)return;const params=new URLSearchParams(location.search);if(params.get('q'))input.value=params.get('q');const saved=await idbGetAll('memory');const recent=saved.sort((a,b)=>b.createdAt-a.createdAt).slice(0,4).reverse();for(const m of recent){if(m.q&&m.html){appendMsg('user',m.q,false);appendMsg('bot',m.html,false)}}function appendMsg(role,html,scroll=true){const el=document.createElement('div');el.className='msg '+role;el.innerHTML=html;box.appendChild(el);if(scroll)box.scrollTop=box.scrollHeight}async function go(){const q=input.value.trim();if(!q)return;appendMsg('user',escape(q));const ans=await reply(q);appendMsg('bot',ans.html);const isLibrarySearch=!!ans.librarySearch || (Array.isArray(ans.results)&&ans.results.length>0);if(isLibrarySearch)await saveHistory(q);if(ans.results?.length || (ans.key && (ans.knowledge||!String(ans.key).startsWith('smart-')))) await saveMemory({q,html:ans.html,key:ans.key||null,results:ans.results||[],knowledge:!!ans.knowledge});input.value='';box.scrollTop=box.scrollHeight;$$('[data-copy-code]',box).forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copyCode);toast('📋 تم نسخ الكود.')}catch{}})}send.onclick=go;input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();go()}};/* UPDATE 6.10: Clear buttons */const clearMem=$('#clearMemory'),clearHist=$('#clearHistory');if(clearMem)clearMem.onclick=async()=>{if(!confirm('هل تريد مسح ذاكرة TL؟'))return;await idbClear('memory');box.innerHTML='';toast('🧠 تم مسح ذاكرة TL.')};if(clearHist)clearHist.onclick=async()=>{if(!confirm('هل تريد مسح سجل البحث؟'))return;await idbClear('history');box.innerHTML='';toast('🗑️ تم مسح سجل البحث.')}}

/* ---------- Home / settings / backgrounds ---------- */
async function renderHome(){const hs=$('#homeStats'),hc=$('#homeCategories');if(!hs)return;const favCount=(await favIds()).length;hs.innerHTML=[['📚','إجمالي الخدمات',allServices().length],['🧩','الأقسام',D.categories.length],['📖','المصطلحات',allTerms().length],['🔢','أكواد الهاتف',(D.phoneCodes||[]).length]].map(x=>`<div class="stat"><span>${x[0]}</span><strong>${x[2]}</strong><span class="muted">${x[1]}</span></div>`).join('');hc.innerHTML=D.categories.map(c=>{const count=c.id==='glossary'?allTerms().length:c.id==='phone-codes'?(D.phoneCodes||[]).length:allServices().filter(s=>s.category===c.id).length;return `<a class="card category-card" href="pages/library.html?category=${encodeURIComponent(c.id)}"><div class="icon">${c.icon}</div><h3>${escape(c.name)}</h3><p class="muted">${escape(c.description)}</p><div class="count">${count} خدمة/مصدر →</div></a>`}).join('')}
function settingsHTML(){const s=Settings.get();return `<div class="settings-panel" id="settings"><div class="settings"><div class="section-head"><h2>⚙️ إعدادات Tech Library</h2><button class="btn small" data-close-settings>✕</button></div><div class="setting-group"><h3>👤 بيئة المستخدم</h3><div class="setting-row"><div><b>اسم المستخدم</b><div class="muted">يحفظ الاسم محليًا ليستخدمه TL عند مخاطبتك.</div></div><button class="btn small" data-name-user>تغيير الاسم</button></div><div class="setting-row"><div><b>🌌 الخلفية</b><div class="muted">اختيار تصميم مختلف للخلفية.</div></div><select id="bgSelect" class="select"><option value="network" ${s.background==='network'?'selected':''}>🌐 Network</option><option value="particles" ${s.background==='particles'?'selected':''}>✨ Particles</option><option value="waves" ${s.background==='waves'?'selected':''}>〰️ Waves</option><option value="grid" ${s.background==='grid'?'selected':''}>🔷 Grid</option><option value="system" ${s.background==='system'?'selected':''}>☀️ System — خلفية ثابتة بيضاء</option></select></div><div class="setting-row"><div><b>🌓 لون الخلفية</b><div class="muted">التبديل بين الوضع الداكن والفاتح.</div></div><button class="theme-toggle" data-theme-toggle aria-label="تبديل لون الخلفية"><span>${s.theme==='dark'?'🌙':'☀️'}</span></button></div><div class="setting-row"><div><b>✨ المؤثرات والحركة</b><div class="muted">تقليل المؤثرات على الأجهزة الضعيفة.</div></div><button class="switch ${s.effects?'on':''}" data-setting="effects"><i></i></button></div></div><div class="setting-group"><h3>🔄 إعادة التعيين</h3><div class="reset-grid"><button class="btn small" data-reset-one="memory">🧠 مسح ذاكرة TL</button><button class="btn small" data-reset-one="history">🕘 مسح سجل البحث</button><button class="btn small" data-reset-one="favorites">⭐ مسح المفضلة</button><button class="btn small" data-reset-all>🗑️ مسح كل البيانات المحلية</button><button class="btn small" data-reset-settings>⚙️ إعادة الإعدادات الافتراضية</button></div></div><div class="setting-row"><div><b>ℹ️ عن الموقع</b><div class="muted">Tech Library — Official</div></div><span class="tag">${allServices().length} خدمة</span></div></div></div>`}
function setupSettings(){const host=$('#settingsPanel');if(!host)return;host.innerHTML=settingsHTML();const panel=$('#settings');$$('[data-settings]').forEach(b=>b.onclick=()=>panel.classList.add('open'));$('[data-close-settings]')?.addEventListener('click',()=>panel.classList.remove('open'));panel.addEventListener('click',e=>{if(e.target===panel)panel.classList.remove('open')});$('#bgSelect')?.addEventListener('change',e=>{const s=Settings.get();s.background=e.target.value;Settings.set(s);toast('🌌 تم تغيير الخلفية.')});$('[data-theme-toggle]')?.addEventListener('click',()=>{const s=Settings.get();s.theme=s.theme==='dark'?'light':'dark';Settings.set(s);toast(s.theme==='dark'?'🌙 تم تفعيل الوضع الداكن.':'☀️ تم تفعيل الوضع الفاتح.')});$('[data-name-user]')?.addEventListener('click',async()=>{const old=await getUserName();const name=prompt('اكتب الاسم الذي تريد أن يناديك به TL:',old);if(name!==null){await setUserName(name);toast(name.trim()?'👤 تم حفظ الاسم.':'🧹 تم حذف الاسم.');host.innerHTML=settingsHTML();setupSettings()}});$$('[data-setting]').forEach(b=>b.onclick=()=>{const s=Settings.get();s[b.dataset.setting]=!s[b.dataset.setting];Settings.set(s);host.innerHTML=settingsHTML();setupSettings();toast('⚙️ تم حفظ الإعداد.')});$$('[data-reset-one]').forEach(b=>b.onclick=async()=>{if(!confirm('هل تريد تأكيد عملية المسح؟'))return;await idbClear(b.dataset.resetOne);toast('🗑️ تمت عملية المسح.');host.innerHTML=settingsHTML();setupSettings()});$('[data-reset-all]')?.addEventListener('click',async()=>{if(!confirm('سيتم مسح المفضلة وسجل البحث وذاكرة TL واسم المستخدم. هل تريد المتابعة؟'))return;for(const s of stores)await idbClear(s);toast('🗑️ تم مسح البيانات المحلية.');host.innerHTML=settingsHTML();setupSettings()});$('[data-reset-settings]')?.addEventListener('click',()=>{Settings.reset();toast('🔄 تمت إعادة الإعدادات الافتراضية.');host.innerHTML=settingsHTML();setupSettings()})}
let particleStop=null;
function particles(restart=false){if(particleStop){particleStop();particleStop=null}const c=$('#network-bg');if(!c||Settings.get().particles===false)return;const ctx=c.getContext('2d');let w=0,h=0,dpr=1,pts=[],raf=0;const mode=Settings.get().background||'network';function resize(){dpr=Math.min(devicePixelRatio||1,1.5);w=innerWidth;h=innerHeight;c.width=w*dpr;c.height=h*dpr;c.style.width=w+'px';c.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);const n=w<600?20:Math.min(55,Math.floor(w*h/18000));pts=Array.from({length:n},()=>({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.2,vy:(Math.random()-.5)*.2,r:Math.random()*1.5+.5,a:Math.random()*6.28}))}
 function palette(){const light=document.body.dataset.theme==='light';return light?{dot:'rgba(20,24,35,.72)',line:'rgba(50,55,70,.18)',accent:'rgba(40,45,60,.28)'}:{dot:'rgba(100,170,255,.7)',line:'rgba(120,100,255,.2)',accent:'rgba(110,90,255,.3)'}}
 function draw(t){ctx.clearRect(0,0,w,h);const p=palette();if(mode==='system'){particleStop?.();return}if(mode==='grid'){ctx.strokeStyle=p.line;ctx.lineWidth=1;const step=45;for(let x=0;x<w;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}for(let y=0;y<h;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}return}for(const a of pts){a.x+=a.vx;a.y+=a.vy;a.a+=.008;if(a.x<0||a.x>w)a.vx*=-1;if(a.y<0||a.y>h)a.vy*=-1;let y=a.y;if(mode==='waves')y+=Math.sin((a.x+t*.00015)/35+a.a)*18;ctx.beginPath();ctx.arc(a.x,y,a.r,0,Math.PI*2);ctx.fillStyle=p.dot;ctx.fill()}if(mode==='network'){const line=w<600?105:140;for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){const a=pts[i],b=pts[j],dx=a.x-b.x,dy=a.y-b.y,dist=Math.hypot(dx,dy);if(dist<line){ctx.strokeStyle=`rgba(${document.body.dataset.theme==='light'?'50,55,70':'104,90,237'},${(1-dist/line)*.22})`;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}}}if(mode==='waves'){ctx.strokeStyle=p.line;for(let k=0;k<4;k++){ctx.beginPath();for(let x=0;x<=w;x+=8){const y=h*(.22+k*.18)+Math.sin(x/90+t*.00025+k)*18;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke()}}raf=requestAnimationFrame(draw)}resize();draw(0);addEventListener('resize',resize);particleStop=()=>{cancelAnimationFrame(raf);removeEventListener('resize',resize)}}
function quickSearch(){const f=$('#quickSearch');if(!f)return;f.onsubmit=e=>{e.preventDefault();const q=$('#quickQ').value.trim();if(q)location.href=`pages/library.html?q=${encodeURIComponent(q)}`}}
function hideLoading(){const e=$('#load');if(e){e.classList.add('hide');setTimeout(()=>e.remove(),450)}}
async function boot(){try{applySettings();await purgeConversationHistory();await renderHome();setupSettings();quickSearch();await renderLibrary();await assistant();particles();}catch(err){console.error('Tech Library boot error:',err)}finally{setTimeout(hideLoading,700)}}
document.addEventListener('DOMContentLoaded',boot);window.addEventListener('load',hideLoading);setTimeout(hideLoading,2500);
})();
