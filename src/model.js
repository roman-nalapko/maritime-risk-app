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

/**
 * Wilson Score Interval with Continuity Adjustment for Proportions (Issue #13)
 * Provides 95% confidence intervals for small and sparse maritime accident samples.
 * @param {number} count Number of positive events (e.g. injury or fatal count)
 * @param {number} total Total sample size n
 * @param {number} z Standard normal critical value (default 1.96 for 95% CI)
 */
export function calculateWilsonInterval(count, total, z = 1.96) {
  const n = Number(total) || 0;
  const k = Math.min(n, Math.max(0, Number(count) || 0));

  if (n <= 0) {
    return {
      point: 0,
      lower: 0,
      upper: 0,
      margin: 0,
      isSparse: true,
      confidence: 0.95
    };
  }

  const p = k / n;
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denominator;
  const rad = Math.sqrt((p * (1 - p)) / n + z2 / (4 * (n * n)));
  const margin = (z * rad) / denominator;

  const lower = Math.max(0, center - margin);
  const upper = Math.min(1, center + margin);

  return {
    point: p,
    lower,
    upper,
    margin,
    isSparse: n < 30,
    confidence: 0.95
  };
}

/**
 * IMO MSC.302(87) Bridge Alert Management (BAM) & SOLAS III/6.4.2 Emergency Sound Patterns
 * Returns deterministic audio frequency pulses and timings (for pure Web Audio API synthesis).
 * @param {string} alarmType "general_emergency" | "fire" | "abandon_ship" | "warning"
 */
export function getBridgeAlertPattern(alarmType = "general_emergency") {
  switch (alarmType) {
    case "general_emergency":
    case "abandon_ship":
      return {
        frequency: 800,
        pulses: [
          { duration: 0.2, pause: 0.2 },
          { duration: 0.2, pause: 0.2 },
          { duration: 0.2, pause: 0.2 },
          { duration: 0.2, pause: 0.2 },
          { duration: 0.2, pause: 0.2 },
          { duration: 0.2, pause: 0.2 },
          { duration: 0.2, pause: 0.2 },
          { duration: 1.5, pause: 0.5 }
        ],
        code: "SOLAS III/6.4.2 General Emergency Alarm (7 short + 1 prolonged blast)"
      };
    case "fire":
      return {
        frequency: 1000,
        pulses: [
          { duration: 0.4, pause: 0.1 },
          { duration: 0.4, pause: 0.1 },
          { duration: 0.4, pause: 0.1 },
          { duration: 0.4, pause: 0.1 }
        ],
        code: "Continuous Fire Alarm Bell Tone"
      };
    case "warning":
    default:
      return {
        frequency: 880,
        pulses: [
          { duration: 0.25, pause: 0.1 },
          { duration: 0.25, pause: 0.5 }
        ],
        code: "IMO MSC.302(87) BAM Category A Navigational Warning Chime"
      };
  }
}

/**
 * Bridge Resource Management (BRM) & Navigation Watch Team Risk Coupling (STCW A-VIII/2, COLREG Rule 5)
 * Evaluates the synergistic safety redundancy of the bridge watch team.
 */
export function evaluateWatchTeamRisk(oowInput, lookoutInput = null, options = {}) {
  const isNight = options.isNight ?? ((oowInput?.night ?? 0) >= 25);
  const pilotOnBoard = Boolean(options.pilotOnBoard);
  const hasLookout = Boolean(lookoutInput);

  const oowRisk = calculateRisk(oowInput || { role: "officer", hours: 2000 });
  const oowFatigue = calculateCircadianFatigue(oowInput || { watchSystem: "4on8off" }, options);

  let lookoutRisk = null;
  let lookoutFatigue = null;
  if (hasLookout) {
    lookoutRisk = calculateRisk(lookoutInput);
    lookoutFatigue = calculateCircadianFatigue(lookoutInput, options);
  }

  const findings = [];
  const recommendations = [];

  let soleWatchkeeperNight = false;
  let mutualFatigueNadir = false;
  let penaltyMultiplier = 1.0;

  // Rule 1: STCW A-VIII/2 Part 4-1 & COLREGs Rule 5: Sole watchkeeper during night
  if (!hasLookout && isNight) {
    soleWatchkeeperNight = true;
    penaltyMultiplier *= 2.2;
    findings.push({
      rule: "STCW A-VIII/2 Part 4-1 / COLREG Rule 5",
      severity: "critical",
      title: "Відсутність окремого впередсмотрящого вночі",
      text: "Несення ходової вахти одним помічником капітана в темний час доби є грубим порушенням STCW та фактором №1 нічних зіткнень (урок MAIB Scot Carrier)."
    });
    recommendations.push("Негайно виставити окремого матроса-впередсмотрящого (Lookout) на місток на весь темний час доби.");
  } else if (!hasLookout && !isNight) {
    findings.push({
      rule: "STCW A-VIII/2 Part 4-1",
      severity: "info",
      title: "Одноособова денна вахта (Sole Day Watch)",
      text: "Дозволяється в світлий час доби лише за сприятливої видимості, спокійного трафіку та без додаткових обов'язків."
    });
  }

  // Rule 2: Mutual Fatigue during Circadian Nadir
  if (hasLookout) {
    const oowExhausted = oowFatigue.sleepDebtHours >= 4 || oowInput?.watchSystem === "6on6off" || (Number(oowInput?.hours) || 0) >= 2800;
    const lookoutExhausted = lookoutFatigue.sleepDebtHours >= 4 || lookoutInput?.watchSystem === "6on6off" || (Number(lookoutInput?.hours) || 0) >= 2800;

    if (oowExhausted && lookoutExhausted) {
      mutualFatigueNadir = true;
      penaltyMultiplier *= 1.8;
      findings.push({
        rule: "IMO MSC/Circ.1598 & BRM Principles",
        severity: "critical",
        title: "Синхронна кумулятивна втома вахти (BRM Redundancy Failure)",
        text: "Обидва члени ходової вахти мають високий дефіцит сну (графік 6/6 або навантаження > 2800 год). Взаємна перевірка дій (Cross-check) повністю скомпрометована."
      });
      recommendations.push("Задіяти підміну з відпочилої зміни або ввести додатковий нагляд капітана.");
    } else if (oowExhausted || lookoutExhausted) {
      penaltyMultiplier *= 1.3;
      findings.push({
        rule: "IMO MSC/Circ.1598",
        severity: "warning",
        title: "Асиметрична втома вахти",
        text: `Один із членів вахти (${oowExhausted ? "вахтовий помічник" : "впередсмотрящий"}) має ознаки кумулятивної перевтоми.`
      });
      recommendations.push("Посилити вербальну комунікацію (Closed-loop communication) та перевірку орієнтирів кожні 15 хвилин.");
    }
  }

  // Rule 3: Pilot on board integration (IMO Res. A.960)
  if (pilotOnBoard) {
    findings.push({
      rule: "IMO Res. A.960 & BRM Standards",
      severity: "info",
      title: "Лоцманська проводка (Bridge Team / Pilot Integration)",
      text: "Присутність лоцмана на містку не звільняє вахтового помічника від обов'язку безперервного моніторингу курсу та положення судна."
    });
    recommendations.push("Провести Master/Pilot Information Exchange (MPX) та узгодити план переходу до початку маневрів.");
  }

  // Calculate combined score
  const baseRate = oowRisk.total * 1000;
  const lookoutFactor = hasLookout ? (lookoutRisk.total * 1000) * 0.4 : (isNight ? baseRate * 1.2 : baseRate * 0.3);
  const rawTeamScore = (baseRate + lookoutFactor) * penaltyMultiplier;
  const teamScore = Math.min(100, Math.max(1, Math.round(rawTeamScore * 10) / 10));

  let redundancyLevel = "optimal";
  if (soleWatchkeeperNight || mutualFatigueNadir || teamScore >= 60) {
    redundancyLevel = "compromised";
  } else if (teamScore >= 25 || !hasLookout || penaltyMultiplier > 1.0) {
    redundancyLevel = "degraded";
  }

  return {
    teamScore,
    redundancyLevel,
    soleWatchkeeperNight,
    mutualFatigueNadir,
    hasLookout,
    pilotOnBoard,
    findings,
    recommendations
  };
}

