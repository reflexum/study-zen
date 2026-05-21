import { beforeEach, describe, expect, it, vi } from "vitest";
import { Notice, Platform } from "obsidian";
import { SystemFocusService } from "../../src/services/system-focus-service";

const execMock = vi.fn();

vi.mock("child_process", () => ({
  exec: execMock
}));

interface NoticeConstructorHook {
  constructor__(message: string, duration?: number): void;
}

describe("SystemFocusService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    execMock.mockReset();
  });

  it("does not execute empty test commands", async () => {
    const noticeSpy = vi.spyOn(Notice.prototype as unknown as NoticeConstructorHook, "constructor__");
    const service = new SystemFocusService();

    await service.test("   ");

    expect(noticeSpy).toHaveBeenCalledWith("Тестовая команда системного фокуса Study Zen пустая.", undefined);
    expect(execMock).not.toHaveBeenCalled();
  });

  it("does not execute commands outside desktop Obsidian", async () => {
    const noticeSpy = vi.spyOn(Notice.prototype as unknown as NoticeConstructorHook, "constructor__");
    vi.spyOn(Platform, "isDesktopApp", "get").mockReturnValue(false);
    const service = new SystemFocusService();

    await service.runStart({ enabled: true, platformPreset: "custom", startCommand: "danger", endCommand: "" });

    expect(noticeSpy).toHaveBeenCalledWith("Команды системного фокуса Study Zen доступны только в desktop-версии.", undefined);
    expect(execMock).not.toHaveBeenCalled();
  });

  it("uses English system focus notices when English is selected", async () => {
    const noticeSpy = vi.spyOn(Notice.prototype as unknown as NoticeConstructorHook, "constructor__");
    const service = new SystemFocusService();

    await service.test("   ", "en");

    expect(noticeSpy).toHaveBeenCalledWith("Study Zen system focus test command is empty.", undefined);
    expect(execMock).not.toHaveBeenCalled();
  });
});
