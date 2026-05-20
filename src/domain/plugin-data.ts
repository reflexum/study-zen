import { ActiveSession, DEFAULT_SETTINGS, FocusShieldSettings, StudySessionRecord, StudyZenData, StudyZenSettings, SystemFocusSettings } from "../types";

type StoredStudyZenSettings = Partial<Omit<StudyZenSettings, "focusShield" | "systemFocus">> & {
  focusShield?: Partial<FocusShieldSettings>;
  systemFocus?: Partial<SystemFocusSettings>;
};

export interface StoredStudyZenData {
  settings?: StoredStudyZenSettings;
  sessions?: StudySessionRecord[];
  activeSession?: ActiveSession | null;
}

export function mergeStudyZenData(stored: StoredStudyZenData | null | undefined): StudyZenData {
  return {
    settings: {
      ...DEFAULT_SETTINGS,
      ...stored?.settings,
      focusShield: {
        ...DEFAULT_SETTINGS.focusShield,
        ...stored?.settings?.focusShield
      },
      systemFocus: {
        ...DEFAULT_SETTINGS.systemFocus,
        ...stored?.settings?.systemFocus
      }
    },
    sessions: stored?.sessions ?? [],
    activeSession: mergeActiveSession(stored?.activeSession)
  };
}

function mergeActiveSession(session: ActiveSession | null | undefined): ActiveSession | null {
  if (!session) return null;

  return {
    ...session,
    elapsedSeconds: session.elapsedSeconds ?? 0,
    focusedSeconds: session.focusedSeconds ?? 0,
    paused: true,
    pomodoroCyclesCompleted: session.pomodoroCyclesCompleted ?? 0,
    lastCheckpointSeconds: session.lastCheckpointSeconds ?? 0,
    plannedCompletionNotified: session.plannedCompletionNotified ?? false
  };
}
