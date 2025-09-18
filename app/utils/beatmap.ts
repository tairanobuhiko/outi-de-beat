import { COMBO_BONUS_RATIO, COMBO_BONUS_STEP, JUDGMENT_WINDOWS_MS, SCORE_PER_JUDGMENT } from '@/constants/score';
import { BeatmapData, BeatmapNote, Judgment } from '@/types/beatmap';

export interface ParsedBeatmap extends BeatmapData {
  notes: BeatmapNote[];
}

// 日本語コメント: Metro が返すモジュールから譜面データを正規化する。
export function parseBeatmap(moduleData: any): ParsedBeatmap {
  if (!moduleData || typeof moduleData !== 'object') {
    throw new Error('譜面データの形式が不正です。');
  }

  const requiredKeys: Array<keyof BeatmapData> = [
    'song_id',
    'song_title',
    'artist',
    'difficulty_id',
    'difficulty_name',
    'level',
    'audio_file',
    'offset_ms',
    'notes'
  ];

  for (const key of requiredKeys) {
    if (!(key in moduleData)) {
      throw new Error(`譜面データに ${key} が存在しません。`);
    }
  }

  const notes = [...(moduleData.notes as BeatmapNote[])].sort((a, b) => a.time_ms - b.time_ms);

  return {
    ...(moduleData as BeatmapData),
    notes
  };
}

export function determineJudgment(deltaMs: number): Judgment {
  const abs = Math.abs(deltaMs);
  if (abs <= JUDGMENT_WINDOWS_MS.PERFECT) {
    return 'PERFECT';
  }
  if (abs <= JUDGMENT_WINDOWS_MS.GREAT) {
    return 'GREAT';
  }
  if (abs <= JUDGMENT_WINDOWS_MS.GOOD) {
    return 'GOOD';
  }
  return 'MISS';
}

export function buildEmptyJudgmentMap(): Record<Judgment, number> {
  return {
    PERFECT: 0,
    GREAT: 0,
    GOOD: 0,
    MISS: 0
  };
}

export function getComboMultiplier(combo: number): number {
  const steps = Math.floor(combo / COMBO_BONUS_STEP);
  return 1 + steps * COMBO_BONUS_RATIO;
}

export function calculateJudgmentScore(judgment: Judgment, combo: number): number {
  const base = SCORE_PER_JUDGMENT[judgment];
  if (!base) {
    return 0;
  }
  return Math.round(base * getComboMultiplier(combo));
}
