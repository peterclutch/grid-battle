import { Entity, GameState, Vec } from './types';

export type { TileEffect } from './types';

export const key = (p: Vec) => `${p.x},${p.y}`;
export const add = (a: Vec, d: Vec): Vec => ({ x: a.x + d.x, y: a.y + d.y });
export const inBounds = (state: GameState, position: Vec): boolean =>
    position.x >= 0 &&
    position.y >= 0 &&
    position.x < state.width &&
    position.y < state.height;

export const occupantsAt = (s: GameState, p: Vec): Entity[] =>
    [...s.entities.values()].filter(e => !e.dead && e.pos.x === p.x && e.pos.y === p.y);

export function spatialIndex(s: GameState): ReadonlyMap<string, Entity[]> {
    const idx = new Map<string, Entity[]>();
    for (const e of s.entities.values()) {
        if (e.dead) continue; // corpses are swept at the end of the cascade, but they block nothing before then
        (idx.get(key(e.pos)) ?? idx.set(key(e.pos), []).get(key(e.pos))!).push(e);
    }
    return idx;
}

// tile highlights live in preview.ts — they are derived from what an action resolves to,
// not from anything spatial