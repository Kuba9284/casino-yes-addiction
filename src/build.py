import re, os, urllib.parse
ROOT=os.path.dirname(os.path.abspath(__file__))
P=lambda n: os.path.join(ROOT,n)
s=open(P('gilded-sevens.html')).read()
head=s[:s.index('<script>')]
def rep(a,b,count=1):
    global head
    assert a in head, a[:60]
    head=head.replace(a,b,count)

rep('<title>Gilded Sevens</title>','<title>99Gamblers1Claude</title>')
fav="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='#0c2a1f'/><rect x='3' y='3' width='58' height='58' rx='11' fill='none' stroke='#e2bb62' stroke-width='3'/><text x='32' y='43' text-anchor='middle' font-family='Georgia,serif' font-weight='900' font-style='italic' font-size='31' fill='#f0c04e'>99</text><circle cx='51' cy='13' r='6' fill='#d9263f'/></svg>"
rep('<meta name="claude:viewport-fit-sides" content="cover">','<meta name="claude:viewport-fit-sides" content="cover">\n<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,'+urllib.parse.quote(fav)+'">')
rep('<div class="logo" id="logo"><b>Gilded Sevens</b><small>Deluxe Reels &middot; 10 Lines</small></div>','<div class="logo" id="logo"><b>99G1C</b><small>99Gamblers1Claude</small></div>')

