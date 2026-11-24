/* Reviews of the person on the other side of a deal. */
(function () {
    'use strict';
    function ru() { return window.lang === 'ru'; }
    function e(value) { return window.escapeHTML(String(value == null ? '' : value)); }
    function api(path, options) {
        var init = typeof getTelegramInitDataRaw === 'function' ? getTelegramInitDataRaw() : '';
        var url = (window.API_BASE || '/api') + path;
        options = options || {};
        if (!options.method || options.method === 'GET') url += (url.indexOf('?') >= 0 ? '&' : '?') + 'init_data=' + encodeURIComponent(init);
        else {
            options.headers = {'Content-Type': 'application/json'};
            var body = JSON.parse(options.body || '{}');
            body.init_data = init;
            options.body = JSON.stringify(body);
        }
        return fetch(url, options).then(function (response) { return response.json(); });
    }
    function summaryLine(summary) {
        var total = Number(summary && summary.total_count || 0);
        if (!total) return ru() ? 'Пока нет отзывов' : 'No reviews yet';
        if (total < 3 || summary.positive_pct == null) return total + (ru() ? ' отзыва ›' : ' reviews ›');
        return '👍 ' + (ru() ? 'Полученные отзывы' : 'Reviews') + '    ' + summary.positive_pct + '% · ' + total + ' ›';
    }
    function summaryHtml(summary, targetId) {
        return '<button type="button" class="peer-summary" data-peer-list="' + Number(targetId || 0) + '">' + e(summaryLine(summary)) + '</button>';
    }
    function actionHtml(review) {
        if (!review) return '<div class="peer-actions"><button type="button" data-peer-rate="1">👍</button><button type="button" data-peer-rate="-1">👎</button></div>';
        var mark = Number(review.rating) > 0 ? '👍' : '👎';
        var wait = review.status === 'draft_on_complete' ? (ru() ? ' · после финала' : ' · after the final') : '';
        return '<button type="button" class="peer-mine" data-peer-rate="' + Number(review.rating) + '">' + e((ru() ? 'Ваша оценка: ' : 'Your rating: ') + mark + wait) + '</button>';
    }
    function mount(host, options) {
        if (!host) return;
        options = options || {};
        host.innerHTML = '<div class="peer-box"><div class="peer-summary-slot"></div><div class="peer-action-slot"></div></div>';
        var target = Number(options.targetId || 0);
        if (target) api('/users/' + target + '/peer-reviews?filter=all&limit=1').then(function (payload) {
            var slot = host.querySelector('.peer-summary-slot');
            if (slot) slot.innerHTML = summaryHtml(payload.summary, target);
        }).catch(function () {});
        if (options.progressId) api('/peer-reviews/context?progress_id=' + Number(options.progressId)).then(function (payload) {
            host.dataset.peerContext = JSON.stringify(payload);
            var slot = host.querySelector('.peer-action-slot');
            if (slot) slot.innerHTML = actionHtml(payload.my_review);
        }).catch(function () {});
        if (!host.dataset.peerBound) {
            host.dataset.peerBound = '1';
            host.addEventListener('click', function (event) {
                var list = event.target.closest('[data-peer-list]');
                var rate = event.target.closest('[data-peer-rate]');
                if (list) openListModal(Number(list.dataset.peerList));
                if (rate) openRateSheet(Number(options.progressId), {presetRating: Number(rate.dataset.peerRate)});
            });
        }
    }
    function openRateSheet(progressId, options) {
        options = options || {};
        api('/peer-reviews/context?progress_id=' + Number(progressId)).then(function (ctx) {
            var preset = options.presetRating || (ctx.my_review && ctx.my_review.rating) || 1;
            var layer = document.createElement('div');
            layer.className = 'peer-layer';
            layer.innerHTML = rateHtml(ctx, preset);
            layer.addEventListener('click', function (event) {
                if (event.target === layer || event.target.closest('[data-peer-close]')) { layer.remove(); return; }
                var choice = event.target.closest('[data-rate]');
                if (choice) {
                    layer.querySelectorAll('[data-rate]').forEach(function (button) { button.classList.toggle('is-on', button === choice); });
                    layer.dataset.rating = choice.dataset.rate;
                    var negative = choice.dataset.rate === '-1';
                    var mode = layer.querySelector('[data-visibility]');
                    if (mode && ctx.is_active_deal && !layer.dataset.modeTouched) mode.value = negative ? 'on_complete' : 'immediate';
                }
                if (event.target.closest('[data-peer-save]')) saveFrom(layer, ctx);
                if (event.target.closest('[data-peer-delete]') && ctx.my_review) api('/peer-reviews/' + ctx.my_review.id, {method: 'DELETE'}).then(function () { layer.remove(); });
            });
            layer.querySelector('[data-visibility]') && layer.querySelector('[data-visibility]').addEventListener('change', function () { layer.dataset.modeTouched = '1'; });
            layer.dataset.rating = String(preset);
            document.body.appendChild(layer);
        }).catch(function () {});
    }
    function rateHtml(ctx, rating) {
        var tags = rating < 0 ? ctx.tags_negative : ctx.tags_positive;
        return '<div class="peer-sheet" role="dialog"><div class="re-handle"></div><header><strong>' + e(ru() ? 'Оценить сотрудничество' : 'Rate the collaboration') + '</strong><button type="button" data-peer-close>×</button></header><div class="peer-body"><p class="peer-lead">' + e(ctx.app_name || '') + ' · ' + e(ctx.days_done || 0) + (ru() ? ' дн. · пропуски ' : ' d · skips ') + e(ctx.skips_count || 0) + '</p><p class="peer-muted">' + e(ru() ? 'Оценивается человек, не приложение.' : 'This rates the person, not the app.') + '</p><div class="peer-rates"><button type="button" data-rate="1" class="' + (rating > 0 ? 'is-on' : '') + '">👍 ' + e(ru() ? 'Положительно' : 'Positive') + '</button><button type="button" data-rate="-1" class="' + (rating < 0 ? 'is-on is-down' : '') + '">👎 ' + e(ru() ? 'Отрицательно' : 'Negative') + '</button></div><div class="peer-tags">' + (tags || []).map(function (tag) { return '<button type="button" class="peer-tag" data-tag="' + e(tag) + '">' + e(tag) + '</button>'; }).join('') + '</div><textarea maxlength="500" data-peer-comment placeholder="' + e(ru() ? 'Комментарий' : 'Comment') + '">' + e(ctx.my_review && ctx.my_review.comment || '') + '</textarea>' + (ctx.is_active_deal ? '<label class="peer-muted"><select data-visibility><option value="immediate">' + e(ru() ? 'Показать сразу' : 'Show now') + '</option><option value="on_complete">' + e(ru() ? 'После завершения теста' : 'After the test ends') + '</option></select></label>' : '') + '<label class="peer-muted"><input type="checkbox" data-anon> ' + e(ru() ? 'Анонимный комментарий' : 'Anonymous comment') + '</label><button type="button" class="btn btn-primary" data-peer-save>' + e(ru() ? 'Сохранить' : 'Save') + '</button>' + (ctx.my_review ? '<button type="button" class="peer-link" data-peer-delete>' + e(ru() ? 'Удалить отзыв' : 'Delete review') + '</button>' : '') + '</div></div>';
    }
    function saveFrom(layer, ctx) {
        var rating = Number(layer.dataset.rating || layer.querySelector('[data-rate].is-on') && layer.querySelector('[data-rate].is-on').dataset.rate || 1);
        var tags = [].map.call(layer.querySelectorAll('.peer-tag.is-on'), function (node) { return node.dataset.tag; });
        api('/peer-reviews', {method: 'POST', body: JSON.stringify({
            progress_id: ctx.progress_id, rating: rating, tags: tags,
            comment: layer.querySelector('[data-peer-comment]').value,
            is_anonymous: !!layer.querySelector('[data-anon]').checked,
            visibility_mode: (layer.querySelector('[data-visibility]') || {}).value || 'immediate'
        })}).then(function () { layer.remove(); });
    }
    function openListModal(targetId) {
        api('/users/' + Number(targetId) + '/peer-reviews?filter=all&limit=20').then(function (payload) {
            var summary = payload.summary || {};
            var layer = document.createElement('div');
            layer.className = 'peer-layer';
            layer.innerHTML = '<div class="peer-sheet peer-list" role="dialog"><header><button type="button" data-peer-close>←</button><strong>' + e(ru() ? 'Полученные отзывы' : 'Reviews received') + '</strong><b>' + e(summary.positive_pct == null ? '' : summary.positive_pct + '%') + '</b></header><div class="peer-filters"><button type="button" data-filter="all">' + e(ru() ? 'Все' : 'All') + ' ' + Number(summary.total_count || 0) + '</button><button type="button" data-filter="positive">👍 ' + Number(summary.positive_count || 0) + '</button><button type="button" data-filter="negative">👎 ' + Number(summary.negative_count || 0) + '</button></div><div class="peer-feed">' + feed(payload.reviews || [], targetId) + '</div></div>';
            layer.addEventListener('click', function (event) {
                if (event.target === layer || event.target.closest('[data-peer-close]')) { layer.remove(); return; }
                var filter = event.target.closest('[data-filter]');
                if (filter) api('/users/' + Number(targetId) + '/peer-reviews?filter=' + filter.dataset.filter + '&limit=20').then(function (next) { layer.querySelector('.peer-feed').innerHTML = feed(next.reviews || [], targetId); });
                var appeal = event.target.closest('[data-appeal]');
                if (appeal) openAppealModal(Number(appeal.dataset.appeal));
            });
            document.body.appendChild(layer);
        });
    }
    function feed(rows, targetId) {
        var mine = Number(targetId) === Number(typeof userId !== 'undefined' ? userId : 0);
        if (!rows.length) return '<p class="peer-muted">' + e(ru() ? 'Пока нет отзывов' : 'No reviews yet') + '</p>';
        return rows.map(function (row) {
            var name = row.is_anonymous ? (ru() ? 'Анонимный участник' : 'Anonymous') : (row.author_username ? '@' + row.author_username : row.author_full_name || '');
            return '<article class="peer-card"><div><b>' + e(name) + '</b><small>' + e(row.deal_kind || '') + '</small>' + (mine && row.can_appeal ? '<button type="button" data-appeal="' + Number(row.id) + '">•••</button>' : '') + '</div><p>' + e(row.comment || (Number(row.rating) > 0 ? (ru() ? 'Пользователь оставил положительную оценку' : 'Positive rating') : '')) + '</p><div class="peer-tags">' + (row.tags || []).map(function (tag) { return '<span>' + e(tag) + '</span>'; }).join('') + '</div><strong class="' + (Number(row.rating) > 0 ? 'rp-up' : 'rp-down') + '">' + (Number(row.rating) > 0 ? '👍' : '👎') + '</strong>' + (row.reply_text ? '<p class="peer-muted">' + e(row.reply_text) + '</p>' : '') + '</article>';
        }).join('');
    }
    function openAppealModal(reviewId) {
        var layer = document.createElement('div');
        layer.className = 'peer-layer';
        layer.innerHTML = '<div class="peer-sheet" role="dialog"><header><strong>' + e(ru() ? 'Апелляция' : 'Appeal') + '</strong><button type="button" data-peer-close>×</button></header><div class="peer-body"><p class="peer-muted">1. ' + e(ru() ? 'Подать' : 'Submit') + ' → 2. ' + e(ru() ? 'Рассмотрение' : 'Review') + ' → 3. ' + e(ru() ? 'Завершено' : 'Done') + '</p><label class="peer-muted"><input type="checkbox" data-reason value="facts"> ' + e(ru() ? 'Противоречит фактам теста' : 'Contradicts the test') + '</label><label class="peer-muted"><input type="checkbox" data-reason value="abuse"> ' + e(ru() ? 'Оскорбления или спам' : 'Insults or spam') + '</label><textarea maxlength="500" data-appeal-text></textarea><label class="peer-link">' + e(ru() ? 'Доказательства 0/5' : 'Evidence 0/5') + '<input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden data-appeal-files></label><div data-appeal-previews></div><button type="button" class="btn btn-primary" data-appeal-send>' + e(ru() ? 'Подать апелляцию' : 'Submit appeal') + '</button></div></div>';
        var files = [];
        layer.querySelector('[data-appeal-files]').addEventListener('change', function (event) {
            [].forEach.call(event.target.files || [], function (file) {
                if (files.length >= 5 || file.size > 5 * 1024 * 1024) return;
                files.push(file);
            });
            layer.querySelector('[data-appeal-previews]').textContent = files.map(function (file) { return file.name; }).join(', ');
        });
        layer.addEventListener('click', function (event) {
            if (event.target === layer || event.target.closest('[data-peer-close]')) { layer.remove(); return; }
            if (event.target.closest('[data-appeal-send]')) {
                var reasons = [].map.call(layer.querySelectorAll('[data-reason]:checked'), function (node) { return node.value; });
                Promise.all(files.map(uploadEvidence)).then(function (urls) {
                    return api('/peer-reviews/' + reviewId + '/appeal', {method: 'POST', body: JSON.stringify({
                        description: layer.querySelector('[data-appeal-text]').value,
                        reasons: reasons,
                        evidence_urls: urls.filter(Boolean)
                    })});
                }).then(function () { layer.remove(); });
            }
        });
        document.body.appendChild(layer);
    }
    function uploadEvidence(file) {
        var data = new FormData();
        data.append('file', file);
        data.append('init_data', typeof getTelegramInitDataRaw === 'function' ? getTelegramInitDataRaw() : '');
        data.append('upload_kind', 'appeal_evidence');
        return fetch((window.API_BASE || '/api') + '/upload-icon', {method: 'POST', body: data}).then(function (response) { return response.json(); }).then(function (payload) { return payload && payload.url || ''; }).catch(function () { return ''; });
    }
    function scan(root) {
        (root || document).querySelectorAll('.peer-slot').forEach(function (node) {
            if (node.dataset.peerReady) return;
            node.dataset.peerReady = '1';
            mount(node, {targetId: Number(node.dataset.peerTarget || 0), progressId: Number(node.dataset.peerProgress || 0)});
        });
    }
    function openDeals() {
        api('/me/deal-history?limit=20&offset=0').then(function (payload) {
            var layer = document.createElement('div');
            layer.className = 'peer-layer';
            var deals = payload.deals || [];
            layer.innerHTML = '<div class="peer-sheet peer-list" role="dialog"><header><button type="button" data-peer-close>←</button><strong>' + e(ru() ? 'История сделок' : 'Deal history') + '</strong></header><div class="peer-feed">' + (deals.length ? deals.map(function (deal) {
                var rated = deal.my_peer_review && deal.my_peer_review.rating;
                return '<article class="peer-card"><b>' + e(deal.app_name || '') + '</b><small>' + e(deal.deal_kind || '') + ' · ' + e(deal.days_done || 0) + '</small><button type="button" data-progress="' + Number(deal.progress_id) + '">' + e(rated ? (Number(rated) > 0 ? '👍' : '👎') : (ru() ? 'Оставить отзыв' : 'Leave a review')) + '</button></article>';
            }).join('') : '<p class="peer-muted">' + e(ru() ? 'Завершённых сделок пока нет' : 'No finished deals yet') + '</p>') + '</div></div>';
            layer.addEventListener('click', function (event) {
                if (event.target === layer || event.target.closest('[data-peer-close]')) { layer.remove(); return; }
                var button = event.target.closest('[data-progress]');
                if (button) openRateSheet(Number(button.dataset.progress));
            });
            document.body.appendChild(layer);
        });
    }
    function decorateAppreciation(project) {
        var host = document.getElementById('peer-appreciation-host');
        if (!host || !project) return;
        var reliable = (project.testers || []).filter(function (tester) { return Number(tester.skips_count || 0) === 0 && tester.progress_id; });
        host.innerHTML = '<div class="peer-box"><button type="button" class="peer-link" id="peer-like-all">' + e(ru() ? '👍 Лайк всем без пропусков' : '👍 Like everyone with no skips') + ' (' + reliable.length + ')</button><div class="peer-people">' + reliable.map(function (tester) {
            return '<div class="peer-person"><span>@' + e(tester.username || tester.tester_id) + '</span><span class="peer-actions"><button type="button" data-progress="' + Number(tester.progress_id) + '" data-like="1">👍</button><button type="button" data-progress="' + Number(tester.progress_id) + '" data-like="-1">👎</button></span></div>';
        }).join('') + '</div></div>';
        host.onclick = function (event) {
            if (event.target.id === 'peer-like-all') api('/peer-reviews/batch-like', {method: 'POST', body: JSON.stringify({app_id: Number(project.id), progress_ids: reliable.map(function (tester) { return Number(tester.progress_id); })})});
            var button = event.target.closest('[data-progress]');
            if (button) openRateSheet(Number(button.dataset.progress), {presetRating: Number(button.dataset.like)});
        };
    }
    function boot() {
        var start = window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.start_param;
        var match = String(start || '').match(/^peer_review_(\d+)(_neg)?$/);
        if (match) openRateSheet(Number(match[1]), {presetRating: match[2] ? -1 : 1});
        var karmaHost = document.getElementById('karma-peer-reviews');
        if (karmaHost && typeof userId !== 'undefined') {
            karmaHost.innerHTML = '<button type="button" class="peer-summary" data-peer-list="' + Number(userId) + '"></button><button type="button" class="peer-link" data-peer-deals="1">' + e(ru() ? 'История сделок ›' : 'Deal history ›') + '</button>';
            api('/users/' + Number(userId) + '/peer-reviews?filter=all&limit=1').then(function (payload) {
                var button = karmaHost.querySelector('[data-peer-list]');
                if (button) button.textContent = summaryLine(payload.summary);
            }).catch(function () {});
            karmaHost.addEventListener('click', function (event) {
                if (event.target.closest('[data-peer-deals]')) openDeals();
                var list = event.target.closest('[data-peer-list]');
                if (list) openListModal(Number(list.dataset.peerList));
            });
        }
    }
    document.addEventListener('click', function (event) {
        var tag = event.target.closest('.peer-tag');
        if (tag) tag.classList.toggle('is-on');
    });
    window.PeerReviews = {mount: mount, scan: scan, openRateSheet: openRateSheet, openListModal: openListModal, openAppealModal: openAppealModal, decorateAppreciation: decorateAppreciation, openDeals: openDeals};
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
