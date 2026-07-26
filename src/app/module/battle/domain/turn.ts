import { entityId, EntityId, findActiveCharacter, GameState } from './types';
import { Effect, runCascade } from './effect';
import { resolve } from './resolve';
import { GameEvent } from '../../../shared/model/event.model';
import { Command } from '../../../shared/model/command';
import { ActionContext, actionIntends, findActiveAction } from './action';

export type TurnRejection =
    | 'no-actor'      // active team has no character on the board
    | 'no-action'     // the active slot is empty
    | 'wrong-input'   // the command does not match the armed action
    | 'illegal';      // the action asked for something the board will not allow

export type TurnResult =
    | { ok: true; state: GameState; log: GameEvent[] }
    | { ok: false; reason: TurnRejection };

export function runTurn(currentState: GameState, cmd: Command): TurnResult {
    const actor = findActiveCharacter(currentState);
    if (!actor) {
        return { ok: false, reason: 'no-actor' };
    }

    const action = findActiveAction(currentState);
    if (!action) {
        return { ok: false, reason: 'no-action' };
    }

    const ctx: ActionContext = { state: currentState, actor, nextId: idSource(currentState) };
    const intends = actionIntends(action, ctx, cmd);
    if (!intends.length) {
        return { ok: false, reason: 'wrong-input' };
    }

    // compile intent into concrete effects; this is where the turn can still be refused
    const resolved = resolve(currentState, actor, intends);
    if (!resolved.ok) {
        return { ok: false, reason: 'illegal' };
    }

    const log: GameEvent[] = [...resolved.log];
    const acted = runCascade(currentState, resolved.effects);
    log.push(...acted.log);
    let state = acted.state;

    // Projectiles are chosen from currentState, so ones spawned this turn stay put.
    // These are already effects — nobody intended them, they just happen.
    const drifting = moveProjectiles(currentState);
    if (drifting.length) {
        const drifted = runCascade(state, drifting);
        state = drifted.state;
        log.push(...drifted.log);
    }

    return {
        ok: true,
        state: { ...state, turn: state.turn + 1, activeTeam: state.activeTeam === 'blue' ? 'red' : 'blue' },
        log,
    };
}

/**
 * Deterministic ids, derived from the turn plus a per-turn sequence number.
 * Replays and lockstep clients producing the same intends produce the same ids.
 */
function idSource(state: GameState): (prefix: string) => EntityId {
    let seq = 0;
    return prefix => entityId(`${prefix}-t${state.turn}-${seq++}`);
}

function moveProjectiles(state: GameState): Effect[] {
    return [...state.entities.values()]
        .filter(e => e.kind === 'projectile')
        .map(e => ({ kind: 'move', target: e.id, dir: e.dir }));
}
