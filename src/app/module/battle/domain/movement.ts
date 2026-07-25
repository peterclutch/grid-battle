import { DELTA, Dir, EntityId, GameState } from './types';
import { add, inBounds, key, spatialIndex } from './grid';
import { classify } from './interactions';
import { Intend } from './intend';
import { GameEvent } from '../../../shared/model/event.model';

export type MoveResult =
    | { ok: false; reason: 'edge' | 'blocked' | 'cycle'; by?: EntityId }
    | { ok: true; chain: EntityId[]; intends: Intend[] };

export function probeMove(s: GameState, moverId: EntityId, dir: Dir): MoveResult {
    const d = DELTA[dir];
    const idx = spatialIndex(s);
    const mover = s.entities.get(moverId)!;

    const chain: EntityId[] = [moverId];
    const seen = new Set<EntityId>([moverId]);   // guards ring-shaped push cycles
    const intends: Intend[] = [];
    let cursor = add(mover.pos, d);

    for (;;) {
        if (!inBounds(s, cursor)) return { ok: false, reason: 'edge' };

        const occupants = idx.get(key(cursor)) ?? [];
        let mustContinue = false;

        for (const other of occupants) {
            const it = classify(mover, other);
            switch (it.type) {
                case 'pass':
                    break;
                case 'block':
                    return { ok: false, reason: 'blocked', by: other.id };
                case 'consume':
                    intends.push({ kind: 'destroy', target: other.id, cause: moverId });
                    break;
                case 'impact':
                    if (it.damage) intends.push({ kind: 'damage', target: other.id, amount: it.damage, cause: moverId });
                    if (it.stopMover) intends.push({ kind: 'destroy', target: moverId, cause: other.id });
                    return { ok: true, chain: [], intends: intends };          // mover never occupies the cell
                case 'push':
                    if (seen.has(other.id)) return { ok: false, reason: 'cycle' };
                    seen.add(other.id);
                    chain.push(other.id);
                    mustContinue = true;
                    break;
            }
        }

        if (!mustContinue) return { ok: true, chain, intends: intends };
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