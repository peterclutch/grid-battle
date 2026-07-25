import { Position } from './position.model';

export interface Tile extends Position {
    effect: null | 'moveable' | 'passable' | 'attackable' | 'spawnable';
}