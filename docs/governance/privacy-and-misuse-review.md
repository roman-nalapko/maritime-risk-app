# Privacy, governance, and misuse review

## Decision

The current static pilot is acceptable only as a voluntary, self-directed research and education tool. Questionnaire values stay in browser memory and must not be collected by the project. The prototype is not approved for employment, medical, insurance, disciplinary, navigational, or fitness-for-duty decisions.

This is an engineering governance assessment, not legal advice. The applicable law depends on the controller, participants, deployment location, and intended use. The legal-review triggers below must be evaluated by qualified counsel before scope expansion.

## Data-flow and retention assessment

| Stage | Data | Processing and recipient | Retention |
| --- | --- | --- | --- |
| Static page delivery | IP address, user agent, request time, requested assets may appear in ordinary host/CDN logs | Hosting provider under its configured logging policy | Must be reviewed and minimised before pilot; questionnaire values are not part of asset requests |
| Questionnaire | Age, sex, broad residence, chronic-condition marker, role, work hours, night work, PPE, prior incident, smoking, alcohol | JavaScript in the participant's browser only | Memory for the current page session; reset by reload/closing; no project storage |
| Calculation | Deterministic component and total demonstration indices | Browser only | Memory for the current page session |
| Incident explorer | Bundled synthetic aggregate dataset and filters | Browser only; cached by the service worker | Application cache until browser/site data is cleared or a newer cache replaces it |
| Research observation | Task completion notes or recordings, if a later study uses them | Separate research process, outside the application | Requires a protocol, explicit informed participation, minimisation, access control, retention schedule, and deletion process before collection |
| Incident report | Reporter contact and a sanitised description | Monitored pilot coordinator/security channel | Retain only as long as needed for investigation and legal obligations; never copy questionnaire or health data into GitHub |

The runtime contains no account, database, analytics, session replay, cookies, `localStorage`, `sessionStorage`, IndexedDB, advertising, or remote AI request. The service worker caches application code and synthetic data, not form values or calculated profiles.

## Allowed uses

- voluntary exploration by the person entering their own information;
- classroom demonstration with synthetic or fictional profiles;
- review of interface comprehension, terminology, arithmetic reproducibility, and methodology limitations;
- aggregate usability findings collected under a separate approved research protocol;
- software testing using synthetic data.

## Prohibited uses

- hiring, dismissal, promotion, discipline, worker ranking, shift/route/task allocation, or access to work;
- fitness-for-duty, medical diagnosis, treatment, health surveillance, or emergency advice;
- insurance eligibility, pricing, claims, credit, or benefits decisions;
- navigation, voyage authorisation, maintenance deferral, or substitution for a safety-management system;
- requesting or coercing a worker to reveal an individual result;
- storing screenshots or exports in personnel files;
- identifying a person from incident records or combining the output with employee-monitoring data;
- describing the result as a certified probability, forecast, or approved occupational threshold.

## Disclaimer and participation language

The application now states, before calculation, that entry is voluntary, only the user's own data should be used, values stay in the browser, and names/contact details must not be entered. The methodology section names the prohibited employment, shift-allocation, disciplinary, insurance, and medical uses.

This notice is transparency, not a legal-consent mechanism. A moderated usability study must obtain separate informed participation before observation or recording. The study information must identify the controller/researcher, purpose, collected fields, optional recording, recipients, retention/deletion date, withdrawal method, monitored contact, and any compensation. Refusal or withdrawal must have no employment or academic penalty.

## Legal-review triggers

Stop implementation and obtain jurisdiction-specific privacy, employment, research-ethics, medical-device/safety, and AI counsel as relevant before any of the following:

1. questionnaire values, results, identifiers, device identifiers, or telemetry leave the participant's browser;
2. accounts, saved history, cloud sync, organizational dashboards, analytics, session replay, or remote support are added;
3. an employer, crewing agency, academy, insurer, clinician, or authority receives individual results;
4. results influence hiring, work allocation, discipline, fitness, insurance, healthcare, or another significant decision;
5. chronic-condition or lifestyle answers are linked to an identifiable person, because health-related data may receive special protection;
6. AI is used to profile a worker, infer health/behaviour, recommend employment action, or modify the numeric result;
7. minors, dependent students/employees, vulnerable participants, biometric data, precise location, or confidential incident reports enter scope;
8. data crosses borders, is processed by a new vendor/subprocessor, or lacks a defined retention/deletion schedule;
9. the tool becomes public, commercial, medically marketed, integrated with operational maritime systems, or claimed to be validated;
10. a security or privacy incident indicates a risk to a person or a legal notification obligation.

For EU/EEA scope, GDPR Article 9 treats health data as a special category and Article 22 addresses solely automated decisions with legal or similarly significant effects. The EU AI Act also treats specified employment/worker-management uses as high-risk depending on intended purpose and applicable dates. Ukrainian pilots must separately review the Law of Ukraine on Personal Data Protection, including its special requirements for health-related processing. These references identify review triggers; they do not determine applicability for this project.

## Governance owner and exit criteria

Before issue #18 opens a restricted pilot, the pilot owner must record: controller/organiser identity, named coordinator and backup contact, host/log configuration, participant information sheet, retention dates for research notes, access list, incident drill owner, and jurisdiction/legal determination. Missing information blocks the pilot.

## Sources reviewed

- [EU General Data Protection Regulation, including Articles 9 and 22](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- [European Commission AI Act overview](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)
- [Law of Ukraine on Personal Data Protection](https://zakon.rada.gov.ua/laws/show/2297-17)
