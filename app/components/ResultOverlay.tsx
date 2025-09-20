import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Judgment } from '@/types/beatmap';

interface ResultOverlayProps {
  score: number;
  maxCombo: number;
  judgments: Record<Judgment, number>;
  isNewRecord: boolean;
  onReplay: () => void;
  onReturn: () => void;
}

export const ResultOverlay = memo(({ score, maxCombo, judgments, isNewRecord, onReplay, onReturn }: ResultOverlayProps) => {
  const insets = useSafeAreaInsets();
  // 日本語コメント: プレイ終了時の結果をオーバーレイ表示し、次のアクションを選択できるようにする。
  return (
    <View style={[styles.overlay, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.panel}>
        <Text style={styles.title}>リザルト</Text>
        <Text style={[styles.score, isNewRecord && styles.scoreHighlight]}>{score.toLocaleString('ja-JP')}</Text>
        {isNewRecord && <Text style={styles.newRecord}>NEW RECORD!</Text>}
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>判定内訳</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>PERFECT</Text>
            <Text style={styles.detailValue}>{judgments.PERFECT}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>GREAT</Text>
            <Text style={styles.detailValue}>{judgments.GREAT}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>GOOD</Text>
            <Text style={styles.detailValue}>{judgments.GOOD}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>MISS</Text>
            <Text style={styles.detailValue}>{judgments.MISS}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>MAX COMBO</Text>
            <Text style={styles.detailValue}>{maxCombo}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={onReplay} accessibilityLabel="もう一度プレイする">
            <Text style={styles.primaryLabel}>もう一度プレイする</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={onReturn} accessibilityLabel="楽曲選択へ戻る">
            <Text style={styles.secondaryLabel}>楽曲選択へもどる</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#05060bd9',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#131525',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 24
  },
  title: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: '700'
  },
  score: {
    fontSize: 48,
    color: '#ffffff',
    fontWeight: '700'
  },
  scoreHighlight: {
    color: '#7cfc8a'
  },
  newRecord: {
    color: '#7cfc8a',
    fontWeight: '600'
  },
  detailCard: {
    width: '100%',
    backgroundColor: '#05060b',
    borderRadius: 16,
    padding: 20,
    gap: 12
  },
  detailTitle: {
    color: '#8c93b7',
    fontSize: 14
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  detailLabel: {
    color: '#ffffff',
    fontSize: 16
  },
  detailValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  actions: {
    width: '100%',
    gap: 12
  },
  primaryButton: {
    backgroundColor: '#3f8cff',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center'
  },
  primaryLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  secondaryButton: {
    borderColor: '#3f8cff',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center'
  },
  secondaryLabel: {
    color: '#3f8cff',
    fontSize: 16,
    fontWeight: '600'
  }
});

