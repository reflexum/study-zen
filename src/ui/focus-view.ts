import { ButtonComponent, ItemView, WorkspaceLeaf } from "obsidian";
import { bi } from "../i18n";
import { ActiveSession, StudyZenSettings, VIEW_TYPE_STUDY_ZEN_FOCUS, modeLabel } from "../types";

export interface FocusViewActions {
  start: () => void;
  pause: () => void;
  resume: () => void;
  skipBreak: () => void;
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
    return this.t("Study Zen Focus", "Фокус Study Zen");
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
    container.createEl("h2", { text: this.t("Study Zen Focus", "Фокус Study Zen") });
    container.createDiv({
      cls: "study-zen-focus-empty",
      text: this.t("No active focus session.", "Нет активной сессии фокуса.")
    });

    const controls = container.createDiv({ cls: "study-zen-focus-controls" });
    this.actionButton(controls, this.t("Start session", "Начать сессию"), "play", this.actions.start, true);
    this.actionButton(controls, this.t("Stats", "Статистика"), "bar-chart-3", this.actions.openStats);
  }

  private renderActive(container: Element, session: ActiveSession): void {
    const settings = this.getSettings();
    const plannedSeconds = this.getPlannedFocusSeconds(session);
    const progress = plannedSeconds === null ? 0 : Math.min(1, session.focusedSeconds / plannedSeconds);
    const remainingSeconds = plannedSeconds === null ? null : Math.max(0, plannedSeconds - session.focusedSeconds);

    const header = container.createDiv({ cls: "study-zen-focus-header" });
    header.createEl("h2", { text: modeLabel(session.mode, settings.language) });
    header.createDiv({
      cls: session.paused ? "study-zen-focus-state is-paused" : "study-zen-focus-state",
      text: session.paused ? this.t("Paused", "Пауза") : this.t("In focus", "В фокусе")
    });

    const hero = container.createDiv({ cls: "study-zen-focus-hero" });
    const ring = hero.createDiv({ cls: "study-zen-focus-ring" });
    ring.style.setProperty("--study-zen-progress", `${Math.round(progress * 360)}deg`);
    const ringInner = ring.createDiv({ cls: "study-zen-focus-ring-inner" });
    ringInner.createDiv({ cls: "study-zen-focus-time", text: this.formatSeconds(session.focusedSeconds) });
    ringInner.createDiv({
      cls: "study-zen-focus-progress-label",
      text: plannedSeconds === null ? this.t("Open-ended", "Без лимита") : `${Math.round(progress * 100)}% ${this.t("planned", "плана")}`
    });

    const summary = hero.createDiv({ cls: "study-zen-focus-summary" });
    summary.createDiv({ cls: "study-zen-focus-goal-label", text: this.t("Current goal", "Текущая цель") });
    summary.createDiv({ cls: "study-zen-focus-goal", text: session.goal });
    if (session.expectedResult) summary.createDiv({ cls: "study-zen-focus-result", text: session.expectedResult });

    const metrics = container.createDiv({ cls: "study-zen-focus-metrics" });
    this.metric(metrics, this.t("Elapsed", "Прошло"), this.formatSeconds(session.elapsedSeconds));
    this.metric(metrics, this.t("Remaining", "Осталось"), remainingSeconds === null ? this.t("Open", "Свободно") : this.formatSeconds(remainingSeconds));
    this.metric(metrics, this.t("Phase", "Фаза"), this.getPhaseLabel(session, settings));
    this.metric(metrics, this.t("Phase left", "До конца фазы"), this.getPhaseRemainingLabel(session, settings));
    this.metric(metrics, this.t("Cycles", "Циклы"), String(session.pomodoroCyclesCompleted));

    const controls = container.createDiv({ cls: "study-zen-focus-controls" });
    if (session.paused) this.actionButton(controls, this.t("Resume", "Продолжить"), "play", this.actions.resume, true);
    else this.actionButton(controls, this.t("Pause", "Пауза"), "pause", this.actions.pause);
    if (session.mode === "pomodoro" && session.pomodoroPhase === "break") this.actionButton(controls, this.t("Skip break", "Пропустить перерыв"), "skip-forward", this.actions.skipBreak);
    this.actionButton(controls, this.t("Finish", "Завершить"), "square", this.actions.stop, true);
    this.actionButton(controls, this.t("Stats", "Статистика"), "bar-chart-3", this.actions.openStats);
  }

  private getPlannedFocusSeconds(session: ActiveSession): number | null {
    if (!Number.isFinite(session.plannedMinutes) || session.plannedMinutes === undefined || session.plannedMinutes <= 0) return null;
    return session.plannedMinutes * 60;
  }

  private getPhaseLabel(session: ActiveSession, settings: StudyZenSettings): string {
    if (session.mode === "pomodoro") {
      const phase = session.pomodoroPhase === "break" ? this.t("Break", "Перерыв") : this.t("Focus", "Фокус");
      return `${phase} ${settings.pomodoroFocusMinutes}/${settings.pomodoroBreakMinutes}m`;
    }

    if (session.mode === "deep") return this.t(`Checkpoint every ${settings.deepCheckpointMinutes}m`, `Контроль каждые ${settings.deepCheckpointMinutes} мин`);
    return this.t("Single focus block", "Один фокус-блок");
  }

  private getPhaseRemainingLabel(session: ActiveSession, settings: StudyZenSettings): string {
    if (session.mode !== "pomodoro") return this.t("Not phased", "Без фаз");

    const focusSeconds = (settings.pomodoroFocusMinutes > 0 ? settings.pomodoroFocusMinutes : 25) * 60;
    const breakSeconds = (settings.pomodoroBreakMinutes > 0 ? settings.pomodoroBreakMinutes : 5) * 60;
    const phaseLength = session.pomodoroPhase === "break" ? breakSeconds : focusSeconds;
    const startedAt = session.phaseStartedAtSeconds ?? 0;
    return this.formatSeconds(Math.max(0, phaseLength - (session.elapsedSeconds - startedAt)));
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

  private t(en: string, ru: string): string {
    return bi(en, ru, this.getSettings().language);
  }
}
