import { describe, expect, it } from "vitest";
import { createActiveSession, createInterruptedSessionRecord, createSessionRecord } from "../../src/domain/session-records";
import { EndSessionInput, StartSessionInput } from "../../src/types";

describe("session record business logic", () => {
  it("creates a trimmed active session with Pomodoro phase metadata", () => {
    const input: StartSessionInput = {
      mode: "pomodoro",
      goal: "  Learn intervals  ",
      expectedResult: "  Solve 10 tasks  ",
      plannedMinutes: 25
    };

    const session = createActiveSession(input, 1_700_000_000_000, "session-1");

    expect(session).toMatchObject({
      id: "session-1",
      mode: "pomodoro",
      goal: "Learn intervals",
      expectedResult: "Solve 10 tasks",
      startedAt: 1_700_000_000_000,
      plannedMinutes: 25,
      elapsedSeconds: 0,
      focusedSeconds: 0,
      paused: false,
      pomodoroPhase: "focus",
      phaseStartedAtSeconds: 0,
      pomodoroCyclesCompleted: 0,
      lastCheckpointSeconds: 0,
      plannedCompletionNotified: false
    });
  });

  it("creates a completed session record from active session and end input", () => {
    const session = createActiveSession({ mode: "deep", goal: "Read", expectedResult: "Summary", plannedMinutes: 90 }, 1_700_000_000_000, "session-2");
    session.focusedSeconds = 3600;
    const endInput: EndSessionInput = {
      completed: true,
      interrupted: false,
      reflection: "  Good focus  ",
      focusRating: 5
    };

    const record = createSessionRecord(session, endInput, 1_700_003_600_000);

    expect(record).toMatchObject({
      id: "session-2",
      mode: "deep",
      goal: "Read",
      expectedResult: "Summary",
      startedAt: "2023-11-14T22:13:20.000Z",
      endedAt: "2023-11-14T23:13:20.000Z",
      plannedMinutes: 90,
      focusedSeconds: 3600,
      completed: true,
      interrupted: false,
      reflection: "Good focus",
      focusRating: 5
    });
  });

  it("creates an interrupted incomplete record for unload", () => {
    const session = createActiveSession({ mode: "zen", goal: "Read", expectedResult: "Notes" }, 1_700_000_000_000, "session-3");
    session.focusedSeconds = 900;

    const record = createInterruptedSessionRecord(session, 1_700_000_900_000);

    expect(record).toMatchObject({
      id: "session-3",
      completed: false,
      interrupted: true,
      focusedSeconds: 900,
      endedAt: "2023-11-14T22:28:20.000Z"
    });
  });
});
