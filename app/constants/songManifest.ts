// 自動生成ファイル: scripts/generate-song-manifest.ts を実行して更新してください。
// 日本語コメントは自動生成のため編集しないでください。
import { SongManifest } from '@/types/manifest';

export const songManifest: SongManifest = [
  {
    songId: 'beat_de_tohi',
    title: 'Beat De Tohi',
    artist: 'outi de beat',
    audioModule: require('../../assets/audio/Beat De Tohi.caf') as number,
    offsetMs: 0,
    previewMs: 12000,
    beatmaps: [
      {
        difficultyId: 'easy',
        difficultyName: 'かんたん',
        level: 3,
        module: require('../../assets/beatmaps/beat_de_tohi_easy.json'),
      },
      {
        difficultyId: 'normal',
        difficultyName: 'ふつう',
        level: 6,
        module: require('../../assets/beatmaps/beat_de_tohi_normal.json'),
      },
      {
        difficultyId: 'hard',
        difficultyName: 'むずかしい',
        level: 9,
        module: require('../../assets/beatmaps/beat_de_tohi_hard.json'),
      },
    ],
  },
];

export const manifestGeneratedAt = '2025-09-17T15:51:29.774Z';

export default songManifest;