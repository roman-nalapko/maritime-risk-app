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
5. [Research denominators, confidence intervals, and sparse-data warnings](https://github.com/roman-nalapko/maritime-risk-app/issues/13).

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

### Глобальний стратегічний беклог розвитку (Future Roadmap: Maritime Academic & Research Suite)

Нижче наведено глобальний структурований пул перспективних можливостей для подальшого розвитку проєкту як провідної академічної платформи досліджень безпеки мореплавства:

#### Епік 1: Біодинамічне та циркадне моделювання втоми (Circadian Fatigue Dynamics)
- [ ] **Циркадна крива уваги (SAFTE / FAST Alertness Modeling):** розрахунок добових спадів пильності (Circadian Troughs: 02:00–06:00 та 14:00–16:00) з графіком прогнозу працездатності вахтового помічника на 24 години наперед.
- [ ] **Акумулятор дефіциту сну (Cumulative Sleep Debt Tracker):** математична модель накопичення втоми за 72 та 168 годин рейсу з урахуванням розривів сну менше 4 годин підряд.
- [ ] **Калькулятор шкали сонливості Karolinska Sleepiness Scale (KSS 1..9):** експрес-оцінка суб'єктивної сонливості перед заступом на нічну ходову вахту.
- [ ] **Модель зміни часових поясів (Jet-lag & Timezone Shift):** коефіцієнт десинхронозу при швидкому переході через меридіани (транстихоокеанські та трансатлантичні лінії).

#### Епік 2: Оцінка суднових операцій та метеорологічних ризиків (Hydrometeorological & Operational Hazards)
- [ ] **Шкала вітро-хвильового режиму Бофорта (Beaufort Scale 0..12):** динамічне коригування професійного ризику падіння за борт та травмування на відкритій палубі залежно від бальності шторму.
- [ ] **Кути бортової та кілевої хитавиці (Rolling / Pitching Accelerations):** врахування впливу морської хвороби (Motion Sickness Incidence, MSI за ISO 2631) на швидкість реакції судноводія.
- [ ] **Полярний кодекс та обледеніння (IMO Polar Code & Vessel Icing):** розрахунок факторів гіпотермії, роботи при мінусових температурах та ризику обмерзання такелажу.
- [ ] **Тепловий стрес машинного відділення (Heat Stress Index):** оцінка навантаження на механіків при температурах у МО > 40°C у Перській затоці та Червоному морі.
- [ ] **Вібраційний вплив (ISO 6954 Habitability Standards):** облік постійної низькочастотної вібрації головного двигуна та шуму в житлових каютах.

#### Епік 3: Модуль аудиту Port State Control (PSC) та SIRE 2.0 Inspection Readiness
- [ ] **Симулятор перевірки інспекторами Paris MoU / Tokyo MoU:** автоматична генерація списку потенційних зауважень щодо робочого часу (MLC Deficiency Code 01220 - Hours of work and rest).
- [ ] **OCIMF SIRE 2.0 Human Factors Readiness:** аудит відповідності поведінковим маркерам оцінки танкерного екіпажу (Soft Skills, Situation Awareness, Communication under stress).
- [ ] **Генератор плану коригувальних дій (CAP - Corrective Action Plan):** формування шаблону усунення зауважень для суднового Safety Committee Meeting.

#### Епік 4: Інтерактивний тренажер нештатних ситуацій (Emergency Drills & Simulator)
- [ ] **Конструктор сценаріїв навчальних тривог:** моделювання навантаження екіпажу під час проведення судових навчань (Abandon Ship Drill, Fire Drill, Enclosed Space Rescue) одразу після важкої вахти.
- [ ] **Вузькості та стиснені води (Constrained Navigation Risk Index):** специфіка навантаження містка при транзиті протоками (Босфор, Дарданелли, Малаккська протока, Панамський/Суецький канали).
- [ ] **Розширення бібліотеки Landmark-катастроф:** інтеграція кейсів *Exxon Valdez* (алкоголь і хронічна втома другого помічника), *Herald of Free Enterprise* (відкриті носові ворота), *Bourbon Dolphin* (динаміка остійності при буксируванні).

#### Епік 5: Інструментарій наукової роботи та дипломного захисту (Academic Research Toolkit)
- [ ] **Експорт у форматі наукових таблиць LaTeX / Markdown / CSV:** можливість вивантаження матриці чутливості та результатів моделювання для прямої вставки в розділи 3 та 4 дипломної/магістерської роботи.
- [ ] **Автоматичний бібліографічний покажчик (Reference Generator):** генерація списку літератури у стандартах ДСТУ 8302:2015, APA 7th та IEEE (цитування резолюцій IMO, конвенцій ILO та звітів MAIB).
- [ ] **Презентаційний дашборд для виступу (Defense Presentation Mode):** повноекранний режим показу для демонстрації екзаменаційній комісії (ДЕК) та на конференціях з динамічною анімацією розрахунків.
- [ ] **Порівняльний профільний аналіз (Dual Profile Comparative Mode):** паралельне зіставлення двох моряків на одному екрані (наприклад, курсант vs старший механік) з перехресною різницею ризиків.

#### Епік 6: Багатомовність та міжнародна морська термінологія (IMO SMCP Localization)
- [ ] **Повна англомовна локалізація (English / IMO Maritime English):** переклад інтерфейсу відповідно до IMO Standard Marine Communication Phrases (SMCP) для міжнародних рецензентів та публікацій у виданнях Scopus / Web of Science.
- [ ] **Двомовний PDF-сертифікат самоаудиту (UA / EN):** формування міжнародного протоколу аудиту вахти для іноземних судновласників та крюїнгових агентств.

#### Епік 7: Автономна суднове розширення та офлайн-архітектура (Vessel Offline Sync)
- [ ] **Локальне зашифроване сховище профілів (In-Memory / Exportable Vault):** збереження серії вахтових звітів за рейс без жодної передачі в хмару (100% збереження концепції Zero-Data).
- [ ] **QR-код передача параметрів вахти:** генерація оптичного коду на екрані для миттєвого зчитування іншим членом екіпажу чи судновим офіцером без мережевого підключення (актуально під час блекаутів чи відсутності супутникового зв'язку в морі).

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
