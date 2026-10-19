# devtest-frontend
12 testers

Live-шапка и полноэкранный паспорт Google Play: `js/play-store-passport.js`,
`css/play-store-passport.css`. Контракт API, хранение и проверки описаны в
[LIVE_PLAY_STORE_PASSPORT.md](../docs/LIVE_PLAY_STORE_PASSPORT.md).

Внутренние Live-метрики: `js/live-project-metrics.js`, `css/live-project-metrics.css`.
Формулы, ключевики, API и проверки: [LIVE_PROJECT_METRICS.md](../docs/LIVE_PROJECT_METRICS.md).

Экран «Пульс проекта»: `js/live-metrics-modal.js`, `css/live-metrics-modal.css`.
Шкалы, формулы, режим примера и проверки:
[LIVE_METRICS_ANALYTICS.md](../docs/LIVE_METRICS_ANALYTICS.md).

## Activity and project details

- Reminder assessment from My Tests targets the developer on the reciprocal
  project, not the viewer's participation on the developer's app. Missing roster
  data is read through the authenticated projects endpoint without switching tabs
  or replacing global state; late responses cannot repaint a closed/new sheet.
- Developer details reuse the incoming-offer dossier icon and link to the owner
  with reciprocal project context (or the general dossier when no pair exists).
- The current day uses the buffer theme color immediately on pending completion,
  including `14/14`, without changing day or buffer-duration calculations.
- Ordinary mutual testers enter Attention for 3+ closed consecutive skips. The
  standalone 2-skip scenario is removed, including its card and translations.
  Current control days do not lower that threshold. Separate causes (never
  opened, broken links, debt/direct obligations and past missing proofs) remain.

Regression: `node tests/activity-context-developer-buffer.cjs` and
`node tests/my-tests-reminder-regressions.cjs`.
