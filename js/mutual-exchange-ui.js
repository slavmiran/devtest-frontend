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

        if (test && test.is_mutual_debt) {
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
        var archiveBtn = '';
        var isKickedSoft = !!(test && (test.is_kicked_soft || test.is_unlinked_soft || test.is_soft_tail
            || String(test.progress_status || '').toLowerCase() === 'kicked_by_owner'
            || String(test.progress_status || '').toLowerCase() === 'canceled_neutral'));
        if (state.kind === 'broken' && appId > 0 && !isKickedSoft) {
            archiveBtn = ' <button type="button" class="barter-archive-btn" onclick="event.stopPropagation(); archiveBrokenMutualTest(' +
                appId + ')">' + _esc(_t('barterArchiveBtn')) + '</button>';
        }
        return '<span class="' + state.className + '" data-barter-kind="' + state.kind + '"' +
            ' onclick="event.stopPropagation(); openMutualBalanceModal(' + appId + ', event)">' +
            _esc(state.label) + '</span>' + archiveBtn;
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

    function openTesterLinkStatusFromRow(projectId, testerId, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        var safeProjectId = Number(projectId || 0);
        var safeTesterId = Number(testerId || 0);
        if (safeProjectId <= 0 || safeTesterId <= 0) return;

        var project = Array.isArray(myProjects)
            ? myProjects.find(function (item) { return Number(item.id) === safeProjectId; })
            : null;
        var tester = project && Array.isArray(project.testers)
            ? project.testers.find(function (item) { return Number(item.tester_id) === safeTesterId; })
            : null;
        if (!project || !tester) return;

        var theirAppName = String(tester.reciprocal_app_name || '').trim();
        var theirIconUrl = '';
        if (Array.isArray(myTests)) {
            var reciprocalTest = myTests.find(function (item) {
                return Number(item.owner_id || 0) === safeTesterId
                    || Number(item.id || item.app_id || 0) === Number(tester.reciprocal_app_id || 0);
            });
            if (reciprocalTest) {
                if (!theirAppName) theirAppName = String(reciprocalTest.name || '').trim();
                theirIconUrl = String(reciprocalTest.icon_url || '').trim();
            }
        }

        openMutualBalanceModal(safeProjectId, null, {
            context: 'projects',
            projectId: safeProjectId,
            testerId: safeTesterId,
            joinType: tester.join_type || 'invite',
            testerUsername: String(tester.username || '').replace(/^@+/, ''),
            testerFullName: String(tester.full_name || '').trim(),
            testerAvatarUrl: String(tester.avatar_url || '').trim(),
            testerLanguage: String(tester.language || '').trim(),
            myAppName: project.name || '',
            theirAppName: theirAppName,
            myIconUrl: project.icon_url || '',
            theirIconUrl: theirIconUrl,
            testerSnapshot: tester,
        });
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
        if (!canFetchPartnerStats) {
            body.innerHTML = _renderBalanceFromLocal(test, options);
            return;
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
        var theirDays = 0;
        var theirSkips = 0;
        var theirConsec = 0;
        var theirCheckins = 0;
        if (options.context === 'projects' && tester) {
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
            myDays: Number(test && test.partner_testing_days || 0),
            theirDays: theirDays,
            mySkips: Number(test && test.partner_skips || 0),
            theirSkips: theirSkips,
            theirCheckins: theirCheckins,
            partnerConsecutive: options.context === 'projects'
                ? theirConsec
                : Number(test && test.partner_consecutive_skips || 0),
            partnerUsername: person.username,
            partnerId: person.userId,
            partnerLeft: options.context === 'projects'
                ? !!(options.testerSnapshot && options.testerSnapshot.is_left_soft)
                : !!(test && test.partner_progress_status && test.partner_progress_status !== 'active' && test.partner_progress_status !== 'completed'),
            myProgressStatus: String(test && test.progress_status || 'active'),
            joinType: person.joinType,
            context: options.context || 'tests',
            isMutualDebt: !!(options.isMutualDebt || (test && test.is_mutual_debt) || (_balanceState && _balanceState.isMutualDebt)),
        });
    }

    function _renderBalanceFromStats(stats, test, options) {
        options = options || {};
        var person = _resolvePersonForRender(test, options, stats);
        var myAppName = stats.partner_app_name || (test && test.reciprocal_app_name) || _t('mutualBalanceYourProject');
        var theirAppName = stats.app_name || (test && test.name) || _t('unknownLabel');
        if (options.context === 'projects') {
            myAppName = options.myAppName || myAppName;
            theirAppName = options.theirAppName || theirAppName;
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
        return _renderBalanceColumns({
            person: person,
            myAppName: myAppName,
            theirAppName: theirAppName,
            myIcon: options.myIconUrl || stats.partner_app_icon_url || (test && test.reciprocal_app_icon_url) || '',
            theirIcon: options.theirIconUrl || stats.app_icon_url || (test && test.icon_url) || '',
            myDays: Number(stats.partner_testing_days || 0),
            theirDays: Number(stats.my_testing_days || (test && test.testing_days) || 0),
            mySkips: Number(stats.partner_skips || 0),
            theirSkips: Number(stats.my_skips || (test && test.skips_count) || 0),
            theirCheckins: Number(stats.my_checkins || (test && test.checkins_count) || 0),
            partnerConsecutive: Number(
                options.context === 'projects'
                    ? (stats.my_consecutive_skips || stats.partner_consecutive_skips || 0)
                    : (stats.partner_consecutive_skips || 0)
            ),
            partnerUsername: person.username,
            partnerId: person.userId,
            partnerLeft: options.context === 'projects'
                ? !!(options.testerSnapshot && options.testerSnapshot.is_left_soft)
                : !!stats.partner_left,
            myProgressStatus: String(test && test.progress_status || 'active'),
            joinType: person.joinType,
            context: options.context || 'tests',
            isMutualDebt: !!(options.isMutualDebt || (test && test.is_mutual_debt) || (_balanceState && _balanceState.isMutualDebt)),
        });
    }

    function _paritySideCard(label, appName, iconUrl, day, skips, options) {
        options = options || {};
        var skipWarn = Number(skips || 0) >= 3;
        var isBroken = !!options.broken;
        var isDebtDone = !!options.debtDone;
        var isDebtActive = !!options.debtActive;
        var stateClass = isBroken ? ' is-broken' : (isDebtDone ? ' is-debt-done' : (isDebtActive ? ' is-debt-active' : ''));
        var stateBadge = '';
        if (isBroken) {
            stateBadge = '<div class="parity-side-broken">' + _esc(_t('mutualBalanceSideBroken')) + '</div>';
        } else if (isDebtDone) {
            stateBadge = '<div class="parity-side-debt-done">' + _esc(_t('mutualBalanceSideDebtDone')) + '</div>';
        } else if (isDebtActive) {
            stateBadge = '<div class="parity-side-debt-active">' + _esc(_t('mutualBalanceSideDebtActive')) + '</div>';
        }
        return '' +
            '<div class="parity-side-card' + stateClass + '">' +
                '<div class="parity-side-label">' + _esc(label) + '</div>' +
                '<div class="parity-side-icon">' + _renderIconHtml(appName, iconUrl) + '</div>' +
                '<div class="parity-side-name notranslate">' + _esc(appName) + '</div>' +
                stateBadge +
                '<div class="parity-chip-row">' +
                    '<span class="parity-chip">📅 ' + _esc(_t('parityDayChip', { day: day, total: 14 })) + '</span>' +
                    '<span class="parity-chip' + (skipWarn ? ' is-warn' : '') + '">⚠️ ' +
                        _esc(formatSkipsLabel(skips)) +
                    '</span>' +
                '</div>' +
            '</div>';
    }

    function _renderSingleSideStats(data) {
        var skipWarn = Number(data.theirSkips || 0) >= 3 || Number(data.partnerConsecutive || 0) >= 3;
        return '' +
            '<div class="link-status-single">' +
                '<div class="link-status-single-head">' +
                    '<div class="parity-side-icon">' + _renderIconHtml(data.theirAppName || data.myAppName, data.theirIcon || data.myIcon) + '</div>' +
                    '<div class="link-status-single-copy">' +
                        '<div class="parity-side-label">' + _esc(_t('linkStatusOnYourProject')) + '</div>' +
                        '<div class="parity-side-name notranslate">' + _esc(data.myAppName || data.theirAppName || _t('unknownLabel')) + '</div>' +
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
        var isDebt = !!(data.isMutualDebt || (_balanceState && _balanceState.isMutualDebt));
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
        var bodyHtml;
        if (isMutual) {
            // Owner: you→their reciprocal app; them→your project.
            // Tester: you→current (owner) app; them→your reciprocal.
            var youAtThemName = isOwnerView
                ? (data.theirAppName || data.myAppName)
                : (data.theirAppName || data.myAppName);
            var youAtThemIcon = isOwnerView
                ? (data.theirIcon || data.myIcon)
                : (data.theirIcon || data.myIcon);
            var youAtThemDays = isOwnerView ? data.myDays : data.theirDays;
            var youAtThemSkips = isOwnerView ? data.mySkips : data.theirSkips;
            var themAtYouName = isOwnerView
                ? data.myAppName
                : (data.myAppName || _t('mutualBalanceYourProject'));
            var themAtYouIcon = data.myIcon;
            var themAtYouDays = isOwnerView ? data.theirDays : data.myDays;
            var themAtYouSkips = isOwnerView ? data.theirSkips : data.mySkips;
            // One-sided link: partner left / was kicked / unlinked — mark their side broken.
            var themBroken = !isDebt && !!data.partnerLeft;
            var youBroken = false;
            if (!isDebt && data.context === 'tests') {
                var myProgress = String(data.myProgressStatus || '').toLowerCase();
                youBroken = myProgress === 'kicked_by_owner' || myProgress === 'canceled_neutral';
            }
            // Debt: your project side is finished; your counter-test is still the obligation.
            var themDebtDone = false;
            var youDebtActive = false;
            if (isDebt) {
                if (isOwnerView) {
                    // Owner still testing tester's app while own project already finished.
                    themDebtDone = true;
                    youDebtActive = true;
                } else {
                    // Tester POV: reciprocal (my) project finished; still testing their app.
                    themDebtDone = true;
                    youDebtActive = true;
                }
            }
            bodyHtml = '<div class="parity-comparison-grid">' +
                _paritySideCard(_t('mutualBalanceThemAtYou'), themAtYouName, themAtYouIcon, themAtYouDays, themAtYouSkips, {
                    broken: themBroken,
                    debtDone: themDebtDone,
                }) +
                _paritySideCard(_t('mutualBalanceYouAtThem'), youAtThemName, youAtThemIcon, youAtThemDays, youAtThemSkips, {
                    broken: youBroken,
                    debtActive: youDebtActive,
                }) +
            '</div>';
            if (isDebt) {
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

        var breakLabel = isDebt
            ? _t('mutualBalanceDebtExitBtn')
            : (isMutual ? _t('mutualBalanceBreakBtn') : _t('linkStatusKickBtn'));
        var actionsHtml = '<div class="parity-actions">';
        if (!isDebt) {
            actionsHtml += '' +
                '<button type="button" class="btn btn-outline-tg" onclick="openBellRemindPreview()">' +
                    _esc(_t('mutualBalanceBellBtn')) +
                '</button>';
        }
        actionsHtml += '' +
                '<button type="button" class="btn btn-danger-soft" onclick="startMutualBreakFromBalance()">' +
                    _esc(breakLabel) +
                '</button>' +
            '</div>';

        return '' +
            _renderPersonHero(person) +
            bodyHtml +
            hint +
            actionsHtml;
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
            openOwnerCheckpointChat(username, text);
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
        if (!_balanceState) return;
        var appId = Number(_balanceState.appId || 0);
        var context = _balanceState.context || 'tests';
        var projectId = Number(_balanceState.projectId || appId);
        var testerId = Number(_balanceState.testerId || 0);
        var joinType = _normalizeJoinType(_balanceState.joinType || 'mutual');
        var forceUnlink = _isMutualJoin(joinType);
        closeMutualBalanceModal();

        if (context === 'projects') {
            if (typeof openKickTesterModal === 'function') {
                try {
                    openKickTesterModal(projectId, testerId, null, {
                        forceUnlink: forceUnlink,
                        unlinkReciprocal: forceUnlink,
                    });
                } catch (error) {
                    console.error('openKickTesterModal failed', error);
                    if (typeof showToast === 'function') {
                        showToast(_t('linkStatusKickOpenFailed'));
                    }
                }
            }
            return;
        }

        if (typeof openLeaveMutualModal === 'function') {
            window._pendingUnlinkReciprocal = false;
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

    window.pluralizeRu = pluralizeRu;
    window.pluralizeSkipWord = pluralizeSkipWord;
    window.formatSkipsLabel = formatSkipsLabel;
    window.formatBarterWarningLabel = formatBarterWarningLabel;
    window.calculateConsecutiveSkips = calculateConsecutiveSkips;
    window.getBarterChipState = getBarterChipState;
    window.buildBarterChipHtml = buildBarterChipHtml;
    window.openMutualBalanceModal = openMutualBalanceModal;
    window.openTesterLinkStatusFromRow = openTesterLinkStatusFromRow;
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
