import { Position } from './position.model';
import { GridEntity } from './grid-entry.model';

export type GameEvent =
    | { readonly type: 'moved'; readonly entityId: string; readonly to: Position }
    | { readonly type: 'damaged'; readonly entityId: string; readonly amount: number }
    | { readonly type: 'spawned', readonly entity: GridEntity }
    | { readonly type: 'despawned'; readonly entityId: string };
