import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  protocol: "docs/research/usability-protocol-v1.md",
  consent: "docs/research/participant-information-and-consent-template.md",
  session: "docs/research/session-record-template.md",
  findings: "docs/research/findings-template.md"
};

await Promise.all(Object.values(files).map((file) => access(path.join(root, file))));

const protocol = await readFile(path.join(root, files.protocol), "utf8");
const consent = await readFile(path.join(root, files.consent), "utf8");
const session = await readFile(path.join(root, files.session), "utf8");
const findings = await readFile(path.join(root, files.findings), "utf8");

assert.match(protocol, /has not yet been run/i, "protocol must not imply that sessions have happened");
assert.match(protocol, /fictional worker/i, "sessions must use a fictional worker profile");
assert.match(protocol, /8–12 adults/i, "protocol must define a recruitment target");
for (const segment of ["Maritime cadets/trainees", "Active/recent seafarers", "Port/safety/instructor"]) {
  assert.ok(protocol.includes(segment), `protocol must cover participant segment: ${segment}`);
}
assert.match(protocol, /provisional demonstration index/i, "protocol must test safe interpretation of the index");
assert.match(protocol, /filtered recorded-event share/i, "protocol must test incident-share interpretation");
assert.match(protocol, /dominant component/i, "protocol must test identification of the dominant factor");
assert.match(protocol, /prohibited use/i, "protocol must test misuse boundaries");
assert.match(protocol, /≥80%/i, "protocol must define formative decision thresholds");
assert.match(protocol, /not statistically generalisable/i, "protocol must state the sample limitation");

assert.match(consent, /\[\[FILL BEFORE RECRUITMENT\]\]/, "unresolved operational fields must visibly block recruitment");
for (const field of ["organiser/controller", "withdrawal method", "storage location", "deletion date"]) {
  assert.match(consent, new RegExp(field, "i"), `consent template must define ${field}`);
}
assert.match(consent, /Participation is voluntary/i, "consent must state that participation is voluntary");
assert.match(consent, /can stop at any time/i, "consent must explain withdrawal");
assert.match(consent, /audio recording\. \*\*Optional/i, "audio recording must require an optional positive choice");
assert.match(consent, /screen recording\. \*\*Optional/i, "screen recording must require an optional positive choice");

assert.match(session, /Do not record a name, contact, employer, vessel, diagnosis/i, "session notes must prohibit direct and sensitive identifiers");
assert.match(session, /Participant ID: `P__`/, "session notes must use anonymous participant IDs");
assert.match(session, /Values treated as interchangeable/i, "session notes must capture the critical concept distinction");

assert.match(findings, /Status: `NOT YET CONDUCTED`/, "findings template must not imply completed research");
assert.match(findings, /Do not publish cells below three/i, "findings template must suppress small cells");
assert.match(findings, /not statistically generalisable/i, "findings template must retain the sample limitation");
assert.match(findings, /No names, contacts, employers, vessels, diagnoses/i, "publication checklist must protect participant anonymity");

console.log("Research protocol checks passed.");
