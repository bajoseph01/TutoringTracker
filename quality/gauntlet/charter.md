# Gauntlet Charter

Goal: Make after-school tutoring attendance and payment state obvious at a glance.
User: One tutor managing Maths and Afrikaans learners.
Primary journey: Preserve an existing learner, add parent contact, fund prepaid credit, create weekly lessons, and track each lesson's payment state.
Success: Existing data survives the upgrade, recurring lessons are duplicate-safe, prepaid balances reconcile, monthly totals remain accurate, and records persist.
Non-goals: Accounts, cloud sync, invoicing, multi-tutor access, and automated reminders.
Release surface: Local browser app, desktop-first with mobile support.

## Acceptance bars

| Facet | Pass threshold | Evidence |
|---|---|---|
| Primary task | Student and session can be created, edited, and deleted | Browser journey |
| Data integrity | Refresh preserves records and totals match session values | Browser journey + state assertions |
| Payment flow | Unpaid session appears in Payments and can be marked paid | Browser journey |
| Prepaid integrity | Top-up deducts per lesson; deleting a prepaid lesson refunds credit | State assertions |
| Recurrence | Weekly records run through end date and exact duplicates are skipped | Browser journey + state assertions |
| Legacy compatibility | Old student/session fields survive migration and later saves | Seeded legacy fixture |
| Responsive layout | No clipping at 1440x900 or 390x844 | Screenshots |
| Accessibility | Keyboard-operable date cells, labelled controls, visible focus | DOM inspection + browser journey |
| Delivery | Local URL responds successfully and relaunch command works | HTTP check |
