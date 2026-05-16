import { App, Modal, Notice, Setting } from "obsidian";
import { EndSessionInput } from "../types";

export class EndSessionModal extends Modal {
  private completed = true;
  private reflection = "";
  private focusRating = 4;
  private saving = false;

  constructor(app: App, private readonly interrupted: boolean, private readonly onSubmit: (input: EndSessionInput) => Promise<boolean>) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Finish Study Zen" });

    new Setting(contentEl).setName("Goal completed").addToggle((toggle) => {
      toggle.setValue(this.completed).onChange((value) => {
        this.completed = value;
      });
    });

    new Setting(contentEl).setName("Reflection").addTextArea((text) => {
      text.setPlaceholder("What did you learn or notice?").onChange((value) => {
        this.reflection = value;
      });
    });

    const focusRatingSetting = new Setting(contentEl).setName("Focus rating").setDesc(`Current: ${this.focusRating} (1 low, 5 high)`);
    focusRatingSetting.addSlider((slider) => {
      slider.setLimits(1, 5, 1).setValue(this.focusRating).onChange((value) => {
        this.focusRating = value;
        focusRatingSetting.setDesc(`Current: ${this.focusRating} (1 low, 5 high)`);
      });
    });

    new Setting(contentEl).addButton((button) => {
      button
        .setButtonText("Save session")
        .setCta()
        .onClick(async () => {
          if (this.saving) return;
          this.saving = true;
          button.setDisabled(true).setButtonText("Saving...");
          let saved = false;
          try {
            saved = await this.onSubmit({ completed: this.completed, reflection: this.reflection, focusRating: this.focusRating, interrupted: this.interrupted });
          } catch (error) {
            console.error("Study Zen failed to finish session", error);
            new Notice("Study Zen could not finish the session. Please try again.");
          }
          this.saving = false;
          if (saved) {
            this.close();
            return;
          }

          button.setDisabled(false).setButtonText("Save session");
        });
    });
  }
}
