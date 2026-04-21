import type { GameConfig } from "./GameConfig.js";

export class SymbolPool {
  private readonly symbols: ReadonlySet<string>;

  constructor(config: GameConfig) {
    this.symbols = new Set(config.symbolPool);
  }

  contains(symbol: string): boolean {
    return this.symbols.has(symbol);
  }

  containsAll(symbols: readonly string[]): boolean {
    return symbols.every((s) => this.symbols.has(s));
  }

  toArray(): string[] {
    return [...this.symbols];
  }

  get size(): number {
    return this.symbols.size;
  }
}
