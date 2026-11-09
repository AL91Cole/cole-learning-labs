# Private content starter

This folder is the starter the private repository
`AL91Cole/cole-learning-labs-private-labs` began from; keep it in sync when
the content rules change. It holds everything about paid real-machine labs
that should not be public: lab definitions with their checks and hints, the
seed files placed in each learner's container, and deployment settings. The
public repository keeps the site, the simulated labs and the generic terminal
controller, which loads this content at start-up.

```text
labs/index.js                 exports `labs`: paid lab definitions (see template)
sandbox/Dockerfile            adds private seed files on top of the public sandbox image
sandbox/seed/<lab>/…          files copied into /home/learner/lab/<folder> for each learner
deploy/.env.production        real settings; never commit a populated copy
deploy/docker-compose.override.yml   mounts labs/ and sets LAB_CONTENT_MODULE (host containers)
deploy/docker-compose.cloud.override.yml   same, with learner machines as Docker Cloud Sandboxes
deploy/cloudflared-config.yml  tunnel or proxy configuration with your hostnames
```

## Using it

1. Build the public sandbox image, then the private layer:
   `docker build -f sandbox/Dockerfile -t cole-learning-labs/sandbox:private .`
2. Point the controller at the content and image:
   `LAB_CONTENT_MODULE=/content/labs/index.js SANDBOX_IMAGE=cole-learning-labs/sandbox:private`
   (the compose override does this for you).
3. In the public site's `src/lab-environment-config.js`, list each paid lab id
   under `remote.labs` and set `environment: 'remote-terminal'`.
4. To run learner machines as Docker Cloud Sandboxes instead of containers on
   your own host, push the private image to a Docker Hub repository and set
   `SANDBOX_BACKEND=cloud`, `DOCKER_ID`, `DOCKER_PAT` (a token with "Allow Cloud
   Sandboxes access", stored only in the deployment's secrets) and
   `SANDBOX_IMAGE_REF=docker.io/<account>/<repository>:<tag>`. The controller then
   needs no Docker socket; remove the socket mount and `group_add` from the
   compose override.

## Rules the controller enforces

Each lab needs an id like `ABC-123`, bounded title/track/grade/summary/markdown
strings, 1 to 240 minutes and 1 to 20 milestones. A milestone is
`history_regex` (a RegExp over the learner's typed commands) or
`file_contains` / `file_contains_all` (a file under `/home/learner/`). A batch
with any invalid lab is refused as a whole, so a typo cannot half-load content.

Keep secrets out of this folder too: `TEACHER_ACCESS_KEY` and any tokens go in
your deployment's environment, not in files that are committed.
