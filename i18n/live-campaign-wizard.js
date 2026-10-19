/* Shared dictionaries: load before i18n/core. */
(function () {
    'use strict';
    var ru = {
        lcwTitle:'Новая кампания', lcwStep:'Шаг {n} из 4', lcwNext:'Продолжить →', lcwBack:'Назад', lcwClose:'Закрыть мастер', lcwLaunch:'Запустить кампанию',
        lcwStep1:'Источник трафика', lcwStep2:'Удержание и КД', lcwStep3:'Сценарий и отзывы', lcwStep4:'Темп и объём',
        lcwIntro:'Задайте направление. Пресет заполнит следующие шаги — настройки можно изменить.',
        lcwBaseline:'Фоновый темп платформы', lcwBaselineValue:'{n} установок / день', lcwBaselineHint:'Среднее за 7 дней внутри DevTestHub; это не органический трафик Google Play.',
        lcwNoBaseline:'Пока нет данных о фоне', lcwColdStart:'Стартуем с 1 установки в день. Процентный прирост без фоновых данных не рассчитывается.',
        lcwSmooth:'Настроим плавный прирост относительно текущего темпа. Он не гарантирует отсутствие санкций Google Play.',
        lcwRecommended:'Рекомендуем', lcwAso:'ASO-разгон', lcwAsoText:'Поиск по ключам · удержание 14 дней · мягкий запрос отзыва после 7 дней.', lcwAsoRate:'+30% к фону',
        lcwRetention:'Максимальный Retention', lcwRetentionText:'Удержание 28 дней · три источника трафика · поддерживающий темп +10% к фону.',
        lcwDeep:'Глубокий сценарий', lcwDeepText:'Прямая ссылка · целевое действие со скриншотом · удержание 7 дней.',
        lcwCustom:'Свой сценарий', lcwCustomText:'Соберите параметры вручную. Начнём с прямой ссылки, 7 дней удержания и 1 установки в день.',
        lcwChosen:'Выбрано', lcwRatePreview:'Кампания: +{extra}/день · вместе с фоном ≈{total}/день', lcwRounding:'Темп округлён до целых установок, минимум 1 в день.', lcwStartRate:'Старт: 1 установка / день',
        lcwLink:'Прямой переход', lcwWeb:'Веб-поиск (браузер)', lcwKeywords:'Ключи Google Play', lcwSourcesHint:'Укажите точное количество установок по каждому источнику.',
         lcwChannelVolume:'≈{count} уст. · {percent}%', lcwNoSources:'Включите хотя бы один источник трафика.', lcwConcentrated:'Доля одного источника в проекте ≥80%. Выберите кампанию другого типа, чтобы выровнять баланс.',
        lcwDays:'{n} дней', lcwRetentionLabel:'Срок удержания', lcwCheckpoints:'Контрольные дни со скриншотом', lcwD1:'День 1 · бесплатно', lcwDay:'День {n}',
        lcwCheckpointHint:'День 1 бесплатно. Каждый следующий КД — 10 $BUST по подтверждённому скриншоту. Оставьте хотя бы один дополнительный КД.', lcwMinimum:'Оставьте хотя бы один КД помимо дня 1.',
        lcwActivity:'Целевое действие по сценарию', lcwScreenshot:'Скриншот результата', lcwReviews:'Запрос отзыва Google Play', lcwSoft:'Мягкий запрос после 7 дней; отзыв добровольный, оценку выбирает тестер. Отзыв не является платным действием.',
        lcwDaily:'Установок в день', lcwDuration:'Период набора установок', lcwRamp:'Плавное распределение потока', lcwRampHint:'Распределить набор без резких скачков активности.',
        lcwWallet:'Разрешить основной баланс', lcwWalletHint:'Использовать основной баланс, если средств проекта не хватит.',
        lcwSummary:'План кампании', lcwInstalls:'{n} установок', lcwFinish:'Последняя группа завершит удержание примерно на {n}-й день от старта.',
        lcwEstimate:'Оценка КД / день', lcwTotal:'Всего КД: {n} $BUST', lcwChoose:'Выберите стратегию', lcwEstimateHint:'Оценка включает КД по 10 $BUST. Трафик и сценарии не учтены. Итоговая стоимость подтверждается перед запуском; списание — за подтверждённый отчёт.',
        lcwLaunchLater:'Запуск новых кампаний пока недоступен.',lcwExit:'Выйти из мастера? Несохранённые настройки будут потеряны.', lcwReset:'Сменить стратегию? Настройки следующих шагов будут заменены пресетом.', lcwNoAccess:'Откройте мастер из своего Live-проекта.',
        lcwReviewLater:'Задержка: 7 дней · мягкий запрос', lcwSelect:'Выбрать {name}', lcwDecrease:'Уменьшить: {name}', lcwIncrease:'Увеличить: {name}'
    };
    var en = {
        lcwTitle:'New campaign', lcwStep:'Step {n} of 4', lcwNext:'Continue →', lcwBack:'Back', lcwClose:'Close wizard', lcwLaunch:'Launch campaign',
        lcwStep1:'Traffic source', lcwStep2:'Retention & checkpoints', lcwStep3:'Scenario & reviews', lcwStep4:'Pace & volume',
        lcwIntro:'Choose a direction. The preset fills the next steps; you can adjust it later.',
        lcwBaseline:'Platform baseline', lcwBaselineValue:'{n} installs / day', lcwBaselineHint:'7-day average within DevTestHub, separate from Google Play organic traffic.',
        lcwNoBaseline:'No baseline data yet', lcwColdStart:'Start with 1 install per day. Percentage growth needs baseline data.',
        lcwSmooth:'Plan a gradual increase relative to your current pace. This does not guarantee protection from Google Play sanctions.',
        lcwRecommended:'Recommended', lcwAso:'ASO boost', lcwAsoText:'Keyword search · 14-day retention · gentle review prompt after 7 days.', lcwAsoRate:'+30% to baseline',
        lcwRetention:'Maximum Retention', lcwRetentionText:'28-day retention · three traffic sources · supporting pace at +10% to baseline.',
        lcwDeep:'Deep scenario', lcwDeepText:'Direct link · target action with a screenshot · 7-day retention.',
        lcwCustom:'Custom scenario', lcwCustomText:'Build it yourself. Start with a direct link, 7-day retention and 1 install per day.',
        lcwChosen:'Selected', lcwRatePreview:'Campaign: +{extra}/day · with baseline ≈{total}/day', lcwRounding:'Rounded to whole installs, at least 1 per day.', lcwStartRate:'Start: 1 install / day',
        lcwLink:'Direct link', lcwWeb:'Web search', lcwKeywords:'Google Play keywords', lcwSourcesHint:'Set the exact number of installs for each source.',
         lcwChannelVolume:'≈{count} installs · {percent}%', lcwNoSources:'Enable at least one traffic source.', lcwConcentrated:'One source accounts for 80% or more. Review the traffic mix.',
        lcwDays:'{n} days', lcwRetentionLabel:'Retention period', lcwCheckpoints:'Screenshot checkpoints', lcwD1:'Day 1 · free', lcwDay:'Day {n}',
        lcwCheckpointHint:'Day 1 is required; keep at least one additional checkpoint. Estimate uses 10 $BUST per checkpoint per install.', lcwMinimum:'Keep at least one checkpoint besides day 1.',
        lcwActivity:'Target action scenario', lcwScreenshot:'Result screenshot', lcwReviews:'Google Play review prompt', lcwSoft:'Gentle prompt after 7 days; reviews are optional and testers choose their rating. Reviews are not paid actions.',
        lcwDaily:'Installs per day', lcwDuration:'Acquisition period', lcwRamp:'Gradually distribute traffic', lcwRampHint:'Distribute acquisition without sudden spikes in activity.',
        lcwWallet:'Allow main wallet', lcwWalletHint:'Use the main wallet when the project balance runs out.',
        lcwSummary:'Campaign plan', lcwInstalls:'{n} installs', lcwFinish:'The last cohort finishes retention around day {n} from launch.',
        lcwEstimate:'Checkpoint estimate / day', lcwTotal:'Total checkpoints: {n} $BUST', lcwChoose:'Choose a strategy', lcwEstimateHint:'Estimate includes checkpoints at 10 $BUST. Traffic and scenarios are excluded. Confirm the final cost before launch; charges follow verified reports.',
        lcwLaunchLater:'Launching new campaigns is not available yet.',lcwExit:'Leave the wizard? Unsaved settings will be lost.', lcwReset:'Change strategy? This will replace your settings on the following steps.', lcwNoAccess:'Open the wizard from your own Live project.',
        lcwReviewLater:'Delay: 7 days · gentle prompt', lcwSelect:'Select {name}', lcwDecrease:'Decrease: {name}', lcwIncrease:'Increase: {name}'
    };
    Object.assign(ru,{
        lcgDefaultScenario:'Откройте приложение, выполните основное действие и прикрепите скриншот результата.',
        lcwContents:'Шаги кампании',lcwStepLocked:'Откроется после предыдущего шага',lcwSourceSummary:'{n} уст. · ссылка {link}% / веб {web}% / ключи {keys}%',lcwRetentionSummary:'{n} дней · КД {days}',lcwActivitySummary:'Сценарий: {scenario} · отзывы: {reviews}',lcwPaceSummary:'{n} уст./день · набор {days} дн.',lcwPaceHint:'Количество установок задано в источниках. Темп меняет длительность набора, сохраняя объём.',
        lcwDetails:'Детали',lcwTotalLabel:'Всего:',lcwInstallUnit:'уст.',lcwBustDay:'$BUST/день',lcwCostDetails:'Детализация сметы',lcwCostCheckpoint:'КД: {days} × {unit} $BUST = {price} $BUST на установку',lcwCostDuration:'Набор: {acquisition} дн. · удержание: {retention} дн.',
        lcwBalance:'Баланс источников проекта',lcwCurrentMix:'Сейчас в проекте: {n} уст.',lcwNoSourceBase:'Статистика источников ещё недоступна. Показан баланс кампании.',lcwLoadingSources:'Загружаем текущий баланс источников…',lcwAfter:'После кампании',lcwCampaignMix:'В кампании',lcwUnknown:'Не определено',lcwBalanced:'Источники распределены без выраженного перекоса.',lcwUncertain:'Часть установок без источника. Оценка баланса пока неполная.',
        lcwLinkHint:'Тестер перейдёт напрямую по ссылке приложения в Google Play.',lcwBrowserQuery:'Поисковый запрос в браузере',lcwQueryRequired:'Задайте запрос для веб-поиска.',lcwCopy:'Копировать',lcwCopied:'Запрос скопирован',lcwCopyFailed:'Выделите запрос и скопируйте его вручную.',
        lcwReference:'Ориентир поисковой выдачи',lcwAttachImage:'Прикрепить скриншот выдачи',lcwReplaceImage:'Заменить скриншот',lcwRemoveImage:'Удалить скриншот',lcwImageHint:'PNG, JPG или WebP · до 5 МБ',lcwInvalidImage:'Нужен корректный PNG, JPG или WebP до 5 МБ и 24 мегапикселей.',
        lcwPickKeys:'+ Подобрать и добавить ключи',lcwPassportHelp:'Из Паспорта Google Play',lcwFullDescription:'Полное описание',lcwIdeas:'Идеи из описания',lcwIdeasHint:'Слова и фразы из сохранённой карточки. Проверьте, находится ли приложение по выбранному запросу.',lcwNoPassport:'Паспорт ещё не загружен. Можно добавить ключ вручную или использовать идеи из названия проекта.',lcwLoadingPassport:'Загружаем сохранённую карточку приложения…',
        lcwManualKey:'Свой ключ',lcwKeyPlaceholder:'Например: семейный бюджет',lcwAdd:'Добавить',lcwRemoveKey:'Удалить ключ «{name}»',lcwKeywordInstalls:'Установок по ключу «{name}»',lcwCheckPlay:'Проверить в Google Play ↗',lcwPosition:'Позиция / ориентир в выдаче',lcwPositionHint:'Например: 12 или «синяя иконка»',lcwKeyInvalid:'Введите уникальный ключ до 80 символов; максимум 20 ключей.',lcwInvalidCount:'Введите целое число от 0 до 100 000; для ключа — минимум 1.',lcwRetry:'Повторить загрузку'
    });
    Object.assign(en,{
        lcgDefaultScenario:'Open the app, complete its main action and attach a screenshot of the result.',
        lcwContents:'Campaign steps',lcwStepLocked:'Complete the previous step first',lcwSourceSummary:'{n} installs · link {link}% / web {web}% / keys {keys}%',lcwRetentionSummary:'{n} days · checkpoints {days}',lcwActivitySummary:'Scenario: {scenario} · reviews: {reviews}',lcwPaceSummary:'{n} installs/day · acquisition {days} days',lcwPaceHint:'Install counts come from traffic sources. Changing pace adjusts acquisition duration while preserving volume.',
        lcwDetails:'Details',lcwTotalLabel:'Total:',lcwInstallUnit:'inst.',lcwBustDay:'$BUST/day',lcwCostDetails:'Cost breakdown',lcwCostCheckpoint:'Checkpoints: {days} × {unit} $BUST = {price} $BUST per install',lcwCostDuration:'Acquisition: {acquisition} days · retention: {retention} days',
        lcwBalance:'Project traffic balance',lcwCurrentMix:'Currently in project: {n} installs',lcwNoSourceBase:'Source statistics are not available yet. Showing the campaign mix.',lcwLoadingSources:'Loading the current traffic mix…',lcwAfter:'After campaign',lcwCampaignMix:'In this campaign',lcwUnknown:'Unattributed',lcwBalanced:'Sources are distributed without strong concentration.',lcwUncertain:'Some installs are unattributed. The balance assessment is incomplete.',
        lcwLinkHint:'Testers open the app directly using its Google Play link.',lcwBrowserQuery:'Browser search query',lcwQueryRequired:'Enter a browser search query.',lcwCopy:'Copy',lcwCopied:'Query copied',lcwCopyFailed:'Select the query and copy it manually.',
        lcwReference:'Search results reference',lcwAttachImage:'Attach results screenshot',lcwReplaceImage:'Replace screenshot',lcwRemoveImage:'Remove screenshot',lcwImageHint:'PNG, JPG or WebP · up to 5 MB',lcwInvalidImage:'Use a valid PNG, JPG or WebP up to 5 MB and 24 megapixels.',
        lcwPickKeys:'+ Find and add keywords',lcwPassportHelp:'From Google Play passport',lcwFullDescription:'Full description',lcwIdeas:'Ideas from the listing',lcwIdeasHint:'Words and phrases from the saved listing. Check that your app appears for each selected query.',lcwNoPassport:'The passport has not been loaded. Add a keyword manually or use ideas from the project title.',lcwLoadingPassport:'Loading the saved app listing…',
        lcwManualKey:'Custom keyword',lcwKeyPlaceholder:'For example: family budget',lcwAdd:'Add',lcwRemoveKey:'Remove keyword “{name}”',lcwKeywordInstalls:'Installs for “{name}”',lcwCheckPlay:'Check in Google Play ↗',lcwPosition:'Position / search results reference',lcwPositionHint:'For example: 12 or “blue icon”',lcwKeyInvalid:'Enter a unique keyword up to 80 characters; at most 20 keywords.',lcwInvalidCount:'Enter a whole number from 0 to 100,000; keywords need at least 1.',lcwRetry:'Retry loading'
    });
    Object.assign(ru,{
        lcgDefaultScenario:'Откройте приложение, выполните основное действие и прикрепите скриншот результата.',
        lcgManual:'Настроить кампанию вручную',lcgTemplates:'Быстрый старт',lcgTemplatePause:'Шаблон сразу добавляется в текущие кампании на паузе — параметры можно проверить перед включением.',lcgChangeTemplate:'Сменить шаблон',lcgRetentionText:'Удержание 28 дней · прямой переход · поддерживающий темп.',
        lcgInstallSpeed:'Установки',lcgReviewSpeed:'Отзывы',lcgHold:'Удержание',lcgDayUnit:'день',lcgDaysUnit:'дн.',lcgPhotoActivity:'Активность: скрин {age} · в графике КД: {percent}%',lcgNoPhoto:'нет данных',lcgMinutes:'{n} мин назад',lcgHours:'{n} ч назад',lcgDaysAgo:'{n} дн. назад',
        lcgOpenBrowser:'🌐 Скопировать запрос и открыть поиск',lcgNeedKey:'Добавьте хотя бы один ключ в пул кампании.',lcgScenarioText:'Инструкция к действию',lcgCampaignName:'Название кампании',lcgOptional:'Необязательно',lcgDailyLimit:'Ограничить суточный темп',lcgTarget:'Всего установок',lcgUnpacedHint:'Тестеры выполняют задания по мере поступления, без суточного лимита.',lcgUnpaced:'Без суточного лимита',lcgCorridor:'Ориентир +30% к текущему темпу: до {n} уст./день. Это рекомендация, не гарантия отсутствия санкций.',lcgOnlyCheckpoints:'Оплачиваются только контрольные дни по 10 $BUST за подтверждённый скриншот. День 1 бесплатно; платы за установку и отзыв нет.',lcgByReports:'по отчётам',
        lcgSavePaused:'Лимит активных кампаний достигнут. Кампания будет сохранена на паузе.',lcgCreatePaused:'Создать на паузе',lcgSaving:'Сохраняем…',lcgCreatedPaused:'Кампания добавлена на паузе',lcgCreated:'Кампания создана',lcgSaveFailed:'Не удалось сохранить кампанию. Повторите попытку.',lcgLimitReached:'Достигнут лимит активных кампаний. Приостановите другую или купите слот.',lcgLastKey:'В активной кампании должен остаться хотя бы один включённый ключ.',
        lcgActiveCapacity:'Активно: {n} / {limit}',lcgExpandSlots:'+ Слот · {price} $BUST',lcgBuyConfirm:'Купить {slot}-й слот активной кампании навсегда для проекта за {price} $BUST?',lcgProgress:'Установки',lcgCheckpointDays:'КД: {days}',lcgPerInstall:'План КД: {n} $BUST / тестер',lcgCampaignKeys:'Ключевые слова кампании'
    });
    Object.assign(en,{
        lcgDefaultScenario:'Open the app, complete its main action and attach a screenshot of the result.',
        lcgManual:'Set up a campaign manually',lcgTemplates:'Quick start',lcgTemplatePause:'A template is added to current campaigns as paused. Review its settings before activation.',lcgChangeTemplate:'Change template',lcgRetentionText:'28-day retention · direct link · supporting pace.',
        lcgInstallSpeed:'Installs',lcgReviewSpeed:'Reviews',lcgHold:'Retention',lcgDayUnit:'day',lcgDaysUnit:'days',lcgPhotoActivity:'Activity: screenshot {age} · checkpoints on schedule: {percent}%',lcgNoPhoto:'no data',lcgMinutes:'{n} min ago',lcgHours:'{n} h ago',lcgDaysAgo:'{n} days ago',
        lcgOpenBrowser:'🌐 Copy query and open search',lcgNeedKey:'Add at least one keyword to the campaign pool.',lcgScenarioText:'Action instructions',lcgCampaignName:'Campaign name',lcgOptional:'Optional',lcgDailyLimit:'Limit daily pace',lcgTarget:'Total installs',lcgUnpacedHint:'Testers complete tasks as they arrive, without a daily cap.',lcgUnpaced:'No daily cap',lcgCorridor:'Suggested +30% to current pace: up to {n} installs/day. This is guidance, not protection from sanctions.',lcgOnlyCheckpoints:'Only checkpoints are charged: 10 $BUST per verified screenshot. Day 1 is free; installs and reviews have no separate fee.',lcgByReports:'per report',
        lcgSavePaused:'The active campaign limit has been reached. This campaign will be saved as paused.',lcgCreatePaused:'Create as paused',lcgSaving:'Saving…',lcgCreatedPaused:'Campaign added as paused',lcgCreated:'Campaign created',lcgSaveFailed:'Could not save the campaign. Please retry.',lcgLimitReached:'Active campaign limit reached. Pause another campaign or buy a slot.',lcgLastKey:'An active campaign needs at least one enabled keyword.',
        lcgActiveCapacity:'Active: {n} / {limit}',lcgExpandSlots:'+ Slot · {price} $BUST',lcgBuyConfirm:'Buy permanent active campaign slot {slot} for this project for {price} $BUST?',lcgProgress:'Installs',lcgCheckpointDays:'Checkpoints: {days}',lcgPerInstall:'Checkpoint plan: {n} $BUST / tester',lcgCampaignKeys:'Campaign keywords'
    });
    Object.assign(window.I18NRU, ru); Object.assign(window.I18NEN, en);
})();
