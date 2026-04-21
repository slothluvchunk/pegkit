import type { Feedback } from "./Feedback.js";

export class Guess {
  readonly symbols: readonly string[];
  readonly feedback: Feedback;
  readonly submittedAt: number;

  constructor(symbols: readonly string[], feedback: Feedback, submittedAt: number = Date.now()) {
    this.symbols = symbols;
    this.feedback = feedback;
    this.submittedAt = submittedAt;
  }

  toJSON(): { symbols: readonly string[]; feedback: ReturnType<Feedback["toJSON"]>; submittedAt: number } {
    return {
      symbols: this.symbols,
      feedback: this.feedback.toJSON(),
      submittedAt: this.submittedAt,
    };
  }
}
