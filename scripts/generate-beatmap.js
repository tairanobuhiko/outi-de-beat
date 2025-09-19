const fs = require('fs/promises');
const path = require('path');

// TODO: 自動譜面生成ロジックの拡張ポイントを整理する

/**
 * @typedef {'tap'} NoteType
 */

/**
 * @typedef {Object} BeatmapNote
 * @property {number} time_ms
 * @property {number} lane
 * @property {NoteType} type
 * @property {number} [duration_ms]
 */

/**
 * @typedef {Object} BeatmapData
 * @property {string} song_id
 * @property {string} song_title
 * @property {string} artist
 * @property {string} difficulty_id
 * @property {string} difficulty_name
 * @property {number} level
 * @property {string} audio_file
 * @property {number} offset_ms
 * @property {number} [preview_ms]
 * @property {BeatmapNote[]} notes
 */

/**
 * @typedef {Object} SongConfig
 * @property {string} songId
 * @property {string} songTitle
 * @property {string} artist
 * @property {string} audioFile
 * @property {number} offsetMs
 * @property {number} bpm
 * @property {number} durationMs
 * @property {number} [beatsPerMeasure]
 * @property {number} [previewMs]
 * @property {{ onsetsFile?: string }} [analysis]
 * @property {DifficultyConfig[]} difficulties
 */

/**
 * @typedef {Object} DifficultyConfig
 * @property {string} difficultyId
 * @property {string} difficultyName
 * @property {number} level
 * @property {number} laneCount
 * @property {GeneratorConfig[]} generators
 * @property {PostProcessConfig[]} [postProcesses]
 */

/**
 * @typedef {GridGeneratorConfig | OnsetGeneratorConfig} GeneratorConfig
 */

/**
 * @typedef {Object} GridGeneratorConfig
 * @property {'grid'} type
 * @property {number} [startBeat]
 * @property {number} [beatCount]
 * @property {number} [measures]
 * @property {number} [subdivision]
 * @property {string | number[]} [pattern]
 * @property {number[]} laneCycle
 * @property {number} [swingMs]
 * @property {boolean} [rotatePerBeat]
 */

/**
 * @typedef {Object} OnsetGeneratorConfig
 * @property {'fromOnsets'} type
 * @property {number} [startBeat]
 * @property {number} [endBeat]
 * @property {number} [startMs]
 * @property {number} [endMs]
 * @property {number} [maxNotes]
 * @property {number} [takeEvery]
 * @property {number[]} laneCycle
 * @property {number} [minGapMs]
 */

/**
 * @typedef {{ type: 'sortByTime' } | { type: 'trimToDuration' } | { type: 'dedupe' }} PostProcessConfig
 */

/**
 * @typedef {Object} CliOptions
 * @property {string} [songId]
 * @property {string} [configPath]
 * @property {string} [difficultyId]
 * @property {boolean} [overwrite]
 * @property {boolean} [dryRun]
 * @property {number} [preview]
 * @property {boolean} [verbose]
 * @property {boolean} [listOnly]
 * @property {string} [targetSummary]
 */

/**
 * @typedef {Object} AnalysisData
 * @property {number[]} onsets
 * @property {number} [bpm]
 * @property {string} [source]
 */

/**
 * @typedef {Object} GenerationContext
 * @property {SongConfig} song
 * @property {DifficultyConfig} difficulty
 * @property {number} beatIntervalMs
 * @property {AnalysisData | undefined} analysis
 * @property {boolean} verbose
 */

/**
 * @param {string[]} argv
 * @returns {CliOptions}
 */
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
      case 'difficulty':
        options.difficultyId = value;
        if (!rawValue) i += 1;
        break;
      case 'overwrite':
        options.overwrite = true;
        break;
      case 'dry-run':
        options.dryRun = true;
        break;
      case 'preview':
        options.preview = value ? Number(value) : 10;
        if (!rawValue) i += 1;
        break;
      case 'verbose':
        options.verbose = true;
        break;
      case 'list':
        options.listOnly = true;
        break;
      case 'target':
        options.targetSummary = value;
        if (!rawValue) i += 1;
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
  if (options.targetSummary && !options.songId && !options.difficultyId) {
    const [songId, difficultyId] = options.targetSummary.split(':');
    options.songId = songId;
    if (difficultyId) {
      options.difficultyId = difficultyId;
    }
  }
  return options;
}

