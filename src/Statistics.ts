import type { GameSession, GameStatus } from "./GameSession.js";

export interface GuessDistribution {
  [guessCount: number]: number;
}

export interface StatisticsSummary {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: GuessDistribution;
  averageGuessesOnWin: number | null;
}

export class Statistics {
  static compute(sessions: readonly GameSession[]): StatisticsSummary {
    const completed = sessions.filter((s) => s.status !== "in-progress");

    let wins = 0;
    let losses = 0;
    let currentStreak = 0;
    let maxStreak = 0;
    let streak = 0;
    let totalGuessesOnWin = 0;
    const guessDistribution: GuessDistribution = {};

    for (const session of completed) {
      if (session.status === "won") {
        wins++;
        streak++;
        maxStreak = Math.max(maxStreak, streak);
        totalGuessesOnWin += session.guessCount;
        guessDistribution[session.guessCount] = (guessDistribution[session.guessCount] ?? 0) + 1;
      } else {
        losses++;
        streak = 0;
      }
    }

    // Current streak: consecutive wins from the end
    for (let i = completed.length - 1; i >= 0; i--) {
      if (completed[i]!.status === "won") {
        currentStreak++;
      } else {
        break;
      }
    }

    const totalGames = wins + losses;

    return {
      totalGames,
      wins,
      losses,
      winRate: totalGames === 0 ? 0 : wins / totalGames,
      currentStreak,
      maxStreak,
      guessDistribution,
      averageGuessesOnWin: wins === 0 ? null : totalGuessesOnWin / wins,
    };
  }

  static update(
    summary: StatisticsSummary,
    session: GameSession & { status: Exclude<GameStatus, "in-progress"> }
  ): StatisticsSummary {
    const won = session.status === "won";
    const wins = summary.wins + (won ? 1 : 0);
    const losses = summary.losses + (won ? 0 : 1);
    const totalGames = wins + losses;
    const currentStreak = won ? summary.currentStreak + 1 : 0;
    const maxStreak = Math.max(summary.maxStreak, currentStreak);

    const guessDistribution = { ...summary.guessDistribution };
    if (won) {
      guessDistribution[session.guessCount] = (guessDistribution[session.guessCount] ?? 0) + 1;
    }

    const averageGuessesOnWin = won
      ? ((summary.averageGuessesOnWin ?? 0) * summary.wins + session.guessCount) / wins
      : summary.averageGuessesOnWin;

    return {
      totalGames,
      wins,
      losses,
      winRate: totalGames === 0 ? 0 : wins / totalGames,
      currentStreak,
      maxStreak,
      guessDistribution,
      averageGuessesOnWin: wins === 0 ? null : averageGuessesOnWin,
    };
  }
}
