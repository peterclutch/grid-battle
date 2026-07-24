import { Position } from './position.model';
import { Action } from './action.model';

export type Character = Player | Enemy;

export interface CharacterBase {
    id: string;
    position: Position;
    health: number; // todo more enforcement
    slot1: Action | null;
    slot2: Action | null;
    slot3: Action | null;
    slot4: Action | null;
}

export interface Player extends CharacterBase {
    readonly kind: 'player';
}

export interface Enemy extends CharacterBase {
    readonly kind: 'enemy';
}