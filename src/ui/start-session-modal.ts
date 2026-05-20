import { App, Modal, Notice, Setting, TextComponent } from "obsidian";
import { getDefaultPlannedMinutes } from "../domain/session-defaults";
import { bi } from "../i18n";
import { STUDY_MODES, StartSessionInput, StudyMode, StudyZenSettings, modeLabel } from "../types";

export class StartSessionModal extends Modal {
  private mode: StudyMode;
  private goal = "";
  private expectedResult = "";
  private plannedMinutesValue: string;
  private starting = false;

  constructor(app: App, private readonly settings: StudyZenSettings, private readonly onSubmit: (input: StartSessionInput) => Promise<boolean> | boolean) {
    super(app);
    this.mode = settings.defaultMode;
    this.plannedMinutesValue = String(getDefaultPlannedMinutes(this.mode, this.settings));
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: bi("Start Study Zen", "Начать Study Zen") });

    let plannedMinutesText: TextComponent | undefined;

    new Setting(contentEl).setName(bi("Mode", "Режим")).addDropdown((dropdown) => {
      for (const mode of STUDY_MODES) dropdown.addOption(mode, modeLabel(mode));
      dropdown.setValue(this.mode).onChange((value) => {
        this.mode = value as StudyMode;
        this.plannedMinutesValue = String(getDefaultPlannedMinutes(this.mode, this.settings));
        plannedMinutesText?.setValue(this.plannedMinutesValue);
      });
    });

    new Setting(contentEl).setName(bi("Study goal", "Учебная цель")).addText((text) => {
      text.setPlaceholder(bi("What are you studying?", "Что вы изучаете?")).onChange((value) => {
        this.goal = value;
      });
    });

    new Setting(contentEl).setName(bi("Expected result", "Ожидаемый результат")).addText((text) => {
      text.setPlaceholder(bi("What should be done by the end?", "Что должно быть готово к концу?")).onChange((value) => {
        this.expectedResult = value;
      });
    });

    new Setting(contentEl).setName(bi("Planned minutes", "План в минутах")).addText((text) => {
      plannedMinutesText = text;
      text.setValue(this.plannedMinutesValue).onChange((value) => {
        this.plannedMinutesValue = value;
      });
    });

    new Setting(contentEl).addButton((button) => {
      button
        .setButtonText(bi("Start", "Начать"))
        .setCta()
        .onClick(async () => {
          if (this.starting) return;
          if (!this.goal.trim()) {
            new Notice(bi("Add a Study Zen goal before starting.", "Добавьте цель Study Zen перед стартом."));
            return;
          }

          const plannedMinutes = Number(this.plannedMinutesValue);
          if (!Number.isFinite(plannedMinutes) || plannedMinutes <= 0) {
            new Notice(bi("Planned minutes must be a positive number.", "План в минутах должен быть положительным числом."));
            return;
          }

          this.starting = true;
          button.setDisabled(true).setButtonText(bi("Starting...", "Запуск..."));

          let started = false;
          try {
            started = await this.onSubmit({ mode: this.mode, goal: this.goal, expectedResult: this.expectedResult, plannedMinutes });
          } catch (error) {
            console.error("Study Zen failed to start session", error);
            new Notice(bi("Study Zen could not start the session. Please try again.", "Study Zen не смог начать сессию. Попробуйте ещё раз."));
          }

          this.starting = false;
          if (started) {
            this.close();
            return;
          }

          button.setDisabled(false).setButtonText(bi("Start", "Начать"));
        });
    });
  }

}
