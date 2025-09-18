export interface BeatmapDifficultyEntry {
  difficultyId: string;
  difficultyName: string;
  level: number;
  module: object;
}

export interface SongManifestEntry {
  songId: string;
  title: string;
  artist: string;
  audioModule: number;
  offsetMs: number;
  previewMs?: number;
  beatmaps: BeatmapDifficultyEntry[];
}

export type SongManifest = SongManifestEntry[];
