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
      label: "Газовий аналіз та вентиляція трюмів при перевезенні небезпечних навалювальних вантажів (IMSBC Code)",
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
