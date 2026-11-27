/* ============================== LIVE CHANNEL + ADMIN CONTROL ============================== */
const ADM_PUB=/*@@ADMPUB@@*/null;
const ADM={t0:Date.now(),q:[],pj:null,lock:false,cine:null,roster:new Map(),sel:null,discreet:true,seen:new Set(),peer:null,cmdSig:'',view:null,fxBusy:false};
const LIVE={mode:null,stream:null,last:0,timer:0,hb:0};
const admKey=()=>{ try{ return JSON.parse(localStorage.getItem('g1c-akey')||'null'); }catch(e){ return null; } };
const fmtDur=ms=>{ ms=Math.max(0,ms|0); const s=Math.floor(ms/1000), h=Math.floor(s/3600), m=Math.floor(s%3600/60); return h?h+'h '+String(m).padStart(2,'0')+'m':m+':'+String(s%60).padStart(2,'0'); };
const b64e=a=>btoa(String.fromCharCode(...new Uint8Array(a))), b64d=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function admSign(obj){
  const jwk=admKey(); if(!jwk) throw new Error('nokey'); const body=JSON.stringify(obj);
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
  const sig=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,new TextEncoder().encode(body)); return {body,sig:b64e(sig)};
}
async function admVerify(m){
  try{ if(!ADM_PUB||!m||typeof m.body!=='string'||typeof m.sig!=='string') return null;
    const key=await crypto.subtle.importKey('jwk',ADM_PUB,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
    const ok=await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,b64d(m.sig),new TextEncoder().encode(m.body)); return ok?JSON.parse(m.body):null;
  }catch(e){ return null; }
}
/* ---------- what a target reports about itself ---------- */
function liveState(){
  const g=(state.grid||[]).map(c=>c.join(',')).join('|');
  return {nick:olNick(),g:game,n:Date.now()-ADM.t0,tt:(S.playMs||0),b:Math.round(state.bal),bt:state.bet,gr:g,w:state.lastWin?Math.round(state.lastWin.pay):0,rs:RS>>>0,cfg:{...cfg},mt:+(+state.meter).toFixed(3),au:state.auto?1:0,bz:state.busy?1:0,q:ADM.q.slice(0,8),pj:ADM.pj||null,lk:ADM.lock?1:0,cn:ADM.cine?1:0,sp:S.spins,ic:CFG.v||0,off:0,bj:game==='bj'&&typeof bjSnap==='function'?bjSnap():0,ts:Date.now()};
}
function livePush(force){
  if(!LIVE.mode||!olOk(olNick())) return; const now=Date.now();
  if(!force&&now-LIVE.last<1200){ if(!LIVE.timer) LIVE.timer=setTimeout(()=>{ LIVE.timer=0; livePush(); },1300); return; }
  LIVE.last=now; const st=liveState();
  if(LIVE.mode==='room'){ OL.room.presence(st).catch(()=>{}); }
  else if(LIVE.mode==='fb'){ fbPutLive(st); }
}
function fbPutLive(st){ const pid=ui.pid||(ui.pid=Math.random().toString(36).slice(2,12)); olRest('/live/'+pid+'.json',{method:'PUT',body:JSON.stringify(st)}).catch(()=>{}); }
function liveStop(){ if(window.__g1cDeleted) return; if(LIVE.mode==='fb'&&ui.pid){ try{ fetch(ui.fb.replace(/\/+$/,'')+'/live/'+ui.pid+'.json',{method:'PATCH',body:JSON.stringify({off:1,ts:Date.now()}),keepalive:true}); }catch(e){} } }
/* ---------- minimal Firebase RTDB streaming client ---------- */
function fbStream(path,cb,qs){
  let es=null, tree=null, dead=false;
  const setPath=(p,data,merge)=>{ if(p==='/'||p===''){ if(merge&&tree&&typeof data==='object'&&data) Object.assign(tree,data); else tree=data; return; }
    if(!tree||typeof tree!=='object') tree={}; const parts=p.split('/').filter(Boolean); let o=tree; parts.forEach((k,i)=>{ if(i===parts.length-1){ if(data===null) delete o[k]; else if(merge&&typeof data==='object'&&typeof o[k]==='object'&&o[k]) Object.assign(o[k],data); else o[k]=data; } else { if(!o[k]||typeof o[k]!=='object') o[k]={}; o=o[k]; } }); };
  const open=()=>{ if(dead) return; es=new EventSource(ui.fb.replace(/\/+$/,'')+path+'.json'+(qs||''));
    es.addEventListener('put',e=>{ try{ const d=JSON.parse(e.data); setPath(d.path,d.data,false); cb(tree); }catch(x){} });
    es.addEventListener('patch',e=>{ try{ const d=JSON.parse(e.data); setPath(d.path,d.data,true); cb(tree); }catch(x){} });
    es.onerror=()=>{ try{ es.close(); }catch(x){} if(!dead) setTimeout(open,4000); }; };
  open(); return ()=>{ dead=true; try{ es.close(); }catch(x){} };
}
/* ---------- start ---------- */
function liveInit(){
  if(OL.mode==='artifact'&&OL.room){
    LIVE.mode='room';
    try{ OL.room.onPeers(ch=>{ const me=ch.peers.find(p=>p.isMe&&p.sameTab); if(me) ADM.peer=me.peer; admIngestRoom(ch.peers); }); }catch(e){}
    try{ OL.room.on('g1c-cmd',m=>{ const d=m&&m.data; if(!d||typeof d!=='object'||!d.c) return; if(d.to&&d.to!==ADM.peer&&d.to!=='*') return; admHandle(d.c,d.id); }); }catch(e){}
  } else if(OL.mode==='rest'&&ui.fb){
    LIVE.mode='fb'; if(!ui.pid) ui.pid=Math.random().toString(36).slice(2,12);
    fbStream('/cmd/'+ui.pid,async tree=>{ try{ if(!tree||typeof tree!=='object') return;
      for(const id of Object.keys(tree)){ const m=tree[id]; if(!m||typeof m!=='object') continue; if(ADM.seen.has(id)) continue; ADM.seen.add(id);
        olRest('/cmd/'+ui.pid+'/'+id+'.json',{method:'DELETE'}).catch(()=>{});
        const d=await admVerify(m); const age=d?Date.now()-d.ts:0; if(!d||d.to!==ui.pid||age<-90000||age>(d.q?14*864e5:90000)||admReplayed(m.sig)){ console.error('cmd rejected',!!d); continue; } if(age>60000) admDefer(d.c,id); else admHandle(d.c,id); } }catch(e){ console.error('cmd err',e&&e.message); } });
    window.addEventListener('pagehide',liveStop);
  }
  if(LIVE.mode){ livePush(true); LIVE.hb=setInterval(()=>{ if(!document.hidden) livePush(true); },10000); }
  admDebugUI();
}
function admIngestRoom(peers){
  ADM.roster.clear();
  peers.forEach(p=>{ const s=p.presence||{}; if(!s.nick||p.isMe) return; ADM.roster.set(p.peer,{id:p.peer,...s,t:p.updatedAt}); });
  admRoomDiff(); admRoster();
}
/* ---------- playtime ---------- */
setInterval(()=>{ if(!document.hidden){ S.playMs=(S.playMs||0)+1000; } },1000);
/* ---------- forced outcomes (shared by the real spin and the admin's prediction) ---------- */
function admLossGrid(bet){ let g,ev; for(let i=0;i<500;i++){ g=randGrid(null,false); ev=evalFull(g,bet); if(ev.total===0&&ev.spins===0) break; } return g; }
function admForceCode(code,bet){
  if(typeof code!=='string') return null;
  if(/^[GR]:[A-Z0-9]{2,12}$/.test(code)){ const id=code.slice(2); if(!SYMS.includes(id)) return null; if(code[0]==='G') return {grid:Array.from({length:5},()=>Array(3).fill(id))}; const g=admLossGrid(bet); for(let i=0;i<5;i++) g[i][1]=id; return {grid:g}; }
  if(code==='J') return {mode:'jackpot'};
  if(code==='L') return {grid:admLossGrid(bet)};
  if(code.startsWith('M:')) return {mode:code.slice(2)};
  if(code.startsWith('P:')) return {pj:code.slice(2)};
  return null;
}
function admTakeForce(){
  if(!ADM.q.length) return null; const code=ADM.q.shift(), f=admForceCode(code,state.bet); if(f&&f.pj) ADM.pj=f.pj; setTimeout(()=>livePush(true),50); return f&&!f.pj?f:(f&&f.pj?{}:null);
}
/* ---------- prediction of the target's next spins (the admin runs the target's own RNG) ---------- */
function admPredict(s,n){
  const keepRS=RS, keepCfg={...cfg}, out=[]; let meter=+s.mt||0;
  try{ RS=s.rs>>>0; Object.assign(cfg,s.cfg||{}); const q=(s.q||[]).slice(); let pj=s.pj||null;
    for(let i=0;i<n;i++){
      const code=q.length?q.shift():null, f=code?admForceCode(code,s.bt):null; if(f&&f.pj) pj=f.pj;
      const o=decideOutcome(s.bt,f&&!f.pj?f:null,{fs:false}), pay=o.ev.total; meter=Math.min(1,meter+cfg.meterStep);
      const bonusFS=o.ev.spins>0, wheelDue=meter>=1&&s.au; let mys=null; if(!bonusFS&&!wheelDue){ mys=pj||mysteryJp(s.bt); pj=null; }
      out.push({pay,bet:s.bt,kind:o.kind,fs:o.ev.spins,mys,forced:!!code}); if(bonusFS||wheelDue||mys) break;
    }
  } finally{ RS=keepRS; Object.keys(cfg).forEach(k=>delete cfg[k]); Object.assign(cfg,keepCfg); }
  return out;
}
/* ---------- audio helpers (files live next to the page: lightning.mp3, xcool.mp3) ---------- */
const ADM_BUF={};
const ADM_P={};
function admLoad(name){
  if(ADM_BUF[name]) return Promise.resolve(ADM_BUF[name]); if(ADM_P[name]) return ADM_P[name];
  const nd=Snd.node&&Snd.node(); if(!nd) return Promise.resolve(null); // no audio context yet: asked again on the next gesture / at spin time
  return ADM_P[name]=(async()=>{
    for(let i=0;i<4;i++){ try{ const r=await fetch(name); if(!r.ok) throw new Error('http'); const ab=await r.arrayBuffer(); const buf=await new Promise((res,rej)=>{ const pr=nd.ctx.decodeAudioData(ab,res,rej); if(pr&&pr.catch) pr.catch(rej); }); ADM_BUF[name]=buf; return buf; }catch(e){ await sleep(500*(i+1)); } }
    delete ADM_P[name]; return null; })();
}
function admPlay(buf,offset,gain){
  const nd=Snd.node(); const src=nd.ctx.createBufferSource(), g=nd.ctx.createGain(); src.buffer=buf; g.gain.value=gain==null?1:gain; src.connect(g); g.connect(nd.out);
  const t=nd.ctx.currentTime+.03; src.start(t,offset||0); return {src,g,t,off:offset||0,ctx:nd.ctx};
}
function admThunderSynth(){
  const nd=Snd.node(); if(!nd) return {dur:2.6,stop(){}}; const c=nd.ctx, t=c.currentTime+.03, len=3, b=c.createBuffer(1,c.sampleRate*len,c.sampleRate), d=b.getChannelData(0);
  for(let i=0;i<d.length;i++){ const x=i/d.length; d[i]=(Math.random()*2-1)*Math.pow(1-x,2.2)*(1+.7*Math.sin(i/9000)); }
  const s=c.createBufferSource(), lp=c.createBiquadFilter(), g=c.createGain(); lp.type='lowpass'; lp.frequency.setValueAtTime(5000,t); lp.frequency.exponentialRampToValueAtTime(160,t+len); g.gain.value=.9; s.buffer=b; s.connect(lp); lp.connect(g); g.connect(nd.out); s.start(t);
  return {dur:len,stop(){ try{ s.stop(); }catch(e){} }};
}
/* ---------- overlays ---------- */
function admOverlay(id,cls){ let e=document.getElementById(id); if(!e){ e=document.createElement('div'); e.id=id; if(cls) e.className=cls; document.body.appendChild(e); } return e; }
function admMsgBox(title,text,after){
  const o=admOverlay('admMsg'); o.textContent=''; const card=document.createElement('div'); card.className='admcard'; const h=document.createElement('b'); h.textContent=title||'Message'; const p=document.createElement('p'); p.textContent=text; const bt=document.createElement('button'); bt.className='btn'; bt.textContent='OK';
  card.append(h,p,bt); o.appendChild(card); o.classList.add('on'); try{ Snd.chest(); }catch(e){} let done=false; const close=()=>{ if(done) return; done=true; o.classList.remove('on'); o.textContent=''; if(after) after(); }; bt.onclick=close; setTimeout(close,45000);
}
/* ---------- KGB eye ---------- */
function admKGB(done){
  if(ADM.fxBusy){ if(done) done(); return; } ADM.fxBusy=true; wake(); try{ Snd.fade(0,.4); }catch(e){}
  const ov=admOverlay('admEye'); ov.textContent=''; const cv=document.createElement('canvas'), hud=document.createElement('div'), fl=document.createElement('div'); hud.className='eyehud'; fl.className='eyeflash';
  const mkh=(c,t)=>{ const e=document.createElement('span'); e.className=c; e.textContent=t; hud.appendChild(e); return e; };
  mkh('tl','KGB // SURVEILLANCE'); mkh('tr','● REC'); mkh('bl','SUBJECT: '+(olNick()||'UNKNOWN').toUpperCase()); const clk=mkh('br',''); const scan=document.createElement('div'); scan.className='eyescan'; hud.appendChild(scan);
  ov.append(cv,hud,fl); ov.classList.add('on'); ov.classList.remove('in'); void ov.offsetWidth; ov.classList.add('in');
  const DPR=Math.min(2,window.devicePixelRatio||1), W=innerWidth, H=innerHeight; cv.width=W*DPR; cv.height=H*DPR; cv.style.width=W+'px'; cv.style.height=H+'px'; const x=cv.getContext('2d'); x.scale(DPR,DPR);
  const EW=Math.min(W*.96,620), cx0=W/2, cy0=H*.46, side=vr(2)?1:-1;
  let pos=[0,0], sc=.5, open=.55, lx=0, ly=0, tlx=0, tly=0, pup=.55, glow=0, ph='in', t0=performance.now(), tStart=t0, blink=-1, nextBlink=t0+900, thunderStarted=false, ended=false, tail=0, snd=null, thunder=null, flashT=-1, fin=false;
  const PK=EW*.5, PKX=side>0?W+PK*.1:-PK*.1, PKY=H*.14, PKF=[[0,1],[.2,0],[.5,0],[.62,.8],[.78,.8],[.9,0],[1,0]]; pos=[PKX+side*PK*.6,PKY]; ph='peek';
  const seeds=Array.from({length:11},()=>({a:Math.random()*6.28,l:.5+Math.random()*.5,w:Math.random()*2}));
  let px=W/2, py=H/2; const onMove=e=>{ const t=e.touches?e.touches[0]:e; if(t){ px=t.clientX; py=t.clientY; } }; addEventListener('pointermove',onMove,true); addEventListener('touchmove',onMove,{capture:true,passive:true}); addEventListener('pointerdown',onMove,true);
  const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2, back=t=>{ const c=2.2; return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2); }, lerp=(a,b,t)=>a+(b-a)*t, cl=(v,a,b)=>Math.max(a,Math.min(b,v));
  const drawEye=(now)=>{
    const w=EW*sc, hh=w*.30*open, cx=pos[0], cy=pos[1]; x.clearRect(0,0,W,H); if(hh<2) return;
    const L=cx-w/2, Rr=cx+w/2; const path=()=>{ x.beginPath(); x.moveTo(L,cy+hh*.05); x.bezierCurveTo(L+w*.22,cy-hh*1.05,Rr-w*.22,cy-hh*1.05,Rr,cy+hh*.05); x.bezierCurveTo(Rr-w*.25,cy+hh*.95,L+w*.25,cy+hh*.95,L,cy+hh*.05); x.closePath(); };
    x.save(); x.shadowColor='rgba(255,20,10,'+(.5+glow*.4)+')'; x.shadowBlur=60+glow*50; x.fillStyle='#2a0000'; path(); x.fill(); x.restore();
    x.save(); path(); x.clip();
    let g=x.createRadialGradient(cx,cy,hh*.1,cx,cy,w*.55); g.addColorStop(0,'#ff6a4a'); g.addColorStop(.35,'#c21212'); g.addColorStop(.75,'#5a0606'); g.addColorStop(1,'#140000'); x.fillStyle=g; x.fillRect(L,cy-hh*1.2,w,hh*2.4);
    x.lineWidth=Math.max(1,w*.004); seeds.forEach(v=>{ const sx=cx+Math.cos(v.a)*w*.5, sy=cy+Math.sin(v.a)*hh*.9; x.strokeStyle='rgba(30,0,0,.55)'; x.beginPath(); x.moveTo(sx,sy); let qx=sx,qy=sy; for(let k=1;k<=4;k++){ qx+=(cx-qx)*.17+Math.sin(v.w*k+now/700)*3; qy+=(cy-qy)*.17+Math.cos(v.w*k)*3; x.lineTo(qx,qy); } x.stroke(); });
    const ir=Math.min(hh*.78,w*.17), ix=cx+lx*w*.2, iy=cy+ly*hh*.35;
    g=x.createRadialGradient(ix,iy,ir*.1,ix,iy,ir); g.addColorStop(0,'#ffe36a'); g.addColorStop(.35,'#ff7a12'); g.addColorStop(.75,'#e01010'); g.addColorStop(1,'#450000'); x.fillStyle=g; x.beginPath(); x.arc(ix,iy,ir,0,7); x.fill(); x.lineWidth=ir*.09; x.strokeStyle='#1c0000'; x.stroke();
    x.save(); x.globalAlpha=.45; for(let k=0;k<26;k++){ const a=k/26*6.283+now/2400; x.strokeStyle=k%2?'#ffd24a':'#9a0000'; x.lineWidth=1.2; x.beginPath(); x.moveTo(ix+Math.cos(a)*ir*.32,iy+Math.sin(a)*ir*.32); x.lineTo(ix+Math.cos(a)*ir*.92,iy+Math.sin(a)*ir*.92); x.stroke(); } x.restore();
    x.fillStyle='#000'; x.beginPath(); x.ellipse(ix,iy,ir*(.1+pup*.22),ir*.95,0,0,7); x.fill();
    x.fillStyle='rgba(255,255,255,.8)'; x.beginPath(); x.ellipse(ix-ir*.38,iy-ir*.42,ir*.13,ir*.07,-.7,0,7); x.fill();
    // heavy, angry lid: slants from low on the left to high on the right
    x.fillStyle='#090000'; x.beginPath(); x.moveTo(L-10,cy-hh*1.6); x.lineTo(Rr+10,cy-hh*1.6); x.lineTo(Rr+10,cy-hh*.62); x.lineTo(cx,cy-hh*.2-open*hh*.1); x.lineTo(L-10,cy+hh*.12); x.closePath(); x.fill();
    x.strokeStyle='rgba(255,50,30,.85)'; x.lineWidth=Math.max(2,w*.008); x.beginPath(); x.moveTo(L-10,cy+hh*.12); x.lineTo(cx,cy-hh*.2-open*hh*.1); x.lineTo(Rr+10,cy-hh*.62); x.stroke();
    x.restore();
    x.strokeStyle='rgba(255,40,25,'+(.7+glow*.3)+')'; x.lineWidth=Math.max(2,w*.007); path(); x.stroke();
  };
  const startThunder=async()=>{ const b=await Promise.race([admLoad('lightning.mp3'),sleep(2500)]); flashT=performance.now(); if(b){ snd=admPlay(b,0,1); snd.src.onended=()=>{ ended=true; }; tail=b.duration*1000; } else { thunder=admThunderSynth(); tail=thunder.dur*1000; setTimeout(()=>{ ended=true; },tail); } };
  const finish=()=>{ if(fin) return; fin=true; removeEventListener('pointermove',onMove,true); removeEventListener('touchmove',onMove,true); removeEventListener('pointerdown',onMove,true); ov.classList.remove('on','in'); ov.textContent=''; ADM.fxBusy=false; admMsgBox('Notice','You are being watched by the KGB. Beware.',()=>{ try{ Snd.fade(1,2.2); }catch(e){} if(done) done(); }); };
  let thT=0;
  (function frame(now){ if(fin) return; const dt=Math.min(50,now-(frame.l||now)); frame.l=now; const t=now-t0;
    clk.textContent=new Date().toLocaleTimeString([], {hour12:false})+'  '+(((now-tStart)/1000)|0).toString().padStart(2,'0')+'s';
    if(ph==='peek'){ const u=cl(t/1800,0,1); let o=1; for(let k=1;k<PKF.length;k++){ if(u<=PKF[k][0]){ const a0=PKF[k-1], f=(u-a0[0])/(PKF[k][0]-a0[0]); o=lerp(a0[1],PKF[k][1],ease(f)); break; } } sc=.5; open=.55; glow=.2; lx=-side*.9; ly=.15+Math.sin(u*30)*.05; pup=.5; pos=[PKX+side*PK*.6*o+Math.sin(now/40)*1.5,PKY]; if(u>=1){ ph='in'; t0=now; } }
    else if(ph==='in'){ const u=cl(t/380,0,1); pos=[lerp(PKX,cx0+side*(W*.18),ease(u)),lerp(PKY,cy0-H*.12,ease(u))]; sc=lerp(.5,.62,u); open=lerp(.55,.8,u); if(u>=1){ ph='dart'; t0=now; } }
    else if(ph==='dart'){ const u=cl(t/620,0,1); lx=Math.sign(Math.sin(u*11))*.85*(1-u*.4); ly=Math.sin(u*7)*.3; tlx=lx; pos=[cx0+side*(W*.18)*(1-ease(u))+Math.sin(u*14)*6,lerp(cy0-H*.12,cy0,ease(u))]; sc=lerp(.62,.78,ease(u)); open=lerp(.8,.95,u); if(u>=1){ ph='slam'; t0=now; } }
    else if(ph==='slam'){ const u=cl(t/260,0,1); sc=lerp(.78,1,back(u)); pos=[cx0,cy0]; open=1; pup=lerp(.55,.12,u); lx=ly=0; glow=u; if(u>=1&&!thunderStarted){ thunderStarted=true; ph='stare'; t0=now; thT=now; startThunder(); try{ shake&&shake(1); flash&&flash(); }catch(e){} } }
    else if(ph==='stare'){ const tx=cl((px-W/2)/(W/2),-1,1), ty=cl((py-H/2)/(H/2),-1,1); tlx=tx; tly=ty; lx+=(tlx*.9-lx)*cl(dt/90,0,1); ly+=(tly*.8-ly)*cl(dt/90,0,1); pos=[cx0+Math.sin(now/53)*1.6+lx*10,cy0+Math.cos(now/61)*1.4+ly*8]; sc=1+Math.sin(now/180)*.012; glow=.5+.5*Math.sin(now/140); pup=.1+.04*Math.sin(now/75);
      if(blink<0&&now>nextBlink){ blink=now; } if(blink>=0){ const bu=(now-blink)/150; open=bu<.5?1-bu*2*.92:.08+(bu-.5)*2*.92; if(bu>=1){ blink=-1; open=1; nextBlink=now+1100+Math.random()*1600; } }
      if(flashT>0){ const f=now-flashT; fl.style.opacity=f<80?.9:f<240?.9*(1-(f-80)/160):(f>320&&f<430)?.5*(1-(f-320)/110):0; }
      if(ended&&now-thT>500||now-thT>16000){ ph='out'; t0=now; } }
    else if(ph==='out'){ const u=cl(t/420,0,1); open=lerp(1,.05,ease(u)); sc=lerp(1,1.35,u); glow=1-u; fl.style.opacity=0; ov.style.opacity=String(1-u); if(u>=1){ ov.style.opacity=''; finish(); return; } }
    drawEye(now); requestAnimationFrame(frame); })(performance.now());
  admLoad('lightning.mp3');
}
/* ---------- custom-symbol jackpot cinematic ---------- */
let CINE_MS=0;
function admBigBuild(el){ el.textContent=''; const r=document.createElement('div'); r.className='abRays'; const t=document.createElement('div'); t.className='abT'; t.textContent='JACKPOT'; const n=document.createElement('div'); n.className='abN'; n.textContent='$0'; el.append(r,t,n); ADM.bigLead=String(1+vr(9))+Array.from({length:6},()=>vr(10)).join(''); }
function admBigNumber(el,t0,t1,now){ const n=el.querySelector('.abN'); if(!n) return; const u=Math.max(0,Math.min(1,(now-t0)/(t1-t0))), digits=Math.max(1,Math.floor(1+Math.pow(u,1.6)*58)); let s=''; for(let i=0;i<digits;i++) s+=i<ADM.bigLead.length?ADM.bigLead[i]:String(vr(10)); n.textContent='$'+s.replace(/\B(?=(\d{3})+(?!\d))/g,','); }
async function admCineSpin(){
  const C=ADM.cine; if(!C||C.running) return; C.running=true; stopAuto(); wake(); ADM.fxBusy=true;
  const OFF=41, HIT=52.68, LEAD=500, GAP=130; // xcool: start at 0:41 (0.5s after the spin starts); the drop measures at ~52.68s
  const nd=Snd.node(); let play=null, synth=null, big=null, skull=null, lat=0;
  const cleanup=()=>{ try{ if(play){ play.g.gain.setTargetAtTime(0,nd.ctx.currentTime,.5); setTimeout(()=>{ try{ play.src.stop(); }catch(e){} },2500); } if(synth) synth.stop(); Snd.fade(1,2.5); }catch(e){}
    try{ clearInterval(ADM.coinT); if(big){ big.classList.remove('on'); big.textContent=''; } if(skull) skull.classList.remove('on'); try{ document.getElementById('banner').className=''; }catch(e){} ['admBW','admDim'].forEach(i=>{ const e=document.getElementById(i); if(e) e.classList.remove('on'); }); document.documentElement.classList.remove('cine-bw'); }catch(e){}
    CINE_MS=0; try{ Snd.whirrStop(); setHot(0,false); Snd.tensionStop(); }catch(e){}
    try{ const g=C.grid||state.grid; state.grid=g; showStatic(); $('#reels').classList.add('idle'); }catch(e){}
    state.busy=false; state.quick=false; ADM.cine=null; ADM.fxBusy=false; try{ setSpinUI(); renderHUD(); livePush(true); }catch(e){} };
  const dog=setTimeout(cleanup,60000); // watchdog: never leave the machine stuck on STOP
  try{
    state.busy=true; state.lastWin=null; setSpinUI(); clearPresentation(); setHot(0,false); Snd.tensionStop(); $('#reels').classList.remove('idle'); livePush(true);
    const g=Array.from({length:5},()=>Array(3).fill(C.sym)); C.grid=g; state.lastGrid=state.grid; state.grid=g; state.quick=false;
    try{ Snd.fade(0,.4); }catch(e){} // the normal music goes out right away
    const buf=await Promise.race([admLoad('xcool.mp3'),sleep(9000)]); // normally preloaded when armed; the machine waits for the music instead of faking it
    const T0=performance.now();
    if(buf&&nd){ lat=(nd.ctx.outputLatency||nd.ctx.baseLatency||0); const at=nd.ctx.currentTime+LEAD/1000; const src=nd.ctx.createBufferSource(), gn=nd.ctx.createGain(); src.buffer=buf; gn.gain.value=1; src.connect(gn); gn.connect(nd.out); src.start(at,OFF); play={src,g:gn,t:at}; }
    else if(nd){ setTimeout(()=>{ synth=admRiser(nd,HIT-OFF+1.2); },LEAD); }
    const dropMs=LEAD+(HIT-OFF)*1000+lat*1000; // the reels spin through the whole intro and the last one lands exactly on the drop
    CINE_MS=Math.max(2000,dropMs-4*GAP); Snd.spinStart(); pullArm();
    const run=runReels(g,null);
    const clock=()=>play?OFF+(nd.ctx.currentTime-play.t)-lat:OFF+(performance.now()-T0-LEAD)/1000;
    big=admOverlay('admBig'); admBigBuild(big);
    await new Promise(res=>{ (function loop(){ if(clock()>=HIT-.01||performance.now()-T0>dropMs+4000) return res(); requestAnimationFrame(loop); })(); });
    // THE DROP: reels land, the number explodes, skull, black and white, shake - all together
    CINE_MS=0; skull=admOverlay('admSkull'); skull.textContent='\u{1F480}'; skull.classList.add('on'); document.documentElement.classList.add('cine-bw'); admOverlay('admBW').classList.add('on'); admOverlay('admDim').classList.add('on'); big.classList.add('on'); try{ const bn=document.getElementById('banner'); bn.querySelector('.tier').textContent='JACKPOT'; bn.querySelector('.amt').textContent=fmt(0); bn.querySelector('.bsub').textContent='x1000 multiplier'; bn.className='show t-jackpot'; }catch(e){} ADM.coinT=setInterval(()=>{ try{ burst(18,innerWidth*(.1+Math.random()*.8),innerHeight*(.25+Math.random()*.4),9,'conf'); }catch(e){} },420);
    try{ shake(1.8); flash(); burst(60,innerWidth/2,innerHeight/2,13,'conf'); }catch(e){}
    await Promise.race([run,sleep(4000)]); const bt0=performance.now();
    await new Promise(res=>{ (function loop(now){ { const u=Math.min(1,(now-bt0)/3200), e=1-Math.pow(1-u,3), amt=Math.floor(state.bet*1000*e); try{ document.querySelector('#banner .amt').textContent=fmt(amt); }catch(e2){} } if(now-bt0>=10000) return res(); requestAnimationFrame(loop); })(performance.now()); });
  }catch(e){ console.error('cine error',e&&e.message); }
  finally{ clearTimeout(dog); cleanup(); }
}
function admRiser(nd,dur){ const c=nd.ctx, t=c.currentTime+.03, o=c.createOscillator(), g=c.createGain(); o.type='sawtooth'; o.frequency.setValueAtTime(70,t); o.frequency.exponentialRampToValueAtTime(900,t+dur); g.gain.setValueAtTime(.0001,t); g.gain.linearRampToValueAtTime(.18,t+dur); g.gain.exponentialRampToValueAtTime(.0001,t+dur+.4); o.connect(g); g.connect(nd.out); o.start(t); o.stop(t+dur+.5); return {stop(){ try{ o.stop(); }catch(e){} }}; }
function admTempSymbol(spec){
  const s=icSan(spec); if(!s) return null; const root=document.getElementById('s-SEVEN').parentNode; let el=document.getElementById('s-'+s.id);
  if(!el){ el=document.createElementNS('http://www.w3.org/2000/svg','symbol'); el.id='s-'+s.id; el.setAttribute('viewBox','0 0 100 100'); root.appendChild(el); } icBuild(el,s); return s.id;
}
/* ---------- command handler (runs on the target) ---------- */
function admHandle(c,id){
  if(!c||typeof c!=='object') return; const k=c.k, num=(x,lo,hi)=>Math.max(lo,Math.min(hi,+x||0));
  try{
    if(k==='kgb') admKGB();
    else if(k==='msg'){ admMsgBox(String(c.title||'Message').slice(0,40),String(c.text||'').slice(0,240)); }
    else if(k==='q'){ const codes=(Array.isArray(c.codes)?c.codes:[]).filter(x=>typeof x==='string'&&/^(J|L|M:[a-z0-9_]{2,20}|[GR]:[A-Z0-9]{2,12}|P:(mini|minor|major|mega|grand))$/.test(x)).slice(0,20); if(c.replace) ADM.q.length=0; ADM.q.push(...codes); ADM.q.length=Math.min(ADM.q.length,30); }
    else if(k==='clearq'){ ADM.q.length=0; ADM.pj=null; }
    else if(k==='cine'){ const sym=c.sym&&typeof c.sym==='object'?admTempSymbol(c.sym):(typeof c.sym==='string'&&/^[A-Z0-9]{2,12}$/.test(c.sym)&&document.getElementById('s-'+c.sym)?c.sym:null); if(sym){ ADM.cine={sym,running:false}; admLoad('xcool.mp3'); addEventListener('pointerdown',()=>admLoad('xcool.mp3'),{once:true,capture:true}); } }
    else if(k==='gift'){ const a=num(c.amt,-1e9,1e9); setBal(Math.max(0,state.bal+a)); toast((a>=0?'A gift from the house: +':'The house takes ')+fmt(Math.abs(a))); }
    else if(k==='lock'){ ADM.lock=!!c.on; toast(ADM.lock?'The machine was locked':'The machine was unlocked'); }
    else if(k==='fs'){ const n=num(c.n,1,50)|0; if(!state.busy) runBonus(()=>freeSpins(n,state.bet)); }
    else if(k==='wheel'){ if(!state.busy) runBonus(()=>wheelBonus(state.bet,['mini','minor','major','mega','grand','cash','fs'].includes(c.kind)?c.kind:undefined)); }
    else if(k==='tune'){ const L={boost:[0,1],nearMiss:[0,1],assist:[0,.05],bonus:[0,.02],wildMult:[.5,4],scatMult:[.5,4],meterStep:[0,.2]}; for(const key in L){ const v=+(c.c||{})[key]; if(isFinite(v)&&(c.c||{})[key]!=null) cfg[key]=Math.min(L[key][1],Math.max(L[key][0],v)); } cfgPreset='custom'; try{ $$('#dPresets button').forEach(b=>b.classList.remove('act')); }catch(e){} toast('Luck was adjusted'); }
    else if(k==='preset'){ if(PRESETS.some(p=>p.id===c.id)) applyPreset(c.id,true); }
    else if(k==='party'){ burst(60,innerWidth/2,innerHeight/2,13,'conf'); coinRain(2200); Snd.win('mega'); }
    else if(k==='shake'){ shake(2); }
    else if(k==='lobby'){ try{ openLobby(); }catch(e){} }
    else if(k==='gmf'){ if(c.g==='rl'){ GMF.rl=(c.n>=0&&c.n<=36)?c.n:null; } else if(c.g==='cr'){ GMF.cr=Array.isArray(c.o)?c.o.map(x=>x-1):null; } toast('Next '+(c.g==='rl'?'roulette spin':'cat race')+' is set'); }
    else if(k==='bjf'){ if(c.kind===''||c.kind==null){ bj.force=null; bj.sticky=false; } else if(BJ_FORCES.some(x=>x[0]===c.kind)){ bj.force=c.kind; bj.sticky=!!c.sticky; } renderBjDebug(); }
    else if(k==='bjluck'){ if(BJ_LUCK[c.luck]){ bj.luck=c.luck; } }
    else if(k==='bjshuffle'){ bjShuffle(); renderBjDebug(); }
    else if(k==='flip'){ admFx('adm-flip',num(c.s,2,30)); }
    else if(k==='invert'){ admFx('adm-inv',num(c.s,2,30)); }
    else if(k==='glitch'){ admFx('adm-glitch',num(c.s,1,12)); try{ Snd.err(); }catch(e){} }
    else if(k==='blackout'){ const o=admOverlay('admBlack'); o.classList.add('on'); setTimeout(()=>o.classList.remove('on'),num(c.s,2,20)*1000); }
    else if(k==='reload'){ setTimeout(()=>{ try{ save(); }catch(e){} location.reload(); },300); }
    else if(k==='setbal'){ setBal(num(c.amt,0,1e13)); toast('Your balance was set by the house'); }
    else if(k==='bet'){ const b=+c.amt; if(BETS.includes(b)&&!state.busy) setBet(b); }
    else if(k==='setjp'){ if(['mini','minor','major','mega','grand'].includes(c.tier)){ J[c.tier]=num(c.amt,0,1e13); renderJP(); } }
    else if(k==='xp'){ gainXp(num(c.n,1,1e6)); flushLevels(); }
    else if(k==='meter'){ state.meter=1; renderMeters(); toast('The lucky meter is full'); }
    else if(k==='sound'){ try{ Snd.win(['win','nice','big','super','mega','jackpot'].includes(c.kind)?c.kind:'big'); }catch(e){} }
  }catch(e){}
  setTimeout(()=>livePush(true),120);
}
/* ---------- sending (admin side) ---------- */
async function admSend(targetId,c){
  if(targetId===selfId()){ admHandle(c,targetId); return true; }
  const id='c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  if(LIVE.mode==='room'){ try{ await OL.room.emit('g1c-cmd',{to:targetId,id,c}); return true; }catch(e){ toast(e&&e.code==='not_permitted'?'Only the artifact owner/editors can send commands':'Command failed'); return false; } }
  if(LIVE.mode==='fb'){ if(!admKey()){ toast('Paste your admin key first'); return false; } try{ const m=await admSign({to:targetId,ts:Date.now(),q:1,c}); await olRest('/cmd/'+targetId+'.json',{method:'POST',body:JSON.stringify(m)}); return true; }catch(e){ toast('Command failed'); return false; } }
  toast('Live control needs the Claude artifact or a Firebase URL'); return false;
}
/* ---------- screen effects, queued commands, replay guard ---------- */
function admFx(cls,secs){ const h=document.documentElement; h.classList.add(cls); clearTimeout(admFx['t'+cls]); admFx['t'+cls]=setTimeout(()=>h.classList.remove(cls),secs*1000); }
function admReplayed(sig){ const key=String(sig||'').slice(0,40); let a=[]; try{ a=JSON.parse(localStorage.getItem('g1c-seen')||'[]'); }catch(e){} if(a.includes(key)) return true; a.push(key); try{ localStorage.setItem('g1c-seen',JSON.stringify(a.slice(-200))); }catch(e){} return false; }
const selfId=()=>LIVE.mode==='room'?(ADM.peer||'me'):(ui.pid||'');
function admSelf(){ if(!LIVE.mode||!olOk(olNick())) return; const id=selfId(); if(id) ADM.roster.set(id,{id,...liveState(),self:1,t:Date.now()}); }
const ADM_PEND=[]; let admPendArm=false;
function admDefer(c,id){ ADM_PEND.push([c,id]); if(admPendArm) return; admPendArm=true; const go=()=>{ removeEventListener('pointerdown',go,true); removeEventListener('keydown',go,true); setTimeout(()=>{ while(ADM_PEND.length){ const [cc,ii]=ADM_PEND.shift(); admHandle(cc,ii); } },2500); }; addEventListener('pointerdown',go,true); addEventListener('keydown',go,true); }
/* ---------- login alerts (admin) ---------- */
ADM.logs=[]; ADM.lastLogin=+(()=>{ try{ return localStorage.getItem('g1c-llast')||0; }catch(e){ return 0; } })(); ADM.llWarm=0; ADM.llMissed=0; ADM.watching=false;
const gname=g=>g==='slots'?'Slots':g==='bj'?'Blackjack':'the lobby';
function admLoginIn(e,fromRoom){
  if(!e||!olOk(String(e.nick||''))||e.nick===olNick()) return; const key=e.nick+'|'+e.ts; if(ADM.logs.some(x=>x.key===key)) return;
  ADM.logs.unshift({key,nick:String(e.nick),g:e.g==='slots'||e.g==='bj'?e.g:'lobby',ts:+e.ts||Date.now(),ev:e.ev==='mode'?'mode':'login',pid:e.pid||''}); ADM.logs.sort((a,b)=>b.ts-a.ts); ADM.logs.length=Math.min(ADM.logs.length,60);
  if(e.ts>ADM.lastLogin){ const L=ADM.logs.find(x=>x.key===key);
    if(Date.now()<ADM.llWarm){ ADM.llMissed++; } else { toast('\u{1F7E2} '+L.nick+(L.ev==='mode'?' is now in ':' logged in · ')+gname(L.g)); try{ Snd.chest(); }catch(x){} ADM.lastLogin=e.ts; try{ localStorage.setItem('g1c-llast',String(e.ts)); }catch(x){} } }
  if(typeof admLogDraw==='function'&&!admBusyUI()) admLogDraw();
}
function admWatchStart(){
  if(ADM.watching||!olAdmin()) return; ADM.watching=true; ADM.llWarm=Date.now()+2500;
  if(LIVE.mode==='fb'){ fbStream('/logins',tree=>{ Object.values(tree||{}).forEach(e=>admLoginIn(e)); if(ADM.llMissed&&Date.now()>=ADM.llWarm-900){ const n=ADM.llMissed; ADM.llMissed=0; const mx=Math.max(...ADM.logs.map(x=>x.ts),ADM.lastLogin); ADM.lastLogin=mx; try{ localStorage.setItem('g1c-llast',String(mx)); }catch(x){} toast(n+' login'+(n>1?'s':'')+' since your last visit (Admin › Logins)'); } },'?orderBy=%22$key%22&limitToLast=40'); }
  else if(LIVE.mode==='room'){ ADM.llWarm=0; }
}
function admRoomDiff(){
  if(!olAdmin()) return; const prev=ADM.prevRoom||null, cur=new Map([...ADM.roster].map(([id,r])=>[id,r.g]));
  if(prev) cur.forEach((g,id)=>{ const r=ADM.roster.get(id); if(!prev.has(id)) admLoginIn({nick:r.nick,g,ts:Date.now(),ev:'login',pid:id}); else if(prev.get(id)!==g) admLoginIn({nick:r.nick,g,ts:Date.now(),ev:'mode',pid:id}); }); ADM.prevRoom=cur;
}
/* announce this player's own login and mode changes */
LIVE.ann=null;
function liveAnnounce(){
  if(!olOk(olNick())) return; if(olAdmin()){ admWatchStart(); return; } const g=game; if(LIVE.ann&&LIVE.ann.g===g) return; const ev=LIVE.ann?'mode':'login'; LIVE.ann={g};
  const o={nick:olNick(),g,ts:Date.now(),ev,pid:ui.pid||''};
  if(OL.mode==='rest'&&ui.fb){ olRest('/logins.json',{method:'POST',body:JSON.stringify(o)}).catch(()=>{}); }
  else if(OL.mode==='pub'){ olPubSend({k:'login',...o}); }
}
setInterval(()=>{ try{ liveAnnounce(); }catch(e){} },2000);
/* ---------- admin roster ---------- */
let admRosterUnsub=null;
/* never rebuild the panel under a finger or while a field/list is focused (that closed the phone keyboard and the pickers) */
function admBusyUI(){ const a=document.activeElement; return !!ADM.touch||!!(a&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)&&a.closest&&a.closest('#modalCard,#debug')); }
function admRoster(){ if(admBusyUI()){ ADM.redraw=true; return; } ADM.redraw=false; if(typeof admListDraw==='function') admListDraw(); if(ADM.view&&ADM.sel) admViewDraw(); }
addEventListener('pointerdown',e=>{ if(e.target.closest&&e.target.closest('#modalCard,#debug')){ ADM.touch=1; clearTimeout(ADM.touchT); } },true);
const admUp=()=>{ clearTimeout(ADM.touchT); ADM.touchT=setTimeout(()=>{ ADM.touch=0; if(ADM.redraw&&!admBusyUI()) admRoster(); },700); };
addEventListener('pointerup',admUp,true); addEventListener('pointercancel',admUp,true); addEventListener('focusout',()=>setTimeout(()=>{ if(ADM.redraw&&!admBusyUI()) admRoster(); },400),true);
function admFbRoster(on){
  if(admRosterUnsub){ admRosterUnsub(); admRosterUnsub=null; } if(!on||LIVE.mode!=='fb') return;
  admRosterUnsub=fbStream('/live',tree=>{ ADM.roster.clear(); Object.entries(tree||{}).forEach(([id,s])=>{ if(!s||!s.nick||id===ui.pid) return; if(Date.now()-(+s.ts||0)>30*864e5) return; ADM.roster.set(id,{id,...s,t:+s.ts||0}); }); admRoster(); });
}
const admOn=r=>LIVE.mode==='room'?true:(!r.off&&Date.now()-(+r.t||0)<40000);
const ago=ms=>{ const m=Math.round(ms/60000); return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' d ago'; };
/* ---------- admin UI ---------- */
function admDebugUI(){
  const box=$('#dAdm'); if(!box) return; box.textContent='';
  const note=(t,c)=>{ const e=document.createElement('div'); e.className='olnote'+(c?' '+c:''); e.textContent=t; box.appendChild(e); return e; };
  note(LIVE.mode==='room'?'Live channel: Claude artifact (online players only)':LIVE.mode==='fb'?'Live channel: Firebase'+(admKey()?' (admin key set)':' (admin key missing)')+' \u00b7 offline players can be targeted':OL.mode==='pub'?'Relay mode: login alerts only. Live control needs the Claude artifact or a Firebase URL':'No live channel: needs the Claude artifact or a Firebase URL');
  const h1=document.createElement('h4'); h1.className='admh'; h1.textContent='Players \u00b7 tap one to control'; box.appendChild(h1); const pl=document.createElement('div'); pl.id='admListIn'; pl.className='admlist'; box.appendChild(pl);
  const h2=document.createElement('h4'); h2.className='admh'; h2.textContent='Recent logins'; box.appendChild(h2); const lg=document.createElement('div'); lg.id='admLogsIn'; lg.className='admlist'; box.appendChild(lg);
  const row=document.createElement('div'); row.className='admbtns'; const kb=document.createElement('button'); kb.textContent='Admin key\u2026'; kb.onclick=()=>admKeyDlg(); row.appendChild(kb);
  if(LIVE.mode==='fb'){ const cl=document.createElement('button'); cl.textContent='Clear login log'; cl.onclick=()=>{ ADM.logs.length=0; olRest('/logins.json',{method:'DELETE'}).catch(()=>{}); admLogDraw(); }; row.appendChild(cl); } box.appendChild(row);
  admFbRoster(true); admListDraw(); admLogDraw();
}
function admKeyDlg(){
  openModal({title:'Admin key',html:`<p class="olnote">Paste the private admin key (JSON). It stays in this browser and signs your commands when you are not inside the Claude artifact.</p><div class="field"><textarea id="akTxt" rows="5" style="width:100%" placeholder='{"kty":"EC",...}'></textarea></div><div id="akErr" class="olnote warn">${admKey()?'A key is stored on this device.':''}</div>`,
    actions:[{id:'aksave',label:'Save key',cls:'btn',fn:()=>{ try{ const j=JSON.parse($('#akTxt').value); if(j.kty!=='EC'||!j.d) throw 0; localStorage.setItem('g1c-akey',JSON.stringify(j)); toast('Admin key saved'); closeModal(); admDebugUI(); }catch(e){ Snd.err(); $('#akErr').textContent='That is not a valid private key.'; } }},{id:'akdel',label:'Remove key',cls:'btn',fn:()=>{ try{ localStorage.removeItem('g1c-akey'); }catch(e){} closeModal(); admDebugUI(); }}]});
}
function admLogDraw(){ ['admLogs','admLogsIn'].forEach(id=>{ const b=document.getElementById(id); if(b) admLogFill(b); }); }
function admLogFill(box){
  box.textContent=''; const items=ADM.logs.map(L=>({nick:L.nick,g:L.g,ts:L.ts,ev:L.ev,pid:L.pid})); const seen=new Set(items.filter(x=>Date.now()-x.ts<3600e3).map(x=>x.nick));
  ADM.roster.forEach(r=>{ if(r.self||!r.nick||seen.has(r.nick)) return; items.push({nick:r.nick,g:r.g,ts:+r.t||0,ev:'seen',pid:r.id}); });
  items.sort((a,b)=>b.ts-a.ts); if(!items.length){ const p=document.createElement('p'); p.className='olnote'; p.textContent='No logins recorded yet. Logins appear here the moment someone opens the game with a username.'; box.appendChild(p); return; }
  items.slice(0,40).forEach(L=>{ const d=document.createElement('button'); d.className='admrow'; const nm=document.createElement('b'); nm.textContent=L.nick; const gm=document.createElement('i'); gm.textContent=gname(L.g).replace('the ',''); const t=document.createElement('span'); t.textContent=(L.ev==='mode'?'switched mode':L.ev==='seen'?'last seen':'logged in')+' \u00b7 '+ago(Date.now()-L.ts); d.append(nm,gm,t); d.onclick=()=>{ const r=(L.pid&&ADM.roster.get(L.pid))||[...ADM.roster.values()].find(x=>x.nick===L.nick); if(r) admPick(r.id); else toast('Not in the player list yet'); }; box.appendChild(d); });
}
function admLogDlg(){
  if(LIVE.mode==='fb') admFbRoster(true);
  openModal({title:'Recent logins',html:`<p class="olnote">Every time someone opens the game with a username, with the mode they entered. Tap one to control them.</p><div id="admLogs" class="admlist"></div>`,actions:LIVE.mode==='fb'?[{id:'lgclr',label:'Clear log',cls:'btn',fn:()=>{ ADM.logs.length=0; olRest('/logins.json',{method:'DELETE'}).catch(()=>{}); admLogDraw(); }}]:[],wire:()=>{ admLogDraw(); try{ const mx=Math.max(ADM.lastLogin,...ADM.logs.map(x=>x.ts)); ADM.lastLogin=mx; localStorage.setItem('g1c-llast',String(mx)); }catch(e){} }});
}
function admListDraw(){ admSelf(); ['admList','admListIn'].forEach(id=>{ const b=document.getElementById(id); if(b) admListFill(b); }); }
function admListFill(box){
  const now=Date.now(), rows=[...ADM.roster.values()].sort((a,b)=>(admOn(b)-admOn(a))||((b.t||0)-(a.t||0)));
  if(!rows.length){ box.textContent=''; box.dataset.sig=''; const p=document.createElement('p'); p.className='olnote'; p.textContent='No other players known yet.'; box.appendChild(p); return; }
  const sig=rows.map(r=>r.id+'|'+admOn(r)+'|'+r.g+'|'+r.nick).join(',');
  if(box.dataset.sig===sig&&box.children.length===rows.length){ rows.forEach((r,i)=>{ const on=admOn(r), d=box.children[i]; d.querySelector('span').textContent=on?'session '+fmtDur(r.n)+' \u00b7 total '+fmtDur((r.tt||0)+(r.n||0)):'last seen '+ago(now-(+r.t||0))+' \u00b7 total '+fmtDur((r.tt||0)+(r.n||0)); d.querySelector('em').textContent=fmt(r.b||0); }); return; }
  box.textContent=''; box.dataset.sig=sig;
  rows.forEach(r=>{ const on=admOn(r), d=document.createElement('button'); d.className='admrow'+(on?'':' off'); const nm=document.createElement('b'); nm.textContent=(on?'● ':'○ ')+r.nick+(r.self?' (you)':''); const gm=document.createElement('i'); gm.textContent=on?(r.g==='slots'?'Slots':r.g==='bj'?'Blackjack':'Lobby'):'offline';
    const t=document.createElement('span'); t.textContent=on?'session '+fmtDur(r.n)+' · total '+fmtDur((r.tt||0)+(r.n||0)):'last seen '+ago(now-(+r.t||0))+' · total '+fmtDur((r.tt||0)+(r.n||0)); const bl=document.createElement('em'); bl.textContent=fmt(r.b||0); d.append(nm,gm,t,bl); d.onclick=()=>admPick(r.id); box.appendChild(d); });
}
function admOpenList(){
  if(!LIVE.mode){ toast('No live channel: use the Claude artifact or set a Firebase URL'); return; }
  openModal({title:'Players',html:`<p class="olnote">Online players first, then offline ones (their commands wait and run when they next log in). Tap one to open the control panel.</p><div id="admList" class="admlist"></div>`,wire:()=>{ admFbRoster(true); admListDraw(); }});
}
function admPick(id){
  const r=ADM.roster.get(id); if(!r) return; const on=admOn(r); if(r.self){ admOpen(id,true); return; }
  openModal({title:'Control '+escHtml(r.nick),html:`<p class="olnote">${on?'Do you want to be discreet? If yes, nothing happens on their screen until you act. If no, they will get a little visit first.':'This player is offline. Everything you send is queued and runs after they next log in and touch the screen. Being discreet is automatic.'}</p>`,
    actions:on?[{id:'admy',label:'Yes, be discreet',cls:'btn',fn:()=>{ closeModal(); admOpen(id,true); }},{id:'admn',label:'No, announce myself',cls:'btn',fn:()=>{ closeModal(); admOpen(id,false); }}]:[{id:'admy',label:'Open control panel',cls:'btn',fn:()=>{ closeModal(); admOpen(id,true); }}]});
}
function admOpen(id,discreet){
  ADM.sel=id; ADM.discreet=discreet; ADM.vtab=ADM.vtab||'Mirror'; ADM.built=null; ADM.icon=null; if(!discreet) admSend(id,{k:'kgb'});
  openModal({title:'Watching',html:`<div id="admView" class="admview"></div>`,wire:()=>{ ADM.view=true; admFbRoster(true); admViewDraw(); },onClose:()=>{ ADM.view=null; ADM.built=null; }});
}
function admIconList(){ return [...CFG.icons.map(s=>s.id),...SYMS.filter(s=>!['WILD','SCATTER'].includes(s)&&!CFG.icons.some(c=>c.id===s))]; }
function admViewDraw(){
  const root=$('#admView'); if(!root){ ADM.view=null; admFbRoster(false); return; } if(ADM.sel===selfId()) admSelf(); const r=ADM.roster.get(ADM.sel);
  const mk=(t,c,p,txt)=>{ const e=document.createElement(t); if(c) e.className=c; if(txt!=null) e.textContent=txt; (p||root).appendChild(e); return e; };
  if(!r){ root.textContent=''; ADM.built=null; mk('p','olnote',null,'That player is no longer in the list.'); return; }
  const on=admOn(r);
  if(ADM.built!==ADM.sel){ root.textContent=''; ADM.built=ADM.sel; mk('div','admhead',null).id='admHead'; const nav=mk('div','dtabs admtabs'); ADM.panes={};
    ['Mirror','Force','Blackjack','Roulette','Cats','Icons','Screen','Tools','Message'].forEach(n=>{ const b=mk('button',null,nav,n); b.dataset.t=n; b.onclick=()=>{ ADM.vtab=n; admTabShow(); }; });
    ['Mirror','Force','Blackjack','Roulette','Cats','Icons','Screen','Tools','Message'].forEach(n=>{ const pn=mk('div','admpane'); pn.dataset.t=n; ADM.panes[n]=pn; });
    admBuildActs(r.id,ADM.panes); admTabShow(); }
  admTabShow();   const head=$('#admHead'); head.textContent=''; mk('b',null,head,r.nick+(r.self?'  (you)':ADM.discreet?'  (discreet)':''));
  mk('span',null,head,(on?(r.g==='slots'?'in Slots':r.g==='bj'?'in Blackjack':r.g==='rl'?'in Roulette':r.g==='cr'?'in Cat Racing':'in the lobby')+' · session '+fmtDur(r.n):'OFFLINE · last seen '+ago(Date.now()-(+r.t||0)))+' · total '+fmtDur((r.tt||0)+(r.n||0)));
  if(!on) mk('span','admwarn',head,'Commands are queued and run when they next log in and touch the screen.');
  if(ADM.vtab!=='Mirror'){ ADM.mirrorStale=true; return; } ADM.mirrorStale=false;
  const P=ADM.panes.Mirror; P.textContent=''; const m=mk('div','admmirror',P);
  const top=mk('div','admtop',m); mk('span',null,top,'Balance '+fmt(r.b||0)); mk('span',null,top,'Bet '+fmt(r.bt||0)); mk('span',null,top,'Last win '+fmt(r.w||0)); mk('span',null,top,'Lucky '+Math.round((r.mt||0)*100)+'%'); mk('span',null,top,!on?'offline (last known)':r.bz?'spinning':r.lk?'locked':r.cn?'cinematic queued':'idle');
  if(r.g==='bj'&&r.bj){ const B=r.bj; const hd=mk('div','admbj',m); mk('div','admq',hd,'Blackjack · '+(B.ph||'bet')+' · bet '+fmt(B.bet||0)+(B.k?' · streak '+B.k:'')+(B.f?' · next hand: '+B.f+(B.st?' (sticky)':''):'')+' · table: '+(B.lk||'fair')); mk('div','admbjrow',hd,'Dealer: '+(B.d||'—')); (B.h||[]).forEach((h,i)=>mk('div','admbjrow',hd,'Hand '+(i+1)+': '+h)); if(!(B.h||[]).length) mk('div','admbjrow',hd,'No hand in play'); mk('p','olnote',P,'Slot spin forecasts are hidden while they are at the blackjack table.'); return; }
  if(r.g==='rl'||r.g==='cr'){ mk('p','olnote',P,'They are playing '+(r.g==='rl'?'roulette':'cat racing')+'. Use the '+(r.g==='rl'?'Roulette':'Cats')+' tab to set their next result. Slot forecasts are hidden.'); return; }
  const grid=mk('div','admgrid',m); const cols=(r.gr||'').split('|').map(c=>c.split(',')); for(let row=0;row<3;row++) for(let c=0;c<5;c++){ const id=(cols[c]&&cols[c][row])||'SEVEN'; const cell=mk('div','admcell',grid); if(/^[A-Z0-9]{2,12}$/.test(id)&&document.getElementById('s-'+id)) cell.innerHTML=symHTML(id); }
  mk('div','admq',m,'Queued: '+((r.q||[]).length?(r.q||[]).join(' → '):'none')+(r.pj?'  · jackpot '+r.pj:'')+(r.cn?'  · custom jackpot waiting for next spin':''));
  if(!on){ mk('p','olnote',P,'The next-10-spins forecast needs them online: their random seed is new every session.'); return; }
  mk('h4',null,P,'Next 10 spins (exact, from their RNG)'); let preds=[]; try{ preds=admPredict(r,10); }catch(e){}
  const tb=mk('div','admpred',P); let net=0; preds.forEach((p,i)=>{ const row=mk('div','admp'+(p.pay>p.bet?' win':p.pay>0?' part':' lose'),tb); net+=p.pay-p.bet; mk('b',null,row,String(i+1)); mk('span',null,row,p.mys?'JACKPOT wheel: '+p.mys.toUpperCase():p.fs?'FREE SPINS':p.kind==='custom'&&p.forced?'forced':p.kind); mk('em',null,row,(p.pay-p.bet>=0?'+':'-')+fmt(Math.abs(p.pay-p.bet))); });
  mk('div','admnet'+(net>=0?' up':' dn'),P,(preds.some(p=>p.fs||p.mys)?'Bonus ahead. Net until then: ':'Net over these spins: ')+(net>=0?'+':'-')+fmt(Math.abs(net)));
}
const ADM_TABS={slots:['Mirror','Force','Icons','Screen','Tools','Message'],bj:['Mirror','Blackjack','Screen','Tools','Message'],rl:['Mirror','Roulette','Screen','Tools','Message'],cr:['Mirror','Cats','Screen','Tools','Message']};
function admTabsFor(r){ return (r&&ADM_TABS[r.g])||null; }
function admTabShow(){ const v=$('#admView'); if(!v) return;
  { const ok=admTabsFor(ADM.roster.get(ADM.sel)); v.querySelectorAll('.admtabs button').forEach(b=>{ b.hidden=!!ok&&!ok.includes(b.dataset.t); }); if(ok&&!ok.includes(ADM.vtab)) ADM.vtab='Mirror'; } if(ADM.vtab==='Mirror'&&ADM.mirrorStale) setTimeout(admViewDraw,0); v.querySelectorAll('.admtabs button').forEach(b=>b.classList.toggle('act',b.dataset.t===ADM.vtab)); Object.entries(ADM.panes).forEach(([k,p])=>p.classList.toggle('on',k===ADM.vtab)); }
