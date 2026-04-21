import { describe, it, expect } from "vitest";
import { GameConfig } from "../src/GameConfig.js";
import { SymbolPool } from "../src/SymbolPool.js";

describe("GameConfig", () => {
  it("creates a valid config", () => {
    const config = new GameConfig({
      sequenceLength: 4,
      maxGuesses: 6,
      symbolPool: ["A", "B", "C", "D", "E", "F"],
    });
    expect(config.sequenceLength).toBe(4);
    expect(config.maxGuesses).toBe(6);
    expect(config.allowDuplicates).toBe(true);
    expect(config.validator).toBeUndefined();
  });

  it("defaults allowDuplicates to true", () => {
    const config = new GameConfig({ sequenceLength: 2, maxGuesses: 3, symbolPool: ["X", "Y"] });
    expect(config.allowDuplicates).toBe(true);
  });

  it("throws if sequenceLength < 1", () => {
    expect(
      () => new GameConfig({ sequenceLength: 0, maxGuesses: 6, symbolPool: ["A"] })
    ).toThrow("sequenceLength");
  });

  it("throws if maxGuesses < 1", () => {
    expect(
      () => new GameConfig({ sequenceLength: 1, maxGuesses: 0, symbolPool: ["A"] })
    ).toThrow("maxGuesses");
  });

  it("throws if symbolPool is empty", () => {
    expect(
      () => new GameConfig({ sequenceLength: 1, maxGuesses: 1, symbolPool: [] })
    ).toThrow("symbolPool");
  });

  it("throws if symbolPool has duplicates", () => {
    expect(
      () => new GameConfig({ sequenceLength: 2, maxGuesses: 6, symbolPool: ["A", "A"] })
    ).toThrow("duplicate");
  });

  it("throws if pool too small for no-duplicate mode", () => {
    expect(
      () =>
        new GameConfig({
          sequenceLength: 4,
          maxGuesses: 6,
          symbolPool: ["A", "B", "C"],
          allowDuplicates: false,
        })
    ).toThrow("symbolPool must have at least");
  });

  it("accepts pool equal to sequenceLength in no-duplicate mode", () => {
    const config = new GameConfig({
      sequenceLength: 3,
      maxGuesses: 6,
      symbolPool: ["A", "B", "C"],
      allowDuplicates: false,
    });
    expect(config.sequenceLength).toBe(3);
  });

  it("accepts a custom validator", () => {
    const validator = (s: readonly string[]) => s.length > 0;
    const config = new GameConfig({
      sequenceLength: 2,
      maxGuesses: 6,
      symbolPool: ["A", "B"],
      validator,
    });
    expect(config.validator).toBe(validator);
  });
});

describe("SymbolPool", () => {
  const config = new GameConfig({
    sequenceLength: 2,
    maxGuesses: 6,
    symbolPool: ["R", "G", "B", "Y"],
  });

  it("contains symbols from pool", () => {
    const pool = new SymbolPool(config);
    expect(pool.contains("R")).toBe(true);
    expect(pool.contains("G")).toBe(true);
  });

  it("does not contain symbols outside pool", () => {
    const pool = new SymbolPool(config);
    expect(pool.contains("Z")).toBe(false);
  });

  it("containsAll returns true when all present", () => {
    const pool = new SymbolPool(config);
    expect(pool.containsAll(["R", "B"])).toBe(true);
  });

  it("containsAll returns false when any missing", () => {
    const pool = new SymbolPool(config);
    expect(pool.containsAll(["R", "Z"])).toBe(false);
  });

  it("reports correct size", () => {
    const pool = new SymbolPool(config);
    expect(pool.size).toBe(4);
  });

  it("toArray returns all symbols", () => {
    const pool = new SymbolPool(config);
    expect(pool.toArray().sort()).toEqual(["B", "G", "R", "Y"]);
  });
});
