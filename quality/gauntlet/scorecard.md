# Feature Acceptance Scorecard

Environment: Microsoft Edge (headless), Windows, 1440x900 desktop and 390x844 mobile viewports, 1 August 2026.

| Gate | Result | Evidence |
|---|---|---|
| Calendar boots with 42 date cells | Pass | Automated browser assertion |
| Legacy migration | Pass | Existing learner and lesson retain IDs, values, notes, fee, and status |
| Parent contact | Pass | Optional parent name and South African WhatsApp shortcut saved |
| Prepaid top-up | Pass | R1,000 added and displayed on learner and Payments views |
| Weekly recurrence | Pass | Four dated lessons created through 2 September; exact duplicates skipped |
| Credit deductions | Pass | Four R200 lessons leave R200 from a R1,000 top-up |
| Credit refund | Pass | Deleting one prepaid lesson restores R200 |
| Per-lesson payment | Pass | Separate unpaid session appears and can be marked paid |
| Monthly calculations | Pass | Three August recurring hours produce R600 before extra lesson |
| Refresh persistence | Pass | Sessions, paid state, contacts, and legacy data persist after reload |
| Desktop visual layout | Pass | `evidence/desktop-calendar.png` inspected: no clipping or overlap |
| Students and Payments layout | Pass | Contact, credit badges, summaries, and empty state inspected |
| Mobile visual layout | Pass | `evidence/mobile-calendar.png` inspected: controls reflow; calendar scroll is intentional |
| Dependency audit | Pass | 0 known vulnerabilities |

Critic mode: reduced independence because project instructions did not authorize sub-agent delegation. The actual rendered artifact and automated journey were inspected directly. No critical or high-severity gaps remain for this focused feature delivery.

Largest future gap: data is browser-local with no export/backup or multi-device sync. This upgrade deliberately retains the `tutoringTracker.v1` storage key and migrates records in place.
