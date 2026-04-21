export { GameConfig } from "./GameConfig.js";
export type { GameConfigOptions, Validator } from "./GameConfig.js";

export { SymbolPool } from "./SymbolPool.js";

export { Feedback } from "./Feedback.js";
export type { PositionFeedback, PositionResult } from "./Feedback.js";

export { SecretSequence } from "./SecretSequence.js";

export { Guess } from "./Guess.js";

export { GameSession } from "./GameSession.js";
export type {
  GameStatus,
  InvalidGuessReason,
  GuessSubmittedEvent,
  GameWonEvent,
  GameLostEvent,
  InvalidGuessEvent,
} from "./GameSession.js";

export { Statistics } from "./Statistics.js";
export type { StatisticsSummary, GuessDistribution } from "./Statistics.js";
