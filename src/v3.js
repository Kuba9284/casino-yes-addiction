(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const CFG0={nearMiss:.20,boost:0,jpShare:.1,assist:0,bonus:0,wildMult:1,scatMult:1,meterStep:.02};
const cfg={...CFG0,disguise:true,gambleP:.5};

// ==ENGINE START==
const SYMS=['SEVEN','DIAMOND','STAR','CROWN','DICE','CLOVER','HORSESHOE','BAR','BELL','MELON','PLUM','LEMON','CHERRY','WILD','SCATTER'];
const WEIGHTS={SEVEN:3,DIAMOND:5,STAR:5.5,CROWN:6,DICE:6.5,CLOVER:7,HORSESHOE:7.5,BAR:8,BELL:10,MELON:11,PLUM:12,LEMON:14,CHERRY:16,WILD:1.1,SCATTER:1.5};
const NOSPEC=['WILD','SCATTER'];
const PAY={
  SEVEN:{3:90,4:340,5:1800}, DIAMOND:{3:45,4:180,5:700}, STAR:{3:32,4:120,5:450}, CROWN:{3:26,4:90,5:340}, DICE:{3:19,4:66,5:240}, CLOVER:{3:16,4:55,5:200},
  HORSESHOE:{3:13,4:46,5:165}, BAR:{3:12,4:42,5:150}, BELL:{3:9,4:29,5:90}, MELON:{3:7,4:23,5:72}, PLUM:{3:6,4:20,5:64}, LEMON:{3:5,4:16,5:50}, CHERRY:{2:1.5,3:3,4:12,5:40}
};
for(const s in PAY) for(const k in PAY[s]) PAY[s][k]=Math.round(PAY[s][k]*1.1);
const SC_PAY={3:2,4:10,5:50}, SC_SPINS={3:10,4:15,5:20};
const LINES=[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[1,0,1,2,1]];
const HI=['SEVEN','DIAMOND'];
const WILD_REELS=[1,2,3];
let RS=(Math.random()*4294967296)>>>0, VSEED=(Math.random()*4294967296)>>>0;
function R(){ RS=(RS+0x6D2B79F5)>>>0; let t=RS; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }
const rnd=n=>Math.floor(R()*n);
const vSym=i=>vis(()=>rndSym(null,i));
function vis(fn){ const a=RS; RS=VSEED; try{ return fn(); } finally{ VSEED=RS; RS=a; } }
function rndSym(ex,reel,fs){
  const pool=[]; let tot=0;
  for(const s of SYMS){
    if(ex&&ex.includes(s)) continue;
    if(s==='WILD'&&!WILD_REELS.includes(reel)) continue;
    let w=WEIGHTS[s];
    if(s==='WILD') w*=cfg.wildMult*(fs?1.5:1);
    if(s==='SCATTER') w*=cfg.scatMult*(fs?1.3:1);
    pool.push([s,w]); tot+=w;
  }
  let x=R()*tot;
  for(const [s,w] of pool){ x-=w; if(x<0) return s; }
  return 'CHERRY';
}
function randGrid(ex,fs){ return Array.from({length:5},(_,r)=>Array.from({length:3},()=>rndSym(ex,r,fs))); }
function expandWilds(g){
  const reels=[], g2=g.map(c=>c.slice());
  for(let r=0;r<5;r++) if(g[r].includes('WILD')){ reels.push(r); for(let w=0;w<3;w++) if(g[r][w]!=='SCATTER') g2[r][w]='WILD'; }
  return {g2,reels};
}
function evaluate(g,bet){
  const lb=bet/10, wins=[]; let total=0;
  LINES.forEach((L,li)=>{
    const s=g[0][L[0]]; if(s==='SCATTER'||s==='WILD') return;
    let n=1; while(n<5){ const c=g[n][L[n]]; if(c===s||c==='WILD') n++; else break; }
    const m=PAY[s][n]; if(m){ const amount=m*lb; wins.push({line:li,sym:s,count:n,amount}); total+=amount; }
  });
  return {wins,total};
}
function evalFull(g,bet){
  const {g2,reels}=expandWilds(g), ev=evaluate(g2,bet);
  let scat=0; for(const c of g) for(const s of c) if(s==='SCATTER') scat++;
  const k=Math.min(scat,5), sp=scat>=3?SC_PAY[k]*bet:0;
  return {g2,exp:reels,wins:ev.wins,lineTotal:ev.total,scat,scatPay:sp,total:ev.total+sp,spins:scat>=3?SC_SPINS[k]:0};
}
function runLen(g,L,s){ let n=0; while(n<5&&(g[n][L[n]]===s||g[n][L[n]]==='WILD')) n++; return n; }
function maxRun(g,s){ return Math.max(...LINES.map(L=>runLen(g,L,s))); }
const TOP=['SEVEN','DIAMOND','STAR','CROWN','BAR','CLOVER'];
function nearMiss(sym,k){
  k=k||2;
  const ups=LINES.filter(L=>L[k]>=1&&L[k]===L[k-1]);   // flat continuation: the tease reel's payline row equals the row of the symbols before it
  for(let t=0;t<400;t++){
    const g=randGrid(NOSPEC), L=ups[rnd(ups.length)], row=L[k], alt=row-1;   // the symbol ends one row ABOVE the payline: it looks like landing, then jumps back up
    for(let x=0;x<k;x++) g[x][L[x]]=sym; g[k][alt]=sym; g[k][row]=rndSym([sym,...NOSPEC],k);
    if(maxRun(g,sym)>k) continue;
    const locked=new Set(); for(let x=0;x<k;x++) locked.add(`${x},${L[x]}`); locked.add(`${k},${alt}`); locked.add(`${k},${row}`);
    return {g,locked,tease:{reel:k,row,alt,sym}};
  }
  return {g:randGrid(NOSPEC),locked:new Set()};
}
function teasePick(){ const x=R();
  if(x<.84){ const y=R(); return [2,y<.45?'SEVEN':y<.7?'DIAMOND':y<.85?'CROWN':y<.93?'BAR':'CLOVER']; }
  if(x<.96) return [3,['BAR','CLOVER'][rnd(2)]];
  return [4,['BAR','CLOVER'][rnd(2)]]; }
function nearMissScatter(){
  const g=randGrid(NOSPEC), a=rnd(3), b=a+1+rnd(3-a), locked=new Set();
  [a,b].forEach(r=>{ const w=rnd(3); g[r][w]='SCATTER'; locked.add(`${r},${w}`); });
  return {g,locked};
}
const LDW_COMBOS=[['CHERRY',2,45],['CHERRY',3,28],['LEMON',3,15],['PLUM',3,12]];
function pickCombo(){ let x=R()*100; for(const c of LDW_COMBOS){ x-=c[2]; if(x<0) return c; } return LDW_COMBOS[0]; }
function injectSmall(g0,bet,locked){
  locked=locked||new Set();
  for(let k=0;k<250;k++){
    const g=g0.map(c=>c.slice()), [sym,n]=pickCombo(), L=LINES[rnd(10)]; let bad=false;
    for(let r=0;r<5;r++){
      const key=`${r},${L[r]}`;
      if(r<n){ if(locked.has(key)){bad=true;break;} g[r][L[r]]=sym; }
      else if(r===n){ if(locked.has(key)){ if(g[r][L[r]]===sym){bad=true;break;} } else g[r][L[r]]=rndSym([sym,...NOSPEC],r); }
    }
    if(bad) continue;
    const ev=evalFull(g,bet); if(ev.total>0&&ev.total<bet&&ev.scat<3) return g;
  }
  return g0;
}
function buildForced(mode){
  const fill=(sym,r,n)=>{ const g=randGrid([sym,...NOSPEC]); for(let i=0;i<n;i++) g[i][r]=sym; return {g}; };
  switch(mode){
    case 'jackpot': return {g:Array.from({length:5},()=>Array(3).fill('SEVEN'))};
    case 'mega': return fill('SEVEN',rnd(3),5);
    case 'big': return fill('DIAMOND',rnd(3),5);
    case 'medium': { const g=randGrid(['CROWN',...NOSPEC]), L=LINES[rnd(10)]; for(let i=0;i<4;i++) g[i][L[i]]='CROWN'; return {g}; }
    case 'small': { const g=randGrid(['BELL',...NOSPEC]), L=LINES[rnd(10)]; for(let i=0;i<3;i++) g[i][L[i]]='BELL'; return {g}; }
    case 'ldw': return {g:randGrid(['SEVEN','DIAMOND','CROWN',...NOSPEC])};
    case 'nearmiss': { const [k,s]=teasePick(); return nearMiss(s,k); }
    case 'nearmiss_gem': return nearMiss('DIAMOND',2);
    case 'tease7': return nearMiss('SEVEN',2);
    case 'tease3': return nearMiss(['BAR','CLOVER','CROWN'][rnd(3)],3);
    case 'tease4': return nearMiss(['BAR','CLOVER'][rnd(2)],4);
    case 'nearmiss_scatter': return nearMissScatter();
    case 'wild': { const g=randGrid(NOSPEC), L=LINES[rnd(10)]; [0,1,3].forEach(r=>g[r][L[r]]='SEVEN'); g[4][L[4]]=rndSym(['SEVEN',...NOSPEC],4); g[2][rnd(3)]='WILD'; return {g}; }
    case 'freespins': case 'freespins5': {
      const g=randGrid(NOSPEC), rs=mode==='freespins5'?[0,1,2,3,4]:[0,1,2,3,4].sort(()=>R()-.5).slice(0,3);
      rs.forEach(r=>{ g[r][rnd(3)]='SCATTER'; }); return {g};
    }
  }
  return {g:randGrid()};
}
function decideOutcome(bet,force,opts){
  opts=opts||{}; const fs=!!opts.fs; let g,locked,kind='natural',tease=null;
  if(force&&force.grid){ g=force.grid.map(c=>c.slice()); kind='custom'; }
  else{
    let mode=force&&force.mode;
    if(!mode&&!fs){
      const r=R();
      if(r<cfg.boost){ const q=R(); mode=q<cfg.jpShare?'jackpot':q<.3?'mega':'big'; }
      else if(r<cfg.boost+cfg.bonus) mode=R()<.12?'freespins5':'freespins';
    }
    if(!mode){
      g=randGrid(null,fs);
      if(!fs&&evalFull(g,bet).total<bet){
        if(R()<cfg.assist) mode=['small','small','medium','medium','wild'][rnd(5)];
        else if(R()<cfg.nearMiss){ const q=R(); mode=q<.6?'nearmiss':q<.8?'nearmiss_gem':'nearmiss_scatter'; }
      }
    }
    if(mode){ const o=buildForced(mode); g=o.g; locked=o.locked; kind=mode; tease=o.tease||null; if(tease&&!(force&&force.mode)&&R()>.65) tease=null; }
  }
  let ev=evalFull(g,bet);
  if((fs?ev.lineTotal===0:ev.total===0)&&(cfg.disguise||fs)&&kind!=='custom'){ g=injectSmall(g,bet,locked); ev=evalFull(g,bet); }
  return {g,ev,kind,tease:kind==='custom'?null:tease,ldw:ev.total>0&&ev.total<bet,fs};
}
function anticipation(g){
  // A reel slows only when it can really complete something: the reels before it already
  // hold a matching run on one payline and the completed run would pay >= 20x the line bet,
  // or when two scatters are already down and another could trigger the bonus.
  const out=[0,1,2,3,4].map(()=>({a:false,strong:false,scat:false,k:0}));
  for(let i=2;i<5;i++){
    let best=0;
    for(const L of LINES){
      const s=g[0][L[0]]; if(s==='SCATTER'||s==='WILD') continue;
      let n=1; while(n<i){ const c=g[n][L[n]]; if(c===s||c==='WILD') n++; else break; }
      if(n===i&&TOP.includes(s)) best=1;
    }
    if(best) out[i]={a:true,strong:true,scat:false,k:i};
  }
  let sc=0;
  for(let i=0;i<5;i++){ if(i>=2&&sc>=2&&!out[i].a) out[i]={a:true,strong:true,scat:true,k:i}; for(let w=0;w<3;w++) if(g[i][w]==='SCATTER') sc++; }
  return out;
}
const WEDGES=[
 {t:'cash',v:150,l:'x150',w:14},{t:'cash',v:300,l:'x300',w:12},{t:'fs',v:6,l:'6 FREE',w:8},{t:'cash',v:200,l:'x200',w:13},
 {t:'jp',k:'mini',l:'MINI',w:5},{t:'jp',k:'minor',l:'MINOR',w:8},{t:'cash',v:500,l:'x500',w:9},{t:'fs',v:8,l:'8 FREE',w:5},{t:'cash',v:250,l:'x250',w:14},
 {t:'cash',v:1000,l:'x1000',w:4},{t:'cash',v:400,l:'x400',w:10},{t:'fs',v:10,l:'10 FREE',w:2.5},{t:'cash',v:600,l:'x600',w:6},
  {t:'jp',k:'major',l:'MAJOR',w:5},{t:'jp',k:'mega',l:'MEGA',w:2},{t:'cash',v:300,l:'x300',w:12},{t:'cash',v:1500,l:'x1500',w:1.5},{t:'jp',k:'grand',l:'GRAND',w:.4}];
const JP_ODDS={mini:74,minor:20,major:5,mega:.9,grand:.1};
function mysteryJp(bet){ if(R()>=(bet/5000)/2000) return null; let x=R()*100.0; for(const k in JP_ODDS){ x-=JP_ODDS[k]; if(x<0) return k; } return 'mini'; }
function pickWedge(kind){
  let pool=WEDGES.map((w,i)=>({w,i}));
  if(kind&&kind!=='random'){ const f=pool.filter(p=>kind==='cash'?p.w.t==='cash':kind==='fs'?p.w.t==='fs':p.w.t==='jp'&&p.w.k===kind); if(f.length) pool=f; }
  const tot=pool.reduce((a,p)=>a+p.w.w,0); let x=R()*tot;
  for(const p of pool){ x-=p.w.w; if(x<0) return p.i; } return pool[0].i;
}
const fsMult=n=>Math.min(8,n);
// ==ENGINE END==
const vr=n=>Math.floor(Math.random()*n);

/* ====================== LUCK PRESETS ====================== */
const PRESETS=[
 {id:'fun',name:'Fun',note:'~150% return',c:{assist:.0095,bonus:.002,boost:.00035,wildMult:1.2,scatMult:1.2,meterStep:.032}},
 {id:'realistic',name:'Realistic',note:'~90% return',c:{}},
 {id:'generous',name:'Generous',note:'~115% return',c:{assist:.006,bonus:.001,boost:.0002,wildMult:1.1,scatMult:1.1,meterStep:.025}},
 {id:'hot',name:'Hot streak',note:'~160% return',c:{assist:.014,bonus:.003,boost:.0005,wildMult:1.3,scatMult:1.3,meterStep:.04,nearMiss:.15}},
 {id:'rain',name:'Jackpot rain',note:'~420% return',c:{boost:.01,jpShare:.04,assist:.05,bonus:.01,wildMult:1.6,scatMult:1.6,meterStep:.08,nearMiss:.1}},
 {id:'bonus',name:'Bonus fiesta',note:'~200%, bonus-heavy',c:{assist:.005,bonus:.006,scatMult:1.8,wildMult:1.2,meterStep:.05}},
 {id:'cold',name:'Cold streak',note:'~65% return',c:{wildMult:.4,scatMult:.4,nearMiss:.3,meterStep:.012}},
 {id:'house',name:'House edge',note:'~55% return',c:{wildMult:0,scatMult:.1,nearMiss:.45,meterStep:.004}},
 {id:'teaser',name:'Near-miss hell',note:'~78% return',c:{nearMiss:.75,wildMult:.6,scatMult:.7}},
];
let cfgPreset='fun';
function applyPreset(id,quiet){
  const p=PRESETS.find(x=>x.id===id)||PRESETS[0]; Object.assign(cfg,CFG0,p.c); cfgPreset=p.id;
  const set=(i,o,v,f)=>{ const e=$(i); if(e){ e.value=v; const q=$(o); if(q) q.textContent=f?f(v):v; } };
  set('#dNear2','#oNear',Math.round(cfg.nearMiss*100)); set('#dBoost','#oBoost',Math.round(cfg.boost*100));
  $$('#dPresets button').forEach(b=>b.classList.toggle('act',b.dataset.id===p.id));
  if(!quiet) toast('Luck preset: '+p.name);
}

/* ============================== SOUND ============================== */
const Snd=(()=>{
  let jzBus=null,ctx=null,master=null,sfx=null,mus=null,revSend=null,arpBus=null,noise=null,outNode=null,sirOut=null;
  let vol=.6,muted=false,mvol=.5,mmuted=false,alarmVol=1,whirr=null,tens=null,duckTimer=0,sir=null,hushed=false;
  const SC=[523.25,587.33,659.25,783.99,880,1046.5,1174.7,1318.5,1568,1760,2093];
  const M={on:false,mode:'base',step:0,next:0,timer:0};
  const MC={base:{bpm:112,rest:.34,vel:.9},bj:{bpm:94,rest:.5,vel:.8},fs:{bpm:152,rest:.12,vel:1.1}};
  const mtof=m=>440*Math.pow(2,(m-69)/12);
  let fadeMul=1; const musBase=()=>(mmuted||hushed)?0:mvol*.55*fadeMul;
  const sfxBase=()=>hushed?0:1;
  function init(){
    if(ctx){ if(ctx.state==='suspended') ctx.resume(); return; }
    try{ ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return; }
    master=ctx.createGain(); master.gain.value=muted?0:vol;
    const comp=ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination); outNode=comp;
    sirOut=ctx.createGain(); sirOut.gain.value=muted?0:1; sirOut.connect(comp);
    sfx=ctx.createGain(); sfx.connect(master);
    mus=ctx.createGain(); mus.gain.value=musBase(); mus.connect(master);
    const len=ctx.sampleRate*1.8, ib=ctx.createBuffer(2,len,ctx.sampleRate);
    for(let c=0;c<2;c++){ const d=ib.getChannelData(c); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6); }
    const conv=ctx.createConvolver(); conv.buffer=ib; revSend=ctx.createGain(); const rg=ctx.createGain(); rg.gain.value=.5; revSend.connect(conv); conv.connect(rg); rg.connect(mus);
    arpBus=ctx.createGain(); arpBus.connect(mus); arpBus.connect(revSend);
    const dl=ctx.createDelay(1); dl.delayTime.value=.3; const fb=ctx.createGain(); fb.gain.value=.36; const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2400;
    arpBus.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(mus);
    noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
    const d=noise.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    jzBus=ctx.createGain(); jzBus.connect(mus); { const rs=ctx.createGain(); rs.gain.value=.38; jzBus.connect(rs); rs.connect(revSend); }
    if(M.on) startTimer();
  }
  function setVol(v){ vol=v; if(master) master.gain.setTargetAtTime(muted?0:vol,ctx.currentTime,.02); }
  function setMuted(m){ muted=m; if(master){ master.gain.setTargetAtTime(muted?0:vol,ctx.currentTime,.02); sirOut.gain.setTargetAtTime(muted?0:1,ctx.currentTime,.02); } }
  function setMusicVol(v){ mvol=v; if(mus) mus.gain.setTargetAtTime(musBase(),ctx.currentTime,.05); }
  function setMusicMuted(m){ mmuted=m; if(mus) mus.gain.setTargetAtTime(musBase(),ctx.currentTime,.05); }
  function hush(h){ hushed=h; if(!ctx) return; const t=ctx.currentTime; sfx.gain.setTargetAtTime(sfxBase(),t,.03); mus.gain.setTargetAtTime(musBase(),t,.05); }
  function tone(f,dur,type,v,when,slide,dest){
    if(!ctx) return; const t=ctx.currentTime+(when||0), o=ctx.createOscillator(), g=ctx.createGain(); o.type=type||'sine'; o.frequency.setValueAtTime(f,t);
    if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(20,f*slide),t+dur);
    g.gain.setValueAtTime(.0001,t); g.gain.linearRampToValueAtTime(v,t+.008); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g); g.connect(dest||sfx); o.start(t); o.stop(t+dur+.05);
  }
  function nb(dur,v,freq,q,when,type,dest){
    if(!ctx) return; const t=ctx.currentTime+(when||0), s=ctx.createBufferSource(); s.buffer=noise; const f=ctx.createBiquadFilter(); f.type=type||'bandpass'; f.frequency.value=freq; f.Q.value=q||1;
    const g=ctx.createGain(); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+dur); s.connect(f); f.connect(g); g.connect(dest||sfx); s.start(t,Math.random()); s.stop(t+dur+.05);
  }
  /* ---- music ---- */
  function toneT(f,t,dur,type,v,dest,det){ const o=ctx.createOscillator(), g=ctx.createGain(); o.type=type; o.frequency.setValueAtTime(f,t); if(det) o.detune.value=det;
    g.gain.setValueAtTime(.0001,t); g.gain.linearRampToValueAtTime(v,t+.012); g.gain.exponentialRampToValueAtTime(.0001,t+dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t+dur+.05); }
  function noiseT(t,dur,v,freq,q,type,dest){ const s=ctx.createBufferSource(); s.buffer=noise; const f=ctx.createBiquadFilter(); f.type=type; f.frequency.value=freq; f.Q.value=q;
    const g=ctx.createGain(); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+dur); s.connect(f); f.connect(g); g.connect(dest); s.start(t,Math.random()); s.stop(t+dur+.05); }
  function kick(t,v){ const o=ctx.createOscillator(), g=ctx.createGain(); o.type='sine'; o.frequency.setValueAtTime(110,t); o.frequency.exponentialRampToValueAtTime(48,t+.12); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+.2); o.connect(g); g.connect(mus); o.start(t); o.stop(t+.25); }
  /* ---- original swing jazz: walking bass, piano comping, brushed drums, improvising trombone ---- */
  const JCH=[[[5,'7']],[[10,'7']],[[5,'7']],[[0,'m7'],[5,'7']],[[10,'7']],[[11,'o7']],[[5,'7']],[[9,'m7'],[2,'7']],[[7,'m7']],[[0,'7']],[[5,'7'],[2,'7']],[[7,'m7'],[0,'7']]];
  const JQ={'7':[0,4,7,10],'m7':[0,3,7,10],'o7':[0,3,6,9]};
  const jch=(bar,half)=>{ const b=JCH[((bar%12)+12)%12]; return b[Math.min(half,b.length-1)]; };
  const fold=(n,lo,hi)=>{ while(n<lo) n+=12; while(n>hi) n-=12; return n; };
  const JRH=[[0,3,6,9],[0,4,6,9],[2,3,6,10],[0,6,9],[0,3,8],[3,6,9,11],[0,2,6],[0,5],[0,4,8],[0,3,6],[0,3,5,9,11],[1,3,6]];
  const JPLAY=[1,.55,1,.75,1,.55,1,.65,1,.75,1,.85];
  let jBass=[], jLast=60, jPhrase=0;
  function trombone(f,t,dur,v,from,fall){
    const o1=ctx.createOscillator(), o2=ctx.createOscillator(), og=ctx.createGain(), lp=ctx.createBiquadFilter(), fm=ctx.createBiquadFilter(), g=ctx.createGain(), lfo=ctx.createOscillator(), lg=ctx.createGain();
    o1.type='sawtooth'; o2.type='square'; o2.detune.value=5; og.gain.value=.35;
    for(const o of [o1,o2]){ o.frequency.setValueAtTime(from||f,t); if(from) o.frequency.exponentialRampToValueAtTime(f,t+.1);
      if(fall){ o.frequency.setValueAtTime(f,t+dur*.55); o.frequency.exponentialRampToValueAtTime(f*.62,t+dur); } }
    lp.type='lowpass'; lp.Q.value=2.2; lp.frequency.setValueAtTime(450,t); lp.frequency.linearRampToValueAtTime(1300+v*2600,t+.1); lp.frequency.linearRampToValueAtTime(900+v*1200,t+dur);
    fm.type='peaking'; fm.frequency.value=700; fm.gain.value=7; fm.Q.value=1.1;
    g.gain.setValueAtTime(.0001,t); g.gain.linearRampToValueAtTime(v,t+.06); g.gain.setValueAtTime(v*.85,t+Math.max(.07,dur-.09)); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    lfo.frequency.value=5.2; lg.gain.setValueAtTime(0,t); lg.gain.linearRampToValueAtTime(9,t+Math.min(dur,.55)); lfo.connect(lg); lg.connect(o1.detune); lg.connect(o2.detune);
    o1.connect(lp); o2.connect(og); og.connect(lp); lp.connect(fm); fm.connect(g); g.connect(jzBus);
    noiseT(t,.09,v*.22,1800,.8,'bandpass',jzBus);
    o1.start(t); o2.start(t); lfo.start(t); const end=t+dur+.08; o1.stop(end); o2.stop(end); lfo.stop(end);
  }
  function upright(n,t,dur,v){ const f=mtof(n), o=ctx.createOscillator(), o2=ctx.createOscillator(), lp=ctx.createBiquadFilter(), g=ctx.createGain();
    o.type='triangle'; o2.type='sine'; o.frequency.setValueAtTime(f*1.012,t); o.frequency.exponentialRampToValueAtTime(f,t+.05); o2.frequency.value=f*2;
    lp.type='lowpass'; lp.frequency.setValueAtTime(900,t); lp.frequency.exponentialRampToValueAtTime(260,t+dur);
    g.gain.setValueAtTime(.0001,t); g.gain.linearRampToValueAtTime(v,t+.012); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    const g2=ctx.createGain(); g2.gain.value=.25; o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(mus); o.start(t); o2.start(t); o.stop(t+dur+.05); o2.stop(t+dur+.05); }
  function keys(n,t,dur,v){ const f=mtof(n), o=ctx.createOscillator(), o2=ctx.createOscillator(), g=ctx.createGain(), g2=ctx.createGain();
    o.type='triangle'; o.frequency.value=f; o2.type='sine'; o2.frequency.value=f*2; g2.gain.value=.3;
    g.gain.setValueAtTime(.0001,t); g.gain.linearRampToValueAtTime(v,t+.006); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(mus); g.connect(revSend); o.start(t); o2.start(t); o.stop(t+dur+.05); o2.stop(t+dur+.05); }
  function jBassBar(bar){
    const [r1,q1]=jch(bar,0), [r2,q2]=jch(bar,1), split=JCH[bar%12].length>1, A=JQ[q1], B=JQ[q2];
    const R1=fold(36+r1,38,49), R2=fold(36+r2,38,49), nx=fold(36+jch(bar+1,0)[0],38,49), ap=nx+(Math.random()<.5?1:-1);
    jBass=split?[R1,fold(R1+A[2],38,52),R2,fold(R2+B[Math.random()<.5?2:1],38,52)].slice(0,3).concat([ap]):[R1,fold(R1+A[Math.random()<.5?1:2],38,52),fold(R1+A[2],38,52),ap];
  }
  function jSoloBar(bar,t,sd){
    const cfg=MC[M.mode], idx=((bar%12)+12)%12;
    if(Math.random()>JPLAY[idx]*(1-cfg.rest)*1.7) return;
    const rh=JRH[Math.floor(Math.random()*JRH.length)];
    rh.forEach((st,i)=>{
      const half=st>=6?1:0, [r,q]=jch(bar,half), pool=[]; JQ[q].forEach(iv=>{ for(let o=-24;o<=24;o+=12) pool.push(r+iv+o+60); }); pool.push(r+14+60,r+14+48,r+9+60,r+9+48);
      if(Math.random()<.18) pool.push(r+3+60,r+3+48);
      const cand=pool.filter(n=>n>=47&&n<=68).sort((a,b)=>Math.abs(a-jLast)-Math.abs(b-jLast)), pick=cand[Math.min(cand.length-1,Math.floor(Math.random()*Math.random()*4))];
      const nextSt=i<rh.length-1?rh[i+1]:12, dur=Math.max(.12,(nextSt-st)*sd*(i===rh.length-1?1.15:.92));
      const lead=Math.abs(pick-jLast)>=3&&Math.random()<.5?mtof(jLast):0, last=i===rh.length-1, fall=last&&(idx%4===3)&&Math.random()<.65;
      trombone(mtof(pick),t+st*sd,dur,.1*cfg.vel*(last?1.05:1),lead,fall); jLast=pick;
    });
  }
  function playStep(st,t,sd){
    const cfg=MC[M.mode], bar=Math.floor(st/12), s=st%12, vel=cfg.vel, beat=s/3|0;
    if(s===0){ jBassBar(bar); jSoloBar(bar,t,sd); }
    if(s%3===0) upright(jBass[beat],t,sd*2.6,.2*vel);
    if([0,3,5,6,9,11].includes(s)) noiseT(t,.11,(s%3===0?.032:.022)*vel,7800,1.2,'highpass',mus);
    if(s===3||s===9) noiseT(t,.06,.05*vel,4800,1,'highpass',mus);
    if(s===0||s===6) kick(t,.07*vel);
    if((s===2||s===8||s===11)&&Math.random()<.16) noiseT(t,.09,.03*vel,2600,.9,'bandpass',mus);
    const hit=s===0?.6:s===5?.5:s===8?.38:s===11?.22:0;
    if(hit&&Math.random()<hit){ const [r,q]=jch(bar,s>=6?1:0), iv=JQ[q], ns=[r+iv[1],r+iv[3],r+14].map(n=>fold(n+48,52,72)); ns.forEach(n=>keys(n,t,sd*(s===0?3:2),.045*vel)); }
  }
  const MS={lounge:{bpm:80},synth:{bpm:104},rag:{bpm:116},ambient:{bpm:60}};
  function voice(n,t,dur,v,type,cut,att){ const o=ctx.createOscillator(), lp=ctx.createBiquadFilter(), g=ctx.createGain(); o.type=type||'triangle'; o.frequency.value=mtof(n); lp.type='lowpass'; lp.frequency.value=cut||2400; const a=att||.01; g.gain.setValueAtTime(.0001,t); g.gain.linearRampToValueAtTime(v,t+a); g.gain.exponentialRampToValueAtTime(.0001,t+Math.max(dur,a+.05)); o.connect(lp); lp.connect(g); g.connect(mus); g.connect(revSend); o.start(t); o.stop(t+dur+.1); }
  const PRG={lounge:[[48,[0,4,7,11]],[45,[0,3,7,10]],[50,[0,3,7,10]],[43,[0,4,7,10]]],synth:[[45,[0,3,7]],[41,[0,4,7]],[48,[0,4,7]],[43,[0,4,7]]],rag:[[48,[0,4,7,9]],[41,[0,4,7,9]],[43,[0,4,7,10]],[48,[0,4,7,9]]],ambient:[[48,[0,7,11,14]],[41,[0,7,11,16]],[45,[0,7,10,14]],[43,[0,7,11,14]]]};
  function playAlt(st,t,sd){
    const sty=M.style, bar=Math.floor(st/12), s=st%12, pr=PRG[sty][bar%4], root=pr[0], ch=pr[1], vel=MC[M.mode].vel, hz=sd*12;
    if(sty==='lounge'){
      if(s===0){ ch.forEach((iv,i)=>voice(root+12+iv,t+i*.012,hz*.95,.05*vel,'sine',1800,.04)); voice(root,t,sd*5,.16*vel,'sine',500,.01); }
      if(s===6) voice(root+(Math.random()<.5?7:0),t,sd*4,.12*vel,'sine',500,.01);
      if(s%3===0) noiseT(t,.08,.014*vel,7000,1,'highpass',mus);
      if((s===3||s===9)&&Math.random()<.5) noiseT(t,.12,.02*vel,2400,1,'bandpass',mus);
      if((s===0||s===4||s===8)&&Math.random()<.55) voice(root+24+ch[Math.floor(Math.random()*ch.length)]+(Math.random()<.3?12:0),t,sd*6,.05*vel,'triangle',2600,.01);
    } else if(sty==='synth'){
      if(s%3===0) kick(t,.11*vel); if(s===3||s===9) noiseT(t,.14,.07*vel,1800,.8,'bandpass',mus); if(s%2===1) noiseT(t,.04,.02*vel,9000,1,'highpass',mus);
      if(s%3===0||s===5||s===8) voice(root-12+(s===5?12:0),t,sd*2.4,.2*vel,'sawtooth',420,.005);
      if(s%2===0) voice(root+24+ch[((s/2+bar)|0)%ch.length],t,sd*1.8,.055*vel,'square',2200,.004);
      if(s===0) ch.forEach(iv=>voice(root+12+iv,t,hz*.98,.03*vel,'sawtooth',900,.15));
    } else if(sty==='rag'){
      if(s===0||s===6) upright(root-12+(s===6?7:0),t,sd*2.8,.2*vel); if(s===3||s===9) ch.slice(0,3).forEach(iv=>keys(root+iv,t,sd*2,.035*vel));
      if([0,2,3,5,6,8,9,11].includes(s)&&Math.random()<.62){ const sc=[0,2,4,7,9,12,14,16]; keys(root+24+sc[Math.floor(Math.random()*sc.length)],t,sd*(Math.random()<.5?1.6:2.6),.05*vel); }
    } else if(sty==='ambient'){
      if(s===0){ ch.forEach((iv,i)=>voice(root+iv+(i%2?12:0),t+i*.15,hz*1.1,.045*vel,'sine',1400,.9)); voice(root-12,t,hz*1.2,.14*vel,'sine',300,.7); }
      if((s===4||s===9)&&Math.random()<.45) voice(root+36+ch[Math.floor(Math.random()*ch.length)],t,sd*9,.035*vel,'sine',3000,.02);
    }
  }
  function sched(){
    if(!ctx||!M.on) return; const sty=M.style, bpm=((MS[sty]&&MS[sty].bpm)||112)*(MC[M.mode].bpm/112), sd=60/(sty&&MS[sty]?bpm:MC[M.mode].bpm)/3;
    if(M.next<ctx.currentTime-.2) M.next=ctx.currentTime+.05;
    while(M.next<ctx.currentTime+.3){ (MS[sty]?playAlt:playStep)(M.step,M.next,sd); M.next+=sd; M.step++; }
  }
  function startTimer(){ if(M.timer||!ctx) return; M.next=ctx.currentTime+.08; M.step=0; jLast=60; M.timer=setInterval(sched,70); }
  function duck(level,secs){ if(!ctx) return; mus.gain.cancelScheduledValues(ctx.currentTime); mus.gain.setTargetAtTime(musBase()*level,ctx.currentTime,.05); clearTimeout(duckTimer); duckTimer=setTimeout(unduck,secs*1000); }
  function unduck(){ if(!ctx) return; clearTimeout(duckTimer); mus.gain.setTargetAtTime(musBase(),ctx.currentTime,.4); }
  function fade(to,secs){ fadeMul=to; if(!ctx) return; const t=ctx.currentTime; mus.gain.cancelScheduledValues(t); mus.gain.setValueAtTime(mus.gain.value,t); mus.gain.linearRampToValueAtTime(musBase(),t+Math.max(.02,secs)); }
  const api={tone,nb,init,setVol,setMuted,setMusicVol,setMusicMuted,hush,duck,fade,
    node(){ return ctx?{ctx,out:master}:null; },
    get muted(){return muted}, get ready(){return !!ctx},
    setAlarmVol(v){ alarmVol=v; },
    music(on){ M.on=on; if(!ctx) return; if(on) startTimer(); else if(M.timer){ clearInterval(M.timer); M.timer=0; } },
    setStyle(id){ M.style=id==='jazz'?'':id; M.step=0; if(ctx) M.next=ctx.currentTime+.05; },
    setMode(m){ if(M.mode===m) return; M.mode=m; if(ctx&&M.on){ M.step=0; M.next=ctx.currentTime+.05; } },
    click(){ tone(660,.05,'triangle',.09); tone(990,.04,'sine',.04,.02); },
    boing(){ tone(180,.28,'sine',.16,0,2.6); tone(360,.2,'triangle',.05,.02,2.0); },
    bet(up){ tone(up?740:520,.06,'triangle',.08); },
    spinStart(){ if(!ctx) return; nb(.25,.22,500,.8,0); tone(220,.3,'sawtooth',.05,0,2.4);
      if(whirr) return; const src=ctx.createBufferSource(); src.buffer=noise; src.loop=true; const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=650; bp.Q.value=.9;
      const g=ctx.createGain(); g.gain.value=0; g.gain.linearRampToValueAtTime(.15,ctx.currentTime+.2);
      const lfo=ctx.createOscillator(); lfo.frequency.value=24; const lg=ctx.createGain(); lg.gain.value=.06; lfo.connect(lg); lg.connect(g.gain);
      src.connect(bp); bp.connect(g); g.connect(sfx); src.start(); lfo.start(); whirr={src,g,lfo}; },
    whirrStop(){ if(!whirr||!ctx) return; const w=whirr; whirr=null; w.g.gain.cancelScheduledValues(ctx.currentTime); w.g.gain.setTargetAtTime(0,ctx.currentTime,.06); setTimeout(()=>{ try{w.src.stop(); w.lfo.stop();}catch(e){} },500); },
    reelStop(i){ tone(150-i*7,.2,'sine',.4,0,.35); nb(.06,.25,1300,1.2,0); tone(900+i*70,.05,'triangle',.05); },
    scatter(n){ const f=659*Math.pow(1.19,n); tone(f,.5,'triangle',.16); tone(f*2,.4,'sine',.07,.04); tone(f*3,.3,'sine',.03,.08); },
    wildLand(){ [1568,2093,2637].forEach((f,i)=>tone(f,.25,'sine',.06,i*.05)); },
    lightning(){ nb(.35,.55,3500,.6,0,'highpass'); nb(.9,.35,180,.5,.02,'lowpass'); tone(90,.8,'sine',.35,0,.3); },
    wildExpand(){ tone(200,.5,'sawtooth',.07,0,8); [1046.5,1318.5,1568,2093].forEach((f,i)=>tone(f,.3,'triangle',.07,.15+i*.06)); },
    tensionStart(dur,strong){
      if(!ctx) return; api.tensionStop(true); duck(.25,dur+.3);
      const t=ctx.currentTime, o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.setValueAtTime(strong?110:150,t); o.frequency.exponentialRampToValueAtTime(strong?760:430,t+dur);
      const f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.setValueAtTime(300,t); f.frequency.exponentialRampToValueAtTime(3400,t+dur);
      const g=ctx.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.linearRampToValueAtTime(strong?.1:.06,t+.35);
      const lfo=ctx.createOscillator(), lg=ctx.createGain(); lg.gain.value=.045; lfo.frequency.setValueAtTime(5,t); lfo.frequency.linearRampToValueAtTime(19,t+dur);
      lfo.connect(lg); lg.connect(g.gain); o.connect(f); f.connect(g); g.connect(sfx); o.start(t); lfo.start(t);
      const hb=ctx.createGain(); hb.gain.value=1; hb.connect(sfx); let tt=0,gap=.62; while(tt<dur){ tone(70,.2,'sine',.5,tt,.5,hb); tone(62,.16,'sine',.35,tt+.15,.5,hb); tt+=gap; gap=Math.max(.24,gap*.9); }
      tens={o,lfo,g,hb};
    },
    tensionStop(){ if(!ctx) return; unduck(); if(!tens) return; const x=tens, t=ctx.currentTime; tens=null;
      x.g.gain.cancelScheduledValues(t); x.g.gain.setTargetAtTime(0,t,.04); x.hb.gain.setTargetAtTime(0,t,.04); setTimeout(()=>{ try{x.o.stop(); x.lfo.stop();}catch(e){} },300); },
    coin(){ const f=2300+Math.random()*1400; tone(f,.09,'square',.035,0,1.15); tone(f*1.5,.14,'sine',.05,.045); },
    tick(p){ tone(800+p*900,.03,'square',.03); },
    wheelTick(){ tone(1300,.03,'square',.05); nb(.03,.1,2500,1,0); },
    win(tier){
      if(!ctx) return; duck(.35,2);
      const n={win:3,nice:5,big:8,super:10,mega:12,jackpot:16}[tier]||3, st={win:.075,nice:.07,big:.065,super:.06,mega:.055,jackpot:.05}[tier]||.07;
      for(let i=0;i<n;i++){ const f=SC[i%SC.length]*(i>=SC.length?2:1); tone(f,.28,'triangle',.15,i*st); tone(f*2,.2,'sine',.045,i*st); }
      if(tier==='win') nb(.18,.1,5200,2,0,'highpass');
      if(tier!=='win'&&tier!=='nice'){ [523.25,659.25,783.99].forEach(f=>tone(f,.9,'sawtooth',.045,.05)); [1046.5,1318.5,1568].forEach(f=>tone(f,.9,'sawtooth',.04,.45)); nb(.5,.12,3000,.7,0); }
      const coins={win:3,nice:8,big:18,super:30,mega:46,jackpot:70}[tier]||3;
      for(let i=0;i<coins;i++){ const f=2300+Math.random()*1400, w=.15+i*(tier==='jackpot'?.075:.06)+Math.random()*.04; tone(f,.09,'square',.03,w,1.15); }
      if(tier==='jackpot'){ for(let k=0;k<3;k++) [523.25,659.25,783.99,1046.5].forEach((f,j)=>tone(f,.5,'sawtooth',.04,1.6+k*.7+j*.03)); }
    },
    fsStart(){ [523.25,659.25,783.99,1046.5,1318.5,1568,2093].forEach((f,i)=>{ tone(f,.45,'sawtooth',.05,i*.07); tone(f*2,.3,'sine',.04,i*.07); }); nb(.7,.14,4000,.7,0); duck(.3,2); },
    levelUp(){ [659.25,783.99,987.77,1318.5].forEach((f,i)=>{ tone(f,.35,'triangle',.13,i*.1); tone(f*2,.25,'sine',.05,i*.1); }); },
    ach(){ tone(1046.5,.3,'triangle',.12); tone(1568,.5,'triangle',.1,.12); },
    chest(){ for(let i=0;i<14;i++) tone(1800+Math.random()*2400,.12,'sine',.05,i*.045); tone(392,.5,'triangle',.1); tone(587,.6,'triangle',.1,.1); },
    err(){ tone(200,.18,'square',.07,0,.6); },
    deny(){ tone(330,.16,'triangle',.12,0,.55); tone(247,.34,'triangle',.13,.12,.5); nb(.12,.08,500,1,.1,'lowpass'); },
    lever(){ for(let i=0;i<9;i++) tone(1500+i*90,.025,'square',.04,i*.018); tone(95,.3,'sine',.4,.17,.4); nb(.08,.3,700,1,.17); tone(280,.2,'triangle',.06,.36,1.8); },
    card(){ nb(.07,.22,3600,.9,0,'highpass'); tone(210,.05,'triangle',.07); },
    flip(){ nb(.09,.2,2600,1.2,0,'highpass'); tone(520,.05,'triangle',.05,.04); },
    chip(){ tone(1250,.05,'square',.04); tone(1900,.04,'triangle',.05,.012); nb(.04,.16,2800,2,0); },
    bust(){ tone(180,.5,'sawtooth',.1,0,.4); tone(135,.6,'sawtooth',.08,.08,.45); },
    siren(on){
      if(!ctx) return;
      if(!on){ if(!sir) return; const s=sir; sir=null; s.g.gain.cancelScheduledValues(ctx.currentTime); s.g.gain.setTargetAtTime(0,ctx.currentTime,.03); setTimeout(()=>{ s.n.forEach(o=>{ try{o.stop();}catch(e){} }); },300); return; }
      if(sir) return; const t=ctx.currentTime, g=ctx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.55*alarmVol,t+.25);
      const o1=ctx.createOscillator(), o2=ctx.createOscillator(), lfo=ctx.createOscillator(), lg=ctx.createGain(), lg2=ctx.createGain();
      o1.type='sawtooth'; o2.type='square'; o1.frequency.value=980; o2.frequency.value=985; lfo.type='triangle'; lfo.frequency.value=.85; lg.gain.value=430; lg2.gain.value=430;
      lfo.connect(lg); lg.connect(o1.frequency); lfo.connect(lg2); lg2.connect(o2.frequency);
      const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=320; const m1=ctx.createGain(), m2=ctx.createGain(); m1.gain.value=.55; m2.gain.value=.4;
      o1.connect(m1); o2.connect(m2); m1.connect(hp); m2.connect(hp); hp.connect(g); g.connect(sirOut);
      [o1,o2,lfo].forEach(o=>o.start(t)); sir={g,n:[o1,o2,lfo]};
    }
  };
  return api;
})();

