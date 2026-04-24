# PegKit

A zero-dependency TypeScript library for guess-and-feedback logic games.

PegKit handles the core mechanics shared by many "guess token and position" games — comparing a guess against a hidden sequence and producing structured feedback. You bring the content (letters, colors, numbers, emoji, whatever) and the UI. PegKit handles the logic.

## Why PegKit?

The guess-a-sequence, get-feedback loop is a decades-old game mechanic that nobody should have to reimplement from scratch. PegKit provides a correct, tested, extensible engine so you can focus on building your game, not debugging edge cases in duplicate-symbol matching.

## Install

```bash
npm install pegkit
```

## Quick Start

```typescript
import { GameConfig, SecretSequence, GameSession } from 'pegkit';

const config = new GameConfig({
  sequenceLength: 4,
  maxGuesses: 6,
  symbolPool: ['A', 'B', 'C', 'D', 'E', 'F'],
  allowDuplicates: true,
});

const secret = new SecretSequence(['A', 'B', 'C', 'D'], config);
const session = new GameSession(config, secret);

const result = session.submitGuess(['A', 'C', 'B', 'F']);

if (typeof result !== 'string') {
  console.log(result.feedback.positions);
  // [
  //   { position: 0, symbol: 'A', result: 'exact' },    — right symbol, right spot
  //   { position: 1, symbol: 'C', result: 'present' },  — right symbol, wrong spot
  //   { position: 2, symbol: 'B', result: 'present' },  — right symbol, wrong spot
  //   { position: 3, symbol: 'F', result: 'absent' },   — not in the secret
  // ]

  console.log(result.feedback.exactCount);   // 1
  console.log(result.feedback.presentCount); // 2
  console.log(result.feedback.absentCount);  // 1
}

console.log(session.status); // 'in-progress'
```

## Core Concepts

**Symbols are opaque tokens.** PegKit doesn't know or care whether your symbols are letters, hex colors, or emoji. Anything representable as a string works. The same engine can power a word-guessing game, a color-code-breaking game, or something entirely new.

**No content ships with the library.** PegKit has no word lists, no dictionaries, no color palettes. You provide the symbol pool (the set of valid symbols) and the secret sequence. If your game needs to validate that a guess is "a real word," inject a validator function through the config — PegKit will call it, but the dictionary is yours.

**Everything is serializable.** Every class supports `toJSON()`, so you can persist and restore game state however you like — `localStorage`, a database, a URL parameter. PegKit never touches storage.

## Duplicate Handling

The comparison algorithm correctly handles duplicate symbols, which is the edge case most implementations get wrong.

```typescript
// Secret: [A, B, A]
// Guess:  [A, A, C]
//
// Position 0: A vs A → exact
// Position 1: A vs B → A is present (matches the secret's position-2 A)
// Position 2: C vs A → absent
//
// Result: 1 exact, 1 present, 1 absent
// The second A in the secret is consumed by the present match
// and won't be double-counted.
```

## API Reference

### `GameConfig`

Defines the rules for a game instance.

```typescript
const config = new GameConfig({
  sequenceLength: 4,
  maxGuesses: 6,
  symbolPool: ['A', 'B', 'C', 'D', 'E', 'F'],
  allowDuplicates: true,               // optional, default true
  validator: (symbols) => isRealWord(symbols.join('')), // optional
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sequenceLength` | `number` | required | How many symbols in the secret |
| `maxGuesses` | `number` | required | Maximum attempts allowed |
| `symbolPool` | `string[]` | required | The set of valid symbols (no duplicates) |
| `allowDuplicates` | `boolean` | `true` | Whether the secret/guesses can repeat symbols |
| `validator` | `(symbols: readonly string[]) => boolean` | `undefined` | Optional custom validation (e.g. "is this a real word?") |

### `SecretSequence`

Holds the answer and exposes comparison logic. Validates that the secret matches the config on construction.

```typescript
const secret = new SecretSequence(['A', 'B', 'C', 'D'], config);
secret.length;       // 4
secret.toJSON();     // ['A', 'B', 'C', 'D']

const feedback = secret.compare(['A', 'C', 'B', 'F']);
```

