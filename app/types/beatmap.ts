export type NoteType = 'tap' | 'hold' | 'slide';

export interface BeatmapNote {
  time_ms: number;
  lane: number;
  type: NoteType;
  duration_ms?: number;
}

export interface BeatmapData {
  song_id: string;
  song_title: string;
  artist: string;
  difficulty_id: string;
  difficulty_name: string;
  level: number;
  audio_file: string;
  offset_ms: number;
  preview_ms?: number;
  notes: BeatmapNote[];
}

export type Judgment = 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS';

export interface JudgmentResult {
  judgment: Judgment;
  delta: number;
  combo: number;
  score: number;
}
