import { Component, computed, input } from '@angular/core';

@Component({
    selector: 'nou-countdown',
    templateUrl: 'countdown.component.html',
    styleUrl: 'countdown.component.scss',
})
export class CountdownComponent {

    readonly currentStep = input.required<number>();
    readonly totalSteps = input.required<number>();
    readonly theme = input.required<'blue' | 'red'>();
    readonly percentage = computed(() => (this.currentStep() / this.totalSteps()) * 100);

}