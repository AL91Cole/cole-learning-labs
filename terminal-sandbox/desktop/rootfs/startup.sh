#!/bin/bash
# Starts one learner desktop. Settings arrive in the environment, the same
# contract as the earlier desktop image:
#   USER          the learner account (created here, never an administrator)
#   PASSWORD      the account password; nobody is told it, it only exists so
#                 the account is not passwordless
#   VNC_PASSWORD  the per-session screen password the controller hands out
#   RESOLUTION    the first screen size, WIDTHxHEIGHT; the browser can resize later
#   TZ            optional time zone name, for example America/New_York
set -u
umask 022

name=${USER:-learner}
[[ $name =~ ^[a-z_][a-z0-9_-]{0,31}$ ]] || name=learner
geometry=${RESOLUTION:-1280x800}
[[ $geometry =~ ^[0-9]{3,4}x[0-9]{3,4}$ ]] || geometry=1280x800
zone=${TZ:-Etc/UTC}
if ! [[ $zone =~ ^[A-Za-z_]+(/[A-Za-z0-9_+-]+){0,2}$ ]] || [ ! -f "/usr/share/zoneinfo/$zone" ]; then zone=Etc/UTC; fi
ln -sf "/usr/share/zoneinfo/$zone" /etc/localtime
echo "$zone" > /etc/timezone

if ! id -u "$name" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash --user-group --uid 1000 "$name" 2>/dev/null \
    || useradd --create-home --shell /bin/bash --user-group "$name"
fi
# No administrator rights, whatever the account had before.
for group in sudo adm; do gpasswd -d "$name" "$group" >/dev/null 2>&1 || true; done
if [ -n "${PASSWORD:-}" ]; then
  printf '%s:%s\n' "$name" "$PASSWORD" | chpasswd
else
  passwd -l "$name" >/dev/null
fi

# The screen password, readable by the screen server only.
screen_password=${VNC_PASSWORD:-}
if [ ${#screen_password} -lt 6 ]; then screen_password=$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 12); fi
install -d -m 755 /etc/vnc
printf '%s\n' "$screen_password" | vncpasswd -f > /etc/vnc/passwd
chown "$name" /etc/vnc/passwd
chmod 600 /etc/vnc/passwd
unset PASSWORD VNC_PASSWORD screen_password

install -d -m 1777 /tmp/.X11-unix /tmp/.ICE-unix
uid=$(id -u "$name")
install -d -m 700 -o "$name" -g "$name" "/run/user/$uid"

export CLL_USER=$name CLL_GEOMETRY=$geometry CLL_TZ=$zone
exec /usr/bin/tini -s -g -- /usr/local/bin/cll-session
