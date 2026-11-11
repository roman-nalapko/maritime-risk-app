# Optional AI evaluation gate

Status: `PRE-BENCHMARK — NO-GO FOR RUNTIME AI`

This document defines how SeaRisk UA will test optional classification, retrieval, or grounded explanation without allowing AI to calculate or alter a risk value. The current decision is **no-go**: the deterministic browser product already meets the active milestone, while no domain-reviewed evaluation set or measured advantage exists.

## Questions

1. Does a model classify short maritime incident narratives more accurately than an auditable rule baseline?
2. Does it retrieve useful reviewed incidents without inventing a record or citation?
3. Can it explain retrieved facts without adding unsupported claims?
4. Is any gain large enough to justify privacy, download, latency, hosting, and governance costs?

AI is not evaluated for numeric scoring, personal risk prediction, medical inference, employment decisions, or worker profiling.

## Frozen evaluation set

`data/fixtures/ai-evaluation-set.v0.1.json` is a synthetic seed set. It deliberately includes Ukrainian and English wording, negation, multiple events, uncertain evidence, and an out-of-scope request. Candidate labels are authoring aids only. They are excluded from accuracy results until two human reviewers have approved them, including at least one maritime safety specialist.

Reviewers must independently record:

- one primary event label or `ambiguous`/`out_of_scope`;
- acceptable secondary labels;
- source facts that an explanation may repeat;
- claims that would be unsupported;
- disagreement and its resolution.

Do not use confidential reports, personal data, or copied investigation narratives in this set.

## Compared approaches

| Approach | Test configuration | Privacy/operations | Current evidence |
| --- | --- | --- | --- |
| Deterministic rules | Versioned terms, negation handling, abstain on ambiguity | Static, offline, inspectable, zero marginal request cost | Required baseline |
| Hosted model | Fixed provider/model snapshot, temperature 0, schema-constrained output, no questionnaire data | Needs backend/key, data-flow review, retention terms, usage cost | Not authorised or run |
| Browser model | Pinned ONNX model and revision, quantisation recorded, WASM fallback and optional WebGPU | First-use model download/cache; device and browser variance | Not bundled or run |

Transformers.js can run models in-browser on CPU/WASM and optionally WebGPU, and supports quantised weights. Its documentation also states that model assets are downloaded and cached by default. WebGPU remains unavailable in some widely used browsers and requires a secure context. These facts make browser inference feasible as a later experiment, not automatically appropriate for this small static pilot.

## Required measurements

Run every contender on the same approved cases and store raw outputs outside the public app bundle.

| Metric | Definition | Gate |
| --- | --- | --- |
| Primary-label macro F1 | Unweighted F1 across approved labels; abstention is a prediction | Model must exceed rules by at least 0.05 absolute and have no critical-label regression |
| Unsupported-claim rate | Outputs containing at least one claim absent from allowed facts / all explanations | 0% for user-visible explanations |
| Unsupported-citation rate | Returned IDs/links outside the supplied reviewed record set / all citations | 0% |
| Abstention quality | Ambiguous/out-of-scope cases correctly refused / approved ambiguous/out-of-scope cases | ≥95% |
| Latency | Cold-load and warm p50/p95 on the device matrix | warm p95 ≤2 s; cold load clearly disclosed |
| Download/bundle | Compressed JS/WASM plus model bytes, measured from network transfer | model not in core app shell; calculator remains usable without it |
| Hosted cost | Actual input/output tokens and provider price snapshot per 1,000 cases | Explicitly accepted before pilot use |
| Browser resource use | Peak memory where observable, failures, and successful device/browser coverage | No crash; WASM fallback or feature unavailable without harming calculator |

Record model ID, immutable revision, runtime version, prompt/rule version, device, browser, date, warm/cold state, bytes, timings, token counts, price source, outputs, and reviewer decisions. Accuracy without the frozen approved labels is reported as `not measured`, never estimated.

## Device and failure matrix

- 360 px Android Chrome, mid-range device;
- current desktop Chrome/Edge with and without WebGPU;
- current Safari on macOS and iOS;
- constrained connection and offline repeat visit;
- blocked model host, cache cleared, unavailable WebGPU, timeout, malformed output, and user cancellation.

The optional feature must be lazy-loaded behind an explicit action and feature flag. Failure, disabling, or removal must leave the questionnaire, deterministic calculator, evidence details, recommendations, and incident explorer unchanged.

## Security and governance controls

- Never send questionnaire values, individual estimates, identifiers, health/lifestyle answers, or raw confidential reports to a model.
- Treat source text and model output as untrusted data; neither can add coefficients, execute instructions, or approve labels.
- Allow citations only from IDs supplied to the retrieval call; render facts and generated explanation in separate blocks.
- Require human approval before a generated tag enters a reviewed dataset.
- Repeat the privacy/legal review before any hosted call or worker profiling experiment.

## Decision

**No-go for adding AI to the runtime or public build.** Continue with deterministic rules and source-linked retrieval experiments. Reconsider only after the evaluation labels are human-approved and a contender passes every quality, citation, performance, privacy, and cost gate. AI remains optional and cannot block M1–M3.

## References

- [Transformers.js overview](https://huggingface.co/docs/transformers.js/index)
- [Transformers.js pipeline loading and browser cache](https://huggingface.co/docs/transformers.js/en/pipelines)
- [Transformers.js WebGPU guide](https://huggingface.co/docs/transformers.js/guides/webgpu)
- [Transformers.js quantisation guide](https://huggingface.co/docs/transformers.js/en/guides/dtypes)
- [MDN: WebGPU `requestAdapter()` compatibility and secure-context requirement](https://developer.mozilla.org/en-US/docs/Web/API/GPU/requestAdapter)

