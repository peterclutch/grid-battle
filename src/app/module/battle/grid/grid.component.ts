import { Component, computed, input } from '@angular/core';
import { Entity } from '../domain/types';
import { TileComponent } from './tile/tile.component';
import { TileEffect } from '../domain/grid';

@Component({
    selector: 'nou-grid',
    templateUrl: 'grid.component.html',
    styleUrl: 'grid.component.scss',
    imports: [
        TileComponent
    ]
})
export class GridComponent {

    readonly height = input.required<number>();
    readonly width = input.required<number>();
    readonly entities = input.required<ReadonlyMap<string, Entity[]>>();
    readonly tileEffects = input.required<ReadonlyMap<string, TileEffect>>();

    readonly cells = computed(() => {
        return Array.from({ length: this.width() * this.height() }, (_, index) => ({
            index,
            x: index % this.width(),
            y: Math.floor(index / this.width()),
        }));
    });

    entitiesAt(x: number, y: number): Entity[] {
        return this.entities().get(`${x},${y}`) ?? [];
    }

    tileEffectAt(x: number, y: number): TileEffect | null {
        return this.tileEffects().get(`${x},${y}`) ?? null;
    }
}
