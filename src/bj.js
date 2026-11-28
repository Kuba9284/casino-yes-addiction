/* ============================== LOBBY / GAME SWITCH ============================== */
const yesterday=()=>new Date(Date.now()-864e5).toISOString().slice(0,10);
function lobbyStats(){
  $('#gSlotsStat').textContent=S.spins.toLocaleString('en-US')+' spins played';
  $('#gBjStat').textContent=S.bjHands.toLocaleString('en-US')+' hands played';
  $('#gRlStat').textContent=(S.rlSpins||0).toLocaleString('en-US')+' spins played'; $('#gCrStat').textContent=(S.crRaces||0).toLocaleString('en-US')+' races run';
  $('#lobBal').textContent=fmt(state.bal);
}
function renderDaily(){
  const el=$('#daily'), t=today();
  if(state.lastDaily===t){ el.innerHTML=`<span class="dstreak">Day streak <b>${state.dayStreak}</b> · come back tomorrow for a bigger bonus</span>`; return; }
  const next=state.lastDaily===yesterday()?state.dayStreak+1:1, amt=Math.min(300000,25000+next*25000);
  el.innerHTML=`<button class="chip gold" id="dailyBtn">Claim daily bonus ${fmt(amt)} · day ${next}</button>`;
  $('#dailyBtn').onclick=()=>{ wake(); state.lastDaily=t; state.dayStreak=next; state.bal+=amt; S.bonus+=amt; state.balShown=state.bal; Snd.chest();
    burst(30,innerWidth/2,innerHeight/2,10,'coin'); renderHUD(); save(); renderDaily(); lobbyStats(); };
}
function enterGame(g){
  wake(); Snd.click(); if(!window.__olGate(()=>enterGame(g))) return; game=g; $('#welcome').className='gone';
  $('#stage').hidden=g!=='slots'; $('#bj').hidden=g!=='bj'; $('#rl').hidden=true; $('#cr').hidden=true;
  const host=g==='bj'?$('#bjfx'):$('#frame'); ['banner','flash','ring','rays'].forEach(id=>host.appendChild($('#'+id)));
  document.body.dataset.game=g; if(g==='bj'&&!bjHelloed){ bjHelloed=true; setTimeout(()=>bjSay('hello',1),900); }
  if(g==='slots'){ layout(); showStatic(); } else { bjRender(); }
  renderHUD(); renderDebug(); renderBjDebug(); save();
}
function openLobby(){
  if(state.busy||state.fs||bj.busy||gmBusy()){ toast('Finish the round first'); Snd.err(); return; }
  if(state.auto) stopAuto();
  lobbyStats(); renderDaily(); $('#welcome').className='';
}

