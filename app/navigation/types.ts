import { Judgment } from '@/types/beatmap';

export type RootStackParamList = {
  Title: undefined;
  SongSelect: undefined;
  Difficulty: { songId: string };
  Gameplay: { songId: string; difficultyId: string };
  Result: { songId: string; difficultyId: string; score: number; judgments: Record<Judgment, number>; maxCombo: number };
};
