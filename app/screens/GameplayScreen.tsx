import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { GameLane } from '@/components/GameLane';
import { GameplayHud } from '@/components/GameplayHud';
import { JUDGMENT_WINDOWS_MS } from '@/constants/score';
import { buildEmptyJudgmentMap, calculateJudgmentScore, determineJudgment, parseBeatmap } from '@/utils/beatmap';
import { RootStackParamList } from '@/navigation/types';
import { useGame } from '@/providers/GameProvider';
import { Judgment } from '@/types/beatmap';

export type GameplayScreenProps = NativeStackScreenProps<RootStackParamList, 'Gameplay'>;

type RuntimeStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'finished' | 'error';

interface RuntimeNote {
  id: string;
  lane: number;
  hitTime: number;
  status: 'pending' | 'hit' | 'missed';
}

const LANE_COUNT = 4;
const VISIBLE_WINDOW_MS = 2200;
const POST_HIT_WINDOW_MS = 120;

export function GameplayScreen({ route, navigation }: GameplayScreenProps) {
  const { songId, difficultyId } = route.params;
  const { songs, latencyOffsetMs, recordResult } = useGame();
  const song = songs.find((item) => item.songId === songId);
  const beatmapEntry = song?.beatmaps.find((item) => item.difficultyId === difficultyId);

  const [status, setStatus] = useState<RuntimeStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [laneHeight, setLaneHeight] = useState(0);
  const [judgments, setJudgments] = useState(() => buildEmptyJudgmentMap());
  const [lastJudgment, setLastJudgment] = useState<Judgment | undefined>();
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [notes, setNotes] = useState<RuntimeNote[]>([]);

  const soundRef = useRef<Audio.Sound | null>(null);
  const notesRef = useRef<RuntimeNote[]>([]);
  const finishedRef = useRef(false);
  const latencyRef = useRef(latencyOffsetMs);
  const finishGameRef = useRef<(() => Promise<void>) | null>(null);
  const checkAutoMissesRef = useRef<((effectiveTime: number) => void) | null>(null);
  const playbackUpdateHandlerRef = useRef<(status: AVPlaybackStatus) => void>();

  useEffect(() => {
    latencyRef.current = latencyOffsetMs;
  }, [latencyOffsetMs]);

  const finishGame = useCallback(async () => {
    if (finishedRef.current) {
      return;
    }
    finishedRef.current = true;
    setStatus('finished');
    await soundRef.current?.stopAsync().catch(() => undefined);

    const payload = {
      score,
      maxCombo,
      judgments
    };

    void recordResult(songId, difficultyId, payload).catch((error) => {
      console.warn('結果保存に失敗しました', error);
    });

    navigation.replace('Result', {
      songId,
      difficultyId,
      score: payload.score,
      judgments: payload.judgments,
      maxCombo: payload.maxCombo
    });
  }, [difficultyId, judgments, maxCombo, navigation, recordResult, score, songId]);

  const checkCompletion = useCallback(() => {
    if (finishedRef.current) {
      return;
    }
    const remaining = notesRef.current.some((note) => note.status === 'pending');
    if (!remaining) {
      void finishGame();
    }
  }, [finishGame]);

  const applyJudgment = useCallback((judgment: Judgment, noteIndex?: number) => {
    if (typeof noteIndex === 'number') {
      const note = notesRef.current[noteIndex];
      if (note && note.status === 'pending') {
        note.status = judgment === 'MISS' ? 'missed' : 'hit';
        setNotes([...notesRef.current]);
      }
    }

    setJudgments((prev) => ({
      ...prev,
      [judgment]: prev[judgment] + 1
    }));
    setLastJudgment(judgment);

    setCombo((prevCombo) => {
      const nextCombo = judgment === 'PERFECT' || judgment === 'GREAT' ? prevCombo + 1 : 0;
      setScore((prevScore) => prevScore + calculateJudgmentScore(judgment, nextCombo));
      setMaxCombo((prevMax) => (nextCombo > prevMax ? nextCombo : prevMax));
      return nextCombo;
    });

    if (judgment === 'PERFECT') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (judgment === 'GREAT') {
      void Haptics.selectionAsync();
    }

    checkCompletion();
  }, [checkCompletion]);

  const checkAutoMisses = useCallback(
    (effectiveTime: number) => {
      notesRef.current.forEach((note, index) => {
        if (note.status !== 'pending') {
          return;
        }
        const targetTime = note.hitTime;
        const delta = effectiveTime - targetTime;
        if (delta > JUDGMENT_WINDOWS_MS.GOOD) {
          applyJudgment('MISS', index);
        }
      });
    },
    [applyJudgment]
  );

  useEffect(() => {
    finishGameRef.current = finishGame;
  }, [finishGame]);

  useEffect(() => {
    checkAutoMissesRef.current = checkAutoMisses;
  }, [checkAutoMisses]);

  const handlePlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        return;
      }

      if (status.didJustFinish && !finishedRef.current) {
        const handler = finishGameRef.current;
        if (handler) {
          void handler();
        }
        return;
      }

      const position = status.positionMillis ?? 0;
      setPlaybackPosition(position);
      const checker = checkAutoMissesRef.current;
      if (checker) {
        checker(position + latencyRef.current);
      }
    },
    [setPlaybackPosition]
  );

  useEffect(() => {
    playbackUpdateHandlerRef.current = handlePlaybackStatusUpdate;
  }, [handlePlaybackStatusUpdate]);

  const handleLanePress = useCallback(
    (laneIndex: number) => {
      if (status !== 'playing') {
        return;
      }
      const effectiveTime = playbackPosition + latencyRef.current;
      let bestIndex: number | undefined;
      let bestDelta = Number.POSITIVE_INFINITY;

      notesRef.current.forEach((note, index) => {
        if (note.lane !== laneIndex || note.status !== 'pending') {
          return;
        }
        const targetTime = note.hitTime;
        const delta = effectiveTime - targetTime;
        const absDelta = Math.abs(delta);
        if (absDelta <= JUDGMENT_WINDOWS_MS.GOOD && absDelta < Math.abs(bestDelta)) {
          bestDelta = delta;
          bestIndex = index;
        }
      });

      if (typeof bestIndex === 'number') {
        const judgment = determineJudgment(bestDelta);
        applyJudgment(judgment, bestIndex);
      }
    },
    [applyJudgment, playbackPosition, status]
  );

  useEffect(() => {
    if (!song || !beatmapEntry) {
      setStatus('error');
      setErrorMessage('譜面を読み込めませんでした。');
      return;
    }

    setStatus('loading');
    finishedRef.current = false;
    setPlaybackPosition(0);

    const setup = async () => {
      try {
        const beatmap = parseBeatmap(beatmapEntry.module);
        notesRef.current = beatmap.notes.map((note, index) => ({
          id: `${beatmap.song_id}-${beatmap.difficulty_id}-${index}`,
          lane: note.lane,
          hitTime: note.time_ms + beatmap.offset_ms,
          status: 'pending'
        }));
        setNotes([...notesRef.current]);

        const { sound } = await Audio.Sound.createAsync(
          song.audioModule,
          {
            shouldPlay: false,
            progressUpdateIntervalMillis: 16
          },
          (status) => playbackUpdateHandlerRef.current?.(status)
        );
        soundRef.current = sound;
        await sound.setProgressUpdateIntervalAsync(16);
        sound.setOnPlaybackStatusUpdate(handlePlaybackStatusUpdate);
        setStatus('ready');
      } catch (error) {
        console.error(error);
        setStatus('error');
        setErrorMessage('ゲームの初期化に失敗しました。');
      }
    };

    setup();

    return () => {
      finishedRef.current = true;
      soundRef.current?.stopAsync().catch(() => undefined);
      soundRef.current?.unloadAsync().catch(() => undefined);
      soundRef.current = null;
    };
  }, [song, beatmapEntry]);

  const startGame = useCallback(async () => {
    if (!soundRef.current || status !== 'ready') {
      return;
    }
    await soundRef.current.playFromPositionAsync(0);
    setStatus('playing');
  }, [status]);

  useFocusEffect(
    useCallback(() => {
      if (status === 'ready') {
        startGame();
      }
    }, [startGame, status])
  );

  useEffect(() => {
    if (status === 'ready') {
      startGame();
    }
  }, [status, startGame]);

  useEffect(() => {
    return () => {
      finishedRef.current = true;
      soundRef.current?.stopAsync().catch(() => undefined);
      soundRef.current?.unloadAsync().catch(() => undefined);
    };
  }, []);

  const lanes = useMemo(() => {
    const effectiveTime = playbackPosition + latencyRef.current;
    const availableHeight = Math.max(laneHeight - 120, 0);
    const buildLane = (lane: number) => {
      return notes
        .filter((note) => note.lane === lane)
        .map((note) => {
          const timeUntilHit = note.hitTime - effectiveTime;
          if (note.status === 'pending') {
            if (timeUntilHit < -POST_HIT_WINDOW_MS || timeUntilHit > VISIBLE_WINDOW_MS) {
              return undefined;
            }
          } else if (timeUntilHit < -POST_HIT_WINDOW_MS) {
            return undefined;
          }
          const clamped = Math.min(Math.max(1 - timeUntilHit / VISIBLE_WINDOW_MS, 0), 1);
          const y = clamped * availableHeight;
          return {
            id: note.id,
            status: note.status,
            y
          };
        })
        .filter((value): value is { id: string; status: 'pending' | 'hit' | 'missed'; y: number } => Boolean(value));
    };

    return Array.from({ length: LANE_COUNT }, (_, laneIndex) => buildLane(laneIndex));
  }, [laneHeight, playbackPosition, notes]);

  if (status === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{errorMessage ?? 'エラーが発生しました。'}</Text>
      </View>
    );
  }

  if (!song || !beatmapEntry) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>譜面情報が見つかりませんでした。</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GameplayHud
        score={score}
        combo={combo}
        maxCombo={maxCombo}
        judgments={judgments}
        lastJudgment={lastJudgment}
      />
      <View
        style={styles.playfield}
        onLayout={(event) => {
          setLaneHeight(event.nativeEvent.layout.height);
        }}
      >
        <View style={styles.laneContainer}>
          {Array.from({ length: LANE_COUNT }, (_, laneIndex) => (
            <GameLane
              key={laneIndex}
              laneIndex={laneIndex}
              notes={lanes[laneIndex] ?? []}
              onPress={() => handleLanePress(laneIndex)}
            />
          ))}
        </View>
      </View>
      {status === 'loading' && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#ffffff" />
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05060b'
  },
  playfield: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 32
  },
  laneContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 8
  },
  centered: {
    flex: 1,
    backgroundColor: '#05060b',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  error: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center'
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#05060baa',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 12
  }
});
