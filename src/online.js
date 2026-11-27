/* ============================== ONLINE (experimental) ============================== */
let icReceive=()=>{};
const FB_DEFAULT='https://g1c-4b741-default-rtdb.europe-west1.firebasedatabase.app';
if(!ui.fb) ui.fb=FB_DEFAULT;
const OL={pm:new Map(),pf:[],mode:'off',db:null,room:null,uid:null,rows:[],feed:[],peers:0,err:'',tab:'bal',t:0,timer:0,poll:0,ready:false};
const OL_TABS=[['bal','Net worth',r=>r.bal],['best','Biggest win',r=>r.best],['bjWins','BJ wins',r=>r.bjWins],['bjBest','BJ streak',r=>r.bjBest],['lvl','Level',r=>r.lvl]];
const olNick=()=>String(ui.nick||'').trim();
const OL_ADMIN='appleiscool9284';
const olOk=n=>n===OL_ADMIN||/^[A-Za-z0-9 ._\-]{3,14}$/.test(n);
const olAdmin=()=>olNick()===OL_ADMIN;
const olLocked=()=>!olAdmin()&&(OL.mode!=='off'||(!OL.ready&&navigator.onLine));
const olTaken=n=>{ const me=OL.mode==='artifact'?OL.uid:ui.pid; return OL.rows.some(r=>r&&typeof r.nick==='string'&&r.nick.toLowerCase()===n.toLowerCase()&&r.id!==me&&r.id!==ui.pid&&!(ui.acct&&r.a===ui.acct.h)); };
function olAsk(cb){
  openModal({title:'Choose a username',html:`<p class="olnote">Every player needs a username. It appears on the leaderboards and on the live winners ticker. While you are online the admin can also see your name, balance, play time and live slot machine state.</p>
  <div class="field"><div><label for="olNick2">Username</label><small>3-14 letters, numbers, space . _ -</small></div><input id="olNick2" maxlength="16" value="${escHtml(olNick())}" autocomplete="off" autocapitalize="off"></div><div id="olNickErr" class="olnote warn"></div>`,
  actions:[{id:'olok',label:'Play',cls:'btn',fn:()=>{ const n=$('#olNick2').value.trim(), er=$('#olNickErr');
      if(!olOk(n)){ Snd.err(); er.textContent='Use 3-14 letters, numbers, space . _ -'; return; }
      if(olTaken(n)){ Snd.err(); er.textContent='That name is taken. Pick another.'; return; }
      ui.nick=n; save(); Snd.chest(); olBadge(); OL.t=0; olPush(); closeModal(); if(cb) cb(); }}],
  wire:c=>{ const i=$('#olNick2',c); setTimeout(()=>{ try{ i.focus(); }catch(e){} },80); i.onkeydown=e=>{ if(e.key==='Enter') $('#act_olok',c).click(); }; }});
}
window.__olGate=cb=>{ if(olOk(olNick())) return true; olAsk(cb); return false; };
function olMe(){ return {a:(ui.acct&&ui.acct.h)||undefined,nick:olNick(),bal:Math.round(state.bal),best:Math.round(S.best),lvl:state.level,bjWins:S.bjWins,bjBest:S.bjBest,spins:S.spins,hands:S.bjHands,t:Date.now()}; }
const olBlocked=()=>!!S.dbgUsed&&!olAdmin();
async function olInit(){
  try{ if(window.claude&&claude.use){
      const [db,user,room]=await Promise.all([claude.use('db'),claude.use('user'),claude.use('room')]);
      if(db&&user){ OL.db=db; OL.uid=await user.id(); OL.mode='artifact'; }
      if(room){ OL.room=room; try{ room.onPeers(ch=>{ OL.peers=(ch.peers||[]).length; olBadge(); }); }catch(e){} }
  } }catch(e){}
  if(!OL.db){ OL.mode=ui.fb?'rest':(navigator.onLine?'pub':'off'); }
  if(OL.mode==='pub'){ if(!await olPubPull(true)) OL.mode='off'; else setInterval(()=>{ if(!document.hidden&&OL.mode==='pub') olPubPull(); },12000); }
  OL.ready=true; olBadge(); if(olLocked()&&document.body.classList.contains('dbg')){ document.body.classList.remove('dbg'); try{ renderDebug(); }catch(e){} }
  if(OL.mode==='artifact'){ try{
      OL.db.collection('players').limit(300).onSnapshot(s=>{ OL.rows=s.docs.map(d=>({id:d.id,...d.data()})); olRender(); },e=>{ OL.err='Leaderboard unavailable ('+(e&&e.code||'error')+')'; olRender(); });
      OL.db.collection('config').onSnapshot(s=>{ s.docs.forEach(d=>{ if(d.id==='icons'){ const v=d.data(); icReceive(v.v,v.json); } }); },()=>{});
      OL.db.collection('feed').orderBy('t','desc').limit(30).onSnapshot(s=>{ OL.feed=s.docs.map(d=>d.data()); olRender(); },()=>{});
  }catch(e){ OL.err='Leaderboard unavailable'; } }
  else if(OL.mode==='rest'){ olRestPull(); }
  setTimeout(()=>{ try{ liveInit(); }catch(e){ console.error(e); } },0);
}
function olBadge(){
  const el=$('#olStat'); if(!el) return; const on=OL.mode!=='off';
  el.textContent=(olNick()?olNick()+' \u00b7 ':'')+(on?(OL.peers?(OL.peers+1)+' online':'Online'):'Offline mode'); el.className='olstat'+(on?' on':'');
}
const OL_TOPIC='g1c-online-v1-7f3k9q2x', OL_NTFY='https://ntfy.sh/';
let olSince='12h', olSent=0;
const olNum=x=>Math.max(0,Math.min(1e13,+x||0));
function olIngest(d,ts){
  if(!d||typeof d!=='object') return;
  if(d.k==='p'&&typeof d.id==='string'&&d.id.length<=16&&d.s&&olOk(String(d.s.nick))){ const s=d.s; OL.pm.set(d.id,{id:d.id,nick:String(s.nick),bal:olNum(s.bal),best:olNum(s.best),lvl:olNum(s.lvl),bjWins:olNum(s.bjWins),bjBest:olNum(s.bjBest),spins:olNum(s.spins),hands:olNum(s.hands),t:ts}); }
  else if(d.k==='x'&&typeof d.id==='string') OL.pm.delete(d.id);
  else if(d.k==='f'&&olOk(String(d.nick))&&olNum(d.amt)>0) OL.pf.push({nick:String(d.nick),game:d.game==='bj'?'bj':'slots',amt:olNum(d.amt),t:ts});
  else if(d.k==='login'&&olAdmin()&&typeof admLoginIn==='function') admLoginIn({nick:d.nick,g:d.g,ev:d.ev,ts:+d.ts||ts,pid:d.pid});
  else if(d.k==='cfg'&&d.nick===OL_ADMIN&&typeof d.json==='string') icReceive(+d.v,d.json);
}
async function olPubPull(first){
  try{ const r=await fetch(OL_NTFY+OL_TOPIC+'/json?poll=1&since='+olSince,{cache:'no-store'}); if(!r.ok) throw new Error('http '+r.status); const txt=await r.text();
    txt.split('\n').forEach(line=>{ if(!line) return; let m; try{ m=JSON.parse(line); }catch(e){ return; } if(m.event!=='message') return; olSince=m.id; let d; try{ d=JSON.parse(m.message); }catch(e){ return; } olIngest(d,(m.time||0)*1000); });
    OL.rows=[...OL.pm.values()]; OL.pf.sort((a,b)=>b.t-a.t); OL.pf.length=Math.min(OL.pf.length,40); OL.feed=OL.pf.slice(); OL.peers=Math.max(0,OL.rows.filter(x=>Date.now()-x.t<150000).length-1); OL.err=''; olBadge(); olRender(); return true;
  }catch(e){ OL.err='Could not reach the online relay'; if(!first) olRender(); return false; }
}
async function olPubSend(obj){
  try{ const day=new Date().toISOString().slice(0,10); let c={d:day,n:0}; try{ c=JSON.parse(localStorage.getItem('g1c-sent')||'')||c; }catch(e){} if(c.d!==day) c={d:day,n:0}; if(c.n>=220) return false; c.n++; try{ localStorage.setItem('g1c-sent',JSON.stringify(c)); }catch(e){}
    const r=await fetch(OL_NTFY+OL_TOPIC,{method:'POST',body:JSON.stringify(obj)}); return r.ok; }catch(e){ return false; }
}
const olRest=(p,o)=>fetch(ui.fb.replace(/\/+$/,'')+p,o);
async function olRestPull(){
  if(OL.mode!=='rest') return;
  try{ const [a,b]=await Promise.all([olRest('/players.json').then(r=>r.json()),olRest('/feed.json?orderBy=%22$key%22&limitToLast=30').then(r=>r.json())]);
    OL.rows=Object.entries(a||{}).map(([id,v])=>({id,...v})); olRest('/cfg.json').then(r=>r.json()).then(c=>{ if(c&&c.json) icReceive(c.v,c.json); }).catch(()=>{}); OL.feed=Object.values(b||{}).sort((x,y)=>y.t-x.t); OL.err=''; }
  catch(e){ OL.err='Could not reach the backend URL'; } olRender();
}
function olSchedule(){
  if(OL.mode==='off'||!olOk(olNick())||olBlocked()) return;
  clearTimeout(OL.timer); const per=OL.mode==='pub'?45000:20000, wait=Math.max(1500,per-(Date.now()-OL.t)); OL.timer=setTimeout(olPush,wait);
}
async function olPush(){
  if(OL.mode==='off'||!olOk(olNick())||olBlocked()) return; OL.t=Date.now(); const me=olMe();
  try{
    if(OL.mode==='artifact') await OL.db.doc('players/'+OL.uid).set(me);
    else if(OL.mode==='pub'){ const id=ui.pid||(ui.pid=Math.random().toString(36).slice(2,12)); OL.pm.set(id,{id,...me,t:Date.now()}); OL.rows=[...OL.pm.values()]; if(!await olPubSend({k:'p',id,s:me})) throw new Error('send'); }
    else await olRest('/players/'+(ui.pid||(ui.pid=Math.random().toString(36).slice(2,12)))+'.json',{method:'PUT',body:JSON.stringify(me)});
    OL.err='';
  }catch(e){ OL.err=(e&&e.code==='not_granted')?'Read-only: you need interact access to appear on the board':'Could not submit your score'; }
  olRender();
}
async function olRetire(){ try{ if(OL.mode==='artifact') await OL.db.doc('players/'+OL.uid).delete(); else if(OL.mode==='rest'&&ui.pid) await olRest('/players/'+ui.pid+'.json',{method:'DELETE'}); else if(OL.mode==='pub'&&ui.pid){ OL.pm.delete(ui.pid); await olPubSend({k:'x',id:ui.pid}); } }catch(e){} }
function acctConfirm(){
  openModal({title:'Delete account?',html:'<p>This removes your username, your place on the leaderboard and ALL saved progress (balance, level, stats) from this device and the online list. It cannot be undone, and you will start fresh.</p>',
    actions:[{id:'acdel',label:'Yes, delete everything',cls:'btn',fn:()=>acctDelete()},{id:'accan',label:'Cancel',cls:'btn',fn:()=>closeModal()}]});
}
async function acctDelete(){
  window.__g1cDeleted=true; try{ closeModal(); toast('Deleting your account…'); }catch(e){}
  try{ await olRetire(); }catch(e){}
  try{ if(ui.acct&&ui.fb) await olRest('/acct/'+ui.acct.h+'.json',{method:'DELETE'}); }catch(e){}
  try{ if(OL.mode==='rest'&&ui.fb&&ui.pid){ await Promise.all([olRest('/live/'+ui.pid+'.json',{method:'DELETE'}),olRest('/cmd/'+ui.pid+'.json',{method:'DELETE'})]); } }catch(e){}
  try{ const keep=localStorage.getItem('g1c-akey'); localStorage.clear(); sessionStorage.clear(); if(keep) localStorage.setItem('g1c-akey',keep); }catch(e){}
  setTimeout(()=>location.reload(),400);
}
let olLastFeed=0;
async function olFeed(game,amt,bet){
  if(!olOk(olNick())) return; const row={nick:olNick(),game,amt:Math.round(amt),t:Date.now()}; tkAdd(row);
  if(OL.mode==='off'||olBlocked()) return; const big=bet?amt>=bet*20:amt>=1e6; if(!big&&row.t-olLastFeed<8000) return; olLastFeed=row.t;
  try{ if(OL.mode==='artifact') await OL.db.collection('feed').add(row); else if(OL.mode==='pub') await olPubSend({k:'f',nick:row.nick,game:row.game,amt:row.amt}); else await olRest('/feed.json',{method:'POST',body:JSON.stringify(row)}); }catch(e){}
}
/* live winners ticker: your own wins instantly, everyone else's from the shared feed */
const TK=[];
function tkAdd(row){ TK.unshift(row); TK.length=Math.min(TK.length,20); tkRender(); }
let tkSig=null;
function tkRender(){
  const el=$('#tkin'); if(!el) return; const seen=new Set(), all=[];
  [...TK,...OL.feed].forEach(f=>{ if(!f||!olOk(String(f.nick))||!(+f.amt>0)) return; const k=f.nick+'|'+f.t; if(seen.has(k)) return; seen.add(k); all.push(f); });
  all.sort((a,b)=>b.t-a.t); const list=all.slice(0,24), sig=list.map(f=>f.nick+f.t).join(','); if(sig===tkSig) return; tkSig=sig;
  el.textContent=''; const me=olNick();
  if(!list.length){ const s=document.createElement('span'); s.textContent='Waiting for winners\u2026 hit a win and you are the first name on this bar.'; el.appendChild(s); el.style.animationDuration='28s'; return; }
  list.forEach(f=>{ const s=document.createElement('span'), b=document.createElement('b'), i=document.createElement('i'); b.textContent=f.nick===me?'You':f.nick; i.textContent=fmt(+f.amt);
    s.append(b,' won ',i,' on '+(f.game==='bj'?'Blackjack':'Slots')+(f.nick===me?'':'')); el.appendChild(s); });
  el.style.animationDuration=Math.max(24,list.length*8)+'s';
}
function olRender(){ tkRender(); if($('#olList')) olDraw(); }
function olDraw(){
  const list=$('#olList'); if(!list) return; const tab=OL_TABS.find(t=>t[0]===OL.tab)||OL_TABS[0];
  const rows=OL.rows.filter(r=>r&&typeof r.nick==='string'&&olOk(r.nick)).sort((a,b)=>(+tab[2](b)||0)-(+tab[2](a)||0)).filter((()=>{ const seen=new Set(); return r=>{ if(!r.a) return true; if(seen.has(r.a)) return false; seen.add(r.a); return true; }; })()).slice(0,25);
  list.textContent=''; const myId=OL.mode==='artifact'?OL.uid:ui.pid;
  if(!rows.length){ const p=document.createElement('p'); p.className='olnote'; p.textContent=OL.err||(OL.mode==='off'?'Offline: online mode is not connected here.':'No players yet. Pick a nickname and play to be the first.'); list.appendChild(p); }
  rows.forEach((r,i)=>{ const d=document.createElement('div'); d.className='olrow'+(r.id===myId?' me':''); const a=document.createElement('b'); a.textContent=String(i+1); const n=document.createElement('span'); n.textContent=r.nick+(r.nick===OL_ADMIN?' \u2605':'');
    const v=document.createElement('em'); const val=+tab[2](r)||0; v.textContent=(tab[0]==='bal'||tab[0]==='best')?fmt(val):tab[0]==='lvl'?'Lv '+val:String(val); d.append(a,n,v); list.appendChild(d); });
  const fd=$('#olFeed'); if(fd){ fd.textContent=''; OL.feed.slice(0,8).forEach(f=>{ if(!f||!olOk(String(f.nick))) return; const d=document.createElement('div'); d.className='olf'; d.textContent=f.nick+' won '+fmt(+f.amt||0)+' on '+(f.game==='bj'?'Blackjack':'Slots'); fd.appendChild(d); }); }
  const er=$('#olErr'); if(er) er.textContent=OL.err||'';
}
function openOnline(){
  const stat=OL.mode==='artifact'?'Connected through the Claude artifact'+(OL.peers?' · '+(OL.peers+1)+' players here now':''):OL.mode==='rest'?'Connected to your backend URL':OL.mode==='pub'?'Connected through the public relay'+(OL.peers?' · '+(OL.peers+1)+' players active':'')+' (scores last about 12 hours without play)':'Offline. Could not reach the online relay. It retries when your connection returns.';
  openModal({title:'Online leaderboards',html:`<p class="olnote">${stat}</p>
  <div class="field"><div><label for="olNick">Nickname</label><small>3-14 letters, numbers, space . _ -</small></div><input id="olNick" maxlength="16" value="${escHtml(olNick())}" autocomplete="off"></div>
  <div id="olWarn" class="olnote warn">${olBlocked()?'The debug panel was used on this save, so you are not ranked.':olAdmin()?'Admin mode: debug panel unlocked online.':''}</div>
  <div class="oltabs">${OL_TABS.map(t=>`<button data-t="${t[0]}" class="${t[0]===OL.tab?'act':''}">${t[1]}</button>`).join('')}</div>
  <div id="olList" class="ollist"></div><div id="olErr" class="olnote warn"></div>
  <h3 class="olh">Live big wins</h3><div id="olFeed" class="olfeed"></div>
  <details class="oldet"><summary>Permanent leaderboard (optional)</summary><p class="olnote">Paste a Firebase Realtime Database URL with public read/write rules to keep scores forever instead of the 12-hour public relay. Scores are reported by each browser and are not verified, so this is for friends.</p>
  <div class="field"><input id="olFb" placeholder="https://your-app-default-rtdb.firebaseio.com" value="${escHtml(ui.fb||'')}" autocomplete="off"></div></details>`,
  actions:[{id:'olsave',label:'Save nickname',cls:'btn',fn:async()=>{ const n=$('#olNick').value.trim(); if(!olOk(n)){ Snd.err(); toast('Nickname: 3-14 letters, numbers, space . _ -'); return; } if(olTaken(n)){ Snd.err(); toast('That name is taken'); return; }
      const fb=$('#olFb').value.trim(); if(fb!==(ui.fb||'')){ if(fb&&!/^https:\/\/[\w.-]+\.(firebaseio\.com|firebasedatabase\.app)\/?$/.test(fb)){ toast('That does not look like a Firebase URL'); return; } ui.fb=fb; if(!OL.db){ OL.mode=fb?'rest':(navigator.onLine?'pub':'off'); if(fb) olRestPull(); else if(OL.mode==='pub') olPubPull(); } }
      ui.nick=n; save(); Snd.chest(); toast('Welcome, '+n); olBadge(); OL.t=0; olPush(); }}],
  wire:c=>{ $$('.oltabs button',c).forEach(b=>b.onclick=()=>{ OL.tab=b.dataset.t; $$('.oltabs button',c).forEach(x=>x.classList.toggle('act',x===b)); Snd.click(); olDraw(); });
    olDraw(); if(OL.mode==='rest') olRestPull(); }});
}
const escHtml=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
$('#olBtn').onclick=()=>{ wake(); Snd.click(); openOnline(); };
olInit(); tkRender(); window.addEventListener('online',async()=>{ if(!OL.db&&OL.mode==='off'){ if(ui.fb){ OL.mode='rest'; olBadge(); olRestPull(); } else { OL.mode='pub'; if(await olPubPull(true)){ olBadge(); } else OL.mode='off'; } } });

