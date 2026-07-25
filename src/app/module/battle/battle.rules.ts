import { Character } from '../../shared/model/character.model';
import { Position } from '../../shared/model/position.model';

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

export function findCharacterAt(
    characters: readonly Character[],
    position: Position,
    excludedId?: string, // todo not sure exlude is needed
): Character | null {
    return characters.find(character =>
        character.id !== excludedId &&
        character.position.x === position.x &&
        character.position.y === position.y
    ) ?? null;
}