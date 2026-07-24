import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'health' })
export class HealthPipe implements PipeTransform {
    transform(count: number): string {
        return 'X'.repeat(Math.max(0, count));
    }
}