/* ============================== ICON EDITOR (debug / admin, shared online) ============================== */
const IC_KEY='g1c-cfg'; let IC_IMG='';
let CFG={v:0,icons:[]}; const IC_ORIG={}, IC_DEF=new Set(SYMS);
const icHex=s=>/^#[0-9a-fA-F]{6}$/.test(s);
function icSan(s){
  if(!s||typeof s!=='object') return null; const id=String(s.id||'').toUpperCase(); if(!/^[A-Z0-9]{2,12}$/.test(id)||id==='WILD'||id==='SCATTER') return null;
  const g=Array.from(String(s.glyph||'')).slice(0,4).join(''), img=(typeof s.img==='string'&&s.img.length<=26000&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/=]+$/.test(s.img))?s.img:''; if(!g&&!img) return null; const cl=(x,d)=>icHex(x)?x:d, nm=(x,lo,hi,d)=>{ x=+x; return isFinite(x)?Math.max(lo,Math.min(hi,x)):d; };
  const o={id,name:String(s.name||id).slice(0,18),glyph:g,fg:cl(s.fg,'#ffffff'),bg1:cl(s.bg1,'#d8312f'),bg2:cl(s.bg2,'#5b0f12'),shape:['circle','round','gem','none'].includes(s.shape)?s.shape:'circle'}; if(img) o.img=img;
  if(s.w!=null&&s.w!=='') o.w=nm(s.w,0,40,8); if(s.p3!=null&&s.p3!=='') o.p3=nm(s.p3,1,1000,5); if(s.p4!=null&&s.p4!=='') o.p4=nm(s.p4,1,3000,15); if(s.p5!=null&&s.p5!=='') o.p5=nm(s.p5,1,10000,50);
  return o;
}
function icBuild(sym,s){
  const NS='http://www.w3.org/2000/svg', mk=(t,a,p)=>{ const e=document.createElementNS(NS,t); for(const k in a) e.setAttribute(k,a[k]); if(p) p.appendChild(e); return e; };
  while(sym.firstChild) sym.removeChild(sym.firstChild); const gid='gi-'+s.id;
  const df=mk('defs',{},sym), lg=mk('linearGradient',{id:gid,x1:0,y1:0,x2:0,y2:1},df); mk('stop',{offset:0,'stop-color':s.bg1},lg); mk('stop',{offset:1,'stop-color':s.bg2},lg);
  if(s.shape==='none'){} else if(s.shape==='circle') mk('circle',{cx:50,cy:50,r:44,fill:'url(#'+gid+')',stroke:'#f3d68a','stroke-width':4},sym);
  else if(s.shape==='round') mk('rect',{x:8,y:8,width:84,height:84,rx:22,fill:'url(#'+gid+')',stroke:'#f3d68a','stroke-width':4},sym);
  else mk('polygon',{points:'50,5 90,30 90,70 50,95 10,70 10,30',fill:'url(#'+gid+')',stroke:'#f3d68a','stroke-width':4,'stroke-linejoin':'round'},sym);
  if(s.img){ const pad=s.shape==='none'?3:14, im=mk('image',{x:pad,y:pad,width:100-2*pad,height:100-2*pad,preserveAspectRatio:'xMidYMid meet'},sym); im.setAttribute('href',s.img); return; }
  mk('ellipse',{cx:42,cy:26,rx:24,ry:9,fill:'#fff','fill-opacity':.28},sym);
  const n=Array.from(s.glyph).length, t=mk('text',{x:50,y:52,'text-anchor':'middle','dominant-baseline':'central',fill:s.fg,'font-size':n>=4?24:n===3?30:n===2?40:54,'font-weight':900,'font-family':'system-ui,"Apple Color Emoji","Segoe UI Emoji",sans-serif'},sym); t.textContent=s.glyph;
}
function icApply(){
  const spriteOf=document.getElementById('s-SEVEN'), root=spriteOf&&spriteOf.parentNode; if(!root) return;
  const want=new Map(CFG.icons.map(s=>[s.id,s]));
  for(const id of Object.keys(IC_ORIG)) if(!want.has(id)&&IC_DEF.has(id)){ const el=document.getElementById('s-'+id); if(el){ el.innerHTML=IC_ORIG[id]; } delete IC_ORIG[id]; }
  for(const s of [...SYMS]) if(!IC_DEF.has(s)&&!want.has(s)){ SYMS.splice(SYMS.indexOf(s),1); delete WEIGHTS[s]; delete PAY[s]; const el=document.getElementById('s-'+s); if(el) el.remove(); }
  want.forEach((s,id)=>{
    let el=document.getElementById('s-'+id);
    if(!el){ el=document.createElementNS('http://www.w3.org/2000/svg','symbol'); el.id='s-'+id; el.setAttribute('viewBox','0 0 100 100'); root.appendChild(el); }
    else if(IC_DEF.has(id)&&!(id in IC_ORIG)) IC_ORIG[id]=el.innerHTML;
    icBuild(el,s);
    if(!IC_DEF.has(id)){ if(!SYMS.includes(id)) SYMS.splice(SYMS.indexOf('WILD'),0,id); NAMES[id]=s.name; }
    if(s.w!=null){ WEIGHTS[id]=s.w; }
    else if(!IC_DEF.has(id)&&WEIGHTS[id]==null) WEIGHTS[id]=8;
    if(!IC_DEF.has(id)||s.p3!=null||s.p4!=null||s.p5!=null){ const p=PAY[id]||(PAY[id]={3:5,4:15,5:50}); if(s.p3!=null) p[3]=s.p3; if(s.p4!=null) p[4]=s.p4; if(s.p5!=null) p[5]=s.p5; }
  });
  try{ icList(); }catch(e){}
  try{ dbgRefreshIcons(); }catch(e){}
}
function icLoad(){ try{ const c=JSON.parse(localStorage.getItem(IC_KEY)||'null'); if(c&&Array.isArray(c.icons)){ CFG={v:+c.v||0,icons:c.icons.map(icSan).filter(Boolean)}; } }catch(e){} }
function icSaveLocal(){ try{ localStorage.setItem(IC_KEY,JSON.stringify(CFG)); }catch(e){} }
icReceive=function(v,json){
  v=+v||0; if(v<=CFG.v||typeof json!=='string'||json.length>900000) return;
  try{ const c=JSON.parse(json); if(!c||!Array.isArray(c.icons)) return; CFG={v,icons:c.icons.slice(0,24).map(icSan).filter(Boolean)}; icSaveLocal(); icApply(); try{ if(OL.mode!=='off') toast('Icon pack updated'); }catch(e){} }catch(e){}
};
async function icPublish(){
  CFG.v=Date.now(); icSaveLocal(); icApply(); const json=JSON.stringify({icons:CFG.icons});
  if(OL.mode==='off'){ toast('Saved on this device only (offline)'); return; }
  if(!olAdmin()){ toast('Only the admin can publish icons'); return; }
  try{
    if(OL.mode==='artifact') await OL.db.doc('config/icons').set({v:CFG.v,json});
    else if(OL.mode==='rest') await olRest('/cfg.json',{method:'PUT',body:JSON.stringify({v:CFG.v,json})});
    else if(json.length>3000){ toast('Image icons need the Firebase database or the artifact to sync'); return; } else if(!await olPubSend({k:'cfg',v:CFG.v,json,nick:OL_ADMIN})) throw new Error('send');
    toast('Icons published to all players');
  }catch(e){ toast(OL.mode==='artifact'?'Publish refused: only the artifact owner/editors can write config':'Could not publish icons'); }
}
function icList(){
  const box=$('#dIcons'); if(!box) return; box.textContent='';
  [...SYMS.filter(s=>s!=='WILD'&&s!=='SCATTER'),'WILD','SCATTER'].forEach(id=>{ const b=document.createElement('button'); b.className='icb'+(CFG.icons.some(s=>s.id===id)?' act':'');
    b.innerHTML=`<svg viewBox="0 0 100 100" width="34" height="34"><use href="#s-${id}"/></svg><small>${escHtml(id)}</small>`; if(id!=='WILD'&&id!=='SCATTER') b.onclick=()=>icEdit(id); box.appendChild(b); });
  const a=document.createElement('button'); a.textContent='+ Add icon'; a.onclick=()=>icEdit(null); box.appendChild(a);
  const rs=document.createElement('button'); rs.textContent='Reset all icons'; rs.onclick=async()=>{ CFG.icons=[]; await icPublish(); }; box.appendChild(rs);
}
function icEdit(id){
  const cur=CFG.icons.find(s=>s.id===id), isDef=id&&IC_DEF.has(id), cp=PAY[id]||{3:5,4:15,5:50};
  const s=cur||{id:id||'',name:id?(NAMES[id]||id):'',glyph:'★',fg:'#ffffff',bg1:'#d8312f',bg2:'#5b0f12',shape:'circle',w:WEIGHTS[id]??8,p3:cp[3],p4:cp[4],p5:cp[5]};
  const v=(k,d)=>escHtml(s[k]!=null?s[k]:d);
  openModal({title:id?'Edit '+escHtml(id):'Add icon',html:`<div class="icprev"><svg viewBox="0 0 100 100" width="84" height="84"><use id="icPv" href="#s-${id||'SEVEN'}"/></svg><svg id="icPvs" viewBox="0 0 100 100" width="0" height="0" style="position:absolute"><symbol id="s-ICPREVIEW" viewBox="0 0 100 100"></symbol></svg></div>
  <div class="field"><label>ID (A-Z, 0-9)</label><input id="icId" maxlength="12" value="${v('id','')}" ${id?'disabled':''}></div>
  <div class="field"><label>Name</label><input id="icName" maxlength="18" value="${v('name','')}"></div>
  <div class="field"><label>PNG / image (optional, overrides the icon text)</label><span class="icc"><input id="icFile" type="file" accept="image/png,image/jpeg,image/webp"><button id="icNoImg" type="button">Remove</button></span></div>
  <div class="field"><label>Icon (emoji or 1-4 characters)</label><input id="icGlyph" maxlength="8" value="${v('glyph','')}"></div>
  <div class="field"><label>Colors: text / top / bottom</label><span class="icc"><input id="icFg" type="color" value="${v('fg','#ffffff')}"><input id="icB1" type="color" value="${v('bg1','#d8312f')}"><input id="icB2" type="color" value="${v('bg2','#5b0f12')}"></span></div>
  <div class="field"><label>Shape</label><select id="icShape">${['circle','round','gem','none'].map(x=>`<option ${s.shape===x?'selected':''}>${x}</option>`).join('')}</select></div>
  <div class="field"><label>Appears in normal gameplay</label><span class="icc"><input id="icOn" type="checkbox" ${(s.w!=null?s.w>0:(id?(WEIGHTS[id]||0)>0:false))?'checked':''}><input id="icW" type="number" min="1" max="40" step="0.5" value="${escHtml(String((s.w>0?s.w:(id&&WEIGHTS[id]>0?WEIGHTS[id]:8))))}"></span><small>Off = event-only symbol (jackpot cinematic). On = lands on the reels like any symbol; the number is how often (7 is a typical mid symbol).</small></div>
  <div class="field"><label>Pays (x line bet / 10) for 3 / 4 / 5</label><span class="icc"><input id="icP3" type="number" min="1" value="${v('p3',5)}"><input id="icP4" type="number" min="1" value="${v('p4',15)}"><input id="icP5" type="number" min="1" value="${v('p5',50)}"></span></div>
  <div id="icErr" class="olnote warn"></div>`,
  actions:[{id:'icsave',label:'Save and publish',cls:'btn',fn:async()=>{ const o=icSan({id:id||$('#icId').value,name:$('#icName').value,img:IC_IMG,glyph:$('#icGlyph').value,fg:$('#icFg').value,bg1:$('#icB1').value,bg2:$('#icB2').value,shape:$('#icShape').value,w:$('#icOn').checked?Math.max(1,+$('#icW').value||8):0,p3:$('#icP3').value,p4:$('#icP4').value,p5:$('#icP5').value});
      if(!o){ Snd.err(); $('#icErr').textContent='Need an ID of 2-12 letters/numbers (not WILD/SCATTER) and an icon.'; return; }
      if(!id&&(IC_DEF.has(o.id)||SYMS.includes(o.id))){ Snd.err(); $('#icErr').textContent='That ID already exists. Pick the existing icon to edit it.'; return; }
      CFG.icons=CFG.icons.filter(x=>x.id!==o.id); CFG.icons.push(o); if(CFG.icons.length>24){ Snd.err(); $('#icErr').textContent='Limit is 24 custom icons.'; return; }
      closeModal(); Snd.chest(); await icPublish(); }},
   ...(cur?[{id:'icdel',label:isDef?'Reset to original':'Delete icon',cls:'btn',fn:async()=>{ CFG.icons=CFG.icons.filter(x=>x.id!==id); closeModal(); await icPublish(); }}]:[])],
  wire:c=>{ let imgData=s.img||''; IC_IMG=imgData; const upd=()=>{ IC_IMG=imgData; const o=icSan({id:'ICPREVIEW',img:imgData,glyph:$('#icGlyph').value||(imgData?'':'?'),fg:$('#icFg').value,bg1:$('#icB1').value,bg2:$('#icB2').value,shape:$('#icShape').value}); if(!o) return; const sym=document.getElementById('s-ICPREVIEW'); icBuild(sym,o); $('#icPv').setAttribute('href','#s-ICPREVIEW'); };
    ['icGlyph','icFg','icB1','icB2','icShape'].forEach(k=>{ $('#'+k,c).oninput=upd; $('#'+k,c).onchange=upd; }); upd();
    $('#icNoImg',c).onclick=()=>{ imgData=''; $('#icFile',c).value=''; upd(); };
    $('#icFile',c).onchange=e=>{ const f=e.target.files[0]; if(!f) return; if(f.size>4e6){ toast('Image too large (4 MB max)'); return; } const im=new Image(), u=URL.createObjectURL(f); im.onload=()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=96; const x=cv.getContext('2d'), k=Math.min(96/im.width,96/im.height); x.drawImage(im,(96-im.width*k)/2,(96-im.height*k)/2,im.width*k,im.height*k); URL.revokeObjectURL(u); let d=cv.toDataURL('image/png'); if(d.length>26000) d=cv.toDataURL('image/webp',.8); if(d.length>26000){ toast('Image too detailed, try a simpler one'); return; } imgData=d; upd(); }; im.onerror=()=>toast('Could not read that image'); im.src=u; }; }});
}
icLoad(); icApply();
setTimeout(()=>{ if(olAdmin()&&CFG.icons.length&&OL.mode==='pub'&&Date.now()-(+localStorage.getItem('g1c-cfgpost')||0)>6*3600e3){ try{ localStorage.setItem('g1c-cfgpost',String(Date.now())); }catch(e){} olPubSend({k:'cfg',v:CFG.v,json:JSON.stringify({icons:CFG.icons}),nick:OL_ADMIN}); } },8000);

