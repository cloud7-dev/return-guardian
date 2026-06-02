# Return Guardian MVP Product and Technical Design

## 1. Product Positioning

Return Guardian is a local-first purchase memory app for people who lose money because return windows, refund periods, warranties, and receipt locations are scattered across email, paper, shopping apps, and photo libraries.

It is not a budgeting app, a shopping tracker, or a cloud receipt vault. The first MVP is deliberately smaller: record a purchase, attach proof, and surface the dates that can still save the user money.

### README first paragraph

```md
# Return Guardian

Never miss a return window or warranty again.

Local-first, privacy-friendly purchase memory for receipts, returns, and warranties. Return Guardian helps you manually record purchases, attach receipt images or PDFs, and see return and warranty deadlines before they cost you money. The MVP runs as a local web app and keeps purchase information and receipt files on the user's device.
```

### Core promise

- Primary value: protect the user from missed return, refund, and warranty deadlines.
- Trust value: purchase and receipt data stays local by default.
- MVP behavior: manual entry first, with sample data to make the dashboard useful immediately.

### Initial scope

- Local web app.
- PWA-ready structure, but PWA install support can ship after MVP.
- No mobile App Store or Play Store distribution in the first release.
- No server upload.
- Purchase information, receipt metadata, and receipt files are stored locally.

### Explicit non-goals for MVP

- OCR extraction.
- Cloud sync.
- User accounts.
- Email inbox scanning.
- Store API integrations.
- Calendar sync.
- Encryption at rest.
- Repair history and manuals.

These are good v1+ candidates, but they should not block the first release.

## 2. Recommended Technical Shape

### Recommended stack

- App: Vite + React + TypeScript.
- Styling: CSS Modules or plain CSS with design tokens. Avoid a heavy UI framework for the MVP.
- Local database: IndexedDB through Dexie or a small typed wrapper.
- Tests: Vitest for domain logic, Testing Library for components, Playwright for end-to-end flows.
- Build target: static frontend app deployable to GitHub Pages, Netlify, Vercel static hosting, or local file server.

### Design principles

- Local-first: the app must work without authentication or backend connectivity.
- Date-first: every purchase should be judged by actionable deadlines.
- Manual-first: OCR and automations are future helpers, not a dependency.
- Exportable: user can leave with CSV and JSON at any time.
- PWA-ready: data layer and routing should not assume server rendering.

## 3. Information Architecture

### Navigation

- Dashboard: actionable overview and sample data entry point.
- Purchases: searchable list of all purchases.
- Add Purchase: manual registration form.
- Purchase Detail: receipt, deadline, warranty, notes, and attachment management.
- Export: CSV/JSON export controls.
- Settings: sample data reset, local storage status, future PWA/privacy controls.

### Suggested routes

- `/` - Dashboard, the first screen.
- `/purchases` - All purchases.
- `/purchases/new` - Manual purchase registration.
- `/purchases/:purchaseId` - Purchase detail.
- `/purchases/:purchaseId/edit` - Edit existing purchase.
- `/exports` - CSV/JSON export.
- `/settings` - Local app settings.

### Main entities by screen

- Dashboard: purchases, reminders, calculated deadline groups.
- Add/Edit: purchase, receipt, attachment.
- Detail: purchase, receipt, attachment, reminder timeline.
- Export: purchases, receipts, attachments metadata, reminders, export metadata.

## 4. Screen Composition

## 4.1 First Screen: Dashboard

The first screen should be the working product, not a landing page.

### Header

- App name: Return Guardian.
- Primary action: Add purchase.
- Secondary actions: Export, Settings.
- Local-only indicator: short label such as "Local data" with a tooltip explaining that files stay on this device.

### Dashboard sections

1. Today
   - Purchases whose return deadline, refund deadline, or custom reminder is today.
   - Purchases already expired but not dismissed can appear in an "Overdue" subsection.
   - Each item shows product name, merchant, deadline type, deadline date, and quick action.

2. This week
   - Purchases with return deadline in the next 7 calendar days.
   - Sort by nearest deadline first.

3. Warranty soon
   - Purchases with warranty expiration within 30 days by default.
   - The threshold can become configurable after MVP.

4. Recent purchases
   - Last 5 purchases, useful when no deadlines are urgent.

