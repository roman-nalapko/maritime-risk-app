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
  generateOfflineWatchHandoverQr,
  calculateWilsonInterval,
  getBridgeAlertPattern,
  evaluateWatchTeamRisk,
  createDefaultWatchSchedule,
  validateRestHoursSchedule,
  KP965_GISIS_RECORD,
  calculatePortBasinRisk,
  generatePythonAssignmentScript
} from "./model.js";
import { copyTextOrFallback, formatEngineeringIndex, initializeModule, resolveViewMode } from "./ui-runtime.js";
import {
  GUIDED_STEP_COUNT,
  buildAssignmentConclusion,
  guidedStepHash,
  resolveGuidedStep
} from "./guided-assignment.js";

const $ = (selector) => document.querySelector(selector);
const form = $("#risk-form");

function showChartTooltip(targetEl, htmlContent) {
  const tooltip = $("#chart-tooltip");
  if (!tooltip) return;
  tooltip.innerHTML = htmlContent;
  tooltip.classList.add("is-active");
  tooltip.setAttribute("aria-hidden", "false");

  const rect = targetEl.getBoundingClientRect();
  const left = rect.left + rect.width / 2 + window.scrollX;
  const top = rect.top + window.scrollY;

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideChartTooltip() {
  const tooltip = $("#chart-tooltip");
  if (!tooltip) return;
  tooltip.classList.remove("is-active");
  tooltip.setAttribute("aria-hidden", "true");
}

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
  }
};

