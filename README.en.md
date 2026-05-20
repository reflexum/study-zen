# Study Zen

[<kbd>Русская версия</kbd>](README.md)

Study Zen is an Obsidian desktop plugin for deliberate study focus: structured sessions, a calm focus mode, visual timers, local statistics, and recovery for unfinished work.

## Product Scenario

Study Zen is designed for students and independent researchers who keep notes, sources, and study plans in Obsidian. The plugin turns a study session into a small ritual: choose an intention, reduce workspace noise, keep a visible timer, then finish with a reflection. The goal is not only to measure time, but to build a habit of deliberate concentration.

## Features

- Start structured study sessions from Obsidian.
- Choose between Zen Session, Pomodoro, Study Sprint, and Deep Study modes.
- Reduce distractions with Focus Shield UI styling and optional muted Obsidian notices.
- Use a dedicated Focus view with visual progress, active goal, Pomodoro phase countdown, and quick pause/resume/finish controls.
- Restore unfinished active sessions after Obsidian restarts.
- Track focus time, completion rate, interruption rate, streaks, daily focus, focus ratings, best focus window, and recent sessions.
- Get local recommendations based on session history and work patterns.
- Optionally run desktop system focus commands when sessions start and end.

## Quick Start

Use the command palette:

- `Study Zen: Start session / Начать сессию` - choose mode, goal, result, and duration.
- `Study Zen: Stop session / Завершить сессию` - finish the session and save reflection.
- `Study Zen: Pause session / Поставить на паузу` - pause the active timer.
- `Study Zen: Resume session / Продолжить сессию` - resume the active timer.
- `Study Zen: Open focus view / Открыть экран фокуса` - open the visual focus dashboard.
- `Study Zen: Open stats / Открыть статистику` - view focus statistics and recommendations.

## Installation

1. Download the latest `study-zen-<version>.zip` from GitHub Releases.
2. Extract it to `.obsidian/plugins/study-zen/` in your vault.
3. Enable Study Zen in Obsidian settings.

## Privacy

- Session history, settings, and active-session recovery data stay in Obsidian plugin data.
- No cloud sync or external analytics are used.
- System Focus commands run locally only when explicitly enabled.

## Development

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
```

The production build creates `main.js` at the repository root. Release artifacts are `main.js`, `manifest.json`, and `styles.css`.

## License

MIT
