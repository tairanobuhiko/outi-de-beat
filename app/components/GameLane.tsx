import { memo, useCallback } from 'react';
import { GestureResponderEvent, StyleSheet, View } from 'react-native';

interface VisibleNote {
  id: string;
  y: number;
  status: 'pending' | 'hit' | 'missed';
}

interface GameLaneProps {
  laneIndex: number;
  notes: VisibleNote[];
  onPress: () => void;
}

export const GameLane = memo(({ notes, onPress }: GameLaneProps) => {
  // 日本語コメント: Lane 全体でタップを受け取り、マルチタッチでも即座に判定する。
  const handleTouchStart = useCallback((event: GestureResponderEvent) => {
    if (event.nativeEvent.touches.length > 0) {
      onPress();
    }
  }, [onPress]);

  return (
    <View
      style={styles.lane}
      onTouchStart={handleTouchStart}
      onStartShouldSetResponder={() => true}
    >
      {notes.map((note) => (
        <View
          key={note.id}
          style={[
            styles.note,
            { top: note.y },
            note.status === 'hit' && styles.noteHit,
            note.status === 'missed' && styles.noteMiss
          ]}
        />
      ))}
      <View style={styles.judgmentLine} />
    </View>
  );
});

const styles = StyleSheet.create({
  lane: {
    flex: 1,
    backgroundColor: '#0d1020',
    borderRadius: 16,
    marginHorizontal: 4,
    overflow: 'hidden',
    position: 'relative'
  },
  note: {
    width: '80%',
    height: 24,
    backgroundColor: '#4bc0ff',
    borderRadius: 12,
    alignSelf: 'center',
    position: 'absolute'
  },
  noteHit: {
    backgroundColor: '#7cfc8a'
  },
  noteMiss: {
    backgroundColor: '#ff6b6b'
  },
  judgmentLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 40,
    height: 4,
    backgroundColor: '#ffffff33'
  }
});
