import { Component, input } from '@angular/core';
import { TileComponent } from './tile/tile.component';
import { Character } from '../../../shared/model/character.model';
import { Tile } from '../../../shared/model/tile.model';

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
  readonly characters = input.required<Character[]>();

  characterAt(tile: Tile): Character | null {
    return (
        this.characters().find(
            character =>
                character.position.x === tile.x &&
                character.position.y === tile.y,
        ) ?? null
    );
  }

}

