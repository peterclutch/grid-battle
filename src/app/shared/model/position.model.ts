import { Direction } from './input.model';

export interface Position {
    x: number;
    y: number;
}

const DIRECTION_DELTAS: Record<Direction, Position> = {
    up:    { x: 0,  y: -1 },
    down:  { x: 0,  y: 1 },
    left:  { x: -1, y: 0 },
    right: { x: 1,  y: 0 },
};

export function getPosition(
    position: Position,
    direction: Direction,
): Position {
    const delta = DIRECTION_DELTAS[direction];
    return {
        x: position.x + delta.x,
        y: position.y + delta.y,
    };
}

export function positionKey(position: Position): string {
    return `${position.x}:${position.y}`;
}

export function getSurroundingPositions(position: Position) {
    return [
        getPosition(position, 'up'),
        getPosition(position, 'down'),
        getPosition(position, 'left'),
        getPosition(position, 'right')
    ];
}