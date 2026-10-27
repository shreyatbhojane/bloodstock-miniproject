# BloodStock

A responsive blood bank stock management website for a college demonstration. The fictional **City Care Blood Centre** starts with 18 sample batches covering all eight blood groups, three components, and four workflow statuses.

## Run locally

Open `index.html` in a modern browser. No installation, build, backend, login, or API key is needed. For more consistent browser storage behaviour, serve the folder locally:

```sh
python -m http.server 8000
```

Then visit `http://localhost:8000`. Alternatively, use the VS Code Live Server extension. Keep using the same URL and browser to retain your saved data. Files opened directly and files served on different ports use different storage locations.

## Features

- Overview with live totals, accessible SVG bar/doughnut charts, blood-group availability, expiry reminders, and an actual activity log.
- Add, edit, and confirm deletion of inventory batches. Unique IDs, required fields, whole-number quantities, and sensible dates are validated inline.
- Combined search, group/component/status filters, sorting, pagination, and CSV export across **all** matching records, not just the current page.
- Expiry tracker with all on-hand, expired, 3-day, and 7-day views.
- Reports filtered by collection date, group, and workflow status, with CSV download and a print stylesheet.
- Editable centre name, low-stock threshold, expiry window, and confirmed demo reset.
- Responsive navigation drawer, native keyboard-accessible modal dialogs, focus styles, toasts, and reduced-motion support.

## Technology and files

- `index.html`: semantic application shell and accessible modal forms.
- `styles.css`: responsive layout, micro-interactions, and print styles.
- `app.js`: commented, plain JavaScript with one data store and a renderer for each view.
- `assets/bootstrap.min.css`: locally bundled Bootstrap 5.3.3 CSS (MIT license; original license header retained). No Bootstrap JavaScript is needed; dialogs use the native browser API.
- `assets/favicon.svg`: SVG blood-drop mark.

All icons and charts are inline SVG; no chart dependency is required. Inter is requested from Google Fonts and **requires internet access for that font only**. If unavailable, the app uses system sans-serif fonts. Application functionality and Bootstrap work offline.

## Data and calculation rules

Inventory and preferences are stored as JSON under `bloodstock.demo.v1` in browser LocalStorage. Initial sample dates are relative to the local calendar date on first load. Reloading does **not** replace saved records. Dates continue ageing normally; reset the demo to generate fresh examples.

- One record represents one physical unit or a batch of units with **one common collection date and expiry date**. All quantities and KPIs sum physical units; the UI separately labels batch/record counts.
- **Total units** includes every record and workflow status, including issued and expired records, for this demonstration's inventory ledger.
- **Usable available** means workflow status `Available` and an expiry date on or after today. `Reserved`, `Issued`, `Quarantined`, and past-expiry units are excluded. Units expiring today have zero days remaining and stay included through that date. This date-only convention is not clinical guidance.
- **Low stock** means a blood group's usable available units are below the configured threshold (default 5). Zero-stock groups are included.
- **Expiring soon** covers on-hand records (`Available`, `Reserved`, `Quarantined`) from today through the alert window, inclusive (default 7 days). Issued and already-expired records are excluded from this KPI. Expired on-hand stock has its own tracker summary.
- The dashboard doughnut divides **usable available stock only** into mutually exclusive categories: expiring soon first, then units in low-stock groups, then the remaining available stock. The slices add up to the centre number. Reserved/quarantined units can appear in expiry reminders but never in this chart.
- The 3-day tracker window is included in the 7-day window; these summary cards should not be added together. Reports instead use exclusive expiry buckets: expired, 0–3, 4–7, and later.
- A report's `Available` **workflow status** count may include expired records. Its separate **Usable Available** KPI excludes those records. All report tables/charts/exports use the same current filters; date filters use collection dates and include both endpoints.
- Expiry calculations use local calendar dates converted to UTC day numbers, avoiding partial-day and daylight-saving rounding errors. Open pages refresh date-based metrics at midnight, on focus, and on return to the tab.

User strings are escaped before rendering. CSV fields are quoted and formula-leading characters are neutralised for spreadsheet safety. Missing data is seeded; invalid saved JSON/schema is preserved at `bloodstock.demo.v1.recovery` when storage permits, then replaced with a clean demo. If storage fails, changes continue in memory with a visible warning. Changes in another browser tab refresh the view.

## Reset demo data

Go to **Settings → Reset Demo Data** and confirm. This restores sample inventory, original preferences, and a fresh activity log with dates relative to today. It only changes BloodStock's storage, not other websites' data. Closing private/incognito sessions or clearing site data may also remove saved changes.

## Project boundary

This is a **student demonstration, not a real clinical inventory system**. All inventory is fictional and contains no donor or patient data. Expiry notices are inventory reminders, not clinical suitability decisions. There is no authentication, multi-user database, clinical validation, or production audit trail.
