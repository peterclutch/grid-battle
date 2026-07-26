import { DELTA, Dir, EntityId, GameState } from './types';
import { add, inBounds, key, spatialIndex } from './grid';
import { classify } from './interactions';
import { Effect } from './effect';
import { GameEvent } from '../../../shared/model/event.model';

export type MoveResult =
    /**
     * `by` is whatever the mover is left pressed against — the thing a charge would hit.
     * `crushed` is the far end of the chain, the one with the obstacle in its face.
     */
    | { ok: false; reason: 'edge' | 'blocked' | 'cycle'; by?: EntityId; crushed?: EntityId }
    | { ok: true; chain: EntityId[]; effects: Effect[] };

/** Once a chain has formed the mover is touching the first thing it picked up, not the
 *  obstacle at the far end — a charge hits the crate, and the crate hits the wall. */
const contact = (chain: readonly EntityId[], direct?: EntityId): EntityId | undefined =>
    chain.length > 1 ? chain[1] : direct;

/** The mover itself never counts: walking into a wall is not being pressed into one. */
const jammed = (chain: readonly EntityId[]): EntityId | undefined =>
    chain.length > 1 ? chain[chain.length - 1] : undefined;

export function probeMove(s: GameState, moverId: EntityId, dir: Dir): MoveResult {
    const d = DELTA[dir];
    const idx = spatialIndex(s);
    const mover = s.entities.get(moverId)!;

    const chain: EntityId[] = [moverId];
    const seen = new Set<EntityId>([moverId]);   // guards ring-shaped push cycles
    const effects: Effect[] = [];
    let cursor = add(mover.pos, d);

    for (;;) {
        if (!inBounds(s, cursor)) return { ok: false, reason: 'edge', by: contact(chain), crushed: jammed(chain) };

        const occupants = idx.get(key(cursor)) ?? [];
        let mustContinue = false;

        for (const other of occupants) {
            const it = classify(mover, other);
            switch (it.type) {
                case 'pass':
                    break;
                case 'block':
                    return { ok: false, reason: 'blocked', by: contact(chain, other.id), crushed: jammed(chain) };
                case 'consume':
                    effects.push({ kind: 'destroy', target: other.id, cause: moverId });
                    break;
                case 'annihilate':
                    effects.push({ kind: 'destroy', target: other.id, cause: moverId });
                    effects.push({ kind: 'destroy', target: moverId, cause: other.id });
                    return { ok: true, chain: [], effects };          // neither one arrives
                case 'impact':
                    if (it.harms) effects.push({ kind: 'damage', target: other.id, cause: moverId });
                    if (it.stopMover) effects.push({ kind: 'destroy', target: moverId, cause: other.id });
                    return { ok: true, chain: [], effects };          // mover never occupies the cell
                case 'push':
                    if (seen.has(other.id)) return { ok: false, reason: 'cycle' };
                    seen.add(other.id);
                    chain.push(other.id);
                    mustContinue = true;
                    break;
            }
        }

        if (!mustContinue) return { ok: true, chain, effects };
        cursor = add(cursor, d);
    }
}

export function commitMove(s: GameState, chain: EntityId[], dir: Dir): { state: GameState; events: GameEvent[] } {
    const d = DELTA[dir];
    const next = new Map(s.entities);
    const events: GameEvent[] = [];
    for (const id of [...chain].reverse()) {      // far end first — never overwrite an occupied cell
        const e = next.get(id)!;
        const to = add(e.pos, d);
        next.set(id, { ...e, pos: to });
        events.push({ type: 'moved', id, from: e.pos, to, dir });
    }
    return { state: { ...s, entities: next }, events };
}