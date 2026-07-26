import { Entity } from './types';

export type Interaction =
    | { type: 'block' } // move is illegal, nothing happens
    | { type: 'push' } // occupant is displaced, chain continues
    | { type: 'pass' } // mover walks over it
    | { type: 'consume' } // occupant dies, mover continues
    | { type: 'annihilate' } // both are spent, and the mover never arrives
    | { type: 'impact'; harms: boolean; stopMover: boolean }; // harms: whether the occupant takes a hit

interface Rule {
    readonly id: string;
    readonly when: (mover: Entity, other: Entity) => boolean;
    readonly then: (mover: Entity, other: Entity) => Interaction;
}

export const RULES: readonly Rule[] = [
    /** What a blow means is decided when it lands, so this only asks whether one is worth
     *  landing — anything that has hit points, or that breaks. */
    { id: 'projectile-hits-what-can-be-hurt',
        when: (m, o) => m.kind === 'projectile' && (o.tags.has('mortal') || o.tags.has('fragile')),
        then: () => ({ type: 'impact', harms: true, stopMover: true }) },

    /**
     * Two projectiles meeting are both spent, whether they land on the same square or
     * cross paths swapping squares. Consuming one and letting the other through would
     * make the outcome depend on which drifted first.
     */
    { id: 'projectiles-annihilate',
        when: (m, o) => m.tags.has('ephemeral') && o.tags.has('ephemeral'),
        then: () => ({ type: 'annihilate' }) },

    /**
     * A projectile only hurts whoever it flies into. Stepping onto the square one
     * currently occupies is safe and leaves it intact — it is on its way out of that
     * square anyway, so walking in is a dodge, not a collision.
     */
    { id: 'walk-through-projectile',
        when: (_, o) => o.tags.has('ephemeral'),
        then: () => ({ type: 'pass' }) },

    { id: 'projectile-shatters-on-solid',
        when: (m, o) => m.kind === 'projectile' && o.tags.has('blocking'),
        then: () => ({ type: 'impact', harms: false, stopMover: true }) },

    { id: 'pushable',
        when: (_, o) => o.tags.has('pushable'),
        then: () => ({ type: 'push' }) },

    { id: 'default-solid',
        when: (_, o) => o.tags.has('blocking'),
        then: () => ({ type: 'block' }) },
];

export const classify = (m: Entity, o: Entity): Interaction => {
    const it = (RULES.find(r => r.when(m, o)) ?? { then: () => ({ type: 'pass' } as const) }).then(m, o);
    // whatever a rule decided, an immovable thing is not going anywhere
    return it.type === 'push' && o.tags.has('immovable') ? { type: 'block' } : it;
};

/**
 * Whether two entities may sit on the same square. Sharing is the exception — a
 * projectile mid-flight resting over someone for a turn — and one willing side is
 * enough: the projectile would hit the character on arrival, but the character
 * standing on it is not a collision anyone has to resolve.
 */
export const canShare = (a: Entity, b: Entity): boolean =>
    classify(a, b).type === 'pass' || classify(b, a).type === 'pass';