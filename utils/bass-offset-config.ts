import { ChordType } from "@/types/music";
import { colors } from "@/constants/colors";

// Bass offset row configuration
export const bassOffsetRow = [
  { type: 'major' as ChordType, label: '-2 BASS', bassOffset: -2, color: colors.surfaceLight },
  { type: 'major' as ChordType, label: '+2 BASS', bassOffset: 2, color: colors.surfaceLight },
  { type: 'major' as ChordType, label: '-3 BASS', bassOffset: -3, color: colors.surfaceLight },
  { type: 'major' as ChordType, label: '+3 BASS', bassOffset: 3, color: colors.surfaceLight },
]; 