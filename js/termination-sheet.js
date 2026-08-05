/**
 * Unified Termination Sheet — one break-link modal for leave (tester) and kick (owner).
 * Visual language: leave parity card + soft CTAs.
 * Controls: unlink checkboxes + reason chips + freeform note + confirm overlay.
 */
(function () {
    'use strict';

    var _termState = null;

    function _lang() {
        return (typeof lang !== 'undefined' && lang) ? String(lang) : 'ru';
    }

    function _t(key, params) {
        return window.t ? window.t(key, params || {}, _lang()) : key;
    }

    function _esc(value) {
        return window.escapeHTML
            ? window.escapeHTML(String(value == null ? '' : value))
            : String(value == null ? '' : value);
    }

    function _normalizeJoinType(value) {
        var joinType = String(value || 'invite').toLowerCase();
        if (joinType === 'prelaunch') return 'mutual';
        if (joinType === 'direct') return 'invite';
        return joinType;
    }

    function _isMutualJoin(joinType) {
        return _normalizeJoinType(joinType) === 'mutual';
    }

    function _fmtAmount(value, digits) {
        if (typeof formatUiAmount === 'function') return formatUiAmount(value, digits);
        var n = Number(value || 0);
        return Number.isFinite(n) ? n.toFixed(digits == null ? 1 : digits) : '0';
    }

    function _syncLegacyReasonFields(code, note) {
        var leaveSel = document.getElementById('leave-reason-select');
        var kickSel = document.getElementById('kick-reason-select');
        var leaveOther = document.getElementById('leave-reason-other');
        var kickOther = document.getElementById('kick-reason-other');
        var termSel = document.getElementById('term-reason-select');
        if (termSel) termSel.value = code;
        if (leaveSel) leaveSel.value = code;
        if (kickSel) kickSel.value = code;
        if (leaveOther) leaveOther.value = note || '';
        if (kickOther) kickOther.value = note || '';
        var hiddenKickUnlink = document.getElementById('kick-unlink-reciprocal');
        var termUnlink = document.getElementById('term-unlink-reciprocal');
        if (hiddenKickUnlink && termUnlink) {
            hiddenKickUnlink.checked = !!termUnlink.checked;
        }
    }

    function getTermUnlinkReciprocal() {
        var checkbox = document.getElementById('term-unlink-reciprocal');
        if (checkbox) return !!checkbox.checked;
        var legacy = document.getElementById('kick-unlink-reciprocal');
        return legacy ? !!legacy.checked : true;
    }

    function getTermReasonCode() {
        var el = document.getElementById('term-reason-select');
        return el ? String(el.value || '').trim() : '';
    }

    function getTermReasonNote() {
        var el = document.getElementById('term-reason-other');
        return el ? String(el.value || '').trim() : '';
    }

    function toggleTermUnlinkHint() {
        var checkbox = document.getElementById('term-unlink-reciprocal');
        var hint = document.getElementById('term-unlink-hint');
        if (!hint) return;
        var showHint = !!(checkbox && !checkbox.checked);
        hint.style.display = showHint ? 'block' : 'none';
        hint.classList.toggle('is-visible', showHint);
        var legacy = document.getElementById('kick-unlink-reciprocal');
        if (legacy && checkbox) legacy.checked = !!checkbox.checked;
    }

    function _reasonDefsForMode(mode) {
        if (mode === 'kick') {
            return [
                { code: 'no_response', labelKey: 'kickReasonNoResponse' },
                { code: 'inactive', labelKey: 'kickReasonInactivity' },
                { code: 'violation', labelKey: 'kickReasonViolation' },
                { code: 'other', labelKey: 'kickReasonOther' },
            ];
        }
        return [
            { code: 'inactive_partner', labelKey: 'leaveReasonInactive' },
            { code: 'partner_left', labelKey: 'leaveReasonPartnerLeft' },
            { code: 'communication_issue', labelKey: 'leaveReasonCommunication' },
            { code: 'other', labelKey: 'leaveReasonOther' },
        ];
    }

    function _renderReasonChips(mode, selectedCode) {
        var group = document.getElementById('term-reason-chips');
        if (!group) return;
        var defs = _reasonDefsForMode(mode);
        var selected = selectedCode || defs[0].code;
        group.innerHTML = defs.map(function (def) {
            var selectedClass = def.code === selected ? ' is-selected' : '';
            return '<button type="button" class="reason-chip' + selectedClass + '" data-reason="' +
                _esc(def.code) + '" onclick="selectTermReason(this)">' +
                '<span>' + _esc(_t(def.labelKey)) + '</span></button>';
        }).join('');
        _syncLegacyReasonFields(selected, getTermReasonNote());
    }

    function selectTermReason(buttonEl) {
        if (!buttonEl) return;
        var reason = String(buttonEl.getAttribute('data-reason') || '').trim() || 'other';
        var group = document.getElementById('term-reason-chips');
        if (group) {
            Array.prototype.forEach.call(group.querySelectorAll('.reason-chip'), function (chip) {
                chip.classList.toggle('is-selected', chip === buttonEl);
            });
        }
        _syncLegacyReasonFields(reason, getTermReasonNote());
        var other = document.getElementById('term-reason-other');
        if (other) other.style.display = 'block';
    }

    function _setTypeBadge(joinType) {
        var badge = document.getElementById('term-type-badge');
        if (!badge) return;
        var normalized = _normalizeJoinType(joinType);
        var map = {
            mutual: { cls: 'is-mutual', key: 'termTypeMutual' },
            bounty: { cls: 'is-bounty', key: 'termTypeBounty' },
            invite: { cls: 'is-direct', key: 'termTypeInvite' },
        };
        var conf = map[normalized] || map.invite;
        badge.hidden = false;
        badge.className = 'term-type-badge ' + conf.cls;
        badge.textContent = _t(conf.key);
    }

    function _setupUnlinkBox(mode, joinType, options) {
        options = options || {};
        var box = document.getElementById('term-unlink-box');
        var reciprocal = document.getElementById('term-unlink-reciprocal');
        var reciprocalRow = document.getElementById('term-unlink-reciprocal-row');
        var primaryLabel = document.getElementById('term-unlink-primary-label');
        var reciprocalLabel = document.getElementById('term-unlink-reciprocal-label');
        var hint = document.getElementById('term-unlink-hint');
        if (!box) return;

        var isMutual = _isMutualJoin(joinType);
        box.hidden = !isMutual;
        if (!isMutual) {
            if (reciprocal) reciprocal.checked = false;
            return;
        }

        if (primaryLabel) {
            primaryLabel.textContent = mode === 'kick'
                ? _t('kickUnlinkExcludeLocked')
                : _t('termUnlinkLeavePrimary');
        }
        if (reciprocalLabel) {
            reciprocalLabel.textContent = mode === 'kick'
                ? _t('kickUnlinkReciprocalLabel')
                : _t('termUnlinkLeaveReciprocal');
        }
        if (hint) {
            hint.setAttribute('data-i18n', mode === 'kick' ? 'kickUnlinkReciprocalHint' : 'termUnlinkLeaveHint');
            hint.textContent = mode === 'kick'
                ? _t('kickUnlinkReciprocalHint')
                : _t('termUnlinkLeaveHint');
        }

        var forceUnlink = options.forceUnlink === true || options.unlinkReciprocal === true;
        if (reciprocal) {
            reciprocal.checked = options.unlinkReciprocal === false ? false : true;
            if (forceUnlink) reciprocal.checked = true;
            reciprocal.disabled = !!forceUnlink;
        }
        if (reciprocalRow) {
            reciprocalRow.style.opacity = forceUnlink ? '0.85' : '1';
        }
        toggleTermUnlinkHint();
    }

    function _metricRow(ico, label, value, warn) {
        return '' +
            '<div class="leave-metric' + (warn ? ' is-warn' : '') + '">' +
                '<span class="leave-metric-ico" aria-hidden="true">' + ico + '</span>' +
                '<span class="leave-metric-label">' + _esc(label) + '</span>' +
                '<span class="leave-metric-value">' + _esc(String(value)) + '</span>' +
            '</div>';
    }

    function _effectsBlock(title, lines) {
        if (!lines || !lines.length) return '';
        return '' +
            '<div class="term-effects-block">' +
                '<div class="term-effects-title">' + _esc(title) + '</div>' +
                '<ul class="term-effects-list">' +
                    lines.map(function (line) {
                        return '<li>' + _esc(line) + '</li>';
                    }).join('') +
                '</ul>' +
            '</div>';
    }

    function _renderLeaveBody(data) {
        var partnerSkips = Number(data.partner_skips || 0);
        var partnerConsecutive = Number(data.partner_consecutive_skips || 0);
        var justifiedAllowed = !!data.partner_left || partnerSkips >= 3 || partnerConsecutive >= 3;
        var myCheckins = Number(data.my_checkins != null ? data.my_checkins : 0);
        var karmaBurn = Math.min(14, myCheckins) * 0.1;
        var mySkips = Number(data.my_skips || 0);
        var waitCount = Math.max(0, 3 - Math.max(partnerSkips, partnerConsecutive));
        var grantStillAvailable = mySkips < 3;
        var partnerLabel = data.partner_username
            ? '@' + String(data.partner_username || '').replace(/^@+/, '')
            : _t('idLabel', { id: data.partner_id || 0 });

        if (_termState) {
            _termState.justifiedAllowed = justifiedAllowed;
            _termState.karmaBurnPreview = karmaBurn;
            _termState.grantAvailable = grantStillAvailable;
            window._leaveJustifiedAllowed = justifiedAllowed;
            window._leaveKarmaBurnPreview = karmaBurn;
            window._leaveGrantAvailable = grantStillAvailable;
        }

        var partnerMetaParts = [];
        if (data.partner_reliability_index != null && data.partner_reliability_index !== '') {
            partnerMetaParts.push('<span class="leave-meta-item">🛡 ' + _esc(String(data.partner_reliability_index)) + '%</span>');
        }
        if (data.partner_karma != null && data.partner_karma !== '') {
            partnerMetaParts.push('<span class="leave-meta-item">☯️ ' + _esc(String(data.partner_karma)) + '</span>');
        }

        var statusBanner = justifiedAllowed
            ? '<div class="leave-status-banner is-justified">' +
                '<div class="leave-status-title">' + _esc(_t('leaveJustifiedBadge')) + '</div>' +
                '<div class="leave-status-desc">' + _esc(_t('leaveJustifiedDesc')) + '</div>' +
              '</div>'
            : '<div class="leave-status-banner is-penalty">' +
                '<div class="leave-status-title">' + _esc(_t('leaveAbandonedTitle')) + '</div>' +
                '<div class="leave-status-desc">' + _esc(_t('leaveAbandonedDesc', { karma: _fmtAmount(karmaBurn, 1) })) + '</div>' +
                '<div class="leave-status-desc" style="margin-top:8px;">' + _esc(_t('leaveSafeWaitWarning', {
                    count: waitCount,
                    word: typeof pluralizeSkipWord === 'function' ? pluralizeSkipWord(waitCount) : '',
                })) + '</div>' +
              '</div>';

        var grantRow = grantStillAvailable
            ? '<div class="leave-grant-row">' +
                '<span class="leave-grant-icon" aria-hidden="true">🏆</span>' +
                '<div class="leave-grant-copy">' +
                    '<div class="leave-grant-title">' + _esc(_t('leaveGrantTeaseTitle')) + '</div>' +
                    '<div class="leave-grant-desc">' + _esc(_t('leaveGrantTeaseDesc', { skips: mySkips, max: 3 })) + '</div>' +
                '</div></div>'
            : '';

        return '' +
            '<div class="leave-exchange-card" id="leave-exchange-card">' +
                '<div class="leave-side leave-side--partner">' +
                    '<div class="leave-side-head">' +
                        '<div class="leave-side-kicker">' + _esc(_t('leavePartnerTitle')) + '</div>' +
                        '<div class="leave-side-name notranslate">' + _esc(partnerLabel) + '</div>' +
                    '</div>' +
                    '<div class="leave-metric-list">' +
                        _metricRow('📅', _t('leaveMetricDays'), data.partner_testing_days || 0, false) +
                        _metricRow('⚠️', _t('leaveMetricSkips'), String(partnerSkips) + '/3', partnerSkips >= 3 || partnerConsecutive >= 3) +
                    '</div>' +
                    (partnerMetaParts.length
                        ? '<div class="leave-side-meta">' + partnerMetaParts.join('<span class="leave-meta-sep" aria-hidden="true">·</span>') + '</div>'
                        : '') +
                    (data.partner_left
                        ? '<div class="leave-inline-note is-warn">' + _esc(_t('leavePartnerLeft')) + '</div>'
                        : '') +
                '</div>' +
                '<div class="leave-side leave-side--mine" id="leave-my-side">' +
                    '<button type="button" class="leave-pull" id="leave-my-stats-toggle" aria-expanded="false" onclick="toggleLeaveMyStats()">' +
                        '<span class="leave-pull-rail" aria-hidden="true"><span class="leave-pull-knob"></span></span>' +
                        '<span class="leave-pull-copy">' +
                            '<span class="leave-pull-label">' + _esc(_t('leaveMyStatsPeekLabel')) + '</span>' +
                            '<span class="leave-pull-hint">' + _esc(_t('leaveMyStatsPeekHint')) + '</span>' +
                        '</span>' +
                        '<span class="leave-pull-chevron" aria-hidden="true"></span>' +
                    '</button>' +
                    '<div class="leave-my-drawer" id="leave-my-stats-panel">' +
                        '<div class="leave-my-drawer-inner">' +
                            '<div class="leave-metric-list">' +
                                _metricRow('📅', _t('leaveMetricDays'), data.my_testing_days || 0, false) +
                                _metricRow('⚠️', _t('leaveMetricSkips'), String(mySkips) + '/3', mySkips >= 3) +
                                _metricRow('✅', _t('leaveMetricCheckins'), myCheckins, false) +
                            '</div>' +
                            grantRow +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            statusBanner;
    }

    function _renderKickBody(ctx) {
        var testingDays = ctx.testingDays;
        var checkinCount = ctx.checkinCount;
        var skipsCount = ctx.skipsCount;
        var consecutiveSkips = ctx.consecutiveSkips;
        var joinType = ctx.joinType;
        var isDisciplinaryKick = skipsCount >= 3 || consecutiveSkips >= 3;
        var isBountyJoin = joinType === 'bounty' && ctx.bountyPerTester > 0;
        var holdBonus = ctx.holdBonus;
        var dailyBurn = ctx.dailyBurn;

        if (_termState) {
            _termState.justifiedAllowed = isDisciplinaryKick;
            _termState.isDisciplinaryKick = isDisciplinaryKick;
            _termState.isBountyJoin = isBountyJoin;
            _termState.holdBonus = holdBonus;
            _termState.dailyBurn = dailyBurn;
        }

        var testerLabel = ctx.testerUsername
            ? '@' + String(ctx.testerUsername).replace(/^@+/, '')
            : (ctx.testerFullName || _t('idLabel', { id: ctx.testerId || 0 }));

        var verdictKey = isBountyJoin
            ? (isDisciplinaryKick ? 'kickVerdictBountySafe' : 'kickVerdictBountyUnsafe')
            : (isDisciplinaryKick ? 'kickVerdictNonBountySafe' : 'kickVerdictNonBountyUnsafe');

        var ownerEffects = [];
        if (isBountyJoin) {
            ownerEffects.push(_t(isDisciplinaryKick ? 'kickOwnerBountyHoldReturned' : 'kickOwnerBountyHoldBurned', {
                amount: _fmtAmount(holdBonus, 1),
            }));
            ownerEffects.push(_t('kickOwnerBountyDailyBurn', { amount: _fmtAmount(dailyBurn, 1) }));
        } else {
            ownerEffects.push(_t(joinType === 'mutual' ? 'kickOwnerNoMoneyMutual' : 'kickOwnerNoMoneyInvite'));
        }
        ownerEffects.push(_t(isDisciplinaryKick ? 'kickOwnerReliabilitySafe' : 'kickOwnerReliabilityRisk'));

        var testerEffects = [
            _t('kickTesterEffectAccess'),
            _t(isDisciplinaryKick ? 'kickTesterEffectJustified' : 'kickTesterEffectNeutral'),
        ];

        var statusBanner = isDisciplinaryKick
            ? '<div class="leave-status-banner is-justified">' +
                '<div class="leave-status-title">' + _esc(_t('termKickSafeBadge')) + '</div>' +
                '<div class="leave-status-desc">' + _esc(_t(verdictKey)) + '</div>' +
              '</div>'
            : '<div class="leave-status-banner is-penalty">' +
                '<div class="leave-status-title">' + _esc(_t('termKickRiskBadge')) + '</div>' +
                '<div class="leave-status-desc">' + _esc(_t(verdictKey)) + '</div>' +
              '</div>';

        return '' +
            '<div class="leave-exchange-card">' +
                '<div class="leave-side leave-side--partner">' +
                    '<div class="leave-side-head">' +
                        '<div class="leave-side-kicker">' + _esc(_t('termKickTesterSide')) + '</div>' +
                        '<div class="leave-side-name notranslate">' + _esc(testerLabel) + '</div>' +
                    '</div>' +
                    '<div class="leave-metric-list">' +
                        _metricRow('📅', _t('leaveMetricDays'), testingDays, false) +
                        _metricRow('✅', _t('leaveMetricCheckins'), checkinCount, false) +
                        _metricRow('⚠️', _t('leaveMetricSkips'), String(skipsCount) + '/3', skipsCount >= 3) +
                        (consecutiveSkips > 0
                            ? _metricRow('🔁', _t('linkStatusConsecutiveSkips'), consecutiveSkips, consecutiveSkips >= 3)
                            : '') +
                    '</div>' +
                    '<div class="leave-inline-note">' + _esc(_t(
                        joinType === 'bounty' ? 'kickJoinTypeBounty'
                            : (joinType === 'mutual' ? 'kickJoinTypeMutual' : 'kickJoinTypeInvite')
                    )) + '</div>' +
                '</div>' +
            '</div>' +
            statusBanner +
            _effectsBlock(_t('kickOwnerEffectsTitle'), ownerEffects) +
            _effectsBlock(_t('kickTesterEffectsTitle'), testerEffects);
    }

    function _updatePrimaryCta() {
        var btn = document.getElementById('term-confirm-btn');
        if (!btn || !_termState) return;
        btn.classList.remove('leave-cta--safe', 'leave-cta--warn');
        if (_termState.mode === 'leave') {
            var justified = !!_termState.justifiedAllowed;
            btn.classList.add(justified ? 'leave-cta--safe' : 'leave-cta--warn');
            btn.textContent = _t(justified ? 'leaveJustifiedBtn' : 'leaveAbandonedBtn');
            return;
        }
        var safe = !!_termState.justifiedAllowed;
        btn.classList.add(safe ? 'leave-cta--safe' : 'leave-cta--warn');
        btn.textContent = _t(safe ? 'termKickBtnSafe' : 'termKickBtnRisk');
    }

    async function openTerminationSheet(options) {
        options = options || {};
        var modal = document.getElementById('termination-sheet');
        var body = document.getElementById('term-body');
        var titleEl = document.getElementById('term-title');
        var subtitleEl = document.getElementById('term-subtitle');
        var reasonLabel = document.getElementById('term-reason-label');
        var reasonOther = document.getElementById('term-reason-other');
        if (!modal || !body) return;

        var mode = options.mode === 'kick' ? 'kick' : 'leave';
        var joinType = _normalizeJoinType(options.joinType || 'mutual');

        _termState = {
            mode: mode,
            appId: Number(options.appId || 0),
            projectId: Number(options.projectId || options.appId || 0),
            testerId: Number(options.testerId || 0),
            joinType: joinType,
            justifiedAllowed: false,
            karmaBurnPreview: 0,
            grantAvailable: false,
            forceUnlink: !!options.forceUnlink,
        };

        // Legacy globals used by confirmLeaveMutual / confirmKickTester
        if (mode === 'leave') {
            window._leaveMutualAppId = _termState.appId;
            window._leaveMutualStats = null;
        } else {
            window._kickTarget = { appId: _termState.projectId, testerId: _termState.testerId };
        }

        if (titleEl) {
            titleEl.textContent = mode === 'kick'
                ? _t('termSheetTitleKick')
                : _t('termSheetTitleLeave');
        }
        if (subtitleEl) {
            subtitleEl.textContent = mode === 'kick'
                ? _t('termSheetSubtitleKick')
                : _t('termSheetSubtitleLeave');
        }
        if (reasonLabel) {
            reasonLabel.textContent = mode === 'kick'
                ? _t('kickReasonLabel')
                : _t('leaveReasonLabel');
        }
        if (reasonOther) {
            reasonOther.value = '';
            reasonOther.style.display = 'block';
            reasonOther.placeholder = mode === 'kick'
                ? _t('kickReasonPlaceholder')
                : _t('leaveReasonPlaceholder');
        }

        _setTypeBadge(joinType);
        _setupUnlinkBox(mode, joinType, options);
        _renderReasonChips(mode, mode === 'kick' ? 'no_response' : 'inactive_partner');

        body.innerHTML = '<p style="text-align:center; color: var(--hint-color);">' +
            _esc(_t('leaveLoadingStats')) + '</p>';
        _updatePrimaryCta();
        cancelTerminationConfirm();
        modal.classList.add('active');

        if (mode === 'leave') {
            await _loadLeaveStats(_termState.appId, body);
        } else {
            _fillKickFromLocal(options, body);
        }
        _updatePrimaryCta();
    }

    async function _loadLeaveStats(appId, body) {
        try {
            var apiBase = (typeof API_BASE !== 'undefined') ? API_BASE : '';
            var actorId = (typeof userId !== 'undefined') ? userId : 0;
            var response = await fetch(apiBase + '/tests/' + appId + '/partner_stats/' + actorId);
            var data = await response.json();
            if (!_termState || Number(_termState.appId) !== Number(appId)) return;
            if (!response.ok || data.status !== 'success') {
                body.innerHTML = '<div class="details-block"><div style="color: var(--hint-color);">' +
                    _esc(typeof getApiErrorMessage === 'function'
                        ? getApiErrorMessage(data, 'stats_not_available')
                        : 'stats_not_available') +
                    '</div></div>';
                return;
            }
            window._leaveMutualStats = data;
            body.innerHTML = _renderLeaveBody(data);
        } catch (error) {
            console.error('Termination leave stats error:', error);
            body.innerHTML = '<div class="details-block"><div style="color: var(--hint-color);">' +
                _esc(typeof getApiErrorMessage === 'function'
                    ? getApiErrorMessage(error && error.message, 'networkError')
                    : 'networkError') +
                '</div></div>';
        }
    }

    function _fillKickFromLocal(options, body) {
        var appId = Number(options.projectId || options.appId || 0);
        var testerId = Number(options.testerId || 0);
        var project = Array.isArray(myProjects)
            ? myProjects.find(function (item) { return Number(item.id) === appId; })
            : null;
        var tester = project && Array.isArray(project.testers)
            ? project.testers.find(function (item) { return Number(item.tester_id) === testerId; })
            : null;
        if (!project || !tester) {
            body.innerHTML = '<div class="details-block"><div style="color: var(--hint-color);">' +
                _esc(_t('loadError')) + '</div></div>';
            return;
        }

        var testingDays = tester.start_date && typeof getUserTestingDay === 'function'
            ? getUserTestingDay(tester.start_date)
            : Number(tester.testing_days || 0);
        var checkinCount = Number(tester.checkins_count || 0);
        var lastCheck = String(tester.last_check_date || '').trim();
        var todayIso = (typeof getLocalDateIso === 'function')
            ? getLocalDateIso()
            : new Date().toISOString().slice(0, 10);
        var checkedToday = !!lastCheck && lastCheck === todayIso;
        var realizedDays = checkedToday ? testingDays : Math.max(0, testingDays - 1);
        var skipsCount = Math.max(0, Math.min(14, realizedDays) - Math.min(14, checkinCount));
        var consecutiveSkips = Number(tester.consecutive_skips != null
            ? tester.consecutive_skips
            : (typeof calculateConsecutiveSkips === 'function' ? calculateConsecutiveSkips(tester) : 0));
        var joinType = _normalizeJoinType(tester.join_type || options.joinType || 'invite');
        var bountyPerTester = Number(project.bounty_per_tester || 0);
        var holdBonus = bountyPerTester > 0 ? bountyPerTester * 0.35 : 0;
        var dailyPool = bountyPerTester > 0 ? bountyPerTester * 0.65 : 0;
        var rewardPerCheckin = dailyPool > 0 ? dailyPool / 14 : 0;
        var dailyBurn = Math.max(0, dailyPool - (checkinCount * rewardPerCheckin));

        if (_termState) _termState.joinType = joinType;
        _setTypeBadge(joinType);
        _setupUnlinkBox('kick', joinType, options);

        body.innerHTML = _renderKickBody({
            testingDays: testingDays,
            checkinCount: checkinCount,
            skipsCount: skipsCount,
            consecutiveSkips: consecutiveSkips,
            joinType: joinType,
            bountyPerTester: bountyPerTester,
            holdBonus: holdBonus,
            dailyBurn: dailyBurn,
            testerId: testerId,
            testerUsername: tester.username || options.testerUsername || '',
            testerFullName: tester.full_name || options.testerFullName || '',
        });
    }

    function closeTerminationSheet(event) {
        var modal = document.getElementById('termination-sheet');
        if (!modal) return;
        if (event && event.target !== modal) return;
        modal.classList.remove('active');
        cancelTerminationConfirm();
        _termState = null;
        window._leaveMutualAppId = null;
        window._leaveMutualStats = null;
        window._leaveJustifiedAllowed = false;
        window._leaveKarmaBurnPreview = 0;
        window._leaveGrantAvailable = false;
        window._kickTarget = null;
        var reciprocal = document.getElementById('term-unlink-reciprocal');
        if (reciprocal) {
            reciprocal.disabled = false;
            reciprocal.checked = true;
        }
        toggleTermUnlinkHint();
    }

    function requestTerminationConfirm() {
        if (!_termState) return;
        _syncLegacyReasonFields(getTermReasonCode(), getTermReasonNote());

        var overlay = document.getElementById('leave-confirm-overlay');
        var body = document.getElementById('leave-confirm-body');
        var finalBtn = document.getElementById('leave-confirm-final-btn');
        var title = document.getElementById('leave-confirm-title');
        if (!overlay || !body) return;

        var mode = _termState.mode;
        var points = [];
        var justified = !!_termState.justifiedAllowed;
        var unlink = getTermUnlinkReciprocal();

        if (mode === 'leave') {
            if (title) title.textContent = _t('leaveConfirmTitle');
            if (unlink && _isMutualJoin(_termState.joinType)) {
                points.push('<li>' + _esc(_t('leaveConfirmPointMirror')) + '</li>');
            } else if (_isMutualJoin(_termState.joinType)) {
                points.push('<li>' + _esc(_t('termConfirmPointKeepMirrorLeave')) + '</li>');
            }
            if (justified) {
                points.push('<li>' + _esc(_t('leaveConfirmPointNoPenalty')) + '</li>');
            } else {
                points.push('<li>' + _esc(_t('leaveConfirmPointKarma', {
                    karma: _fmtAmount(_termState.karmaBurnPreview || 0, 1),
                })) + '</li>');
            }
            if (_termState.grantAvailable) {
                points.push('<li class="is-warn">' + _esc(_t('leaveConfirmPointGrant')) + '</li>');
            }
            body.innerHTML = '' +
                '<p class="leave-confirm-lead">' + _esc(justified
                    ? _t('leaveConfirmDescJustified')
                    : _t('leaveConfirmDescAbandoned', { karma: _fmtAmount(_termState.karmaBurnPreview || 0, 1) })) +
                '</p><ul class="leave-confirm-points">' + points.join('') + '</ul>';
            if (finalBtn) {
                finalBtn.classList.toggle('leave-cta--safe', justified);
                finalBtn.classList.toggle('leave-cta--warn', !justified);
                finalBtn.textContent = _t(justified ? 'leaveConfirmFinalJustified' : 'leaveConfirmFinalAbandoned');
            }
        } else {
            if (title) title.textContent = _t('termConfirmTitleKick');
            points.push('<li>' + _esc(_t('termConfirmPointKickPrimary')) + '</li>');
            if (_isMutualJoin(_termState.joinType)) {
                points.push('<li>' + _esc(unlink
                    ? _t('termConfirmPointKickMirror')
                    : _t('termConfirmPointKickKeepMirror')) + '</li>');
            }
            if (justified) {
                points.push('<li>' + _esc(_t('termConfirmPointKickSafe')) + '</li>');
            } else {
                points.push('<li class="is-warn">' + _esc(_t('termConfirmPointKickRisk')) + '</li>');
            }
            body.innerHTML = '' +
                '<p class="leave-confirm-lead">' + _esc(_t('termConfirmDescKick')) + '</p>' +
                '<ul class="leave-confirm-points">' + points.join('') + '</ul>';
            if (finalBtn) {
                finalBtn.classList.toggle('leave-cta--safe', justified);
                finalBtn.classList.toggle('leave-cta--warn', !justified);
                finalBtn.textContent = _t('kickConfirmBtn');
            }
        }

        overlay.classList.add('active');
        if (window.tg && window.tg.HapticFeedback) {
            window.tg.HapticFeedback.impactOccurred('medium');
        }
    }

    function cancelTerminationConfirm(event) {
        var overlay = document.getElementById('leave-confirm-overlay');
        if (!overlay) return;
        if (event && event.target === overlay) {
            overlay.classList.remove('active');
            return;
        }
        if (event && event.currentTarget === overlay && event.target !== overlay) {
            return;
        }
        overlay.classList.remove('active');
    }

    function confirmTerminationAdaptive() {
        var overlay = document.getElementById('leave-confirm-overlay');
        if (overlay) overlay.classList.remove('active');
        if (!_termState) return;

        _syncLegacyReasonFields(getTermReasonCode(), getTermReasonNote());
        var unlink = getTermUnlinkReciprocal();
        window._pendingUnlinkReciprocal = unlink;

        if (_termState.mode === 'leave') {
            var justified = !!_termState.justifiedAllowed;
            if (typeof confirmLeaveMutual === 'function') {
                confirmLeaveMutual(justified);
            }
            return;
        }
        if (typeof confirmKickTester === 'function') {
            confirmKickTester();
        }
    }

    // --- Public wrappers (backward compatible entry points) ---

    function openLeaveMutualModal(appId, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        var test = (typeof getMyTestById === 'function')
            ? getMyTestById(appId)
            : (Array.isArray(myTests) ? myTests.find(function (item) { return Number(item.id) === Number(appId); }) : null);
        return openTerminationSheet({
            mode: 'leave',
            appId: Number(appId || 0),
            joinType: (test && test.join_type) || 'mutual',
            unlinkReciprocal: (typeof window._pendingUnlinkReciprocal === 'boolean')
                ? window._pendingUnlinkReciprocal
                : true,
        });
    }

    function closeLeaveMutualModal(event) {
        closeTerminationSheet(event);
    }

    function openKickTesterModal(appId, testerId, event, options) {
        if (event && typeof event === 'object' && !event.preventDefault && (event.forceUnlink != null || event.unlinkReciprocal != null)) {
            options = event;
            event = null;
        }
        options = options || {};
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        var project = Array.isArray(myProjects)
            ? myProjects.find(function (item) { return Number(item.id) === Number(appId); })
            : null;
        var tester = project && Array.isArray(project.testers)
            ? project.testers.find(function (item) { return Number(item.tester_id) === Number(testerId); })
            : null;
        return openTerminationSheet({
            mode: 'kick',
            appId: Number(appId || 0),
            projectId: Number(appId || 0),
            testerId: Number(testerId || 0),
            joinType: (tester && tester.join_type) || options.joinType || 'invite',
            testerUsername: (tester && tester.username) || options.testerUsername || '',
            testerFullName: (tester && tester.full_name) || options.testerFullName || '',
            forceUnlink: options.forceUnlink === true,
            unlinkReciprocal: options.unlinkReciprocal,
        });
    }

    function closeKickTesterModal(event) {
        closeTerminationSheet(event);
    }

    function requestLeaveMutualConfirm() {
        requestTerminationConfirm();
    }

    function cancelLeaveMutualConfirm(event) {
        cancelTerminationConfirm(event);
    }

    function confirmLeaveMutualAdaptive() {
        confirmTerminationAdaptive();
    }

    function selectLeaveReason(buttonEl) {
        selectTermReason(buttonEl);
    }

    function resetLeaveReasonChips(reason) {
        var target = String(reason || 'inactive_partner');
        var group = document.getElementById('term-reason-chips');
        if (!group) return;
        var chip = group.querySelector('.reason-chip[data-reason="' + target + '"]')
            || group.querySelector('.reason-chip');
        if (chip) selectTermReason(chip);
    }

    function toggleLeaveReasonOther() {
        var other = document.getElementById('term-reason-other');
        if (other) other.style.display = 'block';
    }

    function toggleKickReasonOther() {
        toggleLeaveReasonOther();
    }

    function toggleKickUnlinkHint() {
        toggleTermUnlinkHint();
    }

    function toggleLeaveMyStats() {
        var card = document.getElementById('leave-exchange-card');
        var side = document.getElementById('leave-my-side');
        var toggle = document.getElementById('leave-my-stats-toggle');
        if (!side || !toggle) return;
        var willOpen = !side.classList.contains('is-open');
        side.classList.toggle('is-open', willOpen);
        toggle.classList.toggle('is-open', willOpen);
        toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        if (card) card.classList.toggle('has-mine-open', willOpen);
        if (window.tg && window.tg.HapticFeedback) {
            window.tg.HapticFeedback.selectionChanged();
        }
    }

    window.openTerminationSheet = openTerminationSheet;
    window.closeTerminationSheet = closeTerminationSheet;
    window.requestTerminationConfirm = requestTerminationConfirm;
    window.cancelTerminationConfirm = cancelTerminationConfirm;
    window.confirmTerminationAdaptive = confirmTerminationAdaptive;
    window.selectTermReason = selectTermReason;
    window.toggleTermUnlinkHint = toggleTermUnlinkHint;
    window.getTermUnlinkReciprocal = getTermUnlinkReciprocal;
    window.getTermReasonCode = getTermReasonCode;
    window.getTermReasonNote = getTermReasonNote;

    window.openLeaveMutualModal = openLeaveMutualModal;
    window.closeLeaveMutualModal = closeLeaveMutualModal;
    window.openKickTesterModal = openKickTesterModal;
    window.closeKickTesterModal = closeKickTesterModal;
    window.requestLeaveMutualConfirm = requestLeaveMutualConfirm;
    window.cancelLeaveMutualConfirm = cancelLeaveMutualConfirm;
    window.confirmLeaveMutualAdaptive = confirmLeaveMutualAdaptive;
    window.selectLeaveReason = selectLeaveReason;
    window.resetLeaveReasonChips = resetLeaveReasonChips;
    window.toggleLeaveReasonOther = toggleLeaveReasonOther;
    window.toggleKickReasonOther = toggleKickReasonOther;
    window.toggleKickUnlinkHint = toggleKickUnlinkHint;
    window.toggleLeaveMyStats = toggleLeaveMyStats;
})();
