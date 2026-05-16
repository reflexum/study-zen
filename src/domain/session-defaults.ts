import { StudyMode, StudyZenSettings } from "../types";

export function getDefaultPlannedMinutes(mode: StudyMode, settings: StudyZenSettings): number {
  if (mode === "sprint") return settings.sprintDefaultMinutes;
  if (mode === "deep") return settings.deepDefaultMinutes;
  if (mode === "pomodoro") return settings.pomodoroFocusMinutes;
  return settings.zenDefaultMinutes;
}