const severityLabelsByLang = {
  uk: { none: "Без травм", injury: "Травмування", fatal: "Летальний наслідок" },
  en: { none: "No Injury", injury: "Non-fatal Injury", fatal: "Fatal Casualty" }
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
      en: "Demo Scenario · Cadet"
    },
    profile: { age: 20, sex: "male", residence: "city", chronic: false, role: "cadet", hours: 1200, night: 15, watchSystem: "4on8off", vesselType: "container", ppe: true, previous: false, smoking: false, alcohol: false }
  },
  engine: {
    label: {
      uk: "Вигаданий сценарій · механік",
      en: "Demo Scenario · Engineer"
    },
    profile: { age: 38, sex: "male", residence: "city", chronic: false, role: "engine", hours: 2600, night: 45, watchSystem: "6on6off", vesselType: "tanker", ppe: true, previous: true, smoking: false, alcohol: false }
  },
  deck: {
    label: {
      uk: "Вигаданий сценарій · палубна команда",
      en: "Demo Scenario · Deck Crew"
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
  const locale = currentLang === "en" ? "en-GB" : (currentLang === "ru" ? "ru-RU" : "uk-UA");
  return formatEngineeringIndex(value, locale);
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

  const t = I18N[currentLang];
  const axisDescriptions = [
    `${t.radarLabel3}: ${asIndex(result.components.health)}`,
    `${t.radarLabel2}: ${input.hours} ${t.hoursUnit}`,
    `${t.radarLabel1}: ${input.night}%`,
    `${t.radarLabel4}: ${input.smoking || input.alcohol ? (currentLang === "en" ? "Elevated" : (currentLang === "ru" ? "Повышенный" : "Підвищений")) : (currentLang === "en" ? "Controlled" : (currentLang === "ru" ? "Контролируемый" : "Контрольований"))}`,
    `${t.radarLabel5}: ${input.ppe ? (currentLang === "en" ? "Compliant" : (currentLang === "ru" ? "Соблюдается" : "Використовується")) : (currentLang === "en" ? "Deficient" : (currentLang === "ru" ? "Нарушение" : "Дефіцит"))}`
  ];

  poly.setAttribute("points", points.map(([x, y]) => `${x},${y}`).join(" "));
  markers.innerHTML = points.map(([x, y], i) => {
    const desc = axisDescriptions[i];
    return `<circle class="radar-marker" cx="${x}" cy="${y}" r="3.5" fill="var(--cyan-dark)" stroke="#ffffff" stroke-width="1.5" tabindex="0" role="img" aria-label="${escapeHtml(desc)}" data-tooltip="${escapeHtml(desc)}" />`;
  }).join("");

  if (!markers._hasTooltipListener) {
    markers._hasTooltipListener = true;
    markers.addEventListener("mouseenter", (e) => {
      const c = e.target.closest(".radar-marker");
      if (c && c.dataset.tooltip) showChartTooltip(c, c.dataset.tooltip);
    }, true);
    markers.addEventListener("mouseleave", () => hideChartTooltip(), true);
    markers.addEventListener("focusin", (e) => {
      const c = e.target.closest(".radar-marker");
      if (c && c.dataset.tooltip) showChartTooltip(c, c.dataset.tooltip);
    });
    markers.addEventListener("focusout", () => hideChartTooltip());
  }
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
    ppe: { uk: "Використання ЗІЗ", en: "PPE Compliance" },
    hours: { uk: "Річне навантаження", en: "Annual Workload" },
    night: { uk: "Нічні зміни", en: "Night Watches" },
    lifestyle: { uk: "Спосіб життя (тютюн/алкоголь)", en: "Lifestyle (Smoking/Alcohol)" }
  };
  const categoryNameMap = {
    "Охорона праці": { uk: "Охорона праці", en: "Safety Culture" },
    "Втома та ергономіка": { uk: "Втома та ергономіка", en: "Fatigue & Ergonomics" },
    "Здоров'я та звички": { uk: "Здоров'я та звички", en: "Health & Habits" }
  };

  const topName = factorNameMap[list[0].id]?.[currentLang] || list[0].name;
  if (leadBadge) leadBadge.textContent = `${t.sensLeadFactor}: ${topName} (${list[0].weightPercent}%)`;

  bars.innerHTML = list.map((item) => {
    const locName = factorNameMap[item.id]?.[currentLang] || item.name;
    const locCat = categoryNameMap[item.category]?.[currentLang] || item.category;
    let currSet = item.currentSetting;
    let optSet = item.optimalSetting;
    if (currentLang === "en") {
      currSet = currSet.replace("Використовуються", "In use").replace("Відсутні", "Missing")
        .replace("так", "yes").replace("ні", "no").replace("год/рік", "h/yr").replace("нічних", "night");
      optSet = optSet.replace("Повний комплект ЗІЗ", "Full certified PPE")
        .replace("так", "yes").replace("ні", "no").replace("год/рік", "h/yr").replace("нічних", "night");
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
      const nadirText = isNadir ? (currentLang === "en" ? " · Nadir" : " · Мінімум") : "";
      const watchText = p.isWatchTime ? ` (${t.circWatchBadge})` : "";
      const tipText = `<strong>${String(p.hour).padStart(2, "0")}:00</strong> · ${t.circAlertness} ${p.alertness}%${watchText}${nadirText}`;
      return `<div class="${barClass}" style="--bar-h:${heightPercent}%" tabindex="0" role="img" aria-label="${escapeHtml(tipText.replace(/<[^>]+>/g, ""))}" data-tooltip="${escapeHtml(tipText)}"></div>`;
    }).join("");

    if (!bars._hasTooltipListener) {
      bars._hasTooltipListener = true;
      bars.addEventListener("mouseenter", (e) => {
        const bar = e.target.closest(".circ-bar");
        if (bar && bar.dataset.tooltip) showChartTooltip(bar, bar.dataset.tooltip);
      }, true);
      bars.addEventListener("mouseleave", () => hideChartTooltip(), true);
      bars.addEventListener("focusin", (e) => {
        const bar = e.target.closest(".circ-bar");
        if (bar && bar.dataset.tooltip) showChartTooltip(bar, bar.dataset.tooltip);
      });
      bars.addEventListener("focusout", () => hideChartTooltip());
    }
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
  en: ["Beaufort 0 (Calm)", "Beaufort 1 (Light air)", "Beaufort 2 (Light breeze)", "Beaufort 3 (Gentle breeze)", "Beaufort 4 (Moderate breeze)", "Beaufort 5 (Fresh breeze)", "Beaufort 6 (Strong breeze)", "Beaufort 7 (Near gale)", "Beaufort 8 (Gale)", "Beaufort 9 (Severe gale)", "Beaufort 10 (Storm)", "Beaufort 11 (Violent storm)", "Beaufort 12 (Hurricane)"]
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

function renderBrmWatchTeam(input) {
  const card = $("#brm-watch-card");
  if (!card) return;
  const t = I18N[currentLang];

  const hasLookout = Boolean($("#brm-lookout-toggle")?.checked);
  const pilotOnBoard = Boolean($("#brm-pilot-toggle")?.checked);
  const isNight = (Number(input?.night) || 0) >= 25;

  const lookoutInput = hasLookout
    ? { role: "deck", hours: input.hours, night: input.night, watchSystem: input.watchSystem, ppe: true }
    : null;

  const brm = evaluateWatchTeamRisk(input, lookoutInput, { isNight, pilotOnBoard });

  const scoreEl = $("#brm-team-score");
  if (scoreEl) scoreEl.textContent = brm.teamScore;

  const badgeEl = $("#brm-redundancy-badge");
  if (badgeEl) {
    badgeEl.className = `brm-badge brm-badge-${brm.redundancyLevel}`;
    if (brm.redundancyLevel === "optimal") badgeEl.textContent = t.brmOptimalBadge;
    else if (brm.redundancyLevel === "degraded") badgeEl.textContent = t.brmDegradedBadge;
    else badgeEl.textContent = t.brmCompromisedBadge;
  }

  const findingsList = $("#brm-findings-list");
  if (findingsList) {
    findingsList.innerHTML = brm.findings.map((f) => {
      let title = f.title;
      let text = f.text;
      if (currentLang === "en") {
        if (f.rule.includes("STCW A-VIII/2 Part 4-1 / COLREG")) {
          title = "Absence of dedicated lookout at night";
          text = "Sole watchkeeping by OOW during night hours is a severe STCW violation and #1 factor in nighttime collisions (MAIB Scot Carrier).";
        } else if (f.rule.includes("STCW A-VIII/2 Part 4-1")) {
          title = "Sole Day Watch";
          text = "Permitted during daylight only under clear visibility, light traffic, and without secondary duties.";
        } else if (f.rule.includes("IMO MSC/Circ.1598 & BRM")) {
          title = "Synchronous cumulative watch fatigue (BRM Redundancy Failure)";
          text = "Both bridge watch members have high sleep debt (6/6 schedule or >2,800 hrs/yr). Cross-check redundancy is completely compromised.";
        } else if (f.rule.includes("IMO MSC/Circ.1598")) {
          title = "Asymmetrical watch fatigue";
          text = "One member of the watch team exhibits significant cumulative fatigue.";
        } else if (f.rule.includes("IMO Res. A.960")) {
          title = "Pilotage Integration (Bridge Team / Pilot)";
          text = "Pilot presence does not relieve the officer of the watch from continuous monitoring of ship's position and track.";
        }
      } else if (currentLang === "ru") {
        if (f.rule.includes("STCW A-VIII/2 Part 4-1 / COLREG")) {
          title = "Отсутствие отдельного впередсмотрящего ночью";
          text = "Несение ходовой вахты одним помощником в темное время суток — грубое нарушение STCW и фактор №1 ночных столкновений (урок MAIB Scot Carrier).";
        } else if (f.rule.includes("STCW A-VIII/2 Part 4-1")) {
          title = "Одноособовая дневная вахта (Sole Day Watch)";
          text = "Разрешается в светлое время суток исключительно при хорошей видимости, спокойном трафике и без посторонних обязанностей.";
        } else if (f.rule.includes("IMO MSC/Circ.1598 & BRM")) {
          title = "Синхронная кумулятивная усталость вахты (BRM Redundancy Failure)";
          text = "Оба члена ходовой вахты имеют высокий дефицит сна (график 6/6 или нагрузка > 2800 ч/год). Взаимная перекрестная проверка действий полностью нарушена.";
        } else if (f.rule.includes("IMO MSC/Circ.1598")) {
          title = "Асимметричная усталость вахты";
          text = "Один из членов вахтенной команды имеет признаки кумулятивного переутомления.";
        } else if (f.rule.includes("IMO Res. A.960")) {
          title = "Лоцманская проводка (Bridge Team / Pilot Integration)";
          text = "Присутствие лоцмана на мостике не освобождает вахтенного помощника от обязанности непрерывного контроля места судна и курса.";
        }
      }
      return `
        <div class="brm-finding-item brm-sev-${f.severity}">
          <div class="brm-finding-meta">
            <span>${escapeHtml(f.rule)}</span>
            <span>${f.severity.toUpperCase()}</span>
          </div>
          <div class="brm-finding-title">${escapeHtml(title)}</div>
          <div class="brm-finding-text">${escapeHtml(text)}</div>
        </div>
      `;
    }).join("");
  }

  const recsList = $("#brm-recs-list");
  if (recsList) {
    if (brm.recommendations.length > 0) {
      recsList.innerHTML = brm.recommendations.map((r) => {
        let text = r;
        if (currentLang === "en") {
          if (r.includes("впередсмотрящого")) text = "Immediately post a dedicated lookout on the navigation bridge for all hours of darkness.";
          else if (r.includes("Задіяти підміну")) text = "Deploy relief from a rested watch or introduce direct Master supervision.";
          else if (r.includes("Посилити вербальну")) text = "Reinforce closed-loop communication and position cross-checks every 15 minutes.";
          else if (r.includes("Master/Pilot")) text = "Conduct Master/Pilot Information Exchange (MPX) and agree on transit passage plan.";
        } else if (currentLang === "ru") {
          if (r.includes("впередсмотрящого")) text = "Немедленно выставить отдельного матроса-впередсмотрящего (Lookout) на мостик на всё темное время суток.";
          else if (r.includes("Задіяти підміну")) text = "Задействовать подмену из отдохнувшей смены или ввести непосредственный надзор капитана.";
          else if (r.includes("Посилити вербальну")) text = "Усилить вербальную коммуникацию (Closed-loop) и перекрестную проверку счисления каждые 15 минут.";
          else if (r.includes("Master/Pilot")) text = "Провести обмен информацией Master/Pilot (MPX) и согласовать план перехода до начала маневрирования.";
        }
        return `<li>${escapeHtml(text)}</li>`;
      }).join("");
    } else {
      recsList.innerHTML = `<li>${escapeHtml(currentLang === "en" ? "Watch team composition and vigilance redundancy meet STCW A-VIII/2 requirements." : (currentLang === "ru" ? "Состав ходовой вахты и резервирование бдительности соответствуют требованиям STCW A-VIII/2." : "Склад ходової вахти та резервування пильності відповідають вимогам STCW A-VIII/2."))}</li>`;
    }
  }
}

let currentMlcSchedule = createDefaultWatchSchedule("4on8off");
let currentMlcActiveDay = 0; // 0..6

function renderMlcRestValidator() {
  const card = $("#mlc-rest-validator-card");
  if (!card) return;
  const t = I18N[currentLang];

  const val = validateRestHoursSchedule(currentMlcSchedule);

  const totalHoursEl = $("#mlc-val-total-hours");
  if (totalHoursEl) {
    totalHoursEl.textContent = `${val.totalRest7Days} / 77 ${t.hoursUnit}`;
  }

  const badgeEl = $("#mlc-compliance-badge");
  if (badgeEl) {
    if (val.isCompliant) {
      badgeEl.className = "mlc-val-badge mlc-val-badge-compliant";
      badgeEl.textContent = t.mlcCompliantBadge || "Відповідає конвенції";
    } else {
      badgeEl.className = "mlc-val-badge mlc-val-badge-violation";
      badgeEl.textContent = `${val.violations.length} ${t.mlcViolationBadge || "Порушення MLC"}`;
    }
  }

  // Active day label
  const dayName = t.mlcDayNames ? t.mlcDayNames[currentMlcActiveDay] : `День ${currentMlcActiveDay + 1}`;
  const activeDayLabel = $("#mlc-active-day-label");
  if (activeDayLabel) {
    activeDayLabel.textContent = `${dayName}: ${t.mlcTimelineTitle || "погодинний графік"}`;
  }

  // Day tabs
  const dayTabs = document.querySelectorAll(".mlc-day-tab");
  dayTabs.forEach((tab) => {
    const d = Number(tab.dataset.day);
    tab.classList.toggle("active", d === currentMlcActiveDay);
    tab.setAttribute("aria-selected", d === currentMlcActiveDay ? "true" : "false");
    const hasViolation = val.violations.some((v) => v.day === d + 1);
    tab.classList.toggle("has-violation", hasViolation);
    if (t.mlcDayNames && t.mlcDayNames[d]) {
      tab.textContent = t.mlcDayNames[d];
    }
  });

  // Render 24 hour slots for current day
  const grid = $("#mlc-hours-grid");
  if (grid) {
    const dayHours = currentMlcSchedule[currentMlcActiveDay] || new Array(24).fill(1);
    grid.innerHTML = dayHours.map((isRest, h) => {
      const stateClass = isRest ? "is-rest" : "is-work";
      const stateText = isRest ? (t.mlcStateRest || "Відпочинок") : (t.mlcStateWork || "Робота");
      const badgeText = isRest ? "REST" : "WORK";
      const hourStr = `${String(h).padStart(2, "0")}:00`;
      const tip = `${hourStr} · ${stateText}`;
      return `
        <button type="button" class="mlc-hour-slot ${stateClass}" data-hour="${h}" aria-label="${hourStr} ${stateText}" data-tooltip="${escapeHtml(tip)}">
          <span class="slot-hour">${String(h).padStart(2, "0")}</span>
          <span class="slot-badge">${badgeText}</span>
        </button>
      `;
    }).join("");
  }

  // Update rule checklist items
  const updateRule = (elemId, isPassed) => {
    const el = $(elemId);
    if (!el) return;
    el.classList.toggle("is-failed", !isPassed);
    const icon = el.querySelector(".mlc-rule-icon");
    if (icon) icon.textContent = isPassed ? "✓" : "✕";
  };
  updateRule("#mlc-rule-daily", val.summary.dailyRestOk);
  updateRule("#mlc-rule-splits", val.summary.blockSplitsOk);
  updateRule("#mlc-rule-blocklen", val.summary.blockLenOk);
  updateRule("#mlc-rule-interval", val.summary.maxIntervalOk);
  updateRule("#mlc-rule-weekly", val.summary.weeklyRestOk);

  // Update violations box
  const violBox = $("#mlc-violations-box");
  const violList = $("#mlc-violations-list");
  if (violBox && violList) {
    if (val.isCompliant) {
      violBox.hidden = true;
      violList.innerHTML = "";
    } else {
      violBox.hidden = false;
      violList.innerHTML = val.violations.map((v) => {
        let msg = v.message;
        if (currentLang === "en") {
          if (v.type === "daily_minimum") msg = `Day ${v.day}, ${String(v.hour).padStart(2, "0")}:00 — rest in 24h window is only ${val.minDailyRest}h (minimum 10h required).`;
          else if (v.type === "split_count") msg = `Day ${v.day}, ${String(v.hour).padStart(2, "0")}:00 — rest fragmented into >2 periods (maximum 2 allowed).`;
          else if (v.type === "block_length") msg = `Day ${v.day}, ${String(v.hour).padStart(2, "0")}:00 — no single continuous rest period of at least 6 hours.`;
          else if (v.type === "max_interval") msg = `Day ${v.day}, ${String(v.hour).padStart(2, "0")}:00 — interval between rest periods exceeds 14 hours.`;
          else if (v.type === "weekly_minimum") msg = `Total rest over 7 days is ${val.totalRest7Days}h (mandatory minimum 77h).`;
        } else if (currentLang === "ru") {
          if (v.type === "daily_minimum") msg = `День ${v.day}, ${String(v.hour).padStart(2, "0")}:00 — отдых за 24-часовое окно составляет ${val.minDailyRest} ч (минимум 10 ч).`;
          else if (v.type === "split_count") msg = `День ${v.day}, ${String(v.hour).padStart(2, "0")}:00 — отдых разбит на более чем 2 периода (разрешено максимум 2).`;
          else if (v.type === "block_length") msg = `День ${v.day}, ${String(v.hour).padStart(2, "0")}:00 — отсутствует непрерывный блок отдыха длительностью не менее 6 ч.`;
          else if (v.type === "max_interval") msg = `День ${v.day}, ${String(v.hour).padStart(2, "0")}:00 — интервал между периодами отдыха превышает 14 ч.`;
          else if (v.type === "weekly_minimum") msg = `Общий отдых за 7 суток составляет ${val.totalRest7Days} ч (обязательный минимум 77 ч).`;
        }
        return `<li><strong>${escapeHtml(v.rule)}:</strong> ${escapeHtml(msg)}</li>`;
      }).join("");
    }
  }
}

let drillAudioCtx = null;
let activeSoundTimeouts = [];

function stopDrillAlarm() {
  activeSoundTimeouts.forEach(clearTimeout);
  activeSoundTimeouts = [];
  if (drillAudioCtx) {
    drillAudioCtx.close().catch(() => {});
    drillAudioCtx = null;
  }
  const btn = $("#drill-sound-btn");
  if (btn) {
    btn.classList.remove("sounding");
    const t = I18N[currentLang];
    btn.textContent = t.drillSoundPlay;
  }
}

function playDrillAlarm() {
  const btn = $("#drill-sound-btn");
  if (!btn) return;

  if (btn.classList.contains("sounding")) {
    stopDrillAlarm();
    return;
  }

  const drillType = $("#drill-type-select")?.value || "fire";
  const pattern = getBridgeAlertPattern(drillType);
  const t = I18N[currentLang];

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    drillAudioCtx = new AudioContextClass();
    if (drillAudioCtx.state === "suspended") {
      drillAudioCtx.resume();
    }

    btn.classList.add("sounding");
    btn.textContent = t.drillSoundStop;

    let currentTimeOffset = 0;
    pattern.pulses.forEach((pulse) => {
      const osc = drillAudioCtx.createOscillator();
      const gain = drillAudioCtx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(pattern.frequency, drillAudioCtx.currentTime + currentTimeOffset);
      gain.gain.setValueAtTime(0.15, drillAudioCtx.currentTime + currentTimeOffset);
      gain.gain.setValueAtTime(0, drillAudioCtx.currentTime + currentTimeOffset + pulse.duration);
      osc.connect(gain);
      gain.connect(drillAudioCtx.destination);
      osc.start(drillAudioCtx.currentTime + currentTimeOffset);
      osc.stop(drillAudioCtx.currentTime + currentTimeOffset + pulse.duration);

      currentTimeOffset += pulse.duration + pulse.pause;
    });

    const totalDurationMs = currentTimeOffset * 1000;
    const finishTimeout = setTimeout(() => {
      stopDrillAlarm();
    }, totalDurationMs + 200);
    activeSoundTimeouts.push(finishTimeout);
  } catch {
    stopDrillAlarm();
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
  }
};

const checklistCategoriesByLang = {
  uk: { "Охорона праці": "Охорона праці", "Вантажні операції": "Вантажні операції", "Вантажна безпека": "Вантажна безпека", "Швартування": "Швартування", "Судноводіння": "Судноводіння", "Машинне відділення": "Машинне відділення", "Практика": "Практика", "Водолазні роботи": "Водолазні роботи" },
  en: { "Охорона праці": "Occupational Safety", "Вантажні операції": "Cargo Operations", "Вантажна безпека": "Cargo Securing", "Швартування": "Mooring Operations", "Судноводіння": "Bridge & Navigation", "Машинне відділення": "Engine Room Safety", "Практика": "Cadet Training", "Водолазні роботи": "Diving Operations" }
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
    let explText = grounded.explanation || "—";
    if (currentLang === "en") {
      if (input.role === "deck") {
        explText = "For deck crew, key MAIB hazards stem from synthetic mooring lines under tension (snap-back zones) and falls due to wet deck surfaces or heavy rolling.";
      } else if (input.role === "engine") {
        explText = "For engine room staff, risks are dominated by sudden pressurized fluid release, contact burns, and asphyxiation hazard in enclosed spaces.";
      } else if (input.role === "officer") {
        explText = "For bridge officers, leading factors in navigational casualties (groundings, collisions) are chronic night watch fatigue and loss of situational awareness.";
      } else {
        explText = "Analysis highlights occupational safety compliance, where mandatory PPE enforcement and Stop Work Authority are decisive.";
      }
    } else if (currentLang === "ru") {
      if (input.role === "deck") {
        explText = "Для палубной команды ключевую опасность в статистике MAIB представляют натянутые швартовные канаты (зоны snap-back) и падения из-за скользкой палубы или качки.";
      } else if (input.role === "engine") {
        explText = "Для машинной команды преобладают риски внезапного выброса давления, ожоги и опасность потери сознания в замкнутых пространствах (enclosed spaces).";
      } else if (input.role === "officer") {
        explText = "Для судоводителей ведущими факторами навигационных аварий (посадки на мель, столкновения) являются хроническая усталость на ночной вахте и потеря ситуационной осведомленности.";
      } else {
        explText = "Анализ подчеркивает приоритет производственной безопасности, где решающую роль играют постоянное ношение СИЗ и право на остановку работ (Stop Work Authority).";
      }
    }
    groundedExplanation.textContent = explText;
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

  // Epic 10: Bridge Resource Management (BRM) & Navigation Watch Team Coupling
  renderBrmWatchTeam(input);

  // Epic 11: MLC 2006 Standard A2.3 & STCW A-VIII/1 Hours of Rest Validator
  renderMlcRestValidator();

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
      en: "MAIB Case 23/2017 (CMA CGM Vasco de Gama)"
    },
    profile: { age: 34, sex: "male", residence: "city", chronic: false, role: "officer", hours: 2750, night: 70, watchSystem: "4on8off", vesselType: "container", ppe: true, previous: false, smoking: false, alcohol: false }
  },
  "zarga": {
    label: {
      uk: "Кейс MAIB 13/2017 (Танкер ЗПГ Zarga)",
      en: "MAIB Case 13/2017 (LNG Carrier Zarga)"
    },
    profile: { age: 28, sex: "male", residence: "city", chronic: false, role: "deck", hours: 2900, night: 40, watchSystem: "6on6off", vesselType: "tanker", ppe: false, previous: true, smoking: false, alcohol: false }
  },
  "scot-carrier": {
    label: {
      uk: "Кейс MAIB 18/2023 (Scot Carrier & Karin Høj)",
      en: "MAIB Case 18/2023 (Scot Carrier & Karin Høj)"
    },
    profile: { age: 45, sex: "male", residence: "city", chronic: false, role: "officer", hours: 3100, night: 80, watchSystem: "6on6off", vesselType: "bulker", ppe: true, previous: false, smoking: true, alcohol: true }
  },
  "el-faro": {
    label: {
      uk: "Кейс NTSB/IMO (MV El Faro)",
      en: "NTSB/IMO Case (MV El Faro)"
    },
    profile: { age: 53, sex: "male", residence: "city", chronic: false, role: "officer", hours: 2950, night: 45, watchSystem: "4on8off", vesselType: "container", ppe: true, previous: true, smoking: true, alcohol: false }
  },
  "exxon-valdez": {
    label: {
      uk: "Кейс NTSB/IMO (Exxon Valdez, 1989)",
      en: "NTSB/IMO Case (Exxon Valdez, 1989)"
    },
    profile: { age: 42, sex: "male", residence: "city", chronic: false, role: "officer", hours: 3200, night: 85, watchSystem: "6on6off", vesselType: "tanker", ppe: true, previous: true, smoking: true, alcohol: true }
  },
  "bourbon-dolphin": {
    label: {
      uk: "Кейс NMA/MAIB (Bourbon Dolphin, 2007)",
      en: "NMA/MAIB Case (Bourbon Dolphin, 2007)"
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

// BRM Watch Team synergy toggles
$("#brm-lookout-toggle")?.addEventListener("change", () => renderBrmWatchTeam(currentInput()));
$("#brm-pilot-toggle")?.addEventListener("change", () => renderBrmWatchTeam(currentInput()));

// MLC 2006 Rest Hours Validator presets, day tabs & slots
$("#mlc-preset-48")?.addEventListener("click", () => {
  currentMlcSchedule = createDefaultWatchSchedule("4on8off");
  document.querySelectorAll(".mlc-preset-btn").forEach((b) => b.classList.toggle("active", b.id === "mlc-preset-48"));
  renderMlcRestValidator();
});
$("#mlc-preset-66")?.addEventListener("click", () => {
  currentMlcSchedule = createDefaultWatchSchedule("6on6off");
  document.querySelectorAll(".mlc-preset-btn").forEach((b) => b.classList.toggle("active", b.id === "mlc-preset-66"));
  renderMlcRestValidator();
});
$("#mlc-preset-overtime")?.addEventListener("click", () => {
  currentMlcSchedule = createDefaultWatchSchedule("cargo_overtime");
  document.querySelectorAll(".mlc-preset-btn").forEach((b) => b.classList.toggle("active", b.id === "mlc-preset-overtime"));
  renderMlcRestValidator();
});

$("#mlc-day-tabs")?.addEventListener("click", (e) => {
  const tab = e.target.closest(".mlc-day-tab");
  if (!tab) return;
  currentMlcActiveDay = Number(tab.dataset.day);
  renderMlcRestValidator();
});

$("#mlc-hours-grid")?.addEventListener("click", (e) => {
  const slot = e.target.closest(".mlc-hour-slot");
  if (!slot) return;
  const h = Number(slot.dataset.hour);
  currentMlcSchedule[currentMlcActiveDay][h] = currentMlcSchedule[currentMlcActiveDay][h] ? 0 : 1;
  document.querySelectorAll(".mlc-preset-btn").forEach((b) => b.classList.remove("active"));
  renderMlcRestValidator();
});

// Fullscreen Presentation Mode (Defense HUD)
$("#presentation-mode-btn")?.addEventListener("click", () => {
  document.body.classList.toggle("hud-presentation-mode");
  const isHud = document.body.classList.contains("hud-presentation-mode");
  const btn = $("#presentation-mode-btn");
  if (btn) btn.classList.toggle("active", isHud);
});

// Emergency Drill simulator selector & Web Audio BAM sound
$("#drill-type-select")?.addEventListener("change", () => {
  stopDrillAlarm();
  renderEmergencyDrill(currentInput());
});
$("#drill-sound-btn")?.addEventListener("click", playDrillAlarm);

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

// ── GISIS IMO Accident Digitization & ECFA Diagram Module ──
let currentEcfaFilter = "all";
let currentSelectedEcfaNode = "AE1";
let currentPortBasinRisk = null;
let currentGuidedStep = 0;

const ECFA_NODE_METADATA = {
  E1: {
    category: { uk: "Хронологічна подія", en: "Chronological Event" },
    title: { uk: "E1: 02:25 — Відшвартування від танкера", en: "E1: 02:25 — Disembarkation from Tanker" },
    desc: {
      uk: "Завершення висадки лоцмана на якірній стоянці та початок переходу катера KP-965 до бази.",
      en: "Completion of pilot transfer at anchorage and start of transit of pilot craft KP-965 back to base."
    },
    ref: "IMO Res. A.960 (Pilot Boarding / Craft Operations)",
    mitigation: {
      uk: "Дотримання регламенту нічних лоцманських операцій та перевірка розкладу переходу",
      en: "Adhere to nocturnal pilot transfer SOPs and confirm transit plan"
    }
  },
  E2: {
    category: { uk: "Хронологічна подія", en: "Chronological Event" },
    title: { uk: "E2: 02:30 — Вхід у Басейн I порту Копер", en: "E2: 02:30 — Entry into Basin I" },
    desc: {
      uk: "Перетин лінії молу та вхід у стиснену внутрішню акваторію Басейну I.",
      en: "Passing breakwater entrance into the restricted internal waters of Basin I."
    },
    ref: "Port of Koper Navigation Regulations (Art. 12)",
    mitigation: {
      uk: "Обов'язковий перехід на режим маневрування у стиснених водах (Basin mode)",
      en: "Mandatory transition to restricted basin maneuvering mode"
    }
  },
  E3: {
    category: { uk: "Хронологічна подія", en: "Chronological Event" },
    title: { uk: "E3: 02:32 — Набір швидкості до 22.0 вузлів", en: "E3: 02:32 — Acceleration to 22.0 kt" },
    desc: {
      uk: "Рульовий перевів рукоятки управління двигунами на повний хід у нічний час всередині басейну.",
      en: "Coxswain advanced throttles to maximum cruising speed inside restricted port basin at night."
    },
    ref: "COLREG Rule 6 (Safe Speed) & Port Speed Regulations",
    mitigation: {
      uk: "Встановлення апаратного/програмного обмеження швидкості до 10 вузлів у басейні",
      en: "Enforce hardware or software governor limiting basin speed to <= 10 knots"
    }
  },
  E4: {
    category: { uk: "Хронологічна подія", en: "Chronological Event" },
    title: { uk: "E4: 02:35 — Рух на фоні берегових вогнів", en: "E4: 02:35 — Navigation against shore glare" },
    desc: {
      uk: "Катер слідував уздовж контейнерного терміналу з інтенсивним прожекторним освітленням берега.",
      en: "Vessel transited along container terminal berths with intense high-mast floodlight glare."
    },
    ref: "IMO MSC.192(79) & Night Vision Ergonomics",
    mitigation: {
      uk: "Використання тепловізорів FLIR та антиблікового тонування вітрового скла",
      en: "Equip craft with FLIR thermal imaging and anti-reflective windscreen shielding"
    }
  },
  E5: {
    category: { uk: "Хронологічна подія", en: "Chronological Event" },
    title: { uk: "E5: ~02:16:48 — Навал на буй 2/I лівою вилицею носа", en: "E5: ~02:16:48 — Allision with Buoy 2/I" },
    desc: {
      uk: "На швидкості близько 22 вузлів катер здійснив контакт лівою вилицею носової частини зі швартовним буєм 2/I у Басейні I.",
      en: "At ~22 knots pilot boat allided with mooring buoy 2/I with the port bow in Basin I of Port of Koper."
    },
    ref: "MAIIS Final Safety Report & IMO Res. A.1075(28)",
    mitigation: {
      uk: "Встановлення суворого швидкісного ліміту та забезпечення дублюючого спостереження",
      en: "Strict port basin speed ceiling and mandatory shared lookout protocol"
    }
  },
  E6: {
    category: { uk: "Хронологічна подія", en: "Chronological Event" },
    title: { uk: "E6: 02:16:48–02:18:59 — Продовження руху в Басейн I", en: "E6: 02:16:48–02:18:59 — Continuation of Transit" },
    desc: {
      uk: "Катер продовжив рух; критичних вимикань двигунів чи надходження води всередину виявлено не було.",
      en: "Pilot boat continued towards Basin I; no immediate disabling damage or water ingress was identified."
    },
    ref: "MAIIS Safety Deficiency No. 5 & Chapter 2.1 Narrative",
    mitigation: {
      uk: "Обов'язкова процедура негайної зупинки, техогляду та доповіді VTS про факт контакту",
      en: "Mandatory emergency stop, hull inspection, and immediate VTS occurrence report"
    }
  },
  E7: {
    category: { uk: "Хронологічна подія", en: "Chronological Event" },
    title: { uk: "E7: 02:18:59 — Прибуття до т/х MSC CAITLIN II", en: "E7: 02:18:59 — Arrival at M/V MSC CAITLIN II" },
    desc: {
      uk: "Катер прибув до причалу 7A та здійснив планову посадку лоцмана на борт контейнеровоза MSC CAITLIN II.",
      en: "Arrived at Berth 7A and transferred pilot to container ship M/V MSC CAITLIN II as scheduled."
    },
    ref: "Pilotage Operational Logbook & VTS AIS Archive",
    mitigation: {
      uk: "Заборона продовження операцій до проведення технічного обстеження після навалу",
      en: "Prohibit continuation of commercial service before damage assessment after any contact"
    }
  },
  E8: {
    category: { uk: "Хронологічна подія", en: "Chronological Event" },
    title: { uk: "E8: Після швартування — Виявлення пошкоджень", en: "E8: Post-Berthing Damage Assessment" },
    desc: {
      uk: "Виявлено пошкодження носового склопластику (GRP). Пізніший технічний огляд виявив погнутий гребний вал та деформацію обох гвинтів.",
      en: "Damage to port bow GRP laminate identified; technical survey later found one bent shaft and both propellers deformed."
    },
    ref: "MAIIS Technical Survey & Bureau Veritas Damage Report",
    mitigation: {
      uk: "Регламентований підйом на сліп та випробування ліній валопроводу після інцидентів",
      en: "Formal slipway inspection and shaft alignment test following high-speed impact"
    }
  },
  AE1: {
    category: { uk: "Аварійна точка (Accident Event)", en: "Accident Event" },
    title: { uk: "AE1: Швартовний буй 2/I розпізнано занадто пізно", en: "AE1: Mooring buoy 2/I recognised too late" },
    desc: {
      uk: "Судноводій помітив темний силует буя 2/I лише в останні секунди перед контактом через високу швидкість та нічну засвітку.",
      en: "Coxswain sighted dark silhouette of mooring buoy 2/I only seconds before impact due to high transit speed and shore glare."
    },
    ref: "COLREG Rule 5 & 6 / MAIIS Chapter 2.1",
    mitigation: {
      uk: "Встановлення ліміту швидкості ≤ 10 вузлів у басейні та дублюючий радарний контроль",
      en: "Enforce <= 10 kt speed limit in basin and mandatory radar cross-checking"
    }
  },
  AE2: {
    category: { uk: "Аварійна точка (Accident Event)", en: "Accident Event" },
    title: { uk: "AE2: Неефективне спільне спостереження та взаємоконтроль", en: "AE2: Ineffective shared lookout and cross-checking" },
    desc: {
      uk: "Матрос сидів на нижчому кріслі з обмеженим оглядом вперед і подав попередження надто пізно; лоцман не брав участі у спостереженні.",
      en: "Deckhand sat in lower position with restricted forward view and gave late verbal warning; pilot acted merely as passenger."
    },
    ref: "STCW Section A-VIII/2 (Lookout & BRM)",
    mitigation: {
      uk: "Офіційне закріплення ролі другого впередсмотрящого з прямим сектором огляду",
      en: "Formalize role of dedicated second lookout with unobstructed forward sightline"
    }
  },
  AE3: {
    category: { uk: "Аварійна точка (Accident Event)", en: "Accident Event" },
    title: { uk: "AE3: Запізніле зменшення ходу та маневр ухилення", en: "AE3: Late speed reduction and avoidance manoeuvre" },
    desc: {
      uk: "Скидання обертів двигуна та перекладка керма були здійснені в останню мить, не запобігши удару.",
      en: "Throttle pullback and helm action were initiated at the last instant, failing to prevent a high-energy allision."
    },
    ref: "COLREG Rule 8 (Action to avoid collision)",
    mitigation: {
      uk: "Завчасне зниження швидкості до мінімальної маневрової при вході у внутрішній басейн",
      en: "Pre-emptive speed reduction to safe maneuvering speed upon basin entry"
    }
  },
  AE4: {
    category: { uk: "Аварійна точка (Accident Event)", en: "Accident Event" },
    title: { uk: "AE4: Удар лівою вилицею носа об швартовний буй 2/I", en: "AE4: Port bow struck mooring buoy 2/I" },
    desc: {
      uk: "Катер вдарив сталевий буй лівою вилицею, зазнавши пошкодження пластикового корпусу, деформації гвинтів та вала.",
      en: "Vessel struck mooring buoy with port bow, causing GRP laminate damage, shaft bend, and propeller deformation."
    },
    ref: "IMO Casualty Code (Res. MSC.255(84))",
    mitigation: {
      uk: "Оснащення буїв світловідбивачами 3M та демаркація фарватеру у векторних картах",
      en: "Equip buoys with retroreflective banding and mark hazard zones on electronic charts"
    }
  },
  CE1: {
    category: { uk: "Аварійна подія (Casualty Event)", en: "Casualty Event" },
    title: { uk: "CE1: Навал катера KP-965 на буй 2/I в Басейні I", en: "CE1: Allision of pilot boat KP-965 with buoy 2/I" },
    desc: {
      uk: "Морська аварія (Marine casualty): значні матеріальні збитки корпусу та валопроводу без жертв, травм чи забруднення акваторії.",
      en: "Marine casualty: material damage to hull laminate and propulsion shaft/propellers without casualties, injuries, or pollution."
    },
    ref: "IMO MSC-MEPC.3/Circ.4/Rev.1 Table 5",
    mitigation: {
      uk: "Системне виконання всіх 7 офіційних рекомендацій розслідування MAIIS (SR003–SR009)",
      en: "Systemic implementation of all 7 MAIIS safety recommendations (SR003–SR009)"
    }
  },
  CF1: {
    category: { uk: "Фактор сприяння (Operational)", en: "Contributing Factor (Operational)" },
    title: { uk: "CF1: Висока швидкість у стиснених водах (~21–22 вузли)", en: "CF1: High transit speed in confined waters" },
    desc: {
      uk: "Перехід на швидкості ~21–22 вузли у нічний час у внутрішньому басейні критично скоротив час реакції екіпажу.",
      en: "High transit speed (~21-22 kt) in confined port waters critically compressed reaction and stopping distance."
    },
    ref: "COLREG Rule 6 (Safe Speed) & MAIIS Finding 1",
    mitigation: {
      uk: "Встановлення чіткого операційного ліміту швидкості ≤ 10 вузлів у басейнах порту",
      en: "Enforce operational speed limit <= 10 knots within all port basins"
    }
  },
  CF2: {
    category: { uk: "Фактор сприяння (Human)", en: "Contributing Factor (Human)" },
    title: { uk: "CF2: Тимчасова втрата активного контролю маршруту", en: "CF2: Temporary loss of active route monitoring" },
    desc: {
      uk: "Судноводій тимчасово втратив пильність за курсом, що призвело до запізнілого виявлення небезпеки.",
      en: "Temporary loss of active route monitoring and delayed hazard recognition by the operator."
    },
    ref: "COLREG Rule 5 & MSC-MEPC.3/Circ.4/Rev.1 Table 20",
    mitigation: {
      uk: "Впровадження практики коротких брифінгів та безперервного курсового моніторингу",
      en: "Institute pre-transit departure brief and continuous heading monitoring"
    }
  },
  CF3: {
    category: { uk: "Фактор сприяння (Workplace)", en: "Contributing Factor (Workplace)" },
    title: { uk: "CF3: Обмежений огляд через розміщення крісла матроса", en: "CF3: Limited forward visibility from deckhand seat" },
    desc: {
      uk: "Низьке положення другого крісла в кабіні обмежувало прямий сектор огляду поверхні води перед носом судна.",
      en: "Lower seating arrangement of additional trained person restricted forward sightline to surface."
    },
    ref: "MAIIS Investigation Report Chapter 2.4 / Bridge Ergonomics",
    mitigation: {
      uk: "Модернізація ергономіки містка: регульоване підвищене крісло другого спостерігача",
      en: "Ergonomic helm refit: elevated adjustable observation seat for second lookout"
    }
  },
  CF4: {
    category: { uk: "Фактор сприяння (Human)", en: "Contributing Factor (Human)" },
    title: { uk: "CF4: Неефективне спільне спостереження (BRM)", en: "CF4: Ineffective shared lookout / BRM" },
    desc: {
      uk: "Відсутність скоординованої взаємодії: лоцман перебував на борту лише як пасажир без обов'язків спостереження.",
      en: "Ineffective Bridge Resource Management; pilot onboard acted as passive passenger without safety role."
    },
    ref: "STCW Section A-VIII/2 Part 4-1 (BRM Principles)",
    mitigation: {
      uk: "Стандартизація протоколу командного моніторингу навігаційних загроз під час лоцманських операцій",
      en: "Standardize team threat-monitoring protocol during all pilot boat movements"
    }
  },
  CF5: {
    category: { uk: "Фактор сприяння (Technical)", en: "Contributing Factor (Technical)" },
    title: { uk: "CF5: Радар/плотер не спрацював як бар'єр безпеки", en: "CF5: Radar/plotter not an effective barrier" },
    desc: {
      uk: "Буй 2/I був відсутній на електронному плотері катера в день події; радар не контролювався безперервно.",
      en: "Mooring buoy 2/I was not displayed on plotter screen on occurrence day; radar was not actively monitored."
    },
    ref: "IMO Res. MSC.192(79) & IEC 62288",
    mitigation: {
      uk: "Щоденна звірка електронних карт та постійне радіолокаційне супроводження об'єктів у басейні",
      en: "Daily electronic chart verification and continuous radar tracking in port basins"
    }
  },
  CF6: {
    category: { uk: "Фактор сприяння (Organizational)", en: "Contributing Factor (Organizational)" },
    title: { uk: "CF6: Недокументована система підготовки персоналу", en: "CF6: Lack of documented training traceability" },
    desc: {
      uk: "Навчання та періодична оцінка існували на практиці, але не мали формалізованого обліку та перевірки навичок.",
      en: "Training and recurrent assessments lacked structured documentation, objective verification, and traceability."
    },
    ref: "ISM Code Section 6 (Resources and Personnel)",
    mitigation: {
      uk: "Створення сертифікованої матриці компетентності та журналу практичних тренінгів екіпажу",
      en: "Implement certified competence matrix and traceable practical training logs"
    }
  },
  CF7: {
    category: { uk: "Фактор сприяння (Organizational)", en: "Contributing Factor (Organizational)" },
    title: { uk: "CF7: Неформалізований розподіл завдань і зв'язку", en: "CF7: Unformalized task allocation & communication" },
    desc: {
      uk: "Обов'язки матроса щодо спостереження та регламент доповіді про небезпеки не були формально закріплені.",
      en: "Deckhand watchkeeping duties and hazard reporting protocol were not formalized in operating procedures."
    },
    ref: "STCW Code Table A-II/4 & SMS Operating Procedures",
    mitigation: {
      uk: "Затвердження СОП з чітким протоколом голосових доповідей про плавучі перешкоди",
      en: "Approve SOP with standardized verbal callout protocol for floating obstacles"
    }
  },
  CF8: {
    category: { uk: "Фактор сприяння (Human)", en: "Contributing Factor (Human)" },
    title: { uk: "CF8: Зниження пильності через нічний час (02:16 LT)", en: "CF8: Reduced alertness / circadian nadir" },
    desc: {
      uk: "Інцидент стався у пік біологічного спаду активності людини (циркадний надир 02:00–04:00), що знизило швидкість реакції.",
      en: "Occurrence coincided with circadian trough of physiological alertness, depressing reaction speed."
    },
    ref: "IMO MSC/Circ.1598 (Fatigue Mitigation Guidelines)",
    mitigation: {
      uk: "Наукове планування змін з обмеженням тривалості нічних чергувань та ротацією вахт",
      en: "Bio-mathematical fatigue roster scheduling limiting consecutive night operations"
    }
  },
  CF9: {
    category: { uk: "Фактор сприяння (Management)", en: "Contributing Factor (Management)" },
    title: { uk: "CF9: Недостатній операційний контроль транзитів біля буїв", en: "CF9: Inadequate risk controls near mooring buoys" },
    desc: {
      uk: "Оцінка ризиків компанії не враховувала небезпеку швидкісного проходження поруч зі швартовними буями в темряві.",
      en: "Company risk assessment omitted high-speed internal transits adjacent to unlit mooring buoys at night."
    },
    ref: "ISM Code Section 1.2.2.2 (Risk Assessment)",
    mitigation: {
      uk: "Комплексна ревізія матриці ризиків акваторії порту з встановленням охоронних зон навколо буїв",
      en: "Comprehensive port basin risk assessment establishing safe buffer zones around mooring buoys"
    }
  },
  CF10: {
    category: { uk: "Фактор сприяння (Organizational)", en: "Contributing Factor (Organizational)" },
    title: { uk: "CF10: Відсутність процедури дій після інциденту", en: "CF10: Lack of post-occurrence action procedure" },
    desc: {
      uk: "Не було регламенту негайної зупинки, доповіді VTS та оцінки пошкоджень перед продовженням руху.",
      en: "No procedure governed immediate stop, VTS occurrence reporting, or hull assessment before resuming transit."
    },
    ref: "MAIIS Safety Deficiency No. 6 & IMO Res. A.1075(28)",
    mitigation: {
      uk: "Обов'язковий чеклист дій після контакту: зупинка, перевірка трюмів, доповідь диспетчеру порту",
      en: "Mandatory post-contact checklist: emergency stop, bilge inspection, instant harbor master notification"
    }
  },
  SD1: {
    category: { uk: "Системний дефіцит", en: "Safety Deficiency" },
    title: { uk: "SD1: Недостатні вимоги контролю швидкості в порту", en: "SD1: Insufficient port speed management controls" },
    desc: {
      uk: "Операційні вимоги СУБ щодо безпечної швидкості та контролю руху катерів у внутрішніх басейнах порту були відсутні.",
      en: "Operational SMS requirements for speed management and safe transit of pilot craft in internal port were inadequate."
    },
    ref: "MAIIS Safety Deficiency No. 1 / Recommendation SR004",
    mitigation: {
      uk: "Впровадження обов'язкового швидкісного регламенту ≤ 10 вузлів для службових катерів у басейнах",
      en: "Enforce formal operational directive: <= 10 knots speed cap for service craft in basins"
    }
  },
  SD2: {
    category: { uk: "Системний дефіцит", en: "Safety Deficiency" },
    title: { uk: "SD2: Відсутність документованої системи тренінгів", en: "SD2: Lack of documented training system" },
    desc: {
      uk: "Відсутня надійна документована система початкового, періодичного та практичного навчання судноводіїв і матросів.",
      en: "No reliable documented system for initial, recurrent and practical verification training for crews."
    },
    ref: "MAIIS Safety Deficiency No. 2 / Recommendations SR003 & SR008",
    mitigation: {
      uk: "Розробка стандартизованої програми тренажерної підготовки з маневрування у стиснених водах",
      en: "Develop standardized simulator training curriculum for confined basin maneuvering"
    }
  },
  SD3: {
    category: { uk: "Системний дефіцит", en: "Safety Deficiency" },
    title: { uk: "SD3: Відсутність формалізованого розподілу обов'язків", en: "SD3: Unformalized allocation of lookout duties" },
    desc: {
      uk: "Відсутній офіційний документований розподіл обов'язків спостереження, підтримки та зв'язку під час переходів.",
      en: "No formal documented allocation of lookout, support and communication duties during fast transits."
    },
    ref: "MAIIS Safety Deficiency No. 3 / Recommendations SR005 & SR009",
    mitigation: {
      uk: "Внесення функцій другого впередсмотрящого до посадових інструкцій екіпажів катерів",
      en: "Formalize secondary lookout responsibilities in crew job descriptions and watch bills"
    }
  },
  SD4: {
    category: { uk: "Системний дефіцит", en: "Safety Deficiency" },
    title: { uk: "SD4: Нестандартизоване використання радара/плотера", en: "SD4: Unstandardized radar/plotter utilization" },
    desc: {
      uk: "Використання радіолокатора/плотера, виявлення небезпек та перехресна перевірка курсу не стандартизовані.",
      en: "Radar/plotter use, hazard awareness, and route cross-checking are not standardized or supervised."
    },
    ref: "MAIIS Safety Deficiency No. 4 / Recommendation SR006",
    mitigation: {
      uk: "Впровадження СОП з налаштування радарних шкал (0.5–0.75 NM) та постійного плотерного супроводу",
      en: "Implement SOP mandating 0.5-0.75 NM radar range scales and active chart cross-check"
    }
  },
  SD5: {
    category: { uk: "Системний дефіцит", en: "Safety Deficiency" },
    title: { uk: "SD5: Відсутність відображення буя 2/I на дисплеї", en: "SD5: Electronic display barrier failure" },
    desc: {
      uk: "Електронний навігаційний дисплей у день події не надав індикацію буя 2/I як надійного бар'єра безпеки.",
      en: "Electronic display on occurrence day failed to present buoy 2/I as safety barrier; historical data lost."
    },
    ref: "MAIIS Safety Deficiency No. 4 & Technical Annex",
    mitigation: {
      uk: "Автоматична синхронізація гідрографічних баз даних та збереження журналів переходів на захищений носій",
      en: "Automated hydrographic database synchronization and tamper-proof voyage data logging"
    }
  },
  SD6: {
    category: { uk: "Системний дефіцит", en: "Safety Deficiency" },
    title: { uk: "SD6: Відсутність процедури дій та техогляду після навалу", en: "SD6: Missing post-contact occurrence protocol" },
    desc: {
      uk: "Відсутня формальна процедура негайного сповіщення VTS/URSP, фіксації доказів та техогляду перед рухом.",
      en: "No formal procedure for immediate VTS reporting, evidence preservation, and technical survey before transit."
    },
    ref: "MAIIS Safety Deficiency No. 5 / Recommendation SR007",
    mitigation: {
      uk: "Введення обов'язкового протоколу 'Safety Stand-down' та ультразвукового обстеження корпусу після контакту",
      en: "Institute mandatory 'Safety Stand-down' and hull/shaft ultrasonic NDT inspection after any impact"
    }
  },
  SD7: {
    category: { uk: "Системний дефіцит", en: "Safety Deficiency" },
    title: { uk: "SD7: Недостатня ідентифікація небезпек біля інфраструктури", en: "SD7: Inadequate hazard identification near infrastructure" },
    desc: {
      uk: "Ідентифікація небезпек та оцінка ризиків внутрішніх швидкісних переходів біля фіксованих буїв були недостатніми.",
      en: "Hazard identification and risk assessment for high-speed transits near fixed mooring infrastructure inadequate."
    },
    ref: "MAIIS Safety Deficiency No. 7 / ISM Code Section 1.2",
    mitigation: {
      uk: "Розробка карти критичних навігаційних перешкод басейнів порту з буферними зонами безпеки",
      en: "Produce port basin restricted hazard chart with automated proximity safety buffers"
    }
  },
  SI1: {
    category: { uk: "Проблема безпеки (Safety Issue)", en: "Safety Issue" },
    title: { uk: "SI1: Управління швидкісними ризиками в портах", en: "SI1: High-speed transit risk governance" },
    desc: {
      uk: "Управління навігаційними ризиками під час швидкісних операцій службових катерів у стиснених водах порту.",
      en: "Systemic risk governance of high-speed craft operations in restricted internal port basins."
    },
    ref: "IMO High-Speed Craft Code (HSC) & Port Safety Management",
    mitigation: {
      uk: "Встановлення жорсткого нормативного контролю швидкості службових суден адміністрацією порту",
      en: "Enact strict regulatory speed controls for auxiliary fleet by port administration"
    }
  },
  SI2: {
    category: { uk: "Проблема безпеки (Safety Issue)", en: "Safety Issue" },
    title: { uk: "SI2: Синергія містка (BRM) при лоцманських операціях", en: "SI2: Bridge team synergy during pilotage operations" },
    desc: {
      uk: "Управління ресурсами містка (BRM) та спільний моніторинг загроз під час висадки й посадки лоцманів.",
      en: "Bridge Resource Management and shared threat monitoring during pilot transfers."
    },
    ref: "STCW Section A-VIII/2 (BRM Standards)",
    mitigation: {
      uk: "Обов'язковий спільний тренінг BRM для лоцманів, судноводіїв катерів та матросів",
      en: "Mandatory joint BRM synergy training for pilots, coxswains, and deckhands"
    }
  },
  SI3: {
    category: { uk: "Проблема безпеки (Safety Issue)", en: "Safety Issue" },
    title: { uk: "SI3: Гарантія надійності навігаційних дисплеїв", en: "SI3: Operational reliability of navigation displays" },
    desc: {
      uk: "Оперативне використання навігаційних дисплеїв та обов'язкова перехресна перевірка небезпек маршруту.",
      en: "Operational utilization of navigation displays and mandatory cross-checking of route hazards."
    },
    ref: "SOLAS V/19 & IMO Performance Standards",
    mitigation: {
      uk: "Сертифікація та автоматичний аудит навігаційних баз даних на бортових плотерах",
      en: "Certification and automated audit of hydrographic chart databases on onboard plotters"
    }
  },
  SI4: {
    category: { uk: "Проблема безпеки (Safety Issue)", en: "Safety Issue" },
    title: { uk: "SI4: Стандартизація та верифікація навчання персоналу", en: "SI4: Standardized competence certification & verification" },
    desc: {
      uk: "Підготовка, атестація та періодичне підтвердження кваліфікації екіпажів катерів портофлоту.",
      en: "Competence certification, documented approval, and recurrent practical skill verification for small craft crews."
    },
    ref: "STCW Regulation I/11 & National Maritime Authority Rules",
    mitigation: {
      uk: "Законодавче закріплення обов'язкових стандартів підготовки екіпажів лоцманських суден",
      en: "Statutory formalization of training standards for pilot boat operating personnel"
    }
  },
  SI5: {
    category: { uk: "Проблема безпеки (Safety Issue)", en: "Safety Issue" },
    title: { uk: "SI5: Післяаварійне реагування та збереження доказів", en: "SI5: Post-occurrence response & evidence preservation" },
    desc: {
      uk: "Звітність після інциденту, збереження об'єктивних доказів та правила продовження комерційних операцій.",
      en: "Post-occurrence reporting, forensic evidence preservation, and continuation-of-service decision frameworks."
    },
    ref: "IMO Casualty Investigation Code (Res. MSC.255(84))",
    mitigation: {
      uk: "Впровадження автоматичних реєстраторів рейсів (VDR/mini-VDR) на службових швидкохідних катерах",
      en: "Equip fast service craft with simplified voyage data recorders (mini-VDR/AIS loggers)"
    }
  }
};

function selectEcfaNode(nodeId) {
  currentSelectedEcfaNode = nodeId;
  const meta = ECFA_NODE_METADATA[nodeId];
  if (!meta) return;

  const catEl = $("#ecfa-selected-node-category");
  const titleEl = $("#ecfa-selected-node-title");
  const descEl = $("#ecfa-selected-node-desc");
  const refEl = $("#ecfa-selected-node-ref");
  const mitEl = $("#ecfa-selected-node-mitigation");

  if (catEl) catEl.textContent = meta.category[currentLang] || meta.category.uk;
  if (titleEl) titleEl.textContent = meta.title[currentLang] || meta.title.uk;
  if (descEl) descEl.textContent = meta.desc[currentLang] || meta.desc.uk;
  if (refEl) refEl.textContent = meta.ref;
  if (mitEl) mitEl.textContent = meta.mitigation[currentLang] || meta.mitigation.uk;

  // Update selected class in SVG without full redraw if possible
  const wrap = $("#ecfa-diagram-wrap");
  if (wrap) {
    wrap.querySelectorAll(".ecfa-node").forEach((el) => {
      const isCur = el.dataset.nodeId === nodeId;
      el.classList.toggle("selected", isCur);
      const rect = el.querySelector("rect");
      if (rect) rect.setAttribute("stroke-width", isCur ? "2.5" : "1.2");
    });
  }
}

function renderEcfaDiagram(activeFilter = "all") {
  const wrap = $("#ecfa-diagram-wrap");
  if (!wrap) return;

  const events = KP965_GISIS_RECORD.ecfaDiagram.events;
  const accidentEvents = KP965_GISIS_RECORD.ecfaDiagram.accidentEvents;
  const casualtyEvent = KP965_GISIS_RECORD.ecfaDiagram.casualtyEvent;
  const factors = KP965_GISIS_RECORD.ecfaDiagram.contributingFactors;
  const deficiencies = KP965_GISIS_RECORD.ecfaDiagram.safetyDeficiencies;
  const issues = KP965_GISIS_RECORD.ecfaDiagram.safetyIssues;

  const eventBoxes = events.map((e, idx) => ({
    id: e.id,
    type: "events",
    x: 15 + idx * 133,
    y: 35,
    w: 122,
    h: 52,
    stroke: "#f59e0b",
    tagColor: "#f59e0b",
    time: e.time,
    label: currentLang === "en" ? e.labelEn : e.labelUk
  }));

  const accidentBoxes = accidentEvents.map((ae, idx) => ({
    id: ae.id,
    type: "accident",
    x: 25 + idx * 265,
    y: 135,
    w: 245,
    h: 52,
    stroke: "#f43f5e",
    tagColor: "#f43f5e",
    label: currentLang === "en" ? ae.labelEn : ae.labelUk
  }));

  const casualtyBox = {
    id: casualtyEvent.id,
    type: "casualty",
    x: 310,
    y: 228,
    w: 460,
    h: 52,
    stroke: "#ef4444",
    tagColor: "#ef4444",
    label: currentLang === "en" ? casualtyEvent.labelEn : casualtyEvent.labelUk
  };

  const factorBoxes = factors.map((cf, idx) => {
    const isSecondRow = idx >= 5;
    const colIdx = isSecondRow ? idx - 5 : idx;
    return {
      id: cf.id,
      type: "factors",
      x: 18 + colIdx * 212,
      y: isSecondRow ? 388 : 322,
      w: 200,
      h: 52,
      stroke: "#06b6d4",
      tagColor: "#06b6d4",
      category: cf.category,
      label: currentLang === "en" ? cf.labelEn : cf.labelUk
    };
  });

  const deficiencyBoxes = deficiencies.map((sd, idx) => ({
    id: sd.id,
    type: "deficiencies",
    x: 15 + idx * 151,
    y: 480,
    w: 142,
    h: 52,
    stroke: "#a855f7",
    tagColor: "#a855f7",
    label: currentLang === "en" ? sd.labelEn : sd.labelUk
  }));

  const issueBoxes = issues.map((si, idx) => ({
    id: si.id,
    type: "issues",
    x: 18 + idx * 212,
    y: 572,
    w: 200,
    h: 52,
    stroke: "#38bdf8",
    tagColor: "#38bdf8",
    label: currentLang === "en" ? si.labelEn : si.labelUk
  }));

  const allBoxes = [...eventBoxes, ...accidentBoxes, casualtyBox, ...factorBoxes, ...deficiencyBoxes, ...issueBoxes];
  const boxMap = Object.fromEntries(allBoxes.map((b) => [b.id, b]));

  const connectors = [
    // Chronology chain
    { from: "E1", to: "E2" }, { from: "E2", to: "E3" }, { from: "E3", to: "E4" },
    { from: "E4", to: "E5" }, { from: "E5", to: "E6" }, { from: "E6", to: "E7" }, { from: "E7", to: "E8" },
    // Events to Accident Events
    { from: "E3", to: "AE2" },
    { from: "E4", to: "AE1" },
    { from: "E4", to: "AE3" },
    { from: "E5", to: "AE4" },
    // Accident Event to Casualty Event
    { from: "AE4", to: "CE1" },
    // Contributing Factors to Accident Events
    { from: "CF1", to: "AE1" }, { from: "CF2", to: "AE1" }, { from: "CF8", to: "AE1" }, { from: "CF9", to: "AE1" },
    { from: "CF3", to: "AE2" }, { from: "CF4", to: "AE2" }, { from: "CF6", to: "AE2" }, { from: "CF7", to: "AE2" },
    { from: "CF1", to: "AE3" }, { from: "CF5", to: "AE3" },
    { from: "CF10", to: "AE4" },
    // Contributing Factors to Safety Deficiencies
    { from: "CF1", to: "SD1" },
    { from: "CF6", to: "SD2" },
    { from: "CF3", to: "SD3" }, { from: "CF4", to: "SD3" }, { from: "CF7", to: "SD3" },
    { from: "CF5", to: "SD4" }, { from: "CF5", to: "SD5" },
    { from: "CF10", to: "SD6" },
    { from: "CF2", to: "SD7" }, { from: "CF9", to: "SD7" },
    // Safety Deficiencies to Safety Issues
    { from: "SD1", to: "SI1" }, { from: "SD7", to: "SI1" },
    { from: "SD3", to: "SI2" },
    { from: "SD4", to: "SI3" }, { from: "SD5", to: "SI3" },
    { from: "SD2", to: "SI4" },
    { from: "SD6", to: "SI5" }
  ];

  let svg = `<svg class="ecfa-diagram-svg" viewBox="0 0 1080 655" role="img" aria-label="ECFA Diagram KP-965">
    <defs>
      <marker id="ecfa-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
        <polygon points="0 0, 6 3, 0 6" fill="#475569" />
      </marker>
    </defs>
    <text x="15" y="22" fill="#94a3b8" font-size="10" font-weight="700" letter-spacing="0.05em">ХРОНОЛОГІЯ ПОДІЙ (CHRONOLOGICAL EVENTS · E1..E8)</text>
    <text x="15" y="122" fill="#94a3b8" font-size="10" font-weight="700" letter-spacing="0.05em">АВАРІЙНІ ТОЧКИ ЗРИВУ БЕЗПЕКИ (ACCIDENT EVENTS · AE1..AE4)</text>
    <text x="15" y="214" fill="#94a3b8" font-size="10" font-weight="700" letter-spacing="0.05em">ОСНОВНА АВАРІЙНА ПОДІЯ (CASUALTY EVENT · CE1)</text>
    <text x="15" y="306" fill="#94a3b8" font-size="10" font-weight="700" letter-spacing="0.05em">СПРИЯЮЧІ ФАКТОРИ (CONTRIBUTING FACTORS · CF1..CF10)</text>
    <text x="15" y="465" fill="#94a3b8" font-size="10" font-weight="700" letter-spacing="0.05em">СИСТЕМНІ ДЕФІЦИТИ БЕЗПЕКИ (SAFETY DEFICIENCIES · SD1..SD7)</text>
    <text x="15" y="558" fill="#94a3b8" font-size="10" font-weight="700" letter-spacing="0.05em">СИСТЕМНІ ПРОБЛЕМИ БЕЗПЕКИ (SAFETY ISSUES · SI1..SI5)</text>

    <g class="ecfa-connectors" aria-hidden="true">`;

  for (const c of connectors) {
    const src = boxMap[c.from];
    const dst = boxMap[c.to];
    if (!src || !dst) continue;
    if (src.y === dst.y) {
      const x1 = src.x < dst.x ? src.x + src.w : src.x;
      const y1 = src.y + src.h / 2;
      const x2 = src.x < dst.x ? dst.x : dst.x + dst.w;
      const y2 = dst.y + dst.h / 2;
      svg += `<path d="M ${x1} ${y1} L ${x2} ${y2}" stroke="#64748b" stroke-width="1.2" stroke-dasharray="3,3" marker-end="url(#ecfa-arrow)" />`;
    } else if (src.y < dst.y) {
      const x1 = src.x + src.w / 2;
      const y1 = src.y + src.h;
      const x2 = dst.x + dst.w / 2;
      const y2 = dst.y;
      const midY = (y1 + y2) / 2;
      svg += `<path d="M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}" stroke="#475569" stroke-width="1.2" fill="none" marker-end="url(#ecfa-arrow)" />`;
    } else {
      const x1 = src.x + src.w / 2;
      const y1 = src.y;
      const x2 = dst.x + dst.w / 2;
      const y2 = dst.y + dst.h;
      const midY = (y1 + y2) / 2;
      svg += `<path d="M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}" stroke="#475569" stroke-width="1.2" fill="none" marker-end="url(#ecfa-arrow)" />`;
    }
  }

  svg += `</g>`;

  for (const b of allBoxes) {
    const isSelected = b.id === currentSelectedEcfaNode;
    const isDimmed = activeFilter !== "all" && b.type !== activeFilter;
    const opacity = isDimmed ? "0.22" : "1.0";
    const selectedClass = isSelected ? "selected" : "";
    const bgColor = b.type === "casualty" ? "#190e18" : "#0b1726";

    svg += `<g class="ecfa-node ${selectedClass}" data-node-id="${b.id}" data-node-type="${b.type}" opacity="${opacity}" tabindex="0" role="button" aria-label="${b.id}: ${escapeHtml(b.label)}">
      <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="6" fill="${bgColor}" stroke="${b.stroke}" stroke-width="${isSelected ? '2.5' : '1.2'}" />
      <text x="${b.x + 8}" y="${b.y + 15}" fill="${b.tagColor}" font-size="9.5" font-weight="700">${b.id}${b.time ? ' · ' + b.time : ''}</text>
      <text x="${b.x + 8}" y="${b.y + 29}" fill="#f1f5f9" font-size="8.5" font-weight="600">${escapeHtml(b.label.slice(0, 27))}</text>
      <text x="${b.x + 8}" y="${b.y + 42}" fill="#94a3b8" font-size="8">${escapeHtml(b.label.slice(27, 54))}${b.label.length > 54 ? '...' : ''}</text>
    </g>`;
  }

  svg += `</svg>`;
  wrap.innerHTML = svg;

  wrap.querySelectorAll(".ecfa-node").forEach((nodeEl) => {
    nodeEl.addEventListener("click", () => {
      selectEcfaNode(nodeEl.dataset.nodeId);
    });
    nodeEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectEcfaNode(nodeEl.dataset.nodeId);
      }
    });
  });
}

