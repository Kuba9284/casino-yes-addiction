/* ============================== ROULETTE + CAT RACING ============================== */
const GMF={rl:null,cr:null}; window.GMF=GMF;
const gmAb=n=>n>=1e6?(+(n/1e6).toFixed(2))+'M':n>=1e3?(+(n/1e3).toFixed(1))+'K':String(n);
const GM_CHIPS=[[1000,'#2f6fd0'],[5000,'#d9263f'],[10000,'#25272b'],[50000,'#7a35d6'],[100000,'#e0ad40'],[250000,'#12985f']];
const GM_ICON_MENU='<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>', GM_ICON_LOBBY='<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>';
function gmHead(id,title){ return `<header class="gmh"><div class="logo" id="${id}Logo"><b>99G1C</b><small>${title}</small></div><div class="hdr-r"><button class="ibtn" id="${id}Lobby" aria-label="Game lobby">${GM_ICON_LOBBY}</button><button class="ibtn" id="${id}Music" aria-label="Music"><svg viewBox="0 0 24 24"><path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2.5"/><circle cx="17" cy="16" r="2.5"/></svg></button><button class="ibtn" id="${id}Sound" aria-label="Sound"><svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg></button><button class="ibtn" id="${id}Menu" aria-label="Menu">${GM_ICON_MENU}</button></div></header>`; }
function crIcon(){ let ck=''; for(let r=0;r<5;r++) for(let c=0;c<2;c++) ck+=`<rect x="${100+c*6}" y="${14+r*10}" width="6" height="10" fill="${(r+c)%2?'#111':'#fff'}"/>`;
  return `<svg viewBox="0 0 120 80" width="120" height="80"><rect x="2" y="8" width="116" height="64" rx="10" fill="#1f5a31" stroke="#e2bb62" stroke-width="3"/><path d="M6 30H98M6 52H98" stroke="#fff" stroke-opacity=".25" stroke-width="2" stroke-dasharray="6 5"/>${ck}
  <g stroke="#fff" stroke-opacity=".7" stroke-width="2.4" stroke-linecap="round"><path d="M10 36h14M6 46h12M12 56h13"/></g>
  <g stroke="#8f4513" stroke-width="4.4" stroke-linecap="round" fill="none"><path d="M36 52L22 61M41 55L31 66M68 52L85 60M63 54L75 65"/><path d="M33 44Q17 38 20 22" stroke="#e08a2e"/></g>
  <path d="M30 46C34 35 52 33 63 38C74 40 77 49 70 55C60 59 40 59 32 54Z" fill="#e08a2e" stroke="#8f4513" stroke-width="1.6"/><path d="M40 37v9M48 36v10M56 37v9" stroke="#b9611a" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="79" cy="41" r="10" fill="#e08a2e" stroke="#8f4513" stroke-width="1.6"/><path d="M72 34L74 24L81 31ZM81 31L88 25L88 36Z" fill="#e08a2e" stroke="#8f4513" stroke-width="1.6" stroke-linejoin="round"/><path d="M74 31L75 27L78 30Z" fill="#e9a3a3"/>
  <ellipse cx="82" cy="39" rx="2.600" ry="3.200" fill="#e8f0a0"/><ellipse cx="82.600" cy="39" rx="1" ry="2.800" fill="#111"/><path d="M87 44l2.400-1.400.2 3z" fill="#e07a86"/><path d="M85 46l12 -2M85 47.500l12 3" stroke="#fff" stroke-opacity=".8" stroke-width="1"/></svg>`; }
function gmChips(host,get,set){ host.innerHTML=''; GM_CHIPS.forEach(([v,c])=>{ const b=document.createElement('button'); b.className='gmchip'+(v===get()?' on':''); b.style.background=c; b.textContent=gmAb(v); b.onclick=()=>{ wake(); Snd.chip(); set(v); $$('.gmchip',host).forEach(x=>x.classList.toggle('on',x===b)); }; host.appendChild(b); }); }
async function gmWin(pay,bet,from){
  const tok=++state.presId, tier=tierOf(pay,bet), T=TIERS[tier], lvl=T[1], ban=$('#banner'), target=state.bal;
  $('#banner .tier').textContent=T[0]; $('#banner .amt').textContent=fmt(0); $('#banner .bsub').textContent=SUBS[vr(SUBS.length)]; ban.className='show t-'+tier; void ban.offsetWidth;
  flash(); shake(lvl); Snd.win(tier); const c=frameCenter(); burst(Math.round(8+lvl*14),c.x,c.y,6+lvl*3,'spark');
  if(lvl>=.65) burst(Math.round(10+lvl*22),c.x,c.y,9+lvl*3,'coin'); if(lvl>=1) coinRain(1200+lvl*1300);
  if(lvl>=1){ ring(); scrFlash('#fff3b8',.2+lvl*.1); } if(lvl>=1.4){ $('#rays').classList.add('on'); burst(40,c.x,c.y,12,'conf'); }
  if(lvl>=1.9){ fountain(2600); setTimeout(()=>{ if(tok===state.presId){ shake(lvl*.7); flash(); ring(); burst(40,c.x,c.y,13,'coin'); } },1100); }
  const dur=tier==='win'?800:tier==='nice'?1200:tier==='big'?2400:tier==='super'?3400:tier==='mega'?4600:6500; let lastTick=0;
  await tween(dur,k=>{ const txt=fmt(Math.floor(pay*easeOut3(k)*100)/100); $('#banner .amt').textContent=txt; state.balShown=from+(target-from)*easeOut3(k); renderHUD(); const n=performance.now(); if(n-lastTick>(tier==='win'?90:55)){ lastTick=n; Snd.tick(k); if(lvl>=1&&Math.random()<.5) Snd.coin(); } },tok);
  state.balShown=state.bal; renderHUD(); if(tok!==state.presId) return false;
  $('#banner .amt').textContent=fmt(pay); await sleep(tier==='win'?600:tier==='nice'?900:1500); if(tok!==state.presId) return false;
  ban.classList.add('out'); $('#rays').classList.remove('on'); await sleep(450); if(tok===state.presId) ban.className=''; return tok===state.presId;
}
function gmWinClear(){ state.presId++; $('#banner').className=''; $('#rays').classList.remove('on'); }
function gmBusy(){ return !!(rl.busy||cr.busy); }
function gmEnter(g){
  wake(); Snd.click(); if(!window.__olGate(()=>gmEnter(g))) return; game=g; $('#welcome').className='gone';
  $('#stage').hidden=true; $('#bj').hidden=true; $('#rl').hidden=g!=='rl'; $('#cr').hidden=g!=='cr'; const host=$(g==='rl'?'#rlfx':'#crfx'); ['banner','flash','ring','rays'].forEach(id=>host.appendChild($('#'+id)));
  document.body.dataset.game=g;
  if(g==='rl') rlShow(); else crShow(); renderHUD(); save();
}
function gmLobby(){ if(gmBusy()){ toast('Finish the round first'); Snd.err(); return; } wake(); Snd.click(); openLobby(); }
function gmMount(){
  const w=document.createElement('div');
  w.innerHTML=`<div class="gm" id="rl" hidden><div class="gmfx" id="rlfx"></div>${gmHead('rl','Roulette')}
   <main class="gmm" data-scroll><div class="rlTop"><canvas id="rlCv" width="600" height="600"></canvas><div id="rlPop"></div><div id="rlHist"></div></div><div class="gmmsg" id="rlMsg">Place your bets</div><div class="rlT" id="rlT"></div></main>
   <footer class="gmf"><div class="gmi"><div><div class="lbl">Balance</div><div class="val gbal"></div></div><div><div class="lbl">Total bet</div><div class="val" id="rlBet">$0</div></div><div><div class="lbl">Last win</div><div class="val win" id="rlWin">&mdash;</div></div></div>
   <div class="gmc" id="rlChips"></div>
   <div class="gmact"><button class="chip" id="rlUndo">Undo</button><button class="chip" id="rlClear">Clear</button><button class="chip" id="rlRebet">Rebet</button><button class="chip" id="rlX2">x2</button><button class="chip gold" id="rlSpin">Spin</button></div></footer></div>
  <div class="gm" id="cr" hidden><div class="gmfx" id="crfx"><div id="crCount"></div></div>${gmHead('cr','Cat Racing')}
   <main class="gmm" data-scroll><canvas id="crCv"></canvas><div id="crCom">Whisker Downs. Pick your cats.</div>
    <div class="crTabs" id="crTabs"></div><div id="crHint"></div><div class="crCards" id="crCards"></div><div id="crSlipBox"><div class="crSt">Race <span id="crNo">#1</span> &middot; Stake <span id="crBet">$0</span> &middot; Balance <span class="gbal"></span></div><div class="crSlip" id="crSlip"></div></div></main>
   <footer class="gmf"><div class="gmc" id="crChips"></div>
   <div class="gmact"><button class="chip" id="crSame">Same bets</button><button class="chip" id="crClear">Clear</button><button class="chip gold" id="crGo">Start</button></div></footer>
   <div id="crRes"><div class="box"><h3 id="crResT"></h3><ol id="crResL"></ol><div class="tot" id="crResN"></div><button class="chip gold" id="crNext">Next race</button></div></div></div>`;
  while(w.firstChild) document.body.appendChild(w.firstChild);
  const g=$('.games'); if(g&&!$('#gRl')){
    const a=document.createElement('button'); a.className='gtile'; a.id='gRl'; a.innerHTML='<div class="gart"><svg viewBox="0 0 100 100" width="88" height="88"><circle cx="50" cy="50" r="44" fill="#15151a" stroke="#e2bb62" stroke-width="4"/><circle cx="50" cy="50" r="30" fill="#b3122a" stroke="#e2bb62" stroke-width="2"/><circle cx="50" cy="50" r="14" fill="#0a7a3a" stroke="#e2bb62" stroke-width="3"/><circle cx="50" cy="12" r="5" fill="#fff"/></svg></div><b>Roulette</b><span>European wheel, one zero. Straight up pays 35 to 1</span><em id="gRlStat"></em>';
    const c=document.createElement('button'); c.className='gtile'; c.id='gCr'; c.innerHTML='<div class="gart">'+crIcon()+'</div><b>Cat Racing</b><span>Six cats, live odds. Win, place, show, exacta, trifecta</span><em id="gCrStat"></em>';
    g.appendChild(a); g.appendChild(c); a.onclick=()=>gmEnter('rl'); c.onclick=()=>gmEnter('cr');
  }
  $('#rlLobby').onclick=$('#crLobby').onclick=gmLobby; $('#rlSound').onclick=$('#crSound').onclick=()=>$('#btnSound').click(); $('#rlMusic').onclick=$('#crMusic').onclick=()=>$('#btnMusic').click(); $('#rlMenu').onclick=$('#crMenu').onclick=()=>{ wake(); Snd.click(); openMenu(); };
}

