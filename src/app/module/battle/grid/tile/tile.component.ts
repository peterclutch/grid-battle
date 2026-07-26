import { Component, computed, effect, ElementRef, inject, input, untracked } from '@angular/core';
import { TileEffect } from '../../domain/grid';

/**
 * A blow landing on the square, as the counterpart to the token's flinch: it arrives hard
 * and fades rather than lingering, which is what separates it from the tile effects — one
 * says "you could hit here", this one says "something just did".
 *
 * Keyframes rather than a CSS animation for the same reason as the token: the same square
 * can be swung at on consecutive turns, and a CSS animation has to be torn off and
 * reattached to replay.
 */
const STRIKE: Keyframe[] = [
    { opacity: 0, transform: 'scale(0.65)' },
    { opacity: 1, transform: 'scale(1.05)', offset: 0.18 },
    { opacity: 0.65, transform: 'scale(1)', offset: 0.45 },
    { opacity: 0, transform: 'scale(1)' },
];

/** The same blow without the lunge. */
const FLASH: Keyframe[] = [
    { opacity: 0 },
    { opacity: 1, offset: 0.15 },
    { opacity: 0 },
];

@Component({
    selector: 'nou-tile',
    templateUrl: 'tile.component.html',
    styleUrl: 'tile.component.scss',
    host: {
        '[class]': 'effectClass()',
    },
})
export class TileComponent {

    readonly effect = input.required<TileEffect | null>();
    /** The turn this square was last swung at. Only the change matters. */
    readonly struckOn = input<number | null>(null);

    protected readonly effectClass = computed(() => {
        const effect = this.effect();
        return effect ? `effect--${effect}` : '';
    });

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    /** The turn we last played a blow for; null while the square is being left alone. */
    private lastPlayed: number | null = null;

    private readonly strikeOnHit = effect(() => {
        const struck = this.struckOn();
        const isFresh = struck !== null && struck !== this.lastPlayed;
        this.lastPlayed = struck;

        if (isFresh) {
            untracked(() => this.strike());
        }
    });

    private strike(): void {
        const mark = this.host.nativeElement.querySelector('.strike');
        if (!mark?.animate) {
            return; // no Web Animations here, so the blow simply does not show
        }
        mark.getAnimations().forEach(animation => animation.cancel());

        const still = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        mark.animate(still ? FLASH : STRIKE, { duration: still ? 420 : 340, easing: 'ease-out' });
    }

}
