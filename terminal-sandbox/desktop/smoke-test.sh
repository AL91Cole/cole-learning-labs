#!/bin/sh
# Starts the desktop image the way the host-container backend does (no network,
# no administrator rights) and checks what a learner relies on: the desktop
# comes up as the learner, the screen answers through the relay, everyday tools
# and manual pages are present, the clock follows TZ and there is no network.
#   sh terminal-sandbox/desktop/smoke-test.sh [image]
set -eu
image=${1:-cole-learning-labs/desktop:noble}
name=cll-desktop-smoke-$$
cleanup() { docker rm -f "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM
fail() { echo "SMOKE_FAIL: $*" >&2; docker exec "$name" ps -eo user,args 2>/dev/null | head -40 >&2 || true; exit 1; }
in_machine() { docker exec -u learner -e DISPLAY=:1 "$name" sh -c "$1"; }

docker run -d --name "$name" --hostname lab-pc --network none \
  --cap-drop=ALL --cap-add CHOWN --cap-add DAC_OVERRIDE --cap-add FOWNER --cap-add SETUID --cap-add SETGID --cap-add KILL --cap-add AUDIT_WRITE \
  --security-opt no-new-privileges:true --memory=2048m --pids-limit=512 --shm-size 256m \
  --tmpfs /tmp:rw,nosuid,nodev,size=256m,mode=1777 \
  -e USER=learner -e PASSWORD=Smoke1234567890a -e VNC_PASSWORD=Smoke123 -e RESOLUTION=1280x800 -e TZ=America/New_York \
  "$image" /startup.sh >/dev/null

n=0
until docker exec "$name" pgrep -u learner -x xfce4-panel >/dev/null 2>&1 && docker exec "$name" pgrep -u learner -x xfdesktop >/dev/null 2>&1; do
  n=$((n + 1)); [ "$n" -le 90 ] || fail "the desktop did not start"; sleep 1
done

[ "$(docker exec "$name" id -u learner)" = 1000 ] || fail "the learner is not uid 1000"
[ "$(docker exec "$name" id -Gn learner)" = learner ] || fail "the learner has extra groups: $(docker exec "$name" id -Gn learner)"
docker exec "$name" pgrep -u learner -x Xvnc >/dev/null || fail "the screen server does not run as the learner"
docker exec "$name" pgrep -u root -x Xvnc >/dev/null && fail "the screen server runs as root"
handshake=$( (sleep 3) | docker exec -i -u 65534:65534 "$name" /usr/local/bin/cll-vnc-relay | head -c 12 || true)
[ "$handshake" = "RFB 003.008" ] || fail "the screen relay did not answer (got '$handshake')"
in_machine 'command -v man less nano vim git tree htop python3 gcc make ping ip ssh xfce4-terminal thunar mousepad >/dev/null' || fail "everyday tools are missing"
in_machine 'man -w ls >/dev/null && man -w chmod >/dev/null' || fail "manual pages are missing"
zone=$(in_machine 'date +%Z'); case "$zone" in EST|EDT) ;; *) fail "the clock ignores TZ ($zone)" ;; esac
in_machine 'ping -c1 -W1 1.1.1.1 >/dev/null 2>&1' && fail "the machine reached the network"
in_machine 'xrandr | head -1' | grep -q 'current 1280 x 800' || fail "the screen is not 1280x800"
echo SMOKE_OK
