# PegKit

A zero-dependency TypeScript engine for guess-and-feedback logic games.

PegKit handles the core mechanics shared by games like Mastermind, Wordle, Bulls & Cows, and Jotto — comparing a guess against a hidden sequence and producing structured feedback. You bring the content (letters, colors, numbers, emoji, whatever) and the UI. PegKit handles the logic.

## Why PegKit?

The guess-a-sequence, get-feedback loop is a decades-old game mechanic that nobody should have to reimplement from scratch — or worry about someone claiming as proprietary IP. PegKit provides a correct, tested, extensible engine so you can focus on building your game, not debugging edge cases in duplicate-symbol matching.

## Install

```bash
npm install pegkit
```

## Quick Start

```typescript
import { GameSession, GameConfig, SymbolPool } from 'pegkit';

// Define valid symbols — letters, colors, numbers, whatever you want
const pool = new SymbolPool(['A', 'B', 'C', 'D', 'E', 'F']);

// Configure the game
const config = new GameConfig({
  sequenceLength: 4,
  maxGuesses: 10,
  allowDuplicates: true,
  symbolPool: pool,
});

// Start a session with a secret sequence
const session = new GameSession(config, ['A', 'B', 'C', 'D']);

// Submit a guess
const result = session.submitGuess(['A', 'C', 'B', 'F']);

console.log(result.feedback.perPosition);
// [
//   { symbol: 'A', status: 'exact' },    — right symbol, right spot
//   { symbol: 'C', status: 'present' },  — right symbol, wrong spot
//   { symbol: 'B', status: 'present' },  — right symbol, wrong spot
//   { symbol: 'F', status: 'absent' },   — not in the secret
// ]

console.log(result.feedback.summary);
// { exact: 1, present: 2, absent: 1 }

console.log(session.state); // 'in-progress'
```

## Core Concepts

**Symbols are opaque tokens.** PegKit doesn't know or care whether your symbols are letters, hex colors, or emoji. Anything representable as a string works. This means the same engine can power a word-guessing game, a color-code-breaking game, or something entirely new.

**No content ships with the library.** PegKit has no word lists, no dictionaries, no color palettes. You provide the `SymbolPool` (the set of valid symbols) and the secret sequence. If your game needs to validate that a guess is "a real word," inject a validator function through the config — PegKit will call it, but the dictionary is yours.

**Everything is serializable.** Every class supports JSON serialization and deserialization, so you can persist and restore game state however you like — localStorage, a database, a URL parameter. PegKit never touches storage.

## Duplicate Handling

The comparison algorithm correctly handles duplicate symbols, which is the edge case most implementations get wrong.

```typescript
// Secret: [A, B, A]
// Guess:  [A, A, C]
//
// Position 0: A vs A → exact match
// Position 1: A vs B → A is present (matches the secret's position-2 A)
// Position 2: C vs A → absent
//
// Result: 1 exact, 1 present, 1 absent
// The second A in the secret is consumed by the present match,
// so it won't be double-counted.
```

## API Reference

### `GameConfig`

Defines the rules for a game instance.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sequenceLength` | `number` | required | How many symbols in the secret |
| `maxGuesses` | `number` | required | Maximum attempts allowed |
| `allowDuplicates` | `boolean` | `true` | Whether the secret/guesses can repeat symbols |
| `symbolPool` | `SymbolPool` | required | The set of valid symbols |
| `validator` | `(guess: string[]) => boolean` | `undefined` | Optional custom validation (e.g., "is this a real word?") |

### `SymbolPool`

Wraps the set of valid symbols and provides validation.

```typescript
const pool = new SymbolPool(['red', 'blue', 'green', 'yellow']);
pool.isValid('red');    // true
pool.isValid('purple'); // false
pool.size;              // 4
```

### `GameSession`

Orchestrates a single play-through.

```typescript
const session = new GameSession(config, secret);

session.submitGuess(symbols);  // Returns Guess with Feedback
session.state;                 // 'in-progress' | 'won' | 'lost'
session.guesses;               // Array of past Guess objects
session.remainingGuesses;      // Number
session.isOver;                // Boolean
```

### `Feedback`

The result of comparing a guess to the secret. This is the primary contract your UI consumes.

```typescript
feedback.perPosition;  // Array of { symbol, status: 'exact' | 'present' | 'absent' }
feedback.summary;      // { exact: number, present: number, absent: number }
```

### `Guess`

An immutable submitted attempt.

```typescript
guess.symbols;    // The submitted sequence
guess.feedback;   // The Feedback object
guess.timestamp;  // When it was submitted
```

### Events

GameSession emits events you can listen to:

```typescript
session.on('guess', (guess: Guess) => { /* update UI */ });
session.on('win', (session: GameSession) => { /* celebrate */ });
session.on('loss', (session: GameSession) => { /* commiserate */ });
session.on('invalid-guess', (reason: string) => { /* show error */ });
```

### Statistics

Post-game and cross-game analytics that consume sessions without influencing them.

```typescript
import { Statistics } from 'pegkit';

const stats = new Statistics();
stats.record(session);

stats.gamesPlayed;        // Total games
stats.winRate;            // Percentage
stats.currentStreak;      // Consecutive wins
stats.guessDistribution;  // Map of guess-number → count
```

## What PegKit Is Not

PegKit deliberately excludes:

- **UI components** — render however you want
- **Word lists or dictionaries** — bring your own content
- **Persistence** — serialize and store however you want
- **Scoring/points** — too game-specific; build on top
- **Multiplayer coordination** — out of scope for the engine
- **"Is this a real word" validation** — inject yours via config

## Building Games With PegKit

PegKit is the engine. Here's what you layer on top for different game types:

**Wordle-style word game:** Provide a `SymbolPool` of `a-z`, set `sequenceLength: 5`, inject a dictionary validator, and build your tile-grid UI on top of the Feedback objects.

**Mastermind-style code breaker:** Provide a `SymbolPool` of color names, set `allowDuplicates: true`, and use `feedback.summary` (just the counts, no per-position reveal) for the classic black-peg/white-peg display.

**Number puzzle:** Provide a `SymbolPool` of `0-9`, set your length, and you've got Bulls & Cows.

**Something new:** Emoji sequences, musical notes, hex color codes — if it's a string, PegKit can compare it.

## Contributing

Contributions are welcome. Please open an issue to discuss significant changes before submitting a PR.

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/pegkit.git
cd pegkit
npm install

# Run tests
npm test

# Build
npm run build
```

## License

[MIT](LICENSE)
