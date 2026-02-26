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

## GitHub Actions Auto Deploy (push-to-deploy)

The repository now includes: `.github/workflows/deploy.yml`

Triggers:
- Push to `main`
- Manual run (`workflow_dispatch`)

### Server prerequisites

1. Docker + Docker Compose installed
2. Repository already cloned on server (example: `/opt/Mooncake-Dice-Game`)
3. Deploy user can run `git` and `docker compose`

### Required GitHub Secrets

In `Settings -> Secrets and variables -> Actions`, add:

- `DEPLOY_HOST`: server IP/domain
- `DEPLOY_PORT`: SSH port (optional, default 22)
- `DEPLOY_USER`: SSH username
- `DEPLOY_SSH_KEY`: private key content (use a dedicated deploy key)
- `DEPLOY_PATH`: project path on server (e.g. `/opt/Mooncake-Dice-Game`)

### Commands executed by workflow

```bash
cd $DEPLOY_PATH
git fetch --all
git checkout main
git pull origin main
docker compose up -d --build --remove-orphans
```

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
