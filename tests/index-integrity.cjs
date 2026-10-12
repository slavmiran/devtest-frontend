const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.doesNotMatch(html, /^(?:<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)/m, 'Conflict markers must never be committed into HTML');
const scripts = new Set();
for (const element of html.matchAll(/<(?:script|link)\b[^>]*>/g)) {
    const source = element[0].match(/(?:src|href)="([^"]+)"/);
    if (!source || !source[1].startsWith('./')) continue;
    const file = source[1].split('?')[0];
    assert(fs.existsSync(path.join(root, file)), 'Entry point references a missing branch asset: ' + file);
    if (element[0].startsWith('<script')) {
        assert(!scripts.has(file), 'Script loaded twice: ' + file);
        scripts.add(file);
    }
}
console.log('Index integrity: no conflict markers, duplicate scripts or missing local assets');
