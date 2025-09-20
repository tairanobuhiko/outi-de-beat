import type { SongConfig } from '@/types/songConfig';

import noMansWorldConfig from '../../assets/song-configs/no-mans-world.json';

const SONG_CONFIG_TABLE: Record<string, SongConfig> = {
  'no-mans-world': noMansWorldConfig as SongConfig
};

export function getSongConfig(songId: string): SongConfig | undefined {
  return SONG_CONFIG_TABLE[songId];
}

