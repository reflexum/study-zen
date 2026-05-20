import { App, Modal, Notice, Setting } from "obsidian";
import { bi } from "../i18n";
import { ActiveSession, EndSessionInput, modeLabel } from "../types";

export class EndSessionModal extends Modal {
  private completed = true;
  private reflection = "";
  private focusRating = 4;
  private saving = false;

  constructor(
    app: App,
    private readonly interrupted: boolean,
    private readonly session: ActiveSession | null,
    private readonly formatSeconds: (seconds: number) => string,
    private readonly onSubmit: (input: EndSessionInput) => Promise<boolean>
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: bi("Finish Study Zen", "Завершить Study Zen") });

    if (this.session) {
      const summary = contentEl.createDiv({ cls: "study-zen-end-summary" });
      summary.createDiv({ text: `${bi("Mode", "Режим")}: ${modeLabel(this.session.mode)}` });
      summary.createDiv({ text: `${bi("Goal", "Цель")}: ${this.session.goal}` });
      summary.createDiv({ text: `${bi("Focused", "В фокусе")}: ${this.formatSeconds(this.session.focusedSeconds)}` });
      summary.createDiv({ text: `${bi("Elapsed", "Прошло")}: ${this.formatSeconds(this.session.elapsedSeconds)}` });
    }

    new Setting(contentEl).setName(bi("Goal completed", "Цель выполнена")).addToggle((toggle) => {
      toggle.setValue(this.completed).onChange((value) => {
        this.completed = value;
      });
    });

    new Setting(contentEl).setName(bi("Reflection", "Рефлексия")).addTextArea((text) => {
      text.setPlaceholder(bi("What did you learn or notice?", "Что вы поняли или заметили?")).onChange((value) => {
        this.reflection = value;
      });
    });

    const focusRatingSetting = new Setting(contentEl).setName(bi("Focus rating", "Оценка фокуса")).setDesc(this.focusRatingDesc());
    focusRatingSetting.addSlider((slider) => {
      slider.setLimits(1, 5, 1).setValue(this.focusRating).onChange((value) => {
        this.focusRating = value;
        focusRatingSetting.setDesc(this.focusRatingDesc());
      });
    });

    new Setting(contentEl).addButton((button) => {
      button
        .setButtonText(bi("Save session", "Сохранить сессию"))
        .setCta()
        .onClick(async () => {
          if (this.saving) return;
          this.saving = true;
          button.setDisabled(true).setButtonText(bi("Saving...", "Сохранение..."));
          let saved = false;
          try {
            saved = await this.onSubmit({ completed: this.completed, reflection: this.reflection, focusRating: this.focusRating, interrupted: this.interrupted });
          } catch (error) {
            console.error("Study Zen failed to finish session", error);
            new Notice(bi("Study Zen could not finish the session. Please try again.", "Study Zen не смог завершить сессию. Попробуйте ещё раз."));
          }
          this.saving = false;
          if (saved) {
            this.close();
            return;
          }

          button.setDisabled(false).setButtonText(bi("Save session", "Сохранить сессию"));
        });
    });
  }

  private focusRatingDesc(): string {
    return bi(`Current: ${this.focusRating} (1 low, 5 high)`, `Сейчас: ${this.focusRating} (1 низко, 5 высоко)`);
  }
}
