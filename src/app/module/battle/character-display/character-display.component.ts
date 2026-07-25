import { Component, computed, input } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { Character } from '../domain/types';
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
        const isGoingFirst = this.character().team === 'blue';
        const addToIndex = !this.isTurn() && isGoingFirst ? 1 : 0
        return (this.round() + addToIndex) % 4;
    });
    readonly nextSlotOffset = computed(() => {
        const position = this.nextSlotIndex();
        return `calc(${position * 100}% + ${position * 4}px)`;
    });

    isNext(index: number): boolean {
        return this.nextSlotIndex() === index;
    }

}