newsyms='''
  <linearGradient id="gPurple" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2b8ff"/><stop offset=".5" stop-color="#7a35d6"/><stop offset="1" stop-color="#2a0a66"/></linearGradient>
  <radialGradient id="gPlum" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#e0a8ff"/><stop offset=".5" stop-color="#7a2fc0"/><stop offset="1" stop-color="#2c0b55"/></radialGradient>
  <symbol id="s-WILD" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="44" fill="url(#gGold)" stroke="#6b4508" stroke-width="3"/>
    <circle cx="50" cy="50" r="36" fill="none" stroke="#fff3bd" stroke-opacity=".7" stroke-width="2"/>
    <path d="M50 14L58.2 38.7L84 39.5L63.3 54.3L70 79L50 64.5L30 79L36.7 54.3L16 39.5L41.8 38.7Z" fill="url(#gRed)" stroke="#5a0010" stroke-width="2" stroke-linejoin="round"/>
    <text x="50" y="58" text-anchor="middle" font-family="'Barlow Condensed','Arial Narrow',sans-serif" font-weight="800" font-size="19" letter-spacing="1" fill="#fff" stroke="#3a0008" stroke-width="2.4" paint-order="stroke">WILD</text>
  </symbol>
  <symbol id="s-SCATTER" viewBox="0 0 100 100">
    <rect x="20" y="20" width="60" height="60" rx="6" fill="url(#gGold)" stroke="#6b4508" stroke-width="2.5"/>
    <rect x="20" y="20" width="60" height="60" rx="6" fill="url(#gGold)" stroke="#6b4508" stroke-width="2.5" transform="rotate(45 50 50)"/>
    <circle cx="50" cy="50" r="25" fill="url(#gPurple)" stroke="#fff3bd" stroke-width="3"/>
    <path d="M50 30l4.5 10 11 1-8.3 7.2 2.6 10.8L50 53l-9.8 6 2.6-10.8L34.5 41l11-1z" fill="url(#gGold)" stroke="#6b4508" stroke-width="1.2" stroke-linejoin="round"/>
    <text x="50" y="72" text-anchor="middle" font-family="'Barlow Condensed','Arial Narrow',sans-serif" font-weight="800" font-size="12" letter-spacing="1.5" fill="#fff">BONUS</text>
  </symbol>
  <symbol id="s-CLOVER" viewBox="0 0 100 100">
    <path d="M50 50C52 70 50 84 40 94" stroke="#1f6a35" stroke-width="4" fill="none" stroke-linecap="round"/>
    <g fill="url(#gGreen)" stroke="#14602a" stroke-width="2.2" stroke-linejoin="round">
      <path d="M50 50C30 40 32 8 50 22C68 8 70 40 50 50Z"/>
      <path d="M50 50C30 40 32 8 50 22C68 8 70 40 50 50Z" transform="rotate(90 50 50)"/>
      <path d="M50 50C30 40 32 8 50 22C68 8 70 40 50 50Z" transform="rotate(180 50 50)"/>
      <path d="M50 50C30 40 32 8 50 22C68 8 70 40 50 50Z" transform="rotate(270 50 50)"/>
    </g>
    <circle cx="50" cy="50" r="7" fill="url(#gGold)" stroke="#6b4508" stroke-width="2"/>
    <path d="M44 30C41 36 41 40 44 43" stroke="#fff" stroke-opacity=".5" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </symbol>
  <symbol id="s-PLUM" viewBox="0 0 100 100">
    <path d="M50 26C50 17 54 11 61 8" stroke="#5b3a14" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M56 17C64 6 78 8 84 16C74 25 62 25 56 17Z" fill="url(#gGreen)" stroke="#14602a" stroke-width="2"/>
    <circle cx="50" cy="58" r="33" fill="url(#gPlum)" stroke="#2a0a40" stroke-width="2.5"/>
    <path d="M50 28C46 44 46 70 50 90" stroke="#2a0a40" stroke-opacity=".35" stroke-width="2" fill="none"/>
    <ellipse cx="36" cy="44" rx="8" ry="5" fill="#fff" fill-opacity=".6" transform="rotate(-35 36 44)"/>
  </symbol>
'''
rep('<div class="jp minor"><i>MINI</i><span id="jpMini">$0</span></div>\n      <div class="jp"><i>MAJOR</i><span id="jpMajor">$0</span></div>\n      <div class="jp grand"><i>GRAND</i><span id="jpGrand">$0</span></div>','<div class="jp minor"><i>MINI</i><span id="jpMini">$0</span></div>\n      <div class="jp minor"><i>MINOR</i><span id="jpMinor">$0</span></div>\n      <div class="jp"><i>MAJOR</i><span id="jpMajor">$0</span></div>\n      <div class="jp mega"><i>MEGA</i><span id="jpMega">$0</span></div>\n      <div class="jp grand"><i>GRAND</i><span id="jpGrand">$0</span></div>')
NEWSYMS2='''  <symbol id="s-STAR" viewBox="0 0 100 100">
    <path d="M50.0 10.0L61.2 38.6L91.8 40.4L68.1 59.9L75.9 89.6L50.0 73.0L24.1 89.6L31.9 59.9L8.2 40.4L38.8 38.6Z" fill="url(#gGold)" stroke="#6b4508" stroke-width="3" stroke-linejoin="round"/>
    <path d="M50 22L57 42M30 44L44 44" stroke="#fff" stroke-opacity=".65" stroke-width="3" stroke-linecap="round"/>
    <circle cx="50" cy="55" r="7" fill="url(#gRed)" stroke="#6b0f0f" stroke-width="2"/>
  </symbol>
  <symbol id="s-HORSESHOE" viewBox="0 0 100 100">
    <path d="M26 16C8 38 12 84 50 86C88 84 92 38 74 16" fill="none" stroke="#5c5f66" stroke-width="22" stroke-linecap="round"/>
    <path d="M26 16C8 38 12 84 50 86C88 84 92 38 74 16" fill="none" stroke="#eef2f7" stroke-width="16" stroke-linecap="round"/>
    <path d="M24 22C14 42 18 76 44 80" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="3" stroke-linecap="round"/>
    <g fill="#5c5f66"><circle cx="20" cy="40" r="3"/><circle cx="19" cy="58" r="3"/><circle cx="27" cy="73" r="3"/><circle cx="80" cy="40" r="3"/><circle cx="81" cy="58" r="3"/><circle cx="73" cy="73" r="3"/></g>
  </symbol>
  <symbol id="s-DICE" viewBox="0 0 100 100">
    <g transform="rotate(-9 50 50)"><rect x="14" y="14" width="72" height="72" rx="14" fill="#fff8ea" stroke="#7d6a3a" stroke-width="3"/>
    <rect x="18" y="18" width="64" height="64" rx="11" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="2"/>
    <g fill="url(#gCherry)" stroke="#5a0010" stroke-width="1.5"><circle cx="33" cy="33" r="7"/><circle cx="67" cy="33" r="7"/><circle cx="50" cy="50" r="7"/><circle cx="33" cy="67" r="7"/><circle cx="67" cy="67" r="7"/></g></g>
  </symbol>
  <symbol id="s-MELON" viewBox="0 0 100 100">
    <path d="M6 38A44 44 0 0 0 94 38Z" fill="#1f7a3a" stroke="#0f4a1f" stroke-width="3" stroke-linejoin="round"/>
    <path d="M12 38A38 38 0 0 0 88 38Z" fill="#e9f6c8"/>
    <path d="M17 38A33 33 0 0 0 83 38Z" fill="url(#gCherry)"/>
    <g fill="#2a1408"><ellipse cx="34" cy="50" rx="3" ry="5" transform="rotate(-20 34 50)"/><ellipse cx="50" cy="56" rx="3" ry="5"/><ellipse cx="66" cy="50" rx="3" ry="5" transform="rotate(20 66 50)"/><ellipse cx="42" cy="66" rx="3" ry="4.5" transform="rotate(-10 42 66)"/><ellipse cx="58" cy="66" rx="3" ry="4.5" transform="rotate(10 58 66)"/></g>
    <path d="M10 36H90" stroke="#0f4a1f" stroke-width="3" stroke-linecap="round"/>
  </symbol>
'''
rep('</defs>\n</svg>',newsyms+NEWSYMS2+'</defs>\n</svg>')

