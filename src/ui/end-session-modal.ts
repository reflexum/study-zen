import { App, Modal, Notice, Setting } from "obsidian";
import { StudyZenLanguage, bi } from "../i18n";
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
    private readonly language: StudyZenLanguage,
    private readonly onSubmit: (input: EndSessionInput) => Promise<boolean>
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: this.t("Finish Study Zen", "Завершить Study Zen") });

    if (this.session) {
      const summary = contentEl.createDiv({ cls: "study-zen-end-summary" });
      summary.createDiv({ text: `${this.t("Mode", "Режим")}: ${modeLabel(this.session.mode, this.language)}` });
      summary.createDiv({ text: `${this.t("Goal", "Цель")}: ${this.session.goal}` });
      summary.createDiv({ text: `${this.t("Focused", "В фокусе")}: ${this.formatSeconds(this.session.focusedSeconds)}` });
      summary.createDiv({ text: `${this.t("Elapsed", "Прошло")}: ${this.formatSeconds(this.session.elapsedSeconds)}` });
    }

    new Setting(contentEl).setName(this.t("Goal completed", "Цель выполнена")).addToggle((toggle) => {
      toggle.setValue(this.completed).onChange((value) => {
        this.completed = value;
      });
    });

    new Setting(contentEl).setName(this.t("Reflection", "Рефлексия")).addTextArea((text) => {
      text.setPlaceholder(this.t("What did you learn or notice?", "Что вы поняли или заметили?")).onChange((value) => {
        this.reflection = value;
      });
    });

    const focusRatingSetting = new Setting(contentEl).setName(this.t("Focus rating", "Оценка фокуса")).setDesc(this.focusRatingDesc());
    focusRatingSetting.addSlider((slider) => {
      slider.setLimits(1, 5, 1).setValue(this.focusRating).onChange((value) => {
        this.focusRating = value;
        focusRatingSetting.setDesc(this.focusRatingDesc());
      });
    });

    new Setting(contentEl).addButton((button) => {
      button
        .setButtonText(this.t("Save session", "Сохранить сессию"))
        .setCta()
        .onClick(async () => {
          if (this.saving) return;
          this.saving = true;
          button.setDisabled(true).setButtonText(this.t("Saving...", "Сохранение..."));
          let saved = false;
          try {
            saved = await this.onSubmit({ completed: this.completed, reflection: this.reflection, focusRating: this.focusRating, interrupted: this.interrupted });
          } catch (error) {
            console.error("Study Zen failed to finish session", error);
            new Notice(this.t("Study Zen could not finish the session. Please try again.", "Study Zen не смог завершить сессию. Попробуйте ещё раз."));
          }
          this.saving = false;
          if (saved) {
            this.close();
            return;
          }

          button.setDisabled(false).setButtonText(this.t("Save session", "Сохранить сессию"));
        });
    });
  }

  private focusRatingDesc(): string {
    return this.t(`Current: ${this.focusRating} (1 low, 5 high)`, `Сейчас: ${this.focusRating} (1 низко, 5 высоко)`);
  }

  private t(en: string, ru: string): string {
    return bi(en, ru, this.language);
  }
}
