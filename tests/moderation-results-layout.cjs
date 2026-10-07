const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const output = path.resolve(root, '../artifacts/moderation-results');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="\.\/([^"?]+)/g)].map(match => match[1]);

(async () => {
    fs.mkdirSync(output, {recursive: true});
    const browser = await chromium.launch({headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome'});
    try {
        for (const language of ['ru', 'en']) for (const width of [320, 390, 430]) {
            const page = await browser.newPage({viewport: {width, height: 1000}, deviceScaleFactor: 1});
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.route('http://fixture.local/**', route => route.fulfill({contentType: 'text/html', body: '<html><body><div id="tab-projects"><div id="projects-list"></div></div></body></html>'}));
            await page.goto('http://fixture.local/');
            for (const file of styles) if (fs.existsSync(path.join(root, file))) await page.addStyleTag({path: path.join(root, file)});
            await page.addStyleTag({content: 'body{margin:0;padding:12px;background:#0e1116;color:#f4f6f8;font-family:system-ui,sans-serif}#tab-projects{display:block}'});
            for (const file of ['i18n/ru.js', 'i18n/en.js']) await page.addScriptTag({path: path.join(root, file)});
            await page.evaluate(language => {
                window.lang = language;
                window.currentLang = language;
                window.t = (key, params = {}) => {
                    let value = (language === 'ru' ? window.I18NRU : window.I18NEN)[key] || key;
                    for (const [key, param] of Object.entries(params)) value = value.split('{' + key + '}').join(param);
                    return value;
                };
                window.escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
                window.renderIcon = () => '<div class="avatar">N</div>';
                window.myProjects = [];
                window.archivedProjects = [{app_id:30, name:'Newbotadd garant', package_name:'com.slavmiran.quickchatnewonemore',
                    status:'completed', phase:'moderation', run_iteration:2, icon_url:'icon-test',
                    bugs_total_count:1, bugs_new_count:1, reviews_total_count:1, feedback_total_count:2, feedback_new_count:1,
                    results_summary:{models_count:2, countries_count:1, screenshots_count:10, checkins_count:3,
                        coverage_tuples:[['nothing a142',16], ['nothing phone 2a',16]], countries_list:['VN'], bugs_total_count:1, bugs_new_count:1}}];
            }, language);
            for (const file of ['ui/ui-projects-pipeline-header.js', 'js/project-results.js', 'ui/ui-projects-moderation.js']) await page.addScriptTag({path: path.join(root, file)});
            const check = await page.evaluate(() => {
                const project = collectPipelineProjectsByPhase().moderation[0];
                if (project.results_summary.models_count !== 2 || project.icon_url !== 'icon-test' || project.run_iteration !== 2) throw new Error('Archive mapping lost fields');
                const card = buildModerationCard(project);
                document.getElementById('projects-list').appendChild(card);
                const shell = card.querySelector('.moderation-overview');
                const results = card.querySelector('.pc-results-card');
                const actions = card.querySelector('.moderation-decision-panel');
                const boundary = shell.getBoundingClientRect();
                return {
                    shells: card.children.length,
                    resultsInside: shell.contains(results), actionsInside: shell.contains(actions),
                    models: !!card.querySelector('.pc-results-tile--models'), countries: !!card.querySelector('.pc-results-tile--countries'),
                    bugs: !!card.querySelector('.pc-results-tile--bugs'), empty: !!card.querySelector('.pc-results-grid__empty'),
                    resultRadius: getComputedStyle(results).borderRadius, actionRadius: getComputedStyle(actions).borderRadius,
                    shellRadius: getComputedStyle(shell).borderRadius,
                    shellBottom: getComputedStyle(shell).borderBottomWidth,
                    allWithin: Array.from(card.querySelectorAll('.moderation-overview-body,.pc-results-card,.moderation-decision-panel')).every(element => {
                        const rect = element.getBoundingClientRect();
                        return rect.left >= boundary.left && rect.right <= boundary.right + 1 && rect.bottom <= boundary.bottom + 1;
                    }),
                    overflow: document.documentElement.scrollWidth > window.innerWidth,
                    phases: card.querySelectorAll('.moderation-phase').length,
                    packageHidden: !card.textContent.includes(project.package),
                    resultsFirst: results.getBoundingClientRect().bottom < card.querySelector('.moderation-info-block').getBoundingClientRect().top,
                };
            });
            assert.equal(check.shells, 1, 'One outer shell, not three disconnected cards');
            assert(check.resultsInside && check.actionsInside && check.allWithin);
            assert(check.models && check.countries && check.bugs && !check.empty, 'Real data must populate results');
            assert.equal(check.resultRadius, '0px'); assert.equal(check.actionRadius, '0px');
            assert(parseFloat(check.shellRadius.split(' ').at(-1)) > 0, JSON.stringify(check));
            assert(parseFloat(check.shellBottom) > 0, 'The card must have a closed bottom border');
            assert.equal(check.phases, 3);
            assert(check.packageHidden && check.resultsFirst);
            assert(!check.overflow, 'No horizontal overflow on narrow screens');
            assert.deepEqual(errors, []);
            await page.screenshot({path: path.join(output, `moderation-${language}-${width}.png`), fullPage: true});
            await page.evaluate(() => {
                const card = document.getElementById('project-card-30');
                const fresh = key => card.querySelector('.pc-results-tile--' + key).classList.contains('has-new');
                if (!fresh('models') || !fresh('countries')) throw new Error('Fixture must start unseen');
                markProjectCoverageSeen(30, {coverage_tuples: [['nothing a142',16], ['nothing phone 2a',16]]});
                if (fresh('models') || !fresh('countries')) throw new Error('Archive model view must update immediately and preserve country badge');
                markProjectCoverageSeen(30, {countries_list:['VN']});
                if (fresh('countries') || !fresh('bugs')) throw new Error('Country view must update immediately without clearing feedback');
                // Same shared refresh path for active testing and live cards.
                window.myProjects = [Object.assign({}, archivedProjects[0], {id:30, phase:'live'})];
                window.archivedProjects = [];
                localStorage.clear();
                card.querySelector('.pc-results-block-slot').innerHTML = buildProjectResultsBlock(myProjects[0]);
                markProjectCoverageSeen(30, myProjects[0].results_summary);
                if (fresh('models') || fresh('countries')) throw new Error('Active project refresh regressed');
            });
            await page.close();
        }
        console.log('Moderation results: archive data and unified geometry passed in RU/EN at 320/390/430px');
    } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
