import { Component, computed, inject } from '@angular/core';
import { TileComponent } from './tile/tile.component';
import { EntityComponent } from './entity/entity.component';
import { TileEffect } from '../domain/grid';
import { BattleStore } from '../battle.store';

@Component({
    selector: 'nou-grid',
    templateUrl: 'grid.component.html',
    styleUrl: 'grid.component.scss',
    imports: [
        TileComponent,
        EntityComponent,
    ]
})
export class GridComponent {

    readonly store = inject(BattleStore);

    readonly cells = computed(() => {
        return Array.from({ length: this.store.state().width * this.store.state().height }, (_, index) => ({
            index,
            x: index % this.store.state().width,
            y: Math.floor(index / this.store.state().width),
        }));
    });

    tileEffectAt(x: number, y: number): TileEffect | null {
        return this.store.tileEffectIndex().get(`${x},${y}`) ?? null;
    }

    /** The turn this square was last swung at, or null. Tiles animate off the change. */
    struckOn(x: number, y: number): number | null {
        return this.store.struckIndex().get(`${x},${y}`) ?? null;
    }
}
