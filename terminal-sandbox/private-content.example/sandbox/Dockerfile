# Private seed layer on top of the public sandbox image. Build the public image
# first (terminal-sandbox/Dockerfile.sandbox), then this one from the private
# repository root:
#   docker build -f sandbox/Dockerfile -t cole-learning-labs/sandbox:private .
# Files under sandbox/seed/ are copied into every learner's ~/lab at start.
FROM cole-learning-labs/sandbox:alpine
USER 0
COPY --chown=1000:1000 sandbox/seed/ /opt/cll-seed/lab/
USER 1000:1000
