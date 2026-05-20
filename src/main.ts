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
import { StartSessionModal } from "./ui/start-session-modal";
import { StatsView } from "./ui/stats-view";
import { StudyZenSettingTab } from "./ui/settings-tab";
import { DEFAULT_SETTINGS, StudySessionRecord, StudyZenData, StudyZenSettings, VIEW_TYPE_STUDY_ZEN_FOCUS, VIEW_TYPE_STUDY_ZEN_STATS } from "./types";

export default class StudyZenPlugin extends Plugin {
  settings: StudyZenSettings = DEFAULT_SETTINGS;
  sessions: StudySessionRecord[] = [];
  systemFocusService = new SystemFocusService();

  private timerService = new TimerService();
  private focusShieldService = new FocusShieldService();
  private statsService = new StatsService();
  private sessionService!: SessionService;
  private statusBarItem: HTMLElement | null = null;
  private endSessionModalOpen = false;

  async onload(): Promise<void> {
    await this.loadPluginData();

    this.sessionService = new SessionService(
      this.timerService,
      this.focusShieldService,
      this.systemFocusService,
      () => this.settings,
      (event) => this.handleTimerTick(event),
      async (record) => this.saveSession(record)
    );

    this.statusBarItem = this.addStatusBarItem();
    this.statusBarItem.addClass("study-zen-status");
    this.updateStatusBar();

    this.addRibbonIcon("timer", "Start Study Zen", () => this.openStartSessionModal());
    this.addCommand({
      id: "start-study-zen-session",
      name: "Start session",
      callback: () => this.openStartSessionModal()
    });
    this.addCommand({
      id: "stop-study-zen-session",
      name: "Stop session",
      callback: () => this.openEndSessionModal()
    });
    this.addCommand({
      id: "pause-study-zen-session",
      name: "Pause session",
      callback: () => this.pauseSession()
    });
    this.addCommand({
      id: "resume-study-zen-session",
      name: "Resume session",
      callback: () => this.resumeSession()
    });
    this.addCommand({
      id: "open-study-zen-stats",
      name: "Open stats",
      callback: () => {
        void this.openStatsView();
      }
    });
    this.addCommand({
      id: "open-study-zen-focus",
      name: "Open focus view",
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
          stop: () => this.openEndSessionModal(),
          openStats: () => {
            void this.openStatsView();
          }
        })
    );
    this.registerView(VIEW_TYPE_STUDY_ZEN_STATS, (leaf) => new StatsView(leaf, () => this.sessions, this.statsService));
    this.addSettingTab(new StudyZenSettingTab(this.app, this));
  }

  async onunload(): Promise<void> {
    await this.sessionService?.unload();
  }

  async loadPluginData(): Promise<void> {
    let stored: StoredStudyZenData | null = null;
    try {
      stored = (await this.loadData()) as StoredStudyZenData | null;
    } catch (error) {
      console.error("Study Zen failed to load plugin data", error);
      new Notice("Study Zen could not load saved data. Using defaults for this session.");
    }

    const data = mergeStudyZenData(stored);
    this.settings = data.settings;
    this.sessions = data.sessions;
  }

  async savePluginData(): Promise<void> {
    await this.saveData({
      settings: this.settings,
      sessions: this.sessions
    } satisfies StudyZenData);
  }

  private openStartSessionModal(): void {
    new StartSessionModal(this.app, this.settings, async (input) => {
      const started = await this.sessionService.start(input);
      if (started) {
        this.statusBarItem?.setText("Study Zen starting...");
        await this.openFocusView();
        this.refreshFocusViews();
      }
      return started;
    }).open();
  }

  private openEndSessionModal(): void {
    if (!this.sessionService.getActiveSession()) {
      new Notice("No Study Zen session is active.");
      return;
    }

    if (this.endSessionModalOpen) return;

    const modal = new EndSessionModal(this.app, false, async (input) => {
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
      new Notice("No Study Zen session is active.");
      return;
    }

    this.sessionService.pause();
    this.updateStatusBar();
    this.refreshFocusViews();
    new Notice("Study Zen session paused.");
  }

  private resumeSession(): void {
    const session = this.sessionService.getActiveSession();
    if (!session) {
      new Notice("No Study Zen session is active.");
      return;
    }

    this.sessionService.resume();
    this.updateStatusBar();
    this.refreshFocusViews();
    new Notice("Study Zen session resumed.");
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
    this.updateStatusBar(event);
    this.refreshFocusViews();
    if (event.message) new Notice(event.message);
  }

  private updateStatusBar(event?: TimerEvent): void {
    if (!this.statusBarItem) return;

    const session = event?.session ?? this.sessionService?.getActiveSession() ?? null;
    this.statusBarItem.setText(formatStatusText(session, (seconds) => this.timerService.format(seconds)));
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
}
