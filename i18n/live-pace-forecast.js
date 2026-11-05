/* Shared pace editor translations, loaded after the legacy pace vocabulary. */
(function(){
 'use strict';
 var strings={
  "lpdCorridorEvolution": [
    "Коридор сегодня: {min}–{max} уст./день (фон ~{base}) → к Д14: {endMin}–{endMax} (фон ~{endBase})",
    "Today's corridor: {min}–{max}/day (baseline ~{base}) → D14: {endMin}–{endMax} (baseline ~{endBase})"
  ],
  "lpdAfterGoal": [
    "После достижения цели",
    "After reaching the target"
  ],
  "lpdAfterAuto": [
    "🤖 Перейти в Авто-коридор · рекомендуется",
    "🤖 Switch to auto corridor · recommended"
  ],
  "lpdAfterWave": [
    "🌊 Удерживать цель с волной ±1–2",
    "🌊 Maintain target with a ±1–2 wave"
  ],
  "lpdLegacyPlateau": [
    "Сохранён прежний постоянный уровень. Выберите поведение после цели, чтобы изменить его.",
    "The saved plan keeps a constant plateau. Choose an option to change it."
  ],
  "lpdWidth": [
    "Ширина целевого коридора · PRO",
    "Target corridor width · PRO"
  ],
  "lpdWidth_standard": [
    "Стандартный · рост 30%",
    "Standard · 30% growth"
  ],
  "lpdWidth_expanded": [
    "Расширенный · рост 50%",
    "Expanded · 50% growth"
  ],
  "lpdWidth_conservative": [
    "Консервативный · ±15%",
    "Conservative · ±15%"
  ],
  "lpdWidthHint": [
    "Это ориентир вашей стратегии, а не изменение рейтинга Маркета. Нижняя граница защищает от обрыва; верхняя учитывает рост и запас на колебания. В Авто действует стандартный коридор.",
    "This is a planning target; it does not change Market scoring. The floor protects against a sudden drop; the ceiling includes growth and a fluctuation allowance. Auto uses the standard corridor."
  ],
  "lpdStartWarning": [
    "⚠️ Старт ниже текущей базовой линии (~{base} уст./день). Резкое падение темпа может снизить рейтинг.",
    "⚠️ The start is below your current baseline (~{base}/day). A sudden drop may reduce your rating."
  ],
  "lpdDirectionWarning": [
    "⚠️ Проверьте направление: при разгоне цель должна быть не ниже старта, при снижении — не выше.",
    "⚠️ Check the direction: a ramp target must not be below the start; a landing target must not exceed it."
  ],
  "lpdMinutesHours": [
    "{min} мин ({h} ч)",
    "{min} min ({h} h)"
  ],
  "lpdMinutesPreset": [
    "{min}–{max} мин",
    "{min}–{max} min"
  ],
  "lpdHoursPreset": [
    "{a}–{b} ч ({min}–{max}м)",
    "{a}–{b} h ({min}–{max}m)"
  ],
  "lpdForecastHint": [
    "Условный прогноз при достаточном потоке заявок. Каждый день меняет фон следующего дня по истории 28 завершённых UTC-суток. Паузы и потолки кампаний уменьшают прогноз; бюджет, местное утро и реальные действия участников могут дополнительно изменить результат.",
    "A conditional forecast assuming enough requests. Each day updates the next day's baseline using 28 completed UTC days. Breaks and campaign caps reduce the forecast; budget, local mornings and actual participant actions may change the result further."
  ],
  "lpdNoHistory": [
    "История для прогноза пока не загружена: показан текущий коридор без предположений о прошлых установках.",
    "Forecast history is not loaded yet: the current corridor is shown without inventing past installs."
  ],
  "lpdBaselineLegend": [
    "Пунктир — среднесуточный фон B. Зелёная зона — ориентир дня. Авто показывает пример живой волны, а не обязательную квоту установок.",
    "The dashed line is baseline B. The green band is that day's target range. Auto illustrates a natural wave, not a guaranteed install quota."
  ],
  "lpdNorm": [
    "📊 Суточная норма сегодня: до {n} уст./день",
    "📊 Today's project target: up to {n} installs/day"
  ],
  "lpdNormRange": [
    "План на 14 дней: {min}–{max} уст./день",
    "14-day plan: {min}–{max} installs/day"
  ],
  "lpdRemaining": [
    "общий поток · остаток {min}–{max}/д",
    "shared flow · remaining {min}–{max}/day"
  ],
  "lpdSharedHint": [
    "Полосы показывают возможные доли, не бронь. Неиспользованный остаток доступен кампаниям в общем потоке; несколько таких кампаний делят его по очереди.",
    "Segments illustrate possible shares, not reservations. Unused capacity is available to shared-flow campaigns; multiple such campaigns share it in queue order."
  ],
  "lppBudget": [
    "💳 Общий лимит: по бюджету пула",
    "💳 Overall limit: project pool budget"
  ],
  "lppFinite": [
    "🎯 Общий лимит: {n} уст.",
    "🎯 Overall limit: {n} installs"
  ],
  "lppUnlimited": [
    "🌊 В общем потоке",
    "🌊 Shared flow"
  ],
  "lppSetCap": [
    "🎯 Потолок в день",
    "🎯 Daily ceiling"
  ],
  "lpdContracts": [
    "💎 Контракты при заполненной норме / паузе темпа",
    "💎 Contracts when the daily target is full / pace is paused"
  ],
  "lpdContractsHint": [
    "Правило для всего проекта: Авто-коридор и Своя стратегия. Платные исполнители могут входить сверх дневной нормы или капельной паузы, пока не исчерпан отдельный потолок на UTC-сутки. Общий бюджет и проверки сохраняются.",
    "Applies project-wide in Auto and Custom strategy. Paid testers may enter beyond the daily target or drip pause, up to this separate UTC-day cap. Budget and eligibility checks still apply."
  ],
  "lpdContractsFree": [
    "В свободном потоке пауз нет. Это правило сохранится для Авто и Своей стратегии.",
    "Free flow has no pace pauses. This rule is saved for Auto and Custom strategy."
  ],
  "lpdContract_off": [
    "Выкл · в общую очередь",
    "Off · shared queue"
  ],
  "lpdContract_2": [
    "До 2 в сутки",
    "Up to 2/day"
  ],
  "lpdContract_5": [
    "До 5 в сутки",
    "Up to 5/day"
  ],
  "lpdContract_unlimited": [
    "Без лимита",
    "Unlimited"
  ],
  "lpInvalid": [
    "Проверьте диапазоны и направление стратегии. Разгон идёт вверх, снижение — вниз. Пауза микро-волны: 120–480 минут.",
    "Check the ranges and strategy direction. Ramp goes up; landing goes down. Micro-wave breaks: 120–480 minutes."
  ],
  "lpdProfileBand": [
    "Целевой диапазон PRO · рейтинг Маркета не меняется",
    "PRO target band · Market scoring is unchanged"
  ],
  "lpdCanonicalLine": [
    "Тонкая янтарная линия — стандартный потолок Маркета.",
    "The thin amber line is the standard Market ceiling."
  ]
};
 Object.keys(strings).forEach(function(k){I18NRU[k]=strings[k][0];I18NEN[k]=strings[k][1];});
})();
