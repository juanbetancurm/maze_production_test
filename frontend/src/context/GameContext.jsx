/**
 * GameContext.jsx - Global game state shared across all screens.
 *
 * WHAT: Stores the current team and level progress for the whole app.
 * WHY: Registration, menu, and gameplay all need the same data source.
 * HOW: The provider keeps backend-backed state in React Context so every page
 *   can read or update it through useGame().
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getProgress, getTeam } from '../lib/api';

const TEAM_ID_STORAGE_KEY = 'anglemaze:teamId';
const TEAM_ID_COOKIE_KEY = 'anglemaze_team_id';
const DEFAULT_LEVEL_PROGRESS = {
  1: { unlocked: true, completed: false },
  2: { unlocked: false, completed: false },
};

function readTeamIdCookie() {
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${TEAM_ID_COOKIE_KEY}=`));

  return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : null;
}

function writeTeamIdCookie(teamId) {
  document.cookie = `${TEAM_ID_COOKIE_KEY}=${encodeURIComponent(teamId)}; path=/; max-age=2592000; SameSite=Lax`;
}

function clearTeamIdCookie() {
  document.cookie = `${TEAM_ID_COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

function normalizeLevelProgress(progressList = []) {
  return progressList.reduce((acc, entry) => {
    acc[entry.levelId] = {
      unlocked: entry.unlocked,
      completed: entry.completed,
      bestMoves: entry.bestMoves ?? null,
      bestLivesRemaining: entry.bestLivesRemaining ?? null,
    };
    return acc;
  }, {});
}

function normalizeTeam(savedTeam) {
  if (!savedTeam) return null;

  return {
    id: savedTeam.id,
    course: savedTeam.course,
    members: Array.isArray(savedTeam.members)
      ? savedTeam.members.map((member) => member.name)
      : [],
  };
}

export function normalizeProgressResponse(progressList = []) {
  return normalizeLevelProgress(progressList);
}

const GameContext = createContext(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame() must be used inside <GameProvider>');
  }
  return ctx;
}

export function GameProvider({ children }) {
  const hydrationStartedRef = useRef(false);
  const [team, setTeam] = useState(null);
  const [levelProgress, setLevelProgress] = useState(DEFAULT_LEVEL_PROGRESS);
  const [isHydrating, setIsHydrating] = useState(true);
  const [hydrateError, setHydrateError] = useState('');

  const applySavedTeam = useCallback((savedTeam, progressList = savedTeam?.levelProgress) => {
    const normalizedTeam = normalizeTeam(savedTeam);
    const normalizedProgress = normalizeLevelProgress(progressList);

    setTeam(normalizedTeam);
    setLevelProgress(
      Object.keys(normalizedProgress).length > 0
        ? normalizedProgress
        : DEFAULT_LEVEL_PROGRESS
    );

    if (normalizedTeam?.id) {
      localStorage.setItem(TEAM_ID_STORAGE_KEY, normalizedTeam.id);
      writeTeamIdCookie(normalizedTeam.id);
    }
  }, []);

  const registerTeam = useCallback((savedTeam) => {
    applySavedTeam(savedTeam);
  }, [applySavedTeam]);

  const completeLevel = useCallback((progressOrLevelNum) => {
    if (typeof progressOrLevelNum === 'object' && progressOrLevelNum !== null) {
      setLevelProgress(progressOrLevelNum);
      return;
    }

    const levelNum = progressOrLevelNum;
    setLevelProgress((prev) => {
      const next = { ...prev };

      if (next[levelNum]) {
        next[levelNum] = { ...next[levelNum], unlocked: false, completed: true };
      }

      const nextLevel = levelNum + 1;
      if (next[nextLevel]) {
        next[nextLevel] = { ...next[nextLevel], unlocked: true };
      }

      return next;
    });
  }, []);

  const clearSavedSession = useCallback(() => {
    localStorage.removeItem(TEAM_ID_STORAGE_KEY);
    clearTeamIdCookie();
    setTeam(null);
    setLevelProgress(DEFAULT_LEVEL_PROGRESS);
    setHydrateError('');
  }, []);

  useEffect(() => {
    if (hydrationStartedRef.current) return;
    hydrationStartedRef.current = true;

    const storedTeamId = localStorage.getItem(TEAM_ID_STORAGE_KEY) || readTeamIdCookie();
    if (!storedTeamId) {
      setIsHydrating(false);
      return;
    }

    async function hydrateTeam() {
      try {
        setHydrateError('');
        const [savedTeam, savedProgress] = await Promise.all([
          getTeam(storedTeamId),
          getProgress(storedTeamId),
        ]);
        applySavedTeam(savedTeam, savedProgress);
      } catch (error) {
        console.error('Error restoring saved team:', error);
        clearSavedSession();
        setHydrateError('Could not restore the saved team session.');
      } finally {
        setIsHydrating(false);
      }
    }

    hydrateTeam();
  }, [applySavedTeam, clearSavedSession]);

  const isGameFinished = Object.values(levelProgress).every((level) => level.completed);

  return (
    <GameContext.Provider
      value={{
        team,
        levelProgress,
        isHydrating,
        hydrateError,
        registerTeam,
        completeLevel,
        isGameFinished,
        clearSavedSession,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
