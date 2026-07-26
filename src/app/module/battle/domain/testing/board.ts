import { Command } from '../../../../shared/model/command';
import { Action } from '../action';
import { key } from '../grid';
import { tileEffectIndex } from '../preview';
import { runTurn, TurnResult } from '../turn';
import { Dir, Entity, EntityId, entityId, GameState, Slots, Tag, TileEffect, Vec } from '../types';

/**
 * A board written the way you would draw it.
 *
 *   scene(`
 *       . . . .
 *       b # o .
 *       . . . .
 *   `, { blue: ChargeAction })
 *
 * Tokens are single characters, and a cell holding more than one thing simply
 * concatenates them (`b>` is a character standing on an eastbound projectile — legal,
 * and the reason `render` reads a cell as a string rather than a char).
 *
 *   b r    blue / red character   blocking, mortal, 3 hp
 *   #      rock                   blocking, immovable, inert
 *   o      crate                  blocking, pushable, mortal, 3 hp
 *   x      glass                  blocking, fragile
 *   > < ^ v  projectile           ephemeral, damaging, flying E / W / N / S
 *
 * `render` turns a state back into the same notation, so a test can assert on the board
 * it expects to see rather than on a list of coordinates.
 */

const DIRS: Readonly<Record<string, Dir>> = { '>': 'E', '<': 'W', '^': 'N', 'v': 'S' };

const TAGS: Readonly<Record<string, Tag[]>> = {
    b: ['blocking', 'mortal'],
    r: ['blocking', 'mortal'],
    '#': ['blocking', 'immovable'],
    o: ['blocking', 'pushable', 'mortal'],
    x: ['blocking', 'fragile'],
};

const PROJECTILE_TAGS: Tag[] = ['ephemeral', 'damaging'];

export const BLUE = entityId('blue');
export const RED = entityId('red');

export interface SceneOptions {
    /** the acting character's slots; a single action fills all four, so the turn number
     *  never has to be reasoned about unless a test is specifically about scheduling */
    readonly blue?: Action | Slots;
    readonly red?: Action | Slots;
    readonly hp?: number;
    readonly turn?: number;
    readonly activeTeam?: 'blue' | 'red';
}

export function scene(ascii: string, opts: SceneOptions = {}): GameState {
    const rows = ascii.split('\n').map(r => r.trim()).filter(r => r.length > 0);
    const grid = rows.map(r => r.split(/\s+/));
    const width = Math.max(...grid.map(r => r.length));
    const height = grid.length;
    const hp = opts.hp ?? 3;

    const entities = new Map<EntityId, Entity>();
    const counters = new Map<string, number>();
    const nextId = (prefix: string): EntityId => {
        const n = counters.get(prefix) ?? 0;
        counters.set(prefix, n + 1);
        return entityId(`${prefix}-${n}`);
    };

    grid.forEach((row, y) => row.forEach((cell, x) => {
        for (const token of cell === '.' ? [] : [...cell]) {
            const pos: Vec = { x, y };
            if (token === 'b' || token === 'r') {
                const team = token === 'b' ? 'blue' : 'red';
                entities.set(token === 'b' ? BLUE : RED, {
                    kind: 'character',
                    id: token === 'b' ? BLUE : RED,
                    pos,
                    team,
                    hp,
                    tags: new Set<Tag>(TAGS[token]),
                    slots: fill(team === 'blue' ? opts.blue : opts.red),
                });
            } else if (DIRS[token]) {
                const id = nextId('fireball');
                entities.set(id, { kind: 'projectile', id, pos, dir: DIRS[token], tags: new Set(PROJECTILE_TAGS) });
            } else if (TAGS[token]) {
                const id = nextId(token === '#' ? 'rock' : token === 'o' ? 'crate' : 'glass');
                const tags = new Set<Tag>(TAGS[token]);
                entities.set(id, { kind: 'object', id, pos, tags, ...(tags.has('mortal') ? { hp } : {}) });
            } else {
                throw new Error(`unknown board token '${token}'`);
            }
        }
    }));

    return {
        width,
        height,
        entities,
        turn: opts.turn ?? 0,
        activeTeam: opts.activeTeam ?? 'blue',
        rngSeed: 0,
    };
}

const fill = (slots: Action | Slots | undefined): Slots =>
    slots === undefined ? [null, null, null, null]
        : 'inputKind' in slots ? [slots, slots, slots, slots]
            : slots;

/** The board in `scene` notation, so expectations read as pictures. */
export function render(state: GameState): string {
    const cells = new Map<string, string>();
    for (const e of state.entities.values()) {
        if (e.dead) continue;
        cells.set(key(e.pos), (cells.get(key(e.pos)) ?? '') + token(e));
    }
    return Array.from({ length: state.height }, (_, y) =>
        Array.from({ length: state.width }, (_, x) => cells.get(key({ x, y })) ?? '.').join(' '),
    ).join('\n');
}

function token(e: Entity): string {
    if (e.kind === 'character') return e.team === 'blue' ? 'b' : 'r';
    if (e.kind === 'projectile') return Object.keys(DIRS).find(k => DIRS[k] === e.dir)!;
    if (e.tags.has('fragile')) return 'x';
    return e.tags.has('pushable') ? 'o' : '#';
}

/**
 * The armed action's tile highlights, drawn over the same grid.
 *
 *   m  movable — where you would come to rest
 *   p  passable — crossed on the way
 *   a  attackable
 *   s  spawnable
 *   f  the square a loose projectile is flying into
 */
export function highlights(state: GameState): string {
    const idx = tileEffectIndex(state);
    const MARK: Readonly<Record<TileEffect, string>> = {
        movable: 'm',
        passable: 'p',
        attackable: 'a',
        spawnable: 's',
        'projectile-path': 'f',
    };
    return Array.from({ length: state.height }, (_, y) =>
        Array.from({ length: state.width }, (_, x) => {
            const effect = idx.get(key({ x, y }));
            return effect ? MARK[effect] : '.';
        }).join(' '),
    ).join('\n');
}

// --- commands ---------------------------------------------------------------

export const north: Command = { kind: 'direction', direction: 'N' };
export const south: Command = { kind: 'direction', direction: 'S' };
export const east: Command = { kind: 'direction', direction: 'E' };
export const west: Command = { kind: 'direction', direction: 'W' };
export const tap: Command = { kind: 'tap' };

/** Play the turns out, insisting each one is legal. */
export function play(state: GameState, ...cmds: Command[]): GameState {
    return cmds.reduce((s, cmd) => {
        const result = runTurn(s, cmd);
        if (!result.ok) {
            throw new Error(`turn rejected (${result.reason}) on:\n${render(s)}`);
        }
        return result.state;
    }, state);
}

/** For the turns that are supposed to be refused. */
export const attempt = (state: GameState, cmd: Command): TurnResult => runTurn(state, cmd);

// --- reading the result -----------------------------------------------------

export const hpOf = (state: GameState, id: EntityId): number | undefined => state.entities.get(id)?.hp;

/** Scenery is addressed by kind and reading order: `ids(state, 'crate')[0]` is the first
 *  crate written on the board. */
export const ids = (state: GameState, prefix: string): EntityId[] =>
    [...state.entities.keys()].filter(id => id.startsWith(prefix));

export const alive = (state: GameState, id: EntityId): boolean => state.entities.has(id);

export const count = (state: GameState, kind: Entity['kind']): number =>
    [...state.entities.values()].filter(e => e.kind === kind).length;

/** Squares an action would touch, keyed the way `tileEffectIndex` reports them. */
export const squares = (idx: ReadonlyMap<string, unknown>): string[] => [...idx.keys()].sort();
