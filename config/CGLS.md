# Chord Guiding Light System (CGLS) Configuration

## Overview
The Chord Guiding Light System is a feature that provides real-time visual feedback about diatonic chord relationships within a selected key and mode. When a user presses a piano key, the system highlights all chord types in the chord grid that are diatonic to the current key and mode.

## Configuration Structure
The configuration is stored in `CGLS.ts` and exports a constant `CGLS_MODE_QUALITIES` that defines the diatonic chord qualities for each scale degree in all modes.

### Structure
```typescript
Record<MusicMode, Record<number, ChordType[]>>
```
- First level: Musical modes (major, minor, dorian, etc.)
- Second level: Scale degrees (0-6)
- Third level: Array of allowed chord types for that scale degree

### Supported Modes
1. Major/Ionian
2. Minor/Aeolian
3. Dorian
4. Phrygian
5. Lydian
6. Mixolydian
7. Locrian

### Chord Types
For each scale degree, the following chord types may be available depending on the mode:

#### Major-based chords:
- major
- major7
- major9
- major11
- major13
- 6
- 69

#### Minor-based chords:
- minor
- minor7
- minor9
- m11
- minor13
- minor6

#### Diminished chords:
- dim
- m7b5
- dim7

#### Suspended chords:
- sus2
- sus4

## Usage
The configuration is used by the `isChordTypeDiatonic` function in `chord-utils.ts` to determine which chord types should be highlighted when a key is pressed.

### Example
In C major:
- When C is pressed (I): major, major7, major9, major11, major13, 6, 69, sus2, sus4
- When D is pressed (ii): minor, minor7, minor9, m11, minor13, minor6, sus2, sus4
- When B is pressed (vii°): dim, m7b5, dim7

## Maintenance
To modify the allowed chord types:
1. Edit the `CGLS.ts` file
2. Update the corresponding documentation in this file
3. Test the changes by playing different keys in different modes

## Backup
It's recommended to keep a backup of this configuration as it contains essential musical theory knowledge that determines the behavior of the chord highlighting system. 