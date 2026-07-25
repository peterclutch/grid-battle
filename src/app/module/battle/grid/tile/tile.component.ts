import { Component, computed, input } from '@angular/core';
import { Entity } from '../../domain/types';
import { TileEffect } from '../../domain/grid';

@Component({
    selector: 'nou-tile',
    templateUrl: 'tile.component.html',
    styleUrl: 'tile.component.scss',
    host: {
        '[class]': 'effectClass()',
    },
})
export class TileComponent {

    readonly entities = input.required<Entity[]>();
    readonly effect = input.required<TileEffect | null>();

    protected readonly effectClass = computed(() => {
        const effect = this.effect();
        return effect ? `effect--${effect}` : '';
    });

}
