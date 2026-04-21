import { describe, it, expect, vi } from "vitest";
import { GameConfig } from "../src/GameConfig.js";
import { SecretSequence } from "../src/SecretSequence.js";
import { GameSession } from "../src/GameSession.js";
import { Guess } from "../src/Guess.js";

function makeSession(overrides?: Partial<ConstructorParameters<typeof GameConfig>[0]>) {
  const config = new GameConfig({
    sequenceLength: 4,
    maxGuesses: 6,
    symbolPool: ["A", "B", "C", "D", "E", "F"],
    allowDuplicates: true,
    ...overrides,
  });
  const secret = new SecretSequence(["A", "B", "C", "D"], config);
  return new GameSession(config, secret);
}

describe("GameSession — basic flow", () => {
  it("starts in-progress", () => {
    expect(makeSession().status).toBe("in-progress");
  });

  it("submitGuess returns a Guess on valid input", () => {
    const session = makeSession();
    const result = session.submitGuess(["A", "B", "C", "D"]);
    expect(result).toBeInstanceOf(Guess);
  });

  it("records guesses", () => {
    const session = makeSession();
    session.submitGuess(["E", "F", "E", "F"]);
    expect(session.guessCount).toBe(1);
    expect(session.guesses).toHaveLength(1);
  });

  it("decrements remainingGuesses", () => {
    const session = makeSession();
    expect(session.remainingGuesses).toBe(6);
    session.submitGuess(["E", "F", "E", "F"]);
    expect(session.remainingGuesses).toBe(5);
  });
});

describe("GameSession — win/loss conditions", () => {
  it("transitions to won on all-exact guess", () => {
    const session = makeSession();
    session.submitGuess(["A", "B", "C", "D"]);
    expect(session.status).toBe("won");
  });

  it("transitions to lost when max guesses exhausted", () => {
    const session = makeSession({ maxGuesses: 3 });
    session.submitGuess(["E", "F", "E", "F"]);
    session.submitGuess(["E", "F", "E", "F"]);
    session.submitGuess(["E", "F", "E", "F"]);
    expect(session.status).toBe("lost");
  });

  it("returns game-over after game is won", () => {
    const session = makeSession();
    session.submitGuess(["A", "B", "C", "D"]);
    const result = session.submitGuess(["A", "B", "C", "D"]);
    expect(result).toBe("game-over");
  });

  it("returns game-over after game is lost", () => {
    const session = makeSession({ maxGuesses: 1 });
    session.submitGuess(["E", "F", "E", "F"]);
    const result = session.submitGuess(["A", "B", "C", "D"]);
    expect(result).toBe("game-over");
  });

  it("does not add guesses after game is over", () => {
    const session = makeSession();
    session.submitGuess(["A", "B", "C", "D"]); // win
    session.submitGuess(["A", "B", "C", "D"]);
    expect(session.guessCount).toBe(1);
  });
});

describe("GameSession — validation", () => {
  it("rejects wrong-length guess", () => {
    const session = makeSession();
    expect(session.submitGuess(["A", "B", "C"])).toBe("wrong-length");
    expect(session.guessCount).toBe(0);
  });

  it("rejects symbol not in pool", () => {
    const session = makeSession();
    expect(session.submitGuess(["A", "B", "C", "Z"])).toBe("symbol-not-in-pool");
    expect(session.guessCount).toBe(0);
  });

  it("rejects duplicates when allowDuplicates=false", () => {
    const session = makeSession({ allowDuplicates: false });
    expect(session.submitGuess(["A", "A", "B", "C"])).toBe("duplicate-not-allowed");
    expect(session.guessCount).toBe(0);
  });

  it("allows duplicates when allowDuplicates=true", () => {
    const session = makeSession({ allowDuplicates: true });
    const result = session.submitGuess(["A", "A", "B", "C"]);
    expect(result).toBeInstanceOf(Guess);
  });

  it("rejects if custom validator returns false", () => {
    const session = makeSession({ validator: () => false });
    expect(session.submitGuess(["A", "B", "C", "D"])).toBe("validation-failed");
    expect(session.guessCount).toBe(0);
  });

  it("accepts if custom validator returns true", () => {
    const session = makeSession({ validator: () => true });
    const result = session.submitGuess(["A", "B", "C", "D"]);
    expect(result).toBeInstanceOf(Guess);
  });

  it("invalid guess does not count against maxGuesses", () => {
    const session = makeSession({ maxGuesses: 2 });
    session.submitGuess(["A", "B", "C"]); // invalid
    session.submitGuess(["E", "F", "E", "F"]); // valid
    session.submitGuess(["E", "F", "E", "F"]); // valid — exhausts
    expect(session.status).toBe("lost");
    expect(session.guessCount).toBe(2);
  });
});

describe("GameSession — events", () => {
  it("emits guess-submitted on valid guess", () => {
    const session = makeSession();
    const handler = vi.fn();
    session.on("guess-submitted", handler);
    session.submitGuess(["E", "F", "E", "F"]);
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]![0].guessNumber).toBe(1);
  });

  it("emits game-won on winning guess", () => {
    const session = makeSession();
    const wonHandler = vi.fn();
    const submittedHandler = vi.fn();
    session.on("game-won", wonHandler);
    session.on("guess-submitted", submittedHandler);
    session.submitGuess(["A", "B", "C", "D"]);
    expect(wonHandler).toHaveBeenCalledOnce();
    expect(submittedHandler).toHaveBeenCalledOnce();
    expect(wonHandler.mock.calls[0]![0].guessCount).toBe(1);
  });

  it("emits game-lost on exhausting guesses", () => {
    const session = makeSession({ maxGuesses: 2 });
    const lostHandler = vi.fn();
    session.on("game-lost", lostHandler);
    session.submitGuess(["E", "F", "E", "F"]);
    session.submitGuess(["E", "F", "E", "F"]);
    expect(lostHandler).toHaveBeenCalledOnce();
    expect(lostHandler.mock.calls[0]![0].secret).toEqual(["A", "B", "C", "D"]);
  });

  it("emits invalid-guess on bad input", () => {
    const session = makeSession();
    const handler = vi.fn();
    session.on("invalid-guess", handler);
    session.submitGuess(["A", "B", "C"]); // wrong length
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]![0].reason).toBe("wrong-length");
  });

  it("emits invalid-guess with game-over reason after game ends", () => {
    const session = makeSession();
    const handler = vi.fn();
    session.on("invalid-guess", handler);
    session.submitGuess(["A", "B", "C", "D"]); // win
    session.submitGuess(["A", "B", "C", "D"]); // attempt after win
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]![0].reason).toBe("game-over");
  });

  it("unsubscribe via returned function stops events", () => {
    const session = makeSession();
    const handler = vi.fn();
    const unsub = session.on("guess-submitted", handler);
    unsub();
    session.submitGuess(["E", "F", "E", "F"]);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("GameSession — feedback correctness through session", () => {
  it("guess feedback reflects comparison result", () => {
    const session = makeSession();
    const result = session.submitGuess(["A", "F", "F", "F"]);
    expect(result).toBeInstanceOf(Guess);
    if (result instanceof Guess) {
      expect(result.feedback.exactCount).toBe(1); // A at position 0
      expect(result.feedback.absentCount).toBe(3);
    }
  });
});
