import { describe, expect, it } from 'vitest';
import { ChargeAction, MoveAction } from './action';
import { alive, attempt, BLUE, east, hpOf, ids, play, RED, render, scene, west } from './testing/board';

describe('moving under your own power', () => {

    it('steps one square in the chosen direction', () => {
        const after = play(scene('b . .', { blue: MoveAction }), east);
        expect(render(after)).toBe('. b .');
    });

    it('will not step off the board', () => {
        const result = attempt(scene('. . b', { blue: MoveAction }), east);
        expect(result.ok).toBe(false);
    });

    it('will not step into something solid', () => {
        const result = attempt(scene('b # .', { blue: MoveAction }), east);
        expect(result.ok).toBe(false);
    });

    it('walks into a wall without hurting itself', () => {
        const board = scene('b # .', { blue: MoveAction });
        expect(attempt(board, east).ok).toBe(false);
        expect(hpOf(board, BLUE)).toBe(3); // a refused turn leaves the board untouched
    });

    it('refusing a turn neither advances the clock nor passes the initiative', () => {
        const board = scene('b # .', { blue: MoveAction });
        expect(attempt(board, east).ok).toBe(false);
        expect(board.turn).toBe(0);
        expect(board.activeTeam).toBe('blue');
    });

    it('hands over to the other team once the turn lands', () => {
        const after = play(scene('b . .', { blue: MoveAction }), east);
        expect(after.turn).toBe(1);
        expect(after.activeTeam).toBe('red');
    });
});

describe('pushing', () => {

    it('shoves a crate along', () => {
        const after = play(scene('b o . .', { blue: MoveAction }), east);
        expect(render(after)).toBe('. b o .');
    });

    it('shoves a whole line of crates', () => {
        const after = play(scene('b o o .', { blue: MoveAction }), east);
        expect(render(after)).toBe('. b o o');
    });

    it('refuses when the line has nowhere to go', () => {
        expect(attempt(scene('b o o', { blue: MoveAction }), east).ok).toBe(false);
        expect(attempt(scene('b o #', { blue: MoveAction }), east).ok).toBe(false);
    });

    it('leaves a crate unharmed when the push is refused', () => {
        const board = scene('b o o', { blue: MoveAction });
        expect(attempt(board, east).ok).toBe(false);
        expect(hpOf(board, ids(board, 'crate')[0])).toBe(3);
    });

    it('does not push what is not pushable', () => {
        expect(attempt(scene('b # .', { blue: MoveAction }), east).ok).toBe(false);
    });
});

describe('charging', () => {

    it('slides until the board runs out', () => {
        const after = play(scene('b . . .', { blue: ChargeAction }), east);
        expect(render(after)).toBe('. . . b');
    });

    it('stops short of anything solid', () => {
        const after = play(scene('b . # .', { blue: ChargeAction }), east);
        expect(render(after)).toBe('. b # .');
    });

    it('hits what stopped it, shoves it one square, and takes its place', () => {
        const after = play(scene('b . r .', { blue: ChargeAction }), east);
        expect(render(after)).toBe('. . b r');
        expect(hpOf(after, RED)).toBe(2);
    });

    it('shoves only one square, however far the charge ran', () => {
        const after = play(scene('b . . r . .', { blue: ChargeAction }), east);
        expect(render(after)).toBe('. . . b r .');
    });

    it('hits twice when the victim is pinned against the edge', () => {
        const after = play(scene('b . . r', { blue: ChargeAction }), east);
        expect(render(after)).toBe('. . b r'); // the charger cannot follow into an occupied square
        expect(hpOf(after, RED)).toBe(1);      // the blow, then the wall
    });

    it('hits twice when the victim is pinned against something solid', () => {
        const after = play(scene('b r # .', { blue: ChargeAction }), east);
        expect(render(after)).toBe('b r # .');
        expect(hpOf(after, RED)).toBe(1);
    });

    it('crushes a crate it cannot shove any further', () => {
        const after = play(scene('b . o', { blue: ChargeAction }), east);
        expect(render(after)).toBe('. b o');
        expect(hpOf(after, ids(after, 'crate')[0])).toBe(1);
    });

    it('hits the crate it touches, and that crate crushes the one behind it', () => {
        const after = play(scene('b o o', { blue: ChargeAction }), east);
        const [near, far] = ids(after, 'crate');
        expect(render(after)).toBe('b o o');
        expect(hpOf(after, near)).toBe(1); // struck, then pressed into its neighbour
        expect(hpOf(after, far)).toBe(2);  // only pressed into the edge
    });

    it('kills what it has hit often enough', () => {
        let board = scene('b . . r', { blue: ChargeAction, red: ChargeAction, hp: 2 });
        board = play(board, east);          // blue charges: blow plus the wall behind red
        expect(alive(board, RED)).toBe(false);
    });

    it('is refused when there is neither ground to cover nor anything to hit', () => {
        expect(attempt(scene('. . b', { blue: ChargeAction }), east).ok).toBe(false);
    });

    it('is allowed, though futile, when there is something to swing at', () => {
        const board = scene('b # .', { blue: ChargeAction });
        const result = attempt(board, east);
        expect(result.ok).toBe(true); // the turn is spent hurling yourself at the rock
        expect(result.ok && render(result.state)).toBe('b # .');
    });

    it('charges in whichever direction it is given', () => {
        const after = play(scene('. . b', { blue: ChargeAction }), west);
        expect(render(after)).toBe('b . .');
    });
});

describe('immovable scenery', () => {

    it('is not shoved by a charge, however hard it is hit', () => {
        const after = play(scene('b . # .', { blue: ChargeAction }), east);
        expect(render(after)).toBe('. b # .');
    });

    it('is not pushed by an ordinary move either', () => {
        expect(attempt(scene('b # .', { blue: MoveAction }), east).ok).toBe(false);
    });

    it('backs a crate up the way the board edge does', () => {
        const after = play(scene('b . o #', { blue: ChargeAction }), east);
        expect(render(after)).toBe('. b o #');
        expect(hpOf(after, ids(after, 'crate')[0])).toBe(1); // struck, then crushed against the rock
    });

    it('crushes a character shoved into it', () => {
        const after = play(scene('b r # .', { blue: ChargeAction }), east);
        expect(hpOf(after, RED)).toBe(1);
        expect(render(after)).toBe('b r # .');
    });
});
