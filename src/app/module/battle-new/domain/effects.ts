import { Dir, Entity, EntityId, GameState } from './types';
import { GameEvent } from '../../../shared/model/event.model';
import { commitMove, probeMove } from './movement';

export type Effect =
    | { kind: 'move'; target: EntityId; dir: Dir; cause?: EntityId }
    | { kind: 'damage'; target: EntityId; amount: number; cause?: EntityId }
    | { kind: 'destroy'; target: EntityId; cause?: EntityId }
    | { kind: 'spawn';   entity: Entity };

const MAX_STEPS = 10_000;

export function runCascade(s0: GameState, seed: Effect[]): { state: GameState; log: GameEvent[] } {
    let state = s0;
    const log: GameEvent[] = [];
    const queue: Effect[] = [...seed];
    let guard = 0;

    while (queue.length) {
        if (++guard > MAX_STEPS) {
            throw new Error('cascade overflow — check your rules for a loop');
        }

        const eff = queue.shift()!; // FIFO = breadth-first, feels simultaneous
        const target = eff.kind === 'spawn' ? undefined : state.entities.get((eff as any).target);
        if (target?.dead) {
            continue;
        } // always re-read by id; never hold stale refs

        const r = applyEffect(state, eff);
        state = r.state;
        log.push(...r.events);
        queue.push(...r.followUps);

        // resolve any illegal overlaps created by this step
        queue.push(...detectOverlaps(state));
    }

    return { state: sweepDead(state), log };
}

function applyEffect(s: GameState, eff: Effect): { state: GameState; events: GameEvent[]; followUps: Effect[] } {
    switch (eff.kind) {
        case 'move': {
            const r = probeMove(s, eff.target, eff.dir);
            if (!r.ok) {
                const e = s.entities.get(eff.target)!;
                // a projectile that can't advance dies; a rock just stops
                const followUps: Effect[] = e.tags.has('ephemeral') ? [{ kind: 'destroy', target: e.id }] : [];
                return { state: s, events: [{ type: 'blocked', id: eff.target, reason: r.reason }], followUps };
            }
            const c = commitMove(s, r.chain, eff.dir);
            return { state: c.state, events: c.events, followUps: r.effects };
        }
        case 'damage': {
            const e = s.entities.get(eff.target)!;
            const hp = (e.hp ?? 0) - eff.amount;
            const state = { ...s, entities: new Map(s.entities).set(e.id, { ...e, hp }) };
            return {
                state,
                events: [{ type: 'damaged', id: e.id, amount: eff.amount, hp }],
                followUps: hp <= 0 ? [{ kind: 'destroy', target: e.id, cause: eff.cause }] : [],
            };
        }
        case 'destroy': {
            const e = s.entities.get(eff.target)!;
            const state = { ...s, entities: new Map(s.entities).set(e.id, { ...e, dead: true }) };
            return { state, events: [{ type: 'destroyed', id: e.id }], followUps: onDeath(e) };
        }
    }
}