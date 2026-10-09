import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const plan = await readFile(path.join(root, "docs/research/optional-ai-evaluation-plan.md"), "utf8");
const evaluation = JSON.parse(await readFile(path.join(root, "data/fixtures/ai-evaluation-set.v0.1.json"), "utf8"));
const model = await readFile(path.join(root, "src/model.js"), "utf8");
const app = await readFile(path.join(root, "src/app.js"), "utf8");
const serviceWorker = await readFile(path.join(root, "src/sw.js"), "utf8");

assert.equal(evaluation.status, "pending_human_review");
assert.equal(evaluation.eligibleForAccuracyClaims, false, "unreviewed labels must not support accuracy claims");
assert.ok(evaluation.review.requiredReviewers >= 2);
assert.ok(evaluation.review.requiredMaritimeSafetySpecialists >= 1);
assert.deepEqual(evaluation.review.approvedBy, []);
assert.ok(evaluation.cases.length >= 12, "the seed set must cover more than trivial examples");
assert.equal(new Set(evaluation.cases.map(({ id }) => id)).size, evaluation.cases.length, "case IDs must be unique");
assert.ok(evaluation.cases.every(({ candidatePrimaryLabel }) => evaluation.labels.includes(candidatePrimaryLabel)), "candidate labels must belong to the frozen vocabulary");
assert.ok(evaluation.cases.every(({ allowedFacts, reviewStatus }) => allowedFacts.length > 0 && reviewStatus === "pending_human_review"));
assert.ok(new Set(evaluation.cases.map(({ language }) => language)).size >= 2, "the set must cover Ukrainian and English wording");
assert.ok(evaluation.cases.some(({ candidatePrimaryLabel }) => candidatePrimaryLabel === "ambiguous"));
assert.ok(evaluation.cases.some(({ candidatePrimaryLabel }) => candidatePrimaryLabel === "out_of_scope"));

for (const required of ["macro F1", "Unsupported-claim rate", "Unsupported-citation rate", "Latency", "Download/bundle", "Hosted cost", "No-go for adding AI"] ) {
  assert.ok(plan.includes(required), `AI evaluation plan lacks ${required}`);
}
assert.match(plan, /not measured.*never estimated/i, "unreviewed experiments must not produce invented metrics");
assert.match(plan, /must be lazy-loaded/i, "optional AI must not block the core app");
assert.match(plan, /Never send questionnaire values/i, "AI plan must preserve the questionnaire trust boundary");

for (const runtime of [model, app, serviceWorker]) {
  assert.doesNotMatch(runtime, /transformers|openai|anthropic|webgpu|onnxruntime/i, "runtime must remain AI-free until the gate passes");
}

console.log("Optional AI evaluation gate checks passed.");

