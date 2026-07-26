import { Character, DELTA, Dir, Entity, GameState, TileEffect, Vec } from './types';
import { Intend } from './intend';
import { Effect } from './effect';
import { GameEvent } from '../../../shared/model/event.model';
import { commitMove, probeMove } from './movement';
import { classify } from './interactions';
import { inBounds, occupantsAt } from './grid';

/** A square this action would touch, and what it would mean there. */
export interface Footprint {
    readonly pos: Vec;
    readonly effect: TileEffect;
}

export type Resolution =
    | { ok: true; effects: Effect[]; log: GameEvent[]; footprint: Footprint[] }
    | { ok: false; reason: 'illegal' };

/** A slide can never outrun the board. */
const slideLimit = (s: GameState) => s.width + s.height;

const stepFrom = (from: Vec, dir: Dir): Vec => ({ x: from.x + DELTA[dir].x, y: from.y + DELTA[dir].y });

/**
 * What happens to something materialising on a square that is already occupied. This is
 * the same `classify` a mover meets, so a fireball conjured onto someone behaves exactly
 * like one that flew into them — it lands its blow and is spent.
 *
 * Refused when the square holds something the newcomer cannot affect, and when the
 * newcomer would be spent without landing anything: a fireball conjured against a wall
 * is a wasted turn, not a move the board should offer.
 */
function resolveArrival(s: GameState, entity: Entity): { ok: boolean; effects: Effect[] } {
    const landing: Effect[] = []; // what the arrival does to the square, before it lands on it
    let struck = false;
    let spent = false;

    for (const occupant of occupantsAt(s, entity.pos)) {
        const it = classify(entity, occupant);
        switch (it.type) {
            case 'pass':
                break;
            case 'block':
            case 'push':
                return { ok: false, effects: [] };
            case 'consume':
                landing.push({ kind: 'destroy', target: occupant.id, cause: entity.id });
                struck = true;
                break;
            case 'annihilate':
                landing.push({ kind: 'destroy', target: occupant.id, cause: entity.id });
                struck = true;
                spent = true;
                break;
            case 'impact':
                if (it.harms) {
                    landing.push({ kind: 'damage', target: occupant.id, cause: entity.id });
                    struck = true;
                }
                spent ||= it.stopMover;
                break;
        }
    }

    // the square is cleared first, so the newcomer never overlaps what it just displaced
    const effects: Effect[] = [...landing, { kind: 'spawn', entity }];
    if (spent) {
        effects.push({ kind: 'destroy', target: entity.id });
    }
    return { ok: struck || !spent, effects };
}

/**
 * Compiles what an action wants into what the board will do.
 *
 * This is the only place legality is decided, and it can decide it cleanly because it
 * runs against a static turn-start board — nothing has moved yet, so it is free to
 * probe, dry-run and look things up. Everything downstream is unconditional.
 *
 * A refusal here voids the whole turn; no effect is applied.
 *
 * It also reports a footprint: the squares this action would touch. That is what drives
 * the tile highlights, so the preview cannot disagree with the behaviour — both are read
 * off the same pass.
 */
export function resolve(state: GameState, actor: Character, intends: readonly Intend[]): Resolution {
    const effects: Effect[] = [];
    const log: GameEvent[] = [];
    const footprint: Footprint[] = [];

    for (const intend of intends) {
        switch (intend.kind) {
            case 'attack': {
                // An attack never refuses. Swinging at empty air, or off the edge, still
                // costs you the turn — occupantsAt simply comes back empty.
                log.push({ type: 'attacked', pos: intend.square, by: actor.id });
                if (inBounds(state, intend.square)) {
                    footprint.push({ pos: intend.square, effect: 'attackable' });
                }
                for (const victim of occupantsAt(state, intend.square)) {
                    effects.push({ kind: 'damage', target: victim.id, cause: actor.id });
                    if (intend.knockback) {
                        effects.push({ kind: 'move', target: victim.id, dir: intend.knockback, cause: actor.id });
                    }
                }
                break;
            }

            case 'move': {
                const slide = resolveSlide(state, actor, intend.dir, intend.distance, intend.knockbackOnStop === true);
                // travelling less far than asked is a completed charge, not a failure;
                // going nowhere and hitting nothing is not a turn at all
                if (!slide.path.length && !slide.effects.length) {
                    return { ok: false, reason: 'illegal' };
                }
                effects.push(...slide.effects);
                // the squares crossed are 'passable'; only where you come to rest is 'movable'
                slide.path.forEach((pos, i) => footprint.push({
                    pos,
                    effect: i === slide.path.length - 1 ? 'movable' : 'passable',
                }));
                if (slide.struck && inBounds(state, slide.struck)) {
                    footprint.push({ pos: slide.struck, effect: 'attackable' });
                }
                break;
            }

            case 'spawn': {
                const { pos } = intend.entity;
                if (!inBounds(state, pos)) {
                    return { ok: false, reason: 'illegal' }; // nothing materialises off the board
                }
                const arrival = resolveArrival(state, intend.entity);
                if (!arrival.ok) {
                    return { ok: false, reason: 'illegal' };
                }
                effects.push(...arrival.effects);
                footprint.push({ pos, effect: 'spawnable' });
                break;
            }
        }
    }

    return { ok: true, effects, log, footprint };
}

interface Slide {
    /** every square the mover passes through, in order; empty means it could not budge */
    readonly path: Vec[];
    readonly effects: Effect[];
    /** the square of whatever the slide ran into, when the stop was a blow */
    readonly struck?: Vec;
}

/**
 * Walks the slide on a scratch copy of the board so it can report exactly how far the
 * mover gets and what stops it. Pushed chains shift as it goes, which is why this has to
 * simulate rather than multiply out a distance — step three depends on where step two
 * left the crate.
 */
function resolveSlide(
    state: GameState,
    actor: Character,
    dir: Dir,
    distance: number | 'max',
    knockback: boolean,
): Slide {
    const limit = distance === 'max' ? slideLimit(state) : distance;
    const effects: Effect[] = [];
    const path: Vec[] = [];
    let sim = state;
    let pos = actor.pos;

    for (let i = 0; i < limit; i++) {
        const probe = probeMove(sim, actor.id, dir);
        if (probe.ok) {
            effects.push({ kind: 'move', target: actor.id, dir });
            effects.push(...probe.effects); // collisions passed through on the way
            sim = commitMove(sim, probe.chain, dir).state;
            pos = stepFrom(pos, dir);
            path.push(pos);
            continue;
        }

        // An ordinary slide just ends. The edge stops everyone the same way.
        if (!knockback || !probe.by) {
            return { path, effects };
        }

        // A shove ends by hitting what stopped it, one square only. The blow lands either
        // way; the actor follows into the square only once the victim has cleared it, and
        // a victim with nowhere to go is crushed by the cascade against whatever it hit.
        const victim = sim.entities.get(probe.by)!;
        effects.push({ kind: 'damage', target: victim.id, cause: actor.id });
        effects.push({ kind: 'move', target: victim.id, dir, cause: actor.id });
        if (probeMove(sim, victim.id, dir).ok) {
            effects.push({ kind: 'move', target: actor.id, dir });
            path.push(victim.pos);
        }
        return { path, effects, struck: victim.pos };
    }

    return { path, effects };
}
