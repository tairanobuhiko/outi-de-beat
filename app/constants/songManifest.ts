// 自動生成ファイル: scripts/generate-song-manifest.ts を実行して更新してください。
// 日本語コメントは自動生成のため編集しないでください。
import { SongManifest } from '@/types/manifest';

export const songManifest: SongManifest = [
  {
    songId: 'no-mans-world',
    title: 'no man’s world',
    artist: 'outi de beat',
    audioModule: require('../../assets/audio/「no man’s world」音羽-otoha-.caf') as number,
    offsetMs: 0,
    previewMs: 12000,
    beatmaps: [
      {
        difficultyId: 'easy',
        difficultyName: 'かんたん',
        level: 3,
        module: require('../../assets/beatmaps/no_mans_world_easy.json'),
      },
      {
        difficultyId: 'normal',
        difficultyName: 'ふつう',
        level: 6,
        module: require('../../assets/beatmaps/no_mans_world_normal.json'),
      },
      {
        difficultyId: 'hard',
        difficultyName: 'むずかしい',
        level: 9,
        module: require('../../assets/beatmaps/no_mans_world_hard.json'),
      },
    ],
  },
];

export const manifestGeneratedAt = '2025-09-17T15:51:29.774Z';

export default songManifest;