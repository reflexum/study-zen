import { App, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";
import { STUDY_ZEN_LANGUAGES, StudyZenLanguage, bi } from "../i18n";
import { SystemFocusService } from "../services/system-focus-service";
import { STUDY_MODES, StudyMode, StudyZenSettings, modeLabel, systemFocusPresetDescription, systemFocusPresetLabel } from "../types";

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
  refreshLanguage(): void;
  savePluginData(): Promise<void>;
}

export class StudyZenSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: StudyZenPluginSettingsHost) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: this.t("Study Zen Settings", "Настройки Study Zen") });

    new Setting(containerEl).setName(this.t("Interface language", "Язык интерфейса")).addDropdown((dropdown) => {
      for (const [value, label] of Object.entries(STUDY_ZEN_LANGUAGES)) dropdown.addOption(value, label);
      dropdown.setValue(this.plugin.settings.language).onChange(async (value) => {
        this.plugin.settings.language = value as StudyZenLanguage;
        await this.plugin.savePluginData();
        this.plugin.refreshLanguage();
        this.display();
      });
    });

    new Setting(containerEl).setName(this.t("Default mode", "Режим по умолчанию")).addDropdown((dropdown) => {
      for (const mode of STUDY_MODES) dropdown.addOption(mode, modeLabel(mode, this.plugin.settings.language));
      dropdown.setValue(this.plugin.settings.defaultMode).onChange(async (value) => {
        this.plugin.settings.defaultMode = value as StudyMode;
        await this.plugin.savePluginData();
      });
    });

    this.numberSetting(this.t("Zen default minutes", "Минуты дзен-сессии"), "zenDefaultMinutes");
    this.numberSetting(this.t("Sprint default minutes", "Минуты учебного спринта"), "sprintDefaultMinutes");
    this.numberSetting(this.t("Deep default minutes", "Минуты глубокой учёбы"), "deepDefaultMinutes");
    this.numberSetting(this.t("Deep checkpoint minutes", "Интервал контрольных точек"), "deepCheckpointMinutes");
    this.numberSetting(this.t("Pomodoro focus minutes", "Минуты фокуса Помодоро"), "pomodoroFocusMinutes");
    this.numberSetting(this.t("Pomodoro break minutes", "Минуты перерыва Помодоро"), "pomodoroBreakMinutes");

    containerEl.createEl("h3", { text: this.t("Focus Shield", "Щит фокуса") });
    this.focusToggle(this.t("Enable Focus Shield", "Включить щит фокуса"), "enabled");
    this.focusToggle(this.t("Hide ribbon", "Скрыть ленту"), "hideRibbon");
    this.focusToggle(this.t("Dim sidebars", "Приглушить боковые панели"), "dimSidebars");
    this.focusToggle(this.t("Hide status bar", "Скрыть строку статуса"), "hideStatusBar");
    this.focusToggle(this.t("Mute Obsidian notices", "Приглушить уведомления Obsidian"), "hideNotifications");
    this.focusToggle(this.t("Calm editor", "Спокойный редактор"), "calmEditor");

    containerEl.createEl("h3", { text: this.t("System Focus", "Системный фокус") });
    new Setting(containerEl)
      .setName(this.t("Enable system focus commands", "Включить команды системного фокуса"))
      .setDesc(this.t("Experimental desktop-only local command execution during session start/end.", "Экспериментальный запуск локальных команд на desktop при старте и завершении сессии."))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.systemFocus.enabled).onChange(async (value) => {
          this.plugin.settings.systemFocus.enabled = value;
          await this.plugin.savePluginData();
        });
      });

    new Setting(containerEl)
      .setName(this.t("System focus platform preset", "Профиль платформы системного фокуса"))
      .setDesc(systemFocusPresetDescription(this.plugin.settings.systemFocus.platformPreset, this.plugin.settings.language))
      .addDropdown((dropdown) => {
        for (const value of ["custom", "macos-shortcuts", "linux-custom", "windows-powershell"] as const) dropdown.addOption(value, systemFocusPresetLabel(value, this.plugin.settings.language));
        dropdown.setValue(this.plugin.settings.systemFocus.platformPreset).onChange(async (value) => {
          this.plugin.settings.systemFocus.platformPreset = value as StudyZenSettings["systemFocus"]["platformPreset"];
          await this.plugin.savePluginData();
          this.display();
        });
      });

    new Setting(containerEl).setName(this.t("Start command", "Команда старта")).setDesc(this.t("Runs locally when a Study Zen session starts.", "Запускается локально при старте сессии Study Zen.")).addText((text) => {
      text.setValue(this.plugin.settings.systemFocus.startCommand).onChange(async (value) => {
        this.plugin.settings.systemFocus.startCommand = value;
        await this.plugin.savePluginData();
      });
    });

    new Setting(containerEl).setName(this.t("End command", "Команда завершения")).setDesc(this.t("Runs locally when a Study Zen session ends.", "Запускается локально при завершении сессии Study Zen.")).addText((text) => {
      text.setValue(this.plugin.settings.systemFocus.endCommand).onChange(async (value) => {
        this.plugin.settings.systemFocus.endCommand = value;
        await this.plugin.savePluginData();
      });
    });

    new Setting(containerEl).setName(this.t("Test start command", "Проверить команду старта")).addButton((button) => {
      button.setButtonText(this.t("Test", "Проверить")).onClick(async () => {
        if (!this.plugin.settings.systemFocus.startCommand.trim()) {
          new Notice(this.t("No Study Zen system focus start command configured.", "Команда старта системного фокуса Study Zen не настроена."));
          return;
        }

        await this.plugin.systemFocusService.test(this.plugin.settings.systemFocus.startCommand, this.plugin.settings.language);
      });
    });

    new Setting(containerEl).setName(this.t("Test end command", "Проверить команду завершения")).addButton((button) => {
      button.setButtonText(this.t("Test", "Проверить")).onClick(async () => {
        if (!this.plugin.settings.systemFocus.endCommand.trim()) {
          new Notice(this.t("No Study Zen system focus end command configured.", "Команда завершения системного фокуса Study Zen не настроена."));
          return;
        }

        await this.plugin.systemFocusService.test(this.plugin.settings.systemFocus.endCommand, this.plugin.settings.language);
      });
    });
  }

  private numberSetting(label: string, key: NumberSettingKey): void {
    new Setting(this.containerEl).setName(label).addText((text) => {
      text.setValue(String(this.plugin.settings[key])).onChange(async (value) => {
        const minutes = Number(value);
        if (!Number.isFinite(minutes) || minutes <= 0) {
          new Notice(this.t(`${label} must be a positive number.`, `${label} должно быть положительным числом.`));
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

  private t(en: string, ru: string): string {
    return bi(en, ru, this.plugin.settings.language);
  }
}
