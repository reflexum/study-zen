import { afterEach, describe, expect, it } from "vitest";
import { FocusShieldService } from "../../src/services/focus-shield-service";
import { DEFAULT_SETTINGS } from "../../src/types";

describe("FocusShieldService", () => {
  afterEach(() => {
    document.body.className = "";
  });

  it("applies configured focus classes to the workspace body", () => {
    const service = new FocusShieldService();

    service.apply(DEFAULT_SETTINGS.focusShield);

    expect(document.body.classList.contains("study-zen-active")).toBe(true);
    expect(document.body.classList.contains("study-zen-hide-ribbon")).toBe(true);
    expect(document.body.classList.contains("study-zen-dim-sidebars")).toBe(true);
    expect(document.body.classList.contains("study-zen-hide-notifications")).toBe(true);
    expect(document.body.classList.contains("study-zen-calm-editor")).toBe(true);
  });

  it("restores all focus classes", () => {
    const service = new FocusShieldService();
    service.apply(DEFAULT_SETTINGS.focusShield);

    service.restore();

    expect(Array.from(document.body.classList).filter((className) => className.startsWith("study-zen-"))).toEqual([]);
  });
});
