import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameLane } from '@/components/GameLane';
import { GameplayHud } from '@/components/GameplayHud';
import { ResultOverlay } from '@/components/ResultOverlay';
import { getSongConfig } from '@/constants/songConfigs';
import { JUDGMENT_WINDOWS_MS } from '@/constants/score';
import { buildEmptyJudgmentMap, calculateJudgmentScore, determineJudgment, parseBeatmap } from '@/utils/beatmap';
import { RootStackParamList } from '@/navigation/types';
import { GameResultPayload, useGame } from '@/providers/GameProvider';
import { Judgment } from '@/types/beatmap';

export type GameplayScreenProps = NativeStackScreenProps<RootStackParamList, 'Gameplay'>;

type RuntimeStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'finished' | 'error';

interface RuntimeNote {
  id: string;
  lane: number;
  hitTime: number;
  status: 'pending' | 'hit' | 'missed';
}

interface ResultState extends GameResultPayload {
  isNewRecord: boolean;
}

const LANE_COUNT = 4;
const VISIBLE_WINDOW_MS = 2200;
const POST_HIT_WINDOW_MS = 120;
const TAP_SOUND_POOL_INITIAL = 3;
const TAP_SOUND_POOL_MAX = 6;
const SONG_COMPLETION_GRACE_MS = 750;
const TAP_SOUND_MODULE = require('../../assets/audio/fx/tamp.wav') as number;
const RESULT_SOUND_MODULE = require('../../assets/audio/fx/applause1.mp3') as number;

