# Publishing to GitHub

The local repository is ready to publish once GitHub CLI authentication is valid.

## 1. Re-authenticate GitHub CLI

```bash
gh auth login -h github.com
gh auth status
```

Use the account that should own the public repository.

## 2. Create and push the public repository

```bash
gh repo create return-guardian --public --source . --remote origin --push \
  --description "Local-first purchase memory for receipts, returns, and warranties."
```

## 3. Set GitHub topics

```bash
gh repo edit return-guardian \
  --add-topic return-guardian \
  --add-topic local-first \
  --add-topic privacy-first \
  --add-topic receipts \
  --add-topic warranty-tracker \
  --add-topic returns \
  --add-topic purchase-tracker \
  --add-topic pwa-ready \
  --add-topic indexeddb \
  --add-topic offline-first \
  --add-topic productivity
```

## 4. Verify remote state

```bash
git remote -v
git status -sb
gh repo view return-guardian --web
```

Use `git log --oneline -1` to confirm the commit that will be pushed.
