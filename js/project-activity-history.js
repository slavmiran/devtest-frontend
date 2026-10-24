/* Lazy, owner-only history. Never polls, mutates the project or issues check-ins. */
(function () {
    'use strict';
    var current = null;
    var HEIGHT = 136, BASE = 28;
    function tr(key, params) { return window.t(key, params || {}, typeof lang === 'string' ? lang : 'en'); }
    function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function(c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    }); }
    function close() {
        if (current) current.controller.abort();
        current = null;
    }
    function summary(ctx, point) {
        var project = ctx.project;
        var meta = getProjectDailyProgressMeta(project);
        var active = point ? point.active : meta.todayDone;
        var team = point ? point.team : meta.totalTesters;
        var complete = !point || point.complete !== false;
        var partial = complete ? '' : '≥';
        var ringProject = Object.assign({}, project, { today_checkins_count: active,
            active_testers_count: team == null ? Math.max(active, 12) : team });
        var dayText = point ? tr('dprHistoryDay', { day: point.day }) : tr('dprHistoryToday');
        var detail = team == null ? tr('dprHistoryActiveOnly', { active: partial + active })
            : tr('dprHistoryActiveOf', { active: partial + active, total: team });
        var verdict = !complete ? tr('dprHistoryIncomplete')
            : active >= 12 ? tr('dprHistoryMinimumMet') : tr(point ? 'dprHistoryBelow' : 'dprHistoryInProgress');
        var node = ctx.host.querySelector('.dah-summary');
        node.innerHTML = buildProjectDailyProgressRingHtml(ringProject, { interactive: false })
            + '<div class="dah-summary-copy"><div class="dah-selected-day">' + esc(dayText)
            + (point ? '<span>' + esc(point.date) + '</span>' : '') + '</div><strong>' + esc(detail)
            + '</strong><p>' + esc(verdict) + '</p>'
            + (point ? '<button type="button" class="dah-today" data-activity-today>' + esc(tr('dprHistoryToday')) + '</button>' : '')
            + '</div>';
        ctx.host.querySelectorAll('[data-activity-day]').forEach(function(button) {
            var selected = !!point && Number(button.dataset.activityDay) === point.day;
            button.classList.toggle('is-selected', selected);
            button.setAttribute('aria-pressed', String(selected));
        });
    }
    function render(ctx, data) {
        var days = data.days;
        var max = Math.max.apply(null, [12].concat(days.map(function(p) { return Math.max(p.active, p.team || 0); })));
        var scale = Math.ceil((max + 1) / 4) * 4;
        var floor = BASE + HEIGHT * 12 / scale;
        var bars = days.map(function(p) {
            var activeLabel = (p.complete === false ? '≥' : '') + p.active;
            var label = p.team == null ? tr('dprHistoryActiveOnly', { active: activeLabel })
                : tr('dprHistoryActiveOf', { active: activeLabel, total: p.team });
            return '<button type="button" class="dah-column" data-activity-day="' + p.day + '" aria-pressed="false" aria-label="'
                + esc(tr('dprHistoryDay', { day: p.day }) + ': ' + label) + '">'
                + (p.team == null ? '' : '<span class="dah-team" style="height:' + HEIGHT * p.team / scale + 'px"></span>')
                + '<span class="dah-active" style="height:' + HEIGHT * p.active / scale + 'px"></span>'
                + '<span class="dah-value" style="bottom:' + (BASE + HEIGHT * p.active / scale + 3) + 'px">'
                + (p.complete === false ? '≥' : '') + p.active + '</span>'
                + '<span class="dah-day">' + p.day + '</span></button>';
        }).join('');
        ctx.host.innerHTML = '<div class="dah-summary"></div><h4>' + esc(tr('dprHistoryTitle'))
            + (days.length > 8 ? '<span class="dah-range">↔ ' + days[0].day + '–' + days[days.length - 1].day + '</span>' : '') + '</h4>'
            + '<div class="dah-legend"><span><i class="dah-key-team"></i>' + esc(tr('dprHistoryTeam'))
            + '</span><span><i class="dah-key-active"></i>' + esc(tr('dprHistoryActive'))
            + '</span><span><i class="dah-key-min"></i>' + esc(tr('dprHistoryMinimum')) + '</span></div>'
            + (days.length ? '<div class="dah-chart"><div class="dah-axis" aria-hidden="true">'
                + '<span style="bottom:164px">' + scale + '</span><span style="bottom:' + floor + 'px">12</span>'
                + '<span style="bottom:28px">0</span></div><div class="dah-scroll" tabindex="0" role="region" aria-label="'
                + esc(tr('dprHistoryTitle')) + '"><div class="dah-plot" style="min-width:' + Math.max(6, days.length) * 34
                + 'px"><div class="dah-minimum" style="bottom:' + floor + 'px" aria-hidden="true"></div>' + bars + '</div></div></div>'
                : '<p class="dah-note">' + esc(tr('dprHistoryEmpty')) + '</p>')
            + '<p class="dah-note">' + esc(tr('dprHistoryPlatformNote')) + '</p>'
            + (data.partial ? '<p class="dah-note">' + esc(tr('dprHistoryPartial')) + '</p>' : '')
            + (data.truncated ? '<p class="dah-note">' + esc(tr('dprHistoryTruncated', { count: days.length })) + '</p>' : '');
        ctx.host.onclick = function(event) {
            var button = event.target.closest('[data-activity-day], [data-activity-today]');
            if (!button || !ctx.host.contains(button)) return;
            var point = button.hasAttribute('data-activity-today') ? null : days.find(function(p) {
                return p.day === Number(button.dataset.activityDay);
            });
            summary(ctx, point);
        };
        summary(ctx, days.length ? days[days.length - 1] : null);
        var scroll = ctx.host.querySelector('.dah-scroll');
        if (scroll) scroll.scrollLeft = scroll.scrollWidth - scroll.clientWidth;
    }
    async function open(project, host) {
        close();
        if (!host) return;
        var ctx = { project: project, host: host, actor: String(userId), date: getLocalDate(),
            controller: new AbortController() };
        current = ctx;
        host.insertAdjacentHTML('beforeend', '<p class="dah-loading" role="status">' + esc(tr('dprHistoryLoading')) + '</p>');
        var timeout = setTimeout(function() { ctx.controller.abort(); }, 12000);
        try {
            var response = await fetch(API_BASE + '/projects/' + Number(project.id || project.app_id)
                + '/activity-history?init_data=' + encodeURIComponent(getTelegramInitDataRaw()),
                { signal: ctx.controller.signal, cache: 'no-store' });
            if (!response.ok) throw new Error('history_unavailable');
            var data = await response.json();
            if (current !== ctx || String(userId) !== ctx.actor) return;
            if (getLocalDate() !== ctx.date) throw new Error('history_day_changed');
            if (data.status !== 'success' || !Array.isArray(data.days)
                || Number(data.app_id) !== Number(project.id || project.app_id)
                || Number(data.run_iteration) !== Number(project.run_iteration || 1)) throw new Error('history_mismatch');
            if (data.days.length > 730 || !data.days.every(function(p) {
                return Number.isInteger(p.day) && p.day > 0 && Number.isInteger(p.active) && p.active >= 0
                    && (p.team == null || (Number.isInteger(p.team) && p.team >= p.active));
            })) throw new Error('history_invalid');
            render(ctx, data);
        } catch (error) {
            if (current !== ctx) return;
            var loading = host.querySelector('.dah-loading');
            if (loading) loading.textContent = tr('dprHistoryError');
            // The existing summary, recommendations and actions remain usable.
        } finally { clearTimeout(timeout); }
    }
    window.ProjectActivityHistory = { open: open, close: close };
})();
