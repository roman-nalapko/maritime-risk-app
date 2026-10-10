import { calculateRisk, evaluateMlcCompliance, generateWhatIfScenarios, generateChecklist } from "./model.js";

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
  passenger: "Пасажирське", fishing: "Риболовне", service: "Службове",
  service_offshore: "Службове / офшорне", recreational: "Прогулянкове",
  other: "Інше", unknown: "Тип не визначено"
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
    profile: { age: 20, sex: "male", residence: "city", chronic: false, role: "cadet", hours: 1200, night: 15, ppe: true, previous: false, smoking: false, alcohol: false }
  },
  engine: {
    label: "Вигаданий сценарій · механік",
    profile: { age: 38, sex: "male", residence: "city", chronic: false, role: "engine", hours: 2600, night: 45, ppe: true, previous: true, smoking: false, alcohol: false }
  },
  deck: {
    label: "Вигаданий сценарій · палубна команда",
    profile: { age: 45, sex: "female", residence: "village", chronic: false, role: "deck", hours: 2800, night: 35, ppe: false, previous: false, smoking: false, alcohol: false }
  }
};

// Read all form fields directly from form.elements.
// FormData omits unchecked checkboxes, so we read them explicitly via CHECKBOX_FIELDS.
function currentInput() {
  const el = form.elements;
  return {
    age:       el.namedItem("age").value,
    sex:       el.namedItem("sex").value,
    residence: el.namedItem("residence").value,
    role:      el.namedItem("role").value,
    hours:     el.namedItem("hours").value,
    night:     el.namedItem("night").value,
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

// isInitial=true: first automatic render on page load before the user interacts
function renderRisk(result, input, scenarioName = activeScenario, isInitial = false) {
  const resultPanel = $("#result-panel");
  resultPanel.dataset.initial = isInitial ? "true" : "false";

  $("#method-badge").textContent = `Реєстр ${result.registryId.replace("SR-UA-COEFFICIENTS-", "")}`;
  $("#risk-value").textContent = `≈ ${asIndex(result.total)}`;
  $("#risk-ratio").textContent = "Не є ймовірністю травми або загибелі";
  $("#risk-badge span").textContent = result.category.label;
  $("#risk-badge").dataset.category = result.category.key;
  $("#risk-meter").style.width = `${result.category.meter}%`;
  $("#result-announcement").textContent = isInitial ? "" :
    `Результат оновлено. Демонстраційний індекс ${asIndex(result.total)}. Категорія ${result.category.label}. Модель попередня та невалідована.`;
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

  // Factor breakdown
  const labels = { health: "Вік і здоров'я", occupation: "Професійна експозиція", lifestyle: "Спосіб життя" };
  const sum = Object.values(result.components).reduce((total, value) => total + value, 0) || 1;
  $("#breakdown-list").innerHTML = Object.entries(result.components).map(([key, value]) => {
    const share = value / sum;
    return `<div class="factor"><div class="factor-heading"><span>${escapeHtml(labels[key])}</span><strong>${asPercent(share, 0)} внеску · індекс ≈ ${asIndex(value)}</strong></div><div class="factor-bar"><i style="width:${Math.max(2, share * 100)}%"></i></div></div>`;
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
            <small>Індекс після зміни: ≈ ${asIndex(sc.simulatedTotal)}</small>
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
window.addEventListener("beforeprint", () => {
  printDetailsState = [...document.querySelectorAll("#result-panel details")].map((details) => details.open);
  document.querySelectorAll("#result-panel details").forEach((details) => { details.open = true; });
});
window.addEventListener("afterprint", () => {
  document.querySelectorAll("#result-panel details").forEach((details, index) => { details.open = printDetailsState[index]; });
});

$("#details-toggle").addEventListener("click", (event) => {
  const list = $("#breakdown-list");
  const hidden = list.hidden;
  list.hidden = !hidden;
  event.currentTarget.setAttribute("aria-expanded", String(hidden));
  event.currentTarget.textContent = hidden ? "Сховати деталі" : "Показати деталі";
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