/* ============================== ROULETTE ============================== */
const RL_ORDER=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const RL_RED=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const rlCol=n=>n===0?'g':RL_RED.has(n)?'r':'b', RL_HEX={g:'#0a7a3a',r:'#b3122a',b:'#15151a'};
const rlNum=(c,r)=>3*c+(3-r);
const RL_PAY={n:35,s:17,t:11,c:8,l:5,col:2,doz:2,eo:1};
function rlCover(key){
  const [t,v]=key.split(':'); if(t==='n'||t==='s'||t==='t'||t==='c'||t==='l') return v.split(',').map(Number);
  const a=[]; for(let n=1;n<=36;n++){
    if(t==='col'){ if(n%3===(+v)%3) a.push(n); } else if(t==='doz'){ if(Math.ceil(n/12)===+v) a.push(n); }
    else if(t==='eo'){ if((v==='low'&&n<=18)||(v==='high'&&n>=19)||(v==='even'&&n%2===0)||(v==='odd'&&n%2===1)||(v==='red'&&RL_RED.has(n))||(v==='black'&&!RL_RED.has(n))) a.push(n); }
  } return a;
}
function rlResolve(bets,n){ let ret=0; for(const k in bets){ if(rlCover(k).includes(n)) ret+=bets[k]*(RL_PAY[k.split(':')[0]]+1); } return ret; }
const rlH=()=>{ const h=S.rlHist||(S.rlHist=[]); if(h.some(n=>typeof n!=='number')) S.rlHist=h.filter(n=>typeof n==='number'); return S.rlHist; };
const rl={bets:{},hist:[],last:null,sel:5000,busy:false,built:false,els:{},wheel:0,ball:null,raf:0,lastWin:0};
function rlSum(){ let s=0; for(const k in rl.bets) s+=rl.bets[k]; return s; }
function rlBuild(){
  const T=$('#rlT'); T.innerHTML=''; rl.els={};
  const mk=(par,cls,txt,key)=>{ const b=document.createElement('button'); b.className=cls; b.textContent=txt; b.dataset.k=key; par.appendChild(b); (rl.els[key]=rl.els[key]||[]).push(b); return b; };
  const z=document.createElement('div'); z.className='rlZ'; mk(z,'g','0','n:0'); T.appendChild(z);
  const N=document.createElement('div'); N.className='rlN'; T.appendChild(N);
  for(let r=0;r<3;r++) for(let c=0;c<12;c++){ const n=rlNum(c,r); const b=mk(N,rlCol(n),n,'n:'+n); b.style.gridColumn=c+1; b.style.gridRow=r+1; }
  const J=(x,y,key)=>{ const j=document.createElement('button'); j.className='j'; j.dataset.k=key; j.style.left=(x/12*100)+'%'; j.style.top=(y/3*100)+'%'; N.appendChild(j); (rl.els[key]=rl.els[key]||[]).push(j); };
  for(let c=0;c<11;c++) for(let r=0;r<3;r++) J(c+1,r+.5,'s:'+[rlNum(c,r),rlNum(c+1,r)].sort((a,b)=>a-b).join(','));
  for(let c=0;c<12;c++) for(let r=0;r<2;r++) J(c+.5,r+1,'s:'+[rlNum(c,r),rlNum(c,r+1)].sort((a,b)=>a-b).join(','));
  for(let c=0;c<11;c++) for(let r=0;r<2;r++) J(c+1,r+1,'c:'+[rlNum(c,r),rlNum(c+1,r),rlNum(c,r+1),rlNum(c+1,r+1)].sort((a,b)=>a-b).join(','));
  for(let c=0;c<12;c++) J(c+.5,3,'t:'+[3*c+1,3*c+2,3*c+3].join(','));
  for(let c=0;c<11;c++) J(c+1,3,'l:'+[3*c+1,3*c+2,3*c+3,3*c+4,3*c+5,3*c+6].join(','));
  for(let r=0;r<3;r++) J(0,r+.5,'s:0,'+rlNum(0,r)); J(0,1,'t:0,'+rlNum(0,0)+','+rlNum(0,1)); J(0,2,'t:0,'+rlNum(0,1)+','+rlNum(0,2));
  const C=document.createElement('div'); C.className='rlC'; T.appendChild(C); [3,2,1].forEach(k=>mk(C,'o','2:1','col:'+k));
  const D=document.createElement('div'); D.className='rlD'; T.appendChild(D); [['1st 12',1],['2nd 12',2],['3rd 12',3]].forEach(([l,k])=>mk(D,'o',l,'doz:'+k));
  const E=document.createElement('div'); E.className='rlE'; T.appendChild(E); [['1-18','low','o'],['Even','even','o'],['Red','red','r'],['Black','black','b'],['Odd','odd','o'],['19-36','high','o']].forEach(([l,k,c])=>mk(E,c,l,'eo:'+k));
  T.onclick=e=>{ const el=e.target.closest('[data-k]'); if(el) rlAdd(el.dataset.k); };
  const ch=$('#rlChips'); gmChips(ch,()=>rl.sel,v=>rl.sel=v);
  $('#rlUndo').onclick=()=>{ if(rl.busy) return; const h=rl.hist.pop(); if(!h) return; Snd.card(); rl.bets[h.k]-=h.a; if(rl.bets[h.k]<=0) delete rl.bets[h.k]; rlPaint(); };
  $('#rlClear').onclick=()=>{ if(rl.busy||!rlSum()) return; Snd.card(); rl.bets={}; rl.hist=[]; rlPaint(); };
  $('#rlRebet').onclick=()=>{ if(rl.busy||!rl.last) return; const add=Object.assign({},rl.last); let tot=0; for(const k in add) tot+=add[k]; if(rlSum()+tot>state.bal){ toast('Not enough balance'); Snd.err(); return; } Snd.chip(); for(const k in add){ rl.bets[k]=(rl.bets[k]||0)+add[k]; rl.hist.push({k,a:add[k]}); } rlPaint(); };
  $('#rlX2').onclick=()=>{ if(rl.busy||!rlSum()) return; if(rlSum()*2>state.bal){ toast('Not enough balance'); Snd.err(); return; } Snd.chip(); for(const k in rl.bets){ rl.hist.push({k,a:rl.bets[k]}); rl.bets[k]*=2; } rlPaint(); };
  $('#rlSpin').onclick=rlSpin; rl.built=true;
}
function rlAdd(k){
  if(rl.busy) return; wake(); const a=rl.sel; if(rlSum()+a>state.bal){ toast('Not enough balance'); Snd.err(); return; }
  Snd.chip(); rl.bets[k]=(rl.bets[k]||0)+a; rl.hist.push({k,a}); rlPaint();
}
function rlPaint(win){
  for(const k in rl.els) rl.els[k].forEach(el=>{ const b=el.querySelector('.bc'); const a=rl.bets[k]; if(a){ if(!b){ const s=document.createElement('span'); s.className='bc'; s.textContent=gmAb(a); el.appendChild(s); } else b.textContent=gmAb(a); } else if(b) b.remove(); el.classList.toggle('win',!!(win&&win.has(k))); });
  $('#rlBet').textContent=fmt(rlSum()); const d=rl.busy; ['rlUndo','rlClear','rlRebet','rlX2'].forEach(i=>$('#'+i).disabled=d); $('#rlSpin').disabled=d||!rlSum();
  $('#rlHist').innerHTML=rlH().filter(n=>typeof n==='number').slice(-14).map(n=>`<i style="background:${RL_HEX[rlCol(n)]}">${n}</i>`).join('');
}
function rlShow(){ if(!rl.built) rlBuild(); rlPaint(); rlDraw(performance.now()); }
const RL_TAU=Math.PI*2, RL_T=6.4;
function rlDraw(tt,st){
  const cv=$('#rlCv'); if(!cv) return; const x=cv.getContext('2d'), W=cv.width, c=W/2, R=c*.97; x.clearRect(0,0,W,W);
  const wa=rl.wheel+(st?st.w:0);
  x.save(); x.translate(c,c);
  const g=x.createRadialGradient(0,0,R*.2,0,0,R); g.addColorStop(0,'#3a2500'); g.addColorStop(1,'#8b5a10'); x.fillStyle=g; x.beginPath(); x.arc(0,0,R,0,RL_TAU); x.fill();
  x.strokeStyle='#fdeeb2'; x.lineWidth=5; x.beginPath(); x.arc(0,0,R*.98,0,RL_TAU); x.stroke();
  const r1=R*.52, r2=R*.84, seg=RL_TAU/37;
  for(let i=0;i<37;i++){ const n=RL_ORDER[i], a0=wa+i*seg-seg/2-Math.PI/2, a1=a0+seg; x.fillStyle=RL_HEX[rlCol(n)]; x.beginPath(); x.arc(0,0,r2,a0,a1); x.arc(0,0,r1,a1,a0,true); x.closePath(); x.fill(); x.strokeStyle='#d8b45a'; x.lineWidth=1.6; x.stroke();
    x.save(); x.rotate(wa+i*seg-Math.PI/2+0); x.translate(0,0); x.rotate(0); x.fillStyle='#fff'; x.font='700 '+Math.round(R*.095)+'px Barlow Condensed, Arial Narrow, sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.translate((r1+r2)/2+R*.05,0); x.rotate(Math.PI/2); x.fillText(n,0,0); x.restore(); }
  const hg=x.createRadialGradient(0,0,0,0,0,r1); hg.addColorStop(0,'#fff3bd'); hg.addColorStop(.5,'#e2bb62'); hg.addColorStop(1,'#6b4508'); x.fillStyle=hg; x.beginPath(); x.arc(0,0,r1*.9,0,RL_TAU); x.fill();
  x.save(); x.rotate(wa); x.fillStyle='#3a2500'; for(let k=0;k<4;k++){ x.rotate(Math.PI/2); x.fillRect(-3,-r1*.8,6,r1*.8); } x.restore();
  x.fillStyle='#fdeeb2'; x.beginPath(); x.arc(0,0,r1*.12,0,RL_TAU); x.fill();
  if(st&&st.trail){ st.trail.forEach((p,k)=>{ const tx=Math.cos(p.a)*p.r*R, ty=Math.sin(p.a)*p.r*R; x.globalAlpha=.08+.22*k/st.trail.length; x.fillStyle='#fff'; x.beginPath(); x.arc(tx,ty,R*(.015+.02*k/st.trail.length),0,RL_TAU); x.fill(); }); x.globalAlpha=1; }
  if(st&&st.hl!=null){ const i=RL_ORDER.indexOf(st.hl), a0=wa+i*(RL_TAU/37)-(RL_TAU/74)-Math.PI/2, a1=a0+RL_TAU/37; x.strokeStyle='rgba(255,236,150,'+(.55+.45*Math.sin(tt/110))+')'; x.lineWidth=R*.035; x.beginPath(); x.arc(0,0,R*.84,a0,a1); x.arc(0,0,R*.52,a1,a0,true); x.closePath(); x.stroke(); }
  if(st&&st.b){ const bx=Math.cos(st.b.a)*st.b.r*R, by=Math.sin(st.b.a)*st.b.r*R; const bg=x.createRadialGradient(bx-3,by-3,1,bx,by,R*.05); bg.addColorStop(0,'#fff'); bg.addColorStop(1,'#bbb'); x.fillStyle=bg; x.shadowColor='rgba(0,0,0,.6)'; x.shadowBlur=6; x.beginPath(); x.arc(bx,by,R*.04,0,RL_TAU); x.fill(); }
  x.restore();
}
function rlSpin(){
  if(rl.busy) return; wake(); const tot=rlSum(); if(!tot) return; if(tot>state.bal){ toast('Not enough balance'); Snd.err(); return; }
  gmWinClear(); rl.tk=(rl.tk||0)+1; rl.busy=true; $('.rlTop').classList.add('rlspin'); $('#rlPop').classList.remove('on'); state.bal-=tot; state.balShown=state.bal; S.rlSpins=(S.rlSpins||0)+1; S.rlWag=(S.rlWag||0)+tot; renderHUD();
  let n=GMF.rl; GMF.rl=null; if(typeof n!=='number'||!(n>=0&&n<=36)) n=Math.floor(Math.random()*37); const bets=Object.assign({},rl.bets);
  const idx=RL_ORDER.indexOf(n), phi=idx*RL_TAU/37, w0=rl.wheel, om=.7, E=w0+om*RL_T+phi, A=RL_TAU*8, t0=performance.now();
  $('#rlMsg').className='gmmsg'; $('#rlMsg').textContent='No more bets'; rlPaint(); let lastIdx=-1, lastTick=0; const trail=[];
  $('#rlT').style.pointerEvents='none'; Snd.tone&&Snd.tone(330,.25,'triangle',.06);
  const fin=()=>{
    $('.rlTop').classList.remove('rlspin'); { const pp=$('#rlPop'); pp.textContent=n; pp.style.background=RL_HEX[rlCol(n)]; void pp.offsetWidth; pp.classList.add('on'); const t1=performance.now(), keepW=w0+om*(RL_T+1.4); const pulse=now=>{ rl.wheel=keepW; rlDraw(now,{w:0,b:{a:keepW+phi-Math.PI/2,r:.68},hl:n}); if(now-t1<1800&&rl.tk===tk) requestAnimationFrame(pulse); else if(rl.tk===tk) rlDraw(now,{w:0,b:{a:keepW+phi-Math.PI/2,r:.68}}); }; const tk=rl.tk; requestAnimationFrame(pulse); }
    rl.wheel=(w0+om*RL_T+om*1.4)%RL_TAU; const win=rlResolve(bets,n); const hitKeys=new Set(Object.keys(bets).filter(k=>rlCover(k).includes(n)));
    const before=state.bal; state.bal+=win; state.balShown=win>tot?before:state.bal; S.rlPaid=(S.rlPaid||0)+win; rlH().push(n); if(rlH().length>40) rlH().shift(); if(win>S.best) S.best=win;
    rl.last=bets; rl.bets={}; rl.hist=[]; rl.busy=false; rl.lastWin=win; $('#rlT').style.pointerEvents=''; $('#rlWin').textContent=win?fmt(win):'$0';
    const m=$('#rlMsg'), net=win-tot; m.className='gmmsg '+(net>0?'win':'lose'); m.textContent=n+' '+(n===0?'green':rlCol(n)==='r'?'red':'black')+' · '+(win?(net>0?'You win ':'You get back ')+fmt(win):'No win');
    if(win&&win<=tot) Snd.chip(); else if(!win) Snd.tone(180,.3,'sawtooth',.04,0,.6);
    rlPaint(hitKeys); renderHUD(); lobbyStats(); save(); if(win>tot) gmWin(win,tot,before); setTimeout(()=>rlPaint(),3500);
  };
  const step=now=>{
    const t=(now-t0)/1000, wt=Math.min(t,RL_T+1.4); const w=om*wt; let b;
    if(t<RL_T){ const u=t/RL_T, ab=E+A*Math.pow(1-u,2.2); const s=Math.min(1,Math.max(0,(u-.6)/.3)); const rO=.92, rP=.68; const r=u<.6?rO:rP+(rO-rP)*Math.pow(1-s,2)+(u<.95?.035*Math.sin(s*22)*(1-s):0); b={a:ab-Math.PI/2+0,r};
      const rel=((ab-(w0+w))-(-0))/(RL_TAU/37); const pi=Math.floor(((ab-w0-w)%RL_TAU+RL_TAU)%RL_TAU/(RL_TAU/37)+.5)%37; if(u>.45&&pi!==lastIdx&&now-lastTick>28){ lastIdx=pi; lastTick=now; Snd.tone&&Snd.tone(1500+Math.random()*900,.03,'square',.025); } }
    else { const ab=w0+w+phi; b={a:ab-Math.PI/2,r:.68}; }
    trail.push({a:b.a,r:b.r}); if(trail.length>9) trail.shift(); rl.wheelTmp=w; const keep=rl.wheel; rl.wheel=w0+w; rlDraw(now,{w:0,b,trail:t<RL_T?trail:null,hl:t>=RL_T?n:null}); rl.wheel=keep;
    if(t<RL_T+1.4) rl.raf=requestAnimationFrame(step); else fin();
  };
  rl.raf=requestAnimationFrame(step);
}

/* ============================== CAT RACING ============================== */
const CR_CATS=[
 {n:'Mr. Biscuit',c:'#e08a2e',d:'#b9611a',spd:78,sta:58,zm:70,t:'Eats first, races second'},
 {n:'Duchess Whiskerton',c:'#f4f1ea',d:'#cfc8bb',spd:66,sta:80,zm:48,t:'Will not be rushed'},
 {n:'Sir Naps-a-Lot',c:'#8a8d96',d:'#5d6068',spd:50,sta:90,zm:35,t:'Wakes up for the final turn'},
 {n:'Tuxedo Tom',c:'#2b2c33',d:'#f4f1ea',spd:74,sta:70,zm:60,t:'Dressed for the occasion'},
 {n:'Pounce de Leon',c:'#d9732a',d:'#8f4513',spd:84,sta:42,zm:88,t:'Flat out from the gate'},
 {n:'Lady Mittens',c:'#e9c79a',d:'#c9712c',spd:62,sta:66,zm:66,t:'Calico, calm, calculating'},
 {n:'Professor Purrington',c:'#7a5636',d:'#4e341c',spd:58,sta:76,zm:52,t:'Has a theory about corners'},
 {n:'Captain Fluff',c:'#f0e2c4',d:'#c8b080',spd:70,sta:62,zm:76,t:'Mostly fluff, some speed'},
 {n:'Meowzart',c:'#e8dcc8',d:'#5b3a2a',spd:72,sta:68,zm:58,t:'Races in perfect time'},
 {n:'Whisker Bisquick',c:'#b08a58',d:'#6b4a26',spd:64,sta:72,zm:62,t:'Reliable and a bit crumbly'},
 {n:'Furrari',c:'#c8242c',d:'#7a1017',spd:88,sta:48,zm:80,t:'Fast, loud, expensive'},
 {n:'Count Chonkula',c:'#4a3a5a',d:'#2a2036',spd:46,sta:86,zm:40,t:'Surprisingly unstoppable'}];
const CR_MOODS=[['Sleepy',-6],['Hungry',-2],['Feisty',5],['Zen',2],['Sulky',-4],['Curious',0],['Zoomies',7]];
const CR_TYPES=[['win','Win',1,.10],['place','Place',1,.10],['show','Show',1,.10],['quin','Quinella',2,.12],['exa','Exacta',2,.14],['tri','Trifecta',3,.16]];
function crFace(c,d,w){ return `<svg viewBox="0 0 60 50" width="${w||54}" height="${(w||54)*.83}"><path d="M8 20L10 3L24 12Z M52 20L50 3L36 12Z" fill="${c}" stroke="#000" stroke-opacity=".35" stroke-width="1.5"/><ellipse cx="30" cy="29" rx="22" ry="19" fill="${c}" stroke="#000" stroke-opacity=".35" stroke-width="1.5"/><path d="M10 10l2-5 7 5z M50 10l-2-5-7 5z" fill="${d}" opacity=".6"/><ellipse cx="21" cy="26" rx="3.4" ry="4.4" fill="#fff"/><ellipse cx="39" cy="26" rx="3.4" ry="4.4" fill="#fff"/><ellipse cx="21" cy="27" rx="1.6" ry="3.4" fill="#111"/><ellipse cx="39" cy="27" rx="1.6" ry="3.4" fill="#111"/><path d="M27 34h6l-3 3.4z" fill="#e88"/><path d="M30 37.400v3M30 40.400q-3 3-6 1M30 40.400q3 3 6 1" stroke="#222" stroke-width="1.3" fill="none"/><path d="M4 33l14 2M4 39l14-2M56 33l-14 2M56 39l-14-2" stroke="#fff" stroke-opacity=".8" stroke-width="1"/></svg>`; }
const cr={race:null,type:'win',picks:[],bets:[],sel:5000,busy:false,built:false,no:1,last:null,raf:0,cache:null};
const crLadder=o=>{ o=o<2?Math.floor(o*20)/20:o<5?Math.floor(o*10)/10:o<10?Math.floor(o*4)/4:o<30?Math.floor(o*2)/2:o<100?Math.floor(o):Math.floor(o/5)*5; return Math.max(1.05,Math.min(5000,o)); };
const crFmt=o=>(o>=10?o.toFixed(o%1?1:0):o.toFixed(2).replace(/0$/,''))+'x';
function crGauss(){ return (Math.random()+Math.random()+Math.random()-1.5)*2; }
function crNew(){
  S.crForm=S.crForm||{}; const pool=CR_CATS.map((c,i)=>i); for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
  const cats=pool.slice(0,6).map((ci,lane)=>{ const c=CR_CATS[ci], m=CR_MOODS[Math.floor(Math.random()*CR_MOODS.length)], f=(S.crForm[c.n]||[]).slice(-5); const fa=f.length?(3.5-f.reduce((a,b)=>a+b,0)/f.length)*2:0;
    const sc=.55*c.spd+.25*c.sta+.2*c.zm+m[1]+fa+crGauss()*5; return {ci,lane,n:c.n,c:c.c,d:c.d,spd:c.spd,sta:c.sta,zm:c.zm,mood:m[0],form:f,s:Math.exp(sc/14),t:c.t}; });
  const tot=cats.reduce((a,c)=>a+c.s,0); cats.forEach(c=>c.p=c.s/tot);
  const P=cats.map(c=>c.p), perm=[]; const O={win:[],place:[],show:[],quin:{},exa:{},tri:{}};
  for(let i=0;i<6;i++){ O.win[i]=O.place[i]=O.show[i]=0; }
  for(let i=0;i<6;i++) for(let j=0;j<6;j++){ if(j===i) continue; const pij=P[i]*P[j]/(1-P[i]); O.exa[i+'-'+j]=pij; O.place[i]+=pij; O.place[j]+=pij; const qk=Math.min(i,j)+'-'+Math.max(i,j); O.quin[qk]=(O.quin[qk]||0)+pij;
    for(let k=0;k<6;k++){ if(k===i||k===j) continue; const p3=pij*P[k]/(1-P[i]-P[j]); O.tri[i+'-'+j+'-'+k]=p3; O.show[i]+=p3; O.show[j]+=p3; O.show[k]+=p3; } }
  for(let i=0;i<6;i++) O.win[i]=P[i];
  const odds=(type,key)=>{ const m=CR_TYPES.find(t=>t[0]===type)[3]; const p=type==='win'||type==='place'||type==='show'?O[type][key]:O[type][key]; return crLadder(1/(p*(1+m))); };
  return {cats,P,O,odds,id:cr.no};
}
function crOddsFor(type,picks){ const r=cr.race; if(type==='win'||type==='place'||type==='show') return r.odds(type,picks[0]); if(type==='quin') return r.odds('quin',Math.min(picks[0],picks[1])+'-'+Math.max(picks[0],picks[1])); if(type==='exa') return r.odds('exa',picks.join('-')); return r.odds('tri',picks.join('-')); }
function crPlace(order){ // plackett-luce draw (admin can force)
  const r=cr.race, left=[0,1,2,3,4,5], out=[]; const f=GMF.cr; GMF.cr=null;
  const forced=[]; if(f){ if(typeof f==='number') forced.push(f); else if(Array.isArray(f)) f.forEach(x=>{ if(x>=0&&x<6&&!forced.includes(x)) forced.push(x); }); }
  while(left.length){ let pick; if(forced.length){ pick=forced.shift(); if(!left.includes(pick)) continue; } else { const tot=left.reduce((a,i)=>a+r.P[i],0); let x=Math.random()*tot; pick=left[left.length-1]; for(const i of left){ x-=r.P[i]; if(x<0){ pick=i; break; } } } left.splice(left.indexOf(pick),1); out.push(pick); }
  return out;
}
function crBuild(){
  const T=$('#crTabs'); T.innerHTML=''; CR_TYPES.forEach(([k,l])=>{ const b=document.createElement('button'); b.textContent=l; b.dataset.t=k; b.onclick=()=>{ if(cr.busy) return; Snd.card(); cr.type=k; cr.picks=[]; crPaint(); }; T.appendChild(b); });
  gmChips($('#crChips'),()=>cr.sel,v=>cr.sel=v);
  $('#crClear').onclick=()=>{ if(cr.busy||!cr.bets.length) return; Snd.card(); cr.bets=[]; cr.picks=[]; crPaint(); };
  $('#crSame').onclick=()=>{ if(cr.busy||!cr.last||!cr.last.length) return; let tot=crSum(); for(const b of cr.last) tot+=b.amt; if(tot>state.bal){ toast('Not enough balance'); Snd.err(); return; } Snd.chip(); cr.last.forEach(b=>{ const lanes=b.lanes; cr.bets.push({type:b.type,picks:lanes.slice(),amt:b.amt,odds:crOddsFor(b.type,lanes)}); }); crPaint(); };
  $('#crGo').onclick=crStart; $('#crNext').onclick=()=>{ $('#crRes').classList.remove('on'); cr.no++; cr.race=crNew(); cr.bets=[]; cr.picks=[]; $('#crCom').textContent='New race. Pick your cats.'; crPaint(); crDraw(0); };
  cr.built=true;
}
function crSum(){ return cr.bets.reduce((a,b)=>a+b.amt,0); }
function crNeed(){ return CR_TYPES.find(t=>t[0]===cr.type)[2]; }
function crPick(i){
  if(cr.busy) return; wake(); const k=cr.picks.indexOf(i); if(k>=0){ cr.picks.splice(k,1); Snd.card(); crPaint(); return; } cr.picks.push(i); Snd.card();
  if(cr.picks.length>=crNeed()){ const a=cr.sel; if(crSum()+a>state.bal){ toast('Not enough balance'); Snd.err(); cr.picks=[]; crPaint(); return; } const picks=cr.picks.slice(); cr.bets.push({type:cr.type,picks,amt:a,odds:crOddsFor(cr.type,picks)}); cr.picks=[]; Snd.chip(); }
  crPaint();
}
const crLabel=b=>{ const n=b.picks.map(i=>(i+1)).join(b.type==='quin'?' & ':' > '); return CR_TYPES.find(t=>t[0]===b.type)[1]+' '+n; };
function crPaint(){
  const r=cr.race; $$('#crTabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===cr.type));
  const need=crNeed(), nm={win:'to win',place:'to finish top 2',show:'to finish top 3',quin:'for 1st and 2nd, any order',exa:'for 1st then 2nd',tri:'for 1st, 2nd, 3rd in order'}[cr.type];
  $('#crHint').textContent=cr.picks.length?`Picked ${cr.picks.map(i=>i+1).join(' then ')}. ${need-cr.picks.length} more`:`Tap ${need===1?'a cat':need+' cats'} ${need===1?'':'in order '}${nm}`;
  const C=$('#crCards'); C.innerHTML=''; r.cats.forEach((c,i)=>{ const b=document.createElement('button'); b.className='crCard'+(cr.picks.includes(i)?' pk':''); const pos=cr.picks.indexOf(i);
    const ot=['win','place','show'].includes(cr.type)?cr.type:'win'; b.innerHTML=`<span class="no">${i+1}</span>${pos>=0?`<span class="pn">${pos+1}</span>`:''}${crFace(c.c,c.d,32)}<b>${c.n}</b><small>${c.mood} · SPD ${c.spd}</small><div class="crOdds"><span>${{win:'W',place:'P',show:'S'}[ot]} ${crFmt(r.odds(ot,i))}</span></div>`;
    b.onclick=()=>crPick(i); C.appendChild(b); });
  $('#crSlip').innerHTML=''; cr.bets.forEach((b,k)=>{ const d=document.createElement('div'); d.innerHTML=`<span>${crLabel(b)} · ${crFmt(b.odds)} · ${fmt(b.amt)}</span>`; const x=document.createElement('button'); x.textContent='×'; x.onclick=()=>{ if(cr.busy) return; cr.bets.splice(k,1); Snd.card(); crPaint(); }; d.appendChild(x); $('#crSlip').appendChild(d); });
  if(!cr.bets.length) $('#crSlip').innerHTML='<div><span style="color:var(--muted)">No bets yet</span></div>';
  $('#crBet').textContent=fmt(crSum()); $('#crNo').textContent='#'+cr.no; $('#crGo').disabled=cr.busy||!cr.bets.length; $('#crClear').disabled=cr.busy; $('#crSame').disabled=cr.busy||!(cr.last&&cr.last.length); $('#cr').classList.toggle('cr-run',cr.busy);
}
function crShow(){ if(!cr.built) crBuild(); if(!cr.race) cr.race=crNew(); crPaint(); const cv=$('#crCv'); const sz=()=>{ const r=cv.getBoundingClientRect(), d=Math.min(2,devicePixelRatio||1); cv.width=Math.max(300,Math.round(r.width*d)); cv.height=Math.max(150,Math.round(r.height*d)); }; sz(); crDraw(0); addEventListener('resize',()=>{ if(game==='cr'&&!cr.busy){ sz(); crDraw(0); } }); }
const CR_PAT={'Mr. Biscuit':'tabby','Pounce de Leon':'tabby','Whisker Bisquick':'tabby','Professor Purrington':'tabby','Lady Mittens':'calico','Tuxedo Tom':'tux','Meowzart':'point','Furrari':'tabby','Count Chonkula':'plain','Captain Fluff':'plain','Duchess Whiskerton':'plain','Sir Naps-a-Lot':'tabby'};
function crLeg(x,hx,hy,ph,front,col,dk,paw){
  const sw=Math.sin(ph), lift=Math.max(0,Math.cos(ph)), fx=hx+sw*(front?8:7)*(front?1:1), fy=hy+10-lift*5.5, kx=hx+sw*3+(front?1.5:-2.5), ky=hy+5-lift*2.5;
  x.strokeStyle=col; x.lineWidth=3.3; x.lineCap='round'; x.lineJoin='round'; x.beginPath(); x.moveTo(hx,hy); x.lineTo(kx,ky); x.lineTo(fx,fy); x.stroke();
  x.strokeStyle=paw; x.lineWidth=3.6; x.beginPath(); x.moveTo(fx-.4,fy-.4); x.lineTo(fx+1.8,fy+.2); x.stroke();
}
function crCat(x,cx,cy,s,col,dk,ph,num,name,spd){
  const pat=CR_PAT[name]||'plain', g=Math.sin(ph), g2=Math.sin(ph*2), stretch=1+.1*g, arch=1-.08*g;
  x.save(); x.translate(cx,cy); x.scale(s,s);
  x.fillStyle='rgba(0,0,0,.28)'; x.beginPath(); x.ellipse(2,13.5,19+g*2,2.6,0,0,Math.PI*2); x.fill();
  for(let k=0;k<3;k++){ const d=((ph*5+k*7)%18); x.fillStyle='rgba(225,205,160,'+(.35*(1-d/18))+')'; x.beginPath(); x.arc(-22-d,12-d*.15,2+d*.22,0,Math.PI*2); x.fill(); }
  const far=pat==='point'||pat==='tux'?dk:col, paw=pat==='tux'?'#f5f2ea':(pat==='point'?dk:col);
  const body=-1.5+g2*1.1;
  x.translate(0,body);
  crLeg(x,-11,4,ph+Math.PI*.9,false,shade(col,-26),dk,paw); crLeg(x,10,3,ph+Math.PI*.25,true,shade(col,-26),dk,paw);
  x.strokeStyle=col; x.lineWidth=3.4; x.lineCap='round'; x.beginPath(); x.moveTo(-17,-1); x.bezierCurveTo(-27,-5-g*3,-30,-14+g*3,-25,-22+g*4); x.stroke();
  if(pat==='tux'||pat==='point'||pat==='tabby'){ x.strokeStyle=pat==='tabby'?dk:far; x.lineWidth=1.6; for(let k=0;k<3;k++){ x.beginPath(); x.moveTo(-26+k*.4,-12-k*3.2+g*2); x.lineTo(-23+k*.4,-13.5-k*3.2+g*2); x.stroke(); } }
  x.fillStyle=col; x.beginPath(); x.moveTo(-17,-1); x.bezierCurveTo(-16,-9*arch-3,-4,-11*arch-1,6,-8*arch); x.bezierCurveTo(14*stretch,-7,16,-1,13,4); x.bezierCurveTo(8,8,-6,8,-13,6); x.bezierCurveTo(-18,4,-19,1,-17,-1); x.fill();
  x.strokeStyle='rgba(0,0,0,.3)'; x.lineWidth=.9; x.stroke();
  x.fillStyle=pat==='tux'?'#f5f2ea':shade(col,28); x.beginPath(); x.ellipse(3,4.8,11,3,0,0,Math.PI*2); x.fill();
  if(pat==='tabby'){ x.strokeStyle=dk; x.globalAlpha=.7; x.lineWidth=1.8; for(let k=0;k<4;k++){ x.beginPath(); x.moveTo(-9+k*5,-9*arch+ (k===0?1.5:0)); x.lineTo(-8+k*5,-3); x.stroke(); } x.globalAlpha=1; }
  if(pat==='calico'){ x.fillStyle='#d9732a'; x.beginPath(); x.ellipse(-6,-3,5,3.6,.3,0,Math.PI*2); x.fill(); x.fillStyle='#3a3a40'; x.beginPath(); x.ellipse(5,-4,3.8,3,-.2,0,Math.PI*2); x.fill(); }
  crLeg(x,-9,4,ph+Math.PI*1.4,false,col,dk,paw); crLeg(x,12,3,ph+Math.PI*.1,true,col,dk,paw);
  x.save(); x.translate(15,-6+g*.8); x.rotate(-.1*g); x.fillStyle=col; x.strokeStyle='rgba(0,0,0,.3)'; x.lineWidth=.9;
  x.beginPath(); x.moveTo(-5,-4); x.lineTo(-6,-11.500); x.lineTo(-1,-6.500); x.closePath(); x.fill(); x.stroke(); x.beginPath(); x.moveTo(1,-6.500); x.lineTo(5,-12); x.lineTo(6,-4); x.closePath(); x.fill(); x.stroke();
  x.fillStyle='#e9a3a3'; x.beginPath(); x.moveTo(-4.4,-5.200); x.lineTo(-5,-9.500); x.lineTo(-2,-6.600); x.fill();
  x.fillStyle=pat==='point'?dk:col; x.beginPath(); x.ellipse(0,0,7.400,6.400,0,0,Math.PI*2); x.fill(); x.stroke(); x.beginPath(); x.ellipse(5.600,2,3.800,2.800,0,0,Math.PI*2); x.fillStyle=pat==='tux'?'#f5f2ea':(pat==='point'?dk:shade(col,22)); x.fill();
  x.fillStyle='#e0e8a0'; x.beginPath(); x.ellipse(2.600,-1.400,1.900,2.100,0,0,Math.PI*2); x.fill(); x.fillStyle='#111'; x.beginPath(); x.ellipse(3.100,-1.400,.7,1.800,0,0,Math.PI*2); x.fill();
  x.fillStyle='#e07a86'; x.beginPath(); x.arc(8.900,.9,1,0,Math.PI*2); x.fill(); x.strokeStyle='rgba(255,255,255,.75)'; x.lineWidth=.6; x.beginPath(); x.moveTo(7,2.500); x.lineTo(13,1.200); x.moveTo(7,3.200); x.lineTo(13,4); x.stroke();
  x.restore();
  x.fillStyle='rgba(0,0,0,.6)'; x.fillRect(-8,-7,9,6.500); x.fillStyle='#fff'; x.font='700 6.500px sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(num,-3.500,-3.800);
  x.restore();
}
function shade(h,a){ const n=parseInt(h.slice(1),16); const f=v=>Math.max(0,Math.min(255,v+a)); return 'rgb('+f(n>>16)+','+f((n>>8)&255)+','+f(n&255)+')'; }
function crDraw(t,st){
  const cv=$('#crCv'); if(!cv) return; const x=cv.getContext('2d'), W=cv.width, H=cv.height, r=cr.race; if(!r) return;
  x.clearRect(0,0,W,H); const top=H*.14, lh=(H-top-H*.04)/6, sx=W*.1, fx=W*.86;
  x.fillStyle='#143a22'; x.fillRect(0,0,W,top);
  for(let i=0;i<60;i++){ const px=(i*37%W), py=top*.2+(i*13%Math.max(8,top*.6)); x.fillStyle=['#e2bb62','#d9263f','#7ef0b0','#fff','#7a35d6'][i%5]; x.globalAlpha=.8; x.beginPath(); x.arc(px,py+Math.sin(t*5+i)*(st&&st.cheer?3:.6),3,0,Math.PI*2); x.fill(); } x.globalAlpha=1;
  for(let i=0;i<6;i++){ x.fillStyle=i%2?'#2a6a38':'#2f7440'; x.fillRect(0,top+i*lh,W,lh); }
  x.fillStyle='rgba(255,255,255,.07)'; for(let i=0;i<=6;i++) x.fillRect(0,top+i*lh-1,W,2);
  x.fillStyle='#e8e8e8'; x.fillRect(sx-4,top,4,lh*6);
  const ch=Math.max(5,lh/4); for(let k=0;k<Math.ceil(lh*6/ch);k++){ x.fillStyle=k%2?'#111':'#fff'; x.fillRect(fx,top+k*ch,ch,ch); x.fillStyle=k%2?'#fff':'#111'; x.fillRect(fx+ch,top+k*ch,ch,ch); }
  const s=lh/34;
  if(!st||cr.gate){ x.fillStyle='rgba(240,240,240,.9)'; for(let i=0;i<6;i++){ const lift=st?Math.min(1,(st.t||0)/.4):0; x.fillRect(sx+2,top+i*lh+2,5,(lh-4)*(1-lift)); x.fillRect(sx+2,top+i*lh+2,16,3); } }
  r.cats.forEach((c,i)=>{ const p=st?st.pos[i]:0, px=sx+p*(fx-sx)-6*s, cy=top+i*lh+lh*.56; const run=st&&st.t>0.5?1:0; crCat(x,px,cy,s*1.12,c.c,c.d,run?(st.t*(15+(st.spd?st.spd[i]:0))+i*1.3):i*.5,i+1,c.n); });
  if(st&&st.crown!=null){ const i=st.crown, c=r.cats[i], cx=sx+Math.min(1.04,st.pos[i])*(fx-sx), cy=top+i*lh+lh*.1; x.fillStyle='#ffd24a'; x.strokeStyle='#8a5a00'; x.lineWidth=1.2; x.beginPath(); x.moveTo(cx-9,cy+8); x.lineTo(cx-9,cy-2); x.lineTo(cx-4,cy+3); x.lineTo(cx,cy-5); x.lineTo(cx+4,cy+3); x.lineTo(cx+9,cy-2); x.lineTo(cx+9,cy+8); x.closePath(); x.fill(); x.stroke(); }
  if(st&&st.photo){ x.fillStyle='rgba(255,255,255,'+(.15+.1*Math.sin(t*20))+')'; x.fillRect(fx-8,top,16,lh*6); x.fillStyle='#fff'; x.font='800 '+Math.round(H*.1)+'px Barlow Condensed,Arial Narrow,sans-serif'; x.textAlign='center'; x.fillText('PHOTO FINISH',W/2,H*.09); }
}
function crStart(){
  if(cr.busy||!cr.bets.length) return; wake(); const tot=crSum(); if(tot>state.bal){ toast('Not enough balance'); Snd.err(); return; }
  { const m=$('#cr .gmm'); if(m) m.scrollTop=0; } gmWinClear(); cr.busy=true; state.bal-=tot; state.balShown=state.bal; S.crRaces=(S.crRaces||0)+1; S.crWag=(S.crWag||0)+tot; renderHUD(); crPaint();
  const r=cr.race, order=crPlace(), bets=cr.bets.slice();
  const T0=11+Math.random()*1.5, F=[T0]; for(let k=1;k<6;k++){ const tiny=Math.random()<.2; F[k]=F[k-1]+(tiny?.05+Math.random()*.1:.28+Math.random()*.9); }
  const photo=F[1]-F[0]<.16, fin=[]; order.forEach((ci,k)=>fin[ci]=F[k]);
  const pr=r.cats.map((c,i)=>({g:.86+Math.random()*.3,a:.015+Math.random()*.025,f:1.5+Math.random()*1.5,ph:Math.random()*6.28,d0:.2+Math.random()*.45,dw:.14,da:Math.random()<.5?.012+Math.random()*.02:0}));
  const posOf=(i,t)=>{ const u=t/fin[i]; if(u>=1) return 1+(t-fin[i])*.09; const q=pr[i]; const dv=(u>q.d0&&u<q.d0+q.dw)?q.da*Math.sin(Math.PI*(u-q.d0)/q.dw):0; return Math.max(0,Math.pow(u,q.g)+q.a*Math.sin(Math.PI*u)*Math.sin(RL_TAU*q.f*u+q.ph)-dv); };
  const cnt=$('#crCount'); const t0=performance.now(); let lead=-1, last=0, said=0, bell=false, over=false; const com=$('#crCom'); com.textContent='They are in the gate...'; Snd.tone&&(Snd.tone(1320,.5,'sine',.08),Snd.tone(1320,.5,'sine',.08,.35));
  let clock=0, prev=t0; cr.gate=1;
  const step=now=>{
    let dt=(now-prev)/1000; prev=now; dt=Math.min(dt,.1); const pos0=r.cats.map((c,i)=>posOf(i,clock)); const front=Math.max(...pos0); const slow=photo&&front>.9&&front<1.06;
    clock+=dt*(slow?.35:1); const pos=r.cats.map((c,i)=>posOf(i,clock)); const L=pos.indexOf(Math.max(...pos));
    if(clock>.05) cr.gate=0; if(clock>.6&&!bell){ bell=true; com.textContent='And they are off!'; Snd.tone&&Snd.tone(900,.15,'square',.05); }
    if(clock>1.6&&L!==lead&&now-last>1500){ if(lead>=0||clock>2) com.textContent=`${r.cats[L].n} ${lead<0?'goes to the front':'takes the lead'}!`; lead=L; last=now; }
    if(front>.85&&said<1){ said=1; com.textContent=photo?'Into the final stretch... too close to call!':'Into the final stretch!'; }
    if(now-last>350&&Snd.nb&&Math.random()<.3) Snd.nb(.12,.03+front*.03,500+front*900,.8);
    crDraw(now/1000,{pos,t:clock,photo:photo&&slow,cheer:front>.8});
    const done=pos.every((p,i)=>clock>fin[i]+.7);
    if(!done) cr.raf=requestAnimationFrame(step); else crFinish(order,bets,photo);
  };
  const go=async()=>{ for(const [txt,f] of [['3',520],['2',620],['1',740],['GO!',1040]]){ cnt.textContent=txt; cnt.classList.remove('on'); void cnt.offsetWidth; cnt.classList.add('on'); Snd.tone&&Snd.tone(f,txt==='GO!'?.45:.18,'square',.07); await sleep(txt==='GO!'?500:800); } cnt.classList.remove('on'); prev=performance.now(); cr.raf=requestAnimationFrame(step); };
  cr.gate=1; crDraw(0); go();
}
function crFinish(order,bets,photo){
  const r=cr.race; let ret=0; const lines=bets.map(b=>{ let won=false; const p=b.picks;
    if(b.type==='win') won=order[0]===p[0]; else if(b.type==='place') won=order.slice(0,2).includes(p[0]); else if(b.type==='show') won=order.slice(0,3).includes(p[0]);
    else if(b.type==='quin') won=(order[0]===p[0]&&order[1]===p[1])||(order[0]===p[1]&&order[1]===p[0]); else if(b.type==='exa') won=order[0]===p[0]&&order[1]===p[1]; else won=order[0]===p[0]&&order[1]===p[1]&&order[2]===p[2];
    const pay=won?Math.floor(b.amt*b.odds):0; ret+=pay; return {b,won,pay}; });
  const tot=bets.reduce((a,b)=>a+b.amt,0), net=ret-tot, before=state.bal; state.bal+=ret; state.balShown=ret>tot?before:state.bal; S.crPaid=(S.crPaid||0)+ret; if(ret>S.best) S.best=ret;
  order.forEach((ci,k)=>{ const nm=r.cats[ci].n; S.crForm[nm]=(S.crForm[nm]||[]).concat(k+1).slice(-5); });
  cr.last=bets.map(b=>({type:b.type,lanes:b.picks.slice(),amt:b.amt})); cr.busy=false;
  $('#crCom').textContent=`${r.cats[order[0]].n} wins${photo?' by a whisker':''}!`; if(Snd.tone){ Snd.tone(700,.18,'triangle',.07,0,1.5); Snd.tone(520,.35,'triangle',.07,.18,.7); }
  $('#crResT').textContent=net>0?'You win '+fmt(net):ret>0?'Money back':'No luck';
  $('#crResL').innerHTML=order.map((ci,k)=>`<li>${['1st','2nd','3rd','4th','5th','6th'][k]} · #${ci+1} ${r.cats[ci].n}</li>`).join('')+'<li style="margin-top:6px;border-top:1px solid #5a4a20;padding-top:6px"></li>'+lines.map(l=>`<li style="color:${l.won?'var(--good)':'#c9b98a'}">${crLabel(l.b)}: ${l.won?'+'+fmt(l.pay):'lost'}</li>`).join('');
  $('#crResN').textContent='Returned '+fmt(ret); crDrawFinal(order); const showRes=()=>$('#crRes').classList.add('on'); if(ret>tot){ gmWin(ret,tot,before).then(()=>{ if(!cr.busy) showRes(); }); } else showRes();
  if(ret>0&&ret<=tot) Snd.chip(); else if(!ret) Snd.tone&&Snd.tone(180,.3,'sawtooth',.04,0,.6);
  renderHUD(); lobbyStats(); save(); crPaint();
}
function crDrawFinal(order){ const r=cr.race; crDraw(0,{pos:r.cats.map((c,i)=>1+(5-order.indexOf(i))*.02),t:0,crown:order[0]}); try{ const rc=$('#crCv').getBoundingClientRect(); burst(40,rc.left+rc.width*.82,rc.top+rc.height*.4,10,'conf'); }catch(e){} }
gmMount();
