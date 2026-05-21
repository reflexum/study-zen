export type StudyZenLanguage = "ru" | "en";

export const STUDY_ZEN_LANGUAGES: Record<StudyZenLanguage, string> = {
  ru: "Русский",
  en: "English"
};

export function bi(en: string, ru: string, language: StudyZenLanguage = "ru"): string {
  return language === "en" ? en : ru;
}
