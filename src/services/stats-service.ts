import { StudyMode, StudySessionRecord, modeLabel } from "../types";
import { bi } from "../i18n";

export interface StudyZenStats {
  totalFocusSeconds: number;
  completedSessions: number;
  totalSessions: number;
  completionRate: number;
  interruptionRate: number;
  currentStreak: number;
  averageSessionSeconds: number;
  averageFocusRating?: number;
  mostUsedMode?: StudyMode;
  bestFocusHour?: number;
  recommendations: string[];
}

export interface DailyStudyZenStats {
  date: string;
  focusSeconds: number;
  completedSessions: number;
}

export class StatsService {
  calculate(sessions: StudySessionRecord[]): StudyZenStats {
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter((session) => session.completed).length;
    const interruptedSessions = sessions.filter((session) => session.interrupted).length;
    const totalFocusSeconds = sessions.reduce((sum, session) => sum + session.focusedSeconds, 0);
    const averageSessionSeconds = totalSessions === 0 ? 0 : Math.round(totalFocusSeconds / totalSessions);
    const averageFocusRating = this.getAverageFocusRating(sessions);
    const mostUsedMode = this.getMostUsedMode(sessions);

    const stats: StudyZenStats = {
      totalFocusSeconds,
      completedSessions,
      totalSessions,
      completionRate: totalSessions === 0 ? 0 : completedSessions / totalSessions,
      interruptionRate: totalSessions === 0 ? 0 : interruptedSessions / totalSessions,
      currentStreak: this.getCurrentStreak(sessions),
      averageSessionSeconds,
      averageFocusRating,
      mostUsedMode,
      bestFocusHour: this.getBestFocusHour(sessions),
      recommendations: []
    };

    stats.recommendations = this.getRecommendations(sessions, stats);
    return stats;
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  daily(sessions: StudySessionRecord[]): DailyStudyZenStats[] {
    const days = new Map<string, DailyStudyZenStats>();

    for (const session of sessions) {
      const date = this.getLocalDateKey(new Date(session.startedAt));
      const day = days.get(date) ?? { date, focusSeconds: 0, completedSessions: 0 };
      day.focusSeconds += session.focusedSeconds;
      if (session.completed) day.completedSessions += 1;
      days.set(date, day);
    }

    return [...days.values()].sort((a, b) => b.date.localeCompare(a.date));
  }

  private getMostUsedMode(sessions: StudySessionRecord[]): StudyMode | undefined {
    const counts = new Map<StudyMode, number>();
    for (const session of sessions) counts.set(session.mode, (counts.get(session.mode) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  }

  private getAverageFocusRating(sessions: StudySessionRecord[]): number | undefined {
    const ratings = sessions.map((session) => session.focusRating).filter((rating): rating is number => rating !== undefined);
    if (ratings.length === 0) return undefined;
    return Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10;
  }

  private getBestFocusHour(sessions: StudySessionRecord[]): number | undefined {
    const focusByHour = new Map<number, number>();
    for (const session of sessions) {
      if (session.focusedSeconds <= 0) continue;
      const hour = new Date(session.startedAt).getHours();
      focusByHour.set(hour, (focusByHour.get(hour) ?? 0) + session.focusedSeconds);
    }

    return [...focusByHour.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  }

  private getCurrentStreak(sessions: StudySessionRecord[]): number {
    const days = new Set(sessions.filter((session) => session.focusedSeconds > 0).map((session) => this.getLocalDateKey(new Date(session.startedAt))));
    let streak = 0;
    const cursor = new Date();

    while (true) {
      const key = this.getLocalDateKey(cursor);
      if (!days.has(key)) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }

  private getLocalDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private getRecommendations(sessions: StudySessionRecord[], stats: StudyZenStats): string[] {
    if (sessions.length === 0) return [bi("Start one short Study Sprint to build momentum.", "Начните с короткого учебного спринта, чтобы набрать темп.")];

    const recommendations: string[] = [];
    if (stats.currentStreak >= 3) recommendations.push(bi(`You studied ${stats.currentStreak} days in a row. Keep the streak with a short Zen Session today.`, `Вы учились ${stats.currentStreak} дня подряд. Поддержите серию короткой дзен-сессией сегодня.`));
    if (stats.bestFocusHour !== undefined) recommendations.push(bi(`Your strongest focus window starts around ${stats.bestFocusHour.toString().padStart(2, "0")}:00. Protect it for demanding study work.`, `Ваше самое сильное окно фокуса начинается около ${stats.bestFocusHour.toString().padStart(2, "0")}:00. Защитите его для сложной учёбы.`));
    if (stats.interruptionRate >= 0.3 && sessions.length >= 3) recommendations.push(bi("Interruptions are frequent. Use Focus Shield and a shorter planned session for the next round.", "Прерывания случаются часто. Включите щит фокуса и выберите более короткую плановую сессию."));
    if (stats.averageFocusRating !== undefined && stats.averageFocusRating < 3) recommendations.push(bi("Recent focus ratings are low. Try one concrete Study Sprint before a longer Deep Study block.", "Последние оценки фокуса низкие. Попробуйте один конкретный учебный спринт перед длинной глубокой учёбой."));
    if (stats.mostUsedMode) recommendations.push(bi(`${modeLabel(stats.mostUsedMode)} is your most used mode. Use it when you need an easy start.`, `${modeLabel(stats.mostUsedMode)} — ваш самый частый режим. Используйте его, когда нужен лёгкий старт.`));
    if (stats.completionRate < 0.5 && sessions.length >= 3) recommendations.push(bi("Your completion rate is below 50%. Try shorter Study Sprint sessions.", "Доля завершённых сессий ниже 50%. Попробуйте более короткие учебные спринты."));
    if (stats.averageSessionSeconds > 3600) recommendations.push(bi("Your average session is long. Add Deep Study checkpoints to protect attention quality.", "Средняя сессия длинная. Добавьте контрольные точки глубокой учёбы, чтобы сохранить качество внимания."));

    return recommendations.slice(0, 3);
  }
}
