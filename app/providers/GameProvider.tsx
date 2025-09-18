import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import songManifest from '@/constants/songManifest';
import { Judgment } from '@/types/beatmap';
import { SongManifest, SongManifestEntry } from '@/types/manifest';

const HIGH_SCORE_KEY = 'outi_de_beat::high_scores';
const LATENCY_KEY = 'outi_de_beat::latency_offset_ms';

export interface HighScoreEntry {
  score: number;
  maxCombo: number;
  judgments: Record<Judgment, number>;
  updatedAt: string;
}

export interface GameResultPayload {
  score: number;
  maxCombo: number;
  judgments: Record<Judgment, number>;
}

interface GameContextValue {
  songs: SongManifest;
  selectedSong?: SongManifestEntry;
  selectedDifficultyId?: string;
  highScores: Record<string, HighScoreEntry>;
  latencyOffsetMs: number;
  setSelectedSong: (songId: string | undefined) => void;
  setSelectedDifficulty: (difficultyId: string | undefined) => void;
  refreshManifest: () => Promise<void>;
  recordResult: (songId: string, difficultyId: string, payload: GameResultPayload) => Promise<void>;
  updateLatencyOffset: (value: number) => Promise<void>;
  getHighScore: (songId: string, difficultyId: string) => HighScoreEntry | undefined;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

function useAsyncStorageState<T>(key: string, fallback: T) {
  const [state, setState] = useState<T>(fallback);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw && mounted) {
          setState(JSON.parse(raw) as T);
        }
      } catch (error) {
        console.warn('ストレージ読み込みに失敗しました', error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [key]);

  const update = useCallback(async (next: T) => {
    setState(next);
    try {
      await AsyncStorage.setItem(key, JSON.stringify(next));
    } catch (error) {
      console.warn('ストレージ保存に失敗しました', error);
    }
  }, [key]);

  return [state, update] as const;
}

export function GameProvider({ children }: PropsWithChildren) {
  // 日本語コメント: マニフェストは起動時に一度だけロードして保持する。
  const [songs, setSongs] = useState<SongManifest>(songManifest);
  const [selectedSongId, setSelectedSongId] = useState<string | undefined>();
  const [selectedDifficultyId, setSelectedDifficultyId] = useState<string | undefined>();
  const [highScores, setHighScores] = useAsyncStorageState<Record<string, HighScoreEntry>>(HIGH_SCORE_KEY, {});
  const [latencyOffsetMs, setLatencyOffsetMs] = useAsyncStorageState<number>(LATENCY_KEY, 0);

  const selectedSong = useMemo(
    () => songs.find((song) => song.songId === selectedSongId),
    [songs, selectedSongId]
  );

  const refreshManifest = useCallback(async () => {
    // 日本語コメント: scripts/generate-song-manifest.ts を再実行してもホットリロードで反映できるようにする。
    const freshModule = await import('@/constants/songManifest');
    const freshManifest = freshModule.default as SongManifest;
    setSongs(freshManifest);
  }, []);

  const recordResult = useCallback(async (songId: string, difficultyId: string, payload: GameResultPayload) => {
    const key = `${songId}::${difficultyId}`;
    const existing = highScores[key];
    const isBetterScore = payload.score >= (existing?.score ?? 0);

    const next: HighScoreEntry = {
      score: isBetterScore ? payload.score : existing?.score ?? payload.score,
      maxCombo: Math.max(existing?.maxCombo ?? 0, payload.maxCombo),
      judgments: isBetterScore ? payload.judgments : existing?.judgments ?? payload.judgments,
      updatedAt: new Date().toISOString()
    };

    await setHighScores({ ...highScores, [key]: next });
  }, [highScores, setHighScores]);

  const updateLatencyOffset = useCallback(async (value: number) => {
    await setLatencyOffsetMs(value);
  }, [setLatencyOffsetMs]);

  const getHighScore = useCallback(
    (songId: string, difficultyId: string) => {
      const key = `${songId}::${difficultyId}`;
      return highScores[key];
    },
    [highScores]
  );

  const value = useMemo<GameContextValue>(
    () => ({
      songs,
      selectedSong,
      selectedDifficultyId,
      highScores,
      latencyOffsetMs,
      setSelectedSong: setSelectedSongId,
      setSelectedDifficulty: setSelectedDifficultyId,
      refreshManifest,
      recordResult,
      updateLatencyOffset,
      getHighScore
    }),
    [songs, selectedSong, selectedDifficultyId, highScores, latencyOffsetMs, refreshManifest, recordResult, updateLatencyOffset, getHighScore]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('GameProvider の外で useGame が呼び出されました。');
  }
  return context;
}
