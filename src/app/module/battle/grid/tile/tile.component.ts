import { Component, input } from '@angular/core';
import { Tile } from '../../../../shared/model/tile.model';
import { Character } from '../../../../shared/model/character.model';

@Component({
  selector: 'nou-tile',
  templateUrl: 'tile.component.html',
  styleUrl: 'tile.component.scss',
})
export class TileComponent {

  readonly tile = input.required<Tile>();
  readonly character = input<Character | null>(null);

}