const GUIDED_FACTOR_LABELS = {
  "factor-speed": "перевищення швидкості",
  "factor-lookout": "одиночне спостереження",
  "factor-fatigue": "циркадний надир і перевтома",
  "factor-radar": "неефективне використання радара",
  "factor-training": "недоліки навчання та процедур"
};

function renderGuidedAssignment(riskResult = currentPortBasinRisk) {
  if (!riskResult) return;

  const rawScore = Number(riskResult.rawProbabilityScore ?? riskResult.probabilityScore);
  const rawDisplay = $("#gisis-raw-prob-display");
  if (rawDisplay) rawDisplay.textContent = rawScore.toFixed(1);

  const capExplanation = $("#gisis-cap-explanation");
  if (capExplanation) {
    capExplanation.textContent = rawScore > riskResult.probabilityScore
      ? `Сума ваг факторів ${rawScore.toFixed(1)} перевищує межу шкали, тому P обмежено до ${riskResult.probabilityScore.toFixed(1)}.`
      : `Сума ваг факторів дорівнює ${rawScore.toFixed(1)}, тому P = ${riskResult.probabilityScore.toFixed(1)} без додаткового обмеження.`;
  }

  const activeFactorLabels = Object.entries(GUIDED_FACTOR_LABELS)
    .filter(([id]) => $(`#${id}`)?.checked)
    .map(([, label]) => label);
  const mitigationActions = riskResult.mitigationRules.map((rule) => rule.actionUk);
  const conclusion = buildAssignmentConclusion({ riskResult, activeFactorLabels, mitigationActions });
  const conclusionEl = $("#assignment-conclusion");
  if (conclusionEl) conclusionEl.textContent = conclusion;
}

