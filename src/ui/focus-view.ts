import { ButtonComponent, ItemView, WorkspaceLeaf } from "obsidian";
import { ActiveSession, StudyZenSettings, VIEW_TYPE_STUDY_ZEN_FOCUS, modeLabel } from "../types";

export interface FocusViewActions {
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  openStats: () => void;
}

export class FocusView extends ItemView {
  constructor(
    leaf: WorkspaceLeaf,
    private readonly getActiveSession: () => ActiveSession | null,
    private readonly getSettings: () => StudyZenSettings,
    private readonly formatSeconds: (seconds: number) => string,
    private readonly actions: FocusViewActions
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_STUDY_ZEN_FOCUS;
  }

  getDisplayText(): string {
    return "Study Zen Focus";
  }

  getIcon(): string {
    return "timer";
  }

  async onOpen(): Promise<void> {
    this.render();
  }

  render(): void {
    const container = this.containerEl.children[1] ?? this.containerEl;
    container.empty();
    container.addClass("study-zen-focus-view");

    const session = this.getActiveSession();
    if (!session) {
      this.renderIdle(container);
      return;
    }

    this.renderActive(container, session);
  }

  private renderIdle(container: Element): void {
    container.createEl("h2", { text: "Study Zen Focus" });
    container.createDiv({
      cls: "study-zen-focus-empty",
      text: "No active focus session."
    });

    const controls = container.createDiv({ cls: "study-zen-focus-controls" });
    this.actionButton(controls, "Start session", "play", this.actions.start, true);
    this.actionButton(controls, "Stats", "bar-chart-3", this.actions.openStats);
  }

  private renderActive(container: Element, session: ActiveSession): void {
    const settings = this.getSettings();
    const plannedSeconds = this.getPlannedFocusSeconds(session);
    const progress = plannedSeconds === null ? 0 : Math.min(1, session.focusedSeconds / plannedSeconds);
    const remainingSeconds = plannedSeconds === null ? null : Math.max(0, plannedSeconds - session.focusedSeconds);

    const header = container.createDiv({ cls: "study-zen-focus-header" });
    header.createEl("h2", { text: modeLabel(session.mode) });
    header.createDiv({
      cls: session.paused ? "study-zen-focus-state is-paused" : "study-zen-focus-state",
      text: session.paused ? "Paused" : "In focus"
    });

    const hero = container.createDiv({ cls: "study-zen-focus-hero" });
    const ring = hero.createDiv({ cls: "study-zen-focus-ring" });
    ring.style.setProperty("--study-zen-progress", `${Math.round(progress * 360)}deg`);
    const ringInner = ring.createDiv({ cls: "study-zen-focus-ring-inner" });
    ringInner.createDiv({ cls: "study-zen-focus-time", text: this.formatSeconds(session.focusedSeconds) });
    ringInner.createDiv({
      cls: "study-zen-focus-progress-label",
      text: plannedSeconds === null ? "Open-ended" : `${Math.round(progress * 100)}% planned`
    });

    const summary = hero.createDiv({ cls: "study-zen-focus-summary" });
    summary.createDiv({ cls: "study-zen-focus-goal-label", text: "Current goal" });
    summary.createDiv({ cls: "study-zen-focus-goal", text: session.goal });
    if (session.expectedResult) summary.createDiv({ cls: "study-zen-focus-result", text: session.expectedResult });

    const metrics = container.createDiv({ cls: "study-zen-focus-metrics" });
    this.metric(metrics, "Elapsed", this.formatSeconds(session.elapsedSeconds));
    this.metric(metrics, "Remaining", remainingSeconds === null ? "Open" : this.formatSeconds(remainingSeconds));
    this.metric(metrics, "Phase", this.getPhaseLabel(session, settings));
    this.metric(metrics, "Cycles", String(session.pomodoroCyclesCompleted));

    const controls = container.createDiv({ cls: "study-zen-focus-controls" });
    if (session.paused) this.actionButton(controls, "Resume", "play", this.actions.resume, true);
    else this.actionButton(controls, "Pause", "pause", this.actions.pause);
    this.actionButton(controls, "Finish", "square", this.actions.stop, true);
    this.actionButton(controls, "Stats", "bar-chart-3", this.actions.openStats);
  }

  private getPlannedFocusSeconds(session: ActiveSession): number | null {
    if (!Number.isFinite(session.plannedMinutes) || session.plannedMinutes === undefined || session.plannedMinutes <= 0) return null;
    return session.plannedMinutes * 60;
  }

  private getPhaseLabel(session: ActiveSession, settings: StudyZenSettings): string {
    if (session.mode === "pomodoro") {
      const phase = session.pomodoroPhase === "break" ? "Break" : "Focus";
      return `${phase} ${settings.pomodoroFocusMinutes}/${settings.pomodoroBreakMinutes}m`;
    }

    if (session.mode === "deep") return `Checkpoint every ${settings.deepCheckpointMinutes}m`;
    return "Single focus block";
  }

  private metric(parent: HTMLElement, label: string, value: string): void {
    const item = parent.createDiv({ cls: "study-zen-focus-metric" });
    item.createDiv({ cls: "study-zen-focus-metric-label", text: label });
    item.createDiv({ cls: "study-zen-focus-metric-value", text: value });
  }

  private actionButton(parent: HTMLElement, text: string, icon: string, onClick: () => void, cta = false): void {
    const button = new ButtonComponent(parent).setButtonText(text).setIcon(icon).onClick(onClick);
    if (cta) button.setCta();
  }
}
