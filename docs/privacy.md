# Privacy

Return Guardian is designed as a local-first purchase memory app.

## MVP Behavior

- No user account is required.
- No purchase information is uploaded to a server.
- Receipt image and PDF attachments are stored in the browser's IndexedDB.
- CSV and JSON exports are generated locally in the browser.

## Important Limitation

Local browser storage is not the same as an external backup. Users should export important records because browser storage can be cleared by browser settings, system cleanup tools, or profile removal.

## Future Work

Local encrypted storage, full backup export including files, and import from backup are planned v1+ candidates.

