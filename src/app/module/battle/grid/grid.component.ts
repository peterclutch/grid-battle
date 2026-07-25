import { Component, input } from '@angular/core';
import { TileComponent } from './tile/tile.component';
import { Tile } from '../../../shared/model/tile.model';
import { GridEntity } from '../../../shared/model/grid-entry.model';

@Component({
  selector: 'nou-grid',
  templateUrl: 'grid.component.html',
  styleUrl: 'grid.component.scss',
  imports: [
    TileComponent
  ]
})
export class GridComponent {

  readonly tiles = input.required<Tile[]>();
  readonly entities = input.required<GridEntity[]>();

  entityAt(tile: Tile): GridEntity | null {
    return this.entities().find(entity =>
        entity.position.x === tile.x && entity.position.y === tile.y
    ) ?? null;
  }

}

