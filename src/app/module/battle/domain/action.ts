import { Command } from '../../../shared/model/command';
import { Intend } from './intend';
import {
    Character,
    DELTA,
    Dir,
    EntityId,
    GameState,
    Tag,
    Vec,
    findActiveCharacter,
} from './types';

/** The Command variant that carries the payload for a given input kind. */
export type CommandOf<K extends Command['kind']> = Extract<Command, { kind: K }>;

/**
 * Everything an action is allowed to look at. Pure by construction: no Math.random,
 * no Date, no module-level counters — same context in, same intends out.
 */
export interface ActionContext {
    readonly state: GameState;
    readonly actor: Character;
    /** Deterministic id source. Same state and same call order produce the same ids. */
    readonly nextId: (prefix: string) => EntityId;
}

/** Purely cosmetic grouping for the UI. Nothing dispatches on this. */
export type ActionCategory = 'move' | 'attack' | 'defense' | 'spawn';

/**
 * One action, parameterised by the input it consumes. `intends` only ever sees the
 * Command variant it declared, so the old `cmd.kind === 'direction' ? ... : 'N'`
 * fallback is unrepresentable.
 *
 * `intends` is a pure translation: command in, wishes out. It never asks whether the
 * wish can be granted — `resolve` decides that, and `runTurn` turns a refusal into a
 * rejected turn. An empty array means the action had nothing to ask for.
 *
 * There is no `preview` here on purpose. Tile highlights are derived in preview.ts by
 * resolving each command this action could receive, so an action that lunges three
 * squares highlights three squares without being told to, and a highlight can never
 * describe something the action would not actually do.
 */
export interface ActionOf<K extends Command['kind']> {
    readonly name: string;
    readonly category: ActionCategory;
    readonly inputKind: K;

    intends(ctx: ActionContext, cmd: CommandOf<K>): readonly Intend[];
}

/**
 * Derived from Command rather than hand-written, so adding a command kind makes the
 * dispatch in `actionIntends` fail exhaustiveness instead of silently doing nothing.
 */
export type Action = { [K in Command['kind']]: ActionOf<K> }[Command['kind']];

// Declare concrete actions as ActionOf<'their kind'>, not as Action — annotating with the
// union collapses the intends() parameter to never at any direct call site.

// --- dispatch ---------------------------------------------------------------

/**
 * The only place an Action meets a raw Command. Narrows both sides together, so no
 * cast is needed and a mismatched pairing returns null rather than guessing.
 */
export function actionIntends(action: Action, ctx: ActionContext, cmd: Command): readonly Intend[] {
    switch (action.inputKind) {
        case 'direction':
            return cmd.kind === 'direction' ? action.intends(ctx, cmd) : [];
        case 'skip':
            return [];
    }
}

// --- slot scheduling --------------------------------------------------------

export function activeSlotIndex(team: 'blue' | 'red', turn: number): number {
    const actionsCompleted = team === 'blue' ? Math.ceil(turn / 2) : Math.floor(turn / 2);
    return actionsCompleted % 4;
}

export function getSlot(character: Character, index: number): Action | null {
    return character.slots[index] ?? null;
}

export function findActiveAction(state: GameState): Action | null {
    const character = findActiveCharacter(state);
    return getSlot(character, activeSlotIndex(character.team, state.turn));
}

// --- helpers ----------------------------------------------------------------

const step = (from: Vec, dir: Dir): Vec => ({ x: from.x + DELTA[dir].x, y: from.y + DELTA[dir].y });

const NEIGHBOURS: readonly Dir[] = ['N', 'E', 'S', 'W'];

// --- factories --------------------------------------------------------------
//
// Configurability lives here rather than in the Intend type. Shape comes from the array
// an action returns — a line is n attack intends, a burst is four, a cone is five — and
// anything continuous is a single intend the resolver expands.

export interface DashOptions {
    /** hit and shove whatever stops the slide, then take its square if it clears */
    readonly knockbackOnStop?: boolean;
    readonly category?: ActionCategory;
}

/** Travel in the chosen direction. `distance: 'max'` slides until something stops you. */
export const dash = (name: string, distance: number | 'max', opts: DashOptions = {}): ActionOf<'direction'> => ({
    name,
    category: opts.category ?? 'move',
    inputKind: 'direction',

    intends(_ctx, cmd) {
        return [{
            kind: 'move',
            dir: cmd.direction,
            distance,
            knockbackOnStop: opts.knockbackOnStop,
        }];
    },
});

/** Reach out and hit a line of squares in the chosen direction. */
export const strike = (name: string, reach: number, knockback = false): ActionOf<'direction'> => ({
    name,
    category: 'attack',
    inputKind: 'direction',

    intends({ actor }, cmd) {
        return Array.from({ length: reach }, (_, i): Intend => {
            let square = actor.pos;
            for (let n = 0; n <= i; n++) {
                square = step(square, cmd.direction);
            }
            return { kind: 'attack', square, knockback: knockback ? cmd.direction : undefined };
        });
    },
});

/** Launch a projectile into the square ahead. */
export const projectile = (name: string, prefix: string, tags: ReadonlySet<Tag>): ActionOf<'direction'> => ({
    name,
    category: 'spawn',
    inputKind: 'direction',

    intends({ actor, nextId }, cmd) {
        return [{
            kind: 'spawn',
            entity: {
                kind: 'projectile',
                id: nextId(prefix),
                pos: step(actor.pos, cmd.direction),
                dir: cmd.direction,
                tags,
            },
        }];
    },
});

// --- actions ----------------------------------------------------------------

const FIREBALL_TAGS: ReadonlySet<Tag> = new Set<Tag>(['ephemeral', 'damaging']);

export const MoveAction = dash('Move', 1);
export const StrikeAction = strike('Strike', 2);
export const FireballAction = projectile('Fireball', 'fireball', FIREBALL_TAGS);

/** Slide until something stops you, then hit it and shove it out of the way. */
export const ChargeAction = dash('Charge', 'max', { knockbackOnStop: true, category: 'attack' });