const welcomeOpen=()=>!$('#welcome').classList.contains('gone');
/* ============================== STATE ============================== */
const START=1000000, BETS=[1000,2000,5000,10000,20000,50000,100000,250000];
const BUY={fs:40,wheel:10};
const state={bal:START,balShown:START,bet:5000,betIdx:2,busy:false,auto:false,autoLeft:0,autoStop:{big:true,bonus:true,below:0},turbo:false,grid:null,presId:0,spinNo:0,H:110,autoT:0,plan:null,ant:null,
  meter:0,xp:0,level:1,fs:null,quick:false,lastGrid:null,paused:false,lastWin:null,breakUntil:0,sessionStart:START,sessionT0:Date.now(),lastRc:Date.now(),mDay:'',mBase:{},mDone:{},lastDaily:'',dayStreak:0};
state.grid=randGrid();
const freshS=()=>({spins:0,wagered:0,paid:0,wins:0,ldw:0,near:0,best:0,lost:0,log:[],wilds:0,fsCount:0,wheels:0,sevens:0,jps:0,maxBet:0,bestX:0,bonus:0,gambles:0,bjHands:0,bjWins:0,bjBJ:0,bjSplits:0,bjDoubles:0,bjPush:0,bjBest:0,dbgUsed:0});
const S=freshS();
const ui={mstyle:'jazz',bg:'emerald',shake:1,anticip:true,reveal:false,sfx:.6,mus:.5,alarm:'siren',alarmVol:1,rc:20,lossLimit:0,gfx:'auto'};
let LITE=false, BAL=false, game='lobby';
const lite0=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)||matchMedia('(pointer:coarse)').matches;
function applyGfx(){ let m=ui.gfx||'auto'; if(m==='auto') m=lite0?'balanced':'high'; LITE=m==='lite'; BAL=m==='balanced'||LITE; document.body.classList.toggle('lite',LITE); document.body.classList.toggle('bal',BAL); try{ sizeFx(); }catch(e){} }
const dbg={force:null,sticky:false,wheel:'random'};
const ACH_DONE=new Set();
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let pausedAcc=0,pauseAt=0;
const gtime=()=>(state.paused?pauseAt:performance.now())-pausedAcc;
function setPaused(p){ if(p===state.paused) return; if(p){ pauseAt=performance.now(); state.paused=true; } else { pausedAcc+=performance.now()-pauseAt; state.paused=false; } }
const sleep=ms=>new Promise(res=>{ let left=ms,last=performance.now(); (function t(){ const n=performance.now(); if(!state.paused) left-=n-last; last=n; if(left<=0) res(); else setTimeout(t,Math.min(left,50)); })(); });
const fmt=n=>{ const neg=n<0; n=Math.abs(n); const d=Math.abs(n-Math.round(n))<.005?0:2; return (neg?'-':'')+'$'+n.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}); };
const LINE_COL=['#ffd86b','#7ef0b0','#6bc4ff','#ff7ab0','#c79bff','#ffa35c','#5ff0e6','#f4ff6b','#ff6b6b','#9cff7a'];
const NAMES={SEVEN:'Sevens',DIAMOND:'Diamonds',STAR:'Stars',DICE:'Dice',HORSESHOE:'Horseshoes',MELON:'Melons',CROWN:'Crowns',CLOVER:'Clovers',BAR:'Bars',BELL:'Bells',PLUM:'Plums',LEMON:'Lemons',CHERRY:'Cherries'};
const TIERS={win:['WIN!',.35],nice:['NICE WIN',.65],big:['BIG WIN',1],super:['SUPER WIN',1.4],mega:['MEGA WIN',1.9],jackpot:['JACKPOT',2.6]};
const SUBS=['Winner','Another win','Lucky spin','You’re on a roll','Hot machine','Keep it rolling','Nice one'];
const tierOf=(p,b)=>{ const r=p/b; return r>=100?'jackpot':r>=40?'mega':r>=15?'super':r>=5?'big':r>=1?'nice':'win'; };
const easeOut3=u=>1-Math.pow(1-u,3), easeOut2=u=>1-(1-u)*(1-u);
const xpNeed=l=>120+l*60;
const tierName=l=>l>=35?'Diamond':l>=20?'Platinum':l>=10?'Gold':l>=5?'Silver':'Bronze';
const J={mini:61248,minor:210000,major:824115,mega:7400000,grand:128490318}, SEED={mini:50000,minor:150000,major:500000,mega:5000000,grand:100000000};

