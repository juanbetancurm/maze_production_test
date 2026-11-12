/**
 * Registration.jsx - Team registration form.
 *
 * WHAT: Collects team member names and course selection before the game starts.
 * WHY: The school needs to track which teams played and their results.
 * HOW: Saves the team through the backend, then stores the backend response in
 *   GameContext.
 */
import { useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/useGame.js';
import GameLoadingScreen from '../components/GameLoadingScreen.jsx';
import { createTeam } from '../lib/api';
import { COURSE_OPTIONS, normalizeRegistrationMembers } from '../lib/registrationValidation.js';
import {
  getIntroSnapshot,
  markIntroSeen,
  openIntro,
  prefersReducedData,
  subscribeIntro,
} from '../lib/introCinematic.js';

const INSTRUCTIONS_STORAGE_KEY = 'anglemaze:instructionsSeen';

export default function Registration() {
  const navigate = useNavigate();
  const { team, isHydrating, registerTeam, clearSavedSession } = useGame();
  const { seen: introSeen } = useSyncExternalStore(subscribeIntro, getIntroSnapshot);
  const [members, setMembers] = useState(['', '']);
  const [course, setCourse] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInstructions, setShowInstructions] = useState(() => {
    return localStorage.getItem(INSTRUCTIONS_STORAGE_KEY) !== 'true';
  });

  const handleMemberChange = (index, value) => {
    const updated = [...members];
    updated[index] = value;
    setMembers(updated);
  };

  const addMember = () => {
    if (members.length < 6) {
      setMembers([...members, '']);
    }
  };

  const removeMember = (index) => {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    const memberResult = normalizeRegistrationMembers(members);
    if (memberResult.error) {
      setError(memberResult.error);
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const savedTeam = await createTeam({ members: memberResult.members, course: course || null });
      const enterGame = () => {
        registerTeam(savedTeam);
        navigate('/menu');
      };

      if (introSeen) {
        enterGame();
      } else if (prefersReducedData()) {
        // Data saver: do not send the video unasked, but offer it from now on.
        markIntroSeen();
        enterGame();
      } else {
        // First time in this browser: the intro covers the page, then the
        // level menu is opened underneath it.
        openIntro({ onCovered: enterGame });
      }
    } catch (submitError) {
      setError(submitError.message || 'Could not save your team. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeInstructions = () => {
    localStorage.setItem(INSTRUCTIONS_STORAGE_KEY, 'true');
    setShowInstructions(false);
  };

  if (isHydrating) {
    return <GameLoadingScreen label="Restoring your team…" />;
  }

  return (
    <div
      className="maze-experience maze-page-shell maze-registration-page"
    >
      {showInstructions && (
        <div className="maze-modal-overlay">
          <div className="maze-card maze-card-soft maze-modal-card" role="dialog" aria-modal="true" aria-labelledby="maze-instructions-title">
            <h2 className="maze-modal-title" id="maze-instructions-title">Instructions</h2>
            <p className="maze-modal-copy">
              Guide your character through the maze using distance and angle commands. Fewer moves and faster times win!
            </p>
            <div className="maze-modal-list">
              {[
                '1. Enter your name, and optionally add team members or select a course.',
                '2. Enter a distance (in pixels) and press Forward to move.',
                '3. Enter an angle (in degrees) and press Turn Left or Turn Right to change direction.',
                '4. Hitting a wall restarts the level. Reach the exit to save your score!',
              ].map((item) => (
                <div
                  key={item}
                  className="maze-modal-item"
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="maze-actions-row">
              <button
                onClick={closeInstructions}
                className="maze-action-btn maze-action-btn-success"
              >
                Start playing!
              </button>
            </div>
          </div>
        </div>
      )}

      <h1
        className="maze-page-title"
      >
        <span>Angle</span>Maze
      </h1>

      <p className="maze-brand-tagline">Move with Math!</p>
      <p className="maze-page-subtitle">
        Register a player or team to start playing
      </p>

      <div className="maze-page-actions">
        <button
          onClick={() => setShowInstructions(true)}
          className="maze-pill-btn"
        >
          View Instructions
        </button>

        {introSeen && (
          <button
            onClick={() => openIntro()}
            className="maze-pill-btn"
            data-watch-intro="true"
          >
            Watch Intro
          </button>
        )}

        <a
          href="https://www.labolavs.com/category/games"
          className="maze-pill-btn"
        >
          Back to Games
        </a>
      </div>

      <section className="maze-card maze-registration-panel" aria-label="Team registration">
      {team && (
        <div
          className="maze-card maze-session-card"
        >
          <p className="maze-session-copy">
            Saved team loaded: {team.members.join(', ')}{team.course ? ` - Course ${team.course}` : ''}
          </p>
          <div className="maze-actions-row">
            <button
              onClick={() => navigate('/menu')}
              className="maze-action-btn maze-action-btn-success"
            >
              Continue Team
            </button>
            <button
              onClick={clearSavedSession}
              className="maze-action-btn maze-action-btn-danger"
            >
              New Team
            </button>
          </div>
        </div>
      )}

      <div
        className="maze-field-stack"
      >
        <label className="maze-section-label">Participant names</label>

        {members.map((name, index) => (
          <div key={index} className="maze-field-row">
            <input
              type="text"
              value={name}
              maxLength={120}
              onChange={(event) => handleMemberChange(index, event.target.value)}
              placeholder={index === 0 ? 'Your name' : `Team member ${index + 1}`}
              aria-label={index === 0 ? 'Participant name (required)' : `Team member ${index + 1} (optional)`}
              required={index === 0}
              className="maze-text-field"
            />
            {members.length > 1 && (
              <button
                onClick={() => removeMember(index)}
                disabled={isSubmitting}
                aria-label={`Remove member ${index + 1}`}
                className="maze-inline-btn maze-inline-btn-danger"
              >
                X
              </button>
            )}
          </div>
        ))}

        {members.length < 6 && (
          <button
            onClick={addMember}
            disabled={isSubmitting}
            className="maze-inline-btn maze-inline-btn-add"
          >
            + Add team member
          </button>
        )}
      </div>

      <div
        className="maze-field-stack"
      >
        <label className="maze-section-label" htmlFor="team-course">Course (optional)</label>
        <select
          id="team-course"
          value={course}
          onChange={(event) => setCourse(event.target.value)}
          disabled={isSubmitting}
          className="maze-select-field"
        >
          <option value="">Select a course (optional)</option>
          {COURSE_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="maze-status-error">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="maze-action-btn maze-action-btn-primary maze-action-btn-success"
      >
        {isSubmitting ? 'Saving Team...' : 'Start Game'}
      </button>
      </section>
    </div>
  );
}
