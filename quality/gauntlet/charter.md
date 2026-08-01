# Gauntlet Charter

Goal: Make after-school tutoring attendance and payment state obvious at a glance.
User: One tutor managing Maths and Afrikaans learners.
Primary journey: Add a learner, book a lesson on a date, and mark it paid.
Success: Accurate monthly totals, persistent records, quick scanning, and no ambiguous payment state.
Non-goals: Accounts, cloud sync, invoicing, multi-tutor access, and automated reminders.
Release surface: Local browser app, desktop-first with mobile support.

## Acceptance bars

| Facet | Pass threshold | Evidence |
|---|---|---|
| Primary task | Student and session can be created, edited, and deleted | Browser journey |
| Data integrity | Refresh preserves records and totals match session values | Browser journey + state assertions |
| Payment flow | Unpaid session appears in Payments and can be marked paid | Browser journey |
| Responsive layout | No clipping at 1440×900 or 390×844 | Screenshots |
| Accessibility | Keyboard-operable date cells, labelled controls, visible focus | DOM inspection + browser journey |
| Delivery | Local URL responds successfully and relaunch command works | HTTP check |