5. Empty state
   - If no user data exists, show sample data cards and an Add purchase button.
   - The sample data should be clearly labeled so users do not mistake it for their own records.

### Card fields

- Product name.
- Merchant.
- Amount.
- Purchase date.
- Deadline badge: "Return today", "Return in 3 days", "Warranty in 21 days", or "Expired".
- Attachment indicator: receipt image/PDF count.

## 4.2 Registration Screen

The registration screen should support fast manual entry without requiring perfect data.

### Required fields

- Product name.
- Purchase date.
- Purchase place or merchant.
- Amount.

### Optional but prominent fields

- Return deadline.
- Warranty expiration date.
- Receipt image or PDF.
- Category.
- Notes.
- Tags.

### Validation

- Product name cannot be blank.
- Amount must be zero or positive.
- Currency defaults to user's locale or `USD` for sample data.
- Purchase date cannot be obviously invalid.
- Return deadline and warranty expiration should warn if they are before purchase date, but allow save only if the user confirms or fixes it.
- Attachment type must be image or PDF for MVP.

### Save behavior

- Save purchase and attachment metadata in one app-level transaction when possible.
- If file storage fails, preserve purchase form data and show a recoverable error.
- After save, navigate to purchase detail.

## 4.3 Detail Screen

The detail screen is the source of truth for one purchase.

### Primary content

- Product name, merchant, amount, and purchase date.
- Return deadline status.
- Warranty expiration status.
- Receipt preview:
  - Image: inline preview.
  - PDF: filename, size, open/download action.
- Notes.
- Reminder timeline.

### Actions

- Edit purchase.
- Add/replace receipt attachment.
- Export this purchase as JSON.
- Mark reminder dismissed.
- Delete purchase.

Deletion should require confirmation because local-only data may not be recoverable unless exported.

## 4.4 Expiration Dashboard

The expiration dashboard can initially be part of the first screen, but the logic should be isolated so it can become its own route later.

### Groups

- Overdue: deadline is before today and not dismissed.
- Today: deadline equals today.
- This week: deadline is after today and within 7 days.
- Return window active: return deadline exists and is in the future.
- Warranty soon: warranty expiration is within 30 days.
- No deadline: purchase has no return or warranty date.

### Sorting

1. Overdue.
2. Today.
3. Soonest return deadline.
4. Soonest warranty expiration.
5. Most recent purchase.

### Date rules

- Treat date-only fields as local dates.
- A deadline date is inclusive until the end of that local day.
- Store date-only values as `YYYY-MM-DD`, not timezone-shifted timestamps.
- Store event timestamps such as `createdAt` and `updatedAt` as ISO 8601 strings.

## 5. Data Model

Use stable UUIDs for all user-created records. Keep the schema explicit and versioned because local apps need migrations.

### TypeScript-style model

```ts
type ISODate = string; // YYYY-MM-DD
type ISODateTime = string; // ISO 8601 timestamp
type CurrencyCode = string; // ISO 4217, e.g. USD, KRW

type PurchaseStatus = "active" | "archived" | "deleted";
type AttachmentKind = "receipt-image" | "receipt-pdf" | "manual" | "other";
type ReminderKind =
  | "return-deadline"
  | "refund-deadline"
  | "warranty-expiration"
  | "receipt-missing"
  | "custom";
type ReminderStatus = "active" | "dismissed" | "done";
type ExportFormat = "csv" | "json";

interface Purchase {
  id: string;
  schemaVersion: 1;
  productName: string;
  merchantName: string;
  purchaseDate: ISODate;
  amountCents: number;
  currency: CurrencyCode;
  returnDeadline?: ISODate;
  refundDeadline?: ISODate;
  warrantyExpiresOn?: ISODate;
  category?: string;
  tags: string[];
  notes?: string;
  receiptIds: string[];
  attachmentIds: string[];
  reminderIds: string[];
  status: PurchaseStatus;
  isSample: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

interface Receipt {
  id: string;
  schemaVersion: 1;
  purchaseId: string;
  merchantName?: string;
  receiptDate?: ISODate;
  totalAmountCents?: number;
  currency?: CurrencyCode;
  attachmentId?: string;
  source: "manual-entry" | "file-attachment" | "sample";
  notes?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

interface Attachment {
  id: string;
  schemaVersion: 1;
  purchaseId: string;
  receiptId?: string;
  kind: AttachmentKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  blobKey: string;
  previewBlobKey?: string;
  checksumSha256?: string;
  createdAt: ISODateTime;
}

interface Reminder {
  id: string;
  schemaVersion: 1;
  purchaseId: string;
  kind: ReminderKind;
  title: string;
  dueDate: ISODate;
  leadDays: number;
  status: ReminderStatus;
  dismissedAt?: ISODateTime;
  completedAt?: ISODateTime;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

interface ExportRecord {
  id: string;
  schemaVersion: 1;
  format: ExportFormat;
  appVersion: string;
  exportedAt: ISODateTime;
  purchaseCount: number;
  receiptCount: number;
  attachmentMetadataCount: number;
  reminderCount: number;
  includesAttachmentFiles: false;
  fileName: string;
}
```

