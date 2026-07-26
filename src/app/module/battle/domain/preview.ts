import { DELTA, Dir, entityId, findActiveCharacter, GameState, TileEffect, Vec } from './types';
import { Command } from '../../../shared/model/command';
import { ActionContext, actionIntends, findActiveAction } from './action';
import { resolve } from './resolve';
import { inBounds, key } from './grid';

const DIRECTIONS: readonly Dir[] = ['N', 'E', 'S', 'W'];

/** Every command the armed action could receive. Adding a Command kind fails this switch. */
function commandsFor(inputKind: Command['kind']): readonly Command[] {
    switch (inputKind) {
        case 'direction':
            return DIRECTIONS.map(direction => ({ kind: 'direction', direction }));
        case 'skip':
            return [{ kind: 'skip' }];
    }
}

/** When two commands would touch the same square, the more interesting meaning wins. */
const PRIORITY: Record<TileEffect, number> = {
    attackable: 4,
    spawnable: 3,
    movable: 2,
    'projectile-path': 1,
    passable: 0,
};

/**
 * Highlights for the armed action.
 *
 * Rather than asking the action what a given neighbour means, this plays out every
 * command it could receive and reads the squares off the resolver. So an action's
 * highlight is whatever it would actually do — a three-square lunge highlights three
 * squares, a charge highlights the whole slide, and nothing has to be kept in sync by
 * hand. Illegal commands simply contribute nothing.
 */
export function tileEffectIndex(s: GameState): ReadonlyMap<string, TileEffect> {
    const idx = new Map<string, TileEffect>();
    const actor = findActiveCharacter(s);
    const action = findActiveAction(s);
    if (!actor || !action) {
        return idx;
    }

    // previews are discarded, so the ids handed out here never reach the board
    const ctx: ActionContext = { state: s, actor, nextId: prefix => entityId(`${prefix}-preview`) };

    const paint = (pos: Vec, effect: TileEffect) => {
        if (!inBounds(s, pos)) {
            return;
        }
        const k = key(pos);
        const current = idx.get(k);
        if (!current || PRIORITY[effect] > PRIORITY[current]) {
            idx.set(k, effect);
        }
    };

    for (const cmd of commandsFor(action.inputKind)) {
        const intends = actionIntends(action, ctx, cmd);
        if (!intends.length) {
            continue;
        }
        const resolved = resolve(s, actor, intends);
        if (!resolved.ok) {
            continue; // the board would refuse this command; do not offer it
        }
        for (const { pos, effect } of resolved.footprint) {
            paint(pos, effect);
        }
    }

    // where loose projectiles are headed, independent of the armed action
    for (const e of s.entities.values()) {
        if (e.kind === 'projectile') {
            paint({ x: e.pos.x + DELTA[e.dir].x, y: e.pos.y + DELTA[e.dir].y }, 'projectile-path');
        }
    }

    return idx;
}
