# Dial — deploy notes

Static site. No build step. Five files plus icons.

```
index.html              the whole app — solver, UI, scoring
sw.js                   offline shell; cache-first so it cold-starts with no signal
manifest.webmanifest    home-screen install metadata
icon-192/512.png        manifest icons
apple-touch-icon.png    iOS home-screen icon (iOS ignores the manifest for this)
firebase.json           hosting config
```

## Deploy

```bash
firebase init hosting     # public dir: .   |  single-page app: yes
firebase deploy
```

The `firebase.json` here already sets what matters:

- **`sw.js` served `no-store`.** The single most common PWA bug is a service worker cached by the CDN — you deploy a fix and phones keep the old app for a week.
- **`index.html` served `no-cache`.** Revalidate each load; the service worker handles offline, not the HTTP cache.
- **Manifest content type**, which some hosts get wrong and which silently breaks install.

Bump `VERSION` in `sw.js` on every deploy. Old caches are deleted on activate.

## Storage

Three tiers, chosen at boot, shown in the Gear tab:

1. **IndexedDB** — the real target. Holds rifles, loads, scope settings, truing, conditions, and saved scores.
2. **localStorage** — fallback if IndexedDB is blocked.
3. **Memory** — last resort, e.g. inside a sandboxed iframe. Nothing survives.

At boot the app calls `navigator.storage.persist()`, which asks WebKit to exempt the origin from eviction. Granted is shown as "Eviction protection: granted."

**This is not a backup.** Deleting the home-screen app deletes the database. Export JSON to iCloud Drive for anything you can't re-measure.

## Verifying offline for real

Deploy, open in Safari, Share → Add to Home Screen. Then:

1. Airplane mode
2. **Force-quit the app** — swipe it away, don't just background it
3. Reopen

Cold start with no network is where PWAs break. Backgrounding it proves nothing.

## Going to a real backup

If device loss becomes a concern, Firestore sync is the upgrade: anonymous auth, one document per user, last-write-wins. The storage layer in `index.html` is already a two-function interface (`DB.get` / `DB.set`), so sync slots in behind it without touching the rest of the app.