/* ============================== BLACKJACK ============================== */
/* ---------- dealer small talk (never mentions the hole card or what is coming) ---------- */
const BJ_TALK={
 hello:['Welcome to the table. I\u2019m Vince. Don\u2019t mind the trombone.','Evening! Sit down, the felt is warm.','New face! I like new faces. They tip.'],
 idle:['Slow night. The shoe and I were just chatting.','Do you hear that trombone? It\u2019s been playing the same song since 1987.','Nice shirt. Wait, I can\u2019t see your shirt. Nice vibes.','Fun fact: cards have no feelings. I checked.','I once dealt twenty hands without blinking. Then I blinked.','Coffee here is free and it tastes exactly like that.','Take your time. The cards aren\u2019t going anywhere.','Ever notice how every dealer is called Vince?','Still thinking? Even the jazz is waiting.','My cat asked me to say hi. She\u2019s unimpressed by blackjack.'],
 start:['Good luck. Or whatever you call it.','Here we go.','Chips in, worries out.','Let\u2019s see what the shoe feels like.','Ooh, bold.'],
 double:['Doubling down! I respect the nerve.','Big move. The kind they write songs about.','Brave, brave person.'],
 split:['Splitting! Two hands for the price of one personality.','Now we\u2019re cooking.','Twice the cards, twice the fun.'],
 bust:['Ouch. That one stings.','Over the line. Happens to the best of us.','Twenty-two is a cruel number.'],
 bj:['Blackjack! Okay, now I\u2019m a little jealous.','Look at you! Natural talent.','Three to two, just the way I like to pay it. Never.'],
 win:['Nicely played.','You\u2019re making this look easy.','The table likes you.','Alright, alright. Take a bow.','I\u2019ll allow it.'],
 streak:['You\u2019re on a roll. I\u2019m not saying anything. I\u2019m just saying.','Hot streak! Somebody check the shoe.','Is this your first time? Because it\u2019s going great.'],
 push:['A push. The universe shrugs.','Tie. Nobody wins, nobody cries.','Even steven.'],
 lose:['House takes that one. Sorry, friend.','Next one\u2019s yours, I can feel it.','That\u2019s blackjack. It giveth and it taketh.','Shake it off.','Don\u2019t worry, the shoe is long.']
};
let bjSayT=0, bjHelloed=false, bjLastSay=0;
function bjSay(ctx,p){
  if(game!=='bj'||Math.random()>=p||Date.now()-bjLastSay<2500) return; const a=BJ_TALK[ctx]; if(!a) return;
  const el=$('#bjsay'); if(!el) return; bjLastSay=Date.now(); const line=a[vr(a.length)];
  el.querySelector('span').textContent=line; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(bjSayT); bjSayT=setTimeout(()=>el.classList.remove('show'),Math.min(6500,2600+line.length*55));
}
setInterval(()=>{ if(game==='bj'&&bj.phase==='bet'&&!bj.busy&&!document.hidden&&!$('#modal').classList.contains('open')) bjSay('idle',.5); },19000);

const SUITS=['♠','♥','♦','♣'], RANKS=['A','2','3','4','5','6','7','8','9','10','J','Q','K'], VS='︎';
const bj={shoe:[],run:0,rig:[],phase:'bet',busy:false,bet:0,last:0,hands:[],dealer:[],cur:0,streak:0,luck:'fair',disg:.7,peek:false,force:null,sticky:false,wager:0,ins:0};
const BJ_CHIPS=[[1000,'#2f6fd0'],[5000,'#d9263f'],[10000,'#25272b'],[50000,'#7a35d6'],[100000,'#e0ad40'],[250000,'#12985f']];
const BJ_LUCK={fair:{p:0,k:[]},hot:{p:.22,k:['win','bj','dbust','double']},fire:{p:.5,k:['win','bj','dbust','double','win','dbust']},cold:{p:.25,k:['dbj','pbust']}};
const RIGS={
  bj:[['A','♠'],['6','♦'],['K','♥'],['10','♣']],
  win:[['10','♠'],['10','♦'],['9','♥'],['7','♣']],
  dbust:[['10','♠'],['6','♦'],['8','♥'],['10','♣'],['10','♠']],
  double:[['5','♠'],['6','♦'],['6','♥'],['10','♣'],['K','♠'],['10','♦']],
  split:[['8','♠'],['6','♦'],['8','♥'],['10','♣'],['3','♠'],['10','♦'],['K','♥'],['10','♣'],['10','♠']],
  push:[['10','♠'],['10','♦'],['9','♥'],['9','♣']],
  dbj:[['10','♠'],['A','♦'],['8','♥'],['K','♣']],
  pbust:[['10','♠'],['7','♦'],['6','♥'],['10','♣'],['K','♠']]};
