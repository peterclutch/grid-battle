import { describe, expect, it } from 'vitest';
import { FireballAction } from './action';
import { attempt, east, hpOf, ids, play, RED, render, scene, west } from './testing/board';

describe('conjuring into an empty square', () => {

    it('appears in the square ahead', () => {
        const after = play(scene('b . . .', { blue: FireballAction }), east);
        expect(render(after)).toBe('b > . .');
    });

    it('stays put on the turn it is made', () => {
        const after = play(scene('b . . .', { blue: FireballAction }), east);
        expect(render(after)).toBe('b > . .'); // adjacent, not already drifted onward
        expect(after.turn).toBe(1);
    });

    it('faces the way it was thrown', () => {
        const after = play(scene('. . b .', { blue: FireballAction }), west);
        expect(render(after)).toBe('. < b .');
    });

    it('is refused off the board', () => {
        expect(attempt(scene('. . b', { blue: FireballAction }), east).ok).toBe(false);
    });
});

describe('conjuring onto something', () => {

    it('goes off in a character at point-blank range', () => {
        const after = play(scene('b r . .', { blue: FireballAction }), east);
        expect(hpOf(after, RED)).toBe(2);
        expect(render(after)).toBe('b r . .'); // spent on arrival, nothing left flying
    });

    it('goes off in a crate', () => {
        const after = play(scene('b o . .', { blue: FireballAction }), east);
        expect(hpOf(after, ids(after, 'crate')[0])).toBe(2);
        expect(render(after)).toBe('b o . .');
    });

    it('shatters glass', () => {
        const after = play(scene('b x . .', { blue: FireballAction }), east);
        expect(render(after)).toBe('b . . .');
    });

    it('is refused against a rock, which it could only die on', () => {
        const result = attempt(scene('b # . .', { blue: FireballAction }), east);
        expect(result.ok).toBe(false);
        expect(result.ok === false && result.reason).toBe('illegal');
    });

    it('annihilates a projectile already in that square', () => {
        const after = play(scene('b > . .', { blue: FireballAction }), east);
        expect(render(after)).toBe('b . . .');
    });

    it('reaches a character through nothing — only the square ahead is in range', () => {
        const after = play(scene('b . r .', { blue: FireballAction }), east);
        expect(hpOf(after, RED)).toBe(3);
        expect(render(after)).toBe('b > r .'); // it has to fly there first
    });
});

describe('what a conjured blow costs', () => {

    it('spends the turn like any other action', () => {
        const after = play(scene('b r . .', { blue: FireballAction }), east);
        expect(after.turn).toBe(1);
        expect(after.activeTeam).toBe('red');
    });

    it('leaves the caster where it stands', () => {
        const after = play(scene('. b . .', { blue: FireballAction }), east);
        expect(render(after)).toBe('. b > .');
    });
});
