/* Shared scenario editor for the campaign wizard and scenario branches. */
(function () {
    'use strict';
    var sequence = 0;
    var limits = {text: 90, description: 220, quick_copy: 100};
    function t(key, values) { return window.t(key, values || {}, window.lang); }
    function e(value) { return window.escapeHTML(String(value ?? '')); }
    function count(value) { return Array.from(value || '').length; }

    function cut(value, length) {
        var chars = Array.from(value);
        if (chars.length <= length) return [value, ''];
        var prefix = chars.slice(0, length).join('');
        var boundary = prefix.lastIndexOf(' ');
        if (boundary > length / 2) return [prefix.slice(0, boundary), value.slice(boundary).trimStart()];
        return [prefix, chars.slice(length).join('').trimStart()];
    }

    function split(value) {
        var rows = value.trim().split(/(?:^|\s+)(?:\d+[.)]|[•–-])\s+/u).filter(Boolean);
        var steps = [];
        rows.forEach(function (row) {
            var rest = row.trim();
            while (rest) {
                var title = cut(rest, limits.text);
                var description = cut(title[1], limits.description);
                steps.push({text: title[0], description: description[0]});
                rest = description[1];
            }
        });
        return steps;
    }

    function normalize(activity) {
        if (!activity.steps || !activity.steps.length) {
            activity.steps = split(activity.instructions || '');
            if (!activity.steps.length) activity.steps.push({text: '', description: ''});
        }
        activity.steps.forEach(function (step) {
            if (!step._key) step._key = 's' + (++sequence);
        });
        return activity.steps;
    }
    function fee(activity) {
        var steps = activity.steps || [];
        var chars = steps.reduce(function (sum, step) {
            return sum + Object.keys(limits).reduce(function (length, key) {
                return length + count((step[key] || '').trim());
            }, 0);
        }, 0);
        var amount = steps.length >= 6 || chars > 800 ? 90 : steps.length >= 3 || chars > 300 ? 65 : 40;
        return amount + (activity.proof_mode === 'video' ? 20 : 0);
    }
    function feeLabel(activity) {
        return t('growthScenarioFee', {price: (fee(activity) / 100).toLocaleString(window.lang === 'ru' ? 'ru' : 'en', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        })});
    }
    function valid(activity, maxDay) {
        if (!activity.enabled) return true;
        var steps = activity.steps || [];
        return steps.length >= 1 && steps.length <= 12 && steps.every(function (step) {
            return step.text.trim() && Object.keys(limits).every(function (key) {
                return count(step[key]) <= limits[key];
            });
        }) && (activity.open_day || 1) <= (maxDay || 14)
            && (!(activity.scenario_share_pct < 100) || activity.scenario_share_pct >= 5 && activity.scenario_share_pct <= 95 && Number.isInteger(activity.scenario_share_pct));
    }
    function settings(activity, maxDay) {
        var day = activity.open_day || 1;
        var dose = (activity.scenario_share_pct || 100) < 100;
        var lastDay = Math.max(day, Math.min(14, maxDay || 14));
        function options(values, selected, label) {
            return values.map(function (value) {
                return '<option value="' + value + '"' + (value === selected ? ' selected' : '') + '>' + e(label(value)) + '</option>';
            }).join('');
        }
        return '<div class="lse-settings"><label>' + e(t('growthOpenDay')) +
            '<select class="gtw-input" data-lse-setting="open_day">' +
            options(Array.from({length: lastDay}, function (_, i) { return i + 1; }), day, function (v) { return 'D' + v; }) +
            '</select></label>' + (day > 1 ? '<label>' + e(t('growthJitter')) + '<select class="gtw-input" data-lse-setting="jitter_days">' +
                options([0, 1, 2, 3], activity.jitter_days || 0, function (v) { return v ? '±' + v : '0'; }) + '</select></label>' : '') +
            '<label>' + e(t('growthProofMode')) + '<select class="gtw-input" data-lse-setting="proof_mode">' +
            options(['screenshot', 'video'], activity.proof_mode || 'screenshot', function (v) {
                return t(v === 'video' ? 'growthVideo' : 'growthScreenshot');
            }) + '</select></label>' +
            '<label class="lse-checkbox"><input type="checkbox" data-lse-setting="dose"' + (dose ? ' checked' : '') + '> ' +
            e(t('growthDose')) + '</label>' +
            (dose ? '<div class="lse-dose"><div class="lcw-chips">' + [10, 15, 25, 35, 50].map(function (n) {
                return '<button type="button" class="meta-chip" data-lse-dose="' + n + '">' + n + '%</button>';
            }).join('') + '</div><label>' + e(t('growthShare')) + '<input class="gtw-input" type="number" min="5" max="95" inputmode="numeric" data-lse-setting="scenario_share_pct" value="' +
                activity.scenario_share_pct + '"></label><small>' + e(t('growthDoseHint')) + '</small></div>' : '<small>' + e(t('growthAllFlow')) + '</small>') +
            '</div>';
    }
    function body(activity, maxDay) {
        var steps = normalize(activity);
        return '<section class="lse-editor"><header><strong>' + e(t('growthScenario')) +
            '</strong><span data-lse-fee aria-live="polite">' + e(feeLabel(activity)) + '</span></header>' +
            steps.map(function (step, index) {
                var key = 'step:' + step._key;
                var media = step.media && step.media.asset;
                var field = ' data-lse-key="' + step._key + '" data-lse-field="';
                return '<article class="lse-step"><header><strong>' + e(t('lseStep', {n: index + 1})) + '</strong>' +
                    (steps.length > 1 ? '<button type="button" class="meta-chip" data-lse-remove="' + step._key + '" aria-label="' + e(t('lseRemove')) + '">×</button>' : '') +
                    '</header><label>' + e(t('lseText')) + '<input class="gtw-input" maxlength="90"' + field + 'text" value="' + e(step.text) + '"></label>' +
                    '<label>' + e(t('lseDescription')) + '<textarea class="gtw-textarea" maxlength="5000"' + field + 'description">' + e(step.description) + '</textarea></label>' +
                    '<label class="lse-checkbox"><input type="checkbox" data-lse-assist="' + step._key + '"' + (step._split !== false ? ' checked' : '') +
                    '> ' + e(t('growthSplitAssistant')) + '</label><p data-lse-counter>' + count(step.description) + ' / 220</p>' +
                    '<div data-lse-split-panel hidden><small>' + e(t('growthSplitHint')) + '</small>' +
                    '<button type="button" class="meta-chip" data-lse-split="' + step._key + '">' + e(t('growthSplit')) + '</button></div>' +
                    '<label>' + e(t('growthQuickCopy')) + '<input class="gtw-input" maxlength="100"' + field + 'quick_copy" value="' + e(step.quick_copy) + '"></label>' +
                    (media ? '<div class="lse-media">' + (step.media.kind === 'video' ? '<video controls preload="none" src="' + e(media.url) + '"></video>' :
                        '<img src="' + e(media.url) + '" alt="' + e(t('lcwReference')) + '">') +
                        '<button type="button" class="meta-chip" data-lse-media-remove="' + step._key + '">' + e(t('lseRemoveMedia')) + '</button></div>' : '') +
                    '<label class="meta-chip lse-upload">🖼️ / 🎬 ' + e(t('lseAttach')) +
                    '<input type="file" hidden accept="image/png,image/jpeg,image/webp,video/mp4,video/webm" data-lcw-file="' + key + '"></label></article>';
            }).join('') + '<button type="button" class="lm-action" data-lse-add' + (steps.length >= 12 ? ' disabled' : '') +
            '>' + e(t('lseAdd')) + '</button>' + settings(activity, maxDay) + '</section>';
    }
    function syncText(activity) {
        activity.instructions = activity.steps.map(function (s, i) {
            return (i + 1) + '. ' + s.text + (s.description ? '\n' + s.description : '');
        }).join('\n\n');
    }
    function refresh(activity, root) {
        var editor = root.querySelector('.lse-editor');
        if (!editor) return;
        editor.querySelector('[data-lse-fee]').textContent = feeLabel(activity);
        (activity.steps || []).forEach(function (step) {
            var button = editor.querySelector('[data-lse-split="' + step._key + '"]');
            if (!button) return;
            var panel = button.closest('[data-lse-split-panel]');
            var suggested = split(step.description || '');
            panel.hidden = step._split === false || !(count(step.description) > 220 || /(?:^|\s)(?:\d+[.)]|[•–-])\s/u.test(step.description || ''));
            button.disabled = !suggested.length || activity.steps.length + suggested.length > 12;
            var row = panel.closest('article');
            row.querySelector('[data-lse-counter]').textContent = count(step.description) + ' / 220';
            row.querySelector('textarea').setAttribute('aria-invalid', String(count(step.description) > 220));
        });
    }
    function input(activity, element) {
        var key = element.dataset.lseField;
        var setting = element.dataset.lseSetting;
        var assist = element.dataset.lseAssist;
        if (!key && !setting && !assist) return false;
        if (setting) {
            if (setting === 'dose') activity.scenario_share_pct = element.checked ? 25 : 100;
            else activity[setting] = setting === 'proof_mode' ? element.value : Number(element.value);
            if (setting === 'proof_mode') activity.screenshot = element.value === 'screenshot';
            if (setting === 'scenario_share_pct') element.setAttribute('aria-invalid', String(!element.checkValidity() || !element.value));
            return true;
        }
        var step = normalize(activity).find(function (item) { return item._key === (assist || element.dataset.lseKey); });
        if (!step) return false;
        if (assist) step._split = element.checked;
        else step[key] = element.value;
        syncText(activity);
        return true;
    }
    function click(activity, button, media) {
        if (button.hasAttribute('data-lse-add')) {
            if (normalize(activity).length < 12) activity.steps.push({text: '', description: ''});
        } else if (button.dataset.lseDose) {
            activity.scenario_share_pct = Number(button.dataset.lseDose);
        } else if (button.dataset.lseSplit) {
            var index = activity.steps.findIndex(function (step) { return step._key === button.dataset.lseSplit; });
            if (index < 0) return false;
            var original = activity.steps[index];
            var parts = split(original.description || '');
            if (!parts.length || activity.steps.length + parts.length > 12) return false;
            original.description = '';
            activity.steps.splice(index + 1, 0, ...parts);
        } else {
            var key = button.dataset.lseRemove || button.dataset.lseMediaRemove;
            if (!key) return false;
            media.remove('step:' + key);
            if (button.dataset.lseRemove) activity.steps = activity.steps.filter(function (step) { return step._key !== key; });
            else normalize(activity).find(function (step) { return step._key === key; }).media = null;
        }
        syncText(activity);
        return true;
    }
    function set(activity, key, value) {
        var step = normalize(activity).find(function (item) { return 'step:' + item._key === key; });
        if (step) step.media = {kind: String(value.type || '').startsWith('video/') ? 'video' : 'image', asset: value};
    }
    async function serialize(activity, save) {
        var out = [];
        for (var step of activity.steps || []) {
            out.push({text: step.text.trim(), description: (step.description || '').trim(), quick_copy: (step.quick_copy || '').trim(),
                media: step.media ? {kind: step.media.kind, asset: await save('step:' + step._key, step.media.asset)} : null});
        }
        return out;
    }
    function load(activity, asset) {
        (activity.enabled ? normalize(activity) : activity.steps || []).forEach(function (step) {
            if (!step._key) step._key = 's' + (++sequence);
            if (!step.media || !step.media.asset) return;
            step.media.asset = asset(step.media.asset.asset_id);
            if (step.media.asset) step.media.asset.type = step.media.kind === 'video' ? 'video/mp4' : 'image/png';
        });
    }
    window.LiveScenarioEditor = {body: body, input: input, click: click, set: set, refresh: refresh,
        valid: valid, fee: fee, split: split, serialize: serialize, load: load};
})();
