/* Shared dictionaries: load before i18n/core. */
(function () {
    'use strict';
    var ru = {
        lcwTitle:'Новая кампания', lcwStep:'Шаг {n} из 5', lcwNext:'Далее →', lcwBack:'Назад', lcwClose:'Закрыть мастер', lcwLaunch:'Запустить кампанию',
        lcwStep1:'Выберите стратегию', lcwStep2:'Источники трафика', lcwStep3:'Удержание аудитории', lcwStep4:'Сценарий и отзывы', lcwStep5:'Темп и бюджет',
        lcwIntro:'Задайте направление. Пресет заполнит следующие шаги — настройки можно изменить.',
        lcwBaseline:'Фоновый темп платформы', lcwBaselineValue:'{n} установок / день', lcwBaselineHint:'Среднее за 7 дней внутри DevTestHub; это не органический трафик Google Play.',
        lcwNoBaseline:'Пока нет данных о фоне', lcwColdStart:'Стартуем с 1 установки в день. Процентный прирост без фоновых данных не рассчитывается.',
        lcwSmooth:'Настроим плавный прирост относительно текущего темпа. Он не гарантирует отсутствие санкций Google Play.',
        lcwRecommended:'Рекомендуем', lcwAso:'ASO-разгон', lcwAsoText:'Поиск по ключам · удержание 14 дней · мягкий запрос отзыва после 7 дней.', lcwAsoRate:'+30% к фону',
        lcwRetention:'Максимальный Retention', lcwRetentionText:'Удержание 30 дней · три источника трафика · поддерживающий темп +10% к фону.',
        lcwDeep:'Глубокий сценарий', lcwDeepText:'Прямая ссылка · целевое действие со скриншотом · удержание 7 дней.',
        lcwCustom:'Свой сценарий', lcwCustomText:'Соберите параметры вручную. Начнём с прямой ссылки, 7 дней удержания и 1 установки в день.',
        lcwChosen:'Выбрано', lcwRatePreview:'Кампания: +{extra}/день · вместе с фоном ≈{total}/день', lcwRounding:'Темп округлён до целых установок, минимум 1 в день.', lcwStartRate:'Старт: 1 установка / день',
        lcwDraftStep:'Предварительная настройка', lcwSkeleton:'Каркас шага: базовые настройки уже связаны со сметой. Детальные настройки появятся на следующем этапе.',
        lcwLink:'Прямой переход', lcwWeb:'Веб-поиск', lcwKeywords:'Ключи Google Play', lcwSourcesHint:'Вес каналов распределяет общий объём установок; сумма весов нормализуется автоматически.',
        lcwWeight:'Вес канала {name}', lcwChannelVolume:'≈{count} уст. · {percent}%', lcwNoSources:'Включите хотя бы один источник трафика.', lcwConcentrated:'Один источник занимает 80% или больше. Проверьте распределение трафика.',
        lcwDays:'{n} дней', lcwRetentionLabel:'Срок удержания', lcwCheckpoints:'Контрольные дни со скриншотом', lcwD1:'День 1 · бесплатно', lcwDay:'День {n}',
        lcwCheckpointHint:'День 1 обязателен; оставьте хотя бы один дополнительный КД. Ориентир оценки — 10 $BUST за КД на установку.', lcwMinimum:'Оставьте хотя бы один КД помимо дня 1.',
        lcwActivity:'Целевое действие по сценарию', lcwScreenshot:'Скриншот результата', lcwReviews:'Запрос отзыва Google Play', lcwSoft:'Мягкий запрос после 7 дней; отзыв добровольный, оценку выбирает тестер. Отзыв не является платным действием.',
        lcwDaily:'Установок в день', lcwDuration:'Период набора установок', lcwRamp:'Плавное распределение потока', lcwRampHint:'Пока это настройка черновика. Расписание набора подключим на следующем этапе.',
        lcwWallet:'Разрешить основной баланс', lcwWalletHint:'Базовый источник — баланс проекта. Разрешение записано только в черновик, списаний сейчас нет.',
        lcwSummary:'План кампании', lcwInstalls:'{n} установок', lcwFinish:'Последняя группа завершит удержание примерно на {n}-й день от старта.',
        lcwEstimate:'Оценка КД / день', lcwTotal:'Всего КД: {n} $BUST', lcwChoose:'Выберите стратегию', lcwEstimateHint:'Предварительные обязательства по КД. Источники и сценарии ещё без тарифа; это не итоговая цена. Списание — по подтверждённому отчёту.',
        lcwStageNotice:'Черновик · оценка КД, без стоимости трафика', lcwLaunchLater:'Запуск появится после подключения серверных тарифов и проверки бюджета. Кампания ещё не создана.',
        lcwExit:'Выйти из мастера? Несохранённые настройки будут потеряны.', lcwReset:'Сменить стратегию? Настройки следующих шагов будут заменены пресетом.', lcwNoAccess:'Откройте мастер из своего Live-проекта.',
        lcwReviewLater:'Задержка: 7 дней · мягкий запрос', lcwSelect:'Выбрать {name}', lcwDecrease:'Уменьшить: {name}', lcwIncrease:'Увеличить: {name}'
    };
    var en = {
        lcwTitle:'New campaign', lcwStep:'Step {n} of 5', lcwNext:'Next →', lcwBack:'Back', lcwClose:'Close wizard', lcwLaunch:'Launch campaign',
        lcwStep1:'Choose a strategy', lcwStep2:'Traffic sources', lcwStep3:'Audience retention', lcwStep4:'Scenario & reviews', lcwStep5:'Pace & budget',
        lcwIntro:'Choose a direction. The preset fills the next steps; you can adjust it later.',
        lcwBaseline:'Platform baseline', lcwBaselineValue:'{n} installs / day', lcwBaselineHint:'7-day average within DevTestHub, separate from Google Play organic traffic.',
        lcwNoBaseline:'No baseline data yet', lcwColdStart:'Start with 1 install per day. Percentage growth needs baseline data.',
        lcwSmooth:'Plan a gradual increase relative to your current pace. This does not guarantee protection from Google Play sanctions.',
        lcwRecommended:'Recommended', lcwAso:'ASO boost', lcwAsoText:'Keyword search · 14-day retention · gentle review prompt after 7 days.', lcwAsoRate:'+30% to baseline',
        lcwRetention:'Maximum Retention', lcwRetentionText:'30-day retention · three traffic sources · supporting pace at +10% to baseline.',
        lcwDeep:'Deep scenario', lcwDeepText:'Direct link · target action with a screenshot · 7-day retention.',
        lcwCustom:'Custom scenario', lcwCustomText:'Build it yourself. Start with a direct link, 7-day retention and 1 install per day.',
        lcwChosen:'Selected', lcwRatePreview:'Campaign: +{extra}/day · with baseline ≈{total}/day', lcwRounding:'Rounded to whole installs, at least 1 per day.', lcwStartRate:'Start: 1 install / day',
        lcwDraftStep:'Preliminary setup', lcwSkeleton:'Step scaffold: basic settings already update the estimate. Detailed controls come in the next stage.',
        lcwLink:'Direct link', lcwWeb:'Web search', lcwKeywords:'Google Play keywords', lcwSourcesHint:'Channel weights distribute the total installs; their sum is normalized automatically.',
        lcwWeight:'Channel weight: {name}', lcwChannelVolume:'≈{count} installs · {percent}%', lcwNoSources:'Enable at least one traffic source.', lcwConcentrated:'One source accounts for 80% or more. Review the traffic mix.',
        lcwDays:'{n} days', lcwRetentionLabel:'Retention period', lcwCheckpoints:'Screenshot checkpoints', lcwD1:'Day 1 · free', lcwDay:'Day {n}',
        lcwCheckpointHint:'Day 1 is required; keep at least one additional checkpoint. Estimate uses 10 $BUST per checkpoint per install.', lcwMinimum:'Keep at least one checkpoint besides day 1.',
        lcwActivity:'Target action scenario', lcwScreenshot:'Result screenshot', lcwReviews:'Google Play review prompt', lcwSoft:'Gentle prompt after 7 days; reviews are optional and testers choose their rating. Reviews are not paid actions.',
        lcwDaily:'Installs per day', lcwDuration:'Acquisition period', lcwRamp:'Gradually distribute traffic', lcwRampHint:'Draft preference only for now. Scheduling will be connected in the next stage.',
        lcwWallet:'Allow main wallet', lcwWalletHint:'Project balance is the primary source. This permission is a draft preference; nothing is charged now.',
        lcwSummary:'Campaign plan', lcwInstalls:'{n} installs', lcwFinish:'The last cohort finishes retention around day {n} from launch.',
        lcwEstimate:'Checkpoint estimate / day', lcwTotal:'Total checkpoints: {n} $BUST', lcwChoose:'Choose a strategy', lcwEstimateHint:'Preliminary checkpoint commitments. Traffic and scenarios are not priced yet; this is not a final quote. Charges follow verified reports.',
        lcwStageNotice:'Draft · checkpoint estimate, traffic not priced', lcwLaunchLater:'Launch will be available after server pricing and budget validation are connected. No campaign has been created.',
        lcwExit:'Leave the wizard? Unsaved settings will be lost.', lcwReset:'Change strategy? This will replace your settings on the following steps.', lcwNoAccess:'Open the wizard from your own Live project.',
        lcwReviewLater:'Delay: 7 days · gentle prompt', lcwSelect:'Select {name}', lcwDecrease:'Decrease: {name}', lcwIncrease:'Increase: {name}'
    };
    Object.assign(window.I18NRU, ru); Object.assign(window.I18NEN, en);
})();
