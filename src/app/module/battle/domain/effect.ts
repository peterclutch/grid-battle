import { Entity, EntityId, GameState } from './types';
import { Dir } from './types';
import { GameEvent } from '../../../shared/model/event.model';
import { commitMove, probeMove } from './movement';
import { canShare, classify } from './interactions';
import { inBounds, occupantsAt, spatialIndex } from './grid';

/**
 * What actually happens to the board. Mechanical, minimal, and addressed by entity id —
 * effects are queued while the board is still moving, and an id degrades safely (the
 * target died, skip it) where a position degrades silently (someone else got shoved
 * onto that square).
 *
 * There is deliberately no `attack` here. Attacking is a question about a square, which
 * is a resolution concern; by the time the cascade runs it has become damage aimed at
 * something specific.
 */
export type Effect =
    | { kind: 'move'; target: EntityId; dir: Dir; cause?: EntityId }
    | { kind: 'damage'; target: EntityId; cause?: EntityId }
    | { kind: 'destroy'; target: EntityId; cause?: EntityId }
    | { kind: 'spawn'; entity: Entity };

/** Every blow is worth exactly one hit point. Durability lives on the entity, not the blow. */
export const DAMAGE = 1;

const MAX_STEPS = 100;

/**
 * Applies effects and everything they set off. Note what is missing: no legality, no
 * verdict, no notion of a turn. `resolve()` already decided what the player is allowed
 * to do; this only carries it out.
 */
export function runCascade(s0: GameState, effects: readonly Effect[]): { state: GameState; log: GameEvent[] } {
    let state = s0;
    const log: GameEvent[] = [];
    const queue: Effect[] = [...effects];
    let guard = 0;

    while (queue.length) {
        if (++guard > MAX_STEPS) {
            throw new Error('cascade overflow — check rules for a loop');
        }

        const effect = queue.shift()!; // FIFO = breadth-first, feels simultaneous
        // always re-read by id; never hold stale refs. Gone or dying, the effect lapses —
        // an earlier phase may already have swept the target off the board.
        if (effect.kind !== 'spawn') {
            const target = state.entities.get(effect.target);
            if (!target || target.dead) {
                continue;
            }
        }

        const r = applyEffect(state, effect);
        state = r.state;
        log.push(...r.events);
        queue.push(...r.followUps);

        // resolve any illegal overlaps created by this step
        queue.push(...detectOverlaps(state));
    }

    return { state: sweepDead(state), log };
}

interface Applied {
    readonly state: GameState;
    readonly events: GameEvent[];
    readonly followUps: Effect[];
}

function applyEffect(s: GameState, effect: Effect): Applied {
    switch (effect.kind) {
        case 'move': {
            const r = probeMove(s, effect.target, effect.dir);
            if (!r.ok) {
                const e = s.entities.get(effect.target)!;
                const followUps: Effect[] = [];
                if (e.tags.has('ephemeral')) {
                    followUps.push({ kind: 'destroy', target: e.id }); // a projectile that can't advance dies
                } else if (effect.cause) {
                    // shoved into something that will not give way. Walking into a wall
                    // under your own power is free; being pressed into one is not.
                    followUps.push({ kind: 'damage', target: e.id, cause: effect.cause });
                }
                if (r.crushed) {
                    followUps.push({ kind: 'damage', target: r.crushed, cause: effect.target });
                }
                return { state: s, events: [{ type: 'blocked', id: effect.target, reason: r.reason }], followUps };
            }
            const c = commitMove(s, r.chain, effect.dir);
            return { state: c.state, events: c.events, followUps: r.effects };
        }
        case 'damage': {
            const e = s.entities.get(effect.target);
            if (!e) {
                return { state: s, events: [], followUps: [] };
            }
            // what a hit means is a property of the thing being hit, not of the blow
            if (e.tags.has('fragile')) {
                return { state: s, events: [], followUps: [{ kind: 'destroy', target: e.id, cause: effect.cause }] };
            }
            if (!e.tags.has('mortal')) {
                return { state: s, events: [], followUps: [] }; // the blow lands, nothing gives
            }
            const hp = (e.hp ?? 0) - DAMAGE;
            const state = { ...s, entities: new Map(s.entities).set(e.id, { ...e, hp }) };
            return {
                state,
                events: [{ type: 'damaged', id: e.id, amount: DAMAGE, hp }],
                followUps: hp <= 0 ? [{ kind: 'destroy', target: e.id, cause: effect.cause }] : [],
            };
        }
        case 'destroy': {
            const e = s.entities.get(effect.target);
            if (!e) {
                return { state: s, events: [], followUps: [] };
            }
            const state = { ...s, entities: new Map(s.entities).set(e.id, { ...e, dead: true }) };
            return { state, events: [{ type: 'destroyed', id: e.id }], followUps: onDeath(e) };
        }
        case 'spawn': {
            const e = effect.entity;
            // resolve() vets seed spawns and works out what they land on; this only guards
            // the ones a cascade creates, and only against the square being unusable
            const solid = (o: Entity) => ['block', 'push'].includes(classify(e, o).type);
            if (!inBounds(s, e.pos) || occupantsAt(s, e.pos).some(solid)) {
                return { state: s, events: [{ type: 'blocked', id: e.id, reason: inBounds(s, e.pos) ? 'blocked' : 'edge' }], followUps: [] };
            }
            const state = { ...s, entities: new Map(s.entities).set(e.id, e) };
            return { state, events: [{ type: 'spawned', id: e.id }], followUps: [] };
        }
    }
}

// hook for future death-triggered effects (drops, explosions, etc.) — none yet
function onDeath(_e: Entity): Effect[] {
    return [];
}

// a cascade step can leave two things sharing a cell that have no business doing so;
// resolve those before the next step so invariants hold between phases. Legitimate
// sharing — a projectile resting over someone until it drifts on — is left alone.
function detectOverlaps(s: GameState): Effect[] {
    const effects: Effect[] = [];
    for (const occupants of spatialIndex(s).values()) {
        if (occupants.length < 2) continue;
        for (let i = 0; i < occupants.length; i++) {
            for (let j = i + 1; j < occupants.length; j++) {
                const a = occupants[i], b = occupants[j];
                if (a.dead || b.dead) continue;
                if (canShare(a, b)) continue;
                effects.push({ kind: 'destroy', target: b.id, cause: a.id });
            }
        }
    }
    return effects;
}

function sweepDead(s: GameState): GameState {
    const entities = new Map(s.entities);
    for (const [id, e] of entities) {
        if (e.dead) entities.delete(id);
    }
    return { ...s, entities };
}
