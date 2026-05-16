import { describe, expect, it } from "vitest";
import { StatsService } from "../../src/services/stats-service";
import { StudyMode, StudySessionRecord } from "../../src/types";

function localIsoDate(dayOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

function session(overrides: Partial<StudySessionRecord>): StudySessionRecord {
  return {
    id: crypto.randomUUID(),
    mode: "zen" as StudyMode,
    goal: "Read chapter",
    expectedResult: "Notes written",
    startedAt: localIsoDate(0),
    endedAt: localIsoDate(0),
    focusedSeconds: 1800,
    completed: true,
    interrupted: false,
    ...overrides
  };
}

describe("StatsService", () => {
  it("calculates totals, completion rate, streak, and most used mode", () => {
    const service = new StatsService();
    const stats = service.calculate([
      session({ mode: "sprint", focusedSeconds: 1200, completed: true, startedAt: localIsoDate(-1) }),
      session({ mode: "sprint", focusedSeconds: 1800, completed: false, startedAt: localIsoDate(0) }),
      session({ mode: "deep", focusedSeconds: 3600, completed: true, startedAt: localIsoDate(0) })
    ]);

    expect(stats.totalFocusSeconds).toBe(6600);
    expect(stats.completedSessions).toBe(2);
    expect(stats.totalSessions).toBe(3);
    expect(stats.completionRate).toBeCloseTo(2 / 3);
    expect(stats.currentStreak).toBeGreaterThanOrEqual(2);
    expect(stats.averageSessionSeconds).toBe(2200);
    expect(stats.mostUsedMode).toBe("sprint");
  });

  it("groups focus time and completed sessions by local day", () => {
    const service = new StatsService();
    const today = localIsoDate(0);

    const days = service.daily([
      session({ startedAt: today, focusedSeconds: 600, completed: true }),
      session({ startedAt: today, focusedSeconds: 900, completed: false })
    ]);

    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({ focusSeconds: 1500, completedSessions: 1 });
  });
});
