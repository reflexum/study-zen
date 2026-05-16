import { ActiveSession, modeLabel } from "../types";

export function formatStatusText(session: ActiveSession | null, formatSeconds: (seconds: number) => string): string {
  if (!session) return "Study Zen idle";

  const state = session.paused ? " paused" : "";
  if (session.mode === "pomodoro") {
    const phase = session.pomodoroPhase === "break" ? "break" : "focus";
    return `Study Zen: ${modeLabel(session.mode)} (${phase})${state} elapsed ${formatSeconds(session.elapsedSeconds)} · focus ${formatSeconds(session.focusedSeconds)}`;
  }

  return `Study Zen: ${modeLabel(session.mode)}${state} ${formatSeconds(session.focusedSeconds)}`;
}
