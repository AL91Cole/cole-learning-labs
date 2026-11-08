// Private lab content for the terminal service. Export `labs` as an object keyed
// by lab id (or an array). The controller validates every entry at start-up and
// refuses the whole batch on the first problem. This file is a template: copy
// it to the private repository and replace the example lab.
export const labs = Object.freeze({
  "PAID-101": {
    id: "PAID-101",
    title: "Example paid lab: service account cleanup",
    track: "Ethical Cybersecurity",
    grade: "Grades 9–12",
    minutes: 30,
    summary:
      "Template for a paid real-machine lab: read a seeded account list, remove the stale service account, and record the change.",
    markdown: [
      "# PAID-101 · Service account cleanup",
      "",
      "> **Lab Brief:** *\"A stale service account is still listed on the lab server. Find it, remove it from the list, and record the change.\"*",
      "",
      "## Step-by-Step Instructions",
      "",
      "### Step 1: Read the account list",
      "```sh",
      "cat ~/lab/paid/accounts.txt",
      "```",
      "",
      "### Step 2: Remove the stale account",
      "```sh",
      "grep -v legacy-backup ~/lab/paid/accounts.txt > ~/lab/paid/accounts.clean && mv ~/lab/paid/accounts.clean ~/lab/paid/accounts.txt",
      "```",
      "",
      "### Step 3: Record the change",
      "```sh",
      "echo \"REMOVED legacy-backup\" >> ~/lab/paid/changes.log",
      "```",
    ].join("\n"),
    milestones: [
      {
        id: "m1-read-accounts",
        title: "Read ~/lab/paid/accounts.txt",
        description: "Inspect the account list before changing it.",
        hint: "Run: `cat ~/lab/paid/accounts.txt`",
        checkType: "history_regex",
        pattern: /(?:cat|less|grep)\s+.*accounts\.txt/i,
      },
      {
        id: "m2-remove-stale",
        title: "Remove legacy-backup from the account list",
        description: "The account list must no longer contain legacy-backup but must keep the others.",
        hint: "Use grep -v to write a copy without the line, then move it over the original.",
        checkType: "file_contains_all",
        filePath: "/home/learner/lab/paid/accounts.txt",
        expectedSubstrings: ["classroom-print", "library-kiosk"],
      },
      {
        id: "m3-log-change",
        title: "Record the removal in changes.log",
        description: "Append a line that names the removed account.",
        hint: "Run: `echo \"REMOVED legacy-backup\" >> ~/lab/paid/changes.log`",
        checkType: "file_contains",
        filePath: "/home/learner/lab/paid/changes.log",
        expectedSubstring: "REMOVED legacy-backup",
      },
    ],
  },
});
