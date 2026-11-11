/* Profile reputation strip, bust watermark, wallet shell, contribution dash. */
(function () {
    'use strict';

    var PACKS = [
        { id: 'start', amount: 500 },
        { id: 'growth', amount: 1500, badge: 'popular' },
        { id: 'pro', amount: 3500, badge: 'value' },
        { id: 'max', amount: 8000 }
    ];
    var NOTE_MIN = 14;
    var selectedPack = 1500;
    var customMode = false;
    var walletTab = 'earn';
    var historyFilter = 'all';
    var influenceOpen = false;
    var sprintOpen = false;

    function lang() { return window.lang || 'ru'; }
    function t(key, vars, fallback) {
        var value = typeof window.t === 'function' ? window.t(key, vars || {}, lang()) : '';
        if (!value || value === key) return fallback == null ? key : fallback;
        return value;
    }
    function esc(value) {
        return typeof window.escapeHTML === 'function'
            ? window.escapeHTML(String(value == null ? '' : value))
            : String(value == null ? '' : value);
    }
    function stats() { return (typeof visibilityStats === 'object' && visibilityStats) || {}; }
    function userId() {
        var tg = window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user;
        return String((tg && tg.id) || window.userId || 'guest');
    }
    function formatScore(value) {
        var n = Number(value);
        if (!Number.isFinite(n)) return '0';
        var rounded = Math.round(n * 10) / 10;
        if (Math.abs(rounded - Math.round(rounded)) < 0.001) return String(Math.round(rounded));
        return rounded.toFixed(1);
    }
    function formatAmount(value) {
        var n = Number(value);
        if (!Number.isFinite(n)) return '0';
        var locale = lang() === 'ru' ? 'ru-RU' : 'en-US';
        var digits = Math.abs(n - Math.round(n)) < 0.001 ? 0 : 1;
        return n.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: 1 });
    }
    function watermarkKey() { return 'bust_seen_watermark_' + userId(); }

    function unseenBust(balance) {
        var raw;
        try { raw = localStorage.getItem(watermarkKey()); } catch (e) { return 0; }
        if (raw == null || raw === '') return 0;
        var seen = Number(raw);
        if (!Number.isFinite(seen)) return 0;
        var delta = Math.round((Number(balance) - seen) * 10) / 10;
        return delta > 0 ? delta : 0;
    }
    function markBustSeen() {
        var balance = Number(stats().balance_bust || 0);
        if (!Number.isFinite(balance)) return;
        try { localStorage.setItem(watermarkKey(), String(Math.round(balance * 10) / 10)); } catch (e) {}
    }
    function bustBadgeHtml() {
        var amount = unseenBust(stats().balance_bust || 0);
        if (!(amount > 0)) return '';
        return '<span class="metric-delta is-up">↑ +' + esc(formatAmount(amount)) + '</span>';
    }

    function model() {
        var s = stats();
        var karma = Number(s.ownerKarma || 0);
        if (!Number.isFinite(karma)) karma = 0;
        var status = String(s.reliability_status || '');
        var newbie = !status || status === 'newbie' || s.reliability_index == null || s.reliability_index === '';
        var index = newbie ? null : Number(s.reliability_index);
        if (index != null && !Number.isFinite(index)) index = null;
        var c = s.contribution || {};
        var score = s.contribution_score != null ? Number(s.contribution_score) : Number(c.contribution_score || 0);
        if (!Number.isFinite(score)) score = 0;
        var base = newbie || index == null ? 24 : index <= 0 ? 7 : index < 40 ? 12 : index < 65 ? 18 : index < 85 ? 24 : 32;
        var karmaMod = karma < 0 ? (newbie ? 0 : -Math.floor(Math.abs(karma) / 3)) : (karma > 0 ? Math.min(6, Math.floor(karma / 7)) : 0);
        var contribMod = score >= 100 ? 6 : score >= 50 ? 4 : score >= 10 ? 2 : 0;
        var nextContrib = score < 10 ? 10 : score < 50 ? 50 : score < 100 ? 100 : null;
        var nextContribBonus = score < 10 ? 2 : score < 50 ? 4 : score < 100 ? 6 : 0;
        var slots = Math.max(0, Math.min(50, base + karmaMod + contribMod));
        var grantBonus = karma > 0 ? Math.min(200, Math.round(karma * 5 * 10) / 10) : 0;
        var grantCapLeft = Math.max(0, Math.round((200 - grantBonus) * 10) / 10);
        var wallet = window.ReviewCredits && ReviewCredits.get ? ReviewCredits.get() : null;
        var mult = wallet && wallet.multiplier ? wallet.multiplier : null;
        var trust = mult ? Number(mult.reliability) : (karma < 0 || (index != null && index < 50) ? 0.7 : (index != null && index >= 80 ? 1.2 : (index != null && index >= 65 ? 1.1 : 1)));
        var sprintM = mult ? Number(mult.sprint) : 1;
        var totalM = mult ? Number(mult.total) : Math.round(trust * sprintM * 100) / 100;
        var season = s.contribution_season || {};
        var priority = newbie || index == null || (index >= 65 && karma >= 0);
        var autoOpen = index == null ? false : index >= 65;
        var welcome = index != null && index >= 80 ? 4 : 2;
        var rate = s.acceptance_rate_pct;
        return {
            karma: karma, index: index, newbie: newbie, status: status || 'newbie', score: score,
            base: base, karmaMod: karmaMod, contribMod: contribMod, slots: slots, grantBonus: grantBonus,
            grantCapLeft: grantCapLeft, trust: trust, sprintM: sprintM, totalM: totalM, season: season,
            priority: priority, autoOpen: autoOpen, welcome: welcome, counts: c, rate: rate,
            nextContrib: nextContrib, nextContribBonus: nextContribBonus
        };
    }

    function toneClass(kind) {
        return kind === 'limit' ? 'is-limit' : (kind === 'locked' ? 'is-locked' : 'is-bonus');
    }
    function effect(kind, text) {
        return { kind: kind, text: text };
    }

    function influenceModel(m) {
        var karma = [];
        var reliability = [];
        var contrib = [];
        if (m.grantBonus > 0) karma.push(effect('bonus', t('profileRowGrant', { n: formatAmount(m.grantBonus) }, 'Грант +' + formatAmount(m.grantBonus) + ' $BUST из 200')));
        else karma.push(effect('locked', t('profileLockedGrant', {}, 'Грант: бонус откроется с кармой > 0')));
        if (m.karma > 0) karma.push(effect('bonus', t('profileRowMarket', { n: formatScore(m.karma) }, 'Витрина Маркета +' + formatScore(m.karma))));
        else if (m.karma < 0) karma.push(effect('limit', t('profileMarketPenalty', {}, 'Витрина без бонуса при отрицательной карме')));
        if (m.karmaMod > 0) karma.push(effect('bonus', t('profileRowKarmaSlots', { n: '+' + m.karmaMod }, 'Слоты рассылки +' + m.karmaMod)));
        else if (m.karmaMod < 0) karma.push(effect('limit', t('profileRowKarmaSlots', { n: String(m.karmaMod) }, 'Слоты рассылки ' + m.karmaMod)));
        if (m.karma < 0) karma.push(effect('limit', t('profileRowTrustBad', { n: formatScore(m.trust) }, 'Квоты отзывов замедлены ×' + formatScore(m.trust))));
        else karma.push(effect('bonus', t('profileRowTrustOk', {}, 'Квоты отзывов без штрафа кармы')));

        if (m.trust !== 1 && m.karma >= 0) {
            if (m.trust > 1) reliability.push(effect('bonus', t('profileRowTrust', { n: formatScore(m.trust) }, 'Квоты отзывов ×' + formatScore(m.trust))));
            else reliability.push(effect('limit', t('profileRowTrust', { n: formatScore(m.trust) }, 'Квоты отзывов ×' + formatScore(m.trust))));
        } else if (m.karma >= 0 && m.trust === 1) {
            reliability.push(effect('locked', t('profileLockedTrust', {}, 'Квоты отзывов: базовый ×1.0 · от 65% будет ×1.1')));
        }
        reliability.push(effect('bonus', t('profileRowSlots', { n: m.slots }, 'Бесплатные слоты рассылки: ' + m.slots)));
        if (m.autoOpen) reliability.push(effect('bonus', t('profileRowAutoOn', {}, 'Авто-приём открыт')));
        else if (!m.newbie) reliability.push(effect('limit', t('profileChipAutoOff', {}, 'Авто-приём закрыт (<65%)')));
        else reliability.push(effect('locked', t('profileLockedAuto', {}, 'Авто-приём откроется с индексом ≥ 65%')));
        reliability.push(effect(m.priority ? 'bonus' : 'limit', m.priority ? t('profileRowPoolOn', {}, 'Приоритетный пул рассылки') : t('profileRowPoolOff', {}, 'Базовый пул рассылки')));
        reliability.push(effect('bonus', t('profileRowWelcome', { n: m.welcome }, 'Старт Live +' + m.welcome + ' ⭐')));

        if (m.sprintM > 1) contrib.push(effect('bonus', t('profileRowSprint', { n: formatScore(m.sprintM) }, 'Ускоритель квоты отзывов ×' + formatScore(m.sprintM))));
        else contrib.push(effect('locked', t('profileLockedSprint', {}, 'Ускоритель квоты отзывов ×1 · Топ прошлого спринта даёт до ×2')));
        if (m.contribMod > 0) contrib.push(effect('bonus', t('profileRowContribSlots', { n: m.contribMod }, 'Слоты за вклад +' + m.contribMod)));
        else if (m.nextContrib != null) contrib.push(effect('locked', t('profileLockedContrib', { n: m.nextContrib, bonus: m.nextContribBonus }, 'Слоты за вклад: ещё до ' + m.nextContrib + ' ⚡ → +' + m.nextContribBonus)));
        contrib.push(effect('bonus', t('profileRowMarketFilter', {}, 'Фильтр Маркета учитывает вклад')));

        return { karma: karma, reliability: reliability, contrib: contrib };
    }

    function countTone(list, kind) {
        return list.filter(function (item) { return item.kind === kind; }).length;
    }

    function profileStripHtml() {
        var m = model();
        var groups = influenceModel(m);
        var bonus = countTone(groups.karma, 'bonus') + countTone(groups.reliability, 'bonus') + countTone(groups.contrib, 'bonus');
        var limit = countTone(groups.karma, 'limit') + countTone(groups.reliability, 'limit') + countTone(groups.contrib, 'limit');
        var summary = t('profileInfluenceTitle', {}, '⚡ Влияния профиля');
        if (bonus || limit) {
            summary += ' · ' + t('profileInfluenceSummary', { bonus: bonus, limit: limit }, bonus + ' бонуса · ' + limit + ' ограничений');
        }
        function groupHtml(key, title, openKind, rows) {
            return '<section class="rep-group">' +
                '<button type="button" class="rep-group-head" data-rep-open="' + openKind + '"><span>' + esc(title) + '</span><span class="rep-group-go">›</span></button>' +
                '<ul class="rep-group-list">' + rows.map(function (row) {
                    return '<li class="' + toneClass(row.kind) + '">' + esc(row.text) + '</li>';
                }).join('') + '</ul></section>';
        }
        return '<details class="rep-influence"' + (influenceOpen ? ' open' : '') + '>' +
            '<summary>' + esc(summary) + '</summary>' +
            '<div class="rep-groups">' +
            groupHtml('karma', t('metricKarmaSub', {}, '☯️ Карма · Доверие'), 'karma', groups.karma) +
            groupHtml('reliability', t('metricReliabilitySub', {}, '🛡 Надёжность · Дисциплина'), 'reliability', groups.reliability) +
            groupHtml('contribution', t('metricContributionSub', {}, '⚡ Вклад · Польза'), 'contribution', groups.contrib) +
            '</div></details>';
    }

    function sprintCardHtml() {
        var m = model();
        var season = m.season || {};
        var rank = Number(season.rank || 0);
        var ends = Date.parse(String(season.ends_at || ''));
        var days = Number.isFinite(ends) ? Math.max(0, Math.floor((ends - Date.now()) / 86400000)) : '—';
        var line = rank > 0
            ? t('profileSprintRank', { rank: Math.round(rank), days: days }, '🏆 Спринт: #' + Math.round(rank) + ' · Осталось ' + days + ' дн.')
            : t('profileSprintOut', { days: days }, '🏆 Спринт: Вне топа · ' + days + ' дн.');
        var delta = stats().deltas_7d && Number(stats().deltas_7d.contribution);
        var badge = Number.isFinite(delta) && delta > 0
            ? '<span class="metric-delta is-up">↑ +' + esc(formatScore(delta)) + '</span>'
            : '';
        return {
            badge: badge,
            body: '<div class="metric-value">' + esc(formatScore(m.score)) + ' <span class="metric-value-mark">⚡</span></div>' +
                '<div class="metric-sprint-timer">' + esc(line) + '</div>'
        };
    }
    function fillSprintCard(card) {
        if (!card) return;
        var view = sprintCardHtml();
        var top = card.querySelector('.metric-card-top');
        if (top) {
            var old = top.querySelector('.metric-delta');
            if (old) old.remove();
            if (view.badge) {
                var chevron = top.querySelector('.metric-chevron');
                if (chevron) chevron.insertAdjacentHTML('beforebegin', view.badge);
                else top.insertAdjacentHTML('beforeend', view.badge);
            }
        }
        var body = card.querySelector('.metric-sprint-body');
        if (body) body.innerHTML = view.body;
    }

    function metricSubtitle(kind) {
        if (kind === 'reliability') return t('metricReliabilitySub', {}, 'Дисциплина чекинов и удержания');
        if (kind === 'karma') return t('metricKarmaSub', {}, 'Репутация и благодарность сообщества');
        if (kind === 'contribution') return t('metricContributionSub', {}, 'Подтверждённая польза и качество отчётов');
        return '';
    }
    function metricCardSubHtml(kind) {
        return '<div class="metric-subline">' + esc(metricSubtitle(kind)) + '</div>';
    }

    function reliabilityNow(tone) {
        var m = model();
        if (tone === 'is-showcase') {
            return t('reliabilityNowStatus', { status: t('reliabilityDashStatus_' + m.status, {}, m.status) }, 'Сейчас: ' + m.status);
        }
        if (tone === 'is-mail') {
            return m.priority ? t('profileRowPoolOn', {}, 'Приоритетный пул') : t('profileRowPoolOff', {}, 'Базовый пул');
        }
        if (tone === 'is-slots') return t('reliabilityNowSlots', { n: m.slots }, 'Сейчас у вас: ' + m.slots + ' слотов');
        if (tone === 'is-reviews') return t('reliabilityNowTrust', { n: formatScore(m.trust) }, 'Квоты отзывов ×' + formatScore(m.trust));
        if (tone === 'is-welcome') return t('profileRowWelcome', { n: m.welcome }, 'Сейчас: +' + m.welcome + ' ⭐');
        return '';
    }

    function openTarget(kind) {
        if ((kind === 'market' || kind === 'contribution' || kind === 'karma' || kind === 'reliability' || kind === 'reviews' || kind === 'guests' || kind === 'grants') && typeof window.closeEarnBustModal === 'function') {
            window.closeEarnBustModal();
        }
        if (kind === 'karma' && typeof window.showKarmaInfo === 'function') return window.showKarmaInfo();
        if (kind === 'reliability' && typeof window.showReliabilityInfo === 'function') return window.showReliabilityInfo();
        if (kind === 'contribution' && typeof window.showContributionInfo === 'function') return window.showContributionInfo();
        if (kind === 'reviews' && window.ReviewCredits && typeof ReviewCredits.openBalance === 'function') return ReviewCredits.openBalance();
        if (kind === 'wallet' && typeof window.openEarnBustModal === 'function') return window.openEarnBustModal();
        if (kind === 'grants' && typeof window.openGrantsHistorySheet === 'function') return window.openGrantsHistorySheet();
        if (kind === 'guests') {
            if (typeof window.switchTab === 'function') window.switchTab('projects');
            return;
        }
        if (kind === 'market') {
            if (typeof window.switchTab === 'function') window.switchTab('market');
            if (window.MarketStorefront && typeof MarketStorefront.show === 'function') MarketStorefront.show('contracts');
        }
    }

    function reservedProjects() {
        var list = (typeof myProjects !== 'undefined' && Array.isArray(myProjects)) ? myProjects : [];
        var rows = [];
        list.forEach(function (p) {
            if (!p) return;
            var amount = 0;
            var why = [];
            if (p.phase === 'live') {
                amount = Math.max(0, Number(p.live_project_control && p.live_project_control.reserved_bust || 0));
                if (amount) why.push(t('walletReserveLive', {}, 'Live'));
            } else {
                var status = String(p.status || p.app_status || 'active').toLowerCase();
                if (status === 'completed' || status === 'archived') return;
                var pool = Number(p.screenshot_boost_campaign && p.screenshot_boost_campaign.pool_remaining || 0);
                var protection = Number(p.protection_bust_pool || 0);
                var mode = String(p.mode || 'mutual').toLowerCase();
                var bounty = (mode === 'bounty' || mode === 'hybrid') ? Number(p.limit_bounty || 0) * Number(p.bounty_per_tester || 0) : 0;
                amount = bounty + protection + pool;
                if (bounty) why.push(t('walletReserveContract', {}, 'Контракт'));
                if (pool) why.push(t('walletReservePool', {}, 'Пул КД'));
                if (protection) why.push(t('walletReserveHold', {}, 'Удержание'));
            }
            if (amount > 0) rows.push({ id: p.app_id || p.id, name: p.name || p.title || '—', amount: amount, why: why.join(' · ') });
        });
        return rows;
    }

    function txLabel(type) {
        var key = 'walletTx_' + String(type || 'other');
        return t(key, {}, String(type || 'operation').replace(/_/g, ' '));
    }
    function txDate(value) {
        var d = new Date(value || '');
        if (Number.isNaN(d.getTime())) return '—';
        var day = String(d.getDate()).padStart(2, '0');
        var month = String(d.getMonth() + 1).padStart(2, '0');
        return day + '.' + month + '.' + d.getFullYear();
    }

    function packAmount() {
        if (customMode) {
            var input = document.getElementById('wallet-custom-amount');
            var n = Number(input && input.value);
            if (!Number.isFinite(n)) return 0;
            return Math.round(n);
        }
        return selectedPack;
    }

    function renderTopup() {
        var host = document.getElementById('wallet-panel-topup');
        if (!host) return;
        var amount = packAmount();
        var valid = amount >= 100 && amount <= 20000;
        host.innerHTML =
            '<div class="wallet-pack-grid">' + PACKS.map(function (pack) {
                var on = !customMode && selectedPack === pack.amount;
                var badge = pack.badge === 'popular'
                    ? '<em>' + esc(t('walletPackPopular', {}, 'Популярный')) + '</em>'
                    : (pack.badge === 'value' ? '<em class="is-value">' + esc(t('walletPackValue', {}, 'Выгодно')) + '</em>' : '');
                return '<button type="button" class="wallet-pack' + (on ? ' is-on' : '') + '" data-wallet-pack="' + pack.amount + '">' +
                    badge + '<strong>' + esc(formatAmount(pack.amount)) + '</strong><span>$BUST</span><small>' +
                    esc(t('walletPack' + pack.id, {}, pack.id)) + '</small></button>';
            }).join('') + '</div>' +
            '<label class="wallet-custom"><span>' + esc(t('walletCustom', {}, 'Своя сумма')) + '</span>' +
            '<input id="wallet-custom-amount" inputmode="numeric" min="100" max="20000" step="50" placeholder="100–20000" value="' + (customMode ? esc(String(amount || '')) : '') + '"></label>' +
            '<p class="wallet-note">' + esc(t('walletPayNote', {}, 'Оплата через тот же контур, что Private Testing. $BUST зачисляет координатор после подтверждения.')) + '</p>' +
            '<div class="wallet-pay">' +
            '<div><b>' + esc(formatAmount(valid ? amount : 0)) + ' $BUST</b><small>' + esc(valid ? '' : t('walletCustomHint', {}, 'От 100 до 20 000')) + '</small></div>' +
            '<button type="button" class="btn btn-primary" data-wallet-pay ' + (valid ? '' : 'disabled') + '>' + esc(t('walletPay', {}, 'К оплате')) + '</button></div>' +
            '<div id="wallet-pay-desk" class="wallet-desk" hidden></div>';
    }

    function renderDesk() {
        var desk = document.getElementById('wallet-pay-desk');
        if (!desk) return;
        var pay = window.DevTestPaymentDesk || {};
        var exchanges = Array.isArray(pay.exchanges) ? pay.exchanges : [];
        desk.hidden = false;
        desk.innerHTML =
            '<p>' + esc(t('walletDeskTitle', { n: formatAmount(packAmount()) }, 'Заявка на ' + formatAmount(packAmount()) + ' $BUST')) + '</p>' +
            (pay.paypalEmail ? '<button type="button" class="wallet-copy" data-wallet-copy="' + esc(pay.paypalEmail) + '">PayPal · ' + esc(pay.paypalEmail) + '</button>' : '') +
            exchanges.map(function (ex) {
                return '<button type="button" class="wallet-copy" data-wallet-copy="' + esc(ex.value) + '">' + esc(ex.name) + ' · ' + esc(ex.value) + '</button>';
            }).join('') +
            '<button type="button" class="btn btn-secondary" data-wallet-support>' + esc(t('walletSupport', {}, 'Написать в поддержку')) + '</button>';
    }

    function renderHistory() {
        var host = document.getElementById('wallet-panel-history');
        if (!host) return;
        var rows = Array.isArray(window._walletEntries) ? window._walletEntries.slice() : [];
        if (historyFilter === 'grants') {
            rows = rows.filter(function (row) {
                return row.type === 'platform_test_grant' || row.type === 'early_finish_grant';
            });
        }
        host.innerHTML =
            '<div class="wallet-filters">' +
            '<button type="button" class="' + (historyFilter === 'all' ? 'is-on' : '') + '" data-wallet-filter="all">' + esc(t('walletFilterAll', {}, 'Все')) + '</button>' +
            '<button type="button" class="' + (historyFilter === 'grants' ? 'is-on' : '') + '" data-wallet-filter="grants">' + esc(t('walletFilterGrants', {}, 'Гранты')) + '</button></div>' +
            (historyFilter === 'grants' ? '<p class="wallet-note">' + esc(t('walletGrantFormula', {}, 'Грант = база 50 + идеальный бонус 50 + карма × 5 (до 200). Потолок 300 $BUST.')) + '</p>' : '') +
            '<button type="button" class="wallet-link" data-rep-open="grants">' + esc(t('walletOpenGrantsSheet', {}, 'Подробная история грантов')) + '</button>' +
            (rows.length ? '<div class="wallet-ledger">' + rows.map(function (row) {
                var amount = Number(row.amount || 0);
                var sign = amount > 0 ? '+' : '';
                return '<div class="wallet-tx"><div><b>' + esc(txLabel(row.type)) + '</b><small>' + esc(txDate(row.created_at)) + '</small></div>' +
                    '<span class="' + (amount < 0 ? 'is-out' : 'is-in') + '">' + sign + esc(formatAmount(amount)) + ' 💎</span></div>';
            }).join('') + '</div>' : '<p class="wallet-note">' + esc(t('walletHistoryEmpty', {}, 'Операций пока нет.')) + '</p>');
    }

    function renderReserve() {
        var host = document.getElementById('wallet-reserve');
        if (!host) return;
        var rows = reservedProjects();
        var total = rows.reduce(function (sum, row) { return sum + row.amount; }, 0);
        if (!(total > 0)) { host.hidden = true; host.innerHTML = ''; return; }
        host.hidden = false;
        host.innerHTML = '<details><summary>' + esc(t('walletReserved', { n: formatAmount(total) }, '🔒 В резерве проектов: ' + formatAmount(total) + ' $BUST')) + '</summary>' +
            rows.map(function (row) {
                return '<button type="button" class="wallet-reserve-row" data-wallet-project="' + esc(row.id || '') + '"><span>' + esc(row.name) + '<small>' + esc(row.why) + '</small></span><b>' + esc(formatAmount(row.amount)) + '</b></button>';
            }).join('') + '</details>';
    }

    function renderHero() {
        var hero = document.getElementById('wallet-hero-balance');
        if (hero) hero.textContent = formatAmount(stats().balance_bust || 0);
        renderReserve();
    }

    function classifyEarnCards(earn) {
        if (!earn || earn.dataset.walletSorted) return;
        var cards = Array.from(earn.querySelectorAll(':scope > .card'));
        if (!cards.length) return;
        var now = document.createElement('div');
        now.className = 'wallet-earn-group';
        now.innerHTML = '<div class="wallet-earn-label">' + esc(t('walletEarnNow', {}, 'Сделать сейчас')) + '</div>';
        var awards = document.createElement('div');
        awards.className = 'wallet-earn-group';
        awards.innerHTML = '<div class="wallet-earn-label">' + esc(t('walletEarnAwards', {}, 'Награды и статусы')) + '</div>';
        var once = document.createElement('div');
        once.className = 'wallet-earn-group';
        once.innerHTML = '<div class="wallet-earn-label">' + esc(t('walletEarnOnce', {}, 'Разовые задания')) + '</div>';
        cards.forEach(function (card) {
            var title = (card.querySelector('[data-i18n], span') && card.innerText) || '';
            if (/Контракт|Referral|Пригласи|Спринт|Contract|Invite|Sprint/i.test(title)) now.appendChild(card);
            else if (/Профиль|устройств|Социаль|Device|Social|profile/i.test(title)) once.appendChild(card);
            else awards.appendChild(card);
        });
        var contracts = now.querySelector('[data-i18n="earnDailyTitle"], #t-earnDailyTitle');
        if (contracts && !now.querySelector('[data-rep-open="market"]')) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-secondary';
            btn.style.cssText = 'width:100%;margin-top:10px';
            btn.setAttribute('data-rep-open', 'market');
            btn.textContent = t('walletOpenContracts', {}, 'Открыть Контракты');
            contracts.closest('.card').appendChild(btn);
        }
        var invite = now.querySelector('[data-i18n="earnReferralTitle"], #t-earnReferralTitle');
        if (invite && !now.querySelector('[data-rep-open="guests"]')) {
            var guestBtn = document.createElement('button');
            guestBtn.type = 'button';
            guestBtn.className = 'btn btn-secondary';
            guestBtn.style.cssText = 'width:100%;margin-top:10px';
            guestBtn.setAttribute('data-rep-open', 'guests');
            guestBtn.textContent = t('walletOpenGuests', {}, 'К гостевым проектам');
            invite.closest('.card').appendChild(guestBtn);
        }
        earn.appendChild(now);
        earn.appendChild(awards);
        earn.appendChild(once);
        earn.dataset.walletSorted = '1';
    }

    function setWalletTab(next) {
        walletTab = next || 'earn';
        document.querySelectorAll('[data-wallet-tab]').forEach(function (btn) {
            btn.classList.toggle('is-on', btn.getAttribute('data-wallet-tab') === walletTab);
        });
        ['topup', 'earn', 'history'].forEach(function (name) {
            var panel = document.getElementById('wallet-panel-' + name);
            if (panel) panel.hidden = name !== walletTab;
        });
        if (walletTab === 'topup') renderTopup();
        if (walletTab === 'history') renderHistory();
    }

    function mountWallet() {
        var content = document.querySelector('#earn-bust-modal .modal-content');
        if (!content) return;
        markBustSeen();
        if (!content.dataset.walletReady) {
            var title = content.querySelector('h3');
            var desc = document.getElementById('t-earnDesc');
            var closeBtn = document.getElementById('t-earnClose');
            var cards = Array.from(content.children).filter(function (node) {
                return node !== title && node !== desc && node !== closeBtn && !node.id;
            });
            var shell = document.createElement('div');
            shell.className = 'wallet-shell';
            shell.innerHTML =
                '<div class="wallet-hero-card">' +
                '<div class="wallet-hero-kicker">' + esc(t('walletHeroKicker', {}, 'Ваш баланс платформы')) + '</div>' +
                '<div class="wallet-hero"><span>' + esc(t('walletAvailable', {}, 'Доступно')) + '</span><strong id="wallet-hero-balance">0</strong><small>💎 $BUST</small></div>' +
                '<div id="wallet-reserve" class="wallet-reserve" hidden></div></div>' +
                '<div class="wallet-tabs" role="tablist">' +
                '<button type="button" data-wallet-tab="topup">' + esc(t('walletTabTopup', {}, 'Пополнить')) + '</button>' +
                '<button type="button" data-wallet-tab="earn" class="is-on">' + esc(t('walletTabEarn', {}, 'Заработать')) + '</button>' +
                '<button type="button" data-wallet-tab="history">' + esc(t('walletTabHistory', {}, 'История')) + '</button></div>' +
                '<div id="wallet-panel-topup" hidden></div>' +
                '<div id="wallet-panel-earn"></div>' +
                '<div id="wallet-panel-history" hidden></div>';
            if (title) title.textContent = t('walletTitle', {}, 'Кошелёк $BUST');
            if (desc) desc.hidden = true;
            var earn = shell.querySelector('#wallet-panel-earn');
            cards.forEach(function (card) { earn.appendChild(card); });
            classifyEarnCards(earn);
            if (closeBtn) content.insertBefore(shell, closeBtn);
            else content.appendChild(shell);
            content.dataset.walletReady = '1';
        } else {
            classifyEarnCards(document.getElementById('wallet-panel-earn'));
        }
        renderHero();
        setWalletTab(walletTab);
    }

    function karmaInfluenceHtml() {
        var m = model();
        var trust = m.karma < 0
            ? t('karmaInfluenceTrustBad', { n: formatScore(m.trust) }, '⚠️ Квоты отзывов ×' + formatScore(m.trust))
            : t('karmaInfluenceTrustOk', {}, '✓ Квоты отзывов без штрафа');
        var slots = (m.karmaMod > 0 ? '+' : '') + m.karmaMod;
        return '<div class="karma-influence">' +
            '<p class="metric-lead">' + esc(t('metricKarmaLead', {}, 'Социальный капитал: вам доверяют авторы и сообщество.')) + '</p>' +
            '<div class="karma-influence-title">' + esc(t('karmaInfluenceTitle', {}, 'Ваше текущее влияние кармы')) + '</div>' +
            '<div class="rep-chip-row">' +
            '<span class="rep-chip is-bonus">' + esc(t('karmaInfluenceGrant', { n: formatAmount(m.grantBonus) }, 'Грант +' + formatAmount(m.grantBonus) + ' / 200')) + '</span>' +
            '<span class="rep-chip is-bonus">' + esc(t('karmaInfluenceMarket', { n: formatScore(m.karma) }, 'Витрина +' + formatScore(m.karma))) + '</span>' +
            '<span class="rep-chip ' + (m.karmaMod < 0 ? 'is-limit' : 'is-bonus') + '">' + esc(t('karmaInfluenceSlots', { n: slots }, 'Слоты ' + slots)) + '</span>' +
            '<span class="rep-chip ' + (m.karma < 0 ? 'is-limit' : 'is-bonus') + '">' + esc(trust) + '</span>' +
            '</div><p class="wallet-note">' + esc(t('karmaPlatformNote', {}, 'Карма за фидбэк — репутация от платформы и авторов. Очки Вклада за те же отчёты считаются отдельно и идут в Спринт.')) + '</p></div>';
    }
    function paintKarmaInfluence() {
        var host = document.getElementById('karma-influence');
        if (host) host.innerHTML = karmaInfluenceHtml();
        var title = document.querySelector('#karma-info-modal .dashboard-title');
        if (title && !title.dataset.subReady) {
            title.insertAdjacentHTML('afterend', '<div class="metric-lead metric-lead--title">' + esc(t('metricKarmaLead', {}, 'Социальный капитал: вам доверяют авторы и сообщество.')) +
                ' <button type="button" class="metric-info-btn" data-rep-open="karma-rules" hidden></button></div>');
            title.dataset.subReady = '1';
        }
    }

    function lifetimeCounts() {
        var life = (window._contributionHistoryCache && window._contributionHistoryCache.lifetime) || {};
        var c = stats().contribution || {};
        function pick(key) {
            if (life[key] != null && Number(life[key]) > 0) return Number(life[key]);
            if (c[key] != null) return Number(c[key] || 0);
            return Number(life[key] || 0);
        }
        return {
            bugs: pick('bugs_count'),
            ideas: pick('ideas_count'),
            reviews: pick('play_reviews_count'),
            screens: pick('five_screens_count'),
            texts: pick('text_reports_count'),
            videos: pick('video_reports_count')
        };
    }

    function lifetimeScore() {
        var life = (window._contributionHistoryCache && window._contributionHistoryCache.lifetime) || {};
        var fromLife = life.contribution_lifetime_score != null ? Number(life.contribution_lifetime_score) : null;
        var fromProfile = Number(stats().contribution_score != null ? stats().contribution_score : (stats().contribution || {}).contribution_score || 0);
        if (Number.isFinite(fromLife) && fromLife > 0) return fromLife;
        if (Number.isFinite(fromProfile)) return fromProfile;
        return 0;
    }

    function contributionDashHtml() {
        var m = model();
        var score = lifetimeScore();
        var counts = lifetimeCounts();
        var rate = m.rate;
        var season = m.season || {};
        var seasonNo = season.season_number != null ? season.season_number : '—';
        var prices = [
            ['🐞', t('contribPriceBug', {}, 'Баг +5'), counts.bugs],
            ['💡', t('contribPriceIdea', {}, 'Идея +4'), counts.ideas],
            ['⭐', t('contribPriceReview', {}, 'Отзыв +3'), counts.reviews],
            ['🎬', t('contribPriceVideo', {}, 'Видео +1'), counts.videos],
            ['📸', t('contribPriceScreens', {}, '5 экранов +0.5'), counts.screens],
            ['📝', t('contribPriceText', {}, 'Текст +0.2'), counts.texts]
        ];
        return '<section class="contrib-dash">' +
            '<div class="contrib-dash-hero">' +
            '<span class="contrib-dash-kicker">' + esc(t('contribLifetime', {}, 'Накопленный вклад')) + '</span>' +
            '<strong>' + esc(formatScore(score)) + ' ⚡</strong>' +
            '<p class="metric-lead">' + esc(t('metricContributionLead', {}, 'Подтверждённая польза: баги, идеи и отзывы, которые принял автор.')) + '</p>' +
            '<small class="contrib-quality">' + esc(t('contribAcceptQuality', { n: rate == null ? '—' : formatScore(rate) }, '✓ Качество отчётов (принято): ' + (rate == null ? '—' : formatScore(rate) + '%'))) + '</small>' +
            '</div>' +
            '<div class="contrib-prices">' + prices.map(function (row) {
                return '<div><b>' + row[0] + ' ' + esc(row[1]) + '</b><span>' + esc(formatScore(row[2])) + '</span></div>';
            }).join('') + '</div>' +
            '<div class="contrib-influence is-open">' +
            '<div class="contrib-influence-title">' + esc(t('contribInfluenceTitle', {}, 'Влияние вклада на профиль')) + '</div>' +
            '<div class="contrib-cards">' +
            '<article class="' + (m.sprintM > 1 ? 'is-bonus' : 'is-locked') + '"><b>' + esc(t('contribInfSprint', { n: formatScore(m.sprintM) }, 'Ускоритель квоты отзывов ×' + formatScore(m.sprintM))) + '</b><p>' + esc(t('contribInfSprintText', {}, 'Место прошлого Спринта умножает скорость набора квоты отзывов, максимум ×2.')) + '</p></article>' +
            '<article class="is-bonus"><b>' + esc(t('contribInfPool', {}, 'Призовой пул 2 000 $BUST')) + '</b><p>' + esc(t('contribInfPoolText', {}, 'Топ-10 получает от 60 до 450 $BUST.')) + '</p></article>' +
            '<article class="' + (m.contribMod > 0 ? 'is-bonus' : 'is-locked') + '"><b>' + esc(t('contribInfSlots', { n: m.contribMod }, 'Слоты рассылки +' + m.contribMod)) + '</b><p>' + esc(t('contribInfSlotsText', {}, '10+ даёт +2 места, 50+ даёт +4, 100+ даёт +6 — навсегда.')) + '</p></article>' +
            '<article class="is-bonus"><b>' + esc(t('contribInfMarket', {}, 'Фильтр Маркета по вкладу')) + '</b><p>' + esc(t('contribInfMarketText', {}, 'В подборе контрагентов выше те, у кого вклад больше, при выставлении фильтра.')) + '</p></article>' +
            '</div></div>' +
            '<details class="contrib-sprint-shell"' + (sprintOpen ? ' open' : '') + '>' +
            '<summary>' + esc(t('contribSprintSummary', { n: seasonNo }, '🏆 Спринты · Текущий №' + seasonNo)) + '</summary>' +
            '<p class="wallet-note">' + esc(t('contribSprintLead', {}, '10 дней, призовой фонд 2 000 $BUST. Ниже — текущий забег и история сезонов.')) + '</p>' +
            '</details></section>';
    }
    function paintContributionDash() {
        var host = document.getElementById('contribution-lifetime-dash');
        if (!host) return;
        host.innerHTML = contributionDashHtml();
        var shell = host.querySelector('.contrib-sprint-shell');
        var tabs = document.querySelector('#contribution-info-modal .contribution-tabs');
        var current = document.getElementById('contribution-tab-current');
        var history = document.getElementById('contribution-tab-history');
        var mount = document.getElementById('contribution-sprint-mount');
        if (!mount && shell) {
            mount = document.createElement('div');
            mount.id = 'contribution-sprint-mount';
            shell.appendChild(mount);
        }
        if (mount) {
            if (tabs && tabs.parentElement !== mount) mount.appendChild(tabs);
            if (current && current.parentElement !== mount) mount.appendChild(current);
            if (history && history.parentElement !== mount) mount.appendChild(history);
        }
        var title = document.querySelector('#contribution-info-modal .dashboard-title');
        if (title) title.textContent = t('contributionInfoModalTitle', {}, 'Вклад');
        var subtitle = document.getElementById('contribution-modal-subtitle');
        if (subtitle) subtitle.textContent = t('metricContributionLead', {}, 'Подтверждённая польза и качество отчётов');
        var dup = document.getElementById('contribution-lifetime-actions');
        if (dup) dup.hidden = true;
    }

    function bindNote(el) {
        if (!el || el.dataset.valueHint) return;
        el.dataset.valueHint = '1';
        var hint = document.createElement('p');
        hint.className = 'report-note-hint';
        hint.hidden = true;
        el.insertAdjacentElement('afterend', hint);
        el.addEventListener('blur', function () {
            var len = String(el.value || '').trim().length;
            hint.hidden = !(len > 0 && len < NOTE_MIN);
            hint.textContent = t('reportNoteValueHint', {}, 'Короткий текст вроде «ок» или «день 1» не помогает автору. Напишите, что именно увидели. Поддержка и наблюдения — нормальный комментарий.');
        });
        el.addEventListener('input', function () {
            if (String(el.value || '').trim().length >= NOTE_MIN) hint.hidden = true;
        });
    }

    document.addEventListener('focusin', function (ev) {
        var el = ev.target;
        if (!el || !el.id) return;
        if (el.id === 'unified-report-note' || el.id === 'report-text') bindNote(el);
    });
    document.addEventListener('toggle', function (ev) {
        if (!ev.target || !ev.target.classList) return;
        if (ev.target.classList.contains('rep-influence')) influenceOpen = !!ev.target.open;
        if (ev.target.classList.contains('contrib-sprint-shell')) sprintOpen = !!ev.target.open;
    }, true);
    // Capture phase: modal-content uses stopPropagation and would block bubble listeners.
    document.addEventListener('click', function (ev) {
        var open = ev.target.closest && ev.target.closest('[data-rep-open]');
        if (open && open.getAttribute('data-rep-open')) {
            var kind = open.getAttribute('data-rep-open');
            if (kind === 'karma-rules') {
                var rules = document.querySelector('#karma-info-modal .karma-rules');
                if (rules) rules.open = true;
                return;
            }
            ev.preventDefault();
            openTarget(kind);
            return;
        }
        var tab = ev.target.closest && ev.target.closest('[data-wallet-tab]');
        if (tab) { setWalletTab(tab.getAttribute('data-wallet-tab')); return; }
        var pack = ev.target.closest && ev.target.closest('[data-wallet-pack]');
        if (pack) { customMode = false; selectedPack = Number(pack.getAttribute('data-wallet-pack')); renderTopup(); return; }
        var filter = ev.target.closest && ev.target.closest('[data-wallet-filter]');
        if (filter) { historyFilter = filter.getAttribute('data-wallet-filter'); renderHistory(); return; }
        if (ev.target && ev.target.id === 'wallet-custom-amount') customMode = true;
        var pay = ev.target.closest && ev.target.closest('[data-wallet-pay]');
        if (pay) { renderDesk(); return; }
        var copy = ev.target.closest && ev.target.closest('[data-wallet-copy]');
        if (copy && navigator.clipboard) {
            navigator.clipboard.writeText(copy.getAttribute('data-wallet-copy') || '').catch(function () {});
            return;
        }
        var support = ev.target.closest && ev.target.closest('[data-wallet-support]');
        if (support) {
            var who = (window.DevTestPaymentDesk && DevTestPaymentDesk.support) || 'garantxchange';
            var link = 'https://t.me/' + who;
            if (window.tg && typeof tg.openTelegramLink === 'function') tg.openTelegramLink(link);
            else window.open(link, '_blank', 'noopener');
            return;
        }
        var project = ev.target.closest && ev.target.closest('[data-wallet-project]');
        if (project) {
            if (typeof window.closeEarnBustModal === 'function') window.closeEarnBustModal();
            if (typeof window.switchTab === 'function') window.switchTab('projects');
        }
    }, true);
    document.addEventListener('input', function (ev) {
        if (!ev.target || ev.target.id !== 'wallet-custom-amount') return;
        customMode = true;
        var amount = packAmount();
        var valid = amount >= 100 && amount <= 20000;
        var pay = document.querySelector('#wallet-panel-topup [data-wallet-pay]');
        var label = document.querySelector('#wallet-panel-topup .wallet-pay b');
        var hint = document.querySelector('#wallet-panel-topup .wallet-pay small');
        if (label) label.textContent = formatAmount(valid ? amount : 0) + ' $BUST';
        if (hint) hint.textContent = valid ? '' : t('walletCustomHint', {}, 'От 100 до 20 000');
        if (pay) pay.disabled = !valid;
        document.querySelectorAll('[data-wallet-pack]').forEach(function (btn) { btn.classList.remove('is-on'); });
    });

    window.ProfileReputation = {
        bustBadgeHtml: bustBadgeHtml,
        markBustSeen: markBustSeen,
        profileStripHtml: profileStripHtml,
        sprintCardHtml: sprintCardHtml,
        fillSprintCard: fillSprintCard,
        reliabilityNow: reliabilityNow,
        metricCardSubHtml: metricCardSubHtml,
        mountWallet: mountWallet,
        paintKarmaInfluence: paintKarmaInfluence,
        paintContributionDash: paintContributionDash,
        formatScore: formatScore
    };
})();
