# Accessibility, responsive, and PWA audit — 2026-10-09

## Scope and standard

Issue #5 was reviewed against the pilot acceptance criteria and selected WCAG 2.2 Level AA requirements. The audit covers keyboard and accessibility-tree behavior, representative text contrast, the 360/768/1280 px layouts, manifest install metadata, service-worker lifecycle, and offline navigation fallback.

The product remains a research prototype. Passing this engineering audit is not certification and does not replace testing with disabled participants or maritime-domain reviewers.

## Evidence

- `npm test` runs `scripts/audit-accessibility-pwa.mjs` on every CI build.
- The audit validates Ukrainian document language, landmarks, the skip link, switch semantics, a concise result live region, focus visibility, reduced-motion support, representative WCAG AA contrast pairs, install manifest fields, exact 192/512 PNG dimensions, cached-shell file existence, cache upgrade behavior, client claiming, and offline navigation fallback.
- Keyboard review confirmed the skip link is the first focus target, transfers focus to `main`, and then reaches every questionnaire control and the calculation button in visual order.
- The accessibility tree exposes one H1, structured H2–H4 headings, labelled number/select inputs, five named switches, expandable source/formula sections, chart labels, and a concise result announcement.
- Browser layout review at 360, 768, and 1280 CSS pixels found no rendered element outside the viewport. The result content fits at every target width.

## Findings and resolutions

| Severity | Finding | Resolution |
| --- | --- | --- |
| Critical | Localhost deliberately skipped service-worker registration, preventing realistic install/offline development checks. | Registration now runs on HTTPS, `localhost`, and `127.0.0.1`. |
| Critical | The manifest exposed only an SVG icon; Chromium-family install promotion expects explicit 192 px and 512 px icons. | Added verified 192×192 and 512×512 PNG icons plus `id` and `scope`. |
| High | Offline navigation with a query string could miss the exact cache key and fail. | Navigation matching ignores the query and falls back to cached `index.html` when the network fails. |
| High | The complete interactive result card was an `aria-live` region, risking a long and disruptive announcement. | Replaced it with an atomic, visually hidden status sentence containing only the updated index, category, and provisional status. |
| High | Keyboard focus styling was inconsistent, and small disclosure targets were hard to operate. | Added a high-contrast global `:focus-visible` outline and 44 px disclosure/toggle-detail targets. |
| Medium | Accent text on white and several small chart labels were below the 4.5:1 normal-text threshold. | Darkened the light-surface accent and lightened small labels on dark chart surfaces; regression ratios are tested. |
| Medium | A visually hidden live-region sentence contributed avoidable internal scroll width. | Allowed the hidden sentence to wrap within its one-pixel box. |

No unresolved critical finding remains.

## Remaining limitations

1. Browser install promotion differs by browser and operating system. The manifest contract and icons are verified, but the restricted HTTPS pilot should still be installed once on current Chrome/Edge, Android Chrome, and iOS Safari.
2. The offline lifecycle and cached navigation response are executed in an automated service-worker harness. A real network-disconnect test on the final HTTPS deployment remains part of issue #18.
3. The accessibility-tree and keyboard review does not replace a task-based session with VoiceOver, NVDA, or another screen reader. That belongs in the research pilot.
4. Contrast tests cover the intentional text/background pairs. A deployment screenshot audit is still recommended if the visual palette or gradients change materially.

## References

- [WCAG 2.2 contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum) and [WCAG 2.2 changes including focus visibility](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/): W3C Web Accessibility Initiative.
- [Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) and [offline/background operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation): MDN Progressive Web Apps documentation.