function showGuidedStep(step, { focus = false } = {}) {
  const mode = document.documentElement.dataset.view;
  const normalizedStep = Number.isInteger(step) && step >= 1 && step <= GUIDED_STEP_COUNT ? step : 0;
  currentGuidedStep = normalizedStep;
  document.documentElement.dataset.guidedStep = String(normalizedStep);
  document.documentElement.dataset.guidedReady = "true";

  document.querySelectorAll("[data-guided-step]").forEach((panel) => {
    const isCurrent = Number(panel.dataset.guidedStep) === normalizedStep;
    panel.toggleAttribute("hidden", mode === "assignment" && !isCurrent);
  });
  document.querySelectorAll("[data-guided-progress]").forEach((item) => {
    const itemStep = Number(item.dataset.guidedProgress);
    if (itemStep === normalizedStep) {
      item.setAttribute("aria-current", "step");
    } else {
      item.removeAttribute("aria-current");
    }
    item.classList.toggle("is-complete", normalizedStep > 0 && itemStep < normalizedStep);
  });

  if (mode === "tools") {
    $("#guided-ecfa-details")?.setAttribute("open", "");
    $("#guided-evidence-details")?.setAttribute("open", "");
  }

  if (focus && normalizedStep) {
    const panel = $(`[data-guided-step="${normalizedStep}"]`);
    panel?.querySelector("h3")?.focus({ preventScroll: true });
  }
}

