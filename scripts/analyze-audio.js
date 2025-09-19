const { execFile } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const { promisify } = require('util');

// TODO: 将来的にネイティブ解析プラグインに置き換える

const execFileAsync = promisify(execFile);

/**
 * @typedef {Object} SongConfig
 * @property {string} songId
 * @property {string} songTitle
 * @property {string} artist
 * @property {string} audioFile
 * @property {number} offsetMs
 * @property {number} bpm
 * @property {number} durationMs
 * @property {{ onsetsFile?: string }} [analysis]
 */

/**
 * @typedef {Object} CliOptions
 * @property {string} [songId]
 * @property {string} [configPath]
 * @property {string} [audioPath]
 * @property {boolean} [overwrite]
 * @property {boolean} [verbose]
 */

/**
 * @typedef {Object} AnalysisResult
 * @property {number[]} onsets
 * @property {number} bpmHint
 * @property {number} durationMs
 * @property {string[]} tools
 */

async function loadSongConfig(configPath) {
  const raw = await fs.readFile(configPath, 'utf-8');
  return JSON.parse(raw);
}

function resolveConfigPath(options) {
  if (options.configPath) {
    return path.resolve(options.configPath);
  }
  if (!options.songId) {
    throw new Error('songId を指定してください (--song <songId>)。');
  }
  return path.resolve(__dirname, '..', 'assets', 'song-configs', `${options.songId}.json`);
}

async function commandExists(command) {
  try {
    await execFileAsync('which', [command]);
    return true;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return false;
    }
    return false;
  }
}

async function probeDuration(audioPath) {
  const hasFfprobe = await commandExists('ffprobe');
  if (!hasFfprobe) {
    return undefined;
  }
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      audioPath
    ]);
    const seconds = parseFloat(stdout.trim());
    if (Number.isFinite(seconds)) {
      return Math.round(seconds * 1000);
    }
    return undefined;
  } catch (error) {
    console.warn(`ffprobe の実行に失敗しました: ${error.message}`);
    return undefined;
  }
}

async function detectOnsetsWithAubio(audioPath) {
  const hasAubio = await commandExists('aubioonset');
  if (!hasAubio) {
    return undefined;
  }
  try {
    const { stdout } = await execFileAsync('aubioonset', ['-i', audioPath, '-O', 'hfc']);
    const lines = stdout.trim().split(/\s+/).map((value) => parseFloat(value));
    const onsets = lines
      .filter((value) => Number.isFinite(value))
      .map((seconds) => Math.round(seconds * 1000))
      .filter((value, index, array) => index === 0 || value > array[index - 1]);
    if (onsets.length > 0) {
      return onsets;
    }
    return undefined;
  } catch (error) {
    console.warn(`aubioonset の実行に失敗しました: ${error.message}`);
    return undefined;
  }
}

function generateGridFallback(durationMs, bpm) {
  const beatInterval = 60000 / bpm;
  const onsets = [];
  for (let t = 0; t <= durationMs; t += beatInterval) {
    onsets.push(Math.round(t));
  }
  return onsets;
}

function resolveAudioPath(options, song) {
  if (options.audioPath) {
    return path.resolve(options.audioPath);
  }
  return path.resolve(__dirname, '..', 'assets', 'audio', song.audioFile);
}

function determineOutputPath(song, options) {
  const filename = song.analysis && song.analysis.onsetsFile
    ? song.analysis.onsetsFile
    : `${song.songId}_onsets.json`;
  return path.resolve(__dirname, '..', 'assets', 'audio-analysis', filename);
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      continue;
    }
    const [rawKey, rawValue] = token.includes('=') ? token.split('=') : [token, undefined];
    const key = rawKey.replace(/^--/, '');
    const value = rawValue ?? argv[i + 1];
    switch (key) {
      case 'song':
        options.songId = value;
        if (!rawValue) i += 1;
        break;
      case 'config':
        options.configPath = value;
        if (!rawValue) i += 1;
        break;
      case 'audio':
        options.audioPath = value;
        if (!rawValue) i += 1;
        break;
      case 'overwrite':
        options.overwrite = true;
        break;
      case 'verbose':
        options.verbose = true;
        break;
      case 'help':
        printHelp();
        process.exit(0);
        break;
      default:
        console.warn(`未対応のオプションを無視しました: --${key}`);
        if (!rawValue && value && !value.startsWith('--')) {
          i += 1;
        }
        break;
    }
  }
  return options;
}

function printHelp() {
  console.log(`音源解析コマンド\n\n使用例:\n  npm run analyze-audio -- --song no-mans-world\n  npm run analyze-audio -- --config ./path/to/song.json --audio ./tmp/song.wav --overwrite\n`);
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (!options.songId && !options.configPath) {
      throw new Error('--song または --config を指定してください。');
    }

    const configPath = resolveConfigPath(options);
    const song = await loadSongConfig(configPath);
    const audioPath = resolveAudioPath(options, song);

    const tools = [];
    const durationFromProbe = await probeDuration(audioPath);
    if (durationFromProbe) {
      tools.push('ffprobe');
    }

    const durationMs = durationFromProbe || song.durationMs;
    if (options.verbose) {
      console.log(`解析対象の音源: ${audioPath}`);
      console.log(`推定再生時間: ${durationMs}ms`);
    }

    const onsetCandidate = await detectOnsetsWithAubio(audioPath);
    if (onsetCandidate && onsetCandidate.length > 0) {
      tools.push('aubioonset');
    }

    const onsets = onsetCandidate && onsetCandidate.length > 0
      ? onsetCandidate
      : generateGridFallback(durationMs, song.bpm);

    if (!onsetCandidate) {
      tools.push('grid-fallback');
    }

    const result = {
      onsets,
      bpmHint: song.bpm,
      durationMs,
      tools
    };

    const outputPath = determineOutputPath(song, options);
    if (!options.overwrite) {
      const exists = await fs.stat(outputPath).catch(() => null);
      if (exists) {
        throw new Error(`解析結果ファイルが既に存在します。--overwrite を指定するか、別名を設定してください: ${outputPath}`);
      }
    }

    await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf-8');
    console.log(`解析結果を書き出しました: ${outputPath}`);
    console.log(`onsets 件数: ${onsets.length}`);
  } catch (error) {
    console.error('音源解析に失敗しました:', error);
    process.exit(1);
  }
}

main();
