import { bi } from "./i18n";

export type StudyMode = "zen" | "pomodoro" | "sprint" | "deep";
export type PomodoroPhase = "focus" | "break";

export const STUDY_MODES: StudyMode[] = ["zen", "pomodoro", "sprint", "deep"];

export interface FocusShieldSettings {
  enabled: boolean;
  hideRibbon: boolean;
  dimSidebars: boolean;
  hideStatusBar: boolean;
  hideNotifications: boolean;
  calmEditor: boolean;
}

export interface SystemFocusSettings {
  enabled: boolean;
  platformPreset: "custom" | "macos-shortcuts" | "linux-custom" | "windows-powershell";
  startCommand: string;
  endCommand: string;
}

export const SYSTEM_FOCUS_PLATFORM_PRESETS: Record<SystemFocusSettings["platformPreset"], { label: string; description: string }> = {
  custom: { label: bi("Custom", "Свои команды"), description: bi("Use your own local shell commands.", "Используйте собственные локальные shell-команды.") },
  "macos-shortcuts": {
    label: "macOS Shortcuts",
    description: bi("Run local commands that trigger macOS Shortcuts or Focus.", "Запускайте локальные команды для macOS Shortcuts или Focus.")
  },
  "linux-custom": { label: bi("Linux custom", "Linux свои команды"), description: bi("Run local Linux desktop focus commands.", "Запускайте локальные команды фокуса для Linux desktop.") },
  "windows-powershell": {
    label: "Windows PowerShell",
    description: bi("Run local PowerShell commands for focus or notifications.", "Запускайте локальные PowerShell-команды для фокуса или уведомлений.")
  }
};

export interface StudyZenSettings {
  defaultMode: StudyMode;
  zenDefaultMinutes: number;
  sprintDefaultMinutes: number;
  deepDefaultMinutes: number;
  deepCheckpointMinutes: number;
  pomodoroFocusMinutes: number;
  pomodoroBreakMinutes: number;
  focusShield: FocusShieldSettings;
  systemFocus: SystemFocusSettings;
}

export interface StudySessionRecord {
  id: string;
  mode: StudyMode;
  goal: string;
  expectedResult: string;
  startedAt: string;
  endedAt: string;
  plannedMinutes?: number;
  focusedSeconds: number;
  completed: boolean;
  reflection?: string;
  focusRating?: number;
  interrupted: boolean;
}

export interface ActiveSession {
  id: string;
  mode: StudyMode;
  goal: string;
  expectedResult: string;
  startedAt: number;
  plannedMinutes?: number;
  elapsedSeconds: number;
  focusedSeconds: number;
  paused: boolean;
  pomodoroPhase?: PomodoroPhase;
  phaseStartedAtSeconds?: number;
  pomodoroCyclesCompleted: number;
  lastCheckpointSeconds: number;
  plannedCompletionNotified: boolean;
}

export interface StudyZenData {
  settings: StudyZenSettings;
  sessions: StudySessionRecord[];
  activeSession: ActiveSession | null;
}

export interface StartSessionInput {
  mode: StudyMode;
  goal: string;
  expectedResult: string;
  plannedMinutes?: number;
}

export interface EndSessionInput {
  completed: boolean;
  reflection?: string;
  focusRating?: number;
  interrupted: boolean;
}

export const DEFAULT_SETTINGS: StudyZenSettings = {
  defaultMode: "zen",
  zenDefaultMinutes: 45,
  sprintDefaultMinutes: 25,
  deepDefaultMinutes: 90,
  deepCheckpointMinutes: 30,
  pomodoroFocusMinutes: 25,
  pomodoroBreakMinutes: 5,
  focusShield: {
    enabled: true,
    hideRibbon: true,
    dimSidebars: true,
    hideStatusBar: false,
    hideNotifications: true,
    calmEditor: true
  },
  systemFocus: {
    enabled: false,
    platformPreset: "custom",
    startCommand: "",
    endCommand: ""
  }
};

export const VIEW_TYPE_STUDY_ZEN_STATS = "study-zen-stats";
export const VIEW_TYPE_STUDY_ZEN_FOCUS = "study-zen-focus";

export function modeLabel(mode: StudyMode): string {
  switch (mode) {
    case "zen":
      return bi("Zen Session", "Дзен-сессия");
    case "pomodoro":
      return bi("Pomodoro", "Помодоро");
    case "sprint":
      return bi("Study Sprint", "Учебный спринт");
    case "deep":
      return bi("Deep Study", "Глубокая учёба");
  }
}
