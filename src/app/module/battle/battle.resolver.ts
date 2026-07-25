import { GameEvent } from '../../shared/model/event.model';
import { GridEntity, isCharacter, Projectile } from '../../shared/model/grid-entry.model';
import { Intent } from '../../shared/model/intent.model';
import { getPosition, getSurroundingPositions } from '../../shared/model/position.model';
import { findCharacterAt, findEntityAt, isInsideBoard } from './battle.rules';

export function resolveIntent(intent: Intent, entities: readonly GridEntity[]): GameEvent[] {
    switch (intent.type) {
        case 'move':
            return resolveMove(intent, entities);
        case 'attack':
            return resolveAttack(intent, entities);
        case 'step':
            return resolveStep(intent, entities);
        case 'spawn':
            return resolveSpawn(intent, entities);
    }
}

function resolveMove(
    intent: Extract<Intent, { type: 'move' }>,
    entities: readonly GridEntity[],
): GameEvent[] {
    const mover = entities.find(entity => entity.id === intent.entityId);
    if (!mover) {
        return [];
    }

    const to = getPosition(mover.position, intent.direction);
    if (!isInsideBoard(to)) {
        return [];
    }

    const occupant = findEntityAt(entities, to);
    if (occupant?.moveInto === 'immovable') {
        return [];
    }
    if (occupant?.moveInto === 'absorb') {
        // walking into a projectile hurts you and destroys it, instead of moving through it
        return [
            { type: 'damaged', entityId: mover.id, amount: 1 },
            { type: 'despawned', entityId: occupant.id },
        ];
    }

    return [{ type: 'moved', entityId: mover.id, to }];
}

function resolveAttack(
    intent: Extract<Intent, { type: 'attack' }>,
    entities: readonly GridEntity[],
): GameEvent[] {
    const attacker = entities.find(entity => entity.id === intent.entityId);
    if (!attacker) {
        return [];
    }

    const characters = entities.filter(isCharacter);
    return getSurroundingPositions(attacker.position)
        .map(position => findCharacterAt(characters, position))
        .filter((target): target is NonNullable<typeof target> => target !== null)
        .map(target => ({ type: 'damaged' as const, entityId: target.id, amount: 1 }));
}

function resolveStep(
    intent: Extract<Intent, { type: 'step' }>,
    entities: readonly GridEntity[],
): GameEvent[] {
    const projectile = entities.find(entity => entity.id === intent.entityId);
    if (!projectile || projectile.kind !== 'projectile') {
        return [];
    }

    const to = getPosition(projectile.position, projectile.direction);
    if (!isInsideBoard(to)) {
        return [{ type: 'despawned', entityId: projectile.id }];
    }

    const target = findCharacterAt(entities.filter(isCharacter), to);
    if (target) {
        return [
            { type: 'damaged', entityId: target.id, amount: 1 },
            { type: 'despawned', entityId: projectile.id },
        ];
    }

    return [{ type: 'moved', entityId: projectile.id, to }];
}

function resolveSpawn(
    intent: Extract<Intent, { type: 'spawn' }>,
    entities: readonly GridEntity[],
): GameEvent[] {
    const spawner = entities.find(entity => entity.id === intent.entityId);
    if (!spawner) {
        return [];
    }
    const entity: Projectile = {
        kind: 'projectile',
        id: 'test3',
        moveInto: 'absorb',
        direction: intent.direction,
        position: spawner.position, // todo moves automatically at the end of the turn but make sure we don't damage immediately, would be nicer to spawn it next to the caster and not move it at the end of the turn for the first turn
    };
    return [{ type: 'spawned', entity }];
}
