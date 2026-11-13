export const GUIDED_STEP_COUNT = 5;

const CUSTOM_SCENARIO_LIMITS = Object.freeze({
  title: 100,
  vessel: 80,
  event: 120,
  location: 100,
  summary: 500
});

const CUSTOM_SCENARIO_DEFAULTS = Object.freeze({
  title: "Власний морський сценарій",
  vessel: "Судно або об’єкт не вказано",
  event: "Морський інцидент",
  location: "Акваторію не вказано",
  summary: "Користувацький навчальний сценарій без офіційного ECFA-аналізу."
});

function normalizeScenarioField(value, fallback, maxLength) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, maxLength);
}

export function normalizeIncidentScenario(input = {}) {
  return Object.fromEntries(Object.keys(CUSTOM_SCENARIO_DEFAULTS).map((field) => [
    field,
    normalizeScenarioField(input[field], CUSTOM_SCENARIO_DEFAULTS[field], CUSTOM_SCENARIO_LIMITS[field])
  ]));
}

export function buildScenarioPriorityAlert({ riskResult, activeFactorLabels = [] }) {
  const priorityIndex = Number(riskResult?.priorityIndex ?? riskResult?.riskIndex ?? 0);
  const factorText = activeFactorLabels.length
    ? activeFactorLabels.join(", ")
    : "базові умови безпеки операції";
  return `Сценарій має високий навчальний пріоритет (R = ${priorityIndex}). Передусім перевірте активні фактори: ${factorText}.`;
}

export function resolveGuidedStep(hash = "") {
  const match = /^#step-([1-5])$/.exec(String(hash).trim());
  return match ? Number(match[1]) : 0;
}

export function guidedStepHash(step) {
  const numericStep = Number(step);
  if (!Number.isInteger(numericStep) || numericStep < 1 || numericStep > GUIDED_STEP_COUNT) return "";
  return `#step-${numericStep}`;
}

export function buildAssignmentConclusion({ riskResult, activeFactorLabels = [], mitigationActions = [], scenario = null }) {
  const factorScore = Number(riskResult?.factorScore ?? riskResult?.probabilityScore ?? 0);
  const consequenceScore = Number(riskResult?.consequenceScore ?? riskResult?.severityCode ?? 0);
  const priorityIndex = Number(riskResult?.priorityIndex ?? riskResult?.riskIndex ?? 0);
  const category = String(riskResult?.riskCategoryLabelUk ?? "Категорію не визначено");
  const factors = activeFactorLabels.length ? activeFactorLabels.join(", ") : "активні фактори не вибрані";
  const mitigations = mitigationActions.length
    ? mitigationActions.map((action) => String(action).replace(/[.;\s]+$/g, "")).join("; ")
    : "дотримуватися базового контрольного списку безпеки";
  const subject = scenario
    ? `Висновок щодо навчального сценарію «${normalizeIncidentScenario(scenario).title}».`
    : "Висновок щодо аварії лоцманського катера KP-965.";

  return [
    subject,
    `Активні фактори: ${factors}.`,
    `Навчальний бал факторів P = ${factorScore}, навчальний бал наслідків S = ${consequenceScore}, тому навчальний індекс пріоритету R = ${priorityIndex}.`,
    `Проєктна смуга пріоритету: ${category}.`,
    `Превентивні заходи: ${mitigations}.`,
    "P — навчальний бал факторів, S — навчальний бал наслідків, а R — відносний пріоритет заходів, не ймовірність аварії та не офіційний поріг IMO."
  ].join(" ");
}
