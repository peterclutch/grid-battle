import { Action } from './action.model';

export type EntityId = string & { readonly __brand: unique symbol };
export function entityId(value: string): EntityId {
    return value as EntityId;
}

export interface Vec { readonly x: number; readonly y: number }
export type Dir = 'N' | 'S' | 'E' | 'W';
export const DELTA: Record<Dir, Vec> = {
    N: { x: 0, y: -1 },
    S: { x: 0, y: 1 },
    E: { x: 1, y: 0 },
    W: { x: -1, y: 0 },
};

export type Tag =
    | 'blocking'    // cannot be entered
    | 'pushable'    // displaced by a mover
    | 'fragile'     // destroyed on impact
    | 'damaging';   // deals damage on contact
    // | 'mortal'      // has hp, can die
    // | 'ephemeral';  // despawns on any collision (projectiles)

export type Entity =
    | Character
    | Projectile
    | Object;

export interface EntityBase {
    readonly id: EntityId;
    readonly pos: Vec;
    readonly tags: ReadonlySet<Tag>;
}

export interface Projectile extends EntityBase {
    readonly kind: 'projectile';
    readonly direction: Dir;
}

export interface Object extends EntityBase {
    readonly kind: 'object';
}

export interface Character extends EntityBase {
    readonly kind: 'character';
    readonly team: 'blue' | 'red';
    readonly hp: number;
    readonly slot1: Action | null;
    readonly slot2: Action | null;
    readonly slot3: Action | null;
    readonly slot4: Action | null;
}

export interface GameState {
    readonly width: number;
    readonly height: number;
    readonly entities: ReadonlyMap<EntityId, Entity>;
    readonly turn: number;
    readonly activeTeam: 'blue' | 'red';
    readonly rngSeed: number;
}