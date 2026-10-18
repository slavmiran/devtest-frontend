/* The chip and balance must agree on the partner's closed-day skip streak. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

(async () => {
    for (const language of ['ru', 'en']) {
        const body = {innerHTML: ''};
        const elements = {'mutual-balance-body': body, 'mutual-balance-title': {},
            'mutual-balance-modal': {classList: {add() {}, remove() {}}}};
        const context = vm.createContext({lang: language, userId: 880, myTests: [],
            document: {getElementById: id => elements[id]},
            escapeHTML: value => String(value),
        });
        context.window = context;
        context.t = (key, params = {}) => {
            const labels = language === 'ru' ? context.I18NRU : context.I18NEN;
            return String(labels[key] || key).replace(/\{(\w+)\}/g, (_, k) => params[k]);
        };
        for (const file of ['i18n/ru.js', 'i18n/en.js', 'js/mutual-exchange-ui.js']) {
            vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
        }
        for (const skips of [0, 1, 2, 3, 4]) {
            const state = {version: 1, is_broken: false, is_mutual_debt: false,
                left: {leg_status: 'active', metrics: {testing_days: 8, skips: 0, consecutive_skips: 0}},
                right: {leg_status: 'active', metrics: {testing_days: 7, skips: 4, consecutive_skips: skips}}};
            const test = {id: 9, name: 'NexaStream', owner_id: 584, owner_username: 'Railancosta',
                join_type: 'mutual', reciprocal_app_id: 1225, reciprocal_app_name: 'QuickSweep',
                progress_status: 'active', partner_active: true,
                // A stale flat field or total skips must not override the canonical streak.
                partner_consecutive_skips: 99, partner_skips: 99, exchange_state: state};
            context.myTests = [test];
            context.fetch = async () => ({ok: true, json: async () => ({status: 'success', exchange_state: state})});
            const chip = context.getBarterChipState(test);
            assert.equal(chip.kind, skips >= 3 ? 'warning' : 'ok');
            assert.equal(context.buildBarterChipHtml(test).includes('accent-orange'), skips >= 3);
            context.openMutualBalanceModal(9);
            // Resolve both fetch/json promises and the render continuation.
            await new Promise(resolve => setImmediate(resolve));
            assert(body.innerHTML.includes(context.t('mutualBalanceConsecutiveChip', {count: skips})));
            assert.equal((body.innerHTML.match(/parity-chip is-warn/g) || []).length, skips >= 3 ? 1 : 0);
            context.closeMutualBalanceModal();
        }
    }
    console.log('Barter chip and exchange modal agree for 0–4 consecutive skips in RU/EN; total/stale flat skips cannot trigger a warning.');
})().catch(error => {console.error(error); process.exitCode = 1;});
