import { describe, expect, it } from "vitest";
import { mergeStudyZenData } from "../../src/domain/plugin-data";
import { DEFAULT_SETTINGS } from "../../src/types";

describe("plugin data business logic", () => {
  it("merges nested settings with defaults without losing new keys", () => {
    const data = mergeStudyZenData({
      settings: {
        defaultMode: "deep",
        focusShield: { enabled: false },
        systemFocus: { enabled: true, startCommand: "start" }
      },
      sessions: []
    });

    expect(data.settings.defaultMode).toBe("deep");
    expect(data.settings.focusShield).toEqual({ ...DEFAULT_SETTINGS.focusShield, enabled: false });
    expect(data.settings.systemFocus).toEqual({ ...DEFAULT_SETTINGS.systemFocus, enabled: true, startCommand: "start" });
  });

  it("falls back to defaults and empty sessions when stored data is null", () => {
    const data = mergeStudyZenData(null);

    expect(data.settings).toEqual(DEFAULT_SETTINGS);
    expect(data.sessions).toEqual([]);
  });
});
