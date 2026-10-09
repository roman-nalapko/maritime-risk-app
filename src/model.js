export const MODEL = Object.freeze({
  id: "SR-UA-PROTOTYPE-0.1",
  status: "provisional",
  ageBaseline: [
    [20, 0.0003], [25, 0.0004], [30, 0.0005], [35, 0.0009], [40, 0.0016],
    [45, 0.0027], [50, 0.0048], [55, 0.0084], [60, 0.015], [65, 0.025],
    [70, 0.038], [75, 0.059], [80, 0.091], [Infinity, 0.143]
  ],
  demographicMultiplier: {
    city: { male: 1.45, female: 0.38 },
    village: { male: 1.7, female: 0.42 }
  },
  hourlyRoleRate: {
    deck: 6e-7,
    engine: 5e-7,
    officer: 3e-7,
    port: 1.2e-7,
    cadet: 5e-8,
    diver: 6e-6
  },
  lifestyle: { smoking: 0.008, alcohol: 0.000212 }
});

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
  if (input.chronic) health *= 1.25;

  let occupation = (MODEL.hourlyRoleRate[input.role] ?? MODEL.hourlyRoleRate.deck) * hours;
  occupation *= 1 + nightShare * 0.6;
  if (input.ppe) occupation *= 0.75;
  if (input.previous) occupation *= 1.2;

  let lifestyle = 0;
  if (input.smoking) lifestyle += MODEL.lifestyle.smoking * demographic;
  if (input.alcohol) lifestyle += MODEL.lifestyle.alcohol * demographic;

  health = clamp(health, 0, 0.95);
  occupation = clamp(occupation, 0, 0.95);
  lifestyle = clamp(lifestyle, 0, 0.95);
  const total = 1 - (1 - health) * (1 - occupation) * (1 - lifestyle);

  return {
    modelId: MODEL.id,
    total,
    category: categoryFor(total),
    components: { health, occupation, lifestyle },
    recommendations: recommendationsFor(input, { health, occupation, lifestyle })
  };
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

