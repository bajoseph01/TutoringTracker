# Tutoring Tracker

A private tutoring dashboard for tracking sessions, learner subjects, payment status, prepaid credit, and monthly income. The hosted version syncs through the owner's Google account to a private Google Sheet.

## Open the private cloud app

<https://script.google.com/macros/s/AKfycbym58_3K-Rm0jUfFiqPD7KtHtI019VL7YwGKvOIjv-F4IqwuGtZPeQugI-CrVJ4NiUUfw/exec>

Sign in as `bjoseph@mpsc.co.za`. On the first visit, Google may ask the owner to authorize spreadsheet access. The app then creates `TutoringTracker Cloud Data` privately in that Google Drive.

### Move existing browser data into the cloud once

1. Open the original browser version that contains the student records.
2. Open the top-left menu and choose **Export backup**.
3. Open the private cloud app above.
4. Open its menu, choose **Import backup**, and select the exported JSON file.
5. Confirm that the top bar says **Synced to Google** before closing the page.

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
- Owner-only Google cloud sync backed by a private spreadsheet
- Browser-local fallback plus manual JSON export/import backups

## Privacy and current limitations

The hosted app is restricted to the deploying school Google account. The public GitHub Pages build remains browser-local and does not cloud-sync. Existing browser data must be transferred once using Export/Import because browsers do not share local storage between different web addresses. Invoices and automated WhatsApp reminders are not included yet.
