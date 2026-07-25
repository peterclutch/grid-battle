import { Position } from './position.model';
import { Character } from './character.model';
import { Direction } from './input.model';

export type GridEntity =
    | Character
    | Projectile
    | Object;

export type NonCharacterEntity = Exclude<GridEntity, Character>;

export interface GridEntityBase {
    readonly id: string;
    position: Position;
    moveInto: 'absorb' | 'movable' | 'immovable';
}

export interface Projectile extends GridEntityBase {
    readonly kind: 'projectile';
    readonly moveInto: 'absorb';
    direction: Direction;
}

export interface Object extends GridEntityBase {
    readonly kind: 'object';
    readonly moveInto: 'movable';
}

export function isCharacter(entity: GridEntity): entity is Character {
    return entity.kind === 'character';
}