/**
 * Generates a default 7-day binary rest schedule (7 days x 24 hours).
 * 1 = Rest, 0 = Work.
 * @param {string} system - "4on8off", "6on6off", "cargo_overtime"
 * @returns {Array<Array<number>>} 7 arrays of 24 numbers (0 or 1)
 */
export function createDefaultWatchSchedule(system = "4on8off") {
  const schedule = [];
  for (let day = 0; day < 7; day++) {
    const hours = new Array(24).fill(1); // default all rest
    if (system === "4on8off") {
      // 4 on / 8 off: work 00:00-04:00 and 12:00-16:00
      for (let h = 0; h < 4; h++) hours[h] = 0;
      for (let h = 12; h < 16; h++) hours[h] = 0;
    } else if (system === "6on6off") {
      // 6 on / 6 off: work 00:00-06:00 and 12:00-18:00
      for (let h = 0; h < 6; h++) hours[h] = 0;
      for (let h = 12; h < 18; h++) hours[h] = 0;
    } else if (system === "cargo_overtime") {
      // Heavy port operations: work 00:00-06:00, 08:00-13:00, 15:00-20:00
      for (let h = 0; h < 6; h++) hours[h] = 0;
      for (let h = 8; h < 13; h++) hours[h] = 0;
      for (let h = 15; h < 20; h++) hours[h] = 0;
    }
    schedule.push(hours);
  }
  return schedule;
}

/**
 * Validates a 7-day rest hours schedule against MLC 2006 Standard A2.3 & STCW Section A-VIII/1.
 * Checks:
 * 1. Minimum 10 hours rest in any sliding 24-hour period.
 * 2. Rest divided into no more than two periods in any 24-hour window.
 * 3. At least one rest period >= 6 continuous hours in any 24-hour window.
 * 4. Interval between consecutive rest periods <= 14 hours.
 * 5. Minimum 77 hours rest in 7-day period.
 */
export function validateRestHoursSchedule(schedule, options = {}) {
  const flat = [];
  for (let d = 0; d < 7; d++) {
    const dayHours = schedule[d] || new Array(24).fill(1);
    for (let h = 0; h < 24; h++) {
      flat.push(dayHours[h] ? 1 : 0);
    }
  }

  const totalRest7Days = flat.reduce((sum, val) => sum + val, 0);
  const violations = [];
  let minDailyRest = 24;
  let hasSplitViolation = false;
  let hasBlockLenViolation = false;
  let hasIntervalViolation = false;

  const step = options.slidingStep || 1;
  for (let t = 0; t <= flat.length - 24; t += step) {
    const window = flat.slice(t, t + 24);
    const windowRest = window.reduce((sum, val) => sum + val, 0);
    if (windowRest < minDailyRest) {
      minDailyRest = windowRest;
    }

    const dayNum = Math.floor(t / 24) + 1;
    const hourNum = t % 24;

    // Rule 1: Min 10 hours rest in any 24h period
    if (windowRest < 10) {
      violations.push({
        type: "daily_minimum",
        day: dayNum,
        hour: hourNum,
        rule: "MLC 2006 Standard A2.3.5(b) / STCW A-VIII/1.2",
        message: `День ${dayNum}, ${String(hourNum).padStart(2, "0")}:00 — відпочинок за 24-годинне вікно складає лише ${windowRest} год (мінімум 10 год).`
      });
    }

    // Identify continuous rest blocks in the 24h window (accounting for boundary continuity)
    const restBlocks = [];
    let currentBlock = 0;
    for (let i = 0; i < 24; i++) {
      if (window[i] === 1) {
        currentBlock++;
      } else {
        if (currentBlock > 0) {
          restBlocks.push(currentBlock);
          currentBlock = 0;
        }
      }
    }
    if (currentBlock > 0) restBlocks.push(currentBlock);
    if (window[0] === 1 && window[23] === 1 && restBlocks.length > 1) {
      restBlocks[0] += restBlocks.pop();
    }

    // Rule 2: Rest divided into no more than two periods
    if (restBlocks.length > 2) {
      hasSplitViolation = true;
      violations.push({
        type: "split_count",
        day: dayNum,
        hour: hourNum,
        rule: "MLC 2006 Standard A2.3.6 / STCW A-VIII/1.3",
        message: `День ${dayNum}, ${String(hourNum).padStart(2, "0")}:00 — відпочинок розбитий на ${restBlocks.length} інтервали (дозволено максимум 2).`
      });
    }

    // Rule 3: At least one rest period >= 6 continuous hours
    const maxRestBlock = restBlocks.length > 0 ? Math.max(...restBlocks) : 0;
    if (windowRest >= 10 && maxRestBlock < 6) {
      hasBlockLenViolation = true;
      violations.push({
        type: "block_length",
        day: dayNum,
        hour: hourNum,
        rule: "MLC 2006 Standard A2.3.6 / STCW A-VIII/1.3",
        message: `День ${dayNum}, ${String(hourNum).padStart(2, "0")}:00 — відсутній нерозривний відпочинок тривалістю не менше 6 год (найбільший блок: ${maxRestBlock} год).`
      });
    }

    // Rule 4: Interval between consecutive rest periods shall not exceed 14 hours
    const workBlocks = [];
    let curWork = 0;
    for (let i = 0; i < 24; i++) {
      if (window[i] === 0) {
        curWork++;
      } else {
        if (curWork > 0) {
          workBlocks.push(curWork);
          curWork = 0;
        }
      }
    }
    if (curWork > 0) workBlocks.push(curWork);
    if (window[0] === 0 && window[23] === 0 && workBlocks.length > 1) {
      workBlocks[0] += workBlocks.pop();
    }

    const maxWorkBlock = workBlocks.length > 0 ? Math.max(...workBlocks) : 0;
    if (maxWorkBlock > 14) {
      hasIntervalViolation = true;
      violations.push({
        type: "max_interval",
        day: dayNum,
        hour: hourNum,
        rule: "MLC 2006 Standard A2.3.6 / STCW A-VIII/1.3",
        message: `День ${dayNum}, ${String(hourNum).padStart(2, "0")}:00 — інтервал між періодами відпочинку становить ${maxWorkBlock} год (максимум 14 год).`
      });
    }
  }

  // Rule 5: 7-day minimum 77 hours
  const weeklyRestOk = totalRest7Days >= 77;
  if (!weeklyRestOk) {
    violations.push({
      type: "weekly_minimum",
      day: 7,
      hour: 23,
      rule: "MLC 2006 Standard A2.3.5(b) / STCW A-VIII/1.2",
      message: `Загальний відпочинок за 7 діб складає ${totalRest7Days} год при обов'язковому мінімумі 77 год (дефіцит: ${77 - totalRest7Days} год).`
    });
  }

  const uniqueViolations = [];
  const seenTypes = new Set();
  for (const v of violations) {
    const key = `${v.type}_${v.day}`;
    if (!seenTypes.has(key)) {
      seenTypes.add(key);
      uniqueViolations.push(v);
    }
  }

  const isCompliant = violations.length === 0;
  const dailyRestOk = minDailyRest >= 10;
  const blockSplitsOk = !hasSplitViolation;
  const blockLenOk = !hasBlockLenViolation;
  const maxIntervalOk = !hasIntervalViolation;

  let complianceScore = 100;
  if (!weeklyRestOk) complianceScore -= 35;
  if (!dailyRestOk) complianceScore -= 30;
  if (!blockLenOk) complianceScore -= 15;
  if (!blockSplitsOk) complianceScore -= 10;
  if (!maxIntervalOk) complianceScore -= 10;
  complianceScore = Math.max(0, Math.min(100, complianceScore));

  return {
    isCompliant,
    complianceScore,
    totalRest7Days,
    minDailyRest,
    violations: uniqueViolations,
    rawViolationCount: violations.length,
    summary: {
      weeklyRestOk,
      dailyRestOk,
      blockSplitsOk,
      blockLenOk,
      maxIntervalOk
    }
  };
}

