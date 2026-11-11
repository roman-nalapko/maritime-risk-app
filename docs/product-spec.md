# Product specification

## Product statement

SeaRisk UA is a free educational service that turns the KP-965 casualty into a compact, reproducible practical assignment. It connects a digitized case, five contributing-factor controls, a transparent `R = P × S` training index, preventive measures, an ECFA diagram, and cited source material. The extended research tools remain available without becoming the default journey.

## Primary user

A cadet or instructor reviewing a worked maritime casualty and the logic behind preventive controls.

## Primary journey

1. Read the KP-965 casualty facts in plain language.
2. Review or change exactly five contributing factors and consequence severity.
3. Observe the raw factor sum, the capped `P`, and the deterministic `R = P × S` result.
4. Read preventive measures together with the factor or threshold that triggered each rule.
5. Copy or print a deterministic conclusion and optionally open ECFA, sources, JSON, or Python evidence.
6. Open `?view=tools` only when the questionnaire, MAIB aggregates, or research utilities are needed.

## MVP screens

The prototype is a responsive single-page application with two URL modes:

- **Assignment (default):** one entry action and five hash-addressable steps for facts, causes, calculation, prevention, and conclusion/evidence.
- **Tools (`?view=tools`):** questionnaire, prototype result, incident explorer, and the existing research utilities.
- **Methodology/footer:** definitions, application/model versions, privacy, and limitations.

## Functional requirements

- All calculations run locally.
- No account, registration, or personal data is required.
- The default route is useful without completing a personal questionnaire.
- The assignment exposes exactly five factor switches and labels its numeric weights as training assumptions.
- The UI shows the raw factor sum before the `P = 5` ceiling and explains why different inputs can retain the same capped score.
- Each generated mitigation names its real factor, threshold, or fallback trigger.
- The conclusion is deterministic for the current controls and remains available through copy fallback and print/PDF.
- Python export reproduces the fixed KP-965 baseline rather than silently exporting transient UI state.
- Input values are validated and bounded.
- Results update only after explicit calculation.
- The app explains how each component was produced.
- Empty and invalid form states are understandable.
- Incident data is labelled with its analysis unit, source, period, version, suppression rule, and active filters.
- Data-source and model-version labels are visible.
- A prototype index is never described as a probability of injury or death.
- Fatal, non-fatal, serious-injury, incident-share, and conditional-severity outputs remain separate.
- The UI can be installed as a PWA where supported.
- Users can start with clearly fictional profiles instead of personal information.
- A printable report is created entirely in the browser and includes the active inputs and disclaimer.

## Public hypothesis completion criteria

- the full questionnaire-to-report journey works without an account, backend, paid API, or external AI;
- at least three fictional maritime profiles demonstrate distinct roles and exposure patterns;
- every result displays its inputs, component contributions, model/registry status, assumptions, and limitations;
- incident shares remain visibly distinct from the individual demonstration index;
- print/PDF, offline PWA, keyboard use, and mobile layouts pass automated and manual engineering checks;
- deployment documentation supports a free static host.

External usability studies, domain review, and statistical validation are valuable future improvements but do not block completion of the public educational hypothesis. Without them, the product must continue to describe the output as an experimental index rather than an actual injury or fatality probability.

## Privacy

The application sends no questionnaire or assignment values to a server. Form values exist in the page session only; the bundled source links are ordinary user-initiated navigation. A future history feature requires a separate privacy review before any persistence or cloud synchronization.

## Not a decision system

The prototype must not determine fitness for duty, hiring, insurance, disciplinary action, medical treatment, or voyage authorization. Those uses require validated methodology, governance, auditability, and applicable legal review.
