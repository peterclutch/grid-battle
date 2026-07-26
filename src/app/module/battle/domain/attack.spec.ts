import { describe, expect, it } from 'vitest';
import { burst, PunchAction, strike, StrikeAction } from './action';
import { alive, attempt, BLUE, east, hpOf, ids, play, RED, render, scene, tap } from './testing/board';

const Shove = strike('Shove', 1, true);
const Blast = burst('Blast', true);

describe('striking a line', () => {

    it('reaches the square in front', () => {
        const after = play(scene('b r . .', { blue: StrikeAction }), east);
        expect(hpOf(after, RED)).toBe(2);
    });

    it('reaches the second square too', () => {
        const after = play(scene('b . r .', { blue: StrikeAction }), east);
        expect(hpOf(after, RED)).toBe(2);
    });

    it('stops at its reach', () => {
        const after = play(scene('b . . r', { blue: StrikeAction }), east);
        expect(hpOf(after, RED)).toBe(3);
    });

    it('hits every square in the line, not just the first thing it meets', () => {
        const after = play(scene('b o o .', { blue: StrikeAction }), east);
        expect(ids(after, 'crate').map(id => hpOf(after, id))).toEqual([2, 2]);
    });

    it('leaves the attacker where it stands', () => {
        const after = play(scene('b r . .', { blue: StrikeAction }), east);
        expect(render(after)).toBe('b r . .');
    });

    it('costs the turn even swinging at empty air', () => {
        const result = attempt(scene('b . . .', { blue: StrikeAction }), east);
        expect(result.ok).toBe(true);
        expect(result.ok && result.state.activeTeam).toBe('red');
    });

    it('costs the turn even swinging off the board', () => {
        const result = attempt(scene('. . b', { blue: StrikeAction }), east);
        expect(result.ok).toBe(true);
        expect(result.ok && render(result.state)).toBe('. . b');
    });
});

describe('bursting at every neighbour', () => {

    it('hits all four at once', () => {
        const after = play(scene(`
            . o .
            o b o
            . o .
        `, { blue: PunchAction }), tap);
        expect(ids(after, 'crate').every(id => hpOf(after, id) === 2)).toBe(true);
    });

    it('hits whoever is standing there, friend or foe', () => {
        const after = play(scene(`
            . r .
            . b .
        `, { blue: PunchAction }), tap);
        expect(hpOf(after, RED)).toBe(2);
    });

    it('refuses nothing — an empty board still costs the turn', () => {
        const result = attempt(scene(`
            . . .
            . b .
            . . .
        `, { blue: PunchAction }), tap);
        expect(result.ok).toBe(true);
    });

    it('will not answer a direction', () => {
        const result = attempt(scene('. b .', { blue: PunchAction }), east);
        expect(result.ok).toBe(false);
        expect(result.ok === false && result.reason).toBe('wrong-input');
    });
});

describe('knockback on a hit', () => {

    it('shoves the victim away from the blow', () => {
        const after = play(scene('b r . .', { blue: Shove }), east);
        expect(render(after)).toBe('b . r .');
        expect(hpOf(after, RED)).toBe(2);
    });

    it('radiates outward from a burst', () => {
        const after = play(scene(`
            . . . . .
            . . o . .
            . o b o .
            . . o . .
            . . . . .
        `, { blue: Blast }), tap);
        expect(render(after)).toBe([
            '. . o . .',
            '. . . . .',
            'o . b . o',
            '. . . . .',
            '. . o . .',
        ].join('\n'));
    });

    it('hits twice when the victim has nowhere to go', () => {
        const after = play(scene('b r #', { blue: Shove }), east);
        expect(hpOf(after, RED)).toBe(1); // the blow, then the rock behind
        expect(render(after)).toBe('b r #');
    });

    it('hits twice against the board edge', () => {
        const after = play(scene('. b r', { blue: Shove }), east);
        expect(hpOf(after, RED)).toBe(1);
    });

    it('does not shove immovable scenery', () => {
        const after = play(scene('b # .', { blue: Shove }), east);
        expect(render(after)).toBe('b # .');
    });
});

describe('what a blow means to the thing hit', () => {

    it('takes a hit point off anything mortal', () => {
        const after = play(scene('b r . .', { blue: StrikeAction }), east);
        expect(hpOf(after, RED)).toBe(2);
    });

    it('shatters anything fragile outright', () => {
        const after = play(scene('b x . .', { blue: StrikeAction }), east);
        expect(render(after)).toBe('b . . .');
    });

    it('does nothing at all to inert scenery', () => {
        const after = play(scene('b # . .', { blue: StrikeAction }), east);
        expect(render(after)).toBe('b # . .');
    });

    it('clears the board of anything it kills', () => {
        let board = scene('b r . .', { blue: StrikeAction, red: StrikeAction, hp: 1 });
        board = play(board, east);
        expect(alive(board, RED)).toBe(false);
        expect(alive(board, BLUE)).toBe(true);
    });
});
