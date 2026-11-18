# Live project card controls

Phase-2 Test, 2026-11-18.

- Quick Start retains all three onboarding steps, including completed Passport
  and history. Run 1 has no previous test to import; later runs offer import when
  the server says it is available. Missing history is explicit rather than marked
  complete. Calibration uses a six-pixel progress bar and clickable milestone help.
- Campaign cards start immediately below the section header. Pace, admission and
  pace signals belong to the Project parameters disclosure header. Opening it
  reveals their controls at the same location.
- Custom campaigns expose an accessible SVG priority pin beside their switch.
  Scenario creation and the neutral SVG archive/delete button live inside Details.
  Archive has confirmation and server checks for unfinished work.
- The full-width feedback split tile opens project-wide internal Live experience
  settings on the left and Bridge test review settings on the right. Campaigns
  can request mutual text feedback; they cannot override project mode, bonus or
  schedule. The Blueprint timeline reads the project settings cache.
- Quick settings owns Passport, Telegram Market and Telegram topics. Market opens
  in the capture handler because the drawer intentionally stops bubbling. Opening
  the tile does not publish or charge. The Passport and post show available age
  data; missing timestamps are not invented. Icons use the same bordered SVG well.
- Coverage and experience retains its horizontal swipe strip and every existing
  metric. Experience is one more standard compact tile, including the zero state.
  New internal responses show `+N` and sort with other new results; otherwise it
  shows the available average and response count. The three criterion scores
  stay in detailed analytics. Its action opens the Feedback Center filtered to internal impressions.
  The Center has no Telegram banner. A connection link appears only inside an
  owner's private scenario or impression ticket when no effective chat exists.

Browser regression coverage uses real render modules with signed API fixtures in
RU/EN at 360, 390 and 430 pixels. It checks page overflow, completed onboarding,
collapsed priority changes, details visibility, working Market click, project
settings, copied profile defaults and empty reply protection. The full index test
also exercises all bottom navigation tabs. Screenshots are under the workspace's
`artifacts/live-card-polish-20261118` directory.
