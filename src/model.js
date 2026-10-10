import { COEFFICIENTS, MODEL_VERSION, REGISTRY_ID } from "./coefficients.js";

export const MODEL = Object.freeze({
  id: MODEL_VERSION,
  registryId: REGISTRY_ID,
  status: "provisional",
  ageBaseline: COEFFICIENTS.ageBaseline.value.map(([upper, value]) => [upper ?? Infinity, value]),
  demographicMultiplier: COEFFICIENTS.demographicMultiplier.value,
  hourlyRoleRate: COEFFICIENTS.hourlyRoleRate.value,
  lifestyle: COEFFICIENTS.lifestyle.value
});

const coefficientSummary = (key) => {
  const { id, unit, population, period, source, sourceVersion, status } = COEFFICIENTS[key];
  return { id, unit, population, period, source, sourceVersion, status };
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));

export function categoryFor(risk) {
  if (risk < 1e-6) return { key: "negligible", label: "Знехтуваний", meter: 8 };
  if (risk < 1e-5) return { key: "low", label: "Низький", meter: 20 };
  if (risk < 1e-4) return { key: "moderately-low", label: "Відносно низький", meter: 36 };
  if (risk < 1e-3) return { key: "medium", label: "Середній", meter: 52 };
  if (risk < 1e-2) return { key: "very-high", label: "Дуже високий", meter: 72 };
  return { key: "extreme", label: "Екстремальний", meter: 92 };
}

export function calculateRisk(input) {
  const age = clamp(input.age, 18, 85);
  const hours = clamp(input.hours, 1, 5000);
  const nightShare = clamp(input.night, 0, 100) / 100;
  const baseline = MODEL.ageBaseline.find(([upper]) => age < upper)?.[1] ?? 0.143;
  const demographic = MODEL.demographicMultiplier[input.residence]?.[input.sex] ?? 1;

  let health = baseline * demographic;
  if (input.chronic) health *= COEFFICIENTS.chronicMultiplier.value;

  let occupation = (MODEL.hourlyRoleRate[input.role] ?? MODEL.hourlyRoleRate.deck) * hours;
  occupation *= 1 + nightShare * COEFFICIENTS.nightExposureSlope.value;
  if (input.ppe) occupation *= COEFFICIENTS.ppeMultiplier.value;
  if (input.previous) occupation *= COEFFICIENTS.previousIncidentMultiplier.value;

  let lifestyle = 0;
  if (input.smoking) lifestyle += MODEL.lifestyle.smoking * demographic;
  if (input.alcohol) lifestyle += MODEL.lifestyle.alcohol * demographic;

  health = clamp(health, 0, 0.95);
  occupation = clamp(occupation, 0, 0.95);
  lifestyle = clamp(lifestyle, 0, 0.95);
  const total = 1 - (1 - health) * (1 - occupation) * (1 - lifestyle);

  const componentEvidence = {
    health: ["ageBaseline", "demographicMultiplier", ...(input.chronic ? ["chronicMultiplier"] : [])].map(coefficientSummary),
    occupation: [
      "hourlyRoleRate",
      "nightExposureSlope",
      ...(input.ppe ? ["ppeMultiplier"] : []),
      ...(input.previous ? ["previousIncidentMultiplier"] : [])
    ].map(coefficientSummary),
    lifestyle: ["lifestyle"].map(coefficientSummary)
  };

  return {
    modelId: MODEL.id,
    registryId: MODEL.registryId,
    modelStatus: MODEL.status,
    total,
    category: categoryFor(total),
    components: { health, occupation, lifestyle },
    componentEvidence,
    uncertainty: {
      status: "not_quantified",
      explanation: "Довірчий інтервал не розраховується: первинні вибірки, знаменники та похибки коефіцієнтів не наведені."
    },
    assumptions: [
      "Компоненти походять із різних популяцій і описують несумісні наслідки.",
      "Формула лише обмежує демонстраційний індекс діапазоном від 0 до 1 і не доводить незалежність факторів.",
      "Навчальна шкала категорій не є затвердженим порогом професійного ризику.",
      "Результат не можна використовувати для допуску до роботи, медичного висновку чи прогнозу для людини.",
      "Демографічний множник застосовується до базового показника здоров'я та способу життя (загальна популяція), але не до професійної експозиції — роль уже враховує специфіку галузі."
    ],
    recommendations: recommendationsFor(input, { health, occupation, lifestyle })
  };
}