function admBuildActs(id,panes){
  const mk=(t,c,p,txt)=>{ const e=document.createElement(t); if(c) e.className=c; if(txt!=null) e.textContent=txt; p.appendChild(e); return e; };
  const send=(c)=>{ Snd.click(); return admSend(id,c); }; const cur=()=>ADM.roster.get(id)||{};
  const btn=(p,t,fn,cls)=>{ const e=mk('button',cls||null,p,t); e.onclick=fn; return e; }; const grp=(p,t)=>{ mk('h4',null,p,t); return mk('div','admbtns',p); };
  const field=(p,ph,type,max)=>{ const e=mk('input',null,p); e.placeholder=ph; if(type) e.type=type; if(max) e.maxLength=max; return e; };
  { const P=panes.Force; mk('h4',null,P,'Slots luck'); const cu=(cur().cfg)||{}; const g=mk('div','admbtns',P); const ps=mk('select',null,g); PRESETS.forEach(p=>{ const o=document.createElement('option'); o.value=p.id; o.textContent=p.name; ps.appendChild(o); }); btn(g,'Apply preset',()=>send({k:'preset',id:ps.value}));
    const defs=[['boost','Big-win chance %',0,100,1,100],['nearMiss','Near misses %',0,100,1,100],['assist','Hit assist %',0,3,.05,100],['bonus','Bonus assist %',0,1,.05,100],['wildMult','Wild strength x',.5,3,.05,1],['scatMult','Scatter strength x',.5,3,.05,1],['meterStep','Meter speed %',0,10,.5,100]]; const sl={};
    defs.forEach(([key,lab,mn,mx,st,f])=>{ const row=mk('div','dsl',P); mk('span',null,row,lab); const inp=mk('input',null,row); inp.type='range'; inp.min=mn; inp.max=mx; inp.step=st; const v0=cu[key]!=null?cu[key]*f:(key==='wildMult'||key==='scatMult'?1:0); inp.value=v0; const out=mk('output',null,row); out.textContent=(+v0).toFixed(st<1?2:0); inp.oninput=()=>{ out.textContent=(+inp.value).toFixed(st<1?2:0); }; sl[key]=[inp,f]; });
    const g2=mk('div','admbtns',P); btn(g2,'Apply these luck settings',()=>{ const c={}; for(const key in sl) c[key]=+sl[key][0].value/sl[key][1]; send({k:'tune',c}); }); }
  { const P=panes.Force, add=mk('label','dchk',P); const ck=mk('input',null,add); ck.type='checkbox'; add.append(' Add to their queue instead of replacing it');
    const q=(codes)=>send({k:'q',codes,replace:!ck.checked}); let g=grp(P,'Jackpots');
    btn(g,'Line jackpot (15 sevens)',()=>q(['J'])); ['mini','minor','major','mega','grand'].forEach(t=>btn(g,t.toUpperCase()+' wheel jackpot',()=>q(['P:'+t])));
    g=grp(P,'Wins'); btn(g,'Mega win',()=>q(['M:mega'])); btn(g,'Big win',()=>q(['M:big'])); btn(g,'Medium win',()=>q(['M:medium'])); btn(g,'Free spins trigger',()=>q(['M:freespins'])); btn(g,'Wild expansion',()=>q(['M:wild']));
    g=grp(P,'Ragebait (so close…)'); [['7 7 → 7 jumps back','tease7'],['4th reel','tease3'],['5th reel','tease4'],['Gems near miss','nearmiss_gem'],['Scatter near miss','nearmiss_scatter'],['Random reel','nearmiss']].forEach(([t,m])=>btn(g,t,()=>q(['M:'+m]))); btn(g,'Ragebait ×3',()=>q(['M:tease7','M:tease3','M:tease4']));
    g=grp(P,'Losing streaks'); [3,5,10,20].forEach(n=>btn(g,n+' losses',()=>q(Array(n).fill('L'))));
    g=grp(P,'Any spin type, next spin'); const sel=mk('select',null,g); MODES.forEach(([m,l])=>{ const o=document.createElement('option'); o.value=m; o.textContent=l; sel.appendChild(o); }); btn(g,'Queue it',()=>q(['M:'+sel.value])); btn(g,'Clear their queue',()=>send({k:'clearq'})); }
  { const P=panes.Roulette; let g=grp(P,'Their next spin'); const rn=field(g,'number 0-36','number',2); btn(g,'Force that number',()=>{ const n=+rn.value; if(rn.value===''||!(n>=0&&n<=36)){ Snd.err(); return; } send({k:'gmf',g:'rl',n}); });
    const pk=a=>a[Math.floor(Math.random()*a.length)]; btn(g,'Zero',()=>send({k:'gmf',g:'rl',n:0})); btn(g,'Random red',()=>send({k:'gmf',g:'rl',n:pk([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36])})); btn(g,'Random black',()=>send({k:'gmf',g:'rl',n:pk([2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35])})); btn(g,'Back to random',()=>send({k:'gmf',g:'rl',n:-1}));
    const P2=panes.Cats; g=grp(P2,'Their next race, by cat number 1-6'); const co=field(g,'finish order e.g. 3 1 5','text',14); btn(g,'Force the finish order',()=>{ const o=(co.value.match(/[1-6]/g)||[]).map(Number); if(!o.length){ Snd.err(); return; } send({k:'gmf',g:'cr',o}); }); [1,2,3,4,5,6].forEach(n=>btn(g,'Cat '+n+' wins',()=>send({k:'gmf',g:'cr',o:[n]}))); btn(g,'Back to random',()=>send({k:'gmf',g:'cr',o:null})); }
  { const P=panes.Blackjack; mk('p','olnote',P,'Works while they are at the blackjack table. The forced hand applies from their next deal.'); const st=mk('label','dchk',P); const sc=mk('input',null,st); sc.type='checkbox'; st.append(' Sticky (every hand until cleared)');
    let g=grp(P,'Rig the next hand'); BJ_FORCES.forEach(([k,l])=>btn(g,l,()=>send({k:'bjf',kind:k,sticky:sc.checked}))); btn(g,'Back to random',()=>send({k:'bjf',kind:''}));
    g=grp(P,'Table luck'); [['fair','Fair'],['hot','Hot (they win more)'],['fire','On fire'],['cold','Cold (they lose more)']].forEach(([k,l])=>btn(g,l,()=>send({k:'bjluck',luck:k})));
    g=grp(P,'Shoe'); btn(g,'Shuffle the shoe',()=>send({k:'bjshuffle'})); }
  { const P=panes.Icons; const ic=admIconList(); mk('p','olnote',P,'Pick a symbol (custom icons first):'); const row=mk('div','admicons',P); const lab=mk('div','olnote',P,'');
    ADM.icon=ADM.icon||ic[0]; lab.textContent='Selected: '+ADM.icon; ic.forEach(sid=>{ const b=mk('button','admic',row); b.title=sid; b.innerHTML=symHTML(sid); b.dataset.i=sid; b.onclick=()=>{ ADM.icon=sid; row.querySelectorAll('.admic').forEach(x=>x.classList.toggle('act',x.dataset.i===sid)); lab.textContent='Selected: '+sid+(CFG.icons.some(c=>c.id===sid)?' (custom)':''); }; if(sid===ADM.icon) b.classList.add('act'); });
    const ck=mk('label','dchk',P); const cb=mk('input',null,ck); cb.type='checkbox'; ck.append(' Add to their queue instead of replacing it'); const q=c=>send({k:'q',codes:[c],replace:!cb.checked});
    const g=grp(P,'Forced wins with the selected icon');
    btn(g,'All 15 cells (normal payout)',()=>{ if(ADM.icon) q('G:'+ADM.icon); }); btn(g,'5 in a row on the middle line',()=>{ if(ADM.icon) q('R:'+ADM.icon); });
    const g2=grp(P,'Cinematic jackpot (music + skull)'); btn(g2,'Arm for their next spin',()=>{ const sid=ADM.icon; if(!sid) return; const spec=CFG.icons.find(s=>s.id===sid); send({k:'cine',sym:spec||sid}); toast('Armed. It fires when they press spin.'); }); }
  { const P=panes.Screen; let g=grp(P,'Visit'); btn(g,'KGB visit',()=>send({k:'kgb'})); btn(g,'Party',()=>send({k:'party'})); btn(g,'Shake',()=>send({k:'shake'})); btn(g,'Win sound',()=>send({k:'sound',kind:'jackpot'}));
    g=grp(P,'Mess with the screen'); btn(g,'Flip upside down (10s)',()=>send({k:'flip',s:10})); btn(g,'Invert colours (8s)',()=>send({k:'invert',s:8})); btn(g,'Glitch (4s)',()=>send({k:'glitch',s:4})); btn(g,'Blackout (6s)',()=>send({k:'blackout',s:6}));
    g=grp(P,'Control'); btn(g,'Lock / unlock machine',()=>send({k:'lock',on:!cur().lk})); btn(g,'Send to lobby',()=>send({k:'lobby'})); btn(g,'Reload their page',()=>send({k:'reload'})); }
  { const P=panes.Tools; let g=grp(P,'Coins'); const gi=field(g,'Amount','number'); btn(g,'Gift / take (+/-)',()=>{ const a=+gi.value; if(!a){ toast('Enter an amount'); return; } send({k:'gift',amt:a}); }); btn(g,'Set balance to',()=>{ const a=+gi.value; if(gi.value===''||!(a>=0)){ toast('Enter an amount'); return; } send({k:'setbal',amt:a}); });
    g=grp(P,'Bet and jackpots'); const bs=mk('select',null,g); BETS.forEach(b=>{ const o=document.createElement('option'); o.value=b; o.textContent=fmt(b); bs.appendChild(o); }); btn(g,'Set their bet',()=>send({k:'bet',amt:+bs.value}));
    const ts=mk('select',null,g); ['mini','minor','major','mega','grand'].forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=t.toUpperCase(); ts.appendChild(o); }); const ji=field(g,'Pool amount','number'); btn(g,'Set that jackpot pool',()=>{ if(!(+ji.value>0)){ toast('Enter an amount'); return; } send({k:'setjp',tier:ts.value,amt:+ji.value}); });
    g=grp(P,'Bonuses'); btn(g,'Free spins (10)',()=>send({k:'fs',n:10})); btn(g,'Free spins (25)',()=>send({k:'fs',n:25})); const ws=mk('select',null,g); ['random','cash','fs','mini','minor','major','mega','grand'].forEach(w=>{ const o=document.createElement('option'); o.value=w; o.textContent=w==='random'?'wheel: random':'wheel: '+w; ws.appendChild(o); }); btn(g,'Open wheel',()=>send({k:'wheel',kind:ws.value})); btn(g,'Fill lucky meter',()=>send({k:'meter'})); btn(g,'+500 XP',()=>send({k:'xp',n:500}));
    g=grp(P,'Luck'); const ps=mk('select',null,g); PRESETS.forEach(p=>{ const o=document.createElement('option'); o.value=p.id; o.textContent=p.name; ps.appendChild(o); }); btn(g,'Set luck preset',()=>send({k:'preset',id:ps.value})); }
  { const P=panes.Message; const ti=field(P,'Title',null,40), tx=field(P,'Message',null,240); const g=mk('div','admbtns',P); btn(g,'Show on their screen',()=>{ if(!tx.value.trim()){ toast('Write a message first'); return; } send({k:'msg',title:ti.value||'Message',text:tx.value}); });
    const g2=grp(P,'Quick messages'); [['Hello','I see you.'],['House notice','The house is feeling generous.'],['Warning','Your luck is being reviewed.'],['Congratulations','You have been selected for something special.']].forEach(([t,x])=>btn(g2,t,()=>send({k:'msg',title:t,text:x}))); }
}
setTimeout(()=>{ try{ admDebugUI(); }catch(e){} },1500);
window.admKGB=admKGB;
