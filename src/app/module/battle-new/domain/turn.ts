import { Dir, GameState } from './types';
import { Effect, runCascade } from './effects';

export type Command = {
    readonly kind: 'direction';
    readonly direction: Dir;
} | {
    readonly kind: 'tap';
} | {
    readonly kind: 'wait';
};

export function runTurn(currentState: GameState, cmd: Command): { state: GameState; log: GameEvent[] } {
    const log: GameEvent[] = [];
    let state = currentState;

    const step = (effects: Effect[], label: string) => {
        if (!effects.length) {
            return;
        }
        log.push({ type: 'phase', label });
        const r = runCascade(state, effects);
        state = r.state; log.push(...r.log);
    };

    step(commandToEffects(state, cmd), 'action');
    // step(orderedBy(actorsWithTag(state, 'ephemeral'))  // projectiles, stable id order
    //     .map(p => ({ kind: 'move', target: p.id, dir: p.facing! } as Effect)), 'projectiles');
    // step(petsOf(state).map(p => petIntent(state, p)),'pets');
    // step(upkeepEffects(state), 'upkeep');

    return { state: { ...state, turn: state.turn + 1, activeTeam: 1 - state.activeTeam }, log };
}

function commandToEffects(state: GameState, cmd: Command): Effect[] {
    // todo find action based on which character's turn it is and create an effect
    return [];
}