import { Character, DELTA, Dir, EntityId, GameState, TileEffect, Vec } from './types';
import { Intend } from './intend';
import { Effect } from './effect';
import { GameEvent } from '../../../shared/model/event.model';
import { commitMove, probeMove } from './movement';
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

const spawnable = (s: GameState, pos: Vec): boolean =>
    inBounds(s, pos) && !occupantsAt(s, pos).some(o => o.tags.has('blocking'));

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
                const slide = resolveSlide(state, actor, intend.dir, intend.distance);
                if (!slide.path.length) {
                    return { ok: false, reason: 'illegal' }; // could not budge at all
                }
                effects.push(...slide.effects);
                // the squares crossed are 'passable'; only where you come to rest is 'movable'
                slide.path.forEach((pos, i) => footprint.push({
                    pos,
                    effect: i === slide.path.length - 1 ? 'movable' : 'passable',
                }));
                // travelling less far than asked is a completed charge, not a failure —
                // only the stop itself carries consequences
                if (slide.stoppedBy) {
                    if (intend.harmOnStop) {
                        effects.push({ kind: 'damage', target: slide.stoppedBy, cause: actor.id });
                    }
                    if (intend.knockbackOnStop) {
                        effects.push({ kind: 'move', target: slide.stoppedBy, dir: intend.dir, cause: actor.id });
                    }
                }
                break;
            }

            case 'spawn': {
                const { pos } = intend.entity;
                if (!spawnable(state, pos)) {
                    return { ok: false, reason: 'illegal' }; // nothing materialises off the board or inside something solid
                }
                effects.push({ kind: 'spawn', entity: intend.entity });
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
    /** what brought the movement to a halt, if anything did */
    readonly stoppedBy?: EntityId;
}

/**
 * Walks the slide on a scratch copy of the board so it can report exactly how far the
 * mover gets and what stops it. Pushed chains shift as it goes, which is why this has to
 * simulate rather than multiply out a distance — step three depends on where step two
 * left the crate.
 */
function resolveSlide(state: GameState, actor: Character, dir: Dir, distance: number | 'max'): Slide {
    const limit = distance === 'max' ? slideLimit(state) : distance;
    const effects: Effect[] = [];
    const path: Vec[] = [];
    let sim = state;
    let pos = actor.pos;

    for (let i = 0; i < limit; i++) {
        const probe = probeMove(sim, actor.id, dir);
        if (!probe.ok) {
            return { path, effects, stoppedBy: probe.by };
        }
        effects.push({ kind: 'move', target: actor.id, dir });
        effects.push(...probe.effects); // collisions passed through on the way
        sim = commitMove(sim, probe.chain, dir).state;
        pos = stepFrom(pos, dir);
        path.push(pos);
    }

    return { path, effects };
}
