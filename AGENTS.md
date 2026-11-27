# AGENTS.md

Instructions for AI coding agents working on this repository. Read [ARCHITECTURE.md](ARCHITECTURE.md) first.

## Golden rules

1. **Never edit `index.html` by hand.** It is generated. Change files in `src/`, then run `python3 src/build.py`.
2. **One file, no dependencies.** Do not add npm packages, CDNs, web fonts or image files. Graphics are CSS, inline SVG and canvas; audio is generated with Web Audio.
3. **Everything shares one script scope.** Do not wrap modules in IIFEs that hide names other modules use, and do not redeclare existing names (`$`, `$$`, `fmt`, `state`, `ui`, `S`, `cfg`, `game`, `Snd`, `toast`, `burst`, `shake`, ...). Search for a name before adding it.
4. **Never commit secrets.** The admin private key lives outside the repo. `admin_pub.json` is public and intentional. Do not paste database URLs of other people or passwords into code.
5. **Money is integer play money.** Debit with `state.bal -= x` before an animation, credit after, set `state.balShown`, then `renderHUD()`, `lobbyStats()` and `save()`.
6. **The result decides first, the animation follows.** Draw the outcome before animating, and make the animation land on it. Never compute payouts from what is on screen.

## Workflow

```bash
python3 src/build.py                 # build index.html
# syntax check the generated script
python3 - <<'PY'
import re, json
h = open('index.html').read()
sc = re.findall(r'<script>(.*?)</script>', h, re.S)[-1]
open('/tmp/check.js', 'w').write('new Function(' + json.dumps(sc) + ')')
PY
node /tmp/check.js && echo OK
```

Then test in a browser. Playwright works well: serve the folder (`python3 -m http.server`), pre-seed `localStorage['99g1c-v1']` with `{bal, econ:3, pv:2, ui:{nick:'tester1'}, S:{}}` so no nickname prompt appears, click a lobby tile (`#gSlots`, `#gBj`, `#gRl`, `#gCr`), and watch for `pageerror`. Force results with `window.GMF.rl = <0-36>` or `window.GMF.cr = [<lane indexes, 0-based>]`. Take screenshots at 390x844 and 375x667.

Deploy by committing to `main`; GitHub Pages builds from `.github/workflows/pages.yml`. If the run fails with "No artifacts named github-pages", dispatch the workflow again (`gh api -X POST repos/<owner>/<repo>/actions/workflows/pages.yml/dispatches -f ref=main`) until it succeeds.

## Style

- Plain JavaScript (ES2020), semicolons, no TypeScript, short functions named by area: `bj*` blackjack, `rl*` roulette, `cr*` cat racing, `gm*` shared game screens, `adm*` admin, `ol*` online, `ac*` accounts.
- Prefer compact, readable code over abstraction. Comment the reason, not the line.
- UI text is English, sentence case, no em dashes.
- CSS uses variables from the shell (`--brass`, `--brass-hi`, `--muted`, `--good`, `--bad`, `--ui`, `--display`). New screens must work at 360 px wide and 640 px tall **without scrolling** (the page itself must never scroll or zoom).
- Use `hidden` attributes carefully: any rule that sets `display` on the element overrides `[hidden]`; add `[hidden]{display:none!important}` where needed.

## Checklist: adding a game

1. Write `src/<game>.js` and `src/<game>.css` (or extend `games.js`). Use a unique prefix and mount markup from JS like `gmMount()` does.
2. Add a lobby tile with an id (`g<Name>`) to `.games`, plus a stat line updated in `lobbyStats()`.
3. Hide the screen in `enterGame()` (bj module) and make `gmEnter` show it; add the new `game` value to the keyboard guard (`if(game==='lobby'||...) return;`).
4. Block leaving mid-round (`gmBusy()` pattern) and make `openLobby` respect it.
5. Use `gmWin(pay, bet, balanceBefore)` for win presentation and `gmWinClear()` when a new round starts.
6. Add `window.GMF.<key>` forcing, an `admHandle` case and an admin tab in `ADM_TABS` if the owner should be able to control it.
7. Update the README table, ARCHITECTURE.md and this file.
8. Test: pure payout function in Node, a forced run in the browser, no `pageerror`, no scrolling at 375x667.

## Checklist: adding a music style or background

- Music: add the id to the `MS`, `PRG` tables and a branch in `playAlt` in `v3.js`; add an option to the `#sMst` select in settings. Remember the grid is 12 steps per bar.
- Background: add an entry to `BG_LIST` in `v3.js` and CSS for `html[data-bg="<id>"]` on `body`, `.gm` and `#welcome` in `games.css`.

## Pitfalls seen before

- `null >= 0` is `true` in JavaScript. An unset forced value once produced `n = null`, so every spin "landed" on index -1 and nothing paid. Always test with `typeof x === 'number'`.
- `Snd.tone` and `Snd.nb` only exist after the audio context is created; call `wake()` from a user gesture first and guard optional calls (`Snd.tone&&Snd.tone(...)`).
- Elements positioned with `translate` need the animation to change `translate`/`scale` individual properties, or it will fight the centring transform.
- The page runs inside a locked-down viewer in some places: no `alert`, no `window.print`, and downloads from the page may be blocked.
- Firebase returns `{"error":"Permission denied"}` with HTTP 401. Check `response.ok` before treating a body as data (an old bug showed this as "wrong password").
- iOS zooms on focus for inputs below 16 px and pans the page when the keyboard opens. Keep inputs at 16 px and keep modals sized with the visual viewport variables.
- Saves from older versions must keep loading: add new fields with defaults (`S.rlHist||(S.rlHist=[])`), never rename existing ones.

## Commit messages

Short imperative subject, details in the body if needed. When an agent creates the commit, keep the attribution trailers requested by the tool or the repository owner.
