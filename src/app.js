import {
  calculateRisk,
  evaluateMlcCompliance,
  generateWhatIfScenarios,
  generateChecklist,
  retrieveSimilarIncidents,
  evaluateFsaMatrix,
  calculateSensitivity,
  calculateCircadianFatigue,
  calculateOperationalWeatherRisk,
  evaluatePscSireReadiness,
  simulateEmergencyDrillFatigue,
  generateAcademicArtifacts,
  compareProfiles,
  generateOfflineWatchHandoverQr
} from "./model.js";

const $ = (selector) => document.querySelector(selector);
const form = $("#risk-form");

// Declarative list of checkbox field names — adding a new checkbox here is enough
const CHECKBOX_FIELDS = ["chronic", "ppe", "previous", "smoking", "alcohol"];

// Tri-lingual Maritime Dictionaries (UA 🇺🇦 / EN 🇬🇧 IMO SMCP / RU 🇷🇺)
let currentLang = "uk";

const roleLabelsByLang = {
  uk: {
    deck: "Палубна команда", engine: "Машинна команда", officer: "Командний склад",
    port: "Портові працівники", cadet: "Курсанти", diver: "Водолази",
    fishing: "Екіпаж риболовного судна", other_crew: "Інший екіпаж",
    non_crew: "Не члени екіпажу", unknown: "Роль не визначена"
  },
  en: {
    deck: "Deck Crew", engine: "Engine Crew", officer: "Bridge Officers / Masters",
    port: "Port Workers / Stevedores", cadet: "Cadets / Trainees", diver: "Commercial Divers",
    fishing: "Fishing Vessel Crew", other_crew: "Other Crew",
    non_crew: "Non-crew Personnel", unknown: "Role Undefined"
  },
  ru: {
    deck: "Палубная команда", engine: "Машинная команда", officer: "Командный состав",
    port: "Портовые рабочие", cadet: "Курсанты / практиканты", diver: "Водолазные специалисты",
    fishing: "Экипаж рыболовного судна", other_crew: "Другой экипаж",
    non_crew: "Не члены экипажа", unknown: "Роль не определена"
  }
};

const vesselLabelsByLang = {
  uk: {
    cargo: "Вантажне", cargo_dry: "Суховантажне", tanker: "Танкер / Газовоз / Хімовоз",
    container: "Контейнеровоз", bulker: "Балкер / Суховантаж", tug: "Буксир / Портофлот",
    passenger: "Пасажирське", fishing: "Риболовне", service: "Службове",
    service_offshore: "Службове / офшорне", recreational: "Прогулянкове",
    other: "Інше", unknown: "Тип не визначено"
  },
  en: {
    cargo: "General Cargo", cargo_dry: "Dry Cargo", tanker: "Tanker / Gas / Chemical",
    container: "Container Ship", bulker: "Bulk Carrier / General Cargo", tug: "Tug / Harbour Craft",
    passenger: "Passenger Vessel", fishing: "Fishing Vessel", service: "Service Vessel",
    service_offshore: "Offshore Supply", recreational: "Pleasure Craft",
    other: "Other", unknown: "Type Undefined"
  },
  ru: {
    cargo: "Грузовое", cargo_dry: "Сухогрузное", tanker: "Танкер / Газовоз / Химовоз",
    container: "Контейнеровоз", bulker: "Балкер / Сухогруз", tug: "Буксир / Портофлот",
    passenger: "Пассажирское", fishing: "Рыболовное", service: "Служебное",
    service_offshore: "Служебное / офшорное", recreational: "Прогулочное",
    other: "Другое", unknown: "Тип не определен"
  }
};

const watchLabelsByLang = {
  uk: {
    "4on8off": "3-вахтовий (4/8 — стандарт)",
    "6on6off": "2-вахтовий (6/6 — ризик втоми)",
    daywork: "Денна зміна (Day-work)"
  },
  en: {
    "4on8off": "3-watch system (4on/8off — standard)",
    "6on6off": "2-watch system (6on/6off — fatigue risk)",
    daywork: "Day-work (no night watches)"
  },
  ru: {
    "4on8off": "3-вахтенный (4/8 — стандарт)",
    "6on6off": "2-вахтенный (6/6 — риск усталости)",
    daywork: "Дневная смена (Day-work)"
  }
};

const eventLabelsByLang = {
  uk: {
    fall: "Падіння", machinery: "Механізми", mooring: "Швартування", fire: "Пожежа",
    collision: "Зіткнення", overboard: "За бортом", exposure: "Вплив речовин",
    personal_accident: "Нещасний випадок з людиною", equipment_damage: "Пошкодження обладнання",
    grounding_stranding: "Посадка на мілину", loss_of_control: "Втрата керування",
    capsizing_listing: "Перекидання / крен", contact: "Контакт",
    flooding_foundering: "Затоплення / загибель судна", hull_failure: "Пошкодження корпусу",
    fire_explosion: "Пожежа / вибух", heavy_weather_damage: "Пошкодження через негоду",
    vessel_missing: "Зникнення судна", unknown: "Тип не визначено"
  },
  en: {
    fall: "Fall from Height", machinery: "Machinery Hazard", mooring: "Mooring Operations", fire: "Fire Incident",
    collision: "Collision", overboard: "Man Overboard", exposure: "Hazardous Substances",
    personal_accident: "Personal Injury", equipment_damage: "Equipment Failure",
    grounding_stranding: "Grounding / Stranding", loss_of_control: "Loss of Control",
    capsizing_listing: "Capsizing / Listing", contact: "Contact / Allision",
    flooding_foundering: "Flooding / Foundering", hull_failure: "Hull Failure",
    fire_explosion: "Fire / Explosion", heavy_weather_damage: "Heavy Weather Damage",
    vessel_missing: "Vessel Missing", unknown: "Undefined"
  },
  ru: {
    fall: "Падение с высоты", machinery: "Судовые механизмы", mooring: "Швартовные операции", fire: "Пожар",
    collision: "Столкновение", overboard: "Человек за бортом", exposure: "Воздействие веществ",
    personal_accident: "Несчастный случай с человеком", equipment_damage: "Повреждение оборудования",
    grounding_stranding: "Посадка на мель", loss_of_control: "Потеря управляемости",
    capsizing_listing: "Опрокидывание / крен", contact: "Навал / контакт",
    flooding_foundering: "Затопление / гибель судна", hull_failure: "Повреждение корпуса",
    fire_explosion: "Пожар / взрыв", heavy_weather_damage: "Штормовые повреждения",
    vessel_missing: "Пропажа судна", unknown: "Тип не определен"
  }
};

const severityLabelsByLang = {
  uk: { none: "Без травм", injury: "Травмування", fatal: "Летальний наслідок" },
  en: { none: "No Injury", injury: "Non-fatal Injury", fatal: "Fatal Casualty" },
  ru: { none: "Без травм", injury: "Травмирование", fatal: "Летальный исход" }
};

const roleLabels = new Proxy({}, { get: (_, prop) => roleLabelsByLang[currentLang]?.[prop] ?? roleLabelsByLang.uk[prop] ?? prop });
const vesselLabels = new Proxy({}, { get: (_, prop) => vesselLabelsByLang[currentLang]?.[prop] ?? vesselLabelsByLang.uk[prop] ?? prop });
const watchLabels = new Proxy({}, { get: (_, prop) => watchLabelsByLang[currentLang]?.[prop] ?? watchLabelsByLang.uk[prop] ?? prop });
const eventLabels = new Proxy({}, { get: (_, prop) => eventLabelsByLang[currentLang]?.[prop] ?? eventLabelsByLang.uk[prop] ?? prop });
const severityLabels = new Proxy({}, { get: (_, prop) => severityLabelsByLang[currentLang]?.[prop] ?? severityLabelsByLang.uk[prop] ?? prop });
const severityColors = { none: "#22c7b8", injury: "#5fa8ff", fatal: "#e96b61" };

let incidents = [];
let datasetMeta = null;
let activeScenario = "Користувацький профіль";

// Security: escape HTML entities before inserting dynamic content into innerHTML
function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const demoScenarios = {
  cadet: {
    label: {
      uk: "Вигаданий сценарій · курсант",
      en: "Demo Scenario · Cadet",
      ru: "Учебный сценарий · курсант"
    },
    profile: { age: 20, sex: "male", residence: "city", chronic: false, role: "cadet", hours: 1200, night: 15, watchSystem: "4on8off", vesselType: "container", ppe: true, previous: false, smoking: false, alcohol: false }
  },
  engine: {
    label: {
      uk: "Вигаданий сценарій · механік",
      en: "Demo Scenario · Engineer",
      ru: "Учебный сценарий · механик"
    },
    profile: { age: 38, sex: "male", residence: "city", chronic: false, role: "engine", hours: 2600, night: 45, watchSystem: "6on6off", vesselType: "tanker", ppe: true, previous: true, smoking: false, alcohol: false }
  },
  deck: {
    label: {
      uk: "Вигаданий сценарій · палубна команда",
      en: "Demo Scenario · Deck Crew",
      ru: "Учебный сценарий · палубная команда"
    },
    profile: { age: 45, sex: "female", residence: "village", chronic: false, role: "deck", hours: 2800, night: 35, watchSystem: "4on8off", vesselType: "bulker", ppe: false, previous: false, smoking: false, alcohol: false }
  }
};

// Read all form fields directly from form.elements.
// FormData omits unchecked checkboxes, so we read them explicitly via CHECKBOX_FIELDS.
function currentInput() {
  const el = form.elements;
  return {
    age:         el.namedItem("age").value,
    sex:         el.namedItem("sex").value,
    residence:   el.namedItem("residence").value,
    role:        el.namedItem("role").value,
    hours:       el.namedItem("hours").value,
    night:       el.namedItem("night").value,
    watchSystem: el.namedItem("watchSystem")?.value || "4on8off",
    vesselType:  el.namedItem("vesselType")?.value || "container",
    ...Object.fromEntries(CHECKBOX_FIELDS.map((name) => [name, el.namedItem(name).checked]))
  };
}

function applyProfile(profile) {
  for (const [key, value] of Object.entries(profile)) {
    const control = form.elements.namedItem(key);
    if (!control) continue;
    if (control.type === "checkbox") control.checked = Boolean(value);
    else control.value = String(value);
  }
}

