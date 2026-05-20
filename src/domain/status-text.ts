import { ActiveSession, modeLabel } from "../types";
import { bi } from "../i18n";

export function formatStatusText(session: ActiveSession | null, formatSeconds: (seconds: number) => string): string {
  if (!session) return bi("Study Zen idle", "Study Zen ждёт");

  const state = session.paused ? ` ${bi("paused", "пауза")}` : "";
  if (session.mode === "pomodoro") {
    const phase = session.pomodoroPhase === "break" ? bi("break", "перерыв") : bi("focus", "фокус");
    return `Study Zen: ${modeLabel(session.mode)} (${phase})${state} · ${bi("elapsed", "прошло")} ${formatSeconds(session.elapsedSeconds)} · ${bi("focus", "фокус")} ${formatSeconds(session.focusedSeconds)}`;
  }

  return `Study Zen: ${modeLabel(session.mode)}${state} ${formatSeconds(session.focusedSeconds)}`;
}
