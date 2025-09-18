import { Judgment } from '@/types/beatmap';

export const JUDGMENT_WINDOWS_MS: Record<Exclude<Judgment, 'MISS'>, number> = {
  PERFECT: 25,
  GREAT: 60,
  GOOD: 100
};

export const SCORE_PER_JUDGMENT: Record<Judgment, number> = {
  PERFECT: 1000,
  GREAT: 700,
  GOOD: 300,
  MISS: 0
};

export const COMBO_BONUS_STEP = 50;
export const COMBO_BONUS_RATIO = 0.02;