const BJ_FORCES=[['bj','Player blackjack'],['win','Player 19 vs 17'],['dbust','Dealer busts'],['double','Double on 11 wins'],['split','Pair of 8s'],['push','Push 19-19'],['dbj','Dealer blackjack'],['pbust','Player busts']];
const bjcv=c=>c.r==='A'?11:(c.r==='10'||'JQK'.includes(c.r))?10:+c.r;
function bjev(cards){ let t=0,a=0; for(const c of cards){ t+=bjcv(c); if(c.r==='A') a++; } while(t>21&&a>0){ t-=10; a--; } return {t,soft:a>0}; }
const bjIsBJ=h=>h.cards.length===2&&!h.split&&bjev(h.cards).t===21;
function bjShuffle(){
  const a=[]; for(let d=0;d<6;d++) for(const s of SUITS) for(const r of RANKS) a.push({r,s});
  for(let i=a.length-1;i>0;i--){ const j=vr(i+1); [a[i],a[j]]=[a[j],a[i]]; } bj.shoe=a; bj.run=0;
}
function bjDraw(){
  if(bj.rig.length) return bj.rig.shift();
  if(bj.shoe.length<52){ bjShuffle(); toast('Shoe shuffled'); }
  const c=bj.shoe.pop(); bj.run+=('23456'.includes(c.r)?1:(c.r==='10'||'JQKA'.includes(c.r))?-1:0); return c;
}
bjShuffle();
function bjMkCard(c,down){
  const red=c.s===SUITS[1]||c.s===SUITS[2], el=document.createElement('div'); el.className='bc'+(down?' down':'');
  el.innerHTML=`<div class="bci"><div class="bf${red?' red':''}"><b>${c.r}</b><i>${c.s}${VS}</i><u>${c.s}${VS}</u></div><div class="bb"><span>99</span></div></div>`; return el;
}
function bjMkHand(h,after){
  const box=document.createElement('div'); box.className='hbox'; box.innerHTML='<div class="hand"></div><div class="tot"></div><div class="hbet"></div><div class="res"></div>'; h.box=box;
  const p=$('#bjp'); if(after&&after.box.nextSibling) p.insertBefore(box,after.box.nextSibling); else p.appendChild(box);
  p.classList.toggle('many',bj.hands.length>2);
}
const bjMsg=t=>{ $('#bjmsg').textContent=t||''; };
function bjClear(){ $('#bjd').innerHTML=''; $('#bjp').innerHTML=''; $('#bjp').classList.remove('many'); $('#bjdt').textContent=''; bj.hands=[]; bj.dealer=[]; bjMsg(''); }
function bjUpdateTotals(){
  const dc=bj.dealer; let t='';
  if(dc.length){ const hid=dc.length>1&&dc[1].el&&dc[1].el.classList.contains('down'); t=hid?String(bjcv(dc[0])):String(bjev(dc).t);
    if(hid&&bj.peek) t+='  (hole '+dc[1].r+dc[1].s+VS+')'; if(!hid&&bjev(dc).t>21) t='BUST'; }
  $('#bjdt').textContent=t;
  bj.hands.forEach((h,i)=>{ if(!h.box) return; const e=bjev(h.cards), tt=h.box.querySelector('.tot');
    tt.textContent=!h.cards.length?'':e.t>21?'BUST':bjIsBJ(h)?'BLACKJACK':(e.soft&&e.t<21?'Soft '+e.t:String(e.t)); tt.classList.toggle('bust',e.t>21);
    h.box.querySelector('.hbet').textContent=fmt(h.bet); h.box.classList.toggle('act',bj.phase==='play'&&i===bj.cur&&!h.done); });
}
async function bjDealTo(target,down){
  const c=bjDraw(), el=bjMkCard(c,down), isD=target===bj; c.el=el; (isD?bj.dealer:target.cards).push(c);
  (isD?$('#bjd'):target.box.querySelector('.hand')).appendChild(el);
  const sh=$('#bjshoe').getBoundingClientRect(), r=el.getBoundingClientRect();
  try{ el.animate([{transform:`translate(${sh.left-r.left}px,${sh.top-r.top}px) rotate(-20deg) scale(.6)`,opacity:.1},{transform:'translate(0,0) rotate(0) scale(1)',opacity:1}],{duration:LITE?240:380,easing:'cubic-bezier(.2,.9,.25,1.08)'}); }catch(e){}
  Snd.card(); bjUpdateTotals(); await sleep(LITE?190:290); return c;
}
function bjAsk(text,opts){
  return new Promise(res=>{ const a=$('#bjAsk'); a.hidden=false; a.innerHTML=`<span>${text}</span>`+opts.map((o,i)=>`<button class="chip${i===0?' gold':''}" data-i="${i}">${o[0]}</button>`).join('');
    $$('button',a).forEach(b=>b.onclick=()=>{ a.hidden=true; Snd.click(); res(opts[+b.dataset.i][1]); }); });
}
const bjCanDouble=h=>h&&!h.done&&h.cards.length===2&&!h.aces&&state.bal>=h.bet;
const bjCanSur=h=>h&&!h.done&&h.cards.length===2&&!h.split&&bj.hands.length===1;
const bjCanSplit=h=>h&&!h.done&&h.cards.length===2&&!h.aces&&bjcv(h.cards[0])===bjcv(h.cards[1])&&bj.hands.length<4&&state.bal>=h.bet;
function bjSnap(){ const f=c=>c.r+c.s; return {ph:bj.phase,bet:bj.bet,f:bj.force||'',st:bj.sticky?1:0,lk:bj.luck,k:bj.streak,d:bj.dealer.map(f).join(' '),h:bj.hands.map(x=>x.cards.map(f).join(' ')+' ($'+x.bet+(x.dbl?' x2':'')+')').slice(0,4)}; }
function bjRender(){
  const betting=bj.phase==='bet'&&!bj.busy, play=bj.phase==='play'&&!bj.busy, h=bj.hands[bj.cur];
  $('#bjBet').textContent=fmt(bj.phase==='bet'?bj.bet:bj.hands.reduce((a,x)=>a+x.bet,0)+bj.ins); $('#bjBal').textContent=fmt(state.balShown);
  $('#bjChips').classList.toggle('off',!betting); $$('#bjChips button').forEach(b=>b.disabled=!betting);
  $('#bjBetRow').hidden=bj.phase!=='bet'; $('#bjPlayRow').hidden=bj.phase==='bet';
  $('#bjDeal').disabled=!betting||bj.bet<=0; $('#bjClear').disabled=!betting||bj.bet<=0; $('#bjRebet').disabled=!betting||!bj.last; $('#bjX2').disabled=!betting||bj.bet<=0;
  $('#bjHit').disabled=!play; $('#bjStand').disabled=!play; $('#bjDouble').disabled=!play||!bjCanDouble(h); $('#bjSplit').disabled=!play||!bjCanSplit(h); $('#bjSur').disabled=!play||!bjCanSur(h);
  const pct=Math.min(50,bj.streak*10); $('#bjStreak').classList.toggle('on',bj.streak>0); $('#bjStreak b').textContent=bj.streak; $('#bjStreak').title='Win streak '+bj.streak+(bj.streak>0?' (+'+pct+'% bonus)':'');
  bjUpdateTotals(); renderBjDebug(); try{ livePush(); }catch(e){}
}
async function bjDeal(){ try{ gmWinClear(); }catch(e){}
  if(bj.busy||bj.phase!=='bet') return;
  if(bj.bet<=0){ Snd.err(); toast('Place a bet first'); return; }
  if(bj.bet>state.bal){ Snd.err(); toast('Not enough balance'); return; }
  if(state.breakUntil>Date.now()){ toast('Break active: '+Math.ceil((state.breakUntil-Date.now())/1000)+'s left'); Snd.err(); return; }
  if(ui.lossLimit>0&&state.sessionStart-state.bal>=ui.lossLimit){ Snd.err(); openResponsible(true); return; }
  wake(); bj.busy=true; bjClear(); const bet=bj.bet; bj.last=bet; state.bal-=bet; S.wagered+=bet; S.bjHands++; bj.ins=0;
  gainXp(Math.round(6+bet/25)); tweenBal(state.bal,220); Snd.chip(); bjSay('start',.2);
  let kind=null; if(bj.force){ kind=bj.force; if(!bj.sticky) bj.force=null; } else { const L=BJ_LUCK[bj.luck]; if(L.p&&Math.random()<L.p) kind=L.k[vr(L.k.length)]; }
  if(kind) bj.rig=RIGS[kind].map(([r,s])=>({r,s}));
  const h={cards:[],bet,done:false,dbl:false,split:false}; bj.hands=[h]; bjMkHand(h); bj.cur=0; bj.phase='deal'; bjRender();
  await bjDealTo(h); await bjDealTo(bj); await bjDealTo(h); await bjDealTo(bj,true);
  const up=bj.dealer[0];
  if(up.r==='A'){ const ins=Math.floor(bet/2);
    if(state.bal>=ins&&ins>0){ const a=await bjAsk('Dealer shows an Ace. Take insurance?',[['Insurance '+fmt(ins),1],['No thanks',0]]);
      if(a){ state.bal-=ins; S.wagered+=ins; bj.ins=ins; tweenBal(state.bal,200); Snd.chip(); } } }
  if(bjcv(up)===10||up.r==='A'){ bjMsg('Dealer peeks…'); await sleep(750); bjMsg(''); if(bjev(bj.dealer).t===21){ await bjFinish(); return; } }
  if(bjIsBJ(h)){ await bjFinish(); return; }
  bj.phase='play'; bj.busy=false; bjRender();
}
async function bjAct(k){
  if(bj.busy||bj.phase!=='play') return; const h=bj.hands[bj.cur]; if(!h||h.done) return;
  if(k==='hit'){
    bj.busy=true; bjRender(); await bjDealTo(h); const t=bjev(h.cards).t; if(t>=21){ h.done=true; if(t>21){ Snd.bust(); bjSay('bust',.5); } } bj.busy=false; await bjNext();
  } else if(k==='stand'){ h.done=true; Snd.click(); await bjNext();
  } else if(k==='double'){
    if(!bjCanDouble(h)) return; bj.busy=true; state.bal-=h.bet; S.wagered+=h.bet; h.bet*=2; h.dbl=true; tweenBal(state.bal,200); Snd.chip(); bjRender(); bjSay('double',.6);
    await bjDealTo(h); h.done=true; if(bjev(h.cards).t>21) Snd.bust(); bj.busy=false; await bjNext();
  } else if(k==='surrender'){
    if(!bjCanSur(h)) return; h.done=true; h.sur=true; Snd.click(); bjSay('lose',.3); await bjNext();
  } else if(k==='split'){
    if(!bjCanSplit(h)) return; bj.busy=true; state.bal-=h.bet; S.wagered+=h.bet; S.bjSplits++; tweenBal(state.bal,200); Snd.chip(); bjSay('split',.6);
    const c2=h.cards.pop(); h.split=true; h.aces=c2.r==='A'; const h2={cards:[c2],bet:h.bet,done:false,dbl:false,split:true,aces:c2.r==='A'};
    bj.hands.splice(bj.cur+1,0,h2); bjMkHand(h2,h); h2.box.querySelector('.hand').appendChild(c2.el); bjRender();
    await sleep(260); await bjDealTo(h); if(h.aces||bjev(h.cards).t===21) h.done=true; bj.busy=false; await bjNext();
  }
}
async function bjNext(){
  bjUpdateTotals();
  for(;;){
    const i=bj.hands.findIndex(x=>!x.done); if(i<0) break; bj.cur=i; const h=bj.hands[i];
    if(h.cards.length===1){ bj.busy=true; bjRender(); await bjDealTo(h); bj.busy=false; if(h.aces||bjev(h.cards).t===21){ h.done=true; continue; } }
    bjRender(); return;
  }
  await bjDealer();
}
async function bjDealer(){
  bj.phase='dealer'; bj.busy=true; bjRender();
  const live=bj.hands.some(h=>bjev(h.cards).t<=21&&!bjIsBJ(h)&&!h.sur);
  const hole=bj.dealer[1]; if(hole.el.classList.contains('down')){ hole.el.classList.remove('down'); Snd.flip(); await sleep(560); bjUpdateTotals(); }
  if(live){ while(bjev(bj.dealer).t<17){ await sleep(180); await bjDealTo(bj); } }
  await bjFinish();
}
async function bjFinish(){
  bj.phase='settle'; bj.busy=true; const hole=bj.dealer[1];
  if(hole&&hole.el.classList.contains('down')){ hole.el.classList.remove('down'); Snd.flip(); await sleep(560); } bjUpdateTotals();
  const dt=bjev(bj.dealer).t, dBJ=bj.dealer.length===2&&dt===21;
  const wagered=bj.hands.reduce((a,h)=>a+h.bet,0)+bj.ins; let ret=0, wins=0, bjw=false, dbl=false;
  bj.hands.forEach(h=>{ const pt=bjev(h.cards).t; let res='lose', r=0;
    if(h.sur){ res='sur'; r=Math.floor(h.bet/2); } else if(pt>21) res='lose'; else if(bjIsBJ(h)&&!dBJ){ res='bj'; r=h.bet*2.5; bjw=true; }
    else if(dBJ){ if(bjIsBJ(h)){ res='push'; r=h.bet; } }
    else if(dt>21||pt>dt){ res='win'; r=h.bet*2; } else if(pt===dt){ res='push'; r=h.bet; }
    h.res=res; h.ret=r; ret+=r; if(res==='win'||res==='bj'){ wins++; if(h.dbl) dbl=true; } if(res==='push') S.bjPush++; });
  if(bj.ins&&dBJ) ret+=bj.ins*3;
  let net=ret-wagered, bonus=0, cons=0;
  if(net>0&&bj.streak>0){ bonus=Math.round(net*Math.min(.5,bj.streak*.1)); ret+=bonus; net+=bonus; }
  if(net<0&&Math.random()<bj.disg){ cons=Math.max(1,Math.round(wagered*(.08+Math.random()*.32))); cons=Math.min(cons,Math.floor(-net)-1); if(cons>=1){ ret+=cons; net+=cons; S.ldw++; } else cons=0; }
  const real=ret-wagered, realNet=real;
  bj.hands.forEach(h=>{ const rs=h.box.querySelector('.res'), pt=bjev(h.cards).t;
    const txt=h.res==='sur'?'SURRENDER':h.res==='bj'?'BLACKJACK':h.res==='win'?'WIN':h.res==='push'?'PUSH':pt>21?'BUST':(dt<=21&&dt-pt<=2?'SO CLOSE':'—');
    rs.textContent=txt; rs.className='res '+(h.res==='lose'?'lose':h.res==='push'?'push':'win'); });
  if(net>0&&(bjw||ret>=wagered*2.5)) olFeed('bj',ret,wagered);
  { const before=state.bal; try{ gmWinClear(); const tb=$('#bjtable'); tb.classList.remove('winglow'); void tb.offsetWidth; if(net>0){ tb.classList.add('winglow'); const c=frameCenter(); burst(Math.min(70,12+Math.round(ret/wagered*10)),c.x,c.y,9,ret>=wagered*2?'coin':'spark'); } }catch(e){} }
  state.bal+=ret; S.paid+=ret; if(ret>S.best) S.best=ret; S.bjWins+=wins; if(bjw) S.bjBJ++; if(dbl) S.bjDoubles++;
  if(realNet>0){ bj.streak++; S.bjBest=Math.max(S.bjBest,bj.streak); } else if(realNet<0) bj.streak=0;
  S.log.unshift({n:'BJ'+S.bjHands,bet:wagered,pay:ret,net:real,tag:'blackjack'+(cons?' ldw':'')}); S.log.length=Math.min(S.log.length,50);
  bj.phase='bet'; bjRender(); renderDebug(); renderMeters(); initMissions(); save();
  bjSay(realNet>0?(bjw?'bj':bj.streak>=3?'streak':'win'):real===0?'push':'lose',bjw?.9:realNet>0?(bj.streak>=3?.7:.4):real===0?.5:.35);
  if(realNet>0){
    const r=ret/wagered, tier=bjw?(bj.streak>=3?'super':'big'):(r>=2&&(dbl||wins>=2||bonus>0))?'big':'nice';
    await bjPresent(tier,bjw?'BLACKJACK!':TIERS[tier][0],ret,bonus?'Streak bonus +'+fmt(bonus):(dbl?'Double down':wins>=2?'Split win':'Dealer loses'));
  } else if(cons>0){ await bjPresent('win','WIN!',ret,['Cashback bonus','Loyalty bonus','Lucky cashback','Insurance bonus'][vr(4)]); }
  else if(real===0){ Snd.click(); bjMsg('Push — bet returned'); tweenBal(state.bal,400); await sleep(900); }
  else { tweenBal(state.bal,300); bjMsg(dt>21?'':'Dealer wins'); await sleep(700); }
  bjMsg(''); bj.busy=false; if(bj.last>state.bal) bj.bet=Math.max(0,Math.min(bj.last,[...BETS,50000].reverse().find(b=>b<=state.bal)||0)); else bj.bet=bj.last;
  checkAch(); flushLevels(); maybeReality(); bjRender();
  if(state.bal<BETS[0]&&bj.phase==='bet') showBroke();
}
async function bjPresent(tier,title,pay,sub){
  const T=TIERS[tier], lvl=T[1], ban=$('#banner'), tok=++state.presId;
  $('#banner .tier').textContent=title; $('#banner .amt').textContent=fmt(0); $('#banner .bsub').textContent=sub||'';
  ban.className='show t-'+tier; void ban.offsetWidth; flash(); shake(lvl); Snd.win(tier); jelly($('#bjtable'),'jig');
  const c=frameCenter(); burst(Math.round(8+lvl*14),c.x,c.y,6+lvl*3,'spark');
  if(lvl>=.65) burst(Math.round(10+lvl*18),c.x,c.y,9+lvl*3,'coin'); if(lvl>=1){ coinRain(900+lvl*900); ring(); scrFlash('#fff3b8',.2+lvl*.08); } if(lvl>=1.4) burst(36,c.x,c.y,12,'conf');
  const from=state.balShown, target=state.bal, dur=({win:700,nice:1100,big:1800,super:2600})[tier]||1100; let lt=0;
  await tween(dur,k=>{ $('#banner .amt').textContent=fmt(Math.floor(pay*easeOut3(k)*100)/100); state.balShown=from+(target-from)*easeOut3(k); renderHUD(); const n=performance.now(); if(n-lt>70){ lt=n; Snd.tick(k); } },tok);
  state.balShown=state.bal; renderHUD(); $('#banner .amt').textContent=fmt(pay);
  await sleep(tier==='win'?650:1000); ban.classList.add('out'); await sleep(450); ban.className='';
}
function bjKey(e){
  if($('#modal').classList.contains('open')) return;
  if(e.code==='Space'||e.code==='Enter'){ e.preventDefault(); if(bj.phase==='bet') bjDeal(); return; }
  const k=e.key.toLowerCase(); if(k==='h') bjAct('hit'); else if(k==='s') bjAct('stand'); else if(k==='d') bjAct('double'); else if(k==='p') bjAct('split'); else if(k==='r') $('#bjRebet').click();
}
function openBjRules(){ openModal({title:'Blackjack rules',html:`<table class="tbl">${[['Goal','Beat the dealer without going over 21'],['Cards','2–10 face value, J Q K = 10, Ace = 1 or 11'],['Blackjack','Ace + ten-card on the deal pays 3 to 2'],['Dealer','Stands on all 17s, draws on 16 or less'],['Double','Double your bet on your first two cards, take one card'],['Split','Pair? Split into two hands (up to 4). One card on split aces'],['Insurance','Dealer shows an Ace: side bet of half your bet pays 2 to 1'],['Streak','Win hands in a row for +10% on each next win (max +50%)'],['Cashback','Some losing hands pay a small loyalty cashback. The balance shown is always real']].map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>`}); }

