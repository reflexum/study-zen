import { StudyMode, StudySessionRecord, modeLabel } from "../types";
import { StudyZenLanguage, bi } from "../i18n";

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
  calculate(sessions: StudySessionRecord[], language: StudyZenLanguage = "ru"): StudyZenStats {
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

    stats.recommendations = this.getRecommendations(sessions, stats, language);
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

  private getRecommendations(sessions: StudySessionRecord[], stats: StudyZenStats, language: StudyZenLanguage): string[] {
    if (sessions.length === 0) {
      return [
        bi(
          "Start with a short Study Sprint. Set one clear goal and finish it to create your first focus baseline.",
          "Начните с короткого учебного спринта: выберите одну понятную цель и завершите её, чтобы появилась первая точка отсчёта.",
          language
        )
      ];
    }

    const recommendations: string[] = [];
    if (stats.currentStreak >= 3) {
      recommendations.push(
        bi(
          `You have a ${stats.currentStreak}-day study streak. Keep it alive today with one small, low-friction session.`,
          `У вас серия из ${stats.currentStreak} учебных дней. Поддержите её сегодня одной небольшой сессией без лишнего давления.`,
          language
        )
      );
    }
    if (stats.bestFocusHour !== undefined) {
      recommendations.push(
        bi(
          `Your best focus window is around ${stats.bestFocusHour.toString().padStart(2, "0")}:00. Plan the hardest study task for this time.`,
          `Лучшее окно фокуса сейчас около ${stats.bestFocusHour.toString().padStart(2, "0")}:00. Запланируйте на это время самую сложную учебную задачу.`,
          language
        )
      );
    }
    if (stats.interruptionRate >= 0.3 && sessions.length >= 3) {
      recommendations.push(
        bi(
          "Interruptions are showing up often. Turn on Focus Shield and choose a shorter next session so it is easier to finish cleanly.",
          "Прерывания встречаются часто. Включите щит фокуса и сделайте следующую сессию короче, чтобы её было проще завершить спокойно.",
          language
        )
      );
    }
    if (stats.averageFocusRating !== undefined && stats.averageFocusRating < 3) {
      recommendations.push(
        bi(
          "Recent focus ratings are low. Pick one concrete Study Sprint before starting a longer Deep Study block.",
          "Последние оценки фокуса низкие. Сначала выберите один конкретный учебный спринт, а длинную глубокую учёбу оставьте на потом.",
          language
        )
      );
    }
    if (stats.mostUsedMode) {
      recommendations.push(
        bi(
          `${modeLabel(stats.mostUsedMode, language)} is your easiest entry point. Use it when you need to start quickly without tuning the setup.`,
          `${modeLabel(stats.mostUsedMode, language)} — ваш самый привычный режим. Используйте его, когда нужно быстро начать без долгой настройки.`,
          language
        )
      );
    }
    if (stats.completionRate < 0.5 && sessions.length >= 3) {
      recommendations.push(
        bi(
          "Less than half of sessions are finished. Reduce the planned duration and define a smaller end result for the next round.",
          "Завершается меньше половины сессий. Уменьшите плановую длительность и задайте более маленький итог для следующего подхода.",
          language
        )
      );
    }
    if (stats.averageSessionSeconds > 3600) {
      recommendations.push(
        bi(
          "Your average session is long. Add a Deep Study checkpoint so attention quality does not drift silently.",
          "Средняя сессия получается длинной. Добавьте контрольную точку глубокой учёбы, чтобы качество внимания не проседало незаметно.",
          language
        )
      );
    }

    return recommendations.slice(0, 3);
  }
}
