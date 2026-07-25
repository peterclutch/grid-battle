import { Position } from './position.model';

// player's character can [...]
export type TileEffect = 
    | 'movable' // move to tile
    | 'passable' // move through tile
    | 'attackable' // attack tile
    | 'spawnable' // spawn entity on tile
    | 'projectile-path' // projectile moves to tile at the end of turn

export interface Tile extends Position {
    effect: null | TileEffect;
}