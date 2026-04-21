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
  // TODO: implement aggregation over sessions
  static compute(_sessions: readonly GameSession[]): StatisticsSummary {
    throw new Error("Not implemented");
  }

  // TODO: implement incremental update
  static update(
    _summary: StatisticsSummary,
    _session: GameSession & { status: Exclude<GameStatus, "in-progress"> }
  ): StatisticsSummary {
    throw new Error("Not implemented");
  }
}
