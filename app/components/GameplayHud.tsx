import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Judgment } from '@/types/beatmap';

interface GameplayHudProps {
  score: number;
  combo: number;
  maxCombo: number;
  judgments: Record<Judgment, number>;
  lastJudgment?: Judgment;
}

export const GameplayHud = memo(({ score, combo, maxCombo, judgments, lastJudgment }: GameplayHudProps) => {
  // 日本語コメント: 得点やコンボを上部に表示する。
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.label}>SCORE</Text>
        <Text style={styles.score}>{score.toLocaleString('ja-JP')}</Text>
      </View>
      <View style={styles.centerBlock}>
        <Text style={styles.label}>COMBO</Text>
        <Text style={styles.combo}>{combo}</Text>
        <Text style={styles.maxCombo}>MAX {maxCombo}</Text>
      </View>
      <View style={styles.rightBlock}>
        <Text style={styles.label}>JUDGMENT</Text>
        <Text style={[styles.judgment, judgmentColors[lastJudgment ?? 'PERFECT']]}>
          {lastJudgment ?? '-'}
        </Text>
        <View style={styles.summaryRow}>
          <Text style={[styles.summary, judgmentColors.PERFECT]}>P {judgments.PERFECT}</Text>
          <Text style={[styles.summary, judgmentColors.GREAT]}>G {judgments.GREAT}</Text>
          <Text style={[styles.summary, judgmentColors.GOOD]}>g {judgments.GOOD}</Text>
          <Text style={[styles.summary, judgmentColors.MISS]}>M {judgments.MISS}</Text>
        </View>
      </View>
    </View>
  );
});

const judgmentColors: Record<Judgment, { color: string }> = {
  PERFECT: { color: '#7cfc8a' },
  GREAT: { color: '#4bc0ff' },
  GOOD: { color: '#ffd966' },
  MISS: { color: '#ff6b6b' }
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#05060b'
  },
  label: {
    color: '#8c93b7',
    fontSize: 12,
    letterSpacing: 1
  },
  score: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700'
  },
  centerBlock: {
    alignItems: 'center'
  },
  combo: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: '700'
  },
  maxCombo: {
    color: '#8c93b7',
    fontSize: 12,
    marginTop: 4
  },
  rightBlock: {
    alignItems: 'flex-end'
  },
  judgment: {
    fontSize: 28,
    fontWeight: '700'
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  summary: {
    fontSize: 12,
    fontWeight: '600'
  }
});
