import { describe, expect, it } from 'vitest';
import { ChargeAction, FireballAction, MoveAction, StrikeAction } from './action';
import { highlights, scene } from './testing/board';

const rows = (...lines: string[]) => lines.join('\n');

/**
 * The preview is derived by resolving every command the armed action could receive, so
 * these are really assertions that the highlights cannot promise anything the action
 * would not do.
 */
describe('what a move offers', () => {

    it('offers every neighbour it could stand on', () => {
        expect(highlights(scene(rows(
            '. . .',
            '. b .',
            '. . .',
        ), { blue: MoveAction }))).toBe(rows(
            '. m .',
            'm . m',
            '. m .',
        ));
    });

    it('does not offer the edge of the board', () => {
        expect(highlights(scene('b . .', { blue: MoveAction }))).toBe('. m .');
    });

    it('does not offer a square it would be refused', () => {
        expect(highlights(scene(rows(
            '. # .',
            '. b .',
            '. . .',
        ), { blue: MoveAction }))).toBe(rows(
            '. . .',
            'm . m',
            '. m .',
        ));
    });

    it('offers a square it could push something out of', () => {
        expect(highlights(scene('b o . .', { blue: MoveAction }))).toBe('. m . .');
    });

    it('offers nothing when the board refuses every direction', () => {
        expect(highlights(scene(rows(
            '# .',
            'b #',
        ), { blue: MoveAction }))).toBe(rows(
            '. .',
            '. .',
        ));
    });
});

describe('what a charge offers', () => {

    it('draws the whole slide, resting square last', () => {
        expect(highlights(scene('b . . . .', { blue: ChargeAction }))).toBe('. p p p m');
    });

    it('marks the victim it would end up hitting', () => {
        expect(highlights(scene('b . r .', { blue: ChargeAction }))).toBe('. p a .');
    });

    it('marks a victim it cannot follow into, and rests short of it', () => {
        expect(highlights(scene('b . . r', { blue: ChargeAction }))).toBe('. p m a');
    });

    it('stops the highlight at scenery it cannot pass', () => {
        expect(highlights(scene('b . # .', { blue: ChargeAction }))).toBe('. m a .');
    });
});

describe('what an attack offers', () => {

    it('reaches as far as the strike reaches, in every direction', () => {
        expect(highlights(scene('. . b . .', { blue: StrikeAction }))).toBe('a a . a a');
    });

    it('reaches in all four directions, clipped by the board', () => {
        expect(highlights(scene(rows(
            '. . .',
            '. b .',
            '. . .',
        ), { blue: StrikeAction }))).toBe(rows(
            '. a .',
            'a . a',
            '. a .',
        ));
    });

    it('offers squares that hold nothing — swinging at air is still allowed', () => {
        expect(highlights(scene('b . . .', { blue: StrikeAction }))).toBe('. a a .');
    });
});

describe('what a fireball offers', () => {

    it('offers every neighbour it could appear on', () => {
        expect(highlights(scene(rows(
            '. . .',
            '. b .',
            '. . .',
        ), { blue: FireballAction }))).toBe(rows(
            '. s .',
            's . s',
            '. s .',
        ));
    });

    it('offers an occupied square, because it would go off there', () => {
        expect(highlights(scene('b r . .', { blue: FireballAction }))).toBe('. s . .');
    });

    it('withholds a square where it would only die', () => {
        expect(highlights(scene('b # . .', { blue: FireballAction }))).toBe('. . . .');
    });
});

describe('what the board shows regardless of the action', () => {

    it('marks where a loose projectile is headed', () => {
        expect(highlights(scene('b > . .', { blue: MoveAction }))).toBe('. m f .');
    });

    it('still offers the square that projectile is leaving', () => {
        // stepping onto it is a dodge, so the move highlight has to stand
        expect(highlights(scene('b > . .', { blue: MoveAction }))).toContain('m');
    });
});