export function GameplayScreen({ route, navigation }: GameplayScreenProps) {
  const { songId, difficultyId } = route.params;
  const { songs, latencyOffsetMs, recordResult, getHighScore } = useGame();
  const song = songs.find((item) => item.songId === songId);
  const beatmapEntry = song?.beatmaps.find((item) => item.difficultyId === difficultyId);
  const insets = useSafeAreaInsets();
  const songConfig = useMemo(() => getSongConfig(songId), [songId]);

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
  const [resultData, setResultData] = useState<ResultState | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const tapSoundPoolRef = useRef<Audio.Sound[]>([]);
  const tapSoundBusyRef = useRef<boolean[]>([]);
  const tapFxMountedRef = useRef(true);
  const resultSoundRef = useRef<Audio.Sound | null>(null);
  const notesRef = useRef<RuntimeNote[]>([]);
  const finishedRef = useRef(false);
  const latencyRef = useRef(latencyOffsetMs);
  const finishGameRef = useRef<(() => Promise<void>) | null>(null);
  const checkAutoMissesRef = useRef<((effectiveTime: number) => void) | null>(null);
  const playbackUpdateHandlerRef = useRef<(status: AVPlaybackStatus) => void>();
  const fallbackTimerRef = useRef<number | null>(null);
  const startTimestampRef = useRef<number | null>(null);
  const expectedSongEndPosition = useMemo(() => {
    if (!songConfig) {
      return undefined;
    }
    const baseOffset = typeof songConfig.offsetMs === 'number' ? songConfig.offsetMs : 0;
    return baseOffset + songConfig.durationMs;
  }, [songConfig]);

  const createTapSoundInstance = useCallback(async (index: number) => {
    const { sound } = await Audio.Sound.createAsync(TAP_SOUND_MODULE, {
      shouldPlay: false
    });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) {
        return;
      }
      if (status.didJustFinish) {
        tapSoundBusyRef.current[index] = false;
        void sound.setPositionAsync(0).catch(() => undefined);
      }
    });
    return sound;
  }, []);

  useEffect(() => {
    latencyRef.current = latencyOffsetMs;
  }, [latencyOffsetMs]);

  useEffect(() => {
    tapFxMountedRef.current = true;

    const initializeTapPool = async () => {
      const pool: Audio.Sound[] = [];
      const busy: boolean[] = [];
      for (let index = 0; index < TAP_SOUND_POOL_INITIAL; index += 1) {
        try {
          const instance = await createTapSoundInstance(index);
          if (!tapFxMountedRef.current) {
            await instance.unloadAsync().catch(() => undefined);
            return;
          }
          pool.push(instance);
          busy.push(false);
        } catch (error) {
          console.warn('タップ効果音の初期化に失敗しました', error);
          break;
        }
      }
      if (!tapFxMountedRef.current) {
        await Promise.all(pool.map((sound) => sound.unloadAsync().catch(() => undefined)));
        return;
      }
      tapSoundPoolRef.current = pool;
      tapSoundBusyRef.current = busy;
    };

    const loadResultFx = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(RESULT_SOUND_MODULE, {
          shouldPlay: false
        });
        if (!tapFxMountedRef.current) {
          await sound.unloadAsync().catch(() => undefined);
          return;
        }
        resultSoundRef.current = sound;
      } catch (error) {
        console.warn('リザルト効果音の読み込みに失敗しました', error);
      }
    };

    void initializeTapPool();
    void loadResultFx();

    return () => {
      tapFxMountedRef.current = false;
      const pool = tapSoundPoolRef.current;
      tapSoundPoolRef.current = [];
      tapSoundBusyRef.current = [];
      pool.forEach((sound) => {
        sound.setOnPlaybackStatusUpdate(undefined);
        void sound.unloadAsync().catch(() => undefined);
      });
      if (resultSoundRef.current) {
        resultSoundRef.current.setOnPlaybackStatusUpdate(undefined);
        void resultSoundRef.current.unloadAsync().catch(() => undefined);
        resultSoundRef.current = null;
      }
    };
  }, [createTapSoundInstance]);

  const finishGame = useCallback(async () => {
    if (finishedRef.current) {
      return;
    }
    finishedRef.current = true;
    setStatus('finished');
    if (fallbackTimerRef.current !== null) {
      clearInterval(fallbackTimerRef.current as unknown as number);
      fallbackTimerRef.current = null;
      startTimestampRef.current = null;
    }
    await soundRef.current?.stopAsync().catch(() => undefined);

    const summary: GameResultPayload['judgments'] = { ...judgments };
    const payload: GameResultPayload = {
      score,
      maxCombo,
      judgments: summary
    };
    const previousHighScore = getHighScore(songId, difficultyId);
    const isNewRecord = !previousHighScore || payload.score >= previousHighScore.score;

    setResultData({ ...payload, isNewRecord });

    const applause = resultSoundRef.current;
    if (applause) {
      void applause.replayAsync().catch(() => undefined);
    }

    void recordResult(songId, difficultyId, payload).catch((error) => {
      console.warn('結果保存に失敗しました', error);
    });
  }, [difficultyId, getHighScore, judgments, maxCombo, recordResult, score, songId]);

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
      console.log('DEBUG playback status:', { position, isPlaying: (status as any).isPlaying, didJustFinish: status.didJustFinish });

      // If we had a fallback timer running (because audio was buffering),
      // stop it once the audio reports a real position/isPlaying.
      const isPlaying = ((status as unknown) as any).isPlaying ?? false;
      if (fallbackTimerRef.current !== null && isPlaying) {
        clearInterval(fallbackTimerRef.current as unknown as number);
        fallbackTimerRef.current = null;
        startTimestampRef.current = null;
        console.log('DEBUG fallback timer cleared; audio is playing');
      }
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

  useEffect(() => {
    if (finishedRef.current) {
      return;
    }
    if (expectedSongEndPosition === undefined) {
      return;
    }
    if (playbackPosition >= expectedSongEndPosition + SONG_COMPLETION_GRACE_MS) {
      const handler = finishGameRef.current;
      if (handler) {
        void handler();
      }
    }
  }, [expectedSongEndPosition, playbackPosition]);

  const playTapSound = useCallback(() => {
    const trigger = async () => {
      if (!tapFxMountedRef.current) {
        return;
      }
      const pool = tapSoundPoolRef.current;
      const busy = tapSoundBusyRef.current;

      let targetIndex = -1;
      for (let index = 0; index < pool.length; index += 1) {
        if (!busy[index]) {
          targetIndex = index;
          break;
        }
      }

      if (targetIndex === -1 && pool.length < TAP_SOUND_POOL_MAX) {
        const newIndex = pool.length;
        try {
          const instance = await createTapSoundInstance(newIndex);
          if (!tapFxMountedRef.current) {
            await instance.unloadAsync().catch(() => undefined);
            return;
          }
          pool.push(instance);
          busy.push(false);
          targetIndex = newIndex;
        } catch (error) {
          console.warn('タップ効果音インスタンス生成に失敗しました', error);
          return;
        }
      }

      if (targetIndex === -1 && pool.length > 0) {
        targetIndex = 0;
        await pool[targetIndex].stopAsync().catch(() => undefined);
        busy[targetIndex] = false;
      }

      if (targetIndex === -1) {
        return;
      }

      const targetSound = pool[targetIndex];
      busy[targetIndex] = true;
      try {
        await targetSound.setPositionAsync(0);
        await targetSound.playAsync();
      } catch (error) {
        busy[targetIndex] = false;
        console.warn('タップ効果音の再生に失敗しました', error);
      }
    };

    void trigger();
  }, [createTapSoundInstance]);

  const handleLanePress = useCallback(
    (laneIndex: number) => {
      if (status !== 'playing') {
        return;
      }
      playTapSound();
      const effectiveTime = playbackPosition + latencyRef.current;
      console.log('DEBUG handleLanePress:', { laneIndex, effectiveTime });
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
        console.log('DEBUG tap hit:', { bestIndex, bestDelta, judgment });
        applyJudgment(judgment, bestIndex);
      }
    },
    [applyJudgment, playbackPosition, status, playTapSound]
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
    setResultData(null);

    const setup = async () => {
      try {
        console.log('DEBUG beatmapEntry.module:', beatmapEntry.module);
        const beatmap = parseBeatmap(beatmapEntry.module);
        notesRef.current = beatmap.notes.map((note, index) => ({
          id: `${beatmap.song_id}-${beatmap.difficulty_id}-${index}`,
          lane: note.lane,
          hitTime: note.time_ms + beatmap.offset_ms,
          status: 'pending'
        }));
        setNotes([...notesRef.current]);

        const { sound } = await Audio.Sound.createAsync(song.audioModule, {
          shouldPlay: false,
          progressUpdateIntervalMillis: 16
        });
        soundRef.current = sound;
        await sound.setProgressUpdateIntervalAsync(16);
        // Attach playback handler before allowing the game to start so
        // playback position updates are received as soon as audio plays.
        sound.setOnPlaybackStatusUpdate(handlePlaybackStatusUpdate);
        console.log('DEBUG notes loaded:', notesRef.current.length);
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
      if (fallbackTimerRef.current !== null) {
        clearInterval(fallbackTimerRef.current as unknown as number);
        fallbackTimerRef.current = null;
        startTimestampRef.current = null;
      }
    };
  }, [song, beatmapEntry]);

  const startGame = useCallback(async () => {
    if (!soundRef.current || status !== 'ready') {
      return;
    }
    try {
      const sound = soundRef.current;
      console.log('DEBUG startGame: starting playback');
      const pre = await sound.getStatusAsync();
      console.log('DEBUG startGame: pre-status', pre);
  const preIsPlaying = ((pre as unknown) as any).isPlaying ?? false;
      if (preIsPlaying) {
        setStatus('playing');
        return;
      }

      const res = await sound.playFromPositionAsync(0);
      console.log('DEBUG startGame: playFromPositionAsync result', res);
      const post = await sound.getStatusAsync();
      console.log('DEBUG startGame: post-status', post);
  const postIsPlaying = ((post as unknown) as any).isPlaying ?? false;
      if (!postIsPlaying) {
        console.log('DEBUG startGame: fallback to playAsync');
        const res2 = await sound.playAsync();
        console.log('DEBUG startGame: playAsync result', res2);
      }
      setStatus('playing');
      // If audio is buffering and not reporting position, start a fallback timer
      // to advance playbackPosition so notes will still appear.
      const finalStatus = await sound.getStatusAsync();
      const finalIsPlaying = ((finalStatus as unknown) as any).isPlaying ?? false;
      if (!finalIsPlaying) {
        console.log('DEBUG startGame: starting fallback timer (audio not reporting isPlaying)');
        // record timestamp baseline
        startTimestampRef.current = Date.now();
        if (fallbackTimerRef.current === null) {
          fallbackTimerRef.current = setInterval(() => {
            // advance local playback position based on elapsed wall time
            const base = startTimestampRef.current ?? Date.now();
            const elapsed = Date.now() - base;
            // emulate playbackPosition in ms
            setPlaybackPosition(elapsed);
          }, 16) as unknown as number;
        }
      }
    } catch (error) {
      console.warn('startGame error', error);
    }
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
      <View style={[styles.centered, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.error}>{errorMessage ?? 'エラーが発生しました。'}</Text>
      </View>
    );
  }

  if (!song || !beatmapEntry) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.error}>譜面情報が見つかりませんでした。</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <GameplayHud
        score={score}
        combo={combo}
        maxCombo={maxCombo}
        judgments={judgments}
        lastJudgment={lastJudgment}
      />
      <View
        style={[styles.playfield, { paddingBottom: 32 + insets.bottom }]}
        onLayout={(event) => {
            const h = event.nativeEvent.layout.height;
            console.log('DEBUG playfield height:', h);
            setLaneHeight(h);
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
      {resultData && (
        <ResultOverlay
          score={resultData.score}
          maxCombo={resultData.maxCombo}
          judgments={resultData.judgments}
          isNewRecord={resultData.isNewRecord}
          onReplay={() => navigation.replace('Gameplay', { songId, difficultyId })}
          onReturn={() => navigation.navigate('SongSelect')}
        />
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
