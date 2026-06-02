# Architecture

Return Guardian is a local-first static web app. The MVP has no backend, no accounts, and no server upload path.

## Stack

- Static HTML/CSS/JavaScript
- Native IndexedDB wrapper
- Node built-in test runner
- Node static development server

The initial implementation is intentionally dependency-free so the app can be built and verified without downloading packages. The product design remains compatible with a later React/Vite migration if the project wants componentized scaling.

## Storage Decision

IndexedDB is the primary storage layer because Return Guardian stores image and PDF receipt attachments. `localStorage` is only appropriate for small preferences and is not used for purchase records or files.

Stores:

- `purchases`
- `receipts`
- `attachments`
- `attachmentBlobs`
- `reminders`
- `exports`
- `settings`

Date-only values are stored as `YYYY-MM-DD` and compared as local calendar dates. Timestamps are stored as ISO 8601 strings.

## Schema Version

Every persisted domain record includes `schemaVersion: 1`. Future upgrades should use IndexedDB version migrations and preserve user data.