async function copyAssignmentConclusion() {
  const button = $("#copy-assignment-conclusion-btn");
  const conclusion = $("#assignment-conclusion")?.textContent ?? "";
  const result = await copyTextOrFallback(navigator.clipboard, conclusion);
  if (result.copied) {
    if (button) button.textContent = "Висновок скопійовано";
  } else {
    const fallback = $("#assignment-conclusion-fallback");
    const preview = $("#assignment-conclusion-preview");
    if (fallback && preview) {
      preview.value = result.fallbackText;
      fallback.removeAttribute("hidden");
      preview.focus();
      preview.select();
    }
    if (button) button.textContent = "Скопіюйте текст нижче";
  }
  window.setTimeout(() => {
    if (button) button.textContent = "Копіювати висновок";
  }, 2500);
}

function enterGuidedAssignment(event) {
  const targetStep = resolveGuidedStep(event.currentTarget.getAttribute("href"));
  if (!targetStep) return;
  event.preventDefault();
  const targetHash = guidedStepHash(targetStep);
  history.pushState(null, "", targetHash);
  showGuidedStep(targetStep, { focus: false });
  const entryPanel = $(`[data-guided-step="${targetStep}"]`);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  entryPanel?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  entryPanel?.querySelector("h3")?.focus({ preventScroll: true });
}

function initGuidedAssignment() {
  const handleHash = (focus = false) => showGuidedStep(resolveGuidedStep(window.location.hash), { focus });
  window.addEventListener("hashchange", () => handleHash(true));
  document.querySelectorAll("[data-guided-next], [data-guided-prev], [data-guided-progress]").forEach((link) => {
    const targetStep = resolveGuidedStep(link.getAttribute("href"));
    if (!targetStep) return;
    const targetHash = guidedStepHash(targetStep);
    link.setAttribute("href", targetHash);
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const scrollPosition = { x: window.scrollX, y: window.scrollY };
      history.pushState(null, "", targetHash);
      showGuidedStep(targetStep, { focus: true });
      window.scrollTo({ left: scrollPosition.x, top: scrollPosition.y, behavior: "instant" });
      window.requestAnimationFrame(() => {
        window.scrollTo({ left: scrollPosition.x, top: scrollPosition.y, behavior: "instant" });
      });
    });
  });
  document.querySelectorAll("[data-guided-entry]").forEach((link) => {
    link.addEventListener("click", enterGuidedAssignment);
  });
  $("#copy-assignment-conclusion-btn")?.addEventListener("click", copyAssignmentConclusion);
  $("#print-assignment-btn")?.addEventListener("click", () => {
    $("#guided-ecfa-details")?.setAttribute("open", "");
    $("#guided-evidence-details")?.setAttribute("open", "");
    window.print();
  });
  handleHash(false);
}

function renderPortBasinRisk() {
  const factors = {
    excessSpeed: $("#factor-speed")?.checked ?? true,
    singleLookout: $("#factor-lookout")?.checked ?? true,
    circadianFatigue: $("#factor-fatigue")?.checked ?? true,
    glareVisualImpairment: false,
    radarNotUsed: $("#factor-radar")?.checked ?? true,
    routineComplacency: false,
    unlitObstacle: false,
    trainingOrOrgDeficiency: $("#factor-training")?.checked ?? true
  };
  const severityCode = Number($("#gisis-severity-select")?.value ?? 3);

  currentPortBasinRisk = calculatePortBasinRisk(factors, { severityCode });

  const probDisp = $("#gisis-prob-display");
  if (probDisp) probDisp.textContent = `${currentPortBasinRisk.probabilityScore.toFixed(1)} / 5.0`;

  const sevDisp = $("#gisis-sev-display");
  if (sevDisp) sevDisp.textContent = `${currentPortBasinRisk.severityCode} / 5`;

  const riskDisp = $("#gisis-risk-display");
  if (riskDisp) riskDisp.textContent = currentPortBasinRisk.riskIndex.toFixed(1);

  const badge = $("#gisis-risk-badge");
  if (badge) {
    badge.className = `gisis-risk-${currentPortBasinRisk.riskCategory}`;
    badge.textContent = currentLang === "en" ? currentPortBasinRisk.riskCategoryLabelEn : currentPortBasinRisk.riskCategoryLabelUk;
  }

  // Automated Critical Safety Alert Banner
  const alertBox = $("#gisis-critical-alert");
  const alertText = $("#gisis-critical-alert-text");
  if (alertBox && alertText) {
    if (currentPortBasinRisk.riskIndex >= 10.0 && currentPortBasinRisk.criticalAlertUk) {
      alertBox.removeAttribute("hidden");
      alertText.textContent = currentLang === "en" ? currentPortBasinRisk.criticalAlertEn : currentPortBasinRisk.criticalAlertUk;
    } else {
      alertBox.setAttribute("hidden", "");
    }
  }

  const list = $("#gisis-mitigation-list");
  if (list) {
    list.innerHTML = currentPortBasinRisk.mitigationRules.map((r) => {
      const act = currentLang === "en" ? r.actionEn : r.actionUk;
      const prioClass = r.priority === "CRITICAL" ? "crit" : (r.priority === "HIGH" ? "high" : "");
      const trigger = currentLang === "en" ? r.trigger?.labelEn : r.trigger?.labelUk;
      return `<li class="gisis-mitigation-item ${prioClass}">
        <strong>[${escapeHtml(r.standard)}] ${escapeHtml(act)}</strong>
        <small>Тригер: ${escapeHtml(trigger || "базове правило")} · ${escapeHtml(r.ruleId)} · ${escapeHtml(r.priority)}</small>
      </li>`;
    }).join("");
  }

  // Populate MAIIS official recommendations
  const maiisList = $("#maiis-recs-list");
  if (maiisList && KP965_GISIS_RECORD.ecfaDiagram?.safetyRecommendations) {
    maiisList.innerHTML = KP965_GISIS_RECORD.ecfaDiagram.safetyRecommendations.map((rec) => {
      const title = currentLang === "en" ? rec.titleEn : rec.titleUk;
      const summary = rec.summaryUk;
      return `<li class="maiis-rec-item">
        <div class="maiis-rec-header">
          <strong>${escapeHtml(rec.id)}: ${escapeHtml(title)}</strong>
          <span class="maiis-rec-addressee">${escapeHtml(rec.addressee)}</span>
        </div>
        <p class="maiis-rec-desc">${escapeHtml(summary)}</p>
      </li>`;
    }).join("");
  }

  // Populate Key Finding & Preventive Potential
  const keyFindingEl = $("#maiis-key-finding");
  if (keyFindingEl && KP965_GISIS_RECORD.ecfaDiagram?.synthesis) {
    keyFindingEl.textContent = currentLang === "en"
      ? KP965_GISIS_RECORD.ecfaDiagram.synthesis.keyFindingEn
      : KP965_GISIS_RECORD.ecfaDiagram.synthesis.keyFindingUk;
  }
  const prevPotEl = $("#maiis-preventive-potential");
  if (prevPotEl && KP965_GISIS_RECORD.ecfaDiagram?.synthesis) {
    prevPotEl.textContent = currentLang === "en"
      ? KP965_GISIS_RECORD.ecfaDiagram.synthesis.preventivePotentialEn
      : KP965_GISIS_RECORD.ecfaDiagram.synthesis.preventivePotentialUk;
  }

  renderGuidedAssignment(currentPortBasinRisk);
}

