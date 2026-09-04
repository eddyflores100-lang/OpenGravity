# OpenGravity Core — Telegram bot / agent core (Node + TypeScript)
# No native modules anymore (SQLite removed) → plain slim image, fast builds.
FROM node:24-slim

ENV NODE_ENV=production

WORKDIR /app

# Install ALL dependencies (tsc/tsx live in devDependencies), then compile
COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Prune dev deps for a lean runtime image
RUN npm prune --omit=dev

# The bot is a long-polling process (no HTTP listener needed)
CMD ["node", "dist/index.js"]
