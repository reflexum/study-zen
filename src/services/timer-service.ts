import { ActiveSession, DEFAULT_SETTINGS, StudyZenSettings } from "../types";
import { bi } from "../i18n";

export interface TimerEvent {
  session: ActiveSession;
  message?: string;
}

export class TimerService {
  private intervalId: number | null = null;

  start(getSession: () => ActiveSession | null, settings: () => StudyZenSettings, onTick: (event: TimerEvent) => void): void {
    this.stop();
    this.intervalId = window.setInterval(() => {
      const session = getSession();
      if (!session || session.paused) return;

      session.elapsedSeconds += 1;
      if (session.pomodoroPhase !== "break") session.focusedSeconds += 1;
      const message = this.getTickMessage(session, settings());
      onTick({ session, message });
    }, 1000);
  }

  stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  format(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  private getTickMessage(session: ActiveSession, settings: StudyZenSettings): string | undefined {
    let cycleMessage: string | undefined;

    if (session.mode === "pomodoro") {
      cycleMessage = this.applyPomodoroPhaseTransition(session, settings);
    } else if (session.mode === "deep") {
      const checkpointSeconds = settings.deepCheckpointMinutes * 60;
      if (checkpointSeconds > 0 && session.elapsedSeconds - session.lastCheckpointSeconds >= checkpointSeconds) {
        session.lastCheckpointSeconds = session.elapsedSeconds;
        cycleMessage = bi("Deep Study checkpoint: are you still with the goal?", "Контрольная точка глубокой учёбы: вы всё ещё держитесь цели?", settings.language);
      }
    }

    const completionMessage = this.getPlannedCompletionMessage(session, settings);
    if (cycleMessage && completionMessage) return `${completionMessage} ${cycleMessage}`;
    return cycleMessage ?? completionMessage;
  }

  private getPlannedCompletionMessage(session: ActiveSession, settings: StudyZenSettings): string | undefined {
    if (session.mode === "pomodoro") return undefined;

    const plannedSeconds = this.getPlannedFocusSeconds(session);
    if (plannedSeconds === null || session.plannedCompletionNotified || session.focusedSeconds < plannedSeconds) return undefined;

    session.plannedCompletionNotified = true;
    return bi("Planned focus time complete. Finish the session or continue intentionally.", "Плановое время фокуса завершено. Завершите сессию или осознанно продолжайте.", settings.language);
  }

  private getPlannedFocusSeconds(session: ActiveSession): number | null {
    if (!Number.isFinite(session.plannedMinutes) || session.plannedMinutes === undefined || session.plannedMinutes <= 0) return null;
    return session.plannedMinutes * 60;
  }

  private applyPomodoroPhaseTransition(session: ActiveSession, settings: StudyZenSettings): string | undefined {
    const focusMinutes = settings.pomodoroFocusMinutes > 0 ? settings.pomodoroFocusMinutes : DEFAULT_SETTINGS.pomodoroFocusMinutes;
    const breakMinutes = settings.pomodoroBreakMinutes > 0 ? settings.pomodoroBreakMinutes : DEFAULT_SETTINGS.pomodoroBreakMinutes;
    const focusSeconds = focusMinutes * 60;
    const breakSeconds = breakMinutes * 60;
    const phaseLength = session.pomodoroPhase === "break" ? breakSeconds : focusSeconds;

    const phaseStartedAtSeconds = session.phaseStartedAtSeconds ?? 0;
    if (session.elapsedSeconds - phaseStartedAtSeconds < phaseLength) return undefined;

    session.phaseStartedAtSeconds = session.elapsedSeconds;
    if (session.pomodoroPhase === "break") {
      session.pomodoroPhase = "focus";
      return bi("Break complete. Start the next focus round.", "Перерыв завершён. Начните следующий фокус-раунд.", settings.language);
    }

    session.pomodoroPhase = "break";
    session.pomodoroCyclesCompleted += 1;
    return bi("Focus round complete. Take a short break.", "Фокус-раунд завершён. Сделайте короткий перерыв.", settings.language);
  }
}