function initGisisEcfaModule() {
  const factorIds = [
    "factor-speed", "factor-lookout", "factor-fatigue", "factor-glare",
    "factor-radar", "factor-complacency", "factor-obstacle", "factor-training"
  ];
  factorIds.forEach((id) => {
    $(`#${id}`)?.addEventListener("change", renderPortBasinRisk);
  });
  $("#gisis-severity-select")?.addEventListener("change", renderPortBasinRisk);

  document.querySelectorAll(".ecfa-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".ecfa-filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentEcfaFilter = btn.dataset.ecfaFilter;
      renderEcfaDiagram(currentEcfaFilter);
    });
  });

  $("#download-gisis-json-btn")?.addEventListener("click", () => {
    const jsonStr = JSON.stringify(KP965_GISIS_RECORD, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "KP-965-gisis-record.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  async function copyPythonAssignment() {
    const btn = $("#copy-python-script-btn");
    if (!btn) return;

    const originalLabel = btn.textContent;
    const baselineRisk = calculatePortBasinRisk({
      excessSpeed: true,
      singleLookout: true,
      circadianFatigue: true,
      glareVisualImpairment: false,
      radarNotUsed: true,
      routineComplacency: false,
      unlitObstacle: false,
      trainingOrOrgDeficiency: true
    }, { severityCode: 3 });
    const pyScript = generatePythonAssignmentScript(KP965_GISIS_RECORD, baselineRisk);

    btn.disabled = true;
    const copyResult = await copyTextOrFallback(navigator.clipboard, pyScript);
    if (copyResult.copied) {
      btn.textContent = I18N[currentLang].copiedPythonNotice || "Скрипт скопійовано!";
    } else {
      const fallback = $("#python-copy-fallback");
      const preview = $("#python-script-preview");
      if (fallback && preview) {
        preview.value = copyResult.fallbackText;
        fallback.removeAttribute("hidden");
        preview.focus();
        preview.select();
      }
      btn.textContent = "Не вдалося скопіювати — скрипт показано нижче";
    }

    window.setTimeout(() => {
      btn.textContent = originalLabel;
      btn.disabled = false;
    }, 2500);
  }

  $("#copy-python-script-btn")?.addEventListener("click", copyPythonAssignment);

  $("#toggle-gisis-json-preview-btn")?.addEventListener("click", () => {
    const previewBox = $("#gisis-code-preview");
    if (!previewBox) return;
    const isHidden = previewBox.hasAttribute("hidden");
    if (isHidden) {
      previewBox.removeAttribute("hidden");
      const pre = $("#gisis-json-preview code");
      if (pre) pre.textContent = JSON.stringify(KP965_GISIS_RECORD, null, 2);
    } else {
      previewBox.setAttribute("hidden", "");
    }
  });

  renderPortBasinRisk();
  renderEcfaDiagram(currentEcfaFilter);
  selectEcfaNode("AE1");
  initGuidedAssignment();
}

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
    bridgeCockpit: "Ніч",
    bridgeRed: "Чер",
    bridgeDay: "День",
    statusPill: "Дослідницький прототип",
    calcBtn: "Розрахувати ризик",
    radarTab: "Аналіз і радар",
    whatifTab: "What-If",
    checklistTab: "Чек-лист",
    methodTab: "Методика",
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
    liveRadarTitle: "Профіль факторів",
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
    circKicker: "IMO MSC/Circ.1598",
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
    groundedKicker: "Вибірка MAIB",
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
    sensKicker: "Факторний аналіз",
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
    brmKicker: "BRM · STCW A-VIII/2 & COLREG RULE 5",
    brmTitle: "Синергія ходової вахти (BRM)",
    brmScoreSubLabel: "Ризик вахти",
    brmLookoutText: "Окремий впередсмотрящий (Lookout)",
    brmPilotText: "Лоцман на борту (Pilotage / MPX)",
    brmFindingsTitle: "Оцінка структури вахти та взаємодії",
    brmRecsTitle: "Рекомендації капітану та вахтовому помічнику",
    brmOptimalBadge: "Оптимальний рівень",
    brmDegradedBadge: "Деградований рівень",
    brmCompromisedBadge: "Скомпрометований рівень",
    mlcValKicker: "MLC 2006 STANDARD A2.3 & STCW A-VIII/1",
    mlcValTitle: "Валідатор годин відпочинку (Table of Hours of Rest)",
    mlcValTotalSub: "Відпочинок за 7 діб",
    mlcCompliantBadge: "Відповідає конвенції",
    mlcViolationBadge: "Порушень MLC",
    mlcValDesc: "Симуляція суднового журналу обліку праці та відпочинку. Перевірка ковзних 24-годинних та 7-денних вікон за стандартами Paris MoU / PSC.",
    mlcPresetsLabel: "Шаблони вахт:",
    mlcPreset48: "Вахта 4/8 (STCW)",
    mlcPreset66: "Вахта 6/6 (Feeder)",
    mlcPresetOvertime: "Порт / Овертайм",
    mlcDayNames: ["День 1", "День 2", "День 3", "День 4", "День 5", "День 6", "День 7"],
    mlcTimelineTitle: "погодинний графік",
    mlcTimelineHint: "Натисніть на слот, щоб перемкнути: Відпочинок / Робота",
    mlcStateRest: "Відпочинок",
    mlcStateWork: "Робота",
    mlcRuleDailyTitle: "Мінімум 10 год відпочинку за кожні 24 год",
    mlcRuleDailySub: "MLC Standard A2.3.5(b) / STCW Section A-VIII/1",
    mlcRuleSplitsTitle: "Не більше 2 періодів відпочинку за добу",
    mlcRuleSplitsSub: "MLC Standard A2.3.6 / Нерозривність відновлення",
    mlcRuleBlocklenTitle: "Один нерозривний блок відпочинку ≥ 6 годин",
    mlcRuleBlocklenSub: "STCW A-VIII/1.3 / Профілактика хронічної втоми",
    mlcRuleIntervalTitle: "Інтервал між періодами відпочинку ≤ 14 годин",
    mlcRuleIntervalSub: "MLC Standard A2.3.6 / Максимальний безперервний цикл",
    mlcRuleWeeklyTitle: "Мінімум 77 год відпочинку за будь-які 7 діб",
    mlcRuleWeeklySub: "MLC Standard A2.3.5(b) / Тижневий баланс праці",
    mlcViolationsTitle: "Зафіксовані невідповідності (Non-Conformities):",
    drillKicker: "SOLAS III/19 · АВАРІЙНІ ТРИВОГИ",
    drillTitle: "Симуляція реакції на тривогу",
    drillDelaySpan: "Затримка реакції",
    drillDelaySmall: "через фактори втоми",
    drillErrorSpan: "Ймовірність помилки",
    drillErrorSmall: "критичні збої дій",
    drillReadinessSpan: "Рівень готовності",
    drillReadinessSmall: "за розкладом Muster List",
    drillReadinessLabels: { optimal: "Оптимальний", degraded: "Знижений", critical: "Критичний" },
    qrKicker: "Офлайн-передача вахти",
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
    academicKicker: "Експорт для публікації",
    academicTitle: "Експорт наукових артефактів (LaTeX / BibTeX / CSV)",
    academicLead: "Таблиці та цитування для курсових, дипломних або наукових робіт.",
    copyLatexBtn: "Копіювати LaTeX таблицю",
    copyBibtexBtn: "Копіювати BibTeX цитування",
    downloadCsvBtn: "Завантажити CSV зріз",
    copiedLatexNotice: "Скопійовано!",
    copiedBibtexNotice: "Скопійовано!",
    compareKicker: "Порівняння профілів",
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
    pDocStamp: "Локальний самоаудит",
    sigCol1Span: "Підпис вахтового помічника / курсанта:",
    sigCol1Small: "Підтверджую коректність внесених годин та стану",
    sigCol2Span: "Офіцер з безпеки (Safety Officer / Ch.Off):",
    sigCol2Small: "Ознайомлений із показниками ризику та планом вахти",
    printDisclaimer: "SeaRisk UA (ДІ НУ «ОМА»). Розрахунок виконано локально на браузерному рушії. Документ призначений для самоконтролю безпеки мореплавства та не замінює обов'язкові суднові форми СУБ.",
    casesEyebrow: "Уроки розслідувань · MAIB Lessons Learned",
    casesTitle: "Розбір реальних морських аварій",
    casesDesc: "Офіційні розслідування Marine Accident Investigation Branch (MAIB) доводять: перевтома, порушення режиму праці (MLC 2006) та людський фактор призводять до катастроф. Завантажте профіль інциденту в калькулятор, щоб побачити факторний аналіз ризику.",
    caseLoadBtn: "Завантажити в калькулятор",
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
    footerAuthor: "Навчальний проєкт SeaRisk UA · Аналіз морської безпеки та аварії катера KP-965.",
    footerDisclosureSummary: "Правові застереження, методологія та політика конфіденційності (Zero-Data)",
    disc1H4: "Політика повної приватності (Zero-Data Retention)",
    disc1P: "Сервіс працює виключно на стороні клієнта (Client-Side). Жодні введені дані, параметри анкети, технічні ідентифікатори або cookies не передаються на сервери та не зберігаються після оновлення сторінки. Додаток не використовує трекерів чи комерційної аналітики.",
    disc2H4: "Академічний статус і відмова від відповідальності",
    disc2P: "SeaRisk UA є науково-навчальним прототипом для аналізу факторів ризику та демонстрації математичної моделі. Розрахунки не є сертифікованими оцінками безпеки (ISM Code / SMS), медичними висновками чи офіційним допуском до робіт. Інструмент не замінює обов'язкові суднові чек-листи компанії та конвенційні вимоги капітана.",
    disc3H4: "Нормативне підґрунтя",
    disc3P: "Оцінювання спирається на принципи Конвенції про працю в морському судноплавстві (MLC 2006, Standard A2.3), Міжнародної конвенції ПДНВ (STCW 1978/2010, Section A-VIII/1) та деперсоналізовані зведені звіти розслідувань морських аварій (MAIB, EMSA).",
    footerCopyright: "SeaRisk UA v1.1.0 · © 2026. Відкритий академічний код (Open Source). Дані анкети не залишають браузер.",
    announceResult: "Результат оновлено. Оцінка ризику",
    announceCategory: "Категорія",
    riskCats: { minimal: "Мінімальний", low: "Низький", moderate: "Помірний", high: "Високий", extreme: "Дуже високий" },
    importErrorAlert: "Не вдалося імпортувати профіль. Перевірте формат JSON-файлу.",
    importedFileLabel: "Імпортований файл",
    ciPrefix: "95% ДІ:",
    sparseWarning: "Малий обсяг вибірки (n < 30): підвищена статистична невизначеність",
    drillSoundPlay: "Сигнал тривоги (BAM)",
    drillSoundStop: "Зупинити сигнал",
    gisisEyebrow: "IMO Res. A.1075(28) & MSC-MEPC.3/Circ.4/Rev.1",
    gisisMainTitle: "Оцифрування аварій GISIS IMO та аналіз ECFA",
    gisisMainLead: "Практичне дослідження аварії лоцманського катера KP-965 (Копер, 14.04.2026): цифрові класифікатори Додатка 5, причинно-наслідкова схема ECFA, розрахунок матриці ризику портових басейнів (R = P × S) та автоматична генерація превентивних правил безпеки.",
    gisisCalcKicker: "IMO FSA METHODOLOGY · R = P × S",
    gisisCalcTitle: "Автоматизована оцінка ризику акваторій",
    gisisCalcIntro: "Оберіть п’ять ключових факторів кейсу. Алгоритм обчислить умовний бал імовірності P, помножить його на тяжкість S та запропонує превентивні заходи.",
    gisisMitigationTitle: "Автоматично згенеровані превентивні заходи безпеки:",
    ecfaKicker: "IMO RES. A.1075(28) · КАСКАДНИЙ ПРИЧИННИЙ АНАЛІЗ",
    ecfaTitle: "Інтерактивна векторна діаграма ECFA",
    ecfaIntro: "Структурно-логічна схема Event and Causal Factors Analysis аварії катера KP-965. Оберіть фільтр або клацніть вузол для перегляду аналітичної картки та превентивного заходу.",
    gisisExportKicker: "ОЦИФРОВАНЕ ДОСЬЄ АВАРІЇ · MSC-MEPC.3/CIRC.4/REV.1",
    gisisExportTitle: "Експорт для практичної роботи (JSON та Python)",
    gisisExportIntro: "JSON містить оцифроване досьє інциденту, а Python-скрипт відтворює розрахунок базового кейсу KP-965 (п’ять факторів увімкнено, S = 3). Це навчальна модель, а не офіційна оцінка IMO.",
    downloadGisisJsonBtn: "Завантажити KP-965-gisis-record.json",
    copyPythonScriptBtn: "Копіювати Python-скрипт (Jupyter / PyCharm)",
    toggleGisisJsonPreviewBtn: "Переглянути JSON Додатка 5",
    copiedPythonNotice: "Скрипт скопійовано!"
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
    bridgeCockpit: "Night",
    bridgeRed: "Red",
    bridgeDay: "Day",
    statusPill: "Research Prototype",
    calcBtn: "Calculate Risk Index",
    radarTab: "Analysis & Radar",
    whatifTab: "What-If",
    checklistTab: "Checklist",
    methodTab: "Method",
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
    liveRadarTitle: "Factor Profile",
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
    circKicker: "IMO MSC/Circ.1598",
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
    groundedKicker: "MAIB Sample",
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
    sensKicker: "Factor Analysis",
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
    brmKicker: "BRM · STCW A-VIII/2 & COLREG RULE 5",
    brmTitle: "Bridge Resource Management (BRM)",
    brmScoreSubLabel: "Watch Risk",
    brmLookoutText: "Dedicated Lookout on Bridge",
    brmPilotText: "Pilot on Board (MPX Protocol)",
    brmFindingsTitle: "Watch Team Structure & Redundancy Assessment",
    brmRecsTitle: "Bridge Team & Master Recommendations",
    brmOptimalBadge: "Optimal Redundancy",
    brmDegradedBadge: "Degraded Redundancy",
    brmCompromisedBadge: "Compromised Redundancy",
    mlcValKicker: "MLC 2006 STANDARD A2.3 & STCW A-VIII/1",
    mlcValTitle: "Hours of Rest Validator (Table of Hours of Rest)",
    mlcValTotalSub: "7-Day Rest Total",
    mlcCompliantBadge: "Fully Compliant",
    mlcViolationBadge: "MLC Deficiencies",
    mlcValDesc: "Simulation of shipboard record of hours of rest. Sliding 24-hour and 7-day compliance checks under Paris MoU / PSC standards.",
    mlcPresetsLabel: "Watch Presets:",
    mlcPreset48: "4/8 Watch (STCW)",
    mlcPreset66: "6/6 Watch (Feeder)",
    mlcPresetOvertime: "Port / Overtime",
    mlcDayNames: ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"],
    mlcTimelineTitle: "hourly schedule",
    mlcTimelineHint: "Click any hour slot to toggle: Rest / Work",
    mlcStateRest: "Rest",
    mlcStateWork: "Work",
    mlcRuleDailyTitle: "Minimum 10 hours rest in any 24h window",
    mlcRuleDailySub: "MLC Standard A2.3.5(b) / STCW Section A-VIII/1",
    mlcRuleSplitsTitle: "Maximum 2 rest periods per 24 hours",
    mlcRuleSplitsSub: "MLC Standard A2.3.6 / Rest continuity principle",
    mlcRuleBlocklenTitle: "One continuous rest period of ≥ 6 hours",
    mlcRuleBlocklenSub: "STCW A-VIII/1.3 / Prevention of acute fatigue",
    mlcRuleIntervalTitle: "Interval between rest periods ≤ 14 hours",
    mlcRuleIntervalSub: "MLC Standard A2.3.6 / Max continuous duty cycle",
    mlcRuleWeeklyTitle: "Minimum 77 hours rest in any 7-day period",
    mlcRuleWeeklySub: "MLC Standard A2.3.5(b) / Weekly fatigue safeguard",
    mlcViolationsTitle: "Recorded Non-Conformities (PSC Deficiencies):",
    drillKicker: "SOLAS III/19 · EMERGENCY DRILLS",
    drillTitle: "Emergency Response Simulation",
    drillDelaySpan: "Reaction delay",
    drillDelaySmall: "due to fatigue factors",
    drillErrorSpan: "Error probability",
    drillErrorSmall: "critical action failures",
    drillReadinessSpan: "Readiness level",
    drillReadinessSmall: "per Muster List standard",
    drillReadinessLabels: { optimal: "Optimal", degraded: "Degraded", critical: "Critical" },
    qrKicker: "Offline Watch Handover",
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
    academicKicker: "Publication Export",
    academicTitle: "Export Academic Artifacts (LaTeX / BibTeX / CSV)",
    academicLead: "Tables and citations for coursework, degree dissertations, or research papers.",
    copyLatexBtn: "Copy LaTeX Table",
    copyBibtexBtn: "Copy BibTeX Citation",
    downloadCsvBtn: "Download CSV Snapshot",
    copiedLatexNotice: "Copied!",
    copiedBibtexNotice: "Copied!",
    compareKicker: "Profile Comparison",
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
    pDocStamp: "Local Self-Audit",
    sigCol1Span: "Watch Officer / Cadet signature:",
    sigCol1Small: "I confirm the accuracy of reported hours and fitness status",
    sigCol2Span: "Safety Officer / Chief Officer:",
    sigCol2Small: "Noted watch profile metrics and watchkeeping plan",
    printDisclaimer: "SeaRisk UA. Pure browser client-side computation. For educational self-audit; does not replace mandatory SMS safety forms.",
    casesEyebrow: "Investigation Lessons · MAIB Lessons Learned",
    casesTitle: "Analysis of Real Maritime Casualties",
    casesDesc: "Official investigations by the Marine Accident Investigation Branch (MAIB) demonstrate: acute exhaustion, work hour violations (MLC 2006), and human factors trigger catastrophic casualties. Load real incident profiles to review factor breakdown.",
    caseLoadBtn: "Load into Calculator",
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
    footerAuthor: "SeaRisk UA educational project · Maritime safety and KP-965 casualty analysis.",
    footerDisclosureSummary: "Legal Disclaimers, Methodology & Zero-Data Retention Policy",
    disc1H4: "Zero-Data Retention Policy",
    disc1P: "The service operates 100% on the client side. No personal data, questionnaire parameters, or cookies are transmitted to servers or retained after closing the page. Zero commercial analytics or tracking.",
    disc2H4: "Academic Status & Disclaimer",
    disc2P: "SeaRisk UA is an educational research prototype for maritime safety factor analysis. Results do not constitute certified SMS / ISM Code safety assessments, clinical fitness decisions, or official watch clearances.",
    disc3H4: "Regulatory Framework",
    disc3P: "Evaluations reflect principles from the Maritime Labour Convention (MLC 2006 Standard A2.3), STCW 1978/2010 Section A-VIII/1, and official maritime casualty investigation reports (MAIB, EMSA).",
    footerCopyright: "SeaRisk UA v1.1.0 · © 2026. Open Source Academic Code. Questionnaire data never leaves the browser.",
    announceResult: "Result updated. Calculated risk index",
    announceCategory: "Category",
    riskCats: { minimal: "Minimal", low: "Low", moderate: "Moderate", high: "High", extreme: "Extreme" },
    importErrorAlert: "Could not import profile. Please verify JSON format.",
    importedFileLabel: "Imported File Profile",
    ciPrefix: "95% CI:",
    sparseWarning: "Small sample size (n < 30): elevated statistical uncertainty",
    drillSoundPlay: "Alarm Signal (BAM)",
    drillSoundStop: "Stop Alarm",
    gisisEyebrow: "IMO Res. A.1075(28) & MSC-MEPC.3/Circ.4/Rev.1",
    gisisMainTitle: "GISIS IMO Casualty Digitization & ECFA Analysis",
    gisisMainLead: "Practical investigation case study of pilot craft KP-965 allision (Port of Koper, 14.04.2026): Appendix 5 taxonomies, ECFA causal graph, port basin risk calculation (R = P × S), and automated safety mitigations.",
    gisisCalcKicker: "IMO FSA METHODOLOGY · R = P × S",
    gisisCalcTitle: "Automated Port Basin Risk Assessment",
    gisisCalcIntro: "Navigation risk index derived from frequency likelihood score (P, 1–5 scale) and consequence severity (S under Table 5, 1–5 scale).",
    gisisMitigationTitle: "Automated Preventive Safety Mitigations:",
    ecfaKicker: "IMO RES. A.1075(28) · CASUALTY CAUSAL FACTOR ANALYSIS",
    ecfaTitle: "Interactive Vector ECFA Diagram",
    ecfaIntro: "Structural Event and Causal Factors Analysis diagram for pilot craft KP-965. Select a filter or click any node to inspect details and preventative actions.",
    gisisExportKicker: "DIGITIZED CASUALTY DOSSIER · MSC-MEPC.3/CIRC.4/REV.1",
    gisisExportTitle: "Coursework Export Toolkit (JSON & Python)",
    gisisExportIntro: "The JSON contains the digitized incident dossier. The Python script reproduces the KP-965 baseline with all five factors enabled and S = 3. This is a training model, not an official IMO assessment.",
    downloadGisisJsonBtn: "Download KP-965-gisis-record.json",
    copyPythonScriptBtn: "Copy Python Script (Jupyter / PyCharm)",
    toggleGisisJsonPreviewBtn: "View Appendix 5 JSON",
    copiedPythonNotice: "Python script copied!"
  }
};

