import { Component, inject } from '@angular/core';
import { BattleStore } from './state/battle.store';
import { KEYBOARD_INPUTS } from './domain/input-map';

@Component({
  selector: 'nou-battle',
  templateUrl: 'battle2.component.html',
  styleUrl: 'battle2.component.scss',
  host: {
    '(window:keydown)': 'onKeyDown($event)',
  },
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