function asPercent(value, digits = value < 0.001 ? 4 : 2) {
  const locale = currentLang === "en" ? "en-GB" : (currentLang === "ru" ? "ru-RU" : "uk-UA");
  return new Intl.NumberFormat(locale, { style: "percent", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

function asDisplayPercent(value) {
  if (!value || value === 0) return "0%";
  if (value >= 0.01) return asPercent(value, 1);
  if (value >= 0.001) return asPercent(value, 2);
  if (value >= 0.0001) return asPercent(value, 3);
  return asPercent(value, 4);
}

function asWholeShare(value) {
  return value > 0 && value < 0.005 ? "<1%" : asPercent(value, 0);
}

// Guard: log10(0) = -Infinity and log10 of NaN/Infinity would break superscript rendering
function asIndex(value) {
  if (value === 0) return "0";
  if (!isFinite(value) || isNaN(value)) return value.toExponential(2);
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  if (!isFinite(exponent)) return value.toExponential(2);
  const coefficient = value / (10 ** exponent);
  const superscript = String(exponent)
    .replace("-", "⁻")
    .replaceAll("0", "⁰").replaceAll("1", "¹").replaceAll("2", "²").replaceAll("3", "³")
    .replaceAll("4", "⁴").replaceAll("5", "⁵").replaceAll("6", "⁶").replaceAll("7", "⁷")
    .replaceAll("8", "⁸").replaceAll("9", "⁹");
  const locale = currentLang === "en" ? "en-GB" : (currentLang === "ru" ? "ru-RU" : "uk-UA");
  return `${coefficient.toLocaleString(locale, { maximumFractionDigits: 2 })} × 10${superscript}`;
}

function renderLiveRadar(result, input) {
  const poly = $("#live-radar-poly");
  const markers = $("#live-radar-markers");
  if (!poly || !markers) return;

  const cx = 120, cy = 98, maxR = 68;
  const valHealth = Math.min(1, Math.max(0.15, (result.components.health || 0.001) / 0.04));
  const valHours  = Math.min(1, Math.max(0.15, Number(input.hours) / 3200));
  const valNight  = Math.min(1, Math.max(0.15, Number(input.night) / 60));
  const valLife   = Math.min(1, Math.max(0.15, (result.components.lifestyle > 0 ? 0.8 : 0.15)));
  const valPpe    = input.ppe ? 0.2 : 0.85;

  const values = [valHealth, valHours, valNight, valLife, valPpe];
  const points = values.map((val, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const r = 16 + val * (maxR - 16);
    const x = (cx + r * Math.cos(angle)).toFixed(1);
    const y = (cy + r * Math.sin(angle)).toFixed(1);
    return [x, y];
  });

  poly.setAttribute("points", points.map(([x, y]) => `${x},${y}`).join(" "));
  markers.innerHTML = points.map(([x, y]) =>
    `<circle cx="${x}" cy="${y}" r="3.5" fill="var(--cyan-dark)" stroke="#ffffff" stroke-width="1.5" />`
  ).join("");
}

function renderSensitivity(input) {
  const bars = $("#sensitivity-bars");
  const leadBadge = $("#sensitivity-lead-factor");
  if (!bars) return;
  const list = calculateSensitivity(input);
  const t = I18N[currentLang];
  if (!list || list.length === 0) {
    bars.innerHTML = `<p class="what-if-empty">${escapeHtml(t.sensEmpty)}</p>`;
    if (leadBadge) leadBadge.textContent = t.sensMinImpact;
    return;
  }

  const factorNameMap = {
    ppe: { uk: "Використання ЗІЗ", en: "PPE Compliance", ru: "Использование СИЗ" },
    hours: { uk: "Річне навантаження", en: "Annual Workload", ru: "Годовая нагрузка" },
    night: { uk: "Нічні зміни", en: "Night Watches", ru: "Ночные смены" },
    lifestyle: { uk: "Спосіб життя (тютюн/алкоголь)", en: "Lifestyle (Smoking/Alcohol)", ru: "Образ жизни (курение/алкоголь)" }
  };
  const categoryNameMap = {
    "Охорона праці": { uk: "Охорона праці", en: "Safety Culture", ru: "Охрана труда" },
    "Втома та ергономіка": { uk: "Втома та ергономіка", en: "Fatigue & Ergonomics", ru: "Усталость и эргономика" },
    "Здоров'я та звички": { uk: "Здоров'я та звички", en: "Health & Habits", ru: "Здоровье и привычки" }
  };

  const topName = factorNameMap[list[0].id]?.[currentLang] || list[0].name;
  if (leadBadge) leadBadge.textContent = `${t.sensLeadFactor}: ${topName} (${list[0].weightPercent}%)`;

  bars.innerHTML = list.map((item) => {
    const locName = factorNameMap[item.id]?.[currentLang] || item.name;
    const locCat = categoryNameMap[item.category]?.[currentLang] || item.category;
    let currSet = item.currentSetting;
    let optSet = item.optimalSetting;
    if (currentLang === "en") {
      currSet = currSet.replace("так", "yes").replace("ні", "no").replace("год/рік", "h/yr").replace("нічних", "night");
      optSet = optSet.replace("так", "yes").replace("ні", "no").replace("год/рік", "h/yr").replace("нічних", "night");
    } else if (currentLang === "ru") {
      currSet = currSet.replace("так", "да").replace("ні", "нет").replace("год/рік", "ч/год").replace("нічних", "ночных");
      optSet = optSet.replace("так", "да").replace("ні", "нет").replace("год/рік", "ч/год").replace("нічних", "ночных");
    }
    return `
    <div class="tornado-row">
      <div class="tornado-info">
        <div class="tornado-title">
          <strong>${escapeHtml(locName)}</strong>
          <span class="tornado-cat">${escapeHtml(locCat)}</span>
        </div>
        <div class="tornado-meta">
          <small>${escapeHtml(t.sensCurrent)}: ${escapeHtml(currSet)} → ${escapeHtml(t.sensOptimal)}: ${escapeHtml(optSet)}</small>
        </div>
      </div>
      <div class="tornado-bar-wrap">
        <div class="tornado-track">
          <div class="tornado-fill ${item.id === "ppe" && !input.ppe ? "danger" : ""}" style="width: ${Math.max(8, item.weightPercent)}%"></div>
        </div>
        <strong class="tornado-pct">${item.weightPercent}%</strong>
      </div>
    </div>
  `;
  }).join("");
}

const fsaRowsByLang = {
  uk: [
    { si: 4, label: "SI-4: Катастрофічні" },
    { si: 3, label: "SI-3: Важкі" },
    { si: 2, label: "SI-2: Значні" },
    { si: 1, label: "SI-1: Незначні" }
  ],
  en: [
    { si: 4, label: "SI-4: Catastrophic" },
    { si: 3, label: "SI-3: Severe" },
    { si: 2, label: "SI-2: Significant" },
    { si: 1, label: "SI-1: Minor" }
  ],
  ru: [
    { si: 4, label: "SI-4: Катастрофические" },
    { si: 3, label: "SI-3: Тяжелые" },
    { si: 2, label: "SI-2: Значительные" },
    { si: 1, label: "SI-1: Незначительные" }
  ]
};

const fsaRegionsByLang = {
  uk: {
    acceptable: { short: "Прийнятний", title: "Broadly Acceptable (Прийнятний)", action: "Ризик знаходиться у межах норми. Дотримуватися стандартних суднових процедур безпеки (SMS)." },
    alarp: { short: "Зона ALARP", title: "ALARP (As Low As Reasonably Practicable)", action: "Зона ALARP: ризик допустимий виключно за умови реалізації активних заходів зниження (носіння ЗІЗ, нормалізація сну)." },
    unacceptable: { short: "Неприпустимий", title: "Unacceptable / Intolerable (Неприпустимий)", action: "Критичний рівень! Негайне зупинення робіт за процедурою Stop Work Authority, перегляд штатного розкладу та відпочинку." }
  },
  en: {
    acceptable: { short: "Acceptable", title: "Broadly Acceptable", action: "Risk is within standard operational thresholds. Maintain shipboard Safety Management System (SMS) compliance." },
    alarp: { short: "ALARP Zone", title: "ALARP (As Low As Reasonably Practicable)", action: "ALARP region: risk tolerable only under active risk control mitigations (mandatory certified PPE, fatigue prevention)." },
    unacceptable: { short: "Unacceptable", title: "Unacceptable / Intolerable", action: "Critical risk! Immediate Stop Work Authority intervention, revision of watch schedules and rest periods." }
  },
  ru: {
    acceptable: { short: "Приемлемый", title: "Broadly Acceptable (Приемлемый)", action: "Риск находится в пределах нормы. Соблюдать стандартные судовые процедуры безопасности (СУБ/SMS)." },
    alarp: { short: "Зона ALARP", title: "ALARP (Допустимый при условии снижения)", action: "Зона ALARP: риск допустим только при реализации активных мер снижения (ношение СИЗ, нормализация сна)." },
    unacceptable: { short: "Недопустимый", title: "Unacceptable / Intolerable (Недопустимый)", action: "Критический уровень! Немедленная остановка работ по процедуре Stop Work Authority, пересмотр расписания вахт и отдыха." }
  }
};

function renderFsaMatrix(result, input) {
  const grid = $("#fsa-matrix-grid");
  const badge = $("#fsa-matrix-badge");
  const title = $("#fsa-region-title");
  const action = $("#fsa-region-action");
  if (!grid) return;

  const t = I18N[currentLang];
  const fsa = evaluateFsaMatrix(result, input);
  const regData = fsaRegionsByLang[currentLang]?.[fsa.region] || fsaRegionsByLang.uk[fsa.region];

  if (badge) {
    badge.textContent = `RI = ${fsa.ri} · ${regData.short}`;
    badge.className = `fsa-matrix-badge fsa-${fsa.region}`;
  }
  if (title) title.textContent = `${t.fsaRiskIndex} RI = ${fsa.ri} (${regData.title})`;
  if (action) action.textContent = regData.action;

  const rows = fsaRowsByLang[currentLang] || fsaRowsByLang.uk;
  const cols = [
    { fi: 1, label: "FI-1 (<10⁻⁴)" },
    { fi: 2, label: "FI-2 (0.01%)" },
    { fi: 3, label: "FI-3 (0.1%–1%)" },
    { fi: 4, label: "FI-4 (≥1%)" }
  ];

  let html = `<div class="fsa-cell fsa-header-cell">${escapeHtml(t.fsaHeaderCell)}</div>`;
  cols.forEach((col) => {
    html += `<div class="fsa-cell fsa-col-header ${col.fi === fsa.fi ? "active-axis" : ""}">${escapeHtml(col.label)}</div>`;
  });

  rows.forEach((row) => {
    html += `<div class="fsa-cell fsa-row-header ${row.si === fsa.si ? "active-axis" : ""}">${escapeHtml(row.label)}</div>`;
    cols.forEach((col) => {
      const riVal = row.si + col.fi;
      let regClass = "cell-acceptable";
      if (riVal >= 7) regClass = "cell-unacceptable";
      else if (riVal >= 4) regClass = "cell-alarp";

      const isCurrent = (row.si === fsa.si && col.fi === fsa.fi);
      html += `
        <div class="fsa-cell ${regClass} ${isCurrent ? "current-cell" : ""}" title="SI: ${row.si}, FI: ${col.fi} → RI: ${riVal}">
          <span class="ri-score">${riVal}</span>
          ${isCurrent ? `<span class="current-marker">${escapeHtml(t.fsaMarker)}</span>` : ""}
        </div>
      `;
    });
  });

  grid.innerHTML = html;
}

const kssLabelsByLang = {
  uk: [
    "",
    "Надзвичайно бадьорий",
    "Дуже бадьорий",
    "Бадьорий",
    "Досить бадьорий",
    "Ані бадьорий, ані сонливий",
    "Початкова сонливість",
    "Сонливий, без зусиль",
    "Сонливий, з зусиллями",
    "Критично сонливий"
  ],
  en: [
    "",
    "Extremely alert",
    "Very alert",
    "Alert",
    "Fairly alert",
    "Neither alert nor sleepy",
    "Some signs of sleepiness",
    "Sleepy, no effort needed",
    "Sleepy, effort required",
    "Extremely sleepy / fighting sleep"
  ],
  ru: [
    "",
    "Предельно бодрый",
    "Очень бодрый",
    "Бодрый",
    "Достаточно бодрый",
    "Ни бодрый, ни сонный",
    "Начальная сонливость",
    "Сонный, без усилий",
    "Сонный, с усилиями",
    "Критически сонный"
  ]
};

function renderCircadian(input) {
  const t = I18N[currentLang];
  const tzShift = Number($("#tz-shift-slider")?.value || 0);
  const tzDisp = $("#tz-shift-display");
  if (tzDisp) tzDisp.textContent = `Δ ${tzShift} ${t.hoursUnit}`;

  const circ = calculateCircadianFatigue(input, { timezoneShiftHours: tzShift });
  const bars = $("#circadian-bars");
  const kssNum = $("#kss-number");
  const kssLbl = $("#kss-label");
  const kssPill = $("#kss-pill");
  const sleepDebtStat = $("#sleep-debt-stat");
  const nadirStat = $("#nadir-time-stat");
  const fatigueStat = $("#fatigue-status-stat");
  const recsList = $("#circadian-recs");

  if (kssNum) kssNum.textContent = `KSS ${circ.kssScore}`;
  if (kssLbl) kssLbl.textContent = kssLabelsByLang[currentLang]?.[circ.kssScore] || circ.kssLabel;
  if (kssPill) {
    kssPill.dataset.level = circ.kssScore >= 7 ? "danger" : (circ.kssScore >= 5 ? "warning" : "optimal");
  }
  if (sleepDebtStat) sleepDebtStat.textContent = `${circ.sleepDebtHours} ${t.hrsPerWeek}`;
  if (nadirStat) nadirStat.textContent = circ.peakVulnerabilityTime;
  if (fatigueStat) {
    fatigueStat.textContent = circ.kssScore >= 7 ? t.fatigueCritical : (circ.kssScore >= 5 ? t.fatigueElevated : t.fatigueControlled);
    fatigueStat.className = circ.kssScore >= 7 ? "status-danger" : (circ.kssScore >= 5 ? "status-warning" : "status-optimal");
  }

  if (bars) {
    bars.innerHTML = circ.curve24h.map((p) => {
      const heightPercent = Math.max(10, p.alertness);
      const isNadir = p.hour >= 2 && p.hour <= 5;
      const barClass = [
        "circ-bar",
        p.isWatchTime ? "is-watch" : "",
        isNadir ? "is-nadir" : ""
      ].filter(Boolean).join(" ");
      return `<div class="${barClass}" style="--bar-h:${heightPercent}%" title="${String(p.hour).padStart(2, "0")}:00 · ${t.circAlertness} ${p.alertness}%${p.isWatchTime ? " (" + t.circWatchBadge + ")" : ""}"></div>`;
    }).join("");
  }

  if (recsList) {
    if (circ.recommendations.length > 0) {
      recsList.innerHTML = circ.recommendations.map((r) => {
        let text = r;
        if (currentLang === "en") {
          if (r.includes("Кумулятивний дефіцит")) text = `Cumulative sleep debt is ${circ.sleepDebtHours} hrs/week: 10-hour restorative rest period required.`;
          else if (r.includes("Десинхроноз")) text = `Circadian desynchronosis (${tzShift}h shift): biological adaptation requires ~${Math.ceil(tzShift / 1.2)} days; pre-departure sleep adjustment advised.`;
          else if (r.includes("критичної сонливості")) text = `Critical fatigue (KSS ${circ.kssScore}): solitary hazardous watchkeeping duties strictly prohibited without companion.`;
          else if (r.includes("Циркадний мінімум")) text = `Circadian nadir (03:00–05:00): mandatory bridge lookout and BNWAS monitoring.`;
        } else if (currentLang === "ru") {
          if (r.includes("Кумулятивний дефіцит")) text = `Кумулятивный дефицит сна составляет ${circ.sleepDebtHours} ч/неделю: необходим 10-часовой компенсационный отдых.`;
          else if (r.includes("Десинхроноз")) text = `Десинхроноз при смене часовых поясов (сдвиг на ${tzShift} ч): биологическая адаптация займет ~${Math.ceil(tzShift / 1.2)} суток; рекомендуется предварительный сдвиг сна.`;
          else if (r.includes("критичної сонливості")) text = `Критическая сонливость (KSS ${circ.kssScore}): категорически запрещены ответственные одиночные работы без напарника.`;
          else if (r.includes("Циркадний мінімум")) text = `Циркадный минимум бдительности (03:00–05:00): обязательное выставление впередсмотрящего и активация BNWAS.`;
        }
        return `<li>${escapeHtml(text)}</li>`;
      }).join("");
    } else {
      recsList.innerHTML = `<li>${escapeHtml(t.circBalancedText)}</li>`;
    }
  }
}

const seaStateLabelsByLang = {
  uk: ["0 балів (Штиль)", "1 бал (Тихий)", "2 бали (Легкий)", "3 бали (Слабкий)", "4 бали (Помірний)", "5 балів (Свіжий)", "6 балів (Сильний)", "7 балів (Міцний)", "8 балів (Дуже міцний)", "9 балів (Шторм)", "10 балів (Сильний шторм)", "11 балів (Жорстокий шторм)", "12 балів (Ураган)"],
  en: ["Beaufort 0 (Calm)", "Beaufort 1 (Light air)", "Beaufort 2 (Light breeze)", "Beaufort 3 (Gentle breeze)", "Beaufort 4 (Moderate breeze)", "Beaufort 5 (Fresh breeze)", "Beaufort 6 (Strong breeze)", "Beaufort 7 (Near gale)", "Beaufort 8 (Gale)", "Beaufort 9 (Severe gale)", "Beaufort 10 (Storm)", "Beaufort 11 (Violent storm)", "Beaufort 12 (Hurricane)"],
  ru: ["0 баллов (Штиль)", "1 балл (Тихий)", "2 балла (Легкий)", "3 балла (Слабый)", "4 балла (Умеренный)", "5 баллов (Свежий)", "6 баллов (Сильный)", "7 баллов (Крепкий)", "8 баллов (Очень крепкий)", "9 баллов (Шторм)", "10 баллов (Сильный шторм)", "11 баллов (Жестокий шторм)", "12 баллов (Ураган)"]
};

function renderWeatherRisk(input) {
  const t = I18N[currentLang];
  const beaufort = Number($("#beaufort-slider")?.value ?? 3);
  const polarZone = Boolean($("#polar-zone-toggle")?.checked);
  const engineHeat = Boolean($("#engine-heat-toggle")?.checked);

  const weather = calculateOperationalWeatherRisk(input, { beaufort, polarZone, engineHeat });

  const valDisplay = $("#beaufort-val-display");
  if (valDisplay) valDisplay.textContent = `${weather.beaufort} ${t.beaufortUnit}`;

  const seaBadge = $("#sea-state-badge");
  if (seaBadge) seaBadge.textContent = seaStateLabelsByLang[currentLang]?.[weather.beaufort] || weather.seaStateLabel;

  const msiDisplay = $("#msi-display");
  if (msiDisplay) msiDisplay.textContent = `${weather.msiPercent}%`;

  const slipDisplay = $("#slip-display");
  if (slipDisplay) slipDisplay.textContent = `× ${weather.slipMultiplier.toFixed(1)}`;

  const warnBox = $("#weather-warnings");
  if (warnBox) {
    if (weather.warnings.length > 0) {
      warnBox.innerHTML = weather.warnings.map((w) => {
        let title = w.title;
        let advice = w.advice;
        if (currentLang === "en") {
          if (w.title.includes("Шкала Бофорта")) {
            title = `Beaufort Scale ${weather.beaufort} · Heavy Seas Hazard`;
            advice = "Heavy rolling and pitch accelerations: suspend all non-essential deck maintenance, lash all portable deck items, enforce safety harnesses with lifelines.";
          } else if (w.title.includes("Polar Code")) {
            title = "IMO Polar Code · Sea Spray Icing Hazard";
            advice = "Sub-zero spray icing threatens vessel transverse stability: deploy anti-icing steam/mallets, monitor deck ice accretion and freeboard.";
          } else if (w.title.includes("Тепловий стрес")) {
            title = "Engine Room Thermal Heat Stress (WBGT > 32°C)";
            advice = "Risk of heat exhaustion and cognitive disorientation: enforce 20-minute rest-in-air-conditioned-control-room cycles and mandatory hydration.";
          }
        } else if (currentLang === "ru") {
          if (w.title.includes("Шкала Бофорта")) {
            title = `Шкала Бофорта ${weather.beaufort} баллов · Штормовое море`;
            advice = "Экстремальная бортовая и килевая качка: прекратить работы на открытой палубе, раскрепить подвижные предметы, применять страховочные пояса.";
          } else if (w.title.includes("Polar Code")) {
            title = "IMO Polar Code · Риск обледенения";
            advice = "Замерзание брызг угрожает поперечной остойчивости: применять противообледенительный инвентарь, контролировать толщину льда и надводный борт.";
          } else if (w.title.includes("Тепловий стрес")) {
            title = "Тепловой стресс машинного отделения (WBGT > 32°C)";
            advice = "Опасность теплового удара и когнитивных нарушений: ввести циклы отдыха по 20 минут в ЦПУ с кондиционером и обязательное регидратирование.";
          }
        }
        return `
        <div class="weather-alert weather-${escapeHtml(w.severity)}">
          <strong>${escapeHtml(title)}</strong>
          <p>${escapeHtml(advice)}</p>
        </div>
      `;
      }).join("");
    } else {
      warnBox.innerHTML = `<div class="weather-alert weather-calm"><strong>${escapeHtml(t.weatherCalmTitle)}</strong><p>${escapeHtml(t.weatherCalmAdvice)}</p></div>`;
    }
  }
}

function renderPscSire(input) {
  const t = I18N[currentLang];
  const psc = evaluatePscSireReadiness(input);
  const scoreDisp = $("#psc-score-display");
  const statusLabel = $("#psc-status-label");
  const defBox = $("#psc-deficiencies-list");
  const capBox = $("#psc-cap-box");
  const capList = $("#psc-cap-list");

  if (scoreDisp) scoreDisp.textContent = psc.readinessScore;
  if (statusLabel) {
    const statusText = psc.readinessScore >= 85 ? t.pscOptimal : (psc.readinessScore >= 65 ? t.pscWarning : t.pscCritical);
    statusLabel.textContent = statusText;
    statusLabel.dataset.score = psc.readinessScore < 65 ? "critical" : (psc.readinessScore < 85 ? "warning" : "optimal");
  }

  if (defBox) {
    if (psc.deficiencies.length > 0) {
      defBox.innerHTML = psc.deficiencies.map((d) => {
        let desc = d.description;
        if (currentLang === "en") {
          if (d.code === "01220") desc = "MLC 2006 Standard A2.3 / STCW A-VIII/1: Breach of mandatory rest periods (annual exposure >2,600h or >40% night work). Detainable deficiency.";
          else if (d.code === "07109") desc = "ISM Code 6.2 / ILO C152: Non-compliance or lack of mandatory certified PPE during high-risk shipboard operations.";
          else if (d.code.startsWith("SIRE-HF")) desc = "OCIMF SIRE 2.0 Human Factors: Elevated fatigue and cognitive distraction risks identified on tanker operations.";
        } else if (currentLang === "ru") {
          if (d.code === "01220") desc = "MLC 2006 Standard A2.3 / STCW A-VIII/1: Нарушение обязательных норм отдыха (годовая нагрузка >2600 ч или >40% ночных часов). Задерживаемое замечание.";
          else if (d.code === "07109") desc = "ISM Code 6.2 / ILO C152: Отсутствие или неиспользование обязательных сертифицированных СИЗ при судовых работах повышенной опасности.";
          else if (d.code.startsWith("SIRE-HF")) desc = "OCIMF SIRE 2.0 Human Factors: Повышенный риск утомления экипажа наливного флота при 2-вахтенном цикле 6/6 и коротких стоянках.";
        }
        return `
        <div class="psc-deficiency psc-${escapeHtml(d.severity)}">
          <div class="psc-def-top">
            <span class="psc-code">Code ${escapeHtml(d.code)}</span>
            <small>${escapeHtml(d.convention)}</small>
          </div>
          <p>${escapeHtml(desc)}</p>
        </div>
      `;
      }).join("");
    } else {
      defBox.innerHTML = `<p class="psc-clean">${escapeHtml(t.pscCleanText)}</p>`;
    }
  }

  if (capBox && capList) {
    if (psc.correctiveActions.length > 0) {
      capBox.hidden = false;
      capList.innerHTML = psc.correctiveActions.map((action, idx) => {
        let act = action;
        if (currentLang === "en") {
          if (idx === 0) act = "Revise watchkeeping roster to guarantee minimum 10h rest in any 24h window (MLC 2006 Standard A2.3).";
          else if (idx === 1) act = "Enforce 100% compliance with certified PPE (helmets, steel-toe boots, fall arrest harnesses).";
          else act = "Implement OCIMF SIRE 2.0 Human Factors alertness management on board tanker fleet.";
        } else if (currentLang === "ru") {
          if (idx === 0) act = "Пересмотреть расписание вахт для гарантии минимума 10 ч отдыха в 24-часовой период (MLC 2006).";
          else if (idx === 1) act = "Обеспечить 100% применение сертифицированных СИЗ (каски, спецобувь, страховочные пояса).";
          else act = "Внедрить политику OCIMF Human Factors Management для контроля бдительности на танкерах.";
        }
        return `<li>${escapeHtml(act)}</li>`;
      }).join("");
    } else {
      capBox.hidden = true;
    }
  }
}

function renderEmergencyDrill(input) {
  const t = I18N[currentLang];
  const drillSelect = $("#drill-type-select");
  const drillType = drillSelect?.value || "fire";
  const drill = simulateEmergencyDrillFatigue(input, drillType);

  const delayDisplay = $("#drill-delay-display");
  const errorDisplay = $("#drill-error-display");
  const readinessDisplay = $("#drill-readiness-display");
  const adviceText = $("#drill-advice-text");

  if (delayDisplay) delayDisplay.textContent = `+${drill.reactionDelaySeconds} ${t.secondsUnit}`;
  if (errorDisplay) errorDisplay.textContent = `${drill.errorRatePercent}%`;
  if (readinessDisplay) {
    readinessDisplay.className = `readiness-${drill.readiness}`;
    readinessDisplay.textContent = t.drillReadinessLabels[drill.readiness];
  }
  if (adviceText) {
    let rec = drill.recommendation;
    if (currentLang === "en") {
      if (drill.readiness === "optimal") rec = "Crew demonstrates optimal muster and deployment speed. Reaction timing and operational coordination fully meet SOLAS standards.";
      else if (drill.readiness === "degraded") rec = "Delayed muster response due to cumulative fatigue factors. Recommend adjusting drill timing and conducting pre-drill refresher briefings.";
      else rec = `Critical degradation in emergency reaction (+${drill.reactionDelaySeconds}s delay, ${drill.errorRatePercent}% error rate). Risk of compromised evacuation or fire control!`;
    } else if (currentLang === "ru") {
      if (drill.readiness === "optimal") rec = "Экипаж демонстрирует оптимальную скорость развертывания по тревоге. Время реакции и координация полностью соответствуют требованиям SOLAS.";
      else if (drill.readiness === "degraded") rec = "Замедленная реакция на тревогу из-за признаков накопленной усталости. Рекомендуется скорректировать время учений и провести повторный инструктаж.";
      else rec = `Критическое ухудшение реакции экипажа (+${drill.reactionDelaySeconds} с задержки, ${drill.errorRatePercent}% сбоев действий). Риск срыва эвакуации или локализации аварии!`;
    }
    adviceText.textContent = rec;
  }
}

let currentAcademicArtifacts = null;
function renderAcademicArtifacts(result, input) {
  currentAcademicArtifacts = generateAcademicArtifacts(result, input);
  const preview = $("#academic-preview-code");
  if (preview) {
    preview.querySelector("code").textContent = currentAcademicArtifacts.latexTable;
  }
}

function renderProfileCompare(input) {
  const t = I18N[currentLang];
  const benchmarkProfile = {
    ...input,
    hours: 2000,
    night: 20,
    watchSystem: "4on8off",
    ppe: true,
    smoking: false,
    alcohol: false
  };
  const comp = compareProfiles(input, benchmarkProfile);
  const badge = $("#compare-verdict-badge");
  const valA = $("#compare-val-a");
  const catA = $("#compare-cat-a");
  const valB = $("#compare-val-b");
  const catB = $("#compare-cat-b");
  const note = $("#compare-note-text");

  if (badge) {
    const isLower = comp.deltaTotal < 0;
    badge.textContent = isLower ? `Δ ${comp.deltaPercent}% ${t.compDeltaLower}` : t.compBase;
    badge.className = isLower ? "compare-badge opt-better" : "compare-badge";
  }
  if (valA) valA.textContent = `≈ ${asDisplayPercent(comp.profileA.total)}`;
  if (catA) catA.textContent = t.riskCats[comp.profileA.categoryKey || "high"] || comp.profileA.category;
  if (valB) valB.textContent = `≈ ${asDisplayPercent(comp.profileB.total)}`;
  if (catB) catB.textContent = t.riskCats[comp.profileB.categoryKey || "low"] || comp.profileB.category;
  if (note) {
    note.textContent = comp.deltaTotal < 0
      ? t.compNoteBetter(Math.abs(comp.deltaPercent))
      : t.compNoteStandard;
  }
}

const whatIfByLang = {
  uk: {
    ppe: { title: "Обов'язкове використання ЗІЗ", desc: "Використання каски, спецвзуття, страхувальних поясів та засобів захисту очей/слуху зменшує персональний травматизм." },
    night: { title: "Зниження нічних вахт до ≤20%", desc: "Оптимізація графіку несення вахти з мінімізацією нічних годин знижує накопичення циркадної втоми." },
    lifestyle: { title: "Відмова від куріння та алкоголю", desc: "Усунення кардіоваскулярних та психомоторних факторів покращує швидкість реакції та витривалість." },
    hours: { title: "Нормалізація річних годин (до 2000 год)", desc: "Дотримання конвенційного ліміту MLC 2006 (Standard A2.3) щодо тривалості праці та відпочинку." },
    watch: { title: "Перехід на 3-вахтову систему (4/8)", desc: "Заміна виснажливого графіку 6/6 на повноцінний 4/8 цикл забезпечує фізіологічне відновлення." }
  },
  en: {
    ppe: { title: "Mandatory PPE Compliance", desc: "Consistent use of safety helmet, steel-toe boots, fall arrest harnesses, and eye/ear protection drastically reduces personal injury rates." },
    night: { title: "Cap Night Watches to ≤20%", desc: "Optimizing watch schedules to minimize night shifts prevents the accumulation of severe circadian fatigue." },
    lifestyle: { title: "Cessation of Smoking & Alcohol", desc: "Eliminating cardiovascular and psychomotor stressors improves alertness, endurance, and operational reaction time." },
    hours: { title: "Cap Annual Hours to 2,000h (MLC 2006)", desc: "Compliance with MLC 2006 Standard A2.3 work/rest limits ensures adequate physical and cognitive recovery." },
    watch: { title: "Transition to 3-Watch System (4/8)", desc: "Replacing grueling 6on/6off schedules with the standard 4on/8off rotation allows restorative sleep." }
  },
  ru: {
    ppe: { title: "Обязательное использование СИЗ", desc: "Ношение каски, спецобуви, страховочных систем, защитных очков и наушников снижает производственный травматизм." },
    night: { title: "Снижение ночных вахт до ≤20%", desc: "Оптимизация расписания вахт с минимизацией ночных часов снижает накопление циркадной усталости." },
    lifestyle: { title: "Отказ от курения и алкоголя", desc: "Устранение сердечно-сосудистых и психомоторных факторов улучшает скорость реакции и выносливость." },
    hours: { title: "Нормализация годовых часов (до 2000 ч)", desc: "Соблюдение конвенционного лимита MLC 2006 (Standard A2.3) по продолжительности труда и отдыха." },
    watch: { title: "Переход на 3-вахтенную систему (4/8)", desc: "Замена изнурительного графика 6/6 на стандартный 4/8 цикл обеспечивает физиологическое восстановление." }
  }
};

const checklistCategoriesByLang = {
  uk: { "Охорона праці": "Охорона праці", "Вантажні операції": "Вантажні операції", "Вантажна безпека": "Вантажна безпека", "Швартування": "Швартування", "Судноводіння": "Судноводіння", "Машинне відділення": "Машинне відділення", "Практика": "Практика", "Водолазні роботи": "Водолазні роботи" },
  en: { "Охорона праці": "Occupational Safety", "Вантажні операції": "Cargo Operations", "Вантажна безпека": "Cargo Securing", "Швартування": "Mooring Operations", "Судноводіння": "Bridge & Navigation", "Машинне відділення": "Engine Room Safety", "Практика": "Cadet Training", "Водолазні роботи": "Diving Operations" },
  ru: { "Охорона праці": "Охрана труда", "Вантажні операції": "Грузовые операции", "Вантажна безпека": "Грузовая безопасность", "Швартування": "Швартовные операции", "Судноводіння": "Судовождение и мостик", "Машинне відділення": "Машинное отделение", "Практика": "Учебная практика", "Водолазні роботи": "Водолазные работы" }
};

const checklistItemsByLang = {
  uk: {
    "rest-hours": "Перевірка годин відпочинку (MLC 2006): мінімум 10 год за добу та 77 год за тиждень",
    "stop-work": "Процедура Stop Work Authority: підтверджено безумовне право зупинити небезпечні дії",
    "deck-mooring": "Контроль зони швартовних операцій: огляд кінців та перевірка snap-back zone",
    "night-adaptation": "Адаптація нічного зору: мінімум 15 хв перебування в темряві перед заступанням на вахту",
    "ppe-audit": "Перевірка сертифікованих ЗІЗ: каска, спецвзуття з металевим підноском, захисні окуляри",
    "engine-confined": "Дозвіл на вхід у замкнений простір (Enclosed Space Permit): газоаналіз O2/LEL/H2S/CO",
    "engine-hearing": "Захист слуху: обов'язкове використання протишумних навушників у машинному відділенні",
    "officer-lookout": "Ходова вахта на містку: підтвердження наявності кваліфікованого впередсмотрящого (Lookout)",
    "officer-passage": "План переходу (Passage Plan): перевірка контрольних точок та глибин за електронною картою ECDIS",
    "cadet-mentor": "Інструктаж курсанта: виконання робіт виключно під безпосереднім наглядом офіцера-наставника",
    "port-cargo": "Вантажні операції в порту: огляд талрепів, відсутність персоналу під підвішеним вантажем",
    "diver-decomp": "Водолазний протокол: перевірка декомпресійних таблиць, запасу дихальної суміші та зв'язку",
    "tanker-isgott": "Танкерні операції (ISGOTT): перевірка тиску інертних газів та заземлення при наливі",
    "container-lashing": "Перевірка стану кріплень та натягу талрепів контейнерів (Lashing/Cargo Securing)",
    "bulker-holds": "Газовий аналіз та вентиляція трюмів під час перевезення небезпечних навалювальних вантажів (IMSBC Code)"
  },
  en: {
    "rest-hours": "MLC 2006 Rest Hours Audit: minimum 10h rest in any 24h period and 77h per 7 days",
    "stop-work": "Stop Work Authority verification: unconditional mandate to halt unsafe actions confirmed",
    "deck-mooring": "Mooring snap-back zone control: visual inspection of synthetic lines and fairleads",
    "night-adaptation": "Night vision dark adaptation: at least 15 min darkness adaptation prior to watch takeover",
    "ppe-audit": "Mandatory PPE verification: safety helmet, steel-toed boots, protective eyewear/gloves",
    "engine-confined": "Enclosed space entry permit: multi-gas atmospheric testing (O2 / LEL / H2S / CO)",
    "engine-hearing": "Hearing protection: mandatory acoustic ear defenders in engine room spaces",
    "officer-lookout": "Navigation bridge watch: qualified dedicated lookout confirmed on watch (STCW A-VIII/2)",
    "officer-passage": "Passage plan verification: safety contours, no-go areas and waypoints active in ECDIS",
    "cadet-mentor": "Cadet briefing: operations conducted strictly under direct supervision of a designated mentor",
    "port-cargo": "Port stevedore safety: clear of suspended loads, twistlock and lashing inspection",
    "diver-decomp": "Commercial diving protocol: decompression tables, reserve gas supply, two-way comms verified",
    "tanker-isgott": "Tanker ISGOTT checklist: inert gas pressure, bonding wires, manifold vapor lines checked",
    "container-lashing": "Container securing inspection: check turnbuckles, lashing rods, and bridge fittings",
    "bulker-holds": "Bulk cargo hold atmosphere testing & ventilation for hazardous bulk cargoes (IMSBC Code)"
  },
  ru: {
    "rest-hours": "Проверка часов отдыха (MLC 2006): минимум 10 ч в сутки и 77 ч в неделю",
    "stop-work": "Процедура Stop Work Authority: подтверждено безусловное право остановить опасные действия",
    "deck-mooring": "Контроль зоны швартовных операций: осмотр концов и проверка snap-back zone",
    "night-adaptation": "Адаптация ночного зрения: минимум 15 мин в темноте перед заступлением на ходовую вахту",
    "ppe-audit": "Проверка сертифицированных СИЗ: каска, спецобувь с подноском, защитные очки и перчатки",
    "engine-confined": "Разрешение на вход в замкнутое помещение (Enclosed Space Permit): газоанализ O2/LEL/H2S/CO",
    "engine-hearing": "Защита слуха: обязательное ношение противошумных наушников в машинном отделении",
    "officer-lookout": "Ходовая вахта на мостике: подтверждение квалифицированного впередсмотрящего (STCW A-VIII/2)",
    "officer-passage": "План перехода (Passage Plan): проверка контрольных глубин и точек поворота в ECDIS",
    "cadet-mentor": "Инструктаж курсанта: выполнение работ только под непосредственным надзором наставника",
    "port-cargo": "Портовые грузовые операции: осмотр креплений, запрет нахождения под поднятым грузом",
    "diver-decomp": "Водолазный протокол: проверка декомпрессионных таблиц, запаса дыхательной смеси и связи",
    "tanker-isgott": "Танкерные операции (ISGOTT): проверка давления инертных газов и заземления при наливе",
    "container-lashing": "Проверка состояния креплений и натяжения талрепов контейнеров (Lashing/Cargo Securing)",
    "bulker-holds": "Газовый анализ и вентиляция трюмов при перевозке опасных навалочных грузов (IMSBC Code)"
  }
};

// isInitial=true: first automatic render on page load before the user interacts
function renderRisk(result, input, scenarioName = activeScenario, isInitial = false) {
  const t = I18N[currentLang];
  const resultPanel = $("#result-panel");
  resultPanel.dataset.initial = isInitial ? "true" : "false";

  $("#method-badge").textContent = `${t.registryLabel} ${result.registryId.replace("SR-UA-COEFFICIENTS-", "")}`;
  $("#risk-value").textContent = `≈ ${asDisplayPercent(result.total)}`;
  const sci = $("#scientific-notation");
  if (sci) sci.textContent = `${t.sciNotationPrefix}: ${asIndex(result.total)}`;
  $("#risk-ratio").textContent = t.riskRatioText;
  $("#risk-badge span").textContent = t.riskCats[result.category.key] || result.category.label;
  $("#risk-badge").dataset.category = result.category.key;
  $("#risk-meter").style.width = `${result.category.meter}%`;
  $("#result-announcement").textContent = isInitial ? "" :
    `${t.announceResult} ${asDisplayPercent(result.total)}. ${t.announceCategory} ${t.riskCats[result.category.key] || result.category.label}.`;
  $("#model-status").textContent = result.modelStatus === "provisional" ? t.modelProvisional : result.modelStatus;
  $("#model-version").textContent = result.modelId;
  $("#uncertainty-status").textContent = `${t.modelUncertaintyPrefix}. ${result.uncertainty.explanation}`;
  $("#scenario-name").textContent = scenarioName;

  const now = new Date();
  $("#report-date").dateTime = now.toISOString();
  $("#report-date").textContent = new Intl.DateTimeFormat(t.dateLocale, { dateStyle: "medium", timeStyle: "short" }).format(now);

  const yesNo = (value) => value ? t.yes : t.no;
  const profileRows = [
    [t.sumAge, `${Number(input.age)} ${t.yearsUnit}`],
    [t.sumSex, input.sex === "male" ? t.sexMale : t.sexFemale],
    [t.sumResidence, input.residence === "city" ? t.resCity : t.resVillage],
    [t.sumRole, roleLabels[input.role] ?? input.role],
    [t.sumHours, `${Number(input.hours).toLocaleString(t.locale)} ${t.hoursUnit}`],
    [t.sumNight, `${Number(input.night)}%`],
    [t.sumWatch, watchLabels[input.watchSystem] ?? input.watchSystem],
    [t.sumVessel, vesselLabels[input.vesselType] ?? input.vesselType],
    [t.sumPpe, yesNo(input.ppe)],
    [t.sumMarkers, [
      input.chronic   && t.markerChronic,
      input.previous  && t.markerPrevious,
      input.smoking   && t.markerSmoking,
      input.alcohol   && t.markerAlcohol
    ].filter(Boolean).join(", ") || t.markerNone]
  ];
  $("#profile-summary-list").innerHTML = profileRows
    .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join("");

  // Live Radar render
  renderLiveRadar(result, input);

  // MLC 2006 & STCW fatigue assessment
  const mlc = evaluateMlcCompliance(input);
  const mlcCard = $("#mlc-advice-card");
  if (mlc && mlcCard) {
    if (mlc.findings.length > 0) {
      mlcCard.hidden = false;
      $("#mlc-findings-list").innerHTML = mlc.findings.map((f) => {
        let msg = f.message;
        let topic = f.topic;
        if (currentLang === "en") {
          topic = f.topic === "Річна експозиція" ? "Annual Exposure" : (f.topic === "Нічні зміни" ? "Night Shifts" : "Watch Schedule");
          if (f.rule.includes("MLC 2006")) msg = `Annual working exposure (${input.hours}h) exceeds convention limit (2600h). High risk of cumulative fatigue.`;
          else if (f.rule.includes("Circ.1598")) msg = `Night watch ratio is ${input.night}%. Regular monitoring of circadian alertness required.`;
          else msg = "2-watch system (6on/6off) significantly increases fatigue risk and micro-sleep probability.";
        } else if (currentLang === "ru") {
          topic = f.topic === "Річна експозиція" ? "Годовая нагрузка" : (f.topic === "Нічні зміни" ? "Ночные смены" : "Расписание вахт");
          if (f.rule.includes("MLC 2006")) msg = `Годовая нагрузка (${input.hours} ч) превышает конвенционный лимит (2600 ч). Риск накопительной усталости.`;
          else if (f.rule.includes("Circ.1598")) msg = `Доля ночных вахт составляет ${input.night}%. Необходим регулярный мониторинг циркадной бдительности.`;
          else msg = "2-вахтенная система (6/6) существенно повышает риск утомления и вероятность засыпания.";
        }
        return `
        <li class="mlc-finding mlc-${escapeHtml(f.severity)}">
          <div><strong>${escapeHtml(topic)}</strong> <small>· ${escapeHtml(f.rule)}</small></div>
          <p>${escapeHtml(msg)}</p>
        </li>
      `;
      }).join("");
    } else {
      mlcCard.hidden = true;
    }
  }

  // Fleet Benchmark Comparison (BIMCO / ICS Fleet Baseline)
  const hoursNum = Number(input.hours) || 2024;
  const nightNum = Number(input.night) || 25;
  const FLEET_HOURS_BASELINE = 2150;
  const FLEET_NIGHT_BASELINE = 28;

  const hoursFillPercent = Math.min(100, Math.max(5, (hoursNum / 3500) * 100));
  const bmHoursFill = $("#bm-hours-fill");
  const bmHoursStat = $("#bm-hours-stat");
  if (bmHoursFill && bmHoursStat) {
    bmHoursFill.style.width = `${hoursFillPercent}%`;
    bmHoursFill.classList.toggle("excess", hoursNum > 2400 && hoursNum <= 2700);
    bmHoursFill.classList.toggle("critical", hoursNum > 2700);

    const hoursDelta = Math.round(((hoursNum - FLEET_HOURS_BASELINE) / FLEET_HOURS_BASELINE) * 100);
    if (Math.abs(hoursDelta) <= 5) {
      bmHoursStat.textContent = `${hoursNum.toLocaleString(t.locale)} ${t.hrsUnit} (${t.bmFleetNorm})`;
    } else if (hoursDelta > 0) {
      bmHoursStat.textContent = `${hoursNum.toLocaleString(t.locale)} ${t.hrsUnit} (+${hoursDelta}% ${t.bmOverNorm})`;
    } else {
      bmHoursStat.textContent = `${hoursNum.toLocaleString(t.locale)} ${t.hrsUnit} (${hoursDelta}% ${t.bmUnderNorm})`;
    }
  }

  const nightFillPercent = Math.min(100, Math.max(5, (nightNum / 80) * 100));
  const bmNightFill = $("#bm-night-fill");
  const bmNightStat = $("#bm-night-stat");
  if (bmNightFill && bmNightStat) {
    bmNightFill.style.width = `${nightFillPercent}%`;
    bmNightFill.classList.toggle("excess", nightNum >= 35 && nightNum < 50);
    bmNightFill.classList.toggle("critical", nightNum >= 50);

    const nightDelta = nightNum - FLEET_NIGHT_BASELINE;
    if (Math.abs(nightDelta) <= 3) {
      bmNightStat.textContent = `${nightNum}% (${t.bmTypicalWatch})`;
    } else if (nightDelta > 0) {
      bmNightStat.textContent = `${nightNum}% (+${nightDelta}% ${t.bmNightMore})`;
    } else {
      bmNightStat.textContent = `${nightNum}% (${nightDelta}% ${t.bmNightLess})`;
    }
  }

  // Factor breakdown
  const factorLabels = t.factorBreakdownLabels;
  const sum = Object.values(result.components).reduce((total, value) => total + value, 0) || 1;
  $("#breakdown-list").innerHTML = Object.entries(result.components).map(([key, value]) => {
    const share = value / sum;
    return `<div class="factor"><div class="factor-heading"><span>${escapeHtml(factorLabels[key])}</span><strong>${asPercent(share, 0)} ${t.factorShare} (${asDisplayPercent(value)})</strong></div><div class="factor-bar"><i style="width:${Math.max(2, share * 100)}%"></i></div></div>`;
  }).join("");

  // What-If Scenarios
  const whatIfs = generateWhatIfScenarios(input);
  const whatIfGrid = $("#what-if-grid");
  const whatIfDict = whatIfByLang[currentLang] || whatIfByLang.uk;
  if (whatIfGrid) {
    if (whatIfs.length > 0) {
      whatIfGrid.innerHTML = whatIfs.map((sc) => {
        const scTitle = whatIfDict[sc.id]?.title || sc.title;
        const scDesc = whatIfDict[sc.id]?.desc || sc.description;
        return `
        <div class="what-if-card">
          <div class="what-if-top">
            <strong>${escapeHtml(scTitle)}</strong>
            <span class="what-if-delta">-${escapeHtml(sc.deltaPercent)}% ${t.whatIfDelta}</span>
          </div>
          <p>${escapeHtml(scDesc)}</p>
          <div class="what-if-footer">
            <small>${t.whatIfAfter}: ≈ ${asDisplayPercent(sc.simulatedTotal)}</small>
            <button type="button" class="what-if-apply-btn" data-whatif="${escapeHtml(sc.id)}">${t.whatIfBtn} ↗</button>
          </div>
        </div>
      `;
      }).join("");
      whatIfGrid.querySelectorAll(".what-if-apply-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.whatif;
          if (id === "ppe") $("#ppe").checked = true;
          if (id === "night") $("#night").value = Math.round(Number($("#night").value) / 2);
          if (id === "lifestyle") { $("#smoking").checked = false; $("#alcohol").checked = false; }
          if (id === "hours") $("#hours").value = 2000;
          if (id === "watch") $("#watch-system").value = "4on8off";
          const updated = currentInput();
          renderRisk(calculateRisk(updated), updated, t.whatIfSimPrefix + ": " + (btn.closest(".what-if-card").querySelector("strong")?.textContent || id), false);
        });
      });
    } else {
      whatIfGrid.innerHTML = `<p class="what-if-empty">${escapeHtml(t.whatIfEmpty)}</p>`;
    }
  }

  // Component evidence
  const statusLabels = t.evidenceStatusLabels;
  $("#component-evidence").innerHTML = Object.entries(result.componentEvidence).map(([key, records]) => `
    <section class="evidence-component">
      <h4>${escapeHtml(factorLabels[key])}</h4>
      <ul>${records.map((record) => `<li>
        <div><code>${escapeHtml(record.id)}</code><span class="evidence-status" data-status="${escapeHtml(record.status)}">${escapeHtml(statusLabels[record.status] ?? record.status)}</span></div>
        <p>${escapeHtml(record.source)} · ${escapeHtml(record.sourceVersion)}</p>
        <small>${t.evidenceUnit}: ${escapeHtml(record.unit)}; ${t.evidencePop}: ${escapeHtml(record.population)}; ${t.evidencePeriod}: ${escapeHtml(record.period)}.</small>
      </li>`).join("")}</ul>
    </section>`).join("");

  // Recommendations
  $("#recommendation-list").innerHTML = result.recommendations.map((item) => {
    let recText = item;
    if (currentLang === "en") {
      if (item.includes("ЗІЗ")) recText = "Mandatory certified PPE: safety helmet, anti-slip boots, and eye/ear protection.";
      else if (item.includes("нічних вахт")) recText = "Fatigue mitigation: reduce night watch proportion and establish strict recovery windows.";
      else if (item.includes("куріння")) recText = "Health control: eliminate smoking and heavy alcohol to restore physiological resilience.";
      else if (item.includes("робочих годин")) recText = "Workload audit: cap annual duty hours at MLC 2006 limits to prevent cumulative burnout.";
    } else if (currentLang === "ru") {
      if (item.includes("ЗІЗ")) recText = "Обязательное применение СИЗ: каска, спецобувь, защита глаз и слуха.";
      else if (item.includes("нічних вахт")) recText = "Контроль усталости: оптимизация ночных вахт и обеспечение достаточного времени отдыха.";
      else if (item.includes("куріння")) recText = "Охрана здоровья: отказ от курения и алкоголя для поддержания психомоторных реакций.";
      else if (item.includes("робочих годин")) recText = "Нормирование труда: соблюдение конвенционных лимитов MLC 2006 по продолжительности работы.";
    }
    return `<li>${escapeHtml(recText)}</li>`;
  }).join("");

  // Grounded Incident Retrieval from official records
  const grounded = retrieveSimilarIncidents(input, incidents);
  const groundedFactsList = $("#grounded-facts-list");
  const groundedExplanation = $("#grounded-explanation");
  if (groundedFactsList && groundedExplanation) {
    if (grounded.facts && grounded.facts.length > 0) {
      groundedFactsList.innerHTML = grounded.facts.map((fact) => {
        let fText = fact;
        if (currentLang === "en") {
          fText = fText.replace("записів про постраждалих", "casualty records")
            .replace("найчастіші типи подій:", "top incident categories:")
            .replace("частка летальних наслідків", "fatality share")
            .replace("травмувань", "injuries");
        } else if (currentLang === "ru") {
          fText = fText.replace("записів про постраждалих", "записей о пострадавших")
            .replace("найчастіші типи подій:", "частые типы событий:")
            .replace("частка летальних наслідків", "доля летальных исходов")
            .replace("травмувань", "травм");
        }
        return `<li>${escapeHtml(fText)}</li>`;
      }).join("");
    } else {
      groundedFactsList.innerHTML = `<li>${escapeHtml(t.groundedWaiting)}</li>`;
    }
    groundedExplanation.textContent = grounded.explanation || "—";
  }

  // Actionable Safety Checklist
  const checklist = generateChecklist(input);
  const checklistList = $("#checklist-list");
  const checklistProgress = $("#checklist-progress");
  const catTrans = checklistCategoriesByLang[currentLang] || {};
  const itemTrans = checklistItemsByLang[currentLang] || {};

  if (checklistList && checklistProgress) {
    checklistList.innerHTML = checklist.items.map((item, idx) => {
      const locCat = catTrans[item.category] || item.category;
      const locLabel = itemTrans[item.id] || item.label;
      return `
      <li class="checklist-item">
        <label class="checklist-label" for="cl-${idx}">
          <input type="checkbox" class="checklist-cb" id="cl-${idx}" />
          <span class="checklist-box" aria-hidden="true"></span>
          <span class="checklist-body">
            <span class="checklist-cat">${escapeHtml(locCat)}</span>
            <span class="checklist-text">${escapeHtml(locLabel)}</span>
          </span>
        </label>
      </li>
    `;
    }).join("");

    const updateChecklistCounter = () => {
      const total = checklist.items.length;
      const checked = checklistList.querySelectorAll(".checklist-cb:checked").length;
      checklistProgress.textContent = `${checked} / ${total} ${t.clCompleted}`;
    };
    updateChecklistCounter();
    checklistList.querySelectorAll(".checklist-cb").forEach((cb) => cb.addEventListener("change", updateChecklistCounter));
  }

  // Marginal Sensitivity Analysis (Tornado ranking)
  renderSensitivity(input);

  // IMO FSA Risk Matrix Evaluation
  renderFsaMatrix(result, input);

  // Epic 1: Circadian Fatigue & Sleep Debt
  renderCircadian(input);

  // Epic 2: Operational Weather & Marine Hazards
  renderWeatherRisk(input);

  // Epic 3: PSC & SIRE 2.0 Inspection Readiness
  renderPscSire(input);

  // Epic 4: Emergency Drills Simulation
  renderEmergencyDrill(input);

  // Epic 5: Academic Research Artifacts & Profile Comparison
  renderAcademicArtifacts(result, input);
  renderProfileCompare(input);

  // Epic 7: Pure SVG Offline 2D Matrix / QR Visual Handover
  const qr = generateOfflineWatchHandoverQr(input, result);
  const qrWrap = $("#qr-svg-wrap");
  if (qrWrap) qrWrap.innerHTML = qr.svg;
  const qrText = $("#qr-digest-text");
  if (qrText) qrText.textContent = qr.rawString;

  $("#formula-copy").textContent = t.formulaCopy;
  $("#assumption-list").innerHTML = result.assumptions.map((item) => {
    let aText = item;
    if (currentLang === "en") {
      if (item.includes("базується на")) aText = "Calculation utilizes static coefficients registry (v0.1.0). AI does not modify risk outputs.";
      else if (item.includes("незалежні")) aText = "Component multiplicativity assumes independent occupational and health risk pathways.";
      else aText = "Individual risk estimate does not constitute certified ISM Code / medical fitness certification.";
    } else if (currentLang === "ru") {
      if (item.includes("базується на")) aText = "Расчет использует статический реестр коэффициентов (v0.1.0). AI не вычисляет числовое значение.";
      else if (item.includes("незалежні")) aText = "Мультипликативность предполагает независимость профессиональных и поведенческих факторов.";
      else aText = "Индивидуальный расчет не является официальным допуском к работе или медицинским диагнозом.";
    }
    return `<li>${escapeHtml(aText)}</li>`;
  }).join("");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = currentInput();
  renderRisk(calculateRisk(input), input, activeScenario, false);
  $("#result-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
});