/* ---------- optional email account: same progress on several devices ---------- */
const AC_E=new TextEncoder(), acHex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const acHash=async e=>acHex(await crypto.subtle.digest('SHA-256',AC_E.encode('g1c|'+e))).slice(0,32);
async function acPw(e,pw){ const k=await crypto.subtle.importKey('raw',AC_E.encode(pw),'PBKDF2',false,['deriveBits']); return acHex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:AC_E.encode('g1c-salt|'+e),iterations:100000},k,256)); }
function acBlob(){ try{ const d=JSON.parse(localStorage.getItem(SAVE)||'null'); if(!d) return null; d.ui=Object.assign({},d.ui); delete d.ui.pid; delete d.ui.acct; delete d.ui.fb; return d; }catch(e){ return null; } }
let acTm=0, acDirty=false;
function acctSchedule(){ if(!ui.acct||window.__g1cDeleted) return; acDirty=true; clearTimeout(acTm); acTm=setTimeout(()=>acPush(false),6000); }
async function acPush(keep){ if(!ui.acct||!ui.fb||!acDirty||window.__g1cDeleted||(document.hidden&&!keep)) return; acDirty=false; const blob=acBlob(); if(!blob) return; const t=Date.now();
  try{ const r=await olRest('/acct/'+ui.acct.h+'.json',{method:'PATCH',keepalive:!!keep,body:JSON.stringify({t,d:ui.pid||'',save:blob})}); if(r.ok) ui.acct.t=t; else acDirty=true; }catch(e){ acDirty=true; } }
