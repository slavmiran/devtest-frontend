/* One local-only render path for the frequently used report sheet. */
(function () {
    'use strict';
    var COPY = {
        ru: {
            title: 'Подтверждение теста', mediaLabel: '1 · Медиафайлы', formatLabel: '2 · Формат отчёта',
            noteLabel: '3 · Комментарий', bugLabel: '3 · Опишите проблему', ideaLabel: '3 · Предложите улучшение',
            bugPlaceholder: 'Что произошло? Что вы ожидали? Как повторить проблему?',
            ideaPlaceholder: 'Что стоит улучшить и как это поможет пользователям?',
            waiting: 'Быстрое подтверждение — после таймера',
            media: 'Фото или видео', limits: 'До 5 файлов · фото до 5 МБ · видео до 50 МБ',
            screenshot: 'Скриншот', bug: 'Баг', idea: 'Идея', note: 'Что стоит заметить? Необязательно.',
            description: 'Что произошло или что предлагаете улучшить?',
            quality: 'После принятия владельцем: +0,5 кармы. Спам и пустые отчёты снижают рейтинг.',
            accepted: 'Принято ваших фидбэков: {percent} · ',
            send: 'Подтвердить тестирование', sendBug: 'Отправить баг и подтвердить день', sendIdea: 'Отправить идею и подтвердить день',
            catchupSend: 'Отправить досдачу', plain: 'Просто подтвердить день — без отчёта',
            review: 'Отзыв в Google Play', reviewLater: 'Отзыв Google Play доступен с дня 7',
            day: 'День {day} · {name}', close: 'Закрыть', edit: 'Разметить изображение',
            done: 'Готово', undo: 'Отменить шаг', cancel: 'Отмена', pen: 'Маркер', arrow: 'Стрелка', cover: 'Закрасить',
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
            title: 'Confirm testing', mediaLabel: '1 · Media', formatLabel: '2 · Report type',
            noteLabel: '3 · Comment', bugLabel: '3 · Describe the issue', ideaLabel: '3 · Suggest an improvement',
            bugPlaceholder: 'What happened? What did you expect? How can it be reproduced?',
            ideaPlaceholder: 'What could be improved, and how would it help users?',
            waiting: 'Quick confirmation unlocks after the timer',
            media: 'Photos or video', limits: 'Up to 5 files · photos up to 5 MB · videos up to 50 MB',
            screenshot: 'Screenshot', bug: 'Bug', idea: 'Idea', note: 'Anything to point out? Optional.',
            description: 'What happened, or what would you improve?',
            quality: '+0.5 karma after the owner accepts it. Spam and empty reports lower your rating.',
            accepted: 'Your accepted feedback: {percent} · ',
            send: 'Confirm testing', sendBug: 'Send bug and confirm day', sendIdea: 'Send idea and confirm day',
            catchupSend: 'Submit make-up report', plain: 'Just confirm today — no report',
            review: 'Google Play review', reviewLater: 'Google Play reviews unlock on day 7',
            day: 'Day {day} · {name}', close: 'Close', edit: 'Annotate image',
            done: 'Done', undo: 'Undo', cancel: 'Cancel', pen: 'Marker', arrow: 'Arrow', cover: 'Redact',
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
            report_description_too_short: ['Опишите баг или идею: минимум 25 символов.', 'Describe the bug or idea in at least 25 characters.'],
            report_text_too_long: ['Заметка — до 500 символов, описание — до 4000.', 'Notes: up to 500 characters. Descriptions: up to 4000.'],
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
        s.expectedDay = s.reportContext.day;
        s.expectedRun = Number(test.run_iteration || 1);
        s.expectedStart = String(test.start_date || '').slice(0, 10);
        s.catchupRequestId = Number(s.reportContext.target && s.reportContext.target.id || 0);
        el('t-reportModalTitle').textContent = t('title');
        el('unified-report-media-label').textContent = t('mediaLabel');
        el('unified-report-format-label').textContent = t('formatLabel');
        el('unified-report-note').value = s.note;
        el('t-reportModalHint').textContent = t('day', { day: s.expectedDay, name: test.name || '' });
        el('t-checkinProofChoose').textContent = t('media');
        el('t-checkinProofLimits').textContent = t('limits');
        el('unified-report-close').setAttribute('aria-label', t('close'));
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
        var viewport = function () {
            var sheet = document.querySelector('#report-modal .report-modal-sheet');
            if (sheet && window.visualViewport) sheet.style.setProperty('--report-height', Math.floor(window.visualViewport.height * .92) + 'px');
        };
        viewport();
        if (window.visualViewport && !window._reportViewportBound) {
            window.visualViewport.addEventListener('resize', viewport);
            window._reportViewportBound = true;
        }
    };
    window.resumeUnifiedReportAfterReview = function () {
        var draft = window._unifiedReportReviewDraft;
        window._unifiedReportReviewDraft = null;
        if (!draft || draft.appId !== state().appId || draft.generation !== state().selectionGeneration
            || draft.actor !== String(userId)) return;
        el('report-modal').classList.add('active');
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
        note.maxLength = kind === 'screenshot' ? 500 : 4000;
        note.rows = kind === 'screenshot' ? 2 : 4;
        note.required = kind !== 'screenshot';
        el('unified-report-quality').hidden = kind === 'screenshot';
        el('unified-report-quality').textContent = t('quality');
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
        var validText = s.reportKind === 'screenshot' ? Array.from(s.note).length <= 500 : length >= 25 && length <= 4000 && /[\p{L}\p{N}]/u.test(s.note);
        // A standard report and any catch-up need media. Bug/idea on a regular day can be text-only.
        var needsMedia = s.reportKind === 'screenshot' || c.control || c.firstMandatory || c.buffer || !!c.target;
        var submit = el('checkin-proof-submit');
        submit.disabled = s.checkingFiles || !validText || (needsMedia && !files.length);
        el('t-checkinProofSubmit').textContent = t(c.buffer ? 'catchupSend' : (s.reportKind === 'bug' ? 'sendBug' : s.reportKind === 'idea' ? 'sendIdea' : 'send'));
        el('unified-report-count').textContent = s.reportKind === 'screenshot' ? length + '/500' : (length < 25 ? length + '/25' : length + '/4000');
        var series = el('unified-report-series');
        var test = typeof myTests !== 'undefined' && myTests.find(function (row) { return Number(row.id) === Number(s.appId); });
        var seriesEligible = !c.buffer && !(test && typeof isTestedToday === 'function' && isTestedToday(test));
        series.hidden = !images || !seriesEligible;
        // Reuse the familiar 3 + 2 segment indicator. Never count videos as photos.
        var seriesKey = images + ':' + seriesEligible + ':' + lang;
        if (series.dataset.renderKey !== seriesKey) {
            series.innerHTML = seriesEligible ? _renderCheckinProofProgress(images) : '';
            series.dataset.renderKey = seriesKey;
        }
        if (s.reportKind !== 'screenshot') {
            el('unified-report-quality').textContent = (s.qualityPercent != null ? t('accepted', { percent: s.qualityPercent }) : '')
                + t('quality') + (images >= 3 && seriesEligible ? ' ' + t('sum') : '');
        }
        var plain = el('unified-report-plain');
        var timer = typeof _getTimerReadyPayload === 'function' ? _getTimerReadyPayload(s.appId)
            : typeof _timerReadyState !== 'undefined' && _timerReadyState[String(s.appId)];
        var ready = !!timer;
        if (typeof isCheckinTimerReadyForConfirm === 'function') ready = isCheckinTimerReadyForConfirm(s.appId);
        plain.disabled = !ready;
        plain.textContent = t(ready ? 'plain' : 'waiting');
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

    // The editor keeps vector steps, not one full-resolution bitmap per Undo.
    var editor = null;
    window.openReportImageEditor = function (index) {
        var s = state(), file = s.files[index];
        if (!file || file.type.indexOf('image/') !== 0 || s.checkingFiles) return;
        var image = new Image();
        var url = URL.createObjectURL(file), generation = s.selectionGeneration;
        image.onload = function () {
            URL.revokeObjectURL(url);
            if (generation !== state().selectionGeneration || state().files[index] !== file) return;
            var overlay = document.createElement('div');
            overlay.className = 'report-editor';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.innerHTML = '<div class="report-editor__tools"><button type="button" data-action="cancel"></button><div class="report-editor__modes"><button type="button" data-tool="pen"></button><button type="button" data-tool="arrow"></button><button type="button" data-tool="cover"></button></div><button type="button" data-action="done"></button></div><p></p><div class="report-editor__stage"><canvas></canvas></div><button type="button" data-action="undo"></button>';
            overlay.querySelector('p').textContent = t('annotate');
            ['cancel', 'done', 'undo'].forEach(function (a) { overlay.querySelector('[data-action="' + a + '"]').textContent = t(a); });
            overlay.querySelectorAll('[data-tool]').forEach(function (b) {
                b.textContent = {pen:'✎',arrow:'↗',cover:'▰'}[b.dataset.tool];
                b.setAttribute('aria-label', t(b.dataset.tool)); b.title = t(b.dataset.tool);
                b.setAttribute('aria-pressed', String(b.dataset.tool === 'pen'));
                b.onclick = function () {
                    editor.tool = b.dataset.tool;
                    overlay.querySelectorAll('[data-tool]').forEach(function (tool) {
                        tool.setAttribute('aria-pressed', String(tool === b));
                    });
                };
            });
            var canvas = overlay.querySelector('canvas');
            var scale = Math.min(1, 2560 / Math.max(image.naturalWidth, image.naturalHeight));
            canvas.width = Math.round(image.naturalWidth * scale);
            canvas.height = Math.round(image.naturalHeight * scale);
            editor = { overlay: overlay, canvas: canvas, image: image, steps: [], tool: 'pen', index: index, file: file, generation: generation };
            var redraw = function () {
                var ctx = canvas.getContext('2d');
                ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                editor.steps.forEach(function (stroke) {
                    ctx.strokeStyle = stroke.tool === 'cover' ? '#000' : '#ff453a';
                    ctx.lineWidth = Math.max(4, canvas.width / (stroke.tool === 'cover' ? 22 : 180));
                    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
                    var points = stroke.points;
                    ctx.moveTo(points[0].x, points[0].y);
                    if (stroke.tool === 'arrow') {
                        var end = points[points.length - 1], start = points[0], angle = Math.atan2(end.y - start.y, end.x - start.x), size = canvas.width / 24;
                        ctx.lineTo(end.x, end.y); ctx.moveTo(end.x - size * Math.cos(angle - Math.PI / 6), end.y - size * Math.sin(angle - Math.PI / 6));
                        ctx.lineTo(end.x, end.y); ctx.lineTo(end.x - size * Math.cos(angle + Math.PI / 6), end.y - size * Math.sin(angle + Math.PI / 6));
                    } else points.forEach(function (p) { ctx.lineTo(p.x, p.y); });
                    ctx.stroke();
                });
            };
            function point(event) { var r = canvas.getBoundingClientRect(); return { x: (event.clientX - r.left) * canvas.width / r.width, y: (event.clientY - r.top) * canvas.height / r.height }; }
            canvas.onpointerdown = function (event) { if (!event.isPrimary) return; event.preventDefault(); canvas.setPointerCapture(event.pointerId); editor.active = { tool: editor.tool, points: [point(event)] }; editor.steps.push(editor.active); redraw(); };
            canvas.onpointermove = function (event) { if (!editor.active || !event.isPrimary) return; editor.active.points.push(point(event)); redraw(); };
            canvas.onpointerup = canvas.onpointercancel = function () { editor.active = null; };
            overlay.querySelector('[data-action="undo"]').onclick = function () { editor.steps.pop(); redraw(); };
            overlay.querySelector('[data-action="cancel"]').onclick = window.closeReportImageEditor;
            overlay.querySelector('[data-action="done"]').onclick = function () {
                var current = editor;
                if (!current.steps.length) return window.closeReportImageEditor();
                this.disabled = true;
                canvas.toBlob(async function (blob) {
                    if (!blob || editor !== current || generation !== state().selectionGeneration || state().files[index] !== file) return;
                    var replacement = new File([blob], file.name.replace(/\.[^.]+$/, '') + '-marked.jpg', { type: 'image/jpeg', lastModified: Date.now() });
                    if (blob.size > 5 * 1024 * 1024) { showToast(t('videoLimit')); current.overlay.querySelector('[data-action="done"]').disabled = false; return; }
                    state().checkingFiles = true;
                    try {
                        var fingerprint = await _checkinProofFileFingerprint(replacement);
                        if (generation !== state().selectionGeneration || state().files[index] !== file) return;
                        URL.revokeObjectURL(state().previewUrls[index]);
                        state().files[index] = replacement;
                        state().fingerprints[index] = fingerprint;
                        state().previewUrls[index] = URL.createObjectURL(replacement);
                        // Editing a retry is a new submission, never a mutation of an accepted UUID.
                        state().idempotencyKey = _newCheckinProofUuid();
                        _renderCheckinProofPreviews();
                    } finally { state().checkingFiles = false; _syncCheckinProofControls(); window.closeReportImageEditor(); }
                }, 'image/jpeg', 0.9);
            };
            document.body.append(overlay); redraw();
        };
        image.onerror = function () { URL.revokeObjectURL(url); };
        image.src = url;
    };
    window.closeReportImageEditor = function () { if (editor) editor.overlay.remove(); editor = null; };
})();
