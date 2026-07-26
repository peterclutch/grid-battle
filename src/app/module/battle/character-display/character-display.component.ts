import { Component, computed, input } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { Character } from '../domain/types';
import { HealthPipe } from '../../../shared/pipe/health.pipe';
import { activeSlotIndex } from '../domain/action';

@Component({
    selector: 'nou-character-display',
    templateUrl: 'character-display.component.html',
    styleUrl: 'character-display.component.scss',
    host: {
        '[class.placement-top]': "placement() === 'top'",
    },
    imports: [
        UpperCasePipe,
        HealthPipe
    ]
})
export class CharacterDisplayComponent {

    readonly character = input.required<Character>();
    readonly isTurn = input.required<boolean>();
    readonly turn = input.required<number>();
    readonly placement = input<'top' | 'bottom'>('bottom');

    readonly nextSlotIndex = computed(() => activeSlotIndex(this.character().team, this.turn()));
    readonly nextSlotOffset = computed(() => {
        const position = this.nextSlotIndex();
        return `calc(${position * 100}% + ${position} * var(--slot-gap))`;
    });

    isNext(index: number): boolean {
        return this.nextSlotIndex() === index;
    }

}
