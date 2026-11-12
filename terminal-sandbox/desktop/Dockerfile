# Learner desktop machine: Ubuntu 24.04 LTS with an XFCE desktop (the desktop of Xubuntu and
# Linux Mint XFCE), the everyday
# command-line tools of an ordinary Linux computer (manual pages included), a
# web browser (Firefox ESR), and a VNC screen the controller relays to the
# learner's browser.
#
# It is a drop-in replacement for the earlier desktop image and keeps its start
# contract, so the controller needs no other change than DESKTOP_IMAGE_REF:
#   /startup.sh reads USER, PASSWORD, VNC_PASSWORD and RESOLUTION, creates the
#   learner account (never an administrator), and serves the screen as raw VNC
#   on 127.0.0.1:5900 and as a WebSocket on port 6081.
# It also reads three optional settings for the web browser (see startup.sh):
#   LAB_NETWORK (offline, sites or filtered) and LAB_SITES (host names) decide
#   what the browser's start page tells the learner about the network, and
#   DNS_SERVERS (IPv4 addresses) replaces the name servers, for example with a
#   family-safe filter. Without them the start page says the lab is offline.
#
# Build (CI publishes it, see .github/workflows/desktop-image.yml):
#   docker build -t cole-learning-labs/desktop:noble terminal-sandbox/desktop
# Behind an HTTPS-only proxy, add:
#   --network host --build-arg APT_PROXY=http://127.0.0.1:PORT --secret id=apt_ca,src=/path/to/ca.crt
# The proxy settings and certificate are used during the build only and are not
# kept in the image.
FROM ubuntu:24.04@sha256:2198e4c65076e9cb0b3d695219df667c0e3b0072da64ca3c2648aca17dcecaf5

# The package this image is published as belongs to this repository. The label
# connects them, which is what lets the repository's workflow push new versions.
LABEL org.opencontainers.image.source="https://github.com/AL91Cole/cole-learning-labs" \
      org.opencontainers.image.title="Cole Learning Labs desktop" \
      org.opencontainers.image.description="Ubuntu 24.04 XFCE learner desktop for Cole Learning Labs real-machine labs"

ARG APT_PROXY=""
ENV DEBIAN_FRONTEND=noninteractive LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 TZ=Etc/UTC

