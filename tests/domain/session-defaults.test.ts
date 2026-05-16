import { describe, expect, it } from "vitest";
import { getDefaultPlannedMinutes } from "../../src/domain/session-defaults";
import { DEFAULT_SETTINGS } from "../../src/types";

describe("session defaults business logic", () => {
  it("returns configured default planned minutes for each study mode", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      zenDefaultMinutes: 40,
      sprintDefaultMinutes: 20,
      deepDefaultMinutes: 100,
      pomodoroFocusMinutes: 50
    };

    expect(getDefaultPlannedMinutes("zen", settings)).toBe(40);
    expect(getDefaultPlannedMinutes("sprint", settings)).toBe(20);
    expect(getDefaultPlannedMinutes("deep", settings)).toBe(100);
    expect(getDefaultPlannedMinutes("pomodoro", settings)).toBe(50);
  });
});
