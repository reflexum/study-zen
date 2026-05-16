import { ItemView, WorkspaceLeaf } from "obsidian";
import { StatsService } from "../services/stats-service";
import { StudySessionRecord, VIEW_TYPE_STUDY_ZEN_STATS, modeLabel } from "../types";

export class StatsView extends ItemView {
  constructor(leaf: WorkspaceLeaf, private readonly getSessions: () => StudySessionRecord[], private readonly statsService: StatsService) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_STUDY_ZEN_STATS;
  }

  getDisplayText(): string {
    return "Study Zen Stats";
  }

  async onOpen(): Promise<void> {
    this.render();
  }

  render(): void {
    const container = this.containerEl.children[1] ?? this.containerEl;
    container.empty();
    container.addClass("study-zen-stats");

    const sessions = this.getSessions();
    const stats = this.statsService.calculate(sessions);

    container.createEl("h2", { text: "Study Zen Stats" });
    const grid = container.createDiv({ cls: "study-zen-stat-grid" });

    this.card(grid, "Total focus", this.statsService.formatDuration(stats.totalFocusSeconds));
    this.card(grid, "Sessions", String(stats.totalSessions));
    this.card(grid, "Completion", `${Math.round(stats.completionRate * 100)}%`);
    this.card(grid, "Streak", `${stats.currentStreak} days`);
    this.card(grid, "Average", this.statsService.formatDuration(stats.averageSessionSeconds));
    this.card(grid, "Top mode", stats.mostUsedMode ? modeLabel(stats.mostUsedMode) : "None yet");

    container.createEl("h3", { text: "Recommendations" });
    const list = container.createEl("ul");
    for (const recommendation of stats.recommendations) list.createEl("li", { text: recommendation });

    container.createEl("h3", { text: "Daily focus" });
    const daily = this.statsService.daily(sessions).slice(0, 14);
    const dailyList = container.createEl("ul");
    if (daily.length === 0) dailyList.createEl("li", { text: "No completed study days yet." });
    for (const day of daily) {
      dailyList.createEl("li", { text: `${day.date} · ${this.statsService.formatDuration(day.focusSeconds)} focus · ${day.completedSessions} completed` });
    }

    container.createEl("h3", { text: "Recent sessions" });
    const recent = sessions.slice(-8).reverse();
    const recentList = container.createEl("ul");
    for (const session of recent) {
      recentList.createEl("li", { text: `${modeLabel(session.mode)} · ${this.statsService.formatDuration(session.focusedSeconds)} · ${session.goal}` });
    }
  }

  private card(parent: HTMLElement, label: string, value: string): void {
    const card = parent.createDiv({ cls: "study-zen-stat-card" });
    card.createDiv({ text: label });
    card.createDiv({ cls: "study-zen-stat-value", text: value });
  }
}