/* ---------- persistence ---------- */
const SAVE='99g1c-v1';
function save(){ if(window.__g1cDeleted) return; try{ olSchedule(); }catch(e){} try{ acctSchedule(); }catch(e){} try{ livePush(); }catch(e){} try{ localStorage.setItem(SAVE,JSON.stringify({bal:state.bal,xp:state.xp,level:state.level,meter:state.meter,ach:[...ACH_DONE],S,ui,mDay:state.mDay,mBase:state.mBase,mDone:state.mDone,preset:cfgPreset,pv:2,econ:3,ld:state.lastDaily,ds:state.dayStreak})); }catch(e){} }
function load(){
  try{ const d=JSON.parse(localStorage.getItem(SAVE)||'null'); if(!d) return;
    if(typeof d.bal==='number') state.bal=state.balShown=d.bal; state.xp=d.xp||0; state.level=d.level||1; state.meter=d.meter||0;
    (d.ach||[]).forEach(a=>ACH_DONE.add(a)); Object.assign(S,d.S||{}); Object.assign(ui,d.ui||{}); state.mDay=d.mDay||''; state.mBase=d.mBase||{}; state.mDone=d.mDone||{};
    { const mult=!d.econ?100:d.econ===2?10:1; if(mult>1){ if(typeof d.bal==='number') state.bal=state.balShown=Math.round(d.bal*mult); ui.lossLimit=(ui.lossLimit||0)*mult; if(ui.bet) ui.bet*=mult; if(d.S){ for(const k of ['best','paid','wagered','bonus','maxBet','bjBest']) if(typeof S[k]==='number') S[k]*=mult; } if(d.mBase&&state.mBase) for(const k in state.mBase) if(k==='m3') state.mBase[k]*=mult; } }
    if(d.preset) cfgPreset=d.pv>=2?d.preset:'fun'; state.lastDaily=d.ld||''; state.dayStreak=d.ds||0;
  }catch(e){}
}
load(); state.sessionStart=state.bal;
const today=()=>new Date().toISOString().slice(0,10);

/* ============================== DOM / REELS ============================== */
const reelsEl=$('#reels'), cellsEl=$('#cells'), cab=$('#cabinet');
const symHTML=s=>`<svg class="sym" viewBox="0 0 100 100"><use href="#s-${s}"/></svg>`;
const reels=[];
for(let i=0;i<5;i++){ const el=document.createElement('div'); el.className='reel'; const strip=document.createElement('div'); strip.className='strip'; el.appendChild(strip); reelsEl.appendChild(el); reels.push({i,el,strip,run:null}); }
for(let k=0;k<15;k++){ const c=document.createElement('div'); c.className='cell'; cellsEl.appendChild(c); }
const cellEl=(reel,row)=>cellsEl.children[row*5+reel];
const reelRect=i=>reels[i].el.getBoundingClientRect();
function showStatic(){ reels.forEach(r=>{ r.strip.innerHTML=[vSym(r.i),...state.grid[r.i],vSym(r.i)].map(symHTML).join(''); r.strip.style.transform=`translate3d(0,${-state.H}px,0)`; r.el.classList.remove('mb1','mb2','mb3'); decorate(r.i,state.grid); }); }
function decorate(i,g){ g[i].forEach((s,w)=>{ const el=reels[i].strip.children[w+1]; if(el&&s==='SCATTER') el.classList.add('scat'); }); }
function layout(){
  const mid=$('#mid'), small=innerWidth<600, cp=small?10:18, gap=small?3:5, armW=small?42:66;
  const availW=mid.clientWidth-2*(cp+6)-armW-8, availH=mid.clientHeight-2*(cp+6)-14;
  let cell=Math.floor(Math.min((availW-4*gap)/5,availH/3)); cell=Math.max(36,Math.min(160,cell));
  const arm=$('#arm'); arm.style.width=armW+'px'; arm.style.setProperty('--L',Math.round(Math.max(78,Math.min(170,cell*1.7)))+'px'); arm.classList.toggle('sm',small);
  cab.style.setProperty('--cell',cell+'px'); cab.style.setProperty('--gap',gap+'px'); cab.style.setProperty('--cp',cp+'px'); state.H=cell;
  const w=5*cell+4*gap, h=3*cell, ln=$('#lines'); ln.setAttribute('width',w); ln.setAttribute('height',h); ln.setAttribute('viewBox',`0 0 ${w} ${h}`);
  document.body.classList.toggle('qn',innerWidth<1180);
  if(!state.busy) showStatic();
}
new ResizeObserver(layout).observe($('#mid')); addEventListener('resize',layout);

