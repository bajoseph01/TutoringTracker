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

The QA journey adds a student and lesson, checks totals and payment persistence, and captures desktop and mobile evidence in `quality/gauntlet/evidence/`.

## What works

- Full-screen monthly calendar with Maths and Afrikaans session bars
- Add, edit, and delete students
- Add, edit, and delete sessions by clicking a calendar date
- Paid / still-to-pay status with a one-click payment action
- Monthly hours, earned revenue, and outstanding revenue totals
- All-time payments overview
- Browser-local persistence (no account or cloud service required)

## MVP limitation

The data is stored only in this browser's local storage. Clearing browser storage or using another device will not carry the data across. Export, backup, sync, recurring bookings, and invoices are candidates for the next version.