export function evaluateMlcCompliance(input) {
  const hours = clamp(input.hours, 1, 5000);
  const night = clamp(input.night, 0, 100);
  const findings = [];

  if (hours > 2600) {
    findings.push({
      rule: "MLC 2006 Standard A2.3 / STCW VIII/1",
      topic: "Наднаднормовий річний час",
      severity: "warning",
      message: `Річне навантаження (${hours.toLocaleString("uk-UA")} год) перевищує типові норми (~2 080–2 400 год/рік) і потребує регулярного моніторингу записів відпочинку (не менше 77 год відпочинку на 7 днів).`
    });
  } else if (hours > 2200) {
    findings.push({
      rule: "MLC 2006 Guideline B2.3",
      topic: "Підвищений баланс робочих годин",
      severity: "info",
      message: `Робочий час (${hours.toLocaleString("uk-UA")} год/рік) вимагає контролю міжрейсового відновлення та недопущення порушення лімітів вахт.`
    });
  }

  if (night >= 40) {
    findings.push({
      rule: "IMO MSC/Circ.1598 (Fatigue Guidelines)",
      topic: "Висока частка нічних вахт",
      severity: "warning",
      message: `Частка нічної роботи (${night}%) створює підвищений ризик циркадного десинхронозу та втоми. Обов'язковий графік відпочинку з мінімум одним безперервним 6-годинним інтервалом сну.`
    });
  } else if (night >= 25) {
    findings.push({
      rule: "STCW Section A-VIII/1",
      topic: "Нічні зміни",
      severity: "info",
      message: `Частка нічних вахт (${night}%) потребує моніторингу втоми та адаптації освітлення робочих місць.`
    });
  }

  return {
    hasWarnings: findings.some((f) => f.severity === "warning"),
    findings
  };
}

export function generateWhatIfScenarios(input) {
  const baseResult = calculateRisk(input);
  const scenarios = [];

  if (!input.ppe) {
    const simInput = { ...input, ppe: true };
    const simResult = calculateRisk(simInput);
    const reduction = ((baseResult.total - simResult.total) / baseResult.total) * 100;
    scenarios.push({
      id: "ppe",
      title: "Використання повного комплекту ЗІЗ",
      description: "Застосування належних засобів індивідуального захисту зменшує професійний компонент експозиції на 25%.",
      deltaPercent: Math.round(reduction),
      simulatedTotal: simResult.total,
      simulatedCategory: simResult.category
    });
  }

  if (Number(input.night) >= 20) {
    const targetNight = Math.round(Number(input.night) / 2);
    const simInput = { ...input, night: targetNight };
    const simResult = calculateRisk(simInput);
    const reduction = ((baseResult.total - simResult.total) / baseResult.total) * 100;
    scenarios.push({
      id: "night",
      title: `Оптимізація нічних змін до ${targetNight}%`,
      description: "Зниження частки нічної роботи вдвічі зменшує фактор втоми згідно з коефіцієнтом нічної експозиції.",
      deltaPercent: Math.round(reduction),
      simulatedTotal: simResult.total,
      simulatedCategory: simResult.category
    });
  }

  if (input.smoking || input.alcohol) {
    const simInput = { ...input, smoking: false, alcohol: false };
    const simResult = calculateRisk(simInput);
    const reduction = ((baseResult.total - simResult.total) / baseResult.total) * 100;
    scenarios.push({
      id: "lifestyle",
      title: "Зниження маркерів способу життя",
      description: "Усунення маркерів куріння та вживання алкоголю знижує демонстраційний внесок lifestyle-компоненти.",
      deltaPercent: Math.round(reduction),
      simulatedTotal: simResult.total,
      simulatedCategory: simResult.category
    });
  }

  if (Number(input.hours) > 2400) {
    const simInput = { ...input, hours: 2000 };
    const simResult = calculateRisk(simInput);
    const reduction = ((baseResult.total - simResult.total) / baseResult.total) * 100;
    scenarios.push({
      id: "hours",
      title: "Нормалізація річних годин до 2 000 год",
      description: "Зниження річної експозиції до стандартного балансу відповідно до конвенції MLC 2006.",
      deltaPercent: Math.round(reduction),
      simulatedTotal: simResult.total,
      simulatedCategory: simResult.category
    });
  }

  return scenarios;
}

