# Reviewed upstream image digests. Refresh deliberately with dependency checks.
FROM docker:29-cli@sha256:6fae2214c3121a28d5aa639d09032f61310b7c9c75ffbad1025f261a1b621800 AS dockercli
FROM node:24-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=dockercli /usr/local/bin/docker /usr/local/bin/docker
WORKDIR /app
COPY package.json package-lock.json ./
# node-pty is a native dependency; its reviewed install/build scripts are required.
RUN npm ci --omit=dev && npm cache clean --force
RUN node -e "require('node-pty')"
COPY server.js ./
COPY public ./public
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 SANDBOX_ENABLED=false
EXPOSE 8080
CMD ["node", "server.js"]
