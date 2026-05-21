import { Notice } from "obsidian";
import { createActiveSession, createInterruptedSessionRecord, createSessionRecord } from "../domain/session-records";
import { bi } from "../i18n";
import { ActiveSession, EndSessionInput, StartSessionInput, StudySessionRecord, StudyZenSettings } from "../types";
import { FocusShieldService } from "./focus-shield-service";
import { SystemFocusService } from "./system-focus-service";
import { TimerEvent, TimerService } from "./timer-service";

export class SessionService {
  private activeSession: ActiveSession | null = null;
  private stopInFlight: Promise<StudySessionRecord | null> | null = null;
  private lifecycleToken = 0;

  constructor(
    private readonly timer: TimerService,
    private readonly focusShield: FocusShieldService,
    private readonly systemFocus: SystemFocusService,
    private readonly getSettings: () => StudyZenSettings,
    private readonly onTick: (event: TimerEvent) => void,
    private readonly onSessionSaved: (record: StudySessionRecord) => Promise<void>,
    private readonly onActiveSessionChanged: (session: ActiveSession | null) => void = () => undefined
  ) {}

  getActiveSession(): ActiveSession | null {
    return this.activeSession;
  }

  async start(input: StartSessionInput): Promise<boolean> {
    if (this.activeSession) {
      new Notice(this.t("Study Zen is already active.", "Study Zen уже активен."));
      return false;
    }

    const settings = this.getSettings();
    const token = ++this.lifecycleToken;
    const session = createActiveSession(input, Date.now(), crypto.randomUUID());
    this.setActiveSession(session);

    this.focusShield.apply(settings.focusShield);
    await this.systemFocus.runStart(settings.systemFocus, settings.language);
    if (this.lifecycleToken !== token || this.activeSession !== session) {
      if (this.activeSession === session) this.setActiveSession(null);
      await this.systemFocus.runEnd(settings.systemFocus, settings.language);
      return false;
    }
    this.timer.start(() => this.activeSession, this.getSettings, this.onTick);
    new Notice(this.t("Study Zen session started.", "Сессия Study Zen началась."));
    return true;
  }

  async restore(session: ActiveSession): Promise<boolean> {
    if (this.activeSession) {
      new Notice(this.t("Study Zen is already active.", "Study Zen уже активен."));
      return false;
    }

    const settings = this.getSettings();
    const token = ++this.lifecycleToken;
    const restoredSession: ActiveSession = { ...session, paused: false };
    this.setActiveSession(restoredSession);

    this.focusShield.apply(settings.focusShield);
    await this.systemFocus.runStart(settings.systemFocus, settings.language);
    if (this.lifecycleToken !== token || this.activeSession !== restoredSession) {
      if (this.activeSession === restoredSession) this.setActiveSession(null);
      await this.systemFocus.runEnd(settings.systemFocus, settings.language);
      return false;
    }

    this.timer.start(() => this.activeSession, this.getSettings, this.onTick);
    new Notice(this.t("Study Zen session restored.", "Сессия Study Zen восстановлена."));
    return true;
  }

  pause(): void {
    if (this.activeSession) {
      this.activeSession.paused = true;
      this.onActiveSessionChanged(this.activeSession);
    }
  }

  resume(): void {
    if (this.activeSession) {
      this.activeSession.paused = false;
      this.onActiveSessionChanged(this.activeSession);
    }
  }

  skipPomodoroBreak(): boolean {
    if (!this.activeSession || this.activeSession.mode !== "pomodoro" || this.activeSession.pomodoroPhase !== "break") return false;

    this.activeSession.pomodoroPhase = "focus";
    this.activeSession.phaseStartedAtSeconds = this.activeSession.elapsedSeconds;
    this.onActiveSessionChanged(this.activeSession);
    return true;
  }

  async stop(input: EndSessionInput): Promise<StudySessionRecord | null> {
    if (this.stopInFlight) return this.stopInFlight;

    if (!this.activeSession) {
      new Notice(this.t("No Study Zen session is active.", "Нет активной сессии Study Zen."));
      return null;
    }

    const stopPromise = this.stopActiveSession(input);
    this.stopInFlight = stopPromise;

    try {
      return await stopPromise;
    } finally {
      if (this.stopInFlight === stopPromise) this.stopInFlight = null;
    }
  }

  private async stopActiveSession(input: EndSessionInput): Promise<StudySessionRecord | null> {
    if (!this.activeSession) return null;

    const session = this.activeSession;
    this.lifecycleToken += 1;
    this.timer.stop();
    this.focusShield.restore();
    await this.systemFocus.runEnd(this.getSettings().systemFocus, this.getSettings().language);

    const record = createSessionRecord(session, input, Date.now());

    try {
      await this.onSessionSaved(record);
    } catch (error) {
      console.error("Study Zen failed to save session", error);
      new Notice(this.t("Study Zen could not save the session. Please try stopping again.", "Study Zen не смог сохранить сессию. Попробуйте завершить её ещё раз."));
      this.setActiveSession(session);
      const settings = this.getSettings();
      try {
        this.focusShield.apply(settings.focusShield);
      } catch (restoreError) {
        console.error("Study Zen failed to reapply Focus Shield after save failure", restoreError);
      }
      try {
        await this.systemFocus.runStart(settings.systemFocus, settings.language);
      } catch (systemFocusError) {
        console.error("Study Zen failed to restart system focus after save failure", systemFocusError);
      }
      this.timer.start(() => this.activeSession, this.getSettings, this.onTick);
      return null;
    }

    if (this.activeSession === session) this.setActiveSession(null);
    new Notice(this.t("Study Zen session saved.", "Сессия Study Zen сохранена."));
    return record;
  }

  async suspendForRecovery(): Promise<ActiveSession | null> {
    this.lifecycleToken += 1;
    const session = this.activeSession;
    this.timer.stop();

    try {
      this.focusShield.restore();
    } catch (error) {
      console.error("Study Zen failed to restore Focus Shield during suspend", error);
    }

    if (session) {
      session.paused = true;
      try {
        await this.systemFocus.runEnd(this.getSettings().systemFocus, this.getSettings().language);
      } catch (error) {
        console.error("Study Zen failed to end system focus during suspend", error);
      }
    }

    this.activeSession = null;
    return session ? { ...session } : null;
  }

  async unload(): Promise<void> {
    this.lifecycleToken += 1;
    const session = this.activeSession;
    this.timer.stop();

    if (session) {
      const record = createInterruptedSessionRecord(session, Date.now());

      try {
        await this.onSessionSaved(record);
      } catch (error) {
        console.error("Study Zen failed to save interrupted session during unload", error);
      }
    }

    try {
      this.focusShield.restore();
    } catch (error) {
      console.error("Study Zen failed to restore Focus Shield during unload", error);
    }

    if (session) {
      try {
        await this.systemFocus.runEnd(this.getSettings().systemFocus, this.getSettings().language);
      } catch (error) {
        console.error("Study Zen failed to end system focus during unload", error);
      }
    }

    this.setActiveSession(null);
  }

  private setActiveSession(session: ActiveSession | null): void {
    this.activeSession = session;
    this.onActiveSessionChanged(session);
  }

  private t(en: string, ru: string): string {
    return bi(en, ru, this.getSettings().language);
  }
}
