# EditModal Component Documentation

## Overview
The EditModal is a React Native component that provides chord editing functionality in the ChordCraft application. It appears as a modal dialog when users want to edit, clear, or copy/paste chords in the progression interface.

## Visual Design
The modal features a clean, modern design with:
- Semi-transparent dark overlay (rgba(0, 0, 0, 0.5))
- White background content area
- Rounded corners (10px border radius)
- 80% width of the screen
- Centered title "Edit Chord"
- Two action buttons arranged horizontally

## Component Props
```typescript
interface EditModalProps {
  editModalVisible: boolean;          // Controls modal visibility
  setEditModalVisible: (visible: boolean) => void;  // Toggle modal visibility
  setDeleteMode: (mode: boolean) => void;  // Toggle delete mode
  selectedChordIndex: number | null;  // Index of currently selected chord
  savedChords: (Chord | null)[];      // Array of saved chords
  setSavedChords: (chords: (Chord | null)[]) => void;  // Update saved chords
  copiedChord: Chord | null;          // Currently copied chord in memory
  setCopiedChord: (chord: Chord | null) => void;  // Update copied chord
}
```

## Button Actions

### Clear Button
- **Purpose**: Removes a chord from the selected slot
- **Behavior**:
  1. Checks if a chord is selected (selectedChordIndex !== null)
  2. Creates a new array copy of savedChords
  3. Sets the selected index to null
  4. Updates the savedChords state
  5. Closes the modal
  6. Disables delete mode

### Copy/Paste Button
- **Purpose**: Dual-function button for copying and pasting chords
- **Behavior**:
  1. Checks if a chord is selected (selectedChordIndex !== null)
  2. Gets the chord at the selected index
  3. **Copy Mode** (if selected slot has a chord):
     - Copies the chord to memory using setCopiedChord
  4. **Paste Mode** (if selected slot is empty AND there's a copied chord):
     - Creates a new array copy of savedChords
     - Pastes the copied chord into the selected slot
     - Updates the savedChords state
  5. Closes the modal
  6. Disables delete mode

## Styling
```typescript
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#007bff',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
})
```

## Usage Example
```typescript
// Parent component
const [editModalVisible, setEditModalVisible] = useState(false);
const [deleteMode, setDeleteMode] = useState(false);
const [selectedChordIndex, setSelectedChordIndex] = useState<number | null>(null);
const [savedChords, setSavedChords] = useState<(Chord | null)[]>([]);
const [copiedChord, setCopiedChord] = useState<Chord | null>(null);

// Render EditModal
<EditModal
  editModalVisible={editModalVisible}
  setEditModalVisible={setEditModalVisible}
  setDeleteMode={setDeleteMode}
  selectedChordIndex={selectedChordIndex}
  savedChords={savedChords}
  setSavedChords={setSavedChords}
  copiedChord={copiedChord}
  setCopiedChord={setCopiedChord}
/>
```

## Best Practices
1. Always handle the modal's visibility state in the parent component
2. Maintain the copiedChord state at a level where it can persist between modal instances
3. Clear the selectedChordIndex when the modal is closed
4. Use the setDeleteMode to ensure the delete mode is disabled after operations

## Error Handling
- The component includes null checks for selectedChordIndex
- Safely handles empty slots when attempting to copy
- Prevents pasting when no chord is copied
- Creates new array copies to maintain immutability

## Dependencies
- React Native's core components (Modal, View, Text, Pressable)
- Custom Chord type from '@/types/music' 