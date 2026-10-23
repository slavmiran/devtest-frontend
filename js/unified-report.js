/* One local-only render path for the frequently used report sheet. */
(function () {
    'use strict';
    var COPY = {
        ru: {
            title: 'Подтверждение теста', formatLabel: 'Формат отчёта',
            noteLabel: 'Комментарий', bugLabel: 'Опишите проблему', ideaLabel: 'Предложите улучшение',
            bugPlaceholder: 'Что произошло? Что вы ожидали? Как повторить проблему?',
            ideaPlaceholder: 'Что стоит улучшить и как это поможет пользователям?',
            waiting: 'Быстрое подтверждение · {seconds} с', openFirst: 'Сначала откройте приложение',
            media: 'Добавить фото или видео', limits: 'До 5 файлов · фото до 5 МБ · видео до 50 МБ',
            screenshot: 'Скриншот', bug: 'Баг', idea: 'Идея', note: 'Комментарий для разработчика (необязательно)…',
            privacy: 'Публикуется в топик Testing Proofs',
            singleHint: 'Одного скрина достаточно. Но хороший тест редко заканчивается на одном экране 🙂',
            bonusLabel: 'Бонус: +{amount}', excess: '−{count} лишних',
            seriesTitle: 'Бонус за серию экранов', seriesCount: 'Серия экранов: {count} из 5', mediaCount: 'Материалы: {count} из 5',
            seriesRange: '+0,1…0,3 кармы', seriesReward: '+{amount} кармы',
            seriesHint: 'Прикрепите 3–5 разных экранов для бонуса кармы.',
            seriesActive: 'Бонус активен · ещё +0,1 за следующий экран.', seriesMax: 'Максимальный бонус за серию.',
            noDailyBonus: 'Без повторной дневной награды', noDailyBonusHint: 'Материалы будут отправлены по текущей задаче.',
            qualityBadge: 'Принято: {percent}', rewardBadge: '+0,5 кармы после одобрения',
            qualityHint: 'Награда после проверки владельцем. Спам и пустые фидбэки снижают рейтинг качества',
            seriesAdded: '✓ Ещё +{amount} кармы за {count} фото · бонусы складываются',
            description: 'Что произошло или что предлагаете улучшить?',
            quality: 'После принятия владельцем: +0,5 кармы. Спам и пустые отчёты снижают рейтинг.',
            accepted: 'Принято ваших фидбэков: {percent} · ',
            send: 'Подтвердить тестирование', sendBug: 'Отправить баг и подтвердить день', sendIdea: 'Отправить идею и подтвердить день',
            catchupSend: 'Отправить досдачу', plain: 'Просто подтвердить день — без отчёта',
            review: 'Отзыв в Google Play', reviewLater: 'Отзыв Google Play доступен с дня 7',
            day: 'День {day} · {name}', close: 'Закрыть', edit: 'Разметить изображение',
            done: 'Готово', undo: 'Отменить шаг', redo: 'Вернуть шаг', cancel: 'Отмена', pen: 'Маркер', arrow: 'Стрелка', cover: 'Скрыть',
            thickness: 'Толщина', colorRed: 'Красный', colorGreen: 'Зелёный', colorBlue: 'Синий', colorWhite: 'Белый', colorBlack: 'Чёрный',
            editorTitle: 'Разметка скриншота', editorFailed: 'Не удалось сохранить разметку. Попробуйте ещё раз.',
            annotate: 'Выделите важное. Чёрным маркером можно скрыть личные данные.',
            catchup: 'Досдача за день {day}',
            catchupDaily: 'Этот отчёт закроет один дозапрос и подтвердит сегодняшний день. Бонус $BUST за отчёт не начисляется.',
            catchupBuffer: 'Этот отчёт закроет только один дозапрос. В Buffer нет ежедневного чекина и наград.',
            catchupDone: 'Сегодняшний день уже подтверждён. Этот отчёт закроет один дозапрос, без повторного чекина и бонуса $BUST.',
            catchupControl: 'Сегодня контрольный день: отчёт подтвердит его, но не закроет прежний дозапрос.',
            more: 'Остальные запросы: {days}. Для каждого нужен отдельный отчёт.',
            series: '{count} фото · бонус сейчас: +{karma} кармы',
            sum: 'Бонус за серию фото складывается с этой наградой.',
            videoLimit: 'Видео — до 50 МБ. Изображение — до 5 МБ.',
            leave: 'Есть несохранённый отчёт. Закрыть без отправки?',
            progress: 'Отправляем… {percent}%', processing: 'Обрабатываем отчёт…',
        },
        en: {
            title: 'Confirm testing', formatLabel: 'Report type',
            noteLabel: 'Comment', bugLabel: 'Describe the issue', ideaLabel: 'Suggest an improvement',
            bugPlaceholder: 'What happened? What did you expect? How can it be reproduced?',
            ideaPlaceholder: 'What could be improved, and how would it help users?',
            waiting: 'Quick confirmation · {seconds}s', openFirst: 'Open the app first',
            media: 'Add photos or video', limits: 'Up to 5 files · photos up to 5 MB · videos up to 50 MB',
            screenshot: 'Screenshot', bug: 'Bug', idea: 'Idea', note: 'Comment for the developer (optional)…',
            privacy: 'Published in the Testing Proofs topic',
            singleHint: 'One screenshot is enough. But a good test rarely ends on a single screen 🙂',
            bonusLabel: 'Bonus: +{amount}', excess: '−{count} extra',
            seriesTitle: 'Screen-series bonus', seriesCount: 'Screen series: {count} of 5', mediaCount: 'Media: {count} of 5',
            seriesRange: '+0.1…0.3 karma', seriesReward: '+{amount} karma',
            seriesHint: 'Attach 3–5 different screens for a karma bonus.',
            seriesActive: 'Bonus active · +0.1 for each next screen.', seriesMax: 'Maximum photo-series bonus.',
            noDailyBonus: 'No additional daily reward', noDailyBonusHint: 'These materials will fulfil the current task.',
            qualityBadge: 'Accepted: {percent}', rewardBadge: '+0.5 karma after approval',
            qualityHint: 'Reward follows owner approval. Spam and empty feedback lower your quality rating',
            seriesAdded: '✓ Another +{amount} karma for {count} photos · bonuses add up',
            description: 'What happened, or what would you improve?',
            quality: '+0.5 karma after the owner accepts it. Spam and empty reports lower your rating.',
            accepted: 'Your accepted feedback: {percent} · ',
            send: 'Confirm testing', sendBug: 'Send bug and confirm day', sendIdea: 'Send idea and confirm day',
            catchupSend: 'Submit make-up report', plain: 'Just confirm today — no report',
            review: 'Google Play review', reviewLater: 'Google Play reviews unlock on day 7',
            day: 'Day {day} · {name}', close: 'Close', edit: 'Annotate image',
            done: 'Done', undo: 'Undo', redo: 'Redo', cancel: 'Cancel', pen: 'Marker', arrow: 'Arrow', cover: 'Redact',
            thickness: 'Thickness', colorRed: 'Red', colorGreen: 'Green', colorBlue: 'Blue', colorWhite: 'White', colorBlack: 'Black',
            editorTitle: 'Annotate screenshot', editorFailed: 'Could not save the annotation. Please retry.',
            annotate: 'Highlight the issue. Use the black marker to hide personal information.',
            catchup: 'Make-up report for day {day}',
            catchupDaily: 'This report closes one request and confirms today. No screenshot $BUST bonus is awarded.',
            catchupBuffer: 'This report closes one request only. Buffer has no daily check-in or rewards.',
            catchupDone: 'Today is already confirmed. This report closes one request, with no second check-in or screenshot $BUST bonus.',
            catchupControl: 'Today is a control day: this report confirms today, but does not close an earlier request.',
            more: 'Other requests: {days}. Each needs a separate report.',
            series: '{count} photos · immediate bonus: +{karma} karma',
            sum: 'The photo-series bonus is added to this reward.',
            videoLimit: 'Videos: up to 50 MB. Images: up to 5 MB.',
            leave: 'You have an unsent report. Discard it?',
            progress: 'Uploading… {percent}%', processing: 'Processing report…',
        },
    };
    function t(key, values) {
        var value = (COPY[typeof lang !== 'undefined' && lang === 'ru' ? 'ru' : 'en'][key] || key);
        Object.keys(values || {}).forEach(function (name) { value = value.replace('{' + name + '}', values[name]); });
        return value;
    }
    window.reportCopy = t;
    window.reportErrorCopy = function (code) {
        var ru = typeof lang !== 'undefined' && lang === 'ru';
        var messages = {
            report_media_required: ['Прикрепите фото или видео из приложения.', 'Attach an in-app photo or video.'],
            invalid_report_media: ['Поддерживаются JPEG, PNG, WebP, MP4, WebM и MOV.', 'Use JPEG, PNG, WebP, MP4, WebM or MOV.'],
            report_description_too_short: ['Опишите баг или идею: минимум 24 символа.', 'Describe the bug or idea in at least 24 characters.'],
            report_text_too_long: ['Заметка — до 500 символов, описание — до 1000.', 'Notes: up to 500 characters. Descriptions: up to 1000.'],
            report_storage_unavailable: ['Сервис отчётов временно недоступен. Попробуйте ещё раз — день не будет засчитан дважды.', 'Reports are temporarily unavailable. Retry safely: the day will not be counted twice.'],
            report_upload_failed: ['Не удалось завершить отправку. Повторите её из карточки проекта.', 'The report could not be completed. Retry from the project card.'],
            catchup_request_changed: ['Список дозапросов изменился. Откройте карточку заново и повторите отправку.', 'Make-up requests have changed. Reopen the card and retry.'],
            catchup_daily_limit: ['Сегодня один дозапрос уже закрыт. Следующий можно закрыть завтра. В Buffer этого ограничения нет.', 'One request was already completed today. Complete the next tomorrow. Buffer has no such limit.'],
            catchup_buffer_only: ['Этап теста изменился. Обновите карточку перед отправкой.', 'The testing phase has changed. Refresh the card before submitting.'],
            day_boundary_moved: ['Наступил новый день. Обновите карточку и проверьте день отчёта перед повторной отправкой.', 'The day has changed. Refresh the card and check the report day before retrying.'],
            feedback_type_disabled: ['Владелец выключил этот формат отчёта. Можно отправить обычный отчёт.', 'The owner disabled this report type. You can send a regular report.'],
        };
        return messages[code] ? messages[code][ru ? 0 : 1] : '';
    };
    function el(id) { return document.getElementById(id); }
    function state() { return _checkinProofUploadState; }
    function context(test, options) {
        options = options || {};
        var day = typeof getResolvedTestingDay === 'function' ? getResolvedTestingDay(test) : Number(test.testing_days || 1);
        var control = [1, 4, 7, 10, 14].indexOf(Number(day)) >= 0;
        var requests = (test.control_proof_catchups || []).filter(function (request) {
            return (!request.state || ['requested', 'pending'].indexOf(request.state) >= 0) && Number(request.missed_testing_day) > 0;
        }).slice().sort(function (a, b) { return Number(a.missed_testing_day) - Number(b.missed_testing_day); });
        return { day: day, control: control, requests: requests,
            firstMandatory: Number(test.checkins_count || 0) === 0 && !test.last_check_date,
            buffer: options.submissionMode === 'buffer_catchup' || (typeof isBufferOnlyCatchupSubmission === 'function' && isBufferOnlyCatchupSubmission(test, day)),
            target: !control && requests.length ? requests[0] : null };
    }
    window.getUnifiedReportContext = context;
    window.initUnifiedReport = function (test, options) {
        if (!test) return;
        var s = state();
        s.reportKind = s.reportKind || 'screenshot';
        s.note = s.note || '';
        s.reportContext = context(test, options);
        if (s.reportContext.buffer) s.submissionMode = 'buffer_catchup';
        s.reportKind = options && options.reportKind || s.reportKind;
        s.qualityPercent = null;
        s.seriesExpanded = false;
        s.seriesMediaCount = 0;
        el('unified-report-info').dataset.renderKey = '';
        s.expectedDay = s.reportContext.day;
        s.expectedRun = Number(test.run_iteration || 1);
        s.expectedStart = String(test.start_date || '').slice(0, 10);
        s.catchupRequestId = Number(s.reportContext.target && s.reportContext.target.id || 0);
        el('t-reportModalTitle').textContent = t('title');
        document.querySelector('.unified-report-body').prepend(el('report-modal-heading'));
        el('unified-report-format-label').textContent = t('formatLabel');
        el('unified-report-note').value = s.note;
        el('t-reportModalHint').textContent = t('day', { day: s.expectedDay, name: test.name || '' });
        el('t-checkinProofChoose').textContent = t('media');
        el('t-checkinProofLimits').textContent = t('limits');
        if (typeof window.syncCheckinDeveloperAccordion === 'function') {
            window.syncCheckinDeveloperAccordion(Number(test.id), test.owner_username || '', 'report-developer');
        }
        document.querySelectorAll('.unified-report-formats [data-report-kind]').forEach(function (button) {
            button.querySelector('span').textContent = t(button.dataset.reportKind);
            button.disabled = (button.dataset.reportKind === 'bug' && test.accepts_bugs === false)
                || (button.dataset.reportKind === 'idea' && test.accepts_ideas === false);
        });
        var note = el('unified-report-catchup');
        var c = s.reportContext;
        note.replaceChildren();
        note.hidden = !c.requests.length;
        if (c.requests.length) {
            var title = document.createElement('strong');
            title.textContent = t('catchup', { day: c.requests[0].missed_testing_day });
            var detail = document.createElement('p');
            detail.textContent = t(c.control ? 'catchupControl' : (c.buffer ? 'catchupBuffer' : (typeof isTestedToday === 'function' && isTestedToday(test) ? 'catchupDone' : 'catchupDaily')));
            note.append(title, detail);
            if (c.requests.length > 1) {
                var more = document.createElement('small');
                more.textContent = t('more', { days: c.requests.slice(1).map(function (r) { return r.missed_testing_day; }).join(', ') });
                note.append(more);
            }
        }
        var review = el('unified-report-review');
        review.hidden = !test.request_reviews || c.day < 7 || c.buffer || !!options && options.catchupRequested;
        review.disabled = c.day < 7;
        review.textContent = t(c.day < 7 ? 'reviewLater' : 'review');
        review.onclick = function () {
            // Keep this draft in memory while the independent review sheet is open.
            window._unifiedReportReviewDraft = { appId: s.appId, generation: s.selectionGeneration, actor: String(userId) };
            el('report-modal').classList.remove('active');
            openPlayReviewModal(Number(test.id), null, { source: 'checkin' });
        };
        el('unified-report-plain').hidden = c.control || c.buffer || Number(test.checkins_count || 0) === 0;
        el('unified-report-plain').onclick = function () {
            if (this.disabled) return;
            closeReportModal();
            confirmStart(Number(test.id));
        };
        window.clearInterval(window._unifiedReportTimer);
        window._unifiedReportTimer = window.setInterval(window.syncUnifiedReport, 500);
        window.setUnifiedReportKind(s.reportKind);
        el('unified-report-note').onfocus = function () {
            if (typeof collapseCheckinDeveloperAccordion === 'function') collapseCheckinDeveloperAccordion('report-developer');
            requestAnimationFrame(keepReportInputVisible);
        };
        el('unified-report-note').onblur = function () {
            this.style.removeProperty('max-height');
            this.style.removeProperty('min-height');
        };
        syncReportViewport();
        if (window.visualViewport && !window._reportViewportBound) {
            window.visualViewport.addEventListener('resize', syncReportViewport);
            window.visualViewport.addEventListener('scroll', syncReportViewport);
            window._reportViewportBound = true;
        }
    };
    window.resumeUnifiedReportAfterReview = function () {
        var draft = window._unifiedReportReviewDraft;
        window._unifiedReportReviewDraft = null;
        if (!draft || draft.appId !== state().appId || draft.generation !== state().selectionGeneration
            || draft.actor !== String(userId)) return;
        el('report-modal').classList.add('active');
        syncReportViewport();
        window.syncUnifiedReport();
    };
    window.setUnifiedReportKind = function (kind) {
        if (['screenshot', 'bug', 'idea'].indexOf(kind) < 0) return;
        var s = state();
        s.reportKind = kind;
        el('report-modal').dataset.reportKind = kind;
        document.querySelectorAll('.unified-report-formats [data-report-kind]').forEach(function (button) {
            var selected = button.dataset.reportKind === kind;
            button.classList.toggle('is-selected', selected);
            button.setAttribute('aria-pressed', String(selected));
        });
        var note = el('unified-report-note');
        note.placeholder = t(kind === 'screenshot' ? 'note' : kind + 'Placeholder');
        el('unified-report-note-label').textContent = t(kind === 'screenshot' ? 'noteLabel' : kind + 'Label');
        note.removeAttribute('maxlength');
        note.rows = kind === 'screenshot' ? 2 : 4;
        note.required = kind !== 'screenshot';
        if (kind !== 'screenshot') loadQuality();
        window.syncUnifiedReport();
    };
    window.syncUnifiedReport = function () {
        if (!el('unified-report-note')) return;
        var s = state(), c = s.reportContext || {};
        s.note = el('unified-report-note').value;
        var length = Array.from(s.note.trim().replace(/\s+/g, ' ')).length;
        var files = s.files || [];
        var images = files.filter(function (file) { return file.type.indexOf('image/') === 0; }).length;
        var rawLength = Array.from(s.note.trim()).length;
        var limit = s.reportKind === 'screenshot' ? 500 : 1000;
        var validText = s.reportKind === 'screenshot' ? rawLength <= limit : length >= 24 && rawLength <= limit && /[\p{L}\p{N}]/u.test(s.note);
        // A standard report and any catch-up need media. Bug/idea on a regular day can be text-only.
        var needsMedia = s.reportKind === 'screenshot' || c.control || c.firstMandatory || c.buffer || !!c.target;
        var submit = el('checkin-proof-submit');
        submit.disabled = s.checkingFiles || !validText || (needsMedia && !files.length);
        el('t-checkinProofSubmit').textContent = t(c.buffer ? 'catchupSend' : (s.reportKind === 'bug' ? 'sendBug' : s.reportKind === 'idea' ? 'sendIdea' : 'send'));
        var counter = el('unified-report-count');
        counter.textContent = rawLength > limit ? t('excess', {count: rawLength - limit})
            : s.reportKind === 'screenshot' ? rawLength + '/500' : length < 24 ? String(24 - length) : '';
        counter.classList.toggle('is-required', s.reportKind !== 'screenshot' && length < 24 || rawLength > limit);
        var test = typeof myTests !== 'undefined' && myTests.find(function (row) { return Number(row.id) === Number(s.appId); });
        var seriesEligible = !c.buffer && !(test && typeof isTestedToday === 'function' && isTestedToday(test));
        var videos = files.filter(function (file) { return file.type.indexOf('video/') === 0; }).length;
        renderReportInfo(images, videos, seriesEligible);
        var singleHint = el('unified-report-single-hint');
        singleHint.hidden = images !== 1 || videos > 0;
        singleHint.textContent = t('singleHint');
        var plain = el('unified-report-plain');
        var timer = typeof _getTimerReadyPayload === 'function' ? _getTimerReadyPayload(s.appId)
            : typeof _timerReadyState !== 'undefined' && _timerReadyState[String(s.appId)];
        var ready = !!timer;
        if (typeof isCheckinTimerReadyForConfirm === 'function') ready = isCheckinTimerReadyForConfirm(s.appId);
        plain.disabled = !ready;
        var seconds = typeof getCheckinTimerRemainingSeconds === 'function' ? getCheckinTimerRemainingSeconds(s.appId) : 0;
        if (!seconds && !ready && typeof _getReusableCheckinOpenMeta === 'function') {
            var meta = _getReusableCheckinOpenMeta(s.appId);
            if (meta) seconds = Math.max(0, Math.ceil((Number(meta.readyAtMs || 0) - _checkinTokenNow(meta)) / 1000));
        }
        plain.classList.toggle('is-waiting', !ready);
        plain.textContent = t(ready ? 'plain' : seconds > 0 ? 'waiting' : 'openFirst', {seconds:seconds});
    };

    function syncReportViewport() {
        var sheet = document.querySelector('#report-modal .report-modal-sheet');
        var modal = el('report-modal'), vv = window.visualViewport;
        if (sheet && vv && modal.classList.contains('active') && modal.classList.contains('is-proof-upload')) {
            sheet.style.setProperty('--report-height', Math.floor(vv.height * .92) + 'px');
            // Do not infer keyboard size from innerHeight: Android and iOS resize different viewports.
            modal.style.top = vv.offsetTop + 'px'; modal.style.height = vv.height + 'px'; modal.style.bottom = 'auto';
        }
        requestAnimationFrame(keepReportInputVisible);
    }

    function keepReportInputVisible() {
        var input = el('unified-report-note'), body = document.querySelector('.unified-report-body');
        if (document.activeElement !== input || !el('report-modal').classList.contains('active')) return;
        var available = Math.max(56, body.clientHeight - 12);
        input.style.maxHeight = available + 'px'; input.style.minHeight = Math.min(82, available) + 'px';
        var field = input.getBoundingClientRect(), bounds = body.getBoundingClientRect();
        if (field.bottom > bounds.bottom - 6) body.scrollTop += field.bottom - bounds.bottom + 6;
        else if (field.top < bounds.top + 6) body.scrollTop -= bounds.top - field.top + 6;
    }

    function renderReportInfo(images, videos, eligible) {
        var s = state(), info = el('unified-report-info');
        var mediaCount = images + videos;
        if (mediaCount > (s.seriesMediaCount || 0)) s.seriesExpanded = true;
        else if (!mediaCount && s.seriesMediaCount) s.seriesExpanded = false;
        s.seriesMediaCount = mediaCount;
        var key = [s.reportKind, images, videos, eligible, s.qualityPercent, !!s.seriesExpanded, typeof lang === 'undefined' ? 'en' : lang].join(':');
        if (info.dataset.renderKey === key) return;
        info.dataset.renderKey = key;
        var series = el('unified-report-series'), quality = el('unified-report-quality');
        var screenshot = s.reportKind === 'screenshot';
        series.hidden = false;
        quality.hidden = true;
        var escape = window.escapeHTML;
        var mediaBonus = eligible ? Math.min(5, Math.max(0, Math.min(5, images) - 2) + (videos ? 3 : 0)) / 10 : 0;
        var total = mediaBonus + (screenshot ? 0 : .5);
        var amount = (total || .1).toFixed(1).replace('.', typeof lang !== 'undefined' && lang === 'ru' ? ',' : '.');
        var chip = 'checkin-proof-bonus-chip ' + (total ? 'is-active' : 'is-inactive');
        if (eligible && (images >= 4 || videos)) chip += ' is-boosted';
        if (eligible && (videos ? mediaBonus >= .5 : mediaBonus >= .3)) chip += ' is-boosted is-max';
        var icon = typeof CHECKIN_PROOF_KARMA_ICON_HTML !== 'undefined' ? CHECKIN_PROOF_KARMA_ICON_HTML : '';
        var label = !eligible && screenshot ? t('noDailyBonus') : t('bonusLabel', {amount:amount});
        series.innerHTML = '<button type="button" class="report-info-top report-info-toggle" aria-expanded="' + !!s.seriesExpanded + '" aria-controls="unified-report-info-details" onclick="toggleUnifiedReportSeries()"><span>' + escape(t(videos ? 'mediaCount' : images ? 'seriesCount' : 'seriesTitle', {count:mediaCount})) + '</span>'
            + '<span class="' + chip + '">' + escape(label) + (eligible || !screenshot ? ' ' + icon : '') + '</span></button>'
            + '<div id="unified-report-info-details"' + (s.seriesExpanded ? '' : ' hidden') + '>'
            + '<div class="report-info-progress" aria-hidden="true">' + [1,2,3,4,5].map(function (n) { return '<i class="' + (images + videos >= n ? 'is-filled' : '') + '"></i>'; }).join('') + '</div>'
            + '<p class="report-info-detail">' + (screenshot ? escape(t('privacy')) : escape(t('qualityHint'))
                + ' <span class="report-quality-value">' + escape(s.qualityPercent == null ? '—' : s.qualityPercent) + '</span>') + '</p></div>';
    }
    window.toggleUnifiedReportSeries = function () {
        state().seriesExpanded = !state().seriesExpanded;
        window.syncUnifiedReport();
        var toggle = document.querySelector('#unified-report-series .report-info-toggle');
        if (toggle) toggle.focus({preventScroll:true});
    };

    var qualityCache = new Map();
    function loadQuality() {
        var actor = String(typeof userId !== 'undefined' ? userId : '');
        var cache = qualityCache.get(actor);
        if (!cache || cache.expires < Date.now()) {
            cache = { expires: Date.now() + 300000, promise: Promise.resolve().then(function () {
                return fetch(API_BASE + '/checkin-reports/quality?init_data=' + encodeURIComponent(getTelegramInitDataRaw()));
            }).then(function (response) { if (!response.ok) throw new Error('quality'); return response.json(); }) };
            qualityCache.set(actor, cache);
        }
        cache.promise.then(function (result) {
            if (String(userId) !== actor || state().reportKind === 'screenshot') return;
            var percent = result.acceptance_rate_pct == null ? '—' : Number(result.acceptance_rate_pct).toFixed(0) + '%';
            state().qualityPercent = percent;
            window.syncUnifiedReport();
        }).catch(function () {});
    }

    // History stores vectors (including colour/width), never full-image snapshots.
    var editor = null, editorRequest = 0;
    function editorIcon(name) {
        var paths = {
            undo: '<path d="M9 5 3 10l6 5M3 10h10a7 7 0 0 1 7 7v2"/>',
            redo: '<path d="m15 5 6 5-6 5m6-5H11a7 7 0 0 0-7 7v2"/>',
            pen: '<path d="m5 16 11-11 3 3L8 19H5v-3Zm9-9 3 3M4 22h16"/>',
            arrow: '<path d="M5 19 19 5M8 5h11v11"/>',
            cover: '<rect x="4" y="5" width="16" height="14" rx="3" fill="currentColor" stroke="none"/>'
        };
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[name] + '</svg>';
    }
    window.openReportImageEditor = function (index) {
        var s = state(), file = s.files[index];
        if (!file || file.type.indexOf('image/') !== 0 || s.checkingFiles) return;
        window.closeReportImageEditor();
        var request = editorRequest, generation = s.selectionGeneration, returnFocus = document.activeElement;
        var image = new Image(), url = URL.createObjectURL(file);
        image.onload = function () {
            URL.revokeObjectURL(url);
            if (request !== editorRequest || generation !== state().selectionGeneration || state().files[index] !== file) return;
            var overlay = document.createElement('div');
            overlay.className = 'report-editor modal-overlay active';
            overlay.id = 'report-image-editor';
            // Register with the app's existing Back-layer discovery.
            overlay.onclick = function (event) { if (event.target === overlay) window.closeReportImageEditor(); };
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', t('editorTitle'));
            overlay.innerHTML = '<div class="report-editor__tools"><button type="button" data-action="cancel"></button><div class="report-editor__history"><button type="button" data-action="undo"></button><button type="button" data-action="redo"></button></div><button type="button" data-action="done"></button></div>'
                + '<div class="report-editor__stage"><canvas></canvas></div>'
                + '<div class="report-editor__dock"><div class="report-editor__modes"></div><div class="report-editor__settings"><div class="report-editor__palette" role="group"></div>'
                + '<label class="report-editor__width"><span class="unified-report-sr"></span><input type="range" min="2" max="14" step="1" value="5"><output>5</output></label></div></div>';
            var canvas = overlay.querySelector('canvas');
            var scale = Math.min(1, 2560 / Math.max(image.naturalWidth, image.naturalHeight));
            canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
            var current = { overlay: overlay, canvas: canvas, image: image, steps: [], redoStack: [],
                tool: 'pen', color: '#ff5148', width: 5, active: null, saving: false, frame: 0,
                index: index, file: file, generation: generation, returnFocus: returnFocus };
            editor = current;
            var undo = overlay.querySelector('[data-action="undo"]'), redo = overlay.querySelector('[data-action="redo"]');
            ['undo', 'redo'].forEach(function (action) {
                var button = overlay.querySelector('[data-action="' + action + '"]');
                button.innerHTML = editorIcon(action);
                button.setAttribute('aria-label', t(action)); button.title = t(action);
            });
            ['cancel', 'done'].forEach(function (action) { overlay.querySelector('[data-action="' + action + '"]').textContent = t(action); });
            var modes = overlay.querySelector('.report-editor__modes');
            ['pen','arrow','cover'].forEach(function (tool) {
                var button = document.createElement('button'); button.type = 'button'; button.dataset.tool = tool;
                button.innerHTML = editorIcon(tool) + '<span></span>';
                button.querySelector('span').textContent = t(tool);
                button.onclick = function () { if (!current.saving) { current.tool = tool; updateControls(); } };
                modes.appendChild(button);
            });
            var palette = overlay.querySelector('.report-editor__palette');
            palette.setAttribute('aria-label', typeof lang !== 'undefined' && lang === 'ru' ? 'Цвет линии' : 'Line colour');
            [['#ff5148','colorRed'],['#59ce8a','colorGreen'],['#62a3ff','colorBlue'],['#ffffff','colorWhite'],['#000000','colorBlack']].forEach(function (entry) {
                var button = document.createElement('button'); button.type = 'button'; button.dataset.color = entry[0];
                button.style.setProperty('--swatch', entry[0]); button.setAttribute('aria-label', t(entry[1])); button.title = t(entry[1]);
                button.onclick = function () { current.color = entry[0]; updateControls(); };
                palette.appendChild(button);
            });
            var width = overlay.querySelector('input[type="range"]'), widthOutput = overlay.querySelector('output');
            width.setAttribute('aria-label', t('thickness'));
            overlay.querySelector('.report-editor__width .unified-report-sr').textContent = t('thickness');
            width.oninput = function () { current.width = Number(width.value); widthOutput.textContent = width.value; };
            function updateControls() {
                var locked = current.saving || !!current.active;
                undo.disabled = locked || !current.steps.length;
                redo.disabled = locked || !current.redoStack.length;
                modes.querySelectorAll('button').forEach(function (button) {
                    button.disabled = locked; button.setAttribute('aria-pressed', String(button.dataset.tool === current.tool));
                });
                palette.querySelectorAll('button').forEach(function (button) {
                    button.disabled = locked || current.tool === 'cover';
                    button.setAttribute('aria-pressed', String(button.dataset.color === (current.tool === 'cover' ? '#000000' : current.color)));
                });
                width.disabled = locked || current.tool === 'cover';
                widthOutput.textContent = current.tool === 'cover' ? '24' : String(current.width);
                overlay.querySelector('[data-action="done"]').disabled = locked;
            }
            function redraw() {
                current.frame = 0;
                if (editor !== current) return;
                var ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                current.steps.forEach(function (stroke) {
                    var points = stroke.points, first = points[0], last = points[points.length - 1];
                    ctx.strokeStyle = stroke.color; ctx.fillStyle = stroke.color;
                    ctx.lineWidth = stroke.width * canvas.width / 360;
                    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
                    if (points.length === 1) {
                        ctx.arc(first.x, first.y, ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fill(); return;
                    }
                    ctx.moveTo(first.x, first.y);
                    if (stroke.tool === 'arrow') {
                        var angle = Math.atan2(last.y - first.y, last.x - first.x);
                        var size = Math.max(ctx.lineWidth * 3, canvas.width / 26);
                        ctx.lineTo(last.x, last.y);
                        ctx.moveTo(last.x - size * Math.cos(angle - Math.PI / 6), last.y - size * Math.sin(angle - Math.PI / 6));
                        ctx.lineTo(last.x, last.y);
                        ctx.lineTo(last.x - size * Math.cos(angle + Math.PI / 6), last.y - size * Math.sin(angle + Math.PI / 6));
                    } else points.slice(1).forEach(function (p) { ctx.lineTo(p.x, p.y); });
                    ctx.stroke();
                });
            }
            function scheduleDraw() { if (!current.frame) current.frame = requestAnimationFrame(redraw); }
            function point(event) {
                var r = canvas.getBoundingClientRect();
                return { x: (event.clientX - r.left) * canvas.width / r.width, y: (event.clientY - r.top) * canvas.height / r.height };
            }
            canvas.onpointerdown = function (event) {
                if (editor !== current || !event.isPrimary || event.button !== 0 || current.saving || current.active) return;
                event.preventDefault(); canvas.setPointerCapture(event.pointerId);
                current.redoStack = [];
                current.active = { tool: current.tool, color: current.tool === 'cover' ? '#000000' : current.color,
                    width: current.tool === 'cover' ? 24 : current.width, points: [point(event)] };
                current.steps.push(current.active); updateControls(); scheduleDraw();
            };
            canvas.onpointermove = function (event) {
                if (editor !== current || !current.active || !event.isPrimary) return;
                if (current.active.tool === 'arrow') current.active.points[1] = point(event);
                else current.active.points.push(point(event));
                scheduleDraw();
            };
            canvas.onpointerup = canvas.onpointercancel = canvas.onlostpointercapture = function () {
                if (editor !== current) return;
                current.active = null; updateControls(); scheduleDraw();
            };
            undo.onclick = function () { if (undo.disabled) return; current.redoStack.push(current.steps.pop()); updateControls(); scheduleDraw(); };
            redo.onclick = function () { if (redo.disabled) return; current.steps.push(current.redoStack.pop()); updateControls(); scheduleDraw(); };
            overlay.querySelector('[data-action="cancel"]').onclick = window.closeReportImageEditor;
            overlay.onkeydown = function (event) {
                if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); window.closeReportImageEditor(); }
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
                    event.preventDefault(); (event.shiftKey ? redo : undo).click();
                }
                if (event.key === 'Tab') {
                    var controls = Array.from(overlay.querySelectorAll('button:not(:disabled),input:not(:disabled)'));
                    var first = controls[0], last = controls[controls.length - 1];
                    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
                }
            };
            overlay.querySelector('[data-action="done"]').onclick = function () {
                if (current.saving || current.active) return;
                if (!current.steps.length) return window.closeReportImageEditor();
                current.saving = true; current.ownsChecking = true; state().checkingFiles = true;
                overlay.classList.add('is-saving'); overlay.setAttribute('aria-busy', 'true'); updateControls();
                cancelAnimationFrame(current.frame); redraw();
                function recover(message) {
                    if (editor !== current) return;
                    current.saving = false; current.ownsChecking = false; state().checkingFiles = false;
                    overlay.classList.remove('is-saving'); overlay.removeAttribute('aria-busy'); updateControls(); _syncCheckinProofControls();
                    if (typeof showToast === 'function') showToast(message);
                }
                try {
                    canvas.toBlob(async function (blob) {
                        if (editor !== current || generation !== state().selectionGeneration || state().files[index] !== file) return;
                        if (!blob) return recover(t('editorFailed'));
                        if (blob.size > 5 * 1024 * 1024) return recover(t('videoLimit'));
                        var replacement = new File([blob], file.name.replace(/\.[^.]+$/, '') + '-marked.jpg', { type: 'image/jpeg', lastModified: Date.now() });
                        try {
                            var fingerprint = await _checkinProofFileFingerprint(replacement);
                            if (editor !== current || generation !== state().selectionGeneration || state().files[index] !== file) return;
                            URL.revokeObjectURL(state().previewUrls[index]);
                            state().files[index] = replacement; state().fingerprints[index] = fingerprint;
                            state().previewUrls[index] = URL.createObjectURL(replacement);
                            state().idempotencyKey = _newCheckinProofUuid();
                            _renderCheckinProofPreviews();
                            window.closeReportImageEditor();
                        } catch (_) { recover(t('editorFailed')); }
                    }, 'image/jpeg', .9);
                } catch (_) { recover(t('editorFailed')); }
            };
            document.body.appendChild(overlay);
            var stage = overlay.querySelector('.report-editor__stage');
            current.fitCanvas = function () {
                if (editor !== current) return;
                var fit = Math.min(stage.clientWidth / canvas.width, stage.clientHeight / canvas.height);
                canvas.style.width = Math.max(1, canvas.width * fit) + 'px';
                canvas.style.height = Math.max(1, canvas.height * fit) + 'px';
            };
            if (typeof ResizeObserver !== 'undefined') {
                current.resizeObserver = new ResizeObserver(current.fitCanvas);
                current.resizeObserver.observe(stage);
            } else window.addEventListener('resize', current.fitCanvas);
            current.fitCanvas(); updateControls(); redraw();
            if (typeof window.syncTelegramBackButton === 'function') window.syncTelegramBackButton();
            overlay.querySelector('[data-action="cancel"]').focus({ preventScroll: true });
        };
        image.onerror = function () { URL.revokeObjectURL(url); if (request === editorRequest && typeof showToast === 'function') showToast(t('editorFailed')); };
        image.src = url;
    };
    window.closeReportImageEditor = function () {
        editorRequest += 1;
        if (!editor) return;
        var current = editor; editor = null;
        cancelAnimationFrame(current.frame);
        if (current.resizeObserver) current.resizeObserver.disconnect();
        else window.removeEventListener('resize', current.fitCanvas);
        if (current.ownsChecking && current.generation === state().selectionGeneration) {
            state().checkingFiles = false; _syncCheckinProofControls();
        }
        current.overlay.remove();
        if (typeof window.syncTelegramBackButton === 'function') window.syncTelegramBackButton();
        var preview = el('checkin-proof-preview-grid').children[current.index];
        var focus = current.returnFocus && current.returnFocus.isConnected ? current.returnFocus
            : preview && preview.querySelector('.checkin-proof-preview-edit');
        if (focus) focus.focus({ preventScroll: true });
    };
})();
