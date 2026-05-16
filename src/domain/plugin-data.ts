import { DEFAULT_SETTINGS, FocusShieldSettings, StudySessionRecord, StudyZenData, StudyZenSettings, SystemFocusSettings } from "../types";

type StoredStudyZenSettings = Partial<Omit<StudyZenSettings, "focusShield" | "systemFocus">> & {
  focusShield?: Partial<FocusShieldSettings>;
  systemFocus?: Partial<SystemFocusSettings>;
};

export interface StoredStudyZenData {
  settings?: StoredStudyZenSettings;
  sessions?: StudySessionRecord[];
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
    sessions: stored?.sessions ?? []
  };
}
