import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { RootStackParamList } from '@/navigation/types';
import { useGame } from '@/providers/GameProvider';

export type SongSelectScreenProps = NativeStackScreenProps<RootStackParamList, 'SongSelect'>;

export function SongSelectScreen({ navigation }: SongSelectScreenProps) {
  const { songs, setSelectedSong, latencyOffsetMs, updateLatencyOffset } = useGame();

  return (
    <View style={styles.container}>
      <Text style={styles.header}>楽曲を選択してください</Text>
      <View style={styles.calibrationCard}>
        <View>
          <Text style={styles.calibrationTitle}>キャリブレーション</Text>
          <Text style={styles.calibrationValue}>{latencyOffsetMs}ms</Text>
          <Text style={styles.calibrationHint}>タップタイミングが遅い／早い場合はこちらを調整してください。</Text>
        </View>
        <View style={styles.calibrationButtons}>
          <Pressable
            style={styles.calibrationButton}
            onPress={() => void updateLatencyOffset(Math.max(-150, latencyOffsetMs - 5))}
          >
            <Text style={styles.calibrationButtonLabel}>-5ms</Text>
          </Pressable>
          <Pressable
            style={styles.calibrationButton}
            onPress={() => void updateLatencyOffset(Math.min(150, latencyOffsetMs + 5))}
          >
            <Text style={styles.calibrationButtonLabel}>+5ms</Text>
          </Pressable>
        </View>
      </View>
      <FlatList
        data={songs}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.songId}
        renderItem={({ item }) => (
          <Pressable
            style={styles.songCard}
            onPress={() => {
              setSelectedSong(item.songId);
              navigation.navigate('Difficulty', { songId: item.songId });
            }}
          >
            <Text style={styles.songTitle}>{item.title}</Text>
            <Text style={styles.songArtist}>{item.artist}</Text>
            <Text style={styles.difficultyCount}>{item.beatmaps.length}種類の難易度</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>譜面がありません。`npm run prepare` を実行してください。</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05060b',
    padding: 24
  },
  header: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 16
  },
  calibrationCard: {
    backgroundColor: '#131525',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  calibrationTitle: {
    color: '#8c93b7',
    fontSize: 12
  },
  calibrationValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
    marginVertical: 4
  },
  calibrationHint: {
    color: '#8c93b7',
    fontSize: 12,
    maxWidth: 200
  },
  calibrationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  calibrationButton: {
    backgroundColor: '#3f8cff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16
  },
  calibrationButtonLabel: {
    color: '#ffffff',
    fontWeight: '600'
  },
  listContent: {
    paddingBottom: 32
  },
  songCard: {
    backgroundColor: '#131525',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12
  },
  songTitle: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '600'
  },
  songArtist: {
    fontSize: 14,
    color: '#b0b5c9',
    marginTop: 4
  },
  difficultyCount: {
    color: '#8c93b7',
    fontSize: 12,
    marginTop: 8
  },
  empty: {
    color: '#b0b5c9',
    textAlign: 'center',
    marginTop: 40
  }
});
