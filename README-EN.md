[中文](README.md) | **English**

# 🎲 Mooncake Dice Game

A traditional Chinese "Mooncake Dice" (Bo Bing) game implemented with Vite + Vue 3 + TypeScript. Supports multiple players on the same device, festive Chinese-style visuals, dice animations, and sound effects.

## 🎮 Game overview

Bo Bing is a traditional Mid-Autumn Festival dice game from Southern Fujian. Players roll six dice to win different prize tiers. This project implements the classic Bo Bing rules, including the "Zhuangyuan steal" mechanic and polished visuals.

## 📜 Rules

Six dice; ranking priority is listed from highest to lowest:

| Rank | Name (EN) | Condition | Prize count |
|------|-----------|-----------|-------------|
| Zhuangyuan (Six Reds) | Six Reds | 6 fours | 1 (shared Zhuangyuan pool) |
| Zhuangyuan (Six Same) | Six Same (non-4) | 6 of a kind (not four) | 1 |
| Zhuangyuan (Five Reds) | Five Reds | 5 fours | 1 |
| Zhuangyuan (Five Same) | Five Same (non-4) | 5 of a kind (not four) | 1 |
| Zhuangyuan (Four Reds) | Four Reds | 4 fours | 1 |
| Bangyan (All Different) | All Different | 1-2-3-4-5-6 each once | 2 |
| Tanhua (Three Reds) | Three Reds | exactly 3 fours | 4 |
| Jinshi (Four of a Kind) | Four of a Kind (non-4) | 4 of a kind (not four-red) | 8 |
| Juren (Two Fours) | Two Fours | exactly 2 fours | 16 |
| Xiucai (One Four) | One Four | exactly 1 four | 32 |

**Zhuangyuan steal rule**: There is only one Zhuangyuan prize. A later player who rolls a higher-level Zhuangyuan can steal it from the previous holder.

## 🚀 Quick start

### Requirements

- Node.js 18+
- pnpm (recommended) or npm

### Install

```bash
pnpm install
```

### Start dev server

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

### Preview production build

```bash
pnpm preview
```

## 🏗️ Project structure

```
src/
├── App.vue                    # Root component, game state machine
├── main.ts                    # App entry
├── style.css                  # Global styles
├── components/
│   ├── SetupScreen.vue        # Setup: player count & names
│   ├── GameScreen.vue         # Main gameplay
│   ├── Dice.vue               # Single dice (CSS 3D animation)
│   └── ResultScreen.vue       # Results & final ranking
└── composables/
    ├── useGameState.ts        # Game state (players, rounds, prize pools)
    ├── useDiceRoll.ts         # Dice logic (random, evaluation)
    └── useAudio.ts            # Web Audio API sounds
```

## ✨ Features

- 🎲 Complete Bo Bing rules and prize evaluation
- 👥 Local multiplayer (2–10 players)
- 🏆 Zhuangyuan steal mechanic
- 🎨 Festive Chinese-style visual design
- 🎬 CSS 3D dice animations
- 🔊 Web Audio API sound effects (no external files)
- 📱 Responsive, mobile-first layout

## 📄 License

MIT License
