# Product specification

## Product statement

SeaRisk UA is a free public educational service that helps a maritime worker, cadet, or safety educator explore which factors contribute to a transparent demonstration index. It also presents incident statistics without confusing recorded-event shares with personal probabilities. The public hypothesis remains useful without claiming that the index is a validated probability.

## Primary user

A maritime worker, cadet, instructor, or occupational-safety specialist exploring an individual worker profile.

## Primary journey

1. Read the research-use disclaimer.
2. Complete a short questionnaire.
3. Calculate a demonstration index or a future explicitly named estimate locally in the browser.
4. Review the value, model status, limitations, and component breakdown.
5. Inspect the dominant factors and actionable recommendations.
6. Explore incident distributions through profession and event filters.
7. Print or save a local educational report with the profile, result, version, and limitations.

## MVP screens

The prototype is a single responsive dashboard:

- **Header:** product identity, methodology version, privacy statement.
- **Intro:** concise promise and research-use disclaimer.
- **Questionnaire:** demographics, work/exposure, and lifestyle.
- **Result:** annual estimate, category, component bars, primary drivers, recommendations.
- **Incident explorer:** filters, recorded-event totals, severity distribution, event-type bars.
- **Methodology:** definitions and limitations.

## Functional requirements

- All calculations run locally.
- Input values are validated and bounded.
- Results update only after explicit calculation.
- The app explains how each component was produced.
- Empty and invalid form states are understandable.
- Incident data is labelled as demonstration data until an approved dataset is imported.
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

The MVP stores nothing on a server. Form values exist in the page session only. A future history feature should default to encrypted/local storage and require a separate privacy review before any cloud synchronization.

## Not a decision system

The prototype must not determine fitness for duty, hiring, insurance, disciplinary action, medical treatment, or voyage authorization. Those uses require validated methodology, governance, auditability, and applicable legal review.
