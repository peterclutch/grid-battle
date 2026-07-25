// import {
//     computed,
//     DestroyRef,
//     inject,
//     Service,
//     signal,
// } from '@angular/core';
// import { FireballAction, MoveAction, PunchAction } from '../../shared/model/action.model';
// import { Character, Enemy, Player } from '../../shared/model/character.model';
// import { GameEvent } from '../../shared/model/event.model';
// import { GridEntity, isCharacter } from '../../shared/model/grid-entry.model';
// import { GameInput } from '../../shared/model/input.model';
// import { Intent } from '../../shared/model/intent.model';
// import { Position, positionKey } from '../../shared/model/position.model';
// import { Tile } from '../../shared/model/tile.model';
// import { applyEvents } from './battle.reducer';
// import { resolveIntent } from './battle.resolver';
// import { BOARD_HEIGHT, BOARD_WIDTH } from './battle.rules';
// import { computeTileEffects } from './battle.tile-effects';
//
// type PositionKey = `${number},${number}`;
// function coordinateKey(position: Position): PositionKey {
//     return `${position.x},${position.y}`;
// }
// // todo maybe store stuff here
// type EntityState = {
//     byId: ReadonlyMap<string, GridEntity>;
//     idsByPosition: ReadonlyMap<PositionKey, readonly string[]>;
// };
//
// @Service()
// export class BattleStore {
//
//     private readonly destroyRef = inject(DestroyRef);
//
//     // TIMER
//     private turnTimer: ReturnType<typeof setInterval> | undefined;
//     readonly turnTimeRemaining = signal(6);
//
//     // ENTITIES ON GRID
//     readonly entities = signal<GridEntity[]>([
//         {
//             kind: 'character',
//             characterKind: 'player',
//             moveInto: 'immovable',
//             id: 'player',
//             position: { x: 2, y: 4 },
//             health: 3,
//             slot1: MoveAction,
//             slot2: PunchAction,
//             slot3: MoveAction,
//             slot4: FireballAction,
//         }, {
//             kind: 'character',
//             characterKind: 'enemy',
//             moveInto: 'immovable',
//             id: 'enemy',
//             position: { x: 2, y: 1 },
//             health: 3,
//             slot1: MoveAction,
//             slot2: null,
//             slot3: MoveAction,
//             slot4: PunchAction,
//         }, {
//             kind: 'projectile',
//             id: 'test1',
//             moveInto: 'absorb',
//             direction: 'down',
//             position: { x: 1, y: 0 },
//         },
//     ]);
//
//     readonly player = computed<Player>(() =>
//         this.entities().find((entity): entity is Player =>
//             entity.kind === 'character' && entity.characterKind === 'player'
//         )!
//     );
//     readonly enemy = computed<Enemy>(() =>
//         this.entities().find((entity): entity is Enemy =>
//             entity.kind === 'character' && entity.characterKind === 'enemy'
//         )!
//     );
//     readonly characters = computed<Character[]>(() => this.entities().filter(isCharacter));
//
//     // TURN AND ROUND
//     readonly round = signal(1);
//     readonly isPlayerTurn = signal(true);
//     readonly activeCharacter = computed(() =>
//         this.isPlayerTurn() ? this.player() : this.enemy()
//     );
//     readonly activeAction = computed(() => {
//         const character = this.activeCharacter();
//         const slots = [
//             character.slot1,
//             character.slot2,
//             character.slot3,
//             character.slot4,
//         ];
//         return slots[(this.round() - 1) % slots.length];
//     });
//
//     constructor() {
//         this.destroyRef.onDestroy(() => this.stopTurnTimer());
//     }
//
//     useInput(input: GameInput): void {
//         const actionWasUsed = this.executeAction(input);
//         if (actionWasUsed) {
//             this.endTurn();
//         }
//     }
//
//     private executeAction(input: GameInput): boolean {
//         return false; // todo
//     }
//
//     private resolveIntent(intent: Intent): boolean {
//
//     }
//
//     private applyIntent(intent: Intent): boolean {
//         const events = resolveIntent(intent, this.entities());
//         // a move that goes nowhere doesn't cost the turn
//         if (intent.type === 'move' && events.length === 0) {
//             return false;
//         }
//         this.commit(events);
//         return true;
//     }
//
//     private stepProjectiles(): void {
//         const projectileIds = this.entities()
//             .filter(entity => entity.kind === 'projectile')
//             .map(entity => entity.id);
//         const events = projectileIds.flatMap(entityId =>
//             resolveIntent({ type: 'step', entityId }, this.entities())
//         );
//         this.commit(events);
//     }
//
//     private commit(events: readonly GameEvent[]): void {
//         this.entities.set(applyEvents(this.entities(), events));
//     }
//
//     private endTurn(): void {
//         this.stepProjectiles();
//
//         this.isPlayerTurn.update(b => !b);
//         if (this.isPlayerTurn()) {
//             this.round.update(round => round + 1);
//         }
//
//         this.startTurnTimer();
//     }
//
//     private startTurnTimer(): void {
//         this.stopTurnTimer();
//         this.turnTimeRemaining.set(6);
//         this.turnTimer = setInterval(() => {
//             const nextValue = this.turnTimeRemaining() - 1;
//             this.turnTimeRemaining.set(nextValue);
//             if (nextValue <= 0) {
//                 this.stopTurnTimer();
//                 this.endTurn();
//             }
//         }, 500);
//     }
//
//     private stopTurnTimer(): void {
//         if (this.turnTimer !== undefined) {
//             clearInterval(this.turnTimer);
//             this.turnTimer = undefined;
//         }
//     }
//
// }
