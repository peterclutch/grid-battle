import { Direction } from './input.model';

export type Intent =
    | { readonly type: 'move'; readonly entityId: string; readonly direction: Direction }
    | { readonly type: 'attack'; readonly entityId: string }
    | { readonly type: 'step'; readonly entityId: string }
    | { readonly type: 'spawn'; readonly entityId: string; readonly direction: Direction };
