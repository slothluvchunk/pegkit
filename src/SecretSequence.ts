import { Feedback, type PositionFeedback } from "./Feedback.js";
import type { GameConfig } from "./GameConfig.js";

export class SecretSequence {
  private readonly symbols: readonly string[];

  constructor(symbols: readonly string[], config: GameConfig) {
    if (symbols.length !== config.sequenceLength) {
      throw new Error(
        `Secret length ${symbols.length} does not match configured sequenceLength ${config.sequenceLength}`
      );
    }
    const pool = new Set(config.symbolPool);
    for (const s of symbols) {
      if (!pool.has(s)) {
        throw new Error(`Symbol "${s}" is not in the symbol pool`);
      }
    }
    if (!config.allowDuplicates) {
      const unique = new Set(symbols);
      if (unique.size !== symbols.length) {
        throw new Error("Secret contains duplicate symbols but allowDuplicates is false");
      }
    }
    this.symbols = symbols;
  }

  compare(guess: readonly string[]): Feedback {
    const secret = this.symbols;
    const len = secret.length;
    const positions: PositionFeedback[] = new Array(len);

    // Track which secret positions and guess positions are unmatched after exact pass
    const secretUnmatched: (string | null)[] = [...secret];
    const guessUnmatched: (string | null)[] = [...guess];

    // First pass: exact matches
    for (let i = 0; i < len; i++) {
      if (guess[i] === secret[i]) {
        positions[i] = { position: i, symbol: guess[i]!, result: "exact" };
        secretUnmatched[i] = null;
        guessUnmatched[i] = null;
      }
    }

    // Second pass: present/absent among unmatched positions
    for (let i = 0; i < len; i++) {
      if (guessUnmatched[i] === null) continue;
      const sym = guessUnmatched[i]!;
      const matchIdx = secretUnmatched.indexOf(sym);
      if (matchIdx !== -1) {
        positions[i] = { position: i, symbol: sym, result: "present" };
        secretUnmatched[matchIdx] = null;
      } else {
        positions[i] = { position: i, symbol: sym, result: "absent" };
      }
    }

    return new Feedback(positions);
  }

  get length(): number {
    return this.symbols.length;
  }

  toJSON(): readonly string[] {
    return this.symbols;
  }
}
