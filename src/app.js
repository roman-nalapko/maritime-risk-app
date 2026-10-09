import { calculateRisk } from "./model.js";

const $ = (selector) => document.querySelector(selector);
const form = $("#risk-form");
const roleLabels = {
  deck: "Палубна команда", engine: "Машинна команда", officer: "Командний склад",
  port: "Портові працівники", cadet: "Курсанти", diver: "Водолази"
};
const vesselLabels = {
  cargo: "Вантажне", tanker: "Танкер", passenger: "Пасажирське", fishing: "Риболовне", service: "Службове"
};
const eventLabels = {
  fall: "Падіння", machinery: "Механізми", mooring: "Швартування", fire: "Пожежа",
  collision: "Зіткнення", overboard: "За бортом", exposure: "Вплив речовин"
};
const severityLabels = { none: "Без травм", injury: "Травмування", fatal: "Летальний наслідок" };
const severityColors = { none: "#22c7b8", injury: "#5fa8ff", fatal: "#e96b61" };
let incidents = [];
let datasetMeta = null;

function readForm() {
  return Object.fromEntries(new FormData(form).entries());
}

function asPercent(value, digits = value < 0.001 ? 4 : 2) {
  return new Intl.NumberFormat("uk-UA", { style: "percent", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

function asIndex(value) {
  if (value === 0) return "0";
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const coefficient = value / (10 ** exponent);
  const superscript = String(exponent).replace("-", "⁻").replaceAll("0", "⁰").replaceAll("1", "¹").replaceAll("2", "²").replaceAll("3", "³").replaceAll("4", "⁴").replaceAll("5", "⁵").replaceAll("6", "⁶").replaceAll("7", "⁷").replaceAll("8", "⁸").replaceAll("9", "⁹");
  return `${coefficient.toLocaleString("uk-UA", { maximumFractionDigits: 2 })} × 10${superscript}`;
}

function renderRisk(result) {
  $("#method-badge").textContent = `Реєстр ${result.registryId.replace("SR-UA-COEFFICIENTS-", "")}`;
  $("#risk-value").textContent = asIndex(result.total);
  $("#risk-ratio").textContent = "Не є ймовірністю травми або загибелі";
  $("#risk-badge span").textContent = result.category.label;
  $("#risk-badge").dataset.category = result.category.key;
  $("#risk-meter").style.width = `${result.category.meter}%`;

  const labels = { health: "Вік і здоров’я", occupation: "Професійна експозиція", lifestyle: "Спосіб життя" };
  const sum = Object.values(result.components).reduce((total, value) => total + value, 0) || 1;
  $("#breakdown-list").innerHTML = Object.entries(result.components).map(([key, value]) => {
    const share = value / sum;
    return `<div class="factor"><div class="factor-heading"><span>${labels[key]}</span><strong>${asPercent(share, 0)} внеску · індекс ${asIndex(value)}</strong></div><div class="factor-bar"><i style="width:${Math.max(2, share * 100)}%"></i></div></div>`;
  }).join("");

  $("#recommendation-list").innerHTML = result.recommendations.map((item) => `<li>${item}</li>`).join("");
  $("#formula-copy").textContent = `Модель ${result.modelId}, реєстр ${result.registryId}: 1 − (1 − Rздоров’я) × (1 − Rробота) × (1 − Rспосіб життя). Усі поточні коефіцієнти мають статус disputed або synthetic_demo. Компоненти мають несумісні результати та джерела, тому значення є лише демонстраційним індексом, а не ймовірністю.`;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const raw = readForm();
  const input = {
    ...raw,
    chronic: $("#chronic").checked,
    ppe: $("#ppe").checked,
    previous: $("#previous").checked,
    smoking: $("#smoking").checked,
    alcohol: $("#alcohol").checked
  };
  renderRisk(calculateRisk(input));
  $("#result-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
});

$("#details-toggle").addEventListener("click", (event) => {
  const list = $("#breakdown-list");
  const hidden = list.hidden;
  list.hidden = !hidden;
  event.currentTarget.setAttribute("aria-expanded", String(hidden));
  event.currentTarget.textContent = hidden ? "Сховати деталі" : "Показати деталі";
});

function fillOptions(selector, values, labels) {
  const select = $(selector);
  [...new Set(values)].sort().forEach((value) => select.insertAdjacentHTML("beforeend", `<option value="${value}">${labels[value] ?? value}</option>`));
}

function renderIncidents() {
  const role = $("#stats-role").value;
  const vessel = $("#stats-vessel").value;
  const filtered = incidents.filter((item) => (role === "all" || item.role === role) && (vessel === "all" || item.vessel === vessel));
  const total = filtered.length;
  const countBy = (key) => filtered.reduce((acc, item) => ({ ...acc, [item[key]]: (acc[item[key]] || 0) + 1 }), {});
  const severity = countBy("severity");
  const events = countBy("eventType");

  $("#event-total").textContent = total.toLocaleString("uk-UA");
  $("#injury-share").textContent = total ? asPercent((severity.injury || 0) / total, 0) : "—";
  $("#fatal-share").textContent = total ? asPercent((severity.fatal || 0) / total, 0) : "—";
  $("#severity-total").textContent = total.toLocaleString("uk-UA");

  const orderedEvents = Object.entries(events).sort((a, b) => b[1] - a[1]);
  $("#event-bars").innerHTML = total ? orderedEvents.map(([key, count]) => {
    const share = count / total;
    return `<div class="event-bar"><span title="${eventLabels[key]}">${eventLabels[key]}</span><i style="--bar-width:${share * 100}%"></i><strong>${asPercent(share, 0)}</strong></div>`;
  }).join("") : "<p>Для цього поєднання фільтрів подій немає.</p>";

  const segments = ["none", "injury", "fatal"].map((key) => ({ key, count: severity[key] || 0, share: total ? (severity[key] || 0) / total : 0 }));
  let cursor = 0;
  const gradient = segments.map((segment) => {
    const start = cursor; cursor += segment.share * 100;
    return `${severityColors[segment.key]} ${start}% ${cursor}%`;
  }).join(", ");
  $("#severity-donut").style.background = total ? `conic-gradient(${gradient})` : "#274354";
  $("#severity-legend").innerHTML = segments.map((segment) => `<li><i style="background:${severityColors[segment.key]}"></i><span>${severityLabels[segment.key]}</span><strong>${total ? asPercent(segment.share, 0) : "—"}</strong></li>`).join("");

  renderChartMeta("#event-chart-meta", filtered, "Частка кожного типу серед відфільтрованих зареєстрованих подій. Не є індивідуальним ризиком.");
  renderChartMeta("#severity-chart-meta", filtered, "Умовний розподіл наслідків серед відфільтрованих зареєстрованих подій. Не є ймовірністю для працівника.");
}

function renderChartMeta(selector, filtered, definition) {
  const role = $("#stats-role").value;
  const vessel = $("#stats-vessel").value;
  const years = filtered.map((item) => Number(item.year)).filter(Number.isFinite);
  const period = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : `${datasetMeta?.reportingPeriod?.from ?? "—"}–${datasetMeta?.reportingPeriod?.to ?? "—"}`;
  const source = datasetMeta?.source?.publisher ?? "Невідоме джерело";
  const version = datasetMeta?.datasetVersion ?? "—";
  const dataKind = datasetMeta?.releaseMode === "synthetic" ? "Синтетичні DEMO-дані" : "Офіційні агреговані дані";
  const filters = `Роль: ${role === "all" ? "усі" : roleLabels[role]}; судно: ${vessel === "all" ? "усі" : vesselLabels[vessel]}`;
  $(selector).innerHTML = `
    <div><dt>Джерело · версія</dt><dd>${source} · ${version}</dd></div>
    <div><dt>Період · вибірка</dt><dd>${period} · n = ${filtered.length.toLocaleString("uk-UA")}</dd></div>
    <div class="meta-wide"><dt>Активні фільтри</dt><dd>${filters}</dd></div>
    <div class="meta-wide"><dt>Тип даних</dt><dd class="data-kind">${dataKind}</dd></div>
    <div class="meta-wide"><dt>Що означає показник</dt><dd class="definition">${definition}</dd></div>`;
}

async function loadIncidents() {
  try {
    const [response, manifestResponse] = await Promise.all([
      fetch("data/incidents.sample.json"),
      fetch("data/release-manifest.json")
    ]);
    if (!response.ok || !manifestResponse.ok) throw new Error(`HTTP ${response.status}/${manifestResponse.status}`);
    incidents = await response.json();
    const manifest = await manifestResponse.json();
    datasetMeta = manifest.datasets.find((dataset) => dataset.file === "incidents.sample.json");
    if (!datasetMeta) throw new Error("Немає метаданих набору");
    fillOptions("#stats-role", incidents.map((item) => item.role), roleLabels);
    fillOptions("#stats-vessel", incidents.map((item) => item.vessel), vesselLabels);
    $("#stats-role").addEventListener("change", renderIncidents);
    $("#stats-vessel").addEventListener("change", renderIncidents);
    renderIncidents();
  } catch (error) {
    $("#event-bars").innerHTML = `<p>Не вдалося завантажити демонстраційні дані: ${error.message}</p>`;
  }
}

renderRisk(calculateRisk({ age: 35, sex: "male", residence: "city", role: "officer", hours: 2024, night: 25, ppe: true }));
loadIncidents();

if ("serviceWorker" in navigator && location.protocol.startsWith("http") && !["localhost", "127.0.0.1"].includes(location.hostname)) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
