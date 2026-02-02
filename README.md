# Crit

[![npm](https://img.shields.io/npm/v/crit-ios)](https://www.npmjs.com/package/crit-ios)
[![license](https://img.shields.io/badge/license-MIT-blue)](https://github.com/natethegreat/crit/blob/main/LICENSE)

Visual QA for iOS apps. Capture screenshots from your iOS app, pin feedback, and hand it off to your coding agent.

## Install

```bash
npm install -g crit-ios
```

## Quick start

```bash
# 1. Capture screenshots from iOS Simulator
crit capture

# 2. Review in browser, add comments
crit serve

# 3. Save, then tell your agent: "review .crit and fix each issue"
```

Or use npx without installing:

```bash
npx crit-ios capture
npx crit-ios serve
```

## How it works

1. Boot your app in iOS Simulator
2. `crit capture` — press Enter to capture each screen, `q` to quit
3. `crit serve` — opens browser for review
4. Click to add pins, type comments, attach reference images
5. Save — writes `feedback.json` with annotated images to `.crit/`
6. Tell your coding agent to `review .crit and fix each issue` — it reads the exported JSON and annotated screenshots to apply your changes

> **Note:** Always run `crit capture` before `crit serve`. If you recapture while the browser is open, reload the page to see updated screenshots.

## Requirements

- macOS with Xcode installed
- iOS Simulator with your app running
- Node.js 14+

## Zero dependencies

No npm dependencies. Vanilla Node.js and a single-file browser UI.

## Output

After export, find everything in `.crit/sessions/<timestamp>/`:

```
.crit/sessions/2025-01-25-10-30-00/
├── manifest.json       # Capture metadata
├── feedback.json       # Pin positions, comments, references
├── screenshots/        # Raw captures (001.png, 002.png, ...)
├── annotated/          # Screenshots with pins baked in
└── references/         # Uploaded reference images
```

## License

MIT
