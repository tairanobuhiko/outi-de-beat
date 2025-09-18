import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RootStackParamList } from '@/navigation/types';
import { useGame } from '@/providers/GameProvider';

export type TitleScreenProps = NativeStackScreenProps<RootStackParamList, 'Title'>;

export function TitleScreen({ navigation }: TitleScreenProps) {
  const { refreshManifest } = useGame();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>おうちでBEAT</Text>
      <Text style={styles.caption}>音とタップで楽しむリズムゲーム</Text>
      <Pressable
        style={styles.primaryButton}
        onPress={() => {
          refreshManifest();
          navigation.navigate('SongSelect');
        }}
      >
        <Text style={styles.primaryLabel}>スタート</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05060b',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 24
  },
  title: {
    fontSize: 40,
    color: '#ffffff',
    fontWeight: '700'
  },
  caption: {
    fontSize: 16,
    color: '#b0b5c9'
  },
  primaryButton: {
    backgroundColor: '#3f8cff',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 999
  },
  primaryLabel: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600'
  }
});
