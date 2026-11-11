# Pilot incident and vulnerability response

## Reporting paths

1. **Immediate physical or navigational danger:** use existing vessel/employer emergency and competent-authority procedures. SeaRisk UA is not monitored for emergencies.
2. **Privacy, misuse, misleading output, or participant harm:** stop the affected pilot activity and report through the monitored pilot-coordinator channel named in the invitation.
3. **Software vulnerability:** use the private GitHub Security Advisory channel when available; otherwise use the same monitored coordinator channel with subject `Security — SeaRisk UA`.
4. **Repository tracking:** maintainers may create a sanitised private-repository issue. It must contain no names, health answers, questionnaire values, contact details, credentials, or identifiable incident narratives.

The restricted pilot must not begin until the invitation names a primary coordinator, backup, monitored contact method, and expected response time.

## Response workflow

1. Acknowledge within two working days; for immediate safety risk, direct the reporter to the applicable emergency channel without delay.
2. Triage as safety/misuse, privacy, security, data-quality, or model-claim incident; more than one category may apply.
3. Contain: pause the pilot or deployment, revoke access, disable the affected feature, or remove a misleading dataset as appropriate.
4. Preserve the minimum necessary evidence in a restricted location. Do not reproduce sensitive values in chat, Git commits, or GitHub issues.
5. Assess affected people, data categories, recipients, jurisdictions, time window, model/version, and whether notification deadlines or contractual duties apply.
6. Notify the controller, institution, data-protection/security lead, ethics body, affected participant, regulator, or authority when the approved response owner determines it is required.
7. Remediate, test, document the decision, and obtain explicit approval before resuming the affected pilot activity.
8. Record lessons learned and add a regression check without publishing exploit details or personal data.

## Severity

- **Critical:** imminent physical harm; exposed health/identity data; employer use for an individual decision; active credential compromise; public release of identifiable incident data.
- **High:** unexpected remote transmission; coercive collection; repeatable access-control bypass; materially misleading probability/safety claim.
- **Medium:** limited non-sensitive disclosure, accessibility barrier blocking participation, or incorrect synthetic aggregate without individual impact.
- **Low:** documentation defect or hardening opportunity with no current exposure.

Critical incidents pause the pilot immediately. High incidents pause the affected feature or cohort until reviewed.

## Required incident record

Record a generated incident ID, discovery time, reporter channel, category/severity, affected version, concise sanitised description, containment, owners, decisions, notification assessment, remediation, verification, and closure date. Keep the record separate from public product documentation and apply the approved retention schedule.
