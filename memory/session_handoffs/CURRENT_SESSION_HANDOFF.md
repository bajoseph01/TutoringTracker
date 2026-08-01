# TutoringTracker Current Session Handoff

## Where it started

TutoringTracker began as a browser-local monthly tutoring calendar for Maths and Afrikaans at R200/hour. It now has recurring lessons, per-lesson and prepaid payments, parent/WhatsApp fields, backup transfer, GitHub Pages, and private Google Apps Script cloud sync.

## Decisions locked + what shipped

- Session status is `scheduled`, `completed`, or `cancelled`.
- Legacy sessions without status migrate by date: before today becomes completed; today/future becomes scheduled. Existing student, session, payment, fee, note, recurrence, and credit values are preserved.
- Hours taught and Earned so far count completed lessons only.
- Month projected counts completed plus scheduled lessons; cancelled lessons are excluded.
- Still to pay and the Payments unpaid list count completed unpaid lessons only.
- Calendar bars visibly distinguish upcoming, completed, and cancelled lessons.
- Clicking an upcoming lesson exposes a one-click Mark completed action; the edit form also has a Lesson status selector.
- Google deployment ID `AKfycbym58_3K-Rm0jUfFiqPD7KtHtI019VL7YwGKvOIjv-F4IqwuGtZPeQugI-CrVJ4NiUUfw` was redeployed at version 3.
- GitHub commit: `b924a92` (`Separate scheduled lessons from earned income`).

## Key files for next session

- `D:\Users\bajos\OneDrive - Merrifield Prep & College\2026_Coding\TutoringTracker\app.js`
- `D:\Users\bajos\OneDrive - Merrifield Prep & College\2026_Coding\TutoringTracker\index.html`
- `D:\Users\bajos\OneDrive - Merrifield Prep & College\2026_Coding\TutoringTracker\styles.css`
- `D:\Users\bajos\OneDrive - Merrifield Prep & College\2026_Coding\TutoringTracker\qa.mjs`
- `D:\Users\bajos\OneDrive - Merrifield Prep & College\2026_Coding\TutoringTracker\apps-script\`

## Running state

- Local: `http://127.0.0.1:4173`
- GitHub Pages: `https://bajoseph01.github.io/TutoringTracker/`
- Private school-domain cloud app: `https://script.google.com/a/macros/mpsc.co.za/s/AKfycbym58_3K-Rm0jUfFiqPD7KtHtI019VL7YwGKvOIjv-F4IqwuGtZPeQugI-CrVJ4NiUUfw/exec`
- GitHub repository: `https://github.com/bajoseph01/TutoringTracker`
- Cloud access is owner-only through `bjoseph@mpsc.co.za`.

## Verification - how to confirm things still work

From the project folder run:

```powershell
npm run build:gas
npm run check
npm run qa
```

The latest run passed 42 browser checks at 1440x900 and 390x844. Inspect `quality/gauntlet/evidence/desktop-calendar.png`, `desktop-payments.png`, and `mobile-calendar.png`. GitHub Pages deployment run `30720920004` completed successfully. The cloud deployment reports version 3.

## Deferred + open questions

- Invoices and automated WhatsApp reminders remain future features.
- Prepaid credit is currently deducted when the lesson is booked; decide later whether a separate reserved-versus-used credit model is worthwhile.

## Pick up here

Have Mr Jo refresh the tracker, confirm July lessons appear completed and August recurring lessons appear upcoming, and adjust any exceptional lesson using Lesson status. Preserve the storage key `tutoringTracker.v1`.

## New Chat Prompt

```text
Continue the TutoringTracker project in D:\Users\bajos\OneDrive - Merrifield Prep & College\2026_Coding\TutoringTracker. Read memory\session_handoffs\CURRENT_SESSION_HANDOFF.md first. Preserve all students and the tutoringTracker.v1 storage key. Verify changes with npm run build:gas, npm run check, npm run qa, visual screenshots, GitHub Pages, and the private mpsc.co.za Apps Script deployment.
```
