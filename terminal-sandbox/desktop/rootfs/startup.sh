#!/bin/bash
# Starts one learner desktop. Settings arrive in the environment, the same
# contract as the earlier desktop image:
#   USER          the learner account (created here, never an administrator)
#   PASSWORD      the account password; nobody is told it, it only exists so
#                 the account is not passwordless
#   VNC_PASSWORD  the per-session screen password the controller hands out
#   RESOLUTION    the first screen size, WIDTHxHEIGHT; the browser can resize later
#   TZ            optional time zone name, for example America/New_York
# and three optional settings for the web browser (Firefox):
#   LAB_NETWORK   what the browser's start page says this machine can reach:
#                 offline (the default, also for any other value), sites (only
#                 the lab's sites) or filtered (the internet through a
#                 family-safe filter). It only changes the words on the page;
#                 the network itself is set up by whoever starts the machine.
#   LAB_SITES     comma-separated host names, for example example.com, linked
#                 on the start page as "Sites for this lab" when LAB_NETWORK is
#                 sites or filtered (at most 12; anything that is not a plain
#                 host name is left out)
#   DNS_SERVERS   comma-separated IPv4 addresses (at most 4; anything else is
#                 left out). When one is valid, /etc/resolv.conf lists only
#                 them, for example a family-safe filter; otherwise it stays as
#                 the container runtime wrote it.
set -u
umask 022

name=${USER:-learner}
# Letters spelled out: in this image's UTF-8 locale [a-z] also matches letters of other alphabets.
[[ $name =~ ^[abcdefghijklmnopqrstuvwxyz_][abcdefghijklmnopqrstuvwxyz0123456789_-]{0,31}$ ]] || name=learner
# Never an existing system account such as root: the desktop always runs as an ordinary user.
if id -u "$name" >/dev/null 2>&1 && [ "$(id -u "$name")" -lt 1000 ]; then name=learner; fi
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

# The checks below spell out their characters: in this UTF-8 locale, ranges
# such as [a-z] and [0-9] also match letters and digits of other scripts.
digit='[0123456789]'
letter_or_digit='[abcdefghijklmnopqrstuvwxyz0123456789]'

