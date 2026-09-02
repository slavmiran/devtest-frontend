/**
 * Mutual exchange UI helpers — barter chips, balance modal, unlink flag, archive.
 * Phase 2–3 frontend for mutual-link control + UI polish.
 */
(function () {
    'use strict';

    var _balanceState = null;
    var _bellRemindState = null;
    var _dismissedBrokenTesters = {};

    function _lang() {
        return (typeof lang !== 'undefined' && lang) ? String(lang) : 'ru';
    }

    function _t(key, params) {
        return window.t ? window.t(key, params || {}, _lang()) : key;
    }

    function _esc(value) {
        return window.escapeHTML ? window.escapeHTML(String(value == null ? '' : value)) : String(value == null ? '' : value);
    }

    /** Russian plural form picker: one / few / many */
    function pluralizeRu(count, one, few, many) {
        var value = Math.abs(Number(count) || 0);
        var mod10 = value % 10;
        var mod100 = value % 100;
        if (mod10 === 1 && mod100 !== 11) return one;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
        return many;
    }

    function pluralizeSkipWord(count) {
        var value = Math.abs(Number(count) || 0);
        if (_lang().indexOf('ru') !== 0) {
            return value === 1 ? _t('skipWord_one') : _t('skipWord_many');
        }
        return pluralizeRu(value, _t('skipWord_one'), _t('skipWord_few'), _t('skipWord_many'));
    }

    function formatSkipsLabel(count) {
        var safe = Math.max(0, Number(count) || 0);
        return String(safe) + ' ' + pluralizeSkipWord(safe);
    }

    function formatBarterWarningLabel(count) {
        var safe = Math.max(0, Number(count) || 0);
        return _t('barterChipWarning', {
            count: safe,
            word: pluralizeSkipWord(safe),
        });
    }

    function _renderIconHtml(name, iconUrl) {
        if (typeof renderIcon === 'function') {
            return renderIcon(name || '?', iconUrl || '');
        }
        var letter = String(name || '?').charAt(0).toUpperCase();
        return '<div class="avatar">' + _esc(letter) + '</div>';
    }

    function _parseIsoDateOnly(value) {
        var match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return null;
        return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }

    function _formatDateShort(value) {
        var d = _parseIsoDateOnly(value);
        if (!d || isNaN(d.getTime())) return '';
        var activeLang = (typeof lang !== 'undefined' && lang) ? lang : 'ru';
        return d.toLocaleDateString(activeLang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' });
    }

    function calculateConsecutiveSkips(progressLike) {
        var row = progressLike || {};
        var todayIso = (typeof getLocalDateIso === 'function')
            ? getLocalDateIso()
            : ((typeof getLocalDate === 'function') ? getLocalDate() : '');
        var today = _parseIsoDateOnly(todayIso);
        if (!today) return 0;
        var yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
        var lastCheck = _parseIsoDateOnly(row.last_check_date);
        var start = _parseIsoDateOnly(row.start_date);
        var streakStart;
        if (lastCheck) {
            if (lastCheck.getTime() >= today.getTime()) return 0;
            streakStart = new Date(lastCheck.getFullYear(), lastCheck.getMonth(), lastCheck.getDate() + 1);
        } else if (start) {
            streakStart = start;
        } else {
            return 0;
        }
        if (streakStart.getTime() > yesterday.getTime()) return 0;
        return Math.round((yesterday.getTime() - streakStart.getTime()) / 86400000) + 1;
    }

    function getBarterChipState(test) {
        var joinType = String(test && test.join_type || '').toLowerCase();
        var progressStatus = String(test && test.progress_status || 'active').toLowerCase();
        if (progressStatus === 'kicked_by_owner' || progressStatus === 'canceled_neutral') {
            return {
                kind: 'broken',
                className: 'meta-chip accent-danger barter-chip',
                label: _t('barterChipBroken'),
            };
        }
        if (joinType !== 'mutual' && joinType !== 'prelaunch') {
            return null;
        }

        var exchangeState = test && test.exchange_state && Number(test.exchange_state.version || 0) >= 1
            ? test.exchange_state
            : null;

        if (exchangeState && exchangeState.is_broken) {
            return {
                kind: 'broken',
                className: 'meta-chip accent-danger barter-chip',
                label: _t('barterChipBroken'),
            };
        }

        if ((exchangeState && exchangeState.is_mutual_debt) || (!exchangeState && test && test.is_mutual_debt)) {
            return {
                kind: 'debt',
                className: 'meta-chip accent-cyan barter-chip',
                label: _t('barterChipDebt'),
            };
        }

        var partnerProgress = String(test && test.partner_progress_status || '').toLowerCase();
        var partnerActive = test && typeof test.partner_active === 'boolean'
            ? test.partner_active
            : (partnerProgress === 'active');
        var hasReciprocal = Number(test && test.reciprocal_app_id || 0) > 0;

        if (!exchangeState && hasReciprocal && !partnerActive && partnerProgress && partnerProgress !== 'completed') {
            return {
                kind: 'broken',
                className: 'meta-chip accent-danger barter-chip',
                label: _t('barterChipBroken'),
            };
        }

        if (!exchangeState && !hasReciprocal && joinType === 'mutual') {
            // Voluntary / broken one-sided mutual still on My Tests
            return {
                kind: 'broken',
                className: 'meta-chip accent-danger barter-chip',
                label: _t('barterChipBroken'),
            };
        }

        // Warning state must come from the same server snapshot as the balance
        // modal. Recalculating from dates in the browser produced a different
        // result around local midnight.
        var partnerMetrics = exchangeState && exchangeState.right && exchangeState.right.metrics;
        var partnerConsecutive = Number(
            partnerMetrics && partnerMetrics.consecutive_skips != null
                ? partnerMetrics.consecutive_skips
                : (test && test.partner_consecutive_skips != null ? test.partner_consecutive_skips : 0)
        );
        if (partnerConsecutive >= 3) {
            return {
                kind: 'warning',
                className: 'meta-chip accent-orange barter-chip',
                label: _t('barterChipWarning'),
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
        return '<span class="' + state.className + '" data-barter-kind="' + state.kind + '"' +
            ' onclick="event.stopPropagation(); openMutualBalanceModal(' + appId + ', event)">' +
            _esc(state.label) + '</span>';
    }

    function _readUnlinkReciprocalFromKickModal() {
        if (typeof window.getTermUnlinkReciprocal === 'function') {
            return !!window.getTermUnlinkReciprocal();
        }
        var checkbox = document.getElementById('term-unlink-reciprocal')
            || document.getElementById('kick-unlink-reciprocal');
        if (!checkbox) return true;
        return !!checkbox.checked;
    }

    function _normalizeJoinType(value) {
        var joinType = String(value || 'invite').toLowerCase();
        if (joinType === 'prelaunch') return 'mutual';
        if (joinType === 'direct') return 'invite';
        return joinType;
    }

    function _isMutualJoin(joinType) {
        var normalized = _normalizeJoinType(joinType);
        return normalized === 'mutual';
    }

    function _linkTypeBadge(joinType, options) {
        options = options || {};
        if (options.isDebt) {
            return { className: 'is-debt', label: _t('linkedBadgeDebt') };
        }
        if (options.isBroken) {
            return { className: 'is-broken', label: _t('linkedBadgeBroken') };
        }
        var normalized = _normalizeJoinType(joinType);
        if (normalized === 'bounty') {
            return { className: 'is-bounty', label: _t('linkedBadgeBounty') };
        }
        if (normalized === 'mutual') {
            return { className: 'is-mutual', label: _t('linkedBadgeMutual') };
        }
        return { className: 'is-direct', label: _t('linkedBadgeDirect') };
    }

    function _linkStatusTitle(joinType, options) {
        options = options || {};
        if (options.isDebt) return _t('linkStatusTitleDebt');
        if (options.isBroken) return _t('linkStatusTitleBroken');
        var normalized = _normalizeJoinType(joinType);
        if (normalized === 'bounty') return _t('linkStatusTitleBounty');
        if (normalized === 'mutual') return _t('linkStatusTitleMutual');
        return _t('linkStatusTitleDirect');
    }

    function _renderPersonAvatar(fullName, username, avatarUrl) {
        if (avatarUrl) {
            return '<img class="link-status-avatar-img" src="' + _esc(avatarUrl) + '" alt="" ' +
                'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';">' +
                '<span class="link-status-avatar-fallback" style="display:none;">' +
                _esc(String(fullName || username || '?').charAt(0).toUpperCase()) +
                '</span>';
        }
        return '<span class="link-status-avatar-fallback">' +
            _esc(String(fullName || username || '?').charAt(0).toUpperCase()) +
            '</span>';
    }

    function _renderPersonHero(data) {
        var fullName = String(data.fullName || '').trim();
        var username = String(data.username || '').replace(/^@+/, '').trim();
        var badge = _linkTypeBadge(data.joinType, {
            isDebt: !!data.isDebt,
            isBroken: !!data.isBroken,
        });
        var nameLine = fullName || (username ? ('@' + username) : _t('unknownLabel'));
        var nickLine = username
            ? ('@' + username)
            : (data.userId ? ('ID ' + String(data.userId)) : '');
        return '' +
            '<div class="link-status-person">' +
                '<div class="link-status-avatar">' +
                    _renderPersonAvatar(fullName, username, data.avatarUrl) +
                '</div>' +
                '<div class="link-status-person-copy">' +
                    '<div class="link-status-fullname notranslate">' + _esc(nameLine) + '</div>' +
                    (nickLine && fullName
                        ? '<div class="link-status-username notranslate">' + _esc(nickLine) + '</div>'
                        : '') +
                '</div>' +
                '<span class="link-status-type-badge ' + badge.className + '">' + _esc(badge.label) + '</span>' +
            '</div>';
    }

    function openTesterLinkStatusFromRow(projectId, testerId, event, options) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        options = options || {};
        var safeProjectId = Number(projectId || 0);
        var safeTesterId = Number(testerId || 0);
        if (safeProjectId <= 0 || safeTesterId <= 0) return;

        var project = Array.isArray(myProjects)
            ? myProjects.find(function (item) { return Number(item.id) === safeProjectId; })
            : null;
        var tester = project && Array.isArray(project.testers)
            ? project.testers.find(function (item) { return Number(item.tester_id) === safeTesterId; })
            : null;
        if (!tester && project && Array.isArray(project.left_testers)) {
            tester = project.left_testers.find(function (item) { return Number(item.tester_id) === safeTesterId; }) || null;
        }

        var myAppName = (project && project.name) || options.myAppName || '';
        var myIconUrl = (project && project.icon_url) || options.myIconUrl || '';
        var theirAppName = (tester && tester.reciprocal_app_name) || options.theirAppName || '';
        var theirIconUrl = (tester && tester.reciprocal_app_icon_url) || options.theirIconUrl || '';
        var reciprocalAppId = Number(
            options.reciprocalAppId
            || (tester && tester.reciprocal_app_id)
            || 0
        );
        if (Array.isArray(myTests) && reciprocalAppId > 0) {
            var reciprocalTest = myTests.find(function (item) {
                return Number(item.id || item.app_id || 0) === reciprocalAppId;
            });
            if (reciprocalTest) {
                if (!theirAppName) theirAppName = String(reciprocalTest.name || '').trim();
                if (!theirIconUrl) theirIconUrl = String(reciprocalTest.icon_url || '').trim();
            }
        }

        var partnerProgressStatus = String((tester && tester.reciprocal_partner_progress_status) || '').toLowerCase();
        var isViewerLeft = partnerProgressStatus === 'abandoned'
            || partnerProgressStatus === 'justified_exit'
            || partnerProgressStatus === 'kicked_by_owner'
            || partnerProgressStatus === 'canceled_neutral'
            || partnerProgressStatus === 'dropped';
        var testerProgressStatus = String((tester && tester.status) || '').toLowerCase();
        var isTesterLeft = !!options.leftSoft || !!(tester && tester.is_left_soft)
            || testerProgressStatus === 'abandoned'
            || testerProgressStatus === 'justified_exit'
            || testerProgressStatus === 'kicked_by_owner'
            || testerProgressStatus === 'canceled_neutral'
            || testerProgressStatus === 'dropped';
        var isBroken = options.isBroken != null ? !!options.isBroken : (isViewerLeft || isTesterLeft || !!(tester && tester.is_broken_reciprocal));

        openMutualBalanceModal(safeProjectId, null, {
            context: 'projects',
            projectId: safeProjectId,
            testerId: safeTesterId,
            joinType: (tester && tester.join_type) || 'invite',
            testerUsername: String((tester && tester.username) || '').replace(/^@+/, ''),
            testerFullName: String((tester && tester.full_name) || '').trim(),
            testerAvatarUrl: String((tester && tester.avatar_url) || '').trim(),
            testerLanguage: String((tester && tester.language) || '').trim(),
            myAppName: myAppName,
            theirAppName: theirAppName,
            myIconUrl: myIconUrl,
            theirIconUrl: theirIconUrl,
            testerSnapshot: tester,
            isMutualDebt: options.isMutualDebt != null ? !!options.isMutualDebt : !!(tester && tester.is_mutual_debt),
            mutualDebtHolder: options.mutualDebtHolder || (tester && tester.mutual_debt_holder) || '',
            leftSoft: isTesterLeft,
            isTesterLeft: isTesterLeft,
            isViewerLeft: isViewerLeft,
            isBroken: isBroken,
            reciprocalAppId: reciprocalAppId,
        });
    }

    function openLeftTesterLinkStatus(projectId, testerId, event) {
        openTesterLinkStatusFromRow(projectId, testerId, event, { leftSoft: true });
    }

    function openMutualBalanceModal(appId, event, options) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        options = options || {};
        var modal = document.getElementById('mutual-balance-modal');
        var body = document.getElementById('mutual-balance-body');
        var titleEl = document.getElementById('mutual-balance-title');
        if (!modal || !body) return;

        var safeAppId = Number(appId || options.appId || 0);
        var test = (typeof getMyTestById === 'function')
            ? getMyTestById(safeAppId)
            : (Array.isArray(myTests) ? myTests.find(function (item) { return Number(item.id) === safeAppId; }) : null);

        // Dossier / projects context can pass explicit pair
        if (!test && options.testSnapshot) {
            test = options.testSnapshot;
        }

        var context = options.context || 'tests';
        var joinType = _normalizeJoinType(
            options.joinType
            || (options.testerSnapshot && options.testerSnapshot.join_type)
            || (test && test.join_type)
            || 'mutual'
        );

        if (context === 'projects' && options.testerId) {
            safeAppId = Number(options.projectId || safeAppId);
        }

        _balanceState = {
            appId: safeAppId,
            testerId: Number(options.testerId || (test && test.owner_id) || 0),
            unlinkReciprocal: true,
            context: context,
            projectId: Number(options.projectId || (context === 'projects' ? safeAppId : 0)),
            joinType: joinType,
            isMutualDebt: !!(options.isMutualDebt || (test && test.is_mutual_debt)),
            mutualDebtHolder: String(options.mutualDebtHolder || (test && test.mutual_debt_holder) || ''),
            leftSoft: !!options.leftSoft,
            reciprocalAppId: Number(options.reciprocalAppId || 0),
            testerUsername: String(options.testerUsername || '').replace(/^@+/, ''),
            testerFullName: String(options.testerFullName || '').trim(),
            testerAvatarUrl: String(options.testerAvatarUrl || '').trim(),
            testerLanguage: String(options.testerLanguage || '').trim().toLowerCase(),
            appName: String(options.myAppName || (test && test.name) || '').trim(),
            remindAppId: safeAppId,
            remindAppName: String(options.myAppName || (test && test.name) || '').trim(),
        };

        if (titleEl) {
            titleEl.textContent = _linkStatusTitle(joinType, {
                isDebt: !!_balanceState.isMutualDebt,
                isBroken: !!_balanceState.leftSoft || !!options.isBroken || !!options.leftSoft,
            });
        }

        body.innerHTML = _renderBalanceLoadingSkeleton();
        modal.classList.add('active');

        var partnerUserId = Number(
            (typeof userId !== 'undefined' ? userId : 0)
        );
        // partner_stats endpoint expects the tester id for the progress on appId
        var statsTesterId = partnerUserId;
        if (context === 'projects' && options.testerId) {
            // Owner viewing: stats for the tester on owner's app
            statsTesterId = Number(options.testerId);
            _balanceState.appId = safeAppId;
            _balanceState.testerId = statsTesterId;
            _balanceState.projectId = safeAppId;
        }

        var canFetchPartnerStats = _isMutualJoin(joinType);
        var initDataRaw = (typeof getTelegramInitDataRaw === 'function')
            ? getTelegramInitDataRaw()
            : ((typeof tg !== 'undefined' && tg && tg.initData) || '');
        if (!canFetchPartnerStats) {
            body.innerHTML = _renderBalanceFromLocal(test, options);
            return;
        }

        var apiBase = (typeof API_BASE !== 'undefined') ? API_BASE : '';
        fetch(apiBase + '/tests/' + safeAppId + '/partner_stats/' + statsTesterId
            + '?init_data=' + encodeURIComponent(initDataRaw || ''))
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

    function _resolvePersonForRender(test, options, stats) {
        options = options || {};
        stats = stats || {};
        var context = options.context || (_balanceState && _balanceState.context) || 'tests';
        if (context === 'projects') {
            var tester = options.testerSnapshot || null;
            return {
                fullName: options.testerFullName
                    || (tester && tester.full_name)
                    || (_balanceState && _balanceState.testerFullName)
                    || '',
                username: String(
                    options.testerUsername
                    || (tester && tester.username)
                    || (_balanceState && _balanceState.testerUsername)
                    || ''
                ).replace(/^@+/, ''),
                avatarUrl: options.testerAvatarUrl
                    || (tester && tester.avatar_url)
                    || (_balanceState && _balanceState.testerAvatarUrl)
                    || '',
                userId: Number(options.testerId || (tester && tester.tester_id) || (_balanceState && _balanceState.testerId) || 0),
                joinType: _normalizeJoinType(
                    options.joinType
                    || (tester && tester.join_type)
                    || (_balanceState && _balanceState.joinType)
                    || 'invite'
                ),
                language: String(
                    options.testerLanguage
                    || (tester && tester.language)
                    || (_balanceState && _balanceState.testerLanguage)
                    || ''
                ).toLowerCase(),
            };
        }
        return {
            fullName: stats.partner_full_name || (test && test.owner_full_name) || '',
            username: String(stats.partner_username || (test && test.owner_username) || '').replace(/^@+/, ''),
            avatarUrl: stats.partner_avatar_url || (test && test.owner_avatar_url) || '',
            userId: Number(stats.partner_id || (test && test.owner_id) || 0),
            joinType: _normalizeJoinType(options.joinType || (test && test.join_type) || 'mutual'),
            language: String(stats.partner_language || (test && test.owner_language) || '').toLowerCase(),
        };
    }

    function _renderBalanceLoadingSkeleton() {
        var side = function () {
            return '' +
                '<div class="parity-side-card parity-skeleton-card" aria-hidden="true">' +
                    '<div class="parity-skel parity-skel-label"></div>' +
                    '<div class="parity-skel parity-skel-icon"></div>' +
                    '<div class="parity-skel parity-skel-name"></div>' +
                    '<div class="parity-skel-chips">' +
                        '<span class="parity-skel parity-skel-chip"></span>' +
                        '<span class="parity-skel parity-skel-chip"></span>' +
                    '</div>' +
                '</div>';
        };
        return '' +
            '<div class="link-status-loading" role="status" aria-live="polite" aria-label="' + _esc(_t('mutualBalanceLoading')) + '">' +
                '<div class="link-status-person link-status-person--skel">' +
                    '<div class="parity-skel parity-skel-avatar"></div>' +
                    '<div class="link-status-person-copy">' +
                        '<div class="parity-skel parity-skel-fullname"></div>' +
                        '<div class="parity-skel parity-skel-username"></div>' +
                    '</div>' +
                    '<div class="parity-skel parity-skel-badge"></div>' +
                '</div>' +
                '<div class="parity-comparison-grid">' + side() + side() + '</div>' +
                '<div class="link-status-loading-footer">' +
                    '<span class="link-status-loading-pulse" aria-hidden="true"></span>' +
                    '<span class="link-status-loading-text">' + _esc(_t('mutualBalanceLoading')) + '</span>' +
                '</div>' +
                '<div class="parity-actions parity-actions--skel" aria-hidden="true">' +
                    '<div class="parity-skel parity-skel-btn"></div>' +
                    '<div class="parity-skel parity-skel-btn"></div>' +
                '</div>' +
            '</div>';
    }

    function _renderBalanceFromLocal(test, options) {
        options = options || {};
        var person = _resolvePersonForRender(test, options, null);
        var myName = (test && (test.reciprocal_app_name || test.name)) || _t('unknownLabel');
        var theirName = (test && test.name) || _t('unknownLabel');
        if (options.context === 'projects') {
            myName = options.myAppName || myName;
            theirName = options.theirAppName || theirName;
        }
        var tester = options.testerSnapshot || null;
        var localExchangeState = (
            options.context === 'projects' && tester && tester.exchange_state
            || test && test.exchange_state
            || null
        );
        if (localExchangeState && Number(localExchangeState.version || 0) < 1) {
            localExchangeState = null;
        }
        var localTesterMetrics = localExchangeState && localExchangeState.left && localExchangeState.left.metrics || null;
        var localPartnerMetrics = localExchangeState && localExchangeState.right && localExchangeState.right.metrics || null;
        var theirDays = 0;
        var theirSkips = 0;
        var theirConsec = 0;
        var theirCheckins = 0;
        if (localTesterMetrics) {
            theirDays = Number(localTesterMetrics.testing_days || 0);
            theirSkips = Number(localTesterMetrics.skips || 0);
            theirConsec = Number(localTesterMetrics.consecutive_skips || 0);
            theirCheckins = Number(localTesterMetrics.checkins || 0);
        } else if (options.context === 'projects' && tester) {
            theirDays = tester.start_date && typeof getUserTestingDay === 'function'
                ? getUserTestingDay(tester.start_date)
                : Number(tester.testing_days || 0);
            theirSkips = Number(tester.skips_count != null ? tester.skips_count : 0);
            theirConsec = Number(tester.consecutive_skips != null
                ? tester.consecutive_skips
                : calculateConsecutiveSkips(tester));
            theirCheckins = Number(tester.checkins_count || 0);
        } else {
            theirDays = Number(test && test.testing_days || 0);
            theirSkips = Number(test && test.skips_count || 0);
            theirConsec = Number(test && test.partner_consecutive_skips || 0);
            theirCheckins = Number(test && test.checkins_count || 0);
        }
        var isOwnerView = options.context === 'projects';
        var isTesterLeft = isOwnerView
            ? !!(options.isTesterLeft || (tester && (tester.is_left_soft || ['abandoned','justified_exit','kicked_by_owner','canceled_neutral','dropped'].includes(String(tester.status || '').toLowerCase()))))
            : !!(test && test.partner_progress_status && test.partner_progress_status !== 'active' && test.partner_progress_status !== 'completed');
        var isViewerLeft = isOwnerView
            ? !!(options.isViewerLeft || (tester && ['abandoned','justified_exit','kicked_by_owner','canceled_neutral','dropped'].includes(String(tester.reciprocal_partner_progress_status || '').toLowerCase())))
            : (['abandoned','kicked_by_owner','canceled_neutral','justified_exit','dropped'].includes(String(test && test.progress_status || '').toLowerCase()));

        return _renderBalanceColumns({
            person: person,
            myAppName: options.context === 'projects'
                ? (options.myAppName || myName)
                : ((test && test.reciprocal_app_name) || _t('mutualBalanceYourProject')),
            theirAppName: options.context === 'projects'
                ? (options.theirAppName || theirName)
                : ((test && test.name) || theirName),
            myIcon: options.myIconUrl || (test && test.reciprocal_app_icon_url) || '',
            theirIcon: options.theirIconUrl || (test && test.icon_url) || '',
            myDays: Number(localPartnerMetrics ? localPartnerMetrics.testing_days : test && test.partner_testing_days || 0),
            theirDays: theirDays,
            mySkips: Number(localPartnerMetrics ? localPartnerMetrics.skips : test && test.partner_skips || 0),
            theirSkips: theirSkips,
            myConsecutive: Number(localPartnerMetrics ? localPartnerMetrics.consecutive_skips : test && test.partner_consecutive_skips || 0),
            theirConsecutive: Number(
                localTesterMetrics
                    ? localTesterMetrics.consecutive_skips
                    : options.context === 'projects' && tester
                    ? (tester.consecutive_skips != null ? tester.consecutive_skips : calculateConsecutiveSkips(tester))
                    : (test && typeof calculateConsecutiveSkips === 'function' ? calculateConsecutiveSkips(test) : (test && test.consecutive_skips || 0))
            ),
            theirCheckins: theirCheckins,
            partnerConsecutive: options.context === 'projects'
                ? theirConsec
                : Number(test && test.partner_consecutive_skips || 0),
            partnerUsername: person.username,
            partnerId: person.userId,
            partnerLeft: isTesterLeft,
            isTesterLeft: isTesterLeft,
            isViewerLeft: isViewerLeft,
            partnerLastActive: tester ? tester.last_check_date : (test && test.partner_last_check_date),
            myLastActive: test ? test.last_check_date : null,
            partnerDoneDate: tester ? tester.last_check_date : (test && test.partner_last_check_date),
            myDoneDate: test ? test.last_check_date : null,
            myProgressStatus: String(test && test.progress_status || 'active'),
            joinType: person.joinType,
            context: options.context || 'tests',
            isMutualDebt: localExchangeState
                ? !!localExchangeState.is_mutual_debt
                : !!(options.isMutualDebt || (test && test.is_mutual_debt) || (_balanceState && _balanceState.isMutualDebt)),
            debtHolder: String(
                localExchangeState && localExchangeState.debt_holder
                || options.mutualDebtHolder
                || (test && test.mutual_debt_holder)
                || (_balanceState && _balanceState.mutualDebtHolder)
                || ''
            ),
            leftSoft: isTesterLeft,
        });
    }

    function _renderBalanceFromStats(stats, test, options) {
        options = options || {};
        var exchangeState = stats && stats.exchange_state && Number(stats.exchange_state.version || 0) >= 1
            ? stats.exchange_state
            : null;
        var testerMetrics = exchangeState && exchangeState.left && exchangeState.left.metrics || null;
        var partnerMetrics = exchangeState && exchangeState.right && exchangeState.right.metrics || null;
        var person = _resolvePersonForRender(test, options, stats);
        var myAppName = stats.partner_app_name || (test && test.reciprocal_app_name) || _t('mutualBalanceYourProject');
        var theirAppName = stats.app_name || (test && test.name) || _t('unknownLabel');
        if (options.context === 'projects') {
            myAppName = options.myAppName || stats.app_name || myAppName;
            theirAppName = options.theirAppName || stats.partner_app_name || theirAppName;
        }
        if (_balanceState) {
            _balanceState.testerLanguage = person.language || _balanceState.testerLanguage;
            if (!_balanceState.testerUsername && person.username) {
                _balanceState.testerUsername = person.username;
            }
            if (!_balanceState.testerFullName && person.fullName) {
                _balanceState.testerFullName = person.fullName;
            }
            if (!_balanceState.testerAvatarUrl && person.avatarUrl) {
                _balanceState.testerAvatarUrl = person.avatarUrl;
            }
        }
        var isOwnerView = options.context === 'projects';
        var isTesterLeft = isOwnerView
            ? !!(options.isTesterLeft || (options.testerSnapshot && (options.testerSnapshot.is_left_soft || ['abandoned','justified_exit','kicked_by_owner','canceled_neutral','dropped'].includes(String(options.testerSnapshot.status || '').toLowerCase()))))
            : !!stats.partner_left;
        var isViewerLeft = isOwnerView
            ? !!(options.isViewerLeft || stats.partner_left)
            : (['abandoned','kicked_by_owner','canceled_neutral','justified_exit','dropped'].includes(String(test && test.progress_status || '').toLowerCase()));

        return _renderBalanceColumns({
            person: person,
            myAppName: myAppName,
            theirAppName: theirAppName,
            myIcon: isOwnerView
                ? (options.myIconUrl || stats.app_icon_url || '')
                : (options.myIconUrl || stats.partner_app_icon_url || (test && test.reciprocal_app_icon_url) || ''),
            theirIcon: isOwnerView
                ? (options.theirIconUrl || stats.partner_app_icon_url || '')
                : (options.theirIconUrl || stats.app_icon_url || (test && test.icon_url) || ''),
            myDays: Number(partnerMetrics ? partnerMetrics.testing_days : stats.partner_testing_days || 0),
            theirDays: Number(testerMetrics ? testerMetrics.testing_days : stats.my_testing_days || (test && test.testing_days) || 0),
            mySkips: Number(partnerMetrics ? partnerMetrics.skips : stats.partner_skips || 0),
            theirSkips: Number(testerMetrics ? testerMetrics.skips : stats.my_skips || (test && test.skips_count) || 0),
            myConsecutive: Number(partnerMetrics ? partnerMetrics.consecutive_skips : stats.partner_consecutive_skips || 0),
            theirConsecutive: Number(
                testerMetrics
                    ? testerMetrics.consecutive_skips
                    : options.context === 'projects'
                    ? (stats.my_consecutive_skips || 0)
                    : (stats.my_consecutive_skips || (test && typeof calculateConsecutiveSkips === 'function' ? calculateConsecutiveSkips(test) : 0))
            ),
            theirCheckins: Number(testerMetrics ? testerMetrics.checkins : stats.my_checkins || (test && test.checkins_count) || 0),
            partnerConsecutive: Number(
                exchangeState
                    ? (options.context === 'projects'
                        ? testerMetrics && testerMetrics.consecutive_skips
                        : partnerMetrics && partnerMetrics.consecutive_skips)
                    : options.context === 'projects'
                    ? (stats.my_consecutive_skips || stats.partner_consecutive_skips || 0)
                    : (stats.partner_consecutive_skips || 0)
            ),
            partnerUsername: person.username,
            partnerId: person.userId,
            partnerLeft: isTesterLeft,
            isTesterLeft: isTesterLeft,
            isViewerLeft: isViewerLeft,
            partnerLastActive: stats.partner_last_active || stats.partner_last_check_date || null,
            myLastActive: stats.my_last_check_date || (test && test.last_check_date) || null,
            partnerDoneDate: stats.partner_last_active || stats.partner_last_check_date || null,
            myDoneDate: stats.my_last_check_date || (test && test.last_check_date) || null,
            myProgressStatus: String(stats.my_progress_status || (test && test.progress_status) || 'active'),
            joinType: person.joinType,
            context: options.context || 'tests',
            isMutualDebt: exchangeState
                ? !!exchangeState.is_mutual_debt
                : !!(stats.is_mutual_debt || options.isMutualDebt || (test && test.is_mutual_debt) || (_balanceState && _balanceState.isMutualDebt)),
            debtHolder: String(
                exchangeState && exchangeState.debt_holder
                || stats.debt_holder
                || options.mutualDebtHolder
                || (test && test.mutual_debt_holder)
                || (_balanceState && _balanceState.mutualDebtHolder)
                || ''
            ),
            leftSoft: isTesterLeft,
        });
    }

    function _paritySideCard(label, appName, iconUrl, day, skips, options) {
        options = options || {};
        var consec = Number(options.consecutiveSkips != null ? options.consecutiveSkips : 0);
        var totalSkips = Number(skips || 0);
        var consecWarn = consec >= 3;
        var isBroken = !!options.broken;
        var isDebtDone = !!options.debtDone;
        var isDebtActive = !!options.debtActive;
        var isPartnerDebt = !!options.partnerDebt;
        var stateClass = isBroken ? ' is-broken' : (isDebtDone ? ' is-debt-done' : (isDebtActive || isPartnerDebt ? ' is-debt-active' : ''));
        var stateBadge = '';
        if (isBroken) {
            var breakDateText = options.breakDate ? (' • ' + _esc(_formatDateShort(options.breakDate))) : '';
            stateBadge = '<div class="parity-side-broken">' + _esc(_t('mutualBalanceSideBroken')) + breakDateText + '</div>';
        } else if (isDebtDone) {
            var doneDateText = options.doneDate ? (' • ' + _esc(_formatDateShort(options.doneDate))) : '';
            stateBadge = '<div class="parity-side-debt-done">✅ ' + _esc(_t('linkedSideCompleted')) + doneDateText + '</div>';
        } else if (isPartnerDebt) {
            stateBadge = '<div class="parity-side-debt-active">' + _esc(_t('mutualBalanceSidePartnerDebt')) + '</div>';
        } else if (isDebtActive) {
            stateBadge = '<div class="parity-side-debt-active">' + _esc(_t('mutualBalanceSideDebtActive')) + '</div>';
        }

        var consecText = _t('mutualBalanceConsecutiveChip', { count: consec });
        if (!consecText || consecText === 'mutualBalanceConsecutiveChip') {
            consecText = (lang === 'ru' ? 'Подряд ' : 'In a row ') + consec + '/3';
        }
        var totalText = _t('mutualBalanceTotalSkipsChip', { count: totalSkips });
        if (!totalText || totalText === 'mutualBalanceTotalSkipsChip') {
            totalText = (lang === 'ru' ? 'Всего ' : 'Total: ') + totalSkips;
        }

        return '' +
            '<div class="parity-side-card' + stateClass + '">' +
                '<div class="parity-side-label">' + _esc(label) + '</div>' +
                '<div class="parity-side-icon">' + _renderIconHtml(appName, iconUrl) + '</div>' +
                '<div class="parity-side-name notranslate">' + _esc(appName) + '</div>' +
                stateBadge +
                '<div class="parity-chip-row">' +
                    '<span class="parity-chip">📅 ' + _esc(_t('parityDayChip', { day: day, total: 14 })) + '</span>' +
                    '<span class="parity-chip' + (consecWarn ? ' is-warn' : '') + '">⚠️ ' +
                        _esc(consecText) +
                    '</span>' +
                    '<span class="parity-chip">📉 ' +
                        _esc(totalText) +
                    '</span>' +
                '</div>' +
            '</div>';
    }

    function _renderSingleSideStats(data) {
        var skipWarn = Number(data.theirSkips || 0) >= 3 || Number(data.partnerConsecutive || 0) >= 3;
        return '' +
            '<div class="link-status-single">' +
                '<div class="link-status-single-head">' +
                    '<div class="parity-side-icon">' + _renderIconHtml(data.myAppName || _t('unknownLabel'), data.myIcon || '') + '</div>' +
                    '<div class="link-status-single-copy">' +
                        '<div class="parity-side-label">' + _esc(_t('linkStatusOnYourProject')) + '</div>' +
                        '<div class="parity-side-name notranslate">' + _esc(data.myAppName || _t('unknownLabel')) + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="leave-metric-list">' +
                    '<div class="leave-metric"><span class="leave-metric-ico" aria-hidden="true">📅</span><span class="leave-metric-label">' +
                        _esc(_t('leaveMetricDays')) + '</span><span class="leave-metric-value">' +
                        _esc(String(data.theirDays || 0)) + '</span></div>' +
                    '<div class="leave-metric' + (skipWarn ? ' is-warn' : '') + '"><span class="leave-metric-ico" aria-hidden="true">⚠️</span><span class="leave-metric-label">' +
                        _esc(_t('leaveMetricSkips')) + '</span><span class="leave-metric-value">' +
                        _esc(String(data.theirSkips || 0)) + '/3</span></div>' +
                    '<div class="leave-metric"><span class="leave-metric-ico" aria-hidden="true">✅</span><span class="leave-metric-label">' +
                        _esc(_t('leaveMetricCheckins')) + '</span><span class="leave-metric-value">' +
                        _esc(String(data.theirCheckins || 0)) + '</span></div>' +
                    (Number(data.partnerConsecutive || 0) > 0
                        ? '<div class="leave-metric' + (Number(data.partnerConsecutive || 0) >= 3 ? ' is-warn' : '') + '"><span class="leave-metric-ico" aria-hidden="true">🔁</span><span class="leave-metric-label">' +
                            _esc(_t('linkStatusConsecutiveSkips')) + '</span><span class="leave-metric-value">' +
                            _esc(String(data.partnerConsecutive || 0)) + '</span></div>'
                        : '') +
                '</div>' +
            '</div>';
    }

    function _renderBalanceColumns(data) {
        var person = data.person || {
            fullName: '',
            username: data.partnerUsername || '',
            avatarUrl: '',
            userId: data.partnerId || 0,
            joinType: data.joinType || 'mutual',
        };
        var isDebt = data.isMutualDebt != null
            ? !!data.isMutualDebt
            : !!(_balanceState && _balanceState.isMutualDebt);
        person.isDebt = isDebt;
        if (_balanceState) {
            _balanceState.joinType = person.joinType || _balanceState.joinType;
            _balanceState.testerUsername = person.username || _balanceState.testerUsername;
            _balanceState.testerFullName = person.fullName || _balanceState.testerFullName;
            _balanceState.testerAvatarUrl = person.avatarUrl || _balanceState.testerAvatarUrl;
            _balanceState.testerLanguage = person.language || _balanceState.testerLanguage;
            if (person.userId) _balanceState.testerId = person.userId;
            _balanceState.isMutualDebt = isDebt;
        }

        var partnerConsec = Number(data.partnerConsecutive || 0);
        var isOwnerView = data.context === 'projects';
        var hint = '';
        // Owner POV must never use tester leave-justification copy ("partner left / leave free").
        if (!isDebt) {
            if (isOwnerView) {
                if (partnerConsec >= 3) {
                    hint = '<div class="parity-info-banner is-safe">' +
                        _esc(_t('mutualBalanceOwnerKickHint', {
                            count: partnerConsec,
                            word: pluralizeSkipWord(partnerConsec),
                        })) +
                        '</div>';
                }
            } else if (partnerConsec >= 3 || data.partnerLeft) {
                var hintText = data.partnerLeft
                    ? _t('mutualBalancePartnerLeftHint')
                    : _t('mutualBalancePartnerSkipHint', {
                        count: partnerConsec,
                        word: pluralizeSkipWord(partnerConsec),
                    });
                hint = '<div class="parity-info-banner' + (data.partnerLeft || partnerConsec >= 3 ? ' is-safe' : '') + '">' +
                    _esc(hintText) +
                    '</div>';
            }
        }

        var isMutual = _isMutualJoin(person.joinType);
        var debtHolder = String(data.debtHolder || '').toLowerCase();
        var isPartnerDebt = isDebt && (debtHolder
            ? (isOwnerView ? debtHolder === 'tester' : debtHolder === 'partner')
            : isOwnerView);
        var isSelfDebt = isDebt && (debtHolder
            ? (isOwnerView ? debtHolder === 'partner' : debtHolder === 'tester')
            : !isOwnerView);
        var bodyHtml;
        if (isMutual) {
            // Owner: you→their reciprocal app; them→your project.
            // Tester: you→current (owner) app; them→your reciprocal.
            var youAtThemName = data.theirAppName || _t('unknownLabel');
            var youAtThemIcon = data.theirIcon || '';
            var youAtThemDays = isOwnerView ? data.myDays : data.theirDays;
            var youAtThemSkips = isOwnerView ? data.mySkips : data.theirSkips;
            var youAtThemConsecutive = isOwnerView ? data.myConsecutive : data.theirConsecutive;
            var themAtYouName = data.myAppName || _t('mutualBalanceYourProject');
            var themAtYouIcon = data.myIcon || '';
            var themAtYouDays = isOwnerView ? data.theirDays : data.myDays;
            var themAtYouSkips = isOwnerView ? data.theirSkips : data.mySkips;
            var themAtYouConsecutive = isOwnerView ? data.theirConsecutive : data.myConsecutive;
            // One-sided link:
            // For Owner view:
            //   themAtYou is your project. Broken if the tester left your project (isTesterLeft).
            //   youAtThem is the tester's app. Broken if you left their reciprocal project (isViewerLeft).
            // For Tester view (My Tests):
            //   themAtYou is your reciprocal app. Broken if partner left it (partnerLeft).
            //   youAtThem is the app you are testing. Broken if you left or were kicked from it.
            var themBroken = !isDebt && (isOwnerView ? !!data.isTesterLeft : !!data.partnerLeft);
            var youBroken = !isDebt && (isOwnerView ? !!data.isViewerLeft : !!data.isViewerLeft);
            if (!isDebt && !isOwnerView && data.context === 'tests') {
                var myProgress = String(data.myProgressStatus || '').toLowerCase();
                youBroken = youBroken || myProgress === 'kicked_by_owner' || myProgress === 'canceled_neutral' || myProgress === 'abandoned' || myProgress === 'justified_exit' || myProgress === 'dropped';
            }
            var themPartnerDebt = isPartnerDebt;
            var youSideDone = isPartnerDebt;
            var themDebtDone = isSelfDebt;
            var youDebtActive = isSelfDebt;
            var themDoneDate = isOwnerView ? (data.theirDoneDate || data.theirLastActive) : (data.partnerDoneDate || data.partnerLastActive);
            var youDoneDate = isOwnerView ? (data.partnerDoneDate || data.partnerLastActive) : (data.myDoneDate || data.myLastActive);
            bodyHtml = '<div class="parity-comparison-grid">' +
                _paritySideCard(_t('mutualBalanceThemAtYou'), themAtYouName, themAtYouIcon, themAtYouDays, themAtYouSkips, {
                    broken: themBroken,
                    debtDone: themDebtDone,
                    partnerDebt: themPartnerDebt,
                    consecutiveSkips: themAtYouConsecutive,
                    doneDate: themDoneDate,
                    breakDate: themBroken ? themDoneDate : null,
                }) +
                _paritySideCard(_t('mutualBalanceYouAtThem'), youAtThemName, youAtThemIcon, youAtThemDays, youAtThemSkips, {
                    broken: youBroken,
                    debtActive: youDebtActive,
                    debtDone: youSideDone,
                    consecutiveSkips: youAtThemConsecutive,
                    doneDate: youDoneDate,
                    breakDate: youBroken ? youDoneDate : null,
                }) +
            '</div>';
            if (isPartnerDebt) {
                hint = '<div class="parity-info-banner is-debt">' +
                    _esc(_t('mutualBalancePartnerDebtHint')) +
                    '</div>' + hint;
            } else if (isSelfDebt) {
                hint = '<div class="parity-info-banner is-debt">' +
                    _esc(_t('mutualBalanceDebtHint')) +
                    '</div>' + hint;
            } else if (themBroken || youBroken) {
                hint = '<div class="parity-info-banner is-broken">' +
                    _esc(_t('mutualBalanceOneSidedHint')) +
                    '</div>' + hint;
            }
        } else {
            bodyHtml = _renderSingleSideStats(data);
        }

        var isLeftBroken = themBroken || youBroken || !!data.partnerLeft;
        var breakLabel = isSelfDebt
            ? _t('mutualBalanceDebtExitBtn')
            : (isOwnerView
                ? _t('linkStatusKickBtn')
                : (isLeftBroken ? (_t('detail_leave_btn') || _t('mutualBalanceBreakBtn')) : (isMutual ? _t('mutualBalanceBreakBtn') : _t('detail_leave_btn'))));

        // "Скрыть тестера" / "Открыть карточку" are ONLY for Project Owner view (context === 'projects') when a tester left the owner's project.
        var isLeftSoftOwnerView = isOwnerView && !!data.isTesterLeft;
        var actionsHtml = '<div class="parity-actions">';
        if (isLeftSoftOwnerView) {
            actionsHtml += '' +
                '<button type="button" class="btn btn-outline-tg" onclick="openLeftTesterReciprocalCard()">' +
                    _esc(_t('leftTesterOpenCardBtn')) +
                '</button>' +
                '<button type="button" class="btn btn-secondary" onclick="hideLeftTesterFromBalance()">' +
                    _esc(_t('leftTesterHideBtn')) +
                '</button>';
        } else {
            if (!isSelfDebt && !isLeftBroken) {
                actionsHtml += '' +
                    '<button type="button" class="btn btn-outline-tg" onclick="openBellRemindPreview()">' +
                        _esc(_t('mutualBalanceBellBtn')) +
                    '</button>';
            }
            actionsHtml += '' +
                '<button type="button" class="btn btn-danger-soft" onclick="startMutualBreakFromBalance()">' +
                    _esc(breakLabel) +
                '</button>';
        }
        actionsHtml += '</div>';

        return '' +
            _renderPersonHero(person) +
            bodyHtml +
            hint +
            actionsHtml;
    }

    function openLeftTesterReciprocalCard() {
        if (!_balanceState) return;
        var reciprocalAppId = Number(_balanceState.reciprocalAppId || 0);
        var modal = document.getElementById('mutual-balance-modal');
        if (modal) modal.classList.remove('active');
        _balanceState = null;

        if (reciprocalAppId <= 0) {
            if (typeof showToast === 'function') showToast(_t('leftTesterNoCard'));
            if (typeof switchTab === 'function') switchTab('tests');
            return;
        }

        function _runHighlight() {
            var highlightReady = (typeof window._highlightTestCardWhenReady === 'function')
                ? window._highlightTestCardWhenReady
                : (typeof _highlightTestCardWhenReady === 'function' ? _highlightTestCardWhenReady : null);
            var highlightNow = (typeof window._highlightTestCard === 'function')
                ? window._highlightTestCard
                : (typeof _highlightTestCard === 'function' ? _highlightTestCard : null);
            if (highlightReady) {
                highlightReady(reciprocalAppId, 24);
                return;
            }
            if (highlightNow) highlightNow(reciprocalAppId);
        }

        // Prefer the same deep-focus path used by startapp=test_* / my_tests_highlight_*.
        function _afterFocus() {
            requestAnimationFrame(function () {
                _runHighlight();
                setTimeout(_runHighlight, 280);
            });
        }
        if (typeof _focusAppInMiniApp === 'function') {
            Promise.resolve(_focusAppInMiniApp(reciprocalAppId)).then(_afterFocus).catch(function () {
                if (typeof switchTab === 'function') switchTab('tests');
                _runHighlight();
            });
            return;
        }
        if (typeof window._focusAppInMiniApp === 'function') {
            Promise.resolve(window._focusAppInMiniApp(reciprocalAppId)).then(_afterFocus).catch(function () {
                if (typeof switchTab === 'function') switchTab('tests');
                _runHighlight();
            });
            return;
        }

        if (typeof switchTab === 'function') switchTab('tests');
        // Non-background refresh so the tests list is actually rendered.
        var refresh = (typeof loadTasks === 'function') ? loadTasks(false) : null;
        Promise.resolve(refresh).finally(function () {
            requestAnimationFrame(function () {
                _runHighlight();
                setTimeout(_runHighlight, 220);
                setTimeout(_runHighlight, 650);
            });
        });
    }

    function hideLeftTesterFromBalance() {
        if (!_balanceState) return;
        var projectId = Number(_balanceState.projectId || _balanceState.appId || 0);
        var testerId = Number(_balanceState.testerId || 0);
        var modal = document.getElementById('mutual-balance-modal');
        if (modal) modal.classList.remove('active');
        _balanceState = null;
        if (typeof window.dismissLeftTesterRow === 'function') {
            window.dismissLeftTesterRow(projectId, testerId);
        }
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

    function _guessRemindLang(preferred) {
        var raw = String(preferred || '').toLowerCase();
        if (raw.indexOf('en') === 0) return 'en';
        if (raw.indexOf('ru') === 0) return 'ru';
        return (_lang().indexOf('en') === 0) ? 'en' : 'ru';
    }

    function _buildBellMessage(messageLang) {
        var state = _bellRemindState || _balanceState || {};
        var appName = state.remindAppName || state.appName || _t('unknownLabel');
        var appId = Number(state.remindAppId || state.appId || state.projectId || 0);
        var deepLink = (typeof buildTesterReminderDeepLink === 'function')
            ? buildTesterReminderDeepLink(appId)
            : ('https://t.me/Android12TestersBot/app?startapp=test_' + appId);
        return window.t
            ? window.t('bellNotifyMsg', { app_name: appName, deep_link: deepLink }, messageLang)
            : ('check-in: ' + deepLink);
    }

    function openBellRemindPreview() {
        if (!_balanceState) return;
        var username = String(_balanceState.testerUsername || '').replace(/^@+/, '');
        if (!username && !_balanceState.testerId) {
            if (typeof showToast === 'function') {
                showToast(_t('bellRemindNoUsername'));
            }
            return;
        }

        _bellRemindState = {
            username: username,
            testerId: Number(_balanceState.testerId || 0),
            fullName: _balanceState.testerFullName || '',
            avatarUrl: _balanceState.testerAvatarUrl || '',
            remindAppId: Number(_balanceState.remindAppId || _balanceState.appId || 0),
            remindAppName: _balanceState.remindAppName || _balanceState.appName || '',
            messageLang: _guessRemindLang(_balanceState.testerLanguage),
        };

        var overlay = document.getElementById('bell-remind-overlay');
        if (!overlay) {
            confirmBellRemindSend();
            return;
        }
        _syncBellRemindPreviewUi();
        overlay.classList.add('active');
    }

    function _syncBellRemindPreviewUi() {
        if (!_bellRemindState) return;
        var langLabel = document.getElementById('bell-remind-lang-label');
        var textEl = document.getElementById('bell-remind-text');
        var personEl = document.getElementById('bell-remind-person');
        var ruBtn = document.getElementById('bell-remind-lang-ru');
        var enBtn = document.getElementById('bell-remind-lang-en');
        var msgLang = _bellRemindState.messageLang === 'en' ? 'en' : 'ru';

        if (personEl) {
            var nick = _bellRemindState.username ? ('@' + _bellRemindState.username) : '';
            var name = _bellRemindState.fullName || nick || _t('unknownLabel');
            personEl.innerHTML = '' +
                '<div class="link-status-avatar">' +
                    _renderPersonAvatar(_bellRemindState.fullName, _bellRemindState.username, _bellRemindState.avatarUrl) +
                '</div>' +
                '<div class="link-status-person-copy">' +
                    '<div class="link-status-fullname notranslate">' + _esc(name) + '</div>' +
                    (nick && _bellRemindState.fullName
                        ? '<div class="link-status-username notranslate">' + _esc(nick) + '</div>'
                        : '') +
                    '<div class="bell-remind-lang-hint">' +
                        _esc(_t('bellRemindRecipientLang', {
                            lang: msgLang === 'en' ? 'EN' : 'RU',
                        })) +
                    '</div>' +
                '</div>';
        }
        if (langLabel) {
            langLabel.textContent = _t('bellRemindPreviewLabel');
        }
        if (textEl) {
            textEl.value = _buildBellMessage(msgLang);
        }
        if (ruBtn) ruBtn.classList.toggle('is-selected', msgLang === 'ru');
        if (enBtn) enBtn.classList.toggle('is-selected', msgLang === 'en');
    }

    function setBellRemindLang(nextLang) {
        if (!_bellRemindState) return;
        _bellRemindState.messageLang = String(nextLang || 'ru').toLowerCase().indexOf('en') === 0 ? 'en' : 'ru';
        _syncBellRemindPreviewUi();
    }

    function closeBellRemindOverlay(event) {
        var overlay = document.getElementById('bell-remind-overlay');
        if (!overlay) return;
        if (event && event.target !== overlay) return;
        overlay.classList.remove('active');
        _bellRemindState = null;
    }

    function confirmBellRemindSend() {
        var state = _bellRemindState || _balanceState;
        if (!state) return;
        var username = String(state.username || state.testerUsername || '').replace(/^@+/, '');
        var messageLang = (state.messageLang || _guessRemindLang(state.testerLanguage));
        var text = _buildBellMessage(messageLang === 'en' ? 'en' : 'ru');
        var overlay = document.getElementById('bell-remind-overlay');
        if (overlay) overlay.classList.remove('active');

        if (!username) {
            if (typeof showToast === 'function') {
                showToast(_t('bellRemindNoUsername'));
            }
            _bellRemindState = null;
            return;
        }

        if (typeof openOwnerCheckpointChat === 'function') {
            openOwnerCheckpointChat(username, text, {
                trackScreenshotReminder: false,
                showCopyToast: false,
            });
            if (typeof showToast === 'function') {
                showToast(_t('bellRemindSentToast', {}, 'ru') || '✉️ Текст скопирован, открываем диалог...');
            }
        } else {
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text);
                }
            } catch (e) {}
            openMutualBalanceTelegram('https://t.me/' + encodeURIComponent(username) + '?text=' + encodeURIComponent(text));
        }
        _bellRemindState = null;
    }

    function startMutualBreakFromBalance() {
        if (!_balanceState) {
            if (typeof showToast === 'function') showToast(_t('loadError'));
            return;
        }
        var appId = Number(_balanceState.appId || 0);
        var context = _balanceState.context || 'tests';
        var projectId = Number(_balanceState.projectId || appId);
        var testerId = Number(_balanceState.testerId || 0);
        var joinType = _normalizeJoinType(_balanceState.joinType || 'mutual');
        var forceUnlink = _isMutualJoin(joinType);

        // Close balance without wiping copied ids (close clears _balanceState).
        var modal = document.getElementById('mutual-balance-modal');
        if (modal) modal.classList.remove('active');
        _balanceState = null;

        if (context === 'projects') {
            if (projectId <= 0 || testerId <= 0) {
                console.warn('startMutualBreakFromBalance: missing project/tester', projectId, testerId);
                if (typeof showToast === 'function') showToast(_t('linkStatusKickOpenFailed'));
                return;
            }
            var openKick = window.openKickTesterModal || (typeof openKickTesterModal === 'function' ? openKickTesterModal : null);
            if (typeof openKick === 'function') {
                try {
                    openKick(projectId, testerId, null, {
                        forceUnlink: forceUnlink,
                        unlinkReciprocal: forceUnlink,
                    });
                } catch (error) {
                    console.error('openKickTesterModal failed', error);
                    if (typeof showToast === 'function') showToast(_t('linkStatusKickOpenFailed'));
                }
            } else if (typeof showToast === 'function') {
                showToast(_t('linkStatusKickOpenFailed'));
            }
            return;
        }

        if (appId <= 0) {
            console.warn('startMutualBreakFromBalance: missing appId');
            if (typeof showToast === 'function') showToast(_t('loadError'));
            return;
        }
        window._pendingUnlinkReciprocal = false;
        var openLeave = window.openLeaveMutualModal || (typeof openLeaveMutualModal === 'function' ? openLeaveMutualModal : null);
        if (typeof openLeave === 'function') {
            openLeave(appId);
        } else if (typeof window.openTerminationSheet === 'function') {
            window.openTerminationSheet({
                mode: 'leave',
                appId: appId,
                joinType: joinType || 'mutual',
                unlinkReciprocal: false,
            });
        } else if (typeof window.openLeaveOrDropFromTest === 'function') {
            window.openLeaveOrDropFromTest(appId);
        } else if (typeof showToast === 'function') {
            showToast(_t('loadError'));
        }
    }

    async function archiveBrokenMutualTest(appId) {
        var safeAppId = Number(appId || 0);
        if (safeAppId <= 0) return;
        window._pendingUnlinkReciprocal = true;
        var openLeave = window.openLeaveMutualModal || (typeof openLeaveMutualModal === 'function' ? openLeaveMutualModal : null);
        if (typeof openLeave === 'function') {
            openLeave(safeAppId);
            return;
        }
        if (typeof window.openTerminationSheet === 'function') {
            window.openTerminationSheet({
                mode: 'leave',
                appId: safeAppId,
                joinType: 'mutual',
                unlinkReciprocal: true,
            });
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

    window.pluralizeRu = pluralizeRu;
    window.pluralizeSkipWord = pluralizeSkipWord;
    window.formatSkipsLabel = formatSkipsLabel;
    window.formatBarterWarningLabel = formatBarterWarningLabel;
    window.calculateConsecutiveSkips = calculateConsecutiveSkips;
    window.getBarterChipState = getBarterChipState;
    window.buildBarterChipHtml = buildBarterChipHtml;
    window.openMutualBalanceModal = openMutualBalanceModal;
    window.openTesterLinkStatusFromRow = openTesterLinkStatusFromRow;
    window.openLeftTesterLinkStatus = openLeftTesterLinkStatus;
    window.openLeftTesterReciprocalCard = openLeftTesterReciprocalCard;
    window.hideLeftTesterFromBalance = hideLeftTesterFromBalance;
    window.closeMutualBalanceModal = closeMutualBalanceModal;
    window.openMutualBalanceTelegram = openMutualBalanceTelegram;
    window.openBellRemindPreview = openBellRemindPreview;
    window.setBellRemindLang = setBellRemindLang;
    window.closeBellRemindOverlay = closeBellRemindOverlay;
    window.confirmBellRemindSend = confirmBellRemindSend;
    window.startMutualBreakFromBalance = startMutualBreakFromBalance;
    window.archiveBrokenMutualTest = archiveBrokenMutualTest;
    window.isBrokenTesterDismissed = isBrokenTesterDismissed;
    window.dismissBrokenTester = dismissBrokenTester;
    window.openBrokenReciprocalPopup = openBrokenReciprocalPopup;
    window.getKickUnlinkReciprocal = getKickUnlinkReciprocal;
    window.consumePendingUnlinkReciprocal = consumePendingUnlinkReciprocal;
    window.showKickBlockedDialog = showKickBlockedDialog;
})();
