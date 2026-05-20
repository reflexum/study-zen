import { App, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";
import { bi } from "../i18n";
import { SystemFocusService } from "../services/system-focus-service";
import { STUDY_MODES, SYSTEM_FOCUS_PLATFORM_PRESETS, StudyMode, StudyZenSettings, modeLabel } from "../types";

type NumberSettingKey =
  | "zenDefaultMinutes"
  | "sprintDefaultMinutes"
  | "deepDefaultMinutes"
  | "deepCheckpointMinutes"
  | "pomodoroFocusMinutes"
  | "pomodoroBreakMinutes";

type FocusShieldKey = "enabled" | "hideRibbon" | "dimSidebars" | "hideStatusBar" | "hideNotifications" | "calmEditor";

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
    containerEl.createEl("h2", { text: bi("Study Zen Settings", "Настройки Study Zen") });

    new Setting(containerEl).setName(bi("Default mode", "Режим по умолчанию")).addDropdown((dropdown) => {
      for (const mode of STUDY_MODES) dropdown.addOption(mode, modeLabel(mode));
      dropdown.setValue(this.plugin.settings.defaultMode).onChange(async (value) => {
        this.plugin.settings.defaultMode = value as StudyMode;
        await this.plugin.savePluginData();
      });
    });

    this.numberSetting(bi("Zen default minutes", "Минуты дзен-сессии"), "zenDefaultMinutes");
    this.numberSetting(bi("Sprint default minutes", "Минуты учебного спринта"), "sprintDefaultMinutes");
    this.numberSetting(bi("Deep default minutes", "Минуты глубокой учёбы"), "deepDefaultMinutes");
    this.numberSetting(bi("Deep checkpoint minutes", "Интервал контрольных точек"), "deepCheckpointMinutes");
    this.numberSetting(bi("Pomodoro focus minutes", "Минуты фокуса Помодоро"), "pomodoroFocusMinutes");
    this.numberSetting(bi("Pomodoro break minutes", "Минуты перерыва Помодоро"), "pomodoroBreakMinutes");

    containerEl.createEl("h3", { text: bi("Focus Shield", "Щит фокуса") });
    this.focusToggle(bi("Enable Focus Shield", "Включить щит фокуса"), "enabled");
    this.focusToggle(bi("Hide ribbon", "Скрыть ленту"), "hideRibbon");
    this.focusToggle(bi("Dim sidebars", "Приглушить боковые панели"), "dimSidebars");
    this.focusToggle(bi("Hide status bar", "Скрыть строку статуса"), "hideStatusBar");
    this.focusToggle(bi("Mute Obsidian notices", "Приглушить уведомления Obsidian"), "hideNotifications");
    this.focusToggle(bi("Calm editor", "Спокойный редактор"), "calmEditor");

    containerEl.createEl("h3", { text: bi("System Focus", "Системный фокус") });
    new Setting(containerEl)
      .setName(bi("Enable system focus commands", "Включить команды системного фокуса"))
      .setDesc(bi("Experimental desktop-only local command execution during session start/end.", "Экспериментальный запуск локальных команд на desktop при старте и завершении сессии."))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.systemFocus.enabled).onChange(async (value) => {
          this.plugin.settings.systemFocus.enabled = value;
          await this.plugin.savePluginData();
        });
      });

    new Setting(containerEl)
      .setName(bi("System focus platform preset", "Профиль платформы системного фокуса"))
      .setDesc(SYSTEM_FOCUS_PLATFORM_PRESETS[this.plugin.settings.systemFocus.platformPreset].description)
      .addDropdown((dropdown) => {
        for (const [value, preset] of Object.entries(SYSTEM_FOCUS_PLATFORM_PRESETS)) dropdown.addOption(value, preset.label);
        dropdown.setValue(this.plugin.settings.systemFocus.platformPreset).onChange(async (value) => {
          this.plugin.settings.systemFocus.platformPreset = value as StudyZenSettings["systemFocus"]["platformPreset"];
          await this.plugin.savePluginData();
          this.display();
        });
      });

    new Setting(containerEl).setName(bi("Start command", "Команда старта")).setDesc(bi("Runs locally when a Study Zen session starts.", "Запускается локально при старте сессии Study Zen.")).addText((text) => {
      text.setValue(this.plugin.settings.systemFocus.startCommand).onChange(async (value) => {
        this.plugin.settings.systemFocus.startCommand = value;
        await this.plugin.savePluginData();
      });
    });

    new Setting(containerEl).setName(bi("End command", "Команда завершения")).setDesc(bi("Runs locally when a Study Zen session ends.", "Запускается локально при завершении сессии Study Zen.")).addText((text) => {
      text.setValue(this.plugin.settings.systemFocus.endCommand).onChange(async (value) => {
        this.plugin.settings.systemFocus.endCommand = value;
        await this.plugin.savePluginData();
      });
    });

    new Setting(containerEl).setName(bi("Test start command", "Проверить команду старта")).addButton((button) => {
      button.setButtonText(bi("Test", "Проверить")).onClick(async () => {
        if (!this.plugin.settings.systemFocus.startCommand.trim()) {
          new Notice(bi("No Study Zen system focus start command configured.", "Команда старта системного фокуса Study Zen не настроена."));
          return;
        }

        await this.plugin.systemFocusService.test(this.plugin.settings.systemFocus.startCommand);
      });
    });

    new Setting(containerEl).setName(bi("Test end command", "Проверить команду завершения")).addButton((button) => {
      button.setButtonText(bi("Test", "Проверить")).onClick(async () => {
        if (!this.plugin.settings.systemFocus.endCommand.trim()) {
          new Notice(bi("No Study Zen system focus end command configured.", "Команда завершения системного фокуса Study Zen не настроена."));
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
          new Notice(bi(`${label} must be a positive number.`, `${label} должно быть положительным числом.`));
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
