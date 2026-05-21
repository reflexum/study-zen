import { ActiveSession, modeLabel } from "../types";
import { StudyZenLanguage, bi } from "../i18n";

export function formatStatusText(session: ActiveSession | null, formatSeconds: (seconds: number) => string, language: StudyZenLanguage = "ru"): string {
  if (!session) return bi("Study Zen idle", "Study Zen ждёт", language);

  const state = session.paused ? ` ${bi("paused", "пауза", language)}` : "";
  if (session.mode === "pomodoro") {
    const phase = session.pomodoroPhase === "break" ? bi("break", "перерыв", language) : bi("focus", "фокус", language);
    return `Study Zen: ${modeLabel(session.mode, language)} (${phase})${state} · ${bi("elapsed", "прошло", language)} ${formatSeconds(session.elapsedSeconds)} · ${bi("focus", "фокус", language)} ${formatSeconds(session.focusedSeconds)}`;
  }

  return `Study Zen: ${modeLabel(session.mode, language)}${state} ${formatSeconds(session.focusedSeconds)}`;
}