const caseStudiesByLang = {
  "vasco-de-gama": {
    uk: { badge: "Посадка на мілину", ship: "Ультра-великий контейнеровоз (399 м) · Протока Торн-Шанел", summary: "Під час нічного заходу в Саутгемптон судно сіло на мілину. Команда містка втратила контроль курсу через накопичену перевтому вахтового помічника: понад 70% нічних годин і високий темп роботи призвели до тунельного зору.", factors: ["2 750 год/рік", "70% нічних вахт", "Порушення MLC 2006"] },
    en: { badge: "Grounding", ship: "Ultra-Large Container Vessel (399m) · Thorn Channel", summary: "Grounding during nocturnal approach to Southampton. Bridge team lost track of vessel track due to cumulative fatigue of lead navigating officer: >70% night hours and intense pace led to tunnel vision.", factors: ["2,750 hrs/yr", "70% night watches", "MLC 2006 violation"] },
  },
  "zarga": {
    uk: { badge: "Важке травмування", ship: "Газовоз LNG (288 м) · Термінал South Hook", summary: "Розрив надміцного швартовного кінця (SBT) під натягом із зоною віддачі (Snap-back). Матрос отримав важку ЧМТ і травми кінцівок. Причини: втома палубної команди, відсутність захисту та робота в небезпечній зоні.", factors: ["Палубна команда", "Порушення ЗІЗ", "Snap-back zone"] },
    en: { badge: "Serious Injury", ship: "LNG Carrier (288m) · South Hook Terminal", summary: "Failure of high-modulus mooring line under tension with severe snap-back. Officer suffered traumatic head and limb injuries. Causes: deck crew fatigue, lack of protection, and lingering in snap-back zone.", factors: ["Deck Crew", "PPE non-compliance", "Snap-back zone"] },
  },
  "scot-carrier": {
    uk: { badge: "Зіткнення з загибеллю", ship: "Суховантаж (90 м) · Балтійське море біля Борнгольма", summary: "Нічний таран данської самохідної баржі на швидкості 12 вузлів. Баржа перекинулася, двоє моряків загинули. Вахтовий помічник Scot Carrier був на містку сам, заснув на ходовій вахті внаслідок безсоння та алкоголю.", factors: ["Алкоголь на вахті", "80% нічних годин", "Засинання за ECDIS"] },
    en: { badge: "Fatal Collision", ship: "General Cargo (90m) · Baltic Sea off Bornholm", summary: "Night collision with Danish hopper barge at 12 knots. Barge capsized with loss of two lives. Sole watchkeeper on Scot Carrier fell asleep on navigation watch due to acute sleep deprivation and alcohol.", factors: ["Alcohol on watch", "80% night hours", "Asleep at ECDIS"] },
  },
  "el-faro": {
    uk: { badge: "Загибель судна", ship: "Контейнеровоз Ro-Ro (241 м) · Атлантичний океан / Багами", summary: "Загибель 33 членів екіпажу в урагані 4 категорії. Комплекс факторів: тиск комерційного розкладу, зміщення вантажу через послаблені талрепи (lashing), втрата остійності, авторитаризм капітана та втома від наднормових вахт.", factors: ["Контейнеровоз", "2 950 год/рік", "Втрата остійності"] },
    en: { badge: "Total Loss / Sinking", ship: "Ro-Ro Cargo Vessel (241m) · Atlantic Ocean / Bahamas", summary: "Loss of 33 crew members in Category 4 hurricane. Compounding factors: commercial schedule pressure, cargo shift from parted lashings, loss of stability, steep bridge hierarchy, and fatigue.", factors: ["Container Ro-Ro", "2,950 hrs/yr", "Loss of stability"] },
  },
  "exxon-valdez": {
    uk: { badge: "Екологічна катастрофа", ship: "Супертанкер VLCC (301 м) · Протока Принца Вільгельма", summary: "Посадка на риф Блай та вилив 41 млн літрів сирої нафти. Розслідування NTSB виявило хронічну перевтому третього помічника на ходовій вахті через безперервний вахтовий графік 6/6 та понад 18 годин без сну, що призвело до повної втрати просторової орієнтації.", factors: ["Танкер VLCC", "85% нічних вахт", "3 200 год/рік"] },
    en: { badge: "Major Oil Spill", ship: "VLCC Supertanker (301m) · Prince William Sound", summary: "Grounding on Bligh Reef releasing 41M liters of crude oil. NTSB identified severe fatigue of 3rd mate on bridge watch after continuous 6on/6off schedule and >18h wakefulness, resulting in spatial disorientation.", factors: ["VLCC Tanker", "85% night watches", "3,200 hrs/yr"] },
  },
  "bourbon-dolphin": {
    uk: { badge: "Перекидання судна", ship: "Якорезавізний буксир AHTS (75 м) · Північне море / Шетланд", summary: "Втрата динамічної остійності та перекидання під час заведення якоря бурової установки. Загинуло 8 членів екіпажу. Фактори: надмірне натягнення якірних тросів, робота палубної команди на слизькій палубі без відпочинку та екстремальна кумулятивна втома.", factors: ["Буксир / AHTS", "Відсутність ЗІЗ", "Динамічна остійність"] },
    en: { badge: "Vessel Capsizing", ship: "Anchor Handling Tug AHTS (75m) · North Sea / Shetland", summary: "Loss of dynamic stability and capsizing while running an offshore rig anchor. 8 crew fatalities. Contributing factors: heavy chain tension, deck work on slippery rolling deck without rest, and extreme fatigue.", factors: ["Tug / AHTS", "Lack of PPE", "Dynamic stability"] },
  }
};

const glossaryByLang = {
  uk: [
    { term: "MLC 2006", def: "Конвенція МОП про працю в морському судноплавстві. Встановлює обов'язкові ліміти: не менше 10 год відпочинку на добу та 77 год за 7 днів." },
    { term: "STCW (ПДНВ)", def: "Міжнародна конвенція про підготовку і дипломування моряків та несення вахти (Розділ A-VIII/1: придатність до несення ходової вахти)." },
    { term: "IMO FSA", def: "Formal Safety Assessment (MSC-MEPC.2/Circ.12) — формалізована оцінка безпеки суден та екіпажу на основі матриць частоти та важкості наслідків." },
    { term: "ALARP", def: "As Low As Reasonably Practicable — фундаментальний принцип безпеки: зниження ризику до практично досяжного рівня через технічні та організаційні заходи." },
    { term: "IMO MSC/Circ.1598", def: "Керівні рекомендації IMO з управління судновою втомою (Fatigue Management Guidelines)." },
    { term: "ISGOTT", def: "International Safety Guide for Oil Tankers and Terminals — стандарт безпеки газового середовища, статичної електрики та наливних операцій." },
    { term: "IMSBC Code", def: "International Maritime Solid Bulk Cargoes Code — вимоги до перевезення навалювальних вантажів, схильних до розрідження або виділення газів." },
    { term: "Snap-Back Zone", def: "Небезпечна зона віддачі швартовного троса. Розраховується для всіх типів синтетичних і сталевих кінців." },
    { term: "Stop Work Authority", def: "Безумовне право будь-якого члена екіпажу негайно зупинити роботу за підозри на загрозу життю без дисциплінарних наслідків." },
    { term: "GMDSS / ГМЗЛБ", def: "Глобальна морська система зв'язку під час лиха та для забезпечення безпеки мореплавства (SOLAS IV)." },
    { term: "Профіль ризику судна", def: "Визначення у порядку, встановленому Чорноморським меморандумом, категорії високого, стандартного або низького ризику на основі типу, віку, кількості затримань (Правила z0353-04)." },
    { term: "GISIS IMO", def: "Глобальна інтегрована система інформації про судноплавство IMO — офіційна база даних аварій та розслідувань." },
    { term: "CleanSeaNet", def: "Європейська супутникова служба виявлення розливів нафти та моніторингу аварійного забруднення." }
  ],
  en: [
    { term: "MLC 2006", def: "Maritime Labour Convention (ILO). Enforces mandatory limits: minimum 10 hours rest per 24 hours and 77 hours per 7 days." },
    { term: "STCW 1978/2010", def: "Standards of Training, Certification and Watchkeeping for Seafarers (Section A-VIII/1: fitness for duty and watchkeeping standards)." },
    { term: "IMO FSA", def: "Formal Safety Assessment (MSC-MEPC.2/Circ.12) — structured methodology using frequency-severity matrices to evaluate risk control options." },
    { term: "ALARP", def: "As Low As Reasonably Practicable — safety principle stating that risk must be mitigated until further reduction costs are grossly disproportionate." },
    { term: "IMO MSC/Circ.1598", def: "IMO Guidelines on Fatigue Mitigation and Management for shipboard operations and crew scheduling." },
    { term: "ISGOTT", def: "International Safety Guide for Oil Tankers and Terminals — benchmark for flammable atmosphere control, static electricity, and transfer operations." },
    { term: "IMSBC Code", def: "International Maritime Solid Bulk Cargoes Code — mandatory rules for bulk cargoes subject to liquefaction or chemical gas evolution." },
    { term: "Snap-Back Zone", def: "High-energy recoil trajectory zone when a mooring line parts under tension. Danger zone for all synthetic and steel lines." },
    { term: "Stop Work Authority", def: "Inherent right of any crew member to halt an operation immediately without fear of reprisal if safety is compromised." },
    { term: "GMDSS", def: "Global Maritime Distress and Safety System (SOLAS Chapter IV) for automated distress alerting and maritime safety information." },
    { term: "Vessel Risk Profile", def: "Classification into High, Standard, or Low Risk Profile based on parameters under the Black Sea MoU (inspection frequency, flag state, RO performance)." },
    { term: "GISIS IMO", def: "Global Integrated Shipping Information System by IMO — official database of marine casualties and incidents." },
    { term: "CleanSeaNet", def: "European satellite-based oil spill monitoring and vessel detection service operated by EMSA." }
  ],
};

const officialContextByLang = {
  uk: [
    { stat: "2 659", span: "подій EMSA / EMCIP у 2024 році", text: "Європейський огляд: 2 864 залучені судна. Це окрема сукупність, не додана до MAIB.", linkText: "Звіт EMSA 2025 ↗", href: "https://www.emsa.europa.eu/emcip/items.html?cid=141&id=5562" },
    { stat: "5", span: "аварійних подій в Україні, I півріччя 2025", text: "1 загибла людина, 1 зникла, травмованих немає; морський, внутрішній і маломірний транспорт разом.", linkText: "Звіт Адміністрації судноплавства ↗", href: "https://marad.gov.ua/storage/app/sites/1/uploaded-files/Zvit_1_2025.pdf" },
    { stat: "GISIS", span: "міжнародний реєстр IMO", text: "Використовується як посилання на розслідування. Частина доступу потребує облікового запису й не завантажується автоматично.", linkText: "Сторінка IMO ↗", href: "https://www.imo.org/en/ourwork/msas/pages/casualties.aspx" }
  ],
  en: [
    { stat: "2,659", span: "EMSA / EMCIP marine casualties in 2024", text: "European fleet overview: 2,864 vessels involved. Maintained as distinct cohort, not mixed with MAIB.", linkText: "EMSA 2025 Report ↗", href: "https://www.emsa.europa.eu/emcip/items.html?cid=141&id=5562" },
    { stat: "5", span: "marine incidents in Ukraine, 1H 2025", text: "1 fatality, 1 missing, 0 non-fatal injuries; combines maritime, inland waterway and small craft.", linkText: "Shipping Administration Report ↗", href: "https://marad.gov.ua/storage/app/sites/1/uploaded-files/Zvit_1_2025.pdf" },
    { stat: "GISIS", span: "IMO Global Marine Incident Database", text: "Referenced for casualty investigations. Restricted dataset requiring institutional credentials.", linkText: "IMO Portal ↗", href: "https://www.imo.org/en/ourwork/msas/pages/casualties.aspx" }
  ],
};