/* blackjack controls */
const bjChipsEl=$('#bjChips');
BJ_CHIPS.forEach(([v,col])=>{ const b=document.createElement('button'); b.className='pchip'; b.style.setProperty('--c',col); b.setAttribute('aria-label','Add '+fmt(v)); b.textContent=v>=1000000?(v/1000000)+'M':v>=1000?(v/1000)+'K':v;
  b.onclick=()=>{ wake(); if(bj.phase!=='bet'||bj.busy) return; const nb=Math.min(state.bal,bj.bet+v); if(nb===bj.bet){ Snd.err(); toast('Not enough balance'); return; } bj.bet=nb; Snd.chip(); bjRender(); }; bjChipsEl.appendChild(b); });
$('#bjDeal').onclick=bjDeal; $('#bjClear').onclick=()=>{ bj.bet=0; Snd.click(); bjRender(); };
$('#bjRebet').onclick=()=>{ wake(); if(bj.busy||bj.phase!=='bet') return; bj.bet=Math.min(bj.last||5000,state.bal); Snd.chip(); bjRender(); };
$('#bjX2').onclick=()=>{ wake(); if(bj.busy||bj.phase!=='bet') return; bj.bet=Math.min(state.bal,bj.bet*2); Snd.chip(); bjRender(); };
$('#bjHit').onclick=()=>bjAct('hit'); $('#bjStand').onclick=()=>bjAct('stand'); $('#bjDouble').onclick=()=>bjAct('double'); $('#bjSplit').onclick=()=>bjAct('split'); $('#bjSur').onclick=()=>bjAct('surrender');
$('#bjLobby').onclick=()=>{ wake(); Snd.click(); openLobby(); }; $('#btnLobby').onclick=()=>{ wake(); Snd.click(); openLobby(); };
{ let n=0,t=0; $('#bjLogo').onclick=()=>{ wake(); n++; clearTimeout(t); t=setTimeout(()=>n=0,900); if(n>=5){ n=0; toggleDebug(); } }; }
$('#bjMenu').onclick=()=>{ wake(); Snd.click(); openMenu(); };
$('#bjSound').onclick=()=>$('#btnSound').click(); $('#bjMusic').onclick=()=>$('#btnMusic').click();
$('#gSlots').onclick=()=>enterGame('slots'); $('#gBj').onclick=()=>enterGame('bj');

