import { findActiveCharacter, GameState } from './types';
import { Effect, runCascade } from './effects';
import { GameEvent } from '../../../shared/model/event.model';
import { Command } from '../../../shared/model/command';
import { findActiveAction } from './action';

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

    return {
        state: { ...state, turn: state.activeTeam === 'blue' ? state.turn : state.turn + 1, activeTeam: state.activeTeam === 'blue' ? 'red' : 'blue' },
        log,
    };
}

function commandToEffects(state: GameState, cmd: Command): Effect[] {
    const character = findActiveCharacter(state);
    if (!character) {
        return [];
    }
    const action = findActiveAction(state);
    if (!action) {
        return [];
    }
    switch (action.kind) {
        case 'move':
            return [{ kind: 'move', target: character.id, dir: cmd.kind === 'direction' ? cmd.direction : 'N' }]; // todo better action logic
        case 'attack':
            return []
        case 'defense':
            return []
        case 'spawn':
            return []
    }
}