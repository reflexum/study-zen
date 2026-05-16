import { ActiveSession, EndSessionInput, StartSessionInput, StudySessionRecord } from "../types";

export function createActiveSession(input: StartSessionInput, startedAt: number, id: string): ActiveSession {
  return {
    id,
    mode: input.mode,
    goal: input.goal.trim(),
    expectedResult: input.expectedResult.trim(),
    startedAt,
    plannedMinutes: input.plannedMinutes,
    elapsedSeconds: 0,
    focusedSeconds: 0,
    paused: false,
    pomodoroPhase: input.mode === "pomodoro" ? "focus" : undefined,
    phaseStartedAtSeconds: input.mode === "pomodoro" ? 0 : undefined,
    pomodoroCyclesCompleted: 0,
    lastCheckpointSeconds: 0
  };
}

export function createSessionRecord(session: ActiveSession, input: EndSessionInput, endedAt: number): StudySessionRecord {
  return {
    id: session.id,
    mode: session.mode,
    goal: session.goal,
    expectedResult: session.expectedResult,
    startedAt: new Date(session.startedAt).toISOString(),
    endedAt: new Date(endedAt).toISOString(),
    plannedMinutes: session.plannedMinutes,
    focusedSeconds: session.focusedSeconds,
    completed: input.completed,
    reflection: input.reflection?.trim(),
    focusRating: input.focusRating,
    interrupted: input.interrupted
  };
}

export function createInterruptedSessionRecord(session: ActiveSession, endedAt: number): StudySessionRecord {
  return {
    id: session.id,
    mode: session.mode,
    goal: session.goal,
    expectedResult: session.expectedResult,
    startedAt: new Date(session.startedAt).toISOString(),
    endedAt: new Date(endedAt).toISOString(),
    plannedMinutes: session.plannedMinutes,
    focusedSeconds: session.focusedSeconds,
    completed: false,
    interrupted: true
  };
}
