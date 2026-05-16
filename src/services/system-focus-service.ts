import { Notice, Platform } from "obsidian";
import { SystemFocusSettings } from "../types";

export class SystemFocusService {
  async runStart(settings: SystemFocusSettings): Promise<void> {
    await this.runCommand(settings, settings.startCommand, "start");
  }

  async runEnd(settings: SystemFocusSettings): Promise<void> {
    await this.runCommand(settings, settings.endCommand, "end");
  }

  async test(command: string): Promise<void> {
    if (!command.trim()) {
      new Notice("Study Zen system focus test command is empty.");
      return;
    }
    if (!Platform.isDesktopApp) {
      new Notice("Study Zen system focus commands are desktop-only.");
      return;
    }

    try {
      await this.execCommand(command);
      new Notice("Study Zen system focus test command completed.");
    } catch (error) {
      console.error("Study Zen system focus test command failed", error);
      new Notice("Study Zen system focus test command failed. Check the command and try again.");
    }
  }

  private async runCommand(settings: SystemFocusSettings, command: string, label: string): Promise<void> {
    if (!settings.enabled || !command.trim()) return;
    if (!Platform.isDesktopApp) {
      new Notice("Study Zen system focus commands are desktop-only.");
      return;
    }

    try {
      await this.execCommand(command);
    } catch (error) {
      console.error(`Study Zen system focus ${label} command failed`, error);
      new Notice(`Study Zen system focus ${label} command failed. Session will continue.`);
    }
  }

  private async execCommand(command: string): Promise<void> {
    const { exec } = await import("child_process");
    return new Promise((resolve, reject) => {
      exec(command, { timeout: 5000 }, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}
