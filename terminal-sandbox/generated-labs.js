// GENERATED FILE. Do not edit by hand.
// Source: terminal-sandbox/scripts/generate-labs.mjs, from the site's lab models.
// Regenerate with: node terminal-sandbox/scripts/generate-labs.mjs
const DATA = {
 "NET-202": {
  "id": "NET-202",
  "title": "The Share That Will Not Open (real machine)",
  "track": "Networking & Operating Systems",
  "grade": "Grades 9–10",
  "minutes": 25,
  "summary": "Find why a teacher can browse the web but cannot read a shared handout.",
  "markdown": "# NET-202 · The Share That Will Not Open\n\n> **Lab Brief:** *“I can browse the web on School-Guest, but Project Materials will not open. I only need to read it. The correct folder and Read permission are already selected.”*\n\n## Your machine\n\nA real Linux machine with no network. The lab files are in `~/lab`.\n\n## Step-by-Step Instructions\n\n### Step 1: Read the case\n```sh\ncd ~/lab && cat README.txt case/brief.txt\n```\n\n### Step 2: Inspect the settings and the device readouts\n```sh\ncat settings.conf\nsh inspect.sh\n```\n\n### Step 3: Change a setting and test\n```sh\npython3 edit.py settings.conf\nsh test.sh\n```\n\nRepeat until `sh test.sh` prints `ALL_CHECKS_PASS`.\n",
  "milestones": [
   {
    "id": "m1-read-case",
    "title": "Read the case",
    "description": "Open the request and what is known before changing anything.",
    "hint": "Run: `cat ~/lab/case/brief.txt`",
    "checkType": "history_regex",
    "patternSource": "(?:cat|less|more|head)\\s+.*(?:brief\\.txt|README\\.txt)"
   },
   {
    "id": "m2-inspect",
    "title": "Inspect the settings and a device readout",
    "description": "Read settings.conf and run at least one readout.",
    "hint": "Run: `cat ~/lab/settings.conf` then `sh ~/lab/inspect.sh 1`",
    "checkType": "history_regex",
    "patternSource": "sh\\s+.*inspect\\.sh\\s+\\S"
   },
   {
    "id": "m3-settings",
    "title": "Every setting meets the request",
    "description": "Change settings.conf so each requirement in the case is met.",
    "hint": "Change one line with `python3 ~/lab/edit.py ~/lab/settings.conf`, then compare the readouts with case/brief.txt.",
    "checkType": "file_contains_all",
    "filePath": "/home/learner/lab/settings.conf",
    "expectedSubstrings": [
     "network=staff-lab",
     "folder=project-materials",
     "permission=read"
    ]
   },
   {
    "id": "m4-test",
    "title": "The full test passes",
    "description": "Run the test after your last change until every requirement passes.",
    "hint": "Run: `cd ~/lab && sh test.sh`",
    "checkType": "file_contains",
    "filePath": "/home/learner/lab/results.txt",
    "expectedSubstring": "ALL_CHECKS_PASS"
   }
  ],
  "files": [
   {
    "path": "README.txt",
    "content": "NET-202 · The Share That Will Not Open\n\nLet an authorized teacher read Project Materials through the approved staff\nnetwork.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-202 · The Share That Will Not Open\n\nRequested by: Ms. Bell · Project studio\n\nTHE REQUEST\n“I can browse the web on School-Guest, but Project Materials will not open. I\nonly need to read it. The correct folder and Read permission are already\nselected.”\n\nGOAL\nLet an authorized teacher read Project Materials through the approved staff\nnetwork.\n\nWHAT IS KNOWN\n- Read network policy: School-Guest is isolated from internal file shares.\nStaff-Lab is the approved network for this fictional teacher workstation.\n- Read the access request: Project Materials and Read permission are already\nselected. Keep access limited to this handout.\n- Inspect the account: The fictional account is a verified teacher account. No\npassword or sign-in is needed in this simulation.\n\nQUESTIONS ALREADY ANSWERED\n- What must the teacher do? Open and read the project handout.\n- Should I share every folder? No. Only Project Materials is part of the\nrequest.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# FILE SHARE ACCESS · PROJECT MATERIALS\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Connected network\n#    school-guest   School-Guest\n#    staff-lab      Staff-Lab\nnetwork=school-guest\n\n# Folder to share\n#    all-folders         All folders\n#    project-materials   Project Materials\n#    no-folders          No folders\nfolder=project-materials\n\n# What the teacher can do\n#    full-control   Full control\n#    modify         Modify\n#    read           Read\n#    none           None\npermission=read\n"
   },
   {
    "path": "inspect.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Shows a device readout for the settings saved in settings.conf right now.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='network folder permission'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\ncase \"$*\" in\n  1|'show network') n=1 ;;\n  2|'show share') n=2 ;;\n  3|'test teacher access') n=3 ;;\n  *)\n    echo \"Device readouts for this lab (they follow settings.conf):\"\n    echo '  sh inspect.sh 1    show network'\n    echo '  sh inspect.sh 2    show share'\n    echo '  sh inspect.sh 3    test teacher access'\n    exit 0 ;;\nesac\ntext=$(lookup \"R|$n|$state\")\nif [ -n \"$text\" ]; then printf '%b\\n' \"$text\"; else unknown; fi\n"
   },
   {
    "path": "test.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Checks settings.conf against every requirement of this lab and records the\n# result in results.txt. Run it again after each change.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='network folder permission'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\n: > results.txt\nflags=$(lookup \"T|$state\")\nif [ -z \"$flags\" ]; then unknown | tee -a results.txt; exit 1; fi\ni=0; pass=0; total=0\nwhile IFS= read -r label; do\n  i=$((i + 1)); total=$((total + 1))\n  if [ \"$(echo \"$flags\" | cut -d' ' -f$i)\" = 1 ]; then line=\"PASS   $label\"; pass=$((pass + 1)); else line=\"CHECK  $label\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_REQUIREMENTS'\nInternal share is reachable on Staff-Lab\nOnly Project Materials is shared\nTeacher can read without edit or administrator rights\nLAB_REQUIREMENTS\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_CHECKS_PASS\"; else line=\"$pass of $total requirements pass. Compare case/brief.txt and the readouts with settings.conf, change one setting, and test again.\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
   },
   {
    "path": "edit.py",
    "mode": 493,
    "content": "#!/usr/bin/env python3\n\"\"\"edit.py: a small line editor for the lab files.\n\n    python3 ~/lab/edit.py FILE\n\nIt shows the file with line numbers. Type a line number to change that line,\na to add a line at the end, d NUMBER to delete a line, s to save and quit,\nor q to quit without saving.\"\"\"\nimport sys\n\ntry:\n    import readline\nexcept ImportError:  # the editor still works without line recall\n    readline = None\n\n\ndef ask(prompt, prefill=\"\"):\n    if readline and prefill:\n        readline.set_startup_hook(lambda: readline.insert_text(prefill))\n    try:\n        return input(prompt)\n    finally:\n        if readline:\n            readline.set_startup_hook(None)\n\n\ndef show(lines):\n    print()\n    for number, line in enumerate(lines, 1):\n        print(f\"{number:3} | {line}\")\n    print()\n\n\ndef main():\n    if len(sys.argv) != 2:\n        print(__doc__)\n        return 1\n    name = sys.argv[1]\n    try:\n        with open(name, encoding=\"utf-8\") as handle:\n            lines = handle.read().split(\"\\n\")\n        if lines and lines[-1] == \"\":\n            lines.pop()\n    except FileNotFoundError:\n        lines = []\n    changed = False\n    show(lines)\n    while True:\n        try:\n            command = input(\"line number, a = add, d N = delete, s = save, q = quit: \").strip()\n        except EOFError:\n            command = \"q\"\n        if command == \"q\":\n            if changed and input(\"Quit without saving? (y/n): \").strip().lower() != \"y\":\n                continue\n            return 0\n        if command == \"s\":\n            with open(name, \"w\", encoding=\"utf-8\") as handle:\n                handle.write(\"\\n\".join(lines) + \"\\n\")\n            print(f\"Saved {name}.\")\n            return 0\n        if command == \"a\":\n            lines.append(ask(\"new line: \"))\n            changed = True\n            show(lines)\n            continue\n        if command.startswith(\"d \") and command[2:].strip().isdigit():\n            number = int(command[2:])\n            if 1 <= number <= len(lines):\n                del lines[number - 1]\n                changed = True\n                show(lines)\n            else:\n                print(\"There is no line with that number.\")\n            continue\n        if command.isdigit() and 1 <= int(command) <= len(lines):\n            number = int(command)\n            old = lines[number - 1]\n            new = ask(f\"{number:3} | \", old)\n            if not readline and new and not new[0].isspace():\n                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation\n            lines[number - 1] = new\n            changed = True\n            show(lines)\n            continue\n        print(\"Type a line number from the list, a, d NUMBER, s or q.\")\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"
   },
   {
    "path": ".lab-data.gz",
    "encoding": "base64",
    "content": "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"
   }
  ]
 },
 "NET-203": {
  "id": "NET-203",
  "title": "Startup Crash & Broken Update Service (real machine)",
  "track": "Networking & Operating Systems",
  "grade": "Grades 11–12",
  "minutes": 30,
  "summary": "Restore startup and the update service while keeping the classroom files.",
  "markdown": "# NET-203 · Startup Crash & Broken Update Service\n\n> **Lab Brief:** *“Studio-PC-04 enters recovery after update KB-LAB-17. My files are still there. Please restore normal startup and get updates working again without deleting the files.”*\n\n## Your machine\n\nA real Linux machine with no network. The lab files are in `~/lab`.\n\n## Step-by-Step Instructions\n\n### Step 1: Read the case\n```sh\ncd ~/lab && cat README.txt case/brief.txt\n```\n\n### Step 2: Inspect the settings and the device readouts\n```sh\ncat settings.conf\nsh inspect.sh\n```\n\n### Step 3: Change a setting and test\n```sh\npython3 edit.py settings.conf\nsh test.sh\n```\n\nRepeat until `sh test.sh` prints `ALL_CHECKS_PASS`.\n",
  "milestones": [
   {
    "id": "m1-read-case",
    "title": "Read the case",
    "description": "Open the request and what is known before changing anything.",
    "hint": "Run: `cat ~/lab/case/brief.txt`",
    "checkType": "history_regex",
    "patternSource": "(?:cat|less|more|head)\\s+.*(?:brief\\.txt|README\\.txt)"
   },
   {
    "id": "m2-inspect",
    "title": "Inspect the settings and a device readout",
    "description": "Read settings.conf and run at least one readout.",
    "hint": "Run: `cat ~/lab/settings.conf` then `sh ~/lab/inspect.sh 1`",
    "checkType": "history_regex",
    "patternSource": "sh\\s+.*inspect\\.sh\\s+\\S"
   },
   {
    "id": "m3-settings",
    "title": "Every setting meets the request",
    "description": "Change settings.conf so each requirement in the case is met.",
    "hint": "Change one line with `python3 ~/lab/edit.py ~/lab/settings.conf`, then compare the readouts with case/brief.txt.",
    "checkType": "file_contains_all",
    "filePath": "/home/learner/lab/settings.conf",
    "expectedSubstrings": [
     "recovery=rollback",
     "status=running",
     "startup=automatic"
    ]
   },
   {
    "id": "m4-test",
    "title": "The full test passes",
    "description": "Run the test after your last change until every requirement passes.",
    "hint": "Run: `cd ~/lab && sh test.sh`",
    "checkType": "file_contains",
    "filePath": "/home/learner/lab/results.txt",
    "expectedSubstring": "ALL_CHECKS_PASS"
   }
  ],
  "files": [
   {
    "path": "README.txt",
    "content": "NET-203 · Startup Crash & Broken Update Service\n\nStart the fictional OS normally and restore its update service.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-203 · Startup Crash & Broken Update Service\n\nRequested by: IT operations · Studio-PC-04\n\nTHE REQUEST\n“Studio-PC-04 enters recovery after update KB-LAB-17. My files are still\nthere. Please restore normal startup and get updates working again without\ndeleting the files.”\n\nGOAL\nStart the fictional OS normally and restore its update service.\n\nWHAT IS KNOWN\n- Read the boot event: BOOT-31: startup failed after fictional update\nKB-LAB-17. Classroom documents are intact.\n- Inspect update history: A working snapshot from before KB-LAB-17 is\navailable. Rollback keeps the classroom files.\n- Inspect service status: The update service is Stopped and its startup type\nis Disabled.\n\nQUESTIONS ALREADY ANSWERED\n- May I erase the drive? No. Restore the previous working update state and\nkeep the files.\n- Is startup the only goal? No. Restore the update service so the workstation\ncan receive future updates.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# RECOVERY CONSOLE · STUDIO-PC-04\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Update recovery action\n#    keep       Keep current update\n#    rollback   Roll back KB-LAB-17\n#    reset      Reset and erase files\nrecovery=keep\n\n# School Update service\n#    stopped   Stopped\n#    running   Running\nstatus=stopped\n\n# How the service starts after a restart\n#    disabled    Disabled\n#    manual      Manual\n#    automatic   Automatic\nstartup=disabled\n"
   },
   {
    "path": "inspect.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Shows a device readout for the settings saved in settings.conf right now.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='recovery status startup'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\ncase \"$*\" in\n  1|'show boot') n=1 ;;\n  2|'show files') n=2 ;;\n  3|'show service') n=3 ;;\n  *)\n    echo \"Device readouts for this lab (they follow settings.conf):\"\n    echo '  sh inspect.sh 1    show boot'\n    echo '  sh inspect.sh 2    show files'\n    echo '  sh inspect.sh 3    show service'\n    exit 0 ;;\nesac\ntext=$(lookup \"R|$n|$state\")\nif [ -n \"$text\" ]; then printf '%b\\n' \"$text\"; else unknown; fi\n"
   },
   {
    "path": "test.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Checks settings.conf against every requirement of this lab and records the\n# result in results.txt. Run it again after each change.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='recovery status startup'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\n: > results.txt\nflags=$(lookup \"T|$state\")\nif [ -z \"$flags\" ]; then unknown | tee -a results.txt; exit 1; fi\ni=0; pass=0; total=0\nwhile IFS= read -r label; do\n  i=$((i + 1)); total=$((total + 1))\n  if [ \"$(echo \"$flags\" | cut -d' ' -f$i)\" = 1 ]; then line=\"PASS   $label\"; pass=$((pass + 1)); else line=\"CHECK  $label\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_REQUIREMENTS'\nOS boots from the last known good update state\nClassroom documents preserved\nUpdate service is running and starts automatically\nLAB_REQUIREMENTS\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_CHECKS_PASS\"; else line=\"$pass of $total requirements pass. Compare case/brief.txt and the readouts with settings.conf, change one setting, and test again.\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
   },
   {
    "path": "edit.py",
    "mode": 493,
    "content": "#!/usr/bin/env python3\n\"\"\"edit.py: a small line editor for the lab files.\n\n    python3 ~/lab/edit.py FILE\n\nIt shows the file with line numbers. Type a line number to change that line,\na to add a line at the end, d NUMBER to delete a line, s to save and quit,\nor q to quit without saving.\"\"\"\nimport sys\n\ntry:\n    import readline\nexcept ImportError:  # the editor still works without line recall\n    readline = None\n\n\ndef ask(prompt, prefill=\"\"):\n    if readline and prefill:\n        readline.set_startup_hook(lambda: readline.insert_text(prefill))\n    try:\n        return input(prompt)\n    finally:\n        if readline:\n            readline.set_startup_hook(None)\n\n\ndef show(lines):\n    print()\n    for number, line in enumerate(lines, 1):\n        print(f\"{number:3} | {line}\")\n    print()\n\n\ndef main():\n    if len(sys.argv) != 2:\n        print(__doc__)\n        return 1\n    name = sys.argv[1]\n    try:\n        with open(name, encoding=\"utf-8\") as handle:\n            lines = handle.read().split(\"\\n\")\n        if lines and lines[-1] == \"\":\n            lines.pop()\n    except FileNotFoundError:\n        lines = []\n    changed = False\n    show(lines)\n    while True:\n        try:\n            command = input(\"line number, a = add, d N = delete, s = save, q = quit: \").strip()\n        except EOFError:\n            command = \"q\"\n        if command == \"q\":\n            if changed and input(\"Quit without saving? (y/n): \").strip().lower() != \"y\":\n                continue\n            return 0\n        if command == \"s\":\n            with open(name, \"w\", encoding=\"utf-8\") as handle:\n                handle.write(\"\\n\".join(lines) + \"\\n\")\n            print(f\"Saved {name}.\")\n            return 0\n        if command == \"a\":\n            lines.append(ask(\"new line: \"))\n            changed = True\n            show(lines)\n            continue\n        if command.startswith(\"d \") and command[2:].strip().isdigit():\n            number = int(command[2:])\n            if 1 <= number <= len(lines):\n                del lines[number - 1]\n                changed = True\n                show(lines)\n            else:\n                print(\"There is no line with that number.\")\n            continue\n        if command.isdigit() and 1 <= int(command) <= len(lines):\n            number = int(command)\n            old = lines[number - 1]\n            new = ask(f\"{number:3} | \", old)\n            if not readline and new and not new[0].isspace():\n                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation\n            lines[number - 1] = new\n            changed = True\n            show(lines)\n            continue\n        print(\"Type a line number from the list, a, d NUMBER, s or q.\")\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"
   },
   {
    "path": ".lab-data.gz",
    "encoding": "base64",
    "content": "H4sIAAAAAAACA7WXy25kxw2G1+qnOC8wCIusYhWz88Twxg4MZJJdNrx6hOnpFtQt5/UDKRo7CGDk9KLPvs7P+vnxUkDi0RAHLp7q+vApn3999Ny27ZN/Pp+P2z+eQq/55+1vL6fT4+mX7U/bX/X0oscDjNmaczRybOn88PHnn//+gdrr0as+X1+eNjue/UvGpnXN5+3Hjx9++u7jhzb/efp00qfL5/N1237Sy3X7cjr/67T9cj7HdrnqNTf9VR+Pasc8gIiyMfHy4dPGm8r29v3lqJfL8/n8dYu8fLmen7bjWeM3uefz8WjqX25Sc3O0VZiOHkl77Pju5Xr+qtdHP0Bhsi2cpKoe8AAbbHBovEIQBxUthILbftoWUmNTQumSYQ8/PB7z8r8GnP3la56ul+3xdFW/Hpqor4GvnnnNIX+s+el6fnrK+D2vzWmtoF6TwKXHA2xtgwOy9IbMGWipy94vhyxzygxKQvSoPULfP15e3Y4DCpQ7Co9hszq+SxEsa2qMYRaD6r45p2Wdp3fpKT3M/0vth+e8fP4Dpbzk9SaZyFqsk8fsS0ffQ8FvRlG+2mzZ0TzT6j611ge6rcjVJgg43wBNnyu1h6q7svV+35T1KTm7cZtMFEXvLA7sHQtw9ZXQKffE/3uhDcJZnG4LHIS/wTgoe2Vrc802wuI+1g/mDjCYBwD3pPv6N3S1Xn12J57JcSfkuTUVHx0nDQbJh/bmKCPTkg7BiE2l7etoTGFkjTqSFMTaeaqPpMFkiEaT5TYkZusTe/OYDRmh/x/NfNZLxmES9YaEUQHSrN1U6ZN19ojVPbGRrDcK22FalwLzQUlWDDeU5rQcbXUKld7XjR160SDDzotUJq+1z4ElzJBoE0YDkrpt4q1sOWU5zNk1Xd6xWUVdS3FKrbk09wEgMvtqBNXjdabhnVAXVxg+swCkyGhncJXOLJhNVlLXfad06ErOETTAldabP+2gLOEDutNUIIybsNOlSs2csSk5502Q6CpbNUmrlinHDUukKrkVy6gBQaPt40vLNNNXzmEGtRMFgxYDrZqutBK7Tyc3yEiZsho6Ba47qbSI1+sv1+TF8F4jNkqRB4Hxqj7u1ditehveJgEAsv9n/raDlQ4hs8RByVU3cOA4msxYnUboqvk+fH3aAulgKUA0vl3TZUQv0tLe2QX3URMMOCQopJzlXg+W8EYmhq+5T9Nve3IUMTZY4LhyYOwMuUInwCKW1YHGPtATBNCslS9Fh/EeQvacrFqhATp55zTLofV6IeZkB6j3FOTqGqLUg9nU7kVaSjF2dapK8p733YtS0+11BVZOLNm5Y6TLDDYgkZzsdS8rPAAbh0UKeoedwVVA8YKJ2vDub6lqTjZ80RAEK98XYyHCzDkHmECPcduSVq/JUl3YyufqsVMzpg2sVmIyJOy94fwbNsFLIxARAAA="
   }
  ]
 },
 "SEC-401": {
  "id": "SEC-401",
  "title": "Phishing Triage & Least-Privilege Audit (real machine)",
  "track": "Ethical Cybersecurity",
  "grade": "Grades 7–8",
  "minutes": 20,
  "summary": "Spot the phishing signs. Choose only the access needed.",
  "markdown": "# SEC-401 · Phishing Triage & Least-Privilege Audit\n\n> **Lab Brief:** *An urgent message threatens to close your account. Compare its sender and link with the school details. Inspect the text; do not open links or type a password.*\n\n## Your machine\n\nA real Linux machine with no network. The lab files are in `~/lab`.\n\n## Step-by-Step Instructions\n\n### Step 1: Read the case\n```sh\ncd ~/lab && cat README.txt case/brief.txt\n```\n\n### Step 2: Inspect the settings and the device readouts\n```sh\ncat settings.conf\nsh inspect.sh\n```\n\n### Step 3: Change a setting and test\n```sh\npython3 edit.py settings.conf\nsh test.sh\n```\n\nRepeat until `sh test.sh` prints `ALL_CHECKS_PASS`.\n",
  "milestones": [
   {
    "id": "m1-read-case",
    "title": "Read the case",
    "description": "Open the request and what is known before changing anything.",
    "hint": "Run: `cat ~/lab/case/brief.txt`",
    "checkType": "history_regex",
    "patternSource": "(?:cat|less|more|head)\\s+.*(?:brief\\.txt|README\\.txt)"
   },
   {
    "id": "m2-inspect",
    "title": "Inspect the settings and a device readout",
    "description": "Read settings.conf and run at least one readout.",
    "hint": "Run: `cat ~/lab/settings.conf` then `sh ~/lab/inspect.sh 1`",
    "checkType": "history_regex",
    "patternSource": "sh\\s+.*inspect\\.sh\\s+\\S"
   },
   {
    "id": "m3-settings",
    "title": "Every setting meets the request",
    "description": "Change settings.conf so each requirement in the case is met.",
    "hint": "Change one line with `python3 ~/lab/edit.py ~/lab/settings.conf`, then compare the readouts with case/brief.txt.",
    "checkType": "file_contains_all",
    "filePath": "/home/learner/lab/settings.conf",
    "expectedSubstrings": [
     "verdict=phishing",
     "flag_sender=yes",
     "flag_destination=yes",
     "flag_urgency=yes",
     "permission=read-only"
    ]
   },
   {
    "id": "m4-test",
    "title": "The full test passes",
    "description": "Run the test after your last change until every requirement passes.",
    "hint": "Run: `cd ~/lab && sh test.sh`",
    "checkType": "file_contains",
    "filePath": "/home/learner/lab/results.txt",
    "expectedSubstring": "ALL_CHECKS_PASS"
   }
  ],
  "files": [
   {
    "path": "README.txt",
    "content": "SEC-401 · Phishing Triage & Least-Privilege Audit\n\nFlag the message, mark its warning signs, and keep access limited.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "SEC-401 · Phishing Triage & Least-Privilege Audit\n\nRequested by: Digital safety team · Training inbox\n\nTHE REQUEST\nAn urgent message threatens to close your account. Compare its sender and link\nwith the school details. Inspect the text; do not open links or type a\npassword.\n\nGOAL\nFlag the message, mark its warning signs, and keep access limited.\n\nWHAT IS KNOWN\n- Inspect the sender: The urgent account message claims to be school IT, but\nits sender is verify@school-account-check.test rather than\nhelpdesk@school.test.\n- Inspect the link preview: The button would lead to\nhttps://school-account-check.test/verify. The real school link in this\nsimulation is https://portal.school.test.\n- Read the access task: A student helper needs read access to a shared\ntroubleshooting checklist, not administrator rights.\n\nQUESTIONS ALREADY ANSWERED\n- Should I reply with my password? Never provide credentials in response to\nthis message. Report it through the school’s approved process.\n- Can I safely inspect the link here? Yes. The interface shows a text-only\ndestination and never navigates to it.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# TRAINING INBOX · 2 MESSAGES\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Your decision about the urgent message\n#    unreviewed   Not reviewed yet\n#    safe         Safe to provide credentials\n#    phishing     Phishing: report through the approved process\nverdict=unreviewed\n\n# Sender domain does not match school IT\n#    no    Not documented\n#    yes   Documented\nflag_sender=no\n\n# Destination differs from the school portal\n#    no    Not documented\n#    yes   Documented\nflag_destination=no\n\n# Threatening time limit creates pressure\n#    no    Not documented\n#    yes   Documented\nflag_urgency=no\n\n# Student helper access to checklist\n#    administrator   Administrator\n#    edit-all        Edit all folders\n#    read-only       Read only\n#    no-access       No access\npermission=administrator\n"
   },
   {
    "path": "inspect.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Shows a device readout for the settings saved in settings.conf right now.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='verdict flag_sender flag_destination flag_urgency permission'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\ncase \"$*\" in\n  1|'open urgent message') n=1 ;;\n  2|'open routine message') n=2 ;;\n  3|'show checklist access') n=3 ;;\n  *)\n    echo \"Device readouts for this lab (they follow settings.conf):\"\n    echo '  sh inspect.sh 1    open urgent message'\n    echo '  sh inspect.sh 2    open routine message'\n    echo '  sh inspect.sh 3    show checklist access'\n    exit 0 ;;\nesac\ntext=$(lookup \"R|$n|$state\")\nif [ -n \"$text\" ]; then printf '%b\\n' \"$text\"; else unknown; fi\n"
   },
   {
    "path": "test.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Checks settings.conf against every requirement of this lab and records the\n# result in results.txt. Run it again after each change.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='verdict flag_sender flag_destination flag_urgency permission'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\n: > results.txt\nflags=$(lookup \"T|$state\")\nif [ -z \"$flags\" ]; then unknown | tee -a results.txt; exit 1; fi\ni=0; pass=0; total=0\nwhile IFS= read -r label; do\n  i=$((i + 1)); total=$((total + 1))\n  if [ \"$(echo \"$flags\" | cut -d' ' -f$i)\" = 1 ]; then line=\"PASS   $label\"; pass=$((pass + 1)); else line=\"CHECK  $label\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_REQUIREMENTS'\nUrgent verification message is reported as phishing\nSender and destination mismatch are both documented\nUrgency is recognized as pressure, not proof\nChecklist access is read-only\nLAB_REQUIREMENTS\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_CHECKS_PASS\"; else line=\"$pass of $total requirements pass. Compare case/brief.txt and the readouts with settings.conf, change one setting, and test again.\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
   },
   {
    "path": "edit.py",
    "mode": 493,
    "content": "#!/usr/bin/env python3\n\"\"\"edit.py: a small line editor for the lab files.\n\n    python3 ~/lab/edit.py FILE\n\nIt shows the file with line numbers. Type a line number to change that line,\na to add a line at the end, d NUMBER to delete a line, s to save and quit,\nor q to quit without saving.\"\"\"\nimport sys\n\ntry:\n    import readline\nexcept ImportError:  # the editor still works without line recall\n    readline = None\n\n\ndef ask(prompt, prefill=\"\"):\n    if readline and prefill:\n        readline.set_startup_hook(lambda: readline.insert_text(prefill))\n    try:\n        return input(prompt)\n    finally:\n        if readline:\n            readline.set_startup_hook(None)\n\n\ndef show(lines):\n    print()\n    for number, line in enumerate(lines, 1):\n        print(f\"{number:3} | {line}\")\n    print()\n\n\ndef main():\n    if len(sys.argv) != 2:\n        print(__doc__)\n        return 1\n    name = sys.argv[1]\n    try:\n        with open(name, encoding=\"utf-8\") as handle:\n            lines = handle.read().split(\"\\n\")\n        if lines and lines[-1] == \"\":\n            lines.pop()\n    except FileNotFoundError:\n        lines = []\n    changed = False\n    show(lines)\n    while True:\n        try:\n            command = input(\"line number, a = add, d N = delete, s = save, q = quit: \").strip()\n        except EOFError:\n            command = \"q\"\n        if command == \"q\":\n            if changed and input(\"Quit without saving? (y/n): \").strip().lower() != \"y\":\n                continue\n            return 0\n        if command == \"s\":\n            with open(name, \"w\", encoding=\"utf-8\") as handle:\n                handle.write(\"\\n\".join(lines) + \"\\n\")\n            print(f\"Saved {name}.\")\n            return 0\n        if command == \"a\":\n            lines.append(ask(\"new line: \"))\n            changed = True\n            show(lines)\n            continue\n        if command.startswith(\"d \") and command[2:].strip().isdigit():\n            number = int(command[2:])\n            if 1 <= number <= len(lines):\n                del lines[number - 1]\n                changed = True\n                show(lines)\n            else:\n                print(\"There is no line with that number.\")\n            continue\n        if command.isdigit() and 1 <= int(command) <= len(lines):\n            number = int(command)\n            old = lines[number - 1]\n            new = ask(f\"{number:3} | \", old)\n            if not readline and new and not new[0].isspace():\n                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation\n            lines[number - 1] = new\n            changed = True\n            show(lines)\n            continue\n        print(\"Type a line number from the list, a, d NUMBER, s or q.\")\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"
   },
   {
    "path": ".lab-data.gz",
    "encoding": "base64",
    "content": "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"
   }
  ]
 },
 "SEC-403": {
  "id": "SEC-403",
  "title": "Authorized Web App: Patch & Retest (real machine)",
  "track": "Ethical Cybersecurity",
  "grade": "Grades 11–12",
  "minutes": 35,
  "summary": "Test two records. Patch access and test again.",
  "markdown": "# SEC-403 · Authorized Web App: Patch & Retest\n\n> **Lab Brief:** *Confirm the scope. Try both fictional records, add an ownership check, and retest. Your record should open; the other learner’s record should stay private.*\n\n## Your machine\n\nA real Linux machine with no network. The lab files are in `~/lab`.\n\n## Step-by-Step Instructions\n\n### Step 1: Read the case\n```sh\ncd ~/lab && cat README.txt case/brief.txt\n```\n\n### Step 2: Inspect the settings and the device readouts\n```sh\ncat settings.conf\nsh inspect.sh\n```\n\n### Step 3: Change a setting and test\n```sh\npython3 edit.py settings.conf\nsh test.sh\n```\n\nRepeat until `sh test.sh` prints `ALL_CHECKS_PASS`.\n",
  "milestones": [
   {
    "id": "m1-read-case",
    "title": "Read the case",
    "description": "Open the request and what is known before changing anything.",
    "hint": "Run: `cat ~/lab/case/brief.txt`",
    "checkType": "history_regex",
    "patternSource": "(?:cat|less|more|head)\\s+.*(?:brief\\.txt|README\\.txt)"
   },
   {
    "id": "m2-inspect",
    "title": "Inspect the settings and a device readout",
    "description": "Read settings.conf and run at least one readout.",
    "hint": "Run: `cat ~/lab/settings.conf` then `sh ~/lab/inspect.sh 1`",
    "checkType": "history_regex",
    "patternSource": "sh\\s+.*inspect\\.sh\\s+\\S"
   },
   {
    "id": "m3-settings",
    "title": "Every setting meets the request",
    "description": "Change settings.conf so each requirement in the case is met.",
    "hint": "Change one line with `python3 ~/lab/edit.py ~/lab/settings.conf`, then compare the readouts with case/brief.txt.",
    "checkType": "file_contains_all",
    "filePath": "/home/learner/lab/settings.conf",
    "expectedSubstrings": [
     "scope=acknowledged",
     "defect=reproduced",
     "patch=owner"
    ]
   },
   {
    "id": "m4-test",
    "title": "The full test passes",
    "description": "Run the test after your last change until every requirement passes.",
    "hint": "Run: `cd ~/lab && sh test.sh`",
    "checkType": "file_contains",
    "filePath": "/home/learner/lab/results.txt",
    "expectedSubstring": "ALL_CHECKS_PASS"
   }
  ],
  "files": [
   {
    "path": "README.txt",
    "content": "SEC-403 · Authorized Web App: Patch & Retest\n\nKeep your record available and block access to the other learner’s record.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "SEC-403 · Authorized Web App: Patch & Retest\n\nRequested by: Application security · Authorized sandbox\n\nTHE REQUEST\nConfirm the scope. Try both fictional records, add an ownership check, and\nretest. Your record should open; the other learner’s record should stay\nprivate.\n\nGOAL\nKeep your record available and block access to the other learner’s record.\n\nWHAT IS KNOWN\n- Read the authorization: Only the two built-in fictional records in this\nbrowser simulation are in scope. No real websites, accounts, scanners, or\ntools are involved.\n- Inspect the active session: The active user is learner-101. Record 101\nbelongs to learner-101; record 102 belongs to learner-102.\n- Read the remediation note: Check ownership on every server-side record\nrequest. A hidden URL or a disabled button alone does not enforce\nauthorization.\n\nQUESTIONS ALREADY ANSWERED\n- May I try this on the school portal? No. Permission for this fictional\nsimulation does not authorize testing any real system.\n- What should the retest show? The same user should receive 200 for record 101\nand 403 for record 102 after the ownership check is applied.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# LEARNDESK · FICTIONAL APP · SESSION learner-101\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Authorized training scope\n#    not-acknowledged   Not acknowledged\n#    acknowledged       I will stay within this fictional sandbox\nscope=not-acknowledged\n\n# Original defect (record 102 opens for learner-101)\n#    not-reproduced   Not reproduced yet\n#    reproduced       Reproduced before patching and recorded\ndefect=not-reproduced\n\n# Rule for who can read a record\n#    none     Original: signed-in users can access all records\n#    hidden   Hide other record links in the interface\n#    owner    Server: require record.owner_id == user.id\npatch=none\n"
   },
   {
    "path": "inspect.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Shows a device readout for the settings saved in settings.conf right now.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='scope defect patch'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\ncase \"$*\" in\n  1|'request record 101') n=1 ;;\n  2|'request record 102') n=2 ;;\n  3|'show access rule') n=3 ;;\n  *)\n    echo \"Device readouts for this lab (they follow settings.conf):\"\n    echo '  sh inspect.sh 1    request record 101'\n    echo '  sh inspect.sh 2    request record 102'\n    echo '  sh inspect.sh 3    show access rule'\n    exit 0 ;;\nesac\ntext=$(lookup \"R|$n|$state\")\nif [ -n \"$text\" ]; then printf '%b\\n' \"$text\"; else unknown; fi\n"
   },
   {
    "path": "test.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Checks settings.conf against every requirement of this lab and records the\n# result in results.txt. Run it again after each change.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='scope defect patch'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\n: > results.txt\nflags=$(lookup \"T|$state\")\nif [ -z \"$flags\" ]; then unknown | tee -a results.txt; exit 1; fi\ni=0; pass=0; total=0\nwhile IFS= read -r label; do\n  i=$((i + 1)); total=$((total + 1))\n  if [ \"$(echo \"$flags\" | cut -d' ' -f$i)\" = 1 ]; then line=\"PASS   $label\"; pass=$((pass + 1)); else line=\"CHECK  $label\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_REQUIREMENTS'\nTesting stayed within the acknowledged simulation scope\nOriginal access-control defect reproduced before patching\nRecord 101 → 200 (own record)\nRecord 102 → 403 (other learner's record)\nLAB_REQUIREMENTS\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_CHECKS_PASS\"; else line=\"$pass of $total requirements pass. Compare case/brief.txt and the readouts with settings.conf, change one setting, and test again.\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
   },
   {
    "path": "edit.py",
    "mode": 493,
    "content": "#!/usr/bin/env python3\n\"\"\"edit.py: a small line editor for the lab files.\n\n    python3 ~/lab/edit.py FILE\n\nIt shows the file with line numbers. Type a line number to change that line,\na to add a line at the end, d NUMBER to delete a line, s to save and quit,\nor q to quit without saving.\"\"\"\nimport sys\n\ntry:\n    import readline\nexcept ImportError:  # the editor still works without line recall\n    readline = None\n\n\ndef ask(prompt, prefill=\"\"):\n    if readline and prefill:\n        readline.set_startup_hook(lambda: readline.insert_text(prefill))\n    try:\n        return input(prompt)\n    finally:\n        if readline:\n            readline.set_startup_hook(None)\n\n\ndef show(lines):\n    print()\n    for number, line in enumerate(lines, 1):\n        print(f\"{number:3} | {line}\")\n    print()\n\n\ndef main():\n    if len(sys.argv) != 2:\n        print(__doc__)\n        return 1\n    name = sys.argv[1]\n    try:\n        with open(name, encoding=\"utf-8\") as handle:\n            lines = handle.read().split(\"\\n\")\n        if lines and lines[-1] == \"\":\n            lines.pop()\n    except FileNotFoundError:\n        lines = []\n    changed = False\n    show(lines)\n    while True:\n        try:\n            command = input(\"line number, a = add, d N = delete, s = save, q = quit: \").strip()\n        except EOFError:\n            command = \"q\"\n        if command == \"q\":\n            if changed and input(\"Quit without saving? (y/n): \").strip().lower() != \"y\":\n                continue\n            return 0\n        if command == \"s\":\n            with open(name, \"w\", encoding=\"utf-8\") as handle:\n                handle.write(\"\\n\".join(lines) + \"\\n\")\n            print(f\"Saved {name}.\")\n            return 0\n        if command == \"a\":\n            lines.append(ask(\"new line: \"))\n            changed = True\n            show(lines)\n            continue\n        if command.startswith(\"d \") and command[2:].strip().isdigit():\n            number = int(command[2:])\n            if 1 <= number <= len(lines):\n                del lines[number - 1]\n                changed = True\n                show(lines)\n            else:\n                print(\"There is no line with that number.\")\n            continue\n        if command.isdigit() and 1 <= int(command) <= len(lines):\n            number = int(command)\n            old = lines[number - 1]\n            new = ask(f\"{number:3} | \", old)\n            if not readline and new and not new[0].isspace():\n                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation\n            lines[number - 1] = new\n            changed = True\n            show(lines)\n            continue\n        print(\"Type a line number from the list, a, d NUMBER, s or q.\")\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"
   },
   {
    "path": ".lab-data.gz",
    "encoding": "base64",
    "content": "H4sIAAAAAAACA9VXXW9cRQx9zv6K0b4AUru1ZzxfRX0IJYBEJaBJ3yIhz9iTXCXMhns3rQriv6O7SbcU8QBVuiuex/I5Pj7X9gUPpTK54krRQOHo5clPr05Oz8xXL354/v3J1+f9uF719ZtrlQs1m0s1fLu5XI/DbypmM/LQh35hprq+UTN0M+lmM/SLaVXXvZmibT2q+YWv5iA2o/56q9NmtQAB2zJFYA4lZTw6fv785PTUvHz14uS8n12queELNZeD6GTWm0sdzah1PYq5HvrV9OWWyKTjax3n7DqZvjbrN13H6XK4MfVS69VqAaqu5egpEWhp7ejbkzPz5C7R9ATBGmMmnaZh3c218th1fIyA5/27s7MfjQU4778vB1k+RbCPltv0y6fL95F2+WjZ1xtdPl0e9zuW94+fTaYNdTOsO1/fM1/+cd4/nyubKzDDNBcn2mfRNvf1PjLldvPX0qbNcH1tuE9vdJxWXywQUSpyyYS+VpQjNGjAwAKd09CYnUZppPYIDBg0uLA+IEoATVRidnC0jTewsD62TB64JW45yt+1wX+vDf6TNvhem292StyMXDdD1Z0kC8sYHBQQFS5Zypb4ll8LkGOk7NGLU/lvvSNwMz8dx/VM67hWnSYj2gedUZ1PxULD4lBaaeVD+53eib810XRPdbWt8OdBzLNn5nbScTXIO3vf9WfoF6uFy+TQVaYW2WlOn8bXrjJmYeQgsQG9twHFCg2bJueLePhE8JQ8eFDOIFkwpS38bDYqsXKMgXLJBX3bmm37UGMl22zlLDHWtJ8hQzUXtNpKjdk6Cg/WZRKRkCsFEZdV3YeJj/tbMw0XXeXx0LdZTOU+I+jwes7z9h3awlNkaMUBBucl7mn4RnJUvWh2xFEs7Qk1UA0QJYCPWLh+Gm9GSdmSLVqBXG56oLEW1VoLPiYqPjQvH+2QlDWFEDGQkESOB6onl4iqrI4J1QPtxnQWjslhtiwpCdndA0NG4VwrpUaUYD8mYw+NnCeiXDzk/NG6s0olDIkzNGopP9jsKFQjO+d8SogO+cA3yaLU1hqoVwGnrtWPVqxaDlRKYHXF+ZAedGHX1BLV2NBSDr7G/bipCqGnJhg1AwjvB1WArS+hJhTUZsvulhN0DRy24kucxd59a0KYba7Vg0uBYU9rRLJvvhVMSRTZuwONJmERn3INDqNF1v/9kS+CNYsDn2qE6Ox+uqkznEPMwRXfatsParMpVO8155DUJrf7PWlWKEPw5F2z3rUHm78tiTCA9Z6jBsoHcm2bN2rwPK+pmK0/FI1SnGaLUhMVSXvyWlMPNRRWFnGp2EPvwKaFEKHkFDhi3dNB/Cfzqd1TehEAAA=="
   }
  ]
 },
 "NET-204": {
  "id": "NET-204",
  "title": "Wireless Survey & Classroom Coverage (real machine)",
  "track": "Networking & Operating Systems",
  "grade": "Grades 7–8",
  "minutes": 25,
  "summary": "Use signal readings to explain why a classroom loses Wi-Fi.",
  "markdown": "# NET-204 · Wireless Survey & Classroom Coverage\n\n> **Lab Brief:** *“The tablets work near the doorway but lose Wi-Fi at the reading desk. The access point is inside a metal cupboard. Its radio settings already match the channel survey. Please improve coverage at the desk.”*\n\n## Your machine\n\nA real Linux machine with no network. The lab files are in `~/lab`.\n\n## Step-by-Step Instructions\n\n### Step 1: Read the case\n```sh\ncd ~/lab && cat README.txt case/brief.txt\n```\n\n### Step 2: Inspect the settings and the device readouts\n```sh\ncat settings.conf\nsh inspect.sh\n```\n\n### Step 3: Change a setting and test\n```sh\npython3 edit.py settings.conf\nsh test.sh\n```\n\nRepeat until `sh test.sh` prints `ALL_CHECKS_PASS`.\n",
  "milestones": [
   {
    "id": "m1-read-case",
    "title": "Read the case",
    "description": "Open the request and what is known before changing anything.",
    "hint": "Run: `cat ~/lab/case/brief.txt`",
    "checkType": "history_regex",
    "patternSource": "(?:cat|less|more|head)\\s+.*(?:brief\\.txt|README\\.txt)"
   },
   {
    "id": "m2-inspect",
    "title": "Inspect the settings and a device readout",
    "description": "Read settings.conf and run at least one readout.",
    "hint": "Run: `cat ~/lab/settings.conf` then `sh ~/lab/inspect.sh 1`",
    "checkType": "history_regex",
    "patternSource": "sh\\s+.*inspect\\.sh\\s+\\S"
   },
   {
    "id": "m3-settings",
    "title": "Every setting meets the request",
    "description": "Change settings.conf so each requirement in the case is met.",
    "hint": "Change one line with `python3 ~/lab/edit.py ~/lab/settings.conf`, then compare the readouts with case/brief.txt.",
    "checkType": "file_contains_all",
    "filePath": "/home/learner/lab/settings.conf",
    "expectedSubstrings": [
     "placement=ceiling-center",
     "band=5",
     "channel=40",
     "width=20"
    ]
   },
   {
    "id": "m4-test",
    "title": "The full test passes",
    "description": "Run the test after your last change until every requirement passes.",
    "hint": "Run: `cd ~/lab && sh test.sh`",
    "checkType": "file_contains",
    "filePath": "/home/learner/lab/results.txt",
    "expectedSubstring": "ALL_CHECKS_PASS"
   }
  ],
  "files": [
   {
    "path": "README.txt",
    "content": "NET-204 · Wireless Survey & Classroom Coverage\n\nProvide stable coverage at the fictional reading desk without overlapping the\nneighboring access points.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-204 · Wireless Survey & Classroom Coverage\n\nRequested by: Library studio · Wireless support\n\nTHE REQUEST\n“The tablets work near the doorway but lose Wi-Fi at the reading desk. The\naccess point is inside a metal cupboard. Its radio settings already match the\nchannel survey. Please improve coverage at the desk.”\n\nGOAL\nProvide stable coverage at the fictional reading desk without overlapping the\nneighboring access points.\n\nWHAT IS KNOWN\n- Read the channel survey: Nearby 5 GHz access points occupy channels 36 and\n44. Channel 40 is clear when the channel width is 20 MHz.\n- Inspect the room map: The ceiling-center location reaches the desk at −58\ndBm. The cupboard and far hallway weaken the signal below the −67 dBm target.\n- Read the client specification: The fictional classroom tablets support 5\nGHz. Use the school-approved access point; no student device settings or\ncredentials are needed.\n\nQUESTIONS ALREADY ANSWERED\n- Where does the connection drop? At the reading desk, behind the metal\nstorage cupboard.\n- Which devices need coverage? The fictional classroom tablets support 5 GHz\nand remain inside this room.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# CLASSROOM ACCESS POINT · AP-04\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Access-point mounting position\n#    cupboard         Inside metal cupboard\n#    ceiling-center   Ceiling · center of room\n#    hallway          Far hallway\nplacement=cupboard\n\n# Radio band\n#    2.4   2.4 GHz\n#    5     5 GHz\nband=5\n\n# 5 GHz primary channel\n#    36   36\n#    40   40\n#    44   44\nchannel=40\n\n# Channel width\n#    80   80 MHz\n#    20   20 MHz\nwidth=20\n"
   },
   {
    "path": "inspect.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Shows a device readout for the settings saved in settings.conf right now.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='placement band channel width'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\ncase \"$*\" in\n  1|'survey channels') n=1 ;;\n  2|'measure desk') n=2 ;;\n  3|'show radio') n=3 ;;\n  *)\n    echo \"Device readouts for this lab (they follow settings.conf):\"\n    echo '  sh inspect.sh 1    survey channels'\n    echo '  sh inspect.sh 2    measure desk'\n    echo '  sh inspect.sh 3    show radio'\n    exit 0 ;;\nesac\ntext=$(lookup \"R|$n|$state\")\nif [ -n \"$text\" ]; then printf '%b\\n' \"$text\"; else unknown; fi\n"
   },
   {
    "path": "test.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Checks settings.conf against every requirement of this lab and records the\n# result in results.txt. Run it again after each change.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='placement band channel width'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\n: > results.txt\nflags=$(lookup \"T|$state\")\nif [ -z \"$flags\" ]; then unknown | tee -a results.txt; exit 1; fi\ni=0; pass=0; total=0\nwhile IFS= read -r label; do\n  i=$((i + 1)); total=$((total + 1))\n  if [ \"$(echo \"$flags\" | cut -d' ' -f$i)\" = 1 ]; then line=\"PASS   $label\"; pass=$((pass + 1)); else line=\"CHECK  $label\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_REQUIREMENTS'\nReading desk meets the −67 dBm coverage target\nClient uses its supported 5 GHz radio\nPrimary channel avoids neighboring occupied channels\n20 MHz width avoids overlap with adjacent channels\nLAB_REQUIREMENTS\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_CHECKS_PASS\"; else line=\"$pass of $total requirements pass. Compare case/brief.txt and the readouts with settings.conf, change one setting, and test again.\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
   },
   {
    "path": "edit.py",
    "mode": 493,
    "content": "#!/usr/bin/env python3\n\"\"\"edit.py: a small line editor for the lab files.\n\n    python3 ~/lab/edit.py FILE\n\nIt shows the file with line numbers. Type a line number to change that line,\na to add a line at the end, d NUMBER to delete a line, s to save and quit,\nor q to quit without saving.\"\"\"\nimport sys\n\ntry:\n    import readline\nexcept ImportError:  # the editor still works without line recall\n    readline = None\n\n\ndef ask(prompt, prefill=\"\"):\n    if readline and prefill:\n        readline.set_startup_hook(lambda: readline.insert_text(prefill))\n    try:\n        return input(prompt)\n    finally:\n        if readline:\n            readline.set_startup_hook(None)\n\n\ndef show(lines):\n    print()\n    for number, line in enumerate(lines, 1):\n        print(f\"{number:3} | {line}\")\n    print()\n\n\ndef main():\n    if len(sys.argv) != 2:\n        print(__doc__)\n        return 1\n    name = sys.argv[1]\n    try:\n        with open(name, encoding=\"utf-8\") as handle:\n            lines = handle.read().split(\"\\n\")\n        if lines and lines[-1] == \"\":\n            lines.pop()\n    except FileNotFoundError:\n        lines = []\n    changed = False\n    show(lines)\n    while True:\n        try:\n            command = input(\"line number, a = add, d N = delete, s = save, q = quit: \").strip()\n        except EOFError:\n            command = \"q\"\n        if command == \"q\":\n            if changed and input(\"Quit without saving? (y/n): \").strip().lower() != \"y\":\n                continue\n            return 0\n        if command == \"s\":\n            with open(name, \"w\", encoding=\"utf-8\") as handle:\n                handle.write(\"\\n\".join(lines) + \"\\n\")\n            print(f\"Saved {name}.\")\n            return 0\n        if command == \"a\":\n            lines.append(ask(\"new line: \"))\n            changed = True\n            show(lines)\n            continue\n        if command.startswith(\"d \") and command[2:].strip().isdigit():\n            number = int(command[2:])\n            if 1 <= number <= len(lines):\n                del lines[number - 1]\n                changed = True\n                show(lines)\n            else:\n                print(\"There is no line with that number.\")\n            continue\n        if command.isdigit() and 1 <= int(command) <= len(lines):\n            number = int(command)\n            old = lines[number - 1]\n            new = ask(f\"{number:3} | \", old)\n            if not readline and new and not new[0].isspace():\n                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation\n            lines[number - 1] = new\n            changed = True\n            show(lines)\n            continue\n        print(\"Type a line number from the list, a, d NUMBER, s or q.\")\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"
   },
   {
    "path": ".lab-data.gz",
    "encoding": "base64",
    "content": "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"
   }
  ]
 },
 "NET-205": {
  "id": "NET-205",
  "title": "The Stalled Print Queue (real machine)",
  "track": "Networking & Operating Systems",
  "grade": "Grades 9–10",
  "minutes": 25,
  "summary": "Trace a missing print job through the service, queue and printer choice.",
  "markdown": "# NET-205 · The Stalled Print Queue\n\n> **Lab Brief:** *“I sent my handout to print, but nothing came out. Please keep my original job.” Ask when printing last worked and what happened since.*\n\n## Your machine\n\nA real Linux machine with no network. The lab files are in `~/lab`.\n\n## Step-by-Step Instructions\n\n### Step 1: Read the case\n```sh\ncd ~/lab && cat README.txt case/brief.txt\n```\n\n### Step 2: Inspect the settings and the device readouts\n```sh\ncat settings.conf\nsh inspect.sh\n```\n\n### Step 3: Change a setting and test\n```sh\npython3 edit.py settings.conf\nsh test.sh\n```\n\nRepeat until `sh test.sh` prints `ALL_CHECKS_PASS`.\n",
  "milestones": [
   {
    "id": "m1-read-case",
    "title": "Read the case",
    "description": "Open the request and what is known before changing anything.",
    "hint": "Run: `cat ~/lab/case/brief.txt`",
    "checkType": "history_regex",
    "patternSource": "(?:cat|less|more|head)\\s+.*(?:brief\\.txt|README\\.txt)"
   },
   {
    "id": "m2-inspect",
    "title": "Inspect the settings and a device readout",
    "description": "Read settings.conf and run at least one readout.",
    "hint": "Run: `cat ~/lab/settings.conf` then `sh ~/lab/inspect.sh 1`",
    "checkType": "history_regex",
    "patternSource": "sh\\s+.*inspect\\.sh\\s+\\S"
   },
   {
    "id": "m3-settings",
    "title": "Every setting meets the request",
    "description": "Change settings.conf so each requirement in the case is met.",
    "hint": "Change one line with `python3 ~/lab/edit.py ~/lab/settings.conf`, then compare the readouts with case/brief.txt.",
    "checkType": "file_contains_all",
    "filePath": "/home/learner/lab/settings.conf",
    "expectedSubstrings": [
     "spooler=running",
     "queue=resume",
     "port=approved",
     "job=release"
    ]
   },
   {
    "id": "m4-test",
    "title": "The full test passes",
    "description": "Run the test after your last change until every requirement passes.",
    "hint": "Run: `cd ~/lab && sh test.sh`",
    "checkType": "file_contains",
    "filePath": "/home/learner/lab/results.txt",
    "expectedSubstring": "ALL_CHECKS_PASS"
   }
  ],
  "files": [
   {
    "path": "README.txt",
    "content": "NET-205 · The Stalled Print Queue\n\nPrint the original fictional handout JOB-041 through the approved classroom\nprinter while preserving the job.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-205 · The Stalled Print Queue\n\nRequested by: Design classroom · PRINT-LAB-02\n\nTHE REQUEST\n“I sent my handout to print, but nothing came out. Please keep my original\njob.” Ask when printing last worked and what happened since.\n\nGOAL\nPrint the original fictional handout JOB-041 through the approved classroom\nprinter while preserving the job.\n\nWHAT IS KNOWN\n- Inspect JOB-041: JOB-041 is the original two-page classroom handout. The\nteacher asks you to preserve it rather than clear the entire queue.\n- Inspect the spooler: The Print Spooler service is stopped. The queue panel\nalso shows Paused.\n- Read the printer panel: CLASSROOM-PRINT at the approved simulated port is\nonline and has paper. OLD-PRINTER is offline.\n- Record the printing history: Printing last worked before virtual maintenance\nchanged the printer selection. The teacher clicked Print once; JOB-041 remains\nlisted and has not printed.\n\nQUESTIONS ALREADY ANSWERED\n- When did it last print? Printing worked before virtual maintenance changed\nthe printer selection. I clicked Print once afterward, and JOB-041 stayed in\nthe list without printing.\n- Should I delete all jobs? No. Keep JOB-041 and deliver that original\nhandout.\n- Is the classroom printer out of paper? No. The approved printer is online\nwith paper. Check the service, queue, and selected port.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# CLASSROOM PRINT STATION · JOB-041\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Print Spooler service\n#    stopped   Stopped\n#    running   Running\nspooler=stopped\n\n# Queue state\n#    paused   Paused\n#    resume   Resume printing\nqueue=paused\n\n# Printer destination\n#    old        OLD-PRINTER · offline\n#    approved   CLASSROOM-PRINT · online\nport=old\n\n# Original JOB-041\n#    hold      Keep held\n#    release   Preserve and release original job\n#    delete    Delete the queue\njob=hold\n"
   },
   {
    "path": "inspect.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Shows a device readout for the settings saved in settings.conf right now.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='spooler queue port job'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\ncase \"$*\" in\n  1|'show queue') n=1 ;;\n  2|'service spooler') n=2 ;;\n  3|'show printer') n=3 ;;\n  *)\n    echo \"Device readouts for this lab (they follow settings.conf):\"\n    echo '  sh inspect.sh 1    show queue'\n    echo '  sh inspect.sh 2    service spooler'\n    echo '  sh inspect.sh 3    show printer'\n    exit 0 ;;\nesac\ntext=$(lookup \"R|$n|$state\")\nif [ -n \"$text\" ]; then printf '%b\\n' \"$text\"; else unknown; fi\n"
   },
   {
    "path": "test.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Checks settings.conf against every requirement of this lab and records the\n# result in results.txt. Run it again after each change.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='spooler queue port job'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\n: > results.txt\nflags=$(lookup \"T|$state\")\nif [ -z \"$flags\" ]; then unknown | tee -a results.txt; exit 1; fi\ni=0; pass=0; total=0\nwhile IFS= read -r label; do\n  i=$((i + 1)); total=$((total + 1))\n  if [ \"$(echo \"$flags\" | cut -d' ' -f$i)\" = 1 ]; then line=\"PASS   $label\"; pass=$((pass + 1)); else line=\"CHECK  $label\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_REQUIREMENTS'\nPrint Spooler service is running\nQueue resumes instead of staying paused\nDestination is the online classroom printer\nOriginal JOB-041 is preserved and printed\nLAB_REQUIREMENTS\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_CHECKS_PASS\"; else line=\"$pass of $total requirements pass. Compare case/brief.txt and the readouts with settings.conf, change one setting, and test again.\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
   },
   {
    "path": "edit.py",
    "mode": 493,
    "content": "#!/usr/bin/env python3\n\"\"\"edit.py: a small line editor for the lab files.\n\n    python3 ~/lab/edit.py FILE\n\nIt shows the file with line numbers. Type a line number to change that line,\na to add a line at the end, d NUMBER to delete a line, s to save and quit,\nor q to quit without saving.\"\"\"\nimport sys\n\ntry:\n    import readline\nexcept ImportError:  # the editor still works without line recall\n    readline = None\n\n\ndef ask(prompt, prefill=\"\"):\n    if readline and prefill:\n        readline.set_startup_hook(lambda: readline.insert_text(prefill))\n    try:\n        return input(prompt)\n    finally:\n        if readline:\n            readline.set_startup_hook(None)\n\n\ndef show(lines):\n    print()\n    for number, line in enumerate(lines, 1):\n        print(f\"{number:3} | {line}\")\n    print()\n\n\ndef main():\n    if len(sys.argv) != 2:\n        print(__doc__)\n        return 1\n    name = sys.argv[1]\n    try:\n        with open(name, encoding=\"utf-8\") as handle:\n            lines = handle.read().split(\"\\n\")\n        if lines and lines[-1] == \"\":\n            lines.pop()\n    except FileNotFoundError:\n        lines = []\n    changed = False\n    show(lines)\n    while True:\n        try:\n            command = input(\"line number, a = add, d N = delete, s = save, q = quit: \").strip()\n        except EOFError:\n            command = \"q\"\n        if command == \"q\":\n            if changed and input(\"Quit without saving? (y/n): \").strip().lower() != \"y\":\n                continue\n            return 0\n        if command == \"s\":\n            with open(name, \"w\", encoding=\"utf-8\") as handle:\n                handle.write(\"\\n\".join(lines) + \"\\n\")\n            print(f\"Saved {name}.\")\n            return 0\n        if command == \"a\":\n            lines.append(ask(\"new line: \"))\n            changed = True\n            show(lines)\n            continue\n        if command.startswith(\"d \") and command[2:].strip().isdigit():\n            number = int(command[2:])\n            if 1 <= number <= len(lines):\n                del lines[number - 1]\n                changed = True\n                show(lines)\n            else:\n                print(\"There is no line with that number.\")\n            continue\n        if command.isdigit() and 1 <= int(command) <= len(lines):\n            number = int(command)\n            old = lines[number - 1]\n            new = ask(f\"{number:3} | \", old)\n            if not readline and new and not new[0].isspace():\n                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation\n            lines[number - 1] = new\n            changed = True\n            show(lines)\n            continue\n        print(\"Type a line number from the list, a, d NUMBER, s or q.\")\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"
   },
   {
    "path": ".lab-data.gz",
    "encoding": "base64",
    "content": "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"
   }
  ]
 },
 "NET-206": {
  "id": "NET-206",
  "title": "Backup Restore & File Integrity (real machine)",
  "track": "Networking & Operating Systems",
  "grade": "Grades 11–12",
  "minutes": 30,
  "summary": "Compare backup contents and recover the complete file without overwriting evidence.",
  "markdown": "# NET-206 · Backup Restore & File Integrity\n\n> **Lab Brief:** *“The file opens, but my project notes are missing. Use the backup list and original manifest to recover a complete copy into a separate folder. Keep the damaged file.”*\n\n## Your machine\n\nA real Linux machine with no network. The lab files are in `~/lab`.\n\n## Step-by-Step Instructions\n\n### Step 1: Read the case\n```sh\ncd ~/lab && cat README.txt case/brief.txt\n```\n\n### Step 2: Inspect the settings and the device readouts\n```sh\ncat settings.conf\nsh inspect.sh\n```\n\n### Step 3: Change a setting and test\n```sh\npython3 edit.py settings.conf\nsh test.sh\n```\n\nRepeat until `sh test.sh` prints `ALL_CHECKS_PASS`.\n",
  "milestones": [
   {
    "id": "m1-read-case",
    "title": "Read the case",
    "description": "Open the request and what is known before changing anything.",
    "hint": "Run: `cat ~/lab/case/brief.txt`",
    "checkType": "history_regex",
    "patternSource": "(?:cat|less|more|head)\\s+.*(?:brief\\.txt|README\\.txt)"
   },
   {
    "id": "m2-inspect",
    "title": "Inspect the settings and a device readout",
    "description": "Read settings.conf and run at least one readout.",
    "hint": "Run: `cat ~/lab/settings.conf` then `sh ~/lab/inspect.sh 1`",
    "checkType": "history_regex",
    "patternSource": "sh\\s+.*inspect\\.sh\\s+\\S"
   },
   {
    "id": "m3-settings",
    "title": "Every setting meets the request",
    "description": "Change settings.conf so each requirement in the case is met.",
    "hint": "Change one line with `python3 ~/lab/edit.py ~/lab/settings.conf`, then compare the readouts with case/brief.txt.",
    "checkType": "file_contains_all",
    "filePath": "/home/learner/lab/settings.conf",
    "expectedSubstrings": [
     "snapshot=B-17",
     "destination=recovery",
     "preserve=keep",
     "integrity=compare"
    ]
   },
   {
    "id": "m4-test",
    "title": "The full test passes",
    "description": "Run the test after your last change until every requirement passes.",
    "hint": "Run: `cd ~/lab && sh test.sh`",
    "checkType": "file_contains",
    "filePath": "/home/learner/lab/results.txt",
    "expectedSubstring": "ALL_CHECKS_PASS"
   }
  ],
  "files": [
   {
    "path": "README.txt",
    "content": "NET-206 · Backup Restore & File Integrity\n\nRecover the verified original project-notes.txt into a separate folder and\nverify its contents without overwriting the current file.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-206 · Backup Restore & File Integrity\n\nRequested by: Media studio · Recovery desk\n\nTHE REQUEST\n“The file opens, but my project notes are missing. Use the backup list and\noriginal manifest to recover a complete copy into a separate folder. Keep the\ndamaged file.”\n\nGOAL\nRecover the verified original project-notes.txt into a separate folder and\nverify its contents without overwriting the current file.\n\nWHAT IS KNOWN\n- Read the backup catalog: Snapshot B-17 contains the verified two-section\nproject notes. B-16 is incomplete; B-18 is an empty export.\n- Read the recovery policy: Restore to Recovery/Project, retaining the damaged\ncurrent copy for investigation. Do not overwrite or delete it.\n- Inspect the integrity manifest: B-17 manifest: title “Network project”;\nsections “Plan” and “Test results”; integrity label LAB-VERIFIED-17. A\nsuccessful copy alone does not verify its contents.\n\nQUESTIONS ALREADY ANSWERED\n- Is the newest copy always the best? No. The newest export is empty. Compare\nthe catalog and integrity manifest.\n- Can I overwrite the damaged file? Keep it as evidence. Use a separate\nrecovery folder for the restored original.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# RECOVERY CONSOLE · PROJECT DOCUMENTS\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Backup snapshot\n#    B-16   B-16 · incomplete\n#    B-17   B-17 · verified original\n#    B-18   B-18 · empty export\nsnapshot=B-16\n\n# Restore destination\n#    overwrite   Overwrite current damaged file\n#    recovery    Separate Recovery/Project folder\ndestination=overwrite\n\n# Current damaged copy\n#    delete   Delete current copy\n#    keep     Preserve as evidence\npreserve=delete\n\n# After-copy verification\n#    skip      Trust copy completion only\n#    compare   Compare content and manifest\nintegrity=skip\n"
   },
   {
    "path": "inspect.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Shows a device readout for the settings saved in settings.conf right now.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='snapshot destination preserve integrity'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\ncase \"$*\" in\n  1|'list snapshots') n=1 ;;\n  2|'inspect restored') n=2 ;;\n  3|'compare manifest') n=3 ;;\n  *)\n    echo \"Device readouts for this lab (they follow settings.conf):\"\n    echo '  sh inspect.sh 1    list snapshots'\n    echo '  sh inspect.sh 2    inspect restored'\n    echo '  sh inspect.sh 3    compare manifest'\n    exit 0 ;;\nesac\ntext=$(lookup \"R|$n|$state\")\nif [ -n \"$text\" ]; then printf '%b\\n' \"$text\"; else unknown; fi\n"
   },
   {
    "path": "test.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Checks settings.conf against every requirement of this lab and records the\n# result in results.txt. Run it again after each change.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='snapshot destination preserve integrity'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\n: > results.txt\nflags=$(lookup \"T|$state\")\nif [ -z \"$flags\" ]; then unknown | tee -a results.txt; exit 1; fi\ni=0; pass=0; total=0\nwhile IFS= read -r label; do\n  i=$((i + 1)); total=$((total + 1))\n  if [ \"$(echo \"$flags\" | cut -d' ' -f$i)\" = 1 ]; then line=\"PASS   $label\"; pass=$((pass + 1)); else line=\"CHECK  $label\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_REQUIREMENTS'\nSelected backup contains the complete original notes\nRestore uses a separate recovery folder\nCurrent damaged copy is preserved as evidence\nRestored content matches the trusted manifest\nLAB_REQUIREMENTS\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_CHECKS_PASS\"; else line=\"$pass of $total requirements pass. Compare case/brief.txt and the readouts with settings.conf, change one setting, and test again.\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
   },
   {
    "path": "edit.py",
    "mode": 493,
    "content": "#!/usr/bin/env python3\n\"\"\"edit.py: a small line editor for the lab files.\n\n    python3 ~/lab/edit.py FILE\n\nIt shows the file with line numbers. Type a line number to change that line,\na to add a line at the end, d NUMBER to delete a line, s to save and quit,\nor q to quit without saving.\"\"\"\nimport sys\n\ntry:\n    import readline\nexcept ImportError:  # the editor still works without line recall\n    readline = None\n\n\ndef ask(prompt, prefill=\"\"):\n    if readline and prefill:\n        readline.set_startup_hook(lambda: readline.insert_text(prefill))\n    try:\n        return input(prompt)\n    finally:\n        if readline:\n            readline.set_startup_hook(None)\n\n\ndef show(lines):\n    print()\n    for number, line in enumerate(lines, 1):\n        print(f\"{number:3} | {line}\")\n    print()\n\n\ndef main():\n    if len(sys.argv) != 2:\n        print(__doc__)\n        return 1\n    name = sys.argv[1]\n    try:\n        with open(name, encoding=\"utf-8\") as handle:\n            lines = handle.read().split(\"\\n\")\n        if lines and lines[-1] == \"\":\n            lines.pop()\n    except FileNotFoundError:\n        lines = []\n    changed = False\n    show(lines)\n    while True:\n        try:\n            command = input(\"line number, a = add, d N = delete, s = save, q = quit: \").strip()\n        except EOFError:\n            command = \"q\"\n        if command == \"q\":\n            if changed and input(\"Quit without saving? (y/n): \").strip().lower() != \"y\":\n                continue\n            return 0\n        if command == \"s\":\n            with open(name, \"w\", encoding=\"utf-8\") as handle:\n                handle.write(\"\\n\".join(lines) + \"\\n\")\n            print(f\"Saved {name}.\")\n            return 0\n        if command == \"a\":\n            lines.append(ask(\"new line: \"))\n            changed = True\n            show(lines)\n            continue\n        if command.startswith(\"d \") and command[2:].strip().isdigit():\n            number = int(command[2:])\n            if 1 <= number <= len(lines):\n                del lines[number - 1]\n                changed = True\n                show(lines)\n            else:\n                print(\"There is no line with that number.\")\n            continue\n        if command.isdigit() and 1 <= int(command) <= len(lines):\n            number = int(command)\n            old = lines[number - 1]\n            new = ask(f\"{number:3} | \", old)\n            if not readline and new and not new[0].isspace():\n                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation\n            lines[number - 1] = new\n            changed = True\n            show(lines)\n            continue\n        print(\"Type a line number from the list, a, d NUMBER, s or q.\")\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"
   },
   {
    "path": ".lab-data.gz",
    "encoding": "base64",
    "content": "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"
   }
  ]
 },
 "SEC-404": {
  "id": "SEC-404",
  "title": "MFA Recovery Without Sharing Secrets (real machine)",
  "track": "Ethical Cybersecurity",
  "grade": "Grades 7–8",
  "minutes": 25,
  "summary": "Recover an account without sharing secrets or dropping MFA.",
  "markdown": "# SEC-404 · MFA Recovery Without Sharing Secrets\n\n> **Lab Brief:** *A staff member lost their authenticator. The chat asks you to disable MFA and share a secret. Build a safer recovery path without passwords or real codes.*\n\n## Your machine\n\nA real Linux machine with no network. The lab files are in `~/lab`.\n\n## Step-by-Step Instructions\n\n### Step 1: Read the case\n```sh\ncd ~/lab && cat README.txt case/brief.txt\n```\n\n### Step 2: Inspect the settings and the device readouts\n```sh\ncat settings.conf\nsh inspect.sh\n```\n\n### Step 3: Change a setting and test\n```sh\npython3 edit.py settings.conf\nsh test.sh\n```\n\nRepeat until `sh test.sh` prints `ALL_CHECKS_PASS`.\n",
  "milestones": [
   {
    "id": "m1-read-case",
    "title": "Read the case",
    "description": "Open the request and what is known before changing anything.",
    "hint": "Run: `cat ~/lab/case/brief.txt`",
    "checkType": "history_regex",
    "patternSource": "(?:cat|less|more|head)\\s+.*(?:brief\\.txt|README\\.txt)"
   },
   {
    "id": "m2-inspect",
    "title": "Inspect the settings and a device readout",
    "description": "Read settings.conf and run at least one readout.",
    "hint": "Run: `cat ~/lab/settings.conf` then `sh ~/lab/inspect.sh 1`",
    "checkType": "history_regex",
    "patternSource": "sh\\s+.*inspect\\.sh\\s+\\S"
   },
   {
    "id": "m3-settings",
    "title": "Every setting meets the request",
    "description": "Change settings.conf so each requirement in the case is met.",
    "hint": "Change one line with `python3 ~/lab/edit.py ~/lab/settings.conf`, then compare the readouts with case/brief.txt.",
    "checkType": "file_contains_all",
    "filePath": "/home/learner/lab/settings.conf",
    "expectedSubstrings": [
     "identity=approved",
     "factor=revoke",
     "reset=supervised",
     "audit=record"
    ]
   },
   {
    "id": "m4-test",
    "title": "The full test passes",
    "description": "Run the test after your last change until every requirement passes.",
    "hint": "Run: `cd ~/lab && sh test.sh`",
    "checkType": "file_contains",
    "filePath": "/home/learner/lab/results.txt",
    "expectedSubstring": "ALL_CHECKS_PASS"
   }
  ],
  "files": [
   {
    "path": "README.txt",
    "content": "SEC-404 · MFA Recovery Without Sharing Secrets\n\nVerify identity, revoke the lost factor, use a limited reset, and record it.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "SEC-404 · MFA Recovery Without Sharing Secrets\n\nRequested by: Help desk · Account recovery training\n\nTHE REQUEST\nA staff member lost their authenticator. The chat asks you to disable MFA and\nshare a secret. Build a safer recovery path without passwords or real codes.\n\nGOAL\nVerify identity, revoke the lost factor, use a limited reset, and record it.\n\nWHAT IS KNOWN\n- Read the recovery policy: Verify the fictional requester through the\napproved help-desk identity-check route. Urgency or a chat message alone is\nnot proof.\n- Inspect the lost device record: The lost authenticator is still active.\nRevoke that factor before supervised enrollment of a replacement.\n- Read reset requirements: Use a single-use supervised reset with an audit\nrecord. Keep MFA required; never request a password or share a recovery secret\nin chat.\n\nQUESTIONS ALREADY ANSWERED\n- Should I ask for their password? No. This recovery exercise does not collect\npasswords, secret codes, or personal information.\n- Can I turn MFA off permanently? No. Use the approved limited recovery route\nand enroll a replacement while keeping MFA required.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# ACCOUNT RECOVERY DESK · FICTIONAL ACCOUNT\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Identity check\n#    chat       Trust the urgent chat\n#    approved   Approved help-desk identity-check route\nidentity=chat\n\n# Lost factor\n#    keep     Keep the lost factor active\n#    revoke   Revoke the lost factor\nfactor=keep\n\n# Recovery method\n#    disable      Disable MFA permanently\n#    supervised   Single-use supervised reset; MFA stays required\nreset=disable\n\n# Recovery record\n#    none     No audit record\n#    record   Record the approved recovery action\naudit=none\n"
   },
   {
    "path": "inspect.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Shows a device readout for the settings saved in settings.conf right now.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='identity factor reset audit'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\ncase \"$*\" in\n  1|'show recovery policy') n=1 ;;\n  2|'inspect factor') n=2 ;;\n  3|'preview recovery') n=3 ;;\n  *)\n    echo \"Device readouts for this lab (they follow settings.conf):\"\n    echo '  sh inspect.sh 1    show recovery policy'\n    echo '  sh inspect.sh 2    inspect factor'\n    echo '  sh inspect.sh 3    preview recovery'\n    exit 0 ;;\nesac\ntext=$(lookup \"R|$n|$state\")\nif [ -n \"$text\" ]; then printf '%b\\n' \"$text\"; else unknown; fi\n"
   },
   {
    "path": "test.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Checks settings.conf against every requirement of this lab and records the\n# result in results.txt. Run it again after each change.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='identity factor reset audit'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\n: > results.txt\nflags=$(lookup \"T|$state\")\nif [ -z \"$flags\" ]; then unknown | tee -a results.txt; exit 1; fi\ni=0; pass=0; total=0\nwhile IFS= read -r label; do\n  i=$((i + 1)); total=$((total + 1))\n  if [ \"$(echo \"$flags\" | cut -d' ' -f$i)\" = 1 ]; then line=\"PASS   $label\"; pass=$((pass + 1)); else line=\"CHECK  $label\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_REQUIREMENTS'\nRequester follows the approved identity-check route\nLost authenticator factor is revoked\nRecovery is limited and MFA remains required\nApproved recovery action has an audit record\nLAB_REQUIREMENTS\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_CHECKS_PASS\"; else line=\"$pass of $total requirements pass. Compare case/brief.txt and the readouts with settings.conf, change one setting, and test again.\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
   },
   {
    "path": "edit.py",
    "mode": 493,
    "content": "#!/usr/bin/env python3\n\"\"\"edit.py: a small line editor for the lab files.\n\n    python3 ~/lab/edit.py FILE\n\nIt shows the file with line numbers. Type a line number to change that line,\na to add a line at the end, d NUMBER to delete a line, s to save and quit,\nor q to quit without saving.\"\"\"\nimport sys\n\ntry:\n    import readline\nexcept ImportError:  # the editor still works without line recall\n    readline = None\n\n\ndef ask(prompt, prefill=\"\"):\n    if readline and prefill:\n        readline.set_startup_hook(lambda: readline.insert_text(prefill))\n    try:\n        return input(prompt)\n    finally:\n        if readline:\n            readline.set_startup_hook(None)\n\n\ndef show(lines):\n    print()\n    for number, line in enumerate(lines, 1):\n        print(f\"{number:3} | {line}\")\n    print()\n\n\ndef main():\n    if len(sys.argv) != 2:\n        print(__doc__)\n        return 1\n    name = sys.argv[1]\n    try:\n        with open(name, encoding=\"utf-8\") as handle:\n            lines = handle.read().split(\"\\n\")\n        if lines and lines[-1] == \"\":\n            lines.pop()\n    except FileNotFoundError:\n        lines = []\n    changed = False\n    show(lines)\n    while True:\n        try:\n            command = input(\"line number, a = add, d N = delete, s = save, q = quit: \").strip()\n        except EOFError:\n            command = \"q\"\n        if command == \"q\":\n            if changed and input(\"Quit without saving? (y/n): \").strip().lower() != \"y\":\n                continue\n            return 0\n        if command == \"s\":\n            with open(name, \"w\", encoding=\"utf-8\") as handle:\n                handle.write(\"\\n\".join(lines) + \"\\n\")\n            print(f\"Saved {name}.\")\n            return 0\n        if command == \"a\":\n            lines.append(ask(\"new line: \"))\n            changed = True\n            show(lines)\n            continue\n        if command.startswith(\"d \") and command[2:].strip().isdigit():\n            number = int(command[2:])\n            if 1 <= number <= len(lines):\n                del lines[number - 1]\n                changed = True\n                show(lines)\n            else:\n                print(\"There is no line with that number.\")\n            continue\n        if command.isdigit() and 1 <= int(command) <= len(lines):\n            number = int(command)\n            old = lines[number - 1]\n            new = ask(f\"{number:3} | \", old)\n            if not readline and new and not new[0].isspace():\n                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation\n            lines[number - 1] = new\n            changed = True\n            show(lines)\n            continue\n        print(\"Type a line number from the list, a, d NUMBER, s or q.\")\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"
   },
   {
    "path": ".lab-data.gz",
    "encoding": "base64",
    "content": "H4sIAAAAAAACA+Va227kxhF91nxFf8DuoPpa3esnZSMjQtaSocgOAsxL3XpF7JijDCkZ+/fGTEbxIn4wkt0YXAz4RrDJU6eKdU4XCTFW9Ey+Yxb1cHF39fb2x6u7f7i7H27+dHv7183o1+7y8XG/ezZ1D7Z9fK02fXCD2jgP88fX8mDywe13T7OtN2NYuzt73n0wNz+Y2+6m2XWSebdfb8a4dn97erT98zCZIzcN4/utvX6azO1tsvkb98Hs0X337aXb2z+fhr3pejOmww1lt9fjDekFCMk87Mb1ZryxZ9sfF9g0O3KPNE0/Hy7fHc7S1u1Nds+2/+hkp+aG0c0Pw+S2xOsVIDBpFyW0qkkvwIHzDlZQrUYqlZBi5CYX316/vb++vbl85y5/uP/L1c399dvL+9s7d2Dr7s+b8d2vgb5x+yMBuhmvTxz9i5037mn/3sbZyQPNbjduP27Gm50jkd3TOL/6N/JXbjLZ23wE/OoQh9rzIOaG6XCxTZPpegWEmGOt5lmClbJAiB6AkiAlwNxY8cK747HySjVQ8BR7LdztrIrO95wTt9ZjoRKjv4AjK7AKychAfcPmU/b5C2WUfkvjs+2HPggdovmcBEcfpdZcegmRNZezymNspaFFa8VXaPjSPPwqgefYI8ZeOKCPZ8VKQkzQAC1gRiH6Nfjv313euO/vrn68vvr7ZvzO5oedvjlCe7T9TzTaOG8/Oh0m4u2hji+fdJiPj9rrGzeMsn3Sw/n7B3OPe3se7GenO5vcuJtfEB0QygON7w9kHKGeKnu9StVyShJiz9ya4nllRUJB0yZYu1C3Y88B51cZfClCSth7B+MLfyrijJBzoE5JrQcov5fHT2KcXkLXl3A/jfQ/E/vTMB3W/s95zRiKgE+kHKD0fFZ5LdB9lCDUuJkU/e8kY5qH7fYI5Nn+UN0oSTsDUeAcQ435S8L+kgamYLPWctIGxJX7YppZIUvKXSJn9NTOrOgFUo/su2aPFc7LdRRlTDlXZsKYLBw9NThYYUBtnrQGn6EKfKla/dz+jEHIU7KuiA17Xeq7jkG1mCWfWgoI+n8TvM9++bFpJI9kOal48ItllDIIskevvQewr0ScKkSrrMqtcY6dTl4JVhWSkAERlm5JdPn7sxo6xA6eCBJFS4vRrxpNYmoU2qFEaj3aziPHLUeAJNyFqXU9bY79qrZKbDlYlQz+Uyk+g6bffKEOrJybUq9LnPW0KCjiQ8ceQ8281KbUMoTevK+ZqkCoS5HJVkhZOkVsUnJZsPw0ZE9BUSllD3Be4w2CapB8yMKhQA5nFrwkDL3GXKxrtsXICYXGLXHTLI1D4eMo7iAnFEVzLxC7tVp7PE2gYUU1NpDSS5GaLOWTjfYrMmjZMln3iSDBYuce7EFiwR4bsGErX4m7Yh9CqBQbd8RWlztX4tJAQmoKGGoofSlCwQo59Oo1CDL0dKp1v5ICRYXYR0xJWRdoEgRVfYsZODNmrmfVPUW1lMScWiyK6bxmNhrBKJoGKqkkDsvfO2n0DaVFDuBrUH9e6cqUIlWPEYMXOy+boxX54Cg0BkP1sliJ0sbSaraSIeZAbbl7BhXrkaFpSY3T76v+HyWmFjCFIpqLb2KRl8ugFVLAnlOKEZN+LXbPaqXi1XJjTN3orBqJNW9khaWXzLX708dVWBlDgBB8Y8mH/2CWr4adyERV1DRGrv00sPOrXwAk6wJRQCYAAA=="
   }
  ]
 },
 "SEC-405": {
  "id": "SEC-405",
  "title": "Ransomware Response & Evidence (real machine)",
  "track": "Ethical Cybersecurity",
  "grade": "Grades 9–10",
  "minutes": 30,
  "summary": "Contain an alert and build a safe recovery path.",
  "markdown": "# SEC-405 · Ransomware Response & Evidence\n\n> **Lab Brief:** *One PC reports unexpected file encryption. Use the guide to contain it, keep evidence, and plan recovery. Decide what must happen first.*\n\n## Your machine\n\nA real Linux machine with no network. The lab files are in `~/lab`.\n\n## Step-by-Step Instructions\n\n### Step 1: Read the case\n```sh\ncd ~/lab && cat README.txt case/brief.txt\n```\n\n### Step 2: Inspect the settings and the device readouts\n```sh\ncat settings.conf\nsh inspect.sh\n```\n\n### Step 3: Change a setting and test\n```sh\npython3 edit.py settings.conf\nsh test.sh\n```\n\nRepeat until `sh test.sh` prints `ALL_CHECKS_PASS`.\n",
  "milestones": [
   {
    "id": "m1-read-case",
    "title": "Read the case",
    "description": "Open the request and what is known before changing anything.",
    "hint": "Run: `cat ~/lab/case/brief.txt`",
    "checkType": "history_regex",
    "patternSource": "(?:cat|less|more|head)\\s+.*(?:brief\\.txt|README\\.txt)"
   },
   {
    "id": "m2-inspect",
    "title": "Inspect the settings and a device readout",
    "description": "Read settings.conf and run at least one readout.",
    "hint": "Run: `cat ~/lab/settings.conf` then `sh ~/lab/inspect.sh 1`",
    "checkType": "history_regex",
    "patternSource": "sh\\s+.*inspect\\.sh\\s+\\S"
   },
   {
    "id": "m3-settings",
    "title": "Every setting meets the request",
    "description": "Change settings.conf so each requirement in the case is met.",
    "hint": "Change one line with `python3 ~/lab/edit.py ~/lab/settings.conf`, then compare the readouts with case/brief.txt.",
    "checkType": "file_contains_all",
    "filePath": "/home/learner/lab/settings.conf",
    "expectedSubstrings": [
     "containment=isolate",
     "evidence=preserve",
     "notify=team",
     "recovery=clean"
    ]
   },
   {
    "id": "m4-test",
    "title": "The full test passes",
    "description": "Run the test after your last change until every requirement passes.",
    "hint": "Run: `cd ~/lab && sh test.sh`",
    "checkType": "file_contains",
    "filePath": "/home/learner/lab/results.txt",
    "expectedSubstring": "ALL_CHECKS_PASS"
   }
  ],
  "files": [
   {
    "path": "README.txt",
    "content": "SEC-405 · Ransomware Response & Evidence\n\nIsolate the affected PC, keep evidence, alert the team, and recover in a clean\nspace.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "SEC-405 · Ransomware Response & Evidence\n\nRequested by: Incident response team · LAB-ENDPOINT-07\n\nTHE REQUEST\nOne PC reports unexpected file encryption. Use the guide to contain it, keep\nevidence, and plan recovery. Decide what must happen first.\n\nGOAL\nIsolate the affected PC, keep evidence, alert the team, and recover in a clean\nspace.\n\nWHAT IS KNOWN\n- Read the incident alert: LAB-ENDPOINT-07 is the affected fictional\nworkstation. Other classroom endpoints are not showing this alert.\n- Read the response runbook: Isolate the affected endpoint from the network,\npreserve the supplied incident evidence, and notify the designated response\nteam. Do not wipe it or run unapproved cleanup.\n- Inspect recovery media: Offline backup R-08 is verified. Restore it into a\nseparate clean recovery environment only after containment; do not attach it\nto the affected endpoint.\n\nQUESTIONS ALREADY ANSWERED\n- Should I wipe the affected endpoint immediately? No. Preserve the incident\nevidence and follow the response runbook.\n- May I connect the backup to the infected machine? No. Keep the offline\nbackup separate and stage recovery in a clean environment after containment.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# INCIDENT RESPONSE DESK · LAB-ENDPOINT-07\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Affected endpoint connection\n#    connected   Leave endpoint connected\n#    isolate     Isolate only LAB-ENDPOINT-07\ncontainment=connected\n\n# Incident evidence\n#    wipe       Wipe affected endpoint\n#    preserve   Preserve supplied evidence\nevidence=wipe\n\n# Response escalation\n#    silent   Handle alone without notification\n#    team     Notify designated response team\nnotify=silent\n\n# Backup recovery route\n#    infected   Attach backup to affected endpoint\n#    clean      Verified R-08 into clean separate environment\nrecovery=infected\n"
   },
   {
    "path": "inspect.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Shows a device readout for the settings saved in settings.conf right now.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='containment evidence notify recovery'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\ncase \"$*\" in\n  1|'endpoint status') n=1 ;;\n  2|'evidence register') n=2 ;;\n  3|'recovery status') n=3 ;;\n  *)\n    echo \"Device readouts for this lab (they follow settings.conf):\"\n    echo '  sh inspect.sh 1    endpoint status'\n    echo '  sh inspect.sh 2    evidence register'\n    echo '  sh inspect.sh 3    recovery status'\n    exit 0 ;;\nesac\ntext=$(lookup \"R|$n|$state\")\nif [ -n \"$text\" ]; then printf '%b\\n' \"$text\"; else unknown; fi\n"
   },
   {
    "path": "test.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Checks settings.conf against every requirement of this lab and records the\n# result in results.txt. Run it again after each change.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='containment evidence notify recovery'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\n: > results.txt\nflags=$(lookup \"T|$state\")\nif [ -z \"$flags\" ]; then unknown | tee -a results.txt; exit 1; fi\ni=0; pass=0; total=0\nwhile IFS= read -r label; do\n  i=$((i + 1)); total=$((total + 1))\n  if [ \"$(echo \"$flags\" | cut -d' ' -f$i)\" = 1 ]; then line=\"PASS   $label\"; pass=$((pass + 1)); else line=\"CHECK  $label\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_REQUIREMENTS'\nAffected endpoint is isolated from the network\nIncident evidence is preserved\nDesignated response team is notified\nVerified backup is staged cleanly after containment\nLAB_REQUIREMENTS\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_CHECKS_PASS\"; else line=\"$pass of $total requirements pass. Compare case/brief.txt and the readouts with settings.conf, change one setting, and test again.\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
   },
   {
    "path": "edit.py",
    "mode": 493,
    "content": "#!/usr/bin/env python3\n\"\"\"edit.py: a small line editor for the lab files.\n\n    python3 ~/lab/edit.py FILE\n\nIt shows the file with line numbers. Type a line number to change that line,\na to add a line at the end, d NUMBER to delete a line, s to save and quit,\nor q to quit without saving.\"\"\"\nimport sys\n\ntry:\n    import readline\nexcept ImportError:  # the editor still works without line recall\n    readline = None\n\n\ndef ask(prompt, prefill=\"\"):\n    if readline and prefill:\n        readline.set_startup_hook(lambda: readline.insert_text(prefill))\n    try:\n        return input(prompt)\n    finally:\n        if readline:\n            readline.set_startup_hook(None)\n\n\ndef show(lines):\n    print()\n    for number, line in enumerate(lines, 1):\n        print(f\"{number:3} | {line}\")\n    print()\n\n\ndef main():\n    if len(sys.argv) != 2:\n        print(__doc__)\n        return 1\n    name = sys.argv[1]\n    try:\n        with open(name, encoding=\"utf-8\") as handle:\n            lines = handle.read().split(\"\\n\")\n        if lines and lines[-1] == \"\":\n            lines.pop()\n    except FileNotFoundError:\n        lines = []\n    changed = False\n    show(lines)\n    while True:\n        try:\n            command = input(\"line number, a = add, d N = delete, s = save, q = quit: \").strip()\n        except EOFError:\n            command = \"q\"\n        if command == \"q\":\n            if changed and input(\"Quit without saving? (y/n): \").strip().lower() != \"y\":\n                continue\n            return 0\n        if command == \"s\":\n            with open(name, \"w\", encoding=\"utf-8\") as handle:\n                handle.write(\"\\n\".join(lines) + \"\\n\")\n            print(f\"Saved {name}.\")\n            return 0\n        if command == \"a\":\n            lines.append(ask(\"new line: \"))\n            changed = True\n            show(lines)\n            continue\n        if command.startswith(\"d \") and command[2:].strip().isdigit():\n            number = int(command[2:])\n            if 1 <= number <= len(lines):\n                del lines[number - 1]\n                changed = True\n                show(lines)\n            else:\n                print(\"There is no line with that number.\")\n            continue\n        if command.isdigit() and 1 <= int(command) <= len(lines):\n            number = int(command)\n            old = lines[number - 1]\n            new = ask(f\"{number:3} | \", old)\n            if not readline and new and not new[0].isspace():\n                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation\n            lines[number - 1] = new\n            changed = True\n            show(lines)\n            continue\n        print(\"Type a line number from the list, a, d NUMBER, s or q.\")\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"
   },
   {
    "path": ".lab-data.gz",
    "encoding": "base64",
    "content": "H4sIAAAAAAACA91aTY8bNxI9j34Fj7uAPWCRLH74ltgDw0B2vJgYAQLMpVhVtBvWsJXu1nj97xet8UyCxSKHwI4lQdBFZFP18V69Itk2h6CpekgtOsdwAQaMNbCxpZGzVDHnZKNNF9YcPhur0SFiVvRRqk8XP/3w4/Or61f/fvvm+t1zm277tS6fxunjCzMvw3ZreOxdeVG57W+XDzoZ7bIbh77ML0wfzbzf7baDiqGtTsttv9F5N/ZZzaJ0t85Y1u/Q1in1s+H9NGlfzG5L/ba/+zDMZpgNmTb8R8UMnQdZh+9G0e2zw9NkZuX9NCyfzczULzeQ1GvGGBso+2Qvbq5evv3l6uZX8/O7H16/uX59238k/rjfmZvnNr8wY2vboauhLuZep4Mpt/2VzsvQaRnG/sLMuqOJFjW8VepmUh7vdfpstN8P09jvtC+3/eXYFxr6YZ3dpLNO92r0fjWY1VRt4/S/C1ze9uvR1Adrhtncjfu+rLHqssauDVudDa2PfaD+XuVyAwUKAYpTnyJV/PbpGdrAhzCs0d/uZV3pr+VFMdvqgtfKWpqcHrKcdUg5iAMLKCFcXP3y5tXV9csrc3P1+s3P765u1oXVzLo92G0+DTs1n8b9VozovEzjZ7Os44+WP/3rI0wuzY3eD/OwHOZNjx5N+17H8eMjiJ7gs3EuecwePOfAIdH/s+hfI398iNEzswx3uoL92QFi1NrBzucr0Mx2WBH/3ky6wljFtHE6mCE6D+87rQ5Nf4zxpbkezaS0/SNQx+2D75cb562vHnwNmmIu8Svw8NHgJySYf+z7TE3NNO4X/effRELvUkTrIcaQE7Rz8qzZJJiCSq6tJHc+ngUIxJpcqcqImS/sQQntJngsCJATqve25L9LLm4ef91NOulv+5X1Oj/Un9WTeaWW/BVPMQeVCCEn1xjdQdph9ZQrR2+9Q9Gi6P+kAA/zuKUjqrxBwFebWys+BPD2hGQPwUUqYJWZgyc+PdlDR0TZZkpYQpDy/WUPnXJq0rKwAiGcPGcxpFJzaqly8624Y9JxzBoCxJDZFaaUjiD9Ci4V4OyZIFc9H5WKlrznggI+q2/ntXeJQF5CISCsSZ2cUdocCYolV6JWoPwNlfWr6VIMpZVkSxMq1UE7ppITY0SRUJ1wg0jthDqVSIUcRh8RHGIKpyf3kT22KhAse4w2n1cNkmwTWBtKBAiOTwhZCYoV1ozWB07Rn0KRST5VrghYrAPK+P17h1RTrCiRfaks8ZQO0JIkIAehuVaitQ9b2HVjl20opXECEQD2cFaMzRghY0kZUqithVOAfY5aIrncXPTs21G18zmDMgYXoJD6xt+fkjlnsFkKp5QqUzgv+JKPXKtgEFGmhxsYMLDJlX226JO6WMXb8+mGC/poubqYWuai5YQ0tlAhRlKfNBC7/HR2VqhlappSjhgC5S9ptBuqBYsNkZC4KeIplCfSBhQxaOEQxMoxlaeKXtH5GIvV4JnPhxZVmm21REsp5+zaWZU5BuvAe5+lNC6cjglSnGILjqNLmpLP4alvYgYUYldtdnbdq8GXS3AWjIE0I4HkKHRCTSJLtYCOLAqTy+7JJ7EquWiSiJC5HUErLgAlKZBIQZuyPQKLgnOaGMU1Rw316ZJIUqTIDTBLTdKO4AhcyLeUSKig1lLzMRFOqxfG6JyPtnGqTy+XNFuhNAUKqI3qA+FWJja01nnUpigqkX8fiMo+xpRFWgj5qNxsqVSNkiRUKCXj+UhV45pUJcUcSs3ovrw2ZDf/BSKkJ5ZQJAAA"
   }
  ]
 },
 "SEC-406": {
  "id": "SEC-406",
  "title": "Software Supply Chain Verification (real machine)",
  "track": "Ethical Cybersecurity",
  "grade": "Grades 11–12",
  "minutes": 35,
  "summary": "Compare three packages before a small pilot.",
  "markdown": "# SEC-406 · Software Supply Chain Verification\n\n> **Lab Brief:** *Three packages claim to be the same tool. Compare them with the trusted manifest, check the selected copy, and plan a small pilot. Nothing is downloaded or run.*\n\n## Your machine\n\nA real Linux machine with no network. The lab files are in `~/lab`.\n\n## Step-by-Step Instructions\n\n### Step 1: Read the case\n```sh\ncd ~/lab && cat README.txt case/brief.txt\n```\n\n### Step 2: Inspect the settings and the device readouts\n```sh\ncat settings.conf\nsh inspect.sh\n```\n\n### Step 3: Change a setting and test\n```sh\npython3 edit.py settings.conf\nsh test.sh\n```\n\nRepeat until `sh test.sh` prints `ALL_CHECKS_PASS`.\n",
  "milestones": [
   {
    "id": "m1-read-case",
    "title": "Read the case",
    "description": "Open the request and what is known before changing anything.",
    "hint": "Run: `cat ~/lab/case/brief.txt`",
    "checkType": "history_regex",
    "patternSource": "(?:cat|less|more|head)\\s+.*(?:brief\\.txt|README\\.txt)"
   },
   {
    "id": "m2-inspect",
    "title": "Inspect the settings and a device readout",
    "description": "Read settings.conf and run at least one readout.",
    "hint": "Run: `cat ~/lab/settings.conf` then `sh ~/lab/inspect.sh 1`",
    "checkType": "history_regex",
    "patternSource": "sh\\s+.*inspect\\.sh\\s+\\S"
   },
   {
    "id": "m3-settings",
    "title": "Every setting meets the request",
    "description": "Change settings.conf so each requirement in the case is met.",
    "hint": "Change one line with `python3 ~/lab/edit.py ~/lab/settings.conf`, then compare the readouts with case/brief.txt.",
    "checkType": "file_contains_all",
    "filePath": "/home/learner/lab/settings.conf",
    "expectedSubstrings": [
     "package=A",
     "signature=verify",
     "digest=verify",
     "deployment=pilot"
    ]
   },
   {
    "id": "m4-test",
    "title": "The full test passes",
    "description": "Run the test after your last change until every requirement passes.",
    "hint": "Run: `cd ~/lab && sh test.sh`",
    "checkType": "file_contains",
    "filePath": "/home/learner/lab/results.txt",
    "expectedSubstring": "ALL_CHECKS_PASS"
   }
  ],
  "files": [
   {
    "path": "README.txt",
    "content": "SEC-406 · Software Supply Chain Verification\n\nChoose the approved package, check its signature and digest, and pilot as a\nstandard user.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "SEC-406 · Software Supply Chain Verification\n\nRequested by: IT deployment team · Package review\n\nTHE REQUEST\nThree packages claim to be the same tool. Compare them with the trusted\nmanifest, check the selected copy, and plan a small pilot. Nothing is\ndownloaded or run.\n\nGOAL\nChoose the approved package, check its signature and digest, and pilot as a\nstandard user.\n\nWHAT IS KNOWN\n- Read the trusted publisher manifest: The approved publisher lists\nCLASSROOM-TOOL-4.2 from the approved catalog with signature “Training\nPublisher valid” and integrity label LAB-DIGEST-42.\n- Inspect package cards: Package A matches the publisher manifest. Package B\nis an unsigned mirror. Package C claims the right version but its digest\ndiffers.\n- Read deployment policy: Verify signature and digest, then stage a limited\npilot as a standard user. A familiar name or HTTPS alone does not prove\npackage authenticity.\n\nQUESTIONS ALREADY ANSWERED\n- Does an HTTPS download prove the package is safe? No. HTTPS protects\ntransport, while publisher and integrity checks address the supplied package.\nNo single check guarantees safety.\n- Should all users receive it with administrator rights first? No. Stage a\nlimited standard-user pilot after verification.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# PACKAGE VERIFICATION STATION · TOOL 4.2\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Candidate package\n#    B   B · unsigned mirror copy\n#    A   A · approved catalog copy\n#    C   C · mismatched digest\npackage=B\n\n# Publisher signature\n#    skip     Skip signature check\n#    verify   Verify publisher signature\nsignature=skip\n\n# Package integrity\n#    skip     Trust the filename\n#    verify   Compare digest with trusted manifest\ndigest=skip\n\n# Deployment plan\n#    all-admin   All devices with administrator rights\n#    pilot       Limited standard-user pilot\ndeployment=all-admin\n"
   },
   {
    "path": "inspect.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Shows a device readout for the settings saved in settings.conf right now.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='package signature digest deployment'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\ncase \"$*\" in\n  1|'inspect packages') n=1 ;;\n  2|'verify manifest') n=2 ;;\n  3|'preview pilot') n=3 ;;\n  *)\n    echo \"Device readouts for this lab (they follow settings.conf):\"\n    echo '  sh inspect.sh 1    inspect packages'\n    echo '  sh inspect.sh 2    verify manifest'\n    echo '  sh inspect.sh 3    preview pilot'\n    exit 0 ;;\nesac\ntext=$(lookup \"R|$n|$state\")\nif [ -n \"$text\" ]; then printf '%b\\n' \"$text\"; else unknown; fi\n"
   },
   {
    "path": "test.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Checks settings.conf against every requirement of this lab and records the\n# result in results.txt. Run it again after each change.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='package signature digest deployment'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\n: > results.txt\nflags=$(lookup \"T|$state\")\nif [ -z \"$flags\" ]; then unknown | tee -a results.txt; exit 1; fi\ni=0; pass=0; total=0\nwhile IFS= read -r label; do\n  i=$((i + 1)); total=$((total + 1))\n  if [ \"$(echo \"$flags\" | cut -d' ' -f$i)\" = 1 ]; then line=\"PASS   $label\"; pass=$((pass + 1)); else line=\"CHECK  $label\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_REQUIREMENTS'\nCandidate matches the approved publisher package\nPublisher signature is verified and valid\nPackage digest matches the trusted manifest\nDeployment uses a limited standard-user pilot\nLAB_REQUIREMENTS\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_CHECKS_PASS\"; else line=\"$pass of $total requirements pass. Compare case/brief.txt and the readouts with settings.conf, change one setting, and test again.\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
   },
   {
    "path": "edit.py",
    "mode": 493,
    "content": "#!/usr/bin/env python3\n\"\"\"edit.py: a small line editor for the lab files.\n\n    python3 ~/lab/edit.py FILE\n\nIt shows the file with line numbers. Type a line number to change that line,\na to add a line at the end, d NUMBER to delete a line, s to save and quit,\nor q to quit without saving.\"\"\"\nimport sys\n\ntry:\n    import readline\nexcept ImportError:  # the editor still works without line recall\n    readline = None\n\n\ndef ask(prompt, prefill=\"\"):\n    if readline and prefill:\n        readline.set_startup_hook(lambda: readline.insert_text(prefill))\n    try:\n        return input(prompt)\n    finally:\n        if readline:\n            readline.set_startup_hook(None)\n\n\ndef show(lines):\n    print()\n    for number, line in enumerate(lines, 1):\n        print(f\"{number:3} | {line}\")\n    print()\n\n\ndef main():\n    if len(sys.argv) != 2:\n        print(__doc__)\n        return 1\n    name = sys.argv[1]\n    try:\n        with open(name, encoding=\"utf-8\") as handle:\n            lines = handle.read().split(\"\\n\")\n        if lines and lines[-1] == \"\":\n            lines.pop()\n    except FileNotFoundError:\n        lines = []\n    changed = False\n    show(lines)\n    while True:\n        try:\n            command = input(\"line number, a = add, d N = delete, s = save, q = quit: \").strip()\n        except EOFError:\n            command = \"q\"\n        if command == \"q\":\n            if changed and input(\"Quit without saving? (y/n): \").strip().lower() != \"y\":\n                continue\n            return 0\n        if command == \"s\":\n            with open(name, \"w\", encoding=\"utf-8\") as handle:\n                handle.write(\"\\n\".join(lines) + \"\\n\")\n            print(f\"Saved {name}.\")\n            return 0\n        if command == \"a\":\n            lines.append(ask(\"new line: \"))\n            changed = True\n            show(lines)\n            continue\n        if command.startswith(\"d \") and command[2:].strip().isdigit():\n            number = int(command[2:])\n            if 1 <= number <= len(lines):\n                del lines[number - 1]\n                changed = True\n                show(lines)\n            else:\n                print(\"There is no line with that number.\")\n            continue\n        if command.isdigit() and 1 <= int(command) <= len(lines):\n            number = int(command)\n            old = lines[number - 1]\n            new = ask(f\"{number:3} | \", old)\n            if not readline and new and not new[0].isspace():\n                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation\n            lines[number - 1] = new\n            changed = True\n            show(lines)\n            continue\n        print(\"Type a line number from the list, a, d NUMBER, s or q.\")\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"
   },
   {
    "path": ".lab-data.gz",
    "encoding": "base64",
    "content": "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"
   }
  ]
 },
 "NET-207": {
  "id": "NET-207",
  "title": "Follow a Classroom Message (real machine)",
  "track": "Networking & Operating Systems",
  "grade": "Grades 7–8",
  "minutes": 30,
  "summary": "Compare supplied file and voice packet records.",
  "markdown": "# NET-207 · Follow a Classroom Message\n\n> **Lab Brief:** *“Our file needs complete delivery. The voice activity needs timely sound. Compare the supplied packet cards and label their jobs.”*\n\n## Your machine\n\nA real Linux machine with no network. The lab files are in `~/lab`.\n\n## Step-by-Step Instructions\n\n### Step 1: Read the case\n```sh\ncd ~/lab && cat README.txt case/brief.txt\n```\n\n### Step 2: Inspect the settings and the device readouts\n```sh\ncat settings.conf\nsh inspect.sh\n```\n\n### Step 3: Change a setting and test\n```sh\npython3 edit.py settings.conf\nsh test.sh\n```\n\nRepeat until `sh test.sh` prints `ALL_CHECKS_PASS`.\n",
  "milestones": [
   {
    "id": "m1-read-case",
    "title": "Read the case",
    "description": "Open the request and what is known before changing anything.",
    "hint": "Run: `cat ~/lab/case/brief.txt`",
    "checkType": "history_regex",
    "patternSource": "(?:cat|less|more|head)\\s+.*(?:brief\\.txt|README\\.txt)"
   },
   {
    "id": "m2-inspect",
    "title": "Inspect the settings and a device readout",
    "description": "Read settings.conf and run at least one readout.",
    "hint": "Run: `cat ~/lab/settings.conf` then `sh ~/lab/inspect.sh 1`",
    "checkType": "history_regex",
    "patternSource": "sh\\s+.*inspect\\.sh\\s+\\S"
   },
   {
    "id": "m3-settings",
    "title": "Every setting meets the request",
    "description": "Change settings.conf so each requirement in the case is met.",
    "hint": "Change one line with `python3 ~/lab/edit.py ~/lab/settings.conf`, then compare the readouts with case/brief.txt.",
    "checkType": "file_contains_all",
    "filePath": "/home/learner/lab/settings.conf",
    "expectedSubstrings": [
     "layerMap=matched",
     "fileTransport=tcp",
     "callTransport=udp",
     "addressPair=matched"
    ]
   },
   {
    "id": "m4-test",
    "title": "The full test passes",
    "description": "Run the test after your last change until every requirement passes.",
    "hint": "Run: `cd ~/lab && sh test.sh`",
    "checkType": "file_contains",
    "filePath": "/home/learner/lab/results.txt",
    "expectedSubstring": "ALL_CHECKS_PASS"
   }
  ],
  "files": [
   {
    "path": "README.txt",
    "content": "NET-207 · Follow a Classroom Message\n\nLabel message jobs, stated transports, and address families.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-207 · Follow a Classroom Message\n\nRequested by: School network team · Local practice model\n\nTHE REQUEST\n“Our file needs complete delivery. The voice activity needs timely sound.\nCompare the supplied packet cards and label their jobs.”\n\nGOAL\nLabel message jobs, stated transports, and address families.\n\nWHAT IS KNOWN\n- Follow the message path: Application prepares content; transport handles\nend-to-end delivery; IP routes between networks; Ethernet carries frames on\nthe local link. Here these map to OSI 5–7, 4, 3, 1–2, and TCP/IP application,\ntransport, internet, link.\n- Read transport records: File: HTTPS over TCP, destination port 443, ordered\nreliable byte stream. Voice: RTP over UDP, destination port 5004, no transport\ndelivery/order guarantee. This voice example avoids transport retransmission\ndelays.\n- Read address cards: 192.0.2.24 is an IPv4 documentation example with dotted\ndecimal numbers. 2001:db8::24 is an IPv6 documentation example with\nhexadecimal groups and colons. Neither address is contacted.\n- Check application evidence: Compare the supplied application labels with the\ntransport records. A port alone does not prove application identity. These are\nfixed packet cards; no live capture tool is launched.\n\nQUESTIONS ALREADY ANSWERED\n- Why use different transports? The file needs complete ordered bytes. This\nvoice example uses UDP media and accepts possible loss to avoid transport\nretransmission delays.\n- Does port 443 alone prove the application? No. Compare the supplied\napplication label and transport evidence.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# CLASSROOM MESSAGE TRACE\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Message-path model\n#    swapped   IP routing → transport; TCP → link\n#    matched   Application → OSI 5–7; transport → 4; IP → 3; Ethernet → 1–2\nlayerMap=swapped\n\n# Complete-file transport\n#    udp   UDP\n#    tcp   TCP\nfileTransport=udp\n\n# This voice media transport\n#    tcp   TCP\n#    udp   UDP\ncallTransport=tcp\n\n# Address-family labels\n#    reversed   Dotted → IPv6; colon → IPv4\n#    matched    192.0.2.24 → IPv4; 2001:db8::24 → IPv6\naddressPair=reversed\n"
   },
   {
    "path": "inspect.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Shows a device readout for the settings saved in settings.conf right now.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='layerMap fileTransport callTransport addressPair'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\ncase \"$*\" in\n  1|'trace layers') n=1 ;;\n  2|'compare transports') n=2 ;;\n  3|'inspect addresses') n=3 ;;\n  *)\n    echo \"Device readouts for this lab (they follow settings.conf):\"\n    echo '  sh inspect.sh 1    trace layers'\n    echo '  sh inspect.sh 2    compare transports'\n    echo '  sh inspect.sh 3    inspect addresses'\n    exit 0 ;;\nesac\ntext=$(lookup \"R|$n|$state\")\nif [ -n \"$text\" ]; then printf '%b\\n' \"$text\"; else unknown; fi\n"
   },
   {
    "path": "test.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Checks settings.conf against every requirement of this lab and records the\n# result in results.txt. Run it again after each change.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='layerMap fileTransport callTransport addressPair'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\n: > results.txt\nflags=$(lookup \"T|$state\")\nif [ -z \"$flags\" ]; then unknown | tee -a results.txt; exit 1; fi\ni=0; pass=0; total=0\nwhile IFS= read -r label; do\n  i=$((i + 1)); total=$((total + 1))\n  if [ \"$(echo \"$flags\" | cut -d' ' -f$i)\" = 1 ]; then line=\"PASS   $label\"; pass=$((pass + 1)); else line=\"CHECK  $label\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_REQUIREMENTS'\nMessage-path models match supplied jobs\nFile uses stated ordered reliable transport\nVoice uses the stated UDP media transport\nBoth address families are identified\nLAB_REQUIREMENTS\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_CHECKS_PASS\"; else line=\"$pass of $total requirements pass. Compare case/brief.txt and the readouts with settings.conf, change one setting, and test again.\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
   },
   {
    "path": "edit.py",
    "mode": 493,
    "content": "#!/usr/bin/env python3\n\"\"\"edit.py: a small line editor for the lab files.\n\n    python3 ~/lab/edit.py FILE\n\nIt shows the file with line numbers. Type a line number to change that line,\na to add a line at the end, d NUMBER to delete a line, s to save and quit,\nor q to quit without saving.\"\"\"\nimport sys\n\ntry:\n    import readline\nexcept ImportError:  # the editor still works without line recall\n    readline = None\n\n\ndef ask(prompt, prefill=\"\"):\n    if readline and prefill:\n        readline.set_startup_hook(lambda: readline.insert_text(prefill))\n    try:\n        return input(prompt)\n    finally:\n        if readline:\n            readline.set_startup_hook(None)\n\n\ndef show(lines):\n    print()\n    for number, line in enumerate(lines, 1):\n        print(f\"{number:3} | {line}\")\n    print()\n\n\ndef main():\n    if len(sys.argv) != 2:\n        print(__doc__)\n        return 1\n    name = sys.argv[1]\n    try:\n        with open(name, encoding=\"utf-8\") as handle:\n            lines = handle.read().split(\"\\n\")\n        if lines and lines[-1] == \"\":\n            lines.pop()\n    except FileNotFoundError:\n        lines = []\n    changed = False\n    show(lines)\n    while True:\n        try:\n            command = input(\"line number, a = add, d N = delete, s = save, q = quit: \").strip()\n        except EOFError:\n            command = \"q\"\n        if command == \"q\":\n            if changed and input(\"Quit without saving? (y/n): \").strip().lower() != \"y\":\n                continue\n            return 0\n        if command == \"s\":\n            with open(name, \"w\", encoding=\"utf-8\") as handle:\n                handle.write(\"\\n\".join(lines) + \"\\n\")\n            print(f\"Saved {name}.\")\n            return 0\n        if command == \"a\":\n            lines.append(ask(\"new line: \"))\n            changed = True\n            show(lines)\n            continue\n        if command.startswith(\"d \") and command[2:].strip().isdigit():\n            number = int(command[2:])\n            if 1 <= number <= len(lines):\n                del lines[number - 1]\n                changed = True\n                show(lines)\n            else:\n                print(\"There is no line with that number.\")\n            continue\n        if command.isdigit() and 1 <= int(command) <= len(lines):\n            number = int(command)\n            old = lines[number - 1]\n            new = ask(f\"{number:3} | \", old)\n            if not readline and new and not new[0].isspace():\n                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation\n            lines[number - 1] = new\n            changed = True\n            show(lines)\n            continue\n        print(\"Type a line number from the list, a, d NUMBER, s or q.\")\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"
   },
   {
    "path": ".lab-data.gz",
    "encoding": "base64",
    "content": "H4sIAAAAAAACA+1awXIbNxI9i1+BD3BR6AbQQJMnlaXduHZTYVnKnnQB0A2bFWZGRY608S2nfED8h/6S1JCU7bhqdUhqyy6ObpxhowfziH7vNUBrFaVgLVaxNF/PLi4vX19dX5uXF68vr2+76/ygYja56Ga3MMA4t3OcozcffvvdvFo9+KVBa2EhJS0Wn27TbfcpdrEPfGEcmrIedi+M9MOgYkTr+ue8md92n6fYR9MLA5iO4W/1l3yMNW+2/f3dzvx3Pbw1td/03W5uLvt6/7N2Qx7WfXecq+m7zbul6Xpzl+tPOuzMTrthPrPeeU4ZrCu2EoczMGCsgZmNUoImiQhOLfmz1cXLf13dPOLwj/VGF+a7m5vVtekfdGtuXq5emLt+Oxjv3dLs9jgN29zt9jfv5W5+2/2nX1ddmNc3q8OgHy8fBwVr/f8adfNyZe62/cNadGf6rehWxWx1s85lo6a8G3S3HFOZvOk7NW/u8zZ3g+rOdLoe3urWiG7WD7p9Z7p+e8gwN6t+O+yOQ6Q3XT/sH6Im391t1nUP3m4+g4oNXOZirfpA8jdxGOpfweEw6uviIIXVBwZuApVgsji0WNGidV4lWitndl8wduasVlsA1ImEksvZ91fX1xf/vDKri5vvbrsfyk63DyqLz/Pt6eHT6x3Iwmz7+2HdvdlfXo3z7XQwm3X30/zIPwtz8UWOH65fmfDh1/dx+UU6vxwzjp/c8lOy8Ro+/Poeb7vX2nSr3fgzfExizo0358aZ80PUcvw1z1+t/jT188+edG7W3XBIfX6Yqfn3gXb+hOQj7POZA0UozFZdSgT4NM1eHvjxkUuXB6b7SLnfKrc6VGtzBBea9dXyVymZb4BCfUyQkystkYBoObOjwhiYeQH2rrrMFSm6yWqMl+Apt8y1xpzpNKvBt1E9wLVgvRPxJ/mSAdEXxlCqBqRWn0XgCREIOTQOHCWnwuJoqpYi1OZb08ih2iJRTr3nCBqqs9yi88LS2nORPFEkFJ1lsRRd8BGc3Tdoo3hSCo5CDMFVRwztJPmUKgFJdK4hp4zubO+1jZ1F8JEKoVNABQ5HTzF+wbl4ttWTNIBHvOwsUqw1BiriorSC/9dV90XUxxT79bG/NcZ/rTUVS8pBVDlRRdfo1AknJUIUyOC1NmkwVSOeGDBF9pKCFck0WRw0Yxs1yIXYqJ4mdbK1CkSSHTB4wWeVfYIRGVE4ic9JfVCGCYsDe8GK6JO4COjcVF05hwRudAtoGzvBqZIl51aZICZobJOWvQUbDSjX6CF6KlxshuJP3UWweg1NK4BA4v1RycFyZo+e0PsqWaURnaSc5IRac4TWLDixMmGGzImq982niJyDtVOGolipwZIDSeTD42kIzHKhVAkhiPgSqH2Vrd1vQEUKiDBYRuIWIaTJ4oDRNwdAVGoi0P1CGVWkOIUSYqoeorOVp3oGUFJpjgJAQK7EU+bXwq5wwqK5UMktnrqxKDWJ5wQpsWeseb+XNZJotUQ+keXAvgaLxz9n2FnFRCWVDBklUgnPvd0Ty6lyc5URx7N5luwnXFk1QyMVKIwCtdKUoWgevEObHHgfVZ9L6EmwFDzbIkWAKIWT7HAEYig+YAveksZ06rIjITq2WRFbSeLCVK2pJFBbIxA3F1s++X0M4VRtwlYglEjEExYBYXWRckVQX1zlZxF4CiytGZuHQA1djPIM1hNgqW0+YIqEmGIpOtW2VgEgWBez5dhyg2Pfb2eKRKA6NjdC9bitPDY9ikJZm2oD9hHg2A3ZWYMqITSKvvkmtk5Vr5rnBtBCUicl0WmeXjYmBVcShhIklnDqovwHzPwfUHgyAAA="
   }
  ]
 },
 "NET-208": {
  "id": "NET-208",
  "title": "Connect the New Classroom (real machine)",
  "track": "Networking & Operating Systems",
  "grade": "Grades 7–8",
  "minutes": 30,
  "summary": "Match room layout, device jobs, and cable limits.",
  "markdown": "# NET-208 · Connect the New Classroom\n\n> **Lab Brief:** *“Each PC needs its own classroom connection. Use the map and approved equipment list to choose the layout and building link.”*\n\n## Your machine\n\nA real Linux machine with no network. The lab files are in `~/lab`.\n\n## Step-by-Step Instructions\n\n### Step 1: Read the case\n```sh\ncd ~/lab && cat README.txt case/brief.txt\n```\n\n### Step 2: Inspect the settings and the device readouts\n```sh\ncat settings.conf\nsh inspect.sh\n```\n\n### Step 3: Change a setting and test\n```sh\npython3 edit.py settings.conf\nsh test.sh\n```\n\nRepeat until `sh test.sh` prints `ALL_CHECKS_PASS`.\n",
  "milestones": [
   {
    "id": "m1-read-case",
    "title": "Read the case",
    "description": "Open the request and what is known before changing anything.",
    "hint": "Run: `cat ~/lab/case/brief.txt`",
    "checkType": "history_regex",
    "patternSource": "(?:cat|less|more|head)\\s+.*(?:brief\\.txt|README\\.txt)"
   },
   {
    "id": "m2-inspect",
    "title": "Inspect the settings and a device readout",
    "description": "Read settings.conf and run at least one readout.",
    "hint": "Run: `cat ~/lab/settings.conf` then `sh ~/lab/inspect.sh 1`",
    "checkType": "history_regex",
    "patternSource": "sh\\s+.*inspect\\.sh\\s+\\S"
   },
   {
    "id": "m3-settings",
    "title": "Every setting meets the request",
    "description": "Change settings.conf so each requirement in the case is met.",
    "hint": "Change one line with `python3 ~/lab/edit.py ~/lab/settings.conf`, then compare the readouts with case/brief.txt.",
    "checkType": "file_contains_all",
    "filePath": "/home/learner/lab/settings.conf",
    "expectedSubstrings": [
     "cables=reseated",
     "topology=star",
     "localDevice=switch",
     "boundary=router",
     "media=matched"
    ]
   },
   {
    "id": "m4-test",
    "title": "The full test passes",
    "description": "Run the test after your last change until every requirement passes.",
    "hint": "Run: `cd ~/lab && sh test.sh`",
    "checkType": "file_contains",
    "filePath": "/home/learner/lab/results.txt",
    "expectedSubstring": "ALL_CHECKS_PASS"
   }
  ],
  "files": [
   {
    "path": "README.txt",
    "content": "NET-208 · Connect the New Classroom\n\nConnect PCs through a central switch and the approved routed fiber path.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-208 · Connect the New Classroom\n\nRequested by: School network team · Local practice model\n\nTHE REQUEST\n“Each PC needs its own classroom connection. Use the map and approved\nequipment list to choose the layout and building link.”\n\nGOAL\nConnect PCs through a central switch and the approved routed fiber path.\n\nWHAT IS KNOWN\n- Read the room map: Each of 12 PCs has a separate run to one cabinet: a star\nlayout. Disconnecting a PC must not break a neighboring PC’s connection.\n- Read device jobs: A switch forwards Ethernet frames within the classroom\nnetwork. The existing school router forwards IP packets between networks. A\npassive cable splitter cannot replace a switch.\n- Compare cable limits: Approved copper supports 20 m indoor desk runs, with a\n100 m channel limit. The building link is 180 m; approved fiber modules cover\nit and avoid an electrical connection between buildings.\n- Read the logical plan: PCs share their approved local subnet through the\nswitch. The existing school router is the boundary to other networks. Use\napproved copper to desks and fiber between buildings.\n\nQUESTIONS ALREADY ANSWERED\n- Can PCs forward for one another? The room requires independent desk runs to\na central switch.\n- Can copper cover every distance? This 180 m building route exceeds the\napproved copper channel’s 100 m limit.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# CLASSROOM INSTALLATION PLAN\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Network cables on the bench (1 unplugged at the start)\n#    unplugged   Leave as found\n#    reseated    Reseat every unplugged cable\ncables=unplugged\n\n# PC layout\n#    chain   Each PC forwards for the next PC\n#    star    Independent runs to central cabinet\ntopology=chain\n\n# Classroom connection device\n#    passive   Passive cable splitter\n#    switch    Central Ethernet switch\nlocalDevice=passive\n\n# Other-network path\n#    local-only   Local switch only\n#    router       Approved school router\nboundary=local-only\n\n# Cable plan\n#    all-copper        Copper for desks and 180 m building link\n#    matched           Approved copper to desks; fiber between buildings\n#    desk-fiber-only   Fiber to desks; no building uplink\nmedia=all-copper\n"
   },
   {
    "path": "inspect.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Shows a device readout for the settings saved in settings.conf right now.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='cables topology localDevice boundary media'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\ncase \"$*\" in\n  1|'inspect layout') n=1 ;;\n  2|'inspect devices') n=2 ;;\n  3|'compare cables') n=3 ;;\n  *)\n    echo \"Device readouts for this lab (they follow settings.conf):\"\n    echo '  sh inspect.sh 1    inspect layout'\n    echo '  sh inspect.sh 2    inspect devices'\n    echo '  sh inspect.sh 3    compare cables'\n    exit 0 ;;\nesac\ntext=$(lookup \"R|$n|$state\")\nif [ -n \"$text\" ]; then printf '%b\\n' \"$text\"; else unknown; fi\n"
   },
   {
    "path": "test.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Checks settings.conf against every requirement of this lab and records the\n# result in results.txt. Run it again after each change.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='cables topology localDevice boundary media'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\n: > results.txt\nflags=$(lookup \"T|$state\")\nif [ -z \"$flags\" ]; then unknown | tee -a results.txt; exit 1; fi\ni=0; pass=0; total=0\nwhile IFS= read -r label; do\n  i=$((i + 1)); total=$((total + 1))\n  if [ \"$(echo \"$flags\" | cut -d' ' -f$i)\" = 1 ]; then line=\"PASS   $label\"; pass=$((pass + 1)); else line=\"CHECK  $label\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_REQUIREMENTS'\nPCs have independent star connections\nLocal Ethernet uses the switch\nOther networks use the approved router\nReconnect the disconnected network cables, then test again\nLAB_REQUIREMENTS\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_CHECKS_PASS\"; else line=\"$pass of $total requirements pass. Compare case/brief.txt and the readouts with settings.conf, change one setting, and test again.\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
   },
   {
    "path": "edit.py",
    "mode": 493,
    "content": "#!/usr/bin/env python3\n\"\"\"edit.py: a small line editor for the lab files.\n\n    python3 ~/lab/edit.py FILE\n\nIt shows the file with line numbers. Type a line number to change that line,\na to add a line at the end, d NUMBER to delete a line, s to save and quit,\nor q to quit without saving.\"\"\"\nimport sys\n\ntry:\n    import readline\nexcept ImportError:  # the editor still works without line recall\n    readline = None\n\n\ndef ask(prompt, prefill=\"\"):\n    if readline and prefill:\n        readline.set_startup_hook(lambda: readline.insert_text(prefill))\n    try:\n        return input(prompt)\n    finally:\n        if readline:\n            readline.set_startup_hook(None)\n\n\ndef show(lines):\n    print()\n    for number, line in enumerate(lines, 1):\n        print(f\"{number:3} | {line}\")\n    print()\n\n\ndef main():\n    if len(sys.argv) != 2:\n        print(__doc__)\n        return 1\n    name = sys.argv[1]\n    try:\n        with open(name, encoding=\"utf-8\") as handle:\n            lines = handle.read().split(\"\\n\")\n        if lines and lines[-1] == \"\":\n            lines.pop()\n    except FileNotFoundError:\n        lines = []\n    changed = False\n    show(lines)\n    while True:\n        try:\n            command = input(\"line number, a = add, d N = delete, s = save, q = quit: \").strip()\n        except EOFError:\n            command = \"q\"\n        if command == \"q\":\n            if changed and input(\"Quit without saving? (y/n): \").strip().lower() != \"y\":\n                continue\n            return 0\n        if command == \"s\":\n            with open(name, \"w\", encoding=\"utf-8\") as handle:\n                handle.write(\"\\n\".join(lines) + \"\\n\")\n            print(f\"Saved {name}.\")\n            return 0\n        if command == \"a\":\n            lines.append(ask(\"new line: \"))\n            changed = True\n            show(lines)\n            continue\n        if command.startswith(\"d \") and command[2:].strip().isdigit():\n            number = int(command[2:])\n            if 1 <= number <= len(lines):\n                del lines[number - 1]\n                changed = True\n                show(lines)\n            else:\n                print(\"There is no line with that number.\")\n            continue\n        if command.isdigit() and 1 <= int(command) <= len(lines):\n            number = int(command)\n            old = lines[number - 1]\n            new = ask(f\"{number:3} | \", old)\n            if not readline and new and not new[0].isspace():\n                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation\n            lines[number - 1] = new\n            changed = True\n            show(lines)\n            continue\n        print(\"Type a line number from the list, a, d NUMBER, s or q.\")\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"
   },
   {
    "path": ".lab-data.gz",
    "encoding": "base64",
    "content": "H4sIAAAAAAACA+1dzZIbR44+dz9FvcBoEplIJFJzkiVthDb8oxjP+qQLEj/TDLfIXpKyx2+/UWo2ey3LIcu2NFNs3jrYRVYlEsAHfECiUqHB0GqXbAiJL/7+zTdfTV89eflq/a384PZ4ei56Nb18OsVm+6NsbTf/Me2vfFr7v/bTy6ev1i+f/iXhZKudbtZr1/3jyTY/rnf7rcvr6eXT3WR+42ubNuvp9tLDT63W/3z0av1Uxmrt+8fTU1/vt3I9Pd9f+Xbt+2n342qvV4+mr+Rm2vr/vlltfTdBnlbr2x/09X7avlnvHl2mCm0UitRZjcq4+PZ/Xr788sXzZ9Pz7148e/710+fTX6dvn3z3/Nn08ssnX79a/+NqtZu2rputTavdtN7sJ5n0zXY7/+ZhGasfVvufpq3v3lzvH71aP3v+3Yunz6f//uaLb1+tv9yoXD+eXsput/rBJ5Vx7dPu5nq13/v20fHzu08mlfV8jxvfxmb7eoqtvPbD+m6l8M286Gnt+x832+93j6e3NzhcMW3W1z89mr7eTK835tdu03bzZu823cj+atpvps3PvvzoMlFykUpeUq65tAuYYEpTukxUHUdLYGjBYRfvW9Sv7sO3t09z7bJd7/561IfjdW9XtXvPYp7c3Gw3P7hNO73abK5vH3/76P7z2w/uVezFy2n4/kf39c9Wpe4yRm65JCjtMz38H9uJlpnM0F1SDOFPoZhPn3zx5fPD1w82+1+r4dv5ecx33+/+Nq0303izup4tbnpzc71af/9q/Wz+1+Mpp+n13ya52wnd3Nz4drpevV7tH0+Q0vT60fTF4buPJ+CfXx5vb/R6Y2+ufTfp5gffTqv5of5+a6/27n3nRb1e7Xaz1s9yvLWc1Xq3l+trt1lizK2jQcMKddSLWXNh1t0mJVNT6aClt/d4qhfv+IVZAHrQB731Mu9zVmtf/fNqbLbzQ+78Rray97vrb39nt5ef7oTv9mf5LJasOWlyRfbc/yPW82sO7TcspxeKAdawercqD90FS5IooYAKYa1cnJiVDh1UQaupjhb6KXb73xeJ/AErsDYASkQd3Rjtc1nBfxjsQQrFAhxM1jThZ1GPRblLAMo8LGFB6A37EoIZgNGrcHfSXqW3s9Ef9jJnxQqt0qDUO18sCKcg91oSWjNTZqb34dSTd2DnHrFugeUuVL8Dkd2nhq0vNvuruz2xWxu9klmGb1b7t+J97baS9yMXFNHRVEcSd0Y95kZQVIdBM+OSw/19knh6u4BZBd9KYJK13T72PYJ+Dty+vaX/S91tN+1nMzv8tF7Jeu3Xt7f4FQlgEJUMoVKNIB54pAZVByanhkDMn8arfV5x/DnpNhD1ZFhGqdVz1tP3DK1JTY7K1phGXMx555x5AkNKLQchFRh4xr073GM2tEKWMVFP9JnIjdNSui7EoJ2qCHPyU42U/wBRApq0a3PoGUod6axmv0PNNA/pLUQrW0rtIh1YNYiheWg0GzlHu3d6OY3uVMRZKXGSiyV6qAylIFSDYcUI8LjsDEVaslChQLN0/4+c2kwyolrFRPVM2H6ICsoZS6E+cgK23usSMtmMQgoZi0Yq2MfSueRcS0AEgUqEhN+rcx3VwHNNFRFKXjjJnEkKu1jXAOpAZ7T8pYi694EFFYoXolMjnnN3h5qtjKhBjuds7eDRekSnVEsLbALpSGtkZc0QM+xzkcEnS2tkG6mUuTIojbCWZXYyZAv2NNfuu+WuuNwCwp+k11GgUa8t4YBUy9ty8Fu9jsaeRW14K5rzxSKtNqwIskrCAhB8jL5LUk/FUlMWzwU+Uxh6Eo6glNYMsJZsMjvFcwj/IVAtyHPFzhCdNWo9LYLrD3jjUpMmoHALbgPwTD18PPVQKs8u2oSUpfdxzE1KHZ44m2lqQS5nrbvTuqEenhNhNmyjL6pLr1gq4CQpQWVFOQfod3LJIymX0lSyyXjogV0x8cEFq2W2Imei7cMoHZnbyFxDutYED7xuWyJ7wxZmPHgu5J+x+aOxGVNksF5khKfSl4U0mDth8TGMkKDcJk9zaojcCwGXoVgCcj1D0EFgg3LpLQKIvGJbOuuNQ6PkKk5htTV46JCK2m307IGZ2EdaQiUGzQSoCfeRoI9ysvQkBhgbKGJqVVp64Ohd03zqoRFBBygy3vLVMMFlzRg0BlVxjkqySF6v5mjWG3PhmrjqyWp1LQOTVRYakRrWc0HuFyhVsRB09Q7DCHo+0xxHwfRMKKkC5pYSLrLDpFZhUoHo5smID/UJuKx1oOReNUUriunk2ydrDebcsCVBzK0ePHq6rC2n3BhwALBFnA3gTndaUydBUqROnE6sVF9ZckKIijQI6jie5Ky9+9xynRO2lGhZWefcpxlu1FrllnNf0mGPqqFhGIUzushdsx9c1hhhail3LlSjnjucDxYaoY3Bx4Bs2GXh7VNUJZgAkWvHbmXpyyEZWEKkWDajtCg/QiyloM3uMXi0fIRL4lGGgiWn6AN5CVk8jWFQqs14ppV9Ec+s0tWDehXyUfKRPiRVweQOPTCH3zUNwyXpPDZDss++Mv7fWA0ygCRURqTMmBdvV+FcZpoC3JOmdmJxSUu5tdQDtQcZtMPGw2VLGlgy1O5cCt42hc/72yCRQ9FauRtlOdl0vuUuaEMEiYc7LpJ8achewkwxFyyalrkIqpyx99bDclY7+Bq4bA1RrZuLjBpjHN1W41xbyak2AoVz29NvcARvZ145Kbk6FT75FL1JDdeio3SSkvXYTNnECnRX7rVwGXae1/AuJrYxkkYXkOoji54bMj8CVSLy4FJVRzYb53Oiv8N0mZIZBQilSp7wEJvAJVN37ZDUOIvkOOIB98bIwi1Db63c83E8KgwqdQA3DY5F8q6sIJrmyRWF0aWc0e5DaMfKVLoSW0j3wovKllkDgNIQaKk2xmNozlZ5Ri+GqFElLfPUB1tQZxkmTADVF7oKt4IQggEsIf2BDr/iMBwpBiVET5wW6V87ECqnnDN61k8zyOxU450OI9QKtIpI1Pmh9yV17GO0HkiNeVA/8ma9SSpdh2u13hItMlPvzXPzISOl0huOs6V8hKV0CctjzsBrjTzOeecv/LAxumk2h5K0jnPx/CiYIZjFpA/01E+3cbBbaOEeYgQ8T5I928i7quCKTs0MRkR8Gn5hQVX+HuoWlMcIZiI/sfJNDwtlK71nH778OeA9HMClUu1ztDiOpKykht1MqJPJ4H7sn5mpW9Z5ds1oMlIsqQVF5pOBDG451wA+n9r5HVygdJWoNJhqK1jjHHH+djSVIT2wS4siXUHOvOGH/K0EdUCrJc/Hh0o5Um8jcZTg2qikllGPwytGJZRc80joY9bPO8c1SEdKjahmLrW3JTmu0VUp1FLNfRjIyRcLRw/Bnvo84D99otxsifn+GIRRuXCpnKuWh87uaFFK8wtbirQ6T546HwF5N8TTEoI4oGsbXB2OpTitdSRHz5AFUuRFUsVKeeZxWi7Y+jzC9s7dq4BK5ZyCHSKf3wLxS9EJj+qM7JrGQ+hAURljuBjX+di54jl0/e2hq4pnBm6UdO7MzMdEUQcVUi1hMDco4slSYTpItCgyg5LlhY7406GSi6GpRMF2Bsz3iMiBAzExp6Jc9IFWkq2ApQqOzFg1pyXlS1YySmJmqC2pj2N2aJhKSUVGUmyl8iJjHsPhgFC0pGEifuy6MoKKOadsZlxbOWdNB3VgpgbUSDmb+P0cz/mYfPBMBWqCkpdZA7Y+GLXnFFLnt1cuE5hsPsVfpeTMAUPPJ9XvBRNRiNgqNiA6l6l/KaGRHIZyJIZM3C6WvpwCZFVnAKst4Fyl+PhUz8bgmiQ1wuFZxomVIc3AreZug6WpnaP491hRABmKSI3S0Oxk81IHhUESwVE9fabXUiwgSnYaTikojK1YOv0ZKM4tpaqUIgtHX1TC5sxUU9Igiwxez5j3e/Y/aqvIKdv8dgI4O4KDI+i9m3Nn9M4McGKxgLvnISJuoj6inZsKPiyx6Fgzcqh6YXygBF/MMy/JmLwR8vsnLZyUgwyAgWocpdTWP83rLpdUPA/gykaJQoBb4WNlODKMKI48SIPb+QUwHxGOR1b0ihmLY48qS+8QjZoTGvXE4szl/vBjNH87Pp9q007A9/9gbMKlSUphxdtZez5Ce7rZKGpWoMro5aFCk4APDOkc3MXxxEK2kBLzmXmZxzk50UPd5RFJGrmk1nOSsnhX6am10YZDm0d0yaEXCS7/D7RgFCzokAAA"
   }
  ]
 },
 "NET-209": {
  "id": "NET-209",
  "title": "Split the Classroom Network (real machine)",
  "track": "Networking & Operating Systems",
  "grade": "Grades 9–10",
  "minutes": 30,
  "summary": "Calculate an address range and compare a routing-neighbor mismatch.",
  "markdown": "# NET-209 · Split the Classroom Network\n\n> **Lab Brief:** *“Our block begins at 10.40.8.64 and needs 50 hosts. The school route stopped being learned after a routing-area change. Compare the address plan and neighbor record.”*\n\n## Your machine\n\nA real Linux machine with no network. The lab files are in `~/lab`.\n\n## Step-by-Step Instructions\n\n### Step 1: Read the case\n```sh\ncd ~/lab && cat README.txt case/brief.txt\n```\n\n### Step 2: Inspect the settings and the device readouts\n```sh\ncat settings.conf\nsh inspect.sh\n```\n\n### Step 3: Change a setting and test\n```sh\npython3 edit.py settings.conf\nsh test.sh\n```\n\nRepeat until `sh test.sh` prints `ALL_CHECKS_PASS`.\n",
  "milestones": [
   {
    "id": "m1-read-case",
    "title": "Read the case",
    "description": "Open the request and what is known before changing anything.",
    "hint": "Run: `cat ~/lab/case/brief.txt`",
    "checkType": "history_regex",
    "patternSource": "(?:cat|less|more|head)\\s+.*(?:brief\\.txt|README\\.txt)"
   },
   {
    "id": "m2-inspect",
    "title": "Inspect the settings and a device readout",
    "description": "Read settings.conf and run at least one readout.",
    "hint": "Run: `cat ~/lab/settings.conf` then `sh ~/lab/inspect.sh 1`",
    "checkType": "history_regex",
    "patternSource": "sh\\s+.*inspect\\.sh\\s+\\S"
   },
   {
    "id": "m3-settings",
    "title": "Every setting meets the request",
    "description": "Change settings.conf so each requirement in the case is met.",
    "hint": "Change one line with `python3 ~/lab/edit.py ~/lab/settings.conf`, then compare the readouts with case/brief.txt.",
    "checkType": "file_contains_all",
    "filePath": "/home/learner/lab/settings.conf",
    "expectedSubstrings": [
     "subnet=/26",
     "host=10.40.8.70",
     "gateway=10.40.8.65",
     "edge=school-edge"
    ]
   },
   {
    "id": "m4-test",
    "title": "The full test passes",
    "description": "Run the test after your last change until every requirement passes.",
    "hint": "Run: `cd ~/lab && sh test.sh`",
    "checkType": "file_contains",
    "filePath": "/home/learner/lab/results.txt",
    "expectedSubstring": "ALL_CHECKS_PASS"
   }
  ],
  "files": [
   {
    "path": "README.txt",
    "content": "NET-209 · Split the Classroom Network\n\nFit 50 hosts in the allocation, use reserved addresses, and restore the\napproved routing boundary.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-209 · Split the Classroom Network\n\nRequested by: School network team · Local practice model\n\nTHE REQUEST\n“Our block begins at 10.40.8.64 and needs 50 hosts. The school route stopped\nbeing learned after a routing-area change. Compare the address plan and\nneighbor record.”\n\nGOAL\nFit 50 hosts in the allocation, use reserved addresses, and restore the\napproved routing boundary.\n\nWHAT IS KNOWN\n- Read the allocation: The room owns 10.40.8.64–10.40.8.127 inclusive and\nneeds 50 usable host addresses. The next classroom starts at .128; /24\nincludes other rooms.\n- Calculate the range: /26 has 64 total addresses and 62 usable hosts:\n.65–.126 in this block. .64 is network and .127 broadcast. /27 has only 30\nusable hosts. PC-07 is reserved 10.40.8.70; gateway is reserved 10.40.8.65.\n- Compare the OSPF record: The approved school link uses OSPF area 0 on both\nends. Other neighbor settings already match. The changed classroom side uses\narea 1; this fixed model has no adjacency and no learned school route. Restore\nthe approved area-0 boundary plan, then inspect both observations.\n- Read the boundary plan: Private IPv4 NAT belongs only at the approved\ninternet edge, not between rooms. The IPv6 documentation label\n2001:db8:40:8::70 keeps its approved route. NAT is not a firewall. This is a\nbounded neighbor/route model, not a full routing emulator.\n\nQUESTIONS ALREADY ANSWERED\n- Why not choose /27? It offers 30 usable hosts, fewer than the required 50.\n- Why is the school route missing? The supplied OSPF neighbor has an area\nmismatch. Other settings match; the approved link uses area 0 at both ends.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# SUBNET AND ROUTING PLAN\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Prefix containing 10.40.8.64\n#    /27   /27\n#    /26   /26\n#    /24   /24\nsubnet=/27\n\n# PC-07 address\n#    10.40.8.64    10.40.8.64\n#    10.40.8.70    10.40.8.70\n#    10.40.8.127   10.40.8.127\n#    10.40.8.130   10.40.8.130\nhost=10.40.8.64\n\n# Reserved gateway\n#    10.40.8.1     10.40.8.1\n#    10.40.8.65    10.40.8.65\n#    10.40.8.127   10.40.8.127\ngateway=10.40.8.1\n\n# Routing-boundary plan\n#    area-mismatch   Classroom OSPF area 1; neighbor area 0\n#    school-edge     Approved area 0; edge-only IPv4 NAT; IPv6 routed\n#    room-nat        Keep area mismatch and add NAT between rooms\nedge=area-mismatch\n"
   },
   {
    "path": "inspect.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Shows a device readout for the settings saved in settings.conf right now.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='subnet host gateway edge'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\ncase \"$*\" in\n  1|'calculate subnet') n=1 ;;\n  2|'inspect addresses') n=2 ;;\n  3|'trace boundary') n=3 ;;\n  *)\n    echo \"Device readouts for this lab (they follow settings.conf):\"\n    echo '  sh inspect.sh 1    calculate subnet'\n    echo '  sh inspect.sh 2    inspect addresses'\n    echo '  sh inspect.sh 3    trace boundary'\n    exit 0 ;;\nesac\ntext=$(lookup \"R|$n|$state\")\nif [ -n \"$text\" ]; then printf '%b\\n' \"$text\"; else unknown; fi\n"
   },
   {
    "path": "test.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Checks settings.conf against every requirement of this lab and records the\n# result in results.txt. Run it again after each change.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='subnet host gateway edge'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\n: > results.txt\nflags=$(lookup \"T|$state\")\nif [ -z \"$flags\" ]; then unknown | tee -a results.txt; exit 1; fi\ni=0; pass=0; total=0\nwhile IFS= read -r label; do\n  i=$((i + 1)); total=$((total + 1))\n  if [ \"$(echo \"$flags\" | cut -d' ' -f$i)\" = 1 ]; then line=\"PASS   $label\"; pass=$((pass + 1)); else line=\"CHECK  $label\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_REQUIREMENTS'\nPrefix fits demand and allocation\nPC-07 uses reserved usable address\nGateway uses reserved usable address\nApproved routing adjacency, edge NAT, and IPv6 route retained\nLAB_REQUIREMENTS\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_CHECKS_PASS\"; else line=\"$pass of $total requirements pass. Compare case/brief.txt and the readouts with settings.conf, change one setting, and test again.\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
   },
   {
    "path": "edit.py",
    "mode": 493,
    "content": "#!/usr/bin/env python3\n\"\"\"edit.py: a small line editor for the lab files.\n\n    python3 ~/lab/edit.py FILE\n\nIt shows the file with line numbers. Type a line number to change that line,\na to add a line at the end, d NUMBER to delete a line, s to save and quit,\nor q to quit without saving.\"\"\"\nimport sys\n\ntry:\n    import readline\nexcept ImportError:  # the editor still works without line recall\n    readline = None\n\n\ndef ask(prompt, prefill=\"\"):\n    if readline and prefill:\n        readline.set_startup_hook(lambda: readline.insert_text(prefill))\n    try:\n        return input(prompt)\n    finally:\n        if readline:\n            readline.set_startup_hook(None)\n\n\ndef show(lines):\n    print()\n    for number, line in enumerate(lines, 1):\n        print(f\"{number:3} | {line}\")\n    print()\n\n\ndef main():\n    if len(sys.argv) != 2:\n        print(__doc__)\n        return 1\n    name = sys.argv[1]\n    try:\n        with open(name, encoding=\"utf-8\") as handle:\n            lines = handle.read().split(\"\\n\")\n        if lines and lines[-1] == \"\":\n            lines.pop()\n    except FileNotFoundError:\n        lines = []\n    changed = False\n    show(lines)\n    while True:\n        try:\n            command = input(\"line number, a = add, d N = delete, s = save, q = quit: \").strip()\n        except EOFError:\n            command = \"q\"\n        if command == \"q\":\n            if changed and input(\"Quit without saving? (y/n): \").strip().lower() != \"y\":\n                continue\n            return 0\n        if command == \"s\":\n            with open(name, \"w\", encoding=\"utf-8\") as handle:\n                handle.write(\"\\n\".join(lines) + \"\\n\")\n            print(f\"Saved {name}.\")\n            return 0\n        if command == \"a\":\n            lines.append(ask(\"new line: \"))\n            changed = True\n            show(lines)\n            continue\n        if command.startswith(\"d \") and command[2:].strip().isdigit():\n            number = int(command[2:])\n            if 1 <= number <= len(lines):\n                del lines[number - 1]\n                changed = True\n                show(lines)\n            else:\n                print(\"There is no line with that number.\")\n            continue\n        if command.isdigit() and 1 <= int(command) <= len(lines):\n            number = int(command)\n            old = lines[number - 1]\n            new = ask(f\"{number:3} | \", old)\n            if not readline and new and not new[0].isspace():\n                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation\n            lines[number - 1] = new\n            changed = True\n            show(lines)\n            continue\n        print(\"Type a line number from the list, a, d NUMBER, s or q.\")\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"
   },
   {
    "path": ".lab-data.gz",
    "encoding": "base64",
    "content": "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"
   }
  ]
 },
 "NET-210": {
  "id": "NET-210",
  "title": "Keep Guest and Staff Traffic Apart (real machine)",
  "track": "Networking & Operating Systems",
  "grade": "Grades 9–10",
  "minutes": 30,
  "summary": "Keep guests separate with a safe backup path.",
  "markdown": "# NET-210 · Keep Guest and Staff Traffic Apart\n\n> **Lab Brief:** *“Guests need listed services but must not reach staff devices. Keep a safe backup uplink. Compare the port list and policy records.”*\n\n## Your machine\n\nA real Linux machine with no network. The lab files are in `~/lab`.\n\n## Step-by-Step Instructions\n\n### Step 1: Read the case\n```sh\ncd ~/lab && cat README.txt case/brief.txt\n```\n\n### Step 2: Inspect the settings and the device readouts\n```sh\ncat settings.conf\nsh inspect.sh\n```\n\n### Step 3: Change a setting and test\n```sh\npython3 edit.py settings.conf\nsh test.sh\n```\n\nRepeat until `sh test.sh` prints `ALL_CHECKS_PASS`.\n",
  "milestones": [
   {
    "id": "m1-read-case",
    "title": "Read the case",
    "description": "Open the request and what is known before changing anything.",
    "hint": "Run: `cat ~/lab/case/brief.txt`",
    "checkType": "history_regex",
    "patternSource": "(?:cat|less|more|head)\\s+.*(?:brief\\.txt|README\\.txt)"
   },
   {
    "id": "m2-inspect",
    "title": "Inspect the settings and a device readout",
    "description": "Read settings.conf and run at least one readout.",
    "hint": "Run: `cat ~/lab/settings.conf` then `sh ~/lab/inspect.sh 1`",
    "checkType": "history_regex",
    "patternSource": "sh\\s+.*inspect\\.sh\\s+\\S"
   },
   {
    "id": "m3-settings",
    "title": "Every setting meets the request",
    "description": "Change settings.conf so each requirement in the case is met.",
    "hint": "Change one line with `python3 ~/lab/edit.py ~/lab/settings.conf`, then compare the readouts with case/brief.txt.",
    "checkType": "file_contains_all",
    "filePath": "/home/learner/lab/settings.conf",
    "expectedSubstrings": [
     "access=30",
     "trunk=10,30",
     "guestPolicy=approved",
     "redundancy=spanning-tree"
    ]
   },
   {
    "id": "m4-test",
    "title": "The full test passes",
    "description": "Run the test after your last change until every requirement passes.",
    "hint": "Run: `cd ~/lab && sh test.sh`",
    "checkType": "file_contains",
    "filePath": "/home/learner/lab/results.txt",
    "expectedSubstring": "ALL_CHECKS_PASS"
   }
  ],
  "files": [
   {
    "path": "README.txt",
    "content": "NET-210 · Keep Guest and Staff Traffic Apart\n\nChoose the guest VLAN, exact trunk allowlist, approved policy, and loop\nprotection.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-210 · Keep Guest and Staff Traffic Apart\n\nRequested by: School network team · Local practice model\n\nTHE REQUEST\n“Guests need listed services but must not reach staff devices. Keep a safe\nbackup uplink. Compare the port list and policy records.”\n\nGOAL\nChoose the guest VLAN, exact trunk allowlist, approved policy, and loop\nprotection.\n\nWHAT IS KNOWN\n- Read the port list: Staff uses VLAN 10. Guest endpoint port 8 is an access\nport: its untagged traffic must enter guest VLAN 30.\n- Read the trunk list: The approved trunk carries exactly VLANs 10 and 30.\nVLAN 10 alone cuts off guests; every VLAN exceeds this change.\n- Read routed policy: The gateway denies guests access to staff and allows\nlisted guest DNS, portal, internet services, and return traffic. A VLAN alone\ndoes not establish routed restrictions.\n- Inspect redundant links: Keep both approved uplinks cabled. In this topology\nspanning tree keeps one forwarding and one alternate/discarding. Both\nforwarding with spanning tree disabled creates a loop. Removing the spare\nloses resilience.\n\nQUESTIONS ALREADY ANSWERED\n- Does a VLAN block all routed access? No. The gateway also needs the approved\nguest-to-staff restriction.\n- Why is one link discarding? Spanning tree prevents a Layer 2 loop while\nkeeping a backup path in this topology.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# GUEST SWITCH · PORT 8\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Guest access VLAN\n#    10   10 · staff\n#    30   30 · guest\naccess=10\n\n# Trunk allowlist\n#    10      10 only\n#    10,30   10 and 30 only\n#    all     Every VLAN\ntrunk=10\n\n# Guest routed policy\n#    allow-staff   Allow guests to staff\n#    approved      Deny staff; allow listed guest services and return\n#    deny-all      Deny every destination\nguestPolicy=allow-staff\n\n# Redundant uplinks\n#    both-forward    Both forwarding; spanning tree off\n#    spanning-tree   Both cabled; spanning tree controls forwarding\n#    disconnect      Disconnect spare\nredundancy=both-forward\n"
   },
   {
    "path": "inspect.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Shows a device readout for the settings saved in settings.conf right now.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='access trunk guestPolicy redundancy'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\ncase \"$*\" in\n  1|'inspect vlans') n=1 ;;\n  2|'test guest path') n=2 ;;\n  3|'inspect redundancy') n=3 ;;\n  *)\n    echo \"Device readouts for this lab (they follow settings.conf):\"\n    echo '  sh inspect.sh 1    inspect vlans'\n    echo '  sh inspect.sh 2    test guest path'\n    echo '  sh inspect.sh 3    inspect redundancy'\n    exit 0 ;;\nesac\ntext=$(lookup \"R|$n|$state\")\nif [ -n \"$text\" ]; then printf '%b\\n' \"$text\"; else unknown; fi\n"
   },
   {
    "path": "test.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Checks settings.conf against every requirement of this lab and records the\n# result in results.txt. Run it again after each change.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='access trunk guestPolicy redundancy'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\n: > results.txt\nflags=$(lookup \"T|$state\")\nif [ -z \"$flags\" ]; then unknown | tee -a results.txt; exit 1; fi\ni=0; pass=0; total=0\nwhile IFS= read -r label; do\n  i=$((i + 1)); total=$((total + 1))\n  if [ \"$(echo \"$flags\" | cut -d' ' -f$i)\" = 1 ]; then line=\"PASS   $label\"; pass=$((pass + 1)); else line=\"CHECK  $label\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_REQUIREMENTS'\nGuest port belongs to VLAN 30\nTrunk carries exactly approved VLANs\nPolicy denies staff and retains listed services\nRedundant links retain loop protection\nLAB_REQUIREMENTS\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_CHECKS_PASS\"; else line=\"$pass of $total requirements pass. Compare case/brief.txt and the readouts with settings.conf, change one setting, and test again.\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
   },
   {
    "path": "edit.py",
    "mode": 493,
    "content": "#!/usr/bin/env python3\n\"\"\"edit.py: a small line editor for the lab files.\n\n    python3 ~/lab/edit.py FILE\n\nIt shows the file with line numbers. Type a line number to change that line,\na to add a line at the end, d NUMBER to delete a line, s to save and quit,\nor q to quit without saving.\"\"\"\nimport sys\n\ntry:\n    import readline\nexcept ImportError:  # the editor still works without line recall\n    readline = None\n\n\ndef ask(prompt, prefill=\"\"):\n    if readline and prefill:\n        readline.set_startup_hook(lambda: readline.insert_text(prefill))\n    try:\n        return input(prompt)\n    finally:\n        if readline:\n            readline.set_startup_hook(None)\n\n\ndef show(lines):\n    print()\n    for number, line in enumerate(lines, 1):\n        print(f\"{number:3} | {line}\")\n    print()\n\n\ndef main():\n    if len(sys.argv) != 2:\n        print(__doc__)\n        return 1\n    name = sys.argv[1]\n    try:\n        with open(name, encoding=\"utf-8\") as handle:\n            lines = handle.read().split(\"\\n\")\n        if lines and lines[-1] == \"\":\n            lines.pop()\n    except FileNotFoundError:\n        lines = []\n    changed = False\n    show(lines)\n    while True:\n        try:\n            command = input(\"line number, a = add, d N = delete, s = save, q = quit: \").strip()\n        except EOFError:\n            command = \"q\"\n        if command == \"q\":\n            if changed and input(\"Quit without saving? (y/n): \").strip().lower() != \"y\":\n                continue\n            return 0\n        if command == \"s\":\n            with open(name, \"w\", encoding=\"utf-8\") as handle:\n                handle.write(\"\\n\".join(lines) + \"\\n\")\n            print(f\"Saved {name}.\")\n            return 0\n        if command == \"a\":\n            lines.append(ask(\"new line: \"))\n            changed = True\n            show(lines)\n            continue\n        if command.startswith(\"d \") and command[2:].strip().isdigit():\n            number = int(command[2:])\n            if 1 <= number <= len(lines):\n                del lines[number - 1]\n                changed = True\n                show(lines)\n            else:\n                print(\"There is no line with that number.\")\n            continue\n        if command.isdigit() and 1 <= int(command) <= len(lines):\n            number = int(command)\n            old = lines[number - 1]\n            new = ask(f\"{number:3} | \", old)\n            if not readline and new and not new[0].isspace():\n                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation\n            lines[number - 1] = new\n            changed = True\n            show(lines)\n            continue\n        print(\"Type a line number from the list, a, d NUMBER, s or q.\")\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"
   },
   {
    "path": ".lab-data.gz",
    "encoding": "base64",
    "content": "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"
   }
  ]
 },
 "NET-211": {
  "id": "NET-211",
  "title": "Protect the Learning Portal (real machine)",
  "track": "Networking & Operating Systems",
  "grade": "Grades 9–10",
  "minutes": 30,
  "summary": "Compare sign-in, minimum access, and alert evidence.",
  "markdown": "# NET-211 · Protect the Learning Portal\n\n> **Lab Brief:** *“Classroom users need portal HTTPS. An alert appeared during a denied attempt. Check authentication, exact rules, and both tests.”*\n\n## Your machine\n\nA real Linux machine with no network. The lab files are in `~/lab`.\n\n## Step-by-Step Instructions\n\n### Step 1: Read the case\n```sh\ncd ~/lab && cat README.txt case/brief.txt\n```\n\n### Step 2: Inspect the settings and the device readouts\n```sh\ncat settings.conf\nsh inspect.sh\n```\n\n### Step 3: Change a setting and test\n```sh\npython3 edit.py settings.conf\nsh test.sh\n```\n\nRepeat until `sh test.sh` prints `ALL_CHECKS_PASS`.\n",
  "milestones": [
   {
    "id": "m1-read-case",
    "title": "Read the case",
    "description": "Open the request and what is known before changing anything.",
    "hint": "Run: `cat ~/lab/case/brief.txt`",
    "checkType": "history_regex",
    "patternSource": "(?:cat|less|more|head)\\s+.*(?:brief\\.txt|README\\.txt)"
   },
   {
    "id": "m2-inspect",
    "title": "Inspect the settings and a device readout",
    "description": "Read settings.conf and run at least one readout.",
    "hint": "Run: `cat ~/lab/settings.conf` then `sh ~/lab/inspect.sh 1`",
    "checkType": "history_regex",
    "patternSource": "sh\\s+.*inspect\\.sh\\s+\\S"
   },
   {
    "id": "m3-settings",
    "title": "Every setting meets the request",
    "description": "Change settings.conf so each requirement in the case is met.",
    "hint": "Change one line with `python3 ~/lab/edit.py ~/lab/settings.conf`, then compare the readouts with case/brief.txt.",
    "checkType": "file_contains_all",
    "filePath": "/home/learner/lab/settings.conf",
    "expectedSubstrings": [
     "authentication=individual",
     "firewall=https-classroom",
     "detection=separate",
     "evidence=full"
    ]
   },
   {
    "id": "m4-test",
    "title": "The full test passes",
    "description": "Run the test after your last change until every requirement passes.",
    "hint": "Run: `cd ~/lab && sh test.sh`",
    "checkType": "file_contains",
    "filePath": "/home/learner/lab/results.txt",
    "expectedSubstring": "ALL_CHECKS_PASS"
   }
  ],
  "files": [
   {
    "path": "README.txt",
    "content": "NET-211 · Protect the Learning Portal\n\nUse individual sign-in, the supplied minimum rule, and a complete review\nrecord.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-211 · Protect the Learning Portal\n\nRequested by: School network team · Local practice model\n\nTHE REQUEST\n“Classroom users need portal HTTPS. An alert appeared during a denied attempt.\nCheck authentication, exact rules, and both tests.”\n\nGOAL\nUse individual sign-in, the supplied minimum rule, and a complete review\nrecord.\n\nWHAT IS KNOWN\n- Read sign-in policy: Use individual school-managed sign-in with the required\nsecond factor. Shared passwords and disabled sign-in do not meet policy. No\nreal password or code is collected.\n- Read the minimum rule: Allow 10.40.8.64/26 to portal 192.0.2.20 on TCP\ndestination 443 plus established return traffic. Deny other new inbound portal\nconnections. SSH and all-port access are unnecessary.\n- Compare alert and enforcement: IDS A-19 is from an alert-only sensor.\nFirewall F-19 records the denied TCP port 22 attempt. The IDS alert alone does\nnot prove blocking.\n- Read evidence requirements: Retain rule identifier, A-19, F-19, approved\nclassroom HTTPS allow result, and unapproved new-connection deny result.\nHistorical records do not replace a fresh saved-rule test.\n\nQUESTIONS ALREADY ANSWERED\n- Did the IDS block the attempt? This IDS only alerts. The firewall event is\nthe supplied evidence of blocking.\n- Do you need my password? No. Choose a method only. Accounts and tests are\nfictional.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# PORTAL ACCESS REVIEW\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Portal sign-in\n#    shared       Shared staff password\n#    individual   Individual managed sign-in plus required second factor\n#    none         No sign-in\nauthentication=shared\n\n# Inbound portal rule\n#    all               Allow every source and port\n#    https-classroom   Classroom /26 → TCP 443 + established return; deny other new inbound\n#    deny-all          Deny all\nfirewall=all\n\n# Alert interpretation\n#    ids-blocked   IDS alert alone proves blocking\n#    separate      IDS alerts; firewall F-19 records block\ndetection=ids-blocked\n\n# Review evidence\n#    alert-only   IDS alert only\n#    full         Rule, A-19, F-19, and allow/deny test results\n#    clear        Clear supplied evidence\nevidence=alert-only\n"
   },
   {
    "path": "inspect.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Shows a device readout for the settings saved in settings.conf right now.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='authentication firewall detection evidence'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\ncase \"$*\" in\n  1|'inspect access') n=1 ;;\n  2|'test portal rules') n=2 ;;\n  3|'compare alert evidence') n=3 ;;\n  *)\n    echo \"Device readouts for this lab (they follow settings.conf):\"\n    echo '  sh inspect.sh 1    inspect access'\n    echo '  sh inspect.sh 2    test portal rules'\n    echo '  sh inspect.sh 3    compare alert evidence'\n    exit 0 ;;\nesac\ntext=$(lookup \"R|$n|$state\")\nif [ -n \"$text\" ]; then printf '%b\\n' \"$text\"; else unknown; fi\n"
   },
   {
    "path": "test.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Checks settings.conf against every requirement of this lab and records the\n# result in results.txt. Run it again after each change.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='authentication firewall detection evidence'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\n: > results.txt\nflags=$(lookup \"T|$state\")\nif [ -z \"$flags\" ]; then unknown | tee -a results.txt; exit 1; fi\ni=0; pass=0; total=0\nwhile IFS= read -r label; do\n  i=$((i + 1)); total=$((total + 1))\n  if [ \"$(echo \"$flags\" | cut -d' ' -f$i)\" = 1 ]; then line=\"PASS   $label\"; pass=$((pass + 1)); else line=\"CHECK  $label\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_REQUIREMENTS'\nApproved individual sign-in required\nFirewall uses minimum supplied rule\nAlert and enforcement distinguished\nRule, records, and allow/deny tests retained\nLAB_REQUIREMENTS\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_CHECKS_PASS\"; else line=\"$pass of $total requirements pass. Compare case/brief.txt and the readouts with settings.conf, change one setting, and test again.\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
   },
   {
    "path": "edit.py",
    "mode": 493,
    "content": "#!/usr/bin/env python3\n\"\"\"edit.py: a small line editor for the lab files.\n\n    python3 ~/lab/edit.py FILE\n\nIt shows the file with line numbers. Type a line number to change that line,\na to add a line at the end, d NUMBER to delete a line, s to save and quit,\nor q to quit without saving.\"\"\"\nimport sys\n\ntry:\n    import readline\nexcept ImportError:  # the editor still works without line recall\n    readline = None\n\n\ndef ask(prompt, prefill=\"\"):\n    if readline and prefill:\n        readline.set_startup_hook(lambda: readline.insert_text(prefill))\n    try:\n        return input(prompt)\n    finally:\n        if readline:\n            readline.set_startup_hook(None)\n\n\ndef show(lines):\n    print()\n    for number, line in enumerate(lines, 1):\n        print(f\"{number:3} | {line}\")\n    print()\n\n\ndef main():\n    if len(sys.argv) != 2:\n        print(__doc__)\n        return 1\n    name = sys.argv[1]\n    try:\n        with open(name, encoding=\"utf-8\") as handle:\n            lines = handle.read().split(\"\\n\")\n        if lines and lines[-1] == \"\":\n            lines.pop()\n    except FileNotFoundError:\n        lines = []\n    changed = False\n    show(lines)\n    while True:\n        try:\n            command = input(\"line number, a = add, d N = delete, s = save, q = quit: \").strip()\n        except EOFError:\n            command = \"q\"\n        if command == \"q\":\n            if changed and input(\"Quit without saving? (y/n): \").strip().lower() != \"y\":\n                continue\n            return 0\n        if command == \"s\":\n            with open(name, \"w\", encoding=\"utf-8\") as handle:\n                handle.write(\"\\n\".join(lines) + \"\\n\")\n            print(f\"Saved {name}.\")\n            return 0\n        if command == \"a\":\n            lines.append(ask(\"new line: \"))\n            changed = True\n            show(lines)\n            continue\n        if command.startswith(\"d \") and command[2:].strip().isdigit():\n            number = int(command[2:])\n            if 1 <= number <= len(lines):\n                del lines[number - 1]\n                changed = True\n                show(lines)\n            else:\n                print(\"There is no line with that number.\")\n            continue\n        if command.isdigit() and 1 <= int(command) <= len(lines):\n            number = int(command)\n            old = lines[number - 1]\n            new = ask(f\"{number:3} | \", old)\n            if not readline and new and not new[0].isspace():\n                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation\n            lines[number - 1] = new\n            changed = True\n            show(lines)\n            continue\n        print(\"Type a line number from the list, a, d NUMBER, s or q.\")\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"
   },
   {
    "path": ".lab-data.gz",
    "encoding": "base64",
    "content": "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"
   }
  ]
 },
 "NET-212": {
  "id": "NET-212",
  "title": "Find the Broken WAN Path (real machine)",
  "track": "Networking & Operating Systems",
  "grade": "Grades 9–10",
  "minutes": 30,
  "summary": "Compare checkpoints with an approved route change.",
  "markdown": "# NET-212 · Find the Broken WAN Path\n\n> **Lab Brief:** *“The remote library failed after a route change. The local link, gateway, and provider responded in the baseline. Compare observations before changing the path.”*\n\n## Your machine\n\nA real Linux machine with no network. The lab files are in `~/lab`.\n\n## Step-by-Step Instructions\n\n### Step 1: Read the case\n```sh\ncd ~/lab && cat README.txt case/brief.txt\n```\n\n### Step 2: Inspect the settings and the device readouts\n```sh\ncat settings.conf\nsh inspect.sh\n```\n\n### Step 3: Change a setting and test\n```sh\npython3 edit.py settings.conf\nsh test.sh\n```\n\nRepeat until `sh test.sh` prints `ALL_CHECKS_PASS`.\n",
  "milestones": [
   {
    "id": "m1-read-case",
    "title": "Read the case",
    "description": "Open the request and what is known before changing anything.",
    "hint": "Run: `cat ~/lab/case/brief.txt`",
    "checkType": "history_regex",
    "patternSource": "(?:cat|less|more|head)\\s+.*(?:brief\\.txt|README\\.txt)"
   },
   {
    "id": "m2-inspect",
    "title": "Inspect the settings and a device readout",
    "description": "Read settings.conf and run at least one readout.",
    "hint": "Run: `cat ~/lab/settings.conf` then `sh ~/lab/inspect.sh 1`",
    "checkType": "history_regex",
    "patternSource": "sh\\s+.*inspect\\.sh\\s+\\S"
   },
   {
    "id": "m3-settings",
    "title": "Every setting meets the request",
    "description": "Change settings.conf so each requirement in the case is met.",
    "hint": "Change one line with `python3 ~/lab/edit.py ~/lab/settings.conf`, then compare the readouts with case/brief.txt.",
    "checkType": "file_contains_all",
    "filePath": "/home/learner/lab/settings.conf",
    "expectedSubstrings": [
     "link=up",
     "gateway=10.50.0.1",
     "route=approved",
     "diagnostic=all"
    ]
   },
   {
    "id": "m4-test",
    "title": "The full test passes",
    "description": "Run the test after your last change until every requirement passes.",
    "hint": "Run: `cd ~/lab && sh test.sh`",
    "checkType": "file_contains",
    "filePath": "/home/learner/lab/results.txt",
    "expectedSubstring": "ALL_CHECKS_PASS"
   }
  ],
  "files": [
   {
    "path": "README.txt",
    "content": "NET-212 · Find the Broken WAN Path\n\nRetain the working local path, restore Provider B, and compare every\ncheckpoint.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-212 · Find the Broken WAN Path\n\nRequested by: School network team · Local practice model\n\nTHE REQUEST\n“The remote library failed after a route change. The local link, gateway, and\nprovider responded in the baseline. Compare observations before changing the\npath.”\n\nGOAL\nRetain the working local path, restore Provider B, and compare every\ncheckpoint.\n\nWHAT IS KNOWN\n- Read local baseline: PC-LIB is 10.50.0.25/24 on a working approved cable.\nKeep that cable connected.\n- Read the gateway record: 10.50.0.1 is the approved responsive gateway.\nRetired 10.50.0.254 does not respond in this model.\n- Compare route records: The provider handoff responds. Provider A was\nretired; approved remote-library route uses Provider B. Restore that approved\nroute.\n- Read the diagnostic plan: Retain local-link, gateway, provider, and remote\nobservations. Remote-only failure does not locate a break. Tools read fixed\nlocal evidence; no real ping or trace runs.\n\nQUESTIONS ALREADY ANSWERED\n- Should I replace every cable? Baseline shows working local cable, gateway,\nand provider. Compare the route change first.\n- Does no response prove server failure? No. A path problem can prevent the\nresponse too.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# REMOTE LIBRARY WAN CHECKPOINTS\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Local cable\n#    up     Keep approved cable connected\n#    down   Disconnect working cable\nlink=up\n\n# PC-LIB gateway\n#    10.50.0.1     10.50.0.1 · approved\n#    10.50.0.254   10.50.0.254 · retired\ngateway=10.50.0.1\n\n# Remote route\n#    retired    Retired Provider A\n#    approved   Approved Provider B\nroute=retired\n\n# Checkpoint record\n#    remote-only   Remote response only\n#    all           Compare local, gateway, provider, and remote\ndiagnostic=remote-only\n"
   },
   {
    "path": "inspect.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Shows a device readout for the settings saved in settings.conf right now.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='link gateway route diagnostic'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\ncase \"$*\" in\n  1|'inspect link') n=1 ;;\n  2|'trace path') n=2 ;;\n  3|'compare probes') n=3 ;;\n  *)\n    echo \"Device readouts for this lab (they follow settings.conf):\"\n    echo '  sh inspect.sh 1    inspect link'\n    echo '  sh inspect.sh 2    trace path'\n    echo '  sh inspect.sh 3    compare probes'\n    exit 0 ;;\nesac\ntext=$(lookup \"R|$n|$state\")\nif [ -n \"$text\" ]; then printf '%b\\n' \"$text\"; else unknown; fi\n"
   },
   {
    "path": "test.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Checks settings.conf against every requirement of this lab and records the\n# result in results.txt. Run it again after each change.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='link gateway route diagnostic'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\n: > results.txt\nflags=$(lookup \"T|$state\")\nif [ -z \"$flags\" ]; then unknown | tee -a results.txt; exit 1; fi\ni=0; pass=0; total=0\nwhile IFS= read -r label; do\n  i=$((i + 1)); total=$((total + 1))\n  if [ \"$(echo \"$flags\" | cut -d' ' -f$i)\" = 1 ]; then line=\"PASS   $label\"; pass=$((pass + 1)); else line=\"CHECK  $label\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_REQUIREMENTS'\nWorking approved cable remains connected\nApproved gateway retained\nRemote route uses approved Provider B\nAll four checkpoints compared\nLAB_REQUIREMENTS\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_CHECKS_PASS\"; else line=\"$pass of $total requirements pass. Compare case/brief.txt and the readouts with settings.conf, change one setting, and test again.\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
   },
   {
    "path": "edit.py",
    "mode": 493,
    "content": "#!/usr/bin/env python3\n\"\"\"edit.py: a small line editor for the lab files.\n\n    python3 ~/lab/edit.py FILE\n\nIt shows the file with line numbers. Type a line number to change that line,\na to add a line at the end, d NUMBER to delete a line, s to save and quit,\nor q to quit without saving.\"\"\"\nimport sys\n\ntry:\n    import readline\nexcept ImportError:  # the editor still works without line recall\n    readline = None\n\n\ndef ask(prompt, prefill=\"\"):\n    if readline and prefill:\n        readline.set_startup_hook(lambda: readline.insert_text(prefill))\n    try:\n        return input(prompt)\n    finally:\n        if readline:\n            readline.set_startup_hook(None)\n\n\ndef show(lines):\n    print()\n    for number, line in enumerate(lines, 1):\n        print(f\"{number:3} | {line}\")\n    print()\n\n\ndef main():\n    if len(sys.argv) != 2:\n        print(__doc__)\n        return 1\n    name = sys.argv[1]\n    try:\n        with open(name, encoding=\"utf-8\") as handle:\n            lines = handle.read().split(\"\\n\")\n        if lines and lines[-1] == \"\":\n            lines.pop()\n    except FileNotFoundError:\n        lines = []\n    changed = False\n    show(lines)\n    while True:\n        try:\n            command = input(\"line number, a = add, d N = delete, s = save, q = quit: \").strip()\n        except EOFError:\n            command = \"q\"\n        if command == \"q\":\n            if changed and input(\"Quit without saving? (y/n): \").strip().lower() != \"y\":\n                continue\n            return 0\n        if command == \"s\":\n            with open(name, \"w\", encoding=\"utf-8\") as handle:\n                handle.write(\"\\n\".join(lines) + \"\\n\")\n            print(f\"Saved {name}.\")\n            return 0\n        if command == \"a\":\n            lines.append(ask(\"new line: \"))\n            changed = True\n            show(lines)\n            continue\n        if command.startswith(\"d \") and command[2:].strip().isdigit():\n            number = int(command[2:])\n            if 1 <= number <= len(lines):\n                del lines[number - 1]\n                changed = True\n                show(lines)\n            else:\n                print(\"There is no line with that number.\")\n            continue\n        if command.isdigit() and 1 <= int(command) <= len(lines):\n            number = int(command)\n            old = lines[number - 1]\n            new = ask(f\"{number:3} | \", old)\n            if not readline and new and not new[0].isspace():\n                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation\n            lines[number - 1] = new\n            changed = True\n            show(lines)\n            continue\n        print(\"Type a line number from the list, a, d NUMBER, s or q.\")\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"
   },
   {
    "path": ".lab-data.gz",
    "encoding": "base64",
    "content": "H4sIAAAAAAACA+Va3W5bRw6+tp5iHiBQOJzh/NhXqZtuis0mQVpge+EbcoaMhXXOMSTZ2b794iiS7C6aog3iWFVw7s6cGfHnIz+SI4gUs8+FQqAcrZ788OMvz793/372yr159vOLi+Hl2PjK3VzP3T94rR/4V+dhTjCHOVI8dcO4dkvldqndPXXD6Ja6uh6Hlc7dm+V4u+i6/M1Hc/d2vFnrqePr6+V4q33/mftufjG81ffjtHr/2PXlcrx5d+muNpJc8/py7v61WK0Ww7v9rzm+Ggd1fdTVZu/mbLfS5a0unfHi6map8xlE7pBjMcYQQ/iUsn38MByFugU9JcNWMkbgfHL+4vn5P9+8/vHVz+7t8/PXb7+/GH7iW+2n7qMgd+ePw9WvO/Huq7lZOHOLYa3L99oXvFankz5DU8ey0mE9vxi+45VeLQY93Spxc33m3n0059Prnf4fj+xnbqnrxVK7W25lmAy2UWI1d6+mn57MsBjePV0vuW3UqlZ6bdnImrI/AecdOJiBCKJXzdSioC8nL1+fP3vpNlpfDOcsV+r6YtXGYdC21n7mrhbDf7bufjGu1vd8/RTjXub9az+/GHaw2Fnkt877sFhfjjfrzcFz98Piv9rv7DPZbj4Dk4RkwaCEHqmfgNs8M49kQAk9ZGkx+a8WijsH7KH57MGh6QNI7Il8ghSK4u+56v/9NCn++V5aatPF7aT173rFk7bSACtoACb84thBil8CPRh8liwBfMAmlo4kppEb1gIIJWWrPRw1DWFDkl5NNKF5TF+Rhh4h1LEVDSQ9Y+om2k42ydr5GapkwVYYa1NN5Q+gfD6+v+alfpTmyQ53T9wOeE8cDzuw3WHlLgjvWehsv+m+vmc7pN635UODPvgYvKlkYAliduLd9MAsGEdLubZQkQH5MIks+sIecyBAjEEPNmXGEMUzYyrmKSTaAHAyc4ypR2goEDwy9AM1M4mI9WaVRIt+6TCZtDn0QCEKWjEbFxXvRb9ktfBpkA3qbDm+30u73fkJN1FqOQQUI9UQajgSYqZCFrWHmDSGjvKXuMr/vZiKKmZuPpYEic23TWMxJYqExMUrUfMYLMA3x1QpBqaOqfgaFUM6xABM0cAQLShKi70eSQAmKgSNATFBUKRDZdkccswsHiOzpUJ/oYL3pzvzrO5nhbt3fy4l3LltlxL2tp72f25WyIUDBki5ZJAqbVul+Vm2xBV97NZ8yeo3C1NhWzxNCSP4lmIUsEOMlhKNqlTqCNDVjiVaShIIDLl7CqFW3jYbMCtM3CxW30ur/CDw/ONW8u7zz4NhkdxbFsHclCPQVyPix+iQq4/ZmqepYeSUwtEkkxq5a+HcC3aqqW1zBsxqCTX5GCzaNLykBywxdqa4V1/cvXqE4qJWBWycY88hxugffRZYW/WVpXPTFqK0Q6VcRi+AJJxar9bxyK8zuFQKdZoSFo9isB2c+xkX7dLVS0mtpAKHyLfMMdXkLag0parb3sLPuBPUKlnZkqGvxz0MlKzYjEk5V4ngj7mdlBq0UyLfo0Gg/g0ObqSmBGDRB+OKRQ9zwia9i1k3MwyRxB6Ze/elykN7p/lUsXYjFoSg/Uh6gFaoT/TtCUunQseiVmUo2VpAE8tiG/qbGKS1BAgJApbQPbRHr586TEwHBkYSxcIxX2R36EgIXYGT9fItJvneWoAUOrcUc6Td/YqfdSvZg5IZ5litb/+oMS0I5FooI0UV0aPuZdVzhcItJRYK5bNv7A8pF2lVVW1ZqWGJkbe5CGYWUxAyEknCQo/fy1kHAIrSfPXNB/7bzX3MmMCoR9RYPdVvMMH8D3cDZRSkKAAA"
   }
  ]
 },
 "NET-213": {
  "id": "NET-213",
  "title": "Clear Up a Choppy Classroom Call (real machine)",
  "track": "Networking & Operating Systems",
  "grade": "Grades 11–12",
  "minutes": 35,
  "summary": "Compare measurements, settings, and management evidence.",
  "markdown": "# NET-213 · Clear Up a Choppy Classroom Call\n\n> **Lab Brief:** *“The call connects but speech breaks up during a transfer. The uplink stays 10 Mb/s. Compare the call record and queue measurements.”*\n\n## Your machine\n\nA real Linux machine with no network. The lab files are in `~/lab`.\n\n## Step-by-Step Instructions\n\n### Step 1: Read the case\n```sh\ncd ~/lab && cat README.txt case/brief.txt\n```\n\n### Step 2: Inspect the settings and the device readouts\n```sh\ncat settings.conf\nsh inspect.sh\n```\n\n### Step 3: Change a setting and test\n```sh\npython3 edit.py settings.conf\nsh test.sh\n```\n\nRepeat until `sh test.sh` prints `ALL_CHECKS_PASS`.\n",
  "milestones": [
   {
    "id": "m1-read-case",
    "title": "Read the case",
    "description": "Open the request and what is known before changing anything.",
    "hint": "Run: `cat ~/lab/case/brief.txt`",
    "checkType": "history_regex",
    "patternSource": "(?:cat|less|more|head)\\s+.*(?:brief\\.txt|README\\.txt)"
   },
   {
    "id": "m2-inspect",
    "title": "Inspect the settings and a device readout",
    "description": "Read settings.conf and run at least one readout.",
    "hint": "Run: `cat ~/lab/settings.conf` then `sh ~/lab/inspect.sh 1`",
    "checkType": "history_regex",
    "patternSource": "sh\\s+.*inspect\\.sh\\s+\\S"
   },
   {
    "id": "m3-settings",
    "title": "Every setting meets the request",
    "description": "Change settings.conf so each requirement in the case is met.",
    "hint": "Change one line with `python3 ~/lab/edit.py ~/lab/settings.conf`, then compare the readouts with case/brief.txt.",
    "checkType": "file_contains_all",
    "filePath": "/home/learner/lab/settings.conf",
    "expectedSubstrings": [
     "media=matched",
     "voiceQueue=rtp-priority",
     "congestion=reschedule",
     "record=fcaps"
    ]
   },
   {
    "id": "m4-test",
    "title": "The full test passes",
    "description": "Run the test after your last change until every requirement passes.",
    "hint": "Run: `cd ~/lab && sh test.sh`",
    "checkType": "file_contains",
    "filePath": "/home/learner/lab/results.txt",
    "expectedSubstring": "ALL_CHECKS_PASS"
   }
  ],
  "files": [
   {
    "path": "README.txt",
    "content": "NET-213 · Clear Up a Choppy Classroom Call\n\nIdentify call roles, protect audio within capacity, schedule bulk traffic, and\nretain FCAPS evidence.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-213 · Clear Up a Choppy Classroom Call\n\nRequested by: School network team · Local practice model\n\nTHE REQUEST\n“The call connects but speech breaks up during a transfer. The uplink stays 10\nMb/s. Compare the call record and queue measurements.”\n\nGOAL\nIdentify call roles, protect audio within capacity, schedule bulk traffic, and\nretain FCAPS evidence.\n\nWHAT IS KNOWN\n- Read the call record: SIP sets up/ends this call; RTP carries audio. SIP\nsetup succeeded but media is choppy. Prioritizing only SIP does not protect\nRTP.\n- Read baseline: Offered load is 18 Mb/s on a 10 Mb/s uplink. Fixed baseline:\n7% media loss, 55 ms jitter. Case targets: below 1% loss, at most 20 ms\njitter.\n- Read approved queue plan: Use approved bounded RTP priority and move the\nbulk transfer outside the call. Offered load becomes 7 Mb/s; fixed new sample\nis 0.4% loss and 12 ms jitter. QoS changes treatment, not physical bandwidth.\n- Organize evidence: FCAPS: Fault—drop event; Configuration—queue/schedule\nbefore/after; Accounting—aggregate transfer totals; Performance—loss/jitter;\nSecurity—guest-deny test. Retain all five without names, recordings, or\npersonal call data.\n\nQUESTIONS ALREADY ANSWERED\n- Does setup prove clear audio? No. SIP signaling and RTP media have different\njobs.\n- Can priority fix every overloaded link? No. This case also moves bulk\ntraffic so offered load fits capacity.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# CLASSROOM CALL TRAFFIC MODEL\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Call roles\n#    reversed   SIP audio; RTP call setup\n#    matched    SIP setup/teardown; RTP audio\nmedia=reversed\n\n# Queue treatment\n#    sip-only       Prioritize SIP only\n#    rtp-priority   Approved bounded RTP priority\n#    best-effort    All best effort\nvoiceQueue=sip-only\n\n# Bulk traffic\n#    during-call   Keep 18 Mb/s during call\n#    reschedule    Move transfer; 7 Mb/s during call\ncongestion=during-call\n\n# Management evidence\n#    performance-only   Performance only\n#    fcaps              All five FCAPS categories\nrecord=performance-only\n"
   },
   {
    "path": "inspect.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Shows a device readout for the settings saved in settings.conf right now.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='media voiceQueue congestion record'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\ncase \"$*\" in\n  1|'inspect call') n=1 ;;\n  2|'measure media') n=2 ;;\n  3|'inspect management record') n=3 ;;\n  *)\n    echo \"Device readouts for this lab (they follow settings.conf):\"\n    echo '  sh inspect.sh 1    inspect call'\n    echo '  sh inspect.sh 2    measure media'\n    echo '  sh inspect.sh 3    inspect management record'\n    exit 0 ;;\nesac\ntext=$(lookup \"R|$n|$state\")\nif [ -n \"$text\" ]; then printf '%b\\n' \"$text\"; else unknown; fi\n"
   },
   {
    "path": "test.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Checks settings.conf against every requirement of this lab and records the\n# result in results.txt. Run it again after each change.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='media voiceQueue congestion record'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\n: > results.txt\nflags=$(lookup \"T|$state\")\nif [ -z \"$flags\" ]; then unknown | tee -a results.txt; exit 1; fi\ni=0; pass=0; total=0\nwhile IFS= read -r label; do\n  i=$((i + 1)); total=$((total + 1))\n  if [ \"$(echo \"$flags\" | cut -d' ' -f$i)\" = 1 ]; then line=\"PASS   $label\"; pass=$((pass + 1)); else line=\"CHECK  $label\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_REQUIREMENTS'\nSIP/RTP roles match records\nAudio uses bounded priority\nOffered load fits capacity\nAll five FCAPS categories retained\nLAB_REQUIREMENTS\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_CHECKS_PASS\"; else line=\"$pass of $total requirements pass. Compare case/brief.txt and the readouts with settings.conf, change one setting, and test again.\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
   },
   {
    "path": "edit.py",
    "mode": 493,
    "content": "#!/usr/bin/env python3\n\"\"\"edit.py: a small line editor for the lab files.\n\n    python3 ~/lab/edit.py FILE\n\nIt shows the file with line numbers. Type a line number to change that line,\na to add a line at the end, d NUMBER to delete a line, s to save and quit,\nor q to quit without saving.\"\"\"\nimport sys\n\ntry:\n    import readline\nexcept ImportError:  # the editor still works without line recall\n    readline = None\n\n\ndef ask(prompt, prefill=\"\"):\n    if readline and prefill:\n        readline.set_startup_hook(lambda: readline.insert_text(prefill))\n    try:\n        return input(prompt)\n    finally:\n        if readline:\n            readline.set_startup_hook(None)\n\n\ndef show(lines):\n    print()\n    for number, line in enumerate(lines, 1):\n        print(f\"{number:3} | {line}\")\n    print()\n\n\ndef main():\n    if len(sys.argv) != 2:\n        print(__doc__)\n        return 1\n    name = sys.argv[1]\n    try:\n        with open(name, encoding=\"utf-8\") as handle:\n            lines = handle.read().split(\"\\n\")\n        if lines and lines[-1] == \"\":\n            lines.pop()\n    except FileNotFoundError:\n        lines = []\n    changed = False\n    show(lines)\n    while True:\n        try:\n            command = input(\"line number, a = add, d N = delete, s = save, q = quit: \").strip()\n        except EOFError:\n            command = \"q\"\n        if command == \"q\":\n            if changed and input(\"Quit without saving? (y/n): \").strip().lower() != \"y\":\n                continue\n            return 0\n        if command == \"s\":\n            with open(name, \"w\", encoding=\"utf-8\") as handle:\n                handle.write(\"\\n\".join(lines) + \"\\n\")\n            print(f\"Saved {name}.\")\n            return 0\n        if command == \"a\":\n            lines.append(ask(\"new line: \"))\n            changed = True\n            show(lines)\n            continue\n        if command.startswith(\"d \") and command[2:].strip().isdigit():\n            number = int(command[2:])\n            if 1 <= number <= len(lines):\n                del lines[number - 1]\n                changed = True\n                show(lines)\n            else:\n                print(\"There is no line with that number.\")\n            continue\n        if command.isdigit() and 1 <= int(command) <= len(lines):\n            number = int(command)\n            old = lines[number - 1]\n            new = ask(f\"{number:3} | \", old)\n            if not readline and new and not new[0].isspace():\n                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation\n            lines[number - 1] = new\n            changed = True\n            show(lines)\n            continue\n        print(\"Type a line number from the list, a, d NUMBER, s or q.\")\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"
   },
   {
    "path": ".lab-data.gz",
    "encoding": "base64",
    "content": "H4sIAAAAAAACA+1bTXMbRw49i7+iL755aaC/WzppZWfLVXbs2DnswRd0A1C4Rc1oOUM7zq9PzegjcSVLuxKtE5EqXVTDJqsBPAAPr3sAKTWoFgtaiaUcffP838+empfPnj4/NW9PX75+8exdd0aX1FbjRzOM9HEwCOZlfTIszStV2QibdU9s0vXD77aylWPzerPqN6tx9ZOYt89fm75bf1y+6170w2DsoxPzn9U4ysY4MBfD0nxPm3MZh2NTZd1/MPjoxNBoLvphNHZe8a572bOshU2VYfyHqPab0Qx0cbkWM4yr9dpcrIZBBjNe/dTSPF+vt8O4oXH1XgzTSI9N14+GzPmWNtSNIssFWEIPQsiqVpCOzk5fvDBvnp29evP0XfeW3gubTb+W4Xg2gra86k/Mm+9fm0brtRlk3F6+617VQTbT0mnN/MwM29ZEWPhm9WazkuHqB25ddHp5uemn79V+27HwvPTyym+Ts/55/fi/03IzboTGYVqzNN/2Zj2ZNe+i0eW43QgvF+CTIyJfCqMX9n88mJg/jebpej173lx5/iaS6ZdIhvClkXwqF9SxkR8nDw3T9uf9nJjv+reGexnmOLXJXDGVOv6w4vGHLwxoDoASnZZokYGOXp5+e/qvZy+fffv9p2G9Mkmnn/rm7PT1W9NolPN+itLSvJaN9psL6pocm/TIrPthOLmy8Nrc5bvuG9qux2PDm/7SyHvpxqU56ztdnW+nLfbd8VXcngztB+HtWpbmtLV+242r7vzY0Pn5Rs4nC8d+pPWwNG+lbafAH5vz7YRxlu6jGWUYl79sdSMjrTrh5fWm+805daufZDDyfsXSNTkxq/EXJ+rqR0MzSmbMXMpm6Dtaz96bnZUoEmmoUoDkCA1Mfwso4AgsWlWyGT6XFjPkn4xCG+4/dFeIn5H+x1Pj96vH9O9Nfpi10Pub732Czf+ZHaLIhFahai4cZ3NxMleleKSI1qYCnI+mx2hwgRiK2qwuxmRts0eze+YPBDUJaVatKbujeb2BBTpEC8FRFEGUvAN/vwLZlX2fwg6W/gZ4aH8LvMefgu3xr8D12EzpdQOnW2QYqsOM0ruADmbggJgQSJoWd88LJxZ0ABEpYKZQ80PZ2BX7Up02tKUlLpjK1439/6MyIAW2XlyMvvlW/Nevd7/tr6fz7q969JfakG3Soqo+Of0LbLjzrKSggMFHjVKds3eQlfYmK2fiuVdZySA+plTUxwLUvnJF/tP4teBiyBqgAoem8Q6C/ZkWeq/DbUHBRtdIovVEODOQibtZHyS61kQzA6LsB3ezqbkcxENLQaq4hwa9CxviUbzHxhJacHJ4Y6AVz2pFEldpjdr1ZIMLKy1CAY5FitpYbkce50MFbJXJU0w5zVR/mgGcJwRRblinJXpnAsnn2uXs2amE3fp2LmJf5Nuz/uKSNnIjkEx+HmScEDqYD6vxB1NpkPWqky9zp0tQNFcfYgnCVf74VLOz//7FM41LWsihEy+qVMr1UIcLly2KI8y1ZZfUX8+HsHCSJGZvI6PWRLyffvGekTInV2JVRXcf2bGnai2wx5griLjb2d9rcxGDbVqSBBsfOOYOJAQAzlRzSyCIAe8bxwwgqeZkFbzYKnx3tfz3++LfR+gOGLlaG5KUVK0r1+0NFiFQcQ2hgUZiwfs/zIcINoTYsFjbFP5EUd7JEP/iohxqcVBraj44wSCHdW4T2NXkc/TVoScId8hwv4SV/e34bvSluWRbtDmVKnE/iUj0LUjDqYnn0NDtqZUJalQJPjcO4PjgsS2uVYdJJm3eZ384TTtZHyK3nL3T6CDth5STPBdXo5WqgNGn+zhOpIDqmLFokVpruG9EOEUFENFiIxBL3YPDglQ0ITWILUFNORwWIUqK1qdUS2Oqufjrk2pYJA3NqZJOGoXTg+8mSRM4njpKslEIHub9HVQkqViqCQFjBufu3byfXSRLkLMqanMwC3eTDJxdSsCUnbMhZ2sPUdTNPjUnlb0msJnr3VWGHRXzb1cPMhVuUGJQLpFjuY9sJAt6Dbk0m2r0yNfiJi4KEicr1YorSdve3kYqCaqgbbEKJoVye9xTEjbO7CxITi6F/WDQFBrU5JxgKdhy20+Fi3K1wfoSJlB7iPdfmawAUlMTqBAiVD2cSbbaqJ5L8Axek6X9RGyNrXlvRXJuMblymB21plqthkbIrtZYD5Fb1dSSei/AGLwlvb1NUHOQmHII6rMy4u05TG0plRRTzr7AdGfjZoCrmlyAaK2HTOrq4V3maOgmtSjk4Fy0tdzSm5YySfaAbAMCPdza3VWcWpJEoUojTxld3M8S3IpOE1+zlIJisHsgbLHn6H12Klp9ZL4eYmHB023P7JtL5KZq8nBjcic0uFBoBT1SiLG4dvsyB9emDRULUaiqtA+YqYJQvLYqnqSlQ1f9WGwWzC1DUkfo97P4CTjGFB1Goea0PPTDXc7CFAVyCMjqObvDGcbE2unFPsxkndjy8I7kTpiEGkPLNYZcfS18fc8eF5KsKCSyWSBjw4eDhF1ezOCVIRKVzBrk/ms5whCSR6lFrA8e97SjKOaYnHOxcS4+3/PXPBVKACCotkFE7w7rjFgDeNQWSytQHflDFGY0IINzDD66WGM4TIlOQ4zIuZBrSb76pd+7T+tYGnFVb1FqonigQeWAkjkXi0LO5cMTCn8GB3c/b8xGAAA="
   }
  ]
 },
 "NET-214": {
  "id": "NET-214",
  "title": "Plan the New Learning Space (real machine)",
  "track": "Networking & Operating Systems",
  "grade": "Grades 11–12",
  "minutes": 35,
  "summary": "Bring capacity, access, and rollback into a topology plan.",
  "markdown": "# NET-214 · Plan the New Learning Space\n\n> **Lab Brief:** *“Plan the new space from its demand sheet. Include inventory, baseline, tests, and rollback before review. This local planning board does not launch GNS3 or another emulator.”*\n\n## Your machine\n\nA real Linux machine with no network. The lab files are in `~/lab`.\n\n## Step-by-Step Instructions\n\n### Step 1: Read the case\n```sh\ncd ~/lab && cat README.txt case/brief.txt\n```\n\n### Step 2: Inspect the settings and the device readouts\n```sh\ncat settings.conf\nsh inspect.sh\n```\n\n### Step 3: Change a setting and test\n```sh\npython3 edit.py settings.conf\nsh test.sh\n```\n\nRepeat until `sh test.sh` prints `ALL_CHECKS_PASS`.\n",
  "milestones": [
   {
    "id": "m1-read-case",
    "title": "Read the case",
    "description": "Open the request and what is known before changing anything.",
    "hint": "Run: `cat ~/lab/case/brief.txt`",
    "checkType": "history_regex",
    "patternSource": "(?:cat|less|more|head)\\s+.*(?:brief\\.txt|README\\.txt)"
   },
   {
    "id": "m2-inspect",
    "title": "Inspect the settings and a device readout",
    "description": "Read settings.conf and run at least one readout.",
    "hint": "Run: `cat ~/lab/settings.conf` then `sh ~/lab/inspect.sh 1`",
    "checkType": "history_regex",
    "patternSource": "sh\\s+.*inspect\\.sh\\s+\\S"
   },
   {
    "id": "m3-settings",
    "title": "Every setting meets the request",
    "description": "Change settings.conf so each requirement in the case is met.",
    "hint": "Change one line with `python3 ~/lab/edit.py ~/lab/settings.conf`, then compare the readouts with case/brief.txt.",
    "checkType": "file_contains_all",
    "filePath": "/home/learner/lab/settings.conf",
    "expectedSubstrings": [
     "capacity=48-gigabit",
     "wireless=managed",
     "segments=approved",
     "changePlan=reviewable"
    ]
   },
   {
    "id": "m4-test",
    "title": "The full test passes",
    "description": "Run the test after your last change until every requirement passes.",
    "hint": "Run: `cd ~/lab && sh test.sh`",
    "checkType": "file_contains",
    "filePath": "/home/learner/lab/results.txt",
    "expectedSubstring": "ALL_CHECKS_PASS"
   }
  ],
  "files": [
   {
    "path": "README.txt",
    "content": "NET-214 · Plan the New Learning Space\n\nChoose sufficient ports/uplink, approved wireless, segmentation, and\nreviewable change evidence.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-214 · Plan the New Learning Space\n\nRequested by: School network team · Local practice model\n\nTHE REQUEST\n“Plan the new space from its demand sheet. Include inventory, baseline, tests,\nand rollback before review. This local planning board does not launch GNS3 or\nanother emulator.”\n\nGOAL\nChoose sufficient ports/uplink, approved wireless, segmentation, and\nreviewable change evidence.\n\nWHAT IS KNOWN\n- Calculate ports and capacity: 24 PCs + 2 APs + 1 printer = 27 access\nconnections plus 1 uplink port. Peak: 24 × 20 + 80 = 560 Mb/s. Add 25%\nheadroom: 700 Mb/s. Approved 48-port/1 Gb/s option fits; 24 ports or a 100\nMb/s uplink does not.\n- Read wireless policy: Use the school-approved managed method with individual\nauthentication and protected radio traffic. Staff provision it and check\nclient compatibility. Open access or one shared guest password does not meet\nthis staff/student policy.\n- Read segmentation policy: Separate staff, students, and guests into VLANs\nwith approved gateway rules. Guests use listed services but cannot reach\nstaff. A flat network does not meet policy.\n- Read review checklist: Retain equipment/port inventory, previous settings,\nconnectivity/performance baseline, proposed settings, allowed/denied access\ntests, and rollback to saved previous settings if tests fail. School review\nprecedes installation.\n\nQUESTIONS ALREADY ANSWERED\n- Is capacity enough to finish? Also compare access boundaries, tests,\nbaseline, and rollback.\n- What if tests fail? Rollback to saved previous settings and report failed\ntests.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# LEARNING SPACE TOPOLOGY BOARD\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Switch/uplink\n#    24-gigabit   24 usable ports; 1 Gb/s uplink\n#    48-gigabit   48 usable ports; 1 Gb/s uplink\n#    48-fast      48 usable ports; 100 Mb/s uplink\ncapacity=24-gigabit\n\n# Wireless method\n#    open      Open network\n#    managed   Approved managed individual access and protected radio\n#    shared    Shared guest password\nwireless=open\n\n# Traffic groups\n#    flat       One flat network\n#    approved   Separate staff/student/guest VLANs; approved gateway rules\nsegments=flat\n\n# Change record\n#    install      Install without baseline/rollback\n#    reviewable   Inventory, baseline, settings, tests, rollback, school review\n#    erase        Discard previous inventory/settings\nchangePlan=install\n"
   },
   {
    "path": "inspect.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Shows a device readout for the settings saved in settings.conf right now.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='capacity wireless segments changePlan'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\ncase \"$*\" in\n  1|'calculate capacity') n=1 ;;\n  2|'inspect access plan') n=2 ;;\n  3|'inspect change record') n=3 ;;\n  *)\n    echo \"Device readouts for this lab (they follow settings.conf):\"\n    echo '  sh inspect.sh 1    calculate capacity'\n    echo '  sh inspect.sh 2    inspect access plan'\n    echo '  sh inspect.sh 3    inspect change record'\n    exit 0 ;;\nesac\ntext=$(lookup \"R|$n|$state\")\nif [ -n \"$text\" ]; then printf '%b\\n' \"$text\"; else unknown; fi\n"
   },
   {
    "path": "test.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Checks settings.conf against every requirement of this lab and records the\n# result in results.txt. Run it again after each change.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='capacity wireless segments changePlan'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\n: > results.txt\nflags=$(lookup \"T|$state\")\nif [ -z \"$flags\" ]; then unknown | tee -a results.txt; exit 1; fi\ni=0; pass=0; total=0\nwhile IFS= read -r label; do\n  i=$((i + 1)); total=$((total + 1))\n  if [ \"$(echo \"$flags\" | cut -d' ' -f$i)\" = 1 ]; then line=\"PASS   $label\"; pass=$((pass + 1)); else line=\"CHECK  $label\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_REQUIREMENTS'\nPorts/uplink meet demand and headroom\nApproved managed individual access used\nRequired group boundaries retained\nBaseline, tests, rollback, review included\nLAB_REQUIREMENTS\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_CHECKS_PASS\"; else line=\"$pass of $total requirements pass. Compare case/brief.txt and the readouts with settings.conf, change one setting, and test again.\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
   },
   {
    "path": "edit.py",
    "mode": 493,
    "content": "#!/usr/bin/env python3\n\"\"\"edit.py: a small line editor for the lab files.\n\n    python3 ~/lab/edit.py FILE\n\nIt shows the file with line numbers. Type a line number to change that line,\na to add a line at the end, d NUMBER to delete a line, s to save and quit,\nor q to quit without saving.\"\"\"\nimport sys\n\ntry:\n    import readline\nexcept ImportError:  # the editor still works without line recall\n    readline = None\n\n\ndef ask(prompt, prefill=\"\"):\n    if readline and prefill:\n        readline.set_startup_hook(lambda: readline.insert_text(prefill))\n    try:\n        return input(prompt)\n    finally:\n        if readline:\n            readline.set_startup_hook(None)\n\n\ndef show(lines):\n    print()\n    for number, line in enumerate(lines, 1):\n        print(f\"{number:3} | {line}\")\n    print()\n\n\ndef main():\n    if len(sys.argv) != 2:\n        print(__doc__)\n        return 1\n    name = sys.argv[1]\n    try:\n        with open(name, encoding=\"utf-8\") as handle:\n            lines = handle.read().split(\"\\n\")\n        if lines and lines[-1] == \"\":\n            lines.pop()\n    except FileNotFoundError:\n        lines = []\n    changed = False\n    show(lines)\n    while True:\n        try:\n            command = input(\"line number, a = add, d N = delete, s = save, q = quit: \").strip()\n        except EOFError:\n            command = \"q\"\n        if command == \"q\":\n            if changed and input(\"Quit without saving? (y/n): \").strip().lower() != \"y\":\n                continue\n            return 0\n        if command == \"s\":\n            with open(name, \"w\", encoding=\"utf-8\") as handle:\n                handle.write(\"\\n\".join(lines) + \"\\n\")\n            print(f\"Saved {name}.\")\n            return 0\n        if command == \"a\":\n            lines.append(ask(\"new line: \"))\n            changed = True\n            show(lines)\n            continue\n        if command.startswith(\"d \") and command[2:].strip().isdigit():\n            number = int(command[2:])\n            if 1 <= number <= len(lines):\n                del lines[number - 1]\n                changed = True\n                show(lines)\n            else:\n                print(\"There is no line with that number.\")\n            continue\n        if command.isdigit() and 1 <= int(command) <= len(lines):\n            number = int(command)\n            old = lines[number - 1]\n            new = ask(f\"{number:3} | \", old)\n            if not readline and new and not new[0].isspace():\n                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation\n            lines[number - 1] = new\n            changed = True\n            show(lines)\n            continue\n        print(\"Type a line number from the list, a, d NUMBER, s or q.\")\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"
   },
   {
    "path": ".lab-data.gz",
    "encoding": "base64",
    "content": "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"
   }
  ]
 },
 "NET-215": {
  "id": "NET-215",
  "title": "Read the Packet Evidence (real machine)",
  "track": "Networking & Operating Systems",
  "grade": "Grades 7–8",
  "minutes": 30,
  "summary": "Compare a local frame with the frame after a routed hop.",
  "markdown": "# NET-215 · Read the Packet Evidence\n\n> **Lab Brief:** *“Read the supplied Ethernet and IP packet table. Identify the local next hop and what changes at the router. No Wireshark or live capture is launched.”*\n\n## Your machine\n\nA real Linux machine with no network. The lab files are in `~/lab`.\n\n## Step-by-Step Instructions\n\n### Step 1: Read the case\n```sh\ncd ~/lab && cat README.txt case/brief.txt\n```\n\n### Step 2: Inspect the settings and the device readouts\n```sh\ncat settings.conf\nsh inspect.sh\n```\n\n### Step 3: Change a setting and test\n```sh\npython3 edit.py settings.conf\nsh test.sh\n```\n\nRepeat until `sh test.sh` prints `ALL_CHECKS_PASS`.\n",
  "milestones": [
   {
    "id": "m1-read-case",
    "title": "Read the case",
    "description": "Open the request and what is known before changing anything.",
    "hint": "Run: `cat ~/lab/case/brief.txt`",
    "checkType": "history_regex",
    "patternSource": "(?:cat|less|more|head)\\s+.*(?:brief\\.txt|README\\.txt)"
   },
   {
    "id": "m2-inspect",
    "title": "Inspect the settings and a device readout",
    "description": "Read settings.conf and run at least one readout.",
    "hint": "Run: `cat ~/lab/settings.conf` then `sh ~/lab/inspect.sh 1`",
    "checkType": "history_regex",
    "patternSource": "sh\\s+.*inspect\\.sh\\s+\\S"
   },
   {
    "id": "m3-settings",
    "title": "Every setting meets the request",
    "description": "Change settings.conf so each requirement in the case is met.",
    "hint": "Change one line with `python3 ~/lab/edit.py ~/lab/settings.conf`, then compare the readouts with case/brief.txt.",
    "checkType": "file_contains_all",
    "filePath": "/home/learner/lab/settings.conf",
    "expectedSubstrings": [
     "interface=ethernet",
     "nextHop=gateway",
     "headers=routed",
     "interpretation=link-path"
    ]
   },
   {
    "id": "m4-test",
    "title": "The full test passes",
    "description": "Run the test after your last change until every requirement passes.",
    "hint": "Run: `cd ~/lab && sh test.sh`",
    "checkType": "file_contains",
    "filePath": "/home/learner/lab/results.txt",
    "expectedSubstring": "ALL_CHECKS_PASS"
   }
  ],
  "files": [
   {
    "path": "README.txt",
    "content": "NET-215 · Read the Packet Evidence\n\nUse the correct interface and next hop, and distinguish link headers from the\nIP path.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-215 · Read the Packet Evidence\n\nRequested by: School network team · Local practice model\n\nTHE REQUEST\n“Read the supplied Ethernet and IP packet table. Identify the local next hop\nand what changes at the router. No Wireshark or live capture is launched.”\n\nGOAL\nUse the correct interface and next hop, and distinguish link headers from the\nIP path.\n\nWHAT IS KNOWN\n- Read supplied packet table: PC 192.0.2.24/24 has MAC 02:00:00:00:01:24.\nGateway 192.0.2.1 has LAN MAC 02:00:00:00:01:01. Remote 198.51.100.20 is\noff-subnet; the PC sends its local Ethernet frame to the gateway.\n- Read the neighbor record: Supplied ARP record maps gateway 192.0.2.1 to\n02:00:00:00:01:01 on classroom Ethernet. Remote server MAC is not a local ARP\nneighbor.\n- Compare routed-hop records: Before: Ethernet PC MAC → gateway LAN MAC; IPv4\n192.0.2.24 → 198.51.100.20; TTL 64. After: Ethernet router-out MAC → next-hop\nMAC; same IP endpoints; TTL 63. No NAT on this hop.\n- Read evidence limits: Use the classroom Ethernet card; the Wi-Fi card is\nunrelated. Ethernet addresses identify this link; IPv4 endpoints identify this\nsupplied path. One captured frame does not prove application success.\n\nQUESTIONS ALREADY ANSWERED\n- Use remote server MAC in the first frame? No. The off-subnet packet uses the\ngateway as its local Ethernet next hop.\n- Does every header stay unchanged? Ethernet headers change and TTL decreases.\nIP endpoints stay the same on this supplied hop without NAT.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# SUPPLIED PACKET EVIDENCE\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Supplied capture interface\n#    wifi       Unrelated Wi-Fi card\n#    ethernet   Classroom Ethernet card\ninterface=wifi\n\n# PC frame destination\n#    remote    Remote server MAC\n#    gateway   Gateway LAN MAC 02:00:00:00:01:01\nnextHop=remote\n\n# Routed hop without NAT\n#    unchanged     All headers unchanged\n#    routed        New Ethernet; same IP endpoints; TTL 64 → 63\n#    ip-replaced   Replace IP destination with next router\nheaders=unchanged\n\n# Evidence supports\n#    application   One frame proves application success\n#    link-path     Current-link delivery and supplied IP path\ninterpretation=application\n"
   },
   {
    "path": "inspect.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Shows a device readout for the settings saved in settings.conf right now.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='interface nextHop headers interpretation'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\ncase \"$*\" in\n  1|'inspect capture') n=1 ;;\n  2|'inspect next hop') n=2 ;;\n  3|'compare hop headers') n=3 ;;\n  *)\n    echo \"Device readouts for this lab (they follow settings.conf):\"\n    echo '  sh inspect.sh 1    inspect capture'\n    echo '  sh inspect.sh 2    inspect next hop'\n    echo '  sh inspect.sh 3    compare hop headers'\n    exit 0 ;;\nesac\ntext=$(lookup \"R|$n|$state\")\nif [ -n \"$text\" ]; then printf '%b\\n' \"$text\"; else unknown; fi\n"
   },
   {
    "path": "test.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Checks settings.conf against every requirement of this lab and records the\n# result in results.txt. Run it again after each change.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='interface nextHop headers interpretation'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\n: > results.txt\nflags=$(lookup \"T|$state\")\nif [ -z \"$flags\" ]; then unknown | tee -a results.txt; exit 1; fi\ni=0; pass=0; total=0\nwhile IFS= read -r label; do\n  i=$((i + 1)); total=$((total + 1))\n  if [ \"$(echo \"$flags\" | cut -d' ' -f$i)\" = 1 ]; then line=\"PASS   $label\"; pass=$((pass + 1)); else line=\"CHECK  $label\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_REQUIREMENTS'\nEvidence comes from classroom Ethernet\nOff-subnet frame uses gateway MAC\nHeaders match routed hop without NAT\nEvidence interpreted within limits\nLAB_REQUIREMENTS\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_CHECKS_PASS\"; else line=\"$pass of $total requirements pass. Compare case/brief.txt and the readouts with settings.conf, change one setting, and test again.\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
   },
   {
    "path": "edit.py",
    "mode": 493,
    "content": "#!/usr/bin/env python3\n\"\"\"edit.py: a small line editor for the lab files.\n\n    python3 ~/lab/edit.py FILE\n\nIt shows the file with line numbers. Type a line number to change that line,\na to add a line at the end, d NUMBER to delete a line, s to save and quit,\nor q to quit without saving.\"\"\"\nimport sys\n\ntry:\n    import readline\nexcept ImportError:  # the editor still works without line recall\n    readline = None\n\n\ndef ask(prompt, prefill=\"\"):\n    if readline and prefill:\n        readline.set_startup_hook(lambda: readline.insert_text(prefill))\n    try:\n        return input(prompt)\n    finally:\n        if readline:\n            readline.set_startup_hook(None)\n\n\ndef show(lines):\n    print()\n    for number, line in enumerate(lines, 1):\n        print(f\"{number:3} | {line}\")\n    print()\n\n\ndef main():\n    if len(sys.argv) != 2:\n        print(__doc__)\n        return 1\n    name = sys.argv[1]\n    try:\n        with open(name, encoding=\"utf-8\") as handle:\n            lines = handle.read().split(\"\\n\")\n        if lines and lines[-1] == \"\":\n            lines.pop()\n    except FileNotFoundError:\n        lines = []\n    changed = False\n    show(lines)\n    while True:\n        try:\n            command = input(\"line number, a = add, d N = delete, s = save, q = quit: \").strip()\n        except EOFError:\n            command = \"q\"\n        if command == \"q\":\n            if changed and input(\"Quit without saving? (y/n): \").strip().lower() != \"y\":\n                continue\n            return 0\n        if command == \"s\":\n            with open(name, \"w\", encoding=\"utf-8\") as handle:\n                handle.write(\"\\n\".join(lines) + \"\\n\")\n            print(f\"Saved {name}.\")\n            return 0\n        if command == \"a\":\n            lines.append(ask(\"new line: \"))\n            changed = True\n            show(lines)\n            continue\n        if command.startswith(\"d \") and command[2:].strip().isdigit():\n            number = int(command[2:])\n            if 1 <= number <= len(lines):\n                del lines[number - 1]\n                changed = True\n                show(lines)\n            else:\n                print(\"There is no line with that number.\")\n            continue\n        if command.isdigit() and 1 <= int(command) <= len(lines):\n            number = int(command)\n            old = lines[number - 1]\n            new = ask(f\"{number:3} | \", old)\n            if not readline and new and not new[0].isspace():\n                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation\n            lines[number - 1] = new\n            changed = True\n            show(lines)\n            continue\n        print(\"Type a line number from the list, a, d NUMBER, s or q.\")\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"
   },
   {
    "path": ".lab-data.gz",
    "encoding": "base64",
    "content": "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"
   }
  ]
 },
 "NET-216": {
  "id": "NET-216",
  "title": "Check the Network Manager Alert (real machine)",
  "track": "Networking & Operating Systems",
  "grade": "Grades 9–10",
  "minutes": 30,
  "summary": "Compare counter samples and route a protected manager alert.",
  "markdown": "# NET-216 · Check the Network Manager Alert\n\n> **Lab Brief:** *“Our manager has two interface samples. Calculate the error rate and prepare the approved alert. The local model sends no SNMP requests or notifications.”*\n\n## Your machine\n\nA real Linux machine with no network. The lab files are in `~/lab`.\n\n## Step-by-Step Instructions\n\n### Step 1: Read the case\n```sh\ncd ~/lab && cat README.txt case/brief.txt\n```\n\n### Step 2: Inspect the settings and the device readouts\n```sh\ncat settings.conf\nsh inspect.sh\n```\n\n### Step 3: Change a setting and test\n```sh\npython3 edit.py settings.conf\nsh test.sh\n```\n\nRepeat until `sh test.sh` prints `ALL_CHECKS_PASS`.\n",
  "milestones": [
   {
    "id": "m1-read-case",
    "title": "Read the case",
    "description": "Open the request and what is known before changing anything.",
    "hint": "Run: `cat ~/lab/case/brief.txt`",
    "checkType": "history_regex",
    "patternSource": "(?:cat|less|more|head)\\s+.*(?:brief\\.txt|README\\.txt)"
   },
   {
    "id": "m2-inspect",
    "title": "Inspect the settings and a device readout",
    "description": "Read settings.conf and run at least one readout.",
    "hint": "Run: `cat ~/lab/settings.conf` then `sh ~/lab/inspect.sh 1`",
    "checkType": "history_regex",
    "patternSource": "sh\\s+.*inspect\\.sh\\s+\\S"
   },
   {
    "id": "m3-settings",
    "title": "Every setting meets the request",
    "description": "Change settings.conf so each requirement in the case is met.",
    "hint": "Change one line with `python3 ~/lab/edit.py ~/lab/settings.conf`, then compare the readouts with case/brief.txt.",
    "checkType": "file_contains_all",
    "filePath": "/home/learner/lab/settings.conf",
    "expectedSubstrings": [
     "target=uplink",
     "protection=authpriv",
     "threshold=rate",
     "receiver=approved"
    ]
   },
   {
    "id": "m4-test",
    "title": "The full test passes",
    "description": "Run the test after your last change until every requirement passes.",
    "hint": "Run: `cd ~/lab && sh test.sh`",
    "checkType": "file_contains",
    "filePath": "/home/learner/lab/results.txt",
    "expectedSubstring": "ALL_CHECKS_PASS"
   }
  ],
  "files": [
   {
    "path": "README.txt",
    "content": "NET-216 · Check the Network Manager Alert\n\nUse the approved target, protected SNMP method, rate threshold, and receiver.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-216 · Check the Network Manager Alert\n\nRequested by: School network team · Local practice model\n\nTHE REQUEST\n“Our manager has two interface samples. Calculate the error rate and prepare\nthe approved alert. The local model sends no SNMP requests or notifications.”\n\nGOAL\nUse the approved target, protected SNMP method, rate threshold, and receiver.\n\nWHAT IS KNOWN\n- Read manager inventory: NMS-01 monitors SW-04 interface uplink-1. The\nunrelated printer queue is not the source of this interface alert.\n- Calculate the counter delta: 10:00:00 counter 100; 10:01:00 counter 160. No\nreboot/reset. Delta 60 errors / 60 seconds = 1 error/second. Approved\nthreshold: greater than 0.5 errors/second. A lifetime total is not a rate.\n- Read management policy: Use approved SNMPv3 authPriv, with authentication\nand privacy protection. Staff provision credentials outside this lab.\nUnprotected community-string polling does not meet policy.\n- Read the alert route: Compare the polled rate with threshold and route to\nthe approved local NMS-01 receiver record. Retain timestamp, device/interface,\nrate, threshold. A configured receiver alone does not prove delivery; inspect\nthe fixed acceptance test.\n\nQUESTIONS ALREADY ANSWERED\n- Is counter total the current rate? No. Compare two samples and elapsed time,\nchecking for resets. Here 60 new errors over 60 seconds is 1 error/second.\n- Do you need SNMP credentials? No. Choose the approved method only; school\nstaff provision credentials outside this simulation.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# NMS-01 · FIXED SNMP EVIDENCE\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Inventory target\n#    printer   Unrelated printer queue\n#    uplink    SW-04 · uplink-1\ntarget=printer\n\n# Management protection\n#    community   Unprotected community-string polling\n#    authpriv    Approved SNMPv3 authPriv; staff provision credentials\nprotection=community\n\n# Alert comparison\n#    total   Lifetime counter total > 100\n#    rate    Sample rate > 0.5 errors/second\nthreshold=total\n\n# Notification receiver\n#    none       No receiver/test record\n#    approved   Approved NMS-01 receiver and acceptance test\n#    external   Unapproved external receiver\nreceiver=none\n"
   },
   {
    "path": "inspect.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Shows a device readout for the settings saved in settings.conf right now.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='target protection threshold receiver'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\ncase \"$*\" in\n  1|'inspect manager') n=1 ;;\n  2|'calculate error rate') n=2 ;;\n  3|'test alert receiver') n=3 ;;\n  *)\n    echo \"Device readouts for this lab (they follow settings.conf):\"\n    echo '  sh inspect.sh 1    inspect manager'\n    echo '  sh inspect.sh 2    calculate error rate'\n    echo '  sh inspect.sh 3    test alert receiver'\n    exit 0 ;;\nesac\ntext=$(lookup \"R|$n|$state\")\nif [ -n \"$text\" ]; then printf '%b\\n' \"$text\"; else unknown; fi\n"
   },
   {
    "path": "test.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Checks settings.conf against every requirement of this lab and records the\n# result in results.txt. Run it again after each change.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='target protection threshold receiver'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\n: > results.txt\nflags=$(lookup \"T|$state\")\nif [ -z \"$flags\" ]; then unknown | tee -a results.txt; exit 1; fi\ni=0; pass=0; total=0\nwhile IFS= read -r label; do\n  i=$((i + 1)); total=$((total + 1))\n  if [ \"$(echo \"$flags\" | cut -d' ' -f$i)\" = 1 ]; then line=\"PASS   $label\"; pass=$((pass + 1)); else line=\"CHECK  $label\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_REQUIREMENTS'\nManager targets approved device/interface\nApproved SNMPv3 authPriv selected\nCalculated rate compared with threshold\nApproved receiver acceptance test retained\nLAB_REQUIREMENTS\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_CHECKS_PASS\"; else line=\"$pass of $total requirements pass. Compare case/brief.txt and the readouts with settings.conf, change one setting, and test again.\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
   },
   {
    "path": "edit.py",
    "mode": 493,
    "content": "#!/usr/bin/env python3\n\"\"\"edit.py: a small line editor for the lab files.\n\n    python3 ~/lab/edit.py FILE\n\nIt shows the file with line numbers. Type a line number to change that line,\na to add a line at the end, d NUMBER to delete a line, s to save and quit,\nor q to quit without saving.\"\"\"\nimport sys\n\ntry:\n    import readline\nexcept ImportError:  # the editor still works without line recall\n    readline = None\n\n\ndef ask(prompt, prefill=\"\"):\n    if readline and prefill:\n        readline.set_startup_hook(lambda: readline.insert_text(prefill))\n    try:\n        return input(prompt)\n    finally:\n        if readline:\n            readline.set_startup_hook(None)\n\n\ndef show(lines):\n    print()\n    for number, line in enumerate(lines, 1):\n        print(f\"{number:3} | {line}\")\n    print()\n\n\ndef main():\n    if len(sys.argv) != 2:\n        print(__doc__)\n        return 1\n    name = sys.argv[1]\n    try:\n        with open(name, encoding=\"utf-8\") as handle:\n            lines = handle.read().split(\"\\n\")\n        if lines and lines[-1] == \"\":\n            lines.pop()\n    except FileNotFoundError:\n        lines = []\n    changed = False\n    show(lines)\n    while True:\n        try:\n            command = input(\"line number, a = add, d N = delete, s = save, q = quit: \").strip()\n        except EOFError:\n            command = \"q\"\n        if command == \"q\":\n            if changed and input(\"Quit without saving? (y/n): \").strip().lower() != \"y\":\n                continue\n            return 0\n        if command == \"s\":\n            with open(name, \"w\", encoding=\"utf-8\") as handle:\n                handle.write(\"\\n\".join(lines) + \"\\n\")\n            print(f\"Saved {name}.\")\n            return 0\n        if command == \"a\":\n            lines.append(ask(\"new line: \"))\n            changed = True\n            show(lines)\n            continue\n        if command.startswith(\"d \") and command[2:].strip().isdigit():\n            number = int(command[2:])\n            if 1 <= number <= len(lines):\n                del lines[number - 1]\n                changed = True\n                show(lines)\n            else:\n                print(\"There is no line with that number.\")\n            continue\n        if command.isdigit() and 1 <= int(command) <= len(lines):\n            number = int(command)\n            old = lines[number - 1]\n            new = ask(f\"{number:3} | \", old)\n            if not readline and new and not new[0].isspace():\n                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation\n            lines[number - 1] = new\n            changed = True\n            show(lines)\n            continue\n        print(\"Type a line number from the list, a, d NUMBER, s or q.\")\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"
   },
   {
    "path": ".lab-data.gz",
    "encoding": "base64",
    "content": "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"
   }
  ]
 },
 "CODE-502": {
  "id": "CODE-502",
  "title": "The Classroom Thermostat (real Python)",
  "track": "Coding",
  "grade": "Grades 9–10",
  "minutes": 25,
  "summary": "Make a room display react to changing temperatures.",
  "markdown": "# CODE-502 · The Classroom Thermostat\n\n> **Lab Brief:** *Fix the display rule. Try 20 and 25 as well as a colder and warmer room. No real equipment is connected.*\n\n## Your machine\n\nA real Linux machine with Python 3 and no network. The lab files are in `~/lab/code`.\n\n## Step-by-Step Instructions\n\n### Step 1: Read the program and its fixtures\n```sh\ncd ~/lab/code && cat program.py fixtures.txt\n```\n\n### Step 2: Run it with one input\n```sh\npython3 program.py 18\n```\n\n### Step 3: Fix the program and run every fixture\n```sh\npython3 ~/lab/edit.py program.py\nsh check.sh\n```\n",
  "milestones": [
   {
    "id": "m1-read-program",
    "title": "Read program.py",
    "description": "Open the program before changing it.",
    "hint": "Run: `cat ~/lab/code/program.py`",
    "checkType": "history_regex",
    "patternSource": "(?:cat|less|head|more)\\s+.*program\\.py|edit\\.py\\s+.*program\\.py"
   },
   {
    "id": "m2-run-program",
    "title": "Run program.py with one input",
    "description": "Run the program with python3 and one input value.",
    "hint": "Run: `python3 ~/lab/code/program.py 18`",
    "checkType": "history_regex",
    "patternSource": "python3?\\s+(?!.*edit\\.py).*program\\.py"
   },
   {
    "id": "m3-fixtures-pass",
    "title": "Every fixture passes (check.sh)",
    "description": "Fix the program so check.sh writes ALL_FIXTURES_PASS to ~/lab/code/results.txt.",
    "hint": "Compare fixtures.txt with what the program prints, change one line with `python3 ~/lab/edit.py program.py`, then run `sh check.sh` in ~/lab/code.",
    "checkType": "file_contains",
    "filePath": "/home/learner/lab/code/results.txt",
    "expectedSubstring": "ALL_FIXTURES_PASS"
   }
  ],
  "files": [
   {
    "path": "README.txt",
    "content": "CODE-502 · The Classroom Thermostat\n\nPrint Heating below 20, Comfortable from 20 through 25, and Cooling above 25.\n\nThis is a real Linux machine with Python 3 and no network.\n\nFILES\n  code/program.py     the starter program (it has a defect)\n  code/fixtures.txt   each input and the output it must produce\n  code/check.sh       runs every fixture and writes code/results.txt\n  edit.py             a small editor:  python3 ~/lab/edit.py program.py\n\nWHAT TO DO\n  1. cd ~/lab/code && cat program.py fixtures.txt\n  2. python3 program.py 18\n  3. python3 ~/lab/edit.py program.py     (change a line, then s to save)\n  4. sh check.sh    until it prints ALL_FIXTURES_PASS\n"
   },
   {
    "path": "code/program.py",
    "content": "import sys\n\n# CODE-502: Print Heating below 20, Comfortable from 20 through 25, and Cooling above 25.\n# The input arrives as the first command-line argument.\ntemperature = int(sys.argv[1]) if len(sys.argv) > 1 else 18\n\nif temperature > 20:\n    print(\"Heating\")\nelse:\n    print(\"Cooling\")\n"
   },
   {
    "path": "code/fixtures.txt",
    "content": "Input variable: temperature (first command-line argument)\ntemperature = 18  ->  expected: Heating\ntemperature = 20  ->  expected: Comfortable\ntemperature = 25  ->  expected: Comfortable\ntemperature = 30  ->  expected: Cooling\n"
   },
   {
    "path": "code/check.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Runs program.py against every fixture and records the result in results.txt.\ncd \"$(dirname \"$0\")\" || exit 1\npass=0; total=0; : > results.txt\nwhile IFS='|' read -r input want; do\n  total=$((total + 1))\n  got=$(python3 program.py \"$input\" 2>&1 | tr '\\n' ';')\n  if [ \"$got\" = \"$want\" ]; then line=\"PASS temperature=$input\"; pass=$((pass + 1)); else line=\"FAIL temperature=$input -> got: $got expected: $want\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_FIXTURES'\n18|Heating;\n20|Comfortable;\n25|Comfortable;\n30|Cooling;\nLAB_FIXTURES\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_FIXTURES_PASS\"; else line=\"$pass of $total fixtures pass\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
   },
   {
    "path": "edit.py",
    "mode": 493,
    "content": "#!/usr/bin/env python3\n\"\"\"edit.py: a small line editor for the lab files.\n\n    python3 ~/lab/edit.py FILE\n\nIt shows the file with line numbers. Type a line number to change that line,\na to add a line at the end, d NUMBER to delete a line, s to save and quit,\nor q to quit without saving.\"\"\"\nimport sys\n\ntry:\n    import readline\nexcept ImportError:  # the editor still works without line recall\n    readline = None\n\n\ndef ask(prompt, prefill=\"\"):\n    if readline and prefill:\n        readline.set_startup_hook(lambda: readline.insert_text(prefill))\n    try:\n        return input(prompt)\n    finally:\n        if readline:\n            readline.set_startup_hook(None)\n\n\ndef show(lines):\n    print()\n    for number, line in enumerate(lines, 1):\n        print(f\"{number:3} | {line}\")\n    print()\n\n\ndef main():\n    if len(sys.argv) != 2:\n        print(__doc__)\n        return 1\n    name = sys.argv[1]\n    try:\n        with open(name, encoding=\"utf-8\") as handle:\n            lines = handle.read().split(\"\\n\")\n        if lines and lines[-1] == \"\":\n            lines.pop()\n    except FileNotFoundError:\n        lines = []\n    changed = False\n    show(lines)\n    while True:\n        try:\n            command = input(\"line number, a = add, d N = delete, s = save, q = quit: \").strip()\n        except EOFError:\n            command = \"q\"\n        if command == \"q\":\n            if changed and input(\"Quit without saving? (y/n): \").strip().lower() != \"y\":\n                continue\n            return 0\n        if command == \"s\":\n            with open(name, \"w\", encoding=\"utf-8\") as handle:\n                handle.write(\"\\n\".join(lines) + \"\\n\")\n            print(f\"Saved {name}.\")\n            return 0\n        if command == \"a\":\n            lines.append(ask(\"new line: \"))\n            changed = True\n            show(lines)\n            continue\n        if command.startswith(\"d \") and command[2:].strip().isdigit():\n            number = int(command[2:])\n            if 1 <= number <= len(lines):\n                del lines[number - 1]\n                changed = True\n                show(lines)\n            else:\n                print(\"There is no line with that number.\")\n            continue\n        if command.isdigit() and 1 <= int(command) <= len(lines):\n            number = int(command)\n            old = lines[number - 1]\n            new = ask(f\"{number:3} | \", old)\n            if not readline and new and not new[0].isspace():\n                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation\n            lines[number - 1] = new\n            changed = True\n            show(lines)\n            continue\n        print(\"Type a line number from the list, a, d NUMBER, s or q.\")\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"
   }
  ]
 },
 "CODE-503": {
  "id": "CODE-503",
  "title": "The Workstation Readiness Loop (real Python)",
  "track": "Coding",
  "grade": "Grades 11–12",
  "minutes": 30,
  "summary": "Build the right readiness list for each room size.",
  "markdown": "# CODE-503 · The Workstation Readiness Loop\n\n> **Lab Brief:** *The list includes a station that does not exist. Fix the loop, then compare its first and last lines for each room.*\n\n## Your machine\n\nA real Linux machine with Python 3 and no network. The lab files are in `~/lab/code`.\n\n## Step-by-Step Instructions\n\n### Step 1: Read the program and its fixtures\n```sh\ncd ~/lab/code && cat program.py fixtures.txt\n```\n\n### Step 2: Run it with one input\n```sh\npython3 program.py 1\n```\n\n### Step 3: Fix the program and run every fixture\n```sh\npython3 ~/lab/edit.py program.py\nsh check.sh\n```\n",
  "milestones": [
   {
    "id": "m1-read-program",
    "title": "Read program.py",
    "description": "Open the program before changing it.",
    "hint": "Run: `cat ~/lab/code/program.py`",
    "checkType": "history_regex",
    "patternSource": "(?:cat|less|head|more)\\s+.*program\\.py|edit\\.py\\s+.*program\\.py"
   },
   {
    "id": "m2-run-program",
    "title": "Run program.py with one input",
    "description": "Run the program with python3 and one input value.",
    "hint": "Run: `python3 ~/lab/code/program.py 1`",
    "checkType": "history_regex",
    "patternSource": "python3?\\s+(?!.*edit\\.py).*program\\.py"
   },
   {
    "id": "m3-fixtures-pass",
    "title": "Every fixture passes (check.sh)",
    "description": "Fix the program so check.sh writes ALL_FIXTURES_PASS to ~/lab/code/results.txt.",
    "hint": "Compare fixtures.txt with what the program prints, change one line with `python3 ~/lab/edit.py program.py`, then run `sh check.sh` in ~/lab/code.",
    "checkType": "file_contains",
    "filePath": "/home/learner/lab/code/results.txt",
    "expectedSubstring": "ALL_FIXTURES_PASS"
   }
  ],
  "files": [
   {
    "path": "README.txt",
    "content": "CODE-503 · The Workstation Readiness Loop\n\nPrint Ready 1 through Ready N, one line per station, using the supplied\nstations count.\n\nThis is a real Linux machine with Python 3 and no network.\n\nFILES\n  code/program.py     the starter program (it has a defect)\n  code/fixtures.txt   each input and the output it must produce\n  code/check.sh       runs every fixture and writes code/results.txt\n  edit.py             a small editor:  python3 ~/lab/edit.py program.py\n\nWHAT TO DO\n  1. cd ~/lab/code && cat program.py fixtures.txt\n  2. python3 program.py 1\n  3. python3 ~/lab/edit.py program.py     (change a line, then s to save)\n  4. sh check.sh    until it prints ALL_FIXTURES_PASS\n"
   },
   {
    "path": "code/program.py",
    "content": "import sys\n\n# CODE-503: Print Ready 1 through Ready N, one line per station, using the supplied stations count.\n# The input arrives as the first command-line argument.\nstations = int(sys.argv[1]) if len(sys.argv) > 1 else 1\n\nfor station in range(stations):\n    print(\"Ready\", station)\n"
   },
   {
    "path": "code/fixtures.txt",
    "content": "Input variable: stations (first command-line argument)\nstations = 1  ->  expected: Ready 1\nstations = 3  ->  expected: Ready 1 | Ready 2 | Ready 3\nstations = 5  ->  expected: Ready 1 | Ready 2 | Ready 3 | Ready 4 | Ready 5\n"
   },
   {
    "path": "code/check.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Runs program.py against every fixture and records the result in results.txt.\ncd \"$(dirname \"$0\")\" || exit 1\npass=0; total=0; : > results.txt\nwhile IFS='|' read -r input want; do\n  total=$((total + 1))\n  got=$(python3 program.py \"$input\" 2>&1 | tr '\\n' ';')\n  if [ \"$got\" = \"$want\" ]; then line=\"PASS stations=$input\"; pass=$((pass + 1)); else line=\"FAIL stations=$input -> got: $got expected: $want\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_FIXTURES'\n1|Ready 1;\n3|Ready 1;Ready 2;Ready 3;\n5|Ready 1;Ready 2;Ready 3;Ready 4;Ready 5;\nLAB_FIXTURES\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_FIXTURES_PASS\"; else line=\"$pass of $total fixtures pass\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
   },
   {
    "path": "edit.py",
    "mode": 493,
    "content": "#!/usr/bin/env python3\n\"\"\"edit.py: a small line editor for the lab files.\n\n    python3 ~/lab/edit.py FILE\n\nIt shows the file with line numbers. Type a line number to change that line,\na to add a line at the end, d NUMBER to delete a line, s to save and quit,\nor q to quit without saving.\"\"\"\nimport sys\n\ntry:\n    import readline\nexcept ImportError:  # the editor still works without line recall\n    readline = None\n\n\ndef ask(prompt, prefill=\"\"):\n    if readline and prefill:\n        readline.set_startup_hook(lambda: readline.insert_text(prefill))\n    try:\n        return input(prompt)\n    finally:\n        if readline:\n            readline.set_startup_hook(None)\n\n\ndef show(lines):\n    print()\n    for number, line in enumerate(lines, 1):\n        print(f\"{number:3} | {line}\")\n    print()\n\n\ndef main():\n    if len(sys.argv) != 2:\n        print(__doc__)\n        return 1\n    name = sys.argv[1]\n    try:\n        with open(name, encoding=\"utf-8\") as handle:\n            lines = handle.read().split(\"\\n\")\n        if lines and lines[-1] == \"\":\n            lines.pop()\n    except FileNotFoundError:\n        lines = []\n    changed = False\n    show(lines)\n    while True:\n        try:\n            command = input(\"line number, a = add, d N = delete, s = save, q = quit: \").strip()\n        except EOFError:\n            command = \"q\"\n        if command == \"q\":\n            if changed and input(\"Quit without saving? (y/n): \").strip().lower() != \"y\":\n                continue\n            return 0\n        if command == \"s\":\n            with open(name, \"w\", encoding=\"utf-8\") as handle:\n                handle.write(\"\\n\".join(lines) + \"\\n\")\n            print(f\"Saved {name}.\")\n            return 0\n        if command == \"a\":\n            lines.append(ask(\"new line: \"))\n            changed = True\n            show(lines)\n            continue\n        if command.startswith(\"d \") and command[2:].strip().isdigit():\n            number = int(command[2:])\n            if 1 <= number <= len(lines):\n                del lines[number - 1]\n                changed = True\n                show(lines)\n            else:\n                print(\"There is no line with that number.\")\n            continue\n        if command.isdigit() and 1 <= int(command) <= len(lines):\n            number = int(command)\n            old = lines[number - 1]\n            new = ask(f\"{number:3} | \", old)\n            if not readline and new and not new[0].isspace():\n                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation\n            lines[number - 1] = new\n            changed = True\n            show(lines)\n            continue\n        print(\"Type a line number from the list, a, d NUMBER, s or q.\")\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"
   }
  ]
 },
 "CODE-504": {
  "id": "CODE-504",
  "title": "Pixel Pet Snack Time (real Python)",
  "track": "Coding",
  "grade": "Grades 7–8",
  "minutes": 20,
  "summary": "Turn fictional snack tokens into a pixel pet’s energy display.",
  "markdown": "# CODE-504 · Pixel Pet Snack Time\n\n> **Lab Brief:** *Each fictional snack token adds 4 energy points. Fix the total and keep the Energy label. These tokens are not real food.*\n\n## Your machine\n\nA real Linux machine with Python 3 and no network. The lab files are in `~/lab/code`.\n\n## Step-by-Step Instructions\n\n### Step 1: Read the program and its fixtures\n```sh\ncd ~/lab/code && cat program.py fixtures.txt\n```\n\n### Step 2: Run it with one input\n```sh\npython3 program.py 0\n```\n\n### Step 3: Fix the program and run every fixture\n```sh\npython3 ~/lab/edit.py program.py\nsh check.sh\n```\n",
  "milestones": [
   {
    "id": "m1-read-program",
    "title": "Read program.py",
    "description": "Open the program before changing it.",
    "hint": "Run: `cat ~/lab/code/program.py`",
    "checkType": "history_regex",
    "patternSource": "(?:cat|less|head|more)\\s+.*program\\.py|edit\\.py\\s+.*program\\.py"
   },
   {
    "id": "m2-run-program",
    "title": "Run program.py with one input",
    "description": "Run the program with python3 and one input value.",
    "hint": "Run: `python3 ~/lab/code/program.py 0`",
    "checkType": "history_regex",
    "patternSource": "python3?\\s+(?!.*edit\\.py).*program\\.py"
   },
   {
    "id": "m3-fixtures-pass",
    "title": "Every fixture passes (check.sh)",
    "description": "Fix the program so check.sh writes ALL_FIXTURES_PASS to ~/lab/code/results.txt.",
    "hint": "Compare fixtures.txt with what the program prints, change one line with `python3 ~/lab/edit.py program.py`, then run `sh check.sh` in ~/lab/code.",
    "checkType": "file_contains",
    "filePath": "/home/learner/lab/code/results.txt",
    "expectedSubstring": "ALL_FIXTURES_PASS"
   }
  ],
  "files": [
   {
    "path": "README.txt",
    "content": "CODE-504 · Pixel Pet Snack Time\n\nPrint Energy followed by a space and snacks multiplied by 4. Zero snacks means\nEnergy 0.\n\nThis is a real Linux machine with Python 3 and no network.\n\nFILES\n  code/program.py     the starter program (it has a defect)\n  code/fixtures.txt   each input and the output it must produce\n  code/check.sh       runs every fixture and writes code/results.txt\n  edit.py             a small editor:  python3 ~/lab/edit.py program.py\n\nWHAT TO DO\n  1. cd ~/lab/code && cat program.py fixtures.txt\n  2. python3 program.py 0\n  3. python3 ~/lab/edit.py program.py     (change a line, then s to save)\n  4. sh check.sh    until it prints ALL_FIXTURES_PASS\n"
   },
   {
    "path": "code/program.py",
    "content": "import sys\n\n# CODE-504: Print Energy followed by a space and snacks multiplied by 4. Zero snacks means Energy 0.\n# The input arrives as the first command-line argument.\nsnacks = int(sys.argv[1]) if len(sys.argv) > 1 else 0\n\nenergy = snacks + 4\nprint(\"Energy\", energy)\n"
   },
   {
    "path": "code/fixtures.txt",
    "content": "Input variable: snacks (first command-line argument)\nsnacks = 0  ->  expected: Energy 0\nsnacks = 2  ->  expected: Energy 8\nsnacks = 5  ->  expected: Energy 20\n"
   },
   {
    "path": "code/check.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Runs program.py against every fixture and records the result in results.txt.\ncd \"$(dirname \"$0\")\" || exit 1\npass=0; total=0; : > results.txt\nwhile IFS='|' read -r input want; do\n  total=$((total + 1))\n  got=$(python3 program.py \"$input\" 2>&1 | tr '\\n' ';')\n  if [ \"$got\" = \"$want\" ]; then line=\"PASS snacks=$input\"; pass=$((pass + 1)); else line=\"FAIL snacks=$input -> got: $got expected: $want\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_FIXTURES'\n0|Energy 0;\n2|Energy 8;\n5|Energy 20;\nLAB_FIXTURES\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_FIXTURES_PASS\"; else line=\"$pass of $total fixtures pass\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
   },
   {
    "path": "edit.py",
    "mode": 493,
    "content": "#!/usr/bin/env python3\n\"\"\"edit.py: a small line editor for the lab files.\n\n    python3 ~/lab/edit.py FILE\n\nIt shows the file with line numbers. Type a line number to change that line,\na to add a line at the end, d NUMBER to delete a line, s to save and quit,\nor q to quit without saving.\"\"\"\nimport sys\n\ntry:\n    import readline\nexcept ImportError:  # the editor still works without line recall\n    readline = None\n\n\ndef ask(prompt, prefill=\"\"):\n    if readline and prefill:\n        readline.set_startup_hook(lambda: readline.insert_text(prefill))\n    try:\n        return input(prompt)\n    finally:\n        if readline:\n            readline.set_startup_hook(None)\n\n\ndef show(lines):\n    print()\n    for number, line in enumerate(lines, 1):\n        print(f\"{number:3} | {line}\")\n    print()\n\n\ndef main():\n    if len(sys.argv) != 2:\n        print(__doc__)\n        return 1\n    name = sys.argv[1]\n    try:\n        with open(name, encoding=\"utf-8\") as handle:\n            lines = handle.read().split(\"\\n\")\n        if lines and lines[-1] == \"\":\n            lines.pop()\n    except FileNotFoundError:\n        lines = []\n    changed = False\n    show(lines)\n    while True:\n        try:\n            command = input(\"line number, a = add, d N = delete, s = save, q = quit: \").strip()\n        except EOFError:\n            command = \"q\"\n        if command == \"q\":\n            if changed and input(\"Quit without saving? (y/n): \").strip().lower() != \"y\":\n                continue\n            return 0\n        if command == \"s\":\n            with open(name, \"w\", encoding=\"utf-8\") as handle:\n                handle.write(\"\\n\".join(lines) + \"\\n\")\n            print(f\"Saved {name}.\")\n            return 0\n        if command == \"a\":\n            lines.append(ask(\"new line: \"))\n            changed = True\n            show(lines)\n            continue\n        if command.startswith(\"d \") and command[2:].strip().isdigit():\n            number = int(command[2:])\n            if 1 <= number <= len(lines):\n                del lines[number - 1]\n                changed = True\n                show(lines)\n            else:\n                print(\"There is no line with that number.\")\n            continue\n        if command.isdigit() and 1 <= int(command) <= len(lines):\n            number = int(command)\n            old = lines[number - 1]\n            new = ask(f\"{number:3} | \", old)\n            if not readline and new and not new[0].isspace():\n                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation\n            lines[number - 1] = new\n            changed = True\n            show(lines)\n            continue\n        print(\"Type a line number from the list, a, d NUMBER, s or q.\")\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"
   }
  ]
 },
 "CODE-505": {
  "id": "CODE-505",
  "title": "Arcade Prize Patrol (real Python)",
  "track": "Coding",
  "grade": "Grades 9–10",
  "minutes": 25,
  "summary": "Make a pretend prize desk respond at the right scores.",
  "markdown": "# CODE-505 · Arcade Prize Patrol\n\n> **Lab Brief:** *The fictional prize desk mixes up scores of 50 and 100. Fix the decisions, then try the score cards. No real rewards are involved.*\n\n## Your machine\n\nA real Linux machine with Python 3 and no network. The lab files are in `~/lab/code`.\n\n## Step-by-Step Instructions\n\n### Step 1: Read the program and its fixtures\n```sh\ncd ~/lab/code && cat program.py fixtures.txt\n```\n\n### Step 2: Run it with one input\n```sh\npython3 program.py 0\n```\n\n### Step 3: Fix the program and run every fixture\n```sh\npython3 ~/lab/edit.py program.py\nsh check.sh\n```\n",
  "milestones": [
   {
    "id": "m1-read-program",
    "title": "Read program.py",
    "description": "Open the program before changing it.",
    "hint": "Run: `cat ~/lab/code/program.py`",
    "checkType": "history_regex",
    "patternSource": "(?:cat|less|head|more)\\s+.*program\\.py|edit\\.py\\s+.*program\\.py"
   },
   {
    "id": "m2-run-program",
    "title": "Run program.py with one input",
    "description": "Run the program with python3 and one input value.",
    "hint": "Run: `python3 ~/lab/code/program.py 0`",
    "checkType": "history_regex",
    "patternSource": "python3?\\s+(?!.*edit\\.py).*program\\.py"
   },
   {
    "id": "m3-fixtures-pass",
    "title": "Every fixture passes (check.sh)",
    "description": "Fix the program so check.sh writes ALL_FIXTURES_PASS to ~/lab/code/results.txt.",
    "hint": "Compare fixtures.txt with what the program prints, change one line with `python3 ~/lab/edit.py program.py`, then run `sh check.sh` in ~/lab/code.",
    "checkType": "file_contains",
    "filePath": "/home/learner/lab/code/results.txt",
    "expectedSubstring": "ALL_FIXTURES_PASS"
   }
  ],
  "files": [
   {
    "path": "README.txt",
    "content": "CODE-505 · Arcade Prize Patrol\n\nPrint Try again below 50 points, Sticker from 50 through 99, and Badge for 100\nor more.\n\nThis is a real Linux machine with Python 3 and no network.\n\nFILES\n  code/program.py     the starter program (it has a defect)\n  code/fixtures.txt   each input and the output it must produce\n  code/check.sh       runs every fixture and writes code/results.txt\n  edit.py             a small editor:  python3 ~/lab/edit.py program.py\n\nWHAT TO DO\n  1. cd ~/lab/code && cat program.py fixtures.txt\n  2. python3 program.py 0\n  3. python3 ~/lab/edit.py program.py     (change a line, then s to save)\n  4. sh check.sh    until it prints ALL_FIXTURES_PASS\n"
   },
   {
    "path": "code/program.py",
    "content": "import sys\n\n# CODE-505: Print Try again below 50 points, Sticker from 50 through 99, and Badge for 100 or more.\n# The input arrives as the first command-line argument.\npoints = int(sys.argv[1]) if len(sys.argv) > 1 else 0\n\nif points > 100:\n    print(\"Badge\")\nelif points > 50:\n    print(\"Sticker\")\nelse:\n    print(\"Try again\")\n"
   },
   {
    "path": "code/fixtures.txt",
    "content": "Input variable: points (first command-line argument)\npoints = 0  ->  expected: Try again\npoints = 49  ->  expected: Try again\npoints = 50  ->  expected: Sticker\npoints = 99  ->  expected: Sticker\npoints = 100  ->  expected: Badge\npoints = 140  ->  expected: Badge\n"
   },
   {
    "path": "code/check.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Runs program.py against every fixture and records the result in results.txt.\ncd \"$(dirname \"$0\")\" || exit 1\npass=0; total=0; : > results.txt\nwhile IFS='|' read -r input want; do\n  total=$((total + 1))\n  got=$(python3 program.py \"$input\" 2>&1 | tr '\\n' ';')\n  if [ \"$got\" = \"$want\" ]; then line=\"PASS points=$input\"; pass=$((pass + 1)); else line=\"FAIL points=$input -> got: $got expected: $want\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_FIXTURES'\n0|Try again;\n49|Try again;\n50|Sticker;\n99|Sticker;\n100|Badge;\n140|Badge;\nLAB_FIXTURES\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_FIXTURES_PASS\"; else line=\"$pass of $total fixtures pass\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
   },
   {
    "path": "edit.py",
    "mode": 493,
    "content": "#!/usr/bin/env python3\n\"\"\"edit.py: a small line editor for the lab files.\n\n    python3 ~/lab/edit.py FILE\n\nIt shows the file with line numbers. Type a line number to change that line,\na to add a line at the end, d NUMBER to delete a line, s to save and quit,\nor q to quit without saving.\"\"\"\nimport sys\n\ntry:\n    import readline\nexcept ImportError:  # the editor still works without line recall\n    readline = None\n\n\ndef ask(prompt, prefill=\"\"):\n    if readline and prefill:\n        readline.set_startup_hook(lambda: readline.insert_text(prefill))\n    try:\n        return input(prompt)\n    finally:\n        if readline:\n            readline.set_startup_hook(None)\n\n\ndef show(lines):\n    print()\n    for number, line in enumerate(lines, 1):\n        print(f\"{number:3} | {line}\")\n    print()\n\n\ndef main():\n    if len(sys.argv) != 2:\n        print(__doc__)\n        return 1\n    name = sys.argv[1]\n    try:\n        with open(name, encoding=\"utf-8\") as handle:\n            lines = handle.read().split(\"\\n\")\n        if lines and lines[-1] == \"\":\n            lines.pop()\n    except FileNotFoundError:\n        lines = []\n    changed = False\n    show(lines)\n    while True:\n        try:\n            command = input(\"line number, a = add, d N = delete, s = save, q = quit: \").strip()\n        except EOFError:\n            command = \"q\"\n        if command == \"q\":\n            if changed and input(\"Quit without saving? (y/n): \").strip().lower() != \"y\":\n                continue\n            return 0\n        if command == \"s\":\n            with open(name, \"w\", encoding=\"utf-8\") as handle:\n                handle.write(\"\\n\".join(lines) + \"\\n\")\n            print(f\"Saved {name}.\")\n            return 0\n        if command == \"a\":\n            lines.append(ask(\"new line: \"))\n            changed = True\n            show(lines)\n            continue\n        if command.startswith(\"d \") and command[2:].strip().isdigit():\n            number = int(command[2:])\n            if 1 <= number <= len(lines):\n                del lines[number - 1]\n                changed = True\n                show(lines)\n            else:\n                print(\"There is no line with that number.\")\n            continue\n        if command.isdigit() and 1 <= int(command) <= len(lines):\n            number = int(command)\n            old = lines[number - 1]\n            new = ask(f\"{number:3} | \", old)\n            if not readline and new and not new[0].isspace():\n                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation\n            lines[number - 1] = new\n            changed = True\n            show(lines)\n            continue\n        print(\"Type a line number from the list, a, d NUMBER, s or q.\")\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"
   }
  ]
 },
 "CODE-506": {
  "id": "CODE-506",
  "title": "Rover Energy Planner (real Python)",
  "track": "Coding",
  "grade": "Grades 11–12",
  "minutes": 30,
  "summary": "Build an energy total for a fictional rover trip.",
  "markdown": "# CODE-506 · Rover Energy Planner\n\n> **Lab Brief:** *Leg 1 costs 1 energy unit, leg 2 costs 2, and so on. Fix the missing last leg and add every cost. No real rover is connected.*\n\n## Your machine\n\nA real Linux machine with Python 3 and no network. The lab files are in `~/lab/code`.\n\n## Step-by-Step Instructions\n\n### Step 1: Read the program and its fixtures\n```sh\ncd ~/lab/code && cat program.py fixtures.txt\n```\n\n### Step 2: Run it with one input\n```sh\npython3 program.py 0\n```\n\n### Step 3: Fix the program and run every fixture\n```sh\npython3 ~/lab/edit.py program.py\nsh check.sh\n```\n",
  "milestones": [
   {
    "id": "m1-read-program",
    "title": "Read program.py",
    "description": "Open the program before changing it.",
    "hint": "Run: `cat ~/lab/code/program.py`",
    "checkType": "history_regex",
    "patternSource": "(?:cat|less|head|more)\\s+.*program\\.py|edit\\.py\\s+.*program\\.py"
   },
   {
    "id": "m2-run-program",
    "title": "Run program.py with one input",
    "description": "Run the program with python3 and one input value.",
    "hint": "Run: `python3 ~/lab/code/program.py 0`",
    "checkType": "history_regex",
    "patternSource": "python3?\\s+(?!.*edit\\.py).*program\\.py"
   },
   {
    "id": "m3-fixtures-pass",
    "title": "Every fixture passes (check.sh)",
    "description": "Fix the program so check.sh writes ALL_FIXTURES_PASS to ~/lab/code/results.txt.",
    "hint": "Compare fixtures.txt with what the program prints, change one line with `python3 ~/lab/edit.py program.py`, then run `sh check.sh` in ~/lab/code.",
    "checkType": "file_contains",
    "filePath": "/home/learner/lab/code/results.txt",
    "expectedSubstring": "ALL_FIXTURES_PASS"
   }
  ],
  "files": [
   {
    "path": "README.txt",
    "content": "CODE-506 · Rover Energy Planner\n\nPrint one numeric total equal to 1 + 2 + ... + steps. With zero steps, print\n0.\n\nThis is a real Linux machine with Python 3 and no network.\n\nFILES\n  code/program.py     the starter program (it has a defect)\n  code/fixtures.txt   each input and the output it must produce\n  code/check.sh       runs every fixture and writes code/results.txt\n  edit.py             a small editor:  python3 ~/lab/edit.py program.py\n\nWHAT TO DO\n  1. cd ~/lab/code && cat program.py fixtures.txt\n  2. python3 program.py 0\n  3. python3 ~/lab/edit.py program.py     (change a line, then s to save)\n  4. sh check.sh    until it prints ALL_FIXTURES_PASS\n"
   },
   {
    "path": "code/program.py",
    "content": "import sys\n\n# CODE-506: Print one numeric total equal to 1 + 2 + ... + steps. With zero steps, print 0.\n# The input arrives as the first command-line argument.\nsteps = int(sys.argv[1]) if len(sys.argv) > 1 else 0\n\nenergy = 0\nfor leg in range(steps):\n    energy = energy + leg\nprint(energy)\n"
   },
   {
    "path": "code/fixtures.txt",
    "content": "Input variable: steps (first command-line argument)\nsteps = 0  ->  expected: 0\nsteps = 1  ->  expected: 1\nsteps = 4  ->  expected: 10\nsteps = 6  ->  expected: 21\n"
   },
   {
    "path": "code/check.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Runs program.py against every fixture and records the result in results.txt.\ncd \"$(dirname \"$0\")\" || exit 1\npass=0; total=0; : > results.txt\nwhile IFS='|' read -r input want; do\n  total=$((total + 1))\n  got=$(python3 program.py \"$input\" 2>&1 | tr '\\n' ';')\n  if [ \"$got\" = \"$want\" ]; then line=\"PASS steps=$input\"; pass=$((pass + 1)); else line=\"FAIL steps=$input -> got: $got expected: $want\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_FIXTURES'\n0|0;\n1|1;\n4|10;\n6|21;\nLAB_FIXTURES\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_FIXTURES_PASS\"; else line=\"$pass of $total fixtures pass\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
   },
   {
    "path": "edit.py",
    "mode": 493,
    "content": "#!/usr/bin/env python3\n\"\"\"edit.py: a small line editor for the lab files.\n\n    python3 ~/lab/edit.py FILE\n\nIt shows the file with line numbers. Type a line number to change that line,\na to add a line at the end, d NUMBER to delete a line, s to save and quit,\nor q to quit without saving.\"\"\"\nimport sys\n\ntry:\n    import readline\nexcept ImportError:  # the editor still works without line recall\n    readline = None\n\n\ndef ask(prompt, prefill=\"\"):\n    if readline and prefill:\n        readline.set_startup_hook(lambda: readline.insert_text(prefill))\n    try:\n        return input(prompt)\n    finally:\n        if readline:\n            readline.set_startup_hook(None)\n\n\ndef show(lines):\n    print()\n    for number, line in enumerate(lines, 1):\n        print(f\"{number:3} | {line}\")\n    print()\n\n\ndef main():\n    if len(sys.argv) != 2:\n        print(__doc__)\n        return 1\n    name = sys.argv[1]\n    try:\n        with open(name, encoding=\"utf-8\") as handle:\n            lines = handle.read().split(\"\\n\")\n        if lines and lines[-1] == \"\":\n            lines.pop()\n    except FileNotFoundError:\n        lines = []\n    changed = False\n    show(lines)\n    while True:\n        try:\n            command = input(\"line number, a = add, d N = delete, s = save, q = quit: \").strip()\n        except EOFError:\n            command = \"q\"\n        if command == \"q\":\n            if changed and input(\"Quit without saving? (y/n): \").strip().lower() != \"y\":\n                continue\n            return 0\n        if command == \"s\":\n            with open(name, \"w\", encoding=\"utf-8\") as handle:\n                handle.write(\"\\n\".join(lines) + \"\\n\")\n            print(f\"Saved {name}.\")\n            return 0\n        if command == \"a\":\n            lines.append(ask(\"new line: \"))\n            changed = True\n            show(lines)\n            continue\n        if command.startswith(\"d \") and command[2:].strip().isdigit():\n            number = int(command[2:])\n            if 1 <= number <= len(lines):\n                del lines[number - 1]\n                changed = True\n                show(lines)\n            else:\n                print(\"There is no line with that number.\")\n            continue\n        if command.isdigit() and 1 <= int(command) <= len(lines):\n            number = int(command)\n            old = lines[number - 1]\n            new = ask(f\"{number:3} | \", old)\n            if not readline and new and not new[0].isspace():\n                new = old[: len(old) - len(old.lstrip())] + new  # keep the indentation\n            lines[number - 1] = new\n            changed = True\n            show(lines)\n            continue\n        print(\"Type a line number from the list, a, d NUMBER, s or q.\")\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"
   }
  ]
 }
};

/** Real-machine lab definitions keyed by lab id, with RegExp patterns restored. */
export function generatedLabs() {
  return Object.fromEntries(Object.entries(DATA).map(([id, lab]) => [id, {
    ...lab,
    milestones: lab.milestones.map(({ patternSource, ...item }) => (patternSource ? { ...item, pattern: new RegExp(patternSource, "i") } : item)),
    files: lab.files.map((file) => ({ ...file })),
  }]));
}
