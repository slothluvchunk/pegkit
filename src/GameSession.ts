import { EventEmitter } from "./EventEmitter.js";
import { Guess } from "./Guess.js";
import type { GameConfig } from "./GameConfig.js";
import { SecretSequence } from "./SecretSequence.js";
import { SymbolPool } from "./SymbolPool.js";

export type GameStatus = "in-progress" | "won" | "lost";

export type InvalidGuessReason =
  | "wrong-length"
  | "symbol-not-in-pool"
  | "duplicate-not-allowed"
  | "validation-failed"
  | "game-over";

export interface GuessSubmittedEvent {
  guess: Guess;
  guessNumber: number;
}

export interface GameWonEvent {
  guesses: readonly Guess[];
  guessCount: number;
}

export interface GameLostEvent {
  guesses: readonly Guess[];
  secret: readonly string[];
}

export interface InvalidGuessEvent {
  symbols: readonly string[];
  reason: InvalidGuessReason;
}

interface GameEventMap {
  "guess-submitted": GuessSubmittedEvent;
  "game-won": GameWonEvent;
  "game-lost": GameLostEvent;
  "invalid-guess": InvalidGuessEvent;
}

export class GameSession {
  readonly config: GameConfig;
  private readonly secret: SecretSequence;
  private readonly pool: SymbolPool;
  private readonly _guesses: Guess[] = [];
  private _status: GameStatus = "in-progress";
  private readonly events = new EventEmitter<GameEventMap>();

  constructor(config: GameConfig, secret: SecretSequence) {
    this.config = config;
    this.secret = secret;
    this.pool = new SymbolPool(config);
  }

  get status(): GameStatus {
    return this._status;
  }

  get guesses(): readonly Guess[] {
    return this._guesses;
  }

  get guessCount(): number {
    return this._guesses.length;
  }

  get remainingGuesses(): number {
    return this.config.maxGuesses - this._guesses.length;
  }

  on<K extends keyof GameEventMap>(event: K, listener: (e: GameEventMap[K]) => void): () => void {
    return this.events.on(event, listener);
  }

  submitGuess(symbols: readonly string[]): Guess | InvalidGuessReason {
    if (this._status !== "in-progress") {
      this.events.emit("invalid-guess", { symbols, reason: "game-over" });
      return "game-over";
    }

    const invalid = this.validate(symbols);
    if (invalid !== null) {
      this.events.emit("invalid-guess", { symbols, reason: invalid });
      return invalid;
    }

    const feedback = this.secret.compare(symbols);
    const guess = new Guess(symbols, feedback);
    this._guesses.push(guess);

    this.events.emit("guess-submitted", { guess, guessNumber: this._guesses.length });

    if (feedback.isAllExact()) {
      this._status = "won";
      this.events.emit("game-won", { guesses: this._guesses, guessCount: this._guesses.length });
    } else if (this._guesses.length >= this.config.maxGuesses) {
      this._status = "lost";
      this.events.emit("game-lost", { guesses: this._guesses, secret: this.secret.toJSON() });
    }

    return guess;
  }

  private validate(symbols: readonly string[]): InvalidGuessReason | null {
    if (symbols.length !== this.config.sequenceLength) return "wrong-length";
    if (!this.pool.containsAll(symbols)) return "symbol-not-in-pool";
    if (!this.config.allowDuplicates && new Set(symbols).size !== symbols.length) {
      return "duplicate-not-allowed";
    }
    if (this.config.validator && !this.config.validator(symbols)) return "validation-failed";
    return null;
  }
}
