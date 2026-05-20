import { App, Modal, Notice, Setting, TextComponent } from "obsidian";
import { getDefaultPlannedMinutes } from "../domain/session-defaults";
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
    contentEl.createEl("h2", { text: "Start Study Zen" });

    let plannedMinutesText: TextComponent | undefined;

    new Setting(contentEl).setName("Mode").addDropdown((dropdown) => {
      for (const mode of STUDY_MODES) dropdown.addOption(mode, modeLabel(mode));
      dropdown.setValue(this.mode).onChange((value) => {
        this.mode = value as StudyMode;
        this.plannedMinutesValue = String(getDefaultPlannedMinutes(this.mode, this.settings));
        plannedMinutesText?.setValue(this.plannedMinutesValue);
      });
    });

    new Setting(contentEl).setName("Study goal").addText((text) => {
      text.setPlaceholder("What are you studying?").onChange((value) => {
        this.goal = value;
      });
    });

    new Setting(contentEl).setName("Expected result").addText((text) => {
      text.setPlaceholder("What should be done by the end?").onChange((value) => {
        this.expectedResult = value;
      });
    });

    new Setting(contentEl).setName("Planned minutes").addText((text) => {
      plannedMinutesText = text;
      text.setValue(this.plannedMinutesValue).onChange((value) => {
        this.plannedMinutesValue = value;
      });
    });

    new Setting(contentEl).addButton((button) => {
      button
        .setButtonText("Start")
        .setCta()
        .onClick(async () => {
          if (this.starting) return;
          if (!this.goal.trim()) {
            new Notice("Add a Study Zen goal before starting.");
            return;
          }

          const plannedMinutes = Number(this.plannedMinutesValue);
          if (!Number.isFinite(plannedMinutes) || plannedMinutes <= 0) {
            new Notice("Planned minutes must be a positive number.");
            return;
          }

          this.starting = true;
          button.setDisabled(true).setButtonText("Starting...");

          let started = false;
          try {
            started = await this.onSubmit({ mode: this.mode, goal: this.goal, expectedResult: this.expectedResult, plannedMinutes });
          } catch (error) {
            console.error("Study Zen failed to start session", error);
            new Notice("Study Zen could not start the session. Please try again.");
          }

          this.starting = false;
          if (started) {
            this.close();
            return;
          }

          button.setDisabled(false).setButtonText("Start");
        });
    });
  }

}
