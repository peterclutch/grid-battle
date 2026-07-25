import { Command } from '../../../shared/model/command';
import { Character, findActiveCharacter, GameState } from './types';

export interface Action {
    readonly name: string;
    readonly kind: 'move' | 'attack' | 'defense' | 'spawn';
    readonly inputKind: Command['kind'];
}

export function findActiveAction(state: GameState): Action | null {
    const character = findActiveCharacter(state);
    return findAction(character, state.turn);
}

function findAction(character: Character, turn: number): Action | null {
    switch (turn % 4) {
        case 0:
            return character.slot1;
        case 1:
            return character.slot2;
        case 2:
            return character.slot3;
        default:
            return character.slot4;
    }
}

export const MoveAction: Action = {
    name: 'Move',
    kind: 'move',
    inputKind: 'direction',
}

export const FireballAction: Action = {
    name: 'Fireball',
    kind: 'spawn',
    inputKind: 'direction',
}

export const PunchAction: Action = {
    name: 'Punch',
    kind: 'attack',
    inputKind: 'tap',
}