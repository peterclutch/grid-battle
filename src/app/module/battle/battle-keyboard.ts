import { GameInput } from '../../shared/model/input.model';

export const KEYBOARD_INPUTS: Readonly<Record<string, GameInput>> = {
    ArrowUp:    { kind: 'direction', direction: 'up' },
    ArrowDown:  { kind: 'direction', direction: 'down' },
    ArrowLeft:  { kind: 'direction', direction: 'left' },
    ArrowRight: { kind: 'direction', direction: 'right' },

    KeyW: { kind: 'direction', direction: 'up' },
    KeyS: { kind: 'direction', direction: 'down' },
    KeyA: { kind: 'direction', direction: 'left' },
    KeyD: { kind: 'direction', direction: 'right' },

    Space: { kind: 'tap' },
    Enter: { kind: 'tap' },
};