export function generateChecklist(input) {
  const role = input.role || "deck";
  const items = [];

  items.push({
    id: "rest-hours",
    label: "Перевірка записів відпочинку (не менше 10 год за добу, 77 год за 7 днів згідно з MLC 2006)",
    category: "Графік та готовність",
    mandatory: true
  });
  items.push({
    id: "stop-work",
    label: "Підтвердження повноважень «Stop Work Authority»: право зупинити роботу у разі явної загрози",
    category: "Безпека операцій",
    mandatory: true
  });

  if (role === "deck") {
    items.push({
      id: "deck-ppe",
      label: "Перевірка спеціального захисту: каска, захисні окуляри, неслизьке взуття S3, рукавиці",
      category: "ЗІЗ",
      mandatory: true
    });
    items.push({
      id: "deck-mooring",
      label: "Контроль зон «snap-back» (лінії віддачі швартових канатів) перед швартуванням",
      category: "Палубні операції",
      mandatory: true
    });
    items.push({
      id: "deck-fall",
      label: "Огляд страхувальних поясів, леєрів і засобів захисту від падіння з висоти / за борт",
      category: "Палубні операції",
      mandatory: true
    });
  } else if (role === "engine") {
    items.push({
      id: "engine-hearing",
      label: "Обов'язковий захист слуху (навушники з відповідним SNR) у машинному відділенні",
      category: "ЗІЗ",
      mandatory: true
    });
    items.push({
      id: "engine-hotwork",
      label: "Перевірка дозволу на гарячі роботи (Hot Work Permit) та вогнегасників на місці",
      category: "Машинні операції",
      mandatory: true
    });
    items.push({
      id: "engine-confined",
      label: "Газоаналізатор та процедура Enclosed Space Entry перед входом у танки або картери",
      category: "Машинні операції",
      mandatory: true
    });
  } else if (role === "officer") {
    items.push({
      id: "officer-bridge",
      label: "Передвахтовий брифінг на містку (Bridge Resource Management), узгодження плану переходу",
      category: "Управління",
      mandatory: true
    });
    items.push({
      id: "officer-fatigue",
      label: "Оцінка втоми вахтових матросів та штурманів перед заходом у складні райони плавання",
      category: "Управління",
      mandatory: true
    });
  } else if (role === "cadet") {
    items.push({
      id: "cadet-supervision",
      label: "Призначення відповідального наставника (Officer of the Watch / Bosun) на всі операції",
      category: "Навчання",
      mandatory: true
    });
    items.push({
      id: "cadet-briefing",
      label: "Проходження Tool-box Meeting перед виконанням будь-яких незнайомих операцій",
      category: "Навчання",
      mandatory: true
    });
  } else if (role === "port") {
    items.push({
      id: "port-hi-vis",
      label: "Використання сигнального жилета високої видимості (Class 3) та захисного взуття",
      category: "ЗІЗ",
      mandatory: true
    });
    items.push({
      id: "port-traffic",
      label: "Дотримання безпечних маршрутів руху портової техніки (крани, автонавантажувачі)",
      category: "Портові операції",
      mandatory: true
    });
  } else if (role === "diver") {
    items.push({
      id: "diver-decomp",
      label: "Перевірка декомпресійних таблиць, дублюючих запасів суміші та робочого тиску барокамери",
      category: "Водолазні операції",
      mandatory: true
    });
    items.push({
      id: "diver-standby",
      label: "Наявність чергового водолаза (Standby Diver) у повній готовності до негайного спуску",
      category: "Водолазні операції",
      mandatory: true
    });
  }

  if (Number(input.night) >= 25) {
    items.push({
      id: "night-adaptation",
      label: "Світлова адаптація зору за 15 хвилин до заступу на нічну вахту",
      category: "Нічна вахта",
      mandatory: false
    });
  }
  if (!input.ppe) {
    items.push({
      id: "ppe-audit",
      label: "ПОВНИЙ АУДИТ ЗІЗ: використання засобів захисту обов'язкове до початку будь-яких робіт",
      category: "ЗІЗ",
      mandatory: true
    });
  }

  return { role, items };
}

function recommendationsFor(input, components) {
  const items = [];
  if (Number(input.night) >= 30) items.push("Переглянути режим відпочинку та контроль втоми перед нічними змінами.");
  if (!input.ppe) items.push("Перевірити доступність і фактичне використання відповідних засобів індивідуального захисту.");
  if (input.previous) items.push("Розібрати попередній інцидент і перевірити, чи впроваджені коригувальні заходи.");
  if (input.smoking) items.push("Розглянути програму відмови від куріння як найбільш керований додатковий фактор.");
  if (input.alcohol) items.push("Звернутися до доказової програми підтримки щодо ризикового вживання алкоголю.");
  if (input.chronic) items.push("Дотримуватися рекомендацій лікаря та проходити передбачені професійні огляди.");
  if (!items.length || components.occupation === Math.max(...Object.values(components))) {
    items.push("Підтримувати передзмінний чек-лист, справність обладнання та право зупинити небезпечну роботу.");
  }
  return items.slice(0, 3);
}
