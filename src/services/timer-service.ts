import { ActiveSession, DEFAULT_SETTINGS, StudyZenSettings } from "../types";

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
    if (session.mode === "pomodoro") {
      return this.applyPomodoroPhaseTransition(session, settings);
    }

    if (session.mode === "deep") {
      const checkpointSeconds = settings.deepCheckpointMinutes * 60;
      if (checkpointSeconds > 0 && session.elapsedSeconds - session.lastCheckpointSeconds >= checkpointSeconds) {
        session.lastCheckpointSeconds = session.elapsedSeconds;
        return "Deep Study checkpoint: are you still with the goal?";
      }
    }

    return undefined;
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
      return "Break complete. Start the next focus round.";
    }

    session.pomodoroPhase = "break";
    session.pomodoroCyclesCompleted += 1;
    return "Focus round complete. Take a short break.";
  }
}
