# Architecture

99G1C is a single-page app delivered as **one HTML file** with inline CSS and JavaScript. There is no framework, no bundler and no runtime dependency. A small Python script concatenates the sources.

## Build pipeline

`src/build.py` reads the page shell `src/gilded-sevens.html`, patches its markup, and produces one document:

1. HTML head and body are taken from the shell and patched with `rep(old, new)` (asserting each anchor exists).
2. CSS is appended in order: `v3.css`, `bj.css`, `games.css`.
3. JavaScript starts from `v3.js`. Two markers are replaced by splicing in other modules:
   - `/*@@BJ@@*/` becomes `bj.js` followed by `games.js`.
   - `/*@@ONLINE@@*/` becomes `online.js` followed by `admin.js`. In `admin.js` the placeholder `/*@@ADMPUB@@*/null` is replaced by the public key from `admin_pub.json`.
4. The result is written to `src/99g1c.html` (a fragment, git-ignored) and wrapped into `index.html` with a minimal head.

Because everything lands in one `<script>`, **all modules share one scope**. Function declarations are hoisted, but `const`/`let` at top level are not: a module may only use another module's constants at call time, never at load time before they are defined.

## Runtime state

| Object | Purpose | Persisted |
| --- | --- | --- |
| `state` | Live balance (`bal`), displayed balance (`balShown`), bet, flags such as `busy`, `presId` | partly |
| `ui` | Preferences: nickname, volumes, `mstyle`, `bg`, `gfx`, Firebase URL (`fb`), player id (`pid`), email account (`acct`) | yes |
| `S` | Statistics and per-game counters (spins, hands, races, paid, wagered, history) | yes |
| `cfg` | Slot tuning: assist, bonus, boost, near-miss, wild and scatter multipliers, meter speed | preset id only |
| `game` | Current screen: `lobby`, `slots`, `bj`, `rl`, `cr` | no |

Saves live in `localStorage` under `99g1c-v1` as `{bal, ui, S, preset, pv, ...}`. `pv` is a preset version: saves older than `pv: 2` are moved to the "Fun" preset once. `save()` is debounced by callers and is a no-op after account deletion (`window.__g1cDeleted`).

All games spend and credit `state.bal` directly, using integer amounts, then call `renderHUD()`, `lobbyStats()` and `save()`.

## Screens and game switching

The lobby is `#welcome`. Slots live in `#stage`, blackjack in `#bj`, and roulette and cat racing are full-screen `.gm` overlays (`#rl`, `#cr`) mounted by `gmMount()` in `games.js`. `enterGame(g)` (blackjack module) and `gmEnter(g)` show one screen and hide the rest. The shared win banner, flash, ring and rays elements are moved into the current screen's fx host so the same presentation code works everywhere.

Mobile behaviour is handled by the `mobileLock` block in `v3.js`: it fixes `html`/`body`, blocks gestures and touch scrolling outside elements matched by `SCROLLERS`, and follows the visual viewport (`--vvh`, `--vvt`) so the keyboard never pans the page.

## Slots engine

- A seeded generator `R()` drives outcomes; `vis()` and `vr()` are the visual-only streams. Spins are therefore reproducible from `RS`.
- `admPredict` re-runs the engine to forecast the next spins exactly.
- Outcomes can be forced by a code queue: `J` (line jackpot), `L`, `M:<mode>`, `P:<tier>`, `G:<ICON>` (all 15 cells), `R:<ICON>` (five in a row).
- Presentation is tiered by `tierOf(pay, bet)`: win, nice, big, super, mega, jackpot. `present()` runs the slot version; `gmWin()` runs the same banner, shake, coin and ray effects for the other games.

## Blackjack

`bj.js` keeps its own state object (`bj`): shoe, hands, phase (`bet`, `play`, `dealer`, `settle`), streak and forcing flags. Actions go through `bjAct(k)` for `hit`, `stand`, `double`, `split` and `surrender`; `bjNext()` advances hands and `bjDealer()` plays the dealer; `bjFinish()` settles every hand (`bj` pays 2.5x, win 2x, push 1x, surrender 0.5x), applies streak bonus, then calls the shared win animation for big results. `bjSnap()` exports a compact snapshot for live mirroring.

