import { Command } from './turn';

export const KEYBOARD_INPUTS: Readonly<Record<string, Command>> = {
    ArrowUp:    { kind: 'direction', direction: 'N' },
    ArrowDown:  { kind: 'direction', direction: 'S' },
    ArrowLeft:  { kind: 'direction', direction: 'W' },
    ArrowRight: { kind: 'direction', direction: 'E' },

    KeyW: { kind: 'direction', direction: 'N' },
    KeyS: { kind: 'direction', direction: 'S' },
    KeyA: { kind: 'direction', direction: 'W' },
    KeyD: { kind: 'direction', direction: 'E' },

    Space: { kind: 'tap' },
    Enter: { kind: 'tap' },
};