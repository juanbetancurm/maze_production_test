import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteAdminTeam, getAdminTeam, getAdminTeams } from '../lib/adminApi';

const ADMIN_SECRET_STORAGE_KEY = 'anglemaze:adminSecret';

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatDuration(totalSeconds) {
  if (typeof totalSeconds !== 'number' || Number.isNaN(totalSeconds)) {
    return '-';
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function summarizeProgress(progress = []) {
  const completed = progress.filter((entry) => entry.completed).length;
  return `${completed}/${progress.length || 0}`;
}

export default function AdminPage() {
  const [secretInput, setSecretInput] = useState('');
  const [adminSecret, setAdminSecret] = useState(() => {
    return sessionStorage.getItem(ADMIN_SECRET_STORAGE_KEY) || '';
  });
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmingTeam, setConfirmingTeam] = useState(null);

  const selectedTeamSummary = useMemo(() => {
    if (!selectedTeam) return '';
    return `${selectedTeam.members.map((member) => member.name).join(', ')} - Course ${selectedTeam.course}`;
  }, [selectedTeam]);

  async function loadTeams(secret = adminSecret) {
    if (!secret) return;

    setIsLoadingTeams(true);
    setError('');

    try {
      const data = await getAdminTeams(secret);
      setTeams(data);
      setNotice('');
    } catch (loadError) {
      setError(loadError.message || 'Could not load teams.');
      setTeams([]);
      setSelectedTeam(null);
      setSelectedTeamId('');
    } finally {
      setIsLoadingTeams(false);
    }
  }

  async function loadTeamDetail(teamId, secret = adminSecret) {
    if (!teamId || !secret) return;

    setIsLoadingDetail(true);
    setError('');

    try {
      const data = await getAdminTeam(teamId, secret);
      setSelectedTeam(data);
      setSelectedTeamId(teamId);
    } catch (detailError) {
      setError(detailError.message || 'Could not load team detail.');
      setSelectedTeam(null);
    } finally {
      setIsLoadingDetail(false);
    }
  }

  useEffect(() => {
    if (adminSecret) {
      loadTeams(adminSecret);
    }
  }, [adminSecret]);

  const handleUnlock = (event) => {
    event.preventDefault();
    const nextSecret = secretInput.trim();
    if (!nextSecret) {
      setError('Enter the admin secret first.');
      return;
    }

    sessionStorage.setItem(ADMIN_SECRET_STORAGE_KEY, nextSecret);
    setAdminSecret(nextSecret);
    setSecretInput('');
  };

  const handleLock = () => {
    sessionStorage.removeItem(ADMIN_SECRET_STORAGE_KEY);
    setAdminSecret('');
    setSecretInput('');
    setTeams([]);
    setSelectedTeam(null);
    setSelectedTeamId('');
    setError('');
    setNotice('');
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmingTeam) return;

    setIsDeleting(true);
    setError('');

    try {
      const result = await deleteAdminTeam(confirmingTeam.id, adminSecret);
      setConfirmingTeam(null);
      setNotice(
        `Deleted ${result.deletedTeam.members.join(', ')} and related progress/attempt records.`
      );
      setSelectedTeam(null);
      setSelectedTeamId('');
      await loadTeams();
    } catch (deleteError) {
      setError(deleteError.message || 'Could not delete team.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="maze-page-shell maze-admin-page">
      <div className="maze-admin-header">
        <div>
          <p className="maze-section-label">Admin</p>
          <h1 className="maze-page-title">Database Records</h1>
          <p className="maze-page-subtitle">
            View teams, inspect progress and attempts, and delete one team at a time.
          </p>
        </div>
        <div className="maze-admin-header-actions">
          <Link to="/" className="maze-pill-btn">Game Home</Link>
          {adminSecret && (
            <button type="button" onClick={handleLock} className="maze-pill-btn">
              Lock Admin
            </button>
          )}
        </div>
      </div>

      {!adminSecret && (
        <form className="maze-card maze-admin-login" onSubmit={handleUnlock}>
          <label className="maze-section-label" htmlFor="admin-secret">
            Admin Secret
          </label>
          <input
            id="admin-secret"
            type="password"
            value={secretInput}
            onChange={(event) => setSecretInput(event.target.value)}
            className="maze-text-field"
            autoComplete="current-password"
          />
          <button type="submit" className="maze-action-btn maze-action-btn-primary">
            Unlock
          </button>
        </form>
      )}

      {error && <p className="maze-status-error">{error}</p>}
      {notice && <p className="maze-status-success">{notice}</p>}

      {adminSecret && (
        <div className="maze-admin-grid">
          <section className="maze-card maze-admin-panel">
            <div className="maze-admin-panel-head">
              <div>
                <p className="maze-section-label">Teams</p>
                <p className="maze-admin-muted">
                  {isLoadingTeams ? 'Loading...' : `${teams.length} records`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => loadTeams()}
                className="maze-inline-btn"
                disabled={isLoadingTeams}
              >
                Refresh
              </button>
            </div>

            <div className="maze-admin-team-list">
              {teams.map((team) => {
                const isSelected = team.id === selectedTeamId;
                const members = team.members.map((member) => member.name).join(', ');

                return (
                  <button
                    type="button"
                    key={team.id}
                    className={`maze-admin-team-row${isSelected ? ' is-selected' : ''}`}
                    onClick={() => loadTeamDetail(team.id)}
                  >
                    <span>
                      <strong>{members || 'Unnamed team'}</strong>
                      <small>Course {team.course} - {formatDate(team.createdAt)}</small>
                    </span>
                    <span className="maze-admin-team-stats">
                      <small>Levels {summarizeProgress(team.levelProgress)}</small>
                      <small>{team._count?.attempts ?? 0} attempts</small>
                    </span>
                  </button>
                );
              })}

              {!isLoadingTeams && teams.length === 0 && (
                <p className="maze-info-copy">No teams found.</p>
              )}
            </div>
          </section>

          <section className="maze-card maze-admin-panel">
            <div className="maze-admin-panel-head">
              <div>
                <p className="maze-section-label">Inspect</p>
                <p className="maze-admin-muted">
                  {isLoadingDetail ? 'Loading team...' : selectedTeamSummary || 'Select a team'}
                </p>
              </div>
              {selectedTeam && (
                <button
                  type="button"
                  onClick={() => setConfirmingTeam(selectedTeam)}
                  className="maze-inline-btn maze-inline-btn-danger"
                >
                  Delete Team
                </button>
              )}
            </div>

            {!selectedTeam && (
              <p className="maze-info-copy">
                Choose a team from the list to inspect members, progress, and attempts.
              </p>
            )}

            {selectedTeam && (
              <div className="maze-admin-detail">
                <div className="maze-admin-detail-block">
                  <p className="maze-admin-detail-title">Team</p>
                  <p>{selectedTeam.members.map((member) => member.name).join(', ')}</p>
                  <p className="maze-admin-muted">Course {selectedTeam.course}</p>
                  <p className="maze-admin-muted">Created {formatDate(selectedTeam.createdAt)}</p>
                  <p className="maze-admin-id">{selectedTeam.id}</p>
                </div>

                <div className="maze-admin-detail-block">
                  <p className="maze-admin-detail-title">Progress</p>
                  <div className="maze-admin-record-list">
                    {selectedTeam.levelProgress.map((entry) => (
                      <div key={entry.id} className="maze-admin-record">
                        <strong>Level {entry.levelId} - {entry.level?.name}</strong>
                        <span>{entry.completed ? 'Completed' : entry.unlocked ? 'Unlocked' : 'Locked'}</span>
                        <small>
                          {entry.bestMoves ?? '-'} moves - {formatDuration(entry.bestTimeSeconds)} - {entry.bestLivesRemaining ?? '-'} lives
                        </small>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="maze-admin-detail-block">
                  <p className="maze-admin-detail-title">Attempts</p>
                  <div className="maze-admin-record-list">
                    {selectedTeam.attempts.length === 0 && (
                      <p className="maze-info-copy">No attempts recorded.</p>
                    )}

                    {selectedTeam.attempts.map((attempt) => (
                      <div key={attempt.id} className="maze-admin-record">
                        <strong>Level {attempt.levelId} - {attempt.level?.name}</strong>
                        <span>{attempt.status}</span>
                        <small>
                          {attempt.movesCount} moves - {formatDuration(attempt.durationSeconds)} - {attempt.livesRemaining} lives
                        </small>
                        <small>{formatDate(attempt.endedAt || attempt.startedAt)}</small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {confirmingTeam && (
        <div className="maze-modal-overlay">
          <div className="maze-card maze-modal-card">
            <h2 className="maze-modal-title">Delete Team?</h2>
            <p className="maze-modal-copy">
              This will permanently delete {confirmingTeam.members.map((member) => member.name).join(', ')}
              {' '}and all related progress and attempts.
            </p>
            <div className="maze-actions-row">
              <button
                type="button"
                onClick={() => setConfirmingTeam(null)}
                className="maze-action-btn"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirmed}
                className="maze-action-btn maze-action-btn-danger"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