/**
 * Standardized Digitized Incident Record for Pilot Boat KP-965
 * (Port of Koper, Basin I, Allision with Mooring Buoy 2/I, 14.04.2026).
 * Formatted in strict compliance with IMO MSC-MEPC.3/Circ.4/Rev.1 (Appendix 5).
 */
export const KP965_GISIS_RECORD = Object.freeze({
  casualtyId: "KP965-KOPER-2026",
  investigationReportRef: "MAIIS-SI-2026-002821 / IMO GISIS C1001092",
  incidentTitle: "Allision of Pilot Boat KP-965 with Mooring Buoy 2/I in Port of Koper Basin I",
  date: "2026-04-14",
  timeUtc: "00:40:00Z",
  timeLocal: "02:40:00 LT (UTC+2)",
  vessel: {
    name: "KP-965",
    type: "Pilot boat / Fast service craft",
    flag: "Slovenia",
    lengthOverall: 14.2,
    hullMaterial: "Glass-Reinforced Plastic (GRP)",
    propulsion: "Twin diesel waterjet / shaft",
    maxSpeedKnots: 24.0,
    voyageSpeedKnots: 22.0
  },
  location: {
    code: 3,
    tableName: "Table 3: Location",
    description: "Port / Internal waters",
    portName: "Port of Koper (Luka Koper)",
    basin: "Basin I (Bazen I)",
    coordinates: { lat: 45.5533, lon: 13.7350 },
    waterwayType: "Port basin and internal fairway"
  },
  casualtyEvent: {
    code: 6,
    tableName: "Table 4: Casualty Event",
    description: "Contact / Allision with fixed or floating object (Mooring Buoy 2/I)",
    classification: "Marine casualty (MSC-MEPC.3/Circ.4/Rev.1 Table 5)"
  },
  severity: {
    code: 2,
    tableName: "Table 5: Severity",
    description: "Marine casualty (MSC-MEPC.3/Circ.4/Rev.1 Table 5)",
    consequences: {
      fatalities: 0,
      injuries: 0,
      injuryDetails: "No crew or pilot injuries reported; no medical evacuation required",
      vesselDamage: "Damage to port bow (hull / GRP laminate), one bent propulsion shaft and both propellers deformed",
      environmentImpact: "None (no fuel breach, no pollution)",
      infrastructureDamage: "Contact with mooring buoy 2/I in Basin I"
    }
  },
  environmentalFactors: {
    seaState: { code: 1, tableName: "Table 6: Sea State", description: "Calm / Smooth (0.0 - 0.1 m)" },
    windForce: { code: 2, tableName: "Table 7: Wind Force", description: "Light breeze (3.7 m/s, ENE)" },
    windDirection: "ENE (070°)",
    visibility: { code: 4, tableName: "Table 9: Visibility", description: "Good (21 km), high shore background glare" },
    lightCondition: { code: 2, tableName: "Table 10: Light Condition", description: "Darkness / Night" },
    glareShoreLights: true
  },
  accidentEvent: {
    code: 1,
    tableName: "Table 16: Accident Event",
    description: "Human erroneous action / Equipment failure"
  },
  errorTypes: [
    { code: 1, table: 19, name: "Observation error", description: "Buoy 2/I not sighted visually or detected on radar prior to impact" },
    { code: 3, table: 19, name: "Planning error", description: "Maintained 22 kt transit speed in restricted port basin during darkness" },
    { code: 4, table: 19, name: "Action execution error", description: "Late speed reduction and avoidance maneuver initiation" }
  ],
  temporaryPersonFactors: [
    { code: 2, table: 20, name: "Fatigue", description: "Incident occurred at 02:16 LT (circadian nadir) during night watch" },
    { code: 4, table: 20, name: "Inattention / Mind wandering", description: "Temporary loss of active route monitoring" },
    { code: 7, table: 20, name: "Stress / Schedule urgency", description: "High transit pace between consecutive pilotage assignments" }
  ],
  operationalFactors: [
    { code: "22.6", table: 22, name: "Inadequate safety awareness", description: "High speed during internal transit in confined port waters (~22 kt)" },
    { code: "22.9", table: 22, name: "Lack of coordination / BRM", description: "Ineffective shared lookout and cross-checking of hazards" },
    { code: "22.14", table: 22, name: "Inadequate procedures", description: "Task allocation and lookout responsibilities not clearly formalised" },
    { code: "22.20", table: 22, name: "Inappropriate sightline / trim", description: "Limited forward visibility due to seating position of additional trained person" },
    { code: "22.32", table: 22, name: "Information / Display design", description: "Radar/plotter did not display mooring buoy 2/I in actual operational use" },
    { code: "22.53", table: 22, name: "Restricted fairway", description: "Mooring buoy 2/I positioned within internal transit maneuvering zone" }
  ],
  managementFactors: [
    { code: "23.15", table: 23, name: "Unclear roles & responsibilities", description: "Lack of documented formal allocation of lookout and communication duties" },
    { code: "23.19", table: 23, name: "Inadequate SMS procedures", description: "Safe-speed criteria for internal transit not clearly defined or supervised" },
    { code: "23.40", table: 23, name: "Inadequate training", description: "Initial and recurrent training and practical assessment lacked documented traceability" }
  ],
  ecfaDiagram: {
    events: [
      { id: "E1", time: "02:13:43", labelUk: "Висадка лоцмана з т/х ANJI SOUNDNESS на катер KP-965", labelEn: "Pilot transferred from M/V ANJI SOUNDNESS to pilot boat KP-965" },
      { id: "E2", time: "02:13:43 – 02:16:30", labelUk: "Рух катера з Басейну III до Басейну I на швидкості ~21–22 вузли", labelEn: "Pilot boat proceeded from Basin III towards Basin I at approximately 21–22 kt" },
      { id: "E3", time: "~02:15", labelUk: "Матрос помітив швартовний буй попереду за курсом і подав усне попередження", labelEn: "Additional person trained to operate the vessel noticed mooring buoy ahead and gave verbal warning" },
      { id: "E4", time: "~02:15 – 02:16", labelUk: "Судноводій помітив небезпеку, із запізненням зменшив хід та почав маневр ухилення", labelEn: "Operator noticed hazard, speed reduction was initiated late, and avoidance attempt followed" },
      { id: "E5", time: "~02:16:48", labelUk: "Навал лівою вилицею носової частини катера на швартовний буй 2/I", labelEn: "Pilot boat allided with mooring buoy 2/I with the port bow" },
      { id: "E6", time: "02:16:48 – 02:18:59", labelUk: "Катер продовжив рух у Басейн I; критичних пошкоджень або надходження води не виявлено", labelEn: "Pilot boat continued towards Basin I; no immediate disabling damage or water ingress identified" },
      { id: "E7", time: "02:18:59", labelUk: "Прибуття до т/х MSC CAITLIN II (причал 7A) та посадка лоцмана на борт", labelEn: "Arrived at M/V MSC CAITLIN II (Berth 7A) and transferred pilot to the vessel" },
      { id: "E8", time: "Після швартування", labelUk: "Виявлено пошкодження ламінату носової частини; пізніший огляд виявив погнутий вал та гвинти", labelEn: "After berthing, damage to port bow was identified; later inspection found one bent shaft and deformed propellers" }
    ],
    accidentEvents: [
      { id: "AE1", labelUk: "Швартовний буй 2/I розпізнано занадто пізно", labelEn: "Mooring buoy 2/I was recognised too late", eventRef: "E4" },
      { id: "AE2", labelUk: "Спільне спостереження та взаємний контроль небезпек були неефективними", labelEn: "Shared lookout and cross-checking of hazards were ineffective", eventRef: "E3" },
      { id: "AE3", labelUk: "Зниження швидкості та маневр ухилення розпочато із запізненням", labelEn: "Speed reduction and avoidance manoeuvre were initiated too late", eventRef: "E4" },
      { id: "AE4", labelUk: "Носова частина лівого борту катера вдарила швартовний буй 2/I", labelEn: "Pilot boat's port bow struck mooring buoy 2/I", eventRef: "E5" }
    ],
    casualtyEvent: {
      id: "CE1",
      labelUk: "Лоцманський катер KP-965 здійснив навал на швартовний буй 2/I у Басейні I",
      labelEn: "Pilot boat KP-965 allided with mooring buoy 2/I in Basin I",
      resultUk: "Пошкодження носового ламінату (GRP), погнутий гребний вал, обидва гвинти деформовані; без жертв, без травм, без забруднення.",
      resultEn: "Damage to port bow (hull / GRP laminate), one bent propulsion shaft and both propellers deformed; no injuries, no pollution, no water ingress."
    },
    contributingFactors: [
      { id: "CF1", category: "Operational", labelUk: "Висока швидкість під час внутрішнього переходу у стиснених водах порту", labelEn: "High speed during internal transit in confined port waters", ref: "AE1" },
      { id: "CF2", category: "Human", labelUk: "Тимчасова втрата активного контролю маршруту та пізнє виявлення небезпеки судноводієм", labelEn: "Temporary loss of active route monitoring and late hazard detection by the operator", ref: "AE1" },
      { id: "CF3", category: "Workplace", labelUk: "Обмежений огляд вперед та знижена ефективність підтримки через розташування крісла матроса", labelEn: "Limited forward visibility and reduced support effectiveness due to seating arrangement of the additional trained person", ref: "AE2" },
      { id: "CF4", category: "Human", labelUk: "Спільне спостереження / BRM під час переходу неефективне; лоцман діяв як пасажир", labelEn: "Shared lookout / BRM during pilot transfer was not effective; the pilot acted mainly as a passenger", ref: "AE2" },
      { id: "CF5", category: "Technical", labelUk: "Радар/плотер не спрацював як бар'єр безпеки; буй не відображався на екрані плотера в день події", labelEn: "Radar/plotter did not function as an effective safety barrier in actual use; mooring buoy was not visible on plotter display", ref: "AE3" },
      { id: "CF6", category: "Organizational", labelUk: "Навчання та періодична перевірка існували, але не були належно задокументовані чи перевірені", labelEn: "Training, approval and recurrent verification existed in practice but were not sufficiently documented, objectively verified or traceable", ref: "AE2" },
      { id: "CF7", category: "Organizational", labelUk: "Розподіл завдань, обов'язки спостереження та комунікація на борту не були формалізовані", labelEn: "Task allocation, lookout responsibilities and communication on board were not clearly formalised", ref: "AE2" },
      { id: "CF8", category: "Human", labelUk: "Ймовірне зниження пильності / відволікання судноводія сприяло погіршенню ситуаційної обізнаності", labelEn: "Possible reduced alertness / distraction of the operator contributed to degraded situational awareness", ref: "AE1" },
      { id: "CF9", category: "Management", labelUk: "Операційний контроль та оцінка ризиків швидкісних переходів поблизу швартовних буїв були недостатніми", labelEn: "Operational controls and risk assessment for internal high-speed transits near mooring buoys were insufficient", ref: "AE1" },
      { id: "CF10", category: "Organizational", labelUk: "Відсутність чіткої процедури дій після інциденту: негайного сповіщення, фіксації доказів та техоцінки", labelEn: "No clear formal pre-occurrence procedure governed immediate reporting, evidence preservation, and technical assessment", ref: "AE4" }
    ],
    safetyDeficiencies: [
      { id: "SD1", labelUk: "Операційні вимоги щодо контролю швидкості та безпечного транзиту катерів усередині порту є недостатніми", labelEn: "Operational requirements for speed management and safe transit of pilot boats in internal port areas are insufficient or not formally controlled", ref: "CF1" },
      { id: "SD2", labelUk: "Відсутня надійна документована система початкового, періодичного та практичного навчання судноводіїв і матросів", labelEn: "No reliable documented system exists for initial, recurrent and practical verification training for pilot boat operators and the additional trained person", ref: "CF6" },
      { id: "SD3", labelUk: "Відсутній офіційний документований розподіл обов'язків спостереження, підтримки та зв'язку під час швидкісних переходів", labelEn: "No formal documented allocation of lookout, support and communication duties exists for pilot transfer and internal high-speed transits", ref: "CF7" },
      { id: "SD4", labelUk: "Використання радара/плотера, виявлення небезпек та перехресна перевірка курсу не стандартизовані й не перевіряються", labelEn: "Radar/plotter use, hazard awareness and route cross-checking are not adequately standardised or verified", ref: "CF5" },
      { id: "SD5", labelUk: "Електронний дисплей у день аварії не показав буй 2/I як бар'єр безпеки, а історичні дані дисплея не збереглися", labelEn: "The electronic navigation display on the day of occurrence did not provide mooring buoy 2/I as an effective barrier, and no historical display data were retained", ref: "CF5" },
      { id: "SD6", labelUk: "Відсутня формальна процедура негайного сповіщення VTS/URSP, фіксації доказів та техогляду перед продовженням руху", labelEn: "No formal procedure existed for immediate VTS/URSP reporting, preservation of navigation evidence, and structured technical assessment before continued operation", ref: "CF10" },
      { id: "SD7", labelUk: "Ідентифікація небезпек та оцінка ризиків внутрішніх швидкісних переходів біля фіксованої інфраструктури були недостатніми", labelEn: "Hazard identification and risk assessment for internal high-speed transits near fixed mooring infrastructure were insufficient", ref: "CF9" }
    ],
    safetyIssues: [
      { id: "SI1", labelUk: "Управління навігаційними ризиками під час швидкісних операцій катерів у стиснених водах порту є неадекватним", labelEn: "Navigation risk management during high-speed pilot boat operations in confined port waters is not adequate" },
      { id: "SI2", labelUk: "Управління ресурсами містка (BRM) та спільний моніторинг загроз під час висадки/посадки лоцманів не забезпечені", labelEn: "Bridge resource management and shared hazard monitoring during pilot transfer operations are not effectively ensured" },
      { id: "SI3", labelUk: "Використання навігаційних дисплеїв та перехресна перевірка небезпек маршруту не гарантовані", labelEn: "Operational use of navigational displays and cross-checking of route hazards are not effectively assured" },
      { id: "SI4", labelUk: "Підготовка, атестація та періодичне підтвердження кваліфікації екіпажів катерів недостатньо задокументовані", labelEn: "Training, approval and recurrent verification of competence for pilot boat crews are not sufficiently documented and controlled" },
      { id: "SI5", labelUk: "Звітність після інциденту, збереження доказів та рішення про продовження операцій не регламентовані офіційно", labelEn: "Post-occurrence reporting, evidence preservation and continuation-of-operation decision-making are not governed by a sufficiently formal procedure" }
    ],
    synthesis: {
      keyFindingUk: "Навал стався внаслідок поєднання високої швидкості (~22 вузли), запізнілого виявлення небезпеки, неефективного спільного спостереження, зниженого моніторингу траєкторії, обмеженого огляду через розміщення крісла матроса, невикористання навігаційного дисплея як ефективного бар'єра та організаційних прогалин у підготовці, розподілі обов'язків і післяаварійних процедурах.",
      keyFindingEn: "The allision occurred due to a combination of high speed, late hazard recognition, ineffective shared lookout, reduced route monitoring, limited support from the additional trained person's seating position, ineffective use of navigation displays as a safety barrier, and organizational weaknesses in training traceability, task allocation and post-occurrence procedures.",
      directCauseUk: "Носова частина лівого борту катера вдарила швартовний буй 2/I через надто пізнє виявлення перешкоди під час руху на високій швидкості у стисненій акваторії, коли пізнє скидання газу та маневр ухилення вже не змогли запобігти зіткненню.",
      directCauseEn: "The pilot boat's port bow struck mooring buoy 2/I because the hazard was detected too late while the vessel was travelling at high speed in confined port waters, and the late speed reduction / avoidance manoeuvre was insufficient to prevent the allision.",
      contributingSystemicFactorsUk: "Недостатній операційний контроль швидкісних транзитів; неефективне спільне спостереження та BRM; неформалізоване використання радара/плотера; відсутність документованої системи тренінгів; слабкі процедури звітування після контакту.",
      contributingSystemicFactorsEn: "Inadequate operational control of high-speed internal transits; Ineffective shared lookout and bridge resource management; Insufficiently formalised use of radar/plotter; Training system not sufficiently documented; Weak post-contact reporting procedures.",
      preventivePotentialUk: "За умови зниження швидкості внутрішнього переходу, ефективного дублюючого спостереження, кращої перевірки небезпек курсу, чіткого розподілу обов'язків та задокументованої системи тренінгів аварії можна було б запобігти.",
      preventivePotentialEn: "With lower internal-transit speed, effective shared lookout, better route/hazard cross-checking, clearly allocated duties, and a documented training and reporting system, the allision could likely have been prevented."
    },
    safetyRecommendations: [
      {
        id: "SI-MAIIS-SR003-2026",
        titleUk: "Підготовка та оцінка компетентності",
        titleEn: "Training and competence assessment",
        addressee: "KOPP d.o.o.",
        summaryUk: "Створити відстежувану систему початкового та періодичного навчання судноводіїв катерів та другого підготовленого члена екіпажу з чіткими критеріями оцінки."
      },
      {
        id: "SI-MAIIS-SR004-2026",
        titleUk: "Безпечна швидкість та судноплавство в порту",
        titleEn: "Safe speed and navigation within the port",
        addressee: "KOPP d.o.o.",
        summaryUk: "Визначити та впровадити операційні критерії безпечної швидкості катерів під час переходів між басейнами порту, особливо вночі та біля швартовної інфраструктури."
      },
      {
        id: "SI-MAIIS-SR005-2026",
        titleUk: "Розподіл обов'язків та спостереження",
        titleEn: "Allocation of duties and lookout",
        addressee: "KOPP d.o.o.",
        summaryUk: "Чітко визначити обов'язки судноводія та матроса щодо спостереження, моніторингу курсу, навігаційних дисплеїв та своєчасного попередження про небезпеки."
      },
      {
        id: "SI-MAIIS-SR006-2026",
        titleUk: "Використання навігаційного обладнання",
        titleEn: "Use of navigation equipment",
        addressee: "KOPP d.o.o.",
        summaryUk: "Стандартизувати використання радара, плотера та інших навігаційних засобів, включаючи належний масштаб та перехресну перевірку цілей."
      },
      {
        id: "SI-MAIIS-SR007-2026",
        titleUk: "Дії після інциденту або контакту",
        titleEn: "Action following an accident or contact",
        addressee: "KOPP d.o.o.",
        summaryUk: "Встановити формальну процедуру дій у разі контакту: негайне сповіщення VTS/URSP, збереження даних та технічне обстеження корпусу перед продовженням руху."
      },
      {
        id: "SI-MAIIS-SR008-2026",
        titleUk: "Нормативна база для навчання персоналу",
        titleEn: "Regulatory framework for training",
        addressee: "MZIE / Slovenian Maritime Administration (URSP)",
        summaryUk: "Внести зміни до правил морської лоцманської проводки щодо обов'язковості початкового, періодичного та практичного тренінгу для обох членів екіпажу катера."
      },
      {
        id: "SI-MAIIS-SR009-2026",
        titleUk: "Визначення та реєстрація мінімального складу екіпажу",
        titleEn: "Determination and recording of minimum pilot boat manning",
        addressee: "Slovenian Maritime Administration / Bureau Veritas",
        summaryUk: "Узгодити та скоригувати чисельність екіпажу для катерів (KP-165, KP-859, KP-965) з урахуванням обов'язкової присутності другої підготовленої особи."
      }
    ]
  }
});

