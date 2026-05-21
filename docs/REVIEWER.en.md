# Project Review

[<kbd>Русская версия</kbd>](REVIEWER.md)

This document helps reviewers quickly verify that the repository has source code, documentation, and a way to run the product without building from source.

## Requirements

- Product source code: `src/`, `manifest.json`, `styles.css`, and `main.js` after a production build.
- User documentation: `README.md` and `README.en.md`.
- Developer documentation: `docs/DEVELOPMENT.md` and `docs/DEVELOPMENT.en.md`.
- Installer: the `study-zen-<version>.zip` archive in GitHub Releases or the `study-zen-plugin` artifact from a successful CI run.

## Install Without Building

Primary path:

1. Open the project's GitHub Releases.
2. Download the latest `study-zen-<version>.zip`.
3. Extract the archive to `.obsidian/plugins/study-zen/` inside a test vault.
4. Enable Study Zen in Obsidian settings.

If a tagged release has not been created yet:

1. Open the GitHub Actions tab.
2. Select the latest successful `CI` workflow for `main` or the current PR.
3. Download the `study-zen-plugin` artifact.
4. Extract the nested `study-zen-<version>.zip` to `.obsidian/plugins/study-zen/`.
5. Enable Study Zen in Obsidian settings.

## Smoke Test

1. Open the Obsidian command palette and run `Study Zen: Start session`.
2. Choose a mode, goal, expected result, and duration.
3. Check the Focus view: timer, goal, progress, and controls.
4. Pause, resume, and finish the session.
5. Open Stats and confirm that the saved session appears in history.
6. Change the interface language in Study Zen settings and confirm that the UI updates.