### Storage tables

- `purchases`: keyed by `id`.
- `receipts`: keyed by `id`, indexed by `purchaseId`.
- `attachments`: keyed by `id`, indexed by `purchaseId`.
- `attachmentBlobs`: keyed by `blobKey`, value is Blob.
- `reminders`: keyed by `id`, indexed by `purchaseId`, `dueDate`, `status`.
- `exports`: keyed by `id`.
- `settings`: keyed by setting name.

## 6. Storage Recommendation

### localStorage vs IndexedDB

| Criteria | localStorage | IndexedDB |
|---|---|---|
| Data shape | String key-value only | Structured records, indexes, Blob storage |
| File attachments | Poor fit; would require base64 strings | Native Blob support |
| Capacity | Usually small and browser-dependent | Larger browser-managed quota |
| Performance | Synchronous, can block UI | Asynchronous |
| Querying | Manual parsing and filtering | Indexed lookups possible |
| Migration | Manual and fragile as data grows | Versioned database upgrades |
| MVP complexity | Simpler for tiny text-only data | Slightly more setup, better fit |

### Choice

Choose IndexedDB for the MVP.

Reason: Return Guardian must attach receipt images and PDFs. Storing files in `localStorage` would require base64 encoding, which wastes space and blocks the main thread. IndexedDB supports structured purchase records, indexes for deadlines, and Blob storage for attachments.

### localStorage use

Use `localStorage` only for non-critical preferences:

- Last selected dashboard tab.
- Theme preference.
- Whether sample data has already been inserted.

Do not store purchase records or attachments in `localStorage`.

## 7. Sample Data Structure

