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
            title: 'Награды и темп Квот', brings: 'Этот отчёт принесёт',
            quota: '⚡ +{n} Квот', quotaHint: 'база {base} · темп {pct}',
            score: '✦ +{n} Вклада', pending: 'после проверки владельцем',
            formula: 'Как складывается ваш темп Квот', sprint: '✦ Спринт', profile: '🛡 Профиль',
            brake: '×0.70 · тормоз', instead: 'вместо {pct}',
            why: 'Почему темп снижен на 30%', relNeed: 'Надёжность {n}% — нужно от 50%', karmaNeed: 'Карма {n} — нужно ≥ 0',
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
            title: 'Rewards and quota pace', brings: 'This report adds',
            quota: '⚡ +{n} quota', quotaHint: 'base {base} · pace {pct}',
            score: '✦ +{n} contribution', pending: 'after the owner accepts it',
            formula: 'How your quota pace is built', sprint: '✦ Sprint', profile: '🛡 Profile',
            brake: '×0.70 · slowdown', instead: 'instead of {pct}',
            why: 'Why the pace is 30% slower', relNeed: 'Reliability {n}% — 50% is required', karmaNeed: 'Karma {n} — needs to be at least 0',
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
    function paceLabel(preview, score) {
        if (!preview) return text('paceLoading');
        var total = pct(preview.total_multiplier);
        var current = preview.current_sprint, previous = preview.prev_sprint;
        if (preview.is_slowed_down) {
            var reason = (preview.slowdown_reasons || []).indexOf('low_reliability') >= 0
                ? (lang() === 'ru' ? 'Надёжность ' : 'Reliability ') + (preview.reliability_index == null ? '—' : preview.reliability_index + '%')
                : (lang() === 'ru' ? 'Карма ' : 'Karma ') + num(preview.karma);
            return text('paceSlow', { pct: total, reason: reason });
        }
        var left = current ? num(current.points_to_next_tier) : num(Math.max(0, 5 - (score ? score.total : 0)));
        if (preview.sprint_source === 'floor' && previous) return text('paceFloor', { pct: total, season: previous.season_number, rank: current && current.rank || '—' });
        if (preview.sprint_source === 'live_up' && current) return text('paceUp', { pct: total, season: current.season_number, rank: current.rank || '—', next: current.next_tier_label === '+100%' ? 1 : 3, points: left });
        if (preview.sprint_source === 'live_match' && current) return text('paceMatch', { pct: total, season: current.season_number, rank: current.rank || '—', goal: current.next_tier_label || 'Top', points: left });
        if (!preview.profile_multiplier || preview.profile_multiplier === 1 && preview.sprint_multiplier === 1) return text('pacePlain', { points: left });
        return text('paceBase', { pct: total, points: left });
    }
    function sheetHtml(preview, score) {
        var base = num(preview ? preview.base_quota : 0.01);
        var pace = preview ? pct(preview.total_multiplier) : '+0%';
        var quota = preview ? num(Number(preview.base_quota || 0.01) * Number(preview.total_multiplier || 1)) : '0';
        var parts = [];
        if (score.photos) parts.push((score.photos === 0.5 ? '5' : score.photos === 0.3 ? '4' : '3') + (lang() === 'ru' ? ' фото +' : ' photos +') + num(score.photos));
        if (score.comment) parts.push((lang() === 'ru' ? 'текст +' : 'note +') + num(score.comment));
        if (score.video) parts.push((lang() === 'ru' ? 'видео +' : 'video +') + num(score.video));
        if (score.pending) parts.push(text('pending'));
        var sprintCard = preview ? pct(preview.sprint_multiplier) + ' <small>×' + Number(preview.sprint_multiplier || 1).toFixed(2) + '</small>' : '—';
        var profileValue = preview ? pct(preview.profile_multiplier) : '+0%';
        var slowed = preview && preview.is_slowed_down;
        var compare = '';
        if (preview && (preview.prev_sprint || preview.current_sprint)) {
            var prev = preview.prev_sprint, curr = preview.current_sprint;
            compare = '<section class="re-block"><h4>' + e(text('best')) + '</h4>' +
                (prev ? '<p><span>' + e(text('prev', { n: prev.season_number })) + '</span><b>' + e('#' + (prev.rank || '—') + ' · ' + pct(prev.multiplier)) + '</b><small>' + e(preview.sprint_source === 'floor' ? text('acting') : text('saved')) + '</small></p>' : '') +
                (curr ? '<p><span>' + e(text('now', { n: curr.season_number })) + '</span><b>' + e('#' + (curr.rank || '—') + ' · ' + num(curr.score) + ' ✦ (' + pct(curr.multiplier) + ')') + '</b><small>' + e(preview.sprint_source === 'live_up' ? text('above', { pct: (preview.sprint_delta_pct > 0 ? '+' : '') + preview.sprint_delta_pct + '%' }) : preview.sprint_source === 'floor' ? text('below') : text('acting')) + '</small></p>' : '') +
                '<button type="button" data-re-open="sprint">' + e(text('openSprint')) + '</button></section>';
        }
        var why = slowed ? '<div class="re-why"><strong>' + e(text('why')) + '</strong><p>' + e((preview.slowdown_reasons || []).indexOf('low_reliability') >= 0 ? text('relNeed', { n: preview.reliability_index }) : '') + '</p><p>' + e((preview.slowdown_reasons || []).indexOf('negative_karma') >= 0 ? text('karmaNeed', { n: num(preview.karma) }) : '') + '</p><div><button type="button" data-re-open="reliability">' + e(text('rel')) + '</button><button type="button" data-re-open="karma">' + e(text('karma')) + '</button></div></div>' : '';
        var checks = [
            ['photos', score.photos > 0], ['note', score.comment > 0], ['video', score.video > 0],
            ['bug', score.pending === 5], ['idea', score.pending === 4], ['review', false]
        ];
        return '<div class="re-sheet" role="dialog" aria-modal="true"><header><strong>' + e(text('title')) + '</strong><button type="button" data-re-close aria-label="Close">×</button></header><div class="re-body">' +
            '<section class="re-block"><h4>' + e(text('brings')) + '</h4><div class="re-tiles"><button type="button" data-re-open="quota"><b>' + e(text('quota', { n: quota })) + '</b><small>' + e(text('quotaHint', { base: base, pct: pace })) + '</small></button><div><b>' + e(text('score', { n: num(score.total) })) + '</b><small>' + e(parts.join(' · ') || '—') + '</small></div></div></section>' +
            '<section class="re-block"><h4>' + e(text('formula')) + '</h4><div class="re-formula"><div><small>' + e(text('sprint')) + '</small><b>' + sprintCard + '</b></div><span>×</span><div class="' + (slowed ? 'is-slow' : '') + '"><small>' + e(text('profile')) + '</small><b>' + e(profileValue) + '</b><small>' + e(slowed ? text('brake') : '') + '</small></div><span>=</span><div><small>⚡</small><b>' + e(pace) + '</b>' + (slowed ? '<small>' + e(text('instead', { pct: pct(preview.without_penalty_multiplier) })) + '</small>' : '') + '</div></div>' + why + '</section>' +
            compare +
            '<section class="re-block"><h4>' + e(text('gives')) + '</h4><div class="re-checks">' + checks.map(function (item) { return '<span class="' + (item[1] ? 'is-on' : '') + '">' + (item[1] ? '✓ ' : '○ ') + e(text(item[0])) + '</span>'; }).join('') + '</div></section></div></div>';
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
    window.ReportEconomy = { pointsOf: pointsOf, chipLabel: chipLabel, paceLabel: paceLabel, openSheet: openSheet, refresh: refresh, current: function () { return cache.data; } };
})();
