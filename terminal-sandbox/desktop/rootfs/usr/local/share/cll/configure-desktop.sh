#!/bin/sh
# Build-time adjustments to package defaults that are easier to patch than to copy.
set -eux
shortcuts=/etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xfce4-keyboard-shortcuts.xml
# The Windows key opens the menu, and Alt+F1 opens the panel's menu (whisker),
# as on Xubuntu and Linux Mint. Ctrl+Alt+T (terminal), Super+E (files),
# Ctrl+Shift+Esc (task manager) and Print (screenshot) are XFCE defaults.
sed -i 's#value="xfce4-popup-applicationsmenu"#value="xfce4-popup-whiskermenu"#' "$shortcuts"
sed -i 's#\(<property name="&lt;Alt&gt;F1"[^>]*/>\)#\1\n      <property name="Super_L" type="string" value="xfce4-popup-whiskermenu"/>#' "$shortcuts"
grep -q 'name="Super_L"' "$shortcuts"
# Firefox has its own menu entry, so XFCE's generic "Web Browser" entry would
# only show it twice; there is no mail program; no screen locker, which would
# ask for a password nobody knows; no colour-profile daemon.
rm -f /usr/share/applications/xfce4-web-browser.desktop /usr/share/applications/xfce4-mail-reader.desktop \
  /usr/share/applications/xfce4-color-settings.desktop /usr/share/applications/org.xfce.mousepad-settings.desktop \
  /etc/xdg/autostart/xscreensaver.desktop /etc/xdg/autostart/light-locker.desktop
# A friendly helper in every new terminal.
cat >> /etc/skel/.bashrc <<'BASHRC'

# Lab computer: usually no internet, nothing here is private. Type `help-lab` for tips.
help-lab() {
  printf '%s\n' \
    'Lab computer tips' \
    '  man COMMAND       read the manual for a command (q leaves it)' \
    '  COMMAND --help    a shorter summary' \
    '  Tab               completes file and command names' \
    '  Up / Down         earlier commands; history lists them' \
    '  Ctrl+C            stops the running command' \
    '  Ctrl+Shift+C/V    copy and paste in the terminal' \
    '  Most labs have no internet access; your lab page says if this one does.' \
    '  This computer is erased when the lab ends.'
}
BASHRC
mandb -q || true
