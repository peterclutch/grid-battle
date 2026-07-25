import { Component, computed, input } from '@angular/core';
import { Tile } from '../../../../shared/model/tile.model';
import { GridEntity } from '../../../../shared/model/grid-entry.model';

@Component({
  selector: 'nou-tile',
  templateUrl: 'tile.component.html',
  styleUrl: 'tile.component.scss',
  host: {
    '[class]': 'effectClass()',
  },
})
export class TileComponent {

  readonly tile = input.required<Tile>();
  readonly entity = input<GridEntity | null>(null);

  protected readonly effectClass = computed(() => {
    const effect = this.tile().effect;
    return effect ? `effect--${effect}` : '';
  });

}