# Name servers, only from valid IPv4 addresses. The file stays root's and
# read-only for everyone else, so the learner cannot change it.
octet="(25[012345]|2[01234]$digit|1$digit$digit|[123456789]?$digit)"
ipv4="^$octet(\.$octet){3}$"
nameservers=()
IFS=, read -r -a entries <<< "${DNS_SERVERS:-}"
for entry in "${entries[@]}"; do
  entry=${entry//[[:space:]]/}
  if [[ $entry =~ $ipv4 ]] && [ ${#nameservers[@]} -lt 4 ]; then nameservers+=("$entry"); fi
done
if [ ${#nameservers[@]} -gt 0 ]; then
  # Written in place: the runtime may mount this file, so it cannot be replaced.
  { echo '# Name servers for this lab (DNS_SERVERS).'; printf 'nameserver %s\n' "${nameservers[@]}"; } > /etc/resolv.conf \
    && chown root:root /etc/resolv.conf && chmod 644 /etc/resolv.conf \
    || echo "startup: could not write /etc/resolv.conf" >&2
fi

# The web browser's start page (its fixed home page in the Firefox policies),
# written fresh at every start from LAB_NETWORK and LAB_SITES. Only values that
# pass the checks below reach the page.
network=${LAB_NETWORK:-offline}
case $network in sites|filtered) ;; *) network=offline ;; esac
label="$letter_or_digit([abcdefghijklmnopqrstuvwxyz0123456789-]{0,61}$letter_or_digit)?"
host_name="^$label(\.$label)+$"
sites=()
IFS=, read -r -a entries <<< "${LAB_SITES:-}"
for entry in "${entries[@]}"; do
  entry=${entry//[[:space:]]/}
  entry=${entry,,}
  [[ $entry =~ $host_name ]] && [ ${#entry} -le 253 ] || continue
  [[ " ${sites[*]} " == *" $entry "* ]] && continue
  [ ${#sites[@]} -lt 12 ] && sites+=("$entry")
done
unset LAB_NETWORK LAB_SITES DNS_SERVERS
write_start_page() {
  cat <<'HTML'
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lab computer</title>
<style>
  :root { color-scheme: light dark; --text: #1d1d1f; --muted: #4a4a50; --page: #f4f5f7; --card: #ffffff; --line: #d0d3d9; --link: #0b57d0; --note: #e8f0fe; --note-line: #0b57d0; }
  @media (prefers-color-scheme: dark) {
    :root { --text: #ececf1; --muted: #c2c2cc; --page: #1b1c1f; --card: #26272b; --line: #44464d; --link: #9cc0ff; --note: #1f2a3d; --note-line: #9cc0ff; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--page); color: var(--text); font: 1.125rem/1.6 Ubuntu, "DejaVu Sans", sans-serif; }
  main { max-width: 44rem; margin: 0 auto; padding: 2.5rem 1.25rem 3rem; }
  h1 { font-size: 2rem; line-height: 1.2; margin: 0 0 0.5rem; }
  h2 { font-size: 1.25rem; margin: 2rem 0 0.5rem; }
  p, ul { margin: 0 0 1rem; }
  li { margin-bottom: 0.5rem; }
  a { color: var(--link); text-underline-offset: 0.15em; }
  a:focus-visible { outline: 3px solid var(--link); outline-offset: 2px; border-radius: 2px; }
  code { font: 0.95em "Ubuntu Mono", "DejaVu Sans Mono", monospace; background: var(--card); border: 1px solid var(--line); border-radius: 4px; padding: 0.05em 0.35em; }
  .lead { color: var(--muted); }
  .status { background: var(--note); border-left: 6px solid var(--note-line); border-radius: 6px; padding: 1rem 1.25rem; margin: 1.5rem 0; }
  .status h2 { margin-top: 0; }
  .status p:last-child { margin-bottom: 0; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 6px; padding: 1rem 1.25rem; margin-bottom: 1.25rem; }
  .card ul { margin: 0; padding-left: 1.25rem; }
</style>
</head>
<body>
<main>
<h1>Lab computer</h1>
<p class="lead">This is a practice computer for your lab. It is erased when the lab ends, so you can try things without worrying.</p>
HTML
  case $network in
    offline) cat <<'HTML'
<section class="status" aria-labelledby="network">
<h2 id="network">This lab has no internet</h2>
<p>Websites on the internet will not load on this computer. That is expected. Nothing is broken.</p>
</section>
HTML
    ;;
    sites) cat <<'HTML'
<section class="status" aria-labelledby="network">
<h2 id="network">This lab can open only its own sites</h2>
<p>You can open the sites your lab lists. Other websites will not load. That is expected. Nothing is broken.</p>
</section>
HTML
    ;;
    filtered) cat <<'HTML'
<section class="status" aria-labelledby="network">
<h2 id="network">This lab can use the internet</h2>
<p>You can open the sites your lab lists and other websites too. A family-safe filter blocks sites that are not right for school, so a few pages may not load.</p>
</section>
HTML
    ;;
  esac
  if [ "$network" != offline ] && [ ${#sites[@]} -gt 0 ]; then
    printf '<h2>Sites for this lab</h2>\n<div class="card"><ul>\n'
    for site in "${sites[@]}"; do printf '<li><a href="https://%s/">%s</a></li>\n' "$site" "$site"; done
    printf '</ul></div>\n'
  fi
  cat <<'HTML'
<h2>Which websites work?</h2>
<p>That depends on the lab. Most labs have no internet, so websites will not load. That is expected, not broken. Labs about networks or online safety can open the sites they list, and some can open other sites through a family-safe filter.</p>
<h2>What you can always open</h2>
<div class="card"><ul>
HTML
  printf '<li><a href="file://%s">Your lab folder</a>: the files for your lab. Click a web page there to open it.</li>\n' "/home/$name/lab/"
  cat <<'HTML'
<li>Web pages that run on this computer. For example, open a terminal in a folder, type <code>python3 -m http.server</code>, then go to <a href="http://localhost:8000/">http://localhost:8000</a>.</li>
</ul></div>
<p>To come back to this page, click the Home button (the little house) or press Alt+Home.</p>
</main>
</body>
</html>
HTML
}
install -d -m 755 /usr/local/share/cll/browser
write_start_page > /usr/local/share/cll/browser/start.html
chmod 644 /usr/local/share/cll/browser/start.html

install -d -m 1777 /tmp/.X11-unix /tmp/.ICE-unix
uid=$(id -u "$name")
install -d -m 700 -o "$name" -g "$name" "/run/user/$uid"

export CLL_USER=$name CLL_GEOMETRY=$geometry CLL_TZ=$zone
exec /usr/bin/tini -s -g -- /usr/local/bin/cll-session
