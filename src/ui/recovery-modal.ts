import { App, Modal, Setting } from "obsidian";
import { createInterruptedSessionRecord } from "../domain/session-records";
import { bi } from "../i18n";
import { ActiveSession, StudySessionRecord, modeLabel } from "../types";

export interface RecoveryModalActions {
  resume: (session: ActiveSession) => Promise<boolean>;
  saveInterrupted: (record: StudySessionRecord) => Promise<void>;
  discard: () => Promise<void>;
}

export class RecoveryModal extends Modal {
  private working = false;

  constructor(
    app: App,
    private readonly session: ActiveSession,
    private readonly formatSeconds: (seconds: number) => string,
    private readonly actions: RecoveryModalActions
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: bi("Restore focus session", "Восстановить сессию фокуса") });
    contentEl.createEl("p", {
      text: bi(
        "Study Zen found an unfinished session from your previous Obsidian run.",
        "Study Zen нашёл незавершённую сессию из предыдущего запуска Obsidian."
      )
    });

    const summary = contentEl.createDiv({ cls: "study-zen-recovery-summary" });
    summary.createDiv({ text: `${bi("Mode", "Режим")}: ${modeLabel(this.session.mode)}` });
    summary.createDiv({ text: `${bi("Goal", "Цель")}: ${this.session.goal}` });
    summary.createDiv({ text: `${bi("Focused", "В фокусе")}: ${this.formatSeconds(this.session.focusedSeconds)}` });

    new Setting(contentEl).addButton((button) => {
      button
        .setButtonText(bi("Resume", "Продолжить"))
        .setCta()
        .onClick(async () => {
          if (this.working) return;
          this.working = true;
          button.setDisabled(true).setButtonText(bi("Restoring...", "Восстановление..."));
          const restored = await this.actions.resume({ ...this.session, paused: false });
          this.working = false;
          if (restored) this.close();
          else button.setDisabled(false).setButtonText(bi("Resume", "Продолжить"));
        });
    });

    new Setting(contentEl).addButton((button) => {
      button.setButtonText(bi("Save as interrupted", "Сохранить как прерванную")).onClick(async () => {
        if (this.working) return;
        this.working = true;
        button.setDisabled(true).setButtonText(bi("Saving...", "Сохранение..."));
        await this.actions.saveInterrupted(createInterruptedSessionRecord(this.session, Date.now()));
        this.working = false;
        this.close();
      });
    });

    new Setting(contentEl).addButton((button) => {
      button.setButtonText(bi("Discard", "Сбросить")).onClick(async () => {
        if (this.working) return;
        this.working = true;
        button.setDisabled(true);
        await this.actions.discard();
        this.working = false;
        this.close();
      });
    });
  }
}
