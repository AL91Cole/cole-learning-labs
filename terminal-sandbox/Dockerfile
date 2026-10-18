# Backend Orchestration Server Dockerfile (Node.js 24 + node-pty + Docker CLI)
FROM node:24-alpine

# Install build dependencies for node-pty and Docker CLI to talk to host Docker socket
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    docker-cli \
    bash

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server.js ./
COPY public ./public

EXPOSE 8080

ENV NODE_ENV=production \
    PORT=8080

CMD ["node", "server.js"]
