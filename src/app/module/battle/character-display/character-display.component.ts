import { Component, computed, input } from '@angular/core';
import { Character } from '../../../shared/model/character.model';
import { UpperCasePipe } from '@angular/common';
import { HealthPipe } from '../../../shared/pipe/health.pipe';

@Component({
  selector: 'nou-character-display',
  templateUrl: 'character-display.component.html',
  styleUrl: 'character-display.component.scss',
  imports: [
    UpperCasePipe,
    HealthPipe
  ]
})
export class CharacterDisplayComponent {

  readonly character = input.required<Character>();
  readonly isTurn = input.required<boolean>();
  readonly round = input.required<number>();

  readonly nextSlotIndex = computed(() => {
    const isGoingFirst = this.character().characterKind === 'player';
    const addToIndex = !this.isTurn() && isGoingFirst ? 1 : 0
    return (this.round() + addToIndex) % 4;
  });
  // readonly nextSlotAction = computed(() => {
  //   const character = this.character();
  //   switch (this.nextSlotIndex()) {
  //     case 0:
  //       return character.slot4;
  //     case 1:
  //       return character.slot1;
  //     case 2:
  //       return character.slot2;
  //     case 3:
  //       return character.slot3;
  //     default:
  //       return null;
  //   }
  // });
  readonly nextSlotOffset = computed(() => {
    const index = this.nextSlotIndex();
    const position = index === 0 ? 3 : index - 1;

    return `calc(${position * 100}% + ${position * 4}px)`;
  });

  isNext(index: number): boolean {
    return this.nextSlotIndex() === index;
  }

}

