import { Position } from './position.model';

export interface Tile extends Position {
    terrain: 'ground';
}