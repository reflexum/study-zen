import { ItemView, WorkspaceLeaf } from "obsidian";
import { bi } from "../i18n";
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
    return bi("Study Zen Stats", "Статистика Study Zen");
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

    container.createEl("h2", { text: bi("Study Zen Stats", "Статистика Study Zen") });
    const grid = container.createDiv({ cls: "study-zen-stat-grid" });

    this.card(grid, bi("Total focus", "Всего фокуса"), this.statsService.formatDuration(stats.totalFocusSeconds));
    this.card(grid, bi("Sessions", "Сессии"), String(stats.totalSessions));
    this.card(grid, bi("Completion", "Завершение"), `${Math.round(stats.completionRate * 100)}%`);
    this.card(grid, bi("Interruptions", "Прерывания"), `${Math.round(stats.interruptionRate * 100)}%`);
    this.card(grid, bi("Streak", "Серия"), bi(`${stats.currentStreak} days`, `${stats.currentStreak} дн.`));
    this.card(grid, bi("Average", "Среднее"), this.statsService.formatDuration(stats.averageSessionSeconds));
    this.card(grid, bi("Top mode", "Главный режим"), stats.mostUsedMode ? modeLabel(stats.mostUsedMode) : bi("None yet", "Пока нет"));
    this.card(grid, bi("Focus rating", "Оценка фокуса"), stats.averageFocusRating === undefined ? bi("None yet", "Пока нет") : `${stats.averageFocusRating}/5`);
    this.card(grid, bi("Best window", "Лучшее окно"), stats.bestFocusHour === undefined ? bi("None yet", "Пока нет") : `${stats.bestFocusHour.toString().padStart(2, "0")}:00`);

    container.createEl("h3", { text: bi("Recommendations", "Рекомендации") });
    const list = container.createEl("ul");
    for (const recommendation of stats.recommendations) list.createEl("li", { text: recommendation });

    container.createEl("h3", { text: bi("Daily focus", "Фокус по дням") });
    const daily = this.statsService.daily(sessions).slice(0, 14);
    const dailyList = container.createEl("ul");
    if (daily.length === 0) dailyList.createEl("li", { text: bi("No completed study days yet.", "Пока нет завершённых учебных дней.") });
    for (const day of daily) {
      dailyList.createEl("li", { text: `${day.date} · ${this.statsService.formatDuration(day.focusSeconds)} ${bi("focus", "фокуса")} · ${day.completedSessions} ${bi("completed", "завершено")}` });
    }

    container.createEl("h3", { text: bi("Recent sessions", "Последние сессии") });
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
