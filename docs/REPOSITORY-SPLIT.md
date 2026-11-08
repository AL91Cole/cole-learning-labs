# Repository split: public site, private paid content

When labs become paid, two repositories share the work.

## Public repository (this one)

Stays public because it is a trust asset for schools: anyone can confirm the
site collects nothing and runs no trackers. It has no open-source licence, so
public does not mean free to reuse. It holds:

- the website and every simulated lab (hardware tickets, guided labs with the
  simulated desktop);
- the browser-side real-machine provider (`src/lab-remote.js`,
  `src/lab-remote-client.js`) and the environment configuration file;
- the generic terminal controller (`terminal-sandbox/`) with its **sample**
  labs (NET-201, SEC-402, INC-104, CODE-501) so CI keeps testing the real
  Docker path;
- `terminal-sandbox/private-content.example/`, the starter for the private
  repository.

## Private repository

Create an empty private repository (for example `cole-learning-labs-private`)
and copy `terminal-sandbox/private-content.example/` into its root. It holds:

- `labs/index.js`: paid lab definitions with their checks and hints;
- `sandbox/`: a Dockerfile layer and the seed files each learner receives;
- `deploy/`: environment file, compose override, tunnel or proxy configuration
  with real hostnames;
- nothing secret in files: keys go in the deployment environment.

The controller loads the private labs at start-up through
`LAB_CONTENT_MODULE` and refuses the whole batch if any lab is malformed, so a
mistake cannot half-load content. The public site lists the paid lab ids in
`src/lab-environment-config.js`; labs that are not listed keep the simulated
desktop.

## Moving existing pieces

- `terminal-sandbox/cloudflare/` holds deployment templates with a real
  hostname; move them to the private `deploy/` folder when you deploy and
  replace them here with the placeholder versions.
- The sample labs may stay public. If a sample later becomes paid content,
  delete it from `SELF_PACED_LABS` and add it to the private `labs/index.js`.

## Day-to-day

- Site change: public repository, pull request, Cloudflare Pages preview.
- New paid lab: private repository (definition plus seed files), redeploy the
  controller, then list the lab id in the public configuration.
- Keys and hostnames: private repository's deployment environment only.