form.addEventListener("input", () => {
  activeScenario = I18N[currentLang].defaultScenarioName;
});

$("#apply-scenario").addEventListener("click", () => {
  const scenarioKey = $("#demo-scenario").value;
  const scenario = demoScenarios[scenarioKey];
  applyProfile(scenario.profile);
  const label = scenario.label[currentLang] || scenario.label.uk;
  activeScenario = label;
  renderRisk(calculateRisk(scenario.profile), scenario.profile, label, false);
  $("#result-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
});

// Profile Export (.json) — 100% local, no telemetry, no backend
$("#export-profile-btn")?.addEventListener("click", () => {
  const input = currentInput();
  const exportPayload = {
    app: "SeaRisk UA",
    format: "searisk-profile-v1",
    exportedAt: new Date().toISOString(),
    profile: input
  };
  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `searisk-profile-${input.role || "worker"}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Profile Import (.json) — reads locally in-memory via FileReader
$("#import-profile-input")?.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      const prof = data.profile || data;
      if (!prof || typeof prof !== "object") throw new Error("Некоректний файл");
      applyProfile(prof);
      const updated = currentInput();
      renderRisk(calculateRisk(updated), updated, I18N[currentLang].importedFileLabel, false);
      $("#result-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch {
      alert(I18N[currentLang].importErrorAlert);
    }
  };
  reader.readAsText(file);
  event.target.value = "";
});

$("#print-report").addEventListener("click", () => window.print());

let printDetailsState = [];
let printTabsState = [];
window.addEventListener("beforeprint", () => {
  printDetailsState = [...document.querySelectorAll("#result-panel details")].map((details) => details.open);
  document.querySelectorAll("#result-panel details").forEach((details) => { details.open = true; });
  printTabsState = [...document.querySelectorAll(".result-tab-pane")].map((pane) => pane.hidden);
  document.querySelectorAll(".result-tab-pane").forEach((pane) => { pane.hidden = false; });
});
window.addEventListener("afterprint", () => {
  document.querySelectorAll("#result-panel details").forEach((details, index) => { details.open = printDetailsState[index]; });
  document.querySelectorAll(".result-tab-pane").forEach((pane, index) => { pane.hidden = printTabsState[index] ?? false; });
});

// Bridge Lighting Mode Switcher (IMO MSC.252 / IEC 62288)
document.querySelectorAll(".bridge-mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.bridgeMode;
    document.querySelectorAll(".bridge-mode-btn").forEach((b) => {
      b.classList.toggle("active", b === btn);
    });
    if (mode === "cockpit") {
      document.documentElement.removeAttribute("data-bridge-mode");
    } else {
      document.documentElement.setAttribute("data-bridge-mode", mode);
    }
  });
});

// Result Panel Segmented Tabs Helper & Handlers
function switchResultTab(target) {
  document.querySelectorAll(".result-tab-btn").forEach((b) => {
    const isActive = b.dataset.tab === target;
    b.classList.toggle("active", isActive);
    b.setAttribute("aria-selected", String(isActive));
  });
  document.querySelectorAll(".result-tab-pane").forEach((pane) => {
    pane.hidden = pane.dataset.tabPane !== target;
  });
}

document.querySelectorAll(".result-tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    switchResultTab(btn.dataset.tab);
  });
});

// MAIB Real Accident Case Studies
const MAIB_CASE_STUDIES = {
  "vasco-de-gama": {
    label: {
      uk: "Кейс MAIB 23/2017 (CMA CGM Vasco de Gama)",
      en: "MAIB Case 23/2017 (CMA CGM Vasco de Gama)",
      ru: "Кейс MAIB 23/2017 (CMA CGM Vasco de Gama)"
    },
    profile: { age: 34, sex: "male", residence: "city", chronic: false, role: "officer", hours: 2750, night: 70, watchSystem: "4on8off", vesselType: "container", ppe: true, previous: false, smoking: false, alcohol: false }
  },
  "zarga": {
    label: {
      uk: "Кейс MAIB 13/2017 (Танкер ЗПГ Zarga)",
      en: "MAIB Case 13/2017 (LNG Carrier Zarga)",
      ru: "Кейс MAIB 13/2017 (Танкер СПГ Zarga)"
    },
    profile: { age: 28, sex: "male", residence: "city", chronic: false, role: "deck", hours: 2900, night: 40, watchSystem: "6on6off", vesselType: "tanker", ppe: false, previous: true, smoking: false, alcohol: false }
  },
  "scot-carrier": {
    label: {
      uk: "Кейс MAIB 18/2023 (Scot Carrier & Karin Høj)",
      en: "MAIB Case 18/2023 (Scot Carrier & Karin Høj)",
      ru: "Кейс MAIB 18/2023 (Scot Carrier & Karin Høj)"
    },
    profile: { age: 45, sex: "male", residence: "city", chronic: false, role: "officer", hours: 3100, night: 80, watchSystem: "6on6off", vesselType: "bulker", ppe: true, previous: false, smoking: true, alcohol: true }
  },
  "el-faro": {
    label: {
      uk: "Кейс NTSB/IMO (MV El Faro)",
      en: "NTSB/IMO Case (MV El Faro)",
      ru: "Кейс NTSB/IMO (MV El Faro)"
    },
    profile: { age: 53, sex: "male", residence: "city", chronic: false, role: "officer", hours: 2950, night: 45, watchSystem: "4on8off", vesselType: "container", ppe: true, previous: true, smoking: true, alcohol: false }
  },
  "exxon-valdez": {
    label: {
      uk: "Кейс NTSB/IMO (Exxon Valdez, 1989)",
      en: "NTSB/IMO Case (Exxon Valdez, 1989)",
      ru: "Кейс NTSB/IMO (Exxon Valdez, 1989)"
    },
    profile: { age: 42, sex: "male", residence: "city", chronic: false, role: "officer", hours: 3200, night: 85, watchSystem: "6on6off", vesselType: "tanker", ppe: true, previous: true, smoking: true, alcohol: true }
  },
  "bourbon-dolphin": {
    label: {
      uk: "Кейс NMA/MAIB (Bourbon Dolphin, 2007)",
      en: "NMA/MAIB Case (Bourbon Dolphin, 2007)",
      ru: "Кейс NMA/MAIB (Bourbon Dolphin, 2007)"
    },
    profile: { age: 36, sex: "male", residence: "city", chronic: false, role: "deck", hours: 2950, night: 50, watchSystem: "6on6off", vesselType: "tug", ppe: false, previous: false, smoking: false, alcohol: false }
  }
};

document.querySelectorAll(".case-load-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const caseKey = btn.dataset.case;
    const caseStudy = MAIB_CASE_STUDIES[caseKey];
    if (!caseStudy) return;

    applyProfile(caseStudy.profile);
    const label = caseStudy.label[currentLang] || caseStudy.label.uk;
    activeScenario = label;
    renderRisk(calculateRisk(caseStudy.profile), caseStudy.profile, label, false);
    switchResultTab("radar");

    $("#result-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
});

$("#details-toggle").addEventListener("click", (event) => {
  const list = $("#breakdown-list");
  const hidden = list.hidden;
  list.hidden = !hidden;
  event.currentTarget.setAttribute("aria-expanded", String(hidden));
  event.currentTarget.textContent = hidden ? I18N[currentLang].detailsHide : I18N[currentLang].detailsShow;
});

// Weather & Environmental Hazards interactive controls
$("#beaufort-slider")?.addEventListener("input", () => renderWeatherRisk(currentInput()));
$("#polar-zone-toggle")?.addEventListener("change", () => renderWeatherRisk(currentInput()));
$("#engine-heat-toggle")?.addEventListener("change", () => renderWeatherRisk(currentInput()));

// Timezone shift slider listener
$("#tz-shift-slider")?.addEventListener("input", () => renderCircadian(currentInput()));

// Fullscreen Presentation Mode (Defense HUD)
$("#presentation-mode-btn")?.addEventListener("click", () => {
  document.body.classList.toggle("hud-presentation-mode");
  const isHud = document.body.classList.contains("hud-presentation-mode");
  const btn = $("#presentation-mode-btn");
  if (btn) btn.classList.toggle("active", isHud);
});

// Emergency Drill simulator selector
$("#drill-type-select")?.addEventListener("change", () => renderEmergencyDrill(currentInput()));

// Academic Toolkit Artifacts copy/download
$("#copy-latex-btn")?.addEventListener("click", () => {
  if (!currentAcademicArtifacts) return;
  const code = $("#academic-preview-code code");
  if (code) code.textContent = currentAcademicArtifacts.latexTable;
  navigator.clipboard?.writeText(currentAcademicArtifacts.latexTable).catch(() => {});
  const btn = $("#copy-latex-btn");
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = I18N[currentLang].copiedLatexNotice;
    setTimeout(() => { btn.textContent = orig; }, 2000);
  }
});

$("#copy-bibtex-btn")?.addEventListener("click", () => {
  if (!currentAcademicArtifacts) return;
  const code = $("#academic-preview-code code");
  if (code) code.textContent = currentAcademicArtifacts.bibtexCitations;
  navigator.clipboard?.writeText(currentAcademicArtifacts.bibtexCitations).catch(() => {});
  const btn = $("#copy-bibtex-btn");
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = I18N[currentLang].copiedBibtexNotice;
    setTimeout(() => { btn.textContent = orig; }, 2000);
  }
});

$("#download-csv-btn")?.addEventListener("click", () => {
  if (!currentAcademicArtifacts) return;
  const csvContent = `${currentAcademicArtifacts.csvHeader}\n${currentAcademicArtifacts.csvRow}\n`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `searisk-academic-data-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Master Tri-Lingual Dictionary (UA / EN IMO SMCP / RU)
const I18N = {
  uk: {
    locale: "uk-UA",
    dateLocale: "uk-UA",
    btn: "UA",
    heroTitle: "Побачте, що саме формує професійний ризик.",
    heroEyebrow: "Безпека, яку можна пояснити",
    heroLede: "Безкоштовний освітній сервіс для самостійного аналізу факторів морського ризику — з локальним розрахунком, контекстом інцидентів і практичними кроками.",
    heroActionStart: "Почати оцінювання",
    heroActionMethod: "Як працює модель",
    heroRadarTopline: "Профіль ризику",
    radarLabel1: "Втома",
    radarLabel2: "Операції",
    radarLabel3: "Здоров’я",
    radarLabel4: "Звички",
    radarLabel5: "Середовище",
    radarPriorityLabel: "Пріоритет",
    radarPriorityText: "контроль втоми",
    signalA: "Локальний розрахунок",
    signalB: "Прозорі фактори",
    trust1Title: "Без передачі даних",
    trust1Desc: "Анкета обробляється у браузері",
    trust2Title: "Без чорної скриньки",
    trust2Desc: "Кожен внесок можна перевірити",
    trust3Title: "Два різні контексти",
    trust3Desc: "Оцінка ≠ частка інцидентів",
    navAssess: "Оцінювання",
    navCases: "Аварії MAIB",
    navStats: "Статистика",
    navMethod: "Методика",
    bridgeCockpit: "⚓ Ніч",
    bridgeRed: "🔴 Red",
    bridgeDay: "☀️ День",
    statusPill: "Дослідницький прототип",
    calcBtn: "Розрахувати ризик",
    radarTab: "🎯 Аналіз і радар",
    whatifTab: "⚡ What-If",
    checklistTab: "📋 Чек-лист",
    methodTab: "🔬 Методика",
    sectionEyebrow: "Індивідуальне оцінювання",
    formHeading: "Профіль працівника",
    sectionSubtitle: "Заповнення займає приблизно дві хвилини. Поля не зберігаються після закриття сторінки.",
    scenarioBadge: "Без особистих даних",
    scenarioTitle: "Спробуйте вигаданий сценарій",
    scenarioLabel: "Демонстраційний профіль",
    demoOptCadet: "Курсант · навчальна практика",
    demoOptEngine: "Механік · нічні зміни",
    demoOptDeck: "Палубна команда · висока експозиція",
    scenarioApplyBtn: "Застосувати",
    fs1Legend: "Основні дані",
    ageLabel: "Вік",
    sexLabel: "Стать",
    sexMale: "Чоловіча",
    sexFemale: "Жіноча",
    residenceLabel: "Місце проживання",
    resCity: "Місто",
    resVillage: "Сільська місцевість",
    chronicLabel: "Хронічні захворювання",
    fs2Legend: "Робота та експозиція",
    roleLabel: "Професійна група",
    hoursLabel: "Робочих годин на рік",
    nightLabel: "Нічні зміни, %",
    watchLabel: "Розклад вахт",
    vesselLabel: "Тип судна / флот",
    ppeLabel: "Завжди використовую ЗІЗ",
    previousLabel: "Був інцидент за 3 роки",
    fs3Legend: "Додаткові фактори",
    smokingLabel: "Куріння",
    alcoholLabel: "Регулярне надмірне вживання алкоголю",
    exportProfileBtn: "Експорт профілю (.json)",
    importProfileBtn: "Імпорт з файлу",
    privacyNote: "Приватність: вводьте лише власні дані й лише добровільно. Значення обробляються в цьому браузері, не зберігаються та не надсилаються. Не вводьте ПІБ, контакти чи дані іншої людини.",
    formFooterNote: "Результат є дослідницькою оцінкою, а не медичним чи професійним висновком.",
    resKicker: "Демонстраційний індекс прототипу",
    registryLabel: "Реєстр",
    previewBold: "Попередній перегляд.",
    previewText: "Показано розрахунок для дефолтних значень форми. Заповніть анкету та натисніть «Розрахувати ризик», щоб побачити свій результат.",
    disclaimerBold: "Орієнтовна оцінка.",
    disclaimerText: "Показує відносну структуру факторів, але не є точною ймовірністю травми чи загибелі та може відрізнятися від фактичного ризику.",
    riskRatioText: "Не є ймовірністю травми або загибелі",
    sciNotationPrefix: "інженерний показник",
    meterLow: "Низький",
    meterMid: "Середній",
    meterHigh: "Екстремальний · навчальна шкала",
    liveRadarTitle: "Профіль факторів (LIVE)",
    liveRadarSubtitle: "Нормований радар поточного розрахунку",
    lra1: "Здоров'я", lra2: "Експозиція", lra3: "Нічні", lra4: "Звички", lra5: "ЗІЗ",
    bmTag: "ГАЛУЗЕВИЙ ОРІЄНТИР · BIMCO / ICS",
    bmTitle: "Порівняння зі світовим флотом",
    bmHoursLabel: "Річне навантаження",
    bmNightLabel: "Нічні вахти",
    bmFleetNorm: "норма флоту",
    bmOverNorm: "до норми",
    bmUnderNorm: "від норми",
    bmTypicalWatch: "типова вахта 4/8",
    bmNightMore: "нічних",
    bmNightLess: "нічних",
    bmNote: "Орієнтири базуються на узагальнених даних звітів BIMCO/ICS Seafarer Workforce. Не є персональною нормою.",
    circKicker: "SAFTE / FAST BIODYNAMICS · IMO MSC/CIRC.1598",
    circTitle: "Циркадна уважність і сонливість (KSS)",
    circDebtLabel: "Дефіцит сну",
    circNadirLabel: "Пік уразливості",
    circStatusLabel: "Статус небезпеки",
    tzShiftLabel: "Транзит через часові пояси (Jet-lag):",
    circAlertness: "Бадьорість",
    circWatchBadge: "Вахта",
    circBalancedText: "Циркадний профіль збалансований: сон та період відновлення відповідають нормі.",
    fatigueControlled: "Контрольовано",
    fatigueElevated: "Підвищений",
    fatigueCritical: "Критичний",
    hrsPerWeek: "год/тижд",
    yearsUnit: "років",
    hoursUnit: "год",
    secondsUnit: "с",
    hrsUnit: "год",
    weatherKicker: "ГІДРОМЕТЕОРОЛОГІЧНІ НЕБЕЗПЕКИ · ISO 2631 / POLAR CODE",
    weatherTitle: "Погодні умови та морське середовище",
    weatherSliderLabel: "Шкала Бофорта (хвилювання моря 0–12):",
    beaufortUnit: "балів",
    polarToggleSpan: "Полярні води (IMO Polar Code · ризик обледеніння)",
    engineHeatToggleSpan: "Тепловий стрес машинного відділення (WBGT > 32°C)",
    wm1Span: "Хитавиця та заколисування (MSI)",
    wm1Small: "ймовірність морської хвороби за 2 год",
    wm2Span: "Коефіцієнт ковзання палуби",
    wm2Small: "ризик послизання під час качки",
    weatherCalmTitle: "Сприятливі погодні умови",
    weatherCalmAdvice: "Стандартні процедури безпеки відповідно до СУБ судна.",
    breakdownTitle: "Внесок факторів",
    detailsHide: "Сховати деталі",
    detailsShow: "Показати деталі",
    factorBreakdownLabels: { health: "Вік і здоров'я", occupation: "Професійна експозиція", lifestyle: "Спосіб життя" },
    factorShare: "внеску",
    recsTitle: "Що варто контролювати",
    groundedKicker: "MAIB GROUNDED RETRIEVAL · ОФІЦІЙНА ВИБІРКА",
    groundedTitle: "Релевантні інциденти у флоті",
    groundedBadge: "Джерельно прив'язано",
    groundedFactsTitle: "Факти вибірки розслідувань:",
    groundedExplTitle: "Факторний аналіз групи:",
    groundedDisclaimer: "Це статистика записів про постраждалих у вибірці MAIB, а не персональна ймовірність настання події.",
    groundedWaiting: "Очікування завантаження даних або профіль не має точних збігів.",
    profileSummaryTitle: "Вхідний профіль",
    defaultScenarioName: "Користувацький профіль",
    profileSummaryDatePrefix: "Сформовано локально:",
    profileSummaryDateSuffix: "Дані не збережено.",
    sumAge: "Вік", sumSex: "Стать", sumResidence: "Місце проживання", sumRole: "Професійна група",
    sumHours: "Робоча експозиція", sumNight: "Нічні зміни", sumWatch: "Розклад вахт",
    sumVessel: "Тип судна / флот", sumPpe: "ЗІЗ", sumMarkers: "Додаткові маркери",
    yes: "так", no: "ні",
    markerChronic: "хронічний стан", markerPrevious: "попередній інцидент",
    markerSmoking: "куріння", markerAlcohol: "ризикове вживання алкоголю", markerNone: "не вибрано",
    whatIfTitle: "Симуляція «Що, якщо?»",
    whatIfSubtitle: "Оцінка потенційного зниження ризику",
    whatIfDelta: "ризику",
    whatIfAfter: "Оцінка після зміни",
    whatIfBtn: "Змоделювати",
    whatIfSimPrefix: "Моделювання",
    whatIfEmpty: "Для поточного профілю оптимізовані ключові керовані параметри (використовуються ЗІЗ, нормальний графік відпочинку).",
    sensKicker: "ФАКТОРНИЙ АНАЛІЗ · TORNADO RANKING",
    sensTitle: "Чутливість та маржинальний вплив",
    sensSubtitle: "Маржинальна еластичність: ранжування факторів за силою впливу на зміну загального показника безпеки.",
    sensLeadFactor: "Провідний фактор",
    sensCurrent: "Поточний",
    sensOptimal: "Оптимальний",
    sensEmpty: "Для обраного профілю чутливість базових параметрів знаходиться в межах мінімальної похибки.",
    sensMinImpact: "Мінімальний вплив",
    clKicker: "ОПБ / ПЕРЕДЗМІННИЙ ЧЕК-ЛИСТ",
    clTitle: "Контрольний список вахти",
    clCompleted: "виконано",
    pscKicker: "PORT STATE CONTROL & OCIMF SIRE 2.0",
    pscTitle: "Готовність до перевірки інспекцією PSC",
    pscOptimal: "Висока готовність",
    pscWarning: "Помірний ризик",
    pscCritical: "Критичний ризик",
    pscCleanText: "Невідповідностей за MLC 2006 та STCW A-VIII/1 не виявлено. Профіль відповідає вимогам конвенцій.",
    pscCapTitle: "План коригувальних дій (CAP):",
    drillKicker: "SOLAS III/19 · АВАРІЙНІ ТРИВОГИ",
    drillTitle: "Симуляція реакції на тривогу",
    drillDelaySpan: "Затримка реакції",
    drillDelaySmall: "через фактори втоми",
    drillErrorSpan: "Ймовірність помилки",
    drillErrorSmall: "критичні збої дій",
    drillReadinessSpan: "Рівень готовності",
    drillReadinessSmall: "за розкладом Muster List",
    drillReadinessLabels: { optimal: "Оптимальний", degraded: "Знижений", critical: "Критичний" },
    qrKicker: "ZERO-DATA OFFLINE HANDOVER · PURE 2D MATRIX",
    qrTitle: "Офлайн-передача стану вахти (QR)",
    qrBadge: "Без мережі",
    qrLead: "Скануйте з екрана для миттєвої передачі параметрів безпеки вахтовому помічнику (Relieving Officer) без Інтернету чи супутникового каналу.",
    qrMetaText: "Деперсоналізований оптичний зріз вахти",
    fsaKicker: "IMO FSA METHODOLOGY · MSC-MEPC.2/CIRC.12",
    fsaTitle: "Матриця ризиків IMO FSA",
    fsaBadge: "Оцінка матриці",
    fsaHeaderCell: "Наслідки ↓ / Частота →",
    fsaMarker: "● ВИ",
    fsaRiskIndex: "Індекс ризику",
    academicKicker: "ACADEMIC RESEARCH TOOLKIT · REPRODUCIBILITY",
    academicTitle: "Експорт наукових артефактів (LaTeX / BibTeX / CSV)",
    academicLead: "Генеруйте верифіковані матриці даних та готові таблиці для публікацій у наукових журналах (Scopus, WoS) або дипломних робіт.",
    copyLatexBtn: "📋 Копіювати LaTeX таблицю",
    copyBibtexBtn: "📚 Копіювати BibTeX цитування",
    downloadCsvBtn: "📊 Завантажити CSV зріз",
    copiedLatexNotice: "✓ Скопійовано!",
    copiedBibtexNotice: "✓ Скопійовано!",
    compareKicker: "COMPARATIVE RISK ASSESSMENT",
    compareTitle: "Порівняння вахтових профілів",
    compareColA: "Поточний розрахунок",
    compareColB: "Альтернативний графік (3-вахтовий 4/8 + ЗІЗ)",
    compDeltaLower: "ризику",
    compBase: "Базовий рівень",
    compNoteBetter: (pct) => `Оптимізація режиму вахт та обов'язкові ЗІЗ зменшують індекс ризику на ${pct}%.`,
    compNoteStandard: "Поточний профіль уже максимально наближений до рекомендованого стандарту безпеки.",
    modelStatusDt: "Статус моделі",
    modelVersionDt: "Версія",
    modelUncertaintyDt: "Невизначеність",
    modelProvisional: "Попередня · невалідована",
    modelUncertaintyPrefix: "Не оцінена",
    evidenceSummary: "Джерела компонентів і статус перевірки",
    calcSummary: "Формула та припущення",
    glossarySummary: "Морський глосарій і стандарти IMO / ILO",
    evidenceStatusLabels: { disputed: "Спірне джерело", synthetic_demo: "Синтетичне припущення", approved: "Перевірено" },
    evidenceUnit: "Одиниця", evidencePop: "популяція", evidencePeriod: "період",
    formulaCopy: "Формула: 1 − (1 − Rздоров'я) × (1 − Rробота) × (1 − Rспосіб життя). Значення округлено до трьох значущих цифр.",
    printReportBtn: "Друк / зберегти PDF",
    printReportSmall: "Діалог друку відкривається локально у браузері.",
    pDocType: "МОРСЬКИЙ САМОАУДИТ ВАХТИ",
    pDocTitle: "КАРТКА ПЕРЕВІРКИ ФАКТОРІВ РИЗИКУ (SAFETY WATCHKEEPING)",
    pDocStamp: "Zero-Data Local Audit",
    sigCol1Span: "Підпис вахтового помічника / курсанта:",
    sigCol1Small: "Підтверджую коректність внесених годин та стану",
    sigCol2Span: "Офіцер з безпеки (Safety Officer / Ch.Off):",
    sigCol2Small: "Ознайомлений із показниками ризику та планом вахти",
    printDisclaimer: "SeaRisk UA (ДІ НУ «ОМА»). Розрахунок виконано локально на браузерному рушії. Документ призначений для самоконтролю безпеки мореплавства та не замінює обов'язкові суднові форми СУБ.",
    casesEyebrow: "Уроки розслідувань · MAIB Lessons Learned",
    casesTitle: "Розбір реальних морських аварій",
    casesDesc: "Офіційні розслідування Marine Accident Investigation Branch (MAIB) доводять: перевтома, порушення режиму праці (MLC 2006) та людський фактор призводять до катастроф. Завантажте профіль інциденту в калькулятор, щоб побачити факторний аналіз ризику.",
    caseLoadBtn: "⚡ Завантажити в калькулятор",
    caseLink: "Звіт розслідування ↗",
    statsEyebrow: "Контекст інцидентів",
    statsTitle: "Що відбувається у вибірці",
    statsDesc: "Це частки серед агрегованих записів MAIB про постраждалих, а не ймовірність для конкретної людини.",
    statsRoleLabel: "Професійна група",
    statsVesselLabel: "Тип судна",
    allRoles: "Усі групи",
    allVessels: "Усі судна",
    officialChip: "Офіційні агрегати MAIB",
    statTotalSpan: "Записів про постраждалих",
    statTotalSmall: "після фільтрації й подавлення",
    statInjurySpan: "З травмуванням",
    statInjurySmall: "частка опублікованих записів",
    statFatalSpan: "З летальним наслідком",
    statFatalSmall: "частка опублікованих записів",
    eventTypesSpan: "Типи подій",
    eventTypesH3: "Структура вибірки",
    eventTypesSmall: "% записів",
    severitySpan: "Наслідки",
    severityH3: "Тяжкість інцидентів",
    severitySmall: "умовний розподіл",
    donutRecordsSpan: "записів",
    sourceNote: "Джерело: MAIB Data Portal, завантажено 10.10.2026. Комбінації з менш ніж 5 записами не публікуються, тому показані підсумки можуть бути нижчими за повні. Дані не містять знаменника експозиції й не дають персональної ймовірності.",
    officialContextSpan: "Інші офіційні джерела",
    officialContextH3: "Окремий контекст без змішування вибірок",
    emptyFilterEvents: "Для цього поєднання фільтрів подій немає.",
    metaSourceVer: "Джерело · версія",
    metaPeriodPub: "Період · опубліковано",
    metaActiveFilters: "Активні фільтри",
    metaDataType: "Тип даних",
    metaDefTitle: "Що означає показник",
    metaOfficialAgg: "Офіційні агреговані дані",
    metaSyntheticDemo: "Синтетичні DEMO-дані",
    metaDefEvent: "Частка типів подій серед опублікованих записів про постраждалих. Один інцидент може мати кілька таких записів. Не є індивідуальним ризиком.",
    metaDefSeverity: "Умовний розподіл наслідків серед опублікованих записів про постраждалих. Не є ймовірністю для працівника.",
    filterAll: "усі",
    methodEyebrow: "Принципи методики",
    methodTitle: "Число має пояснення",
    methodDesc: "Публічна версія є завершеним освітнім продуктом, але її експериментальні коефіцієнти не є сертифікованою методикою.",
    methodP1H3: "Прозорий алгоритм",
    methodP1P: "Підсумок складається з версійованих компонентів. AI не обчислює числове значення.",
    methodP2H3: "Правильний знаменник",
    methodP2P: "Для статистичного ризику потрібні години, рейси, операції або кількість працівників — не лише події.",
    methodP3H3: "Чіткі межі",
    methodP3P: "Це дослідницький інструмент, а не допуск до роботи, медичний висновок чи прогноз долі людини.",
    govSpan: "Пілотне обмеження",
    govTitle: "Не використовувати для рішень про людину",
    govText: "Результат заборонено застосовувати для найму, звільнення, допуску чи розподілу змін, дисциплінарних, страхових або медичних рішень. Він призначений для самостійного навчання, аналізу факторів і демонстрації методики.",
    backToTop: "Нагору ↑",
    footerAuthor: "Науково-дослідний студентський прототип · Автор розробки: курсант Роман Налапко (гр. 511, ДІ НУ «ОМА»).",
    footerDisclosureSummary: "Правові застереження, методологія та політика конфіденційності (Zero-Data)",
    disc1H4: "Політика повної приватності (Zero-Data Retention)",
    disc1P: "Сервіс працює виключно на стороні клієнта (Client-Side). Жодні введені дані, параметри анкети, технічні ідентифікатори або cookies не передаються на сервери та не зберігаються після оновлення сторінки. Додаток не використовує трекерів чи комерційної аналітики.",
    disc2H4: "Академічний статус і відмова від відповідальності",
    disc2P: "SeaRisk UA є науково-навчальним прототипом для аналізу факторів ризику та демонстрації математичної моделі. Розрахунки не є сертифікованими оцінками безпеки (ISM Code / SMS), медичними висновками чи офіційним допуском до робіт. Інструмент не замінює обов'язкові суднові чек-листи компанії та конвенційні вимоги капітана.",
    disc3H4: "Нормативне підґрунтя",
    disc3P: "Оцінювання спирається на принципи Конвенції про працю в морському судноплавстві (MLC 2006, Standard A2.3), Міжнародної конвенції ПДНВ (STCW 1978/2010, Section A-VIII/1) та деперсоналізовані зведені звіти розслідувань морських аварій (MAIB, EMSA).",
    footerCopyright: "© 2026 SeaRisk UA. Відкритий академічний код (Open Source). Дані анкети не залишають браузер.",
    announceResult: "Результат оновлено. Оцінка ризику",
    announceCategory: "Категорія",
    riskCats: { minimal: "Мінімальний", low: "Низький", moderate: "Помірний", high: "Високий", extreme: "Дуже високий" },
    importErrorAlert: "Не вдалося імпортувати профіль. Перевірте формат JSON-файлу.",
    importedFileLabel: "Імпортований файл"
  },
  en: {
    locale: "en-GB",
    dateLocale: "en-GB",
    btn: "EN",
    heroTitle: "Understand what shapes maritime occupational risk.",
    heroEyebrow: "Explainable safety factors",
    heroLede: "Free educational toolkit for autonomous analysis of maritime risk contributors — pure client-side computing, incident evidence, and actionable safety steps.",
    heroActionStart: "Start Assessment",
    heroActionMethod: "How the Model Works",
    heroRadarTopline: "Risk Profile",
    radarLabel1: "Fatigue",
    radarLabel2: "Operations",
    radarLabel3: "Health",
    radarLabel4: "Habits",
    radarLabel5: "Environment",
    radarPriorityLabel: "Priority",
    radarPriorityText: "fatigue mitigation",
    signalA: "Client-side computing",
    signalB: "Transparent factors",
    trust1Title: "Zero Data Transmitted",
    trust1Desc: "Processed strictly in your browser",
    trust2Title: "No Black Box",
    trust2Desc: "Every contributor is verifiable",
    trust3Title: "Two Distinct Contexts",
    trust3Desc: "Individual metric ≠ accident share",
    navAssess: "Assessment",
    navCases: "Accidents (MAIB)",
    navStats: "Statistics",
    navMethod: "Methodology",
    bridgeCockpit: "⚓ Night",
    bridgeRed: "🔴 Red",
    bridgeDay: "☀️ Day",
    statusPill: "Research Prototype",
    calcBtn: "Calculate Risk Index",
    radarTab: "🎯 Analysis & Radar",
    whatifTab: "⚡ What-If Simulation",
    checklistTab: "📋 Watch Checklist",
    methodTab: "🔬 Methodology & FSA",
    sectionEyebrow: "Individual Assessment",
    formHeading: "Seafarer Watch Profile",
    sectionSubtitle: "Takes about two minutes. Fields are never retained after closing the page.",
    scenarioBadge: "No personal data",
    scenarioTitle: "Try a realistic mock scenario",
    scenarioLabel: "Demonstration profile",
    demoOptCadet: "Cadet · training voyage",
    demoOptEngine: "Engineer · night watches",
    demoOptDeck: "Deck crew · heavy exposure",
    scenarioApplyBtn: "Apply",
    fs1Legend: "General Info",
    ageLabel: "Age",
    sexLabel: "Gender",
    sexMale: "Male",
    sexFemale: "Female",
    residenceLabel: "Place of residence",
    resCity: "Urban / City",
    resVillage: "Rural area",
    chronicLabel: "Chronic health conditions",
    fs2Legend: "Work & Operational Exposure",
    roleLabel: "Professional role",
    hoursLabel: "Working hours per year",
    nightLabel: "Night watches, %",
    watchLabel: "Watchkeeping system",
    vesselLabel: "Vessel type / fleet",
    ppeLabel: "Always use mandatory PPE",
    previousLabel: "Involved in incident within 3 years",
    fs3Legend: "Ergonomic & Lifestyle Factors",
    smokingLabel: "Smoking tobacco",
    alcoholLabel: "Regular heavy alcohol consumption",
    exportProfileBtn: "Export Profile (.json)",
    importProfileBtn: "Import from file",
    privacyNote: "Privacy: Enter only your own data and purely voluntarily. Values are computed locally in this browser, never stored, and never sent remotely. Do not enter names or third-party details.",
    formFooterNote: "The output is a research estimate, not a medical or occupational certification.",
    resKicker: "Provisional Research Safety Metric",
    registryLabel: "Registry",
    previewBold: "Preview mode.",
    previewText: "Showing calculation for default values. Fill out the questionnaire and click «Calculate Risk Index» to see your result.",
    disclaimerBold: "Provisional estimate.",
    disclaimerText: "Demonstrates relative factor weights; not an exact probability of injury or fatality and may differ from real-world risk.",
    riskRatioText: "Not personal incident probability",
    sciNotationPrefix: "scientific notation",
    meterLow: "Low",
    meterMid: "Moderate",
    meterHigh: "Extreme · academic scale",
    liveRadarTitle: "Factor Profile (LIVE)",
    liveRadarSubtitle: "Normalized radar of current calculation",
    lra1: "Health", lra2: "Exposure", lra3: "Night", lra4: "Habits", lra5: "PPE",
    bmTag: "FLEET BENCHMARK · BIMCO / ICS",
    bmTitle: "World Fleet Baseline Comparison",
    bmHoursLabel: "Annual workload",
    bmNightLabel: "Night watches",
    bmFleetNorm: "fleet norm",
    bmOverNorm: "above baseline",
    bmUnderNorm: "below baseline",
    bmTypicalWatch: "typical 4/8 watch",
    bmNightMore: "night watches",
    bmNightLess: "night watches",
    bmNote: "Benchmarks derived from aggregated BIMCO/ICS Seafarer Workforce reports. Not a personal quota.",
    circKicker: "SAFTE / FAST BIODYNAMICS · IMO MSC/CIRC.1598",
    circTitle: "Circadian Alertness & Sleepiness (KSS)",
    circDebtLabel: "Sleep debt",
    circNadirLabel: "Vulnerability nadir",
    circStatusLabel: "Hazard status",
    tzShiftLabel: "Time zone transit shift (Jet-lag):",
    circAlertness: "Alertness",
    circWatchBadge: "Watch",
    circBalancedText: "Circadian profile is well balanced: restorative sleep and circadian rhythms are within normal parameters.",
    fatigueControlled: "Controlled",
    fatigueElevated: "Elevated",
    fatigueCritical: "Critical",
    hrsPerWeek: "hrs/week",
    yearsUnit: "years",
    hoursUnit: "hrs",
    secondsUnit: "s",
    hrsUnit: "hrs",
    weatherKicker: "HYDROMETEOROLOGICAL HAZARDS · ISO 2631 / POLAR CODE",
    weatherTitle: "Weather Conditions & Marine Environment",
    weatherSliderLabel: "Beaufort Scale (Sea State 0–12):",
    beaufortUnit: "Beaufort",
    polarToggleSpan: "Polar waters (IMO Polar Code · icing hazard)",
    engineHeatToggleSpan: "Engine room thermal heat stress (WBGT > 32°C)",
    wm1Span: "Motion Sickness Incidence (MSI)",
    wm1Small: "seasickness probability over 2h",
    wm2Span: "Deck Slip Hazard Factor",
    wm2Small: "slip risk during rolling and pitch",
    weatherCalmTitle: "Favourable Weather Conditions",
    weatherCalmAdvice: "Standard shipboard safety procedures per company SMS.",
    breakdownTitle: "Factor Breakdown",
    detailsHide: "Hide details",
    detailsShow: "Show details",
    factorBreakdownLabels: { health: "Age & Health", occupation: "Occupational Exposure", lifestyle: "Lifestyle Factors" },
    factorShare: "share",
    recsTitle: "Actionable Safety Controls",
    groundedKicker: "MAIB GROUNDED RETRIEVAL · OFFICIAL DATASET",
    groundedTitle: "Relevant Fleet Incident Records",
    groundedBadge: "Source-Grounded",
    groundedFactsTitle: "Investigation sample facts:",
    groundedExplTitle: "Group factor analysis:",
    groundedDisclaimer: "These are aggregated casualty statistics from MAIB investigations, not an individual probability of an event.",
    groundedWaiting: "Awaiting data load or profile has no exact subset matches.",
    profileSummaryTitle: "Input Profile",
    defaultScenarioName: "Custom Profile",
    profileSummaryDatePrefix: "Computed locally:",
    profileSummaryDateSuffix: "Zero data retained.",
    sumAge: "Age", sumSex: "Gender", sumResidence: "Residence", sumRole: "Role",
    sumHours: "Working exposure", sumNight: "Night watches", sumWatch: "Watchkeeping",
    sumVessel: "Vessel type", sumPpe: "PPE", sumMarkers: "Additional markers",
    yes: "yes", no: "no",
    markerChronic: "chronic condition", markerPrevious: "prior incident",
    markerSmoking: "smoking", markerAlcohol: "heavy alcohol", markerNone: "none",
    whatIfTitle: "What-If Simulation",
    whatIfSubtitle: "Estimated potential risk reduction",
    whatIfDelta: "risk",
    whatIfAfter: "Post-mitigation metric",
    whatIfBtn: "Simulate",
    whatIfSimPrefix: "Simulation",
    whatIfEmpty: "Key controllable safety parameters are already optimized for this profile (PPE compliance, standard watch rotation).",
    sensKicker: "FACTOR SENSITIVITY · TORNADO RANKING",
    sensTitle: "Sensitivity & Marginal Elasticity",
    sensSubtitle: "Marginal elasticity: ranking factors by their influence on the total safety index.",
    sensLeadFactor: "Leading factor",
    sensCurrent: "Current",
    sensOptimal: "Optimal",
    sensEmpty: "For this profile, marginal factor sensitivity is within minimal variance.",
    sensMinImpact: "Minimal variance",
    clKicker: "SAFETY / PRE-WATCH CHECKLIST",
    clTitle: "Watchkeeping Checklist",
    clCompleted: "completed",
    pscKicker: "PORT STATE CONTROL & OCIMF SIRE 2.0",
    pscTitle: "PSC & SIRE 2.0 Inspection Readiness",
    pscOptimal: "High Readiness",
    pscWarning: "Moderate Risk",
    pscCritical: "Critical Risk",
    pscCleanText: "Zero non-conformities under MLC 2006 and STCW A-VIII/1. Profile fully satisfies convention standards.",
    pscCapTitle: "Corrective Action Plan (CAP):",
    drillKicker: "SOLAS III/19 · EMERGENCY DRILLS",
    drillTitle: "Emergency Response Simulation",
    drillDelaySpan: "Reaction delay",
    drillDelaySmall: "due to fatigue factors",
    drillErrorSpan: "Error probability",
    drillErrorSmall: "critical action failures",
    drillReadinessSpan: "Readiness level",
    drillReadinessSmall: "per Muster List standard",
    drillReadinessLabels: { optimal: "Optimal", degraded: "Degraded", critical: "Critical" },
    qrKicker: "ZERO-DATA OFFLINE HANDOVER · PURE 2D MATRIX",
    qrTitle: "Offline Watch Handover (QR)",
    qrBadge: "No Network Needed",
    qrLead: "Scan on screen for instant watch safety parameter transfer to the Relieving Officer without Internet or satellite link.",
    qrMetaText: "Depersonalized optical watch snapshot",
    fsaKicker: "IMO FSA METHODOLOGY · MSC-MEPC.2/CIRC.12",
    fsaTitle: "IMO FSA Risk Matrix",
    fsaBadge: "Matrix Evaluation",
    fsaHeaderCell: "Severity ↓ / Frequency →",
    fsaMarker: "● YOU",
    fsaRiskIndex: "Risk Index",
    academicKicker: "ACADEMIC RESEARCH TOOLKIT · REPRODUCIBILITY",
    academicTitle: "Export Academic Artifacts (LaTeX / BibTeX / CSV)",
    academicLead: "Generate verified data matrices and formatted tables for scientific publications (Scopus, WoS) or graduation theses.",
    copyLatexBtn: "📋 Copy LaTeX Table",
    copyBibtexBtn: "📚 Copy BibTeX Citation",
    downloadCsvBtn: "📊 Download CSV Snapshot",
    copiedLatexNotice: "✓ Copied!",
    copiedBibtexNotice: "✓ Copied!",
    compareKicker: "COMPARATIVE RISK ASSESSMENT",
    compareTitle: "Watchkeeping Profile Comparison",
    compareColA: "Current Calculation",
    compareColB: "Alternative Schedule (3-watch 4/8 + PPE)",
    compDeltaLower: "risk",
    compBase: "Baseline Level",
    compNoteBetter: (pct) => `Operational watch schedule optimization and mandatory PPE reduce the risk index by ${pct}%.`,
    compNoteStandard: "Current profile is already aligned with the recommended maritime safety benchmark.",
    modelStatusDt: "Model status",
    modelVersionDt: "Version",
    modelUncertaintyDt: "Uncertainty",
    modelProvisional: "Provisional · unvalidated",
    modelUncertaintyPrefix: "Unquantified",
    evidenceSummary: "Component Sources & Validation Status",
    calcSummary: "Formula & Assumptions",
    glossarySummary: "Maritime Glossary & IMO / ILO Standards",
    evidenceStatusLabels: { disputed: "Disputed source", synthetic_demo: "Synthetic assumption", approved: "Verified" },
    evidenceUnit: "Unit", evidencePop: "population", evidencePeriod: "period",
    formulaCopy: "Formula: 1 − (1 − Rhealth) × (1 − Rjob) × (1 − Rlifestyle). Rounded to three significant digits.",
    printReportBtn: "Print / Save PDF",
    printReportSmall: "Print dialogue opens locally in your browser.",
    pDocType: "MARITIME WATCH AUDIT",
    pDocTitle: "SAFETY WATCHKEEPING FACTOR VERIFICATION CARD",
    pDocStamp: "Zero-Data Local Audit",
    sigCol1Span: "Watch Officer / Cadet signature:",
    sigCol1Small: "I confirm the accuracy of reported hours and fitness status",
    sigCol2Span: "Safety Officer / Chief Officer:",
    sigCol2Small: "Noted watch profile metrics and watchkeeping plan",
    printDisclaimer: "SeaRisk UA. Pure browser client-side computation. For educational self-audit; does not replace mandatory SMS safety forms.",
    casesEyebrow: "Investigation Lessons · MAIB Lessons Learned",
    casesTitle: "Analysis of Real Maritime Casualties",
    casesDesc: "Official investigations by the Marine Accident Investigation Branch (MAIB) demonstrate: acute exhaustion, work hour violations (MLC 2006), and human factors trigger catastrophic casualties. Load real incident profiles to review factor breakdown.",
    caseLoadBtn: "⚡ Load into Calculator",
    caseLink: "Investigation Report ↗",
    statsEyebrow: "Incident Context",
    statsTitle: "Dataset Breakdown",
    statsDesc: "Proportions among aggregated MAIB casualty records, not personal probability for an individual.",
    statsRoleLabel: "Professional role",
    statsVesselLabel: "Vessel type",
    allRoles: "All roles",
    allVessels: "All vessels",
    officialChip: "Official MAIB Aggregates",
    statTotalSpan: "Casualty records",
    statTotalSmall: "after suppression filters",
    statInjurySpan: "Non-fatal injuries",
    statInjurySmall: "share of records",
    statFatalSpan: "Fatal casualties",
    statFatalSmall: "share of records",
    eventTypesSpan: "Event types",
    eventTypesH3: "Sample Distribution",
    eventTypesSmall: "% of records",
    severitySpan: "Outcomes",
    severityH3: "Incident Severity",
    severitySmall: "conditional distribution",
    donutRecordsSpan: "records",
    sourceNote: "Source: MAIB Data Portal, extracted 10.10.2026. Cells with <5 records suppressed. Aggregates lack denominator exposure hours and do not represent personal probability.",
    officialContextSpan: "External Official Sources",
    officialContextH3: "Separate context without pooling datasets",
    emptyFilterEvents: "No events recorded for this filter combination.",
    metaSourceVer: "Source · Version",
    metaPeriodPub: "Period · Sample",
    metaActiveFilters: "Active Filters",
    metaDataType: "Data Type",
    metaDefTitle: "Metric Definition",
    metaOfficialAgg: "Official Aggregated Data",
    metaSyntheticDemo: "Synthetic DEMO Data",
    metaDefEvent: "Proportion of event types among published casualty records. One incident may contain multiple casualties. Not personal risk.",
    metaDefSeverity: "Conditional severity distribution among recorded casualties. Not personal probability.",
    filterAll: "all",
    methodEyebrow: "Methodological Principles",
    methodTitle: "Numbers Must Be Explainable",
    methodDesc: "Public version is an educational toolkit; its experimental coefficients are not certified safety regulations.",
    methodP1H3: "Transparent Algorithm",
    methodP1P: "Calculated deterministically from versioned components. AI never modifies numeric output.",
    methodP2H3: "Valid Denominators",
    methodP2P: "Statistical risk requires hours, voyages, or workers at risk — not merely raw casualty counts.",
    methodP3H3: "Clear Boundaries",
    methodP3P: "This is a research tool, not fitness-for-duty certification, medical advice, or fate forecasting.",
    govSpan: "Pilot Limitation",
    govTitle: "Never Use for Employment or Legal Decisions",
    govText: "The result must never be used for hiring, firing, shift allocation, disciplinary, insurance, or medical decisions. Intended exclusively for independent learning, factor exploration, and methodology demonstration.",
    backToTop: "Top ↑",
    footerAuthor: "Research Student Prototype · Lead Developer: Cadet Roman Nalapko (Group 511, NU «OMA»).",
    footerDisclosureSummary: "Legal Disclaimers, Methodology & Zero-Data Retention Policy",
    disc1H4: "Zero-Data Retention Policy",
    disc1P: "The service operates 100% on the client side. No personal data, questionnaire parameters, or cookies are transmitted to servers or retained after closing the page. Zero commercial analytics or tracking.",
    disc2H4: "Academic Status & Disclaimer",
    disc2P: "SeaRisk UA is an educational research prototype for maritime safety factor analysis. Results do not constitute certified SMS / ISM Code safety assessments, clinical fitness decisions, or official watch clearances.",
    disc3H4: "Regulatory Framework",
    disc3P: "Evaluations reflect principles from the Maritime Labour Convention (MLC 2006 Standard A2.3), STCW 1978/2010 Section A-VIII/1, and official maritime casualty investigation reports (MAIB, EMSA).",
    footerCopyright: "© 2026 SeaRisk UA. Open Source Academic Code. Questionnaire data never leaves the browser.",
    announceResult: "Result updated. Calculated risk index",
    announceCategory: "Category",
    riskCats: { minimal: "Minimal", low: "Low", moderate: "Moderate", high: "High", extreme: "Extreme" },
    importErrorAlert: "Could not import profile. Please verify JSON format.",
    importedFileLabel: "Imported File Profile"
  },
  ru: {
    locale: "ru-RU",
    dateLocale: "ru-RU",
    btn: "RU",
    heroTitle: "Узнайте, что именно формирует профессиональный риск.",
    heroEyebrow: "Безопасность с объяснимыми факторами",
    heroLede: "Бесплатный образовательный сервис для самостоятельного анализа факторов морского риска — с локальным расчетом, контекстом инцидентов и практическими шагами.",
    heroActionStart: "Начать оценку",
    heroActionMethod: "Как работает модель",
    heroRadarTopline: "Профиль риска",
    radarLabel1: "Усталость",
    radarLabel2: "Операции",
    radarLabel3: "Здоровье",
    radarLabel4: "Привычки",
    radarLabel5: "Среда",
    radarPriorityLabel: "Приоритет",
    radarPriorityText: "контроль усталости",
    signalA: "Локальный расчет",
    signalB: "Прозрачные факторы",
    trust1Title: "Без передачи данных",
    trust1Desc: "Анкета обрабатывается в браузере",
    trust2Title: "Без черного ящика",
    trust2Desc: "Каждый вклад проверяем",
    trust3Title: "Два разных контекста",
    trust3Desc: "Оценка ≠ доля инцидентов",
    navAssess: "Оценка",
    navCases: "Аварии MAIB",
    navStats: "Статистика",
    navMethod: "Методика",
    bridgeCockpit: "⚓ Ночь",
    bridgeRed: "🔴 Red",
    bridgeDay: "☀️ День",
    statusPill: "Исследовательский прототип",
    calcBtn: "Рассчитать риск",
    radarTab: "🎯 Анализ и радар",
    whatifTab: "⚡ What-If Симуляция",
    checklistTab: "📋 Чек-лист вахты",
    methodTab: "🔬 Методика и FSA",
    sectionEyebrow: "Индивидуальная оценка",
    formHeading: "Профиль моряка",
    sectionSubtitle: "Заполнение занимает около двух минут. Поля не сохраняются после закрытия страницы.",
    scenarioBadge: "Без личных данных",
    scenarioTitle: "Попробуйте учебный сценарий",
    scenarioLabel: "Демонстрационный профиль",
    demoOptCadet: "Курсант · учебная практика",
    demoOptEngine: "Механик · ночные смены",
    demoOptDeck: "Палубная команда · высокая нагрузка",
    scenarioApplyBtn: "Применить",
    fs1Legend: "Основные данные",
    ageLabel: "Возраст",
    sexLabel: "Пол",
    sexMale: "Мужской",
    sexFemale: "Женский",
    residenceLabel: "Место проживания",
    resCity: "Город",
    resVillage: "Сельская местность",
    chronicLabel: "Хронические заболевания",
    fs2Legend: "Работа и экспозиция",
    roleLabel: "Профессиональная группа",
    hoursLabel: "Рабочих часов в год",
    nightLabel: "Ночные смены, %",
    watchLabel: "Расписание вахт",
    vesselLabel: "Тип судна / флот",
    ppeLabel: "Всегда использую СИЗ",
    previousLabel: "Был инцидент за 3 года",
    fs3Legend: "Дополнительные факторы",
    smokingLabel: "Курение",
    alcoholLabel: "Регулярное употребление алкоголя",
    exportProfileBtn: "Экспорт профиля (.json)",
    importProfileBtn: "Импорт из файла",
    privacyNote: "Приватность: вводите только собственные данные и исключительно добровольно. Значения обрабатываются в этом браузере, не сохраняются и никуда не передаются. Не вводите ФИО, контакты или чужие данные.",
    formFooterNote: "Результат является исследовательской оценкой, а не медицинским или профессиональным заключением.",
    resKicker: "Демонстрационный индекс прототипа",
    registryLabel: "Реестр",
    previewBold: "Предварительный просмотр.",
    previewText: "Показан расчет для исходных значений формы. Заполните анкету и нажмите «Рассчитать риск», чтобы увидеть свой результат.",
    disclaimerBold: "Ориентировочная оценка.",
    disclaimerText: "Показывает относительную структуру факторов, но не является точной вероятностью травмы или гибели и может отличаться от фактического риска.",
    riskRatioText: "Не является вероятностью травмы или гибели",
    sciNotationPrefix: "инженерный показатель",
    meterLow: "Низкий",
    meterMid: "Средний",
    meterHigh: "Экстремальный · учебная шкала",
    liveRadarTitle: "Профиль факторов (LIVE)",
    liveRadarSubtitle: "Нормированный радар текущего расчета",
    lra1: "Здоровье", lra2: "Экспозиция", lra3: "Ночные", lra4: "Привычки", lra5: "СИЗ",
    bmTag: "ОТРАСЛЕВОЙ ОРИЕНТИР · BIMCO / ICS",
    bmTitle: "Сравнение с мировым флотом",
    bmHoursLabel: "Годовая нагрузка",
    bmNightLabel: "Ночные вахты",
    bmFleetNorm: "норма флота",
    bmOverNorm: "к норме",
    bmUnderNorm: "от нормы",
    bmTypicalWatch: "типичная вахта 4/8",
    bmNightMore: "ночных",
    bmNightLess: "ночных",
    bmNote: "Ориентиры основаны на обобщенных отчетах BIMCO/ICS Seafarer Workforce. Не являются персональной нормой.",
    circKicker: "SAFTE / FAST BIODYNAMICS · IMO MSC/CIRC.1598",
    circTitle: "Циркадная бдительность и сонливость (KSS)",
    circDebtLabel: "Дефицит сна",
    circNadirLabel: "Пик уязвимости",
    circStatusLabel: "Статус опасности",
    tzShiftLabel: "Транзит через часовые пояса (Jet-lag):",
    circAlertness: "Бодрость",
    circWatchBadge: "Вахта",
    circBalancedText: "Циркадный профиль сбалансирован: сон и период восстановления соответствуют норме.",
    fatigueControlled: "Контролируемо",
    fatigueElevated: "Повышенный",
    fatigueCritical: "Критический",
    hrsPerWeek: "ч/неделю",
    yearsUnit: "лет",
    hoursUnit: "ч",
    secondsUnit: "с",
    hrsUnit: "ч",
    weatherKicker: "ГИДРОМЕТЕОРОЛОГИЧЕСКИЕ ОПАСНОСТИ · ISO 2631 / POLAR CODE",
    weatherTitle: "Погодные условия и морская среда",
    weatherSliderLabel: "Шкала Бофорта (волнение моря 0–12):",
    beaufortUnit: "баллов",
    polarToggleSpan: "Полярные воды (IMO Polar Code · риск обледенения)",
    engineHeatToggleSpan: "Тепловой стресс машинного отделения (WBGT > 32°C)",
    wm1Span: "Качка и укачивание (MSI)",
    wm1Small: "вероятность морской болезни за 2 ч",
    wm2Span: "Коэффициент скольжения палубы",
    wm2Small: "риск поскальзывания при качке",
    weatherCalmTitle: "Благоприятные погодные условия",
    weatherCalmAdvice: "Стандартные процедуры безопасности в соответствии с СУБ судна.",
    breakdownTitle: "Вклад факторов",
    detailsHide: "Скрыть детали",
    detailsShow: "Показать детали",
    factorBreakdownLabels: { health: "Возраст и здоровье", occupation: "Профессиональная экспозиция", lifestyle: "Образ жизни" },
    factorShare: "вклада",
    recsTitle: "Что следует контролировать",
    groundedKicker: "MAIB GROUNDED RETRIEVAL · ОФИЦИАЛЬНАЯ ВЫБОРКА",
    groundedTitle: "Релевантные инциденты во флоте",
    groundedBadge: "С привязкой к источнику",
    groundedFactsTitle: "Факты выборки расследований:",
    groundedExplTitle: "Факторный анализ группы:",
    groundedDisclaimer: "Это статистика записей о пострадавших в выборке MAIB, а не персональная вероятность события.",
    groundedWaiting: "Ожидание загрузки данных или профиль не имеет точных совпадений.",
    profileSummaryTitle: "Входной профиль",
    defaultScenarioName: "Пользовательский профиль",
    profileSummaryDatePrefix: "Сформировано локально:",
    profileSummaryDateSuffix: "Данные не сохранены.",
    sumAge: "Возраст", sumSex: "Пол", sumResidence: "Место проживания", sumRole: "Профессиональная группа",
    sumHours: "Рабочая экспозиция", sumNight: "Ночные смены", sumWatch: "Расписание вахт",
    sumVessel: "Тип судна / флот", sumPpe: "СИЗ", sumMarkers: "Дополнительные маркеры",
    yes: "да", no: "нет",
    markerChronic: "хроническое заболевание", markerPrevious: "прошлый инцидент",
    markerSmoking: "курение", markerAlcohol: "употребление алкоголя", markerNone: "не выбрано",
    whatIfTitle: "Симуляция «Что, если?»",
    whatIfSubtitle: "Оценка потенциального снижения риска",
    whatIfDelta: "риска",
    whatIfAfter: "Оценка после изменений",
    whatIfBtn: "Смоделировать",
    whatIfSimPrefix: "Моделирование",
    whatIfEmpty: "Для текущего профиля оптимизированы ключевые управляемые параметры (используются СИЗ, нормальный график отдыха).",
    sensKicker: "ФАКТОРНЫЙ АНАЛИЗ · TORNADO RANKING",
    sensTitle: "Чувствительность и маржинальное влияние",
    sensSubtitle: "Маржинальная эластичность: ранжирование факторов по силе влияния на изменение общего показателя безопасности.",
    sensLeadFactor: "Ведущий фактор",
    sensCurrent: "Текущий",
    sensOptimal: "Оптимальный",
    sensEmpty: "Для выбранного профиля чувствительность базовых параметров находится в пределах минимальной погрешности.",
    sensMinImpact: "Минимальное влияние",
    clKicker: "ОТБ / ПРЕДСМЕННЫЙ ЧЕК-ЛИСТ",
    clTitle: "Контрольный список вахты",
    clCompleted: "выполнено",
    pscKicker: "PORT STATE CONTROL & OCIMF SIRE 2.0",
    pscTitle: "Готовность к проверке инспекцией PSC",
    pscOptimal: "Высокая готовность",
    pscWarning: "Умеренный риск",
    pscCritical: "Критический риск",
    pscCleanText: "Несоответствий по MLC 2006 и STCW A-VIII/1 не обнаружено. Профиль соответствует конвенционным требованиям.",
    pscCapTitle: "План корректирующих действий (CAP):",
    drillKicker: "SOLAS III/19 · СУДОВЫЕ ТРЕВОГИ",
    drillTitle: "Симуляция реакции на тревогу",
    drillDelaySpan: "Задержка реакции",
    drillDelaySmall: "из-за факторов усталости",
    drillErrorSpan: "Вероятность ошибки",
    drillErrorSmall: "критические сбои действий",
    drillReadinessSpan: "Уровень готовности",
    drillReadinessSmall: "по расписанию Muster List",
    drillReadinessLabels: { optimal: "Оптимальный", degraded: "Сниженный", critical: "Критический" },
    qrKicker: "ZERO-DATA OFFLINE HANDOVER · PURE 2D MATRIX",
    qrTitle: "Офлайн-передача состояния вахты (QR)",
    qrBadge: "Без сети",
    qrLead: "Сканируйте с экрана для мгновенной передачи параметров безопасности сменяющему помощнику (Relieving Officer) без Интернета или спутникового канала.",
    qrMetaText: "Деперсонализированный оптический срез вахты",
    fsaKicker: "IMO FSA METHODOLOGY · MSC-MEPC.2/CIRC.12",
    fsaTitle: "Матрица рисков IMO FSA",
    fsaBadge: "Оценка матрицы",
    fsaHeaderCell: "Последствия ↓ / Частота →",
    fsaMarker: "● ВЫ",
    fsaRiskIndex: "Индекс риска",
    academicKicker: "ACADEMIC RESEARCH TOOLKIT · REPRODUCIBILITY",
    academicTitle: "Экспорт научных артефактов (LaTeX / BibTeX / CSV)",
    academicLead: "Генерируйте верифицированные матрицы данных и готовые таблицы для научных публикаций (Scopus, WoS) или дипломных работ.",
    copyLatexBtn: "📋 Копировать LaTeX таблицу",
    copyBibtexBtn: "📚 Копировать BibTeX цитирование",
    downloadCsvBtn: "📊 Скачать CSV срез",
    copiedLatexNotice: "✓ Скопировано!",
    copiedBibtexNotice: "✓ Скопировано!",
    compareKicker: "COMPARATIVE RISK ASSESSMENT",
    compareTitle: "Сравнение вахтенных профилей",
    compareColA: "Текущий расчет",
    compareColB: "Альтернативный график (3-вахтенный 4/8 + СИЗ)",
    compDeltaLower: "риска",
    compBase: "Базовый уровень",
    compNoteBetter: (pct) => `Оптимизация режима вахт и обязательные СИЗ уменьшают индекс риска на ${pct}%.`,
    compNoteStandard: "Текущий профиль уже максимально приближен к рекомендованному стандарту безопасности.",
    modelStatusDt: "Статус модели",
    modelVersionDt: "Версия",
    modelUncertaintyDt: "Неопределенность",
    modelProvisional: "Предварительная · невалидированная",
    modelUncertaintyPrefix: "Не оценена",
    evidenceSummary: "Источники компонентов и статус проверки",
    calcSummary: "Формула и допущения",
    glossarySummary: "Морской глоссарий и стандарты IMO / ILO",
    evidenceStatusLabels: { disputed: "Спорный источник", synthetic_demo: "Синтетическое предположение", approved: "Проверено" },
    evidenceUnit: "Единица", evidencePop: "популяция", evidencePeriod: "период",
    formulaCopy: "Формула: 1 − (1 − Rздоровье) × (1 − Rработа) × (1 − Rобраз жизни). Значения округлены до трех значащих цифр.",
    printReportBtn: "Печать / сохранить PDF",
    printReportSmall: "Диалог печати открывается локально в браузере.",
    pDocType: "МОРСКОЙ САМОАУДИТ ВАХТЫ",
    pDocTitle: "КАРТОЧКА ПРОВЕРКИ ФАКТОРОВ РИСКА (SAFETY WATCHKEEPING)",
    pDocStamp: "Zero-Data Local Audit",
    sigCol1Span: "Подпись вахтенного помощника / курсанта:",
    sigCol1Small: "Подтверждаю корректность внесенных часов и самочувствия",
    sigCol2Span: "Офицер по безопасности (Safety Officer / Ch.Off):",
    sigCol2Small: "Ознакомлен с показателями риска и планом вахты",
    printDisclaimer: "SeaRisk UA. Расчет выполнен локально в браузере. Предназначен для самоконтроля безопасности мореплавания и не заменяет судовые формы СУБ.",
    casesEyebrow: "Уроки расследований · MAIB Lessons Learned",
    casesTitle: "Разбор реальных морских аварий",
    casesDesc: "Официальные расследования Marine Accident Investigation Branch (MAIB) доказывают: переутомление, нарушения режима труда (MLC 2006) и человеческий фактор приводят к катастрофам. Загрузите профиль инцидента в калькулятор, чтобы увидеть факторный анализ риска.",
    caseLoadBtn: "⚡ Загрузить в калькулятор",
    caseLink: "Отчет расследования ↗",
    statsEyebrow: "Контекст инцидентов",
    statsTitle: "Что происходит в выборке",
    statsDesc: "Это доли среди агрегированных записей MAIB о пострадавших, а не вероятность для конкретного человека.",
    statsRoleLabel: "Профессиональная группа",
    statsVesselLabel: "Тип судна",
    allRoles: "Все группы",
    allVessels: "Все суда",
    officialChip: "Официальные агрегаты MAIB",
    statTotalSpan: "Записей о пострадавших",
    statTotalSmall: "после фильтрации и подавления",
    statInjurySpan: "С травмами",
    statInjurySmall: "доля опубликованных записей",
    statFatalSpan: "С летальным исходом",
    statFatalSmall: "доля опубликованных записей",
    eventTypesSpan: "Типы событий",
    eventTypesH3: "Структура выборки",
    eventTypesSmall: "% записей",
    severitySpan: "Последствия",
    severityH3: "Тяжесть инцидентов",
    severitySmall: "условное распределение",
    donutRecordsSpan: "записей",
    sourceNote: "Источник: MAIB Data Portal, загружено 10.10.2026. Комбинации с менее чем 5 записями не публикуются. Данные не содержат знаменателя экспозиции и не дают персональной вероятности.",
    officialContextSpan: "Другие официальные источники",
    officialContextH3: "Отдельный контекст без смешивания выборок",
    emptyFilterEvents: "Для этой комбинации фильтров событий нет.",
    metaSourceVer: "Источник · версия",
    metaPeriodPub: "Период · опубликовано",
    metaActiveFilters: "Активные фильтры",
    metaDataType: "Тип данных",
    metaDefTitle: "Что означает показатель",
    metaOfficialAgg: "Официальные агрегированные данные",
    metaSyntheticDemo: "Синтетические DEMO-данные",
    metaDefEvent: "Доля типов событий среди опубликованных записей о пострадавших. Один инцидент может содержать несколько записей. Не является индивидуальным риском.",
    metaDefSeverity: "Условное распределение последствий среди опубликованных записей о пострадавших. Не является вероятностью для работника.",
    filterAll: "все",
    methodEyebrow: "Принципы методики",
    methodTitle: "Число имеет объяснение",
    methodDesc: "Публичная версия является завершенным образовательным продуктом, но ее экспериментальные коэффициенты не являются сертифицированной методикой.",
    methodP1H3: "Прозрачный алгоритм",
    methodP1P: "Итог складывается из версионированных компонентов. AI не вычисляет числовое значение.",
    methodP2H3: "Правильный знаменатель",
    methodP2P: "Для статистического риска требуются часы, рейсы, операции или количество людей — не только события.",
    methodP3H3: "Четкие границы",
    methodP3P: "Это исследовательский инструмент, а не допуск к работе, медицинское заключение или прогноз судьбы человека.",
    govSpan: "Пилотное ограничение",
    govTitle: "Не использовать для решений о человеке",
    govText: "Результат запрещено применять для найма, увольнения, допуска или распределения смен, дисциплинарных, страховых или медицинских решений. Он предназначен для самостоятельного обучения, анализа факторов и демонстрации методики.",
    backToTop: "Наверх ↑",
    footerAuthor: "Научно-исследовательский студенческий прототип · Автор разработки: курсант Роман Налапко (гр. 511, ДИ НУ «ОМА»).",
    footerDisclosureSummary: "Правовые оговорки, методология и политика конфиденциальности (Zero-Data)",
    disc1H4: "Политика полной приватности (Zero-Data Retention)",
    disc1P: "Сервис работает исключительно на стороне клиента (Client-Side). Введенные данные, параметры анкеты или cookies не передаются на серверы и не сохраняются после закрытия страницы. Приложение не использует трекеры или коммерческую аналитику.",
    disc2H4: "Академический статус и отказ от ответственности",
    disc2P: "SeaRisk UA является научно-учебным прототипом для анализа факторов риска и демонстрации математической модели. Расчеты не являются сертифицированными оценками безопасности (ISM Code / SMS) или медицинским допуском к работе.",
    disc3H4: "Нормативная основа",
    disc3P: "Оценка опирается на принципы Конвенции о труде в морском судоходстве (MLC 2006 Standard A2.3), Международной конвенции ПДНВ (STCW 1978/2010 Section A-VIII/1) и сводные отчеты расследований аварий (MAIB, EMSA).",
    footerCopyright: "© 2026 SeaRisk UA. Открытый академический код (Open Source). Данные анкеты не покидают браузер.",
    announceResult: "Результат обновлен. Оценка риска",
    announceCategory: "Категория",
    riskCats: { minimal: "Минимальный", low: "Низкий", moderate: "Умеренный", high: "Высокий", extreme: "Экстремальный" },
    importErrorAlert: "Не удалось импортировать профиль. Проверьте формат JSON-файла.",
    importedFileLabel: "Импортированный файл"
  }
};

const caseStudiesByLang = {
  "vasco-de-gama": {
    uk: { badge: "Посадка на мілину", ship: "Ультра-великий контейнеровоз (399 м) · Протока Торн-Шанел", summary: "Під час нічного заходу в Саутгемптон судно сіло на мілину. Команда містка втратила контроль курсу через накопичену перевтому вахтового помічника: понад 70% нічних годин і високий темп роботи призвели до тунельного зору." },
    en: { badge: "Grounding", ship: "Ultra-Large Container Vessel (399m) · Thorn Channel", summary: "Grounding during nocturnal approach to Southampton. Bridge team lost track of vessel track due to cumulative fatigue of lead navigating officer: >70% night hours and intense pace led to tunnel vision." },
    ru: { badge: "Посадка на мель", ship: "Ультра-большой контейнеровоз (399 м) · Пролив Торн-Шанел", summary: "Во время ночного захода в Саутгемптон судно село на мель. Команда мостика потеряла контроль курса из-за накопившейся усталости вахтенного помощника: более 70% ночных часов и высокий темп работы привели к туннельному зрению." }
  },
  "zarga": {
    uk: { badge: "Важке травмування", ship: "Газовоз LNG (288 м) · Термінал South Hook", summary: "Розрив надміцного швартовного кінця (SBT) під натягом із зоною віддачі (Snap-back). Матрос отримав важку ЧМТ і травми кінцівок. Причини: втома палубної команди, відсутність захисту та робота в небезпечній зоні." },
    en: { badge: "Serious Injury", ship: "LNG Carrier (288m) · South Hook Terminal", summary: "Failure of high-modulus mooring line under tension with severe snap-back. Officer suffered traumatic head and limb injuries. Causes: deck crew fatigue, lack of protection, and lingering in snap-back zone." },
    ru: { badge: "Тяжелая травма", ship: "Газовоз LNG (288 м) · Терминал South Hook", summary: "Разрыв высокопрочного швартовного конца (SBT) под натяжением с зоной отдачи (Snap-back). Моряк получил тяжелую ЧМТ и травмы конечностей. Причины: усталость палубной команды, отсутствие защиты и работа в опасной зоне." }
  },
  "scot-carrier": {
    uk: { badge: "Зіткнення з загибеллю", ship: "Суховантаж (90 м) · Балтійське море біля Борнгольма", summary: "Нічний таран данської самохідної баржі на швидкості 12 вузлів. Баржа перекинулася, двоє моряків загинули. Вахтовий помічник Scot Carrier був на містку сам, заснув на ходовій вахті внаслідок безсоння та алкоголю." },
    en: { badge: "Fatal Collision", ship: "General Cargo (90m) · Baltic Sea off Bornholm", summary: "Night collision with Danish hopper barge at 12 knots. Barge capsized with loss of two lives. Sole watchkeeper on Scot Carrier fell asleep on navigation watch due to acute sleep deprivation and alcohol." },
    ru: { badge: "Столкновение с гибелью", ship: "Сухогруз (90 м) · Балтийское море возле Борнхольма", summary: "Ночной таран датской самоходной баржи на скорости 12 узлов. Баржа опрокинулась, двое моряков погибли. Вахтенный помощник Scot Carrier нес вахту один, уснул на ходовой вахте из-за бессонницы и алкоголя." }
  },
  "el-faro": {
    uk: { badge: "Загибель судна", ship: "Контейнеровоз Ro-Ro (241 м) · Атлантичний океан / Багами", summary: "Загибель 33 членів екіпажу в урагані 4 категорії. Комплекс факторів: тиск комерційного розкладу, зміщення вантажу через послаблені талрепи (lashing), втрата остійності, авторитаризм капітана та втома від наднормових вахт." },
    en: { badge: "Total Loss / Sinking", ship: "Ro-Ro Cargo Vessel (241m) · Atlantic Ocean / Bahamas", summary: "Loss of 33 crew members in Category 4 hurricane. Compounding factors: commercial schedule pressure, cargo shift from parted lashings, loss of stability, steep bridge hierarchy, and fatigue." },
    ru: { badge: "Гибель судна", ship: "Контейнеровоз Ro-Ro (241 м) · Атлантический океан / Багамы", summary: "Гибель 33 членов экипажа в урагане 4 категории. Комплекс факторов: коммерческое давление расписания, смещение груза из-за ослабленных талрепов, потеря остойчивости, авторитаризм капитана и сверхурочная усталость." }
  },
  "exxon-valdez": {
    uk: { badge: "Екологічна катастрофа", ship: "Супертанкер VLCC (301 м) · Протока Принца Вільгельма", summary: "Посадка на риф Блай та вилив 41 млн літрів сирої нафти. Розслідування NTSB виявило хронічну перевтому третього помічника на ходовій вахті через безперервний вахтовий графік 6/6 та понад 18 годин без сну, що призвело до повної втрати просторової орієнтації." },
    en: { badge: "Major Oil Spill", ship: "VLCC Supertanker (301m) · Prince William Sound", summary: "Grounding on Bligh Reef releasing 41M liters of crude oil. NTSB identified severe fatigue of 3rd mate on bridge watch after continuous 6on/6off schedule and >18h wakefulness, resulting in spatial disorientation." },
    ru: { badge: "Экологическая катастрофа", ship: "Супертанкер VLCC (301 м) · Пролив Принца Вильгельма", summary: "Посадка на риф Блай и вылив 41 млн литров сырой нефти. Расследование NTSB выявило хроническую переутомленность третьего помощника на вахте из-за непрерывного графика 6/6 и более 18 часов без сна, приведшего к потере пространственной ориентации." }
  },
  "bourbon-dolphin": {
    uk: { badge: "Перекидання судна", ship: "Якорезавізний буксир AHTS (75 м) · Північне море / Шетланд", summary: "Втрата динамічної остійності та перекидання під час заведення якоря бурової установки. Загинуло 8 членів екіпажу. Фактори: надмірне натягнення якірних тросів, робота палубної команди на слизькій палубі без відпочинку та екстремальна кумулятивна втома." },
    en: { badge: "Vessel Capsizing", ship: "Anchor Handling Tug AHTS (75m) · North Sea / Shetland", summary: "Loss of dynamic stability and capsizing while running an offshore rig anchor. 8 crew fatalities. Contributing factors: heavy chain tension, deck work on slippery rolling deck without rest, and extreme fatigue." },
    ru: { badge: "Опрокидывание судна", ship: "Якорезавозный буксир AHTS (75 м) · Северное море / Шетланд", summary: "Потеря динамической остойчивости и опрокидывание во время заводки якоря буровой установки. Погибло 8 членов экипажа. Факторы: чрезмерное натяжение тросов, работа палубной команды на скользкой палубе без отдыха и накопленная усталость." }
  }
};

function setLanguage(lang) {
  if (!I18N[lang]) return;
  currentLang = lang;
  document.documentElement.lang = lang;
  const t = I18N[lang];

  // Update language selector active states
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
  const langBtn = $("#lang-switch-btn");
  if (langBtn && !langBtn.classList.contains("lang-btn")) {
    langBtn.textContent = t.btn;
  }

  // Header & Navigation
  const navLinks = document.querySelectorAll("header nav a");
  if (navLinks[0]) navLinks[0].textContent = t.navAssess;
  if (navLinks[1]) navLinks[1].textContent = t.navCases;
  if (navLinks[2]) navLinks[2].textContent = t.navStats;
  if (navLinks[3]) navLinks[3].textContent = t.navMethod;

  const bMode1 = document.querySelector('[data-bridge-mode="cockpit"]');
  if (bMode1) bMode1.textContent = t.bridgeCockpit;
  const bMode2 = document.querySelector('[data-bridge-mode="red"]');
  if (bMode2) bMode2.textContent = t.bridgeRed;
  const bMode3 = document.querySelector('[data-bridge-mode="day"]');
  if (bMode3) bMode3.textContent = t.bridgeDay;

  const statusPill = document.querySelector(".status-pill");
  if (statusPill) statusPill.innerHTML = `<i aria-hidden="true"></i> ${escapeHtml(t.statusPill)}`;

  // Hero Section
  const h1 = document.querySelector(".hero-copy h1");
  if (h1) h1.textContent = t.heroTitle;
  const eye = document.querySelector(".hero-copy .eyebrow");
  if (eye) eye.textContent = t.heroEyebrow;
  const lede = document.querySelector(".hero-lede");
  if (lede) lede.textContent = t.heroLede;
  const startBtn = document.querySelector(".hero-actions .button-primary");
  if (startBtn) startBtn.textContent = t.heroActionStart;
  const methodLink = document.querySelector(".hero-actions .text-link");
  if (methodLink) methodLink.innerHTML = `${escapeHtml(t.heroActionMethod)} <span>↗</span>`;

  const heroRadarTopline = document.querySelector(".radar-topline span");
  if (heroRadarTopline) heroRadarTopline.textContent = t.heroRadarTopline;
  const rL1 = document.querySelector(".radar-label.label-1"); if (rL1) rL1.textContent = t.radarLabel1;
  const rL2 = document.querySelector(".radar-label.label-2"); if (rL2) rL2.textContent = t.radarLabel2;
  const rL3 = document.querySelector(".radar-label.label-3"); if (rL3) rL3.textContent = t.radarLabel3;
  const rL4 = document.querySelector(".radar-label.label-4"); if (rL4) rL4.textContent = t.radarLabel4;
  const rL5 = document.querySelector(".radar-label.label-5"); if (rL5) rL5.textContent = t.radarLabel5;
  const heroRadarP = document.querySelector(".radar-card > p");
  if (heroRadarP) heroRadarP.innerHTML = `<span>${escapeHtml(t.radarPriorityLabel)}</span><strong>${escapeHtml(t.radarPriorityText)}</strong>`;

  const sigA = document.querySelector(".signal.signal-a");
  if (sigA) sigA.innerHTML = `01 <span>${escapeHtml(t.signalA)}</span>`;
  const sigB = document.querySelector(".signal.signal-b");
  if (sigB) sigB.innerHTML = `02 <span>${escapeHtml(t.signalB)}</span>`;

  // Trust Strip
  const trustCards = document.querySelectorAll(".trust-grid p");
  if (trustCards[0]) trustCards[0].innerHTML = `<span>01</span><strong>${escapeHtml(t.trust1Title)}</strong><small>${escapeHtml(t.trust1Desc)}</small>`;
  if (trustCards[1]) trustCards[1].innerHTML = `<span>02</span><strong>${escapeHtml(t.trust2Title)}</strong><small>${escapeHtml(t.trust2Desc)}</small>`;
  if (trustCards[2]) trustCards[2].innerHTML = `<span>03</span><strong>${escapeHtml(t.trust3Title)}</strong><small>${escapeHtml(t.trust3Desc)}</small>`;

  // Workspace Heading
  const wsEye = document.querySelector(".workspace .section-heading .eyebrow");
  if (wsEye) wsEye.textContent = t.sectionEyebrow;
  const formH2 = document.querySelector(".workspace .section-heading h2");
  if (formH2) formH2.textContent = t.formHeading;
  const wsSub = document.querySelector(".workspace .section-heading > p");
  if (wsSub) wsSub.textContent = t.sectionSubtitle;

  // Scenario Panel
  const scBadge = document.querySelector(".scenario-intro span");
  if (scBadge) scBadge.textContent = t.scenarioBadge;
  const scTitle = document.querySelector("#scenario-title");
  if (scTitle) scTitle.textContent = t.scenarioTitle;
  const scApply = document.querySelector("#apply-scenario");
  if (scApply) scApply.textContent = t.scenarioApplyBtn;

  // Demo Select
  const demoSelect = $("#demo-scenario");
  if (demoSelect) {
    const curV = demoSelect.value;
    demoSelect.options[0].text = t.demoOptCadet;
    demoSelect.options[1].text = t.demoOptEngine;
    demoSelect.options[2].text = t.demoOptDeck;
    demoSelect.value = curV;
  }

  // Fieldsets
  const fsets = document.querySelectorAll("#risk-form fieldset");
  if (fsets[0]) {
    const leg = fsets[0].querySelector("legend");
    if (leg) leg.innerHTML = `<span>1</span> ${escapeHtml(t.fs1Legend)}`;
  }
  if (fsets[1]) {
    const leg = fsets[1].querySelector("legend");
    if (leg) leg.innerHTML = `<span>2</span> ${escapeHtml(t.fs2Legend)}`;
  }
  if (fsets[2]) {
    const leg = fsets[2].querySelector("legend");
    if (leg) leg.innerHTML = `<span>3</span> ${escapeHtml(t.fs3Legend)}`;
  }

  // Update Select Elements in Form
  const sexSel = $("#sex");
  if (sexSel) {
    const cur = sexSel.value;
    sexSel.options[0].text = t.sexMale;
    sexSel.options[1].text = t.sexFemale;
    sexSel.value = cur;
  }

  const resSel = $("#residence");
  if (resSel) {
    const cur = resSel.value;
    resSel.options[0].text = t.resCity;
    resSel.options[1].text = t.resVillage;
    resSel.value = cur;
  }

  const roleSel = $("#role");
  if (roleSel) {
    const cur = roleSel.value;
    Array.from(roleSel.options).forEach((opt) => {
      opt.text = roleLabelsByLang[lang][opt.value] || opt.text;
    });
    roleSel.value = cur;
  }

  const watchSel = $("#watch-system");
  if (watchSel) {
    const cur = watchSel.value;
    Array.from(watchSel.options).forEach((opt) => {
      opt.text = watchLabelsByLang[lang][opt.value] || opt.text;
    });
    watchSel.value = cur;
  }

  const vesselSel = $("#vessel-type");
  if (vesselSel) {
    const cur = vesselSel.value;
    Array.from(vesselSel.options).forEach((opt) => {
      opt.text = vesselLabelsByLang[lang][opt.value] || opt.text;
    });
    vesselSel.value = cur;
  }

  const drillSel = $("#drill-type-select");
  if (drillSel) {
    const cur = drillSel.value;
    const drillOpts = {
      fire: { uk: "Пожежна тривога (Fire Drill)", en: "Fire Drill (SOLAS III/19)", ru: "Пожарная тревога (Fire Drill)" },
      abandon_ship: { uk: "Шлюпкова тривога (Abandon Ship)", en: "Abandon Ship Drill", ru: "Шлюпочная тревога (Abandon Ship)" },
      enclosed_space: { uk: "Рятування з замкненого простору", en: "Enclosed Space Rescue", ru: "Спасение из закрытого помещения" },
      oil_spill: { uk: "Аварійний розлив нафти (SOPEP)", en: "Oil Spill Response (SOPEP)", ru: "Аварийный разлив нефти (SOPEP)" }
    };
    Array.from(drillSel.options).forEach((opt) => {
      opt.text = drillOpts[opt.value]?.[lang] || opt.text;
    });
    drillSel.value = cur;
  }

  // Profile File Actions
  const expBtn = $("#export-profile-btn");
  if (expBtn) expBtn.innerHTML = `<span>📥</span> ${escapeHtml(t.exportProfileBtn)}`;
  const impLabel = document.querySelector('label[for="import-profile-input"]');
  if (impLabel) impLabel.innerHTML = `<span>📤</span> ${escapeHtml(t.importProfileBtn)}<input id="import-profile-input" type="file" accept=".json" class="sr-only" />`;
  $("#import-profile-input")?.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        const p = d.profile || d;
        if (!p || typeof p !== "object") throw new Error("Invalid");
        applyProfile(p);
        const up = currentInput();
        renderRisk(calculateRisk(up), up, t.importedFileLabel, false);
      } catch { alert(t.importErrorAlert); }
    };
    r.readAsText(f);
  });

  const privNote = document.querySelector(".privacy-note");
  if (privNote) privNote.innerHTML = `<strong>${escapeHtml(t.privacyNote.split(":")[0])}:</strong> ${escapeHtml(t.privacyNote.split(": ")[1] || t.privacyNote)}`;

  const formFooterP = document.querySelector(".form-footer p");
  if (formFooterP) formFooterP.innerHTML = `<span aria-hidden="true">ⓘ</span> ${escapeHtml(t.formFooterNote)}`;
  const submitBtn = document.querySelector(".form-footer button[type='submit']");
  if (submitBtn) submitBtn.innerHTML = `${escapeHtml(t.calcBtn)} <span>→</span>`;

  // Result Header & Disclaimer
  const kicker = document.querySelector(".result-kicker");
  if (kicker) kicker.textContent = t.resKicker;
  const initBanner = document.querySelector(".result-initial-banner");
  if (initBanner) initBanner.innerHTML = `<strong>${escapeHtml(t.previewBold)}</strong> ${escapeHtml(t.previewText)}`;
  const resDisc = document.querySelector(".result-disclaimer");
  if (resDisc) resDisc.innerHTML = `<strong>${escapeHtml(t.disclaimerBold)}</strong> ${escapeHtml(t.disclaimerText)}`;
  const rRatio = document.querySelector("#risk-ratio");
  if (rRatio) rRatio.textContent = t.riskRatioText;
  const meterLabels = document.querySelector(".meter-labels");
  if (meterLabels) meterLabels.innerHTML = `<span>${escapeHtml(t.meterLow)}</span><span>${escapeHtml(t.meterMid)}</span><span>${escapeHtml(t.meterHigh)}</span>`;

  // Result Tabs
  const tabRadar = $("#tab-btn-radar");
  if (tabRadar) tabRadar.innerHTML = `<span class="tab-icon">🎯</span> ${t.radarTab.replace("🎯 ", "")}`;
  const tabWhatif = $("#tab-btn-whatif");
  if (tabWhatif) tabWhatif.innerHTML = `<span class="tab-icon">⚡</span> ${t.whatifTab.replace("⚡ ", "")}`;
  const tabChecklist = $("#tab-btn-checklist");
  if (tabChecklist) tabChecklist.innerHTML = `<span class="tab-icon">📋</span> ${t.checklistTab.replace("📋 ", "")}`;
  const tabMethod = $("#tab-btn-method");
  if (tabMethod) tabMethod.innerHTML = `<span class="tab-icon">🔬</span> ${t.methodTab.replace("🔬 ", "")}`;

  // Live Radar Box
  const liveRHeadH3 = document.querySelector(".live-radar-header h3");
  if (liveRHeadH3) liveRHeadH3.textContent = t.liveRadarTitle;
  const liveRHeadSmall = document.querySelector(".live-radar-header small");
  if (liveRHeadSmall) liveRHeadSmall.textContent = t.liveRadarSubtitle;
  const liveRAxes = document.querySelector(".live-radar-axis-labels");
  if (liveRAxes) liveRAxes.innerHTML = `<span class="lra-1">${escapeHtml(t.lra1)}</span><span class="lra-2">${escapeHtml(t.lra2)}</span><span class="lra-3">${escapeHtml(t.lra3)}</span><span class="lra-4">${escapeHtml(t.lra4)}</span><span class="lra-5">${escapeHtml(t.lra5)}</span>`;

  // Benchmark Box
  const bmTag = document.querySelector(".benchmark-tag"); if (bmTag) bmTag.textContent = t.bmTag;
  const bmH4 = document.querySelector(".benchmark-header h4"); if (bmH4) bmH4.textContent = t.bmTitle;
  const bmRowLabels = document.querySelectorAll(".benchmark-row .bm-label");
  if (bmRowLabels[0]) bmRowLabels[0].textContent = t.bmHoursLabel;
  if (bmRowLabels[1]) bmRowLabels[1].textContent = t.bmNightLabel;
  const bmNote = document.querySelector(".benchmark-note"); if (bmNote) bmNote.textContent = t.bmNote;

  // Circadian Card
  const circKicker = document.querySelector(".circadian-kicker"); if (circKicker) circKicker.textContent = t.circKicker;
  const circH3 = document.querySelector(".circadian-header h3"); if (circH3) circH3.textContent = t.circTitle;
  const circMetaRowSpans = document.querySelectorAll(".circadian-meta-row > div span");
  if (circMetaRowSpans[0]) circMetaRowSpans[0].textContent = t.circDebtLabel;
  if (circMetaRowSpans[1]) circMetaRowSpans[1].textContent = t.circNadirLabel;
  if (circMetaRowSpans[2]) circMetaRowSpans[2].textContent = t.circStatusLabel;
  const tzLabel = document.querySelector(".tz-shift-row label");
  if (tzLabel) {
    const curVal = $("#tz-shift-slider")?.value || 0;
    tzLabel.childNodes[0].nodeValue = t.tzShiftLabel + " ";
    const tzDisp = $("#tz-shift-display");
    if (tzDisp) tzDisp.textContent = `Δ ${curVal} ${t.hoursUnit}`;
  }

  // Weather Card
  const wKicker = document.querySelector(".weather-kicker"); if (wKicker) wKicker.textContent = t.weatherKicker;
  const wH3 = document.querySelector(".weather-header h3"); if (wH3) wH3.textContent = t.weatherTitle;
  const wSliderLabel = document.querySelector(".weather-slider-label");
  if (wSliderLabel) {
    const bVal = $("#beaufort-slider")?.value || 3;
    wSliderLabel.childNodes[0].nodeValue = t.weatherSliderLabel + " ";
    const bDisp = $("#beaufort-val-display");
    if (bDisp) bDisp.textContent = `${bVal} ${t.beaufortUnit}`;
  }
  const polarSpan = document.querySelector("#polar-zone-toggle + span"); if (polarSpan) polarSpan.textContent = t.polarToggleSpan;
  const heatSpan = document.querySelector("#engine-heat-toggle + span"); if (heatSpan) heatSpan.textContent = t.engineHeatToggleSpan;
  const wm1Span = document.querySelector(".wm-cell:nth-child(1) span"); if (wm1Span) wm1Span.textContent = t.wm1Span;
  const wm1Small = document.querySelector(".wm-cell:nth-child(1) small"); if (wm1Small) wm1Small.textContent = t.wm1Small;
  const wm2Span = document.querySelector(".wm-cell:nth-child(2) span"); if (wm2Span) wm2Span.textContent = t.wm2Span;
  const wm2Small = document.querySelector(".wm-cell:nth-child(2) small"); if (wm2Small) wm2Small.textContent = t.wm2Small;

  // Breakdown & Recommendations
  const bTitle = document.querySelector(".breakdown-title h3"); if (bTitle) bTitle.textContent = t.breakdownTitle;
  const rTitle = document.querySelector(".recommendations h3"); if (rTitle) rTitle.textContent = t.recsTitle;

  // Grounded Retrieval Box
  const gKicker = document.querySelector(".grounded-kicker"); if (gKicker) gKicker.textContent = t.groundedKicker;
  const gH4 = document.querySelector(".grounded-header h4"); if (gH4) gH4.textContent = t.groundedTitle;
  const gBadge = document.querySelector(".grounded-badge"); if (gBadge) gBadge.textContent = t.groundedBadge;
  const gFactsColStrong = document.querySelector(".grounded-facts-col strong"); if (gFactsColStrong) gFactsColStrong.textContent = t.groundedFactsTitle;
  const gExplColStrong = document.querySelector(".grounded-expl-col strong"); if (gExplColStrong) gExplColStrong.textContent = t.groundedExplTitle;
  const gDisc = document.querySelector("#grounded-disclaimer"); if (gDisc) gDisc.textContent = t.groundedDisclaimer;

  // Profile Summary
  const pSumH3 = document.querySelector(".profile-summary-heading h3"); if (pSumH3) pSumH3.textContent = t.profileSummaryTitle;

  // What-If & Sensitivity
  const whatIfH3 = document.querySelector(".what-if-header h3"); if (whatIfH3) whatIfH3.textContent = t.whatIfTitle;
  const whatIfSmall = document.querySelector(".what-if-header small"); if (whatIfSmall) whatIfSmall.textContent = t.whatIfSubtitle;
  const sensKicker = document.querySelector(".sensitivity-kicker"); if (sensKicker) sensKicker.textContent = t.sensKicker;
  const sensH3 = document.querySelector(".sensitivity-header h3"); if (sensH3) sensH3.textContent = t.sensTitle;
  const sensSub = document.querySelector(".sensitivity-subtitle"); if (sensSub) sensSub.textContent = t.sensSubtitle;

  // Checklist
  const clKicker = document.querySelector(".checklist-kicker"); if (clKicker) clKicker.textContent = t.clKicker;
  const clH3 = document.querySelector(".checklist-header h3"); if (clH3) clH3.textContent = t.clTitle;

  // PSC / SIRE
  const pscKicker = document.querySelector(".psc-kicker"); if (pscKicker) pscKicker.textContent = t.pscKicker;
  const pscH3 = document.querySelector(".psc-header h3"); if (pscH3) pscH3.textContent = t.pscTitle;
  const pscCapStrong = document.querySelector("#psc-cap-box strong"); if (pscCapStrong) pscCapStrong.textContent = t.pscCapTitle;

  // Drill Simulator
  const drillKicker = document.querySelector(".drill-kicker"); if (drillKicker) drillKicker.textContent = t.drillKicker;
  const drillH3 = document.querySelector(".drill-header h3"); if (drillH3) drillH3.textContent = t.drillTitle;
  const drillStatSpans = document.querySelectorAll(".drill-stat-cell span");
  if (drillStatSpans[0]) drillStatSpans[0].textContent = t.drillDelaySpan;
  if (drillStatSpans[1]) drillStatSpans[1].textContent = t.drillErrorSpan;
  if (drillStatSpans[2]) drillStatSpans[2].textContent = t.drillReadinessSpan;
  const drillStatSmalls = document.querySelectorAll(".drill-stat-cell small");
  if (drillStatSmalls[0]) drillStatSmalls[0].textContent = t.drillDelaySmall;
  if (drillStatSmalls[1]) drillStatSmalls[1].textContent = t.drillErrorSmall;
  if (drillStatSmalls[2]) drillStatSmalls[2].textContent = t.drillReadinessSmall;

  // QR Handover
  const qrKicker = document.querySelector(".qr-kicker"); if (qrKicker) qrKicker.textContent = t.qrKicker;
  const qrH3 = document.querySelector(".qr-header h3"); if (qrH3) qrH3.textContent = t.qrTitle;
  const qrBadge = document.querySelector(".qr-badge"); if (qrBadge) qrBadge.textContent = t.qrBadge;
  const qrLead = document.querySelector(".qr-lead"); if (qrLead) qrLead.textContent = t.qrLead;
  const qrMetaSmall = document.querySelector(".qr-meta-text small"); if (qrMetaSmall) qrMetaSmall.textContent = t.qrMetaText;

  // FSA Matrix
  const fsaKicker = document.querySelector(".fsa-matrix-kicker"); if (fsaKicker) fsaKicker.textContent = t.fsaKicker;
  const fsaH3 = document.querySelector(".fsa-matrix-header h3"); if (fsaH3) fsaH3.textContent = t.fsaTitle;
  const fsaBadge = document.querySelector(".fsa-matrix-badge"); if (fsaBadge) fsaBadge.textContent = t.fsaBadge;

  // Academic Export
  const acKicker = document.querySelector(".academic-kicker"); if (acKicker) acKicker.textContent = t.academicKicker;
  const acH3 = document.querySelector(".academic-header h3"); if (acH3) acH3.textContent = t.academicTitle;
  const acLead = document.querySelector(".academic-lead"); if (acLead) acLead.textContent = t.academicLead;
  const copyLatex = $("#copy-latex-btn"); if (copyLatex) copyLatex.textContent = t.copyLatexBtn;
  const copyBibtex = $("#copy-bibtex-btn"); if (copyBibtex) copyBibtex.textContent = t.copyBibtexBtn;
  const downCsv = $("#download-csv-btn"); if (downCsv) downCsv.textContent = t.downloadCsvBtn;

  // Profile Compare
  const compKicker = document.querySelector(".compare-kicker"); if (compKicker) compKicker.textContent = t.compareKicker;
  const compH3 = document.querySelector(".compare-header h3"); if (compH3) compH3.textContent = t.compareTitle;
  const compColAH4 = document.querySelector("#compare-col-a h4"); if (compColAH4) compColAH4.textContent = t.compareColA;
  const compColBH4 = document.querySelector("#compare-col-b h4"); if (compColBH4) compColBH4.textContent = t.compareColB;

  // Model Context DTs
  const mContextDts = document.querySelectorAll(".model-context dt");
  if (mContextDts[0]) mContextDts[0].textContent = t.modelStatusDt;
  if (mContextDts[1]) mContextDts[1].textContent = t.modelVersionDt;
  if (mContextDts[2]) mContextDts[2].textContent = t.modelUncertaintyDt;

  // Details Summaries
  const dEv = document.querySelector(".evidence-details summary"); if (dEv) dEv.textContent = t.evidenceSummary;
  const dCalc = document.querySelector(".calculation-details summary"); if (dCalc) dCalc.textContent = t.calcSummary;
  const dGloss = document.querySelector(".glossary-details summary"); if (dGloss) dGloss.textContent = t.glossarySummary;

  // Print Report
  const pBtn = $("#print-report"); if (pBtn) pBtn.textContent = t.printReportBtn;
  const pSmall = document.querySelector(".report-actions small"); if (pSmall) pSmall.textContent = t.printReportSmall;
  const pDocType = document.querySelector(".p-doc-type"); if (pDocType) pDocType.textContent = t.pDocType;
  const pDocTitle = document.querySelector(".p-doc-title"); if (pDocTitle) pDocTitle.textContent = t.pDocTitle;
  const pDocStampSmall = document.querySelector(".p-doc-stamp small"); if (pDocStampSmall) pDocStampSmall.textContent = t.pDocStamp;
  const sigSpans = document.querySelectorAll(".print-sig-col span");
  if (sigSpans[0]) sigSpans[0].textContent = t.sigCol1Span;
  if (sigSpans[1]) sigSpans[1].textContent = t.sigCol2Span;
  const sigSmalls = document.querySelectorAll(".print-sig-col small");
  if (sigSmalls[0]) sigSmalls[0].textContent = t.sigCol1Small;
  if (sigSmalls[1]) sigSmalls[1].textContent = t.sigCol2Small;
  const pDisc = document.querySelector(".print-audit-disclaimer"); if (pDisc) pDisc.textContent = t.printDisclaimer;

  // Cases Section
  const casesEye = document.querySelector(".cases-section .section-heading .eyebrow"); if (casesEye) casesEye.textContent = t.casesEyebrow;
  const casesH2 = document.querySelector(".cases-section .section-heading h2"); if (casesH2) casesH2.textContent = t.casesTitle;
  const casesP = document.querySelector(".cases-section .section-heading > p"); if (casesP) casesP.textContent = t.casesDesc;
  document.querySelectorAll(".case-card").forEach((card) => {
    const btn = card.querySelector(".case-load-btn");
    const caseKey = btn?.dataset.case;
    const cData = caseStudiesByLang[caseKey]?.[lang];
    if (cData) {
      const badge = card.querySelector(".case-badge"); if (badge) badge.textContent = cData.badge;
      const ship = card.querySelector(".case-ship"); if (ship) ship.textContent = cData.ship;
      const summ = card.querySelector(".case-summary"); if (summ) summ.textContent = cData.summary;
    }
    if (btn) btn.textContent = t.caseLoadBtn;
    const link = card.querySelector(".case-link"); if (link) link.textContent = t.caseLink;
  });

  // Statistics Section
  const statsEye = document.querySelector(".statistics .section-heading .eyebrow"); if (statsEye) statsEye.textContent = t.statsEyebrow;
  const statsH2 = document.querySelector(".statistics .section-heading h2"); if (statsH2) statsH2.textContent = t.statsTitle;
  const statsP = document.querySelector(".statistics .section-heading > p"); if (statsP) statsP.textContent = t.statsDesc;
  const stLabels = document.querySelectorAll(".stats-toolbar > label");
  if (stLabels[0]) stLabels[0].childNodes[0].nodeValue = t.statsRoleLabel + " ";
  if (stLabels[1]) stLabels[1].childNodes[0].nodeValue = t.statsVesselLabel + " ";
  const offChip = document.querySelector(".demo-chip.official"); if (offChip) offChip.innerHTML = `<i></i> ${escapeHtml(t.officialChip)}`;
  const sumDivs = document.querySelectorAll(".stat-summary > div");
  if (sumDivs[0]) {
    sumDivs[0].querySelector("span").textContent = t.statTotalSpan;
    sumDivs[0].querySelector("small").textContent = t.statTotalSmall;
  }
  if (sumDivs[1]) {
    sumDivs[1].querySelector("span").textContent = t.statInjurySpan;
    sumDivs[1].querySelector("small").textContent = t.statInjurySmall;
  }
  if (sumDivs[2]) {
    sumDivs[2].querySelector("span").textContent = t.statFatalSpan;
    sumDivs[2].querySelector("small").textContent = t.statFatalSmall;
  }
  const ch1Heading = document.querySelector(".chart-card:nth-child(1) .chart-heading");
  if (ch1Heading) {
    ch1Heading.querySelector("span").textContent = t.eventTypesSpan;
    ch1Heading.querySelector("h3").textContent = t.eventTypesH3;
    ch1Heading.querySelector("small").textContent = t.eventTypesSmall;
  }
  const ch2Heading = document.querySelector(".severity-card .chart-heading");
  if (ch2Heading) {
    ch2Heading.querySelector("span").textContent = t.severitySpan;
    ch2Heading.querySelector("h3").textContent = t.severityH3;
    ch2Heading.querySelector("small").textContent = t.severitySmall;
  }
  const donutSpan = document.querySelector(".donut span"); if (donutSpan) donutSpan.textContent = t.donutRecordsSpan;
  const srcNote = document.querySelector(".source-note"); if (srcNote) srcNote.innerHTML = `${escapeHtml(t.sourceNote.split(": ")[0])}: <a href="https://maps.dft.gov.uk/maib-data-portal/web-pages/download_files_section.html" target="_blank" rel="noreferrer">MAIB Data Portal</a>, ${escapeHtml(t.sourceNote.split(": ")[1] || "")}`;
  const offContextSpan = document.querySelector(".official-context .context-heading span"); if (offContextSpan) offContextSpan.textContent = t.officialContextSpan;
  const offContextH3 = document.querySelector("#official-context-title"); if (offContextH3) offContextH3.textContent = t.officialContextH3;

  // Methodology Section
  const mEye = document.querySelector(".methodology .section-heading .eyebrow"); if (mEye) mEye.textContent = t.methodEyebrow;
  const mH2 = document.querySelector(".methodology .section-heading h2"); if (mH2) mH2.textContent = t.methodTitle;
  const mP = document.querySelector(".methodology .section-heading > p"); if (mP) mP.textContent = t.methodDesc;
  const mArts = document.querySelectorAll(".method-grid article");
  if (mArts[0]) { mArts[0].querySelector("h3").textContent = t.methodP1H3; mArts[0].querySelector("p").textContent = t.methodP1P; }
  if (mArts[1]) { mArts[1].querySelector("h3").textContent = t.methodP2H3; mArts[1].querySelector("p").textContent = t.methodP2P; }
  if (mArts[2]) { mArts[2].querySelector("h3").textContent = t.methodP3H3; mArts[2].querySelector("p").textContent = t.methodP3P; }
  const gNoteSpan = document.querySelector(".governance-note span"); if (gNoteSpan) gNoteSpan.textContent = t.govSpan;
  const gNoteH3 = document.querySelector("#prohibited-use-title"); if (gNoteH3) gNoteH3.textContent = t.govTitle;
  const gNoteP = document.querySelector(".governance-note > p"); if (gNoteP) gNoteP.textContent = t.govText;

  // Footer
  const fNavs = document.querySelectorAll(".footer-nav a");
  if (fNavs[0]) fNavs[0].textContent = t.navAssess;
  if (fNavs[1]) fNavs[1].textContent = t.navCases;
  if (fNavs[2]) fNavs[2].textContent = t.navStats;
  if (fNavs[3]) fNavs[3].textContent = t.navMethod;
  const bTop = document.querySelector(".back-to-top"); if (bTop) bTop.textContent = t.backToTop;
  const fAuth = document.querySelector(".footer-academic-badge p"); if (fAuth) fAuth.textContent = t.footerAuthor;
  const fDiscSumm = document.querySelector(".footer-disclosure summary"); if (fDiscSumm) fDiscSumm.textContent = t.footerDisclosureSummary;
  const dBlocks = document.querySelectorAll(".disclosure-block");
  if (dBlocks[0]) { dBlocks[0].querySelector("h4").textContent = t.disc1H4; dBlocks[0].querySelector("p").textContent = t.disc1P; }
  if (dBlocks[1]) { dBlocks[1].querySelector("h4").textContent = t.disc2H4; dBlocks[1].querySelector("p").textContent = t.disc2P; }
  if (dBlocks[2]) { dBlocks[2].querySelector("h4").textContent = t.disc3H4; dBlocks[2].querySelector("p").textContent = t.disc3P; }
  const fCopy = document.querySelector(".footer-meta-line small"); if (fCopy) fCopy.textContent = t.footerCopyright;

  // Re-fill stats dropdowns with localized labels while keeping selected values
  if (incidents.length) {
    const curR = $("#stats-role").value;
    const curV = $("#stats-vessel").value;
    fillOptions("#stats-role", incidents.map((item) => item.role), roleLabelsByLang[lang], t.allRoles);
    fillOptions("#stats-vessel", incidents.map((item) => item.vessel), vesselLabelsByLang[lang], t.allVessels);
    $("#stats-role").value = curR;
    $("#stats-vessel").value = curV;
    renderIncidents();
  }

  // Update active scenario string to localized version
  if (activeScenario === "Користувацький профіль" || activeScenario === "Custom Profile" || activeScenario === "Пользовательский профиль") {
    activeScenario = t.defaultScenarioName;
  }

  // Re-render calculation results
  const input = currentInput();
  renderRisk(calculateRisk(input), input, activeScenario, $("#result-panel")?.dataset.initial === "true");
}

