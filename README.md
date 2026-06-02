# Return Guardian

> **Consolidated into [Return & Warranty Guardian](https://github.com/cloud7-dev/return-warranty-guardian).**
>
> This repository is kept as a historical MVP/design branch. Active development, multilingual UI, CSV export, warranty evidence packs, and V2 home/service-history features now live in `cloud7-dev/return-warranty-guardian`.

Never miss a return window or warranty again.

Local-first, privacy-friendly purchase memory for receipts, returns, and warranties. Return Guardian helps you manually record purchases, attach receipt images or PDFs, and see return and warranty deadlines before they cost you money. The MVP runs as a local web app and keeps purchase information and receipt files on the user's device.

## MVP

- Manual purchase registration
- Product name, purchase date, merchant, amount, return deadline, refund deadline, and warranty expiration
- Dashboard groups for today, this week, and warranty soon
- Receipt image/PDF attachments stored locally
- CSV and JSON export
- Included sample data

## Local Data

Return Guardian stores purchase records, reminders, receipt metadata, and receipt files in the browser's IndexedDB. It does not upload purchase or receipt data to a server.

Browser storage can still be cleared by the user, browser settings, or device cleanup tools. Export data regularly if records are important.

## Run

```bash
npm run dev
```

## Verify

```bash
npm test
npm run build
```

## License

MIT
