import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RootStackParamList } from '@/navigation/types';
import { useGame } from '@/providers/GameProvider';

export type ResultScreenProps = NativeStackScreenProps<RootStackParamList, 'Result'>;

export function ResultScreen({ route, navigation }: ResultScreenProps) {
  const { songId, difficultyId, score, judgments, maxCombo } = route.params;
  const { getHighScore } = useGame();
  const highScore = getHighScore(songId, difficultyId);
  const isNewRecord = highScore ? highScore.score === score : false;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>リザルト</Text>
      <Text style={[styles.score, isNewRecord && styles.scoreHighlight]}>{score.toLocaleString('ja-JP')}</Text>
      {isNewRecord && <Text style={styles.newRecord}>NEW RECORD!</Text>}
      <View style={styles.detailCard}>
        <Text style={styles.detailTitle}>判定内訳</Text>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>PERFECT</Text><Text style={styles.detailValue}>{judgments.PERFECT}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>GREAT</Text><Text style={styles.detailValue}>{judgments.GREAT}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>GOOD</Text><Text style={styles.detailValue}>{judgments.GOOD}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>MISS</Text><Text style={styles.detailValue}>{judgments.MISS}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>MAX COMBO</Text><Text style={styles.detailValue}>{maxCombo}</Text></View>
      </View>
      <View style={styles.actions}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.replace('Gameplay', { songId, difficultyId })}
        >
          <Text style={styles.primaryLabel}>もう一度プレイ</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('SongSelect')}
        >
          <Text style={styles.secondaryLabel}>楽曲選択に戻る</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05060b',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 24
  },
  title: {
    fontSize: 32,
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
    backgroundColor: '#131525',
    borderRadius: 24,
    padding: 24,
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
