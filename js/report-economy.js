/* Pace line and the rewards sheet above the report form. */
(function () {
    'use strict';
    var cache = { key: '', data: null, at: 0 };
    var COPY = {
        ru: {
            chipEmpty: '✦ 0 · от 3 фото ›', chip: '✦ +{n} ›', chipWait: '✦ +{n} ⏳ ›',
            paceSlow: '⚠️ Темп Квот {pct} · {reason} ›',
            paceFloor: '⚡ Темп Квот {pct} · бронь Спринта #{season} · сейчас #{rank} ›',
            paceUp: '⚡ Темп Квот {pct} · Спринт #{season} (#{rank} ↑) · до #{next} ещё {points} ✦ ›',
            paceMatch: '⚡ Темп Квот {pct} · Спринт #{season} (#{rank}) · до {goal} ещё {points} ✦ ›',
            paceBase: '⚡ Темп Квот {pct} · ещё {points} ✦ до бонуса Спринта +15% ›',
            pacePlain: 'Базовый темп Квот · ещё {points} ✦ до +15% ›',
            paceLoading: '⚡ Темп Квот считается…',
            title: 'Награды и скорость набора квот', brings: 'Этот отчёт принесёт',
            quota: '⚡ +{n} Квот', quotaHint: 'база {base}',
            score: '✦ +{n} Вклада', pending: 'после проверки',
            formula: 'Как складывается скорость', sprint: 'Спринт', profile: 'Профиль',
            brake: 'снижение', instead: 'вместо {pct}',
            why: 'Почему скорость ниже', relNeed: 'Надёжность {n}% · нужно от 50%', karmaNeed: 'Карма {n} · нужно от 0',
            rel: 'Надёжность ›', karma: 'Карма ›', best: 'Берётся лучший результат',
            prev: 'Прошлый #{n}', now: 'Текущий #{n}', acting: 'Действует сейчас ✓', saved: 'минимум защищён',
            below: '▼ ниже прошлого', above: '↑ {pct} к прошлому',
            keep: 'Чтобы сохранить {pct} на следующий спринт, нужно ещё {points} ✦',
            threshold: '{score} / 5 ✦ · ещё +{points} ✦ до +15%',
            openSprint: 'Открыть Спринт ›', gives: 'Что даёт ✦ в этом отчёте',
            photos: '3–5 фото (+0.1…+0.5)', note: 'Заметка ≥14 симв. (+0.2)', video: 'Видео (+1.0)',
            bug: 'Баг (+5)', idea: 'Идея (+4)', review: 'Тест-отзыв (+3)'
        },
        en: {
            chipEmpty: '✦ 0 · from 3 photos ›', chip: '✦ +{n} ›', chipWait: '✦ +{n} ⏳ ›',
            paceSlow: '⚠️ Quota pace {pct} · {reason} ›',
            paceFloor: '⚡ Quota pace {pct} · Sprint #{season} held · now #{rank} ›',
            paceUp: '⚡ Quota pace {pct} · Sprint #{season} (#{rank} ↑) · {points} ✦ to #{next} ›',
            paceMatch: '⚡ Quota pace {pct} · Sprint #{season} (#{rank}) · {points} ✦ to {goal} ›',
            paceBase: '⚡ Quota pace {pct} · {points} ✦ until the +15% sprint bonus ›',
            pacePlain: 'Base quota pace · {points} ✦ until +15% ›',
            paceLoading: '⚡ Quota pace is loading…',
            title: 'Rewards and quota speed', brings: 'This report adds',
            quota: '⚡ +{n} quota', quotaHint: 'base {base}',
            score: '✦ +{n} contribution', pending: 'after review',
            formula: 'How the speed is built', sprint: 'Sprint', profile: 'Profile',
            brake: 'reduction', instead: 'instead of {pct}',
            why: 'Why the speed is lower', relNeed: 'Reliability {n}% · 50% required', karmaNeed: 'Karma {n} · needs 0 or more',
            rel: 'Reliability ›', karma: 'Karma ›', best: 'The better result is used',
            prev: 'Previous #{n}', now: 'Current #{n}', acting: 'Active now ✓', saved: 'floor is kept',
            below: '▼ below the previous sprint', above: '↑ {pct} vs previous',
            keep: 'To keep {pct} next sprint, you still need {points} ✦',
            threshold: '{score} / 5 ✦ · {points} ✦ until +15%',
            openSprint: 'Open Sprint ›', gives: 'What ✦ this report can add',
            photos: '3–5 photos (+0.1…+0.5)', note: 'Note of 14+ characters (+0.2)', video: 'Video (+1.0)',
            bug: 'Bug (+5)', idea: 'Idea (+4)', review: 'Play review (+3)'
        }
    };
    function lang() { return window.lang === 'ru' ? 'ru' : 'en'; }
    function text(key, vars) {
        var value = COPY[lang()][key] || key;
        Object.keys(vars || {}).forEach(function (name) { value = value.replace('{' + name + '}', vars[name]); });
        return value;
    }
    function e(value) { return window.escapeHTML(String(value == null ? '' : value)); }
    function pct(multiplier) {
        var value = Math.round((Number(multiplier || 1) - 1) * 100);
        return (value > 0 ? '+' : '') + value + '%';
    }
    function num(value) {
        var rounded = Math.round(Number(value || 0) * 10) / 10;
        var textValue = rounded.toFixed(1).replace(/\.0$/, '');
        return lang() === 'ru' ? textValue.replace('.', ',') : textValue;
    }
    function pointsOf(images, videos, note, kind) {
        var photos = images >= 5 ? 0.5 : images === 4 ? 0.3 : images === 3 ? 0.1 : 0;
        var comment = kind === 'screenshot' && String(note || '').trim().length >= 14 ? 0.2 : 0;
        var video = videos > 0 ? 1 : 0;
        var pending = kind === 'bug' ? 5 : kind === 'idea' ? 4 : 0;
        return { photos: photos, comment: comment, video: video, pending: pending, total: Math.round((photos + comment + video + pending) * 10) / 10 };
    }
    function chipLabel(score, kind) {
        if (!score.total) return text('chipEmpty');
        return text(score.pending ? 'chipWait' : 'chip', { n: num(score.total) });
    }
    function fine(value) {
        var rounded = Math.round(Number(value || 0) * 10000) / 10000;
        var textValue = String(rounded);
        return lang() === 'ru' ? textValue.replace('.', ',') : textValue;
    }
    function paceHtml(preview) {
        if (!preview) return '<span class="rp-muted">' + e(text('paceLoading')) + '</span>';
        var total = pct(preview.total_multiplier);
        var hot = Number(preview.total_pct) >= 20;
        var current = preview.current_sprint, previous = preview.prev_sprint;
        var aside = '';
        var arrow = '';
        if (preview.is_slowed_down) {
            aside = (preview.slowdown_reasons || []).indexOf('low_reliability') >= 0
                ? (lang() === 'ru' ? 'Надёжность ' : 'Reliability ') + (preview.reliability_index == null ? '—' : preview.reliability_index + '%')
                : (lang() === 'ru' ? 'Карма ' : 'Karma ') + num(preview.karma);
        } else if (preview.sprint_source === 'floor' && previous) {
            aside = (lang() === 'ru' ? 'бронь #' : 'held #') + previous.season_number + (current && current.rank ? (lang() === 'ru' ? ' · сейчас #' : ' · now #') + current.rank : '');
            if (Number(preview.sprint_delta_pct) < 0) arrow = '<i class="rp-down">↓</i>';
        } else if (preview.sprint_source === 'live_up' && current) {
            arrow = '<i class="rp-up">↑</i>';
            aside = (lang() === 'ru' ? 'Спринт #' : 'Sprint #') + current.season_number + (lang() === 'ru' ? ' · до цели ещё ' : ' · ') + num(current.points_to_next_tier) + ' ✦';
        } else if (preview.sprint_source === 'live_match' && current) {
            aside = (lang() === 'ru' ? 'Спринт #' : 'Sprint #') + current.season_number + ' · ' + (current.next_tier_label || '') + ' · ' + num(current.points_to_next_tier) + ' ✦';
        } else {
            var left = current ? num(current.points_to_threshold) : '5';
            aside = (lang() === 'ru' ? 'ещё ' : '') + left + (lang() === 'ru' ? ' ✦ до +15%' : ' ✦ to +15%');
        }
        return '<span class="rp-bolt' + (hot ? ' is-hot' : '') + '">⚡</span><b>' + e(total) + '</b>' + arrow + '<span class="rp-muted">' + e(aside) + '</span>';
    }
    function fine(value) {
        var rounded = Math.round(Number(value || 0) * 10000) / 10000;
        var shown = String(rounded);
        return lang() === 'ru' ? shown.replace('.', ',') : shown;
    }
    function sheetHtml(preview, score) {
        var base = fine(preview ? preview.base_quota : 0.01);
        var pace = preview ? pct(preview.total_multiplier) : '+0%';
        var quota = preview ? fine(Number(preview.base_quota || 0.01) * Number(preview.total_multiplier || 1)) : '0';
        var parts = [];
        if (score.photos) parts.push((score.photos === 0.5 ? '5' : score.photos === 0.3 ? '4' : '3') + (lang() === 'ru' ? ' фото +' : ' photos +') + num(score.photos));
        if (score.comment) parts.push((lang() === 'ru' ? 'текст +' : 'note +') + num(score.comment));
        if (score.video) parts.push((lang() === 'ru' ? 'видео +' : 'video +') + num(score.video));
        if (score.pending) parts.push(text('pending'));
        var sprintPct = preview ? pct(preview.sprint_multiplier) : '+0%';
        var sprintCoef = preview ? '×' + Number(preview.sprint_multiplier || 1).toFixed(2) : '';
        var profileValue = preview ? pct(preview.profile_multiplier) : '+0%';
        var slowed = preview && preview.is_slowed_down;
        var hot = preview && Number(preview.total_pct) >= 20;
        var compare = '';
        if (preview && (preview.prev_sprint || preview.current_sprint)) {
            var prev = preview.prev_sprint, curr = preview.current_sprint;
            function row(label, value, meta, mark) {
                return '<div class="re-line"><span>' + e(label) + '</span><b>' + e(value) + (mark || '') + '</b><small>' + e(meta) + '</small></div>';
            }
            compare = '<section class="re-block"><h4>' + e(text('best')) + '</h4>' +
                (prev ? row(text('prev', { n: prev.season_number }), '#' + (prev.rank || '—') + ' · ' + pct(prev.multiplier), preview.sprint_source === 'floor' ? text('acting') : text('saved'), '') : '') +
                (curr ? row(text('now', { n: curr.season_number }), '#' + (curr.rank || '—') + ' · ' + num(curr.score) + ' ✦', pct(curr.multiplier), preview.sprint_source === 'live_up' ? '<i class="rp-up">↑</i>' : preview.sprint_source === 'floor' ? '<i class="rp-down">↓</i>' : '') : '') +
                '<button type="button" class="re-link" data-re-open="sprint">' + e(text('openSprint')) + '</button></section>';
        }
        var why = slowed ? '<p class="re-note">' + e(text('why')) + ' · ' + e([(preview.slowdown_reasons || []).indexOf('low_reliability') >= 0 ? text('relNeed', { n: preview.reliability_index }) : '', (preview.slowdown_reasons || []).indexOf('negative_karma') >= 0 ? text('karmaNeed', { n: num(preview.karma) }) : ''].filter(Boolean).join(' · ')) + '</p><div class="re-links"><button type="button" data-re-open="reliability">' + e(text('rel')) + '</button><button type="button" data-re-open="karma">' + e(text('karma')) + '</button></div>' : '';
        var checks = [
            ['photos', score.photos > 0], ['note', score.comment > 0], ['video', score.video > 0],
            ['bug', score.pending === 5], ['idea', score.pending === 4], ['review', false]
        ];
        return '<div class="re-sheet" role="dialog" aria-modal="true"><div class="re-handle"></div><header><strong>' + e(text('title')) + '</strong><button type="button" data-re-close aria-label="Close">×</button></header><div class="re-body">' +
            '<section class="re-result"><button type="button" data-re-open="quota"><span>' + e(lang() === 'ru' ? 'Квоты' : 'Quota') + '</span><strong><i class="rp-bolt' + (hot ? ' is-hot' : '') + '">⚡</i> +' + e(quota) + '</strong><small>' + e(text('quotaHint', { base: base })) + '</small></button><div><span>' + e(lang() === 'ru' ? 'Вклад' : 'Contribution') + '</span><strong>✦ +' + e(num(score.total)) + '</strong><small>' + e(parts.join(' · ') || '—') + '</small></div></section>' +
            '<section class="re-block"><h4>' + e(text('formula')) + '</h4><div class="re-eq"><div><em>' + e(text('sprint')) + '</em><strong>' + e(sprintPct) + '</strong><small>' + e(sprintCoef) + '</small></div><i>×</i><div><em>' + e(text('profile')) + '</em><strong>' + e(profileValue) + '</strong><small>' + e(slowed ? text('brake') : '×' + Number(preview && preview.profile_multiplier || 1).toFixed(2)) + '</small></div><i>=</i><div class="is-total"><em>' + e(lang() === 'ru' ? 'Итог' : 'Total') + '</em><strong><i class="rp-bolt' + (hot ? ' is-hot' : '') + '">⚡</i> ' + e(pace) + '</strong>' + (slowed && preview.without_penalty_multiplier ? '<small>' + e(text('instead', { pct: pct(preview.without_penalty_multiplier) })) + '</small>' : '<small></small>') + '</div></div>' + why + '</section>' +
            compare +
            '<section class="re-block"><h4>' + e(text('gives')) + '</h4><div class="re-checks">' + checks.map(function (item) { return '<span class="' + (item[1] ? 'is-on' : '') + '"><i>' + (item[1] ? '✓' : '○') + '</i>' + e(text(item[0])) + '</span>'; }).join('') + '</div></section></div></div>';
    }
    function closeSheet() {
        var layer = document.getElementById('report-economy-sheet');
        if (layer) layer.remove();
    }
    function openSheet(score) {
        closeSheet();
        var layer = document.createElement('div');
        layer.id = 'report-economy-sheet';
        layer.className = 're-layer';
        layer.innerHTML = sheetHtml(cache.data, score);
        layer.addEventListener('click', function (event) {
            if (event.target === layer || event.target.closest('[data-re-close]')) { closeSheet(); return; }
            var jump = event.target.closest('[data-re-open]');
            if (!jump) return;
            var kind = jump.dataset.reOpen;
            if (kind === 'quota' && window.ReviewCredits) ReviewCredits.openBalance();
            else if (kind === 'sprint' && window.showContributionInfo) showContributionInfo();
            else if (kind === 'reliability' && window.showReliabilityInfo) showReliabilityInfo();
            else if (kind === 'karma' && window.showKarmaInfo) showKarmaInfo();
        });
        document.getElementById('report-modal').appendChild(layer);
    }
    function refresh(appId, checkpoint) {
        var actor = String(typeof userId !== 'undefined' ? userId : '');
        var key = actor + ':' + appId + ':' + (checkpoint ? 1 : 0);
        if (cache.key === key && cache.data && Date.now() - cache.at < 60000) return Promise.resolve(cache.data);
        var init = typeof getTelegramInitDataRaw === 'function' ? getTelegramInitDataRaw() : '';
        var url = (window.API_BASE || '/api') + '/reports/economy-preview?init_data=' + encodeURIComponent(init) + '&app_id=' + encodeURIComponent(appId) + '&checkpoint=' + (checkpoint ? 1 : 0);
        return fetch(url).then(function (response) { return response.json(); }).then(function (payload) {
            cache = { key: key, data: payload.economy_preview || null, at: Date.now() };
            if (window.syncUnifiedReport) window.syncUnifiedReport();
            return cache.data;
        }).catch(function () { return cache.data; });
    }
    window.ReportEconomy = { pointsOf: pointsOf, chipLabel: chipLabel, paceHtml: paceHtml, openSheet: openSheet, refresh: refresh, current: function () { return cache.data; } };
})();
