const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const guide = { innerHTML: '' };
const context = {
    console, window: null, lang: 'ru', myTests: [], incomingOffers: [],
    document: { getElementById: id => id === 'karma-how-list' ? guide : null },
    setTimeout() {},
};
context.window = context;
context.escapeHTML = value => String(value);
vm.createContext(context);
for (const file of ['i18n/ru.js', 'i18n/en.js', 'i18n/core.js', 'js/checkin-proof-upload.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
// Load the actual guide functions without unrelated market-page startup code.
const market = fs.readFileSync(path.join(root, 'ui/ui-market.js'), 'utf8');
const start = market.indexOf('function karmaHowValueHtml(');
const end = market.indexOf('\nfunction ', market.indexOf('function renderKarmaHowList(', start) + 1);
assert.ok(start >= 0 && end > start);
vm.runInContext(market.slice(start, end), context);
for (const lang of ['ru', 'en']) {
    context.lang = lang;
    assert.equal(context._renderCheckinProofProgress(0), '');
    for (const [count, amount] of [[1, '0.1'], [2, '0.1'], [3, '0.1'], [4, '0.2'], [5, '0.3']]) {
        const formatted = lang === 'ru' ? amount.replace('.', ',') : amount;
        const html = context._renderCheckinProofProgress(count);
        const chip = html.match(/<div class="checkin-proof-bonus-chip[^\"]*">([\s\S]*?)<\/div>/);
        assert.ok(chip && chip[1].includes('+' + formatted), `${lang}, ${count}: correct bonus chip`);
        assert.doesNotMatch(html, /0[.,][45]/);
        assert.ok(html.includes(count < 3 ? 'is-inactive' : 'is-active'));
    }
    context.renderKarmaHowList();
    for (const [key, amount] of [['karmaHowScreenshots', '0.1'], ['karmaHowScreenshots4', '0.2'], ['karmaHowScreenshots5', '0.3']]) {
        const label = context.t(key, {}, lang);
        assert.ok(guide.innerHTML.includes(label));
        const row = guide.innerHTML.slice(guide.innerHTML.indexOf(label)).split('</div>')[0];
        assert.ok(row.includes('+' + amount), `${lang}: guide ${key}`);
    }
}
let toast;
context.showCheckinRewardToasts = checkin => { toast = checkin; };
for (const [count, amount] of [[3, 0.1], [4, 0.2], [5, 0.3], [5, 0], [5, 0.5]]) {
    const result = { checkin: { earned_karma: amount, already_checked_today: false } };
    context._applyScreenshotCheckinResult(123, result, count);
    assert.equal(toast.earned_karma, amount, 'Respect server award, including zero and historical amounts');
}
toast = null;
context._applyScreenshotCheckinResult(123, { checkin: { earned_karma: 0, already_checked_today: true } }, 5);
assert.equal(toast, null, 'Replay must not display another reward');
console.log('Screenshot karma: RU/EN progress, guide, server amounts and replay passed');
