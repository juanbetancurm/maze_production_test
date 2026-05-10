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
  const { team, levelProgress, isGameFinished, isHydrating, hydrateError } = useGame();
  const [leaderboards, setLeaderboards] = useState({});
  const [leaderboardErrors, setLeaderboardErrors] = useState({});

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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '24px',
          fontFamily: 'monospace',
          color: '#99aabb',
        }}
      >
        Restoring saved team...
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
        fontFamily: 'monospace',
      }}
    >
      <h1 style={{ fontSize: '24px', color: '#6699cc', marginBottom: '6px' }}>
        AngleMaze
      </h1>

      {hydrateError && (
        <p style={{ fontSize: '13px', color: '#ff6655', marginBottom: '12px' }}>
          {hydrateError}
        </p>
      )}

      {team && (
        <p style={{ fontSize: '13px', color: '#778', marginBottom: '28px' }}>
          Team: {team.members.join(', ')} - Course {team.course}
        </p>
      )}

      {isGameFinished && (
        <div
          style={{
            padding: '16px 32px',
            marginBottom: '24px',
            border: '2px solid #ffd700',
            borderRadius: '12px',
            background: '#2a2200',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '20px', color: '#ffd700', margin: '0 0 6px 0' }}>
            Congratulations!
          </p>
          <p style={{ fontSize: '13px', color: '#aa9944', margin: 0 }}>
            You mastered all levels!
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '420px' }}>
        {LEVELS.map((level) => {
          const progress = levelProgress[level.num] || { unlocked: false, completed: false };
          const isLocked = !progress.unlocked && !progress.completed;
          const isCompleted = progress.completed;
          const isPlayable = progress.unlocked && !progress.completed;
          const leaderboard = leaderboards[level.num];
          const leaderboardError = leaderboardErrors[level.num];

          return (
            <div key={level.num} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => isPlayable && navigate(`/game/${level.num}`)}
                disabled={!isPlayable}
                style={{
                  padding: '20px 24px',
                  border: `2px solid ${isPlayable ? level.color : '#333'}`,
                  borderRadius: '12px',
                  background: isPlayable ? '#111' : '#0a0a0a',
                  cursor: isPlayable ? 'pointer' : 'not-allowed',
                  opacity: isLocked ? 0.4 : 1,
                  textAlign: 'left',
                  fontFamily: 'monospace',
                  transition: 'transform 0.1s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: isPlayable ? level.color : '#555',
                    }}
                  >
                    Level {level.num} - {level.name}
                  </span>

                  <span style={{ fontSize: '18px' }}>
                    {isCompleted ? 'OK' : isLocked ? 'LOCK' : 'GO'}
                  </span>
                </div>

                <p
                  style={{
                    fontSize: '12px',
                    color: '#667',
                    margin: '8px 0 0 0',
                  }}
                >
                  {isCompleted ? 'Completed!' : level.description}
                </p>
              </button>

              {isCompleted && (
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '1px solid #22324d',
                    background: 'rgba(12, 16, 28, 0.94)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '12px',
                      marginBottom: '10px',
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontSize: '13px', color: '#9bb9ec' }}>
                        Winners Chart
                      </p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#677795' }}>
                        Level {level.num} ranked by moves first, then time, then lives
                      </p>
                    </div>
                    <span style={{ color: level.color, fontSize: '12px' }}>
                      Top 10
                    </span>
                  </div>

                  {leaderboardError && (
                    <p style={{ margin: 0, fontSize: '12px', color: '#ff8a8a' }}>
                      {leaderboardError}
                    </p>
                  )}

                  {!leaderboardError && !leaderboard && (
                    <p style={{ margin: 0, fontSize: '12px', color: '#8797b8' }}>
                      Loading winners...
                    </p>
                  )}

                  {!leaderboardError && leaderboard?.winners?.length === 0 && (
                    <p style={{ margin: 0, fontSize: '12px', color: '#8797b8' }}>
                      No winners yet for this level.
                    </p>
                  )}

                  {!leaderboardError && leaderboard?.winners?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {leaderboard.winners.map((winner) => (
                        <div
                          key={`${level.num}-${winner.teamId}`}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '28px 1fr auto',
                            gap: '10px',
                            alignItems: 'center',
                            padding: '9px 10px',
                            borderRadius: '10px',
                            background: winner.teamId === team?.id ? 'rgba(68, 170, 102, 0.16)' : 'rgba(255, 255, 255, 0.04)',
                            border: winner.teamId === team?.id ? '1px solid rgba(68, 170, 102, 0.45)' : '1px solid rgba(255, 255, 255, 0.06)',
                          }}
                        >
                          <div style={{ fontSize: '13px', color: '#f4d17a' }}>
                            #{winner.rank}
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: '12px', color: '#dce6ff' }}>
                              {winner.members.join(', ')}
                            </p>
                            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#7f8ba7' }}>
                              Course {winner.course}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, fontSize: '12px', color: '#8ae6a6' }}>
                              {winner.bestMoves ?? '-'} moves
                            </p>
                            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#91a0bd' }}>
                              {formatDuration(winner.bestTimeSeconds)} time
                            </p>
                            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#91a0bd' }}>
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
