const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const nodes = new Map();
const node = id => {
    if (!nodes.has(id)) nodes.set(id, {innerText: '', classList: {toggle() {}}});
    return nodes.get(id);
};
const config = {mutualPanel: 'mutual', bountyPanel: 'bounty', calcPerTester: 'rate',
    calcDaily: 'daily', calcHold: 'hold', calcTotal: 'total', balanceBadge: 'balance'};
const context = {window: {}, document: {getElementById: node}, visibilityStats: {balance_bust: 2400},
    getProjectFormConfig: () => config, formatBustAmount: Number};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/project-contract-pricing.js'), 'utf8'), context);
context.ProjectContractPricing = context.window.ProjectContractPricing;
const source = fs.readFileSync(path.join(root, 'js/app-features.js'), 'utf8');
vm.runInContext(source.slice(source.indexOf('function updateProjectPricing('), source.indexOf('\nfunction resetProjectForms(')), context);
for (const form of ['add', 'edit']) {
    for (const mode of ['mutual', 'bounty', 'hybrid']) {
        context.getProjectPricingState = () => ({mode, bountyPerTester: 200, limitBounty: 8});
        context.updateProjectPricing(form);
        assert.equal(node('daily').innerText, mode === 'mutual' ? 0 : 130);
        assert.equal(node('hold').innerText, mode === 'mutual' ? 0 : 70);
        assert.equal(node('total').innerText, mode === 'mutual' ? 0 : 1600);
        assert.equal(node('balance').innerText, 2400);
    }
}
console.log('Existing add/edit calculators use shared pricing; mutual zero, Daily 65%, Hold 35% and budget passed.');
