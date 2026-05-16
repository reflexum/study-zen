import { describe, expect, it, vi } from "vitest";
import { SessionService } from "../../src/services/session-service";
import { TimerService } from "../../src/services/timer-service";
import { SystemFocusService } from "../../src/services/system-focus-service";
import { FocusShieldService } from "../../src/services/focus-shield-service";
import { DEFAULT_SETTINGS, StudySessionRecord } from "../../src/types";

function makeHarness(onSessionSaved: (record: StudySessionRecord) => Promise<void> = async () => undefined) {
  const timer = {
    start: vi.fn(),
    stop: vi.fn()
  } as unknown as TimerService;
  const focusShield = {
    apply: vi.fn(),
    restore: vi.fn()
  } as unknown as FocusShieldService;
  const systemFocus = {
    runStart: vi.fn(async () => undefined),
    runEnd: vi.fn(async () => undefined)
  } as unknown as SystemFocusService;
  const onTick = vi.fn(() => undefined);
  const service = new SessionService(timer, focusShield, systemFocus, () => DEFAULT_SETTINGS, onTick, onSessionSaved);

  return { service, timer, focusShield, systemFocus };
}

describe("SessionService", () => {
  it("starts one active session and rejects duplicate starts", async () => {
    const { service, timer, focusShield, systemFocus } = makeHarness();

    await expect(service.start({ mode: "zen", goal: " Read ", expectedResult: " Notes ", plannedMinutes: 45 })).resolves.toBe(true);
    await expect(service.start({ mode: "sprint", goal: "Again", expectedResult: "Nope", plannedMinutes: 20 })).resolves.toBe(false);

    expect(service.getActiveSession()).toMatchObject({ goal: "Read", expectedResult: "Notes", mode: "zen" });
    expect(focusShield.apply).toHaveBeenCalledTimes(1);
    expect(systemFocus.runStart).toHaveBeenCalledTimes(1);
    expect(timer.start).toHaveBeenCalledTimes(1);
  });

  it("stops a session, saves a record, and clears active state", async () => {
    const saved: StudySessionRecord[] = [];
    const { service, timer, focusShield, systemFocus } = makeHarness(async (record) => {
      saved.push(record);
    });

    await service.start({ mode: "deep", goal: "Study", expectedResult: "Summary", plannedMinutes: 90 });
    const activeSession = service.getActiveSession();
    expect(activeSession).not.toBeNull();
    activeSession!.focusedSeconds = 1200;

    const record = await service.stop({ completed: true, interrupted: false, reflection: " Done ", focusRating: 4 });

    expect(record).toMatchObject({ mode: "deep", focusedSeconds: 1200, completed: true, reflection: "Done", focusRating: 4 });
    expect(saved).toHaveLength(1);
    expect(service.getActiveSession()).toBeNull();
    expect(timer.stop).toHaveBeenCalled();
    expect(focusShield.restore).toHaveBeenCalled();
    expect(systemFocus.runEnd).toHaveBeenCalled();
  });

  it("restores active session side effects when saving stop record fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { service, timer, focusShield, systemFocus } = makeHarness(async () => {
      throw new Error("save failed");
    });

    await service.start({ mode: "zen", goal: "Study", expectedResult: "Notes", plannedMinutes: 45 });
    const record = await service.stop({ completed: true, interrupted: false });

    expect(record).toBeNull();
    expect(service.getActiveSession()).not.toBeNull();
    expect(focusShield.apply).toHaveBeenCalledTimes(2);
    expect(systemFocus.runStart).toHaveBeenCalledTimes(2);
    expect(timer.start).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith("Study Zen failed to save session", expect.any(Error));
  });

  it("saves an interrupted record during unload", async () => {
    const saved: StudySessionRecord[] = [];
    const { service, timer, focusShield, systemFocus } = makeHarness(async (record) => {
      saved.push(record);
    });

    await service.start({ mode: "sprint", goal: "Flashcards", expectedResult: "10 cards", plannedMinutes: 20 });
    const activeSession = service.getActiveSession();
    expect(activeSession).not.toBeNull();
    activeSession!.focusedSeconds = 300;

    await service.unload();

    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ mode: "sprint", focusedSeconds: 300, completed: false, interrupted: true });
    expect(service.getActiveSession()).toBeNull();
    expect(timer.stop).toHaveBeenCalled();
    expect(focusShield.restore).toHaveBeenCalled();
    expect(systemFocus.runEnd).toHaveBeenCalled();
  });
});
