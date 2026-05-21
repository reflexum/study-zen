import { Notice, Platform } from "obsidian";
import { StudyZenLanguage, bi } from "../i18n";
import { SystemFocusSettings } from "../types";

export class SystemFocusService {
  async runStart(settings: SystemFocusSettings, language: StudyZenLanguage = "ru"): Promise<void> {
    await this.runCommand(settings, settings.startCommand, "start", language);
  }

  async runEnd(settings: SystemFocusSettings, language: StudyZenLanguage = "ru"): Promise<void> {
    await this.runCommand(settings, settings.endCommand, "end", language);
  }

  async test(command: string, language: StudyZenLanguage = "ru"): Promise<void> {
    if (!command.trim()) {
      new Notice(bi("Study Zen system focus test command is empty.", "Тестовая команда системного фокуса Study Zen пустая.", language));
      return;
    }
    if (!Platform.isDesktopApp) {
      new Notice(bi("Study Zen system focus commands are desktop-only.", "Команды системного фокуса Study Zen доступны только в desktop-версии.", language));
      return;
    }

    try {
      await this.execCommand(command);
      new Notice(bi("Study Zen system focus test command completed.", "Тестовая команда системного фокуса Study Zen выполнена.", language));
    } catch (error) {
      console.error("Study Zen system focus test command failed", error);
      new Notice(bi("Study Zen system focus test command failed. Check the command and try again.", "Тестовая команда системного фокуса Study Zen не выполнена. Проверьте команду и попробуйте снова.", language));
    }
  }

  private async runCommand(settings: SystemFocusSettings, command: string, label: string, language: StudyZenLanguage): Promise<void> {
    if (!settings.enabled || !command.trim()) return;
    if (!Platform.isDesktopApp) {
      new Notice(bi("Study Zen system focus commands are desktop-only.", "Команды системного фокуса Study Zen доступны только в desktop-версии.", language));
      return;
    }

    try {
      await this.execCommand(command);
    } catch (error) {
      console.error(`Study Zen system focus ${label} command failed`, error);
      new Notice(bi(`Study Zen system focus ${label} command failed. Session will continue.`, `Команда системного фокуса Study Zen (${label}) не выполнена. Сессия продолжится.`, language));
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
