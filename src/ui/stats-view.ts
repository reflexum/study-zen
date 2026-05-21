import { ItemView, WorkspaceLeaf } from "obsidian";
import { bi } from "../i18n";
import { StatsService } from "../services/stats-service";
import { StudySessionRecord, StudyZenSettings, VIEW_TYPE_STUDY_ZEN_STATS, modeLabel } from "../types";

export class StatsView extends ItemView {
  constructor(
    leaf: WorkspaceLeaf,
    private readonly getSessions: () => StudySessionRecord[],
    private readonly getSettings: () => StudyZenSettings,
    private readonly statsService: StatsService
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_STUDY_ZEN_STATS;
  }

  getDisplayText(): string {
    return this.t("Study Zen Stats", "Статистика Study Zen");
  }

  async onOpen(): Promise<void> {
    this.render();
  }

  render(): void {
    const container = this.containerEl.children[1] ?? this.containerEl;
    container.empty();
    container.addClass("study-zen-stats");

    const sessions = this.getSessions();
    const language = this.getSettings().language;
    const stats = this.statsService.calculate(sessions, language);

    container.createEl("h2", { text: this.t("Study Zen Stats", "Статистика Study Zen") });
    const grid = container.createDiv({ cls: "study-zen-stat-grid" });

    this.card(grid, this.t("Total focus", "Всего фокуса"), this.statsService.formatDuration(stats.totalFocusSeconds));
    this.card(grid, this.t("Sessions", "Сессии"), String(stats.totalSessions));
    this.card(grid, this.t("Completion", "Завершение"), `${Math.round(stats.completionRate * 100)}%`);
    this.card(grid, this.t("Interruptions", "Прерывания"), `${Math.round(stats.interruptionRate * 100)}%`);
    this.card(grid, this.t("Streak", "Серия"), this.t(`${stats.currentStreak} days`, `${stats.currentStreak} дн.`));
    this.card(grid, this.t("Average", "Среднее"), this.statsService.formatDuration(stats.averageSessionSeconds));
    this.card(grid, this.t("Top mode", "Главный режим"), stats.mostUsedMode ? modeLabel(stats.mostUsedMode, language) : this.t("None yet", "Пока нет"));
    this.card(grid, this.t("Focus rating", "Оценка фокуса"), stats.averageFocusRating === undefined ? this.t("None yet", "Пока нет") : `${stats.averageFocusRating}/5`);
    this.card(grid, this.t("Best window", "Лучшее окно"), stats.bestFocusHour === undefined ? this.t("None yet", "Пока нет") : `${stats.bestFocusHour.toString().padStart(2, "0")}:00`);

    container.createEl("h3", { text: this.t("Recommendations", "Рекомендации") });
    const list = container.createEl("ul");
    for (const recommendation of stats.recommendations) list.createEl("li", { text: recommendation });

    container.createEl("h3", { text: this.t("Daily focus", "Фокус по дням") });
    const daily = this.statsService.daily(sessions).slice(0, 14);
    const dailyList = container.createEl("ul");
    if (daily.length === 0) dailyList.createEl("li", { text: this.t("No completed study days yet.", "Пока нет завершённых учебных дней.") });
    for (const day of daily) {
      dailyList.createEl("li", { text: `${day.date} · ${this.statsService.formatDuration(day.focusSeconds)} ${this.t("focus", "фокуса")} · ${day.completedSessions} ${this.t("completed", "завершено")}` });
    }

    container.createEl("h3", { text: this.t("Recent sessions", "Последние сессии") });
    const recent = sessions.slice(-8).reverse();
    const recentList = container.createEl("ul");
    for (const session of recent) {
      recentList.createEl("li", { text: `${modeLabel(session.mode, language)} · ${this.statsService.formatDuration(session.focusedSeconds)} · ${session.goal}` });
    }
  }

  private card(parent: HTMLElement, label: string, value: string): void {
    const card = parent.createDiv({ cls: "study-zen-stat-card" });
    card.createDiv({ text: label });
    card.createDiv({ cls: "study-zen-stat-value", text: value });
  }

  private t(en: string, ru: string): string {
    return bi(en, ru, this.getSettings().language);
  }
}
