import { Dir } from '../../module/battle/domain/types';

export type Command =
    | { readonly kind: 'direction'; readonly direction: Dir }
    | { readonly kind: 'skip' };