## Roulette

- Wheel order is the European sequence in `RL_ORDER`; `rlCover(key)` expands a bet key (`n:17`, `s:17,20`, `c:...`, `col:2`, `doz:1`, `eo:red`) into the numbers it covers, and `RL_PAY` gives the profit multiple.
- `rlResolve(bets, n)` is a pure function returning the total return for a result. Every bet type has expected return exactly 36/37.
- A spin draws `n` first (or takes `GMF.rl`), then animates the ball so it lands in that pocket: the ball angle follows `E + A * (1 - t/T)^2.2` against a constant-speed wheel, so the end position relative to the wheel is the drawn pocket.
- The betting table is a CSS grid with absolutely positioned junction buttons for splits, streets, corners and six lines.

## Cat racing

- **Outcome first.** Each cat has a hidden strength `s = exp(score / 14)` from speed, stamina, zoom, mood, recent form and noise. Probabilities are `p_i = s_i / sum(s)`. The finishing order is drawn once with a Plackett-Luce sequence draw, then the animation is built to match it.
- **Odds.** Win, place, show, quinella, exacta and trifecta probabilities come from the Harville model over all permutations. Posted odds are `1 / (p * (1 + margin))`, rounded down to a ladder, so the margins are 10 to 16 percent.
- **Animation.** Each cat has a finish time (`F`) derived from its rank. Position is a smooth curve with an exponent and wobble that still reaches 1.0 exactly at `F`, so cats can swap places mid-race but never change the final order. A few cats take a short mid-race dip that vanishes before the finish. Photo finishes slow the clock.
- Bets resolve in `crFinish()` from the drawn order only.

## Sound

`Snd` is an IIFE around one `AudioContext` with buses for effects, music and reverb. Effects use `tone()` and `nb()` (noise bursts). Music is a step sequencer at 12 steps per bar (a triplet grid): `playStep` is the jazz generator, `playAlt` implements the other styles (lounge, synthwave, ragtime, ambient) from a four-chord progression each. `Snd.setStyle(id)` switches styles live. Longer cinematic music is streamed from `xcool.mp3` and `lightning.mp3` by `admLoad`.

## Online layer

All online features are optional and use the Realtime Database REST API with Server-Sent Events; there is no SDK.

| Path | Content |
| --- | --- |
| `/players/<pid>` | Leaderboard row (nickname, balance, stats) |
| `/feed` | Recent big wins |
| `/live/<pid>` | Heartbeat and state mirror used for spectating (`off:1` when the page closes) |
| `/cmd/<pid>` | Signed remote commands for that player |
| `/logins` | Login events with the game mode entered |
| `/acct/<hash>` | Email account: password hash, timestamp, last device, save copy |
| `/cfg` | Shared custom icon set for the slots |

### Email accounts

The email is hashed (`SHA-256`, first 32 hex chars) to form the key, the password is stretched with PBKDF2 (100k iterations). Logging in on a second device downloads the save and keeps that device's own player id and database URL. Devices push after saves while visible and pull when they become visible again, so the newest play wins. Open database rules make the stored hash readable; this is a play-money design.

### Remote control

Commands in `/cmd/<pid>` carry an ECDSA P-256 signature checked against the public key compiled into `admin.js`; the private key is never in this repository. Commands older than 60 seconds wait for the next user gesture, may be queued up to 14 days, and are protected from replay by a signature log in `localStorage`. The handler `admHandle` supports messages, forced results, balance edits, cinematics, screen effects and luck tuning. Debug tooling is hidden from online play unless the owner's nickname is used (`olLocked`).

## Testing

There is no test runner in the repository. Changes are verified with Playwright against a locally served build and a small in-memory mock of the Firebase REST API: forced results through `window.GMF` (roulette number, cat order), screenshots at phone sizes (390x844, 375x667) and checks that no `pageerror` fires. Pure functions (`rlResolve`, odds, Harville probabilities) are worth testing in Node with an extracted copy.

## Known limits

- The RNG is client side, so none of this is secure against a determined player; it is a toy.
- Cat races are private to each player. A shared table would conflict with per-player forcing.
- Open database rules mean any client can write any path.
