import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { GridComponent } from './grid/grid.component';
import { Character, Enemy, Player } from '../../shared/model/character.model';
import { Tile } from '../../shared/model/tile.model';
import { FireballAction, MoveAction, PunchAction } from '../../shared/model/action.model';
import { Direction, GameInput } from '../../shared/model/input.model';
import { getPosition, Position, getSurroundingPositions } from '../../shared/model/position.model';
import { CharacterDisplayComponent } from './character-display/character-display.component';
import { CountdownComponent } from './countdown/countdown.component';
import { GridEntity } from '../../shared/model/grid-entry.model';
import { KEYBOARD_INPUTS } from './battle-keyboard';
import { BattleStore } from './battle.store';

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

  readonly battle = inject(BattleStore);

  onKeyDown(event: KeyboardEvent): void {
    if (event.repeat) {
      return;
    }
    const input = KEYBOARD_INPUTS[event.code];
    if (!input) {
      return;
    }
    event.preventDefault();
    this.battle.useInput(input);
  }

  readonly tiles: Tile[] = Array.from({ length: 30 }, (_, id) => ({
    id,
    x: id % 5,
    y: Math.floor(id / 5),
    effect: null
  }));

}

