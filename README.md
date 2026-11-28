# 99G1C: 99Gamblers1Claude

A play-money casino that runs entirely in the browser: one HTML file, no frameworks, no server needed to play. It ships four games that share one balance.

**Play it:** https://kuba9284.github.io/casino-yes-addiction/

> Play money only. Nothing here is real gambling and nothing can be cashed out. 18+.

## Games

| Game | What it is |
| --- | --- |
| **Slots** | 5 reels, 10 lines, wilds, scatters, free spins, a lucky wheel and a progressive jackpot ladder (mini, minor, major, mega, grand). |
| **Blackjack** | 3 to 2 payout, dealer stands on 17, double, split (up to four hands), insurance, late surrender and a win streak bonus. |
| **Roulette** | European wheel with a single zero. Straight, split, street, trio, corner, six line, column, dozen and even-money bets. Long-run return 97.3%. |
| **Cat Racing** | Six cats per race from a stable of twelve, with moods and form. Win, place, show, quinella, exacta and trifecta at fixed odds. Photo finishes. |

Wins use a shared presentation (WIN, BIG WIN, SUPER WIN, MEGA WIN, JACKPOT) with counting amounts, confetti and coin showers.

## Features

- **Mobile first.** The page never scrolls or zooms, game screens fit a phone without scrolling, and inputs stay at 16 px so iOS does not zoom.
- **Procedural audio.** All sound effects and music are generated with the Web Audio API. Five music styles: Smoky jazz, Velvet lounge, Neon synthwave, Ragtime bounce, Night ambient.
- **Backgrounds.** Emerald felt, Midnight blue, Burgundy velvet, Sunset lounge, Noir and gold, Neon grid, Starry night.
- **Progress.** Daily bonus, levels, missions and stats are saved in `localStorage`.
- **Optional online mode.** Leaderboards, a live win feed and (optionally) an email account so the same progress follows you across two devices.
- **Luck presets.** Slot odds can be tuned from the debug menu (default is the "Fun" preset, about 150% return).

Settings (menu button) are split into Sound, Display, Play and Account tabs, plus an Admin tab with the debug menu button for the owner. Backgrounds are animated.

## Online mode

Online features use a Firebase Realtime Database that you own. Without one the game works fully offline.

1. Create a Realtime Database and copy its URL (`https://<name>-default-rtdb.<region>.firebasedatabase.app`).
2. In the game open **Online leaderboards** and paste the URL.
3. Allow the paths the game uses. For a play-money game open rules are fine:

```json
{
  "rules": {
    "players": { ".read": true, ".write": true },
    "feed":    { ".read": true, ".write": true },
    "live":    { ".read": true, ".write": true },
    "cmd":     { ".read": true, ".write": true },
    "cfg":     { ".read": true, ".write": true },
    "logins":  { ".read": true, ".write": true },
    "acct":    { ".read": true, ".write": true }
  }
}
```

Email accounts store a salted PBKDF2 hash of the password and a copy of the save in `/acct`. With open rules anyone can read that hash, so never reuse a real password.

## Build from source

The deployed `index.html` is generated. Edit the files in `src/` and rebuild:

```bash
python3 src/build.py      # writes index.html at the repository root
```

Requirements: Python 3 only. No `npm install`. To check the result parses, extract the last `<script>` block and run it through `new Function(...)` in Node, or open it in a browser.

GitHub Pages serves `index.html` from `main` using `.github/workflows/pages.yml`. If a deploy fails with "No artifacts named github-pages", re-run the workflow; it is a transient GitHub-side error.

## Project layout

```
index.html                 generated, served by GitHub Pages
src/gilded-sevens.html     page shell and slot markup
src/v3.js, v3.css          core: state, slots engine, sound, UI, settings
src/bj.js, bj.css          blackjack
src/games.js, games.css    roulette, cat racing, shared game screens, backgrounds
src/online.js              leaderboards, feed, accounts
src/admin.js               live control and debug tooling
src/admin_pub.json         public key used to verify admin commands
src/build.py               assembles everything into one file
xcool.mp3, lightning.mp3   audio used by cinematic effects
ARCHITECTURE.md            how it fits together
AGENTS.md                  rules for AI coding agents working on this repo
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for design details and [AGENTS.md](AGENTS.md) before changing code with an AI agent.