const TP=120, TA=260, SETTLE=260;
function reelY(u,t){
  if(t<=0) return u.y0; if(t<TP) return u.y0-u.pull*easeOut2(t/TP);
  let yb=u.y0-u.pull, tt=t-TP;
  if(tt<TA){ const k=tt/TA; return yb+u.v*TA*k*k/2; }
  yb+=u.v*TA/2; tt-=TA; if(tt<u.dAc) return yb+u.v*tt;
  yb+=u.v*u.dAc; tt-=u.dAc; const k=Math.min(1,tt/u.dB); return yb+(u.v*u.dB/u.p)*(1-Math.pow(1-k,u.p));
}
const TZ_HOLD=620, TZ_GLIDE=420;
function planReels(g,tease){
  const H=state.H, turbo=state.turbo||!!CINE_MS, ant=anticipation(g); state.ant=ant;
  const gap=turbo?110:270, base=turbo?[380,500,620,740,860]:[900,1150,1400,1650,1900]; const plan=[]; let prev=0, prevHot=false;
  for(let i=0;i<5;i++){
    const start=i*(turbo?35:75); let stop=Math.max(base[i],prev+gap), dB=turbo?340:680, p=3, hot=null; if(CINE_MS) stop=CINE_MS+i*130;
    if(ui.anticip&&ant[i].a&&!CINE_MS){
      const isT=tease&&tease.reel===i;
      let ext=turbo?800:(ant[i].scat?2100:[0,0,1500,2000,2700][i]); if(prevHot&&!isT) ext*=.7;
      if(ext>0){ stop=Math.max(stop,prev+ext); dB=ext; p=5; hot={strong:i>=3||ant[i].scat,ext,scat:ant[i].scat}; }
    }
    prevHot=!!hot; stop=Math.max(stop,start+TP+TA+dB+80);
    const T=stop-start, dAc=T-TP-TA-dB, vT=((ADM.cine&&ADM.cine.running)?.019:turbo?.040:.030)*H, pull=.2*H, sum=TA/2+dAc+dB/p;
    const N=Math.max(5,Math.round((vT*sum-pull)/H));
    let tz=null; if(tease&&tease.reel===i){ tz={idx:tease.alt+1,d:-(tease.alt-tease.row)*H,hold:turbo?TZ_HOLD*.55:TZ_HOLD,glide:turbo?TZ_GLIDE*.7:TZ_GLIDE}; }
    const v=(N*H+(tz?tz.d:0)+pull)/sum;
    plan.push({i,start,stop,T,dAc,dB,p,hot,N,v,pull,tz,y0:-(1+N)*H,yEnd:-H}); prev=stop+(tz?tz.hold+tz.glide:0);
  }
  return plan;
}
function loadStrip(r,u,final){
  const old=state.lastGrid?state.lastGrid[r.i]:state.grid[r.i], arr=[vSym(r.i),...final];
  for(let k=0;k<u.N-3;k++) arr.push(vSym(r.i)); arr.push(...old,vSym(r.i));
  r.strip.innerHTML=arr.map(symHTML).join('');
}
let hotTimer=0;
function setHot(i,on){
  reels[i].el.classList.toggle('hot',on); reels.forEach((r,k)=>r.el.classList.toggle('dim',on&&k!==i)); cab.classList.toggle('tense',on); cab.classList.toggle('fast',on);
  clearInterval(hotTimer); if(on) hotTimer=setInterval(()=>{ const rc=reelRect(i); burst(2,rc.left+Math.random()*rc.width,rc.top+rc.height*Math.random(),2,'spark'); },120);
}
let raf=0;
function runReels(g,tease){
  return new Promise(resolve=>{
    const plan=planReels(g,tease); state.plan=plan; const t0=gtime(); let landed=0, scN=0;
    reels.forEach(r=>{ const u={...plan[r.i],tz:plan[r.i].tz?{...plan[r.i].tz,t0:0,g:0}:null,base:t0,lastY:plan[r.i].y0,landT:0,quick:null,landed:false,done:false,lv:0}; r.run=u; loadStrip(r,u,g[r.i]); r.strip.style.transform=`translate3d(0,${u.y0}px,0)`; });
    function land(r,now,quiet){
      const u=r.run; u.landed=true; u.landT=now; landed++; if(!quiet) Snd.reelStop(r.i); r.el.classList.remove('mb1','mb2','mb3');
      r.el.classList.add('bump'); setTimeout(()=>r.el.classList.remove('bump'),420);
      g[r.i].forEach((s,w)=>{ if(s==='SCATTER'||s==='WILD'||s==='SEVEN'){ const el=r.strip.children[w+1]; if(el) el.classList.add('land'); } });
      const nsc=g[r.i].filter(s=>s==='SCATTER').length; if(nsc){ scN+=nsc; Snd.scatter(scN); }
      if(g[r.i].includes('WILD')) Snd.wildLand();
      if(u.hot){ Snd.tensionStop(); setHot(r.i,false); }
      const nx=plan[r.i+1]; if(nx&&nx.hot&&!state.quick){ setHot(nx.i,true); Snd.tensionStart(nx.hot.ext/1000,nx.hot.strong); }
      if(landed===5) Snd.whirrStop();
    }
    function frame(){
      const now=gtime(); let live=false;
      for(const r of reels){ const u=r.run; if(!u||u.done) continue; live=true; let y;
        if(u.landed){ const s=Math.min(1,(now-u.landT)/SETTLE); y=u.yEnd+.1*state.H*Math.sin(s*Math.PI)*(1-s);
          if(s>=1){ u.done=true; r.strip.innerHTML=[vSym(r.i),...g[r.i],vSym(r.i)].map(symHTML).join(''); r.strip.style.transform=`translate3d(0,${-state.H}px,0)`; r.el.classList.remove('mb1','mb2','mb3'); decorate(r.i,g); continue; } }
        else if(u.quick){ const k=Math.max(0,Math.min(1,(now-u.quick.t0)/u.quick.dur)); y=u.quick.y0+(u.yEnd-u.quick.y0)*easeOut3(k); if(k>=1) land(r,now); }
        else{ const t=now-u.base-u.start;
          if(u.tz&&t>=u.T){
            const z=u.tz; if(!z.t0){ z.t0=now; Snd.reelStop(r.i); Snd.tensionStop(); setHot(r.i,false); const el=r.strip.children[z.idx]; if(el) el.classList.add('land'); }
            const e=now-z.t0;
            if(e<z.hold){ const q=e/z.hold; y=u.yEnd+z.d+.07*state.H*Math.sin(q*Math.PI)*(1-q); }
            else{ if(!z.g){ z.g=1; Snd.deny(); jelly(r.el,'wob'); } const q=Math.min(1,(e-z.hold)/z.glide); y=u.yEnd+z.d*(1-(q<.5?4*q*q*q:1-Math.pow(-2*q+2,3)/2)); if(q>=1){ land(r,now,true); y=u.yEnd; } }
          } else { y=reelY(u,t); if(t>=u.T&&!u.tz) land(r,now); }
        }
        r.strip.style.transform=`translate3d(0,${y}px,0)`;
        const sp=Math.abs(y-u.lastY)/state.H*60; u.lastY=y;
        if(!u.landed){ let lv=sp>22?3:sp>11?2:sp>4.5?1:0; if(ADM.cine&&ADM.cine.running) lv=Math.min(lv,1); if(lv!==u.lv){ u.lv=lv; r.el.classList.remove('mb1','mb2','mb3'); if(lv) r.el.classList.add('mb'+lv); } }
      }
      if(live) raf=requestAnimationFrame(frame); else resolve();
    }
    raf=requestAnimationFrame(frame);
  });
}
function quickStop(){
  if(!state.busy||(ADM.cine&&ADM.cine.running)) return; state.quick=true; const now=gtime(); let k=0; Snd.tensionStop(); setHot(0,false);
  reels.forEach(r=>{ const u=r.run; if(!u||u.landed||u.done||u.quick) return; const t=now-u.base-u.start; const y=t<=0?u.y0:u.lastY; u.quick={t0:now+k*70,y0:y,dur:260}; k++; });
}

/* ============================== HUD ============================== */
function renderHUD(){
  document.querySelectorAll('.gbal').forEach(e=>e.textContent=fmt(state.balShown));
  const bb=$('#bjBal'); if(bb) bb.textContent=fmt(state.balShown);
  $('#bal').textContent=fmt(state.balShown); $('#betv').textContent=fmt(state.bet); $('#perline').textContent=fmt(state.bet/10)+' per line';
  $('#won').textContent=fmt(S.paid); $('#rate').textContent=S.spins?Math.round(S.wins/S.spins*100)+'%':'—';
  const net=$('#net'); net.hidden=!ui.reveal; if(ui.reveal){ const n=state.bal-START; net.textContent='Real net '+fmt(n); net.className='sub '+(n<0?'neg':'pos'); }
  $('#chGamble').disabled=!(state.lastWin&&!state.busy&&!state.fs); $('#chBuy').disabled=state.busy||!!state.fs;
}
function renderMeters(){
  $('#lvl').textContent='LV '+state.level; $('#lvl').title=tierName(state.level)+' VIP'; $('#xpbar').style.width=Math.min(100,state.xp/xpNeed(state.level)*100)+'%';
  $('#lucky').style.width=Math.min(100,state.meter*100)+'%'; $('#lbar').classList.toggle('full',state.meter>=1);
  const wb=$('#btnWheel'); wb.style.setProperty('--p',Math.min(100,state.meter*100)); wb.classList.toggle('ready',state.meter>=1); wb.title=state.meter>=1?'Lucky wheel ready':'Lucky wheel '+Math.floor(state.meter*100)+'%';
}
function renderJP(){ const f=v=>fmt(Math.floor(v)); $('#jpMini').textContent=f(J.mini); $('#jpMinor').textContent=f(J.minor); $('#jpMega').textContent=f(J.mega); $('#jpMajor').textContent=f(J.major); $('#jpGrand').textContent=f(J.grand); }
setInterval(()=>{ if(document.hidden||game==='bj') return; J.mini+=Math.random()*20; J.minor+=Math.random()*55; J.major+=Math.random()*130; J.mega+=Math.random()*420; J.grand+=Math.random()*850; renderJP(); },450);
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove('show'),1700); }
let balTok=0;
function tweenBal(to,dur){ const from=state.balShown, id=++balTok, t0=gtime(); (function s(){ if(id!==balTok) return; const k=Math.min(1,(gtime()-t0)/dur); state.balShown=from+(to-from)*easeOut3(k); renderHUD(); if(k<1) requestAnimationFrame(s); else { state.balShown=to; renderHUD(); } })(); }
function setBet(b){ state.bet=b; state.betIdx=BETS.indexOf(b); renderHUD(); }
function tween(dur,fn,tok){ const t0=gtime(); return new Promise(res=>{ (function s(){ if(tok!==state.presId){ res(false); return; } const k=Math.min(1,(gtime()-t0)/dur); fn(k); if(k<1) requestAnimationFrame(s); else res(true); })(); }); }
const armEl=$('#arm');
function pullArm(){ armEl.classList.remove('pull'); void armEl.offsetWidth; armEl.classList.add('pull'); Snd.lever(); clearTimeout(armEl._t); armEl._t=setTimeout(()=>armEl.classList.remove('pull'),780); }
function setSpinUI(){
  const b=$('#spin'); armEl.classList.toggle('idle',!state.busy&&!state.fs); b.classList.toggle('busy',state.busy); b.classList.toggle('idle',!state.busy&&!state.fs); b.classList.toggle('free',!!state.fs);
  $('#spinLbl').textContent=state.fs?'FREE':state.busy?'STOP':'SPIN'; renderHUD();
}

/* ---------- xp / levels / achievements ---------- */
const pendingLv=[];
function gainXp(n){ state.xp+=n; while(state.xp>=xpNeed(state.level)){ state.xp-=xpNeed(state.level); state.level++; pendingLv.push({lv:state.level,r:state.level*150}); } renderMeters(); }
function flushLevels(){
  if(!pendingLv.length) return; let tot=0;
  while(pendingLv.length){ const {lv,r}=pendingLv.shift(); state.bal+=r; S.bonus+=r; tot+=r; toastAch('Level '+lv+' · '+tierName(lv),'Bonus '+fmt(r)+' added'); }
  Snd.levelUp(); const c=frameCenter(); burst(30,c.x,c.y,10,'coin'); tweenBal(state.bal,700);
}
const ACH=[
 ['first','Opening Night','Place your first spin',()=>S.spins>=1],['wild','Wild Thing','Land a wild symbol',()=>S.wilds>=1],
 ['fs','Bonus Round','Trigger free spins',()=>S.fsCount>=1],['wheel','Wheel of Fortune','Spin the lucky wheel',()=>S.wheels>=1],
 ['seven','Lucky Sevens','Win with three sevens',()=>S.sevens>=1],['hundred','Century','Play 100 spins',()=>S.spins>=100],
 ['roller','High Roller','Bet $100,000 or more',()=>S.maxBet>=100000],['jp','Jackpot Hunter','Win a jackpot on the wheel',()=>S.jps>=1],
 ['big','Big Fish','Win 50x your bet',()=>S.bestX>=50],['gamble','Double or Nothing','Use the gamble feature',()=>S.gambles>=1],
 ['bj1','Natural','Get a blackjack',()=>S.bjBJ>=1],['bjw','Card Sharp','Win 10 blackjack hands',()=>S.bjWins>=10],['bjsp','Split Decision','Split a pair',()=>S.bjSplits>=1],['bjdb','Double Trouble','Win a doubled hand',()=>S.bjDoubles>=1],['bjst','On Fire','Win 3 blackjack hands in a row',()=>S.bjBest>=3]];
function checkAch(){ for(const [id,t,d,fn] of ACH){ if(!ACH_DONE.has(id)&&fn()){ ACH_DONE.add(id); toastAch(t,d); } } }
const achQ=[]; let achBusy=false;
function toastAch(title,sub){ achQ.push({title,sub}); if(!achBusy) runAch(); }
async function runAch(){ achBusy=true; while(achQ.length){ const a=achQ.shift(); $('#ach b').textContent=a.title; $('#ach span').textContent=a.sub; $('#ach').classList.add('show'); Snd.ach(); await sleep(2600); $('#ach').classList.remove('show'); await sleep(550); } achBusy=false; }

/* ---------- missions ---------- */
const MISSIONS=[
 {id:'m1',t:'Spin 25 times',r:50000,get:()=>S.spins,goal:25},{id:'m2',t:'Land 3 wild reels',r:75000,get:()=>S.wilds,goal:3},
 {id:'m3',t:'Wager $500,000',r:100000,get:()=>S.wagered,goal:500000},{id:'m4',t:'Trigger free spins',r:150000,get:()=>S.fsCount,goal:1},
 {id:'m5',t:'Spin the Lucky Wheel',r:100000,get:()=>S.wheels,goal:1},
 {id:'m6',t:'Play 10 blackjack hands',r:60000,get:()=>S.bjHands,goal:10},{id:'m7',t:'Win 5 blackjack hands',r:90000,get:()=>S.bjWins,goal:5}];
function initMissions(){ if(state.mDay!==today()){ state.mDay=today(); state.mDone={}; state.mBase={}; MISSIONS.forEach(m=>state.mBase[m.id]=m.get()); } }

/* ============================== FX ============================== */
const fx=$('#fx'), fc=fx.getContext('2d'); let parts=[], bolts=[], fxOn=false, dpr=1, rain=0, fount=0;
function sizeFx(){ dpr=Math.min(LITE?1:BAL?1.5:2,devicePixelRatio||1); fx.width=innerWidth*dpr; fx.height=innerHeight*dpr; }
sizeFx(); addEventListener('resize',sizeFx);
function ensureFx(){ if(!fxOn){ fxOn=true; requestAnimationFrame(fxFrame); } }
function burst(n,x,y,power,kind){ for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2, sp=(.3+Math.random())*power;
  parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-power*.7,g:.32+Math.random()*.12,r:kind==='spark'?3+Math.random()*4:kind==='conf'?5+Math.random()*5:6+Math.random()*7,rot:Math.random()*6,vr:(Math.random()-.5)*.5,life:1,d:kind==='spark'?.03:.0045+Math.random()*.003,kind,c:['#ff4d6d','#ffd23f','#3ddc97','#4cc9f0','#c77dff','#fff'][vr(6)]}); } ensureFx(); }
function coinRain(ms){ rain=performance.now()+ms; ensureFx(); }
function fountain(ms){ fount=performance.now()+ms; ensureFx(); }
function bolt(x1,y1,x2,y2,col){ const pts=[[x1,y1]], n=11; for(let i=1;i<n;i++){ const t=i/n; pts.push([x1+(x2-x1)*t+(Math.random()-.5)*70*(1-Math.abs(t-.5)),y1+(y2-y1)*t]); } pts.push([x2,y2]); bolts.push({pts,life:1,col}); ensureFx(); }
const coinSpr=(()=>{ const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d'); x.translate(32,32);
  x.fillStyle='#b9801c'; x.beginPath(); x.ellipse(0,2,28,28,0,0,7); x.fill(); x.fillStyle='#f6c859'; x.beginPath(); x.ellipse(0,0,28,28,0,0,7); x.fill();
  x.strokeStyle='#fff1a8'; x.lineWidth=3.5; x.beginPath(); x.ellipse(0,0,17,17,0,0,7); x.stroke(); return c; })();
