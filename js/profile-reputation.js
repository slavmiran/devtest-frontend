/* Profile reputation strip, bust watermark, wallet shell, contribution dash. */
(function () {
    'use strict';

    var PACKS = [
        { id: 'start', amount: 500, usd: 5 },
        { id: 'growth', amount: 1500, usd: 12, badge: 'popular' },
        { id: 'pro', amount: 3500, usd: 25, badge: 'value' },
        { id: 'max', amount: 8000, usd: 50 }
    ];
    var NOTE_MIN = 14;
    var selectedPack = 1500;
    var customMode = false;
    var walletTab = 'earn';
    var walletPayMethod = 'crypto';
    var historyFilter = 'all';
    var contribInfOpen = false;

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
        var rate = s.acceptance_rate_pct;
        return {
            karma: karma, index: index, newbie: newbie, status: status || 'newbie', score: score,
            base: base, karmaMod: karmaMod, contribMod: contribMod, slots: slots, grantBonus: grantBonus,
            trust: trust, sprintM: sprintM, totalM: totalM, season: season,
            priority: priority, autoOpen: autoOpen, welcome: welcome, counts: c, rate: rate
        };
    }

    function profileStripHtml() {
        return '';
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
            if (m.newbie) return lang() === 'ru' ? 'Новичок (нет штрафов)' : 'Newbie (no limits)';
            return m.autoOpen
                ? (lang() === 'ru' ? 'Авто-приём открыт (≥65%)' : 'Auto-accept open (≥65%)')
                : (lang() === 'ru' ? 'Авто-приём закрыт (<65%)' : 'Auto-accept closed (<65%)');
        }
        if (tone === 'is-mail') {
            return m.priority
                ? (lang() === 'ru' ? 'Приоритетная очередь' : 'Priority queue')
                : (lang() === 'ru' ? 'Обычная очередь' : 'Standard queue');
        }
        if (tone === 'is-slots') {
            return lang() === 'ru' ? ('Доступно: ' + m.slots + ' мест') : ('Available: ' + m.slots + ' seats');
        }
        if (tone === 'is-reviews') {
            return lang() === 'ru' ? ('Скорость ×' + formatScore(m.trust)) : ('Speed ×' + formatScore(m.trust));
        }
        if (tone === 'is-welcome') {
            return '+' + m.welcome + ' ⭐ Live';
        }
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
            if (typeof window.triggerGuestShowcaseNavigation === 'function') return window.triggerGuestShowcaseNavigation();
            if (typeof window.switchTab === 'function') window.switchTab('market');
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

    function packUsd(bustAmount) {
        var amt = Number(bustAmount || 0);
        if (!(amt > 0)) return 0;
        var preset = PACKS.find(function (p) { return p.amount === amt; });
        if (preset) return preset.usd;
        return Math.max(1, Math.round(amt * 0.008));
    }

    function renderTopup() {
        var host = document.getElementById('wallet-panel-topup');
        if (!host) return;
        var amount = packAmount();
        var valid = amount >= 100 && amount <= 20000;
        var usd = valid ? packUsd(amount) : 0;
        var desk = window.DevTestPaymentDesk || {};
        var methodsHtml = (typeof desk.renderMethodsHtml === 'function')
            ? desk.renderMethodsHtml(usd || 12, walletPayMethod)
            : '';
        host.innerHTML =
            '<div class="wallet-pack-grid">' + PACKS.map(function (pack) {
                var on = !customMode && selectedPack === pack.amount;
                var badge = pack.badge === 'popular'
                    ? '<em>' + esc(t('walletPackPopular', {}, 'Популярный')) + '</em>'
                    : (pack.badge === 'value' ? '<em class="is-value">' + esc(t('walletPackValue', {}, 'Выгодно')) + '</em>' : '');
                return '<button type="button" class="wallet-pack' + (on ? ' is-on' : '') + '" data-wallet-pack="' + pack.amount + '">' +
                    '<div class="wallet-pack-top"><strong>' + esc(formatAmount(pack.amount)) + ' <span>$BUST</span></strong>' + badge + '</div>' +
                    '<div class="wallet-pack-bottom"><small>' + esc(t('walletPack' + pack.id, {}, pack.id)) + '</small><b class="wallet-pack-usd">$' + pack.usd + '</b></div></button>';
            }).join('') + '</div>' +
            '<label class="wallet-custom"><span>' + esc(t('walletCustom', {}, 'Или введите свою сумму $BUST')) + '</span>' +
            '<input id="wallet-custom-amount" inputmode="numeric" min="100" max="20000" step="50" placeholder="100 – 20 000 $BUST" value="' + (customMode ? esc(String(amount || '')) : '') + '"></label>' +
            '<div id="wallet-gtw-methods-mount">' + methodsHtml + '</div>';
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
            '<button type="button" class="' + (historyFilter === 'all' ? 'is-on' : '') + '" data-wallet-filter="all">' + esc(t('walletFilterAll', {}, 'Все операции')) + '</button>' +
            '<button type="button" class="' + (historyFilter === 'grants' ? 'is-on' : '') + '" data-wallet-filter="grants">' + esc(t('walletFilterGrants', {}, 'Гранты')) + '</button></div>' +
            '<button type="button" class="ri-rules-btn ri-grants-open-btn" style="margin-bottom:10px" data-rep-open="grants">' +
            '<span class="ri-rules-btn-left"><span>🏆</span><span class="ri-grants-open-copy"><strong>' + esc(t('walletOpenGrantsSheet', {}, 'Подробная история грантов по проектам')) + '</strong><small>' + esc(t('walletGrantFormula', {}, 'База 50 + идеальный бонус 50 + карма × 5 (до 200)')) + '</small></span></span>' +
            '<span class="ri-rules-chevron" style="transform:rotate(-90deg)">▼</span></button>' +
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
                return '<button type="button" class="wallet-reserve-row" data-wallet-project="' + esc(row.id || '') + '"><span>' + esc(row.name) + '<small>' + esc(row.why) + '</small></span><b>' + esc(formatAmount(row.amount)) + ' 💎</b></button>';
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
        now.innerHTML = '<div class="wallet-earn-label">' + esc(t('walletEarnNow', {}, '⚡ Активные действия — получить сейчас')) + '</div>';
        var once = document.createElement('div');
        once.className = 'wallet-earn-group';
        once.innerHTML = '<div class="wallet-earn-label">' + esc(t('walletEarnOnce', {}, '🎯 Разовые бонусы')) + '</div>';
        var awards = document.createElement('div');
        awards.className = 'wallet-earn-group';
        awards.innerHTML = '<div class="wallet-earn-label">' + esc(t('walletEarnAwards', {}, '🏅 Награды в процессе тестирования')) + '</div>';

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
            btn.className = 'btn btn-primary';
            btn.style.cssText = 'width:100%;margin-top:10px';
            btn.setAttribute('data-rep-open', 'market');
            btn.textContent = t('walletOpenContracts', {}, 'Открыть Контракты в Маркете ›');
            contracts.closest('.card').appendChild(btn);
        }
        var invite = now.querySelector('[data-i18n="earnReferralTitle"], #t-earnReferralTitle');
        if (invite && !now.querySelector('[data-rep-open="guests"]')) {
            var guestBtn = document.createElement('button');
            guestBtn.type = 'button';
            guestBtn.className = 'btn btn-secondary';
            guestBtn.style.cssText = 'width:100%;margin-top:10px';
            guestBtn.setAttribute('data-rep-open', 'guests');
            guestBtn.textContent = t('walletOpenGuests', {}, 'К гостевым проектам ›');
            invite.closest('.card').appendChild(guestBtn);
        }
        var grantCard = awards.querySelector('#t-earnGrantTitle, [data-i18n="earnGrantTitle"]');
        if (grantCard && !awards.querySelector('[data-rep-open="grants"]')) {
            var grantBtn = document.createElement('button');
            grantBtn.type = 'button';
            grantBtn.className = 'btn btn-secondary';
            grantBtn.style.cssText = 'width:100%;margin-top:10px';
            grantBtn.setAttribute('data-rep-open', 'grants');
            grantBtn.textContent = t('reliabilityOpenGrants', {}, 'Открыть историю грантов ›');
            grantCard.closest('.card').appendChild(grantBtn);
        }
        earn.appendChild(now);
        earn.appendChild(once);
        earn.appendChild(awards);
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
            shell.className = 'wallet-shell gtw-overlay-vars';
            shell.innerHTML =
                '<div class="wallet-hero-card">' +
                '<div class="wallet-hero-top">' +
                '<div class="wallet-hero-emblem" aria-hidden="true">💎</div>' +
                '<div class="wallet-hero-main">' +
                '<div class="wallet-hero-kicker">' + esc(t('walletHeroKicker', {}, 'Доступный баланс кошелька')) + '</div>' +
                '<div class="wallet-hero"><strong id="wallet-hero-balance">0</strong><small>$BUST</small></div>' +
                '</div></div>' +
                '<div id="wallet-reserve" class="wallet-reserve" hidden></div></div>' +
                '<div class="wallet-tabs" role="tablist">' +
                '<button type="button" data-wallet-tab="topup">💳 ' + esc(t('walletTabTopup', {}, 'Пополнить')) + '</button>' +
                '<button type="button" data-wallet-tab="earn" class="is-on">🎯 ' + esc(t('walletTabEarn', {}, 'Заработать')) + '</button>' +
                '<button type="button" data-wallet-tab="history">📜 ' + esc(t('walletTabHistory', {}, 'История')) + '</button></div>' +
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
        var cards = [
            '<div class="karma-inf-card is-bonus">' +
                '<div class="karma-inf-row"><span class="karma-inf-label">💰 ' + esc(lang() === 'ru' ? 'Бонус к Гранту за 14 дней' : '14-day Grant bonus') + '</span>' +
                '<strong class="karma-inf-val">+' + esc(formatAmount(m.grantBonus)) + ' $BUST</strong></div>' +
                '<small>' + esc(lang() === 'ru' ? ('Формула: Карма × 5 · максимум +200 $BUST к каждому гранту') : ('Formula: Karma × 5 · up to +200 $BUST per grant')) + '</small>' +
            '</div>',
            '<div class="karma-inf-card is-bonus">' +
                '<div class="karma-inf-row"><span class="karma-inf-label">🚀 ' + esc(lang() === 'ru' ? 'Приоритет ваших проектов в Маркете' : 'Market priority for your apps') + '</span>' +
                '<strong class="karma-inf-val">' + (m.karma >= 0 ? '+' : '') + esc(formatScore(m.karma)) + '</strong></div>' +
                '<small>' + esc(lang() === 'ru' ? 'Прямая прибавка к рейтингу показа ваших приложений во взаимном тестировании' : 'Direct boost to your apps visibility in mutual testing') + '</small>' +
            '</div>'
        ];
        if (m.karma < 0) {
            cards.push(
                '<div class="karma-inf-card is-limit">' +
                    '<div class="karma-inf-row"><span class="karma-inf-label">⚠️ ' + esc(lang() === 'ru' ? 'Штраф к накоплению отзывов' : 'Review quota penalty') + '</span>' +
                    '<strong class="karma-inf-val">×0.70</strong></div>' +
                    '<small>' + esc(lang() === 'ru' ? 'При отрицательной карме бесплатная квота отзывов копится на 30% медленнее' : 'Negative karma slows free review quota accumulation by 30%') + '</small>' +
                '</div>'
            );
        }
        return '<div class="karma-influence">' +
            '<div class="karma-inf-grid">' + cards.join('') + '</div></div>';
    }
    function paintKarmaInfluence() {
        var host = document.getElementById('karma-influence');
        if (host) host.innerHTML = karmaInfluenceHtml();
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
            '<div class="contrib-dash-top">' +
            '<div><span class="contrib-dash-kicker">' + esc(t('contribLifetime', {}, 'Вклад за всё время')) + '</span>' +
            '<strong>' + esc(formatScore(score)) + ' ⚡</strong></div>' +
            '<span class="contrib-quality-pill">' + esc(t('contribAcceptQuality', { n: rate == null ? '—' : formatScore(rate) }, '✓ Качество отчётов (принято): ' + (rate == null ? '—' : formatScore(rate) + '%'))) + '</span>' +
            '</div>' +
            '<div class="contrib-prices">' + prices.map(function (row) {
                return '<div><b>' + row[0] + ' ' + esc(row[1]) + '</b><span>' + esc(formatScore(row[2])) + '</span></div>';
            }).join('') + '</div></div>' +
            '<details class="contrib-influence-acc"' + (contribInfOpen ? ' open' : '') + '>' +
            '<summary class="ri-rules-btn contrib-influence-btn">' +
            '<span class="ri-rules-btn-left">⚡ ' + esc(t('contribInfluenceTitle', {}, 'Влияние вклада на профиль')) + '</span>' +
            '<span class="ri-rules-chevron">▼</span></summary>' +
            '<div class="contrib-cards">' +
            '<article class="is-bonus"><div class="contrib-card-head"><b>⭐ ' + esc(t('contribInfSprint', { n: formatScore(m.sprintM) }, 'Ускоритель отзывов ×' + formatScore(m.sprintM))) + '</b></div><p>' + esc(t('contribInfSprintText', {}, 'Место прошлого Спринта умножает скорость набора квоты отзывов, максимум ×2.')) + '</p></article>' +
            '<article class="is-bonus"><div class="contrib-card-head"><b>🏆 ' + esc(t('contribInfPool', {}, 'Призовой пул 2 000 $BUST / 10 дней')) + '</b></div><p>' + esc(t('contribInfPoolText', {}, 'Топ-10 получает от 60 до 450 $BUST.')) + '</p></article>' +
            '<article class="is-bonus"><div class="contrib-card-head"><b>🔍 ' + esc(t('contribInfMarket', {}, 'Фильтр Маркета по вкладу')) + '</b></div><p>' + esc(t('contribInfMarketText', {}, 'В подборе контрагентов выше те, у кого вклад больше, при выставлении фильтра.')) + '</p></article>' +
            '<article class="is-bonus"><div class="contrib-card-head"><b>📨 ' + esc(t('contribInfSlots', { n: m.contribMod }, 'Слоты рассылки +' + m.contribMod)) + '</b></div><p>' + esc(t('contribInfSlotsText', {}, '10+ даёт +2 места, 50+ даёт +4, 100+ даёт +6 — навсегда.')) + '</p></article>' +
            '</div></details></section>';
    }
    function paintContributionDash() {
        var host = document.getElementById('contribution-lifetime-dash');
        if (!host) return;
        host.innerHTML = contributionDashHtml();
        var dup = document.getElementById('contribution-lifetime-actions');
        if (dup) {
            dup.hidden = true;
            dup.style.display = 'none';
        }
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
        if (ev.target.classList.contains('contrib-influence-acc')) contribInfOpen = !!ev.target.open;
    }, true);

    document.addEventListener('click', function (ev) {
        var aboutBtn = ev.target.closest && ev.target.closest('[data-metric-about-toggle]');
        if (aboutBtn) {
            ev.preventDefault();
            var key = aboutBtn.getAttribute('data-metric-about-toggle');
            var box = document.getElementById('metric-about-' + key);
            if (box) {
                box.hidden = !box.hidden;
                aboutBtn.classList.toggle('is-active', !box.hidden);
            }
            return;
        }
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

        var exRow = ev.target.closest && ev.target.closest('#wallet-panel-topup .gtw-exchange-pick-row');
        if (exRow) {
            ev.preventDefault();
            ev.stopPropagation();
            var exId = exRow.getAttribute('data-exchange');
            var bustAmt = packAmount();
            if (!(bustAmt >= 100)) bustAmt = 1500;
            walletPayMethod = 'crypto';
            if (window.DevTestPaymentDesk && typeof DevTestPaymentDesk.openBustPaymentFlow === 'function') {
                DevTestPaymentDesk.openBustPaymentFlow({
                    bustAmount: bustAmt,
                    usdBase: packUsd(bustAmt),
                    method: 'crypto',
                    exchangeId: exId
                });
            }
            return;
        }

        var methodCard = ev.target.closest && ev.target.closest('[data-wallet-gtw-method]');
        if (methodCard) {
            var mKey = methodCard.getAttribute('data-wallet-gtw-method');
            walletPayMethod = mKey || 'crypto';
            var bAmt = packAmount();
            if (!(bAmt >= 100)) bAmt = 1500;
            renderTopup();
            if ((mKey === 'paypal' || mKey === 'rub') && window.DevTestPaymentDesk && typeof DevTestPaymentDesk.openBustPaymentFlow === 'function') {
                DevTestPaymentDesk.openBustPaymentFlow({
                    bustAmount: bAmt,
                    usdBase: packUsd(bAmt),
                    method: mKey
                });
            }
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
        var usd = valid ? packUsd(amount) : 0;
        document.querySelectorAll('[data-wallet-pack]').forEach(function (btn) { btn.classList.remove('is-on'); });
        var mount = document.getElementById('wallet-gtw-methods-mount');
        if (mount && window.DevTestPaymentDesk && typeof DevTestPaymentDesk.renderMethodsHtml === 'function') {
            mount.innerHTML = DevTestPaymentDesk.renderMethodsHtml(usd || 12, walletPayMethod);
        }
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
