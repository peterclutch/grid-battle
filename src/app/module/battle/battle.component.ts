import { Component, inject } from '@angular/core';
import { GridComponent } from './grid/grid.component';
import { Tile } from '../../shared/model/tile.model';
import { CharacterDisplayComponent } from './character-display/character-display.component';
import { CountdownComponent } from './countdown/countdown.component';
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

