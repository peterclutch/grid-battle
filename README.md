# Grid Battle

A turn-based tactics game on a grid. Two teams alternate turns; each character cycles
through four action slots, and every turn is one command (a direction or a tap) applied
to whichever action is currently armed.

Built with Angular 22 and signals.

## Getting started

```bash
npm install
npm start      # dev server at http://localhost:4200
npm run build  # production build into dist/
npm test       # unit tests (Vitest)
```

## Controls

- Arrow keys / `WASD` — directional command
- `Space` / `Enter` — tap command

## How a turn works

```
Command → Action.intends() → Intend[] → resolve() → Effect[] → runCascade() → GameState
```

- **Action** translates a command into wishes (`Intend`). Pure, and never asks whether the
  wish is legal.
- **resolve** decides legality and compiles intends into concrete `Effect`s. A refusal here
  rejects the whole turn.
- **runCascade** applies effects breadth-first, including knock-on collisions, pushes and
  deaths. No legality checks at this stage.
- Projectiles drift at the end of every turn, then the active team flips. A projectile
  only hurts what it flies into — stepping onto the square one currently sits on is a
  dodge, and leaves it intact.

State is immutable and entity ids are derived deterministically from the turn number, so
the same commands always replay to the same board.

## Layout

```
src/app/module/battle/
  domain/           game rules — pure TypeScript, no Angular
    types.ts        entities, tags, GameState
    action.ts       action definitions and factories (dash, strike, burst, projectile)
    intend.ts       what an action wishes for
    resolve.ts      intends → effects, plus legality
    effect.ts       the cascade
    movement.ts     move probing and commit
    interactions.ts tag-based collision rules
    preview.ts      tile highlights, derived from resolution
    turn.ts         runTurn
  battle.store.ts   signal store and initial board
  grid/             grid, tile and entity components
  character-display/
```

`domain/` has no Angular dependency — the rules can be tested and replayed on their own.

## Tests

`npm test`. The specs live next to the rules they cover, one file per rule area rather
than per source file: `movement`, `attack`, `spawn`, `drift`, `preview`.

Boards are written as pictures via `domain/testing/board.ts`, and asserted the same way:

```ts
it('hits what stopped it, shoves it one square, and takes its place', () => {
    const after = play(scene('b . r .', { blue: ChargeAction }), east);
    expect(render(after)).toBe('. . b r');
    expect(hpOf(after, RED)).toBe(2);
});
```

`b`/`r` are the two characters, `#` immovable scenery, `o` a pushable crate, `x` glass,
and `> < ^ v` a projectile in flight. `highlights()` renders the tile preview over the
same grid, so a test can assert that what the UI offers is what the rules would do.
