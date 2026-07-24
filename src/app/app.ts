import { Component, signal } from '@angular/core';
import { BattleComponent } from './module/battle/battle.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  imports: [
    BattleComponent
  ],
  styleUrl: './app.scss'
})
export class App { }
