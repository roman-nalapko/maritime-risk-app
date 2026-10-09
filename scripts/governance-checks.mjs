import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "SECURITY.md",
  "docs/governance/privacy-and-misuse-review.md",
  "docs/governance/incident-response.md"
];
await Promise.all(required.map((file) => access(path.join(root, file))));

const html = await readFile(path.join(root, "src/index.html"), "utf8");
const app = await readFile(path.join(root, "src/app.js"), "utf8");
const privacyReview = await readFile(path.join(root, "docs/governance/privacy-and-misuse-review.md"), "utf8");
const incidentResponse = await readFile(path.join(root, "docs/governance/incident-response.md"), "utf8");
const security = await readFile(path.join(root, "SECURITY.md"), "utf8");

assert.match(html, /вводьте лише власні дані й лише добровільно/i, "form needs voluntary-entry language");
assert.match(html, /не зберігаються та не надсилаються/i, "form needs a clear processing statement");
for (const prohibitedUse of ["найму", "звільнення", "розподілу змін", "дисциплінарних", "страхових", "медичних"]) {
  assert.ok(html.includes(prohibitedUse), `visible boundary must name prohibited use: ${prohibitedUse}`);
}
assert.doesNotMatch(app, /localStorage|sessionStorage|indexedDB|sendBeacon|XMLHttpRequest/, "runtime must not retain or transmit questionnaire data");
assert.deepEqual([...app.matchAll(/fetch\("([^"]+)"\)/g)].map((match) => match[1]).sort(), ["data/incidents.sample.json", "data/release-manifest.json"], "runtime fetches must remain limited to bundled public data");

for (const heading of ["Data-flow and retention assessment", "Allowed uses", "Prohibited uses", "Legal-review triggers"]) {
  assert.ok(privacyReview.includes(heading), `privacy review lacks ${heading}`);
}
assert.match(privacyReview, /Article 9/);
assert.match(privacyReview, /Article 22/);
assert.match(privacyReview, /Law of Ukraine on Personal Data Protection/);
assert.match(incidentResponse, /Critical incidents pause the pilot immediately/);
assert.match(incidentResponse, /monitored pilot-coordinator channel/);
assert.match(security, /private GitHub Security Advisory channel/);
assert.match(security, /Immediate danger/);

console.log("Privacy and governance checks passed.");