hdr='''<div class="hdr-r">
      <div class="meters">
        <div class="mt"><span id="lvl">BRO 1</span><div class="bar"><i id="xpbar"></i></div></div>
        <div class="mt"><span>WHEEL</span><div class="bar lucky" id="lbar"><i id="lucky"></i></div></div>
      </div>
      <button class="ibtn" id="btnLobby" aria-label="Game lobby"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg></button>
      <button class="ibtn wheelbtn" id="btnWheel" aria-label="Lucky wheel"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 3v7M12 14v7M3 12h7M14 12h7M5.6 5.6l5 5M13.4 13.4l5 5M18.4 5.6l-5 5M10.6 13.4l-5 5"/></svg></button>
      <button class="ibtn" id="btnMusic" aria-label="Music"><svg viewBox="0 0 24 24"><path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2.5"/><circle cx="17" cy="16" r="2.5"/></svg></button>
      <button class="ibtn" id="btnSound" aria-label="Sound"><svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path id="sndWave" d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg></button>
      <button class="ibtn" id="btnMenu" aria-label="Menu"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    </div>
  </header>'''
head,n=re.subn(r'<div class="hdr-r">.*?</header>',lambda m:hdr,head,count=1,flags=re.S); assert n==1

rep('<div id="banner">','''<div id="rays"></div><div id="ring"></div>
        <div id="fsbar"><span>Free spin <b id="fsN">1</b>/<b id="fsM">10</b></span><span class="mult" id="fsMult">x1</span><span>Total <b id="fsTot">$0</b></span></div>
        <div id="splash"><div><div class="tier"></div><div class="amt"></div><div class="bsub"></div></div></div>
        <div id="banner">''')

chips='''<div class="chips">
      <button class="chip" id="chAuto">Auto</button><button class="chip" id="chTurbo">Turbo</button><button class="chip" id="chMax">Max bet</button>
      <button class="chip gold" id="chBuy">Buy bonus</button><button class="chip" id="chGamble" disabled>Gamble</button><button class="chip" id="chGift">Gift</button>
    </div>'''
head,n=re.subn(r'<div class="chips">.*?</div>',lambda m:chips,head,count=1,flags=re.S); assert n==1
rep('    </div>\n  </main>','    </div>\n    <button id="arm" aria-label="Pull the lever to spin"><span class="ar-mount"></span><span class="ar-rod"><i class="ar-ball"></i></span><span class="ar-pivot"></span></button>\n  </main>')
rep('<main id="mid">','<div id="qstrip"><span id="qtxt"></span></div>\n  <main id="mid">')
rep('</footer>','</footer>\n  <div id="ticker"><div class="tk-l">LIVE</div><div class="tk-r"><div id="tkin"></div></div></div>')
rep('<div id="stage">','<canvas id="amb"></canvas><div class="beam b1"></div><div class="beam b2"></div><div id="qback"></div><div id="quotes"></div>\n<div id="stage">')

