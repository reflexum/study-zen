import { Notice, Plugin } from "obsidian";
import { mergeStudyZenData, StoredStudyZenData } from "./domain/plugin-data";
import { formatStatusText } from "./domain/status-text";
import { FocusShieldService } from "./services/focus-shield-service";
import { SessionService } from "./services/session-service";
import { StatsService } from "./services/stats-service";
import { SystemFocusService } from "./services/system-focus-service";
import { TimerEvent, TimerService } from "./services/timer-service";
import { EndSessionModal } from "./ui/end-session-modal";
import { FocusView } from "./ui/focus-view";
import { RecoveryModal } from "./ui/recovery-modal";
import { StartSessionModal } from "./ui/start-session-modal";
import { StatsView } from "./ui/stats-view";
import { StudyZenSettingTab } from "./ui/settings-tab";
import { bi } from "./i18n";
import { ActiveSession, DEFAULT_SETTINGS, StudySessionRecord, StudyZenData, StudyZenSettings, VIEW_TYPE_STUDY_ZEN_FOCUS, VIEW_TYPE_STUDY_ZEN_STATS } from "./types";

export default class StudyZenPlugin extends Plugin {
  settings: StudyZenSettings = DEFAULT_SETTINGS;
  sessions: StudySessionRecord[] = [];
  activeSession: ActiveSession | null = null;
  systemFocusService = new SystemFocusService();

  private timerService = new TimerService();
  private focusShieldService = new FocusShieldService();
  private statsService = new StatsService();
  private sessionService!: SessionService;
  private statusBarItem: HTMLElement | null = null;
  private endSessionModalOpen = false;
  private activeSessionLastSavedAt = 0;

  async onload(): Promise<void> {
    await this.loadPluginData();

    this.sessionService = new SessionService(
      this.timerService,
      this.focusShieldService,
      this.systemFocusService,
      () => this.settings,
      (event) => this.handleTimerTick(event),
      async (record) => this.saveSession(record),
      (session) => this.handleActiveSessionChanged(session)
    );

    this.statusBarItem = this.addStatusBarItem();
    this.statusBarItem.addClass("study-zen-status");
    this.updateStatusBar();

    this.addRibbonIcon("timer", this.t("Start Study Zen", "Начать Study Zen"), () => this.openStartSessionModal());
    this.addCommand({
      id: "start-study-zen-session",
      name: this.t("Start session", "Начать сессию"),
      callback: () => this.openStartSessionModal()
    });
    this.addCommand({
      id: "stop-study-zen-session",
      name: this.t("Stop session", "Завершить сессию"),
      callback: () => this.openEndSessionModal()
    });
    this.addCommand({
      id: "pause-study-zen-session",
      name: this.t("Pause session", "Поставить на паузу"),
      callback: () => this.pauseSession()
    });
    this.addCommand({
      id: "resume-study-zen-session",
      name: this.t("Resume session", "Продолжить сессию"),
      callback: () => this.resumeSession()
    });
    this.addCommand({
      id: "open-study-zen-stats",
      name: this.t("Open stats", "Открыть статистику"),
      callback: () => {
        void this.openStatsView();
      }
    });
    this.addCommand({
      id: "open-study-zen-focus",
      name: this.t("Open focus view", "Открыть экран фокуса"),
      callback: () => {
        void this.openFocusView();
      }
    });

    this.registerView(
      VIEW_TYPE_STUDY_ZEN_FOCUS,
      (leaf) =>
        new FocusView(leaf, () => this.sessionService.getActiveSession(), () => this.settings, (seconds) => this.timerService.format(seconds), {
          start: () => this.openStartSessionModal(),
          pause: () => this.pauseSession(),
          resume: () => this.resumeSession(),
          skipBreak: () => this.skipPomodoroBreak(),
          stop: () => this.openEndSessionModal(),
          openStats: () => {
            void this.openStatsView();
          }
        })
    );
    this.registerView(VIEW_TYPE_STUDY_ZEN_STATS, (leaf) => new StatsView(leaf, () => this.sessions, () => this.settings, this.statsService));
    this.addSettingTab(new StudyZenSettingTab(this.app, this));

    this.openRecoveryModalIfNeeded();
  }

  async onunload(): Promise<void> {
    const suspendedSession = await this.sessionService?.suspendForRecovery();
    if (suspendedSession) {
      this.activeSession = suspendedSession;
      try {
        await this.savePluginData();
      } catch (error) {
        console.error("Study Zen failed to save active session during unload", error);
      }
    }
  }

  async loadPluginData(): Promise<void> {
    let stored: StoredStudyZenData | null = null;
    try {
      stored = (await this.loadData()) as StoredStudyZenData | null;
    } catch (error) {
      console.error("Study Zen failed to load plugin data", error);
      new Notice(this.t("Study Zen could not load saved data. Using defaults for this session.", "Study Zen не смог загрузить сохранённые данные. В этой сессии используются настройки по умолчанию."));
    }

    const data = mergeStudyZenData(stored);
    this.settings = data.settings;
    this.sessions = data.sessions;
    this.activeSession = data.activeSession;
  }

  async savePluginData(): Promise<void> {
    await this.saveData({
      settings: this.settings,
      sessions: this.sessions,
      activeSession: this.activeSession
    } satisfies StudyZenData);
  }

  refreshLanguage(): void {
    this.updateStatusBar();
    this.refreshFocusViews();
    this.refreshStatsViews();
  }