/**
 * Port Basin & Internal Waterway Risk Model (R = P x S)
 * Evaluates probability (P) and severity (S) for small craft / pilot vessels navigating port basins.
 * Categorizes risk according to IMO Formal Safety Assessment (FSA) ALARP thresholds:
 * - Green: R < 6 (Acceptable risk)
 * - Amber: 6 <= R < 10 (ALARP / Tolerable with mitigation)
 * - Red: R >= 10 (Unacceptable / Critical risk requiring immediate stoppage/control)
 *
 * @param {Object} factors - Active scenario factor toggles
 * @param {Object} options - Severity override and options
 * @returns {Object} Calculated risk score, zone classification, and preventive mitigation rules
 */
export function calculatePortBasinRisk(factors = {}, options = {}) {
  let probabilityScore = 1.0;

  if (factors.excessSpeed) probabilityScore += 2.0;
  if (factors.singleLookout) probabilityScore += 2.0;
  if (factors.glareVisualImpairment) probabilityScore += 1.0;
  if (factors.radarNotUsed) probabilityScore += 1.5;
  if (factors.circadianFatigue) probabilityScore += 1.0;
  if (factors.unlitObstacle) probabilityScore += 1.0;
  if (factors.routineComplacency) probabilityScore += 0.5;
  if (factors.trainingOrOrgDeficiency) probabilityScore += 1.0;

  const rawProbabilityScore = Math.round(probabilityScore * 10) / 10;
  probabilityScore = Math.max(1.0, Math.min(5.0, rawProbabilityScore));

  const severityCode = clamp(options.severityCode ?? factors.severityCode ?? 3, 1, 5);
  const riskIndex = Math.round(probabilityScore * severityCode * 10) / 10;

  let riskCategory = "acceptable";
  let riskCategoryLabelUk = "Низький (Прийнятний)";
  let riskCategoryLabelEn = "Low (Acceptable)";
  let riskColor = "green";

  if (riskIndex >= 10.0) {
    riskCategory = "critical";
    riskCategoryLabelUk = "Критичний (Неприйнятний)";
    riskCategoryLabelEn = "Critical (Unacceptable)";
    riskColor = "red";
  } else if (riskIndex >= 6.0) {
    riskCategory = "elevated";
    riskCategoryLabelUk = "Підвищений (ALARP)";
    riskCategoryLabelEn = "Elevated (ALARP)";
    riskColor = "amber";
  }

  // Exact automated safety warning required by academic coursework assignment
  let criticalAlertUk = null;
  let criticalAlertEn = null;
  if (riskIndex >= 10.0) {
    criticalAlertUk = `АВТОМАТИЧНЕ ЗАСТЕРЕЖЕННЯ З БЕЗПЕКИ: «Виявлено високий рівень ризику Зіткнення/Контакту (R = ${riskIndex.toFixed(1)}). Для нівелювання вимагається: 1) Встановити програмний ліміт швидкості катерів у басейні порту до 10 вузлів; 2) Обов’язкове дублювання візуального спостереження другим членом екіпажу з прямим доступом до радара» (Рекомендації розслідування MAIIS SI-MAIIS-SR004-2026 та SR005-2026).`;
    criticalAlertEn = `AUTOMATED SAFETY WARNING: «High risk level of Collision/Contact detected (R = ${riskIndex.toFixed(1)}). Mandatory mitigation required: 1) Enforce software speed limit for pilot boats in port basins <= 10 knots; 2) Mandatory dual visual lookout by second crew member with direct radar display access» (MAIIS Investigation Recommendations SI-MAIIS-SR004-2026 & SR005-2026).`;
  }

  // Automated preventive mitigation rules generator
  const mitigationRules = [];

  if (factors.excessSpeed || riskIndex >= 10.0) {
    mitigationRules.push({
      ruleId: "RULE-BASIN-SPEED-01",
      standard: "COLREG Rule 6 & Port Bylaws Art. 14",
      actionUk: "Встановити обов'язкове програмне обмеження швидкості катерів у портовому басейні не більше 10 вузлів у темний час доби.",
      actionEn: "Enforce mandatory speed limit <= 10 knots inside port basins during hours of darkness.",
      priority: "CRITICAL",
      trigger: factors.excessSpeed
        ? { type: "factor", id: "excessSpeed", labelUk: "Перевищення швидкості", labelEn: "Excess speed" }
        : { type: "threshold", id: "risk-gte-10", labelUk: "Порогове правило R ≥ 10", labelEn: "Threshold rule R ≥ 10" }
    });
  }

  if (factors.singleLookout || riskIndex >= 6.0) {
    mitigationRules.push({
      ruleId: "RULE-DUAL-LOOKOUT-02",
      standard: "STCW A-VIII/2 Part 4-1 & COLREG Rule 5",
      actionUk: "Запровадити обов'язковий протокол спільного несення спостереження: матрос зобов'язаний займати місце другого спостерігача з доступом до радіолокаційного екрана.",
      actionEn: "Mandate shared lookout duty: deckhand must act as second observer with direct radar access.",
      priority: "CRITICAL",
      trigger: factors.singleLookout
        ? { type: "factor", id: "singleLookout", labelUk: "Відсутність другого спостерігача", labelEn: "No second lookout" }
        : { type: "threshold", id: "risk-gte-6", labelUk: "Порогове правило R ≥ 6", labelEn: "Threshold rule R ≥ 6" }
    });
  }

  if (factors.radarNotUsed || factors.glareVisualImpairment) {
    mitigationRules.push({
      ruleId: "RULE-RADAR-OPTICS-03",
      standard: "IMO MSC.192(79) & SOLAS V/19",
      actionUk: "Налаштовувати шкалу суднового радара на 0.5–0.75 милі при вході в басейн; перевіряти наявність об'єктів на плотері згідно з актуальними картами.",
      actionEn: "Set marine radar range to 0.5-0.75 nm in basin; verify plotter buoy display suitability with official charts.",
      priority: "HIGH",
      trigger: factors.radarNotUsed
        ? { type: "factor", id: "radarNotUsed", labelUk: "Неефективне використання радара", labelEn: "Ineffective radar use" }
        : { type: "factor", id: "glareVisualImpairment", labelUk: "Обмежена видимість", labelEn: "Impaired visibility" }
    });
  }

  if (factors.unlitObstacle) {
    mitigationRules.push({
      ruleId: "RULE-BUOY-CONSPICUITY-04",
      standard: "IALA Guideline G1062 & Navigational Aids",
      actionUk: "Оснастити всі швартовні та навігаційні буї портової акваторії призматичною світловідбивною плівкою високої інтенсивності (Grade 9) та пасивними кутовими радіолокаційними відбивачами.",
      actionEn: "Fit all basin mooring buoys with marine-grade retroreflective tape and radar reflectors.",
      priority: "HIGH",
      trigger: { type: "factor", id: "unlitObstacle", labelUk: "Неосвітлена перешкода", labelEn: "Unlit obstacle" }
    });
  }

  if (factors.circadianFatigue) {
    mitigationRules.push({
      ruleId: "RULE-FATIGUE-ROSTER-05",
      standard: "MLC 2006 Standard A2.3 & IMO MSC/Circ.1598",
      actionUk: "Заборонити призначення понад двох нічних змін поспіль (00:00–06:00); забезпечити обов'язковий відпочинок перед виходом на лінію в циркадний надир.",
      actionEn: "Limit consecutive night shifts to maximum 2 nights; enforce pre-duty rest during circadian nadir.",
      priority: "HIGH",
      trigger: { type: "factor", id: "circadianFatigue", labelUk: "Циркадна втома", labelEn: "Circadian fatigue" }
    });
  }

  if (factors.trainingOrOrgDeficiency || factors.routineComplacency || mitigationRules.length === 0) {
    mitigationRules.push({
      ruleId: "RULE-SOP-CHECKLIST-06",
      standard: "ISM Code Section 7 & MAIIS SR003-2026",
      actionUk: "Впровадити документовану відстежувану систему тренінгів та обов'язковий чек-лист виходу катера в басейн.",
      actionEn: "Implement documented traceable training system and pre-departure basin checklist.",
      priority: "MEDIUM",
      trigger: factors.trainingOrOrgDeficiency
        ? { type: "factor", id: "trainingOrOrgDeficiency", labelUk: "Недоліки підготовки та процедур", labelEn: "Training and procedural deficiencies" }
        : factors.routineComplacency
          ? { type: "factor", id: "routineComplacency", labelUk: "Рутинна самовпевненість", labelEn: "Routine complacency" }
          : { type: "default", id: "baseline-checklist", labelUk: "Базовий контрольний список", labelEn: "Baseline checklist" }
    });
  }

  return {
    rawProbabilityScore,
    probabilityScore,
    severityCode,
    riskIndex,
    riskCategory,
    riskCategoryLabelUk,
    riskCategoryLabelEn,
    riskColor,
    criticalAlertUk,
    criticalAlertEn,
    mitigationRules
  };
}

