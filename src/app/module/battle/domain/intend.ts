import { Dir, Entity, EntityId, GameState } from './types';
import { GameEvent } from '../../../shared/model/event.model';
import { commitMove, probeMove } from './movement';
import { classify } from './interactions';
import { spatialIndex } from './grid';

export type Intend =
    | { kind: 'move'; target: EntityId; dir: Dir; cause?: EntityId }
    | { kind: 'damage'; target: EntityId; amount: number; cause?: EntityId }
    | { kind: 'destroy'; target: EntityId; cause?: EntityId }
    | { kind: 'spawn';   entity: Entity };

const MAX_STEPS = 10_000;

export function runCascade(s0: GameState, seed: Intend[]): { state: GameState; log: GameEvent[] } {
    let state = s0;
    const log: GameEvent[] = [];
    const queue: Intend[] = [...seed];
    let guard = 0;

    while (queue.length) {
        if (++guard > MAX_STEPS) {
            throw new Error('cascade overflow — check your rules for a loop');
        }

        const intend = queue.shift()!; // FIFO = breadth-first, feels simultaneous
        const target = intend.kind === 'spawn' ? undefined : state.entities.get(intend.target);
        if (target?.dead) {
            continue;
        } // always re-read by id; never hold stale refs

        const r = applyIntend(state, intend);
        state = r.state;
        log.push(...r.events);
        queue.push(...r.followUps);

        // resolve any illegal overlaps created by this step
        queue.push(...detectOverlaps(state));
    }

    return { state: sweepDead(state), log };
}

function applyIntend(s: GameState, intend: Intend): { state: GameState; events: GameEvent[]; followUps: Intend[] } {
    switch (intend.kind) {
        case 'move': {
            const r = probeMove(s, intend.target, intend.dir);
            if (!r.ok) {
                const e = s.entities.get(intend.target)!;
                // a projectile that can't advance dies; a rock just stops
                const followUps: Intend[] = e.tags.has('ephemeral') ? [{ kind: 'destroy', target: e.id }] : [];
                return { state: s, events: [{ type: 'blocked', id: intend.target, reason: r.reason }], followUps };
            }
            const c = commitMove(s, r.chain, intend.dir);
            return { state: c.state, events: c.events, followUps: r.intends };
        }
        case 'damage': {
            const e = s.entities.get(intend.target)!;
            const hp = (e.hp ?? 0) - intend.amount;
            const state = { ...s, entities: new Map(s.entities).set(e.id, { ...e, hp }) };
            return {
                state,
                events: [{ type: 'damaged', id: e.id, amount: intend.amount, hp }],
                followUps: hp <= 0 ? [{ kind: 'destroy', target: e.id, cause: intend.cause }] : [],
            };
        }
        case 'destroy': {
            const e = s.entities.get(intend.target)!;
            const state = { ...s, entities: new Map(s.entities).set(e.id, { ...e, dead: true }) };
            return { state, events: [{ type: 'destroyed', id: e.id }], followUps: onDeath(e) };
        }
        case 'spawn': {
            const state = { ...s, entities: new Map(s.entities).set(intend.entity.id, intend.entity) };
            return { state, events: [{ type: 'spawned', id: intend.entity.id }], followUps: [] };
        }
    }
}

// hook for future death-triggered intends (drops, explosions, etc.) — none yet
function onDeath(_e: Entity): Intend[] {
    return [];
}

// a cascade step can leave two illegal things sharing a cell (e.g. a spawn landing on
// an occupant); resolve those before the next step so invariants hold between phases
function detectOverlaps(s: GameState): Intend[] {
    const intends: Intend[] = [];
    for (const occupants of spatialIndex(s).values()) {
        if (occupants.length < 2) continue;
        for (let i = 0; i < occupants.length; i++) {
            for (let j = i + 1; j < occupants.length; j++) {
                const a = occupants[i], b = occupants[j];
                if (a.dead || b.dead) continue;
                if (classify(a, b).type === 'pass') continue;
                intends.push({ kind: 'destroy', target: b.id, cause: a.id });
            }
        }
    }
    return intends;
}

function sweepDead(s: GameState): GameState {
    const entities = new Map(s.entities);
    for (const [id, e] of entities) {
        if (e.dead) entities.delete(id);
    }
    return { ...s, entities };
}