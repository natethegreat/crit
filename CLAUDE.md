# CLAUDE.md

Development conventions for the Crit codebase.

## Architecture

- **Zero npm dependencies** — deliberate constraint, do not add any
- **`review-ui.html`** — single-file SPA with vanilla JS, no build step, no framework
- **macOS-only** — requires `xcrun simctl` for iOS Simulator interaction

## Testing

Run commands directly:

```bash
node bin/crit.js --help
node bin/crit.js capture
node bin/crit.js serve
```

## Key files

```
bin/crit.js         CLI entry point and argument parsing
server.js           HTTP server for review UI and API endpoints
review-ui.html      Browser UI — self-contained, no external dependencies
lib/
  capture.js        Screenshot capture orchestration
  simulator.js      iOS Simulator interaction via xcrun simctl
  session.js        Session and manifest management
```

## Conventions

- All file operations use Node.js built-ins (`fs`, `path`, `http`)
- No transpilation or bundling — code runs directly
- Review UI communicates with server via fetch to `/api/*` endpoints
- Screenshots stored in `.crit/sessions/<timestamp>/`
