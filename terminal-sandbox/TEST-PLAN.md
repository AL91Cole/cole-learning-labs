# Test PR #22 on this computer

This private review uses the PR code and real Linux Docker containers. It does not change `www.colelearninglabs.com`, Cloudflare DNS, or the public-site classroom gate. Use fictional classroom examples only.

The completed Windows Microsoft Edge review is recorded in [PR #22 Edge acceptance](../docs/PR22-EDGE-TESTING.md).

## Start and open

Keep Docker Desktop running with Linux containers. From the repository folder:

```sh
npm --prefix terminal-sandbox run review:start
npm --prefix terminal-sandbox run review:status
```

Open the local URL printed by the helper. The default is `http://127.0.0.1:8080`. HTTP/WS is permitted only on loopback for this local review. A hosted version will require HTTPS/WSS on port 443. This address works on the computer running the backend; on a phone, tablet or Chromebook, `127.0.0.1` refers to that other device.

The helper prints the path to a private teacher-key file, never its contents. Open that file locally and copy the key into **Teacher sign-in**. Do not put the key into a GitHub comment, screenshot, URL, student handout or chat.

## Try the split workbench

The guide is on the left and the terminal is on the right. Request & clues stays visible when switching between **Instructions** and **Your checks**. Resize the split with the divider, or focus it and use the arrow keys. At 720 CSS pixels and above, both panes stay side by side. Narrower screens stack them without hiding either. These choices affect the layout, not the Linux session or saved files.

Choose **Self-paced → Start server lab**. Wait for the connected Linux-container message. In Network & DNS diagnostics, inspect the configuration sheet and resolver, update the fictional resolver file, then record its verification stamp. Use **Check work** to confirm four checks. Terminal commands execute in the isolated Docker container; the browser does not emulate a Linux machine. The exercises use fictional local files, not a real school network.

## Try teacher controls

1. Open a separate teacher tab at the same local URL. Sign in with the private key, then choose **Create class**. Keep this teacher tab connected.
2. In a student tab, choose **Join a class**, enter the generated student code, then connect. The student receives an alias; no real student name/email/ID is needed.
3. In the teacher tab, confirm the alias and checks appear. A terminal image must be absent before the student opts in.
4. In the student tab, explicitly enable terminal-text sharing. The teacher should receive a low-quality terminal-only preview at most every five seconds. Turn sharing off and confirm the image disappears.
5. Pause class input from the teacher tab. Typed commands and **Run in terminal** buttons should stop. Resume and confirm they work again.
6. If testing the optional teacher command, send `printf 'Teacher check\\n'` and confirm it appears only in joined practice terminals. This does not prove independent student work.

The review supports at most **four simultaneous learner containers**. There is no durable gradebook or configured Google identity integration. The teacher connection owns its classes; closing it ends those class sessions. Ending a student session or changing labs starts with a fresh workspace. Five minutes of learner inactivity also ends a container.

## Try the browser simulation workbenches

The 29 investigations and five beginner labs use a separate static preview. From another terminal in the repository folder, run:

```sh
npm run dev
```

Open **http://127.0.0.1:4173/#labs**. These browser simulations do not connect to the Linux backend or change the live site.

- Open a ticket in each of the five pathways. The Request & clues pane should remain beside the workstation at Chromebook and tablet widths. Scroll each pane independently.
- Type an unfinished question and change a software field or code draft without applying it. Choose **Check & explain**, **Request & clues**, then **Workbench & test**. Confirm the drafts survive and the workstation returns to its top controls.
- Complete a repair with the normal virtual controls. Every PC investigation must stay in Full PC X-ray, including when selecting tools/cables or resuming an older saved view. Try a cable drag and its large-button alternative. Opening Check & explain must keep the request available and must not award completion by itself.
- Try finishing with a missing repair idea. The idea drawer should open and its required field should be visible.
- Open each beginner lab. Its equipment should remain visible during Explore, Practice and Check, including the coding editor in the coding pathway.
- Below 720 CSS pixels, both sections should remain on the same page in a readable stack. Check text zoom and keyboard focus. Test the actual managed device and school network separately before classroom rollout.

To end the static preview, press Ctrl+C in its terminal. This is independent of `review:stop` for the Linux service.

## End the review

End any learner sessions, then stop this review from the repository folder:

```sh
npm --prefix terminal-sandbox run review:stop
```

The helper stops its own controller and removes only containers labeled for that review instance. It does not prune Docker or stop unrelated projects. The private teacher key is reused on a normal restart; do not delete private runtime files while the review is running.

PR #22 remains unmerged for testing. A successful local test does not publish the remote terminal on the public website.
