import { Entity, GameState, Vec } from './types';

export const key = (p: Vec) => `${p.x},${p.y}`;
export const add = (a: Vec, d: Vec): Vec => ({ x: a.x + d.x, y: a.y + d.y });
export const inBounds = (s: GameState, p: Vec) =>
    p.x >= 0 && p.y >= 0 && p.x < s.width && p.y < s.height;

export function spatialIndex(s: GameState): ReadonlyMap<string, Entity[]> {
    const idx = new Map<string, Entity[]>();
    for (const e of s.entities.values()) {
        (idx.get(key(e.pos)) ?? idx.set(key(e.pos), []).get(key(e.pos))!).push(e);
    }
    return idx;
}