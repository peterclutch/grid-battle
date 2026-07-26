import { Component, computed, effect, ElementRef, inject, input, untracked } from '@angular/core';
import { Entity } from '../../domain/types';

/**
 * A blow, in the only terms the board has to say it: recoil, then settle. Written as
 * keyframes rather than a CSS animation because the same token can be hit again before
 * the last flinch has finished, and restarting a CSS animation means removing a class,
 * forcing a reflow and putting it back.
 *
 * This animates the inner token, never the host — the host carries the translate that
 * places the entity on the grid, and clobbering it would teleport the token mid-hit.
 */
const FLINCH: Keyframe[] = [
    { transform: 'scale(1)', filter: 'brightness(1)' },
    { transform: 'scale(1.3) translateX(-9%)', filter: 'brightness(2.4) saturate(0.4)', offset: 0.12 },
    { transform: 'scale(1.12) translateX(8%)', filter: 'brightness(1.8) saturate(0.7)', offset: 0.32 },
    { transform: 'scale(1.02) translateX(-4%)', filter: 'brightness(1.25)', offset: 0.6 },
    { transform: 'scale(1)', filter: 'brightness(1)' },
];

/** The same blow for anyone who would rather the screen held still. */
const FLASH: Keyframe[] = [
    { filter: 'brightness(1)' },
    { filter: 'brightness(2.2) saturate(0.4)', offset: 0.15 },
    { filter: 'brightness(1)' },
];

@Component({
    selector: 'nou-entity-token',
    templateUrl: 'entity.component.html',
    styleUrl: 'entity.component.scss',
    host: {
        '[style.--x]': 'entity().pos.x',
        '[style.--y]': 'entity().pos.y',
    },
})
export class EntityComponent {

    readonly entity = input.required<Entity>();
    readonly activeCharacter = input.required<boolean>();

    readonly direction = computed(() => {
        const e = this.entity();
        return e.kind === 'projectile' ? e.dir : null;
    });

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    /** Health as of the last time we looked; null until we have looked at all. */
    private lastSeenHp: number | null = null;

    private readonly flinchOnDamage = effect(() => {
        const hp = this.entity().hp ?? 0;
        const lost = this.lastSeenHp !== null && hp < this.lastSeenHp;
        this.lastSeenHp = hp;

        if (lost) {
            untracked(() => this.flinch());
        }
    });

    private flinch(): void {
        const token = this.host.nativeElement.querySelector('.token');
        if (!token?.animate) {
            return; // no Web Animations here, so the hit simply does not show
        }
        // a second blow restarts the recoil rather than layering another one over it
        token.getAnimations().forEach(animation => animation.cancel());

        const still = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        token.animate(still ? FLASH : FLINCH, { duration: still ? 420 : 340, easing: 'ease-out' });
    }

}
