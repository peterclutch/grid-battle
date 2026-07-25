import {
    computed,
    DestroyRef,
    inject,
    Service,
    signal,
} from '@angular/core';
import { Character, Enemy, Player } from '../../shared/model/character.model';
import { GridEntity, NonCharacterEntity } from '../../shared/model/grid-entry.model';
import { Direction, GameInput } from '../../shared/model/input.model';
import { FireballAction, MoveAction, PunchAction } from '../../shared/model/action.model';
import { getPosition, getSurroundingPositions } from '../../shared/model/position.model';
import { findCharacterAt, isInsideBoard } from './battle.rules';

type CharacterChanges = Partial<Omit<Character, 'kind'>>;

@Service()
export class BattleStore {

    private readonly destroyRef = inject(DestroyRef);

    private turnTimer: ReturnType<typeof setInterval> | undefined;
    readonly turnTimeRemaining = signal(6);

    readonly player = signal<Player>({
        kind: 'player',
        id: 'player',
        position: { x: 2, y: 4 },
        health: 3,
        slot1: MoveAction,
        slot2: PunchAction,
        slot3: MoveAction,
        slot4: FireballAction,
    });
    readonly enemy = signal<Enemy>({
        kind: 'enemy',
        id: 'enemy',
        position: { x: 2, y: 1 },
        health: 3,
        slot1: MoveAction,
        slot2: null,
        slot3: MoveAction,
        slot4: PunchAction,
    });

    readonly characters = computed<Character[]>(() => [
        this.player(),
        this.enemy(),
    ]);

    readonly spawnedEntities = signal<NonCharacterEntity[]>([
        {
            id: 'test1',
            kind: 'projectile',
            direction: 'down',
            position: { x: 2, y: 0 },
        },
    ]);

    readonly gridEntities = computed<GridEntity[]>(() => [
        ...this.characters(),
        ...this.spawnedEntities(),
    ]);

    readonly round = signal(1);
    readonly isPlayerTurn = signal(true);

    readonly activeCharacter = computed(() =>
        this.isPlayerTurn() ? this.player() : this.enemy()
    );

    readonly activeAction = computed(() => {
        const character = this.activeCharacter();
        const slots = [
            character.slot1,
            character.slot2,
            character.slot3,
            character.slot4,
        ];
        return slots[(this.round() - 1) % slots.length];
    });


    constructor() {
        this.destroyRef.onDestroy(() => this.stopTurnTimer());
    }

    useInput(input: GameInput): void {
        const actionWasUsed = this.executeAction(input);
        if (actionWasUsed) {
            this.endTurn();
        }
    }

    private executeAction(input: GameInput): boolean {
        const action = this.activeAction();
        // if (!this.isPlayerTurn() || !action) {
        //   return false;
        // }
        if (!action) {
            return true; // todo
        }
        if (action.inputKind !== input.kind) {
            return false;
        }
        switch (action?.type) {
            case 'movement':
                if (input.kind !== 'direction') {
                    return false;
                }
                return this.moveCharacter(this.activeCharacter(), input.direction);
            case 'attack':
                if (input.kind !== 'tap') {
                    return false;
                }
                return this.attack(this.activeCharacter());
            case 'defense':
                // todo
                return true;
            case 'spawn':
                // todo
                return true;
        }
    }

    private attack(character: Character): boolean {
        const positions = getSurroundingPositions(character.position);
        positions.forEach((position) => {
            const attackedCharacter = findCharacterAt(this.characters(), position, character.id);
            if (attackedCharacter) {
                const health = attackedCharacter.health;
                this.updateCharacter(attackedCharacter, { health: health === 0 ? health : health - 1 });
            }
        });
        return true;
    }

    private moveCharacter(character: Character, direction: Direction): boolean {
        const position = getPosition(character.position, direction);
        if (!isInsideBoard(position) || findCharacterAt(this.characters(), position, character.id)) {
            return false;
        }
        this.updateCharacter(character, { position });
        return true;
    }

    private updateCharacter(character: Character, changes: CharacterChanges): void {
        switch (character.kind) {
            case 'player':
                this.player.update(player => ({
                    ...player,
                    ...changes,
                }));
                return;

            case 'enemy':
                this.enemy.update(enemy => ({
                    ...enemy,
                    ...changes,
                }));
                return;
        }
    }

    private endTurn(): void {
        const characterCount = this.characters().length;
        if (characterCount === 0) {
            return;
        }
        this.isPlayerTurn.update(b => !b);
        if (this.isPlayerTurn()) {
            this.round.update(round => round + 1);
        }
        this.startTurnTimer();
    }

    private startTurnTimer(): void {
        this.stopTurnTimer();
        this.turnTimeRemaining.set(6);

        this.turnTimer = setInterval(() => {
            const nextValue = this.turnTimeRemaining() - 1;
            this.turnTimeRemaining.set(nextValue);

            if (nextValue <= 0) {
                this.stopTurnTimer();
                this.endTurn();
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