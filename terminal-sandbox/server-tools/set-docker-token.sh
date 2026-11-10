#!/bin/bash
# Replaces the Docker access token the controller uses for Docker Cloud
# Sandboxes. The token is typed or pasted hidden, checked with Docker BEFORE
# anything is changed, then written to the root-only settings file and the
# controller is restarted. Run as root on the controller host:
#
#   bash set-docker-token.sh           replace the token
#   bash set-docker-token.sh --check   only test the token that is saved now
#
# It uses the layout of the first-boot deployment under /opt/cll; set
# CLL_ENV_FILE and CLL_COMPOSE_FILE for another layout. The token is never
# printed or passed on a command line.
set -euo pipefail
ENV_FILE="${CLL_ENV_FILE:-/opt/cll/cole-learning-labs-private-labs/deploy/.env.production}"
COMPOSE_FILE="${CLL_COMPOSE_FILE:-/opt/cll/cole-learning-labs-private-labs/deploy/docker-compose.cloud.yml}"
[ -f "$ENV_FILE" ] || { echo "Settings file not found: $ENV_FILE"; exit 1; }
DOCKER_ID=$(grep -E '^DOCKER_ID=' "$ENV_FILE" | head -n 1 | cut -d= -f2-)
[ -n "$DOCKER_ID" ] || { echo "DOCKER_ID is missing from $ENV_FILE"; exit 1; }

check_token() {
  # Prints Docker's HTTP status for the token exchange. The body goes to stdin
  # so the token never appears in the process list.
  printf '{"identifier":"%s","secret":"%s"}' "$DOCKER_ID" "$1" |
    curl -sS -m 20 -o /dev/null -w '%{http_code}' -X POST https://hub.docker.com/v2/auth/token \
      -H 'Content-Type: application/json' --data-binary @- || echo 000
}

if [ "${1:-}" = "--check" ]; then
  CURRENT=$(grep -E '^DOCKER_PAT=' "$ENV_FILE" | tail -n 1 | cut -d= -f2-)
  echo "Saved token: ${#CURRENT} characters. Docker answers HTTP $(check_token "$CURRENT") (200 means it works)."
  exit 0
fi

read -r -s -p "Paste the new Docker personal access token, then press Enter: " TOKEN
echo
TOKEN=$(printf '%s' "$TOKEN" | tr -d '[:space:]')
case "$TOKEN" in
  dckr_pat_*) ;;
  *) echo "That does not look like a Docker token (it should start with dckr_pat_). Nothing changed."; exit 1 ;;
esac
STATUS=$(check_token "$TOKEN")
if [ "$STATUS" != "200" ]; then
  echo "Docker refused this token for $DOCKER_ID (HTTP $STATUS, ${#TOKEN} characters received)."
  echo "Nothing changed. A web console can drop characters from a long paste: paste again,"
  echo "or generate a new token. The controller keeps using the token it already has."
  exit 1
fi
umask 077
grep -v '^DOCKER_PAT=' "$ENV_FILE" > "$ENV_FILE.new"
printf 'DOCKER_PAT=%s\n' "$TOKEN" >> "$ENV_FILE.new"
chmod 600 "$ENV_FILE.new"
mv "$ENV_FILE.new" "$ENV_FILE"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d
echo "Docker accepted the token. It is saved and the controller has restarted."
