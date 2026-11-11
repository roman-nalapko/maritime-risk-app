export const GUIDED_STEP_COUNT = 5;

export function resolveGuidedStep(hash = "") {
  const match = /^#step-([1-5])$/.exec(String(hash).trim());
  return match ? Number(match[1]) : 0;
}

export function guidedStepHash(step) {
  const numericStep = Number(step);
  if (!Number.isInteger(numericStep) || numericStep < 1 || numericStep > GUIDED_STEP_COUNT) return "";
  return `#step-${numericStep}`;
}

export function buildAssignmentConclusion({ riskResult, activeFactorLabels = [], mitigationActions = [] }) {
  const probabilityScore = Number(riskResult?.probabilityScore ?? 0);
  const severityCode = Number(riskResult?.severityCode ?? 0);
  const riskIndex = Number(riskResult?.riskIndex ?? 0);
  const category = String(riskResult?.riskCategoryLabelUk ?? "Категорію не визначено");
  const factors = activeFactorLabels.length ? activeFactorLabels.join(", ") : "активні фактори не вибрані";
  const mitigations = mitigationActions.length
    ? mitigationActions.map((action) => String(action).replace(/[.;\s]+$/g, "")).join("; ")
    : "дотримуватися базового контрольного списку безпеки";

  return [
    "Висновок щодо аварії лоцманського катера KP-965.",
    `Активні фактори: ${factors}.`,
    `Навчальний бал факторів P = ${probabilityScore}, тяжкість наслідків S = ${severityCode}, тому індекс ризику R = ${riskIndex}.`,
    `Категорія: ${category}.`,
    `Превентивні заходи: ${mitigations}.`,
    "P — навчальний бал факторів, а не статистично підтверджена ймовірність аварії."
  ].join(" ");
}