document.querySelectorAll(".lang-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    setLanguage(btn.dataset.lang);
  });
});
$("#lang-switch-btn")?.addEventListener("click", (e) => {
  if (e.target.dataset.lang) {
    setLanguage(e.target.dataset.lang);
  } else {
    const next = currentLang === "uk" ? "en" : (currentLang === "en" ? "ru" : "uk");
    setLanguage(next);
  }
});

// Clear existing dynamic options (keep the first static "all" option) before re-filling
// to prevent duplicates if called more than once.
function fillOptions(selector, values, labels, defaultText = null) {
  const select = $(selector);
  while (select.options.length > 1) select.remove(1);
  if (defaultText && select.options.length > 0) {
    select.options[0].text = defaultText;
  }
  [...new Set(values)].sort().forEach((value) =>
    select.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(value)}">${escapeHtml(labels[value] ?? value)}</option>`)
  );
}

function renderIncidents() {
  const t = I18N[currentLang];
  const role = $("#stats-role").value;
  const vessel = $("#stats-vessel").value;
  const filtered = incidents.filter((item) => (role === "all" || item.role === role) && (vessel === "all" || item.vessel === vessel));
  const total = filtered.reduce((sum, item) => sum + item.count, 0);
  const countBy = (key) => filtered.reduce((acc, item) => {
    acc[item[key]] = (acc[item[key]] || 0) + item.count;
    return acc;
  }, {});
  const severity = countBy("severity");
  const events = countBy("eventType");

  $("#event-total").textContent = total.toLocaleString(t.locale);
  $("#injury-share").textContent = total ? asWholeShare((severity.injury || 0) / total) : "—";
  $("#fatal-share").textContent = total ? asWholeShare((severity.fatal || 0) / total) : "—";
  $("#severity-total").textContent = total.toLocaleString(t.locale);

  const orderedEvents = Object.entries(events).sort((a, b) => b[1] - a[1]);
  $("#event-bars").innerHTML = total ? orderedEvents.map(([key, count]) => {
    const share = count / total;
    const label = escapeHtml(eventLabels[key] ?? key);
    return `<div class="event-bar"><span title="${label}">${label}</span><i style="--bar-width:${share * 100}%"></i><strong>${asWholeShare(share)}</strong></div>`;
  }).join("") : `<p>${escapeHtml(t.emptyFilterEvents)}</p>`;

  const segments = ["none", "injury", "fatal"].map((key) => ({ key, count: severity[key] || 0, share: total ? (severity[key] || 0) / total : 0 }));
  let cursor = 0;
  const gradient = segments.map((segment) => {
    const start = cursor; cursor += segment.share * 100;
    return `${severityColors[segment.key]} ${start}% ${cursor}%`;
  }).join(", ");
  $("#severity-donut").style.background = total ? `conic-gradient(${gradient})` : "#274354";
  $("#severity-legend").innerHTML = segments.map((segment) =>
    `<li><i style="background:${escapeHtml(severityColors[segment.key])}" aria-hidden="true"></i><span>${escapeHtml(severityLabels[segment.key])}</span><strong>${total ? asWholeShare(segment.share) : "—"}</strong></li>`
  ).join("");

  renderChartMeta("#event-chart-meta", filtered, t.metaDefEvent);
  renderChartMeta("#severity-chart-meta", filtered, t.metaDefSeverity);
}

