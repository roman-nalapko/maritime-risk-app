# Product specification

## Product statement

SeaRisk UA helps a maritime worker or safety educator explore which personal and occupational factors contribute to an annual risk estimate. It also presents incident statistics without confusing recorded-event shares with personal probabilities.

## Primary user

A maritime worker, cadet, instructor, or occupational-safety specialist exploring an individual worker profile.

## Primary journey

1. Read the research-use disclaimer.
2. Complete a short questionnaire.
3. Calculate an estimate locally in the browser.
4. Review the total, category, uncertainty/status label, and component breakdown.
5. Inspect the dominant factors and actionable recommendations.
6. Explore incident distributions through profession and event filters.

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
- The UI can be installed as a PWA where supported.

## Success criteria for the hypothesis

- A user can complete the assessment in under three minutes.
- A user can correctly identify the largest risk component without instruction.
- A user can distinguish “annual individual estimate” from “share among recorded incidents.”
- A domain reviewer can reproduce each calculation from the displayed inputs and model documentation.

## Privacy

The MVP stores nothing on a server. Form values exist in the page session only. A future history feature should default to encrypted/local storage and require a separate privacy review before any cloud synchronization.

## Not a decision system

The prototype must not determine fitness for duty, hiring, insurance, disciplinary action, medical treatment, or voyage authorization. Those uses require validated methodology, governance, auditability, and applicable legal review.

