/**
 * Mutual exchange UI helpers — barter chips, balance modal, unlink flag, archive.
 * Phase 2 frontend for mutual-link control.
 */
(function () {
    'use strict';

    var _balanceState = null;
    var _dismissedBrokenTesters = {};

    function _t(key, params) {
        var langCode = (typeof lang !== 'undefined' && lang) ? lang : 'ru';
        return window.t ? window.t(key, params || {}, langCode) : key;
    }

    function _esc(value) {
        return window.escapeHTML ? window.escapeHTML(String(value == null ? '' : value)) : String(value == null ? '' : value);
    }

    function calculateConsecutiveSkips(progressLike) {
        var row = progressLike || {};
        var timeline = String(row.daily_timeline || '');
        var testingDays = Number(row.testing_days || 0);
        if (!testingDays && row.start_date && typeof getUserTestingDay === 'function') {
            testingDays = getUserTestingDay(row.start_date);
        }
        if (testingDays <= 0) return 0;

        var todayIso = (typeof getLocalDateIso === 'function')
            ? getLocalDateIso()
            : new Date().toISOString().slice(0, 10);
        var lastCheck = String(row.last_check_date || '').trim();
        var checkedToday = !!lastCheck && lastCheck === todayIso;
        var realizedDays = checkedToday ? testingDays : Math.max(0, testingDays - 1);
        var standardDays = Math.min(14, Math.max(0, realizedDays));
        if (standardDays <= 0) return 0;

        if (timeline && timeline.length >= standardDays) {
            var streak = 0;
            for (var i = standardDays - 1; i >= 0; i -= 1) {
                var marker = timeline.charAt(i);
                if (marker === '0' || marker === '3') {
                    streak += 1;
                    continue;
                }
                break;
            }
            return streak;
        }

        var checkins = Math.min(14, Number(row.checkins_count || 0));
        return Math.max(0, standardDays - checkins);
    }

    function getBarterChipState(test) {
        var joinType = String(test && test.join_type || '').toLowerCase();
        if (joinType !== 'mutual' && joinType !== 'prelaunch') {
            return null;
        }

        if (test && test.is_mutual_debt) {
            var debtDays = Math.max(0, 14 - Number(test.testing_days || 0));
            if (Number(test.testing_days || 0) > 0 && Number(test.testing_days || 0) <= 14) {
                debtDays = Math.max(0, 14 - Number(test.testing_days || 0));
            } else if (Number(test.testing_days || 0) > 14) {
                debtDays = 0;
            }
            // Remaining days to finish partner project in debt mode ≈ max(0, 14 - testing_days)
            var remain = Math.max(0, 14 - Number(test.testing_days || 0));
            return {
                kind: 'debt',
                className: 'meta-chip accent-cyan barter-chip',
                label: _t('barterChipDebt', { days: remain }),
            };
        }

        var partnerProgress = String(test && test.partner_progress_status || '').toLowerCase();
        var partnerActive = test && typeof test.partner_active === 'boolean'
            ? test.partner_active
            : (partnerProgress === 'active');
        var hasReciprocal = Number(test && test.reciprocal_app_id || 0) > 0;

        if (hasReciprocal && !partnerActive && partnerProgress && partnerProgress !== 'completed') {
            return {
                kind: 'broken',
                className: 'meta-chip accent-danger barter-chip',
                label: _t('barterChipBroken'),
            };
        }

        if (!hasReciprocal && joinType === 'mutual') {
            // Voluntary / broken one-sided mutual still on My Tests
            return {
                kind: 'broken',
                className: 'meta-chip accent-danger barter-chip',
                label: _t('barterChipBroken'),
            };
        }

        var partnerConsecutive = Number(test && test.partner_consecutive_skips != null
            ? test.partner_consecutive_skips
            : 0);
        if (!(partnerConsecutive > 0)) {
            partnerConsecutive = calculateConsecutiveSkips({
                daily_timeline: test && test.partner_daily_timeline,
                testing_days: test && test.partner_testing_days,
                last_check_date: test && test.partner_last_check_date,
                checkins_count: test && test.partner_checkins,
            });
        }
        if (partnerConsecutive >= 3) {
            return {
                kind: 'warning',
                className: 'meta-chip accent-orange barter-chip',
                label: _t('barterChipWarning', { count: partnerConsecutive }),
            };
        }

        return {
            kind: 'ok',
            className: 'meta-chip accent-green barter-chip',
            label: _t('barterChipOk'),
        };
    }

    function buildBarterChipHtml(test) {
        var state = getBarterChipState(test);
        if (!state) return '';
        var appId = Number(test && (test.id || test.app_id) || 0);
        var archiveBtn = '';
        if (state.kind === 'broken' && appId > 0) {
            archiveBtn = ' <button type="button" class="barter-archive-btn" onclick="event.stopPropagation(); archiveBrokenMutualTest(' +
                appId + ')">' + _esc(_t('barterArchiveBtn')) + '</button>';
        }
        return '<span class="' + state.className + '" data-barter-kind="' + state.kind + '"' +
            ' onclick="event.stopPropagation(); openMutualBalanceModal(' + appId + ', event)">' +
            _esc(state.label) + '</span>' + archiveBtn;
    }

    function _readUnlinkReciprocalFromKickModal() {
        var checkbox = document.getElementById('kick-unlink-reciprocal');
        if (!checkbox) return true;
        return !!checkbox.checked;
    }

    function openMutualBalanceModal(appId, event, options) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        options = options || {};
        var modal = document.getElementById('mutual-balance-modal');
        var body = document.getElementById('mutual-balance-body');
        if (!modal || !body) return;

        var safeAppId = Number(appId || options.appId || 0);
        var test = (typeof getMyTestById === 'function')
            ? getMyTestById(safeAppId)
            : (Array.isArray(myTests) ? myTests.find(function (item) { return Number(item.id) === safeAppId; }) : null);

        // Dossier / projects context can pass explicit pair
        if (!test && options.testSnapshot) {
            test = options.testSnapshot;
        }

        _balanceState = {
            appId: safeAppId,
            testerId: Number(options.testerId || (test && test.owner_id) || 0),
            unlinkReciprocal: true,
            context: options.context || 'tests',
            projectId: Number(options.projectId || 0),
        };

        body.innerHTML = '<p style="text-align:center;color:var(--hint-color);">' +
            _esc(_t('mutualBalanceLoading')) + '</p>';
        modal.classList.add('active');

        var partnerUserId = Number(
            (typeof userId !== 'undefined' ? userId : 0)
        );
        // partner_stats endpoint expects the tester id for the progress on appId
        var statsTesterId = partnerUserId;
        if (options.context === 'projects' && options.testerId) {
            // Owner viewing: stats for the tester on owner's app
            statsTesterId = Number(options.testerId);
            safeAppId = Number(options.projectId || safeAppId);
            _balanceState.appId = safeAppId;
            _balanceState.testerId = statsTesterId;
        }

        var apiBase = (typeof API_BASE !== 'undefined') ? API_BASE : '';
        fetch(apiBase + '/tests/' + safeAppId + '/partner_stats/' + statsTesterId)
            .then(function (response) { return response.json().then(function (data) {
                return { ok: response.ok, data: data };
            }); })
            .then(function (result) {
                if (!_balanceState || Number(_balanceState.appId) !== safeAppId) return;
                if (!result.ok || !result.data || result.data.status !== 'success') {
                    body.innerHTML = _renderBalanceFromLocal(test, options);
                    return;
                }
                body.innerHTML = _renderBalanceFromStats(result.data, test, options);
            })
            .catch(function () {
                if (!_balanceState) return;
                body.innerHTML = _renderBalanceFromLocal(test, options);
            });
    }

    function _renderBalanceFromLocal(test, options) {
        options = options || {};
        var myName = (test && (test.reciprocal_app_name || test.name)) || _t('unknownLabel');
        var theirName = (test && test.name) || _t('unknownLabel');
        if (options.context === 'projects') {
            myName = options.myAppName || myName;
            theirName = options.theirAppName || theirName;
        }
        return _renderBalanceColumns({
            myAppName: options.context === 'projects' ? (options.myAppName || myName) : (test && test.reciprocal_app_name) || _t('mutualBalanceYourProject'),
            theirAppName: options.context === 'projects' ? (options.theirAppName || theirName) : (test && test.name) || theirName,
            myDays: Number(test && test.partner_testing_days || 0),
            theirDays: Number(test && test.testing_days || 0),
            mySkips: Number(test && test.partner_skips || 0),
            theirSkips: Number(test && test.skips_count || 0),
            partnerConsecutive: Number(test && test.partner_consecutive_skips || 0),
            partnerUsername: (test && test.owner_username) || '',
            partnerId: Number(test && test.owner_id || 0),
            partnerLeft: !!(test && test.partner_progress_status && test.partner_progress_status !== 'active'),
        });
    }

    function _renderBalanceFromStats(stats, test, options) {
        options = options || {};
        var myAppName = stats.partner_app_name || (test && test.reciprocal_app_name) || _t('mutualBalanceYourProject');
        var theirAppName = stats.app_name || (test && test.name) || _t('unknownLabel');
        if (options.context === 'projects') {
            myAppName = options.myAppName || myAppName;
            theirAppName = options.theirAppName || theirAppName;
        }
        return _renderBalanceColumns({
            myAppName: myAppName,
            theirAppName: theirAppName,
            myDays: Number(stats.partner_testing_days || 0),
            theirDays: Number(stats.my_testing_days || (test && test.testing_days) || 0),
            mySkips: Number(stats.partner_skips || 0),
            theirSkips: Number(stats.my_skips || (test && test.skips_count) || 0),
            partnerConsecutive: Number(stats.partner_consecutive_skips || 0),
            partnerUsername: stats.partner_username || (test && test.owner_username) || '',
            partnerId: Number(stats.partner_id || (test && test.owner_id) || 0),
            partnerLeft: !!stats.partner_left,
        });
    }

    function _renderBalanceColumns(data) {
        var hint = '';
        if (Number(data.partnerConsecutive || 0) >= 3 || data.partnerLeft) {
            hint = '<div class="details-block" style="border-color: rgba(255,149,0,0.28);">' +
                '<div style="font-size:13px;line-height:1.5;color:#ff9500;">' +
                _esc(_t('mutualBalancePartnerSkipHint')) +
                '</div></div>';
        }

        var tgLink = '';
        var username = String(data.partnerUsername || '').replace(/^@+/, '');
        if (username) {
            tgLink = 'https://t.me/' + encodeURIComponent(username);
        } else if (data.partnerId) {
            tgLink = 'tg://user?id=' + encodeURIComponent(String(data.partnerId));
        }

        return '' +
            '<div class="mutual-balance-grid">' +
                '<div class="mutual-balance-col details-block">' +
                    '<div class="detail-section-title">' + _esc(_t('mutualBalanceYouAtThem')) + '</div>' +
                    '<div class="mutual-balance-app">' + _esc(data.myAppName) + '</div>' +
                    '<div>' + _esc(_t('mutualBalanceDayOf', { day: data.myDays, total: 14 })) + '</div>' +
                    '<div>' + _esc(_t('mutualBalanceSkipsTotal', { skips: data.mySkips })) + '</div>' +
                '</div>' +
                '<div class="mutual-balance-col details-block">' +
                    '<div class="detail-section-title">' + _esc(_t('mutualBalanceThemAtYou')) + '</div>' +
                    '<div class="mutual-balance-app">' + _esc(data.theirAppName) + '</div>' +
                    '<div>' + _esc(_t('mutualBalanceDayOf', { day: data.theirDays, total: 14 })) + '</div>' +
                    '<div>' + _esc(_t('mutualBalanceSkipsTotal', { skips: data.theirSkips })) + '</div>' +
                '</div>' +
            '</div>' +
            hint +
            '<div class="action-row" style="margin-top:12px;gap:8px;flex-wrap:wrap;">' +
                (tgLink
                    ? '<button type="button" class="btn btn-secondary" style="flex:1;" onclick="openMutualBalanceTelegram(\'' +
                        String(tgLink).replace(/'/g, "\\'") + '\')">' + _esc(_t('mutualBalanceWriteTg')) + '</button>'
                    : '') +
                '<button type="button" class="btn" style="flex:1;background:rgba(255,59,48,0.12);color:#ff3b30;" onclick="startMutualBreakFromBalance()">' +
                    _esc(_t('mutualBalanceBreakBtn')) +
                '</button>' +
            '</div>';
    }

    function closeMutualBalanceModal(event) {
        var modal = document.getElementById('mutual-balance-modal');
        if (!modal) return;
        if (event && event.target !== modal) return;
        modal.classList.remove('active');
        _balanceState = null;
    }

    function openMutualBalanceTelegram(url) {
        if (!url) return;
        if (window.tg && typeof window.tg.openTelegramLink === 'function' && String(url).indexOf('t.me') !== -1) {
            window.tg.openTelegramLink(url);
            return;
        }
        window.open(url, '_blank');
    }

    function startMutualBreakFromBalance() {
        if (!_balanceState) return;
        var appId = Number(_balanceState.appId || 0);
        var context = _balanceState.context || 'tests';
        closeMutualBalanceModal();

        if (context === 'projects') {
            var projectId = Number(_balanceState.projectId || appId);
            var testerId = Number(_balanceState.testerId || 0);
            if (typeof openKickTesterModal === 'function') {
                openKickTesterModal(projectId, testerId, null, { forceUnlink: true });
            }
            return;
        }

        if (typeof openLeaveMutualModal === 'function') {
            // Stash preferred unlink for leave confirm
            window._pendingUnlinkReciprocal = true;
            openLeaveMutualModal(appId);
        }
    }

    async function archiveBrokenMutualTest(appId) {
        var safeAppId = Number(appId || 0);
        if (safeAppId <= 0) return;
        window._pendingUnlinkReciprocal = true;
        if (typeof openLeaveMutualModal === 'function') {
            openLeaveMutualModal(safeAppId);
            return;
        }
        if (typeof confirmLeaveMutual === 'function') {
            window._leaveMutualAppId = safeAppId;
            await confirmLeaveMutual(false);
        }
    }

    function isBrokenTesterDismissed(projectId, testerId) {
        return !!_dismissedBrokenTesters[String(projectId) + ':' + String(testerId)];
    }

    function dismissBrokenTester(projectId, testerId) {
        _dismissedBrokenTesters[String(projectId) + ':' + String(testerId)] = true;
        if (typeof window.renderProjects === 'function') {
            window.renderProjects(true);
        }
    }

    function openBrokenReciprocalPopup(projectId, testerId, appName) {
        var message = _t('brokenReciprocalPopupText', { name: appName || _t('unknownLabel') });
        var okLabel = _t('brokenReciprocalOkBtn');
        var finish = function (ok) {
            if (ok) dismissBrokenTester(projectId, testerId);
        };
        if (window.tg && typeof window.tg.showPopup === 'function') {
            window.tg.showPopup({
                title: _t('mutualBalanceBreakBtn'),
                message: message,
                buttons: [{ id: 'ok', type: 'default', text: okLabel }],
            }, function (buttonId) {
                finish(buttonId === 'ok' || buttonId === 'default' || !buttonId);
            });
            return;
        }
        if (window.tg && typeof window.tg.showConfirm === 'function') {
            window.tg.showConfirm(message, finish);
            return;
        }
        if (window.confirm(message)) finish(true);
    }

    function getKickUnlinkReciprocal() {
        return _readUnlinkReciprocalFromKickModal();
    }

    function consumePendingUnlinkReciprocal(defaultValue) {
        if (typeof window._pendingUnlinkReciprocal === 'boolean') {
            var value = window._pendingUnlinkReciprocal;
            window._pendingUnlinkReciprocal = null;
            return value;
        }
        return defaultValue !== false;
    }

    function showKickBlockedDialog(details) {
        var langCode = (typeof lang !== 'undefined' && lang) ? String(lang).toLowerCase() : 'ru';
        var message = '';
        if (details && typeof details === 'object') {
            message = langCode.indexOf('en') === 0
                ? (details.message_en || details.message_ru || '')
                : (details.message_ru || details.message_en || '');
        }
        if (!message) {
            message = _t('kickBlockedActiveTester');
        }
        if (window.tg && typeof window.tg.showAlert === 'function') {
            window.tg.showAlert(message);
        } else if (typeof showToast === 'function') {
            showToast(message);
        } else {
            window.alert(message);
        }
    }

    window.calculateConsecutiveSkips = calculateConsecutiveSkips;
    window.getBarterChipState = getBarterChipState;
    window.buildBarterChipHtml = buildBarterChipHtml;
    window.openMutualBalanceModal = openMutualBalanceModal;
    window.closeMutualBalanceModal = closeMutualBalanceModal;
    window.openMutualBalanceTelegram = openMutualBalanceTelegram;
    window.startMutualBreakFromBalance = startMutualBreakFromBalance;
    window.archiveBrokenMutualTest = archiveBrokenMutualTest;
    window.isBrokenTesterDismissed = isBrokenTesterDismissed;
    window.dismissBrokenTester = dismissBrokenTester;
    window.openBrokenReciprocalPopup = openBrokenReciprocalPopup;
    window.getKickUnlinkReciprocal = getKickUnlinkReciprocal;
    window.consumePendingUnlinkReciprocal = consumePendingUnlinkReciprocal;
    window.showKickBlockedDialog = showKickBlockedDialog;
})();