over='''<div id="toast"></div>
<div id="scr"></div><div class="lbx t"></div><div class="lbx b"></div>
<div id="ach"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="url(#gGold)" stroke="#6b4508" stroke-width="2"/><path d="M20 8l3.6 8 8.8.8-6.6 5.8 2 8.6L20 26.5 12.2 31.2l2-8.6L7.6 16.8l8.8-.8z" fill="url(#gRed)" stroke="#5a0010" stroke-width="1.2" stroke-linejoin="round"/></svg><div><b>Achievement</b><span>Unlocked</span></div></div>
<div id="wheelOv"><div class="wt">LUCKY WHEEL</div><div class="wbox"><canvas id="wcv"></canvas>
  <svg class="wptr" viewBox="0 0 46 58"><path d="M23 56L4 14C-2 0 10 -2 23 2C36 -2 48 0 42 14Z" fill="url(#gGold)" stroke="#3a2a08" stroke-width="3" stroke-linejoin="round"/><circle cx="23" cy="16" r="6" fill="#d9263f"/></svg>
  <button class="whub" id="whub">SPIN</button></div><div class="wres" id="wres">Spin the wheel</div></div>
<div id="cb"><div><h1>COME BACK GAMBLE MORE!!!!!!</h1><p>Your big win is waiting for you</p><button class="btn" id="cbBtn">I&rsquo;m back &mdash; spin!</button></div></div>
<div id="welcome"><h2>Welcome to</h2><h1>99G1C</h1><h2>99Gamblers1Claude</h2>
  <div class="games">
    <button class="gtile" id="gSlots"><div class="gart"><svg viewBox="0 0 100 100"><use href="#s-SEVEN"/></svg><svg viewBox="0 0 100 100"><use href="#s-SEVEN"/></svg><svg viewBox="0 0 100 100"><use href="#s-SEVEN"/></svg></div><b>Slots</b><span>5 reels, 10 lines, wilds, free spins and a lucky wheel</span><em id="gSlotsStat"></em></button>
    <button class="gtile" id="gBj"><div class="gart"><div class="mc">A&#9824;&#xFE0E;</div><div class="mc r">K&#9829;&#xFE0E;</div></div><b>Blackjack</b><span>3 to 2, double, split, insurance and win streaks</span><em id="gBjStat"></em></button>
  </div>
  <button class="chip gold" id="olBtn">Online leaderboards</button> <span id="olStat" class="olstat">Offline mode</span>
  <div class="lobbal">Balance <span id="lobBal"></span></div>
  <div id="daily"></div>
  <small>Play money only. Nothing here is real gambling. Sound starts when you pick a game. 18+ only.</small></div></div>'''
BJHTML='''<div id="bj" hidden>
  <header>
    <div class="logo" id="bjLogo"><b>99G1C</b><small>Blackjack</small><div class="bjstreak" id="bjStreak" title="Win streak bonus"><svg viewBox="0 0 24 24"><path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c0-1-.4-1.800-1-2.500C16.500 9.500 19 12 19 15a7 7 0 0 1-14 0c0-5 5-7 7-13z"/></svg><b>0</b></div></div>
    <div class="hdr-r">
      <button class="ibtn" id="bjLobby" aria-label="Game lobby"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg></button>
      <button class="ibtn" id="bjMusic" aria-label="Music"><svg viewBox="0 0 24 24"><path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2.5"/><circle cx="17" cy="16" r="2.5"/></svg></button>
      <button class="ibtn" id="bjSound" aria-label="Sound"><svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg></button>
      <button class="ibtn" id="bjMenu" aria-label="Menu"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    </div>
  </header>
  <main id="bjtable">
    <div id="bjfx"></div>
    <div id="bjshoe"><i></i><i></i><i></i></div>
    <div id="bjsay" aria-live="polite"><b>Vince</b><span></span></div>
    <div class="bjrule">Blackjack pays 3 to 2 &middot; Dealer stands on 17</div>
    <div class="bjrow"><div class="hand" id="bjd"></div><div class="tot" id="bjdt"></div></div>
    <div id="bjmsg"></div>
    <div id="bjp"></div>
  </main>
  <footer id="bjpanel">
    <div class="bjinfo"><div class="grp"><div class="lbl">Balance</div><div class="val" id="bjBal">$1,000,000</div></div><div class="grp"><div class="lbl">Bet</div><div class="val" id="bjBet">$0</div></div></div>
    <div id="bjAsk" hidden></div>
    <div class="bjchips" id="bjChips"></div>
    <div class="bjact" id="bjBetRow"><button class="chip" id="bjClear">Clear</button><button class="chip" id="bjRebet">Rebet</button><button class="chip" id="bjX2">x2</button><button class="chip gold" id="bjDeal">Deal</button></div>
    <div class="bjact" id="bjPlayRow" hidden><button class="chip gold" id="bjHit">Hit</button><button class="chip" id="bjStand">Stand</button><button class="chip" id="bjDouble">Double</button><button class="chip" id="bjSplit">Split</button><button class="chip" id="bjSur">Surrender</button></div>
  </footer>
</div>
'''
over=over.replace('<div id="scr"></div>',BJHTML+'<div id="scr"></div>',1)
rep('<div id="toast"></div>',over.replace('\\\\u2019',"’").replace('\\\\u2014',"—"))

