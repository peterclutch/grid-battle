import { DELTA, entityId, EntityId, findActiveCharacter, GameState, Projectile } from './types';
import { add, inBounds, key } from './grid';
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
    const drifting = driftProjectiles(currentState);
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

/**
 * Projectiles all drift at once, but effects are applied one at a time — so the order
 * has to be worked out here rather than left to whichever id came first in the map.
 *
 * Two rules, and everything else falls out of them. Projectiles aimed at the same square
 * never reach it. Otherwise a projectile whose destination is still held by another that
 * is also leaving simply waits its turn, which is what keeps a line of them flying in
 * formation. Anything still waiting when nothing more can move is in a cycle — two
 * swapping squares, or a ring — and those are spent where they are.
 */
function driftProjectiles(state: GameState): Effect[] {
    const all = [...state.entities.values()].filter((e): e is Projectile => e.kind === 'projectile');
    const dest = (p: Projectile) => key(add(p.pos, DELTA[p.dir]));

    const effects: Effect[] = [];
    const spend = (p: Projectile) => effects.push({ kind: 'destroy', target: p.id });

    // one aimed off the board is spent rather than moved, so its square counts as vacated
    const flying = all.filter(p => inBounds(state, add(p.pos, DELTA[p.dir])));
    all.filter(p => !flying.includes(p)).forEach(spend);

    const converging = new Map<string, number>();
    for (const p of flying) {
        converging.set(dest(p), (converging.get(dest(p)) ?? 0) + 1);
    }

    let pending = flying.filter(p => converging.get(dest(p)) === 1);
    flying.filter(p => converging.get(dest(p))! > 1).forEach(spend);

    // squares still to be vacated. Destroys are queued ahead of the moves, so anything
    // spent above is already off the board by the time the survivors travel.
    const held = new Set(pending.map(p => key(p.pos)));
    for (;;) {
        const clear = pending.filter(p => !held.has(dest(p)));
        if (!clear.length) {
            break;
        }
        for (const p of clear) {
            effects.push({ kind: 'move', target: p.id, dir: p.dir });
            held.delete(key(p.pos));
        }
        pending = pending.filter(p => !clear.includes(p));
    }
    pending.forEach(spend);

    return effects;
}