/* blackjack debug */
const dBjEl=$('#dBj');
BJ_FORCES.forEach(([k,l])=>{ const b=document.createElement('button'); b.dataset.k=k; b.textContent=l; b.onclick=()=>{ bj.force=k; renderBjDebug(); toast('Next hand: '+l); }; dBjEl.appendChild(b); });
{ const b=document.createElement('button'); b.textContent='Back to random'; b.onclick=()=>{ bj.force=null; renderBjDebug(); }; dBjEl.appendChild(b); }
function renderBjDebug(){
  $$('#dBj button[data-k]').forEach(b=>b.classList.toggle('act',bj.force===b.dataset.k));
  $('#dBjLeft').textContent=bj.shoe.length+' / 312'; $('#dBjRun').textContent=(bj.run>0?'+':'')+bj.run; $('#dBjNext').textContent=bj.force?'NEXT: '+bj.force+(bj.sticky?' (sticky)':''):'';
}
$('#dBjLuck').onchange=e=>{ bj.luck=e.target.value; toast('Table: '+e.target.options[e.target.selectedIndex].text); };
$('#dBjDisg').oninput=e=>{ bj.disg=+e.target.value/100; $('#oBjDisg').textContent=e.target.value; };
$('#dBjSticky').onchange=e=>{ bj.sticky=e.target.checked; renderBjDebug(); };
$('#dBjPeek').onchange=e=>{ bj.peek=e.target.checked; bjUpdateTotals(); };
$('#dBjShuffle').onclick=()=>{ bjShuffle(); renderBjDebug(); toast('Shoe shuffled'); };
$('#dBjStreak').onclick=()=>{ bj.streak++; bjRender(); };
