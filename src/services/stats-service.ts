import { StudyMode, StudySessionRecord, modeLabel } from "../types";

export interface StudyZenStats {
  totalFocusSeconds: number;
  completedSessions: number;
  totalSessions: number;
  completionRate: number;
  currentStreak: number;
  averageSessionSeconds: number;
  mostUsedMode?: StudyMode;
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
    const totalFocusSeconds = sessions.reduce((sum, session) => sum + session.focusedSeconds, 0);
    const averageSessionSeconds = totalSessions === 0 ? 0 : Math.round(totalFocusSeconds / totalSessions);
    const mostUsedMode = this.getMostUsedMode(sessions);

    const stats: StudyZenStats = {
      totalFocusSeconds,
      completedSessions,
      totalSessions,
      completionRate: totalSessions === 0 ? 0 : completedSessions / totalSessions,
      currentStreak: this.getCurrentStreak(sessions),
      averageSessionSeconds,
      mostUsedMode,
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

  private getCurrentStreak(sessions: StudySessionRecord[]): number {
    const days = new Set(sessions.map((session) => this.getLocalDateKey(new Date(session.startedAt))));
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
    if (sessions.length === 0) return ["Start one short Study Sprint to build momentum."];

    const recommendations: string[] = [];
    if (stats.currentStreak >= 3) recommendations.push(`You studied ${stats.currentStreak} days in a row. Keep the streak with a short Zen Session today.`);
    if (stats.mostUsedMode) recommendations.push(`${modeLabel(stats.mostUsedMode)} is your most used mode. Use it when you need an easy start.`);
    if (stats.completionRate < 0.5 && sessions.length >= 3) recommendations.push("Your completion rate is below 50%. Try shorter Study Sprint sessions.");
    if (stats.averageSessionSeconds > 3600) recommendations.push("Your average session is long. Add Deep Study checkpoints to protect attention quality.");

    return recommendations.slice(0, 3);
  }
}
