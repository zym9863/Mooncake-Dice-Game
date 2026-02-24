FROM node:20-alpine AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY server/tsconfig.json server/tsconfig.json
COPY server/src server/src
COPY shared shared

RUN corepack enable
RUN pnpm install --no-frozen-lockfile
RUN pnpm build:server

FROM node:20-alpine AS runtime

WORKDIR /app

COPY --from=build /app/package.json /app/pnpm-lock.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/dist ./server/dist

ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/data/game.db

EXPOSE 3001

CMD ["node", "server/dist/server/src/index.js"]

