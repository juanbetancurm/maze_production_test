/**
 * LevelMenu.jsx - Level selector with lock/unlock state and winners charts.
 *
 * WHAT: Shows each level card and, once completed, a leaderboard for that level.
 * WHY: Players can see both their progress and the best-performing teams.
 * HOW: Reads levelProgress from GameContext and fetches leaderboard data from
 *   the backend for completed levels.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/useGame.js';
import { getLeaderboard } from '../lib/api';
import { preloadGamePage } from '../routes/gameRoute.js';
import GameLoadingScreen from '../components/GameLoadingScreen.jsx';

const LEVELS = [
  {
    num: 1,
    name: 'Right Angles',
    description: 'Only 90-degree turns. Learn the controls.',
    color: '#44aa66',
  },
  {
    num: 2,
    name: 'Tricky Angles',
    description: 'Diagonal walls. Use the protractor.',
    color: '#cc8833',
  },
];
const LEADERBOARD_PAGE_SIZE = 5;

function formatDuration(totalSeconds) {
  if (typeof totalSeconds !== 'number' || Number.isNaN(totalSeconds)) {
    return '-';
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function LevelMenu() {
  const navigate = useNavigate();
  const {
    team,
    levelProgress,
    isGameFinished,
    isHydrating,
    hydrateError,
    clearSavedSession,
  } = useGame();
  const [leaderboards, setLeaderboards] = useState({});
  const [leaderboardErrors, setLeaderboardErrors] = useState({});
  const [leaderboardLoading, setLeaderboardLoading] = useState({});
  const [expandedLeaderboards, setExpandedLeaderboards] = useState({});
  const leaderboardPagesRef = useRef({});
  const leaderboardTeamIdRef = useRef(null);

  const handlePlayAgain = () => {
    clearSavedSession();
    navigate('/');
  };

  const teamId = team?.id;

  useEffect(() => {
    if (!teamId) return;

    const isNewTeam = leaderboardTeamIdRef.current !== teamId;
    if (isNewTeam) {
      leaderboardTeamIdRef.current = teamId;
      leaderboardPagesRef.current = {};
      setLeaderboards({});
      setLeaderboardErrors({});
      setLeaderboardLoading({});
      setExpandedLeaderboards({});
    }

    const completedLevels = LEVELS.filter((level) => levelProgress[level.num]?.completed);
    if (completedLevels.length === 0) return;

    let cancelled = false;
    setLeaderboardLoading((previous) => ({
      ...previous,
      ...Object.fromEntries(completedLevels.map((level) => [level.num, true])),
    }));

    async function loadLeaderboards() {
      const results = await Promise.all(
        completedLevels.map(async (level) => {
          try {
            const page = isNewTeam ? 1 : (leaderboardPagesRef.current[level.num] || 1);
            const data = await getLeaderboard(level.num, { page, pageSize: LEADERBOARD_PAGE_SIZE });
            return { levelNum: level.num, data, error: '' };
          } catch (error) {
            return {
              levelNum: level.num,
              data: { winners: [] },
              error: error.message || 'Could not load the winners chart.',
            };
          }
        })
      );

      if (cancelled) return;

      setLeaderboards((previous) => {
        const next = { ...previous };
        results.forEach(({ levelNum, data, error }) => {
          if (!error) {
            next[levelNum] = data;
            leaderboardPagesRef.current[levelNum] = data.page || 1;
          }
        });
        return next;
      });
      setLeaderboardErrors((previous) => {
        const next = { ...previous };
        results.forEach(({ levelNum, error }) => {
          if (error) next[levelNum] = error;
          else delete next[levelNum];
        });
        return next;
      });
      setLeaderboardLoading((previous) => {
        const next = { ...previous };
        completedLevels.forEach((level) => { next[level.num] = false; });
        return next;
      });
    }

    loadLeaderboards();

    return () => {
      cancelled = true;
    };
  }, [teamId, levelProgress]);

  const toggleLeaderboard = (levelNum) => {
    setExpandedLeaderboards((previous) => ({
      ...previous,
      [levelNum]: !previous[levelNum],
    }));
  };

  const changeLeaderboardPage = async (levelNum, requestedPage) => {
    if (leaderboardLoading[levelNum]) return;

    const currentPage = leaderboards[levelNum]?.page || 1;
    leaderboardPagesRef.current[levelNum] = requestedPage;
    setLeaderboardLoading((previous) => ({ ...previous, [levelNum]: true }));
    setLeaderboardErrors((previous) => {
      const next = { ...previous };
      delete next[levelNum];
      return next;
    });

    try {
      const data = await getLeaderboard(levelNum, {
        page: requestedPage,
        pageSize: LEADERBOARD_PAGE_SIZE,
      });
      if (leaderboardTeamIdRef.current !== teamId) return;
      leaderboardPagesRef.current[levelNum] = data.page || 1;
      setLeaderboards((previous) => ({ ...previous, [levelNum]: data }));
    } catch (error) {
      if (leaderboardTeamIdRef.current !== teamId) return;
      leaderboardPagesRef.current[levelNum] = currentPage;
      setLeaderboardErrors((previous) => ({
        ...previous,
        [levelNum]: error.message || 'Could not load the rankings.',
      }));
    } finally {
      if (leaderboardTeamIdRef.current === teamId) {
        setLeaderboardLoading((previous) => ({ ...previous, [levelNum]: false }));
      }
    }
  };

  if (isHydrating) {
    return <GameLoadingScreen label="Restoring your team…" />;
  }

  return (
    <div className="maze-experience maze-page-shell maze-level-page">
      <h1 className="maze-page-title"><span>Angle</span>Maze</h1>
      <p className="maze-brand-tagline">Move with Math!</p>

      {hydrateError && (
        <p className="maze-status-error">{hydrateError}</p>
      )}

      {team && (
        <p className="maze-status-copy">
          Team: {team.members.join(', ')}{team.course ? ` - Course ${team.course}` : ''}
        </p>
      )}

      <a
        href="https://www.labolavs.com/category/games"
        className="maze-pill-btn maze-menu-back"
      >
        Back to Games
      </a>

      {isGameFinished && (
        <div className="maze-card maze-finish-banner">
          <p className="maze-finish-title">Congratulations!</p>
          <p className="maze-finish-copy">You mastered all levels!</p>
          <div className="maze-actions-row">
            <button
              onClick={handlePlayAgain}
              className="maze-action-btn maze-action-btn-success"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      <div className="maze-menu-list">
        {LEVELS.map((level) => {
          const progress = levelProgress[level.num] || { unlocked: false, completed: false };
          const isLocked = !progress.unlocked && !progress.completed;
          const isCompleted = progress.completed;
          const isPlayable = progress.unlocked && !progress.completed;
          const leaderboard = leaderboards[level.num];
          const leaderboardError = leaderboardErrors[level.num];
          const isLeaderboardExpanded = Boolean(expandedLeaderboards[level.num]);
          const isLeaderboardLoading = Boolean(leaderboardLoading[level.num]);
          const leaderboardEntries = leaderboard?.winners ?? [];
          const totalEntries = leaderboard?.totalEntries ?? leaderboardEntries.length;
          const currentPage = leaderboard?.page ?? 1;
          const totalPages = leaderboard?.totalPages
            ?? Math.max(1, Math.ceil(totalEntries / LEADERBOARD_PAGE_SIZE));
          const leaderboardId = `level-${level.num}-leaderboard-content`;
          const prefetchGamePage = () => {
            if (!isPlayable) return;
            preloadGamePage().catch(() => {});
          };

          return (
            <div key={level.num} className="maze-level-wrap">
              <button
                onClick={() => isPlayable && navigate(`/game/${level.num}`)}
                disabled={!isPlayable}
                className={`maze-level-card${isLocked ? ' is-locked' : ''}${isCompleted ? ' is-completed' : ''}`}
                style={{ '--level-accent': level.color }}
                onPointerEnter={prefetchGamePage}
                onFocusCapture={prefetchGamePage}
              >
                <div className="maze-level-head">
                  <span className="maze-level-title">
                    <span className="maze-level-number">Level {level.num}</span>
                    {level.name}
                  </span>

                  <span
                    className={`maze-level-badge${isLocked ? ' is-locked' : ''}${isCompleted ? ' is-completed' : ''}`}
                  >
                    {isCompleted ? 'Complete' : isLocked ? 'Locked' : 'Play →'}
                  </span>
                </div>

                <p className="maze-level-description">
                  {isCompleted ? 'Completed!' : level.description}
                </p>
              </button>

              {isCompleted && (
                <section className="maze-card maze-card-soft maze-leaderboard-card" aria-labelledby={`level-${level.num}-leaderboard-title`}>
                  <div className="maze-leaderboard-head">
                    <div className="maze-leaderboard-heading">
                      <span className="maze-leaderboard-emblem" aria-hidden="true">◇</span>
                      <div>
                        <p className="maze-leaderboard-title" id={`level-${level.num}-leaderboard-title`}>
                          Leaderboard
                        </p>
                        <p className="maze-leaderboard-copy">
                          Level {level.num} · ranked by moves, time, then lives
                        </p>
                      </div>
                    </div>
                    <div className="maze-leaderboard-header-actions">
                      <span className="maze-leaderboard-cap" aria-live="polite">
                        {isLeaderboardLoading && !leaderboard
                          ? 'Loading'
                          : `${totalEntries} ${totalEntries === 1 ? 'entry' : 'entries'}`}
                      </span>
                      <button
                        type="button"
                        className="maze-pill-btn maze-leaderboard-toggle"
                        aria-expanded={isLeaderboardExpanded}
                        aria-controls={leaderboardId}
                        aria-label={`${isLeaderboardExpanded ? 'Hide' : 'Show'} Level ${level.num} rankings`}
                        onClick={() => toggleLeaderboard(level.num)}
                      >
                        {isLeaderboardExpanded ? 'Hide rankings' : 'Show rankings'}
                        <svg
                          className={`maze-leaderboard-chevron${isLeaderboardExpanded ? ' is-open' : ''}`}
                          aria-hidden="true"
                          viewBox="0 0 16 16"
                        >
                          <path d="m3 6 5 5 5-5" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {leaderboardError && !isLeaderboardExpanded && (
                    <p className="maze-leaderboard-error" role="alert">{leaderboardError}</p>
                  )}

                  <div
                    id={leaderboardId}
                    className={`maze-leaderboard-disclosure${isLeaderboardExpanded ? ' is-expanded' : ''}`}
                    aria-hidden={!isLeaderboardExpanded}
                    inert={!isLeaderboardExpanded}
                  >
                    <div className="maze-leaderboard-disclosure-inner">
                      {leaderboardError && (
                        <div className="maze-leaderboard-error-row" role="alert">
                          <p className="maze-leaderboard-error">{leaderboardError}</p>
                          <button
                            type="button"
                            className="maze-inline-btn"
                            disabled={isLeaderboardLoading}
                            onClick={() => changeLeaderboardPage(level.num, currentPage)}
                          >
                            Retry
                          </button>
                        </div>
                      )}

                      {isLeaderboardLoading && !leaderboard && (
                        <p className="maze-leaderboard-empty" role="status">Loading rankings…</p>
                      )}

                      {!leaderboardError && !leaderboard && !isLeaderboardLoading && (
                        <p className="maze-leaderboard-empty" role="status">Rankings are not available yet.</p>
                      )}

                      {leaderboard && totalEntries === 0 && !leaderboardError && (
                        <p className="maze-leaderboard-empty">No completed runs yet. Finish the level to appear here.</p>
                      )}

                      {leaderboardEntries.length > 0 && (
                        <>
                          <ol
                            className="maze-leaderboard-list"
                            aria-label={`Level ${level.num} rankings`}
                            start={leaderboardEntries[0]?.rank ?? 1}
                          >
                            {leaderboardEntries.map((winner) => {
                              const rankTone = winner.rank === 1
                                ? ' is-first'
                                : winner.rank === 2
                                  ? ' is-second'
                                  : winner.rank === 3
                                    ? ' is-third'
                                    : '';
                              const isCurrentTeam = winner.teamId === teamId;

                              return (
                                <li
                                  key={`${level.num}-${winner.teamId}`}
                                  className={`maze-leaderboard-row${isCurrentTeam ? ' is-current' : ''}`}
                                >
                                  <span className={`maze-rank${rankTone}`} aria-label={`Rank ${winner.rank}`}>
                                    {winner.rank}
                                  </span>
                                  <div className="maze-winner-identity">
                                    <p className="maze-winner-name">{winner.members.join(', ')}</p>
                                    <p className="maze-winner-subcopy">
                                      {isCurrentTeam ? 'Your team' : winner.course ? `Course ${winner.course}` : 'No course selected'}
                                    </p>
                                  </div>
                                  <div
                                    className="maze-winner-stats"
                                    aria-label={`${winner.bestMoves ?? '-'} moves, ${formatDuration(winner.bestTimeSeconds)} time, ${winner.bestLivesRemaining ?? '-'} lives remaining`}
                                  >
                                    <span>{winner.bestMoves ?? '-'} moves</span>
                                    <span className="maze-winner-stat-divider" aria-hidden="true">·</span>
                                    <span>{formatDuration(winner.bestTimeSeconds)}</span>
                                    <span className="maze-winner-stat-divider" aria-hidden="true">·</span>
                                    <span>{winner.bestLivesRemaining ?? '-'} lives</span>
                                  </div>
                                </li>
                              );
                            })}
                          </ol>

                          {totalPages > 1 && (
                            <nav className="maze-leaderboard-pagination" aria-label={`Level ${level.num} leaderboard pages`}>
                              <button
                                type="button"
                                className="maze-pill-btn maze-leaderboard-page-btn"
                                onClick={() => changeLeaderboardPage(level.num, currentPage - 1)}
                                disabled={currentPage <= 1 || isLeaderboardLoading}
                                aria-label="Previous rankings page"
                              >
                                ‹ Previous
                              </button>
                              <span className="maze-leaderboard-page-status" aria-live="polite">
                                Page {currentPage} of {totalPages}
                              </span>
                              <button
                                type="button"
                                className="maze-pill-btn maze-leaderboard-page-btn"
                                onClick={() => changeLeaderboardPage(level.num, currentPage + 1)}
                                disabled={currentPage >= totalPages || isLeaderboardLoading}
                                aria-label="Next rankings page"
                              >
                                Next ›
                              </button>
                            </nav>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </section>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
