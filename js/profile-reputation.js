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
        var slots = Math.max(0, Math.min(50, base + karmaMod + contribMod));
        var grantBonus = karma > 0 ? Math.min(200, Math.round(karma * 5 * 10) / 10) : 0;
        var wallet = window.ReviewCredits && ReviewCredits.get ? ReviewCredits.get() : null;
        var mult = wallet && wallet.multiplier ? wallet.multiplier : null;
        var trust = mult ? Number(mult.reliability) : (karma < 0 || (index != null && index < 50) ? 0.7 : (index != null && index >= 80 ? 1.2 : (index != null && index >= 65 ? 1.1 : 1)));
        var sprintM = mult ? Number(mult.sprint) : 1;
        var totalM = mult ? Number(mult.total) : Math.round(trust * sprintM * 100) / 100;
        var season = s.contribution_season || {};
        var priority = newbie || index == null || (index >= 65 && karma >= 0);
        var autoOpen = index == null ? false : index >= 65;
        var welcome = index != null && index >= 80 ? 4 : 2;
        return {
            karma: karma, index: index, newbie: newbie, status: status || 'newbie', score: score,
            base: base, karmaMod: karmaMod, contribMod: contribMod, slots: slots, grantBonus: grantBonus,
            trust: trust, sprintM: sprintM, totalM: totalM, season: season, priority: priority,
            autoOpen: autoOpen, welcome: welcome, counts: c
        };
    }

    function chip(text, kind) {
        return '<button type="button" class="rep-chip' + (kind ? ' is-' + kind : '') + '" data-rep-open="' + esc(kind || '') + '">' + text + '</button>';
    }
    function profileStripHtml() {
        var m = model();
        var chips = [];
        if (m.grantBonus > 0) chips.push(chip(esc(t('profileChipGrant', { n: formatAmount(m.grantBonus) }, '🎁 Грант +' + formatAmount(m.grantBonus))), 'karma'));
        chips.push(chip(esc(t('profileChipReviews', { n: formatScore(m.totalM) }, '⭐ Отзывы ×' + formatScore(m.totalM))), 'reviews'));
        chips.push(chip(esc(t('profileChipSlots', { n: m.slots }, '📨 Слоты ' + m.slots)), 'reliability'));
        if (!m.autoOpen && !m.newbie) chips.push(chip(esc(t('profileChipAutoOff', {}, '⚠️ Авто-приём закрыт (<65%)')), 'reliability'));
        else if (m.contribMod > 0) chips.push(chip(esc(t('profileChipContrib', { n: m.contribMod }, '⚡ Вклад +' + m.contribMod + ' слота')), 'contribution'));
        var rows = [
            ['karma', t('metricKarma', {}, 'Карма'), t('profileRowGrant', { n: formatAmount(m.grantBonus) }, 'Бонус к гранту +' + formatAmount(m.grantBonus) + ' $BUST из 200')],
            ['karma', t('metricKarma', {}, 'Карма'), t('profileRowMarket', { n: formatScore(m.karma) }, 'Буст витрины +' + formatScore(m.karma) + ' очк.')],
            ['karma', t('metricKarma', {}, 'Карма'), t('profileRowKarmaSlots', { n: (m.karmaMod > 0 ? '+' : '') + m.karmaMod }, 'Слоты от кармы ' + (m.karmaMod > 0 ? '+' : '') + m.karmaMod)],
            [m.karma < 0 ? 'karma' : 'reliability', m.karma < 0 ? t('metricKarma', {}, 'Карма') : t('metricReliabilityV2', {}, 'Надёжность'), t('profileRowTrust', { n: formatScore(m.trust) }, 'Доверие отзывов ×' + formatScore(m.trust))],
            ['contribution', t('profileSprintCardLabel', {}, 'Вклад'), t('profileRowSprint', { n: formatScore(m.sprintM) }, 'Ускоритель спринта ×' + formatScore(m.sprintM))],
            ['reliability', t('metricReliabilityV2', {}, 'Надёжность'), t('profileRowSlots', { n: m.slots }, 'Бесплатные слоты рассылки: ' + m.slots)],
            ['contribution', t('profileSprintCardLabel', {}, 'Вклад'), t('profileRowContribSlots', { n: m.contribMod }, 'Бонус слотов за вклад +' + m.contribMod)],
            ['reliability', t('metricReliabilityV2', {}, 'Надёжность'), m.autoOpen ? t('profileRowAutoOn', {}, 'Авто-приём открыт') : t('profileChipAutoOff', {}, 'Авто-приём закрыт (<65%)')],
            ['reliability', t('metricReliabilityV2', {}, 'Надёжность'), t('profileRowWelcome', { n: m.welcome }, 'Старт Live +' + m.welcome + ' ⭐')],
            ['reliability', t('metricReliabilityV2', {}, 'Надёжность'), m.priority ? t('profileRowPoolOn', {}, 'Приоритетный пул рассылки') : t('profileRowPoolOff', {}, 'Базовый пул рассылки')]
        ];
        return '<div class="rep-influence-wrap"><details class="rep-influence"' + (influenceOpen ? ' open' : '') + '>' +
            '<summary>' + esc(t('profileInfluenceTitle', {}, '⚡ Влияние ваших показателей сейчас')) + '</summary>' +
            '<div class="rep-table">' + rows.map(function (row) {
                return '<button type="button" class="rep-row" data-rep-open="' + row[0] + '"><span>' + esc(row[1]) + '</span><strong>' + esc(row[2]) + '</strong></button>';
            }).join('') + '</div></details>' +
            '<div class="rep-chip-row">' + chips.join('') + '</div></div>';
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

    function reliabilityNow(tone) {
        var m = model();
        if (tone === 'is-showcase') {
            return t('reliabilityNowStatus', { status: t('reliabilityDashStatus_' + m.status, {}, m.status) }, 'Сейчас: ' + m.status);
        }
        if (tone === 'is-mail') {
            return m.priority ? t('profileRowPoolOn', {}, 'Приоритетный пул') : t('profileRowPoolOff', {}, 'Базовый пул');
        }
        if (tone === 'is-slots') return t('reliabilityNowSlots', { n: m.slots }, 'Сейчас у вас: ' + m.slots + ' слотов');
        if (tone === 'is-reviews') return t('reliabilityNowTrust', { n: formatScore(m.trust) }, 'Сейчас у вас: ×' + formatScore(m.trust));
        if (tone === 'is-welcome') return t('profileRowWelcome', { n: m.welcome }, 'Сейчас: +' + m.welcome + ' ⭐');
        return '';
    }

    function openTarget(kind) {
        if ((kind === 'market' || kind === 'contribution' || kind === 'karma' || kind === 'reliability' || kind === 'reviews') && typeof window.closeEarnBustModal === 'function') {
            window.closeEarnBustModal();
        }
        if (kind === 'karma' && typeof window.showKarmaInfo === 'function') return window.showKarmaInfo();
        if (kind === 'reliability' && typeof window.showReliabilityInfo === 'function') return window.showReliabilityInfo();
        if (kind === 'contribution' && typeof window.showContributionInfo === 'function') return window.showContributionInfo();
        if (kind === 'reviews' && window.ReviewCredits && typeof ReviewCredits.openBalance === 'function') return ReviewCredits.openBalance();
        if (kind === 'wallet' && typeof window.openEarnBustModal === 'function') return window.openEarnBustModal();
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
            '<p class="wallet-note">' + esc(t('walletPayNote', {}, 'Оплата идёт тем же контуром, что Private Testing: реквизиты PayPal / крипто и чат поддержки. $BUST зачисляет координатор после подтверждения, автоматически баланс не меняется.')) + '</p>' +
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
                '<div class="wallet-hero"><span>' + esc(t('walletAvailable', {}, 'Доступно')) + '</span><strong id="wallet-hero-balance">0</strong><small>💎 $BUST</small></div>' +
                '<div id="wallet-reserve" class="wallet-reserve" hidden></div>' +
                '<div class="wallet-tabs" role="tablist">' +
                '<button type="button" data-wallet-tab="topup">' + esc(t('walletTabTopup', {}, 'Пополнить')) + '</button>' +
                '<button type="button" data-wallet-tab="earn" class="is-on">' + esc(t('walletTabEarn', {}, 'Заработать')) + '</button>' +
                '<button type="button" data-wallet-tab="history">' + esc(t('walletTabHistory', {}, 'История')) + '</button></div>' +
                '<div id="wallet-panel-topup" hidden></div>' +
                '<div id="wallet-panel-earn"></div>' +
                '<div id="wallet-panel-history" hidden></div>' +
                '<button type="button" class="btn btn-secondary wallet-link" data-rep-open="market">' + esc(t('walletOpenContracts', {}, 'Платные контракты в Маркете')) + '</button>' +
                '<button type="button" class="btn btn-secondary wallet-link" data-rep-open="contribution">' + esc(t('walletOpenSprint', {}, 'Призовой пул Спринта')) + '</button>';
            if (title) title.textContent = t('walletTitle', {}, 'Кошелёк $BUST');
            if (desc) desc.hidden = true;
            var earn = shell.querySelector('#wallet-panel-earn');
            cards.forEach(function (card) { earn.appendChild(card); });
            if (closeBtn) content.insertBefore(shell, closeBtn);
            else content.appendChild(shell);
            content.dataset.walletReady = '1';
        }
        renderHero();
        setWalletTab(walletTab);
    }

    function karmaInfluenceHtml() {
        var m = model();
        var trust = m.karma < 0
            ? t('karmaInfluenceTrustBad', {}, '⚠️ Штраф ×0.70')
            : t('karmaInfluenceTrustOk', {}, '✓ Полный доступ');
        var slots = (m.karmaMod > 0 ? '+' : '') + m.karmaMod;
        return '<div class="karma-influence"><div class="karma-influence-title">' + esc(t('karmaInfluenceTitle', {}, 'Ваше текущее влияние кармы')) + '</div>' +
            '<div class="rep-chip-row">' +
            chip(esc(t('karmaInfluenceGrant', { n: formatAmount(m.grantBonus) }, 'Грант +' + formatAmount(m.grantBonus) + ' / 200')), 'karma') +
            chip(esc(t('karmaInfluenceMarket', { n: formatScore(m.karma) }, 'Витрина +' + formatScore(m.karma))), 'karma') +
            chip(esc(t('karmaInfluenceSlots', { n: slots }, 'Слоты ' + slots)), 'karma') +
            chip(esc(trust), 'karma') +
            '</div><p class="wallet-note">' + esc(t('karmaPlatformNote', {}, 'Карма за фидбэк — репутация от платформы и авторов. Очки Вклада за те же отчёты идут отдельно и кормят Спринт.')) + '</p></div>';
    }
    function paintKarmaInfluence() {
        var host = document.getElementById('karma-influence');
        if (host) host.innerHTML = karmaInfluenceHtml();
    }

    function contributionDashHtml(current, history) {
        var m = model();
        var life = history && history.lifetime ? history.lifetime : {};
        var score = life.contribution_lifetime_score != null ? life.contribution_lifetime_score : m.score;
        var me = current && current.me ? current.me : {};
        var counts = {
            bugs: me.bugs_count || life.bugs_count || m.counts.bugs_count || 0,
            ideas: me.ideas_count || life.ideas_count || m.counts.ideas_count || 0,
            reviews: me.play_reviews_count || life.play_reviews_count || m.counts.play_reviews_count || 0,
            screens: me.five_screens_count || life.five_screens_count || m.counts.five_screens_count || 0,
            texts: me.text_reports_count || life.text_reports_count || m.counts.text_reports_count || 0,
            videos: me.video_reports_count || life.video_reports_count || m.counts.video_reports_count || 0
        };
        var rate = stats().acceptance_rate_pct;
        var prices = [
            ['🐞', t('contribPriceBug', {}, 'Баг +5'), counts.bugs],
            ['💡', t('contribPriceIdea', {}, 'Идея +4'), counts.ideas],
            ['⭐', t('contribPriceReview', {}, 'Отзыв +3'), counts.reviews],
            ['🎬', t('contribPriceVideo', {}, 'Видео +1'), counts.videos],
            ['📸', t('contribPriceScreens', {}, '5 экранов +0.5'), counts.screens],
            ['📝', t('contribPriceText', {}, 'Текст +0.2'), counts.texts]
        ];
        return '<section class="contrib-dash">' +
            '<div class="contrib-dash-hero"><span>' + esc(t('contribLifetime', {}, 'Накопленный вклад')) + '</span><strong>' + esc(formatScore(score)) + ' ⚡</strong>' +
            '<small>' + esc(t('contribAccept', { n: rate == null ? '—' : formatScore(rate) }, 'Принято ' + (rate == null ? '—' : formatScore(rate) + '%'))) + '</small></div>' +
            '<div class="contrib-prices">' + prices.map(function (row) {
                return '<div><b>' + row[0] + ' ' + esc(row[1]) + '</b><span>' + esc(formatScore(row[2])) + '</span></div>';
            }).join('') + '</div>' +
            '<details class="contrib-influence"><summary>' + esc(t('contribInfluenceTitle', {}, 'Влияние вклада')) + '</summary>' +
            '<div class="contrib-cards">' +
            '<article><b>' + esc(t('contribInfSprint', { n: formatScore(m.sprintM) }, 'Ускоритель отзывов ×' + formatScore(m.sprintM))) + '</b><p>' + esc(t('contribInfSprintText', {}, 'Место прошлого Спринта умножает скорость бесплатных отзывов, до ×2.')) + '</p></article>' +
            '<article><b>' + esc(t('contribInfPool', {}, 'Призовой пул 2 000 $BUST')) + '</b><p>' + esc(t('contribInfPoolText', {}, 'Каждые 10 дней Топ-10 делит от 60 до 450 $BUST.')) + '</p></article>' +
            '<article><b>' + esc(t('contribInfSlots', { n: m.contribMod }, 'Слоты рассылки +' + m.contribMod)) + '</b><p>' + esc(t('contribInfSlotsText', {}, '10+ → +2, 50+ → +4, 100+ → +6 мест навсегда.')) + '</p></article>' +
            '<article><b>' + esc(t('contribInfMarket', {}, 'Фильтр Маркета')) + '</b><p>' + esc(t('contribInfMarketText', {}, 'Отдельного скрытого бейджа нет. Фильтр по вкладу доступен всем, а в подборе выше те, у кого вклад больше.')) + '</p></article>' +
            '</div></details></section>';
    }
    function paintContributionDash() {
        var host = document.getElementById('contribution-lifetime-dash');
        if (!host) return;
        host.innerHTML = contributionDashHtml(window._contributionCurrentCache, window._contributionHistoryCache);
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
        if (ev.target && ev.target.classList && ev.target.classList.contains('rep-influence')) influenceOpen = !!ev.target.open;
    }, true);
    document.addEventListener('click', function (ev) {
        var open = ev.target.closest && ev.target.closest('[data-rep-open]');
        if (open && open.getAttribute('data-rep-open')) {
            ev.preventDefault();
            openTarget(open.getAttribute('data-rep-open'));
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
    });
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
        mountWallet: mountWallet,
        paintKarmaInfluence: paintKarmaInfluence,
        paintContributionDash: paintContributionDash,
        formatScore: formatScore
    };
})();
