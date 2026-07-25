import { computed, Service, signal } from '@angular/core';
import { Dir, Entity, EntityId, entityId, GameState, Tag } from '../domain/types';
import { spatialIndex } from '../domain/grid';
import { probeMove } from '../domain/movement';
import { FireballAction, MoveAction, PunchAction } from '../../../shared/model/action.model';
import { Command, runTurn } from '../domain/turn';

@Service()
export class BattleStore {
    private readonly _state = signal<GameState>(this.initialState());
    // private readonly animator = inject(Animator);

    readonly state = this._state.asReadonly();
    readonly entities = computed(() => [...this._state().entities.values()]);
    readonly index = computed(() => spatialIndex(this._state()));
    readonly activeActor = computed(() => this.entities().find(e => e.kind === 'character' && e.team === this._state().activeTeam)!);
    // readonly busy = this.animator.playing;
    // readonly canAct      = computed(() => !this.busy());

    readonly legalDirs = computed<Dir[]>(() => {
        const s = this._state(), a = this.activeActor();
        return (['N','S','E','W'] as Dir[]).filter(d => probeMove(s, a.id, d).ok);
    });

    dispatch(cmd: Command): void {
        const { state, log } = runTurn(this._state(), cmd);
        this._state.set(state); // authoritative, instant
        // this.animator.play(log); // visuals catch up
    }

    private initialState(): GameState {
        const playerId = entityId('player');
        const enemyId = entityId('enemy');
        const entities = new Map<EntityId, Entity>([
            [
                playerId,
                {
                    id: playerId,
                    kind: 'character',
                    pos: { x: 2, y: 4 },
                    tags: new Set<Tag>([]),
                    hp: 3,
                    team: 'blue',
                    slot1: MoveAction,
                    slot2: PunchAction,
                    slot3: MoveAction,
                    slot4: FireballAction,
                },
            ],
            [
                enemyId,
                {
                    id: enemyId,
                    kind: 'character',
                    pos: { x: 1, y: 1 },
                    tags: new Set<Tag>(['damaging']),
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
            turn: 1,
            activeTeam: 'blue',
            rngSeed: 0,
        };
    }

}