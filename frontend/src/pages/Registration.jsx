/**
 * Registration.jsx - Team registration form.
 *
 * WHAT: Collects team member names and course selection before the game starts.
 * WHY: The school needs to track which teams played and their results.
 * HOW: Saves the team through the backend, then stores the backend response in
 *   GameContext.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { createTeam } from '../lib/api';

const INSTRUCTIONS_STORAGE_KEY = 'anglemaze:instructionsSeen';

export default function Registration() {
  const navigate = useNavigate();
  const { team, isHydrating, registerTeam, clearSavedSession } = useGame();
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
    const validMembers = members
      .map((member) => member.trim())
      .filter((member) => member.length > 0);

    if (validMembers.length === 0) {
      setError('Please enter at least one team member name.');
      return;
    }

    if (!course) {
      setError('Please select your course.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const savedTeam = await createTeam({ members: validMembers, course });
      registerTeam(savedTeam);
      navigate('/menu');
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
    return (
      <div
        className="maze-page-shell"
      >
        Restoring saved team...
      </div>
    );
  }

  return (
    <div
      className="maze-page-shell"
    >
      {showInstructions && (
        <div className="maze-modal-overlay">
          <div className="maze-card maze-card-soft maze-modal-card">
            <h2 className="maze-modal-title">Instructions</h2>
            <p className="maze-modal-copy">
              Guide your character through the maze using distance and angle commands. Fewer moves and faster times win!
            </p>
            <div className="maze-modal-list">
              {[
                '1. Register your team and course to begin.',
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
        AngleMaze
      </h1>

      <p className="maze-page-subtitle">
        Register your team to start playing
      </p>

      <div className="maze-page-actions">
        <button
          onClick={() => setShowInstructions(true)}
          className="maze-pill-btn"
        >
          View Instructions
        </button>

        <a
          href="https://www.labolavs.com/category/games"
          className="maze-pill-btn"
        >
          Back to Games
        </a>
      </div>

      {team && (
        <div
          className="maze-card maze-session-card"
        >
          <p className="maze-session-copy">
            Saved team loaded: {team.members.join(', ')} - Course {team.course}
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
        <label className="maze-section-label">Team Members</label>

        {members.map((name, index) => (
          <div key={index} className="maze-field-row">
            <input
              type="text"
              value={name}
              onChange={(event) => handleMemberChange(index, event.target.value)}
              placeholder={`Member ${index + 1}`}
              className="maze-text-field"
            />
            {members.length > 1 && (
              <button
                onClick={() => removeMember(index)}
                disabled={isSubmitting}
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
            + Add member
          </button>
        )}
      </div>

      <div
        className="maze-field-stack"
      >
        <label className="maze-section-label">Course</label>
        <select
          value={course}
          onChange={(event) => setCourse(event.target.value)}
          disabled={isSubmitting}
          className="maze-select-field"
        >
          <option value="">Select your course...</option>
          <option value="8A">8A</option>
          <option value="8B">8B</option>
          <option value="8C">8C</option>
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
    </div>
  );
}
