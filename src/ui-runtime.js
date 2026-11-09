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
