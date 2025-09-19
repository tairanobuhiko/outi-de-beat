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
    beatmaps: [
      {
        difficultyId: 'easy_auto',
        difficultyName: 'かんたん(自動)',
        level: 3,
        module: require('../../assets/beatmaps/no-mans-world_easy_auto.auto.json'),
      },
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

export const manifestGeneratedAt = '2025-09-19T16:49:39.653Z';

export default songManifest;