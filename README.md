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

## GitHub Actions 自动部署（推送即发布）

仓库已提供工作流：`.github/workflows/deploy.yml`

触发方式：
- push 到 `main`
- 手动触发（`workflow_dispatch`）

### 服务器前置条件

1. 服务器已安装 Docker + Docker Compose
2. 服务器上已克隆本仓库（例如：`/opt/Mooncake-Dice-Game`）
3. 部署用户有权限执行：`git`、`docker compose`

### GitHub Secrets 配置

在仓库 `Settings -> Secrets and variables -> Actions` 添加：

- `DEPLOY_HOST`：服务器 IP 或域名
- `DEPLOY_PORT`：SSH 端口（可选，默认 22）
- `DEPLOY_USER`：SSH 用户名
- `DEPLOY_SSH_KEY`：私钥内容（建议专用 deploy key）
- `DEPLOY_PATH`：服务器上的项目路径（如 `/opt/Mooncake-Dice-Game`）

### 工作流执行命令

工作流会在服务器执行：

```bash
cd $DEPLOY_PATH
git fetch --all
git checkout main
git pull origin main
docker compose up -d --build --remove-orphans
```

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
