import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Character, Entity, EntityId, entityId, findActiveCharacter, GameState, Tag } from './domain/types';
import { tileEffectIndex } from './domain/preview';
import { FireballAction, MoveAction, ChargeAction, StrikeAction } from './domain/action';
import { runTurn } from './domain/turn';
import { Command } from '../../shared/model/command';
import { GameEvent } from '../../shared/model/event.model';
import { key } from './domain/grid';

const blueId = entityId('blue-player');
const redId = entityId('red-player');

@Injectable({ providedIn: 'root' })
export class BattleStore {

    private readonly destroyRef = inject(DestroyRef);

    private turnTimer: ReturnType<typeof setInterval> | undefined;
    readonly turnTimeRemaining = signal(6);

    private readonly _state = signal<GameState>(this.initialState());
    readonly state = this._state.asReadonly();

    private readonly _lastLog = signal<readonly GameEvent[]>([]);

    readonly entities = computed(() => [...this._state().entities.values()]);
    readonly tileEffectIndex = computed(() => tileEffectIndex(this._state()));

    /**
     * Squares swung at on the turn just played, against the turn number.
     *
     * Everything else the board shows can be read off the state, but an attack cannot: a
     * strike at empty air changes nothing, and even one that lands leaves only a hit point
     * missing somewhere. The log is the only record that a square was swung at.
     *
     * The value is the turn rather than a flag so that hitting the same square twice
     * running still reads as two separate blows.
     */
    readonly struckIndex = computed<ReadonlyMap<string, number>>(() => {
        const turn = this._state().turn;
        const struck = new Map<string, number>();
        for (const event of this._lastLog()) {
            if (event.type === 'attacked') {
                struck.set(key(event.pos), turn);
            }
        }
        return struck;
    });

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
        this._lastLog.set(result.log);
        this.startTurnTimer();
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
                    slots: [MoveAction, ChargeAction, MoveAction, FireballAction],
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

    private startTurnTimer(): void {
        this.stopTurnTimer();
        this.turnTimeRemaining.set(6);

        this.turnTimer = setInterval(() => {
            const nextValue = this.turnTimeRemaining() - 1;
            this.turnTimeRemaining.set(nextValue);

            if (nextValue <= 0) {
                this.stopTurnTimer();
                // this.endTurn();
            }
        }, 500);
    }

    private stopTurnTimer(): void {
        if (this.turnTimer !== undefined) {
            clearInterval(this.turnTimer);
            this.turnTimer = undefined;
        }
    }

}