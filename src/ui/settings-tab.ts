import { App, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";
import { SystemFocusService } from "../services/system-focus-service";
import { STUDY_MODES, SYSTEM_FOCUS_PLATFORM_PRESETS, StudyMode, StudyZenSettings, modeLabel } from "../types";

type NumberSettingKey =
  | "zenDefaultMinutes"
  | "sprintDefaultMinutes"
  | "deepDefaultMinutes"
  | "deepCheckpointMinutes"
  | "pomodoroFocusMinutes"
  | "pomodoroBreakMinutes";

type FocusShieldKey = "enabled" | "hideRibbon" | "dimSidebars" | "hideStatusBar" | "calmEditor";

export interface StudyZenPluginSettingsHost extends Plugin {
  settings: StudyZenSettings;
  systemFocusService: SystemFocusService;
  savePluginData(): Promise<void>;
}

export class StudyZenSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: StudyZenPluginSettingsHost) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Study Zen Settings" });

    new Setting(containerEl).setName("Default mode").addDropdown((dropdown) => {
      for (const mode of STUDY_MODES) dropdown.addOption(mode, modeLabel(mode));
      dropdown.setValue(this.plugin.settings.defaultMode).onChange(async (value) => {
        this.plugin.settings.defaultMode = value as StudyMode;
        await this.plugin.savePluginData();
      });
    });

    this.numberSetting("Zen default minutes", "zenDefaultMinutes");
    this.numberSetting("Sprint default minutes", "sprintDefaultMinutes");
    this.numberSetting("Deep default minutes", "deepDefaultMinutes");
    this.numberSetting("Deep checkpoint minutes", "deepCheckpointMinutes");
    this.numberSetting("Pomodoro focus minutes", "pomodoroFocusMinutes");
    this.numberSetting("Pomodoro break minutes", "pomodoroBreakMinutes");

    containerEl.createEl("h3", { text: "Focus Shield" });
    this.focusToggle("Enable Focus Shield", "enabled");
    this.focusToggle("Hide ribbon", "hideRibbon");
    this.focusToggle("Dim sidebars", "dimSidebars");
    this.focusToggle("Hide status bar", "hideStatusBar");
    this.focusToggle("Calm editor", "calmEditor");

    containerEl.createEl("h3", { text: "System Focus" });
    new Setting(containerEl)
      .setName("Enable system focus commands")
      .setDesc("Experimental desktop-only local command execution during session start/end.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.systemFocus.enabled).onChange(async (value) => {
          this.plugin.settings.systemFocus.enabled = value;
          await this.plugin.savePluginData();
        });
      });

    new Setting(containerEl)
      .setName("System focus platform preset")
      .setDesc(SYSTEM_FOCUS_PLATFORM_PRESETS[this.plugin.settings.systemFocus.platformPreset].description)
      .addDropdown((dropdown) => {
        for (const [value, preset] of Object.entries(SYSTEM_FOCUS_PLATFORM_PRESETS)) dropdown.addOption(value, preset.label);
        dropdown.setValue(this.plugin.settings.systemFocus.platformPreset).onChange(async (value) => {
          this.plugin.settings.systemFocus.platformPreset = value as StudyZenSettings["systemFocus"]["platformPreset"];
          await this.plugin.savePluginData();
          this.display();
        });
      });

    new Setting(containerEl).setName("Start command").setDesc("Runs locally when a Study Zen session starts.").addText((text) => {
      text.setValue(this.plugin.settings.systemFocus.startCommand).onChange(async (value) => {
        this.plugin.settings.systemFocus.startCommand = value;
        await this.plugin.savePluginData();
      });
    });

    new Setting(containerEl).setName("End command").setDesc("Runs locally when a Study Zen session ends.").addText((text) => {
      text.setValue(this.plugin.settings.systemFocus.endCommand).onChange(async (value) => {
        this.plugin.settings.systemFocus.endCommand = value;
        await this.plugin.savePluginData();
      });
    });

    new Setting(containerEl).setName("Test start command").addButton((button) => {
      button.setButtonText("Test").onClick(async () => {
        if (!this.plugin.settings.systemFocus.startCommand.trim()) {
          new Notice("No Study Zen system focus start command configured.");
          return;
        }

        await this.plugin.systemFocusService.test(this.plugin.settings.systemFocus.startCommand);
      });
    });

    new Setting(containerEl).setName("Test end command").addButton((button) => {
      button.setButtonText("Test").onClick(async () => {
        if (!this.plugin.settings.systemFocus.endCommand.trim()) {
          new Notice("No Study Zen system focus end command configured.");
          return;
        }

        await this.plugin.systemFocusService.test(this.plugin.settings.systemFocus.endCommand);
      });
    });
  }

  private numberSetting(label: string, key: NumberSettingKey): void {
    new Setting(this.containerEl).setName(label).addText((text) => {
      text.setValue(String(this.plugin.settings[key])).onChange(async (value) => {
        const minutes = Number(value);
        if (!Number.isFinite(minutes) || minutes <= 0) {
          new Notice(`${label} must be a positive number.`);
          text.setValue(String(this.plugin.settings[key]));
          return;
        }

        this.plugin.settings[key] = minutes;
        await this.plugin.savePluginData();
      });
    });
  }

  private focusToggle(label: string, key: FocusShieldKey): void {
    new Setting(this.containerEl).setName(label).addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.focusShield[key]).onChange(async (value) => {
        this.plugin.settings.focusShield[key] = value;
        await this.plugin.savePluginData();
      });
    });
  }
}