function renderChartMeta(selector, filtered, definition) {
  const t = I18N[currentLang];
  const role = $("#stats-role").value;
  const vessel = $("#stats-vessel").value;
  const years = filtered.map((item) => Number(item.year)).filter(Number.isFinite);
  const period = years.length
    ? `${Math.min(...years)}–${Math.max(...years)}`
    : `${datasetMeta?.reportingPeriod?.from ?? "—"}–${datasetMeta?.reportingPeriod?.to ?? "—"}`;
  const source = datasetMeta?.source?.publisher ?? "MAIB (UK Maritime)";
  const version = datasetMeta?.datasetVersion ?? "—";
  const dataKind = datasetMeta?.releaseMode === "aggregate" ? t.metaOfficialAgg : t.metaSyntheticDemo;
  const sampleSize = filtered.reduce((sum, item) => sum + item.count, 0);
  const roleLabel  = role   === "all" ? t.filterAll : (roleLabels[role]     ?? role);
  const vesselLabel = vessel === "all" ? t.filterAll : (vesselLabels[vessel] ?? vessel);
  $(selector).innerHTML = `
    <div><dt>${escapeHtml(t.metaSourceVer)}</dt><dd>${escapeHtml(source)} · ${escapeHtml(version)}</dd></div>
    <div><dt>${escapeHtml(t.metaPeriodPub)}</dt><dd>${escapeHtml(period)} · n = ${sampleSize.toLocaleString(t.locale)}</dd></div>
    <div class="meta-wide"><dt>${escapeHtml(t.metaActiveFilters)}</dt><dd>${escapeHtml(t.statsRoleLabel)}: ${escapeHtml(roleLabel)}; ${escapeHtml(t.statsVesselLabel)}: ${escapeHtml(vesselLabel)}</dd></div>
    <div class="meta-wide"><dt>${escapeHtml(t.metaDataType)}</dt><dd class="data-kind">${escapeHtml(dataKind)}</dd></div>
    <div class="meta-wide"><dt>${escapeHtml(t.metaDefTitle)}</dt><dd class="definition">${escapeHtml(definition)}</dd></div>`;
}