dbgnew='''<h3>Luck presets</h3>
  <div class="dg" id="dPresets"></div>
  <h3>Bonuses</h3>
  <div class="dg"><button id="dWheelNow">Open wheel now</button><button id="dMeter">Fill lucky meter</button><button id="dFsNow">Free spins now (10)</button><button id="dFs5">Free spins now (25)</button><button id="dGift">Make gift ready</button><button id="dXp">+ 500 XP</button></div>
  <div class="dsl"><span>Wheel result</span><select id="dWheelSel"><option value="random">random</option><option value="cash">cash</option><option value="fs">free spins</option><option value="mini">mini jackpot</option><option value="minor">minor jackpot</option><option value="major">major jackpot</option><option value="mega">MEGA jackpot</option><option value="grand">GRAND jackpot</option></select><span></span></div>
  <h3>Admin control</h3>
  <div class="dg" id="dAdm"></div>
  <h3>Icons</h3>
  <div class="dg" id="dIcons"></div>
  <h3>Bankroll</h3>'''
rep('<h3>Bankroll</h3>',dbgnew)
rep('<h3>Bonuses</h3>','<h3>Blackjack</h3><div class="dg" id="dBj"></div><div id="dBjNext" class="chipnext"></div>\n  <div class="dsl"><span>Table luck</span><select id="dBjLuck"><option value="fair">Fair shoe</option><option value="hot">Hot table</option><option value="fire">On fire</option><option value="cold">Cold table</option></select><span></span></div>\n  <div class="dsl"><span>Loss cashback %</span><input type="range" id="dBjDisg" min="0" max="100" value="70"><output id="oBjDisg">70</output></div>\n  <label class="dchk"><input type="checkbox" id="dBjSticky"> Keep forcing every hand</label>\n  <label class="dchk"><input type="checkbox" id="dBjPeek"> Show dealer hole card</label>\n  <div class="dg"><button id="dBjShuffle">Reshuffle shoe</button><button id="dBjStreak">Streak +1</button></div>\n  <div class="kv"><span>Cards in shoe</span><b id="dBjLeft"></b><span>Hi-Lo count</span><b id="dBjRun"></b></div>\n  <h3>Bonuses</h3>')
rep('<span>Spins that net lost</span><b id="dLost"></b><span>Biggest win</span><b id="dBest"></b>','<span>Spins that net lost</span><b id="dLost"></b><span>Biggest win</span><b id="dBest"></b><span>Free spin bonuses</span><b id="dFsC"></b><span>Wheel spins</span><b id="dWh"></b><span>Wilds landed</span><b id="dWl"></b><span>Bonus credits</span><b id="dLb"></b>')
rep('<label class="dchk"><input type="checkbox" id="dDisg"','<div class="dsl"><span>Gamble win %</span><input type="range" id="dGamb" min="0" max="100" value="50"><output id="oGamb">50</output></div>\n  <label class="dchk"><input type="checkbox" id="dDisg"')
rep('</style>',open(P('v3.css')).read()+open(P('bj.css')).read()+open(P('games.css')).read()+'\n</style>')
js=open(P('v3.js')).read()
head=head.replace('+ $10,000','@@A@@').replace('+ $1,000','@@B@@').replace('@@A@@','+ $1,000,000').replace('@@B@@','+ $100,000').replace('id="dBalIn" min="0" step="100" value="10000"','id="dBalIn" min="0" step="10000" value="1000000"').replace('id="bal">$10,000','id="bal">$1,000,000')
assert '/*@@BJ@@*/' in js
js=js.replace('/*@@BJ@@*/',open(P('bj.js')).read()+open(P('games.js')).read())
js=js.replace('/*@@ONLINE@@*/',open(P('online.js')).read()+open(P('admin.js')).read().replace('/*@@ADMPUB@@*/null',open(P('admin_pub.json')).read()))
open(P('99g1c.html'),'w').write(head+'<script>\n'+js+'\n</script>\n')
print('built',len(head)+len(js))

# --- wrap the built fragment as a standalone page: ../index.html (what GitHub Pages serves)
WRAP='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"><style>:root{color-scheme:light}html,body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>'
open(os.path.join(os.path.dirname(ROOT),'index.html'),'w').write(WRAP+'\n'+open(P('99g1c.html')).read()+'\n</body></html>\n')
print('wrote index.html')
