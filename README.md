# Study Zen

Obsidian plugin for focused study sessions, quiet mode, timers, and local study statistics.

## Features

- Start structured study sessions from Obsidian.
- Choose between Zen Session, Pomodoro, Study Sprint, and Deep Study modes.
- Reduce distractions with Focus Shield UI styling.
- Track focus time, completion rate, streaks, daily focus, and recent sessions.
- Get lightweight local recommendations based on session history.
- Optionally run desktop system focus commands when sessions start and end.

## Installation

### From Release

1. Download the latest `study-zen-<version>.zip` from GitHub Releases.
2. Extract it to `.obsidian/plugins/study-zen/` in your vault.
3. Enable Study Zen in Obsidian settings.

### Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from a release.
2. Place them in `.obsidian/plugins/study-zen/`.
3. Enable the plugin.

## Quick Start

Use the command palette:

- `Study Zen: Start session` - choose mode, goal, result, and duration.
- `Study Zen: Stop session` - finish the session and save reflection.
- `Study Zen: Pause session` - pause the active timer.
- `Study Zen: Resume session` - resume the active timer.
- `Study Zen: Open stats` - view focus statistics and recommendations.

## Study Modes

- **Zen Session**: flexible open-ended learning session.
- **Pomodoro**: focus and break cycles.
- **Study Sprint**: short session for one concrete outcome.
- **Deep Study**: longer session with checkpoint reminders.

## Settings

### Session Defaults

- Default session mode.
- Default durations for Zen Session, Study Sprint, and Deep Study.
- Pomodoro focus and break durations.
- Deep Study checkpoint interval.

### Focus Shield

- Hide ribbon.
- Dim sidebars.
- Hide status bar.
- Add calmer editor styling.

### System Focus

System Focus is desktop-only and disabled by default. It can run local shell commands when a session starts or ends. Use it for macOS Shortcuts, Linux notification tools, Windows PowerShell scripts, or custom focus automation.

Review commands before enabling this feature.

## Privacy

- Session history and settings stay in Obsidian plugin data.
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
