# TODO List

## Critical Issues
1. Non-functional Pages
   - [ ] User Page not loading
   - [ ] Song Page not loading
   - [ ] Utility Page not loading
   Root cause identified in logs:
   ```
   WARN [Layout children]: No route named "user-chord" exists in nested children: ["16keys", "index", "progressions", "sounds"]
   WARN [Layout children]: No route named "songs" exists in nested children: ["16keys", "index", "progressions", "sounds"]
   WARN [Layout children]: No route named "utility" exists in nested children: ["16keys", "index", "progressions", "sounds"]
   ```
   Tasks:
   - [ ] Create missing route files in app directory
   - [ ] Add default exports to route files
   - [ ] Ensure proper navigation setup in _layout.tsx
   - [ ] Verify route naming matches navigation links

## High Priority
1. MIDI File Generation
   - Fix timing issues in note events
   - Correct program change for balafon instrument
   - Ensure proper chord durations are maintained
   - Verify MIDI file structure and format

2. Saved Progressions Display
   - Investigate why saved progressions are not showing on song page
   - Check progression saving mechanism
   - Verify progression loading in song context
   - Ensure proper connection between progressions and songs

## Medium Priority
1. UI/UX Improvements
   - Review and update chord grid styling
   - Ensure consistent spacing and layout
   - Verify button sizes and gaps

2. Performance
   - Optimize audio playback
   - Review memory usage
   - Check for potential memory leaks

## Low Priority
1. Documentation
   - Update README with new features
   - Add code comments where needed
   - Document MIDI file format specifications

## Part 2: Current Issues

### Audio System
- [x] Fix balafon sound playback (completed)
- [ ] Fix "No base sound loaded for current instrument" error
- [ ] Clean up audio initialization code
- [ ] Address cleanup errors with currentInstrument being read-only

### Navigation/Routing
- [ ] Fix missing routes:
  - [ ] user-chord
  - [ ] songs
  - [ ] utility
- [ ] Fix default export warnings for:
  - [ ] chord.tsx
  - [ ] audio-utils.ts

### Development Environment
- [ ] Complete Xcode installation and setup
- [ ] Resolve port 8081/8082 conflicts

### Future Improvements
- [ ] Integrate FMOD Engine (after obtaining license)
- [ ] Document MIDI file format specifications

## Part 3: Page-Specific Issues

### Chord Page
1. Functionality
   - [ ] Fix long-press save functionality for saved chord buttons
   - [ ] Fix edit button's copy/paste functionality
   - [ ] Implement scrollable/toggled chord types grid
     - Change from 5x4 to 4x4 layout
     - Add support for 16 additional chord types
     - Make grid scrollable or toggleable

2. UI/UX
   - [ ] Increase button sizes
   - [ ] Optimize screen space utilization
   - [ ] Improve text readability for elderly users
   - [ ] Fix button spacing for easier interaction

### Sounds Page
1. Layout
   - [ ] Fix saved chords grid dimensions to match original design
   - [ ] Center arrow under saved chords

2. Functionality
   - [ ] Re-implement flam options after fixing automatic flam issue

### Progressions Page
1. Layout
   - [ ] Fix saved chord grid dimensions
   - [ ] Increase settings text size for better visibility

2. Functionality
   - [ ] Implement step clearing requirement before writing new chord
   - [ ] Fix edit button functionality:
     - [ ] Clear option for step sequencer
     - [ ] Clear option for saved chords grid
     - [ ] Clear option for saved progression buttons (1-8)
     - [ ] Copy/paste for step sequencer
     - [ ] Copy/paste for saved chords grid
     - [ ] Copy/paste for saved progression buttons
   - [ ] Fix click functionality

### Priority Order
1. Fix saving/loading functionality (chords, progressions)
2. Fix edit button operations (clear, copy/paste)
3. Address UI sizing and spacing issues
4. Implement new features (scrollable chord types) 