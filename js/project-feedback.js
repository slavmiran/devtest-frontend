/* Internal ratings, participant tickets and owner Telegram destinations. */
(function () {
    'use strict';
    var U = window.LiveMarketUI;
    var t = U.t, e = U.e;
    var criteria = ['pfEase', 'pfPerformance', 'pfUseful'];
    var modes = ['off', 'voluntary', 'mutual'];
    var inbox = {tickets: [], tasks: {}}, inboxActor = '', inboxKey = '', pending, loadedAt = 0;
    var threadState = new WeakMap();

    function configFields(value, maxDay, inherit) {
        var current = value || {mode: inherit ? 'inherit' : 'off', day: null, bonus: 0};
        var day = current.day || Math.max(2, maxDay - 4);
        return '<fieldset class="pf-config"><legend>⭐ ' + e(t('pfModule')) + '</legend>' +
            '<label>' + e(t('pfMode')) + '<select class="gtw-input" data-pf-field="mode">' +
            (inherit ? ['inherit'].concat(modes) : modes).map(function (mode) {
                return '<option value="' + mode + '"' + (mode === current.mode ? ' selected' : '') + '>' + e(t('pfMode_' + mode)) + '</option>';
            }).join('') + '</select></label>' +
            '<div data-pf-open-fields' + (modes.indexOf(current.mode) > 0 ? '' : ' hidden') + '>' +
            '<label class="pf-inline"><input type="checkbox" data-pf-field="custom"' + (current.day ? ' checked' : '') + '> ' +
            e(t('pfCustomDay')) + '</label>' +
            '<label data-pf-day-box' + (current.day ? '' : ' hidden') + '>' + e(t('pfOpeningDay')) +
            '<output data-pf-day-output>D' + day + '</output><input type="range" data-pf-field="day" min="2" max="' + maxDay +
            '" value="' + day + '"></label>' +
            '<p class="pf-muted">' + e(inherit ? t('pfDefaultDay', {day: Math.max(2, maxDay - 4)}) : t('pfDefaultDayGeneric')) + '</p>' +
            '<label data-pf-bonus-box' + (current.mode === 'voluntary' ? '' : ' hidden') + '>' + e(t('pfBonus')) +
            '<input class="gtw-input" type="number" inputmode="numeric" data-pf-field="bonus" min="0" max="300" value="' +
            (Number(current.bonus) || 0) + '"></label>' +
            '<p data-pf-mirror-hint' + (current.mode === 'mutual' ? '' : ' hidden') + '>' + e(t('pfMirrorHint')) + '</p></div></fieldset>';
    }

    function configValue(field) {
        var root = field.closest('.pf-config');
        var selected = root.querySelector('[data-pf-field="mode"]').value;
        var custom = root.querySelector('[data-pf-field="custom"]').checked;
        var day = Number(root.querySelector('[data-pf-field="day"]').value);
        var bonus = root.querySelector('[data-pf-field="bonus"]');
        root.querySelector('[data-pf-open-fields]').hidden = !['voluntary','mutual'].includes(selected);
        root.querySelector('[data-pf-bonus-box]').hidden = selected !== 'voluntary';
        root.querySelector('[data-pf-day-box]').hidden = !custom;
        root.querySelector('[data-pf-day-output]').textContent = 'D' + day;
        root.querySelector('[data-pf-mirror-hint]').hidden = selected !== 'mutual';
        if (selected === 'inherit') return null;
        return {mode: selected, day: custom ? day : null, bonus: selected === 'voluntary' ? Number(bonus.value) : 0};
    }

    function badgeLabel(value) {
        if (!value || !['voluntary','mutual'].includes(value.mode)) return '';
        return t(value.mode === 'mutual' ? 'pfChipMutual' : value.bonus ? 'pfChipBonus' : 'pfChipVoluntary', {n: value.bonus});
    }
    function badge(value) {
        var label=badgeLabel(value);
        return label?'<span class="meta-chip pf-badge">'+e(label)+'</span>':'';
    }

    function ownerTools(app, live) {
        return '<button type="button" class="pc-project-param" data-pf-route="' + Number(app) + '">🏠 ' + e(t('pfRoutes')) + '</button>' +
            (live ? '<button type="button" class="pc-project-param" data-pf-settings="' + Number(app) + '">⭐ ' + e(t('pfModule')) + '</button>' : '');
    }

    async function settings(app, routing) {
        var actor = U.auth();
        var layer = U.sheet(t(routing ? 'pfRoutes' : 'pfModule'), '<p>' + e(t('lmLoading')) + '</p>');
        var host = layer.querySelector('.lm-sheet-body');
        try {
            var result = (await U.api('/apps/' + app + '/project-feedback-settings')).result;
            if (!layer.isConnected || actor !== U.auth()) return;
            var route = result.telegram || {}, topics = route.topics || {};
            host.innerHTML = '<form class="pf-layout">' + (routing ?
                '<p>' + e(t('pfRouteGuide')) + '</p><label>' + e(t('pfGroupId')) +
                '<input class="gtw-input" name="chat" type="text" inputmode="text" pattern="-?[0-9]+" placeholder="-100…" value="' + e(route.chat_id || '') + '" required></label>' +
                (route.title ? '<small class="pf-muted">' + e(route.title) + '</small>' : '') +
                ['reports','private','updates'].map(function (key) {
                    return '<label>' + e(t('pfTopic_' + key)) + '<input class="gtw-input" name="' + key +
                        '" type="number" inputmode="numeric" min="0" max="2147483647" value="' + e(topics[key]) +
                        '" placeholder="' + e(t('pfTopicDisabled')) + '"></label>';
                }).join('') + '<small class="pf-muted">' + e(t('pfTopicGeneral')) + '</small>' :
                configFields(result.impression, 60, false)) +
                '<p class="lm-error" role="alert" data-pf-error></p><div class="pf-actions"><button class="lm-action lm-action-primary">' +
                e(t('pfSave')) + '</button>' + (routing && route.chat_id ? '<button type="button" class="lm-action" data-pf-disconnect>' +
                e(t('pfDisconnect')) + '</button>' : '') + '</div></form>';
            var form = host.querySelector('form');
            form.addEventListener('input', function (event) { if (event.target.dataset.pfField) configValue(event.target); });
            form.onsubmit = function (event) { event.preventDefault(); save(false); };
            var disconnect = form.querySelector('[data-pf-disconnect]');
            if (disconnect) disconnect.onclick = function () { if (window.confirm(t('pfDisconnectConfirm'))) save(true); };
            async function save(remove) {
                var submit = form.querySelector('button:not([type])');
                if (submit.disabled) return;
                submit.disabled = true;
                var path = routing ? 'feedback-telegram-route' : 'project-feedback-settings';
                try {
                    var data = {settings: !routing ? configValue(form.querySelector('[data-pf-field]')) : null};
                    if (routing) {
                        var fields = new FormData(form);
                        data = {chat_id: remove ? null : Number(fields.get('chat')), topics: {}};
                        if (!remove) ['reports','private','updates'].forEach(function (key) {
                            var raw = fields.get(key);
                            data.topics[key] = raw === '' ? null : Number(raw);
                        });
                    }
                    await U.api('/apps/' + app + '/' + path, 'PUT', data);
                    U.close(layer);
                    if (window.showToast) window.showToast(t('pfSaved'));
                } catch (error) { showError(form,error); }
                finally { submit.disabled = false; }
            }
        } catch (error) { host.textContent = errorLabel(error); }
    }

    function errorLabel(error) {
        var key = 'pfError_' + String(error && error.message || '');
        var text = t(key);
        return text === key ? t('lmUnavailable') : text;
    }
    function showError(host, error) {
        var field = host.querySelector('[data-pf-error]');
        if (field) field.textContent = errorLabel(error);
    }
    function mediaUrl(path) {
        return String(window.API_BASE || '/api').replace(/\/$/,'') + path + '?init_data=' + encodeURIComponent(U.auth());
    }
    function iconCopy(text) {
        return '<button type="button" class="meta-chip pf-copy" data-pf-copy="' + e(text) + '" aria-label="' + e(t('growthCopy')) +
            '" title="' + e(t('growthCopy')) + '">📋</button>';
    }
    function historyHtml(items) {
        return '<details class="pf-history" data-pf-history><summary>🕒 ' + e(t('pfHistory')) + '</summary>' +
            (items.length ? '<ol>' + items.map(function (item) {
                var key = ['bug','idea','scenario','screenshot'].includes(item.kind) ? item.kind : 'checkin';
                return '<li><header><span>' + e((item.day ? 'D' + item.day + ' · ' : '') +
                    t('pfKind_' + key) + (item.count > 1 ? ' ×' + item.count : '')) + '</span>' +
                    (item.text ? iconCopy(item.text) : '') + '</header>' +
                    (item.proof_id ? '<button class="pf-thumb" type="button" data-pf-proof="' + Number(item.proof_id) +
                        '" data-pf-count="' + Number(item.count || 1) + '" aria-label="' + e(t('pfOpenProof')) + '">📷</button>' : '') +
                    (item.text ? '<p>' + e(item.text) + '</p>' : '') + '</li>';
            }).join('') + '</ol>' : '<p class="pf-muted">' + e(t('pfHistoryEmpty')) + '</p>') + '</details>';
    }

    async function thumbnails(details) {
        var nodes = Array.from(details.querySelectorAll('[data-pf-proof]:not([data-loaded])'));
        var observer = new IntersectionObserver(function (entries) {
            entries.filter(function (entry) { return entry.isIntersecting; }).forEach(function (entry) {
                var node = entry.target;
                observer.unobserve(node);
                node.dataset.loaded='1';
                U.api('/checkin-proofs/' + Number(node.dataset.pfProof) + '/media-ticket','POST',{variant:'thumb'})
                    .then(function (response) {
                        if (!node.isConnected || !response.url) return;
                        var img = document.createElement('img');
                        img.src = /^https?:/i.test(response.url) ? response.url :
                            String(window.API_BASE || '/api').replace(/\/?api\/?$/,'') + response.url;
                        img.alt = '';
                        node.replaceChildren(img);
                    }).catch(function () { delete node.dataset.loaded; });
            });
        });
        nodes.forEach(function (node) { observer.observe(node); });
    }

    async function openImpression(app) {
        var actor = U.auth();
        var layer = U.sheet('⭐ ' + t('pfTitle'), '<p>' + e(t('lmLoading')) + '</p>');
        var host = layer.querySelector('.lm-sheet-body');
        try {
            var result = (await U.api('/apps/' + app + '/project-impression')).result;
            if (!layer.isConnected || actor !== U.auth()) return;
            var task = result.task;
            if (task && task.stage === 'submitted') {
                U.close(layer); return openThread(task.feedback_id);
            }
            if (!task || task.stage !== 'open') {
                host.textContent = t('pfLocked', {day: task && task.day || '—'}); return;
            }
            var scores = [0,0,0], mutual = task.mode === 'mutual';
            host.innerHTML = '<form class="pf-layout pf-impression"><p class="pf-lead">' + e(t('pfSubtitle')) + '</p>' +
                criteria.map(function (key, index) {
                    return '<fieldset class="pf-score" aria-label="' + e(t(key)) + '"><legend>' + e(t(key)) + '</legend><div>' +
                        [1,2,3,4,5].map(function (score) {
                            return '<button type="button" class="pf-star" aria-label="' + score + ' ★" aria-pressed="false" data-pf-score="' +
                                score + '" data-pf-criterion="' + index + '">★</button>';
                        }).join('') + '</div></fieldset>';
                }).join('') + '<output class="pf-average" data-pf-average>' + e(t('pfAverage',{n:'—'})) + '</output>' +
                '<small class="pf-muted">' + e(t('pfHonesty')) + '</small><label>' + e(t('pfText')) +
                '<textarea name="text" class="gtw-textarea" rows="3" maxlength="4000" placeholder="' + e(t('pfPlaceholder')) +
                '"></textarea></label><small data-pf-counter class="pf-muted"></small>' +
                (task.bonus ? '<label class="pf-inline"><input name="bonus" type="checkbox"> ' + e(t('pfClaimBonus',{n:task.bonus})) + '</label>' : '') +
                historyHtml(result.history || []) + '<label class="pf-inline"><input name="share" type="checkbox"> ' + e(t('pfConsent')) +
                '</label><small class="pf-muted">' + e(t('pfPrivacy')) + '</small><p class="lm-error" role="alert" data-pf-error></p>' +
                '<button class="lm-action lm-action-primary" data-pf-submit disabled>' + e(t('pfSend')) + '</button></form>';
            var form = host.querySelector('form'), submit = form.querySelector('[data-pf-submit]');
            function update() {
                var text = form.elements.text.value.trim().replace(/\s+/gu,' ');
                var length = Array.from(text).length;
                var minimum = mutual || Boolean(form.elements.bonus && form.elements.bonus.checked);
                var count = form.querySelector('[data-pf-counter]');
                count.textContent = minimum ? t('pfMinCount',{n:length}) : t('pfCount',{n:length});
                var complete = scores.every(Boolean), any = scores.some(Boolean);
                submit.disabled = (mutual ? !complete : any && !complete || !any && !length) || minimum && length < 80;
                var mean = complete ? (scores.reduce(function (a,b) { return a+b; },0)/3).toLocaleString(window.lang,{maximumFractionDigits:1}) : '—';
                form.querySelector('[data-pf-average]').textContent = t('pfAverage',{n:mean});
            }
            form.addEventListener('input', update);
            form.addEventListener('click',function (event) {
                var star = event.target.closest('[data-pf-score]');
                if (!star) return;
                var index = Number(star.dataset.pfCriterion), value = Number(star.dataset.pfScore);
                scores[index] = scores[index] === value ? 0 : value;
                form.querySelectorAll('[data-pf-criterion="' + index + '"]').forEach(function (item) {
                    item.classList.toggle('is-filled', Number(item.dataset.pfScore) <= scores[index]);
                    item.setAttribute('aria-pressed', String(Number(item.dataset.pfScore) === scores[index]));
                });
                update();
            });
            form.onsubmit = async function (event) {
                event.preventDefault();
                if (submit.disabled) return;
                submit.disabled = true;
                try {
                    var response = await U.api('/apps/' + app + '/project-impression','POST',{
                        text:form.elements.text.value, scores:scores.every(Boolean)?scores:null,
                        claim_bonus:Boolean(form.elements.bonus&&form.elements.bonus.checked),share_text:form.elements.share.checked});
                    U.close(layer); refreshCards(true); openThread(response.result);
                } catch (error) { showError(form,error); update(); }
            };
            update();
        } catch (error) { host.textContent = errorLabel(error); }
    }

    function threadControls(row) {
        var open = ['pending','needs_reply','new','processing'].includes(row.status);
        var owner = row.role === 'owner';
        return '<div class="pf-chat-log" data-pf-chat-log></div>' +
            (open ? '<form class="pf-layout pf-compose"><small class="pf-muted">' + e(t(['bug','idea'].includes(row.type) ? 'pfPublicMirror' : 'pfPrivateThread')) +
                '</small><label>' + e(t('pfReply')) +
                '<textarea class="gtw-textarea" name="body" maxlength="2000" rows="2"></textarea></label>' +
                '<label>' + e(t('pfAddScreenshot')) + '<input type="file" name="file" accept="image/png,image/jpeg,image/webp"></label>' +
                '<button class="lm-action lm-action-primary">' + e(t(owner ? 'pfAsk' : 'pfSend')) + '</button></form>' : '') +
            (owner && open ? '<div class="pf-actions"><button type="button" class="lm-action" data-pf-close="accepted">' + e(t('pfAccept')) +
                '</button>' + (row.type === 'project_impression' ? '<button type="button" class="lm-action" data-pf-close="rejected">' +
                e(t('pfDecline')) + '</button>' : '') + '</div>' : '') +
            (owner && row.type === 'project_impression' && row.status === 'accepted' && row.scores && !row.shared_at ?
                '<div class="pf-share">' + (row.share_text ? '<label class="pf-inline"><input data-pf-share-text type="checkbox"> ' +
                e(t('pfIncludeText')) + '</label>' : '') + '<button type="button" class="lm-action" data-pf-share>' +
                e(t('pfShare')) + '</button></div>' : '') + '<p class="lm-error" role="alert" data-pf-error></p>';
    }
    function paintLog(host, row) {
        var log = host.querySelector('[data-pf-chat-log]');
        log.innerHTML = (row.status === 'needs_reply' ? '<p class="pf-muted">' + e(t('pfNeedsReply')) + '</p>' : '') +
            (row.scores ? '<p class="pf-ticket-scores">' + row.scores.map(function (value, index) {return e(t(criteria[index])) + ' · <b>' + Number(value) + '★</b>';}).join('<br>') + '</p>' : '') +
            (row.body ? '<article class="pf-message"><header>' + e(t('pfTester')) + iconCopy(row.body) + '</header><p>' + e(row.body) + '</p></article>' : '') +
            (row.comments.length >= 60 ? '<button type="button" class="meta-chip" data-pf-more>' + e(t('pfMore')) + '</button>' : '') +
            row.comments.map(function (comment) {
                var mine = comment.author_role === row.role;
                return '<article class="pf-message' + (mine ? ' is-mine' : '') + '"><header><span>' +
                    e(t(comment.author_role === 'owner' ? 'pfDeveloper' : 'pfTester')) + '</span>' +
                    (comment.body ? iconCopy(comment.body) : '') + '</header>' + (comment.body ? '<p>' + e(comment.body) + '</p>' : '') +
                    (comment.has_media ? '<a target="_blank" rel="noopener noreferrer" href="' + e(mediaUrl('/feedback/' + row.id +
                        '/thread/' + comment.id + '/media')) + '"><img alt="' + e(t('pfAddScreenshot')) + '" loading="lazy" src="' +
                        e(mediaUrl('/feedback/' + row.id + '/thread/' + comment.id + '/media')) + '"></a>' : '') + '</article>';
            }).join('');
    }
    function paintThread(host, row) {
        if (!host.isConnected) return;
        var card = host.closest('.fb-card');
        if (card && card.dataset.feedbackStatus !== row.status) {
            var open = ['new','pending','processing','needs_reply'].includes(row.status);
            card.dataset.feedbackStatus = row.status;
            card.classList.toggle('fb-card--new', open);
            card.classList.toggle('fb-card--processed', !open);
            card.classList.toggle('fb-card--rejected', row.status === 'rejected');
            if (!open) {
                card.querySelector('.fb-toolbar-decide')?.remove();
                card.querySelector('.fb-avatar-badge-new')?.remove();
            }
            var summary = card.querySelector('.fb-micro-line');
            if (summary && window.buildFeedbackMicroSummaryHtml) summary.innerHTML = window.buildFeedbackMicroSummaryHtml(row, row.status === 'rejected');
            if (window.applyProjectFeedbackFilters) window.applyProjectFeedbackFilters();
        }
        threadState.set(host,row);
        host.innerHTML = threadControls(row);
        paintLog(host,row);
        var form = host.querySelector('form');
        if (form) form.onsubmit = async function (event) {
            event.preventDefault();
            var button = form.querySelector('button'), file = form.elements.file.files[0];
            if (button.disabled || !form.elements.body.value.trim() && !file) return;
            button.disabled = true;
            try {
                var data = new FormData(form);
                if (!file) data.delete('file');
                else if (file.size > 3145728) throw Error('invalid_feedback_comment');
                data.set('init_data', U.auth());
                if (!form.dataset.key) form.dataset.key = window.LiveCampaigns.requestKey();
                data.set('request_key', form.dataset.key);
                var response = await fetch(String(window.API_BASE || '/api').replace(/\/$/,'') + '/feedback/' + row.id + '/thread',
                    {method:'POST',body:data});
                var result = await response.json();
                if (!response.ok) throw Error(result.code || 'unavailable');
                paintThread(host,result.result);
                refreshCards(true);
            } catch (error) { showError(host,error); button.disabled=false; }
        };
    }

    async function loadThread(host, id) {
        var actor = U.auth();
        try {
            var result = (await U.api('/feedback/' + id + '/thread')).result;
            if (host.isConnected && actor === U.auth()) paintThread(host, result);
        }
        catch (error) { if (host.isConnected) host.textContent = errorLabel(error); }
    }
    function openThread(id) {
        var layer = U.sheet(t('pfThread'), '<section class="pf-thread" data-pf-thread-host><p>' + e(t('lmLoading')) + '</p></section>');
        loadThread(layer.querySelector('[data-pf-thread-host]'), Number(id));
    }
    function embed(id) {
        return '<details class="pf-thread-embed" data-pf-embed="' + Number(id) + '"><summary>💬 ' + e(t('pfThread')) +
            '</summary><section class="pf-thread" data-pf-thread-host><p>' + e(t('lmLoading')) + '</p></section></details>';
    }
    function ownerBanner(app) {
        return '<aside class="pf-route-banner"><p>' + e(t('pfBanner')) + '</p><button class="lm-action" data-pf-route="' +
            Number(app) + '" type="button">🏠 ' + e(t('pfRoutes')) + '</button></aside>';
    }
    function mountCard(card,id) {
        if (!card || !Number(id)) return;
        var slot = document.createElement('div');
        slot.className='pf-test-feedback';
        slot.dataset.pfCard=Number(id);
        card.append(slot);
        paintCards();
    }
    function paintCards() {
        var data = inboxActor === U.auth() ? inbox : {tickets: [], tasks: {}};
        document.querySelectorAll('[data-pf-card]').forEach(function (slot) {
            var app=Number(slot.dataset.pfCard), task=(data.tasks||{})[app];
            var tickets=(data.tickets||[]).filter(function (row) {return Number(row.app_id)===app;});
            var content=(task&&task.stage!=='submitted'?'<button type="button" class="lm-action" data-pf-impression="'+app+'"'+
                (task.stage==='locked'?' disabled':'')+'>⭐ '+e(task.stage==='locked'?t('pfLocked',{day:task.day}):t('pfModule'))+'</button>':'')+
                (tickets.length?'<details'+(tickets.some(function (row) {return row.status==='needs_reply';})?' open':'')+'><summary>💬 '+
                e(t(tickets.some(function (row) {return row.status==='needs_reply';})?'pfNeedsReply':'pfMyThreads'))+'</summary>'+
                tickets.map(function (row) {return '<button type="button" class="lm-action" data-pf-open-ticket="'+Number(row.id)+'">'+
                    e(t('pfKind_'+row.type)+(row.status==='needs_reply'?' · '+t('pfNeedsReply'):'')+
                        (row.message_text?' · '+row.message_text.trim().slice(0,54):''))+'</button>';}).join('')+'</details>':'');
            if (slot.dataset.pfContent!==content) { slot.dataset.pfContent=content; slot.innerHTML=content; }
        });
    }
    function refreshCards(force) {
        var actor=U.auth(), ids=Array.from(new Set(Array.from(document.querySelectorAll('[data-pf-card]'),function (slot) {
            return Number(slot.dataset.pfCard);
        }))).slice(0,100);
        if (inboxActor !== actor) paintCards();
        if (!actor||!ids.length) return;
        var key=actor+'|'+ids.sort().join(',');
        if (!force&&((pending&&pending===key)||key===inboxKey&&Date.now()-loadedAt<20000)) return;
        pending=key;
        var params=new URLSearchParams();
        ids.forEach(function (id) { params.append('app',String(id)); });
        U.api('/my-feedback-threads?'+params).then(function (response) {
            if (actor!==U.auth()||pending!==key) return;
            inbox=response.result||{tickets:[],tasks:{}}; inboxActor=actor; inboxKey=key; loadedAt=Date.now(); paintCards();
        }).catch(function () {}).finally(function () {if(pending===key)pending=null;});
    }

    document.addEventListener('toggle',function (event) {
        var node=event.target;
        if (!(node instanceof HTMLDetailsElement)||!node.open) return;
        if(node.dataset.pfEmbed) loadThread(node.querySelector('[data-pf-thread-host]'),Number(node.dataset.pfEmbed));
        if(node.hasAttribute('data-pf-history')) thumbnails(node);
    },true);
    document.addEventListener('click',async function (event) {
        var b=event.target.closest('[data-pf-route],[data-pf-settings],[data-pf-impression],[data-pf-open-ticket],[data-pf-copy],[data-pf-proof],[data-pf-close],[data-pf-share],[data-pf-more]');
        if(!b)return;
        event.stopPropagation();
        if(b.dataset.pfRoute) return settings(Number(b.dataset.pfRoute),true);
        if(b.dataset.pfSettings) return settings(Number(b.dataset.pfSettings),false);
        if(b.dataset.pfImpression) return openImpression(Number(b.dataset.pfImpression));
        if(b.dataset.pfOpenTicket) return openThread(Number(b.dataset.pfOpenTicket));
        if(b.dataset.pfCopy) {
            if(window.LiveRouteUI&&await LiveRouteUI.copy(b.dataset.pfCopy)&&window.showToast)window.showToast(t('growthCopied'));
            return;
        }
        if(b.dataset.pfProof&&window.openCheckinProofOverview)return openCheckinProofOverview(Number(b.dataset.pfProof),{imageCount:Number(b.dataset.pfCount)});
        var host=b.closest('[data-pf-thread-host]'), row=threadState.get(host);
        if(!row||b.disabled)return;
        b.disabled=true;
        try {
            if(b.hasAttribute('data-pf-more')){
                var older=(await U.api('/feedback/'+row.id+'/thread?before='+Number(row.comments[0].id))).result;
                row.comments=older.comments.concat(row.comments);paintLog(host,row);
                var more=host.querySelector('[data-pf-more]');
                if(more)more.hidden=older.comments.length<60;
            } else if(b.hasAttribute('data-pf-share')){
                if(window.confirm(t('pfShareConfirm'))){
                    await U.api('/feedback/'+row.id+'/thread/share','POST',{include_text:Boolean(host.querySelector('[data-pf-share-text]:checked'))});
                    b.remove();
                    if(window.showToast)window.showToast(t('pfShared'));
                }
            } else if(b.dataset.pfClose){
                var canonical=['bug','idea'].includes(row.type);
                var updated=await U.api('/feedback/'+row.id+(canonical?'/accept':'/thread/close'),'POST',canonical?
                    {bust_amount:0,karma_amount:0,reply_text:''}:{action:b.dataset.pfClose});
                if(canonical)await loadThread(host,row.id);else paintThread(host,updated.result);
                refreshCards(true);
            }
        }catch(error){showError(host,error);}
        finally{b.disabled=false;}
    },true);
    setInterval(function () {
        if(document.hidden)return;
        if(document.querySelector('#tab-tests.active'))refreshCards();
        document.querySelectorAll('details[open] > [data-pf-thread-host],.lm-sheet-overlay [data-pf-thread-host]').forEach(function (host) {
            var row=threadState.get(host);
            if(!row||host.querySelector('button:disabled,textarea:focus')||host.querySelector('textarea')?.value)return;
            U.api('/feedback/'+row.id+'/thread').then(function (response) {
                if(!host.isConnected||threadState.get(host)!==row)return;
                if(response.result.status!==row.status||response.result.comments.at(-1)?.id!==row.comments.at(-1)?.id)paintThread(host,response.result);
            }).catch(function () {});
        });
    },20000);
    window.ProjectFeedback={configFields:configFields,configValue:configValue,badge:badge,badgeLabel:badgeLabel,embed:embed,ownerTools:ownerTools,
        ownerBanner:ownerBanner,mountCard:mountCard,refreshCards:refreshCards};
})();
