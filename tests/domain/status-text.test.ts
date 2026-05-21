import { describe, expect, it } from "vitest";
import { formatStatusText } from "../../src/domain/status-text";
import { ActiveSession } from "../../src/types";

const format = (seconds: number) => `${seconds}s`;

function session(overrides: Partial<ActiveSession>): ActiveSession {
  return {
    id: "session-1",
    mode: "zen",
    goal: "Study",
    expectedResult: "Notes",
    startedAt: 1,
    elapsedSeconds: 0,
    focusedSeconds: 0,
    paused: false,
    pomodoroCyclesCompleted: 0,
    lastCheckpointSeconds: 0,
    plannedCompletionNotified: false,
    ...overrides
  };
}

describe("status text business logic", () => {
  it("formats idle status", () => {
    expect(formatStatusText(null, format)).toBe("Study Zen ждёт");
  });

  it("formats regular study mode status", () => {
    expect(formatStatusText(session({ mode: "deep", focusedSeconds: 120 }), format)).toBe("Study Zen: Глубокая учёба 120s");
  });

  it("formats Pomodoro phase status with elapsed and focused time", () => {
    expect(formatStatusText(session({ mode: "pomodoro", pomodoroPhase: "break", elapsedSeconds: 1800, focusedSeconds: 1500, paused: true }), format)).toBe(
      "Study Zen: Помодоро (перерыв) пауза · прошло 1800s · фокус 1500s"
    );
  });

  it("formats English status when English is selected", () => {
    expect(formatStatusText(session({ mode: "deep", focusedSeconds: 120 }), format, "en")).toBe("Study Zen: Deep Study 120s");
  });
});