function printHelp() {
  console.log(`譜面自動生成コマンド\n\n使用例:\n  npm run generate-beatmap -- --song no-mans-world --difficulty easy_auto\n  npm run generate-beatmap -- --target no-mans-world:normal_auto --preview=20\n  npm run generate-beatmap -- --song no-mans-world --list\n\n主要オプション:\n  --song <songId>              音源設定ファイル (assets/song-configs/<songId>.json) を対象にします。\n  --config <path>              任意の設定ファイルを指定します。\n  --difficulty <id>            特定の難易度のみ生成します。\n  --target <songId:difficulty> songId と difficulty を同時に指定するショートカットです。\n  --preview[=N]                生成ノーツの先頭 N 件を表示します (既定 10)。\n  --dry-run                    JSON ファイルを書き出さずに結果のみ確認します。\n  --overwrite                  既存の譜面を上書きします (慎重に使用してください)。\n  --list                       設定ファイル内の難易度一覧を表示します。\n  --verbose                    デバッグログを詳細表示します。\n`);
}

/**
 * @param {string} configPath
 * @returns {Promise<SongConfig>}
 */
async function loadSongConfig(configPath) {
  const raw = await fs.readFile(configPath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * @param {SongConfig} song
 * @returns {Promise<AnalysisData | undefined>}
 */
async function loadAnalysis(song) {
  if (!song.analysis || !song.analysis.onsetsFile) {
    return undefined;
  }
  const analysisPath = path.resolve(__dirname, '..', 'assets', 'audio-analysis', song.analysis.onsetsFile);
  try {
    const raw = await fs.readFile(analysisPath, 'utf-8');
    const json = JSON.parse(raw);
    if (!Array.isArray(json.onsets)) {
      console.warn(`解析ファイルに onsets 配列が見つかりませんでした: ${analysisPath}`);
      return undefined;
    }
    return {
      onsets: json.onsets.filter((value) => Number.isFinite(value)).map((value) => Math.max(0, Math.round(value))).sort((a, b) => a - b),
      bpm: typeof json.bpm === 'number' ? json.bpm : undefined,
      source: json.source
    };
  } catch (error) {
    console.warn(`解析ファイルの読み込みに失敗しました: ${error.message}`);
    return undefined;
  }
}

/**
 * @param {CliOptions} options
 * @returns {string}
 */
function resolveConfigPath(options) {
  if (options.configPath) {
    return path.resolve(options.configPath);
  }
  if (!options.songId) {
    throw new Error('songId を指定してください (--song <songId> または --target <songId:difficulty>)。');
  }
  return path.resolve(__dirname, '..', 'assets', 'song-configs', `${options.songId}.json`);
}

/**
 * @param {SongConfig} song
 * @param {string | undefined} targetId
 * @returns {DifficultyConfig[]}
 */
function resolveDifficulties(song, targetId) {
  if (!targetId) {
    return song.difficulties;
  }
  const matched = song.difficulties.find((item) => item.difficultyId === targetId);
  if (!matched) {
    throw new Error(`difficultyId=${targetId} が設定ファイル内に見つかりませんでした。`);
  }
  return [matched];
}

/**
 * @param {string | number[] | undefined} pattern
 * @param {number} subdivision
 * @returns {number[]}
 */
function patternToFlags(pattern, subdivision) {
  if (!pattern) {
    return new Array(subdivision).fill(1);
  }
  if (typeof pattern === 'string') {
    const digits = pattern.trim();
    if (!digits) {
      return new Array(subdivision).fill(1);
    }
    const values = Array.from(digits).map((char) => (char === '1' ? 1 : 0));
    if (values.length !== subdivision) {
      console.warn(`pattern の長さが subdivision と一致しません。pattern=${digits}, subdivision=${subdivision}。不足分は 0 扱いにします。`);
    }
    const result = new Array(subdivision).fill(0);
    for (let i = 0; i < subdivision; i += 1) {
      result[i] = values[i] ?? 0;
    }
    return result;
  }
  const result = new Array(subdivision).fill(0);
  for (let i = 0; i < subdivision; i += 1) {
    result[i] = pattern[i] ? 1 : 0;
  }
  return result;
}

/**
 * @param {GenerationContext} context
 * @param {GridGeneratorConfig} config
 * @returns {BeatmapNote[]}
 */
function generateGridNotes(context, config) {
  const notes = [];
  const subdivision = Math.max(1, Math.floor(config.subdivision || 1));
  const laneCycle = config.laneCycle.length > 0 ? config.laneCycle : [0];
  const patternFlags = patternToFlags(config.pattern, subdivision);
  const beatIntervalMs = context.beatIntervalMs;
  const beatsPerMeasure = context.song.beatsPerMeasure || 4;
  const startBeat = config.startBeat || 0;
  const beatCount = (() => {
    if (typeof config.beatCount === 'number') {
      return config.beatCount;
    }
    if (typeof config.measures === 'number') {
      return config.measures * beatsPerMeasure;
    }
    const estimatedBeats = Math.floor(context.song.durationMs / beatIntervalMs - startBeat);
    return Math.max(0, estimatedBeats);
  })();
  if (beatCount <= 0) {
    return notes;
  }

  let laneIndex = 0;
  for (let beatOffset = 0; beatOffset < beatCount; beatOffset += 1) {
    if (config.rotatePerBeat && beatOffset > 0) {
      laneIndex = (laneIndex + 1) % laneCycle.length;
    }
    for (let subIndex = 0; subIndex < subdivision; subIndex += 1) {
      if (patternFlags[subIndex] !== 1) {
        continue;
      }
      const absoluteBeat = startBeat + beatOffset + subIndex / subdivision;
      const baseTime = context.song.offsetMs + absoluteBeat * beatIntervalMs;
      const swingMs = config.swingMs || 0;
      const swingOffset = swingMs !== 0 && subIndex % 2 === 1 ? swingMs : 0;
      const timeMs = Math.round(baseTime + swingOffset);
      const lane = laneCycle[laneIndex % laneCycle.length];
      notes.push({ time_ms: timeMs, lane, type: 'tap' });
      if (!config.rotatePerBeat) {
        laneIndex = (laneIndex + 1) % laneCycle.length;
      }
    }
  }

  return notes;
}

/**
 * @param {GenerationContext} context
 * @param {OnsetGeneratorConfig} config
 * @returns {BeatmapNote[]}
 */
function generateOnsetNotes(context, config) {
  if (!context.analysis) {
    console.warn('解析結果が存在しないため fromOnsets ジェネレータをスキップします。');
    return [];
  }
  const onsets = context.analysis.onsets;
  if (onsets.length === 0) {
    console.warn('解析結果の onsets が空だったため fromOnsets ジェネレータをスキップします。');
    return [];
  }
  const laneCycle = config.laneCycle.length > 0 ? config.laneCycle : [0];
  const beatIntervalMs = context.beatIntervalMs;
  const startTimeMs = typeof config.startMs === 'number'
    ? config.startMs
    : typeof config.startBeat === 'number'
      ? context.song.offsetMs + config.startBeat * beatIntervalMs
      : context.song.offsetMs;
  const endTimeMs = typeof config.endMs === 'number'
    ? config.endMs
    : typeof config.endBeat === 'number'
      ? context.song.offsetMs + config.endBeat * beatIntervalMs
      : context.song.offsetMs + context.song.durationMs;

  const selected = [];
  const minGap = config.minGapMs || 0;
  const takeEvery = Math.max(1, config.takeEvery || 1);
  let laneIndex = 0;
  let lastTime = -Infinity;
  let taken = 0;

  for (let index = 0; index < onsets.length; index += 1) {
    if (index % takeEvery !== 0) {
      continue;
    }
    const onsetTime = onsets[index];
    if (onsetTime < startTimeMs || onsetTime > endTimeMs) {
      continue;
    }
    if (onsetTime - lastTime < minGap) {
      continue;
    }
    const lane = laneCycle[laneIndex % laneCycle.length];
    selected.push({ time_ms: Math.round(onsetTime), lane, type: 'tap' });
    laneIndex = (laneIndex + 1) % laneCycle.length;
    lastTime = onsetTime;
    taken += 1;
    if (typeof config.maxNotes === 'number' && taken >= config.maxNotes) {
      break;
    }
  }

  return selected;
}

/**
 * @param {BeatmapNote[]} notes
 * @param {GenerationContext} context
 * @param {PostProcessConfig[] | undefined} configs
 * @returns {BeatmapNote[]}
 */
function applyPostProcesses(notes, context, configs) {
  let result = [...notes];
  const processors = configs || [
    { type: 'dedupe' },
    { type: 'sortByTime' },
    { type: 'trimToDuration' }
  ];

  for (const processor of processors) {
    switch (processor.type) {
      case 'sortByTime':
        result = result
          .slice()
          .sort((a, b) => (a.time_ms !== b.time_ms ? a.time_ms - b.time_ms : a.lane - b.lane));
        break;
      case 'trimToDuration': {
        const limit = context.song.offsetMs + context.song.durationMs;
        result = result.filter((note) => note.time_ms <= limit);
        break;
      }
      case 'dedupe': {
        const unique = new Map();
        for (const note of result) {
          const lane = Math.max(0, Math.min(context.difficulty.laneCount - 1, note.lane));
          const key = `${note.time_ms}:${lane}`;
          if (!unique.has(key)) {
            unique.set(key, { ...note, lane });
          }
        }
        result = Array.from(unique.values());
        break;
      }
      default:
        console.warn(`未対応の後処理です: ${processor.type}`);
        break;
    }
  }

  return result;
}

/**
 * @param {GenerationContext} context
 * @param {BeatmapNote[]} notes
 * @returns {BeatmapData}
 */
function toBeatmapData(context, notes) {
  return {
    song_id: context.song.songId,
    song_title: context.song.songTitle,
    artist: context.song.artist,
    difficulty_id: context.difficulty.difficultyId,
    difficulty_name: context.difficulty.difficultyName,
    level: context.difficulty.level,
    audio_file: context.song.audioFile,
    offset_ms: context.song.offsetMs,
    preview_ms: context.song.previewMs,
    notes
  };
}

/**
 * @param {GenerationContext} context
 * @param {boolean | undefined} overwrite
 * @returns {string}
 */
function determineOutputPath(context, overwrite) {
  const filename = overwrite
    ? `${context.song.songId}_${context.difficulty.difficultyId}.json`
    : `${context.song.songId}_${context.difficulty.difficultyId}.auto.json`;
  return path.resolve(__dirname, '..', 'assets', 'beatmaps', filename);
}

/**
 * @param {string} targetPath
 * @param {BeatmapData} data
 */
async function writeBeatmap(targetPath, data) {
  const source = `${JSON.stringify(data, null, 2)}\n`;
  await fs.writeFile(targetPath, source, 'utf-8');
}

function logPreview(notes, count) {
  const preview = notes.slice(0, count);
  if (preview.length === 0) {
    console.log('プレビュー対象のノーツがありません。');
    return;
  }
  console.log(`先頭 ${preview.length} 件のノーツ:`);
  for (const note of preview) {
    console.log(`  t=${note.time_ms}ms lane=${note.lane}`);
  }
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (!options.songId && !options.configPath) {
      throw new Error('--song または --config を指定してください。`npm run generate-beatmap -- --help` を参照してください。');
    }
    const configPath = resolveConfigPath(options);
    const song = await loadSongConfig(configPath);

    if (options.listOnly) {
      console.log(`対象楽曲: ${song.songTitle} / ${song.songId}`);
      for (const difficulty of song.difficulties) {
        console.log(`- ${difficulty.difficultyId} (name: ${difficulty.difficultyName}, level: ${difficulty.level})`);
      }
      return;
    }

    const analysis = await loadAnalysis(song);
    const difficulties = resolveDifficulties(song, options.difficultyId);
    const beatIntervalMs = 60000 / song.bpm;

    for (const difficulty of difficulties) {
      const context = {
        song,
        difficulty,
        beatIntervalMs,
        analysis,
        verbose: Boolean(options.verbose)
      };

      const generatedNotes = [];
      for (const generator of difficulty.generators) {
        if (generator.type === 'grid') {
          const notes = generateGridNotes(context, generator);
          if (context.verbose) {
            console.log(`grid ジェネレータで ${notes.length} 件生成しました。`);
          }
          generatedNotes.push(...notes);
        } else if (generator.type === 'fromOnsets') {
          const notes = generateOnsetNotes(context, generator);
          if (context.verbose) {
            console.log(`fromOnsets ジェネレータで ${notes.length} 件生成しました。`);
          }
          generatedNotes.push(...notes);
        } else {
          console.warn(`未対応のジェネレータ種別をスキップします: ${generator.type}`);
        }
      }

      const processedNotes = applyPostProcesses(generatedNotes, context, difficulty.postProcesses);
      const beatmap = toBeatmapData(context, processedNotes);

      if (options.preview) {
        logPreview(processedNotes, options.preview);
      }

      if (options.dryRun) {
        console.log(`[dry-run] ${difficulty.difficultyId} で ${processedNotes.length} 件のノーツを生成しました。`);
        continue;
      }

      const outputPath = determineOutputPath(context, options.overwrite);
      await writeBeatmap(outputPath, beatmap);
      console.log(`譜面を生成しました: ${outputPath} (ノーツ数: ${processedNotes.length})`);
    }
  } catch (error) {
    console.error('譜面生成に失敗しました:', error);
    process.exit(1);
  }
}

main();