function setLanguage(lang) {
  if (lang !== "uk" && lang !== "en") return;
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
  const navLabels = {
    assessment: t.navAssess,
    cases: t.navCases,
    gisis: "GISIS & ECFA",
    statistics: t.navStats,
    methodology: t.navMethod
  };
  document.querySelectorAll("[data-nav-key]").forEach((link) => {
    link.textContent = navLabels[link.dataset.navKey] ?? link.textContent;
  });

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
      fire: { uk: "Пожежна тривога (Fire Drill)", en: "Fire Drill (SOLAS III/19)" },
      abandon_ship: { uk: "Шлюпкова тривога (Abandon Ship)", en: "Abandon Ship Drill" },
      enclosed_space: { uk: "Рятування з замкненого простору", en: "Enclosed Space Rescue" },
      oil_spill: { uk: "Аварійний розлив нафти (SOPEP)", en: "Oil Spill Response (SOPEP)" }
    };
    Array.from(drillSel.options).forEach((opt) => {
      opt.text = drillOpts[opt.value]?.[lang] || opt.text;
    });
    drillSel.value = cur;
  }

  // Update Form Input Labels
  const updateLabelText = (inputSelector, text) => {
    const input = $(inputSelector);
    const label = input?.closest("label");
    if (!label) return;
    for (const node of label.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim().length > 0) {
        node.nodeValue = text + "\n                  ";
        return;
      }
    }
  };

  const demoLabel = document.querySelector('label[for="demo-scenario"]');
  if (demoLabel) {
    for (const node of demoLabel.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim().length > 0) {
        node.nodeValue = t.scenarioLabel + "\n                    ";
        break;
      }
    }
  }

  updateLabelText("#age", t.ageLabel);
  updateLabelText("#sex", t.sexLabel);
  updateLabelText("#residence", t.residenceLabel);
  updateLabelText("#chronic", t.chronicLabel);
  updateLabelText("#role", t.roleLabel);
  updateLabelText("#hours", t.hoursLabel);
  updateLabelText("#night", t.nightLabel);
  updateLabelText("#watch-system", t.watchLabel);
  updateLabelText("#vessel-type", t.vesselLabel);
  updateLabelText("#ppe", t.ppeLabel);
  updateLabelText("#previous", t.previousLabel);
  updateLabelText("#smoking", t.smokingLabel);
  updateLabelText("#alcohol", t.alcoholLabel);

  const drillSoundBtn = $("#drill-sound-btn");
  if (drillSoundBtn) {
    if (drillSoundBtn.classList.contains("sounding")) {
      drillSoundBtn.textContent = t.drillSoundStop;
    } else {
      drillSoundBtn.textContent = t.drillSoundPlay;
    }
  }

  // Profile File Actions
  const expBtn = $("#export-profile-btn");
  if (expBtn) expBtn.textContent = t.exportProfileBtn;
  const impLabel = document.querySelector('label[for="import-profile-input"]');
  if (impLabel) impLabel.innerHTML = `${escapeHtml(t.importProfileBtn)}<input id="import-profile-input" type="file" accept=".json" class="sr-only" />`;
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
  if (formFooterP) formFooterP.textContent = t.formFooterNote;
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
  if (tabRadar) tabRadar.textContent = t.radarTab;
  const tabWhatif = $("#tab-btn-whatif");
  if (tabWhatif) tabWhatif.textContent = t.whatifTab;
  const tabChecklist = $("#tab-btn-checklist");
  if (tabChecklist) tabChecklist.textContent = t.checklistTab;
  const tabMethod = $("#tab-btn-method");
  if (tabMethod) tabMethod.textContent = t.methodTab;

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

  // BRM Watch Team Synergy
  const brmKicker = document.querySelector(".brm-kicker"); if (brmKicker) brmKicker.textContent = t.brmKicker;
  const brmH3 = document.querySelector("#brm-card-title"); if (brmH3) brmH3.textContent = t.brmTitle;
  const brmScoreSub = document.querySelector("#brm-score-sub-label"); if (brmScoreSub) brmScoreSub.textContent = t.brmScoreSubLabel;
  const brmLookoutSpan = document.querySelector("#brm-lookout-text"); if (brmLookoutSpan) brmLookoutSpan.textContent = t.brmLookoutText;
  const brmPilotSpan = document.querySelector("#brm-pilot-text"); if (brmPilotSpan) brmPilotSpan.textContent = t.brmPilotText;
  const brmFindingsTitle = document.querySelector("#brm-findings-title"); if (brmFindingsTitle) brmFindingsTitle.textContent = t.brmFindingsTitle;
  const brmRecsTitle = document.querySelector("#brm-recs-title"); if (brmRecsTitle) brmRecsTitle.textContent = t.brmRecsTitle;

  // MLC 2006 Rest Hours Validator
  const mlcKicker = document.querySelector(".mlc-val-kicker"); if (mlcKicker) mlcKicker.textContent = t.mlcValKicker;
  const mlcTitle = document.querySelector("#mlc-val-title"); if (mlcTitle) mlcTitle.textContent = t.mlcValTitle;
  const mlcTotalSub = document.querySelector("#mlc-val-total-sub-label"); if (mlcTotalSub) mlcTotalSub.textContent = t.mlcValTotalSub;
  const mlcDesc = document.querySelector("#mlc-val-desc"); if (mlcDesc) mlcDesc.textContent = t.mlcValDesc;
  const mlcPresetsLbl = document.querySelector("#mlc-presets-label"); if (mlcPresetsLbl) mlcPresetsLbl.textContent = t.mlcPresetsLabel;
  const mlc48 = document.querySelector("#mlc-preset-48"); if (mlc48) mlc48.textContent = t.mlcPreset48;
  const mlc66 = document.querySelector("#mlc-preset-66"); if (mlc66) mlc66.textContent = t.mlcPreset66;
  const mlcOt = document.querySelector("#mlc-preset-overtime"); if (mlcOt) mlcOt.textContent = t.mlcPresetOvertime;
  const mlcHint = document.querySelector("#mlc-timeline-hint"); if (mlcHint) mlcHint.textContent = t.mlcTimelineHint;
  const mlcViolH4 = document.querySelector("#mlc-violations-title"); if (mlcViolH4) mlcViolH4.textContent = t.mlcViolationsTitle;

  const rDaily = document.querySelector("#mlc-rule-daily");
  if (rDaily) {
    const s = rDaily.querySelector("strong"); if (s) s.textContent = t.mlcRuleDailyTitle;
    const sm = rDaily.querySelector("small"); if (sm) sm.textContent = t.mlcRuleDailySub;
  }
  const rSplits = document.querySelector("#mlc-rule-splits");
  if (rSplits) {
    const s = rSplits.querySelector("strong"); if (s) s.textContent = t.mlcRuleSplitsTitle;
    const sm = rSplits.querySelector("small"); if (sm) sm.textContent = t.mlcRuleSplitsSub;
  }
  const rBlock = document.querySelector("#mlc-rule-blocklen");
  if (rBlock) {
    const s = rBlock.querySelector("strong"); if (s) s.textContent = t.mlcRuleBlocklenTitle;
    const sm = rBlock.querySelector("small"); if (sm) sm.textContent = t.mlcRuleBlocklenSub;
  }
  const rInterval = document.querySelector("#mlc-rule-interval");
  if (rInterval) {
    const s = rInterval.querySelector("strong"); if (s) s.textContent = t.mlcRuleIntervalTitle;
    const sm = rInterval.querySelector("small"); if (sm) sm.textContent = t.mlcRuleIntervalSub;
  }
  const rWeekly = document.querySelector("#mlc-rule-weekly");
  if (rWeekly) {
    const s = rWeekly.querySelector("strong"); if (s) s.textContent = t.mlcRuleWeeklyTitle;
    const sm = rWeekly.querySelector("small"); if (sm) sm.textContent = t.mlcRuleWeeklySub;
  }
  renderMlcRestValidator();

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
  const glossaryList = document.querySelector(".glossary-list");
  if (glossaryList && glossaryByLang[lang]) {
    glossaryList.innerHTML = glossaryByLang[lang].map((item) => `
      <div><dt>${escapeHtml(item.term)}</dt><dd>${escapeHtml(item.def)}</dd></div>
    `).join("");
  }

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
      const factorsDiv = card.querySelector(".case-factors");
      if (factorsDiv && Array.isArray(cData.factors)) {
        factorsDiv.innerHTML = cData.factors.map((f) => `<span>${escapeHtml(f)}</span>`).join("");
      }
    }
    if (btn) btn.textContent = t.caseLoadBtn;
    const link = card.querySelector(".case-link"); if (link) link.textContent = t.caseLink;
  });

  // GISIS & ECFA Section
  const gEye = $("#gisis-eyebrow"); if (gEye) gEye.textContent = t.gisisEyebrow;
  const gTitle = $("#gisis-main-title"); if (gTitle) gTitle.textContent = t.gisisMainTitle;
  const gLead = $("#gisis-main-lead"); if (gLead) gLead.textContent = t.gisisMainLead;
  const gCalcKicker = $("#gisis-calc-kicker"); if (gCalcKicker) gCalcKicker.textContent = t.gisisCalcKicker;
  const gCalcTitle = $("#gisis-calc-title"); if (gCalcTitle) gCalcTitle.textContent = t.gisisCalcTitle;
  const gCalcIntro = $("#gisis-calc-intro"); if (gCalcIntro) gCalcIntro.textContent = t.gisisCalcIntro;
  const gMitTitle = $("#gisis-mitigation-title"); if (gMitTitle) gMitTitle.textContent = t.gisisMitigationTitle;
  const ecfaKickerEl = $("#ecfa-kicker"); if (ecfaKickerEl) ecfaKickerEl.textContent = t.ecfaKicker;
  const ecfaTitleEl = $("#ecfa-title"); if (ecfaTitleEl) ecfaTitleEl.textContent = t.ecfaTitle;
  const ecfaIntroEl = $("#ecfa-intro"); if (ecfaIntroEl) ecfaIntroEl.textContent = t.ecfaIntro;
  const gExpKicker = $("#gisis-export-kicker"); if (gExpKicker) gExpKicker.textContent = t.gisisExportKicker;
  const gExpTitle = $("#gisis-export-title"); if (gExpTitle) gExpTitle.textContent = t.gisisExportTitle;
  const gExpIntro = $("#gisis-export-intro"); if (gExpIntro) gExpIntro.textContent = t.gisisExportIntro;
  const dlGisisBtn = $("#download-gisis-json-btn"); if (dlGisisBtn) dlGisisBtn.textContent = t.downloadGisisJsonBtn;
  const cpPyBtn = $("#copy-python-script-btn"); if (cpPyBtn) cpPyBtn.textContent = t.copyPythonScriptBtn;
  const tgJsonBtn = $("#toggle-gisis-json-preview-btn"); if (tgJsonBtn) tgJsonBtn.textContent = t.toggleGisisJsonPreviewBtn;

  renderPortBasinRisk();
  renderEcfaDiagram(currentEcfaFilter);
  if (currentSelectedEcfaNode) selectEcfaNode(currentSelectedEcfaNode);

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
  }
  if (sumDivs[2]) {
    sumDivs[2].querySelector("span").textContent = t.statFatalSpan;
  }
  const sparseChip = document.querySelector("#sparse-notice-box .sparse-chip");
  if (sparseChip) sparseChip.textContent = t.sparseWarning;

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
  const contextGrid = document.querySelector(".official-context .context-grid");
  if (contextGrid && officialContextByLang[lang]) {
    contextGrid.innerHTML = officialContextByLang[lang].map((item) => `
      <article>
        <strong>${escapeHtml(item.stat)}</strong>
        <span>${escapeHtml(item.span)}</span>
        <p>${escapeHtml(item.text)}</p>
        <a href="${escapeHtml(item.href)}" target="_blank" rel="noreferrer">${escapeHtml(item.linkText)}</a>
      </article>
    `).join("");
  }

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
  if (fNavs[2]) fNavs[2].textContent = "GISIS & ECFA";
  if (fNavs[3]) fNavs[3].textContent = t.navStats;
  if (fNavs[4]) fNavs[4].textContent = t.navMethod;
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

function applyViewMode(search = window.location.search) {
  const mode = resolveViewMode(search);
  document.documentElement.dataset.view = mode;

  const t = I18N[currentLang];
  const eyebrow = document.querySelector(".hero-copy .eyebrow");
  const title = document.querySelector(".hero-copy h1");
  const lede = document.querySelector(".hero-lede");
  const primary = $("#start-guided-review-btn");
  const sources = document.querySelector(".assignment-sources-link");

  if (mode === "tools") {
    if (eyebrow) eyebrow.textContent = t.heroEyebrow;
    if (title) title.textContent = t.heroTitle;
    if (lede) lede.textContent = t.heroLede;
    if (primary) {
      primary.href = "#assessment";
      primary.textContent = t.heroActionStart;
    }
    if (sources) {
      sources.href = "#methodology";
      sources.textContent = t.heroActionMethod;
    }
  } else {
    if (eyebrow) eyebrow.textContent = "Практична робота · KP-965";
    if (title) title.textContent = "Чому сталася аварія і як її запобігти";
    if (lede) lede.textContent = "Пройдіть п’ять коротких кроків на прикладі катера KP-965: від фактів аварії до зрозумілого розрахунку ризику, превентивних заходів і готового висновку для практичної роботи.";
    if (primary) {
      primary.href = "#step-1";
      primary.textContent = "Почати розбір";
    }
    if (sources) {
      sources.href = "#step-5";
      sources.textContent = "Висновок і докази ↗";
    }
  }

  return mode;
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

  const injuryCi = calculateWilsonInterval(severity.injury || 0, total);
  const fatalCi = calculateWilsonInterval(severity.fatal || 0, total);
  const formatPct = (val) => `${(val * 100).toFixed(1)}%`;

  const injuryCiEl = $("#injury-ci");
  if (injuryCiEl) {
    injuryCiEl.textContent = total
      ? `${t.ciPrefix} [${formatPct(injuryCi.lower)} – ${formatPct(injuryCi.upper)}]`
      : `${t.ciPrefix} [—]`;
  }
  const fatalCiEl = $("#fatal-ci");
  if (fatalCiEl) {
    fatalCiEl.textContent = total
      ? `${t.ciPrefix} [${formatPct(fatalCi.lower)} – ${formatPct(fatalCi.upper)}]`
      : `${t.ciPrefix} [—]`;
  }

  const sparseNotice = $("#sparse-notice-box");
  if (sparseNotice) {
    sparseNotice.hidden = !(total > 0 && total < 30);
    const chip = sparseNotice.querySelector(".sparse-chip");
    if (chip) chip.textContent = t.sparseWarning;
  }

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

applyViewMode();

// Assignment-first startup: optional dashboard failures must not blank GISIS/ECFA.
initializeModule("assignment", initGisisEcfaModule, $("#ecfa-diagram-wrap"));

initializeModule("risk-preview", () => {
  const initialInput = currentInput();
  renderRisk(calculateRisk(initialInput), initialInput, "Користувацький профіль", true);
}, $("#result-panel"));

initializeModule("incident-data", loadIncidents, $("#statistics"));

if ("serviceWorker" in navigator && (location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname))) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).then((reg) => {
      reg.update().catch(() => {});
    }).catch(() => {});
  });
}
