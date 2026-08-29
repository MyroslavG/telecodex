FROM node:22-alpine

RUN apk add --no-cache git github-cli openssh-client bash

WORKDIR /app

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run build

ENV PATH="/app/node_modules/.bin:${PATH}" \
  GIT_CONFIG_GLOBAL=/home/telecodex/.config/git/config

RUN adduser -D -u 1001 telecodex \
  && mkdir -p /workspace /data/projects /data/config /home/telecodex/.codex /home/telecodex/.config/gh /home/telecodex/.config/git /home/telecodex/.ssh \
  && chown -R telecodex:telecodex /workspace /data /home/telecodex

USER telecodex

CMD ["node", "dist/index.js"]
