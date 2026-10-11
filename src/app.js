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
  compareProfiles
} from "./model.js";

const $ = (selector) => document.querySelector(selector);
const form = $("#risk-form");

// Declarative list of checkbox field names — adding a new checkbox here is enough
const CHECKBOX_FIELDS = ["chronic", "ppe", "previous", "smoking", "alcohol"];

const roleLabels = {
  deck: "Палубна команда", engine: "Машинна команда", officer: "Командний склад",
  port: "Портові працівники", cadet: "Курсанти", diver: "Водолази",
  fishing: "Екіпаж риболовного судна", other_crew: "Інший екіпаж",
  non_crew: "Не члени екіпажу", unknown: "Роль не визначена"
};
const vesselLabels = {
  cargo: "Вантажне", cargo_dry: "Суховантажне", tanker: "Танкер",
  container: "Контейнеровоз", bulker: "Балкер", tug: "Буксир",
  passenger: "Пасажирське", fishing: "Риболовне", service: "Службове",
  service_offshore: "Службове / офшорне", recreational: "Прогулянкове",
  other: "Інше", unknown: "Тип не визначено"
};
const watchLabels = {
  "4on8off": "3-вахтовий (4/8 — стандарт)",
  "6on6off": "2-вахтовий (6/6 — ризик втоми)",
  daywork: "Денна зміна (Day-work)"
};
const eventLabels = {
  fall: "Падіння", machinery: "Механізми", mooring: "Швартування", fire: "Пожежа",
  collision: "Зіткнення", overboard: "За бортом", exposure: "Вплив речовин",
  personal_accident: "Нещасний випадок з людиною", equipment_damage: "Пошкодження обладнання",
  grounding_stranding: "Посадка на мілину", loss_of_control: "Втрата керування",
  capsizing_listing: "Перекидання / крен", contact: "Контакт",
  flooding_foundering: "Затоплення / загибель судна", hull_failure: "Пошкодження корпусу",
  fire_explosion: "Пожежа / вибух", heavy_weather_damage: "Пошкодження через негоду",
  vessel_missing: "Зникнення судна", unknown: "Тип не визначено"
};
const severityLabels = { none: "Без травм", injury: "Травмування", fatal: "Летальний наслідок" };
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
    label: "Вигаданий сценарій · курсант",
    profile: { age: 20, sex: "male", residence: "city", chronic: false, role: "cadet", hours: 1200, night: 15, watchSystem: "4on8off", vesselType: "container", ppe: true, previous: false, smoking: false, alcohol: false }
  },
  engine: {
    label: "Вигаданий сценарій · механік",
    profile: { age: 38, sex: "male", residence: "city", chronic: false, role: "engine", hours: 2600, night: 45, watchSystem: "6on6off", vesselType: "tanker", ppe: true, previous: true, smoking: false, alcohol: false }
  },
  deck: {
    label: "Вигаданий сценарій · палубна команда",
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
  return new Intl.NumberFormat("uk-UA", { style: "percent", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
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
  return `${coefficient.toLocaleString("uk-UA", { maximumFractionDigits: 2 })} × 10${superscript}`;
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
  if (!list || list.length === 0) {
    bars.innerHTML = `<p class="what-if-empty">Для обраного профілю чутливість базових параметрів знаходиться в межах мінімальної похибки.</p>`;
    if (leadBadge) leadBadge.textContent = "Мінімальний вплив";
    return;
  }
  if (leadBadge) leadBadge.textContent = `Провідний фактор: ${list[0].name} (${list[0].weightPercent}%)`;

  bars.innerHTML = list.map((item) => `
    <div class="tornado-row">
      <div class="tornado-info">
        <div class="tornado-title">
          <strong>${escapeHtml(item.name)}</strong>
          <span class="tornado-cat">${escapeHtml(item.category)}</span>
        </div>
        <div class="tornado-meta">
          <small>Поточний: ${escapeHtml(item.currentSetting)} → Оптимальний: ${escapeHtml(item.optimalSetting)}</small>
        </div>
      </div>
      <div class="tornado-bar-wrap">
        <div class="tornado-track">
          <div class="tornado-fill ${item.id === "ppe" && !input.ppe ? "danger" : ""}" style="width: ${Math.max(8, item.weightPercent)}%"></div>
        </div>
        <strong class="tornado-pct">${item.weightPercent}%</strong>
      </div>
    </div>
  `).join("");
}

function renderFsaMatrix(result, input) {
  const grid = $("#fsa-matrix-grid");
  const badge = $("#fsa-matrix-badge");
  const title = $("#fsa-region-title");
  const action = $("#fsa-region-action");
  if (!grid) return;

  const fsa = evaluateFsaMatrix(result, input);
  if (badge) {
    badge.textContent = `RI = ${fsa.ri} · ${fsa.regionLabel.split(" (")[0]}`;
    badge.className = `fsa-matrix-badge fsa-${fsa.region}`;
  }
  if (title) title.textContent = `Індекс ризику RI = ${fsa.ri} (${fsa.regionLabel})`;
  if (action) action.textContent = fsa.regionAction;

  const rows = [
    { si: 4, label: "SI-4: Катастрофічні" },
    { si: 3, label: "SI-3: Важкі" },
    { si: 2, label: "SI-2: Значні" },
    { si: 1, label: "SI-1: Незначні" }
  ];
  const cols = [
    { fi: 1, label: "FI-1 (<10⁻⁴)" },
    { fi: 2, label: "FI-2 (0.01%)" },
    { fi: 3, label: "FI-3 (0.1%–1%)" },
    { fi: 4, label: "FI-4 (≥1%)" }
  ];

  let html = `<div class="fsa-cell fsa-header-cell">Наслідки ↓ / Частота →</div>`;
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
          ${isCurrent ? `<span class="current-marker">● ВИ</span>` : ""}
        </div>
      `;
    });
  });

  grid.innerHTML = html;
}

function renderCircadian(input) {
  const circ = calculateCircadianFatigue(input);
  const bars = $("#circadian-bars");
  const kssNum = $("#kss-number");
  const kssLbl = $("#kss-label");
  const kssPill = $("#kss-pill");
  const sleepDebtStat = $("#sleep-debt-stat");
  const nadirStat = $("#nadir-time-stat");
  const fatigueStat = $("#fatigue-status-stat");
  const recsList = $("#circadian-recs");

  if (kssNum) kssNum.textContent = `KSS ${circ.kssScore}`;
  if (kssLbl) kssLbl.textContent = circ.kssLabel;
  if (kssPill) {
    kssPill.dataset.level = circ.kssScore >= 7 ? "danger" : (circ.kssScore >= 5 ? "warning" : "optimal");
  }
  if (sleepDebtStat) sleepDebtStat.textContent = `${circ.sleepDebtHours} год/тижд`;
  if (nadirStat) nadirStat.textContent = circ.peakVulnerabilityTime;
  if (fatigueStat) {
    fatigueStat.textContent = circ.kssScore >= 7 ? "Критичний" : (circ.kssScore >= 5 ? "Підвищений" : "Контрольовано");
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
      return `<div class="${barClass}" style="--bar-h:${heightPercent}%" title="${String(p.hour).padStart(2, "0")}:00 · Бадьорість ${p.alertness}%${p.isWatchTime ? " (Вахта)" : ""}"></div>`;
    }).join("");
  }

  if (recsList) {
    if (circ.recommendations.length > 0) {
      recsList.innerHTML = circ.recommendations.map((r) => `<li>${escapeHtml(r)}</li>`).join("");
    } else {
      recsList.innerHTML = `<li>Циркадний профіль збалансований: сон та період відновлення відповідають нормі.</li>`;
    }
  }
}

function renderWeatherRisk(input) {
  const beaufort = Number($("#beaufort-slider")?.value ?? 3);
  const polarZone = Boolean($("#polar-zone-toggle")?.checked);
  const engineHeat = Boolean($("#engine-heat-toggle")?.checked);

  const weather = calculateOperationalWeatherRisk(input, { beaufort, polarZone, engineHeat });

  const valDisplay = $("#beaufort-val-display");
  if (valDisplay) valDisplay.textContent = `${weather.beaufort} балів`;

  const seaBadge = $("#sea-state-badge");
  if (seaBadge) seaBadge.textContent = weather.seaStateLabel;

  const msiDisplay = $("#msi-display");
  if (msiDisplay) msiDisplay.textContent = `${weather.msiPercent}%`;

  const slipDisplay = $("#slip-display");
  if (slipDisplay) slipDisplay.textContent = `× ${weather.slipMultiplier.toFixed(1)}`;

  const warnBox = $("#weather-warnings");
  if (warnBox) {
    if (weather.warnings.length > 0) {
      warnBox.innerHTML = weather.warnings.map((w) => `
        <div class="weather-alert weather-${escapeHtml(w.severity)}">
          <strong>${escapeHtml(w.title)}</strong>
          <p>${escapeHtml(w.advice)}</p>
        </div>
      `).join("");
    } else {
      warnBox.innerHTML = `<div class="weather-alert weather-calm"><strong>Сприятливі погодні умови</strong><p>Стандартні процедури безпеки відповідно до СУБ судна.</p></div>`;
    }
  }
}

function renderPscSire(input) {
  const psc = evaluatePscSireReadiness(input);
  const scoreDisp = $("#psc-score-display");
  const statusLabel = $("#psc-status-label");
  const defBox = $("#psc-deficiencies-list");
  const capBox = $("#psc-cap-box");
  const capList = $("#psc-cap-list");

  if (scoreDisp) scoreDisp.textContent = psc.readinessScore;
  if (statusLabel) {
    statusLabel.textContent = psc.statusLabel;
    statusLabel.dataset.score = psc.readinessScore < 65 ? "critical" : (psc.readinessScore < 85 ? "warning" : "optimal");
  }

  if (defBox) {
    if (psc.deficiencies.length > 0) {
      defBox.innerHTML = psc.deficiencies.map((d) => `
        <div class="psc-deficiency psc-${escapeHtml(d.severity)}">
          <div class="psc-def-top">
            <span class="psc-code">Code ${escapeHtml(d.code)}</span>
            <small>${escapeHtml(d.convention)}</small>
          </div>
          <p>${escapeHtml(d.description)}</p>
        </div>
      `).join("");
    } else {
      defBox.innerHTML = `<p class="psc-clean">Невідповідностей за MLC 2006 та STCW A-VIII/1 не виявлено. Профіль відповідає вимогам конвенцій.</p>`;
    }
  }

  if (capBox && capList) {
    if (psc.correctiveActions.length > 0) {
      capBox.hidden = false;
      capList.innerHTML = psc.correctiveActions.map((action) => `<li>${escapeHtml(action)}</li>`).join("");
    } else {
      capBox.hidden = true;
    }
  }
}

function renderEmergencyDrill(input) {
  const drillSelect = $("#drill-type-select");
  const drillType = drillSelect?.value || "fire";
  const drill = simulateEmergencyDrillFatigue(input, drillType);

  const delayDisplay = $("#drill-delay-display");
  const errorDisplay = $("#drill-error-display");
  const readinessDisplay = $("#drill-readiness-display");
  const adviceText = $("#drill-advice-text");

  if (delayDisplay) delayDisplay.textContent = `+${drill.reactionDelaySeconds} с`;
  if (errorDisplay) errorDisplay.textContent = `${drill.errorRatePercent}%`;
  if (readinessDisplay) {
    readinessDisplay.className = `readiness-${drill.readiness}`;
    readinessDisplay.textContent = drill.readiness === "optimal" ? "Оптимальний" : (drill.readiness === "degraded" ? "Знижений" : "Критичний");
  }
  if (adviceText) adviceText.textContent = drill.recommendation;
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
    badge.textContent = isLower ? `Δ ${comp.deltaPercent}% ризику` : "Базовий рівень";
    badge.className = isLower ? "compare-badge opt-better" : "compare-badge";
  }
  if (valA) valA.textContent = `≈ ${asDisplayPercent(comp.profileA.total)}`;
  if (catA) catA.textContent = comp.profileA.category;
  if (valB) valB.textContent = `≈ ${asDisplayPercent(comp.profileB.total)}`;
  if (catB) catB.textContent = comp.profileB.category;
  if (note) {
    note.textContent = comp.deltaTotal < 0
      ? `Оптимізація режиму вахт та обов'язкові ЗІЗ зменшують індекс ризику на ${Math.abs(comp.deltaPercent)}%.`
      : "Поточний профіль уже максимально наближений до рекомендованого стандарту безпеки.";
  }
}

// isInitial=true: first automatic render on page load before the user interacts
function renderRisk(result, input, scenarioName = activeScenario, isInitial = false) {
  const resultPanel = $("#result-panel");
  resultPanel.dataset.initial = isInitial ? "true" : "false";

  $("#method-badge").textContent = `Реєстр ${result.registryId.replace("SR-UA-COEFFICIENTS-", "")}`;
  $("#risk-value").textContent = `≈ ${asDisplayPercent(result.total)}`;
  const sci = $("#scientific-notation");
  if (sci) sci.textContent = `інженерний показник: ${asIndex(result.total)}`;
  $("#risk-ratio").textContent = "Не є ймовірністю травми або загибелі";
  $("#risk-badge span").textContent = result.category.label;
  $("#risk-badge").dataset.category = result.category.key;
  $("#risk-meter").style.width = `${result.category.meter}%`;
  $("#result-announcement").textContent = isInitial ? "" :
    `Результат оновлено. Оцінка ризику ${asDisplayPercent(result.total)}. Категорія ${result.category.label}. Модель попередня та невалідована.`;
  $("#model-status").textContent = result.modelStatus === "provisional" ? "Попередня · невалідована" : result.modelStatus;
  $("#model-version").textContent = result.modelId;
  $("#uncertainty-status").textContent = `Не оцінена. ${result.uncertainty.explanation}`;
  $("#scenario-name").textContent = scenarioName;
  const now = new Date();
  $("#report-date").dateTime = now.toISOString();
  $("#report-date").textContent = new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium", timeStyle: "short" }).format(now);

  const yesNo = (value) => value ? "так" : "ні";
  const profileRows = [
    ["Вік", `${Number(input.age)} років`],
    ["Стать", input.sex === "male" ? "Чоловіча" : "Жіноча"],
    ["Місце проживання", input.residence === "city" ? "Місто" : "Сільська місцевість"],
    ["Професійна група", roleLabels[input.role] ?? input.role],
    ["Робоча експозиція", `${Number(input.hours).toLocaleString("uk-UA")} год/рік`],
    ["Нічні зміни", `${Number(input.night)}%`],
    ["Розклад вахт", watchLabels[input.watchSystem] ?? input.watchSystem ?? "3-вахтовий (4/8)"],
    ["Тип судна / флот", vesselLabels[input.vesselType] ?? input.vesselType ?? "Контейнеровоз"],
    ["ЗІЗ", yesNo(input.ppe)],
    ["Додаткові маркери", [
      input.chronic   && "хронічний стан",
      input.previous  && "попередній інцидент",
      input.smoking   && "куріння",
      input.alcohol   && "ризикове вживання алкоголю"
    ].filter(Boolean).join(", ") || "не вибрано"]
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
      $("#mlc-findings-list").innerHTML = mlc.findings.map((f) => `
        <li class="mlc-finding mlc-${escapeHtml(f.severity)}">
          <div><strong>${escapeHtml(f.topic)}</strong> <small>· ${escapeHtml(f.rule)}</small></div>
          <p>${escapeHtml(f.message)}</p>
        </li>
      `).join("");
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
      bmHoursStat.textContent = `${hoursNum.toLocaleString("uk-UA")} год (норма флоту)`;
    } else if (hoursDelta > 0) {
      bmHoursStat.textContent = `${hoursNum.toLocaleString("uk-UA")} год (+${hoursDelta}% до норми)`;
    } else {
      bmHoursStat.textContent = `${hoursNum.toLocaleString("uk-UA")} год (${hoursDelta}% від норми)`;
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
      bmNightStat.textContent = `${nightNum}% (типова вахта 4/8)`;
    } else if (nightDelta > 0) {
      bmNightStat.textContent = `${nightNum}% (+${nightDelta}% нічних)`;
    } else {
      bmNightStat.textContent = `${nightNum}% (${nightDelta}% нічних)`;
    }
  }

  // Factor breakdown
  const labels = { health: "Вік і здоров'я", occupation: "Професійна експозиція", lifestyle: "Спосіб життя" };
  const sum = Object.values(result.components).reduce((total, value) => total + value, 0) || 1;
  $("#breakdown-list").innerHTML = Object.entries(result.components).map(([key, value]) => {
    const share = value / sum;
    return `<div class="factor"><div class="factor-heading"><span>${escapeHtml(labels[key])}</span><strong>${asPercent(share, 0)} внеску (${asDisplayPercent(value)})</strong></div><div class="factor-bar"><i style="width:${Math.max(2, share * 100)}%"></i></div></div>`;
  }).join("");

  // What-If Scenarios
  const whatIfs = generateWhatIfScenarios(input);
  const whatIfGrid = $("#what-if-grid");
  if (whatIfGrid) {
    if (whatIfs.length > 0) {
      whatIfGrid.innerHTML = whatIfs.map((sc) => `
        <div class="what-if-card">
          <div class="what-if-top">
            <strong>${escapeHtml(sc.title)}</strong>
            <span class="what-if-delta">-${escapeHtml(sc.deltaPercent)}% ризику</span>
          </div>
          <p>${escapeHtml(sc.description)}</p>
          <div class="what-if-footer">
            <small>Оцінка після зміни: ≈ ${asDisplayPercent(sc.simulatedTotal)}</small>
            <button type="button" class="what-if-apply-btn" data-whatif="${escapeHtml(sc.id)}">Змоделювати ↗</button>
          </div>
        </div>
      `).join("");
      whatIfGrid.querySelectorAll(".what-if-apply-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.whatif;
          if (id === "ppe") $("#ppe").checked = true;
          if (id === "night") $("#night").value = Math.round(Number($("#night").value) / 2);
          if (id === "lifestyle") { $("#smoking").checked = false; $("#alcohol").checked = false; }
          if (id === "hours") $("#hours").value = 2000;
          if (id === "watch") $("#watch-system").value = "4on8off";
          const updated = currentInput();
          renderRisk(calculateRisk(updated), updated, "Моделювання: " + (btn.closest(".what-if-card").querySelector("strong")?.textContent || id), false);
        });
      });
    } else {
      whatIfGrid.innerHTML = `<p class="what-if-empty">Для поточного профілю оптимізовані ключові керовані параметри (використовуються ЗІЗ, нормальний графік відпочинку).</p>`;
    }
  }

  // Component evidence
  const statusLabels = { disputed: "Спірне джерело", synthetic_demo: "Синтетичне припущення", approved: "Перевірено" };
  $("#component-evidence").innerHTML = Object.entries(result.componentEvidence).map(([key, records]) => `
    <section class="evidence-component">
      <h4>${escapeHtml(labels[key])}</h4>
      <ul>${records.map((record) => `<li>
        <div><code>${escapeHtml(record.id)}</code><span class="evidence-status" data-status="${escapeHtml(record.status)}">${escapeHtml(statusLabels[record.status] ?? record.status)}</span></div>
        <p>${escapeHtml(record.source)} · ${escapeHtml(record.sourceVersion)}</p>
        <small>Одиниця: ${escapeHtml(record.unit)}; популяція: ${escapeHtml(record.population)}; період: ${escapeHtml(record.period)}.</small>
      </li>`).join("")}</ul>
    </section>`).join("");

  // Recommendations
  $("#recommendation-list").innerHTML = result.recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

  // Grounded Incident Retrieval from official records
  const grounded = retrieveSimilarIncidents(input, incidents);
  const groundedFactsList = $("#grounded-facts-list");
  const groundedExplanation = $("#grounded-explanation");
  if (groundedFactsList && groundedExplanation) {
    if (grounded.facts && grounded.facts.length > 0) {
      groundedFactsList.innerHTML = grounded.facts.map((fact) => `<li>${escapeHtml(fact)}</li>`).join("");
    } else {
      groundedFactsList.innerHTML = `<li>Очікування завантаження даних або профіль не має точних збігів.</li>`;
    }
    groundedExplanation.textContent = grounded.explanation || "—";
  }

  // Actionable Safety Checklist
  const checklist = generateChecklist(input);
  const checklistList = $("#checklist-list");
  const checklistProgress = $("#checklist-progress");
  if (checklistList && checklistProgress) {
    checklistList.innerHTML = checklist.items.map((item, idx) => `
      <li class="checklist-item">
        <label class="checklist-label" for="cl-${idx}">
          <input type="checkbox" class="checklist-cb" id="cl-${idx}" />
          <span class="checklist-box" aria-hidden="true"></span>
          <span class="checklist-body">
            <span class="checklist-cat">${escapeHtml(item.category)}</span>
            <span class="checklist-text">${escapeHtml(item.label)}</span>
          </span>
        </label>
      </li>
    `).join("");

    const updateChecklistCounter = () => {
      const total = checklist.items.length;
      const checked = checklistList.querySelectorAll(".checklist-cb:checked").length;
      checklistProgress.textContent = `${checked} / ${total} виконано`;
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

  $("#formula-copy").textContent = "Формула: 1 − (1 − Rздоров'я) × (1 − Rробота) × (1 − Rспосіб життя). Значення округлено до трьох значущих цифр.";
  $("#assumption-list").innerHTML = result.assumptions.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = currentInput();
  renderRisk(calculateRisk(input), input, activeScenario, false);
  $("#result-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
});

form.addEventListener("input", () => { activeScenario = "Користувацький профіль"; });

$("#apply-scenario").addEventListener("click", () => {
  const scenario = demoScenarios[$("#demo-scenario").value];
  applyProfile(scenario.profile);
  activeScenario = scenario.label;
  renderRisk(calculateRisk(scenario.profile), scenario.profile, scenario.label, false);
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
      renderRisk(calculateRisk(updated), updated, "Імпортований файл", false);
      $("#result-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch {
      alert("Не вдалося імпортувати профіль. Перевірте формат JSON-файлу.");
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
    label: "Кейс MAIB 23/2017 (CMA CGM Vasco de Gama)",
    profile: {
      age: 34,
      sex: "male",
      residence: "city",
      chronic: false,
      role: "officer",
      hours: 2750,
      night: 70,
      watchSystem: "4on8off",
      vesselType: "container",
      ppe: true,
      previous: false,
      smoking: false,
      alcohol: false
    }
  },
  "zarga": {
    label: "Кейс MAIB 13/2017 (Танкер ЗПГ Zarga)",
    profile: {
      age: 28,
      sex: "male",
      residence: "city",
      chronic: false,
      role: "deck",
      hours: 2900,
      night: 40,
      watchSystem: "6on6off",
      vesselType: "tanker",
      ppe: false,
      previous: true,
      smoking: false,
      alcohol: false
    }
  },
  "scot-carrier": {
    label: "Кейс MAIB 18/2023 (Scot Carrier & Karin Høj)",
    profile: {
      age: 45,
      sex: "male",
      residence: "city",
      chronic: false,
      role: "officer",
      hours: 3100,
      night: 80,
      watchSystem: "6on6off",
      vesselType: "bulker",
      ppe: true,
      previous: false,
      smoking: true,
      alcohol: true
    }
  },
  "el-faro": {
    label: "Кейс NTSB/IMO (MV El Faro)",
    profile: {
      age: 53,
      sex: "male",
      residence: "city",
      chronic: false,
      role: "officer",
      hours: 2950,
      night: 45,
      watchSystem: "4on8off",
      vesselType: "container",
      ppe: true,
      previous: true,
      smoking: true,
      alcohol: false
    }
  },
  "exxon-valdez": {
    label: "Кейс NTSB/IMO (Exxon Valdez, 1989)",
    profile: {
      age: 42,
      sex: "male",
      residence: "city",
      chronic: false,
      role: "officer",
      hours: 3200,
      night: 85,
      watchSystem: "6on6off",
      vesselType: "tanker",
      ppe: true,
      previous: true,
      smoking: true,
      alcohol: true
    }
  },
  "bourbon-dolphin": {
    label: "Кейс NMA/MAIB (Bourbon Dolphin, 2007)",
    profile: {
      age: 36,
      sex: "male",
      residence: "city",
      chronic: false,
      role: "deck",
      hours: 2950,
      night: 50,
      watchSystem: "6on6off",
      vesselType: "tug",
      ppe: false,
      previous: false,
      smoking: false,
      alcohol: false
    }
  }
};

document.querySelectorAll(".case-load-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const caseKey = btn.dataset.case;
    const caseStudy = MAIB_CASE_STUDIES[caseKey];
    if (!caseStudy) return;

    applyProfile(caseStudy.profile);
    activeScenario = caseStudy.label;
    renderRisk(calculateRisk(caseStudy.profile), caseStudy.profile, caseStudy.label, false);
    switchResultTab("radar");

    $("#result-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
});

$("#details-toggle").addEventListener("click", (event) => {
  const list = $("#breakdown-list");
  const hidden = list.hidden;
  list.hidden = !hidden;
  event.currentTarget.setAttribute("aria-expanded", String(hidden));
  event.currentTarget.textContent = hidden ? "Сховати деталі" : "Показати деталі";
});

// Weather & Environmental Hazards interactive controls
$("#beaufort-slider")?.addEventListener("input", () => renderWeatherRisk(currentInput()));
$("#polar-zone-toggle")?.addEventListener("change", () => renderWeatherRisk(currentInput()));
$("#engine-heat-toggle")?.addEventListener("change", () => renderWeatherRisk(currentInput()));

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
    btn.textContent = "✓ Скопійовано!";
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
    btn.textContent = "✓ Скопійовано!";
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

// Bi-lingual Language Switcher (UA / EN IMO SMCP) — strictly in-memory client-side
let currentLang = "uk";
const I18N = {
  uk: {
    btn: "🌐 UA",
    heroTitle: "Побачте, що саме формує професійний ризик.",
    heroEyebrow: "Безпека, яку можна пояснити",
    navAssess: "Оцінювання",
    navCases: "Аварії MAIB",
    navStats: "Статистика",
    navMethod: "Методика",
    calcBtn: "Розрахувати ризик",
    radarTab: "🎯 Аналіз і радар",
    whatifTab: "⚡ What-If",
    checklistTab: "📋 Чек-лист",
    methodTab: "🔬 Методика"
  },
  en: {
    btn: "🌐 EN (IMO SMCP)",
    heroTitle: "Understand what shapes maritime occupational risk.",
    heroEyebrow: "Safety with explainable factors",
    navAssess: "Assessment",
    navCases: "Accidents (MAIB)",
    navStats: "Statistics",
    navMethod: "Methodology",
    calcBtn: "Calculate Risk Index",
    radarTab: "🎯 Analysis & Radar",
    whatifTab: "⚡ What-If Simulation",
    checklistTab: "📋 Safety Checklist",
    methodTab: "🔬 Methodology & FSA"
  }
};

$("#lang-switch-btn")?.addEventListener("click", () => {
  currentLang = currentLang === "uk" ? "en" : "uk";
  const t = I18N[currentLang];
  const langBtn = $("#lang-switch-btn");
  if (langBtn) langBtn.textContent = t.btn;

  const h1 = document.querySelector(".hero-copy h1");
  if (h1) h1.textContent = t.heroTitle;
  const eye = document.querySelector(".hero-copy .eyebrow");
  if (eye) eye.textContent = t.heroEyebrow;

  const navLinks = document.querySelectorAll("header nav a");
  if (navLinks[0]) navLinks[0].textContent = t.navAssess;
  if (navLinks[1]) navLinks[1].textContent = t.navCases;
  if (navLinks[2]) navLinks[2].textContent = t.navStats;
  if (navLinks[3]) navLinks[3].textContent = t.navMethod;

  const submitBtn = document.querySelector(".form-footer button[type='submit']");
  if (submitBtn) submitBtn.innerHTML = `${t.calcBtn} <span>→</span>`;

  const tabRadar = $("#tab-btn-radar");
  if (tabRadar) tabRadar.innerHTML = `<span class="tab-icon">🎯</span> ${t.radarTab.replace("🎯 ", "")}`;
  const tabWhatif = $("#tab-btn-whatif");
  if (tabWhatif) tabWhatif.innerHTML = `<span class="tab-icon">⚡</span> ${t.whatifTab.replace("⚡ ", "")}`;
  const tabChecklist = $("#tab-btn-checklist");
  if (tabChecklist) tabChecklist.innerHTML = `<span class="tab-icon">📋</span> ${t.checklistTab.replace("📋 ", "")}`;
  const tabMethod = $("#tab-btn-method");
  if (tabMethod) tabMethod.innerHTML = `<span class="tab-icon">🔬</span> ${t.methodTab.replace("🔬 ", "")}`;
});

// Clear existing dynamic options (keep the first static "all" option) before re-filling
// to prevent duplicates if called more than once.
function fillOptions(selector, values, labels) {
  const select = $(selector);
  while (select.options.length > 1) select.remove(1);
  [...new Set(values)].sort().forEach((value) =>
    select.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(value)}">${escapeHtml(labels[value] ?? value)}</option>`)
  );
}

function renderIncidents() {
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

  $("#event-total").textContent = total.toLocaleString("uk-UA");
  $("#injury-share").textContent = total ? asWholeShare((severity.injury || 0) / total) : "—";
  $("#fatal-share").textContent = total ? asWholeShare((severity.fatal || 0) / total) : "—";
  $("#severity-total").textContent = total.toLocaleString("uk-UA");

  const orderedEvents = Object.entries(events).sort((a, b) => b[1] - a[1]);
  $("#event-bars").innerHTML = total ? orderedEvents.map(([key, count]) => {
    const share = count / total;
    const label = escapeHtml(eventLabels[key] ?? key);
    return `<div class="event-bar"><span title="${label}">${label}</span><i style="--bar-width:${share * 100}%"></i><strong>${asWholeShare(share)}</strong></div>`;
  }).join("") : "<p>Для цього поєднання фільтрів подій немає.</p>";

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

  renderChartMeta("#event-chart-meta", filtered, "Частка типів подій серед опублікованих записів про постраждалих. Один інцидент може мати кілька таких записів. Не є індивідуальним ризиком.");
  renderChartMeta("#severity-chart-meta", filtered, "Умовний розподіл наслідків серед опублікованих записів про постраждалих. Не є ймовірністю для працівника.");
}

function renderChartMeta(selector, filtered, definition) {
  const role = $("#stats-role").value;
  const vessel = $("#stats-vessel").value;
  const years = filtered.map((item) => Number(item.year)).filter(Number.isFinite);
  const period = years.length
    ? `${Math.min(...years)}–${Math.max(...years)}`
    : `${datasetMeta?.reportingPeriod?.from ?? "—"}–${datasetMeta?.reportingPeriod?.to ?? "—"}`;
  const source = datasetMeta?.source?.publisher ?? "Невідоме джерело";
  const version = datasetMeta?.datasetVersion ?? "—";
  const dataKind = datasetMeta?.releaseMode === "aggregate" ? "Офіційні агреговані дані" : "Синтетичні DEMO-дані";
  const sampleSize = filtered.reduce((sum, item) => sum + item.count, 0);
  const roleLabel  = role   === "all" ? "усі" : (roleLabels[role]     ?? role);
  const vesselLabel = vessel === "all" ? "усі" : (vesselLabels[vessel] ?? vessel);
  $(selector).innerHTML = `
    <div><dt>Джерело · версія</dt><dd>${escapeHtml(source)} · ${escapeHtml(version)}</dd></div>
    <div><dt>Період · опубліковано</dt><dd>${escapeHtml(period)} · n = ${sampleSize.toLocaleString("uk-UA")}</dd></div>
    <div class="meta-wide"><dt>Активні фільтри</dt><dd>Роль: ${escapeHtml(roleLabel)}; судно: ${escapeHtml(vesselLabel)}</dd></div>
    <div class="meta-wide"><dt>Тип даних</dt><dd class="data-kind">${escapeHtml(dataKind)}</dd></div>
    <div class="meta-wide"><dt>Що означає показник</dt><dd class="definition">${escapeHtml(definition)}</dd></div>`;
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
