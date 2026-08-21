/**
 * Unified Termination Sheet — one break-link modal for leave (tester) and kick (owner).
 * Visual language: leave parity card + soft CTAs.
 * Controls: unlink checkboxes + reason chips + freeform note + confirm overlay.
 */
(function () {
    'use strict';

    var KARMA_ABANDONED_BURN = 3.0;
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
        if (mode === 'drop') {
            return [
                { code: 'took_by_mistake', labelKey: 'termDropReasonMistake' },
                { code: 'not_suitable', labelKey: 'termDropReasonNotSuitable' },
                { code: 'communication_issue', labelKey: 'termDropReasonNoContact' },
                { code: 'other', labelKey: 'leaveReasonOther' },
            ];
        }
        return [
            { code: 'inactive_partner', labelKey: 'leaveReasonInactive' },
            { code: 'communication_issue', labelKey: 'leaveReasonCommunication' },
            { code: 'other', labelKey: 'leaveReasonOther' },
        ];
    }

    function _renderReasonChips(mode, selectedCode) {
        var group = document.getElementById('term-reason-chips');
        if (!group) return;
        var defs = _reasonDefsForMode(mode);
        var selected = selectedCode || defs[0].code;
        group.className = 'term-reason-radio-list';
        group.setAttribute('role', 'radiogroup');
        group.innerHTML = defs.map(function (def) {
            var isSelected = def.code === selected;
            return '' +
                '<label class="term-reason-radio' + (isSelected ? ' is-selected' : '') + '">' +
                    '<input type="radio" name="term-reason-radio" value="' + _esc(def.code) + '"' +
                    (isSelected ? ' checked' : '') +
                    ' onchange="selectTermReason(this)">' +
                    '<span class="term-reason-radio-mark" aria-hidden="true"></span>' +
                    '<span class="term-reason-radio-label">' + _esc(_t(def.labelKey)) + '</span>' +
                '</label>';
        }).join('');
        _syncLegacyReasonFields(selected, getTermReasonNote());
    }

    function selectTermReason(inputOrButtonEl) {
        if (!inputOrButtonEl) return;
        var reason = '';
        if (inputOrButtonEl.tagName === 'INPUT') {
            reason = String(inputOrButtonEl.value || '').trim() || 'other';
        } else {
            reason = String(inputOrButtonEl.getAttribute('data-reason') || '').trim() || 'other';
        }
        var group = document.getElementById('term-reason-chips');
        if (group) {
            Array.prototype.forEach.call(group.querySelectorAll('.term-reason-radio'), function (row) {
                var input = row.querySelector('input[type="radio"]');
                var checked = !!(input && input.value === reason);
                if (input) input.checked = checked;
                row.classList.toggle('is-selected', checked);
            });
            // Legacy chip support (if any leftover markup).
            Array.prototype.forEach.call(group.querySelectorAll('.reason-chip'), function (chip) {
                chip.classList.toggle('is-selected', chip.getAttribute('data-reason') === reason);
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
        // Leave: only the leaver's side ends — no unlink choice (owner keeps counter-test).
        if (mode === 'leave' || mode === 'drop') {
            box.hidden = true;
            if (reciprocal) {
                reciprocal.checked = false;
                reciprocal.disabled = false;
            }
            return;
        }

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
        // Justified: partner left OR ≥3 consecutive skips (total skips are informational only).
        var justifiedAllowed = !!data.partner_left || partnerConsecutive >= 3;
        var myCheckins = Number(data.my_checkins != null ? data.my_checkins : 0);
        var karmaBurn = KARMA_ABANDONED_BURN;
        var mySkips = Number(data.my_skips || 0);
        var waitCount = Math.max(0, 3 - partnerConsecutive);
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

        var grantRow = grantStillAvailable
            ? '<div class="leave-grant-row">' +
                '<span class="leave-grant-icon" aria-hidden="true">🏆</span>' +
                '<div class="leave-grant-copy">' +
                    '<div class="leave-grant-title">' + _esc(_t('leaveGrantTeaseTitle')) + '</div>' +
                    '<div class="leave-grant-desc">' + _esc(_t('leaveGrantTeaseDesc', { skips: mySkips, max: 3 })) + '</div>' +
                '</div></div>'
            : '';

        var myTestingDays = Number(data.my_testing_days || 0);
        var partnerCheckins = Number(data.partner_checkins || 0);
        var isSafeExit = !justifiedAllowed && _isUniversalSafeExit({
            testingDays: myTestingDays,
            checkins: myCheckins,
            partnerCheckins: partnerCheckins,
            requirePartnerGate: true,
        });
        var noPenalty = justifiedAllowed || isSafeExit;
        var riOk = noPenalty;
        var currentRi = null;
        try {
            var vs = (typeof visibilityStats !== 'undefined') ? visibilityStats : (window.visibilityStats || null);
            if (vs && vs.reliability_index != null && vs.reliability_index !== '') {
                var riNum = Number(vs.reliability_index);
                if (Number.isFinite(riNum)) currentRi = Math.round(riNum * 10) / 10;
            }
        } catch (e) { /* ignore */ }

        if (_termState) {
            _termState.isSafeExit = isSafeExit;
            _termState.noPenaltyExit = noPenalty;
            if (noPenalty) {
                _termState.karmaBurnPreview = 0;
                window._leaveKarmaBurnPreview = 0;
            }
        }

        var mutualStatusBanner = justifiedAllowed
            ? '<div class="leave-status-banner is-justified term-status-compact term-impact-status-banner">' +
                '<div class="leave-status-title">' + _esc(_t('leaveJustifiedBadge')) + '</div>' +
                '<div class="leave-status-desc">' + _esc(_t('leaveJustifiedDesc')) + '</div>' +
              '</div>'
            : (isSafeExit
                ? _renderExitBanner(true)
                : '<div class="leave-status-banner is-penalty term-status-compact term-impact-status-banner">' +
                    '<div class="leave-status-title">' + _esc(_t('leaveAbandonedTitle')) + '</div>' +
                    '<div class="leave-status-desc">' + _esc(
                        _t('leaveAbandonedDesc', { karma: _fmtAmount(karmaBurn, 1) })
                    ) + '</div>' +
                    '<div class="leave-status-desc" style="margin-top:8px;">' + _esc(_t('leaveSafeWaitWarning', {
                        count: waitCount,
                        word: typeof pluralizeSkipWord === 'function' ? pluralizeSkipWord(waitCount) : '',
                    })) + '</div>' +
                  '</div>');

        var impactHint = justifiedAllowed
            ? _t('termLeaveImpactHintJustified')
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
                        _metricRow('🔁', _t('leaveMetricConsecutiveSkips'), String(partnerConsecutive) + '/3', partnerConsecutive >= 3) +
                        _metricRow('⚠️', _t('leaveMetricTotalSkips'), String(partnerSkips), false) +
                        _metricRow('✅', _t('leaveMetricCheckins'), partnerCheckins, partnerCheckins > 0) +
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
            _renderImpactMeters({
                karmaOk: noPenalty || karmaBurn <= 0,
                riOk: riOk,
                karmaBurn: noPenalty ? 0 : karmaBurn,
                riCurrent: currentRi,
                hint: impactHint,
                statusBanner: mutualStatusBanner,
                ownerCycle: true,
            });
    }

    function _renderKickBody(ctx) {
        var testingDays = ctx.testingDays;
        var checkinCount = ctx.checkinCount;
        var skipsCount = ctx.skipsCount;
        var consecutiveSkips = ctx.consecutiveSkips;
        var joinType = ctx.joinType;
        // Justified kick: ≥3 consecutive skips anytime, or early 0 check-ins (~24h)
        // on THIS project only — owner's reciprocal check-ins do not block it.
        var isDisciplinaryKick = _isJustifiedKick({
            testingDays: testingDays,
            checkins: checkinCount,
            consecutiveSkips: consecutiveSkips,
            requirePartnerGate: false,
        });
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
                        _metricRow('🔁', _t('leaveMetricConsecutiveSkips'), String(consecutiveSkips) + '/3', consecutiveSkips >= 3) +
                        _metricRow('⚠️', _t('leaveMetricTotalSkips'), String(skipsCount), false) +
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

    function _isUniversalSafeExit(opts) {
        opts = opts || {};
        var checkins = Number(opts.checkins || 0);
        if (checkins > 0) return false;
        if (opts.requirePartnerGate && Number(opts.partnerCheckins || 0) > 0) return false;
        var testingDays = Number(opts.testingDays || 0);
        // Date-only start_date → calendar day 1 ≈ first ~24h (backend parity).
        return testingDays <= 1;
    }

    function _isJustifiedKick(opts) {
        opts = opts || {};
        if (Number(opts.consecutiveSkips || 0) >= 3) return true;
        // Kick early window is always tester-side only (no partner gate).
        return _isUniversalSafeExit({
            testingDays: opts.testingDays,
            checkins: opts.checkins,
            requirePartnerGate: false,
        });
    }

    function _estimateGrantTotal(test) {
        if (typeof window.getGrantEstimateData === 'function') {
            var grant = window.getGrantEstimateData(test || {});
            if (grant && grant.eligible === false) return 0;
            return Math.max(0, Number(grant && grant.total || 0));
        }
        return 0;
    }

    function _setPreserveSlot(html) {
        var slot = document.getElementById('term-preserve-slot');
        if (!slot) return;
        if (html) {
            slot.innerHTML = html;
            slot.hidden = false;
        } else {
            slot.innerHTML = '';
            slot.hidden = true;
        }
    }

    function _hideDropUnlinkBox() {
        var box = document.getElementById('term-unlink-box');
        if (box) {
            box.hidden = true;
            box.style.display = 'none';
        }
        var reciprocal = document.getElementById('term-unlink-reciprocal');
        if (reciprocal) {
            reciprocal.checked = false;
            reciprocal.disabled = false;
        }
        toggleTermUnlinkHint();
    }

    function _renderPreserveInviteBlock(test, ownerId) {
        var appId = Number(test && test.id || test && test.app_id || 0);
        // Propose stays active; add-project lives inside the project-select modal.
        return '' +
            '<div class="term-preserve-block">' +
                '<div class="term-preserve-title">' + _esc(_t('termDropPreserveTitle')) + '</div>' +
                '<div class="term-preserve-desc">' + _esc(_t('termDropPreserveDesc')) + '</div>' +
                '<div class="term-preserve-actions">' +
                    '<button type="button" class="btn btn-primary term-preserve-btn" ' +
                    'onclick="proposeMutualFromTermination(' + appId + ', ' + Number(ownerId || 0) + ')">' +
                    _esc(_t('termDropPreserveProposeBtn')) +
                    '</button>' +
                    '<div class="term-preserve-note">' + _esc(_t('termDropPreserveProposeHint')) + '</div>' +
                '</div>' +
            '</div>';
    }

    function _renderBountyLossBlock(contractLost, grantLost, earned, grantStillAvailable, skips) {
        var totalLost = Math.max(0, Number(contractLost || 0) + Number(grantLost || 0));
        var keptHtml = Number(earned || 0) > 0
            ? '<div class="term-bust-kept">' + _esc(_t('termDropBountyLossKept', {
                earned: _fmtAmount(earned, 1),
            })) + '</div>'
            : '';
        var grantChipClass = grantStillAvailable ? '' : ' is-muted';
        return '' +
            '<div class="term-bust-hero">' +
                '<div class="term-bust-hero-kicker">' + _esc(_t('termDropBountyHeroKicker')) + '</div>' +
                '<div class="term-bust-hero-amount notranslate">~' + _esc(_fmtAmount(totalLost, 0)) + '</div>' +
                '<div class="term-bust-hero-unit">$BUST</div>' +
                '<div class="term-bust-hero-footnote">' + _esc(_t('termDropBountyHeroFootnote')) + '</div>' +
                '<div class="term-bust-split" aria-hidden="true">' +
                    '<div class="term-bust-chip">' +
                        '<span class="term-bust-chip-n notranslate">~' + _esc(_fmtAmount(contractLost, 0)) + '</span>' +
                        '<span class="term-bust-chip-l">' + _esc(_t('termDropBountyChipContract')) + '</span>' +
                    '</div>' +
                    '<span class="term-bust-plus">+</span>' +
                    '<div class="term-bust-chip' + grantChipClass + '">' +
                        '<span class="term-bust-chip-n notranslate">~' + _esc(_fmtAmount(grantLost, 0)) + '</span>' +
                        '<span class="term-bust-chip-l">' + _esc(_t('termDropBountyChipGrant')) + '</span>' +
                    '</div>' +
                '</div>' +
                keptHtml +
                (grantStillAvailable
                    ? '<div class="term-bust-grant-note">' + _esc(_t('termDropBountyGrantVisualNote', {
                        skips: skips,
                        max: 3,
                    })) + '</div>'
                    : '') +
            '</div>';
    }

    function _renderInviteGrantRow(skips, grantTotal) {
        return '' +
            '<div class="leave-grant-row term-grant-visual">' +
                '<div class="leave-grant-copy">' +
                    '<div class="term-grant-visual-top">' +
                        '<div class="leave-grant-title">' + _esc(_t('leaveGrantTeaseTitle')) + '</div>' +
                        '<div class="term-grant-amount notranslate">~' + _esc(_fmtAmount(grantTotal, 0)) +
                        ' <span>$BUST</span></div>' +
                    '</div>' +
                    '<div class="leave-grant-desc">' + _esc(_t('termDropGrantTeaseDesc', {
                        skips: skips,
                        max: 3,
                        amount: _fmtAmount(grantTotal, 0),
                    })) + '</div>' +
                '</div>' +
            '</div>';
    }

    function _renderOwnerCyclePlea() {
        return '' +
            '<div class="term-owner-cycle">' +
                '<div class="term-owner-cycle-title">' + _esc(_t('termOwnerCycleTitle')) + '</div>' +
                '<div class="term-owner-cycle-desc">' + _esc(_t('termOwnerCycleDesc')) + '</div>' +
            '</div>';
    }

    function _currentReliabilityIndex() {
        try {
            var vs = (typeof visibilityStats !== 'undefined') ? visibilityStats : (window.visibilityStats || null);
            if (vs && vs.reliability_index != null && vs.reliability_index !== '') {
                var riNum = Number(vs.reliability_index);
                if (Number.isFinite(riNum)) return Math.round(riNum * 10) / 10;
            }
        } catch (e) { /* ignore */ }
        return null;
    }

    function _renderImpactMeters(opts) {
        opts = opts || {};
        var karmaOk = opts.karmaOk !== false;
        var riOk = !!opts.riOk;
        var hint = opts.hint || '';
        var statusBanner = opts.statusBanner || '';
        var ownerCycle = opts.ownerCycle === true ? _renderOwnerCyclePlea() : '';
        var karmaBurn = Math.max(0, Number(opts.karmaBurn || 0));
        var riCurrent = (opts.riCurrent != null && Number.isFinite(Number(opts.riCurrent)))
            ? Number(opts.riCurrent)
            : _currentReliabilityIndex();
        var riAfter = (opts.riAfter != null && Number.isFinite(Number(opts.riAfter)))
            ? Number(opts.riAfter)
            : null;

        var karmaStatus = karmaOk
            ? _t('termDropImpactOk')
            : (karmaBurn > 0
                ? _t('termDropImpactKarmaBurn', { amount: _fmtAmount(karmaBurn, 1) })
                : _t('termDropImpactOk'));
        var riStatus;
        if (riOk) {
            riStatus = (riCurrent != null)
                ? _t('termDropImpactRiKeep', { value: _fmtAmount(riCurrent, 1) })
                : _t('termDropImpactOk');
        } else if (riCurrent != null && riAfter != null) {
            riStatus = _fmtAmount(riCurrent, 1) + ' → ' + _fmtAmount(riAfter, 1);
        } else if (riCurrent != null) {
            // Overall index will drop after a bad abandon period; show current with down marker.
            riStatus = _fmtAmount(riCurrent, 1) + ' ↓';
        } else {
            riStatus = _t('termDropImpactRiRisk');
        }

        return '' +
            '<div class="term-impact-block">' +
                '<div class="term-impact-title">' + _esc(_t('termDropEffectsTitle')) + '</div>' +
                '<div class="term-impact-grid">' +
                    '<div class="term-impact-pill ' + (karmaOk ? 'is-ok' : 'is-risk') + '">' +
                        '<div class="term-impact-head">' +
                            '<span class="term-impact-ico" aria-hidden="true">☯️</span>' +
                            '<span class="term-impact-label">' + _esc(_t('termDropImpactKarma')) + '</span>' +
                        '</div>' +
                        '<span class="term-impact-status">' + _esc(karmaStatus) + '</span>' +
                    '</div>' +
                    '<div class="term-impact-pill ' + (riOk ? 'is-ok' : 'is-risk') + '">' +
                        '<div class="term-impact-head">' +
                            '<span class="term-impact-ico" aria-hidden="true">🛡</span>' +
                            '<span class="term-impact-label">' + _esc(_t('termDropImpactRi')) + '</span>' +
                        '</div>' +
                        '<span class="term-impact-status">' + _esc(riStatus) + '</span>' +
                    '</div>' +
                '</div>' +
                ownerCycle +
                statusBanner +
                (hint ? '<div class="term-impact-hint">' + _esc(hint) + '</div>' : '') +
            '</div>';
    }

    function _renderExitBanner(isSafeExit, opts) {
        opts = opts || {};
        if (isSafeExit) {
            return '<div class="leave-status-banner is-justified term-status-compact term-impact-status-banner">' +
                '<div class="leave-status-title">' + _esc(_t('termSafeExitBadge')) + '</div>' +
                '<div class="leave-status-desc">' + _esc(_t('termSafeExitDesc')) + '</div>' +
              '</div>';
        }
        var costlyDesc = _t('termCostlyExitDesc');
        return '<div class="leave-status-banner is-penalty term-status-compact term-impact-status-banner">' +
            '<div class="leave-status-title">' + _esc(_t('termCostlyExitBadge')) + '</div>' +
            '<div class="leave-status-desc">' + _esc(costlyDesc) + '</div>' +
          '</div>';
    }

    function _renderDropBody(test) {
        var joinType = _normalizeJoinType(test && test.join_type);
        var testingDays = test && test.start_date && typeof getUserTestingDay === 'function'
            ? getUserTestingDay(test.start_date)
            : Number(test && test.testing_days || 0);
        var checkins = Number(test && test.checkins_count || 0);
        var skips = Number(test && test.skips_count || 0);
        if (!Number.isFinite(skips) || skips < 0) skips = 0;
        var projectName = (test && test.name) || _t('unknownLabel');
        var ownerId = Number(test && test.owner_id || 0);
        var ownerLabel = test && test.owner_username
            ? '@' + String(test.owner_username).replace(/^@+/, '')
            : (test && test.owner_full_name) || _t('idLabel', { id: ownerId });
        var bountyPerTester = Number(test && test.bounty_per_tester || 0);
        var isBounty = joinType === 'bounty' && bountyPerTester > 0;
        var isInviteLike = !isBounty && joinType !== 'mutual';
        var dailyPool = isBounty ? bountyPerTester * 0.65 : 0;
        var rewardPerCheckin = dailyPool > 0 ? dailyPool / 14 : 0;
        var earnedEstimate = Math.round(checkins * rewardPerCheckin * 10) / 10;
        var contractLost = isBounty
            ? Math.max(0, Math.round((bountyPerTester - earnedEstimate) * 10) / 10)
            : 0;
        // Match backend claim_grant: eligible while skips <= 3.
        var grantStillAvailable = skips <= 3;
        var grantTotal = grantStillAvailable ? _estimateGrantTotal(test) : 0;
        var grantLost = grantStillAvailable ? grantTotal : 0;
        var totalAtRisk = contractLost + grantLost;
        var isSafeExit = _isUniversalSafeExit({
            testingDays: testingDays,
            checkins: checkins,
            requirePartnerGate: false,
        });
        var karmaBurn = isSafeExit ? 0 : KARMA_ABANDONED_BURN;
        var riOk = isSafeExit;
        var karmaOk = isSafeExit;

        if (_termState) {
            _termState.justifiedAllowed = isSafeExit;
            _termState.isBountyDrop = isBounty;
            _termState.isInviteDrop = isInviteLike;
            _termState.isSafeExit = isSafeExit;
            _termState.riOk = riOk;
            _termState.karmaBurnPreview = karmaBurn;
            _termState.remainingBounty = totalAtRisk;
            _termState.contractLost = contractLost;
            _termState.grantLost = grantLost;
            _termState.hasReciprocal = false;
            _termState.projectName = projectName;
            _termState.ownerId = ownerId;
            _termState.grantAvailable = grantStillAvailable;
            _termState.contractTotal = bountyPerTester;
            _termState.earnedBounty = earnedEstimate;
            _termState.grantTotal = grantTotal;
            _termState.preserveHtml = isInviteLike ? _renderPreserveInviteBlock(test, ownerId) : '';
        }

        // Bounty keeps the money hero above; exit banner lives inside profile impact.
        var moneyBlock = isBounty
            ? _renderBountyLossBlock(
                contractLost,
                grantLost,
                earnedEstimate,
                grantStillAvailable,
                skips
            )
            : '';
        var exitStatusBanner = _renderExitBanner(isSafeExit, { karmaBurn: karmaBurn });

        var grantRow = (!isBounty && grantStillAvailable)
            ? _renderInviteGrantRow(skips, grantTotal)
            : '';

        return '' +
            '<div class="leave-exchange-card">' +
                '<div class="leave-side leave-side--partner">' +
                    '<div class="leave-side-head">' +
                        '<div class="leave-side-kicker">' + _esc(_t('termDropProjectSide')) + '</div>' +
                        '<div class="leave-side-name notranslate">' + _esc(projectName) + '</div>' +
                        '<div class="leave-side-meta" style="border-top:none;padding-top:4px;margin-top:2px;">' +
                            '<span class="leave-meta-item">' + _esc(ownerLabel) + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="leave-metric-list">' +
                        _metricRow('📅', _t('leaveMetricDays'), testingDays, false) +
                        _metricRow('✅', _t('leaveMetricCheckins'), checkins, false) +
                        _metricRow('⚠️', _t('leaveMetricSkips'), String(skips) + '/3', skips >= 3) +
                    '</div>' +
                    grantRow +
                '</div>' +
            '</div>' +
            moneyBlock +
            _renderImpactMeters({
                karmaOk: karmaOk,
                riOk: riOk,
                karmaBurn: karmaBurn,
                hint: '',
                statusBanner: exitStatusBanner,
                ownerCycle: true,
            });
    }

    function _updatePrimaryCta() {
        var btn = document.getElementById('term-confirm-btn');
        if (!btn || !_termState) return;
        btn.classList.remove('leave-cta--safe', 'leave-cta--warn');
        if (_termState.mode === 'leave') {
            var softLeave = !!_termState.justifiedAllowed || !!_termState.isSafeExit || !!_termState.noPenaltyExit;
            btn.classList.add(softLeave ? 'leave-cta--safe' : 'leave-cta--warn');
            btn.textContent = _t(softLeave ? 'leaveJustifiedBtn' : 'leaveAbandonedBtn');
            return;
        }
        if (_termState.mode === 'drop') {
            if (_termState.isSafeExit) {
                btn.classList.add('leave-cta--safe');
            } else {
                btn.classList.add('leave-cta--warn');
            }
            btn.textContent = _t('termDropBtn');
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

        var rawMode = String(options.mode || 'leave').toLowerCase();
        var mode = (rawMode === 'kick' || rawMode === 'drop') ? rawMode : 'leave';
        var joinType = _normalizeJoinType(options.joinType || (mode === 'leave' ? 'mutual' : 'invite'));

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
            isBountyDrop: false,
            isInviteDrop: false,
            isSafeExit: false,
            remainingBounty: 0,
            hasReciprocal: false,
            projectName: '',
            ownerId: 0,
            contractTotal: 0,
            earnedBounty: 0,
            grantTotal: 0,
            grantLost: 0,
            contractLost: 0,
            riOk: true,
            preserveHtml: '',
        };

        _setPreserveSlot('');
        window._terminationState = _termState;

        // Write into the same lexical vars that confirmDropTest / confirmLeaveMutual read.
        if (mode === 'leave') {
            if (typeof window.setLeaveMutualAppId === 'function') {
                window.setLeaveMutualAppId(_termState.appId);
            } else {
                window._leaveMutualAppId = _termState.appId;
            }
            window._leaveMutualStats = null;
            if (window.App && window.App.state) window.App.state._leaveMutualStats = null;
        } else if (mode === 'drop') {
            if (typeof window.setDropTestAppId === 'function') {
                window.setDropTestAppId(_termState.appId);
            } else {
                window._dropTestAppId = _termState.appId;
            }
        } else {
            if (typeof window.setKickTarget === 'function') {
                window.setKickTarget(_termState.projectId, _termState.testerId);
            } else {
                window._kickTarget = { appId: _termState.projectId, testerId: _termState.testerId };
            }
        }

        if (titleEl) {
            titleEl.textContent = mode === 'kick'
                ? _t('termSheetTitleKick')
                : _t('termSheetTitleLeave');
        }
        if (subtitleEl) {
            subtitleEl.textContent = mode === 'kick'
                ? _t('termSheetSubtitleKick')
                : (mode === 'drop'
                    ? _t('termSheetSubtitleDrop')
                    : _t('termSheetSubtitleLeave'));
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
        // Drop (invite/bounty): never show reciprocal unlink — only mutual leave/kick use it.
        var unlinkOptions = Object.assign({}, options);
        if (mode === 'drop') {
            _hideDropUnlinkBox();
        } else {
            var leaveUnlinkBox = document.getElementById('term-unlink-box');
            if (leaveUnlinkBox) leaveUnlinkBox.style.display = '';
            _setupUnlinkBox(mode, joinType, unlinkOptions);
        }

        var defaultReason = 'inactive_partner';
        if (mode === 'kick') {
            defaultReason = 'no_response';
        } else if (mode === 'drop') {
            var dropSnap = options.testSnapshot || (typeof getMyTestById === 'function'
                ? getMyTestById(_termState.appId)
                : null);
            var dropDays = dropSnap && dropSnap.start_date && typeof getUserTestingDay === 'function'
                ? getUserTestingDay(dropSnap.start_date)
                : Number(dropSnap && dropSnap.testing_days || 0);
            var dropCheckins = Number(dropSnap && dropSnap.checkins_count || 0);
            defaultReason = _isUniversalSafeExit({
                testingDays: dropDays,
                checkins: dropCheckins,
                requirePartnerGate: false,
            })
                ? 'took_by_mistake'
                : 'not_suitable';
        }
        _renderReasonChips(mode, defaultReason);

        body.innerHTML = '<p style="text-align:center; color: var(--hint-color);">' +
            _esc(_t('leaveLoadingStats')) + '</p>';
        _updatePrimaryCta();
        cancelTerminationConfirm();
        modal.classList.add('active');

        if (mode === 'leave') {
            await _loadLeaveStats(_termState.appId, body);
        } else if (mode === 'drop') {
            _fillDropFromLocal(options, body);
        } else {
            _fillKickFromLocal(options, body);
        }
        _updatePrimaryCta();
    }

    function _fillDropFromLocal(options, body) {
        var appId = Number(options.appId || 0);
        var test = options.testSnapshot || (typeof getMyTestById === 'function'
            ? getMyTestById(appId)
            : (Array.isArray(myTests) ? myTests.find(function (item) { return Number(item.id) === appId; }) : null));
        if (!test) {
            body.innerHTML = '<div class="details-block"><div style="color: var(--hint-color);">' +
                _esc(_t('loadError')) + '</div></div>';
            _setPreserveSlot('');
            return;
        }
        if (_termState) {
            _termState.joinType = _normalizeJoinType(test.join_type || options.joinType || 'invite');
            _termState.ownerId = Number(test.owner_id || 0);
        }
        _setTypeBadge(_termState.joinType);
        _hideDropUnlinkBox();
        body.innerHTML = _renderDropBody(test);
        _setPreserveSlot((_termState && _termState.preserveHtml) || '');
    }

    function _leaveStatsErrorText(payload, fallbackKey) {
        var code = '';
        if (payload && typeof payload === 'object') {
            code = String(payload.code || payload.error_code || payload.detail || payload.message || '').trim();
        } else if (typeof payload === 'string') {
            code = payload.trim();
        }
        if (code === 'invalid_init_data') {
            return _t('contributionClaimError_invalid_init_data') || _t('guestClaimAuthErrorToast');
        }
        if (typeof getApiErrorMessage === 'function') {
            return getApiErrorMessage(payload, fallbackKey);
        }
        return fallbackKey || 'stats_not_available';
    }

    async function _loadLeaveStats(appId, body) {
        try {
            var apiBase = (typeof API_BASE !== 'undefined') ? API_BASE : '';
            var actorId = (typeof userId !== 'undefined') ? userId : 0;
            var initDataRaw = (typeof getTelegramInitDataRaw === 'function')
                ? getTelegramInitDataRaw()
                : ((typeof tg !== 'undefined' && tg && tg.initData) || '');
            var response = await fetch(
                apiBase + '/tests/' + appId + '/partner_stats/' + actorId
                + '?init_data=' + encodeURIComponent(initDataRaw || '')
            );
            var data = await response.json();
            if (!_termState || Number(_termState.appId) !== Number(appId)) return;
            if (!response.ok || data.status !== 'success') {
                body.innerHTML = '<div class="details-block"><div style="color: var(--hint-color);">' +
                    _esc(_leaveStatsErrorText(data, 'stats_not_available')) +
                    '</div></div>';
                return;
            }
            window._leaveMutualStats = data;
            body.innerHTML = _renderLeaveBody(data);
        } catch (error) {
            console.error('Termination leave stats error:', error);
            body.innerHTML = '<div class="details-block"><div style="color: var(--hint-color);">' +
                _esc(_leaveStatsErrorText(error && error.message, 'networkError')) +
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
        var consecutiveSkips = (typeof calculateConsecutiveSkips === 'function')
            ? calculateConsecutiveSkips(tester)
            : Math.max(0, Number(tester.consecutive_skips || 0));
        var joinType = _normalizeJoinType(tester.join_type || options.joinType || 'invite');
        var bountyPerTester = Number(project.bounty_per_tester || 0);
        var holdBonus = bountyPerTester > 0 ? bountyPerTester * 0.35 : 0;
        var dailyPool = bountyPerTester > 0 ? bountyPerTester * 0.65 : 0;
        var rewardPerCheckin = dailyPool > 0 ? dailyPool / 14 : 0;
        var dailyBurn = Math.max(0, dailyPool - (checkinCount * rewardPerCheckin));
        var reciprocalOwnerCheckins = Number(
            tester.reciprocal_owner_checkins != null ? tester.reciprocal_owner_checkins : 0
        );

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
            reciprocalOwnerCheckins: reciprocalOwnerCheckins,
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
        _setPreserveSlot('');
        _termState = null;
        window._terminationState = null;
        if (typeof window.setLeaveMutualAppId === 'function') {
            window.setLeaveMutualAppId(0);
        } else {
            window._leaveMutualAppId = null;
        }
        window._leaveMutualStats = null;
        if (window.App && window.App.state) window.App.state._leaveMutualStats = null;
        window._leaveJustifiedAllowed = false;
        window._leaveKarmaBurnPreview = 0;
        window._leaveGrantAvailable = false;
        if (typeof window.setKickTarget === 'function') {
            window.setKickTarget(0, 0);
        } else {
            window._kickTarget = null;
        }
        if (typeof window.setDropTestAppId === 'function') {
            window.setDropTestAppId(0);
        } else {
            window._dropTestAppId = null;
        }
        var reciprocal = document.getElementById('term-unlink-reciprocal');
        if (reciprocal) {
            reciprocal.disabled = false;
            reciprocal.checked = true;
        }
        toggleTermUnlinkHint();
    }

    function requestTerminationConfirm() {
        try {
            if (!_termState) {
                console.warn('requestTerminationConfirm: no _termState');
                if (typeof showToast === 'function') showToast(_t('loadError'));
                return;
            }
            _syncLegacyReasonFields(getTermReasonCode(), getTermReasonNote());

            var overlay = document.getElementById('leave-confirm-overlay');
            var body = document.getElementById('leave-confirm-body');
            var finalBtn = document.getElementById('leave-confirm-final-btn');
            var title = document.getElementById('leave-confirm-title');
            if (!overlay || !body) {
                console.warn('requestTerminationConfirm: overlay missing');
                if (typeof showToast === 'function') showToast(_t('loadError'));
                return;
            }

            // Keep informative confirm sheet above the termination sheet.
            if (overlay.parentNode !== document.body) {
                document.body.appendChild(overlay);
            }
            overlay.style.zIndex = '12000';

            var mode = _termState.mode;
            var points = [];
            var justified = !!_termState.justifiedAllowed;
            var leaveNoPenalty = justified || !!_termState.isSafeExit || !!_termState.noPenaltyExit;
            var unlink = getTermUnlinkReciprocal();

            if (mode === 'leave') {
                if (title) title.textContent = _t('leaveConfirmTitle');
                if (unlink && _isMutualJoin(_termState.joinType)) {
                    points.push('<li>' + _esc(_t('leaveConfirmPointMirror')) + '</li>');
                } else if (_isMutualJoin(_termState.joinType)) {
                    points.push('<li>' + _esc(_t('termConfirmPointKeepMirrorLeave')) + '</li>');
                }
                if (leaveNoPenalty) {
                    points.push('<li>' + _esc(_t('leaveConfirmPointNoPenalty')) + '</li>');
                } else if (Number(_termState.karmaBurnPreview || 0) > 0) {
                    points.push('<li>' + _esc(_t('leaveConfirmPointKarma', {
                        karma: _fmtAmount(_termState.karmaBurnPreview || 0, 1),
                    })) + '</li>');
                } else {
                    points.push('<li class="is-warn">' + _esc(_t('termDropEffectRiCostly')) + '</li>');
                }
                if (_termState.grantAvailable && !leaveNoPenalty) {
                    points.push('<li class="is-warn">' + _esc(_t('leaveConfirmPointGrant')) + '</li>');
                }
                body.innerHTML = '' +
                    '<p class="leave-confirm-lead">' + _esc(leaveNoPenalty
                        ? _t('leaveConfirmDescJustified')
                        : _t('leaveConfirmDescAbandoned', { karma: _fmtAmount(_termState.karmaBurnPreview || 0, 1) })) +
                    '</p><ul class="leave-confirm-points">' + points.join('') + '</ul>';
                if (finalBtn) {
                    finalBtn.classList.toggle('leave-cta--safe', leaveNoPenalty);
                    finalBtn.classList.toggle('leave-cta--warn', !leaveNoPenalty);
                    finalBtn.textContent = _t(leaveNoPenalty ? 'leaveConfirmFinalJustified' : 'leaveConfirmFinalAbandoned');
                }
        } else if (mode === 'drop') {
            if (title) title.textContent = _t('termConfirmTitleDrop');
            points.push('<li>' + _esc(_t('termConfirmPointDropPrimary')) + '</li>');
            if (_termState.isBountyDrop) {
                var bustMain = _esc(_t('termDropBountyLossTitle', {
                    total: _fmtAmount(_termState.remainingBounty || 0, 0),
                }));
                var bustSub = '';
                if (Number(_termState.contractLost || 0) > 0 || Number(_termState.grantLost || 0) > 0) {
                    bustSub = '<div class="leave-confirm-sub">' + _esc(_t('termDropConfirmBustSplit', {
                        contract: _fmtAmount(_termState.contractLost || 0, 0),
                        grant: _fmtAmount(_termState.grantLost || 0, 0),
                    })) + '</div>';
                }
                points.push('<li class="is-warn"><div class="leave-confirm-main">' + bustMain + '</div>' + bustSub + '</li>');
            }
            var dropKarmaBurn = Number(_termState.karmaBurnPreview || 0);
            points.push('<li' + ((_termState.isSafeExit || dropKarmaBurn <= 0) ? '' : ' class="is-warn"') + '>' +
                _esc((_termState.isSafeExit || dropKarmaBurn <= 0)
                    ? _t('termDropEffectNoKarma')
                    : _t('leaveConfirmPointKarma', {
                        karma: _fmtAmount(dropKarmaBurn, 1),
                    })) +
                '</li>');
            points.push('<li' + (_termState.isSafeExit ? '' : ' class="is-warn"') + '>' +
                _esc(_t(_termState.isSafeExit ? 'termDropEffectRiSafe' : 'termDropEffectRiCostly')) +
                '</li>');
            body.innerHTML = '' +
                '<p class="leave-confirm-lead">' + _esc(_t(
                    _termState.isSafeExit
                        ? 'termConfirmDescDropSafe'
                        : (_termState.isBountyDrop
                            ? 'termConfirmDescDropBounty'
                            : 'termConfirmDescDrop')
                )) + '</p>' +
                '<ul class="leave-confirm-points">' + points.join('') + '</ul>';
            if (finalBtn) {
                var dropSafeCta = !!_termState.isSafeExit;
                finalBtn.classList.toggle('leave-cta--safe', dropSafeCta);
                finalBtn.classList.toggle('leave-cta--warn', !dropSafeCta);
                finalBtn.textContent = _t('termDropConfirmFinal');
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
        } catch (error) {
            console.error('requestTerminationConfirm failed', error);
            if (typeof showToast === 'function') {
                showToast(_t('loadError'));
            }
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
        if (!_termState) {
            console.warn('confirmTerminationAdaptive: no _termState');
            return;
        }

        _syncLegacyReasonFields(getTermReasonCode(), getTermReasonNote());
        var unlink = getTermUnlinkReciprocal();
        window._pendingUnlinkReciprocal = unlink;
        var appId = Number(_termState.appId || _termState.projectId || 0);
        var testerId = Number(_termState.testerId || 0);

        if (_termState.mode === 'leave') {
            var justified = !!_termState.justifiedAllowed || !!_termState.isSafeExit || !!_termState.noPenaltyExit;
            if (typeof window.setLeaveMutualAppId === 'function') {
                window.setLeaveMutualAppId(appId);
            } else {
                window._leaveMutualAppId = appId;
            }
            var leaveFn = window.confirmLeaveMutual || (typeof confirmLeaveMutual === 'function' ? confirmLeaveMutual : null);
            if (typeof leaveFn === 'function') {
                leaveFn(justified, appId);
            } else {
                console.error('confirmLeaveMutual is not available');
                if (typeof showToast === 'function') showToast(_t('loadError'));
            }
            return;
        }
        if (_termState.mode === 'drop') {
            if (typeof window.setDropTestAppId === 'function') {
                window.setDropTestAppId(appId);
            } else {
                window._dropTestAppId = appId;
            }
            var dropFn = window.confirmDropTest || (typeof confirmDropTest === 'function' ? confirmDropTest : null);
            if (typeof dropFn === 'function') {
                dropFn(appId);
            } else {
                console.error('confirmDropTest is not available');
                if (typeof showToast === 'function') showToast(_t('loadError'));
            }
            return;
        }
        if (typeof window.setKickTarget === 'function') {
            window.setKickTarget(appId, testerId);
        } else {
            window._kickTarget = { appId: appId, testerId: testerId };
        }
        var kickFn = window.confirmKickTester || (typeof confirmKickTester === 'function' ? confirmKickTester : null);
        if (typeof kickFn === 'function') {
            kickFn(appId, testerId);
        } else {
            console.error('confirmKickTester is not available');
            if (typeof showToast === 'function') showToast(_t('loadError'));
        }
    }

    // --- Public wrappers (backward compatible entry points) ---

    function _findLocalTest(appId) {
        var id = Number(appId || 0);
        if (id <= 0) return null;
        if (typeof getMyTestById === 'function') {
            var found = getMyTestById(id);
            if (found) return found;
        }
        if (Array.isArray(myTests)) {
            return myTests.find(function (item) {
                return Number(item && item.id) === id || Number(item && item.app_id) === id;
            }) || null;
        }
        return null;
    }

    function openLeaveOrDropFromTest(appId, event) {
        if (event) {
            try {
                if (typeof event.preventDefault === 'function') event.preventDefault();
                if (typeof event.stopPropagation === 'function') event.stopPropagation();
            } catch (e) {}
        }
        var test = _findLocalTest(appId);
        var joinType = String(test && test.join_type || '').toLowerCase();
        if (joinType === 'mutual' || joinType === 'prelaunch') {
            return openLeaveMutualModal(appId, event);
        }
        return openDropTestModal(appId, event);
    }

    function openLeaveMutualModal(appId, event) {
        if (event) {
            try {
                if (typeof event.preventDefault === 'function') event.preventDefault();
                if (typeof event.stopPropagation === 'function') event.stopPropagation();
            } catch (e) {}
        }
        var test = _findLocalTest(appId);
        return openTerminationSheet({
            mode: 'leave',
            appId: Number(appId || (test && (test.id || test.app_id)) || 0),
            joinType: (test && test.join_type) || 'mutual',
            testSnapshot: test || null,
            unlinkReciprocal: false,
        });
    }

    function openDropTestModal(appId, event) {
        if (event) {
            try {
                if (typeof event.preventDefault === 'function') event.preventDefault();
                if (typeof event.stopPropagation === 'function') event.stopPropagation();
            } catch (e) {}
        }
        var test = _findLocalTest(appId);
        return openTerminationSheet({
            mode: 'drop',
            appId: Number(appId || (test && (test.id || test.app_id)) || 0),
            joinType: (test && test.join_type) || 'invite',
            testSnapshot: test || null,
            unlinkReciprocal: false,
        });
    }

    function closeDropTestModal(event) {
        closeTerminationSheet(event);
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
            try {
                if (typeof event.preventDefault === 'function') event.preventDefault();
                if (typeof event.stopPropagation === 'function') event.stopPropagation();
            } catch (e) {}
        }
        var targetAppId = Number(appId || 0);
        var project = Array.isArray(myProjects)
            ? myProjects.find(function (item) { return Number(item && item.id) === targetAppId || Number(item && item.app_id) === targetAppId; })
            : null;
        var tester = project && Array.isArray(project.testers)
            ? project.testers.find(function (item) { return Number(item && item.tester_id) === Number(testerId); })
            : null;
        return openTerminationSheet({
            mode: 'kick',
            appId: targetAppId,
            projectId: targetAppId,
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
        var radio = group.querySelector('.term-reason-radio input[value="' + target + '"]')
            || group.querySelector('.term-reason-radio input[type="radio"]');
        if (radio) {
            selectTermReason(radio);
            return;
        }
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

    function proposeMutualFromTermination(appId, ownerId) {
        var targetAppId = Number(appId || (_termState && _termState.appId) || 0);
        var targetOwnerId = Number(ownerId || (_termState && _termState.ownerId) || 0);
        cancelTerminationConfirm();
        closeTerminationSheet({ target: document.getElementById('termination-sheet') });
        window.__offerSelectFlags = {
            showAddProjectCta: true,
            hideDirectJoin: true,
        };
        if (typeof createMutualOffer === 'function') {
            createMutualOffer(targetAppId, targetOwnerId);
        }
    }

    function addProjectFromTermination() {
        cancelTerminationConfirm();
        closeTerminationSheet({ target: document.getElementById('termination-sheet') });
        if (typeof openAddProjectChooser === 'function') {
            openAddProjectChooser();
        } else if (typeof openModal === 'function') {
            openModal();
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
    window.openDropTestModal = openDropTestModal;
    window.closeDropTestModal = closeDropTestModal;
    window.openLeaveOrDropFromTest = openLeaveOrDropFromTest;
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
    window.proposeMutualFromTermination = proposeMutualFromTermination;
    window.addProjectFromTermination = addProjectFromTermination;
})();
