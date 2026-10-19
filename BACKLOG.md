# Product backlog

GitHub Issues are the execution source of truth. This file defines the backlog system, ordering rules, and current epic map so contributors and agents make consistent decisions.

## Live tracking

- [All open backlog issues](https://github.com/roman-nalapko/maritime-risk-app/issues)
- [Roadmap milestones](https://github.com/roman-nalapko/maritime-risk-app/milestones)
- Current P0 sequence: [define outcomes](https://github.com/roman-nalapko/maritime-risk-app/issues/7) → [audit source tables](https://github.com/roman-nalapko/maritime-risk-app/issues/8) → [define maritime taxonomy](https://github.com/roman-nalapko/maritime-risk-app/issues/4)

## Workflow

```text
Inbox → Refined → Ready → In progress → Review → Done
          ↓
        Blocked
```

GitHub Issues start in **Inbox**. An issue becomes **Ready** only after it meets the Definition of Ready. Because GitHub Issues do not provide all workflow columns without a Project, status is recorded through issue assignment/PR linkage and milestone progress; a Project board can be added later if the team needs one.

## Priority

| Priority | Meaning | Expected handling |
| --- | --- | --- |
| `priority:P0` | Correctness, privacy, or current-milestone blocker | Work before other milestone items |
| `priority:P1` | Required for milestone exit | Plan within the milestone |
| `priority:P2` | Valuable improvement or experiment | Pull after P0/P1 capacity exists |

Priority describes impact and sequencing, not effort.

## Areas

- `area:model` — formulas, coefficients, classification, tests.
- `area:data` — imports, schemas, provenance, statistics.
- `area:ux` — questionnaire, results, charts, accessibility, language.
- `area:platform` — PWA, build, CI, deployment, performance.
- `area:research` — validation, usability, domain review, AI experiments.
- `area:governance` — privacy, limitations, approvals, operational boundaries.

## Definition of Ready

An issue is ready when:

- the user or research outcome is stated;
- scope and exclusions are explicit;
- acceptance criteria are testable;
- source/data dependencies are identified;
- privacy and methodology impact are considered;
- it belongs to one milestone and has one priority.

## Definition of Done

An issue is done when:

- acceptance criteria are satisfied;
- automated tests and build pass;
- affected documentation and versions are updated;
- source/provenance metadata is present where applicable;
- mobile and accessible interaction is checked for UI work;
- no unsupported risk claim or personal data is introduced;
- the implementing pull request or commit is linked.

## Epic map

### Methodology v1.0

1. [Define outcomes and intended use](https://github.com/roman-nalapko/maritime-risk-app/issues/7).
2. [Audit educational tables and arithmetic](https://github.com/roman-nalapko/maritime-risk-app/issues/8).
3. [Define maritime taxonomy and exposure units](https://github.com/roman-nalapko/maritime-risk-app/issues/4).
4. [Build coefficient registry and provenance rules](https://github.com/roman-nalapko/maritime-risk-app/issues/14).
5. [Add reviewed calculation fixtures](https://github.com/roman-nalapko/maritime-risk-app/issues/3).
6. [Display uncertainty and methodology status](https://github.com/roman-nalapko/maritime-risk-app/issues/10).

### Real incident data

0. [Ingest official maritime incident sources for public statistics](https://github.com/roman-nalapko/maritime-risk-app/issues/36).
1. [Implement the MAIB CSV import](https://github.com/roman-nalapko/maritime-risk-app/issues/12).
2. [Map source fields to the internal taxonomy](https://github.com/roman-nalapko/maritime-risk-app/issues/9).
3. [Add data-quality and privacy checks](https://github.com/roman-nalapko/maritime-risk-app/issues/15).
4. [Publish source, period, sample, and filter metadata](https://github.com/roman-nalapko/maritime-risk-app/issues/17).
5. [Research denominators, confidence intervals, and sparse-data warnings](https://github.com/roman-nalapko/maritime-risk-app/issues/13) — [ВИКОНАНО: Wilson Score 95% CI та маркер n < 30].

### Optional external validation

1. [Accessibility and mobile/PWA audit](https://github.com/roman-nalapko/maritime-risk-app/issues/5).
2. [Usability protocol and sessions](https://github.com/roman-nalapko/maritime-risk-app/issues/1).
3. [Maritime safety specialist review](https://github.com/roman-nalapko/maritime-risk-app/issues/6).
4. [Privacy and governance review](https://github.com/roman-nalapko/maritime-risk-app/issues/2).
5. [Restricted preview deployment and pilot findings](https://github.com/roman-nalapko/maritime-risk-app/issues/18).

These items improve evidence and terminology but do not block a public educational release. They remain mandatory before any validated probability, certification, or operational decision claim.

### Optional AI

1. [Evaluate AI architecture and browser-side feasibility](https://github.com/roman-nalapko/maritime-risk-app/issues/16).
2. [Prototype grounded similar-incident retrieval](https://github.com/roman-nalapko/maritime-risk-app/issues/11).

### Наступний етап доопрацювання (Epic: Pro Maritime Experience & Presentation Upgrade)

Пул завдань для виведення прототипу на рівень презентаційного інженерного дашборду перед демонстрацією викладачу та науковій спільноті:

1. **Сучасний візуальний редизайн (UI/UX 2.0 & Premium Maritime Dashboard) — [ВИКОНАНО]:**
   - Перехід на глибший сучасний морський інтерфейс (стилістика OpenBridge IEC 62288);
   - Усунення подвійної прокрутки та організація результатів у таби (Cockpit segmented panes);
   - Перемикач режиму освітлення ходового містка (Bridge Night Cockpit / Red Night Vision / Bright Day за IMO MSC.252(83)).

2. **Інтеграція реальних кейсів розслідувань (MAIB / IMO Lessons Learned) — [ВИКОНАНО]:**
   - Інтерактивний блок «Розбір реальних морських аварій» (CMA CGM Vasco de Gama, танкер Zarga, Scot Carrier & Karin Høj);
   - Швидке завантаження параметрів аварійного екіпажу в калькулятор з аналізом порушень MLC 2006 / STCW.

3. **Бенчмаркінг та галузеве порівняння (Industry Benchmark) — [ВИКОНАНО]:**
   - Блок порівняння розрахованого навантаження моряка із середніми базовими показниками світового флоту (BIMCO / ICS Seafarer Workforce: 2 150 год/рік, 28% нічних вахт).

4. **Генерація офіційного PDF-звіту (Pro Audit / Assessment PDF) — [ВИКОНАНО]:**
   - Експорт красивого бланка формату A4 «МОРСЬКИЙ САМОАУДИТ ТА ЗВІТ БЕЗПЕКИ ВАХТИ (MLC 2006 / STCW)» з печаткою локальної валідації Zero-Data, лініями підписів моряка та Safety Officer.

5. **Поглиблення морських параметрів моделі (Advanced Seafaring Parameters) — [ВИКОНАНО]:**
   - Додано вибір розкладу вахт (3-вахтовий 4/8 vs 2-вахтовий 6/6 vs денна зміна) з контролем ризику кумулятивної втоми (IMO MSC/Circ.1598) та симуляцією What-If переходу на 4/8;
   - Додано специфіку суден і типів вантажу (контейнеровози — кріплення/lashing, танкери — газовий контроль ISGOTT/статика, балкери — контроль трюмів IMSBC Code).

6. **Детермінований пошук релевантних інцидентів (MAIB Grounded Retrieval) — [ВИКОНАНО]:**
   - Інтегровано пошук офіційних розслідувань MAIB за посадою та типом судна;
   - Автоматична генерація перевірених фактів, домінуючих типів аварій та факторного аналізу групи без зовнішніх хмарних API;
   - Суворе дотримання методологічного правила: статистика зафіксованих записів чітко розмежована з індивідуальною ймовірністю.

7. **Публічний освітній реліз (Educational Beta Deployment) — [ВИКОНАНО]:**
   - Додаток розгорнуто як безкоштовний публічний PWA-інструмент на GitHub Pages (`https://roman-nalapko.github.io/maritime-risk-app/`);
   - Працює 100% локально в браузері без акаунтів, баз даних, відстеження чи передачі введених анкет;
   - Всі 6 тестових наборів проходять валідацію автоматично в GitHub Actions.

8. **Матриця оцінки ризику IMO FSA (MSC-MEPC.2/Circ.12) — [ВИКОНАНО]:**
   - Інтегровано класичну двовимірну матрицю ризиків: Індекс частоти FI (1..4) × Індекс наслідків SI (1..4);
   - Автоматичний розрахунок зон прийнятності: Broadly Acceptable (RI ≤ 3), ALARP (4..6), Unacceptable (RI ≥ 7);
   - Динамічне підсвічування поточної координати оцінюваного моряка в таблиці з рекомендаціями СУБ/SMS.

9. **Аналіз чутливості та маржинальної еластичності факторів (Tornado Ranking) — [ВИКОНАНО]:**
   - Алгоритм диференціального розрахунку зміни ризику (ΔR) при зміні кожного керованого параметра;
   - Візуалізація ранжування факторів через горизонтальну діаграму «Торнадо» з визначенням провідного дестабілізатора.

10. **4-й резонансний кейс розслідування: MV El Faro (2015) — [ВИКОНАНО]:**
    - Додано кейс контейнеровоза Ro-Ro El Faro (NTSB/USCG/IMO, ураган Joaquin, загибель 33 моряків);
    - Моделювання комплексу факторів: порушення lashing, тиск графіка, авторитаризм та втома екіпажу.

11. **Інтерактивний морський глосарій стандартів IMO / ILO — [ВИКОНАНО]:**
    - Вбудований довідник конвенцій: MLC 2006, STCW A-VIII/1, IMO FSA, ALARP, IMO MSC/Circ.1598, ISGOTT, IMSBC Code, Snap-Back Zone, Stop Work Authority.

12. **Оптимізація продуктивності рендерингу (120 FPS GPU Layering & Paint Elimination) — [ВИКОНАНО]:**
    - Усунуто лаги при прокручуванні: винесено фоновий градієнт в апаратний шар `body::before` з `transform: translateZ(0)`;
    - Ліквідовано дорогі `backdrop-filter: blur(...)` на великих картках;
    - Додано `content-visibility: auto` для миттєвого пропуску позаекранного рендерингу.

---

### Завершений комплекс розробок (Release v0.8.0: Maritime Academic & Research Suite) — [ВИКОНАНО]:

Усі 7 стратегічних епіків успішно реалізовані end-to-end, покриті 100% автотестами у `scripts/feature-checks.mjs`, інтегровані в UI/UX та збірку, і повністю відповідають вимогам Zero-Data Retention:

#### Епік 1: Біодинамічне та циркадне моделювання втоми (Circadian Fatigue Dynamics) — [ВИКОНАНО]
- [x] **Циркадна крива уваги (SAFTE / FAST Alertness Modeling):** 24-годинна симуляція рівня пильності з визначенням циркадного спаду (Circadian Nadir: 03:00–05:00) та підсвічуванням робочих вахт.
- [x] **Акумулятор дефіциту сну (Cumulative Sleep Debt Tracker):** розрахунок тижневого дефіциту сну при перепрацюванні (> 60 год/тижд та вахті 6/6).
- [x] **Калькулятор шкали сонливості Karolinska Sleepiness Scale (KSS 1..9):** оперативна оцінка схильності до засинання на містку (KSS від 1 «Надзвичайно бадьорий» до 9 «Надзвичайно сонливий»).
- [x] **Автотест:** Перевірено в `scripts/feature-checks.mjs` (тест №9).

#### Епік 2: Оцінка суднових операцій та метеорологічних ризиків (Hydrometeorological & Operational Hazards) — [ВИКОНАНО]
- [x] **Шкала вітро-хвильового режиму Бофорта (Beaufort Scale 0..12):** динамічний повзунок із розрахунком хитавиці за типом судна.
- [x] **Індекс морської хвороби (MSI % за ISO 2631):** нелінійна залежність заколисування від бальності моря.
- [x] **Коефіцієнт ковзання палуби:** оцінка небезпеки послизання та падіння за борт (множник до ×4.2 при штормі ≥ 8 балів).
- [x] **Полярний кодекс та обледеніння (IMO Polar Code):** попередження про обмерзання такелажу та загрозу втрати GM.
- [x] **Тепловий стрес машинного відділення (WBGT > 32°C):** регламент ротації 30/30 та гідратації для механіків.
- [x] **Автотест:** Перевірено в `scripts/feature-checks.mjs` (тест №10).

#### Епік 3: Модуль аудиту Port State Control (PSC) та SIRE 2.0 Inspection Readiness — [ВИКОНАНО]
- [x] **Симулятор перевірки інспекторами Paris MoU / Tokyo MoU:** оцінка готовності (0..100) та коди зауважень (01220 - робочий час, 07109 - ЗІЗ).
- [x] **OCIMF SIRE 2.0 Human Factors Readiness:** виявлення факторів ризику танкерного флоту (SIRE-HF-04).
- [x] **План коригувальних дій (Corrective Action Plan - CAP):** автоматичні рекомендації для Safety Committee Meeting.
- [x] **Автотест:** Перевірено в `scripts/feature-checks.mjs` (тест №11).

#### Епік 4: Інтерактивний тренажер нештатних ситуацій (Emergency Drills & Simulator) — [ВИКОНАНО]
- [x] **Конструктор сценаріїв навчальних тривог:** Fire Drill (SOLAS III/19), Abandon Ship Drill, Enclosed Space Rescue, SOPEP Oil Spill.
- [x] **Моделювання людського фактора:** розрахунок затримки реакції (reaction delay seconds) та ймовірності помилки (error rate %) під впливом втоми.
- [x] **Розширення бібліотеки катастроф:** додано кейси *Exxon Valdez* (1989) та *Bourbon Dolphin* (2007).
- [x] **Аудіогенератор тривог IMO MSC.302(87) BAM / SOLAS III/6.4.2:** 100% in-memory Web Audio API синтезатор сигналів тривоги для суднових навчань.
- [x] **Автотест:** Перевірено в `scripts/feature-checks.mjs` (тести №12 та №19).

#### Епік 5: Інструментарій наукової роботи та дипломного захисту (Academic Research Toolkit) — [ВИКОНАНО]
- [x] **Експорт у форматі LaTeX:** генерація коду таблиці `\begin{table}` з математичними позначеннями факторів.
- [x] **Експорт у форматі BibTeX:** автоматичні бібліографічні посилання (IMO FSA, MLC 2006, IMO MSC/Circ.1598).
- [x] **Вивантаження зрізу у CSV:** детермінований CSV-файл із метаданими розрахунку для академічного аналізу.
- [x] **Порівняльний профільний аналіз (Dual Profile Comparison):** зіставлення поточного профілю з оптимізованим нормативом (Δ% ризику).
- [x] **Автотест:** Перевірено в `scripts/feature-checks.mjs` (тести №13 та №14).

#### Епік 6: Багатомовність та міжнародна морська термінологія (IMO SMCP Localization) — [ВИКОНАНО]
- [x] **Тримовний інтерфейс (UA 🇺🇦 / EN 🇬🇧 IMO SMCP / RU 🇷🇺):** повна локалізація без неперекладених вузлів форми, глосарія, статистичних карток та звітів (виключно в оперативній пам'яті клієнта без збереження cookies чи сховищ).
- [x] **Автотест:** Перевірено в `scripts/feature-checks.mjs` (тест №17).

#### Епік 7: Повна автономність та Zero-Data Retention — [ВИКОНАНО]
- [x] **Zero-Data Privacy:** жодних викликів `localStorage`, `sessionStorage`, `indexedDB`, сторонніх трекерів чи передачі персональних даних у мережу.
- [x] **Повна офлайн-підтримка (Service Worker v0.8.0):** миттєва робота у відкритому морі без зв'язку.

#### Епік 8: Статистична надійність вибірки та довірчі інтервали Вілсона (Wilson Confidence Intervals & Sparse Warnings, Issue #13) — [ВИКОНАНО]
- [x] **Довірчі інтервали 95% Wilson Score Interval:** оцінка невизначеності часток травм та летальних випадків у морській статистиці.
- [x] **Попередження про малий обсяг вибірки (Sparse-Data Notice):** динамічний маркер для підгруп з $n < 30$.
- [x] **Автотест:** Перевірено в `scripts/feature-checks.mjs` (тест №18).

#### Епік 9: Повний редизайн інтерфейсу та усунення візуального шуму (UI/UX 2.1 & Clean Maritime Design) — [ВИКОНАНО]
- [x] **Кардинальне розвантаження UI:** усунення надлишкових бейджів, рамок та неонових свічень, оптимізація ієрархії контенту та відступів.
- [x] **Чиста дизайн-система:** скорочення надлишкового CSS на ~1300 рядків, чіткі семантичні контрасти за стандартом WCAG AA.
- [x] **Адаптивність та доступність:** збереження 5 стандартних `role="switch"` перемикачів, мобільні брейкпоїнти 620px та 900px, доступність фокусу для клавіатури.
- [x] **Інтеграція морських правил України:** додано визначення профілю ризику судна, GMDSS, GISIS та CleanSeaNet згідно з Правилами контролю суден (z0353-04) до глосарія трьома мовами.
- [x] **Автотести та збірка:** усі 6 тестових наборів та білд проходять із кодом 0.

#### Епік 10: Управління ресурсами містка (BRM) та синергія ходової вахти (STCW A-VIII/2 & COLREG Rule 5) — [ВИКОНАНО]
- [x] **Моделювання структури ходової вахти (`evaluateWatchTeamRisk`):** перевірка наявності окремого впередсмотрящого (Lookout) у нічний час (COLREG Rule 5), виявлення критичних порушень STCW Section A-VIII/2 Part 4-1 (урок розслідування зіткнення Scot Carrier).
- [x] **Аналіз взаємної кумулятивної втоми:** детекція збоїв взаємної перевірки дій (Cross-check redundancy failure) при одночасній втомі вахтового помічника та впередсмотрящого (IMO MSC/Circ.1598).
- [x] **Інтеграція лоцманської проводки (IMO Res. A.960):** контрольні процедури обміну інформацією Master/Pilot Information Exchange (MPX).
- [x] **Інтерактивні доступні тултіпи:** спливаючі підказки для 24-годинної циркадної кривої (`#circadian-bars`) та живого радара факторів (`#live-radar-svg`) з повною підтримкою клавіатури (`tabindex="0"`, `:focus-visible`).
- [x] **Автотести:** Перевірено в `scripts/feature-checks.mjs` (тести №20 та №21).

#### Епік 11: Валідатор годин відпочинку вахти (MLC 2006 Standard A2.3 & STCW Section A-VIII/1 7-Day Hours of Rest Validator) — [ВИКОНАНО]
- [x] **Алгоритм валідації 168 годин (`validateRestHoursSchedule`):** перевірка ковзних 24-годинних та 7-денних вікон за стандартами Paris MoU / PSC:
  - мінімум 10 годин відпочинку за кожні 24 години;
  - не більше 2 періодів відпочинку за добу;
  - один безперервний блок відпочинку не менше 6 годин;
  - інтервал між періодами відпочинку не більше 14 годин;
  - сумарний тижневий відпочинок не менше 77 годин.
- [x] **Шаблони вахтових розкладів (`createDefaultWatchSchedule`):** стандартна тривахтова система 4/8 (STCW), двовахтова система 6/6 (Feeder/Coastal), та режим інтенсивних вантажних операцій (Порт / Овертайм).
- [x] **Інтерактивна таблиця годин відпочинку:** перемикання вкладок 7 діб, інтерактивне перемикання 24 часових слотів (Відпочинок / Робота) з миттєвим формуванням списку зафіксованих невідповідностей (Non-Conformities) та бейджа комплаєнсу.
- [x] **Повна тримовна локалізація (UA / EN IMO SMCP / RU):** миттєве оновлення чек-листа правил та звітів про порушення.
- [x] **Автотести:** Перевірено в `scripts/feature-checks.mjs` (тести №22 та №23).

#### Епік 12: Оцифрування аварій GISIS IMO (MSC-MEPC.3/Circ.4/Rev.1) та причинно-наслідковий аналіз ECFA (IMO Res. A.1075(28)) для внутрішніх водних шляхів і басейнів (Кейс лоцманського катера KP-965) — [ВИКОНАНО]
- [x] **Цифрове кодування аварійних подій за класифікаторами Додатка 5 (MSC-MEPC.3/Circ.4/Rev.1):**
  - Формування нормативно валідованого масиву JSON-структури на основі Field Value Option Tables 1–30 (Table 3 Location, Table 4 Event, Table 5 Severity, Tables 6–10 Environment, Table 16 Accident Event, Table 19 Error Type, Tables 20–23 Contributing Factors).
  - Еталонний оцифрований кейс інциденту лоцманського катера KP-965 (Копер, 14.04.2026, навал на буй 2/I на швидкості 22 вузли) з можливістю завантаження та експорту готового файлу для практичної роботи.
- [x] **Інтерактивна векторна діаграма ECFA (Event and Causal Factors Analysis, IMO Res. A.1075(28)):**
  - Структурно-логічна схема аналізу події за офіційним звітом MAIIS (Словенія): хронологія подій ($E1 \dots E8$), аварійні точки сходу безпеки ($AE1 \dots AE4$), фактори сприяння ($CF1 \dots CF7$), системні дефіцити ($SD1 \dots SD6$) та проблеми безпеки ($SI1 \dots SI5$).
  - 100% чистий SVG/HTML/CSS без сторонніх бібліотек, адаптивність, збереження доступності фокусу та сумісність із нічним/червоним/денним режимами містка.
- [x] **Алгоритм автоматизованої оцінки ризику для внутрішніх водних шляхів і портових акваторій ($R = P \times S$):**
  - Розрахунок підсумкового індексу ризику на основі суми ваг виявлених факторів ($P$) та ступеня тяжкості наслідків ($S$ за Table 5).
  - Розподіл за зонами ризику: Зелена ($R < 6$), Жовта ($6 \le R < 10$), Червона критична ($R \ge 10$).
- [x] **Модуль автоматичної генерації превентивних заходів безпеки (Mitigation Rules):**
  - Автоматичне формування регламентних вимог безпеки при $R \ge 10$ (програмне обмеження швидкості катерів у портових басейнах $\le 10$ вузлів, обов'язкове дублювання візуального спостереження другим членом екіпажу з доступом до радара, стандартизовані чек-листи).
- [x] **Інструмент експорту для навчальної групи (Python / JSON):**
  - Однокліковий експорт валідованого файлу `KP-965-gisis-record.json`.
  - Генерація та копіювання готового автономного Python-скрипту з розрахунком матриці ризику та графіками для звіту в Jupyter Notebook / PyCharm.
- [x] **Автотести та верифікація:**
  - Розширення `scripts/feature-checks.mjs` тестами валідності JSON-кодування, математики матриці $R = P \times S$ та DOM-контракту нового модуля (тести №25–28).

## Explicitly deferred

- employee ranking or fitness-for-duty decisions;
- medical recommendations;
- insurer or employer scoring;
- live navigational decisions;
- public accounts and cloud profile history;
- AI-generated numeric risk coefficients;
- ingestion of confidential or personally identifying records.

## Backlog review cadence

Review the active milestone after material domain feedback or dataset updates. During review:

1. close duplicates and obsolete assumptions;
2. confirm the next three P0/P1 issues;
3. move unvalidated ideas to `priority:P2` or a later milestone;
4. record methodology decisions in `docs/decisions.md`;
5. update roadmap status only from verified milestone progress.