function fxFrame(now){
  fc.setTransform(dpr,0,0,dpr,0,0); fc.clearRect(0,0,innerWidth,innerHeight);
  if(now<rain) for(let i=0;i<3;i++) parts.push({x:Math.random()*innerWidth,y:-20,vx:(Math.random()-.5)*2,vy:Math.random()*3+3,g:.22,r:7+Math.random()*7,rot:Math.random()*6,vr:(Math.random()-.5)*.4,life:1,d:.0022,kind:'coin'});
  if(now<fount) for(const sx of [0,1]) for(let i=0;i<2;i++) parts.push({x:sx?innerWidth-10:10,y:innerHeight-10,vx:(sx?-1:1)*(3+Math.random()*5),vy:-(13+Math.random()*9),g:.34,r:7+Math.random()*6,rot:Math.random()*6,vr:(Math.random()-.5)*.4,life:1,d:.004,kind:'coin'});
  parts=parts.filter(p=>p.life>0&&p.y<innerHeight+40); if(parts.length>(BAL||LITE?260:520)) parts.splice(0,parts.length-(BAL||LITE?260:520));
  for(const p of parts){ p.vy+=p.g; p.x+=p.vx; p.y+=p.vy; p.rot+=p.vr; p.life-=p.d;
    if(p.kind==='coin'){ const w=Math.abs(Math.cos(p.rot))*p.r+1.2; fc.globalAlpha=Math.min(1,p.life*3); fc.drawImage(coinSpr,p.x-w,p.y-p.r,w*2,p.r*2); fc.globalAlpha=1; }
    else if(p.kind==='conf'){ fc.save(); fc.translate(p.x,p.y); fc.rotate(p.rot); fc.globalAlpha=Math.min(1,p.life*2); fc.fillStyle=p.c; fc.fillRect(-p.r,-p.r*Math.abs(Math.cos(p.rot*2))*.5,p.r*2,p.r*Math.abs(Math.cos(p.rot*2))+1); fc.restore(); }
    else{ fc.save(); fc.translate(p.x,p.y); fc.rotate(p.rot); fc.globalAlpha=Math.max(0,p.life); fc.fillStyle='#fff3b8'; const r=p.r*p.life+1;
      fc.beginPath(); fc.moveTo(0,-r*2); fc.lineTo(r*.4,-r*.4); fc.lineTo(r*2,0); fc.lineTo(r*.4,r*.4); fc.lineTo(0,r*2); fc.lineTo(-r*.4,r*.4); fc.lineTo(-r*2,0); fc.lineTo(-r*.4,-r*.4); fc.closePath(); fc.fill(); fc.restore(); } }
  bolts=bolts.filter(b=>b.life>0);
  for(const b of bolts){ fc.save(); fc.globalAlpha=Math.max(0,b.life); fc.lineJoin='round'; fc.lineCap='round';
    fc.strokeStyle=b.col; fc.lineWidth=9; fc.globalAlpha=b.life*.35; fc.beginPath(); b.pts.forEach((p,i)=>i?fc.lineTo(p[0],p[1]):fc.moveTo(p[0],p[1])); fc.stroke();
    fc.strokeStyle='#fff'; fc.lineWidth=2.5; fc.globalAlpha=b.life; fc.beginPath(); b.pts.forEach((p,i)=>i?fc.lineTo(p[0],p[1]):fc.moveTo(p[0],p[1])); fc.stroke(); fc.restore(); b.life-=.07; }
  if(parts.length||bolts.length||now<rain||now<fount) requestAnimationFrame(fxFrame); else { fxOn=false; fc.clearRect(0,0,innerWidth,innerHeight); }
}
let shakeId=0;
function shake(level){ const k=level*ui.shake*(reduced?.25:1); if(k<=0) return; const el=$(game==='bj'?'#bj':game==='rl'?'#rl':game==='cr'?'#cr':'#stage'), id=++shakeId, amp=9*k, dur=420+620*level, t0=performance.now(), rod=$('#arm .ar-rod'), ball=$('#arm .ar-ball');
  (function s(now){ if(id!==shakeId) return; const u=(now-t0)/dur; if(u>=1){ el.style.transform=''; if(rod){ rod.style.rotate=''; ball.style.translate=''; } return; } const a=Math.pow(1-u,1.3)*amp;
    if(rod&&game==='slots'){ rod.style.rotate=((Math.random()*2-1)*a*.45)+'deg'; ball.style.translate=((Math.random()*2-1)*a*.7)+'px '+((Math.random()*2-1)*a*.5)+'px'; }
    el.style.transform=`translate(${(Math.random()*2-1)*a}px,${(Math.random()*2-1)*a}px) rotate(${(Math.random()*2-1)*a*.05}deg)`; requestAnimationFrame(s); })(t0); }
