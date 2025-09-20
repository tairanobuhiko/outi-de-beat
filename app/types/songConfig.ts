export interface SongConfig {
  songId: string;
  durationMs: number;
  offsetMs?: number;
  analysis?: Record<string, unknown>;
  difficulties?: unknown;
  [key: string]: unknown;
}

