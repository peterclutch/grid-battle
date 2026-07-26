import { Entity } from './types';

export type Interaction =
    | { type: 'block' } // move is illegal, nothing happens
    | { type: 'push' } // occupant is displaced, chain continues
    | { type: 'pass' } // mover walks over it
    | { type: 'consume' } // occupant dies, mover continues
    | { type: 'impact'; harms: boolean; stopMover: boolean }; // harms: whether the occupant takes a hit

interface Rule {
    readonly id: string;
    readonly when: (mover: Entity, other: Entity) => boolean;
    readonly then: (mover: Entity, other: Entity) => Interaction;
}

export const RULES: readonly Rule[] = [
    { id: 'projectile-hits-mortal',
        when: (m, o) => m.kind === 'projectile' && o.tags.has('mortal'),
        then: () => ({ type: 'impact', harms: true, stopMover: true }) },

    { id: 'anything-crushes-projectile',
        when: (_, o) => o.tags.has('ephemeral'),
        then: () => ({ type: 'consume' }) },

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

export const classify = (m: Entity, o: Entity): Interaction =>
    (RULES.find(r => r.when(m, o)) ?? { then: () => ({ type: 'pass' } as const) }).then(m, o);