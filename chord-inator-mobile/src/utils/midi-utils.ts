import { ChordProgression, Chord } from '@/types/music';

export const exportProgressionToMidi = (progression: ChordProgression): Blob => {
  // Create a MIDI file header (Format 1)
  const header = new Uint8Array([
    0x4D, 0x54, 0x68, 0x64, // "MThd"
    0x00, 0x00, 0x00, 0x06, // Header length
    0x00, 0x01, // Format 1
    0x00, 0x02, // Two tracks (one for tempo/meta, one for notes)
    0x00, 0x60  // 96 ticks per quarter note
  ]);

  // Create tempo/meta track
  const tempoTrackHeader = new Uint8Array([
    0x4D, 0x54, 0x72, 0x6B, // "MTrk"
    0x00, 0x00, 0x00, 0x00  // Track length (will be updated)
  ]);

  // Add tempo event
  const tempo = 60000000 / progression.tempo; // microseconds per quarter note
  const tempoEvent = new Uint8Array([
    0x00, // Delta time
    0xFF, 0x51, 0x03, // Set tempo
    (tempo >> 16) & 0xFF,
    (tempo >> 8) & 0xFF,
    tempo & 0xFF
  ]);

  // Add track name
  const trackName = progression.name || 'Chord Progression';
  const trackNameLength = trackName.length;
  const trackNameEvent = new Uint8Array([
    0x00, // Delta time
    0xFF, 0x03, // Track name
    trackNameLength, // Length of name
    ...Array.from(trackName).map(c => c.charCodeAt(0))
  ]);

  // Add end of track
  const endOfTempoTrack = new Uint8Array([
    0x00,
    0xFF, 0x2F, 0x00
  ]);

  // Create note track
  const noteTrackHeader = new Uint8Array([
    0x4D, 0x54, 0x72, 0x6B, // "MTrk"
    0x00, 0x00, 0x00, 0x00  // Track length (will be updated)
  ]);

  // Add program change (balafon)
  const programChange = new Uint8Array([
    0x00, // Delta time
    0xC0, // Program change
    0x6C  // Balafon program (108 in decimal, 0x6C in hex)
  ]);

  // Add note events for each chord
  const noteEvents: Uint8Array[] = [];
  let currentTime = 0;
  
  progression.chords.forEach((chord, index) => {
    // Note on events for all notes in the chord
    chord.notes.forEach(note => {
      noteEvents.push(new Uint8Array([
        currentTime, // Delta time
        0x90, // Note on
        note,
        0x64 // Velocity
      ]));
    });
    
    // Note off events for all notes in the chord
    const duration = chord.duration || 0x60; // Default to quarter note if no duration specified
    currentTime = duration;
    chord.notes.forEach(note => {
      noteEvents.push(new Uint8Array([
        0x00, // Delta time (simultaneous with previous event)
        0x80, // Note off
        note,
        0x00
      ]));
    });
  });

  // Add end of track
  const endOfNoteTrack = new Uint8Array([
    0x00,
    0xFF, 0x2F, 0x00
  ]);

  // Calculate track lengths
  const tempoTrackLength = tempoEvent.length + trackNameEvent.length + endOfTempoTrack.length;
  const noteTrackLength = programChange.length + 
    noteEvents.reduce((sum, event) => sum + event.length, 0) + 
    endOfNoteTrack.length;

  // Update track lengths in headers
  tempoTrackHeader[4] = (tempoTrackLength >> 24) & 0xFF;
  tempoTrackHeader[5] = (tempoTrackLength >> 16) & 0xFF;
  tempoTrackHeader[6] = (tempoTrackLength >> 8) & 0xFF;
  tempoTrackHeader[7] = tempoTrackLength & 0xFF;

  noteTrackHeader[4] = (noteTrackLength >> 24) & 0xFF;
  noteTrackHeader[5] = (noteTrackLength >> 16) & 0xFF;
  noteTrackHeader[6] = (noteTrackLength >> 8) & 0xFF;
  noteTrackHeader[7] = noteTrackLength & 0xFF;

  // Combine all data
  const midiData = new Uint8Array(
    header.length + 
    tempoTrackHeader.length + tempoEvent.length + trackNameEvent.length + endOfTempoTrack.length +
    noteTrackHeader.length + programChange.length + 
    noteEvents.reduce((sum, event) => sum + event.length, 0) + 
    endOfNoteTrack.length
  );

  let offset = 0;
  midiData.set(header, offset); offset += header.length;
  midiData.set(tempoTrackHeader, offset); offset += tempoTrackHeader.length;
  midiData.set(tempoEvent, offset); offset += tempoEvent.length;
  midiData.set(trackNameEvent, offset); offset += trackNameEvent.length;
  midiData.set(endOfTempoTrack, offset); offset += endOfTempoTrack.length;
  midiData.set(noteTrackHeader, offset); offset += noteTrackHeader.length;
  midiData.set(programChange, offset); offset += programChange.length;
  noteEvents.forEach(event => {
    midiData.set(event, offset);
    offset += event.length;
  });
  midiData.set(endOfNoteTrack, offset);

  return new Blob([midiData], { type: 'audio/midi' });
};

export const downloadMidiFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}; 