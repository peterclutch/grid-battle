import { Action } from '../../shared/model/action.model';
import { Character } from '../../shared/model/character.model';
import { GridEntity } from '../../shared/model/grid-entry.model';
import { getSurroundingPositions, positionKey } from '../../shared/model/position.model';
import { TileEffect } from '../../shared/model/tile.model';
import { findEntityAt, isInsideBoard } from './battle.rules';

export function computeTileEffects(
    character: Character,
    action: Action | null,
    entities: readonly GridEntity[],
): ReadonlyMap<string, TileEffect> {
    const effects = new Map<string, TileEffect>();
    if (!action) {
        return effects;
    }
    for (const position of getSurroundingPositions(character.position)) {
        if (!isInsideBoard(position)) {
            continue;
        }
        const occupant = findEntityAt(entities, position);
        if (action.type === 'movement' && occupant?.moveInto !== 'immovable') {
            effects.set(positionKey(position), 'movable');
        }
        if (action.type === 'attack') {
            effects.set(positionKey(position), 'attackable');
        }
    }
    return effects;
}
