import { afterEach, describe, expect, it, vi } from "vitest";
import { TimerService } from "../../src/services/timer-service";
import { ActiveSession, DEFAULT_SETTINGS } from "../../src/types";

function pomodoroSession(): ActiveSession {
  return {
    id: "session-1",
    mode: "pomodoro",
    goal: "Study",
    expectedResult: "Finish notes",
    startedAt: Date.now(),
    plannedMinutes: 25,
    elapsedSeconds: 0,
    focusedSeconds: 0,
    paused: false,
    pomodoroPhase: "focus",
    phaseStartedAtSeconds: 0,
    pomodoroCyclesCompleted: 0,
    lastCheckpointSeconds: 0,
    plannedCompletionNotified: false
  };
}

describe("TimerService", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps Pomodoro break time out of focused seconds", () => {
    vi.useFakeTimers();
    const service = new TimerService();
    const activeSession = pomodoroSession();
    const messages: string[] = [];

    service.start(
      () => activeSession,
      () => DEFAULT_SETTINGS,
      (event) => {
        if (event.message) messages.push(event.message);
      }
    );

    vi.advanceTimersByTime(DEFAULT_SETTINGS.pomodoroFocusMinutes * 60 * 1000);
    expect(activeSession.elapsedSeconds).toBe(1500);
    expect(activeSession.focusedSeconds).toBe(1500);
    expect(activeSession.pomodoroPhase).toBe("break");
    expect(messages).toContain("Focus round complete. Take a short break. / Фокус-раунд завершён. Сделайте короткий перерыв.");

    vi.advanceTimersByTime(DEFAULT_SETTINGS.pomodoroBreakMinutes * 60 * 1000);
    expect(activeSession.elapsedSeconds).toBe(1800);
    expect(activeSession.focusedSeconds).toBe(1500);
    expect(activeSession.pomodoroPhase).toBe("focus");
    expect(messages).toContain("Break complete. Start the next focus round. / Перерыв завершён. Начните следующий фокус-раунд.");

    service.stop();
  });

  it("falls back to safe Pomodoro durations when settings are invalid", () => {
    vi.useFakeTimers();
    const service = new TimerService();
    const activeSession = pomodoroSession();

    service.start(
      () => activeSession,
      () => ({ ...DEFAULT_SETTINGS, pomodoroFocusMinutes: 0, pomodoroBreakMinutes: -1 }),
      () => undefined
    );

    vi.advanceTimersByTime(DEFAULT_SETTINGS.pomodoroFocusMinutes * 60 * 1000);

    expect(activeSession.pomodoroPhase).toBe("break");
    expect(activeSession.focusedSeconds).toBe(1500);

    service.stop();
  });

  it("notifies once when planned focus time is complete", () => {
    vi.useFakeTimers();
    const service = new TimerService();
    const activeSession = {
      ...pomodoroSession(),
      mode: "sprint" as const,
      plannedMinutes: 1,
      pomodoroPhase: undefined,
      phaseStartedAtSeconds: undefined
    };
    const messages: string[] = [];

    service.start(
      () => activeSession,
      () => DEFAULT_SETTINGS,
      (event) => {
        if (event.message) messages.push(event.message);
      }
    );

    vi.advanceTimersByTime(61 * 1000);

    expect(messages).toEqual(["Planned focus time complete. Finish the session or continue intentionally. / Плановое время фокуса завершено. Завершите сессию или осознанно продолжайте."]);
    expect(activeSession.plannedCompletionNotified).toBe(true);

    service.stop();
  });
});
