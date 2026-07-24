import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { GridComponent } from './grid/grid.component';
import { Character, Enemy, Player } from '../../shared/model/character.model';
import { Tile } from '../../shared/model/tile.model';
import { FireballAction, MoveAction, PunchAction } from '../../shared/model/action.model';
import { Direction, GameInput } from '../../shared/model/input.model';
import { getPosition, Position, getSurroundingPositions } from '../../shared/model/position.model';
import { CharacterDisplayComponent } from './character-display/character-display.component';
import { CountdownComponent } from './countdown/countdown.component';

type CharacterChanges = Partial<Omit<Character, 'kind'>>;

@Component({
  selector: 'nou-battle',
  templateUrl: 'battle.component.html',
  styleUrl: 'battle.component.scss',
  host: {
    '(window:keydown)': 'onKeyDown($event)',
  },
  imports: [
    GridComponent,
    CharacterDisplayComponent,
    CountdownComponent
  ]
})
export class BattleComponent {

  private readonly keyboardInputs: Readonly<Record<string, GameInput>> = {
    ArrowUp: {
      kind: 'direction',
      direction: 'up',
    },
    ArrowDown: {
      kind: 'direction',
      direction: 'down',
    },
    ArrowLeft: {
      kind: 'direction',
      direction: 'left',
    },
    ArrowRight: {
      kind: 'direction',
      direction: 'right',
    },

    KeyW: {
      kind: 'direction',
      direction: 'up',
    },
    KeyS: {
      kind: 'direction',
      direction: 'down',
    },
    KeyA: {
      kind: 'direction',
      direction: 'left',
    },
    KeyD: {
      kind: 'direction',
      direction: 'right',
    },

    Space: {
      kind: 'tap',
    },
    Enter: {
      kind: 'tap',
    },
  };

  // GRID
  readonly tiles: Tile[] = Array.from({ length: 30 }, (_, id) => ({
    id,
    x: id % 5,
    y: Math.floor(id / 5),
    terrain: 'ground'
  }));
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
  readonly characters = computed((): Character[] => [this.player(), this.enemy()]);

  // TURN
  readonly round = signal(1);
  // readonly activeCharacterIndex = signal(0);
  // readonly activeCharacter = computed<Character>(() => {
  //   const characters = this.characters();
  //   const index = ((this.activeCharacterIndex() % characters.length) + characters.length) % characters.length;
  //   return characters[index] ?? characters[0]; // todo improve later. maybe start with character and then go through each enemy (projectiles should move every turn and spawned pets after the player or with the enemies perhaps
  // });
  readonly isPlayerTurn = signal(true);
  // readonly isPlayerTurn = computed(
  //     () => this.activeCharacter().kind === 'player',
  // );
  readonly activeCharacter = computed(() => this.isPlayerTurn() ? this.player() : this.enemy());
  readonly activeAction = computed(() => {
    const character = this.activeCharacter();
    const index = this.round() % 4;
    if (index === 1) {
      return character.slot1;
    } else if (index === 2) {
      return character.slot2;
    } else if (index === 3) {
      return character.slot3;
    }
    return character.slot4;
  });

  onKeyDown(event: KeyboardEvent): void {
    // Prevent holding a key from repeatedly executing actions.
    if (event.repeat) {
      return;
    }

    const input = this.keyboardInputs[event.code];
    if (!input) {
      return;
    }

    // Prevent arrows and Space from scrolling the page.
    event.preventDefault();

    const actionUsed = this.useAction(input);

    if (actionUsed) {
      this.endTurn();
    }
  }


  private useAction(input: GameInput): boolean {
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
      const attackedCharacter = this.isPositionOccupied(position, character.id);
      if (attackedCharacter) {
        const health = attackedCharacter.health;
        this.updateCharacter(attackedCharacter, { health: health === 0 ? health : health - 1 });
      }
    });
    return true;
  }

  private moveCharacter(character: Character, direction: Direction): boolean {
    const position = getPosition(character.position, direction);
    if (!this.isInsideBoard(position) || this.isPositionOccupied(position, character.id)) {
      return false;
    }
    this.updateCharacter(character, { position });
    return true;
  }

  private updateCharacter(character: Character, changes: CharacterChanges,): void {
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

  private isInsideBoard(position: Position): boolean {
    return (
        position.x >= 0 &&
        position.x < 5 &&
        position.y >= 0 &&
        position.y < 6
    );
  }

  // todo bitmap?
  private isPositionOccupied(
      position: Position,
      movingCharacterId: string,
  ): Character | false {
    return this.characters().find(character =>
        character.id !== movingCharacterId &&
        character.position.x === position.x &&
        character.position.y === position.y
    ) ?? false;
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

  // todo TIMER FOOLING AROUND
  private readonly destroyRef = inject(DestroyRef);
  private turnTimer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    // this.startTurnTimer();

    this.destroyRef.onDestroy(() => {
      this.stopTurnTimer();
    });
  }

  readonly turnTimeRemaining = signal(6);

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