async function loadIncidents() {
  try {
    const [response, manifestResponse] = await Promise.all([
      fetch("data/incidents.maib.aggregate.json"),
      fetch("data/release-manifest.json")
    ]);
    if (!response.ok || !manifestResponse.ok) throw new Error(`HTTP ${response.status}/${manifestResponse.status}`);
    let aggregate, manifest;
    try { aggregate = await response.json(); }
    catch { throw new Error("Некоректний формат файлу даних інцидентів"); }
    try { manifest = await manifestResponse.json(); }
    catch { throw new Error("Некоректний формат файлу маніфесту"); }
    incidents = aggregate.cells;
    datasetMeta = manifest.datasets.find((dataset) => dataset.file === "incidents.maib.aggregate.json");
    if (!datasetMeta) throw new Error("Немає метаданих набору");
    fillOptions("#stats-role",   incidents.map((item) => item.role),   roleLabels);
    fillOptions("#stats-vessel", incidents.map((item) => item.vessel), vesselLabels);
    $("#stats-role").addEventListener("change", renderIncidents);
    $("#stats-vessel").addEventListener("change", renderIncidents);
    renderIncidents();
    const cur = currentInput();
    const grounded = retrieveSimilarIncidents(cur, incidents);
    const groundedFactsList = $("#grounded-facts-list");
    const groundedExplanation = $("#grounded-explanation");
    if (groundedFactsList && groundedExplanation && grounded.facts?.length) {
      groundedFactsList.innerHTML = grounded.facts.map((fact) => `<li>${escapeHtml(fact)}</li>`).join("");
      groundedExplanation.textContent = grounded.explanation || "—";
    }
  } catch (error) {
    $("#event-bars").innerHTML = `<p>Не вдалося завантажити агреговані дані: ${escapeHtml(error.message)}</p>`;
  }
}

// Initial render with default form values, marked as preview (isInitial=true)
const initialInput = currentInput();
renderRisk(calculateRisk(initialInput), initialInput, "Користувацький профіль", true);
loadIncidents();

if ("serviceWorker" in navigator && (location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname))) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      reg.update().catch(() => {});
    }).catch(() => {});
  });
}
