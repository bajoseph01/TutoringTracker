# Tutoring Tracker

A private, local-first MVP for tracking tutoring sessions, learner subjects, payment status, and monthly income.

## Run it

```powershell
cd "D:\Users\bajos\OneDrive - Merrifield Prep & College\2026_Coding\TutoringTracker"
npm start
```

Then open <http://127.0.0.1:4173>.

## Verify it

With Microsoft Edge installed, run:

```powershell
npm run check
npm run qa
```

The QA journey starts with legacy-format learner data, verifies it survives migration, then checks contacts, prepaid credit, weekly recurrence, duplicate prevention, payment totals, refunds, refresh persistence, and desktop/mobile renders.

## What works

- Full-screen monthly calendar with Maths and Afrikaans session bars
- Add, edit, and delete students
- Optional parent names and clickable WhatsApp contacts
- Add, edit, and delete sessions by clicking a calendar date
- Automatically create weekly lessons through a chosen end date
- Paid / still-to-pay status with a one-click payment action
- Prepaid learner credit with top-ups, lesson deductions, and deletion refunds
- Monthly hours, earned revenue, and outstanding revenue totals
- Payments overview separating earned lessons, outstanding fees, and unused credit
- Browser-local persistence (no account or cloud service required)

## MVP limitation

The data is stored only in this browser's local storage. Clearing browser storage or using another device will not carry the data across. Export/backup, sync, and invoices are candidates for the next version.
