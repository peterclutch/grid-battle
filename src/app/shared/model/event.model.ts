import { Dir, EntityId, Vec } from '../../module/battle/domain/types';

export type GameEvent =
    | { readonly type: 'moved'; readonly id: EntityId; readonly from: Vec; readonly to: Vec; readonly dir: Dir }
    | { readonly type: 'attacked'; readonly pos: Vec; readonly by?: EntityId }
    | { readonly type: 'blocked'; readonly id: EntityId; readonly reason: 'edge' | 'blocked' | 'cycle' }
    | { readonly type: 'damaged'; readonly id: EntityId; readonly amount: number; readonly hp: number }
    | { readonly type: 'destroyed'; readonly id: EntityId }
    | { readonly type: 'spawned'; readonly id: EntityId };
