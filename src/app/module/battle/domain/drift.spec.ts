import { describe, expect, it } from 'vitest';
import { MoveAction } from './action';
import { BLUE, east, hpOf, ids, play, RED, render, scene } from './testing/board';

/** Every board here parks a character where it can take a harmless step, because a turn
 *  has to be played for the projectiles to drift at all. */
const walk = { blue: MoveAction, red: MoveAction };

const rows = (...lines: string[]) => lines.join('\n');

describe('a projectile on its own', () => {

    it('advances one square a turn', () => {
        const after = play(scene(rows(
            'b . . .',
            '> . . .',
        ), walk), east);
        expect(render(after)).toBe(rows(
            '. b . .',
            '. > . .',
        ));
    });

    it('is gone once it leaves the board', () => {
        const after = play(scene(rows(
            'b . . .',
            '. . . >',
        ), walk), east);
        expect(render(after)).toBe(rows(
            '. b . .',
            '. . . .',
        ));
    });

    it('follows a character into the square it just left', () => {
        const after = play(scene('> b . .', walk), east);
        expect(render(after)).toBe('. > b .');
    });
});

describe('a projectile meeting someone', () => {

    it('hurts whoever it flies into, and is spent doing it', () => {
        const after = play(scene('b . . > r', walk), east);
        expect(render(after)).toBe('. b . . r');
        expect(hpOf(after, RED)).toBe(2);
    });

    it('shatters on scenery without marking it', () => {
        const after = play(scene('b . > #', walk), east);
        expect(render(after)).toBe('. b . #');
    });

    it('goes off in a crate', () => {
        const after = play(scene('b . > o', walk), east);
        expect(render(after)).toBe('. b . o');
        expect(hpOf(after, ids(after, 'crate')[0])).toBe(2);
    });

    it('is walked through, not into: stepping onto its square is a dodge', () => {
        const after = play(scene('b > . .', walk), east);
        expect(render(after)).toBe('. b > .');
        expect(hpOf(after, BLUE)).toBe(3);
    });

    it('lets a head-on step past it, both unharmed', () => {
        const after = play(scene('b < . .', walk), east);
        expect(render(after)).toBe('< b . .');
        expect(hpOf(after, BLUE)).toBe(3);
    });
});

describe('two projectiles', () => {

    it('are both spent converging on the same square', () => {
        const after = play(scene(rows(
            'b . . . .',
            '. > . < .',
        ), walk), east);
        expect(render(after)).toBe(rows(
            '. b . . .',
            '. . . . .',
        ));
    });

    it('are both spent swapping squares head-on', () => {
        const after = play(scene(rows(
            'b . . . .',
            '. > < . .',
        ), walk), east);
        expect(render(after)).toBe(rows(
            '. b . . .',
            '. . . . .',
        ));
    });

    it('are both spent converging from different directions', () => {
        const after = play(scene(rows(
            'b . v .',
            '. > . .',
        ), walk), east);
        expect(render(after)).toBe(rows(
            '. b . .',
            '. . . .',
        ));
    });

    it('keep formation when they fly the same way', () => {
        const after = play(scene(rows(
            'b . . . .',
            '. > > . .',
        ), walk), east);
        expect(render(after)).toBe(rows(
            '. b . . .',
            '. . > > .',
        ));
    });

    it('let the follower take the square the leader vacates over the edge', () => {
        const after = play(scene(rows(
            'b . . . .',
            '. . . > >',
        ), walk), east);
        expect(render(after)).toBe(rows(
            '. b . . .',
            '. . . . >',
        ));
    });

    it('let one take the square another leaves sideways', () => {
        const after = play(scene(rows(
            'b . . . .',
            '. > ^ . .',
        ), walk), east);
        expect(render(after)).toBe(rows(
            '. b ^ . .',
            '. . > . .',
        ));
    });
});

describe('a queue of projectiles', () => {

    it('all advance together', () => {
        const after = play(scene(rows(
            'b . . . .',
            '> > > . .',
        ), walk), east);
        expect(render(after)).toBe(rows(
            '. b . . .',
            '. > > > .',
        ));
    });

    it('all advance around a corner, because a chain is not a cycle', () => {
        const after = play(scene(rows(
            'b . . . .',
            '. > v . .',
            '. . < . .',
        ), walk), east);
        expect(render(after)).toBe(rows(
            '. b . . .',
            '. . > . .',
            '. < v . .',
        ));
    });
});
