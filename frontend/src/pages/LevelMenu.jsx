/**
 * LevelMenu.jsx - Level selector with lock/unlock state and winners charts.
 *
 * WHAT: Shows each level card and, once completed, a leaderboard for that level.
 * WHY: Players can see both their progress and the best-performing teams.
 * HOW: Reads levelProgress from GameContext and fetches leaderboard data from
 *   the backend for completed levels.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { getLeaderboard } from '../lib/api';

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

  const handlePlayAgain = () => {
    clearSavedSession();
    navigate('/');
  };

  useEffect(() => {
    if (!team) return;

    const completedLevels = LEVELS.filter((level) => levelProgress[level.num]?.completed);
    if (completedLevels.length === 0) {
      setLeaderboards({});
      setLeaderboardErrors({});
      return;
    }

    let cancelled = false;

    async function loadLeaderboards() {
      const results = await Promise.all(
        completedLevels.map(async (level) => {
          try {
            const data = await getLeaderboard(level.num);
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

      const nextLeaderboards = {};
      const nextErrors = {};

      results.forEach(({ levelNum, data, error }) => {
        nextLeaderboards[levelNum] = data;
        if (error) {
          nextErrors[levelNum] = error;
        }
      });

      setLeaderboards(nextLeaderboards);
      setLeaderboardErrors(nextErrors);
    }

    loadLeaderboards();

    return () => {
      cancelled = true;
    };
  }, [team, levelProgress]);

  if (isHydrating) {
    return (
      <div className="maze-page-shell">
        Restoring saved team...
      </div>
    );
  }

  return (
    <div className="maze-page-shell">
      <h1 className="maze-page-title">AngleMaze</h1>

      {hydrateError && (
        <p className="maze-status-error">{hydrateError}</p>
      )}

      {team && (
        <p className="maze-status-copy">
          Team: {team.members.join(', ')} - Course {team.course}
        </p>
      )}

      <a
        href="https://www.labolavs.com/category/games"
        className="maze-pill-btn"
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

          return (
            <div key={level.num} className="maze-level-wrap">
              <button
                onClick={() => isPlayable && navigate(`/game/${level.num}`)}
                disabled={!isPlayable}
                className={`maze-level-card${isLocked ? ' is-locked' : ''}${isCompleted ? ' is-completed' : ''}`}
                style={{ '--level-accent': level.color }}
              >
                <div className="maze-level-head">
                  <span className="maze-level-title">
                    Level {level.num} - {level.name}
                  </span>

                  <span
                    className={`maze-level-badge${isLocked ? ' is-locked' : ''}${isCompleted ? ' is-completed' : ''}`}
                  >
                    {isCompleted ? 'OK' : isLocked ? 'LOCK' : 'GO'}
                  </span>
                </div>

                <p className="maze-level-description">
                  {isCompleted ? 'Completed!' : level.description}
                </p>
              </button>

              {isCompleted && (
                <div className="maze-card maze-card-soft maze-leaderboard-card">
                  <div className="maze-leaderboard-head">
                    <div>
                      <p className="maze-leaderboard-title">Winners Chart</p>
                      <p className="maze-leaderboard-copy">
                        Level {level.num} ranked by moves first, then time, then lives
                      </p>
                    </div>
                    <span className="maze-leaderboard-cap">Top 10</span>
                  </div>

                  {leaderboardError && (
                    <p className="maze-info-copy error">{leaderboardError}</p>
                  )}

                  {!leaderboardError && !leaderboard && (
                    <p className="maze-info-copy">Loading winners...</p>
                  )}

                  {!leaderboardError && leaderboard?.winners?.length === 0 && (
                    <p className="maze-info-copy">No winners yet for this level.</p>
                  )}

                  {!leaderboardError && leaderboard?.winners?.length > 0 && (
                    <div className="maze-leaderboard-list">
                      {leaderboard.winners.map((winner) => (
                        <div
                          key={`${level.num}-${winner.teamId}`}
                          className={`maze-leaderboard-row${winner.teamId === team?.id ? ' is-current' : ''}`}
                        >
                          <div className="maze-rank">
                            #{winner.rank}
                          </div>
                          <div>
                            <p className="maze-winner-name">
                              {winner.members.join(', ')}
                            </p>
                            <p className="maze-winner-subcopy">
                              Course {winner.course}
                            </p>
                          </div>
                          <div className="maze-winner-stats">
                            <p>
                              {winner.bestMoves ?? '-'} moves
                            </p>
                            <p>
                              {formatDuration(winner.bestTimeSeconds)} time
                            </p>
                            <p>
                              {winner.bestLivesRemaining ?? '-'} lives
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
