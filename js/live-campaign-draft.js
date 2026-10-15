/* Stage 1 draft model. Estimates are not a server quote or a payment instruction. */
(function () {
    'use strict';
    var STRATEGIES = ['aso', 'retention', 'deep', 'custom'];
    var SOURCES = ['link', 'web', 'keywords'];
    var CHECKPOINT_UNIT = 10;
    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function baseline(project) {
        var m = project.live_metrics, rate = m && m.installs && m.installs.per_day;
        return { available: !!(m && m.source === 'devtesthub_live' && m.boundary_available !== false &&
            typeof rate === 'number' && Number.isFinite(rate) && rate >= 0),
            perDay: typeof rate === 'number' && Number.isFinite(rate) && rate >= 0 ? rate : null,
            asOf: m && m.as_of || null };
    }
    function create(project) {
        return { schemaVersion: 1, appId: Number(project.id || project.app_id), baseline: baseline(project), strategy: null,
            sources: { link: 100, web: 0, keywords: 0 },
            retention: { days: 7, checkpoints: [1, 7] },
            activity: { enabled: false, screenshot: false },
            reviews: { enabled: false, delayDays: 7, prompt: 'soft' },
            pacing: { dailyInstalls: 1, acquisitionDays: 7, rampUp: true },
            billing: { source: 'project', allowWalletFallback: false } };
    }
    function applyStrategy(draft, strategy) {
        if (!STRATEGIES.includes(strategy)) return draft;
        var next = create({ id: draft.appId }); next.baseline = clone(draft.baseline); next.strategy = strategy;
        var rate = next.baseline.available ? next.baseline.perDay : 0;
        if (strategy === 'aso') {
            next.sources = { link: 10, web: 20, keywords: 70 };
            next.retention = { days: 14, checkpoints: [1, 7, 14] };
            next.reviews.enabled = true;
            next.pacing.dailyInstalls = Math.min(500, Math.max(1, Math.round(rate * .3)));
            next.pacing.acquisitionDays = 14;
        } else if (strategy === 'retention') {
            next.sources = { link: 34, web: 33, keywords: 33 };
            next.retention = { days: 30, checkpoints: [1, 7, 14, 21, 30] };
            next.pacing.dailyInstalls = Math.min(500, Math.max(1, Math.round(rate * .1)));
            next.pacing.acquisitionDays = 14;
        } else if (strategy === 'deep') {
            next.activity = { enabled: true, screenshot: true };
        }
        return next;
    }
    function checkpointOptions(days) { return {7:[1,4,7],14:[1,4,7,10,14],30:[1,7,14,21,30]}[days] || []; }
    function change(draft, field, value) {
        var next = clone(draft);
        if (SOURCES.includes(field) && Number.isInteger(value) && value >= 0 && value <= 100) next.sources[field] = value;
        else if (field === 'retention' && [7,14,30].includes(value)) {
            next.retention = { days: value, checkpoints: checkpointOptions(value).slice() };
        } else if (field === 'checkpoint') {
            var days = next.retention.checkpoints;
            if (value === 1 || !checkpointOptions(next.retention.days).includes(value)) return draft;
            if (days.includes(value)) {
                if (days.length <= 2) return draft;
                days.splice(days.indexOf(value), 1);
            } else days.push(value);
            days.sort(function (a,b) { return a-b; });
        } else if (field === 'activity') {
            next.activity.enabled = !!value; if (!value) next.activity.screenshot = false;
        } else if (field === 'screenshot' && next.activity.enabled) next.activity.screenshot = !!value;
        else if (field === 'reviews') next.reviews.enabled = !!value;
        else if (field === 'daily' && Number.isInteger(value) && value >= 1 && value <= 500) next.pacing.dailyInstalls = value;
        else if (field === 'duration' && [7,14,30].includes(value)) next.pacing.acquisitionDays = value;
        else if (field === 'ramp') next.pacing.rampUp = !!value;
        else if (field === 'wallet') next.billing.allowWalletFallback = !!value;
        return next;
    }
    function quote(draft) {
        var totalWeight = SOURCES.reduce(function (sum, key) { return sum + draft.sources[key]; }, 0);
        var installs = draft.pacing.dailyInstalls * draft.pacing.acquisitionDays;
        var unit = (draft.retention.checkpoints.length - 1) * CHECKPOINT_UNIT;
        // Largest remainder allocation keeps the displayed integer channel totals exact.
        var channels = SOURCES.map(function (key, index) {
            var exact = totalWeight ? installs * draft.sources[key] / totalWeight : 0;
            return { key: key, count: Math.floor(exact), remainder: exact % 1, index: index,
                percent: totalWeight ? draft.sources[key] / totalWeight * 100 : 0 };
        });
        var left = totalWeight ? installs - channels.reduce(function (sum, c) { return sum + c.count; }, 0) : 0;
        channels.slice().sort(function (a,b) { return b.remainder-a.remainder || a.index-b.index; }).forEach(function (c) { if (left > 0) { c.count++; left--; } });
        return { available: !!draft.strategy && totalWeight > 0, checkpointUnit: CHECKPOINT_UNIT, perInstall: unit,
            dailyCommitment: unit * draft.pacing.dailyInstalls, totalCommitment: installs * unit, installs: installs,
            channels: channels, concentrated: channels.some(function (c) { return c.percent >= 80; }),
            // Last cohort finishes after the acquisition window closes.
            completionDays: draft.pacing.acquisitionDays + draft.retention.days - 1 };
    }
    function valid(draft, step) { return !!draft.strategy && (step !== 2 || SOURCES.some(function (key) { return draft.sources[key] > 0; })); }
    window.LiveCampaignDraft = { create:create, applyStrategy:applyStrategy, change:change, quote:quote, valid:valid, checkpointOptions:checkpointOptions };
})();