### `GameSession`

Orchestrates a single play-through.

```typescript
const session = new GameSession(config, secret);

session.submitGuess(symbols); // Returns Guess on success, or InvalidGuessReason string on failure
session.status;               // 'in-progress' | 'won' | 'lost'
session.guesses;              // readonly Guess[]
session.guessCount;           // number
session.remainingGuesses;     // number
```

`submitGuess` returns one of these strings if the guess is rejected:

| Reason | When |
|--------|------|
| `'wrong-length'` | Guess length doesn't match `sequenceLength` |
| `'symbol-not-in-pool'` | Guess contains a symbol not in `symbolPool` |
| `'duplicate-not-allowed'` | Guess repeats a symbol when `allowDuplicates` is `false` |
| `'validation-failed'` | Custom `validator` returned `false` |
| `'game-over'` | Game has already ended |

### `Feedback`

The result of comparing a guess to the secret. This is the primary contract your UI consumes.

```typescript
feedback.positions;      // readonly PositionFeedback[]
// Each entry: { position: number, symbol: string, result: 'exact' | 'present' | 'absent' }

feedback.exactCount;     // number of exact matches
feedback.presentCount;   // number of present (right symbol, wrong position) matches
feedback.absentCount;    // number of absent symbols
feedback.isAllExact();   // true if the guess is correct
feedback.toJSON();       // returns positions array
```

### `Guess`

An immutable submitted attempt.

```typescript
guess.symbols;      // readonly string[] — the submitted sequence
guess.feedback;     // Feedback object
guess.submittedAt;  // number — Date.now() timestamp
guess.toJSON();     // { symbols, feedback, submittedAt }
```

### Events

`GameSession` emits typed events you can subscribe to. `on()` returns an unsubscribe function.

```typescript
const unsub = session.on('guess-submitted', ({ guess, guessNumber }) => {
  // fired after every valid guess
});

session.on('game-won', ({ guesses, guessCount }) => {
  // fired when the correct sequence is guessed
});

session.on('game-lost', ({ guesses, secret }) => {
  // fired when max guesses are exhausted
});

session.on('invalid-guess', ({ symbols, reason }) => {
  // fired on every rejected submitGuess call
});

unsub(); // remove a listener
```

### `Statistics`

Post-game analytics that consume sessions without influencing them. `StatisticsSummary` is a plain serializable object — wire persistence to wherever you like.

```typescript
import { Statistics } from 'pegkit';

// Compute from an array of completed sessions:
const summary = Statistics.compute(sessions);
// {
//   totalGames: 10,
//   wins: 7,
//   losses: 3,
//   winRate: 0.7,
//   currentStreak: 3,
//   maxStreak: 5,
//   guessDistribution: { 3: 2, 4: 3, 5: 1, 6: 1 },
//   averageGuessesOnWin: 4.14
// }

// Or incrementally update a stored summary with one new session:
const next = Statistics.update(summary, completedSession);

// StatisticsSummary is fully JSON-serializable — persist however you want:
// localStorage.setItem('stats', JSON.stringify(next));
// const saved = JSON.parse(localStorage.getItem('stats') ?? 'null');
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

**Wordle-style word game:** Provide a `symbolPool` of `a-z`, set `sequenceLength: 5`, inject a dictionary validator, and build your tile-grid UI on top of the `Feedback` objects.

**Mastermind-style code breaker:** Provide a `symbolPool` of color names, set `allowDuplicates: true`, and use `exactCount` / `presentCount` (just the counts, no per-position reveal) for the classic black-peg/white-peg display.

**Number puzzle:** Provide a `symbolPool` of `['0','1','2','3','4','5','6','7','8','9']`, set your length, and you've got Bulls & Cows.

**Something new:** Emoji sequences, musical notes, hex color codes — if it's a string, PegKit can compare it.

## Contributing

Contributions are welcome. Please open an issue to discuss significant changes before submitting a PR.

## License

[MIT](LICENSE)
