import { GameEvent } from '../../shared/model/event.model';
import { GridEntity } from '../../shared/model/grid-entry.model';

export function applyEvents(entities: readonly GridEntity[], events: readonly GameEvent[]): GridEntity[] {
    return events.reduce<GridEntity[]>(applyEvent, [...entities]);
}

function applyEvent(entities: GridEntity[], event: GameEvent): GridEntity[] {
    switch (event.type) {
        case 'moved':
            return entities.map(entity =>
                entity.id === event.entityId ? { ...entity, position: event.to } : entity
            );
        case 'damaged':
            return entities.map(entity =>
                entity.id === event.entityId && entity.kind === 'character'
                    ? { ...entity, health: Math.max(0, entity.health - event.amount) }
                    : entity
            );
        case 'spawned':
            return [...entities, event.entity];
        case 'despawned':
            return entities.filter(entity => entity.id !== event.entityId);
    }
}