# The container base image is minimised: it deletes manual pages and replaces
# `man` with a notice. Undo that first so every package installed below keeps
# its documentation, as it would on an installed system.
RUN --mount=type=secret,id=apt_ca,required=false,mode=0444 \
    set -eux; \
    if [ -n "$APT_PROXY" ]; then \
      printf 'Acquire::https::Proxy "%s";\nAcquire::http::Proxy "%s";\n' "$APT_PROXY" "$APT_PROXY" > /etc/apt/apt.conf.d/00build-proxy; \
      if [ -f /run/secrets/apt_ca ]; then printf 'Acquire::https::CaInfo "/run/secrets/apt_ca";\n' >> /etc/apt/apt.conf.d/00build-proxy; fi; \
      sed -i 's#http://#https://#g' /etc/apt/sources.list.d/ubuntu.sources; \
    fi; \
    rm -f /etc/dpkg/dpkg.cfg.d/excludes; \
    userdel -r ubuntu 2>/dev/null || true; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
      man-db manpages manpages-dev less locales tzdata ca-certificates tini sudo \
      bash-completion nano vim-tiny vim git tree file zip unzip xz-utils bzip2 htop procps psmisc lsof \
      iputils-ping dnsutils net-tools iproute2 traceroute netcat-openbsd curl wget openssh-client rsync \
      python3 python3-pip python3-venv python-is-python3 gcc g++ make bc jq sqlite3 time cron \
      tigervnc-standalone-server tigervnc-tools websockify dbus-x11 x11-xserver-utils x11-utils xdg-utils \
      xclip xsel xdotool \
      xfce4-session xfwm4 xfce4-panel xfdesktop4 xfce4-settings xfconf xfce4-terminal xfce4-appfinder \
      xfce4-taskmanager xfce4-notifyd xfce4-screenshooter xfce4-whiskermenu-plugin thunar thunar-archive-plugin \
      mousepad ristretto xarchiver galculator librsvg2-common gvfs \
      greybird-gtk-theme elementary-xfce-icon-theme adwaita-icon-theme fonts-dejavu-core fonts-ubuntu fonts-noto-mono; \
    if dpkg-divert --list /usr/bin/man | grep -q man.REAL; then rm -f /usr/bin/man; dpkg-divert --quiet --local --rename --remove /usr/bin/man; fi; \
    # Restore the manual pages the minimised base image removed from its own packages.
    apt-get install -y --no-install-recommends --reinstall coreutils bash grep sed findutils tar gzip util-linux procps login passwd diffutils mount hostname debianutils; \
    mandb -q || true; \
    sed -i 's/^# *en_US.UTF-8/en_US.UTF-8/' /etc/locale.gen; locale-gen; update-locale LANG=en_US.UTF-8; \
    rm -f /etc/apt/apt.conf.d/00build-proxy; \
    sed -i 's#https://#http://#g' /etc/apt/sources.list.d/ubuntu.sources; \
    apt-get clean; rm -rf /var/lib/apt/lists/* /var/cache/apt/*.bin /var/log/apt /var/log/dpkg.log; \
    mkdir -p /etc/vnc

# The web browser: Firefox ESR, the release managed school computers use, as a
# normal package from Mozilla's own repository (Ubuntu's "firefox" package only
# installs the snap, and snaps do not run in containers). The repository key is
# part of this source tree and must be Mozilla's published key before apt uses
# it; the pin makes Mozilla's packages win over Ubuntu's. The school settings
# are enterprise policies in /etc/firefox/policies/policies.json: no telemetry,
# studies, sign-in, first-run or what's-new pages; the lab start page; safe
# search; no add-ons; and nothing that could get around the machine's name
# servers (DNS over HTTPS, Firefox's built-in VPN and the proxy setting are
# locked off). Its locked preferences keep Firefox small and stable in a
# container without a graphics card: software rendering and few processes
# (web pages share them instead of one process per site, see
# /usr/lib/firefox-esr/defaults/pref/cll-lab.js, which policies cannot set).
COPY rootfs/etc/apt/ /etc/apt/
RUN --mount=type=secret,id=apt_ca,required=false,mode=0444 \
    set -eux; \
    gnupghome=$(mktemp -d); \
    fingerprint=$(GNUPGHOME="$gnupghome" gpg --batch --show-keys --with-colons /etc/apt/keyrings/packages.mozilla.org.asc \
      | awk -F: '$1 == "pub" { pub = 1; next } pub && $1 == "fpr" { print $10; pub = 0 }'); \
    rm -rf "$gnupghome"; \
    if [ "$fingerprint" != 35BAA0B33E9EB396F59CA838C0BA5CE6DC6315A3 ]; then echo "Unexpected Mozilla repository key: '$fingerprint'" >&2; exit 1; fi; \
    if [ -n "$APT_PROXY" ]; then \
      printf 'Acquire::https::Proxy "%s";\nAcquire::http::Proxy "%s";\n' "$APT_PROXY" "$APT_PROXY" > /etc/apt/apt.conf.d/00build-proxy; \
      if [ -f /run/secrets/apt_ca ]; then printf 'Acquire::https::CaInfo "/run/secrets/apt_ca";\n' >> /etc/apt/apt.conf.d/00build-proxy; fi; \
      sed -i 's#http://#https://#g' /etc/apt/sources.list.d/ubuntu.sources; \
    fi; \
    apt-get update; \
    apt-get install -y --no-install-recommends firefox-esr; \
    rm -f /etc/apt/apt.conf.d/00build-proxy; \
    sed -i 's#https://#http://#g' /etc/apt/sources.list.d/ubuntu.sources; \
    apt-get clean; rm -rf /var/lib/apt/lists/* /var/cache/apt/*.bin /var/log/apt /var/log/dpkg.log

# Desktop settings, the start scripts and the learner's default files. Copied
# after the packages so they replace the packages' defaults.
COPY rootfs/ /
RUN set -eux; \
    chmod 755 /startup.sh /usr/local/bin/cll-session /usr/local/bin/cll-vnc-relay /usr/local/bin/cll-open-lab; \
    python3 -m json.tool /etc/firefox/policies/policies.json >/dev/null; \
    test -x /usr/lib/firefox-esr/firefox-bin; test -f /usr/lib/firefox-esr/defaults/pref/cll-lab.js; \
    sh /usr/local/share/cll/configure-desktop.sh; rm -rf /usr/local/share/cll/configure-desktop.sh

# Desktop image contract with the controller: 6081 is the screen WebSocket.
EXPOSE 6081
ENTRYPOINT []
CMD ["/startup.sh"]
