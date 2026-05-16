import { Notice } from "obsidian";
import { createActiveSession, createInterruptedSessionRecord, createSessionRecord } from "../domain/session-records";
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
    private readonly onSessionSaved: (record: StudySessionRecord) => Promise<void>
  ) {}

  getActiveSession(): ActiveSession | null {
    return this.activeSession;
  }

  async start(input: StartSessionInput): Promise<boolean> {
    if (this.activeSession) {
      new Notice("Study Zen is already active.");
      return false;
    }

    const settings = this.getSettings();
    const token = ++this.lifecycleToken;
    const session = createActiveSession(input, Date.now(), crypto.randomUUID());
    this.activeSession = session;

    this.focusShield.apply(settings.focusShield);
    await this.systemFocus.runStart(settings.systemFocus);
    if (this.lifecycleToken !== token || this.activeSession !== session) {
      await this.systemFocus.runEnd(settings.systemFocus);
      return false;
    }
    this.timer.start(() => this.activeSession, this.getSettings, this.onTick);
    new Notice("Study Zen session started.");
    return true;
  }

  pause(): void {
    if (this.activeSession) this.activeSession.paused = true;
  }

  resume(): void {
    if (this.activeSession) this.activeSession.paused = false;
  }

  async stop(input: EndSessionInput): Promise<StudySessionRecord | null> {
    if (this.stopInFlight) return this.stopInFlight;

    if (!this.activeSession) {
      new Notice("No Study Zen session is active.");
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
    await this.systemFocus.runEnd(this.getSettings().systemFocus);

    const record = createSessionRecord(session, input, Date.now());

    try {
      await this.onSessionSaved(record);
    } catch (error) {
      console.error("Study Zen failed to save session", error);
      new Notice("Study Zen could not save the session. Please try stopping again.");
      this.activeSession = session;
      const settings = this.getSettings();
      try {
        this.focusShield.apply(settings.focusShield);
      } catch (restoreError) {
        console.error("Study Zen failed to reapply Focus Shield after save failure", restoreError);
      }
      try {
        await this.systemFocus.runStart(settings.systemFocus);
      } catch (systemFocusError) {
        console.error("Study Zen failed to restart system focus after save failure", systemFocusError);
      }
      this.timer.start(() => this.activeSession, this.getSettings, this.onTick);
      return null;
    }

    if (this.activeSession === session) this.activeSession = null;
    new Notice("Study Zen session saved.");
    return record;
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
        await this.systemFocus.runEnd(this.getSettings().systemFocus);
      } catch (error) {
        console.error("Study Zen failed to end system focus during unload", error);
      }
    }

    this.activeSession = null;
  }
}
