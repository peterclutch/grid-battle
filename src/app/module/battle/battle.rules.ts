import { Position } from '../../shared/model/position.model';
import { GridEntity } from '../../shared/model/grid-entry.model';
import { Character } from '../../shared/model/character.model';

export const BOARD_WIDTH = 5;
export const BOARD_HEIGHT = 6;

export function isInsideBoard(position: Position): boolean {
    return (
        position.x >= 0 &&
        position.x < BOARD_WIDTH &&
        position.y >= 0 &&
        position.y < BOARD_HEIGHT
    );
}

export function findEntityAt(
    entities: readonly GridEntity[],
    position: Position,
): GridEntity | null {
    return entities.find(character =>
        character.position.x === position.x &&
        character.position.y === position.y
    ) ?? null;
}

export function findCharacterAt(
    characters: readonly Character[],
    position: Position,
): Character | null {
    return characters.find(character =>
        character.position.x === position.x &&
        character.position.y === position.y
    ) ?? null;
}