#!/bin/sh
# Starts the desktop image the way the host-container backend does (no network,
# no administrator rights) and checks what a learner relies on: the desktop
# comes up as the learner, the screen answers through the relay, everyday tools
# and manual pages are present, the clock follows TZ, there is no network, and
# Firefox runs with the lab's policies and start page. A second, short start
# checks the browser settings (LAB_NETWORK, LAB_SITES, DNS_SERVERS).
#   sh terminal-sandbox/desktop/smoke-test.sh [image]
set -eu
image=${1:-cole-learning-labs/desktop:noble}
name=cll-desktop-smoke-$$
cleanup() { docker rm -f "$name" "$name-net" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM
fail() { echo "SMOKE_FAIL: $*" >&2; docker exec "$name" ps -eo user,args 2>/dev/null | head -40 >&2 || true; exit 1; }
in_machine() { docker exec -u learner -e DISPLAY=:1 "$name" sh -c "$1"; }
start_machine() {
  container=$1; shift
  docker run -d --name "$container" --hostname lab-pc --network none \
    --cap-drop=ALL --cap-add CHOWN --cap-add DAC_OVERRIDE --cap-add FOWNER --cap-add SETUID --cap-add SETGID --cap-add KILL --cap-add AUDIT_WRITE \
    --security-opt no-new-privileges:true --memory=2048m --pids-limit=512 --shm-size 256m \
    --tmpfs /tmp:rw,nosuid,nodev,size=256m,mode=1777 \
    -e USER=learner -e PASSWORD=Smoke1234567890a -e VNC_PASSWORD=Smoke123 -e RESOLUTION=1280x800 -e TZ=America/New_York \
    "$@" "$image" /startup.sh >/dev/null
}
start_page=/usr/local/share/cll/browser/start.html

start_machine "$name"

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
# Lab windows fit above the taskbar: the usual terminal size on this screen, a shorter one on a short screen.
[ "$(in_machine /usr/local/bin/cll-terminal-size)" = 96x26 ] || fail "the terminal size for a 1280x800 screen is not 96x26"
in_machine 'xrandr --fb 1280x560 >/dev/null 2>&1; s=$(/usr/local/bin/cll-terminal-size); xrandr --fb 1280x800 >/dev/null 2>&1; echo "$s"' | grep -qx 96x20 || fail "a 560-pixel screen does not get a shorter terminal"
in_machine 'grep -q cll-terminal-size /etc/xdg/autostart/cll-terminal-size.desktop' || fail "new terminals are not sized for the screen"
# When the screen gets smaller, windows are moved back above the taskbar.
n=0; until docker exec "$name" pgrep -u learner -f cll-keep-windows >/dev/null 2>&1; do n=$((n + 1)); [ "$n" -le 20 ] || fail "the window keeper did not start"; sleep 1; done
in_machine '(xfce4-terminal --geometry=96x26 >/dev/null 2>&1 &); sleep 3; xrandr --fb 1280x560 >/dev/null 2>&1; sleep 5
  w=$(xdotool search --onlyvisible --class xfce4-terminal | tail -1); set -- $(xwininfo -id "$w" | sed -n "s/.*Absolute upper-left Y: *//p; s/^ *Height: *//p")
  bottom=$(($1 + $2)); area=$(xprop -root _NET_WORKAREA | sed "s/.*= *[0-9]*, *[0-9]*, *[0-9]*, *\([0-9]*\).*/\1/")
  xrandr --fb 1280x800 >/dev/null 2>&1; pkill -x xfce4-terminal; [ "$bottom" -le "$area" ]' || fail "a window stayed under the taskbar after the screen got smaller"

# The web browser: Firefox ESR, its policies (DNS over HTTPS locked off, so a
# filtering resolver cannot be bypassed) and the start page, offline by default.
in_machine 'firefox-esr --version 2>/dev/null' | grep -q '^Mozilla Firefox [0-9.]*esr' || fail "Firefox ESR does not run as the learner"
docker exec "$name" jq -e '.policies.DNSOverHTTPS == {"Enabled": false, "Locked": true}' /etc/firefox/policies/policies.json >/dev/null \
  || fail "the Firefox policies are not valid JSON or do not lock DNS over HTTPS off"
in_machine 'test -w /etc/firefox/policies/policies.json' && fail "the learner can change the Firefox policies"
docker exec "$name" grep -q 'This lab has no internet' "$start_page" || fail "the start page does not say the lab is offline"
docker exec "$name" grep -q 'Sites for this lab' "$start_page" && fail "the offline start page lists sites"
docker exec -u learner -e HOME=/home/learner -w /home/learner "$name" sh -c \
  "rm -f /tmp/start.png; timeout 60 firefox-esr --headless --screenshot /tmp/start.png file://$start_page >/tmp/firefox-headless.log 2>&1 && test -s /tmp/start.png" \
  || fail "headless Firefox could not open the start page: $(docker exec "$name" tail -5 /tmp/firefox-headless.log 2>&1)"
# Many sites at once stay within the process limit: ordinary sites share a few
# content processes instead of one process (about 20 threads) per site, which
# used up the 512 pids after about 15 sites (see cll-lab.js).
set -- $(docker exec -u learner -e HOME=/home/learner -w /tmp "$name" sh -c '
  mkdir -p /tmp/sites; for i in 2 3 4 5 6 7 8 9; do echo "site $i" > /tmp/sites/$i.html; done
  (cd /tmp/sites && exec python3 -m http.server 8123 >/tmp/sites.log 2>&1) & server=$!
  urls=; for i in 2 3 4 5 6 7 8 9; do urls="$urls http://127.0.0.$i:8123/$i.html"; done
  firefox-esr --headless --no-remote --profile "$(mktemp -d)" $urls >/tmp/firefox-sites.log 2>&1 & firefox=$!
  n=0; until [ "$(grep -c "GET /[2-9].html" /tmp/sites.log)" -ge 8 ] || [ "$n" -ge 60 ]; do n=$((n + 1)); sleep 1; done
  sleep 2
  echo "$(grep -c "GET /[2-9].html" /tmp/sites.log) $(pgrep -c -u learner -x "Isolated Web Co")"
  kill "$firefox" "$server"
  n=0; while kill -0 "$firefox" 2>/dev/null && [ "$n" -lt 15 ]; do n=$((n + 1)); sleep 1; done' 2>/dev/null)
[ "${1:-0}" -ge 8 ] || fail "headless Firefox did not open 8 local sites at once (opened ${1:-0})"
[ "${2:-1}" -eq 0 ] || fail "Firefox gave ${2:-?} ordinary sites a process each (fission.webContentIsolationStrategy is not 2)"

# A machine for an online lab: valid sites and name servers are used, the rest
# is left out, and the learner cannot change the name servers.
start_machine "$name-net" -e LAB_NETWORK=filtered -e 'LAB_SITES=example.com,bad_host!,exämple.com' -e 'DNS_SERVERS=185.228.168.168,not-an-ip,１.１.１.１'
n=0
until docker exec "$name-net" pgrep -x Xvnc >/dev/null 2>&1; do
  n=$((n + 1)); [ "$n" -le 30 ] || fail "the second machine did not start"; sleep 1
done
docker exec "$name-net" grep -q 'This lab can use the internet' "$start_page" || fail "the start page ignores LAB_NETWORK=filtered"
docker exec "$name-net" grep -q '<a href="https://example.com/">example.com</a>' "$start_page" || fail "the start page does not link the lab's site"
[ "$(docker exec "$name-net" grep -c '<li><a href="https://' "$start_page")" = 1 ] || fail "the start page shows an invalid host name"
nameservers=$(docker exec "$name-net" grep '^nameserver' /etc/resolv.conf)
[ "$nameservers" = "nameserver 185.228.168.168" ] || fail "resolv.conf has the wrong name servers: $nameservers"
[ "$(docker exec "$name-net" stat -c '%U %a' /etc/resolv.conf)" = "root 644" ] || fail "resolv.conf is not root's"
docker exec -u learner "$name-net" sh -c 'test -w /etc/resolv.conf' && fail "the learner can change the name servers"
docker rm -f "$name-net" >/dev/null
echo SMOKE_OK