  private openStartSessionModal(): void {
    new StartSessionModal(this.app, this.settings, async (input) => {
      const started = await this.sessionService.start(input);
      if (started) {
        this.statusBarItem?.setText(this.t("Study Zen starting...", "Study Zen запускается..."));
        await this.openFocusView();
        this.refreshFocusViews();
      }
      return started;
    }).open();
  }

  private openEndSessionModal(): void {
    if (!this.sessionService.getActiveSession()) {
      new Notice(this.t("No Study Zen session is active.", "Нет активной сессии Study Zen."));
      return;
    }

    if (this.endSessionModalOpen) return;

    const session = this.sessionService.getActiveSession();
    const modal = new EndSessionModal(this.app, false, session, (seconds) => this.timerService.format(seconds), this.settings.language, async (input) => {
      const record = await this.sessionService.stop(input);
      if (record) {
        this.updateStatusBar();
        this.refreshFocusViews();
      }
      return record !== null;
    });
    const originalOnClose = modal.onClose.bind(modal);
    modal.onClose = () => {
      this.endSessionModalOpen = false;
      originalOnClose();
    };

    this.endSessionModalOpen = true;
    modal.open();
  }

  private pauseSession(): void {
    const session = this.sessionService.getActiveSession();
    if (!session) {
      new Notice(this.t("No Study Zen session is active.", "Нет активной сессии Study Zen."));
      return;
    }

    this.sessionService.pause();
    this.updateStatusBar();
    this.refreshFocusViews();
    new Notice(this.t("Study Zen session paused.", "Сессия Study Zen на паузе."));
  }

  private resumeSession(): void {
    const session = this.sessionService.getActiveSession();
    if (!session) {
      new Notice(this.t("No Study Zen session is active.", "Нет активной сессии Study Zen."));
      return;
    }

    this.sessionService.resume();
    this.updateStatusBar();
    this.refreshFocusViews();
    new Notice(this.t("Study Zen session resumed.", "Сессия Study Zen продолжена."));
  }

  private skipPomodoroBreak(): void {
    if (!this.sessionService.skipPomodoroBreak()) {
      new Notice(this.t("There is no Pomodoro break to skip.", "Сейчас нет перерыва Помодоро, который можно пропустить."));
      return;
    }

    this.updateStatusBar();
    this.refreshFocusViews();
    new Notice(this.t("Break skipped. Back to focus.", "Перерыв пропущен. Возвращаемся к фокусу."));
  }

  private async openFocusView(): Promise<void> {
    const existingLeaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_STUDY_ZEN_FOCUS)[0];
    if (existingLeaf) {
      await this.app.workspace.revealLeaf(existingLeaf);
      return;
    }

    const leaf = this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: VIEW_TYPE_STUDY_ZEN_FOCUS, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }

  private async openStatsView(): Promise<void> {
    const existingLeaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_STUDY_ZEN_STATS)[0];
    if (existingLeaf) {
      await this.app.workspace.revealLeaf(existingLeaf);
      return;
    }

    const leaf = this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: VIEW_TYPE_STUDY_ZEN_STATS, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }

  private handleTimerTick(event: TimerEvent): void {
    this.activeSession = { ...event.session };
    this.saveActiveSessionSnapshot(false);
    this.updateStatusBar(event);
    this.refreshFocusViews();
    if (event.message) new Notice(event.message);
  }

  private updateStatusBar(event?: TimerEvent): void {
    if (!this.statusBarItem) return;

    const session = event?.session ?? this.sessionService?.getActiveSession() ?? null;
    this.statusBarItem.setText(formatStatusText(session, (seconds) => this.timerService.format(seconds), this.settings.language));
  }

  private async saveSession(record: StudySessionRecord): Promise<void> {
    const previousSessions = this.sessions;
    this.sessions = [...previousSessions, record];

    try {
      await this.savePluginData();
    } catch (error) {
      this.sessions = previousSessions;
      this.refreshStatsViews();
      this.updateStatusBar();
      throw error;
    }

    this.refreshStatsViews();
    this.updateStatusBar();
  }

  private refreshStatsViews(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_STUDY_ZEN_STATS)) {
      if (leaf.view instanceof StatsView) leaf.view.render();
    }
  }

  private refreshFocusViews(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_STUDY_ZEN_FOCUS)) {
      if (leaf.view instanceof FocusView) leaf.view.render();
    }
  }

  private handleActiveSessionChanged(session: ActiveSession | null): void {
    this.activeSession = session ? { ...session } : null;
    this.activeSessionLastSavedAt = 0;
    this.saveActiveSessionSnapshot(true);
  }

  private saveActiveSessionSnapshot(force: boolean): void {
    const now = Date.now();
    if (!force && now - this.activeSessionLastSavedAt < 15000) return;

    this.activeSessionLastSavedAt = now;
    void this.savePluginData();
  }

  private openRecoveryModalIfNeeded(): void {
    if (!this.activeSession) return;

    const recoveredSession = { ...this.activeSession };
    new RecoveryModal(this.app, recoveredSession, (seconds) => this.timerService.format(seconds), this.settings.language, {
      resume: async (session) => {
        const restored = await this.sessionService.restore(session);
        if (restored) {
          await this.openFocusView();
          this.refreshFocusViews();
        }
        return restored;
      },
      saveInterrupted: async (record) => {
        this.activeSession = null;
        await this.saveSession(record);
      },
      discard: async () => {
        this.activeSession = null;
        await this.savePluginData();
        this.refreshFocusViews();
        this.updateStatusBar();
      }
    }).open();
  }

  private t(en: string, ru: string): string {
    return bi(en, ru, this.settings.language);
  }
}
