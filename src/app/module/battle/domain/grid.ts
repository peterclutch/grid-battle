import { DELTA, Entity, findActiveCharacter, GameState, Vec } from './types';
import { Action, findActiveAction } from './action';

export const key = (p: Vec) => `${p.x},${p.y}`;
export const add = (a: Vec, d: Vec): Vec => ({ x: a.x + d.x, y: a.y + d.y });
export const inBounds = (state: GameState, position: Vec): boolean =>
    position.x >= 0 &&
    position.y >= 0 &&
    position.x < state.width &&
    position.y < state.height;

export function spatialIndex(s: GameState): ReadonlyMap<string, Entity[]> {
    const idx = new Map<string, Entity[]>();
    for (const e of s.entities.values()) {
        (idx.get(key(e.pos)) ?? idx.set(key(e.pos), []).get(key(e.pos))!).push(e);
    }
    return idx;
}

export type TileEffect =
    | 'movable' // move to tile
    | 'passable' // move through tile
    | 'attackable' // attack tile
    | 'spawnable' // spawn entity on tile
    | 'projectile-path'; // projectile moves to tile at the end of turn

export function tileEffectIndex(s: GameState): ReadonlyMap<string, TileEffect> {
    const idx = new Map<string, TileEffect>();
    const character = findActiveCharacter(s);
    const action = findActiveAction(s);
    if (!action) {
        return idx;
    }
    for (const delta of Object.values(DELTA)) {
        const position = add(character.pos, delta);

        if (!inBounds(s, position)) {
            continue;
        }
        const effect = getTileEffect(action); // todo improve central logic to determine which moves are legal
        if (effect) {
            idx.set(key(position), effect);
        }
    }
    return idx;
}

function getTileEffect(action: Action): TileEffect | null {
    switch (action.kind) {
        case 'move':
            return 'movable';
        case 'attack':
            return 'attackable'
        case 'spawn':
            return 'spawnable';
    }
    return null; // todo
}