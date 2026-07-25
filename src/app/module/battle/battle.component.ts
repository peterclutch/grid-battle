import { Component, inject } from '@angular/core';
import { BattleStore } from './battle.store';
import { KEYBOARD_INPUTS } from './domain/input-map';
import { GridComponent } from './grid/grid.component';
import { CharacterDisplayComponent } from './character-display/character-display.component';

@Component({
  selector: 'nou-battle',
  templateUrl: 'battle.component.html',
  styleUrl: 'battle.component.scss',
  host: {
    '(window:keydown)': 'onKeyDown($event)',
  },
  imports: [
    GridComponent,
    CharacterDisplayComponent
  ]
})
export class BattleComponent {

  readonly store = inject(BattleStore);

  onKeyDown(event: KeyboardEvent): void {
    if (event.repeat) {
      return;
    }
    const input = KEYBOARD_INPUTS[event.code];
    if (!input) {
      return;
    }
    event.preventDefault();
    this.store.dispatch(input);
  }

}