function flash(){ const f=$('#flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
function ring(){ const e=$('#ring'); e.classList.remove('go'); void e.offsetWidth; e.classList.add('go'); }
function scrFlash(col,a){ const e=$('#scr'); e.style.background=col; e.style.setProperty('--a',a); e.classList.remove('go'); void e.offsetWidth; e.classList.add('go'); }
function frameCenter(){ const r=(game==='bj'?$('#bjtable'):game==='rl'?$('#rlCv'):game==='cr'?$('#crCv'):$('#frame')).getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width}; }

/* ambient background */
let ambN=0; const amb=$('#amb'), ac=amb.getContext('2d'); let dust=Array.from({length:70},()=>({x:Math.random(),y:Math.random(),r:.6+Math.random()*2.2,s:.02+Math.random()*.06,ph:Math.random()*6.28,b:Math.random()<.18}));
const dustSpr={}; function dustSprite(col){ if(dustSpr[col]) return dustSpr[col]; const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d'), g=x.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,`rgba(${col},.55)`); g.addColorStop(1,`rgba(${col},0)`); x.fillStyle=g; x.fillRect(0,0,64,64); return dustSpr[col]=c; }
let dustL=null, ambLast=0;
function ambFrame(t){
  if(document.hidden||game==='lobby'&&false){ requestAnimationFrame(ambFrame); return; }
  if((BAL||LITE)&&t-ambLast<30){ requestAnimationFrame(ambFrame); return; } ambLast=t;
  const w=innerWidth,h=innerHeight,d=LITE?1:Math.min(BAL?1.25:2,devicePixelRatio||1); if(amb.width!==Math.round(w*d)){ amb.width=Math.round(w*d); amb.height=Math.round(h*d); } ac.setTransform(d,0,0,d,0,0); ac.clearRect(0,0,w,h);
  const f=document.body.classList.contains('fs'), col=f?'200,150,255':'255,214,120', spr=dustSprite(col);
  if(!dustL) dustL=dust.slice(0,36); const DU=LITE?dustL.slice(0,24):BAL?dustL:dust, k=(BAL||LITE)?2:1;
  if(!state.paused) for(const p of DU){ p.y-=p.s*.0016*(f?2.4:1)*16*k; if(p.y<-.05){ p.y=1.05; p.x=Math.random(); } }
  for(const p of DU){ const x=p.x*w+Math.sin(t/1800+p.ph)*14, y=p.y*h, a=.25+.35*Math.sin(t/700+p.ph);
    if(p.b&&!LITE){ const s=p.r*14; ac.globalAlpha=.25; ac.drawImage(spr,x-s/2,y-s/2,s,s); }
    else{ const s=p.r*5; ac.globalAlpha=Math.max(.05,a)*.9; ac.drawImage(spr,x-s/2,y-s/2,s,s); } }
  ac.globalAlpha=1;
  requestAnimationFrame(ambFrame);
}
requestAnimationFrame(ambFrame);

/* ---------- jelly engine ---------- */
const JEL='button,.jp,.logo,.grp,.tile,.lbrow,.qt,.mission,.hint';
function jelly(el,k){ if(!el) return; el.classList.remove('jig','wob'); void el.offsetWidth; el.classList.add(k); clearTimeout(el._jt); el._jt=setTimeout(()=>el.classList.remove(k),900); }
document.addEventListener('pointerover',e=>{ const t=e.target.closest&&e.target.closest(JEL); if(t&&!t.disabled&&!(t.contains(e.relatedTarget))) jelly(t,'wob'); });
document.addEventListener('pointerdown',e=>{ const t=e.target.closest&&e.target.closest(JEL); if(t&&!t.disabled){ t.classList.add('sq'); t._sq=1; Snd.boing&&Snd.boing(); } });
function unsq(e){ const t=e.target.closest&&e.target.closest(JEL); $$('.sq').forEach(x=>{ x.classList.remove('sq'); jelly(x,'jig'); }); }
document.addEventListener('pointerup',unsq); document.addEventListener('pointercancel',unsq);
document.addEventListener('pointerleave',unsq,true);
const jellyAll=()=>{ jelly(cab,'jig'); jelly($('#panel'),'wob'); };

/* ============================== PRESENTATION ============================== */
function clearPresentation(){
  state.presId++; $('#banner').className=''; $('#cap').classList.remove('show'); $('#lines').innerHTML=''; $$('.cell').forEach(c=>c.className='cell');
  $$('.sym.pop').forEach(e=>e.classList.remove('pop')); cab.classList.remove('fast','tense'); $('#win').textContent='—';
  $('#rays').classList.remove('on'); document.body.classList.remove('cine'); $('#stage').classList.remove('chroma');
}
function hl(cells){ $$('.cell').forEach(c=>c.className='cell dim'); $$('.sym.pop').forEach(e=>e.classList.remove('pop'));
  cells.forEach(([r,w])=>{ cellEl(r,w).className='cell hit'; const s=reels[r].strip.children[w+1]; if(s) s.classList.add('pop'); }); }
function cellsOf(w){ const L=LINES[w.line]; return Array.from({length:w.count},(_,r)=>[r,L[r]]); }
function scatCells(out){ const a=[]; out.g.forEach((c,r)=>c.forEach((s,w)=>{ if(s==='SCATTER') a.push([r,w]); })); return a; }
function drawLine(w){ const H=state.H, gap=parseFloat(getComputedStyle(cab).getPropertyValue('--gap'))||5, L=LINES[w.line];
  const pts=L.map((row,r)=>[r*(H+gap)+H/2,row*H+H/2]), col=LINE_COL[w.line]; $('#lines').innerHTML=`<path d="M${pts.map(p=>p.join(' ')).join('L')}" stroke="${col}" style="color:${col}"/>`; }
function splash(title,sub,amt,ms,count){
  return new Promise(res=>{ const sp=$('#splash'); $('.tier',sp).textContent=title; $('.bsub',sp).textContent=sub||''; $('.amt',sp).textContent=amt||''; sp.className='show';
    const done=()=>{ sp.className=''; sp.onclick=null; res(); }, to=setTimeout(done,ms); sp.onclick=()=>{ clearTimeout(to); done(); };
    if(count){ const tok=++state.presId; tween(Math.min(2200,ms-500),k=>{ $('.amt',sp).textContent=fmt(Math.floor(count*easeOut3(k)*100)/100); },tok).then(ok=>{ if(ok) $('.amt',sp).textContent=fmt(count); }); } });
}
async function present(out,pay,bet,o){
  o=o||{}; const tok=state.presId, tier=tierOf(pay,bet), T=TIERS[tier], title=T[0], lvl=o.short?Math.min(T[1],1.5):T[1], wins=out.ev.wins, K=o.short?.55:1;
  const ban=$('#banner'); $('#banner .tier').textContent=title; $('#banner .amt').textContent=fmt(0); $('#banner .bsub').textContent=o.mult>1?'x'+o.mult+' multiplier':SUBS[vr(SUBS.length)];
  ban.className='show t-'+tier; void ban.offsetWidth; hl(wins.flatMap(cellsOf).concat(scatCells(out))); flash(); shake(lvl); Snd.win(tier); cab.classList.add('fast'); jelly(cab,'jig');
  const c=frameCenter(); burst(Math.round(8+lvl*14),c.x,c.y,6+lvl*3,'spark');
  if(lvl>=.65) burst(Math.round(10+lvl*22),c.x,c.y,9+lvl*3,'coin'); if(lvl>=1) coinRain(1200+lvl*1300);
  if(lvl>=1){ ring(); scrFlash('#fff3b8',.2+lvl*.1); } if(lvl>=1.4){ $('#rays').classList.add('on'); burst(40,c.x,c.y,12,'conf'); }
  if(lvl>=1.9){ document.body.classList.add('cine'); $('#stage').classList.add('chroma'); fountain(2600); setTimeout(()=>{ if(tok===state.presId){ shake(lvl*.7); flash(); ring(); burst(40,c.x,c.y,13,'coin'); } },1100); }
  const dur=(tier==='win'?800:tier==='nice'?1200:tier==='big'?2400:tier==='super'?3400:tier==='mega'?4600:6500)*K;
  const from=state.balShown, target=state.bal; let lastTick=0; const winEl=$('#win');
  await tween(dur,k=>{ const txt=fmt(Math.floor(pay*easeOut3(k)*100)/100); winEl.textContent=txt; $('#banner .amt').textContent=txt; state.balShown=from+(target-from)*easeOut3(k); renderHUD();
    const n=performance.now(); if(n-lastTick>(tier==='win'?90:55)){ lastTick=n; Snd.tick(k); if(lvl>=1&&Math.random()<.5) Snd.coin(); } },tok);
  if(tok!==state.presId) return;
  winEl.textContent=fmt(pay); $('#banner .amt').textContent=fmt(pay); state.balShown=state.bal; renderHUD();
  await sleep((tier==='win'?600:tier==='nice'?900:1500)*K); if(tok!==state.presId) return;
  ban.classList.add('out'); cab.classList.remove('fast'); $('#rays').classList.remove('on'); document.body.classList.remove('cine'); $('#stage').classList.remove('chroma');
  await sleep(450); if(tok!==state.presId) return; ban.className='';
  const lines=o.short?wins.slice(0,3):wins, reps=o.noCycle?0:(o.short?1:4);
  for(let rep=0;rep<reps;rep++) for(const w of lines){ if(tok!==state.presId) return; drawLine(w); hl(cellsOf(w)); const cap=$('#cap');
    cap.textContent=`Line ${w.line+1} · ${w.count} ${NAMES[w.sym]||w.sym} · ${fmt(w.amount*(o.mult||1))}`; cap.classList.add('show'); Snd.tick(.5); await sleep(o.short?650:1050); }
  if(tok===state.presId){ $('#lines').innerHTML=''; $('#cap').classList.remove('show'); $$('.cell').forEach(c=>c.className='cell'); $$('.sym.pop').forEach(e=>e.classList.remove('pop')); }
}

/* ============================== SPIN FLOW ============================== */
function takeForce(){ const a=admTakeForce(); if(a) return a; const f=dbg.force; if(f&&!dbg.sticky){ dbg.force=null; renderDebugForce(); } return f; }
async function expandPhase(out){
  const list=out.ev.exp; if(!list.length) return; const T=state.turbo?.5:1;
  for(const i of list){
    const rc=reelRect(i), cx=rc.left+rc.width/2; Snd.lightning(); scrFlash('#dcebff',.45); flash();
    bolt(cx+(Math.random()-.5)*80,-10,cx,rc.top+rc.height*.5,'#bfe0ff'); bolt(cx+(Math.random()-.5)*60,rc.top,cx,rc.bottom,'#9fd0ff');
    await sleep(240*T);
    for(let w=0;w<3;w++){ if(out.g[i][w]==='SCATTER') continue; const el=reels[i].strip.children[w+1]; if(!el) continue; el.querySelector('use').setAttribute('href','#s-WILD'); el.classList.remove('wildin','land','scat'); void el.getBoundingClientRect(); el.classList.add('wildin'); }
    Snd.wildExpand(); shake(.4); burst(18,cx,rc.top+rc.height/2,7,'spark'); jelly(reels[i].el,'jig');
    await sleep(520*T);
  }
}
async function spinCore(out){
  state.quick=false; clearPresentation(); setHot(0,false); Snd.tensionStop(); $('#reels').classList.remove('idle');
  state.lastGrid=state.grid; state.grid=out.g; Snd.spinStart(); pullArm(); await runReels(out.g,out.tease); Snd.whirrStop(); setHot(0,false); Snd.tensionStop();
  state.grid=out.ev.g2; await expandPhase(out); $('#reels').classList.add('idle');
}
function showBroke(){ openModal({title:'Out of credits',html:`<p>Your balance is below the minimum bet of ${fmt(BETS[0])}.</p>`,actions:[{id:'reload',label:'Reload '+fmt(START),cls:'btn',fn:()=>{ state.bal=START; state.balShown=START; state.sessionStart=START; setBet(Math.min(state.bet,BETS[2])); closeModal(); renderHUD(); renderDebug(); save(); }}]}); }
async function doSpin(){
  if(away||welcomeOpen()) return;
  if(state.busy){ if(!(ADM.cine&&ADM.cine.running)) quickStop(); return; }
  if(ADM.lock){ toast('This machine is locked'); Snd.err(); return; }
  if(ADM.cine&&!ADM.cine.running){ admCineSpin(); return; }
  wake(); clearTimeout(state.autoT); flushLevels();
  if(state.breakUntil>Date.now()){ toast('Break active: '+Math.ceil((state.breakUntil-Date.now())/1000)+'s left'); Snd.err(); return; }
  if(ui.lossLimit>0&&state.sessionStart-state.bal>=ui.lossLimit){ Snd.err(); stopAuto(); openResponsible(true); return; }
  if(state.bal<state.bet){ const aff=[...BETS].reverse().find(b=>b<=state.bal); if(!aff){ Snd.err(); stopAuto(); showBroke(); return; } setBet(aff); toast('Bet lowered to '+fmt(aff)); }
  state.busy=true; state.lastWin=null; const bet=state.bet; state.bal-=bet; S.spins++; S.wagered+=bet; state.spinNo++; S.maxBet=Math.max(S.maxBet,bet);
  const wasFull=state.meter>=1; state.meter=Math.min(1,state.meter+cfg.meterStep); if(!wasFull&&state.meter>=1) toastAch('Lucky wheel ready','Tap the wheel icon at the top to spin'); gainXp(Math.round(8+bet/20)); renderMeters(); tweenBal(state.bal,220); setSpinUI();
  const out=decideOutcome(bet,takeForce(),{fs:false}); await spinCore(out); await settle(out,bet);
}
async function settle(out,bet){
  const ev=out.ev, pay=ev.total; state.bal+=pay; S.paid+=pay; const net=pay-bet, ant=state.ant||[];
  const nearSeven=ant.some(a=>a.strong&&!a.scat)&&!ev.wins.some(w=>TOP.includes(w.sym)&&w.count>=3), nearScat=ant.some(a=>a.scat)&&ev.scat<3, near=nearSeven||nearScat;
  if(out.tease){ const c=$('#cap'); c.textContent='So close\u2026'; c.classList.add('show'); setTimeout(()=>c.classList.remove('show'),1500); }
  if(pay>0) S.wins++; if(out.ldw) S.ldw++; if(near) S.near++; if(net<0) S.lost++; if(pay>S.best) S.best=pay; S.bestX=Math.max(S.bestX,pay/bet); S.wilds+=ev.exp.length; if(pay>=bet*5) olFeed('slots',pay,bet);
  if(ev.wins.some(w=>w.sym==='SEVEN')) S.sevens++;
  S.log.unshift({n:state.spinNo,bet,pay,net,tag:out.kind+(out.ldw?' ldw':'')+(near?' near':'')}); S.log.length=Math.min(S.log.length,50);
  const bonusFS=ev.spins>0, wheelDue=state.meter>=1&&state.auto, mysJp=(!bonusFS&&!wheelDue)?(ADM.pj?(()=>{ const t=ADM.pj; ADM.pj=null; return t; })():mysteryJp(bet)):null, bonus=bonusFS||wheelDue||!!mysJp;
  if(!bonus){ state.busy=false; state.lastWin=pay>0?{pay,bet}:null; setSpinUI(); } renderHUD(); renderDebug(); renderMeters(); initMissions(); checkAch(); save();
  let p=Promise.resolve(), wait=900;
  if(pay>0){ p=present(out,pay,bet,{noCycle:bonus}); wait=bonus?600:{win:1700,nice:2600,big:5200,super:7000,mega:8800,jackpot:11500}[tierOf(pay,bet)]; }
  else{ $('#win').textContent='$0'; state.balShown=state.bal; renderHUD(); wait=700; }
  if(bonus){ await p;
    if(bonusFS){ await freeSpins(ev.spins,bet); }
    if(wheelDue){ await wheelBonus(bet); }
    else if(mysJp){ toast('MYSTERY JACKPOT!'); await wheelBonus(bet,mysJp); }
    state.busy=false; state.lastWin=null; setSpinUI(); checkAch(); save(); flushLevels(); }
  maybeReality();
  if(state.auto){
    state.autoLeft--; const big=pay>=bet*15, stopBig=state.autoStop.big&&big, stopB=state.autoStop.bonus&&bonus, low=state.autoStop.below>0&&state.bal<state.autoStop.below;
    if(state.autoLeft<=0||stopBig||stopB||low||(state.bal<BETS[0])){ stopAuto(); }
    else state.autoT=setTimeout(()=>{ if(state.auto&&!state.busy) doSpin(); },wait);
    updateAutoChip();
  }
}
/* ---------- free spins ---------- */
function updateFsBar(){ const f=state.fs; if(!f) return; $('#fsN').textContent=f.done; $('#fsM').textContent=f.max; $('#fsMult').textContent='x'+f.mult; $('#fsTot').textContent=fmt(f.total); }
async function freeSpins(n,bet){
  const f=state.fs={left:n,done:0,total:0,mult:1,max:n}; S.fsCount++; document.body.classList.add('fs'); Snd.setMode('fs'); Snd.fsStart(); setSpinUI();
  shake(.9); flash(); scrFlash('#c79bff',.5); ring(); const c=frameCenter(); burst(40,c.x,c.y,11,'spark'); coinRain(1200); jelly(cab,'jig');
  await splash('FREE SPINS',n+' spins · multiplier grows every spin',null,2800);
  $('#fsbar').classList.add('show'); updateFsBar(); await sleep(500);
  while(f.left>0){
    f.left--; f.done++; updateFsBar(); gainXp(6);
    const out=decideOutcome(bet,takeForce(),{fs:true}); await spinCore(out); S.wilds+=out.ev.exp.length;
    const pay=out.ev.total*f.mult;
    if(pay>0){ state.bal+=pay; S.paid+=pay; f.total+=pay; if(pay>S.best) S.best=pay; S.bestX=Math.max(S.bestX,pay/bet); updateFsBar(); await present(out,pay,bet,{short:true,mult:f.mult}); } else await sleep(500);
    if(out.ev.scat>=3){ f.left+=5; f.max+=5; updateFsBar(); Snd.fsStart(); await splash('+5 FREE SPINS','Retriggered',null,1600); }
    if(f.left>0){ f.mult=fsMult(f.mult+1); const m=$('#fsMult'); m.textContent='x'+f.mult; m.classList.remove('bump'); void m.offsetWidth; m.classList.add('bump'); }
    await sleep(350);
  }
  $('#fsbar').classList.remove('show'); clearPresentation();
  Snd.win('mega'); shake(1.4); scrFlash('#ffe9a0',.4); burst(50,c.x,c.y,12,'conf'); coinRain(2200);
  await splash('FREE SPINS COMPLETE','Total win',fmt(0),4600,f.total);
  state.balShown=state.bal; renderHUD(); document.body.classList.remove('fs'); state.fs=null; Snd.setMode('base'); setSpinUI(); save();
}
/* ---------- lucky wheel ---------- */
const wcv=$('#wcv'), wx=wcv.getContext('2d'); let wRot=0;
function drawWheel(){
  const Sz=900,c=Sz/2,n=WEDGES.length,A=Math.PI*2/n; wcv.width=wcv.height=Sz; wx.clearRect(0,0,Sz,Sz); wx.save(); wx.translate(c,c);
  const rim=wx.createLinearGradient(-c,-c,c,c); rim.addColorStop(0,'#fff3bd'); rim.addColorStop(.5,'#c79a45'); rim.addColorStop(1,'#6b4508'); wx.beginPath(); wx.arc(0,0,445,0,7); wx.fillStyle=rim; wx.fill();
  WEDGES.forEach((w,i)=>{ const a0=i*A-A/2-Math.PI/2, a1=a0+A; wx.beginPath(); wx.moveTo(0,0); wx.arc(0,0,418,a0,a1); wx.closePath();
    wx.fillStyle=w.t==='jp'?'#d9a93c':w.t==='fs'?(i%2?'#5b2aa8':'#7a3fd0'):(i%2?'#7d0f22':'#0f4a33'); wx.fill(); wx.strokeStyle='#e2bb62'; wx.lineWidth=4; wx.stroke();
    wx.save(); wx.rotate(i*A-Math.PI/2); wx.textAlign='right'; wx.textBaseline='middle'; wx.font='800 '+(w.l.length>5?50:64)+'px "Barlow Condensed",sans-serif'; wx.lineJoin='round'; wx.lineWidth=7; wx.strokeStyle='rgba(0,0,0,.55)'; wx.fillStyle=w.t==='jp'?'#2b1a02':'#fff3c4';
    if(w.t!=='jp') wx.strokeText(w.l,396,0); wx.fillText(w.l,396,0); wx.restore(); });
  for(let i=0;i<n*2;i++){ const a=i*A/2-A/2-Math.PI/2; wx.beginPath(); wx.arc(Math.cos(a)*432,Math.sin(a)*432,8,0,7); wx.fillStyle='#fff6cc'; wx.fill(); }
  wx.restore();
}
function wheelPrize(idx,bet){ const w=WEDGES[idx]; if(w.t==='cash') return {amt:w.v*bet,label:w.l}; if(w.t==='jp') return {amt:J[w.k],label:w.l+' JACKPOT',jp:w.k}; return {fs:w.v,label:w.v+' FREE SPINS'}; }
async function spinWheel(idx){
  const n=WEDGES.length,A=Math.PI*2/n,jit=(Math.random()-.5)*A*.6, base=-(idx*A+jit), th0=wRot, m=Math.ceil((th0+12*Math.PI-base)/(Math.PI*2)), th1=base+m*Math.PI*2, dur=6200, t0=gtime(); let last=-1;
  await new Promise(res=>{ (function s(){ const k=Math.min(1,(gtime()-t0)/dur); wRot=th0+(th1-th0)*(1-Math.pow(1-k,4)); wcv.style.transform=`rotate(${wRot}rad)`;
    const cur=Math.round((((-wRot)%(Math.PI*2))+Math.PI*2)%(Math.PI*2)/A)%n; if(cur!==last){ last=cur; Snd.wheelTick(); const p=$('.wptr'); p.classList.remove('tick'); void p.offsetWidth; p.classList.add('tick'); }
    if(k<1) requestAnimationFrame(s); else res(); })(); });
}
async function wheelBonus(bet,force){
  if(!force) state.meter=0; renderMeters(); S.wheels++; Snd.setMode('fs'); drawWheel(); wRot=0; wcv.style.transform='rotate(0rad)'; $('#wres').textContent='Spin the wheel'; $('#whub').hidden=false; $('#wheelOv').classList.add('open'); Snd.fsStart();
  await new Promise(res=>{ const go=()=>{ clearTimeout(t); $('#whub').onclick=null; res(); }; const t=setTimeout(go,state.auto?1200:6000); $('#whub').onclick=go; });
  $('#whub').hidden=true; const idx=pickWedge(force||dbg.wheel); await spinWheel(idx); const pz=wheelPrize(idx,bet);
  Snd.win(pz.jp==='grand'?'jackpot':pz.jp?'mega':'big'); shake(pz.jp?2:1); const c=frameCenter(); burst(60,innerWidth/2,innerHeight/2,13,'conf'); burst(30,innerWidth/2,innerHeight/2,12,'coin'); coinRain(2500); scrFlash('#fff3b8',.4);
  if(pz.amt){ $('#wres').textContent=pz.label+' · '+fmt(0); state.bal+=pz.amt; S.paid+=pz.amt; if(pz.jp){ S.jps++; J[pz.jp]=SEED[pz.jp]; renderJP(); } if(pz.amt>S.best) S.best=pz.amt;
    const tok=++state.presId; tween(1800,k=>{ $('#wres').textContent=pz.label+' · '+fmt(Math.floor(pz.amt*easeOut3(k))); },tok); tweenBal(state.bal,1800); }
  else $('#wres').textContent=pz.label;
  await sleep(3200); $('#wheelOv').classList.remove('open'); state.balShown=state.bal; renderHUD();
  if(pz.fs) await freeSpins(pz.fs,bet); else Snd.setMode('base'); save();
}
async function runBonus(fn){ if(state.busy) return false; state.busy=true; setSpinUI(); try{ await fn(); }finally{ state.busy=false; setSpinUI(); save(); } return true; }

/* ---------- gamble (red / black) ---------- */
function openGamble(){
  const lw=state.lastWin; if(!lw||state.busy||state.fs) return; let stake=lw.pay, round=0, done=false; if(state.bal<stake) return;
  state.bal-=stake; S.paid-=stake; state.lastWin=null; tweenBal(state.bal,300); clearPresentation(); S.gambles++;
  const collect=()=>{ if(done) return; done=true; if(stake>0){ state.bal+=stake; S.paid+=stake; if(stake>S.best) S.best=stake; } tweenBal(state.bal,500); renderHUD(); save(); checkAch(); };
  openModal({title:'Double or nothing',html:`<p>Pick a colour. Guess right and your win doubles (up to 4 times).</p><div class="gcard" id="gc">?</div><p class="big" style="text-align:center" id="gs">${fmt(stake)}</p><div class="gbtns"><button class="btn r" id="gr">Red</button><button class="btn k" id="gk">Black</button></div><p class="note" id="gm" style="text-align:center">Win chance 50%</p>`,
    actions:[{id:'gcol',label:'Collect',cls:'btn',fn:()=>{ collect(); closeModal(); }}],onClose:collect,
    wire:card=>{ const pick=c=>{ if(done) return; const win=Math.random()<cfg.gambleP, col=win?c:(c==='red'?'black':'red'), g=$('#gc',card); g.className='gcard '+col; g.textContent=col==='red'?'♥':'♠'; jelly(g,'jig');
        if(win){ stake*=2; round++; Snd.win('nice'); $('#gs',card).textContent=fmt(stake); $('#gm',card).textContent='Correct! '+(round>=4?'Maximum reached.':'Double again?'); if(round>=4){ collect(); setTimeout(closeModal,1200); } }
        else{ stake=0; Snd.err(); $('#gs',card).textContent=fmt(0); $('#gm',card).textContent='Wrong colour. Better luck next time.'; done=true; tweenBal(state.bal,300); setTimeout(closeModal,1400); } };
      $('#gr',card).onclick=()=>pick('red'); $('#gk',card).onclick=()=>pick('black'); }});
}

/* ============================== MODALS ============================== */
let modalClose=null;
function openModal(o){
  const c=$('#modalCard'); c.innerHTML=`<h2>${o.title}</h2>${o.html||''}<div class="row">${(o.actions||[]).map(a=>`<button class="${a.cls||'btn'}" id="act_${a.id}">${a.label}</button>`).join('')}<button class="btn" id="mclose" style="background:linear-gradient(#3a2c0a,#150e02);color:var(--brass-hi);border:1px solid var(--brass-lo)">Close</button></div>`;
  (o.actions||[]).forEach(a=>{ const b=$('#act_'+a.id,c); if(b) b.onclick=a.fn; }); $('#mclose',c).onclick=closeModal; modalClose=o.onClose||null; $('#modal').classList.add('open'); if(o.wire) o.wire(c);
}
function closeModal(){ $('#modal').classList.remove('open'); const f=modalClose; modalClose=null; if(f) f(); }
$('#modal').addEventListener('click',e=>{ if(e.target.id==='modal') closeModal(); });
const ICON={rules:'<path d="M5 4h14v16H5z"/><path d="M8 9h8M8 13h8M8 17h5"/>',gift:'<path d="M4 9h16v4H4zM6 13v7h12v-7M12 9v11"/><path d="M12 9C9 9 8 5 10 5s2 4 2 4zM12 9c3 0 4-4 2-4s-2 4-2 4z"/>',board:'<path d="M7 20V10M12 20V4M17 20v-7"/>',hist:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',set:'<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',key:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>',full:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'};
const tile=(id,ic,label)=>`<button class="tile" data-go="${id}"><svg viewBox="0 0 24 24">${ICON[ic]}</svg>${label}</button>`;
function openMenu(){ openModal({title:'99G1C menu',html:`<div class="tiles">${tile('rules','rules','Paytable & rules')}${tile('rewards','gift','Rewards & missions')}${tile('board','board','Leaderboard')}${tile('hist','hist','Game history')}${tile('set','set','Settings')}${tile('resp','shield','Responsible play')}${tile('keys','key','Shortcuts')}${tile('full','full','Fullscreen')}</div>`,
  wire:c=>$$('[data-go]',c).forEach(b=>b.onclick=()=>{ const g=b.dataset.go; closeModal(); setTimeout(()=>({rules:()=>game==='bj'?openBjRules():openPaytable(),rewards:openRewards,board:openBoard,hist:openHistory,set:openSettings,resp:()=>openResponsible(),keys:openKeys,full:goFull})[g](),30); })}); }
function goFull(){ try{ const p=document.documentElement.requestFullscreen?document.documentElement.requestFullscreen():null; if(p&&p.catch) p.catch(()=>toast('Fullscreen is not available here')); }catch(e){ toast('Fullscreen is not available here'); } }
function openPaytable(){
  const lb=state.bet/10, sy=Object.keys(PAY);
  const rows=sy.map(s=>{ const p=PAY[s]; return `<div><svg viewBox="0 0 100 100"><use href="#s-${s}"/></svg><dl>${Object.keys(p).map(k=>`<span>${k}×</span> ${fmt(p[k]*lb)}`).join('<br>')}</dl></div>`; }).join('')
   +`<div><svg viewBox="0 0 100 100"><use href="#s-WILD"/></svg><dl>Substitutes for all but scatter.<br><span>Expands</span> to fill its reel.</dl></div>`
   +`<div><svg viewBox="0 0 100 100"><use href="#s-SCATTER"/></svg><dl>${[3,4,5].map(k=>`<span>${k}×</span> ${fmt(SC_PAY[k]*state.bet)} + ${SC_SPINS[k]} free spins`).join('<br>')}</dl></div>`;
  const lines=LINES.map((L,i)=>{ const pts=L.map((r,c)=>`${12+c*19},${10+r*16}`).join(' '); return `<svg viewBox="0 0 100 52"><polyline points="${pts}" fill="none" stroke="${LINE_COL[i]}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><text x="3" y="10" font-size="9" fill="#9db3a6" font-family="sans-serif">${i+1}</text></svg>`; }).join('');
  openModal({title:'Paytable & rules',html:`<p>Matches pay left to right on any of 10 lines. Prices shown for a ${fmt(state.bet)} bet (${fmt(lb)} per line).</p><div class="pt">${rows}</div><div class="lg">${lines}</div>
  <p class="note"><b>Free spins:</b> multiplier starts at x1 and grows by one every spin up to x10. Three or more scatters retrigger +5 spins. <b>Lucky wheel:</b> fills as you play and awards cash, free spins or a jackpot. <b>Buy bonus:</b> skip straight to a feature for a fixed price. <b>Gamble:</b> double a win on a red or black pick.</p>`}); }
function openRewards(){
  initMissions();
  const html=`<div class="field"><div><label>VIP status</label><small>Level ${state.level} · ${tierName(state.level)}</small></div><div class="big">${tierName(state.level)}</div></div>
  <div class="bar" style="margin:10px 0 16px"><i style="width:${Math.min(100,state.xp/xpNeed(state.level)*100)}%"></i></div>
  <div class="scroll">${MISSIONS.map(m=>{ const prog=Math.min(m.goal,Math.max(0,m.get()-(state.mBase[m.id]||0))), done=state.mDone[m.id], ready=prog>=m.goal&&!done;
    return `<div class="mission"><div><b>${m.t}</b><div class="note" style="margin:2px 0 6px">${Math.floor(prog).toLocaleString()} / ${m.goal.toLocaleString()} · reward ${fmt(m.r)}</div></div><button class="${ready?'btn':'seg'}" data-m="${m.id}" ${ready?'':'disabled'} style="${ready?'':'padding:8px 12px;border-radius:99px;border:1px solid var(--brass-lo);background:#120c02;color:var(--brass-hi);opacity:.6'}">${done?'Claimed':ready?'Claim':'In progress'}</button><div class="bar"><i style="width:${prog/m.goal*100}%"></i></div></div>`; }).join('')}</div>
  <p class="note">Achievements unlocked: ${ACH_DONE.size} / ${ACH.length}</p>`;
  openModal({title:'Rewards & missions',html,wire:c=>$$('[data-m]',c).forEach(b=>b.onclick=()=>{ const m=MISSIONS.find(x=>x.id===b.dataset.m); if(!m||state.mDone[m.id]) return; state.mDone[m.id]=true; state.bal+=m.r; S.bonus+=m.r; tweenBal(state.bal,700); Snd.chest(); const cc=frameCenter(); burst(24,cc.x,cc.y,10,'coin'); save(); closeModal(); setTimeout(openRewards,50); })}); }
function openBoard(){ openOnline(); }
function openHistory(){
  const draw=c=>{ $('#hbody',c).innerHTML=S.log.map(l=>`<tr><td>#${l.n}</td><td>${fmt(l.bet)}</td><td class="pos">${l.pay>0?'Win '+fmt(l.pay):'—'}</td>${ui.reveal?`<td class="${l.net<0?'neg':'pos'}">${l.net>=0?'+':''}${fmt(l.net)}</td>`:''}</tr>`).join('')||'<tr><td colspan="4">No spins yet.</td></tr>'; };
  openModal({title:'Game history',html:`<div class="field"><label for="hrev">Show net result per spin</label><input type="checkbox" id="hrev" ${ui.reveal?'checked':''}></div><div class="scroll"><table class="tbl"><thead><tr><th>Spin</th><th>Bet</th><th>Win</th>${ui.reveal?'<th>Net</th>':''}</tr></thead><tbody id="hbody"></tbody></table></div>`,
   wire:c=>{ draw(c); $('#hrev',c).onchange=e=>{ ui.reveal=e.target.checked; renderHUD(); closeModal(); setTimeout(openHistory,30); }; }}); }
function openSettings(){
  openModal({title:'Settings',html:`<div class="field"><label>Sound effects</label><input type="range" id="sSfx" min="0" max="100" value="${Math.round(ui.sfx*100)}"></div>
  <div class="field"><label>Music</label><input type="range" id="sMus" min="0" max="100" value="${Math.round(ui.mus*100)}"></div>
  <div class="field"><label>Screen shake</label><input type="range" id="sShk" min="0" max="200" value="${Math.round(ui.shake*100)}"></div>
  <div class="field"><div><label for="sGfx">Graphics</label><small>Auto picks Balanced on phones: same look, lighter effects</small></div><select id="sGfx">${[['auto','Auto'],['high','High'],['balanced','Balanced'],['lite','Lite']].map(x=>`<option value="${x[0]}" ${ui.gfx===x[0]?'selected':''}>${x[1]}</option>`).join('')}</select></div>
  <div class="field"><label for="sTur">Turbo spin</label><input type="checkbox" id="sTur" ${state.turbo?'checked':''}></div>
  <div class="field"><div><label>Come-back alarm</label><small>When you switch tabs or move the cursor away</small></div><div class="seg" id="sAl">${[['off','Off'],['pause','Pause only'],['siren','Pause + siren']].map(a=>`<button data-v="${a[0]}" class="${ui.alarm===a[0]?'on':''}">${a[1]}</button>`).join('')}</div></div>
  <div class="field"><label>Alarm volume</label><input type="range" id="sAv" min="5" max="100" value="${Math.round(ui.alarmVol*100)}"></div>
  <div class="field"><div><label>Account</label><small>Remove your username, scores and saved progress</small></div><button class="btn" id="sDel" type="button">Delete account</button></div>
  <div class="field"><div><label>Music style</label><small>Changes the soundtrack right away</small></div><select id="sMst">${[['jazz','Smoky jazz'],['lounge','Velvet lounge'],['synth','Neon synthwave'],['rag','Ragtime bounce'],['ambient','Night ambient']].map(a=>`<option value="${a[0]}" ${(ui.mstyle||'jazz')===a[0]?'selected':''}>${a[1]}</option>`).join('')}</select></div>
  <div class="field"><div><label>Background</label><small>Colours behind every game</small></div><select id="sBg">${BG_LIST.map(a=>`<option value="${a[0]}" ${(ui.bg||'emerald')===a[0]?'selected':''}>${a[1]}</option>`).join('')}</select></div>
  <div class="field"><div><label>Email login</label><small>Optional. Use the same account on two devices</small></div><button class="btn" id="sAcct" type="button">${ui.acct?'Manage':'Log in'}</button></div>
  <div class="field"><div><label>Reality check</label><small>Reminder with your real session numbers</small></div><select id="sRc">${[[0,'Off'],[10,'Every 10 min'],[20,'Every 20 min'],[30,'Every 30 min'],[60,'Every hour']].map(a=>`<option value="${a[0]}" ${ui.rc===a[0]?'selected':''}>${a[1]}</option>`).join('')}</select></div>`,
  wire:c=>{ $('#sDel',c).onclick=()=>acctConfirm(); $('#sMst',c).onchange=e=>{ ui.mstyle=e.target.value; Snd.setStyle(ui.mstyle); wake(); save(); }; $('#sBg',c).onchange=e=>{ ui.bg=e.target.value; applyBg(ui.bg); save(); }; $('#sAcct',c).onclick=()=>acctLogin(); $('#sGfx',c).onchange=e=>{ ui.gfx=e.target.value; applyGfx(); save(); }; $('#sSfx',c).oninput=e=>{ ui.sfx=e.target.value/100; Snd.setVol(ui.sfx); }; $('#sMus',c).oninput=e=>{ ui.mus=e.target.value/100; Snd.setMusicVol(ui.mus); }; $('#sShk',c).oninput=e=>{ ui.shake=e.target.value/100; };
    $('#sTur',c).onchange=e=>{ state.turbo=e.target.checked; $('#chTurbo').classList.toggle('on',state.turbo); }; $('#sAv',c).oninput=e=>{ ui.alarmVol=e.target.value/100; Snd.setAlarmVol(ui.alarmVol); };
    $$('#sAl button',c).forEach(b=>b.onclick=()=>{ ui.alarm=b.dataset.v; $$('#sAl button',c).forEach(x=>x.classList.toggle('on',x===b)); }); $('#sRc',c).onchange=e=>{ ui.rc=+e.target.value; state.lastRc=Date.now(); save(); }; }}); }
function openKeys(){ openModal({title:'Keyboard shortcuts',html:`<table class="tbl">${[['Space / Enter','Spin or stop the reels'],['Arrow up / down','Raise or lower bet'],['T','Toggle turbo'],['M','Toggle music'],['` or F2','Debug panel']].map(r=>`<tr><td><span class="hint">${r[0]}</span></td><td>${r[1]}</td></tr>`).join('')}</table>`}); }
function sessionNumbers(){ const mins=Math.floor((Date.now()-state.sessionT0)/60000), net=state.bal-state.sessionStart;
  return `<div class="kvs"><span>Session time</span><b>${mins} min</b><span>Total wagered</span><b>${fmt(S.wagered)}</b><span>Total returned</span><b>${fmt(S.paid)}</b><span>Real result this session</span><b class="${net<0?'neg':'pos'}">${net>=0?'+':''}${fmt(net)}</b><span>Real return rate</span><b>${S.wagered?(S.paid/S.wagered*100).toFixed(1)+'%':'—'}</b></div>`; }
function openResponsible(limitHit){
  openModal({title:limitHit?'Loss limit reached':'Responsible play',html:`<p>${limitHit?'You reached the loss limit you set. Spins are blocked until you change it.':'This is a simulator with play money. Use these tools the way you would on a real site.'}</p>${sessionNumbers()}
  <div class="field" style="margin-top:12px"><div><label for="rLim">Session loss limit</label><small>0 means no limit</small></div><input type="number" id="rLim" min="0" step="50000" value="${ui.lossLimit}" style="width:110px"></div>
  <div class="field"><label>Take a break</label><div class="seg" id="rBr"><button data-s="30">30 sec</button><button data-s="120">2 min</button><button data-s="600">10 min</button></div></div>`,
  wire:c=>{ $('#rLim',c).onchange=e=>{ ui.lossLimit=Math.max(0,+e.target.value||0); save(); toast(ui.lossLimit?'Loss limit '+fmt(ui.lossLimit):'Loss limit removed'); };
    $$('#rBr button',c).forEach(b=>b.onclick=()=>{ state.breakUntil=Date.now()+b.dataset.s*1000; stopAuto(); closeModal(); toast('Break started'); }); }}); }
function maybeReality(){ if(!ui.rc||state.busy||state.fs||$('#modal').classList.contains('open')) return; if(Date.now()-state.lastRc<ui.rc*60000) return; state.lastRc=Date.now();
  openModal({title:'Reality check',html:`<p>You have been playing for a while. Here are your real numbers.</p>${sessionNumbers()}`,actions:[{id:'brk',label:'Take a 2 min break',cls:'btn',fn:()=>{ state.breakUntil=Date.now()+120000; stopAuto(); closeModal(); }}]}); }

/* ============================== CONTROLS ============================== */
let musicOn=true, musicStarted=false;
const BG_LIST=[['emerald','Emerald felt'],['midnight','Midnight blue'],['burgundy','Burgundy velvet'],['sunset','Sunset lounge'],['noir','Noir and gold'],['neon','Neon grid'],['stars','Starry night']];
function applyBg(id){ document.documentElement.dataset.bg=BG_LIST.some(b=>b[0]===id)?id:'emerald'; }
setTimeout(()=>applyBg(ui.bg),0);
function wake(){ Snd.init(); if(!musicStarted){ musicStarted=true; Snd.setVol(ui.sfx); Snd.setMusicVol(ui.mus); Snd.setAlarmVol(ui.alarmVol); Snd.setStyle(ui.mstyle||'jazz'); if(musicOn) Snd.music(true); } }
function stopAuto(){ state.auto=false; state.autoLeft=0; updateAutoChip(); }
function updateAutoChip(){ const b=$('#chAuto'); b.classList.toggle('on',state.auto); b.textContent=state.auto?(state.autoLeft>9999?'Auto ∞':'Auto '+state.autoLeft):'Auto'; }
function openAuto(){
  if(state.auto){ stopAuto(); return; }
  let n=25; openModal({title:'Autoplay',html:`<div class="field"><label>Number of spins</label><div class="seg" id="aN">${[10,25,50,100,'∞'].map(v=>`<button data-v="${v}" class="${v===25?'on':''}">${v}</button>`).join('')}</div></div>
  <div class="field"><label for="aBig">Stop on a big win (15x bet or more)</label><input type="checkbox" id="aBig" ${state.autoStop.big?'checked':''}></div>
  <div class="field"><label for="aBon">Stop when a bonus triggers</label><input type="checkbox" id="aBon" ${state.autoStop.bonus?'checked':''}></div>
  <div class="field"><div><label for="aLow">Stop if balance falls below</label><small>0 means off</small></div><input type="number" id="aLow" min="0" step="50000" value="${state.autoStop.below}" style="width:110px"></div>`,
  actions:[{id:'astart',label:'Start',cls:'btn',fn:()=>{ state.autoStop={big:$('#aBig').checked,bonus:$('#aBon').checked,below:+$('#aLow').value||0}; state.auto=true; state.autoLeft=n==='∞'?1e9:n; updateAutoChip(); closeModal(); if(!state.busy) doSpin(); }}],
  wire:c=>$$('#aN button',c).forEach(b=>b.onclick=()=>{ n=b.dataset.v==='∞'?'∞':+b.dataset.v; $$('#aN button',c).forEach(x=>x.classList.toggle('on',x===b)); })});
}
function openBuy(){
  if(state.busy||state.fs) return; const bet=state.bet, cf=bet*BUY.fs, cw=bet*BUY.wheel;
  openModal({title:'Buy bonus',html:`<p>Skip the wait. Pick a feature and pay the fixed price.</p><div class="tiles"><button class="tile" id="bFs"><b class="big">10 FREE SPINS</b><span>${fmt(cf)}</span></button><button class="tile" id="bWh"><b class="big">LUCKY WHEEL</b><span>${fmt(cw)}</span></button></div><p class="note">Prices are ${BUY.fs}x and ${BUY.wheel}x your current bet.</p>`,
  wire:c=>{ const buy=(cost,fn)=>{ if(state.bal<cost){ Snd.err(); toast('Not enough balance'); return; } wake(); state.bal-=cost; S.wagered+=cost; tweenBal(state.bal,300); closeModal(); gainXp(30); setTimeout(()=>runBonus(fn).then(()=>{ flushLevels(); checkAch(); }),250); };
    $('#bFs',c).onclick=()=>buy(cf,()=>freeSpins(10,bet)); $('#bWh',c).onclick=()=>buy(cw,()=>wheelBonus(bet)); }}); }
$('#spin').onclick=()=>doSpin();
armEl.onclick=()=>{ wake(); doSpin(); };
$('#betUp').onclick=()=>{ wake(); if(state.busy) return; if(state.betIdx<BETS.length-1){ setBet(BETS[state.betIdx+1]); Snd.bet(true); } };
$('#betDn').onclick=()=>{ wake(); if(state.busy) return; if(state.betIdx>0){ setBet(BETS[state.betIdx-1]); Snd.bet(false); } };
$('#chMax').onclick=()=>{ wake(); if(state.busy) return; setBet([...BETS].reverse().find(b=>b<=state.bal)||BETS[0]); Snd.click(); doSpin(); };
$('#chAuto').onclick=()=>{ wake(); Snd.click(); openAuto(); };
$('#chTurbo').onclick=e=>{ wake(); state.turbo=!state.turbo; e.currentTarget.classList.toggle('on',state.turbo); Snd.click(); };
$('#chBuy').onclick=()=>{ wake(); Snd.click(); openBuy(); };
$('#chGamble').onclick=()=>{ wake(); Snd.click(); openGamble(); };
$('#btnWheel').onclick=()=>{ wake(); Snd.click();
  if(state.busy||state.fs){ toast('Finish the current spin first'); return; }
  if(state.meter>=1){ runBonus(()=>wheelBonus(state.bet)).then(()=>{ flushLevels(); checkAch(); }); }
  else toast('Lucky wheel '+Math.floor(state.meter*100)+'% charged \u2014 keep spinning'); };
$('#btnMenu').onclick=()=>{ wake(); Snd.click(); openMenu(); };
$('#btnSound').onclick=e=>{ wake(); const m=!Snd.muted; Snd.setMuted(m); $$('#btnSound,#bjSound').forEach(b=>b.classList.toggle('off',m)); $('#sndWave').style.display=m?'none':''; Snd.click(); };
$('#btnMusic').onclick=e=>{ wake(); musicOn=!musicOn; Snd.setMusicMuted(!musicOn); $$('#btnMusic,#bjMusic').forEach(b=>b.classList.toggle('off',!musicOn)); };
let giftAt=Date.now()+90000;
function updateGift(){ const ms=giftAt-Date.now(), b=$('#chGift'); if(ms<=0){ b.textContent='Collect gift'; b.classList.add('ready'); } else { const s=Math.ceil(ms/1000); b.textContent='Gift '+Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); b.classList.remove('ready'); } }
setInterval(updateGift,1000); updateGift();
$('#chGift').onclick=()=>{ wake(); if(giftAt>Date.now()){ Snd.err(); return; } if(state.busy){ toast('Collect after the spin'); return; } const amt=[25000,40000,50000,75000,100000,150000][vr(6)]; state.bal+=amt; S.bonus+=amt; Snd.chest(); const c=frameCenter(); burst(30,c.x,c.y,10,'coin'); coinRain(1200); tweenBal(state.bal,800); toastAch('Gift collected','+'+fmt(amt)); giftAt=Date.now()+120000; updateGift(); save(); };
let logoTaps=0, logoT=0; $('#logo').addEventListener('click',()=>{ logoTaps++; clearTimeout(logoT); logoT=setTimeout(()=>logoTaps=0,900); if(logoTaps>=5){ logoTaps=0; toggleDebug(); } });
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('button'); if(b&&e.detail>0) b.blur(); });
addEventListener('keydown',e=>{
  if(away){ if(['Space','Enter'].includes(e.code)){ e.preventDefault(); resume(); } return; }
  const tg=document.activeElement&&document.activeElement.tagName, typing=/INPUT|SELECT|TEXTAREA/.test(tg||'');
  if(e.code==='Backquote'||e.key==='F2'){ e.preventDefault(); toggleDebug(); return; }
  if(e.key==='Escape'){ closeModal(); return; } if(typing) return;
  if(game==='lobby'||game==='rl'||game==='cr') return; if(game==='bj'){ bjKey(e); return; }
  if(e.code==='Space'||e.code==='Enter'){ if(tg==='BUTTON') return; e.preventDefault(); if($('#wheelOv').classList.contains('open')){ $('#whub').click(); return; } if($('#modal').classList.contains('open')) return; doSpin(); return; }
  if(e.key==='ArrowUp'){ e.preventDefault(); $('#betUp').click(); } if(e.key==='ArrowDown'){ e.preventDefault(); $('#betDn').click(); }
  if(e.key==='t'||e.key==='T') $('#chTurbo').click(); if(e.key==='m'||e.key==='M') $('#btnMusic').click();
  if(document.body.classList.contains('dbg')&&/^[0-9]$/.test(e.key)){ const i=e.key==='0'?9:+e.key-1; if(MODES[i]) forceMode(MODES[i][0]); }
});

/* ============================== COME-BACK ALARM ============================== */
let away=false, leaveT=0;
function goAway(){ if(ui.alarm==='off'||away||welcomeOpen()) return; away=true; setPaused(true); Snd.hush(true); $('#cb').classList.add('on'); if(ui.alarm==='siren') Snd.siren(true); }
function resume(){ if(!away) return; away=false; setPaused(false); Snd.hush(false); Snd.siren(false); $('#cb').classList.remove('on'); }
addEventListener('blur',goAway);
document.addEventListener('visibilitychange',()=>{ if(document.hidden) goAway(); else Snd.siren(false); });
document.addEventListener('mouseleave',()=>{ clearTimeout(leaveT); leaveT=setTimeout(goAway,450); });
document.addEventListener('mouseenter',()=>{ clearTimeout(leaveT); if(away) Snd.siren(false); });
addEventListener('focus',()=>{ if(away) Snd.siren(false); });
$('#cbBtn').onclick=resume;

/* ============================== QUOTES / TICKER ============================== */
const QUOTES=['99% of gamblers quit before the big win.','You miss 100% of the spins you don\u2019t take.','Winners never quit. Quitters never win. Spin again.','The next spin is always the one.','Fortune favours the persistent.','Your lucky streak is loading\u2026','Today is your day. Probably.','Every spin is a win. Technically.','One more spin. Just one.','The big win is closer than it looks.','99 gamblers quit. 1 Claude didn\u2019t.','Luck is just persistence wearing a hat.','Close counts here.','Big wins hide behind small bets.',
'Every legend started with one more spin.','The reels remember who stayed.','You\u2019re 1 spin away from a different mood.','Quitters see a loss. Winners see a warm-up.','Almost is just early.','The jackpot doesn\u2019t knock. It waits for the one still spinning.','Seven is lucky. So is the person who keeps going.','Don\u2019t leave now. The wheel is warming up.','Fortune loves a regular.','Somebody wins today. Might as well be someone who stayed.','The best time to quit is right after the big win.','Your balance is just a number. Your streak is a story.','Hot machines stay hot for the loyal.','Champions spin through the quiet part.','You\u2019ve come this far. The reels noticed.','Scatters are shy. Be patient.','The wild is coming. Hold the line.','Calm hands. Steady spins. Golden outcomes.','Nobody remembers who left early.','A bad spin is a good spin in disguise.','Every near miss is a vote for the next one.','The house has a plan. So do you: spin.','Tonight\u2019s forecast: sevens, with a chance of jackpot.','Big dreams. Small bets. Many spins.','The 100th spin is where it gets interesting.','Press on. Gold is a patient colour.','Believe in the next reel.','Lucky people just spin more.','Your future self wants you to spin this one.','Stay a little longer. The best part is coming.'];
let qi=0; const nextQuote=()=>QUOTES[(qi++)%QUOTES.length];
let qSide=0;
function spawnQuote(){
  if(state.paused||document.hidden) return; const txt=nextQuote();
  const b=document.createElement('div'); b.className='bq'; b.textContent=nextQuote(); b.style.left=(4+Math.random()*50)+'vw'; $('#qback').appendChild(b); setTimeout(()=>b.remove(),22500);
  if(game==='bj') return;
  if(document.body.classList.contains('qn')){
    const t=$('#qtxt'); t.textContent=txt; t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop'); return;
  }
  if(innerHeight<480) return;
  const q=document.createElement('div'); q.className='qt'; q.textContent=txt; $('#quotes').appendChild(q);
  const cw=cab.offsetWidth, g=(innerWidth-cw)/2-14; qSide^=1; const w=Math.min(250,g-10); q.style.maxWidth=w+'px';
  q.style.left=(qSide?8:innerWidth-w-8)+'px'; q.style.top=(100+Math.random()*(innerHeight-300))+'px'; setTimeout(()=>q.remove(),9200);
}
setInterval(spawnQuote,5200); setTimeout(spawnQuote,1500);


/* ============================== DEBUG PANEL ============================== */
const MODES=[['jackpot','Jackpot (15 sevens)'],['mega','Mega: 5 sevens'],['big','Big: 5 diamonds'],['medium','Medium: 4 crowns'],['small','Small: 3 bells'],['ldw','Disguised loss'],['nearmiss','Ragebait: random reel'],['tease7','Ragebait: 7 7 \u2192 7 jumps back'],['tease3','Ragebait: 4th reel'],['tease4','Ragebait: 5th reel'],['nearmiss_gem','Near miss: gems'],['freespins','Free spins (3 scatters)'],['wild','Wild expansion'],['nearmiss_scatter','Near miss: scatters'],['freespins5','Free spins (5 scatters)']];
const dM=$('#dModes'); MODES.forEach((m,i)=>{ const b=document.createElement('button'); b.dataset.mode=m[0]; b.innerHTML=`${m[1]}${i<10?`<kbd>${(i+1)%10}</kbd>`:''}`; b.onclick=()=>forceMode(m[0]); dM.appendChild(b); });
const clr=document.createElement('button'); clr.textContent='Back to random'; clr.onclick=()=>{ dbg.force=null; renderDebugForce(); }; dM.appendChild(clr);
const dP=$('#dPresets'); PRESETS.forEach(p=>{ const b=document.createElement('button'); b.dataset.id=p.id; b.innerHTML=`${p.name}<small>${p.note}</small>`; b.onclick=()=>applyPreset(p.id); dP.appendChild(b); });
const dGrid=$('#dGrid'); for(let row=0;row<3;row++) for(let r=0;r<5;r++){ const s=document.createElement('select'); s.dataset.r=r; s.dataset.w=row; SYMS.forEach(x=>{ const o=document.createElement('option'); o.value=x; o.textContent=x==='DIAMOND'?'DIA':x.slice(0,4); s.appendChild(o); }); dGrid.appendChild(s); }
function dbgRefreshIcons(){
  const sig=SYMS.join(',')+'|'+((typeof CFG!=='undefined'&&CFG.icons)||[]).map(c=>c.id).join(','); if(dbgRefreshIcons.sig===sig) return; dbgRefreshIcons.sig=sig;
  $$('#dGrid select').forEach(sel=>{ const cur=sel.value; sel.textContent=''; SYMS.forEach(x=>{ const o=document.createElement('option'); o.value=x; o.textContent=x==='DIAMOND'?'DIA':x.slice(0,4); sel.appendChild(o); }); if(SYMS.includes(cur)) sel.value=cur; });
  $$('#dModes button[data-icon]').forEach(b=>b.remove());
  const dM2=$('#dModes'); const ics=SYMS.filter(x=>!['WILD','SCATTER'].includes(x)&&(CFG.icons||[]).some(c=>c.id===x));
  ics.forEach(id=>{ [['15','All 15 cells'],['5','5 in a row']].forEach(([k,l])=>{ const b=document.createElement('button'); b.dataset.icon=id+k; b.textContent=id+': '+l; b.onclick=()=>{ if(k==='15') dbg.force={grid:Array.from({length:5},()=>Array(3).fill(id))}; else { const g=Array.from({length:5},()=>Array.from({length:3},()=>SYMS[rnd(SYMS.length)])); for(let i=0;i<5;i++) g[i][1]=id; dbg.force={grid:g}; } renderDebugForce(); toast('Next spin: '+id+' '+l.toLowerCase()); }; dM2.appendChild(b); }); });
}
function forceMode(m){ dbg.force={mode:m}; renderDebugForce(); toast('Next spin: '+m.replace('_',' ')); }
function renderDebugForce(){ $$('#dModes button[data-mode]').forEach(b=>b.classList.toggle('act',!!dbg.force&&dbg.force.mode===b.dataset.mode)); $('#dNext').innerHTML=dbg.force?`<span class="chipnext">NEXT: ${dbg.force.mode||'custom grid'}${dbg.sticky?' (sticky)':''}</span>`:''; }
function renderDebug(){
  const net=state.bal-START, cl=v=>v<0?'neg':v>0?'pos':'';
  $('#dBal').textContent=fmt(state.bal); const n=$('#dNet'); n.textContent=fmt(net); n.className=cl(net); $('#dSpins').textContent=S.spins; $('#dWag').textContent=fmt(S.wagered); $('#dPaid').textContent=fmt(S.paid);
  $('#dRtp').textContent=S.wagered?(S.paid/S.wagered*100).toFixed(1)+'%':'—'; $('#dLdw').textContent=S.ldw; $('#dNear').textContent=S.near;
  $('#dLost').textContent=S.spins?S.lost+' ('+Math.round(S.lost/S.spins*100)+'%)':'0'; $('#dBest').textContent=fmt(S.best); $('#dFsC').textContent=S.fsCount; $('#dWh').textContent=S.wheels; $('#dWl').textContent=S.wilds; $('#dLb').textContent=fmt(S.bonus);
  $('#dLog').innerHTML=S.log.slice(0,10).map(l=>`<div class="logrow"><span>#${l.n}</span><span>bet ${fmt(l.bet)}</span><span>pay ${fmt(l.pay)}</span><span class="${cl(l.net)}">${l.net>=0?'+':''}${fmt(l.net)}</span></div><div style="color:#587567;font-size:11px">${l.tag}</div>`).join('');
}
function toggleDebug(){ if(!document.body.classList.contains('dbg')&&olLocked()){ Snd.err(); toast('Debug is disabled in online mode'); return; } document.body.classList.toggle('dbg'); if(document.body.classList.contains('dbg')&&!S.dbgUsed){ S.dbgUsed=1; save(); try{ if(!olAdmin()) olRetire(); }catch(e){} } renderDebug(); renderDebugForce(); toast(document.body.classList.contains('dbg')?'Debug on':'Debug off'); }
$('#dClose').onclick=toggleDebug; $('#dSticky').onchange=e=>{ dbg.sticky=e.target.checked; renderDebugForce(); };
$('#dGridApply').onclick=()=>{ const g=Array.from({length:5},()=>Array(3)); $$('#dGrid select').forEach(s=>{ g[+s.dataset.r][+s.dataset.w]=s.value; }); dbg.force={grid:g}; renderDebugForce(); toast('Custom grid armed'); };
$('#dGridRead').onclick=()=>{ $$('#dGrid select').forEach(s=>{ s.value=state.grid[+s.dataset.r][+s.dataset.w]; }); };
function setBal(v){ state.bal=Math.max(0,Math.round(v)); state.balShown=state.bal; renderHUD(); renderDebug(); save(); }
$('#dBalSet').onclick=()=>setBal(+$('#dBalIn').value||0); $('#dAdd1').onclick=()=>setBal(state.bal+100000); $('#dAdd10').onclick=()=>setBal(state.bal+1000000); $('#dBroke').onclick=()=>setBal(5);
$('#dReset').onclick=()=>{ Object.assign(S,freshS()); state.xp=0; state.level=1; state.meter=0; ACH_DONE.clear(); state.mDay=''; initMissions(); state.sessionStart=START; state.sessionT0=Date.now(); setBal(START); renderMeters(); closeModal(); };
$('#dWheelNow').onclick=()=>{ if(!state.busy) runBonus(()=>wheelBonus(state.bet)); }; $('#dMeter').onclick=()=>{ state.meter=1; renderMeters(); toast('Wheel is ready: tap the wheel icon'); };
$('#dFsNow').onclick=()=>{ if(!state.busy) runBonus(()=>freeSpins(10,state.bet)); }; $('#dFs5').onclick=()=>{ if(!state.busy) runBonus(()=>freeSpins(25,state.bet)); };
$('#dGift').onclick=()=>{ giftAt=Date.now()-1; updateGift(); }; $('#dXp').onclick=()=>{ gainXp(500); flushLevels(); };
$('#dWheelSel').onchange=e=>{ dbg.wheel=e.target.value; };
const bindSl=(id,out,fn,f)=>{ $(id).oninput=e=>{ const v=+e.target.value; $(out).textContent=f?f(v):v; fn(v); }; };
bindSl('#dNear2','#oNear',v=>cfg.nearMiss=v/100); bindSl('#dBoost','#oBoost',v=>cfg.boost=v/100); bindSl('#dShake','#oShake',v=>ui.shake=v/100,v=>(v/100).toFixed(1));
bindSl('#dVol','#oVol',v=>{ ui.sfx=v/100; Snd.setVol(ui.sfx); }); bindSl('#dGamb','#oGamb',v=>cfg.gambleP=v/100);
$('#dDisg').onchange=e=>cfg.disguise=e.target.checked; $('#dAnt').onchange=e=>ui.anticip=e.target.checked; $('#dReveal').onchange=e=>{ ui.reveal=e.target.checked; renderHUD(); };


/* ---------- debug sub-menus ---------- */
(function dbgTabs(){
  const d=$('#debug'), top=d.querySelector('.dtop'); const GROUPS=[['Stats',['Real numbers','Last spins']],['Spin',['Force next spin','Custom grid (reel \u00d7 row)','Luck presets']],['Money',['Bonuses','Bankroll']],['Tuning',['Tuning']],['Blackjack',['Blackjack']],['Icons',['Icons']],['Admin',['Admin control']]];
  const kids=Array.from(d.children).filter(e=>e!==top); const secs=[]; let cur=null;
  kids.forEach(e=>{ if(e.tagName==='H3'){ cur={h:e,els:[]}; secs.push(cur); } else if(cur) cur.els.push(e); });
  const nav=document.createElement('div'); nav.className='dtabs'; top.after(nav); const panes={};
  GROUPS.forEach(([name,titles])=>{ const p=document.createElement('div'); p.className='dpane'; p.dataset.tab=name; panes[name]=p; d.appendChild(p);
    titles.forEach(t=>{ const sec=secs.find(x=>x.h.textContent.replace(/\s+/g,' ').trim()===t); if(!sec) return; p.append(sec.h,...sec.els); });
    const b=document.createElement('button'); b.textContent=name; b.dataset.tab=name; b.onclick=()=>showTab(name); nav.appendChild(b); });
  function showTab(n){ dbg.tab=n; Object.entries(panes).forEach(([k,p])=>p.classList.toggle('on',k===n)); $$('.dtabs button').forEach(b=>b.classList.toggle('act',b.dataset.tab===n)); d.scrollTop=0; try{ if(n==='Admin'&&typeof admDebugUI==='function') admDebugUI(); else if(typeof admFbRoster==='function'&&!document.getElementById('admView')) admFbRoster(false); }catch(e){} }
  window.__dbgTab=showTab; showTab(dbg.tab||'Spin');
})();


/* ---------- phone: no zoom, no page scroll, keyboard-safe overlays ---------- */
(function mobileLock(){
  try{ let m=document.querySelector('meta[name=viewport]'); if(!m){ m=document.createElement('meta'); m.name='viewport'; document.head.appendChild(m); } m.content='width=device-width,initial-scale=1,maximum-scale=1,minimum-scale=1,user-scalable=no,viewport-fit=cover'; }catch(e){}
  ['gesturestart','gesturechange','gestureend'].forEach(t=>document.addEventListener(t,e=>e.preventDefault(),{passive:false}));
  const SCROLLERS='.gmm,.card,#debug,.admlist,.dtabs,.tbl,textarea,select,[data-scroll]';
  document.addEventListener('touchmove',e=>{ if(e.touches.length>1){ e.preventDefault(); return; } const t=e.target; if(!t||!t.closest) return; if(t.closest('input[type=range]')) return; const sc=t.closest(SCROLLERS); if(sc&&(sc.scrollHeight>sc.clientHeight+1||sc.scrollWidth>sc.clientWidth+1)) return; e.preventDefault(); },{passive:false});
  const vv=window.visualViewport, root=document.documentElement;
  function fit(){ const h=vv?vv.height:innerHeight, t=vv?vv.offsetTop:0; root.style.setProperty('--vvh',Math.round(h)+'px'); root.style.setProperty('--vvt',Math.round(t)+'px'); if(window.scrollY||window.scrollX) scrollTo(0,0); }
  if(vv){ vv.addEventListener('resize',fit); vv.addEventListener('scroll',fit); } addEventListener('resize',fit); fit();
  document.addEventListener('focusin',e=>{ const t=e.target; if(!t||!/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||!t.closest('#modal,#debug')) return; [250,600].forEach(d=>setTimeout(()=>{ try{ fit(); if(document.activeElement===t) t.scrollIntoView({block:'center',inline:'nearest'}); }catch(x){} },d)); });
  document.addEventListener('focusout',()=>setTimeout(()=>{ if(!document.activeElement||document.activeElement===document.body){ fit(); scrollTo(0,0); } },300));
  /* less heat: pause the background animation while a menu is open */
  const mo=()=>root.classList.toggle('ui-open',!!(document.querySelector('#modal.open')||document.body.classList.contains('dbg')));
  new MutationObserver(mo).observe(document.body,{attributes:true,attributeFilter:['class'],subtree:true}); mo();
})();

/*@@BJ@@*/
/*@@ONLINE@@*/
/* ============================== INIT ============================== */
setInterval(()=>{ if(state.paused||state.busy||$('#modal').classList.contains('open')||document.hidden) return; const r=reels[vr(5)], el=r.strip.children[1+vr(3)]; if(el&&!el.classList.contains('pop')&&!el.classList.contains('scat')){ el.classList.remove('wink'); void el.getBoundingClientRect(); el.classList.add('wink'); setTimeout(()=>el.classList.remove('wink'),1000); } },2600);
applyGfx(); applyPreset(cfgPreset,true); initMissions(); lobbyStats(); renderDaily(); layout(); showStatic(); $('#reels').classList.add('idle'); renderHUD(); renderMeters(); renderJP(); renderDebug(); renderDebugForce(); setSpinUI();

})();
