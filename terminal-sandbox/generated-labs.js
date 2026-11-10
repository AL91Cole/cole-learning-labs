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
    "content": "NET-202 - The Share That Will Not Open\n\nLet an authorized teacher read Project Materials through the approved staff\nnetwork.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-202 - The Share That Will Not Open\n\nRequested by: Ms. Bell - Project studio\n\nTHE REQUEST\n\"I can browse the web on School-Guest, but Project Materials will not open. I\nonly need to read it. The correct folder and Read permission are already\nselected.\"\n\nGOAL\nLet an authorized teacher read Project Materials through the approved staff\nnetwork.\n\nWHAT IS KNOWN\n- Read network policy: School-Guest is isolated from internal file shares.\nStaff-Lab is the approved network for this fictional teacher workstation.\n- Read the access request: Project Materials and Read permission are already\nselected. Keep access limited to this handout.\n- Inspect the account: The fictional account is a verified teacher account. No\npassword or sign-in is needed in this simulation.\n\nQUESTIONS ALREADY ANSWERED\n- What must the teacher do? Open and read the project handout.\n- Should I share every folder? No. Only Project Materials is part of the\nrequest.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# FILE SHARE ACCESS - PROJECT MATERIALS\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Connected network\n#    school-guest   School-Guest\n#    staff-lab      Staff-Lab\nnetwork=school-guest\n\n# Folder to share\n#    all-folders         All folders\n#    project-materials   Project Materials\n#    no-folders          No folders\nfolder=project-materials\n\n# What the teacher can do\n#    full-control   Full control\n#    modify         Modify\n#    read           Read\n#    none           None\npermission=read\n"
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
    "content": "NET-203 - Startup Crash & Broken Update Service\n\nStart the fictional OS normally and restore its update service.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-203 - Startup Crash & Broken Update Service\n\nRequested by: IT operations - Studio-PC-04\n\nTHE REQUEST\n\"Studio-PC-04 enters recovery after update KB-LAB-17. My files are still\nthere. Please restore normal startup and get updates working again without\ndeleting the files.\"\n\nGOAL\nStart the fictional OS normally and restore its update service.\n\nWHAT IS KNOWN\n- Read the boot event: BOOT-31: startup failed after fictional update\nKB-LAB-17. Classroom documents are intact.\n- Inspect update history: A working snapshot from before KB-LAB-17 is\navailable. Rollback keeps the classroom files.\n- Inspect service status: The update service is Stopped and its startup type\nis Disabled.\n\nQUESTIONS ALREADY ANSWERED\n- May I erase the drive? No. Restore the previous working update state and\nkeep the files.\n- Is startup the only goal? No. Restore the update service so the workstation\ncan receive future updates.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# RECOVERY CONSOLE - STUDIO-PC-04\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Update recovery action\n#    keep       Keep current update\n#    rollback   Roll back KB-LAB-17\n#    reset      Reset and erase files\nrecovery=keep\n\n# School Update service\n#    stopped   Stopped\n#    running   Running\nstatus=stopped\n\n# How the service starts after a restart\n#    disabled    Disabled\n#    manual      Manual\n#    automatic   Automatic\nstartup=disabled\n"
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
    "content": "SEC-401 - Phishing Triage & Least-Privilege Audit\n\nFlag the message, mark its warning signs, and keep access limited.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "SEC-401 - Phishing Triage & Least-Privilege Audit\n\nRequested by: Digital safety team - Training inbox\n\nTHE REQUEST\nAn urgent message threatens to close your account. Compare its sender and link\nwith the school details. Inspect the text; do not open links or type a\npassword.\n\nGOAL\nFlag the message, mark its warning signs, and keep access limited.\n\nWHAT IS KNOWN\n- Inspect the sender: The urgent account message claims to be school IT, but\nits sender is verify@school-account-check.test rather than\nhelpdesk@school.test.\n- Inspect the link preview: The button would lead to\nhttps://school-account-check.test/verify. The real school link in this\nsimulation is https://portal.school.test.\n- Read the access task: A student helper needs read access to a shared\ntroubleshooting checklist, not administrator rights.\n\nQUESTIONS ALREADY ANSWERED\n- Should I reply with my password? Never provide credentials in response to\nthis message. Report it through the school's approved process.\n- Can I safely inspect the link here? Yes. The interface shows a text-only\ndestination and never navigates to it.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# TRAINING INBOX - 2 MESSAGES\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Your decision about the urgent message\n#    unreviewed   Not reviewed yet\n#    safe         Safe to provide credentials\n#    phishing     Phishing: report through the approved process\nverdict=unreviewed\n\n# Sender domain does not match school IT\n#    no    Not documented\n#    yes   Documented\nflag_sender=no\n\n# Destination differs from the school portal\n#    no    Not documented\n#    yes   Documented\nflag_destination=no\n\n# Threatening time limit creates pressure\n#    no    Not documented\n#    yes   Documented\nflag_urgency=no\n\n# Student helper access to checklist\n#    administrator   Administrator\n#    edit-all        Edit all folders\n#    read-only       Read only\n#    no-access       No access\npermission=administrator\n"
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
    "content": "SEC-403 - Authorized Web App: Patch & Retest\n\nKeep your record available and block access to the other learner's record.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "SEC-403 - Authorized Web App: Patch & Retest\n\nRequested by: Application security - Authorized sandbox\n\nTHE REQUEST\nConfirm the scope. Try both fictional records, add an ownership check, and\nretest. Your record should open; the other learner's record should stay\nprivate.\n\nGOAL\nKeep your record available and block access to the other learner's record.\n\nWHAT IS KNOWN\n- Read the authorization: Only the two built-in fictional records in this\nbrowser simulation are in scope. No real websites, accounts, scanners, or\ntools are involved.\n- Inspect the active session: The active user is learner-101. Record 101\nbelongs to learner-101; record 102 belongs to learner-102.\n- Read the remediation note: Check ownership on every server-side record\nrequest. A hidden URL or a disabled button alone does not enforce\nauthorization.\n\nQUESTIONS ALREADY ANSWERED\n- May I try this on the school portal? No. Permission for this fictional\nsimulation does not authorize testing any real system.\n- What should the retest show? The same user should receive 200 for record 101\nand 403 for record 102 after the ownership check is applied.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# LEARNDESK - FICTIONAL APP - SESSION learner-101\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Authorized training scope\n#    not-acknowledged   Not acknowledged\n#    acknowledged       I will stay within this fictional sandbox\nscope=not-acknowledged\n\n# Original defect (record 102 opens for learner-101)\n#    not-reproduced   Not reproduced yet\n#    reproduced       Reproduced before patching and recorded\ndefect=not-reproduced\n\n# Rule for who can read a record\n#    none     Original: signed-in users can access all records\n#    hidden   Hide other record links in the interface\n#    owner    Server: require record.owner_id == user.id\npatch=none\n"
   },
   {
    "path": "inspect.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Shows a device readout for the settings saved in settings.conf right now.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='scope defect patch'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\ncase \"$*\" in\n  1|'request record 101') n=1 ;;\n  2|'request record 102') n=2 ;;\n  3|'show access rule') n=3 ;;\n  *)\n    echo \"Device readouts for this lab (they follow settings.conf):\"\n    echo '  sh inspect.sh 1    request record 101'\n    echo '  sh inspect.sh 2    request record 102'\n    echo '  sh inspect.sh 3    show access rule'\n    exit 0 ;;\nesac\ntext=$(lookup \"R|$n|$state\")\nif [ -n \"$text\" ]; then printf '%b\\n' \"$text\"; else unknown; fi\n"
   },
   {
    "path": "test.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Checks settings.conf against every requirement of this lab and records the\n# result in results.txt. Run it again after each change.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='scope defect patch'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\n: > results.txt\nflags=$(lookup \"T|$state\")\nif [ -z \"$flags\" ]; then unknown | tee -a results.txt; exit 1; fi\ni=0; pass=0; total=0\nwhile IFS= read -r label; do\n  i=$((i + 1)); total=$((total + 1))\n  if [ \"$(echo \"$flags\" | cut -d' ' -f$i)\" = 1 ]; then line=\"PASS   $label\"; pass=$((pass + 1)); else line=\"CHECK  $label\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_REQUIREMENTS'\nTesting stayed within the acknowledged simulation scope\nOriginal access-control defect reproduced before patching\nRecord 101 -> 200 (own record)\nRecord 102 -> 403 (other learner's record)\nLAB_REQUIREMENTS\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_CHECKS_PASS\"; else line=\"$pass of $total requirements pass. Compare case/brief.txt and the readouts with settings.conf, change one setting, and test again.\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
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
    "content": "NET-204 - Wireless Survey & Classroom Coverage\n\nProvide stable coverage at the fictional reading desk without overlapping the\nneighboring access points.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-204 - Wireless Survey & Classroom Coverage\n\nRequested by: Library studio - Wireless support\n\nTHE REQUEST\n\"The tablets work near the doorway but lose Wi-Fi at the reading desk. The\naccess point is inside a metal cupboard. Its radio settings already match the\nchannel survey. Please improve coverage at the desk.\"\n\nGOAL\nProvide stable coverage at the fictional reading desk without overlapping the\nneighboring access points.\n\nWHAT IS KNOWN\n- Read the channel survey: Nearby 5 GHz access points occupy channels 36 and\n44. Channel 40 is clear when the channel width is 20 MHz.\n- Inspect the room map: The ceiling-center location reaches the desk at -58\ndBm. The cupboard and far hallway weaken the signal below the -67 dBm target.\n- Read the client specification: The fictional classroom tablets support 5\nGHz. Use the school-approved access point; no student device settings or\ncredentials are needed.\n\nQUESTIONS ALREADY ANSWERED\n- Where does the connection drop? At the reading desk, behind the metal\nstorage cupboard.\n- Which devices need coverage? The fictional classroom tablets support 5 GHz\nand remain inside this room.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# CLASSROOM ACCESS POINT - AP-04\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Access-point mounting position\n#    cupboard         Inside metal cupboard\n#    ceiling-center   Ceiling - center of room\n#    hallway          Far hallway\nplacement=cupboard\n\n# Radio band\n#    2.4   2.4 GHz\n#    5     5 GHz\nband=5\n\n# 5 GHz primary channel\n#    36   36\n#    40   40\n#    44   44\nchannel=40\n\n# Channel width\n#    80   80 MHz\n#    20   20 MHz\nwidth=20\n"
   },
   {
    "path": "inspect.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Shows a device readout for the settings saved in settings.conf right now.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='placement band channel width'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\ncase \"$*\" in\n  1|'survey channels') n=1 ;;\n  2|'measure desk') n=2 ;;\n  3|'show radio') n=3 ;;\n  *)\n    echo \"Device readouts for this lab (they follow settings.conf):\"\n    echo '  sh inspect.sh 1    survey channels'\n    echo '  sh inspect.sh 2    measure desk'\n    echo '  sh inspect.sh 3    show radio'\n    exit 0 ;;\nesac\ntext=$(lookup \"R|$n|$state\")\nif [ -n \"$text\" ]; then printf '%b\\n' \"$text\"; else unknown; fi\n"
   },
   {
    "path": "test.sh",
    "mode": 493,
    "content": "#!/bin/sh\n# Checks settings.conf against every requirement of this lab and records the\n# result in results.txt. Run it again after each change.\ncd \"$(dirname \"$0\")\" || exit 1\nFIELDS='placement band channel width'\nvalue() { grep -E \"^$1=\" settings.conf | tail -n 1 | cut -d= -f2- | tr -d ' \\t\\r'; }\nstate=\"\"\nfor name in $FIELDS; do state=\"$state$name=$(value \"$name\");\"; done\nkey() { printf '%s' \"$1\" | sha256sum | cut -c1-16; }\nlookup() { zcat .lab-data.gz | awk -F'\\t' -v k=\"$(key \"$1\")\" '$1 == k { print $2 }'; }\nunknown() {\n  echo \"settings.conf has a value that is not one of the allowed values.\"\n  echo \"Each setting lists its allowed values in the comment above it. Current values:\"\n  for name in $FIELDS; do echo \"  $name=$(value \"$name\")\"; done\n}\n: > results.txt\nflags=$(lookup \"T|$state\")\nif [ -z \"$flags\" ]; then unknown | tee -a results.txt; exit 1; fi\ni=0; pass=0; total=0\nwhile IFS= read -r label; do\n  i=$((i + 1)); total=$((total + 1))\n  if [ \"$(echo \"$flags\" | cut -d' ' -f$i)\" = 1 ]; then line=\"PASS   $label\"; pass=$((pass + 1)); else line=\"CHECK  $label\"; fi\n  echo \"$line\"; echo \"$line\" >> results.txt\ndone <<'LAB_REQUIREMENTS'\nReading desk meets the -67 dBm coverage target\nClient uses its supported 5 GHz radio\nPrimary channel avoids neighboring occupied channels\n20 MHz width avoids overlap with adjacent channels\nLAB_REQUIREMENTS\nif [ \"$pass\" = \"$total\" ]; then line=\"ALL_CHECKS_PASS\"; else line=\"$pass of $total requirements pass. Compare case/brief.txt and the readouts with settings.conf, change one setting, and test again.\"; fi\necho \"$line\"; echo \"$line\" >> results.txt\n"
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
    "content": "NET-205 - The Stalled Print Queue\n\nPrint the original fictional handout JOB-041 through the approved classroom\nprinter while preserving the job.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-205 - The Stalled Print Queue\n\nRequested by: Design classroom - PRINT-LAB-02\n\nTHE REQUEST\n\"I sent my handout to print, but nothing came out. Please keep my original\njob.\" Ask when printing last worked and what happened since.\n\nGOAL\nPrint the original fictional handout JOB-041 through the approved classroom\nprinter while preserving the job.\n\nWHAT IS KNOWN\n- Inspect JOB-041: JOB-041 is the original two-page classroom handout. The\nteacher asks you to preserve it rather than clear the entire queue.\n- Inspect the spooler: The Print Spooler service is stopped. The queue panel\nalso shows Paused.\n- Read the printer panel: CLASSROOM-PRINT at the approved simulated port is\nonline and has paper. OLD-PRINTER is offline.\n- Record the printing history: Printing last worked before virtual maintenance\nchanged the printer selection. The teacher clicked Print once; JOB-041 remains\nlisted and has not printed.\n\nQUESTIONS ALREADY ANSWERED\n- When did it last print? Printing worked before virtual maintenance changed\nthe printer selection. I clicked Print once afterward, and JOB-041 stayed in\nthe list without printing.\n- Should I delete all jobs? No. Keep JOB-041 and deliver that original\nhandout.\n- Is the classroom printer out of paper? No. The approved printer is online\nwith paper. Check the service, queue, and selected port.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# CLASSROOM PRINT STATION - JOB-041\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Print Spooler service\n#    stopped   Stopped\n#    running   Running\nspooler=stopped\n\n# Queue state\n#    paused   Paused\n#    resume   Resume printing\nqueue=paused\n\n# Printer destination\n#    old        OLD-PRINTER - offline\n#    approved   CLASSROOM-PRINT - online\nport=old\n\n# Original JOB-041\n#    hold      Keep held\n#    release   Preserve and release original job\n#    delete    Delete the queue\njob=hold\n"
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
    "content": "NET-206 - Backup Restore & File Integrity\n\nRecover the verified original project-notes.txt into a separate folder and\nverify its contents without overwriting the current file.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-206 - Backup Restore & File Integrity\n\nRequested by: Media studio - Recovery desk\n\nTHE REQUEST\n\"The file opens, but my project notes are missing. Use the backup list and\noriginal manifest to recover a complete copy into a separate folder. Keep the\ndamaged file.\"\n\nGOAL\nRecover the verified original project-notes.txt into a separate folder and\nverify its contents without overwriting the current file.\n\nWHAT IS KNOWN\n- Read the backup catalog: Snapshot B-17 contains the verified two-section\nproject notes. B-16 is incomplete; B-18 is an empty export.\n- Read the recovery policy: Restore to Recovery/Project, retaining the damaged\ncurrent copy for investigation. Do not overwrite or delete it.\n- Inspect the integrity manifest: B-17 manifest: title \"Network project\";\nsections \"Plan\" and \"Test results\"; integrity label LAB-VERIFIED-17. A\nsuccessful copy alone does not verify its contents.\n\nQUESTIONS ALREADY ANSWERED\n- Is the newest copy always the best? No. The newest export is empty. Compare\nthe catalog and integrity manifest.\n- Can I overwrite the damaged file? Keep it as evidence. Use a separate\nrecovery folder for the restored original.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# RECOVERY CONSOLE - PROJECT DOCUMENTS\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Backup snapshot\n#    B-16   B-16 - incomplete\n#    B-17   B-17 - verified original\n#    B-18   B-18 - empty export\nsnapshot=B-16\n\n# Restore destination\n#    overwrite   Overwrite current damaged file\n#    recovery    Separate Recovery/Project folder\ndestination=overwrite\n\n# Current damaged copy\n#    delete   Delete current copy\n#    keep     Preserve as evidence\npreserve=delete\n\n# After-copy verification\n#    skip      Trust copy completion only\n#    compare   Compare content and manifest\nintegrity=skip\n"
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
    "content": "SEC-404 - MFA Recovery Without Sharing Secrets\n\nVerify identity, revoke the lost factor, use a limited reset, and record it.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "SEC-404 - MFA Recovery Without Sharing Secrets\n\nRequested by: Help desk - Account recovery training\n\nTHE REQUEST\nA staff member lost their authenticator. The chat asks you to disable MFA and\nshare a secret. Build a safer recovery path without passwords or real codes.\n\nGOAL\nVerify identity, revoke the lost factor, use a limited reset, and record it.\n\nWHAT IS KNOWN\n- Read the recovery policy: Verify the fictional requester through the\napproved help-desk identity-check route. Urgency or a chat message alone is\nnot proof.\n- Inspect the lost device record: The lost authenticator is still active.\nRevoke that factor before supervised enrollment of a replacement.\n- Read reset requirements: Use a single-use supervised reset with an audit\nrecord. Keep MFA required; never request a password or share a recovery secret\nin chat.\n\nQUESTIONS ALREADY ANSWERED\n- Should I ask for their password? No. This recovery exercise does not collect\npasswords, secret codes, or personal information.\n- Can I turn MFA off permanently? No. Use the approved limited recovery route\nand enroll a replacement while keeping MFA required.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# ACCOUNT RECOVERY DESK - FICTIONAL ACCOUNT\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Identity check\n#    chat       Trust the urgent chat\n#    approved   Approved help-desk identity-check route\nidentity=chat\n\n# Lost factor\n#    keep     Keep the lost factor active\n#    revoke   Revoke the lost factor\nfactor=keep\n\n# Recovery method\n#    disable      Disable MFA permanently\n#    supervised   Single-use supervised reset; MFA stays required\nreset=disable\n\n# Recovery record\n#    none     No audit record\n#    record   Record the approved recovery action\naudit=none\n"
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
    "content": "SEC-405 - Ransomware Response & Evidence\n\nIsolate the affected PC, keep evidence, alert the team, and recover in a clean\nspace.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "SEC-405 - Ransomware Response & Evidence\n\nRequested by: Incident response team - LAB-ENDPOINT-07\n\nTHE REQUEST\nOne PC reports unexpected file encryption. Use the guide to contain it, keep\nevidence, and plan recovery. Decide what must happen first.\n\nGOAL\nIsolate the affected PC, keep evidence, alert the team, and recover in a clean\nspace.\n\nWHAT IS KNOWN\n- Read the incident alert: LAB-ENDPOINT-07 is the affected fictional\nworkstation. Other classroom endpoints are not showing this alert.\n- Read the response runbook: Isolate the affected endpoint from the network,\npreserve the supplied incident evidence, and notify the designated response\nteam. Do not wipe it or run unapproved cleanup.\n- Inspect recovery media: Offline backup R-08 is verified. Restore it into a\nseparate clean recovery environment only after containment; do not attach it\nto the affected endpoint.\n\nQUESTIONS ALREADY ANSWERED\n- Should I wipe the affected endpoint immediately? No. Preserve the incident\nevidence and follow the response runbook.\n- May I connect the backup to the infected machine? No. Keep the offline\nbackup separate and stage recovery in a clean environment after containment.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# INCIDENT RESPONSE DESK - LAB-ENDPOINT-07\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Affected endpoint connection\n#    connected   Leave endpoint connected\n#    isolate     Isolate only LAB-ENDPOINT-07\ncontainment=connected\n\n# Incident evidence\n#    wipe       Wipe affected endpoint\n#    preserve   Preserve supplied evidence\nevidence=wipe\n\n# Response escalation\n#    silent   Handle alone without notification\n#    team     Notify designated response team\nnotify=silent\n\n# Backup recovery route\n#    infected   Attach backup to affected endpoint\n#    clean      Verified R-08 into clean separate environment\nrecovery=infected\n"
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
    "content": "SEC-406 - Software Supply Chain Verification\n\nChoose the approved package, check its signature and digest, and pilot as a\nstandard user.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "SEC-406 - Software Supply Chain Verification\n\nRequested by: IT deployment team - Package review\n\nTHE REQUEST\nThree packages claim to be the same tool. Compare them with the trusted\nmanifest, check the selected copy, and plan a small pilot. Nothing is\ndownloaded or run.\n\nGOAL\nChoose the approved package, check its signature and digest, and pilot as a\nstandard user.\n\nWHAT IS KNOWN\n- Read the trusted publisher manifest: The approved publisher lists\nCLASSROOM-TOOL-4.2 from the approved catalog with signature \"Training\nPublisher valid\" and integrity label LAB-DIGEST-42.\n- Inspect package cards: Package A matches the publisher manifest. Package B\nis an unsigned mirror. Package C claims the right version but its digest\ndiffers.\n- Read deployment policy: Verify signature and digest, then stage a limited\npilot as a standard user. A familiar name or HTTPS alone does not prove\npackage authenticity.\n\nQUESTIONS ALREADY ANSWERED\n- Does an HTTPS download prove the package is safe? No. HTTPS protects\ntransport, while publisher and integrity checks address the supplied package.\nNo single check guarantees safety.\n- Should all users receive it with administrator rights first? No. Stage a\nlimited standard-user pilot after verification.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# PACKAGE VERIFICATION STATION - TOOL 4.2\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Candidate package\n#    B   B - unsigned mirror copy\n#    A   A - approved catalog copy\n#    C   C - mismatched digest\npackage=B\n\n# Publisher signature\n#    skip     Skip signature check\n#    verify   Verify publisher signature\nsignature=skip\n\n# Package integrity\n#    skip     Trust the filename\n#    verify   Compare digest with trusted manifest\ndigest=skip\n\n# Deployment plan\n#    all-admin   All devices with administrator rights\n#    pilot       Limited standard-user pilot\ndeployment=all-admin\n"
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
    "content": "NET-207 - Follow a Classroom Message\n\nLabel message jobs, stated transports, and address families.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-207 - Follow a Classroom Message\n\nRequested by: School network team - Local practice model\n\nTHE REQUEST\n\"Our file needs complete delivery. The voice activity needs timely sound.\nCompare the supplied packet cards and label their jobs.\"\n\nGOAL\nLabel message jobs, stated transports, and address families.\n\nWHAT IS KNOWN\n- Follow the message path: Application prepares content; transport handles\nend-to-end delivery; IP routes between networks; Ethernet carries frames on\nthe local link. Here these map to OSI 5-7, 4, 3, 1-2, and TCP/IP application,\ntransport, internet, link.\n- Read transport records: File: HTTPS over TCP, destination port 443, ordered\nreliable byte stream. Voice: RTP over UDP, destination port 5004, no transport\ndelivery/order guarantee. This voice example avoids transport retransmission\ndelays.\n- Read address cards: 192.0.2.24 is an IPv4 documentation example with dotted\ndecimal numbers. 2001:db8::24 is an IPv6 documentation example with\nhexadecimal groups and colons. Neither address is contacted.\n- Check application evidence: Compare the supplied application labels with the\ntransport records. A port alone does not prove application identity. These are\nfixed packet cards; no live capture tool is launched.\n\nQUESTIONS ALREADY ANSWERED\n- Why use different transports? The file needs complete ordered bytes. This\nvoice example uses UDP media and accepts possible loss to avoid transport\nretransmission delays.\n- Does port 443 alone prove the application? No. Compare the supplied\napplication label and transport evidence.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# CLASSROOM MESSAGE TRACE\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Message-path model\n#    swapped   IP routing -> transport; TCP -> link\n#    matched   Application -> OSI 5-7; transport -> 4; IP -> 3; Ethernet -> 1-2\nlayerMap=swapped\n\n# Complete-file transport\n#    udp   UDP\n#    tcp   TCP\nfileTransport=udp\n\n# This voice media transport\n#    tcp   TCP\n#    udp   UDP\ncallTransport=tcp\n\n# Address-family labels\n#    reversed   Dotted -> IPv6; colon -> IPv4\n#    matched    192.0.2.24 -> IPv4; 2001:db8::24 -> IPv6\naddressPair=reversed\n"
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
    "content": "H4sIAAAAAAACA+1aUW8bOQ5+jn+FfkDjiJREiTZQIGhyt8XtYo0md095kUSqNerOBPYkt/33i7GdbfKw+7CHQwtPHi2THM1n8ftIytYqSsFarGJpvp5dXl19uL65Me8uP1zd3HU3+VHFbHLRzW5hgHFu5zhHb87fmverR780aC0spKTF4o9Vuuu+WS72dm+MQ1PWw+6NkX4YVIxoXX/Jm/ld9zzC3preGMB0NP+kv+Wjrfm47R/ud+a/6+GTqf2m73Zzc9XXhy/aDXlY991xp6bvNl+XpuvNfa6fddiZnXbDfGa985wyWFdsJQ5nYMBYAzMbpQRNEhGcWvJnq8t3/7q+fULhH+uNLsxPt7erG9M/6tbcvlu9Mff9djDeu6XZ7VEatrnb7Rcf5H5+1/2nX1ddmA+3q4PTv6+enIK1/s+8bt+tzP22f1yL7ky/Fd2qmK1u1rls1JSvg+6WYyiTN32n5uND3uZuUN2ZTtfDJ90a0c36UbdfTddvDxHmZtVvh93RRXrT9cP+IWry/f1mXffg7eYzqNjAZS7Wqg8k/yMOQ/07OBy8vi8OUlh9YOAmUAkmi0OLFS1a51WitXJm9wljZ85qtQVAnUgouZz9cn1zc/nPa7O6vP3prvu17HT7qLJ4Hm9kh29vt6cKs+0fhnX3cfx0PW6208Fs1t3n+ZF6FubyZYBfb96bcB6XLyP55Rjs/K1xy29xzt8aOMe77oM23Wo3Yn/0NhfGmwvjzMVosRx/vov3qxd7vXj2gAuz7oZDzIvD7szPB555Ad0TzvOZA0UozFZdSgT416x6dSDEI3cuD8z2RLA/KpU6VGtzBBea9dXyd8mQH4AxfUyQkystkYBoObOjoBiYeQH2rrrMFSm6yUqKl+Apt8y1xpzpFHPBt1EqwLVgvRPxJ/iKAdEXxlCqBqRWX/n+Od+HHBoHjpJTYXE01XIh1OZb08ih2iJRTrubCBqqs9yi88LS2mtOPM8Jis6yWIou+AjO7nutURgpBUchhuCqI4Z2gmxJlYAkOteQU0Z3ti+ajZ1F8JEKoVNABQ7HamH8gnPxbKsnaQBPaNlZpFhrDFTERWkF/3+H7KXRH/77kzGujNbf4yDFknIQVU5U0TU6bVJJiRAFMnitTRpMta5ODJgie0nBimSaLA6asY0640JsVE+RLdlaBSLJDhi84KuOPqc/RhRO4nNSH5RhegLAXrAi+iQuAjo31eqaQwI3FgJoGzvBqVIi51aZICZobJOWfXU1VpZco4foqXCxGYo/7UqB1WtoWgEEEu8vMw61ZPboCb2vklUa0QlKRk6oNUdozYITK9MjxZyoet98isg5WDtBBIqVGiw5kEQ+PN1NwCwXSpUQgogvgdp3mbz+AHpRQITBMhK3CCFNFgeMvjkAolITge4PyqgXxSmUEFP1EJ2tPNURfUmlOQoAAbkST5BNC7vCCYvmQiW3eNqVQ6lJPCdIiT1jzfsp1Mic1RL5RJYD+xosHv8fYWcVE5VUMmSUSCW8tmjPT0/l5iojjvfhLNlPL39qhkYqUBgFaqUJItA8eIc2OfA+qr5myEt0FDzbIkWAKIUTbEkEYig+YAveksZ02hIiITq2WRFbSeLCVGtLSaC2RiBuLrZ84iMH4VRtwlYglEjE06N5YXWRckVQX1zlV5p/gY7WjM1DoIYuRnlF5zk6apsPmCIhpliKTrXdVAAI1sVsObbc4NiP25kiEaiO/YdQPQ52x75EUShrU23APgIcGxY7a1AlhEbRN9/E1qnKUPPcAFpI6qQkOsVbwsak4ErCUILEEk5baX8HKI2p6ZgxAAA="
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
    "content": "NET-208 - Connect the New Classroom\n\nConnect PCs through a central switch and the approved routed fiber path.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-208 - Connect the New Classroom\n\nRequested by: School network team - Local practice model\n\nTHE REQUEST\n\"Each PC needs its own classroom connection. Use the map and approved\nequipment list to choose the layout and building link.\"\n\nGOAL\nConnect PCs through a central switch and the approved routed fiber path.\n\nWHAT IS KNOWN\n- Read the room map: Each of 12 PCs has a separate run to one cabinet: a star\nlayout. Disconnecting a PC must not break a neighboring PC's connection.\n- Read device jobs: A switch forwards Ethernet frames within the classroom\nnetwork. The existing school router forwards IP packets between networks. A\npassive cable splitter cannot replace a switch.\n- Compare cable limits: Approved copper supports 20 m indoor desk runs, with a\n100 m channel limit. The building link is 180 m; approved fiber modules cover\nit and avoid an electrical connection between buildings.\n- Read the logical plan: PCs share their approved local subnet through the\nswitch. The existing school router is the boundary to other networks. Use\napproved copper to desks and fiber between buildings.\n\nQUESTIONS ALREADY ANSWERED\n- Can PCs forward for one another? The room requires independent desk runs to\na central switch.\n- Can copper cover every distance? This 180 m building route exceeds the\napproved copper channel's 100 m limit.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
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
    "content": "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"
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
    "content": "NET-209 - Split the Classroom Network\n\nFit 50 hosts in the allocation, use reserved addresses, and restore the\napproved routing boundary.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-209 - Split the Classroom Network\n\nRequested by: School network team - Local practice model\n\nTHE REQUEST\n\"Our block begins at 10.40.8.64 and needs 50 hosts. The school route stopped\nbeing learned after a routing-area change. Compare the address plan and\nneighbor record.\"\n\nGOAL\nFit 50 hosts in the allocation, use reserved addresses, and restore the\napproved routing boundary.\n\nWHAT IS KNOWN\n- Read the allocation: The room owns 10.40.8.64-10.40.8.127 inclusive and\nneeds 50 usable host addresses. The next classroom starts at .128; /24\nincludes other rooms.\n- Calculate the range: /26 has 64 total addresses and 62 usable hosts:\n.65-.126 in this block. .64 is network and .127 broadcast. /27 has only 30\nusable hosts. PC-07 is reserved 10.40.8.70; gateway is reserved 10.40.8.65.\n- Compare the OSPF record: The approved school link uses OSPF area 0 on both\nends. Other neighbor settings already match. The changed classroom side uses\narea 1; this fixed model has no adjacency and no learned school route. Restore\nthe approved area-0 boundary plan, then inspect both observations.\n- Read the boundary plan: Private IPv4 NAT belongs only at the approved\ninternet edge, not between rooms. The IPv6 documentation label\n2001:db8:40:8::70 keeps its approved route. NAT is not a firewall. This is a\nbounded neighbor/route model, not a full routing emulator.\n\nQUESTIONS ALREADY ANSWERED\n- Why not choose /27? It offers 30 usable hosts, fewer than the required 50.\n- Why is the school route missing? The supplied OSPF neighbor has an area\nmismatch. Other settings match; the approved link uses area 0 at both ends.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
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
    "content": "NET-210 - Keep Guest and Staff Traffic Apart\n\nChoose the guest VLAN, exact trunk allowlist, approved policy, and loop\nprotection.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-210 - Keep Guest and Staff Traffic Apart\n\nRequested by: School network team - Local practice model\n\nTHE REQUEST\n\"Guests need listed services but must not reach staff devices. Keep a safe\nbackup uplink. Compare the port list and policy records.\"\n\nGOAL\nChoose the guest VLAN, exact trunk allowlist, approved policy, and loop\nprotection.\n\nWHAT IS KNOWN\n- Read the port list: Staff uses VLAN 10. Guest endpoint port 8 is an access\nport: its untagged traffic must enter guest VLAN 30.\n- Read the trunk list: The approved trunk carries exactly VLANs 10 and 30.\nVLAN 10 alone cuts off guests; every VLAN exceeds this change.\n- Read routed policy: The gateway denies guests access to staff and allows\nlisted guest DNS, portal, internet services, and return traffic. A VLAN alone\ndoes not establish routed restrictions.\n- Inspect redundant links: Keep both approved uplinks cabled. In this topology\nspanning tree keeps one forwarding and one alternate/discarding. Both\nforwarding with spanning tree disabled creates a loop. Removing the spare\nloses resilience.\n\nQUESTIONS ALREADY ANSWERED\n- Does a VLAN block all routed access? No. The gateway also needs the approved\nguest-to-staff restriction.\n- Why is one link discarding? Spanning tree prevents a Layer 2 loop while\nkeeping a backup path in this topology.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# GUEST SWITCH - PORT 8\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Guest access VLAN\n#    10   10 - staff\n#    30   30 - guest\naccess=10\n\n# Trunk allowlist\n#    10      10 only\n#    10,30   10 and 30 only\n#    all     Every VLAN\ntrunk=10\n\n# Guest routed policy\n#    allow-staff   Allow guests to staff\n#    approved      Deny staff; allow listed guest services and return\n#    deny-all      Deny every destination\nguestPolicy=allow-staff\n\n# Redundant uplinks\n#    both-forward    Both forwarding; spanning tree off\n#    spanning-tree   Both cabled; spanning tree controls forwarding\n#    disconnect      Disconnect spare\nredundancy=both-forward\n"
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
    "content": "H4sIAAAAAAACA9VdW29kx3F+Xv6K8wOcdfWluqsiIIAMKY4RwTEsOcjDvtR1dyBmZj2clax/HxySO3Rk7WpF2+SZF4Iz03PYXZeur6q/agIMKlgUUtgp/UVZygJLuYLuWaoFFCVvfb7499/9z5dfLL/905dff7P84fNv/uPV/nOzuLlZGny2nI7v9t8uBX61vnh7uN7ZD8vn19eH75fX7+LmdLOcDsvNSTJfvtr/dn1n+Zd/u3tjkXVY+KI/LDdxHXYKv3/Cy+Wrg8n18vYY3+3i++Wwv/7h5RUMm8iVJ/RsafniD//1x2++fv/Yt4fjaaFF7qb23199/vulwGf3f+r+5cvlm/vpnmcTe3972O3XX05xvPnR+Pejbl83WERvYn9a8nj43+Xd2+vd/tuXV8CFg9FbazxHqS/+9Ievfvf7/1y+/ubzb758tf9avgv/1+U3h9ObJQ/H7+Xou/3rz5abt7Lf7/avl9MxYjlkvtr/aMzy/e705kfjfHcjer0+8PpweLvs9svpze5myd1fwpfT4e3h+vB6FRUPKiqdqTWoBB/WYfmADr+I/Q9LfBfHHxaPm9NuL6fdYf/y1f7LDwrsszuVv3/C7mbZH07L7nSz6OHd3uX4Ib0qjBQY1SWJNT4iQLtd/I+FZ4f96Xi4vvkr2b3af7Vb1/T/RL7qa6mLXJ/iuJdT/Np3N3b34cuPPl/2i72R/etYjofruFkkT3FcUnbX746xLqDCpBKdaFTg8eBKmtRcI6DNaO4/vbIvdjd22O/DTuvfPcbH5u7nseEvl9+Iffvu7fJuL9/J7nqd+8srMIlGrSOiD9L2AtapLHAFPtmAyDtS6w6bsNOE1rDnKNO51PKzLt0+5NJyff1Bn77/5stX+z/tj/HndUz47bs3i1zfHN7vROt8qokOHOoEBfBWk2XVZHqdgWZZulLbhPBKYYPq2EHb6E6bdvJSUZQnFRFWd3luTZfWYczRG6IVQngK1yy91UGECVWaVdhIACssrUTrgukhdTy7asS4ESA71wzU++0Uror6HINm0WCeDV/ArXfCVTHy4T2KMCGybMI7PVf01IKFi816cVGttsHVLJmsgle6DSSrGmpv0KrgpGzC2B5vLx8x4wdz+XkDrogDrCDX4UppG/GrOuLWUKGjDK39+eU0EURZAXRWLeNBo9ODKqeDjChUn3sHqCqBM703b4pm5x2gqhtNqJBu2cy24OjVvFbpk0ykzpL3Ui1X1Wfjli2Zeu9aHlYRDTsEziIOtczzPlZTBcMIikkh9bOCGpgmSbXqok3j8Rb+MQX92MR/Tk2tVELmPqsQDalbmZUBWGjDwiafgCk/shv8qn36hvDH+PO73fE8KZPjcRd+a1iHd6cl/nI6ys06vRyVmEyzWGZeXFxoNXNFyFA9aq+PqA98EHZ+fStSj/1undbxvUDvEOdNHL/bWdyr+27QT2PN1ueoAROwEs/RPw0Y/2z54h8Pitsgck4vnXoo0CNFeTuRz+48YLne3XrGj2W29+UYp3fH/d/WYd7L+/6b77/z67vxZ8f66RVoBcra6kinGPIUMLoZUs0xQL2KlrmFINAyZNSINWg5S36aJn/eI/4qqJvsV6s6htib5bWc4nv5YTm9OR7evX5z98SfVlGHRiyjo0TKUP2Uqcn19WZMrINzgUF99lma8ItyH197LX0UHTxjgPbtunmvrNYIHGlgL/lXK5C6goMWMdQm3n8AVx0LVnFUtIjB8PdAx4/FsAdI9onRa4WyJRiVBb1R3kKX26UMBxwdR+ujmcUWnLITTp09jTLXcHuPs8pVVzZtgT5rdqr4FLsWQmXSOfosBDDnxmAJgjlXB9Zh4CWeOwXAAlVJau/SI43PUBhLowCiOnur7bbY+v6D0edsQAwwgvqTKLU1VZnTe44unTaSeWJHp1IkEmItmZy9FG+zC5ldqjWyX7plPioU/OP3UxzAUxJJqnvjJ6ndIZVOrmw1RzDFI4utGxCeZYzo2aHLmmQ++I8zxlCN1MymdD44QDfPUSW0O0169tItRpNSyWBATMlyaYAGE4Brw/AWMAptIVQOqEOGtigtvTQ7W8WoKmq9GAGjEm0WZI2mrYSDYjMFeYSDPuFc+yQkyBwANXR8ylz/xoKf5txmdJcw8AbdC1r9hYnNx6kAf1deM3qO2oOEfVaa9BRRYOCsE4ZPjVLB5DLj55jcCzWTGN5BYWNQdKxJ9Kh1tho1Ey6uQjZImLRw4VY1sj7KvTdgJqIQZJY6MEHkXNgeCrMwYWGEWVq7h5ewfmCCIsI0GBQvLTKPnNg6kSJhL5WeG+mMnFEqIkritK6boWLNNlmKTPZBBDE2kvfMFgIdFYuy9HpXT1kT/tlroJJER+TB/BSxYo4OYuK1T8ZofsbTk+fKAohaJKogbyekTrEA99pIjMoYW8ZQMzwbghZsOlT4MRXXx201f5eICRJzWEnrWIteHi2AKnZLStF1r8S+YexKrbbERjZ9hKhfnqx7tcKl8ZgdDZ/9XJ766EScZeYcpJs4eaFhamvKN3U2hifZ2mmiGbsVRDFOeBTO+ScegBJ3JeawidBplieRCc9MEmKPmrXp9o6FSQjHxBFKhlBgO3GXnLwM69i6h9jYnD25dGx1oIeDh9/jKrgi1546FRO6tKEbyyQppOZoiaWVJsL3EKxcMZQ5hw+GSZQ+n8JBGBoX0I7TMAvrhQAWBiNNhOjRJqT/Utv8J2UgXOZc8d8spbuBbOjAnXu6hrVGMa0o35PI4Yqxt1oqlNlNNfRC6wI8WgeIkSrVrfHFwSoeqq0KD+4+GvC5fsE8i8TAiEZhuInKPMu0imhqGtJIN0MFYGGLiZoCc2obl2cGWiFWBuMEKS1iI0UM1lWwPAJrI+zzwTpVe3rM1Cla+uWlM2xQeNYyEbVjbIQvyobQyHg0KuT2wHPnKI5NKqOLAI6NgRsOQZTBQ5v2kvjs9HJOs/SOyj3G9PYkoCrNC7UZU9dYVM9FNs4Edu5MUDWqP7t0BNwlvUhW7IXxQoO/QM7u4dF6q7X0cyogxUvNrpVWgnrX82mB1DlrB9EZYi3aRrZZaWv/1+o5atjZNlzHkpXKjlSVJmIN2BDWlUZkk72QUNRu28v6pbFSuENvbYLlmdkgGB1GkdRSO0ZuJLGRoaMklqTpNej5t3WZNEURaVrNSrgFUCw0DGZUnqVNv0AoJGSeWNyhdSyDNyFUHdYsa/W0gr4d0rHoaoJIjIOajNwYEBOruPIUArhI9rYJXdot+ZkARpXuz9+jqUDVY0SpEzTa1rqytHAdrWkyc5R7WLNGCW1rf7hXCe6ZIOdsTPsYAAW1DDEYl7cF6ZAQIxhM1KPDuTiqk2PoLJMMlR8HN56hUKnklEzZ58qupMujDSkXrQ0puM3aSm4jPVYhszpW5D6m8QWKVTnUhZiEpWp7DGfvaXC+umEPaIpThkm5PFFHTZe29mzMTh4XuADrYtmmQ1j0vLyGTIM6KxOkrF3GF4iMraalDywZBb3nZlCoNbThXTSHwxhP0jRmfQUXdXTAKG3YudpiKCoe2ppoKuUWMKeh3TIitErtig98URut9ZkxHBMxxpNIblAfo6VgFAPfWrudzeLuc1KXoLAnYa3YHFhRm5bEzNvrc+4w7sr1EyQtRWlmy19aCns60p+RQCV1KW50d7R6h1mNc8xRmrb0lem53SBvAshFRSCtRpvPnpmZrH4ywIhHF2ybvkbMdPbasrWuTrPXBxt2TBUjXGOGTTkfulvUHj6h89COqhspPzuAqQLWMnTUmOfLYRwiow8ZOYgHPNwB47VZx6yFAZEKb2xH896HceUYpYVS3TJ32PsUDFrZI0oUm2hW927DZmttbaufKhfbYOpYeiUPmDgr2yYuY3P0rmXU5kajQd8MqPSpett7CUAU/iSg0nlC1lFklsDo9OwRyDkixKtVTui4iVu9XIV1ylqSETGg7WIi11T2SZ0ZAeJJ7j1wNwjSEFbjaA+nwFHmCK7K7NNj8GYcLVqsffuNMCDaBV67FUNGdIyS0VlpbqM6GLNOduFk1lbbkxhfUCsKY66NNBFbuXYu1qYAB4mMbNBkK7NKlm4eOtef4/IKWsG1igcyWMvR29a48SEDsw21XBnSDTaidwOZ1SYOLU5Tnj3Gh3XFfkvCsNZknu/ACtMiwNirMijnc/c4hdfJ4isNWKvxduqPCbC2YdPQSPe6nf/LkFA7AdcCLCwiG8mwczgxgxZKT0Tdbkko52i9Y0gOLtG2A5qSLMAs63pdsNm8ONC0LmA2F7JWEqhthOOVLAa80peUVmLEZV4jktazlBqF+kqR6NuIfGmK6ROLKFjXdg40abF2/zFOs+D2cNlihq3NiwwaVj7lcuUnc79IMMzZu5XamjzMOGshERhEvXHXi60VZVZOgfXAlcrYxlWumeK9UynQOVh0u5n//wFkqf2+w2kAAA=="
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
    "content": "NET-211 - Protect the Learning Portal\n\nUse individual sign-in, the supplied minimum rule, and a complete review\nrecord.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-211 - Protect the Learning Portal\n\nRequested by: School network team - Local practice model\n\nTHE REQUEST\n\"Classroom users need portal HTTPS. An alert appeared during a denied attempt.\nCheck authentication, exact rules, and both tests.\"\n\nGOAL\nUse individual sign-in, the supplied minimum rule, and a complete review\nrecord.\n\nWHAT IS KNOWN\n- Read sign-in policy: Use individual school-managed sign-in with the required\nsecond factor. Shared passwords and disabled sign-in do not meet policy. No\nreal password or code is collected.\n- Read the minimum rule: Allow 10.40.8.64/26 to portal 192.0.2.20 on TCP\ndestination 443 plus established return traffic. Deny other new inbound portal\nconnections. SSH and all-port access are unnecessary.\n- Compare alert and enforcement: IDS A-19 is from an alert-only sensor.\nFirewall F-19 records the denied TCP port 22 attempt. The IDS alert alone does\nnot prove blocking.\n- Read evidence requirements: Retain rule identifier, A-19, F-19, approved\nclassroom HTTPS allow result, and unapproved new-connection deny result.\nHistorical records do not replace a fresh saved-rule test.\n\nQUESTIONS ALREADY ANSWERED\n- Did the IDS block the attempt? This IDS only alerts. The firewall event is\nthe supplied evidence of blocking.\n- Do you need my password? No. Choose a method only. Accounts and tests are\nfictional.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# PORTAL ACCESS REVIEW\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Portal sign-in\n#    shared       Shared staff password\n#    individual   Individual managed sign-in plus required second factor\n#    none         No sign-in\nauthentication=shared\n\n# Inbound portal rule\n#    all               Allow every source and port\n#    https-classroom   Classroom /26 -> TCP 443 + established return; deny other new inbound\n#    deny-all          Deny all\nfirewall=all\n\n# Alert interpretation\n#    ids-blocked   IDS alert alone proves blocking\n#    separate      IDS alerts; firewall F-19 records block\ndetection=ids-blocked\n\n# Review evidence\n#    alert-only   IDS alert only\n#    full         Rule, A-19, F-19, and allow/deny test results\n#    clear        Clear supplied evidence\nevidence=alert-only\n"
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
    "content": "NET-212 - Find the Broken WAN Path\n\nRetain the working local path, restore Provider B, and compare every\ncheckpoint.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-212 - Find the Broken WAN Path\n\nRequested by: School network team - Local practice model\n\nTHE REQUEST\n\"The remote library failed after a route change. The local link, gateway, and\nprovider responded in the baseline. Compare observations before changing the\npath.\"\n\nGOAL\nRetain the working local path, restore Provider B, and compare every\ncheckpoint.\n\nWHAT IS KNOWN\n- Read local baseline: PC-LIB is 10.50.0.25/24 on a working approved cable.\nKeep that cable connected.\n- Read the gateway record: 10.50.0.1 is the approved responsive gateway.\nRetired 10.50.0.254 does not respond in this model.\n- Compare route records: The provider handoff responds. Provider A was\nretired; approved remote-library route uses Provider B. Restore that approved\nroute.\n- Read the diagnostic plan: Retain local-link, gateway, provider, and remote\nobservations. Remote-only failure does not locate a break. Tools read fixed\nlocal evidence; no real ping or trace runs.\n\nQUESTIONS ALREADY ANSWERED\n- Should I replace every cable? Baseline shows working local cable, gateway,\nand provider. Compare the route change first.\n- Does no response prove server failure? No. A path problem can prevent the\nresponse too.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# REMOTE LIBRARY WAN CHECKPOINTS\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Local cable\n#    up     Keep approved cable connected\n#    down   Disconnect working cable\nlink=up\n\n# PC-LIB gateway\n#    10.50.0.1     10.50.0.1 - approved\n#    10.50.0.254   10.50.0.254 - retired\ngateway=10.50.0.1\n\n# Remote route\n#    retired    Retired Provider A\n#    approved   Approved Provider B\nroute=retired\n\n# Checkpoint record\n#    remote-only   Remote response only\n#    all           Compare local, gateway, provider, and remote\ndiagnostic=remote-only\n"
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
    "content": "NET-213 - Clear Up a Choppy Classroom Call\n\nIdentify call roles, protect audio within capacity, schedule bulk traffic, and\nretain FCAPS evidence.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-213 - Clear Up a Choppy Classroom Call\n\nRequested by: School network team - Local practice model\n\nTHE REQUEST\n\"The call connects but speech breaks up during a transfer. The uplink stays 10\nMb/s. Compare the call record and queue measurements.\"\n\nGOAL\nIdentify call roles, protect audio within capacity, schedule bulk traffic, and\nretain FCAPS evidence.\n\nWHAT IS KNOWN\n- Read the call record: SIP sets up/ends this call; RTP carries audio. SIP\nsetup succeeded but media is choppy. Prioritizing only SIP does not protect\nRTP.\n- Read baseline: Offered load is 18 Mb/s on a 10 Mb/s uplink. Fixed baseline:\n7% media loss, 55 ms jitter. Case targets: below 1% loss, at most 20 ms\njitter.\n- Read approved queue plan: Use approved bounded RTP priority and move the\nbulk transfer outside the call. Offered load becomes 7 Mb/s; fixed new sample\nis 0.4% loss and 12 ms jitter. QoS changes treatment, not physical bandwidth.\n- Organize evidence: FCAPS: Fault-drop event; Configuration-queue/schedule\nbefore/after; Accounting-aggregate transfer totals; Performance-loss/jitter;\nSecurity-guest-deny test. Retain all five without names, recordings, or\npersonal call data.\n\nQUESTIONS ALREADY ANSWERED\n- Does setup prove clear audio? No. SIP signaling and RTP media have different\njobs.\n- Can priority fix every overloaded link? No. This case also moves bulk\ntraffic so offered load fits capacity.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
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
    "content": "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"
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
    "content": "NET-214 - Plan the New Learning Space\n\nChoose sufficient ports/uplink, approved wireless, segmentation, and\nreviewable change evidence.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-214 - Plan the New Learning Space\n\nRequested by: School network team - Local practice model\n\nTHE REQUEST\n\"Plan the new space from its demand sheet. Include inventory, baseline, tests,\nand rollback before review. This local planning board does not launch GNS3 or\nanother emulator.\"\n\nGOAL\nChoose sufficient ports/uplink, approved wireless, segmentation, and\nreviewable change evidence.\n\nWHAT IS KNOWN\n- Calculate ports and capacity: 24 PCs + 2 APs + 1 printer = 27 access\nconnections plus 1 uplink port. Peak: 24 x 20 + 80 = 560 Mb/s. Add 25%\nheadroom: 700 Mb/s. Approved 48-port/1 Gb/s option fits; 24 ports or a 100\nMb/s uplink does not.\n- Read wireless policy: Use the school-approved managed method with individual\nauthentication and protected radio traffic. Staff provision it and check\nclient compatibility. Open access or one shared guest password does not meet\nthis staff/student policy.\n- Read segmentation policy: Separate staff, students, and guests into VLANs\nwith approved gateway rules. Guests use listed services but cannot reach\nstaff. A flat network does not meet policy.\n- Read review checklist: Retain equipment/port inventory, previous settings,\nconnectivity/performance baseline, proposed settings, allowed/denied access\ntests, and rollback to saved previous settings if tests fail. School review\nprecedes installation.\n\nQUESTIONS ALREADY ANSWERED\n- Is capacity enough to finish? Also compare access boundaries, tests,\nbaseline, and rollback.\n- What if tests fail? Rollback to saved previous settings and report failed\ntests.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
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
    "content": "NET-215 - Read the Packet Evidence\n\nUse the correct interface and next hop, and distinguish link headers from the\nIP path.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-215 - Read the Packet Evidence\n\nRequested by: School network team - Local practice model\n\nTHE REQUEST\n\"Read the supplied Ethernet and IP packet table. Identify the local next hop\nand what changes at the router. No Wireshark or live capture is launched.\"\n\nGOAL\nUse the correct interface and next hop, and distinguish link headers from the\nIP path.\n\nWHAT IS KNOWN\n- Read supplied packet table: PC 192.0.2.24/24 has MAC 02:00:00:00:01:24.\nGateway 192.0.2.1 has LAN MAC 02:00:00:00:01:01. Remote 198.51.100.20 is\noff-subnet; the PC sends its local Ethernet frame to the gateway.\n- Read the neighbor record: Supplied ARP record maps gateway 192.0.2.1 to\n02:00:00:00:01:01 on classroom Ethernet. Remote server MAC is not a local ARP\nneighbor.\n- Compare routed-hop records: Before: Ethernet PC MAC -> gateway LAN MAC; IPv4\n192.0.2.24 -> 198.51.100.20; TTL 64. After: Ethernet router-out MAC -> next-hop\nMAC; same IP endpoints; TTL 63. No NAT on this hop.\n- Read evidence limits: Use the classroom Ethernet card; the Wi-Fi card is\nunrelated. Ethernet addresses identify this link; IPv4 endpoints identify this\nsupplied path. One captured frame does not prove application success.\n\nQUESTIONS ALREADY ANSWERED\n- Use remote server MAC in the first frame? No. The off-subnet packet uses the\ngateway as its local Ethernet next hop.\n- Does every header stay unchanged? Ethernet headers change and TTL decreases.\nIP endpoints stay the same on this supplied hop without NAT.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# SUPPLIED PACKET EVIDENCE\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Supplied capture interface\n#    wifi       Unrelated Wi-Fi card\n#    ethernet   Classroom Ethernet card\ninterface=wifi\n\n# PC frame destination\n#    remote    Remote server MAC\n#    gateway   Gateway LAN MAC 02:00:00:00:01:01\nnextHop=remote\n\n# Routed hop without NAT\n#    unchanged     All headers unchanged\n#    routed        New Ethernet; same IP endpoints; TTL 64 -> 63\n#    ip-replaced   Replace IP destination with next router\nheaders=unchanged\n\n# Evidence supports\n#    application   One frame proves application success\n#    link-path     Current-link delivery and supplied IP path\ninterpretation=application\n"
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
    "content": "NET-216 - Check the Network Manager Alert\n\nUse the approved target, protected SNMP method, rate threshold, and receiver.\n\nThis is a real Linux machine with no network. The device in this lab is\ndescribed by the file settings.conf; the readouts and the test follow it.\n\nFILES\n  case/brief.txt   the request, what is known, and answered questions\n  settings.conf    the settings you can change\n  inspect.sh       device readouts for the saved settings\n  test.sh          checks every requirement and writes results.txt\n  edit.py          a small editor:  python3 edit.py settings.conf\n\nWHAT TO DO\n  1. cat case/brief.txt\n  2. cat settings.conf        then    sh inspect.sh\n  3. Change a setting, inspect again, and run   sh test.sh\n  4. Repeat until test.sh prints ALL_CHECKS_PASS.\n"
   },
   {
    "path": "case/brief.txt",
    "content": "NET-216 - Check the Network Manager Alert\n\nRequested by: School network team - Local practice model\n\nTHE REQUEST\n\"Our manager has two interface samples. Calculate the error rate and prepare\nthe approved alert. The local model sends no SNMP requests or notifications.\"\n\nGOAL\nUse the approved target, protected SNMP method, rate threshold, and receiver.\n\nWHAT IS KNOWN\n- Read manager inventory: NMS-01 monitors SW-04 interface uplink-1. The\nunrelated printer queue is not the source of this interface alert.\n- Calculate the counter delta: 10:00:00 counter 100; 10:01:00 counter 160. No\nreboot/reset. Delta 60 errors / 60 seconds = 1 error/second. Approved\nthreshold: greater than 0.5 errors/second. A lifetime total is not a rate.\n- Read management policy: Use approved SNMPv3 authPriv, with authentication\nand privacy protection. Staff provision credentials outside this lab.\nUnprotected community-string polling does not meet policy.\n- Read the alert route: Compare the polled rate with threshold and route to\nthe approved local NMS-01 receiver record. Retain timestamp, device/interface,\nrate, threshold. A configured receiver alone does not prove delivery; inspect\nthe fixed acceptance test.\n\nQUESTIONS ALREADY ANSWERED\n- Is counter total the current rate? No. Compare two samples and elapsed time,\nchecking for resets. Here 60 new errors over 60 seconds is 1 error/second.\n- Do you need SNMP credentials? No. Choose the approved method only; school\nstaff provision credentials outside this simulation.\n\nEverything in this lab is fictional practice data on an isolated machine.\n"
   },
   {
    "path": "settings.conf",
    "content": "# NMS-01 - FIXED SNMP EVIDENCE\n#\n# Change the value after the = sign on a setting line. The comment above each\n# setting lists the values it accepts. Lines that start with # are notes.\n#\n#   python3 edit.py settings.conf     change a line\n#   sh inspect.sh                    list the device readouts\n#   sh test.sh                       check every requirement\n\n# Inventory target\n#    printer   Unrelated printer queue\n#    uplink    SW-04 - uplink-1\ntarget=printer\n\n# Management protection\n#    community   Unprotected community-string polling\n#    authpriv    Approved SNMPv3 authPriv; staff provision credentials\nprotection=community\n\n# Alert comparison\n#    total   Lifetime counter total > 100\n#    rate    Sample rate > 0.5 errors/second\nthreshold=total\n\n# Notification receiver\n#    none       No receiver/test record\n#    approved   Approved NMS-01 receiver and acceptance test\n#    external   Unapproved external receiver\nreceiver=none\n"
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
    "content": "CODE-502 - The Classroom Thermostat\n\nPrint Heating below 20, Comfortable from 20 through 25, and Cooling above 25.\n\nThis is a real Linux machine with Python 3 and no network.\n\nFILES\n  code/program.py     the starter program (it has a defect)\n  code/fixtures.txt   each input and the output it must produce\n  code/check.sh       runs every fixture and writes code/results.txt\n  edit.py             a small editor:  python3 ~/lab/edit.py program.py\n\nWHAT TO DO\n  1. cd ~/lab/code && cat program.py fixtures.txt\n  2. python3 program.py 18\n  3. python3 ~/lab/edit.py program.py     (change a line, then s to save)\n  4. sh check.sh    until it prints ALL_FIXTURES_PASS\n"
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
    "content": "CODE-503 - The Workstation Readiness Loop\n\nPrint Ready 1 through Ready N, one line per station, using the supplied\nstations count.\n\nThis is a real Linux machine with Python 3 and no network.\n\nFILES\n  code/program.py     the starter program (it has a defect)\n  code/fixtures.txt   each input and the output it must produce\n  code/check.sh       runs every fixture and writes code/results.txt\n  edit.py             a small editor:  python3 ~/lab/edit.py program.py\n\nWHAT TO DO\n  1. cd ~/lab/code && cat program.py fixtures.txt\n  2. python3 program.py 1\n  3. python3 ~/lab/edit.py program.py     (change a line, then s to save)\n  4. sh check.sh    until it prints ALL_FIXTURES_PASS\n"
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
    "content": "CODE-504 - Pixel Pet Snack Time\n\nPrint Energy followed by a space and snacks multiplied by 4. Zero snacks means\nEnergy 0.\n\nThis is a real Linux machine with Python 3 and no network.\n\nFILES\n  code/program.py     the starter program (it has a defect)\n  code/fixtures.txt   each input and the output it must produce\n  code/check.sh       runs every fixture and writes code/results.txt\n  edit.py             a small editor:  python3 ~/lab/edit.py program.py\n\nWHAT TO DO\n  1. cd ~/lab/code && cat program.py fixtures.txt\n  2. python3 program.py 0\n  3. python3 ~/lab/edit.py program.py     (change a line, then s to save)\n  4. sh check.sh    until it prints ALL_FIXTURES_PASS\n"
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
    "content": "CODE-505 - Arcade Prize Patrol\n\nPrint Try again below 50 points, Sticker from 50 through 99, and Badge for 100\nor more.\n\nThis is a real Linux machine with Python 3 and no network.\n\nFILES\n  code/program.py     the starter program (it has a defect)\n  code/fixtures.txt   each input and the output it must produce\n  code/check.sh       runs every fixture and writes code/results.txt\n  edit.py             a small editor:  python3 ~/lab/edit.py program.py\n\nWHAT TO DO\n  1. cd ~/lab/code && cat program.py fixtures.txt\n  2. python3 program.py 0\n  3. python3 ~/lab/edit.py program.py     (change a line, then s to save)\n  4. sh check.sh    until it prints ALL_FIXTURES_PASS\n"
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
    "content": "CODE-506 - Rover Energy Planner\n\nPrint one numeric total equal to 1 + 2 + ... + steps. With zero steps, print\n0.\n\nThis is a real Linux machine with Python 3 and no network.\n\nFILES\n  code/program.py     the starter program (it has a defect)\n  code/fixtures.txt   each input and the output it must produce\n  code/check.sh       runs every fixture and writes code/results.txt\n  edit.py             a small editor:  python3 ~/lab/edit.py program.py\n\nWHAT TO DO\n  1. cd ~/lab/code && cat program.py fixtures.txt\n  2. python3 program.py 0\n  3. python3 ~/lab/edit.py program.py     (change a line, then s to save)\n  4. sh check.sh    until it prints ALL_FIXTURES_PASS\n"
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
