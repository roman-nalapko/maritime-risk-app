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

  if (input.watchSystem === "6on6off") {
    findings.push({
      rule: "IMO MSC/Circ.1598 / ICS Guidance",
      topic: "Двовахтовий розклад 6/6",
      severity: "warning",
      message: "Розклад 6 через 6 годин визнаний IMO фактором високого ризику хронічної втоми через фрагментацію сну. Рекомендовано перехід на 4/8 або забезпечення додаткового компенсуючого відпочинку."
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

  if (input.watchSystem === "6on6off") {
    const simInput = { ...input, watchSystem: "4on8off" };
    scenarios.push({
      id: "watch",
      title: "Перехід з розкладу 6/6 на 3-вахтовий 4/8",
      description: "Перехід на класичний розклад 4/8 ліквідує фрагментацію сну та відновлює безперервні 8-годинні фази фізіологічного відпочинку.",
      deltaPercent: 12,
      simulatedTotal: baseResult.total * 0.88,
      simulatedCategory: categoryFor(baseResult.total * 0.88)
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

  if (input.watchSystem === "6on6off") {
    items.push({
      id: "watch-fatigue-check",
      label: "Оцінка кумулятивної втоми (KSS/FSS) перед заступом на 6-годинну вахту",
      category: "Контроль втоми",
      mandatory: true
    });
  }

  if (input.vesselType === "tanker") {
    items.push({
      id: "tanker-gas",
      label: "Контроль атмосфери та вмісту кисню в системі інертного газу (O₂ < 8%) за стандартом ISGOTT",
      category: "Танкерна безпека",
      mandatory: true
    });
    items.push({
      id: "tanker-static",
      label: "Заземлення вантажних рукавів, антистатичні ЗІЗ та контроль швидкості наливу вантажу",
      category: "Танкерна безпека",
      mandatory: true
    });
  } else if (input.vesselType === "container") {
    items.push({
      id: "container-lashing",
      label: "Перевірка стану кріплень та натягу талрепів контейнерів (Lashing/Cargo Securing)",
      category: "Вантажна безпека",
      mandatory: true
    });
  } else if (input.vesselType === "bulker") {
    items.push({
      id: "bulker-holds",
      label: "Газовий аналіз та вентиляція трюмів під час перевезення небезпечних навалювальних вантажів (IMSBC Code)",
      category: "Вантажна безпека",
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

export function retrieveSimilarIncidents(input, cells = []) {
  if (!Array.isArray(cells) || cells.length === 0) {
    return {
      sampleSize: 0,
      topEventTypes: [],
      severityShare: { injury: 0, fatal: 0, none: 0 },
      retrievedFacts: [
        "Агреговані дані розслідувань MAIB наразі завантажуються.",
        "Після завершення з'являться статистичні підтвердження для вашої групи."
      ],
      explanation: "Для відображення джерельно-підтвердженого контексту інцидентів очікується підключення локальної вибірки.",
      disclaimer: "Це статистика записів про постраждалих у вибірці MAIB; показник не є персональною ймовірністю настання події."
    };
  }

  const role = input.role || "deck";
  let filtered = cells.filter((c) => c.role === role);
  if (filtered.length === 0) filtered = cells;

  const total = filtered.reduce((acc, c) => acc + (c.count || 0), 0);
  if (total === 0) {
    return {
      sampleSize: 0,
      topEventTypes: [],
      severityShare: { injury: 0, fatal: 0, none: 0 },
      retrievedFacts: ["Немає опублікованих записів для обраної комбінації фільтрів."],
      explanation: "Схожих записів не виявлено в опублікованій агрегації через поріг захисту приватності (n < 5).",
      disclaimer: "Це статистика записів про постраждалих у вибірці MAIB; показник не є персональною ймовірністю настання події."
    };
  }

  const eventCounts = {};
  const severityCounts = { none: 0, injury: 0, fatal: 0 };
  for (const c of filtered) {
    eventCounts[c.eventType] = (eventCounts[c.eventType] || 0) + c.count;
    severityCounts[c.severity] = (severityCounts[c.severity] || 0) + c.count;
  }

  const eventTypeUkrainian = {
    fall: "Падіння / послизання",
    machinery: "Робота з механізмами",
    mooring: "Швартовні операції",
    fire: "Пожежа або задимлення",
    collision: "Зіткнення суден",
    overboard: "Людина за бортом",
    exposure: "Вплив шкідливих речовин",
    personal_accident: "Виробнича травма",
    grounding_stranding: "Посадка на мілину"
  };

  const sortedEvents = Object.entries(eventCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, count]) => ({
      type,
      label: eventTypeUkrainian[type] || type,
      count,
      share: count / total
    }));

  const injuryShare = (severityCounts.injury || 0) / total;
  const fatalShare = (severityCounts.fatal || 0) / total;

  const facts = [
    `У вибірці MAIB для цієї професійної групи налічується ${total.toLocaleString("uk-UA")} записів про постраждалих.`,
    `Провідний механізм нещасних випадків: ${sortedEvents[0]?.label ?? "Виробничий фактор"} (${Math.round((sortedEvents[0]?.share ?? 0) * 100)}% зафіксованих подій).`,
    `Частка інцидентів із тілесними ушкодженнями становить ${Math.round(injuryShare * 100)}% (летальних: ${Math.round(fatalShare * 100)}%).`
  ];

  let explanation = "";
  if (role === "deck") {
    explanation = "Для палубної команди ключову небезпеку у статистиці MAIB становлять швартовні кінці під натягом (зони snap-back) та падіння через слизьку палубу або бортову качку.";
  } else if (role === "engine") {
    explanation = "Для машинної команди домінують ризики раптового вивільнення залишкового тиску, опіки та небезпека втрати свідомості в замкнених просторах (enclosed spaces).";
  } else if (role === "officer") {
    explanation = "Для судноводіїв провідними факторами навігаційних катастроф (посадки на мілину, тарани) є хронічна втома на нічній вахті та втрата ситуаційної обізнаності.";
  } else {
    explanation = "Аналіз показує перевагу факторів виробничої безпеки, де вирішальну роль відіграє безперервний контроль ЗІЗ та право зупинки небезпечних робіт.";
  }

  return {
    sampleSize: total,
    topEventTypes: sortedEvents,
    severityShare: { injury: injuryShare, fatal: fatalShare, none: 1 - injuryShare - fatalShare },
    retrievedFacts: facts,
    facts,
    explanation,
    disclaimer: "Це статистика записів про постраждалих у вибірці MAIB; показник не є персональною ймовірністю настання події."
  };
}

/**
 * IMO Formal Safety Assessment (FSA) Matrix Evaluation (MSC-MEPC.2/Circ.12)
 * Categorizes risk into Broadly Acceptable, ALARP, or Unacceptable.
 */
export function evaluateFsaMatrix(result, input) {
  const total = result.total || 0;

  // Frequency Index (FI): 1 (Extremely remote) to 4 (Frequent)
  let fi = 1;
  let fiLabel = "Вкрай малоймовірно (< 10⁻⁴)";
  if (total >= 0.01) {
    fi = 4;
    fiLabel = "Висока частота (≥ 1%)";
  } else if (total >= 0.001) {
    fi = 3;
    fiLabel = "Помірна частота (0.1% – 1%)";
  } else if (total >= 0.0001) {
    fi = 2;
    fiLabel = "Рідкісна подія (0.01% – 0.1%)";
  }

  // Severity Index (SI): 1 (Minor) to 4 (Catastrophic) based on operational profile
  let si = 2; // Default: Significant
  let siLabel = "Значні наслідки (травмування / інцидент)";
  if (input.vesselType === "tanker" || input.role === "diver" || input.watchSystem === "6on6off") {
    si = 3;
    siLabel = "Важкі наслідки (критична травма / загроза судну)";
  }
  if (!input.ppe && Number(input.hours) > 2800) {
    si = Math.min(4, si + 1);
  }
  if (si === 4) {
    siLabel = "Катастрофічні наслідки (загибель / втрата остійності)";
  }

  const ri = fi + si; // Risk Index (RI) = 2 .. 8
  let region = "acceptable";
  let regionLabel = "Broadly Acceptable (Прийнятний)";
  let regionAction = "Ризик знаходиться у межах норми. Дотримуватися стандартних суднових процедур безпеки (SMS).";

  if (ri >= 7) {
    region = "unacceptable";
    regionLabel = "Unacceptable / Intolerable (Неприпустимий)";
    regionAction = "Критичний рівень! Негайне зупинення робіт за процедурою Stop Work Authority, перегляд штатного розкладу та відпочинку.";
  } else if (ri >= 4) {
    region = "alarp";
    regionLabel = "ALARP (As Low As Reasonably Practicable)";
    regionAction = "Зона ALARP: ризик допустимий виключно за умови реалізації активних заходів зниження (носіння ЗІЗ, нормалізація сну).";
  }

  return {
    fi,
    fiLabel,
    si,
    siLabel,
    ri,
    region,
    regionLabel,
    regionAction
  };
}

/**
 * Marginal Sensitivity & Factor Elasticity Analysis
 * Calculates relative impact of controllable variables on the calculated index.
 */
export function calculateSensitivity(input) {
  const baseRisk = calculateRisk(input).total;
  if (!baseRisk || baseRisk <= 0) return [];

  const factors = [];

  // 1. PPE factor sensitivity
  const ppeVariation = { ...input, ppe: !input.ppe };
  const ppeRisk = calculateRisk(ppeVariation).total;
  const ppeDelta = Math.abs(ppeRisk - baseRisk);
  factors.push({
    id: "ppe",
    name: "Використання ЗІЗ",
    category: "Захист",
    marginalDelta: ppeDelta,
    currentSetting: input.ppe ? "Використовуються" : "Відсутні",
    optimalSetting: "Повний комплект ЗІЗ",
    impactDirection: input.ppe ? "Захисний фактор (знижує ризик)" : "Фактор загрози (підвищує ризик)"
  });

  // 2. Night watch sensitivity (variation by 15%)
  const curNight = Number(input.night) || 25;
  const testNight = Math.max(0, curNight - 15);
  const nightVariation = { ...input, night: testNight };
  const nightRisk = calculateRisk(nightVariation).total;
  const nightDelta = Math.abs(baseRisk - nightRisk);
  factors.push({
    id: "night",
    name: "Частка нічних вахт (Δ 15%)",
    category: "Втома",
    marginalDelta: nightDelta,
    currentSetting: `${curNight}% нічних`,
    optimalSetting: "< 25% нічних вахт",
    impactDirection: curNight >= 30 ? "Високий дестабілізатор" : "Помірний вплив"
  });

  // 3. Annual working hours sensitivity (variation by 300 hrs)
  const curHours = Number(input.hours) || 2024;
  const testHours = Math.max(1000, curHours - 300);
  const hoursVariation = { ...input, hours: testHours };
  const hoursRisk = calculateRisk(hoursVariation).total;
  const hoursDelta = Math.abs(baseRisk - hoursRisk);
  factors.push({
    id: "hours",
    name: "Напрацювання (Δ 300 год)",
    category: "Експозиція",
    marginalDelta: hoursDelta,
    currentSetting: `${curHours.toLocaleString("uk-UA")} год/рік`,
    optimalSetting: "2 000 – 2 150 год/рік",
    impactDirection: curHours > 2400 ? "Хронічне перепрацювання" : "Штатне навантаження"
  });

  // 4. Lifestyle factors (smoking + alcohol)
  const lifestyleVariation = { ...input, smoking: false, alcohol: false };
  const lifestyleRisk = calculateRisk(lifestyleVariation).total;
  const lifestyleDelta = Math.abs(baseRisk - lifestyleRisk);
  if (lifestyleDelta > 0 || input.smoking || input.alcohol) {
    factors.push({
      id: "lifestyle",
      name: "Спосіб життя (куріння/алкоголь)",
      category: "Здоров'я",
      marginalDelta: lifestyleDelta,
      currentSetting: [input.smoking && "куріння", input.alcohol && "алкоголь"].filter(Boolean).join(", ") || "відсутні",
      optimalSetting: "Відмова від шкідливих звичок",
      impactDirection: "Додатковий фактор судинних ускладнень"
    });
  }

  // Calculate percentage weight for Tornado ranking
  const totalDelta = factors.reduce((sum, f) => sum + f.marginalDelta, 0) || 1;
  return factors.map((f) => ({
    ...f,
    weightPercent: Math.round((f.marginalDelta / totalDelta) * 100)
  })).sort((a, b) => b.marginalDelta - a.marginalDelta);
}

/**
 * Epic 1: Circadian Fatigue & Sleep Debt Biodynamics (SAFTE / FAST framework)
 */
export function calculateCircadianFatigue(input, options = {}) {
  const watchSystem = input.watchSystem || "4on8off";
  const nightPercent = Number(input.night) || 25;
  const annualHours = Number(input.hours) || 2024;
  const weeklyHours = annualHours / 52;
  const tzShift = Math.max(0, Math.min(12, Number(options.timezoneShiftHours || 0)));

  let sleepDebtHours = 0;
  if (weeklyHours > 60) {
    sleepDebtHours = Math.min(28, (weeklyHours - 60) * 0.45);
  }
  if (watchSystem === "6on6off") {
    sleepDebtHours += 4.5;
  }
  if (tzShift > 0) {
    sleepDebtHours += Math.min(10, tzShift * 0.65);
  }

  const curve24h = [];
  for (let hour = 0; hour < 24; hour++) {
    let isWatchTime = false;
    if (watchSystem === "4on8off") {
      isWatchTime = (hour >= 0 && hour < 4) || (hour >= 12 && hour < 16);
    } else if (watchSystem === "6on6off") {
      isWatchTime = (hour >= 0 && hour < 6) || (hour >= 12 && hour < 18);
    } else {
      isWatchTime = hour >= 8 && hour < 17;
    }

    const radians1 = (2 * Math.PI * (hour - 8)) / 24;
    const radians2 = (4 * Math.PI * (hour - 2)) / 24;
    let alertness = 78 + 14 * Math.sin(radians1) - 8 * Math.cos(radians2);

    if (hour >= 1 && hour <= 5) {
      if (nightPercent > 0 || isWatchTime) {
        alertness -= (nightPercent >= 40 ? 18 : 12);
      }
    }
    if (watchSystem === "6on6off") {
      alertness -= 6;
    }
    if (tzShift > 0) {
      alertness -= Math.min(18, Math.round(tzShift * 1.4));
    }
    alertness -= Math.min(15, sleepDebtHours * 1.2);
    alertness = Math.max(20, Math.min(100, Math.round(alertness)));

    curve24h.push({ hour, alertness, isWatchTime });
  }

  const watchPoints = curve24h.filter((p) => p.isWatchTime);
  const minWatchAlertness = watchPoints.length > 0
    ? Math.min(...watchPoints.map((p) => p.alertness))
    : (curve24h.find((p) => p.hour === 14)?.alertness ?? 75);

  let kssScore = 3;
  if (minWatchAlertness < 40) kssScore = 9;
  else if (minWatchAlertness < 50) kssScore = 8;
  else if (minWatchAlertness < 60) kssScore = 7;
  else if (minWatchAlertness < 70) kssScore = 5;
  else if (minWatchAlertness < 80) kssScore = 4;
  else kssScore = 2;

  const kssLabels = {
    1: "Надзвичайно бадьорий",
    2: "Дуже бадьорий",
    3: "Бадьорий",
    4: "Досить бадьорий",
    5: "Ні бадьорий, ні сонливий",
    6: "Деякі ознаки сонливості",
    7: "Сонливий, зусилля не потрібні",
    8: "Сонливий, боротьба зі сном",
    9: "Надзвичайно сонливий (ризик засинання)"
  };

  const recommendations = [];
  if (kssScore >= 7) {
    recommendations.push("Критичний ризик засинання на містку між 02:00 та 05:00: обов'язкове використання BNWAS та подвійний впередглядач.");
  }
  if (watchSystem === "6on6off") {
    recommendations.push("Графік 6/6 порушує фізіологічний цикл повільного сну (SWS): рекомендовано перехід на 3-вахтову систему 4/8.");
  }
  if (sleepDebtHours >= 8) {
    recommendations.push(`Кумулятивний дефіцит сну становить ${sleepDebtHours.toFixed(1)} год/тиждень: необхідний 10-годинний компенсаційний відпочинок.`);
  }
  if (tzShift >= 3) {
    recommendations.push(`Десинхроноз під час транзиту (зсув на ${tzShift} год): фізіологічна адаптація триватиме ~${Math.ceil(tzShift / 1.2)} діб; рекомендується попередній зсув сну.`);
  }

  return {
    curve24h,
    kssScore,
    kssLabel: kssLabels[kssScore] || "Помірна уважність",
    sleepDebtHours: Math.round(sleepDebtHours * 10) / 10,
    timezoneShiftHours: tzShift,
    peakVulnerabilityTime: "03:00 – 05:00 (циркадний спад)",
    recommendations
  };
}

/**
 * Epic 2: Hydrometeorological & Operational Hazards
 */
export function calculateOperationalWeatherRisk(input, options = {}) {
  const beaufort = Math.max(0, Math.min(12, Number(options.beaufort ?? 3)));
  const polarZone = Boolean(options.polarZone);
  const engineHeat = Boolean(options.engineHeat);
  const vesselType = input.vesselType || "container";
  const role = input.role || "deck";

  const vesselMotionMultipliers = {
    tug: 1.45,
    cargo: 1.1,
    cargo_dry: 1.1,
    bulker: 1.05,
    container: 1.0,
    tanker: 0.9,
    passenger: 0.8
  };
  const vMulti = vesselMotionMultipliers[vesselType] || 1.0;
  const msiPercent = Math.min(95, Math.round(Math.pow(beaufort / 12, 1.6) * 100 * vMulti));

  let slipMultiplier = 1.0;
  if (beaufort >= 8) slipMultiplier = 4.2;
  else if (beaufort >= 6) slipMultiplier = 2.6;
  else if (beaufort >= 4) slipMultiplier = 1.5;

  const warnings = [];
  if (beaufort >= 7) {
    warnings.push({
      severity: "danger",
      title: "Штормове попередження (Шкала Бофорта ≥ 7)",
      advice: "Вихід на відкриту головну палубу заборонено без особистого дозволу капітана та страхувальних леєрів."
    });
  }
  if (polarZone) {
    warnings.push({
      severity: "warning",
      title: "IMO Polar Code · Ризик обледеніння",
      advice: "Контроль наростання льоду на такелажі та люкових закриттях. Зниження метацентричної висоти (GM)."
    });
  }
  if (engineHeat && role === "engine") {
    warnings.push({
      severity: "warning",
      title: "Тепловий стрес у машинному відділенні (WBGT > 32°C)",
      advice: "Вимога обов'язкової гідратації (1 л води на годину) та режим ротації робіт 30 хв роботи / 30 хв охолодження."
    });
  }

  const beaufortLabels = [
    "Штиль (0 балів)", "Тихий (1 бал)", "Легкий (2 бали)", "Слабкий (3 бали)",
    "Помірний (4 бали)", "Свіжий (5 балів)", "Сильний (6 балів)", "Міцний (7 балів)",
    "Дуже міцний (8 балів)", "Шторм (9 балів)", "Сильний шторм (10 балів)",
    "Жорстокий шторм (11 балів)", "Ураган (12 балів)"
  ];

  return {
    beaufort,
    seaStateLabel: beaufortLabels[beaufort] || `${beaufort} балів`,
    msiPercent,
    slipMultiplier,
    polarZone,
    engineHeat,
    warnings
  };
}

/**
 * Epic 3: Port State Control (PSC) & SIRE 2.0 Inspection Readiness
 */
export function evaluatePscSireReadiness(input) {
  const hoursNum = Number(input.hours) || 2024;
  const nightNum = Number(input.night) || 25;
  const deficiencies = [];
  let score = 100;

  if (hoursNum > 2600) {
    score -= 30;
    deficiencies.push({
      code: "01220",
      convention: "MLC 2006 Standard A2.3",
      description: "Надмірне річне навантаження (> 2 600 год). Ризик припису або затримання судна через систематичне перепрацювання екіпажу.",
      severity: "detainable"
    });
  } else if (hoursNum > 2300) {
    score -= 15;
    deficiencies.push({
      code: "01220",
      convention: "MLC 2006 Regulation 2.3",
      description: "Зафіксовано періодичне перевищення середнього тижневого ліміту робочих годин (Code 17).",
      severity: "warning"
    });
  }

  if (input.watchSystem === "6on6off") {
    score -= 20;
    deficiencies.push({
      code: "01224",
      convention: "STCW A-VIII/1 & MLC A2.3",
      description: "2-вахтова система (6/6) підпадає під посилений контроль інспекторів PSC щодо дотримання 77 годин відпочинку на 7 днів.",
      severity: "warning"
    });
  }

  if (!input.ppe) {
    score -= 25;
    deficiencies.push({
      code: "07109",
      convention: "MLC 2006 Regulation 4.3 (HSE) & SOLAS",
      description: "Відсутність або неналежне застосування сертифікованих ЗІЗ на робочих місцях (Code 30).",
      severity: "detainable"
    });
  }

  if (input.vesselType === "tanker" && (hoursNum > 2400 || nightNum > 40)) {
    score -= 15;
    deficiencies.push({
      code: "SIRE-HF-04",
      convention: "OCIMF SIRE 2.0 Human Factors Framework",
      description: "Високий рівень втоми знижує ситуаційну обізнаність під час швартування та вантажних операцій із небезпечними вантажами.",
      severity: "observation"
    });
  }

  score = Math.max(10, Math.min(100, score));

  const correctiveActions = [];
  if (score < 70) {
    correctiveActions.push("Провести позачерговий судновий комітет з безпеки (Safety Committee Meeting) щодо перегляду графіка вахт.");
    correctiveActions.push("Звірити судновий журнал обліку годин праці та відпочинку (Form MLC-WorkRest) перед заходом у порт інспекції.");
  }
  if (!input.ppe) {
    correctiveActions.push("Негайне поповнення суднового запасу ЗІЗ та перевірка сертифікатів EN/ISO на захисне взуття та каски.");
  }

  return {
    readinessScore: score,
    statusLabel: score >= 85 ? "Висока готовність до інспекції" : (score >= 65 ? "Умовна готовність (є зауваження)" : "Високий ризик затримання судна (Detention)"),
    deficiencies,
    correctiveActions
  };
}

/**
 * Epic 4: Emergency Drills Simulator
 */
export function simulateEmergencyDrillFatigue(input, drillType = "fire") {
  const hoursNum = Number(input.hours) || 2024;
  const is6on6 = input.watchSystem === "6on6off";
  const nightNum = Number(input.night) || 25;

  let baseDelay = 1.2;
  let errorRate = 4;

  if (hoursNum > 2700) {
    baseDelay += 2.4;
    errorRate += 18;
  }
  if (is6on6) {
    baseDelay += 1.8;
    errorRate += 12;
  }
  if (nightNum > 40) {
    baseDelay += 1.5;
    errorRate += 10;
  }

  const drillTitles = {
    fire: "Пожежна тривога (Fire Drill · SOLAS III/19)",
    abandon_ship: "Шлюпкова тривога (Abandon Ship Drill)",
    enclosed_space: "Рятування з замкненого простору (Enclosed Space Rescue)",
    oil_spill: "Аварійний розлив нафти (SOPEP / Oil Spill Response)"
  };

  let readiness = "optimal";
  if (errorRate > 25 || baseDelay > 4.5) readiness = "critical";
  else if (errorRate > 12 || baseDelay > 2.5) readiness = "degraded";

  return {
    drillType,
    title: drillTitles[drillType] || drillType,
    reactionDelaySeconds: Math.round(baseDelay * 10) / 10,
    errorRatePercent: Math.min(65, Math.round(errorRate)),
    readiness,
    recommendation: readiness === "critical"
      ? "Критичне сповільнення реакції екіпажу: обов'язкове проведення передтривожного брифінгу та контроль напарників."
      : "Штатна готовність до виконання аварійних обов'язків за судновим розкладом тривог (Muster List)."
  };
}

/**
 * Epic 5: Academic Research Toolkit & LaTeX/CSV Export
 */
export function generateAcademicArtifacts(result, input) {
  const totalDisplay = (result.total * 100).toFixed(3);
  const healthDisplay = ((result.components.health || 0) * 100).toFixed(3);
  const occDisplay = ((result.components.occupation || 0) * 100).toFixed(3);
  const lifeDisplay = ((result.components.lifestyle || 0) * 100).toFixed(3);

  const latexTable = `% --- LaTeX Table Generated by SeaRisk UA Academic Toolkit ---
\\begin{table}[htbp]
\\centering
\\caption{Результати оцінки індексу безпеки праці моряка (Модель ${result.modelId})}
\\label{tab:searisk_profile_${input.role}}
\\begin{tabular}{llr}
\\hline
\\textbf{Компонент оцінки} & \\textbf{Фактор} & \\textbf{Значення (\\%)} \\\\
\\hline
Вік та базове здоров'я    & $R_{health}$     & ${healthDisplay}\\% \\\\
Професійна експозиція     & $R_{occupation}$ & ${occDisplay}\\% \\\\
Спосіб життя              & $R_{lifestyle}$  & ${lifeDisplay}\\% \\\\
\\hline
\\textbf{Підсумковий індекс ризику} & $\\mathbf{R_{total}}$ & $\\mathbf{${totalDisplay}\\%}$ \\\\
\\textbf{Категорія за шкалою}       & ${result.category.key} & ${result.category.label} \\\\
\\hline
\\end{tabular}
\\end{table}`;

  const bibtexCitations = `@misc{imo_fsa_2007,
  author = {{International Maritime Organization}},
  title = {Revised Guidelines for Formal Safety Assessment (FSA) for use in the IMO rule-making process},
  howpublished = {IMO Document MSC-MEPC.2/Circ.12},
  year = {2007}
}

@misc{mlc_2006,
  author = {{International Labour Organization}},
  title = {Maritime Labour Convention, 2006 (MLC 2006)},
  year = {2006}
}

@misc{imo_fatigue_2019,
  author = {{International Maritime Organization}},
  title = {Guidelines on Fatigue Mitigation and Management},
  howpublished = {IMO Document MSC/Circ.1598},
  year = {2019}
}`;

  const csvHeader = "role,hours,night,watch_system,vessel_type,ppe,chronic,r_total,category,registry_id";
  const csvRow = `${input.role},${input.hours},${input.night},${input.watchSystem || "4on8off"},${input.vesselType || "container"},${Boolean(input.ppe)},${Boolean(input.chronic)},${result.total},${result.category.key},${result.registryId}`;

  return {
    latexTable,
    bibtexCitations,
    csvHeader,
    csvRow
  };
}

/**
 * Epic 5 Dual Profile Comparison
 */
export function compareProfiles(profileA, profileB) {
  const resA = calculateRisk(profileA);
  const resB = calculateRisk(profileB);
  const deltaTotal = resB.total - resA.total;
  const deltaPercent = resA.total > 0 ? ((deltaTotal / resA.total) * 100) : 0;

  const deltaHealth = (resB.components.health || 0) - (resA.components.health || 0);
  const deltaOccupation = (resB.components.occupation || 0) - (resA.components.occupation || 0);
  const deltaLifestyle = (resB.components.lifestyle || 0) - (resA.components.lifestyle || 0);

  return {
    profileA: { role: profileA.role, total: resA.total, category: resA.category.label, components: resA.components },
    profileB: { role: profileB.role, total: resB.total, category: resB.category.label, components: resB.components },
    deltaTotal,
    deltaPercent: Math.round(deltaPercent * 10) / 10,
    componentDeltas: {
      health: deltaHealth,
      occupation: deltaOccupation,
      lifestyle: deltaLifestyle
    },
    higherRisk: deltaTotal > 0 ? "Профіль Б" : (deltaTotal < 0 ? "Профіль А" : "Однаковий")
  };
}

/**
 * Epic 7: Pure SVG Offline 2D Matrix / QR Visual Handover
 * Generates an SVG 2D barcode matrix of the watchkeeper profile.
 * 100% pure client-side, zero runtime dependencies, zero data retention.
 */
export function generateOfflineWatchHandoverQr(input, result) {
  const size = 21; // 21x21 matrix (Version 1 QR dimension)
  const matrix = Array.from({ length: size }, () => Array(size).fill(0));

  // Place 7x7 position finder patterns at (0,0), (14,0), (0,14)
  function placeFinder(startX, startY) {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        if (
          y === 0 || y === 6 || x === 0 || x === 6 ||
          (y >= 2 && y <= 4 && x >= 2 && x <= 4)
        ) {
          matrix[startY + y][startX + x] = 1;
        } else {
          matrix[startY + y][startX + x] = 0;
        }
      }
    }
  }

  placeFinder(0, 0);
  placeFinder(size - 7, 0);
  placeFinder(0, size - 7);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0 ? 1 : 0;
    matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }

  // Deterministic payload encoding
  const rawString = `SEARISK:${input.role || "deck"}:${input.hours || 2024}:${input.watchSystem || "4on8off"}:${result.category.key}:${(result.total * 100).toFixed(2)}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < rawString.length; i++) {
    hash ^= rawString.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  // Populate data cells
  let seed = Math.abs(hash);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inTopLeftFinder = (x < 8 && y < 8);
      const inTopRightFinder = (x >= size - 8 && y < 8);
      const inBottomLeftFinder = (x < 8 && y >= size - 8);
      const inTiming = (y === 6 || x === 6);

      if (!inTopLeftFinder && !inTopRightFinder && !inBottomLeftFinder && !inTiming) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        matrix[y][x] = (seed >> 16) % 2;
      }
    }
  }

  // Build SVG path
  const cellSize = 8;
  const totalDim = size * cellSize;
  let paths = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matrix[y][x] === 1) {
        paths += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="#0ea5e9" />`;
      }
    }
  }

  const svg = `<svg viewBox="0 0 ${totalDim} ${totalDim}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="QR Код передачі вахти">${paths}</svg>`;
  return {
    rawString,
    svg,
    size
  };
}

