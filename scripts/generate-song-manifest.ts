import { promises as fs } from 'fs';
import path from 'path';

const AUDIO_DIR = path.resolve(__dirname, '..', 'assets', 'audio');
const BEATMAP_DIR = path.resolve(__dirname, '..', 'assets', 'beatmaps');
const OUTPUT_FILE = path.resolve(__dirname, '..', 'app', 'constants', 'songManifest.ts');

interface BeatmapMeta {
  song_id: string;
  song_title: string;
  artist: string;
  difficulty_id: string;
  difficulty_name: string;
  level: number;
  audio_file: string;
  offset_ms: number;
  preview_ms?: number;
}

async function ensureDirectories() {
  const stats = await fs.stat(BEATMAP_DIR).catch(() => null);
  if (!stats) {
    throw new Error(`譜面ディレクトリが存在しません: ${BEATMAP_DIR}`);
  }
}

async function collectBeatmaps() {
  const entries = await fs.readdir(BEATMAP_DIR);
  const beatmapFiles = entries.filter((file) => file.endsWith('.json'));
  if (beatmapFiles.length === 0) {
    throw new Error('譜面ファイルが1件も見つかりませんでした。');
  }

  const songs = new Map<string, {
    meta: Omit<BeatmapMeta, 'difficulty_id' | 'difficulty_name' | 'level'>;
    difficulties: Array<BeatmapMeta>;
  }>();

  for (const filename of beatmapFiles) {
    const fullPath = path.join(BEATMAP_DIR, filename);
    const content = await fs.readFile(fullPath, 'utf-8');
    const beatmap = JSON.parse(content) as BeatmapMeta;

    const audioPath = path.join(AUDIO_DIR, beatmap.audio_file);
    const audioExists = await fs.stat(audioPath).catch(() => null);
    if (!audioExists) {
      throw new Error(`譜面 ${filename} が参照する音源が見つかりません: ${beatmap.audio_file}`);
    }

    if (!songs.has(beatmap.song_id)) {
      songs.set(beatmap.song_id, {
        meta: {
          song_id: beatmap.song_id,
          song_title: beatmap.song_title,
          artist: beatmap.artist,
          audio_file: beatmap.audio_file,
          offset_ms: beatmap.offset_ms,
          preview_ms: beatmap.preview_ms
        },
        difficulties: []
      });
    }

    const songEntry = songs.get(beatmap.song_id)!;
    songEntry.difficulties.push(beatmap);
  }

  return songs;
}

function buildSource(songs: Map<string, { meta: any; difficulties: Array<BeatmapMeta>; }>) {
  const lines: string[] = [];
  lines.push('// 自動生成ファイル: scripts/generate-song-manifest.ts を実行して更新してください。');
  lines.push("// 日本語コメントは自動生成のため編集しないでください。");
  lines.push("import { SongManifest } from '@/types/manifest';");
  lines.push('');
  lines.push('export const songManifest: SongManifest = [');

  for (const song of songs.values()) {
    const audioRequirePath = `require('../../assets/audio/${song.meta.audio_file.replace(/'/g, "\\'")}')`;
    lines.push('  {');
    lines.push(`    songId: '${song.meta.song_id}',`);
    lines.push(`    title: '${song.meta.song_title.replace(/'/g, "\\'")}',`);
    lines.push(`    artist: '${song.meta.artist.replace(/'/g, "\\'")}',`);
    lines.push(`    audioModule: ${audioRequirePath} as number,`);
    lines.push(`    offsetMs: ${song.meta.offset_ms},`);
    if (typeof song.meta.preview_ms === 'number') {
      lines.push(`    previewMs: ${song.meta.preview_ms},`);
    }
    lines.push('    beatmaps: [');
    for (const beatmap of song.difficulties.sort((a, b) => a.level - b.level)) {
      const beatmapRequirePath = `require('../../assets/beatmaps/${beatmap.song_id}_${beatmap.difficulty_id}.auto.json')`;
      lines.push('      {');
      lines.push(`        difficultyId: '${beatmap.difficulty_id}',`);
      lines.push(`        difficultyName: '${beatmap.difficulty_name}',`);
      lines.push(`        level: ${beatmap.level},`);
      lines.push(`        module: ${beatmapRequirePath},`);
      lines.push('      },');
    }
    lines.push('    ],');
    lines.push('  },');
  }
  lines.push('];');
  lines.push('');
  lines.push(`export const manifestGeneratedAt = '${new Date().toISOString()}';`);
  lines.push('');
  lines.push('export default songManifest;');

  return lines.join('\n');
}

async function main() {
  await ensureDirectories();
  const songs = await collectBeatmaps();
  const source = buildSource(songs);
  await fs.writeFile(OUTPUT_FILE, source, 'utf-8');
}

main().catch((error) => {
  console.error('マニフェストの生成に失敗しました:', error);
  process.exit(1);
});
