import { describe, it, expect } from "vitest";
import { GameConfig } from "../src/GameConfig.js";
import { SecretSequence } from "../src/SecretSequence.js";

const config = new GameConfig({
  sequenceLength: 4,
  maxGuesses: 6,
  symbolPool: ["A", "B", "C", "D", "E", "F"],
  allowDuplicates: true,
});

const nodupeConfig = new GameConfig({
  sequenceLength: 4,
  maxGuesses: 6,
  symbolPool: ["A", "B", "C", "D", "E", "F"],
  allowDuplicates: false,
});

describe("SecretSequence construction", () => {
  it("constructs from valid symbols", () => {
    const s = new SecretSequence(["A", "B", "C", "D"], config);
    expect(s.length).toBe(4);
  });

  it("throws if length mismatches config", () => {
    expect(() => new SecretSequence(["A", "B", "C"], config)).toThrow("sequenceLength");
  });

  it("throws if symbol not in pool", () => {
    expect(() => new SecretSequence(["A", "B", "C", "Z"], config)).toThrow("not in the symbol pool");
  });

  it("throws if duplicates present with allowDuplicates=false", () => {
    expect(() => new SecretSequence(["A", "B", "A", "C"], nodupeConfig)).toThrow("duplicate");
  });

  it("allows duplicates when allowDuplicates=true", () => {
    expect(() => new SecretSequence(["A", "A", "B", "C"], config)).not.toThrow();
  });
});

describe("SecretSequence.compare — basic cases", () => {
  it("all exact matches", () => {
    const s = new SecretSequence(["A", "B", "C", "D"], config);
    const fb = s.compare(["A", "B", "C", "D"]);
    expect(fb.exactCount).toBe(4);
    expect(fb.presentCount).toBe(0);
    expect(fb.absentCount).toBe(0);
    expect(fb.isAllExact()).toBe(true);
  });

  it("no matches at all", () => {
    const s = new SecretSequence(["A", "B", "C", "D"], config);
    const fb = s.compare(["E", "F", "E", "F"]);
    expect(fb.exactCount).toBe(0);
    expect(fb.presentCount).toBe(0);
    expect(fb.absentCount).toBe(4);
  });

  it("all present but none exact", () => {
    const s = new SecretSequence(["A", "B", "C", "D"], config);
    const fb = s.compare(["B", "C", "D", "A"]);
    expect(fb.exactCount).toBe(0);
    expect(fb.presentCount).toBe(4);
    expect(fb.absentCount).toBe(0);
  });

  it("mix of exact, present, absent", () => {
    const s = new SecretSequence(["A", "B", "C", "D"], config);
    const fb = s.compare(["A", "C", "E", "F"]);
    expect(fb.exactCount).toBe(1);  // A
    expect(fb.presentCount).toBe(1); // C present but wrong position
    expect(fb.absentCount).toBe(2);  // E, F
  });
});

describe("SecretSequence.compare — duplicate handling", () => {
  // The key case from the spec: secret [A,B,A] vs guess [A,A,C]
  // should produce 1 exact, 1 present, 1 absent
  it("secret [A,B,A] vs guess [A,A,C] — no double-counting", () => {
    const cfg3 = new GameConfig({
      sequenceLength: 3,
      maxGuesses: 6,
      symbolPool: ["A", "B", "C"],
    });
    const s = new SecretSequence(["A", "B", "A"], cfg3);
    const fb = s.compare(["A", "A", "C"]);
    expect(fb.exactCount).toBe(1);   // position 0: A exact
    expect(fb.presentCount).toBe(1); // position 1: A is present (secret pos 2)
    expect(fb.absentCount).toBe(1);  // position 2: C absent
    expect(fb.positions[0]!.result).toBe("exact");
    expect(fb.positions[1]!.result).toBe("present");
    expect(fb.positions[2]!.result).toBe("absent");
  });

  it("guess has more of a symbol than the secret does", () => {
    // secret [A,B,C,D], guess [A,A,A,A] — only 1 exact, 0 present, 3 absent
    const s = new SecretSequence(["A", "B", "C", "D"], config);
    const fb = s.compare(["A", "A", "A", "A"]);
    expect(fb.exactCount).toBe(1);
    expect(fb.presentCount).toBe(0);
    expect(fb.absentCount).toBe(3);
  });

  it("secret has duplicates and guess matches both", () => {
    // secret [A,A,B,C], guess [A,A,C,B] — 2 exact (A,A), 2 present (C,B)
    const s = new SecretSequence(["A", "A", "B", "C"], config);
    const fb = s.compare(["A", "A", "C", "B"]);
    expect(fb.exactCount).toBe(2);
    expect(fb.presentCount).toBe(2);
    expect(fb.absentCount).toBe(0);
  });

  it("guess with duplicate not in secret — all absent for extras", () => {
    // secret [A,B,C,D], guess [E,E,E,E]
    const s = new SecretSequence(["A", "B", "C", "D"], config);
    const fb = s.compare(["E", "E", "E", "E"]);
    expect(fb.exactCount).toBe(0);
    expect(fb.presentCount).toBe(0);
    expect(fb.absentCount).toBe(4);
  });

  it("secret all same symbol, guess has one match", () => {
    // secret [A,A,A,A], guess [A,B,C,D] — 1 exact, 0 present, 3 absent
    const s = new SecretSequence(["A", "A", "A", "A"], config);
    const fb = s.compare(["A", "B", "C", "D"]);
    expect(fb.exactCount).toBe(1);
    expect(fb.presentCount).toBe(0);
    expect(fb.absentCount).toBe(3);
  });

  it("secret all same, guess all same matching — all exact", () => {
    const s = new SecretSequence(["A", "A", "A", "A"], config);
    const fb = s.compare(["A", "A", "A", "A"]);
    expect(fb.exactCount).toBe(4);
    expect(fb.presentCount).toBe(0);
    expect(fb.absentCount).toBe(0);
  });

  it("position-level results are correct in duplicate case", () => {
    const cfg3 = new GameConfig({
      sequenceLength: 3,
      maxGuesses: 6,
      symbolPool: ["A", "B", "C"],
    });
    // secret [A,A,B], guess [B,A,A]
    // pos 0: B present (secret has B at pos 2)
    // pos 1: A exact
    // pos 2: A present (secret has A at pos 0, since pos 1 matched)
    const s = new SecretSequence(["A", "A", "B"], cfg3);
    const fb = s.compare(["B", "A", "A"]);
    expect(fb.positions[0]!.result).toBe("present"); // B
    expect(fb.positions[1]!.result).toBe("exact");   // A
    expect(fb.positions[2]!.result).toBe("present"); // A
    expect(fb.exactCount).toBe(1);
    expect(fb.presentCount).toBe(2);
    expect(fb.absentCount).toBe(0);
  });
});

describe("Feedback", () => {
  it("isAllExact returns false for partial match", () => {
    const s = new SecretSequence(["A", "B", "C", "D"], config);
    const fb = s.compare(["A", "B", "E", "F"]);
    expect(fb.isAllExact()).toBe(false);
  });

  it("toJSON returns positions array", () => {
    const s = new SecretSequence(["A", "B", "C", "D"], config);
    const fb = s.compare(["A", "B", "C", "D"]);
    const json = fb.toJSON();
    expect(json).toHaveLength(4);
    expect(json[0]!.result).toBe("exact");
  });
});
