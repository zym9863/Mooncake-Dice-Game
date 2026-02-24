[简体中文](README.md) | **English**

# Mooncake Dice Game (Online Multiplayer)

This project has been refactored from local pass-and-play into an online multiplayer room game:
- Server-authoritative dice roll and prize judging
- Room-code invite flow
- Nickname + temporary session
- Reconnect by session token
- Running-room snapshot persistence (can recover after restart)

## Stack

- Frontend: Vue 3 + Vite + TypeScript
- Backend: Node.js + Express + WebSocket (`ws`)
- Persistence: JSON snapshot file (`server/data/game.db`, JSON content)
- Deployment: Docker Compose (`web` + `server`)

## Local Development

### 1) Install

```bash
pnpm install
```

### 2) Run backend

```bash
pnpm dev:server
```

Default: `http://localhost:3001`

### 3) Run frontend

```bash
pnpm dev:web
```

Default: `http://localhost:5173`

Vite proxy is configured:
- `/api` -> `http://localhost:3001`
- `/ws` -> `ws://localhost:3001`

### 4) Build

```bash
pnpm build:web
pnpm build:server
```

## Docker Deployment

```bash
docker compose up -d --build
```

Services:
- `web`: port 80 (Nginx static + reverse proxy for `/api` and `/ws`)
- `server`: port 3001 (internal)

Persistent volume:
- `mooncake_data` -> `/data`

## HTTP APIs

- `POST /api/session` create temporary session
- `POST /api/rooms` create room
- `POST /api/rooms/:roomCode/join` join room
- `GET /api/rooms/:roomCode/state` room snapshot
- `GET /healthz` health check

WebSocket endpoint: `/ws`

Client events:
- `room:start`
- `turn:roll`
- `turn:next`
- `room:leave`

Server events:
- `room:snapshot`
- `game:rolled`
- `game:turn_changed`
- `game:ended`
- `error`

## Project Layout

```text
shared/
  game-types.ts
server/
  src/
    index.ts
    room-manager.ts
    game-engine.ts
    db.ts
src/
  App.vue
  composables/
    useOnlineGame.ts
```

## License

MIT
