import { GameInput } from '../../../shared/model/input.model';

export interface Action {
    readonly name: string;
    readonly type: 'movement' | 'attack' | 'defense' | 'spawn';
    readonly inputKind: GameInput['kind'];
}

export const MoveAction: Action = {
    name: 'Move',
    type: 'movement',
    inputKind: 'direction',
}

export const FireballAction: Action = {
    name: 'Fireball',
    type: 'spawn',
    inputKind: 'direction',
}

export const PunchAction: Action = {
    name: 'Punch',
    type: 'attack',
    inputKind: 'tap',
}