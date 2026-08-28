# eTab Architecture — Agent Guide

## Overview

eTab is a Chrome Extension Manifest V3 tab manager built with Vue 3 + Vite 5. It has three browser-action pages (popup, tabs manager, options) and a background service worker. All UI pages share style and composable modules via `src/shared/`.

## Key Design Decisions

### 1. Multi-entry Vite build with `base: ''`

Three rollup inputs produce separate bundles for popup, tabs, and options. `base: ''` ensures asset paths are relative (`assets/...`), compatible with the `chrome-extension://` protocol. Without this, Vite's default absolute paths (`/assets/...`) cause `ERR_FILE_NOT_FOUND`.

### 2. Service worker as message hub

Pages communicate with Chrome APIs through the service worker where cross-context coordination is needed. The service worker broadcasts `TAB_CHANGE` on tab lifecycle events; the `useTabs` composable listens and auto-refreshes.

### 3. Collect data persists in `chrome.storage.local`

Collects store complete tab snapshots (`{id, title, url, favIconUrl}`) so tabs remain visible even after closing. Data format migrates automatically on load (old `tabIds: number[]` → `tabs: Array<Object>`).

### 4. Popup uses service-worker message for activation

Popup sends `ACTIVATE_TAB` message to the service worker (which handles `chrome.windows.update` + `chrome.tabs.update`), with a direct `chrome.tabs.update` fallback if messaging fails. The tabs page uses direct API calls in `api.js` instead.

## Data Flow

### Tab state: service worker → composable → component

```
Chrome tab event
    ↓
service-worker.js ──broadcast TAB_CHANGE──→ useTabs.js (chrome.runtime.onMessage)
                                                ↓
                                          vue ref(tabs)  ←─ component reads
                                                ↓
                                          fetchTabs() on mount + auto-refresh
```

### Collect state: chrome.storage → composable → component

```
chrome.storage.local.get('etab_collects')
    ↓
useCollects.js ──loadCollects()──→ vue ref(collects)
    ↓
component reads/writes via composable methods
    ↓
saveCollects() ──→ chrome.storage.local.set()
```

### Tab activation: two paths

**Popup path:**
```
component → chrome.runtime.sendMessage({type:'ACTIVATE_TAB', tabId, windowId})
    ↓
service-worker.js → chrome.windows.update + chrome.tabs.update
    ↓
sendResponse({success:true})  or  {error: e.message}
```

**Tabs page path:**
```
component → api.js activateTab() → chrome.windows.update + chrome.tabs.update
```

## Component Tree

```
popup/App.vue
  ├── useTabs()          # live tab list, auto-refresh
  └── api.js             # closeTab, activateTab (message path)

tabs/App.vue
  ├── useTabs()          # live tab list
  ├── useCollects()      # collect list + CRUD
  ├── api.js             # tab lifecycle actions
  │
  ├── [Default collect]  → live tabs from useTabs()
  │   └── window group / flat list views
  │
  └── [non-Default collect] → saved tabs from useCollects()
      └── stored tab cards (open, copy URL, remove)

options/App.vue
  └── chrome.storage.sync  # settings persistence
```

## State Management

No Vuex/Pinia. Each page uses composables:

| Composable | Source | Persistence | Reactive |
|-----------|--------|-------------|----------|
| `useTabs` | `chrome.tabs.query` + broadcast | No (live) | `ref(tabs)` |
| `useCollects` | `chrome.storage.local` | `chrome.storage.local.set` | `ref(collects)` |
| Options settings | `chrome.storage.sync` | `chrome.storage.sync.set` | `ref(settings)` |

## Chrome Extension Specifics

### Manifest V3

- `background.service_worker` type `module` — auto-registered by manifest
- Permissions: `["tabs", "storage", "windows"]`
- `chrome_url_overrides.newtab` replaces Chrome new tab; user can disable in extension settings
- `default_popup` points to `src/popup/index.html`
- `options_page` points to `src/options/index.html`

### Isolated worlds

Each page (popup, tabs, options) runs in its own JS context. They share no runtime state. Cross-page communication must go through `chrome.runtime.sendMessage` (page → service worker) or `chrome.storage` (persistent data).

### Service worker lifecycle

The service worker is event-driven, not persistent. It wakes on events (`onInstalled`, `onMessage`, tab listeners) and may terminate after ~30 seconds of inactivity. No long-lived state should be kept in the service worker. All persistent data lives in `chrome.storage.local`.

### Asset paths

- Use `chrome.runtime.getURL()` for runtime asset references (icons, internal pages)
- No compile-time `require()` or `import` for extension assets
- `DEFAULT_FAVICON()` returns `chrome.runtime.getURL('icons/icon16.png')`

## Build

```bash
npm install --cache /tmp/npm-cache-etab
npm run build   # outputs to dist/
```

Build output structure:

```
dist/
├── manifest.json
├── src/
│   ├── popup/index.html
│   ├── tabs/index.html
│   ├── options/index.html
│   └── background/service-worker.js
├── assets/
│   ├── popup-*.js
│   ├── tabs-*.js
│   ├── options-*.js
│   ├── style-*.js        # Vue runtime + shared CSS
│   └── *.css
└── icons/
```

Point `chrome://extensions` "Load unpacked" to `dist/`.

## Known Constraints

- **npm cache**: `npm install` requires `--cache /tmp/npm-cache-etab` flag due to root-owned `.npm` files. Permanent fix: `sudo chown -R 501:20 ~/.npm`
- **Icons**: Generated from SVG via `sips` (macOS). No PNG in repo — run `scripts/generate-icons.sh` or manual `sips` commands (see `package.json` scripts if present)
- **No tests**: No testing framework configured. Pure JS + Vue SFC, no TypeScript
- **Tabs page activation**: Uses direct API calls (not service-worker message pattern). If activation issues arise, migrate to message pattern like popup
- **Settings**: Options page stores in `chrome.storage.sync` but settings are not yet consumed by other pages