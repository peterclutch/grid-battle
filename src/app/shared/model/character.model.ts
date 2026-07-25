import { Action } from './action.model';
import { GridEntityBase } from './grid-entry.model';

export type Character = Player | Enemy;

export interface CharacterBase extends GridEntityBase {
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