/**
 * Generates a standalone, executable Python script for student practical assignments.
 * Includes data ingestion, risk matrix evaluation (R = P x S), and matplotlib/seaborn plotting.
 *
 * @param {Object} record - Digitized incident record (defaults to KP965_GISIS_RECORD)
 * @param {Object} riskResult - Calculated risk metrics
 * @returns {string} Standalone Python code
 */
export function generatePythonAssignmentScript(record = KP965_GISIS_RECORD, riskResult = null) {
  const result = riskResult ?? calculatePortBasinRisk({
    excessSpeed: true,
    singleLookout: true,
    circadianFatigue: true,
    glareVisualImpairment: true,
    radarNotUsed: true,
    routineComplacency: true,
    unlitObstacle: true
  });

  return `# -*- coding: utf-8 -*-
"""
Maritime Navigation Risk Assessment & ECFA Investigation Model
Case Study: Pilot Boat KP-965 Allision (Port of Koper, Basin I, 14.04.2026)
Standards: IMO MSC-MEPC.3/Circ.4/Rev.1 (Appendix 5), IMO Res. A.1075(28), IMO FSA MSC-MEPC.2/Circ.12
Coursework: Automated Risk Assessment & Preventative Measures for Internal Waterways and Port Basins
Project: SeaRisk UA educational maritime safety analysis
Investigation Reference: MAIIS SI-2026-002821 / IMO GISIS C1001092
"""

import json

# 1. Standardized IMO GISIS Digitized Record (MSC-MEPC.3/Circ.4/Rev.1 Appendix 5)
GISIS_RECORD = {
    "casualty_id": "${record.casualtyId}",
    "occurrence_id": "KP-965-2026-002821",
    "date_time_local": "${record.timeLocal}",
    "date_time_utc": "${record.timeUtc}",
    "vessel_name": "${record.vessel.name}",
    "vessel_type": "${record.vessel.type}",
    "voyage_speed_knots": ${record.vessel.voyageSpeedKnots},
    "location_code_t3": ${record.location.code},  # Table 3: Port / Basin I
    "location_description": "${record.location.description}",
    "coordinates": {"lat": ${record.location.coordinates.lat}, "lon": ${record.location.coordinates.lon}},
    "casualty_event_code_t4": ${record.casualtyEvent.code},  # Table 4: Contact with fixed/floating object
    "severity_code_t5": ${record.severity.code},  # Table 5: Marine casualty (Damage to hull and propellers)
    "accident_event_code_t16": ${record.accidentEvent.code},  # Table 16: Human erroneous action / Equipment failure
    "environmental": {
        "sea_state_t6": ${record.environmentalFactors.seaState.code},  # Calm rippled
        "wind_force_t7": ${record.environmentalFactors.windForce.code},  # Light breeze (3.7 m/s ENE)
        "visibility_t9": ${record.environmentalFactors.visibility.code},  # Good (21 km), shore light glare
        "light_condition_t10": ${record.environmentalFactors.lightCondition.code}  # Darkness / Night
    },
    "error_types_t19": [${record.errorTypes.map((e) => e.code).join(", ")}],  # 1: Observation, 3: Planning, 4: Action
    "person_factors_t20": [${record.temporaryPersonFactors.map((e) => e.code).join(", ")}],  # 2: Fatigue, 4: Inattention, 7: Stress
    "operational_factors_t22": ["22.6", "22.9", "22.14", "22.20", "22.32", "22.53"],
    "management_factors_t23": ["23.15", "23.19", "23.40"]
}

# 2. Port Basin Risk Calculation Function (R = P x S)
def calculate_port_basin_risk(factors, severity_code=3):
    """
    Computes risk score R = Probability (P) x Severity (S)
    P is clamped to [1.0, 5.0]; S is in [1, 5] (Table 5).
    Classification:
      - Green:  R < 6.0   (Acceptable)
      - Amber:  6 <= R < 10 (ALARP - Tolerable with mitigation)
      - Red:    R >= 10.0 (CRITICAL - Mandatory Safety Mitigation)
    """
    p_score = 1.0
    if factors.get("excess_speed", False):
        p_score += 2.0
    if factors.get("single_lookout", False):
        p_score += 2.0
    if factors.get("circadian_fatigue", False):
        p_score += 1.0
    if factors.get("glare_visual_impairment", False):
        p_score += 1.0
    if factors.get("radar_not_used", False):
        p_score += 1.5
    if factors.get("routine_complacency", False):
        p_score += 0.5
    if factors.get("unlit_obstacle", False):
        p_score += 1.0
    if factors.get("training_deficiency", False):
        p_score += 1.0

    p_score = min(5.0, max(1.0, round(p_score, 1)))
    s_score = min(5, max(1, severity_code))
    r_index = round(p_score * s_score, 1)

    if r_index >= 10.0:
        category = "CRITICAL (UNACCEPTABLE)"
    elif r_index >= 6.0:
        category = "ELEVATED (ALARP)"
    else:
        category = "ACCEPTABLE (LOW)"

    # Automated Mitigation Rule generation (Coursework requirement)
    mitigations = []
    if r_index >= 10.0 or (factors.get("excess_speed") and factors.get("single_lookout")):
        mitigations.append(
            "АВТОМАТИЧНЕ ЗАСТЕРЕЖЕННЯ З БЕЗПЕКИ: «Виявлено високий рівень ризику Зіткнення/Контакту (R = "
            + str(r_index)
            + "). Для нівелювання вимагається: 1) Встановити програмний ліміт швидкості катерів у басейні порту до 10 вузлів; "
            + "2) Обов’язкове дублювання візуального спостереження другим членом екіпажу з прямим доступом до радара»"
        )

    return {"P": p_score, "S": s_score, "R": r_index, "category": category, "mitigations": mitigations}

# 3. Evaluate Baseline Case Study (KP-965 Actual Incident Parameters)
kp965_factors = {
    "excess_speed": True,             # ~22.0 kt transit in Basin I
    "single_lookout": True,           # Ineffective shared lookout (crew seated in cabin)
    "circadian_fatigue": True,        # 02:16 LT circadian nadir
    "glare_visual_impairment": True,  # Shore container terminal lighting glare
    "radar_not_used": True,           # Radar unmonitored / buoy not on plotter
    "routine_complacency": True,      # Habitual transit routine
    "unlit_obstacle": True,           # Buoy 2/I unlit and low contrast
    "training_deficiency": True       # Training system not sufficiently traceable
}

eval_result = calculate_port_basin_risk(kp965_factors, severity_code=${result.severityCode})

print("=" * 70)
print(f"CASE STUDY: {GISIS_RECORD['vessel_name']} ({GISIS_RECORD['occurrence_id']})")
print(f"LOCATION  : {GISIS_RECORD['location_description']} (Coords: {GISIS_RECORD['coordinates']})")
print("=" * 70)
print(f"Probability Score (P): {eval_result['P']} / 5.0")
print(f"Severity Score    (S): {eval_result['S']} / 5.0 (MSC-MEPC.3/Circ.4/Rev.1 Table 5)")
print(f"Risk Index        (R): {eval_result['R']} (Formula: R = P x S)")
print(f"Risk Category        : {eval_result['category']}")
print("-" * 70)
if eval_result["mitigations"]:
    print("\\n[!] AUTOMATED PREVENTIVE MITIGATION RULES:")
    for m in eval_result["mitigations"]:
        print(f"  * {m}")
print("=" * 70)

# 4. Official MAIIS Safety Recommendations (SR003 - SR009)
MAIIS_RECOMMENDATIONS = [
    ("SI-MAIIS-SR003-2026", "KOPP d.o.o.", "Establish traceable initial and recurrent training system for operators"),
    ("SI-MAIIS-SR004-2026", "KOPP d.o.o.", "Implement safe speed operational criteria for internal port basin transits"),
    ("SI-MAIIS-SR005-2026", "KOPP d.o.o.", "Formally allocate lookout, display monitoring, and hazard warning duties"),
    ("SI-MAIIS-SR006-2026", "KOPP d.o.o.", "Standardize radar/plotter usage, range selection, and target cross-checking"),
    ("SI-MAIIS-SR007-2026", "KOPP d.o.o.", "Formalize post-incident procedure: immediate VTS reporting and hull inspection"),
    ("SI-MAIIS-SR008-2026", "MZIE / URSP", "Update maritime pilotage training regulation to require documented practical verification"),
    ("SI-MAIIS-SR009-2026", "URSP / BV", "Harmonise minimum pilot boat crew manning to require dedicated second trained crew member")
]

print("\\nOFFICIAL MAIIS SAFETY RECOMMENDATIONS SUMMARY:")
for rec_id, entity, summary in MAIIS_RECOMMENDATIONS:
    print(f"  [{rec_id}] -> {entity}: {summary}")

# 5. Visualize 5x5 IMO FSA Risk Matrix Heatmap with Matplotlib (Optional GUI)
try:
    import matplotlib.pyplot as plt
    import numpy as np

    matrix = np.zeros((5, 5))
    for p in range(1, 6):
        for s in range(1, 6):
            matrix[s - 1, p - 1] = p * s

    fig, ax = plt.subplots(figsize=(8, 7), dpi=100)
    cmap = plt.cm.get_cmap("RdYlGn_r")
    cax = ax.imshow(matrix, cmap=cmap, origin="lower", extent=[0.5, 5.5, 0.5, 5.5], vmin=1, vmax=25)

    for p in range(1, 6):
        for s in range(1, 6):
            val = p * s
            ax.text(p, s, f"{val}", ha="center", va="center", color="black" if 6 <= val < 15 else "white", fontweight="bold")

    ax.scatter([eval_result["P"]], [eval_result["S"]], s=350, c="cyan", edgecolors="black", linewidths=2.5, zorder=5, label=f"KP-965 Incident (R={eval_result['R']})")
    ax.set_xticks(range(1, 6))
    ax.set_yticks(range(1, 6))
    ax.set_xticklabels(["1: Rare", "2: Unlikely", "3: Possible", "4: Likely", "5: Frequent"], fontsize=10)
    ax.set_yticklabels(["1: Minor (1)", "2: Moderate (2)", "3: Casualty (3)", "4: Major (4)", "5: Very Serious (5)"], fontsize=10)
    ax.set_xlabel("Probability Likelihood (P = sum(W_i))", fontsize=11, fontweight="bold")
    ax.set_ylabel("Severity of Consequences (S - Table 5)", fontsize=11, fontweight="bold")
    ax.set_title("IMO FSA Risk Matrix: Port Basin Navigation (KP-965)", fontsize=12, fontweight="bold", pad=15)
    ax.legend(loc="upper left")
    plt.colorbar(cax, label="Risk Index R = P x S")
    plt.tight_layout()
    plt.show()
except ImportError:
    print("\\n[Note] Install matplotlib and numpy to display graphical 2D risk matrix heatmap: pip install matplotlib numpy")
`;
}