function acApply(sv,t){ window.__g1cDeleted=true; const u=Object.assign({},sv.ui||{}); u.pid=ui.pid||(ui.pid=Math.random().toString(36).slice(2,12)); u.fb=ui.fb; u.acct=Object.assign({},ui.acct,{t}); sv.ui=u; try{ localStorage.setItem(SAVE,JSON.stringify(sv)); }catch(e){} setTimeout(()=>location.reload(),150); }
async function acPull(){ if(!ui.acct||!ui.fb||window.__g1cDeleted||document.hidden) return; try{ const r=await olRest('/acct/'+ui.acct.h+'.json').then(r=>r.ok?r.json():{error:1}); if(r&&r.error) return; if(!r||r.ph!==ui.acct.ph){ if(r) { ui.acct=null; save(); toast('Account password changed. Logged out.'); } return; } if((+r.t||0)>(+ui.acct.t||0)&&r.d!==ui.pid&&r.save){ if(state.busy){ setTimeout(acPull,4000); return; } toast('Loading your progress from your other device…'); acApply(r.save,r.t); } }catch(e){} }
document.addEventListener('visibilitychange',()=>{ if(document.hidden){ if(acDirty) acPush(true); } else setTimeout(acPull,400); });
setTimeout(acPull,2500);
function acctLogin(){
  const on=ui.acct;
  openModal({title:on?'Email account':'Log in with email',html:on?`<p class="olnote">Logged in as <b>${escHtml(ui.acct.e||'')}</b>. Your progress is saved to this account and follows you to every device you log in on. Switching back to a device loads the latest progress.</p>`:`<p class="olnote">Optional. Log in on a second device to continue with the same balance, level and stats. New email? An account is created from this device's progress. Existing email? This device loads the account's progress instead. Play-money game: do not reuse a real password.</p>
  <div class="field"><div><label for="acE">Email</label></div><input id="acE" type="email" autocomplete="email" autocapitalize="off" spellcheck="false"></div>
  <div class="field"><div><label for="acP">Password</label><small>6+ characters</small></div><input id="acP" type="password" autocomplete="current-password"></div><div id="acErr" class="olnote warn"></div>`,
  actions:on?[{id:'aclo',label:'Log out of this device',cls:'btn',fn:()=>{ ui.acct=null; save(); closeModal(); toast('Logged out. Progress stays on this device.'); }}]:[{id:'acgo',label:'Log in / create',cls:'btn',fn:async()=>{
    const e=($('#acE').value||'').trim().toLowerCase(), p=$('#acP').value||'', er=$('#acErr'); if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)){ Snd.err(); er.textContent='Enter a valid email address.'; return; } if(p.length<6){ Snd.err(); er.textContent='Password needs 6 or more characters.'; return; } if(!ui.fb){ Snd.err(); er.textContent='Online server is not set up.'; return; }
    er.textContent='Working…'; try{ const h=await acHash(e), ph=await acPw(e,p), r=await olRest('/acct/'+h+'.json').then(async x=>{ const j=await x.json().catch(()=>null); if(!x.ok||(j&&j.error)){ const e=new Error('rules'); e.rules=1; throw e; } return j; }); ui.pid=ui.pid||Math.random().toString(36).slice(2,12);
      if(!r){ const t=Date.now(); save(); const blob=acBlob(); const w=await olRest('/acct/'+h+'.json',{method:'PUT',body:JSON.stringify({ph,t,d:ui.pid,save:blob})}); if(!w.ok) throw new Error('w'); ui.acct={h,ph,t,e}; save(); Snd.chest(); closeModal(); toast('Account created'); }
      else if(r.ph!==ph){ Snd.err(); er.textContent='Wrong password for that email.'; }
      else if(r.save){ ui.acct={h,ph,t:r.t,e}; closeModal(); toast('Logged in. Loading your progress…'); acApply(r.save,r.t); }
      else { ui.acct={h,ph,t:r.t||0,e}; save(); closeModal(); }
    }catch(x){ Snd.err(); er.textContent=x&&x.rules?'The server refused it: Firebase rules must allow read and write on /acct.':'Could not reach the server. Try again.'; } }}],
  wire:c=>{ const i=$('#acE',c); if(i){ setTimeout(()=>{ try{ i.focus(); }catch(e){} },80); $('#acP',c).onkeydown=e=>{ if(e.key==='Enter') $('#act_acgo',c).click(); }; } }});
}
window.acctLogin=acctLogin;
