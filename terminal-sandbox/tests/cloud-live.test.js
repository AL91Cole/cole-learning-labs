// Live smoke test against a real Docker account. Skipped unless RUN_CLOUD_TESTS=1.
// Run it on your own computer with the deployment's settings in the environment:
//
//   RUN_CLOUD_TESTS=1 SANDBOX_BACKEND=cloud DOCKER_ID=<id> DOCKER_PAT=<token> \
//   SANDBOX_IMAGE_REF=docker.io/<account>/cll-sandbox:cloud npm test --prefix terminal-sandbox
//
// It starts one micro sandbox (about a cent of compute), runs a command in the
// learner's shell, reads a lab file through the endpoint and deletes the sandbox.
import test from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { configuration, allowedLabFiles } from "../server.js";
import { spawnCloudSandbox, cloudConfigurationProblems } from "../cloud-sandboxes.js";

test(
  "a real Docker Cloud Sandbox starts, runs a shell with a PTY, serves lab files and is deleted",
  { skip: process.env.RUN_CLOUD_TESTS !== "1", timeout: 180000 },
  async () => {
    const cfg = { ...configuration(), sandboxBackend: "cloud" };
    assert.deepEqual(cloudConfigurationProblems(cfg.cloud), []);
    const started = Date.now();
    const sandbox = await spawnCloudSandbox({ id: "live-test", labId: "CODE-501" }, cfg, { allowedFiles: allowedLabFiles() });
    console.log(`sandbox ${sandbox.name} ready in ${Date.now() - started} ms`);
    let output = "";
    sandbox.onData((chunk) => {
      output += chunk;
    });
    try {
      assert.equal(sandbox.mode, "docker-cloud-sandbox");
      sandbox.resize(100, 30);
      sandbox.write("id -u; stty size; test -t 0 && echo REAL_PTY; ls ~/lab/code; echo COMPLETED_CHECK\r");
      for (let i = 0; i < 200 && !/COMPLETED_CHECK\s*$/m.test(output.replace(/echo COMPLETED_CHECK/, "")); i++) await delay(100);
      assert.match(output, /REAL_PTY/);
      assert.match(output, /100 rows|30 100/);
      assert.match(output, /program\.py/);
      const fixtures = await sandbox.readFile("/home/learner/lab/code/results.txt");
      assert.equal(fixtures, null, "results.txt does not exist before ./check runs");
      sandbox.write("cd ~/lab/code && ./check\r");
      for (let i = 0; i < 200; i++) {
        const text = await sandbox.readFile("/home/learner/lab/code/results.txt");
        if (text && /fixtures pass|ALL_FIXTURES_PASS/.test(text)) break;
        await delay(100);
      }
      assert.match((await sandbox.readFile("/home/learner/lab/code/results.txt")) || "", /fixtures pass|ALL_FIXTURES_PASS/);
    } finally {
      await sandbox.destroy();
    }
  },
);
