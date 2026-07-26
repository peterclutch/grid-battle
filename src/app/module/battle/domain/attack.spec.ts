import { describe, expect, it } from 'vitest';
import { strike, StrikeAction } from './action';
import { alive, attempt, BLUE, east, hpOf, ids, play, RED, render, scene, skip } from './testing/board';

const Shove = strike('Shove', 1, true);

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

describe('answering the wrong kind of command', () => {

    it('is refused rather than guessed at', () => {
        const result = attempt(scene('b . . .', { blue: StrikeAction }), skip);
        expect(result.ok).toBe(false);
        expect(result.ok === false && result.reason).toBe('wrong-input');
    });

    it('leaves the board untouched', () => {
        const board = scene('b r . .', { blue: StrikeAction });
        attempt(board, skip);
        expect(hpOf(board, RED)).toBe(3);
    });
});

describe('knockback on a hit', () => {

    it('shoves the victim away from the blow', () => {
        const after = play(scene('b r . .', { blue: Shove }), east);
        expect(render(after)).toBe('b . r .');
        expect(hpOf(after, RED)).toBe(2);
    });

    // Each square in the reach is knocked back in turn, and a knockback is an ordinary
    // move — so the near crate shoves the far one along ahead of it, and the far one is
    // then shoved again by the blow aimed at its own square. Two squares for the back of
    // the line, one for the front.
    it('shoves every victim in the line, and the far one twice over', () => {
        const after = play(scene('b o o . .', { blue: strike('Sweep', 2, true) }), east);
        expect(render(after)).toBe('b . o . o');
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
