import { Dir, Entity, Vec } from './types';

/**
 * What an action wants to do. This is the entire vocabulary available to an Action and
 * it never reaches `runCascade` — `resolve()` compiles it into Effects first.
 *
 * Because intends are erased before anything mechanical sees them, they can afford to
 * be declarative and action-specific. `harmOnStop` on a charge does not have to agree
 * with `classify` about anything, since by the time the cascade runs it has already
 * become a concrete `damage` effect aimed at a known entity.
 *
 * Intends are addressed by square and direction, never by entity id: an action swings
 * at a place, and cannot know what is standing there. The actor is implicit — the
 * resolver knows who is acting.
 *
 * One constraint, load-bearing: intends are all resolved against the turn-start board,
 * so the intends of a single action must be independent of each other. Punch's four
 * swings are fine (simultaneous, same board). A move followed by an attack on wherever
 * you ended up is not — anything continuous must be a single intend that the resolver
 * expands, which is why `move` carries distance and stop behaviour rather than being
 * chained.
 */
export type Intend =
    | {
        kind: 'attack';
        /** the square being swung at; may be empty or off the board — that still costs the turn */
        square: Vec;
        /** shove whatever was standing there, once it has taken the hit */
        knockback?: Dir;
    }
    | {
        kind: 'move';
        dir: Dir;
        /** 'max' slides until something stops you */
        distance: number | 'max';
        /** hurt whatever brought the movement to a halt */
        harmOnStop?: boolean;
        /** shove whatever brought the movement to a halt */
        knockbackOnStop?: boolean;
    }
    | { kind: 'spawn'; entity: Entity };
