import { computed, Injectable, signal } from '@angular/core';
import { Character, Entity, EntityId, entityId, findActiveCharacter, GameState, Tag } from './domain/types';
import { spatialIndex, tileEffectIndex } from './domain/grid';
import { FireballAction, MoveAction, PunchAction } from './domain/action';
import { runTurn } from './domain/turn';
import { Command } from '../../shared/model/command';

const blueId = entityId('blue-player');
const redId = entityId('red-player');

@Injectable({ providedIn: 'root' })
export class BattleStore {

    // private readonly animator = inject(Animator);

    private readonly _state = signal<GameState>(this.initialState());
    readonly state = this._state.asReadonly();
    
    readonly entities = computed(() => [...this._state().entities.values()]);
    readonly entityIndex = computed(() => spatialIndex(this._state()));
    readonly tileEffectIndex = computed(() => tileEffectIndex(this._state()));

    readonly activeCharacter = computed(() => findActiveCharacter(this._state()));
    // readonly busy = this.animator.playing;
    // readonly canAct      = computed(() => !this.busy());

    // readonly legalDirs = computed<Dir[]>(() => {
    //     const s = this._state(), a = this.activeActor();
    //     return (['N','S','E','W'] as Dir[]).filter(d => probeMove(s, a.id, d).ok);
    // });

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
        const { state, log } = runTurn(this._state(), cmd);
        this._state.set(state);
        // this.animator.play(log); // visuals catch up
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
                    slot1: MoveAction,
                    slot2: PunchAction,
                    slot3: MoveAction,
                    slot4: FireballAction,
                },
            ],
            [
                redId,
                {
                    id: redId,
                    kind: 'character',
                    pos: { x: 1, y: 1 },
                    tags: new Set<Tag>(['blocking', 'mortal', 'damaging']),
                    hp: 3,
                    team: 'red',
                    slot1: MoveAction,
                    slot2: PunchAction,
                    slot3: MoveAction,
                    slot4: FireballAction,
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