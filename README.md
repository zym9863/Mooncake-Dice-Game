[English](README-EN.md) | **简体中文**

# Mooncake Dice Game (Online Multiplayer)

该项目已从“同设备轮流”重构为“在线多人房间制”玩法：
- 服务端权威掷骰与判奖（防止前端作弊）
- 房间号邀请
- 昵称 + 临时会话
- 断线重连（同一 session token）
- 运行态快照持久化（重启可恢复进行中的房间）

## 技术栈

- 前端：Vue 3 + Vite + TypeScript
- 后端：Node.js + Express + WebSocket (`ws`)
- 持久化：JSON 快照文件（`server/data/game.db`，文件格式为 JSON）
- 部署：Docker Compose（`web` + `server`）

## 本地开发

### 1) 安装依赖

```bash
pnpm install
```

### 2) 启动后端

```bash
pnpm dev:server
```

默认监听：`http://localhost:3001`

### 3) 启动前端

```bash
pnpm dev:web
```

默认监听：`http://localhost:5173`

Vite 已配置代理：
- `/api` -> `http://localhost:3001`
- `/ws` -> `ws://localhost:3001`

### 4) 生产构建

```bash
pnpm build:web
pnpm build:server
```

## Docker 部署

```bash
docker compose up -d --build
```

服务：
- `web`: 80 端口（Nginx 托管前端 + 反代 `/api` `/ws`）
- `server`: 3001 端口（内部）

持久化卷：
- `mooncake_data` -> `/data`

## 主要接口

- `POST /api/session` 创建临时会话
- `POST /api/rooms` 创建房间
- `POST /api/rooms/:roomCode/join` 加入房间
- `GET /api/rooms/:roomCode/state` 拉取房间快照
- `GET /healthz` 健康检查

WebSocket 路径：`/ws`

客户端消息：
- `room:start`
- `turn:roll`
- `turn:next`
- `room:leave`

服务端消息：
- `room:snapshot`
- `game:rolled`
- `game:turn_changed`
- `game:ended`
- `error`

## 目录结构

```text
shared/
  game-types.ts          # 前后端共享类型
server/
  src/
    index.ts             # HTTP + WS 入口
    room-manager.ts      # 房间、回合、会话管理
    game-engine.ts       # 骰子规则与判奖
    db.ts                # 持久化存储
src/
  App.vue                # 在线多人主界面
  composables/
    useOnlineGame.ts     # 前端实时连接与状态
```

## License

MIT
