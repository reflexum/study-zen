# Developer Documentation

[<kbd>Русская версия</kbd>](DEVELOPMENT.md)

## Architecture

- `src/main.ts` owns the Obsidian plugin lifecycle, commands, status bar, session recovery, and view registration.
- `src/domain/` contains pure business logic: session defaults, session record creation, stored data merging, and status bar text.
- `src/services/` contains application services: timer, Focus Shield, system focus commands, statistics, and active-session orchestration.
- `src/ui/` contains modals, the Focus view, the Stats view, and the settings tab.
- `src/i18n.ts` defines supported languages and the shared helper that selects Russian or English copy.

## Local Development

```bash
npm install
npm run dev
```

`npm run dev` starts esbuild in watch mode and rebuilds `main.js` after changes. For local Obsidian checks, use this repository as `.obsidian/plugins/study-zen/` inside a test vault.

## Checks

Before a PR, run:

```bash
npm run typecheck
npm test
npm run lint
npm run build
npm run package
```

`npm run build` creates the production `main.js`. `npm run package` takes `main.js`, `manifest.json`, and `styles.css`, then creates the installable archive `release/study-zen-<version>.zip`.

## Release Process

- `CI` runs on pull requests and pushes to `main`; it checks tests, types, lint, build, and packages the installable zip as the `study-zen-plugin` artifact.
- `Release` runs on git tags, performs the same checks, builds the zip, and attaches it to the GitHub Release.
- The plugin version lives in `manifest.json`; Obsidian compatibility lives in `versions.json`.
- For version changes, use `npm version` or update `manifest.json` and `versions.json` through the existing `npm run version` project workflow.

## PR Checklist

- The change has one clear product or developer scope.
- User-visible UI copy goes through the language setting.
- New business logic or behavior changes have focused tests.
- README or docs are updated when user or developer workflows change.
- typecheck, test, lint, build, and package pass locally.
