# eTab — Tab Manager

A Chrome extension for managing browser tabs. Lightweight, clean interface with collect-based tab organization.

## Features

- **Tab Overview** — View all open tabs across windows, grouped by window or flat list
- **Tab Actions** — Activate, reload, pin, mute, duplicate, close from any view
- **Collects** — Drag tabs to collect folders for later reading; tabs persist even after closing
- **Search** — Filter tabs by title or URL
- **Popup** — Quick tab search and activation from the toolbar icon
- **New Tab Page** — Replaces Chrome's new tab with the full tabs manager
- **Auto-Refresh** — Live updates via background service worker broadcasts

## Pages

| Page | Entry | Description |
|------|-------|-------------|
| Popup | `src/popup/index.html` | Toolbar popup, search & activate tabs |
| Tabs Manager | `src/tabs/index.html` | Full-page manager, new tab override |
| Options | `src/options/index.html` | Extension settings |

## Install

### From source

```bash
git clone <repo>
cd etab

# Build
npm install --cache /tmp/npm-cache-etab
npm run build
```

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist/` directory

### Permissions

- `tabs` — Read and manage browser tabs
- `storage` — Persist collect data and settings
- `windows` — Focus and switch between windows

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install --cache /tmp/npm-cache-etab
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build extension to `dist/` |
| `npm run dev` | Vite dev server (for UI development only) |

### Cache workaround

If `npm install` fails with `EPERM` on `.npm` files, use the cache flag:

```bash
npm install --cache /tmp/npm-cache-etab
```

Permanent fix:

```bash
sudo chown -R 501:20 ~/.npm
```

### Project structure

```
etab/
├── manifest.json                  # Extension manifest (MV3)
├── vite.config.js                 # Vite multi-entry build config
├── package.json
├── dist/                          # Build output, extension root
├── icons/                         # Extension icons (SVG source + PNG)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── src/
│   ├── background/
│   │   └── service-worker.js      # Service worker, tab event broadcasts
│   ├── popup/
│   │   ├── App.vue                # Popup UI
│   │   ├── index.html
│   │   └── main.js
│   ├── tabs/
│   │   ├── App.vue                # Tabs manager UI
│   │   ├── index.html
│   │   └── main.js
│   ├── options/
│   │   ├── App.vue                # Options UI
│   │   ├── index.html
│   │   └── main.js
│   └── shared/
│       ├── api.js                 # Chrome API wrappers
│       ├── style.css              # Global theme & shared styles
│       ├── useTabs.js             # Tab state composable
│       └── useCollects.js         # Collect state composable
```

## Tech Stack

- **Vue 3** — UI framework (Composition API, `<script setup>`)
- **Vite 5** — Build tool, multi-entry with `vite-plugin-static-copy`
- **Chrome Extension Manifest V3** — Service worker, permissions model

## Architecture

See [AGENTS.md](AGENTS.md) for detailed architecture, data flow, and design decisions.