Sample data should demonstrate all dashboard states: return soon, warranty soon, receipt attached, no receipt, and expired.

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-06-02T00:00:00.000Z",
  "purchases": [
    {
      "id": "sample-headphones",
      "productName": "Wireless Noise Canceling Headphones",
      "merchantName": "Best Buy",
      "purchaseDate": "2026-05-28",
      "amountCents": 24999,
      "currency": "USD",
      "returnDeadline": "2026-06-11",
      "warrantyExpiresOn": "2027-05-28",
      "category": "Electronics",
      "tags": ["audio", "sample"],
      "notes": "Check fit before return window closes.",
      "receiptIds": ["sample-receipt-headphones"],
      "attachmentIds": ["sample-attachment-headphones"],
      "reminderIds": ["sample-reminder-headphones-return"],
      "status": "active",
      "isSample": true
    },
    {
      "id": "sample-coffee-maker",
      "productName": "Compact Coffee Maker",
      "merchantName": "Target",
      "purchaseDate": "2025-06-20",
      "amountCents": 8999,
      "currency": "USD",
      "returnDeadline": "2025-07-20",
      "warrantyExpiresOn": "2026-06-20",
      "category": "Kitchen",
      "tags": ["appliance", "sample"],
      "notes": "Warranty expires soon.",
      "receiptIds": [],
      "attachmentIds": [],
      "reminderIds": ["sample-reminder-coffee-warranty"],
      "status": "active",
      "isSample": true
    }
  ],
  "receipts": [
    {
      "id": "sample-receipt-headphones",
      "purchaseId": "sample-headphones",
      "merchantName": "Best Buy",
      "receiptDate": "2026-05-28",
      "totalAmountCents": 24999,
      "currency": "USD",
      "attachmentId": "sample-attachment-headphones",
      "source": "sample"
    }
  ],
  "attachments": [
    {
      "id": "sample-attachment-headphones",
      "purchaseId": "sample-headphones",
      "receiptId": "sample-receipt-headphones",
      "kind": "receipt-pdf",
      "fileName": "sample-headphones-receipt.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 180000,
      "blobKey": "sample/blob/headphones-receipt"
    }
  ],
  "reminders": [
    {
      "id": "sample-reminder-headphones-return",
      "purchaseId": "sample-headphones",
      "kind": "return-deadline",
      "title": "Return window closes",
      "dueDate": "2026-06-11",
      "leadDays": 7,
      "status": "active"
    },
    {
      "id": "sample-reminder-coffee-warranty",
      "purchaseId": "sample-coffee-maker",
      "kind": "warranty-expiration",
      "title": "Warranty expires",
      "dueDate": "2026-06-20",
      "leadDays": 30,
      "status": "active"
    }
  ]
}
```

Implementation note: sample IDs can be deterministic so the app can reset or remove sample data cleanly.

## 8. Export Formats

## 8.1 CSV Export

CSV should be spreadsheet-friendly and contain one row per purchase. It should not embed binary attachments.

### File name

`return-guardian-purchases-YYYY-MM-DD.csv`

### Columns

```csv
id,product_name,merchant_name,purchase_date,amount,currency,return_deadline,refund_deadline,warranty_expires_on,category,tags,notes,receipt_count,attachment_count,next_deadline,next_deadline_type,status,created_at,updated_at
```

### Example row

```csv
sample-headphones,"Wireless Noise Canceling Headphones","Best Buy",2026-05-28,249.99,USD,2026-06-11,,2027-05-28,Electronics,"audio;sample","Check fit before return window closes.",1,1,2026-06-11,return-deadline,active,2026-06-02T00:00:00.000Z,2026-06-02T00:00:00.000Z
```

### CSV rules

- Encode as UTF-8.
- Escape quotes by doubling them.
- Wrap fields in quotes when they contain comma, quote, newline, or semicolon-heavy tags.
- Store amount as decimal major units in CSV, while internal model uses cents.
- Use ISO date strings.

## 8.2 JSON Export

JSON should be lossier than a full backup only for binary files. It should include purchase data, receipt metadata, attachment metadata, reminder data, export metadata, and schema version.

### File name

`return-guardian-export-YYYY-MM-DD.json`

### Shape

```json
{
  "app": "return-guardian",
  "schemaVersion": 1,
  "exportedAt": "2026-06-02T12:00:00.000Z",
  "includesAttachmentFiles": false,
  "purchases": [],
  "receipts": [],
  "attachments": [],
  "reminders": [],
  "exports": [
    {
      "id": "export-uuid",
      "schemaVersion": 1,
      "format": "json",
      "appVersion": "0.1.0",
      "exportedAt": "2026-06-02T12:00:00.000Z",
      "purchaseCount": 2,
      "receiptCount": 1,
      "attachmentMetadataCount": 1,
      "reminderCount": 2,
      "includesAttachmentFiles": false,
      "fileName": "return-guardian-export-2026-06-02.json"
    }
  ]
}
```

### Attachment export decision

For MVP, export attachment metadata only. Exporting receipt files as a zip backup is useful, but it adds complexity around packaging, size, and browser memory. Add "full backup with files" after the base CSV/JSON export is reliable.

## 9. Accessibility and Responsive Standards

### Accessibility

- Target WCAG 2.2 AA.
- Full keyboard navigation for dashboard, forms, attachment actions, export, and delete confirmation.
- Visible focus states on all interactive elements.
- Native form labels for every input.
- Error messages must be tied to fields with `aria-describedby`.
- Buttons should use clear action labels, not only icons.
- Deadline urgency must not rely on color alone; include text labels such as "Due today" or "Expired".
- Receipt previews need descriptive alt text or file labels.
- PDF attachments need a file name, size, and open/download control.
- Modals and confirmations must trap focus and return focus after close.
- Respect reduced motion.

### Responsive breakpoints

- Small mobile: 360px and up.
- Large mobile: 390px and up.
- Tablet: 768px and up.
- Desktop: 1024px and up.

### Layout expectations

- Mobile dashboard uses a single-column layout with sticky Add action.
- Tablet and desktop can use dashboard columns: Today, This week, Warranty soon.
- Cards must keep product name, merchant, and deadline readable without overlap.
- Registration form should be single-column on mobile and two-column on desktop.
- Attachment preview must not force horizontal scrolling.
- Tables should collapse into cards on mobile.

## 10. Test Scenarios

### Domain tests

- Purchase with return deadline today appears in Today.
- Purchase with return deadline tomorrow appears in This week.
- Purchase with return deadline 8 days away does not appear in This week.
- Warranty expiring within 30 days appears in Warranty soon.
- Warranty expiring after 31 days does not appear in Warranty soon.
- Expired undismissed reminder appears in Overdue.
- Date-only comparisons do not shift because of timezone.
- Amount cents convert to decimal CSV value correctly.

### Storage tests

- Create purchase without attachment.
- Create purchase with image attachment.
- Create purchase with PDF attachment.
- Edit purchase fields without losing attachment references.
- Delete purchase removes related receipt, reminder, attachment metadata, and attachment Blob.
- Sample data can be inserted once.
- Sample data can be reset or removed.
- IndexedDB migration from schema version 1 to next version preserves data.

### UI tests

- Add purchase flow from dashboard to detail.
- Validation errors appear and focus moves to the first invalid field.
- Detail page displays receipt preview or PDF file action.
- Dashboard groups update after adding a deadline.
- Export buttons download CSV and JSON files.
- Empty state appears when no purchases exist.
- Sample data appears with sample labeling.

### Export tests

- CSV includes expected columns.
- CSV escapes commas, quotes, newlines, and non-English text.
- JSON includes schema version and export metadata.
- JSON does not include binary Blob data in MVP.
- Export works when there are zero purchases.

### Accessibility tests

- Keyboard-only add, edit, export, and delete flows.
- Screen reader labels for form fields and deadline badges.
- Color contrast for badges and buttons.
- Focus restoration after modal close.

### Responsive tests

- 360px mobile viewport: no horizontal overflow.
- 390px mobile viewport: dashboard cards remain readable.
- 768px tablet viewport: dashboard groups fit without clipping.
- 1024px desktop viewport: form and dashboard spacing remain balanced.

## 11. Implementation Order

This is the recommended build order from scaffold to first release.

### Phase 1: Scaffold

- Create Vite React TypeScript app.
- Add linting, formatting, Vitest, Testing Library, and Playwright.
- Add basic routes and app shell.
- Add README with positioning paragraph.
- Add MIT license.

Done when: local dev server renders the dashboard route and test commands run.

### Phase 2: Domain model

- Define TypeScript models.
- Add date utility functions for local date comparison.
- Add deadline grouping functions.
- Add sample data generator.
- Unit test deadline grouping and date utilities.

Done when: sample purchases can be grouped into Today, This week, and Warranty soon from pure functions.

### Phase 3: Local database

- Add IndexedDB wrapper.
- Create stores for purchases, receipts, attachments, attachmentBlobs, reminders, exports, and settings.
- Add repository functions for create, read, update, delete, and list.
- Add sample data insert/reset.

Done when: browser refresh preserves sample and manually added purchase data.

### Phase 4: Dashboard UI

- Build first screen with Today, This week, Warranty soon, Recent purchases, and empty/sample state.
- Add deadline badges and attachment count indicators.
- Add responsive card layout.

Done when: dashboard shows real data from IndexedDB and works at 360px, 768px, and desktop widths.

### Phase 5: Registration and edit flow

- Build Add Purchase form.
- Add validation.
- Save purchase, optional receipt, optional attachment metadata, and reminders.
- Build Edit Purchase form.

Done when: user can manually add and edit a purchase with deadlines.

### Phase 6: Attachments

- Add image/PDF picker.
- Store Blob in IndexedDB.
- Show image preview and PDF open/download controls.
- Add replace/delete attachment behavior.

Done when: receipt image/PDF survives refresh and can be removed cleanly.

### Phase 7: Detail screen

- Build purchase detail route.
- Show deadline status, receipt preview, notes, and reminder timeline.
- Add delete confirmation.

Done when: every dashboard card links to a complete purchase detail screen.

### Phase 8: Export

- Add CSV export.
- Add JSON export.
- Add export metadata record.
- Add export tests.

Done when: user can download valid CSV and JSON without server involvement.

### Phase 9: Quality pass

- Add accessibility checks.
- Add Playwright flows for add, detail, dashboard, export.
- Verify responsive layouts.
- Test empty state and sample data reset.

Done when: core flows pass in automated tests and manual viewport review.

### Phase 10: First release

- Freeze schema version 1.
- Add release notes.
- Add screenshots or short GIF.
- Add GitHub topics.
- Create `v0.1.0` release.

Done when: the repository clearly explains what the app does, how to run it, how data is stored, and what is intentionally out of scope.

## 12. License Recommendation

Recommended license: MIT.

Reason: Return Guardian is a local productivity app and an OSS-friendly first project. MIT is simple, familiar, and low-friction for contributors and users.

Apache-2.0 is also reasonable if explicit patent grants matter to the project later. For the first release, MIT is the clearer default.

## 13. GitHub Topics

Recommended topics:

- `return-guardian`
- `local-first`
- `privacy-first`
- `receipts`
- `warranty-tracker`
- `returns`
- `purchase-tracker`
- `pwa-ready`
- `indexeddb`
- `react`
- `typescript`
- `vite`
- `offline-first`
- `personal-data`
- `productivity`

## 14. OpenAI Codex for OSS Preparation

Prepare the repository so an evaluator can quickly understand why the project is useful, feasible, and open-source friendly.

### Repository readiness

- Public GitHub repository.
- Clear README with the default message:
  - "Never miss a return window or warranty again."
  - "Local-first, privacy-friendly purchase memory for receipts, returns, and warranties."
- MIT license file.
- Screenshots or GIF showing dashboard, add purchase, detail, and export.
- `docs/architecture.md` summarizing local-first storage and data model.
- `docs/roadmap.md` separating MVP from v1+.
- `docs/privacy.md` explaining no server upload and local storage behavior.
- Sample data included in source.
- No secrets, API keys, or real receipts committed.

### Issue and contribution setup

- Good first issues:
  - Build empty dashboard state.
  - Add CSV export tests.
  - Add sample data reset.
  - Improve keyboard focus on delete confirmation.
- Labels:
  - `good first issue`
  - `accessibility`
  - `local-first`
  - `export`
  - `pwa`
  - `tests`
- Add `CONTRIBUTING.md` with local setup, test commands, and privacy expectations.
- Add `CODE_OF_CONDUCT.md` if the project expects outside contributors.

### Technical evidence

- Include test command examples in README.
- Include storage decision record: IndexedDB chosen over localStorage because of receipt image/PDF attachments.
- Include a small schema versioning note.
- Include known limitations:
  - No OCR yet.
  - No calendar export yet.
  - JSON export does not include binary files in MVP.
  - Browser storage can be cleared by the user or browser.

### Why this is a good OSS project

- Clear everyday problem.
- Small MVP with understandable boundaries.
- Privacy-friendly by default.
- Many beginner-friendly contribution paths.
- Natural roadmap for OCR, PWA, encryption, and calendar export.

## 15. MVP Acceptance Checklist

- User can add purchase manually.
- User can enter product name, purchase date, merchant, amount, return deadline, and warranty expiration.
- User can attach receipt image or PDF.
- Dashboard shows Today, This week, and Warranty soon.
- User can open purchase detail.
- User can export CSV.
- User can export JSON.
- Sample data can be loaded and identified as sample data.
- Data persists after browser refresh.
- No server upload occurs.
- App works on mobile, tablet, and desktop widths.
- Keyboard navigation covers main flows.
- README, license, topics, and OSS prep docs are ready.

## 16. Recommended v1+ Roadmap

1. OCR extraction for receipt date, merchant, and amount.
2. Calendar `.ics` export for return and warranty deadlines.
3. PWA install support with service worker and app manifest.
4. Local encrypted storage option.
5. Product manuals, serial numbers, and repair history.
6. Full backup export including receipt files as a zip.
7. Import from prior JSON export.
8. Configurable reminder thresholds.

