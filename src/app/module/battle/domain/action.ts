import { Command } from '../../../shared/model/command';
import { Character, findActiveCharacter, GameState } from './types';

export interface Action {
    readonly name: string;
    readonly kind: 'move' | 'attack' | 'defense' | 'spawn';
    readonly inputKind: Command['kind'];
}

// single source of truth for "which slot is a team about to use". Blue always goes
// first, so blue lands on even turn numbers and red on odd ones — that parity is
// enough to recover how many actions each side has completed so far, without
// storing a separate counter per character.
export function activeSlotIndex(team: 'blue' | 'red', turn: number): number {
    const actionsCompleted = team === 'blue' ? Math.ceil(turn / 2) : Math.floor(turn / 2);
    return actionsCompleted % 4;
}

export function getSlot(character: Character, index: number): Action | null {
    return character.slots[index] ?? null;
}

export function findActiveAction(state: GameState): Action | null {
    const character = findActiveCharacter(state);
    return getSlot(character, activeSlotIndex(character.team, state.turn));
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