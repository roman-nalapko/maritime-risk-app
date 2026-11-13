const SUPERSCRIPT_DIGITS = Object.freeze({
  "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹"
});

export function formatEngineeringIndex(value, locale = "uk-UA") {
  const numeric = Number(value);
  if (numeric === 0) return "0";
  if (!Number.isFinite(numeric)) return numeric.toExponential(2);

  const exponent = Math.floor(Math.log10(Math.abs(numeric)));
  const coefficient = numeric / (10 ** exponent);
  const superscript = String(exponent)
    .split("")
    .map((character) => SUPERSCRIPT_DIGITS[character] ?? character)
    .join("");

  return `${coefficient.toLocaleString(locale, { maximumFractionDigits: 2 })} × 10${superscript}`;
}

export function initializeModule(name, initializer, fallbackTarget = null, logger = console) {
  try {
    initializer();
    return true;
  } catch (error) {
    logger.error(`${name} initialization failed`, error);
    if (fallbackTarget) {
      fallbackTarget.setAttribute("role", "alert");
      fallbackTarget.textContent = "Цей розділ тимчасово недоступний. Оновіть сторінку або спробуйте пізніше.";
    }
    return false;
  }
}

export function resolveViewMode(search = "") {
  const params = new URLSearchParams(search);
  return params.get("view") === "tools" ? "tools" : "assignment";
}

export function resolveInterfacePreferences(search = "") {
  const params = new URLSearchParams(search);
  const lang = ["uk", "en"].includes(params.get("lang")) ? params.get("lang") : "uk";
  const theme = ["cockpit", "red", "day"].includes(params.get("theme")) ? params.get("theme") : "cockpit";
  return { lang, theme };
}

export function withInterfacePreferences(href, baseHref, { lang, theme }) {
  const baseUrl = new URL(baseHref);
  const targetUrl = new URL(href, baseUrl);
  if (targetUrl.origin !== baseUrl.origin || targetUrl.pathname !== baseUrl.pathname || !targetUrl.searchParams.has("view")) {
    return href;
  }
  targetUrl.searchParams.set("lang", ["uk", "en"].includes(lang) ? lang : "uk");
  targetUrl.searchParams.set("theme", ["cockpit", "red", "day"].includes(theme) ? theme : "cockpit");
  return `${targetUrl.search}${targetUrl.hash}`;
}

export async function copyText(clipboard, value) {
  if (!clipboard?.writeText) throw new Error("Clipboard API is unavailable");
  await clipboard.writeText(value);
  return true;
}

export async function copyTextOrFallback(clipboard, value) {
  try {
    await copyText(clipboard, value);
    return { copied: true, fallbackText: "" };
  } catch {
    return { copied: false, fallbackText: value };
  }
}
