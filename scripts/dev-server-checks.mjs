import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

const port = 43000 + (process.pid % 1000);
const expectedUrl = `http://127.0.0.1:${port}`;
const packageMetadata = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.equal(packageMetadata.scripts.start, "node scripts/dev-server.mjs --open", "npm start must launch the preview and open the browser");

const child = spawn(process.execPath, ["scripts/dev-server.mjs", "--no-open"], {
  cwd: new URL("..", import.meta.url),
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"]
});

let output = "";
child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");
child.stdout.on("data", (chunk) => { output += chunk; });
child.stderr.on("data", (chunk) => { output += chunk; });

try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`npm start did not become ready:\n${output}`)), 5000);
    const onOutput = () => {
      if (output.includes(expectedUrl)) {
        clearTimeout(timeout);
        resolve();
      }
    };
    child.stdout.on("data", onOutput);
    child.stderr.on("data", onOutput);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`npm start exited with code ${code}:\n${output}`));
    });
  });

  const response = await fetch(`${expectedUrl}/`);
  const html = await response.text();
  assert.equal(response.status, 200, "npm start must serve the assignment root");
  assert.match(html, /Чому сталася аварія і як її запобігти/, "the local launch must serve the guided assignment");
} finally {
  if (child.exitCode === null) {
    child.kill("SIGTERM");
    await new Promise((resolve) => child.once("exit", resolve));
  }
}

console.log("Local launch check passed.");
