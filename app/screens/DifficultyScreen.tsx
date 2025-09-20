import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '@/navigation/types';
import { useGame } from '@/providers/GameProvider';

export type DifficultyScreenProps = NativeStackScreenProps<RootStackParamList, 'Difficulty'>;

export function DifficultyScreen({ route, navigation }: DifficultyScreenProps) {
  const { songId } = route.params;
  const { songs, setSelectedDifficulty, getHighScore } = useGame();
  const song = songs.find((item) => item.songId === songId);
  const insets = useSafeAreaInsets();
  const containerStyle = [
    styles.container,
    { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }
  ];

  if (!song) {
    return (
      <View style={containerStyle}>
        <Text style={styles.error}>楽曲情報を読み込めませんでした。</Text>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Text style={styles.header}>{song.title}</Text>
      <Text style={styles.artist}>{song.artist}</Text>
      {song.beatmaps.map((beatmap) => {
        const highScore = getHighScore(song.songId, beatmap.difficultyId);
        return (
          <Pressable
            key={beatmap.difficultyId}
            style={styles.card}
            onPress={() => {
              setSelectedDifficulty(beatmap.difficultyId);
              navigation.navigate('Gameplay', { songId: song.songId, difficultyId: beatmap.difficultyId });
            }}
          >
            <View>
              <Text style={styles.difficulty}>{beatmap.difficultyName}</Text>
              <Text style={styles.level}>Lv.{beatmap.level}</Text>
            </View>
            {highScore ? (
              <View style={styles.highScore}>
                <Text style={styles.highScoreLabel}>ベストスコア</Text>
                <Text style={styles.highScoreValue}>{highScore.score.toLocaleString('ja-JP')}</Text>
              </View>
            ) : (
              <Text style={styles.highScoreLabel}>未プレイ</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05060b',
    padding: 24,
    gap: 16
  },
  header: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '700'
  },
  artist: {
    fontSize: 16,
    color: '#b0b5c9'
  },
  card: {
    backgroundColor: '#131525',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  difficulty: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600'
  },
  level: {
    fontSize: 14,
    color: '#8c93b7'
  },
  highScore: {
    alignItems: 'flex-end'
  },
  highScoreLabel: {
    fontSize: 12,
    color: '#8c93b7'
  },
  highScoreValue: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600'
  },
  error: {
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 200
  }
});
