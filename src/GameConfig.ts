export type Validator = (symbols: readonly string[]) => boolean;

export interface GameConfigOptions {
  sequenceLength: number;
  maxGuesses: number;
  symbolPool: readonly string[];
  allowDuplicates?: boolean;
  validator?: Validator;
}

export class GameConfig {
  readonly sequenceLength: number;
  readonly maxGuesses: number;
  readonly symbolPool: readonly string[];
  readonly allowDuplicates: boolean;
  readonly validator: Validator | undefined;

  constructor(options: GameConfigOptions) {
    if (options.sequenceLength < 1) {
      throw new Error("sequenceLength must be >= 1");
    }
    if (options.maxGuesses < 1) {
      throw new Error("maxGuesses must be >= 1");
    }
    if (options.symbolPool.length === 0) {
      throw new Error("symbolPool must not be empty");
    }
    const unique = new Set(options.symbolPool);
    if (unique.size !== options.symbolPool.length) {
      throw new Error("symbolPool must not contain duplicate symbols");
    }
    if (!options.allowDuplicates && options.symbolPool.length < options.sequenceLength) {
      throw new Error(
        "symbolPool must have at least sequenceLength symbols when allowDuplicates is false"
      );
    }

    this.sequenceLength = options.sequenceLength;
    this.maxGuesses = options.maxGuesses;
    this.symbolPool = options.symbolPool;
    this.allowDuplicates = options.allowDuplicates ?? true;
    this.validator = options.validator;
  }
}
