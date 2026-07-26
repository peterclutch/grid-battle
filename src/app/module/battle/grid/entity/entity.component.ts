import { Component, computed, input } from '@angular/core';
import { Entity } from '../../domain/types';

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

}
