import { ChordType, MusicMode } from '@/types/music';

/**
 * Chord Guiding Light System (CGLS) Configuration
 * 
 * This configuration defines the diatonic chord qualities for each scale degree in all modes.
 * It is used by the CGLS to determine which chord types should be highlighted when a key is pressed.
 * 
 * Structure:
 * - Each mode has 7 scale degrees (0-6)
 * - Each scale degree has an array of allowed chord types
 * - Includes all possible extensions and variations that are diatonic to the mode
 */
export const CGLS_MODE_QUALITIES: Record<MusicMode, Record<number, ChordType[]>> = {
    major: {
        0: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'], // I
        1: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'], // ii
        2: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'], // iii
        3: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'], // IV
        4: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'], // V
        5: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'], // vi
        6: ['dim', 'm7b5', 'dim7'] // vii°
    },
    minor: {
        0: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'], // i
        1: ['dim', 'm7b5', 'dim7'], // ii°
        2: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'], // III
        3: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'], // iv
        4: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'], // v
        5: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'], // VI
        6: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'] // VII
    },
    dorian: {
        0: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'], // i
        1: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'], // ii
        2: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'], // III
        3: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'], // IV
        4: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'], // v
        5: ['dim', 'm7b5', 'dim7'], // vi°
        6: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'] // VII
    },
    phrygian: {
        0: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'], // i
        1: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'], // II
        2: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'], // III
        3: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'], // iv
        4: ['dim', 'm7b5', 'dim7'], // v°
        5: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'], // VI
        6: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'] // vii
    },
    lydian: {
        0: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'], // I
        1: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'], // II
        2: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'], // iii
        3: ['dim', 'm7b5', 'dim7'], // iv°
        4: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'], // V
        5: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'], // vi
        6: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'] // vii
    },
    mixolydian: {
        0: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'], // I
        1: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'], // ii
        2: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'], // iii
        3: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'], // IV
        4: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'], // v
        5: ['dim', 'm7b5', 'dim7'], // vi°
        6: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'] // VII
    },
    aeolian: {
        0: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'], // i
        1: ['dim', 'm7b5', 'dim7'], // ii°
        2: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'], // III
        3: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'], // iv
        4: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'], // v
        5: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'], // VI
        6: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'] // VII
    },
    locrian: {
        0: ['dim', 'm7b5', 'dim7'], // i°
        1: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'], // II
        2: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'], // iii
        3: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'], // iv
        4: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'], // V
        5: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'], // VI
        6: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'] // vii
    },
    ionian: {
        0: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'], // I
        1: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'], // ii
        2: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'], // iii
        3: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'], // IV
        4: ['major', 'major7', 'major9', 'major11', 'major13', '6', '69', 'sus2', 'sus4'], // V
        5: ['minor', 'minor7', 'minor9', 'm11', 'minor13', 'minor6', 'sus2', 'sus4'], // vi
        6: ['dim', 'm7b5', 'dim7'] // vii°
    },
    off: {
        0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    }
}; 