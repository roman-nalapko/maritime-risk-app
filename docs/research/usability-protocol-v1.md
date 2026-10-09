# SeaRisk UA comprehension study protocol v1

## Status and purpose

This protocol is ready for institutional/privacy review and recruitment. It has not yet been run. The study tests whether maritime users understand the demonstration index, distinguish it from incident shares, identify dominant factors, and find safe actions and limitations.

The session evaluates the interface, not the participant. It does not validate model coefficients or measure a person's risk.

## Preconditions — all blocking

- replace every `[[FILL BEFORE RECRUITMENT]]` field in the participant information/consent template;
- name the study organiser/controller, moderator, monitored contact, backup, storage location, and exact deletion dates;
- approve recruitment and compensation with OMA Izmail or the responsible institution;
- decide whether institutional ethics review is required;
- deploy an access-restricted HTTPS preview and complete its offline/device smoke test;
- use only the fictional task profile below; never ask participants for their own health, smoking, alcohol, or incident information;
- brief observers on confidentiality and the prohibition on employment/academic consequences.

## Participants

Target 8–12 adults, with a minimum viable round of eight:

| Segment | Minimum | Notes |
| --- | ---: | --- |
| Maritime cadets/trainees | 3 | Recruit without instructor pressure; participation cannot affect grades |
| Active/recent seafarers | 3 | Include deck and engine; add officer/rating diversity where possible |
| Port/safety/instructor perspective | 2 | Must not evaluate a direct report or current student during the session |

Across the round, aim for at least two participants with lower digital confidence and invite access-needs disclosure only to arrange accommodations. Do not recruit minors or people unable to give informed participation under this protocol. Do not collect employer, vessel, diagnosis, or identifiable incident details in the screener.

## Method

- moderated one-to-one session, 35–45 minutes;
- Ukrainian by default; offer another language only with reviewed materials;
- participant's own device or a clean test device;
- think-aloud encouraged but optional;
- anonymous participant ID `P01`…`P12` in notes;
- no recording by default; audio/screen recording requires a separate positive choice;
- one moderator and at most one disclosed note-taker/observer;
- use the same build/model/dataset version for the whole round.

## Fictional task profile

Tell the participant: “These values describe a fictional worker, not you.”

- age 40;
- male; city;
- engine team;
- 2,400 work hours/year;
- 40% night shifts;
- PPE used consistently;
- no prior incident marker;
- no chronic, smoking, or alcohol markers.

## Session script

### Opening — 5 minutes

1. Confirm the participant read the information sheet.
2. Confirm voluntary participation and the selected note/recording choices.
3. Remind them they can pause, skip a question, or stop without consequence.
4. State that the prototype and terminology are being tested, not their knowledge.

### Tasks — 25 minutes

Do not explain the interface until the participant has answered each comprehension question.

1. **Privacy orientation:** Find what happens to entered values. Ask: “Does the project receive this questionnaire?” Correct understanding: values remain in the browser; ordinary host access logs are separate from questionnaire values.
2. **Calculate:** Enter the fictional profile and produce a result. Observe errors, hesitations, keyboard/mobile barriers, and whether the research disclaimer is noticed.
3. **Interpret the headline:** Ask: “In your own words, what does this number mean?” Correct: a provisional demonstration index. Incorrect: probability/chance of injury or death, forecast, certification, or “one in N”.
4. **Find the dominant component:** Ask which factor contributes most and how they know. Record answer and evidence used.
5. **Inspect evidence:** Ask whether the model is validated and whether uncertainty is quantified. Correct: provisional/unvalidated; confidence interval not available.
6. **Explore incidents:** Choose one role and vessel filter. Ask what an injury/fatal percentage means. Correct: share among the currently filtered recorded demo events, not an individual's annual risk.
7. **Forced distinction:** Show the individual result and one chart percentage together. Ask: “Can these two values be compared or substituted? Why?”
8. **Action and misuse:** Ask for one suggested action and one decision for which the tool must not be used.

### Closing — 5–10 minutes

- Single Ease Question after each main task: 1 “very difficult” to 7 “very easy”.
- Ask: “What was the most trustworthy part?” and “What could be dangerously misunderstood?”
- Ask what words they would change.
- Remind them how to withdraw research data before the stated anonymisation/deletion point.
- Do not provide personal safety, medical, or employment advice.

## Measures and decision rules

| Measure | Pilot signal | How recorded |
| --- | --- | --- |
| Index is not described as personal probability/forecast | ≥80% without moderator correction | pass/fail plus anonymous paraphrase |
| Incident percentage identified as filtered recorded-event share | ≥80% | pass/fail |
| Individual index and incident share not substituted | ≥80% | pass/fail plus reason |
| Dominant component correctly identified | ≥80% | component and evidence used |
| Provisional/unvalidated status found | ≥80% | pass/fail |
| At least one prohibited use named | ≥80% | use named |
| Task completion | Report by task, not one combined success score | completed / completed with help / not completed |
| Ease | Median SEQ by task | 1–7 |

These are product decision thresholds for a small formative round, not statistically generalisable estimates. A failure on the probability/share distinction or prohibited-use boundary is severity critical even if the percentage threshold is met overall.

## Analysis and publication

1. Two reviewers independently code comprehension answers where available; resolve disagreements explicitly.
2. Prioritise findings by harm/severity, frequency, and confidence.
3. Publish only aggregated counts and paraphrased, non-identifying examples.
4. Do not segment a result when a cell has fewer than three participants.
5. Link each product change to a finding ID and retest critical changes.
6. Preserve negative and contradictory evidence; do not claim validation from a small round.

Use `session-record-template.md` during sessions and `findings-template.md` for the report.

## Method references

- [GOV.UK: Getting informed consent for user research](https://www.gov.uk/service-manual/user-research/getting-users-consent-for-research)
- [GOV.UK: Managing user research data and participant privacy](https://www.gov.uk/service-manual/user-research/managing-user-research-data-participant-privacy)
- [W3C WAI: Involving users in evaluating web accessibility](https://www.w3.org/WAI/test-evaluate/involving-users/)
