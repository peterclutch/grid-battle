import { computed, Injectable, signal } from '@angular/core';
import { Character, Entity, EntityId, entityId, findActiveCharacter, GameState, Tag } from './domain/types';
import { tileEffectIndex } from './domain/preview';
import { FireballAction, MoveAction, PunchAction, ShoveAction, StrikeAction } from './domain/action';
import { runTurn } from './domain/turn';
import { Command } from '../../shared/model/command';

const blueId = entityId('blue-player');
const redId = entityId('red-player');

@Injectable({ providedIn: 'root' })
export class BattleStore {

    private readonly _state = signal<GameState>(this.initialState());
    readonly state = this._state.asReadonly();
    
    readonly entities = computed(() => [...this._state().entities.values()]);
    readonly tileEffectIndex = computed(() => tileEffectIndex(this._state()));

    readonly activeCharacter = computed(() => findActiveCharacter(this._state()));

    // Players
    readonly bluePlayer = computed<Character>(() => {
        return this.entities().find(
            (entity): entity is Character =>
                entity.kind === 'character' &&
                entity.id === blueId
        )! // todo better option than '!'
    });

    readonly redPlayer = computed<Character>(() =>
        this.entities().find(
            (entity): entity is Character =>
                entity.kind === 'character' &&
                entity.id === redId
        )! // todo better option than '!'
    );

    dispatch(cmd: Command): void {
        const result = runTurn(this._state(), cmd);
        if (!result.ok) {
            return;
        }
        this._state.set(result.state);
        // todo handle log
    }

    private initialState(): GameState {
        const entities = new Map<EntityId, Entity>([
            [
                blueId,
                {
                    id: blueId,
                    kind: 'character',
                    pos: { x: 2, y: 4 },
                    tags: new Set<Tag>(['blocking', 'mortal']),
                    hp: 3,
                    team: 'blue',
                    slots: [MoveAction, ShoveAction, MoveAction, FireballAction],
                },
            ],
            [
                redId,
                {
                    id: redId,
                    kind: 'character',
                    pos: { x: 2, y: 1 },
                    tags: new Set<Tag>(['blocking', 'mortal', 'damaging']),
                    hp: 3,
                    team: 'red',
                    slots: [MoveAction, StrikeAction, MoveAction, FireballAction],
                },
            ],
        ]);
        return {
            width: 5,
            height: 6,
            entities,
            turn: 0,
            activeTeam: 'blue',
            rngSeed: 0,
        };
    }

}