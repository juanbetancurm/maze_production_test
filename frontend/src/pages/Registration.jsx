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
      {showInstructions && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'rgba(5, 8, 20, 0.86)',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              border: '1px solid #335',
              borderRadius: '16px',
              background: 'linear-gradient(180deg, #161a34 0%, #0f1224 100%)',
              boxShadow: '0 18px 40px rgba(0, 0, 0, 0.45)',
              color: '#d7def9',
            }}
          >
            <h2 style={{ margin: '0 0 12px 0', fontSize: '22px', color: '#8ab4ff' }}>
              How AngleMaze Works
            </h2>
            <p style={{ margin: '0 0 14px 0', fontSize: '14px', color: '#b7c2e4', lineHeight: 1.6 }}>
              Guide your character through the maze using distance and angle commands. Fewer moves and faster times win!
            </p>
            <div
              style={{
                display: 'grid',
                gap: '10px',
                marginBottom: '18px',
              }}
            >
              {[
                '1. Register your team and course to begin.',
                '2. Enter a distance (in pixels) and press Forward to move.',
                '3. Enter an angle (in degrees) and press Turn Left or Turn Right to change direction.',
                '4. Hitting a wall restarts the level. Reach the exit to save your score!',
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(138, 180, 255, 0.14)',
                    fontSize: '13px',
                    lineHeight: 1.5,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <button
                onClick={closeInstructions}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  background: '#18301d',
                  border: '1px solid #44aa66',
                  borderRadius: '10px',
                  color: '#7df39a',
                  cursor: 'pointer',
                }}
              >
                Start Exploring
              </button>
            </div>
          </div>
        </div>
      )}

      <h1
        style={{
          fontSize: '28px',
          color: '#6699cc',
          marginBottom: '8px',
        }}
      >
        AngleMaze
      </h1>

      <p
        style={{
          fontSize: '14px',
          color: '#889',
          marginBottom: '18px',
        }}
      >
        Register your team to start playing
      </p>

      <button
        onClick={() => setShowInstructions(true)}
        style={{
          marginBottom: '20px',
          padding: '8px 12px',
          fontFamily: 'monospace',
          fontSize: '12px',
          background: '#131722',
          border: '1px solid #31405f',
          borderRadius: '999px',
          color: '#9cb6e9',
          cursor: 'pointer',
        }}
      >
        View Instructions
      </button>

      {team && (
        <div
          style={{
            width: '100%',
            maxWidth: '360px',
            marginBottom: '24px',
            padding: '12px 14px',
            border: '1px solid #334',
            borderRadius: '8px',
            background: '#111827',
            color: '#cdd6f4',
          }}
        >
          <p style={{ margin: '0 0 10px 0', fontSize: '13px' }}>
            Saved team loaded: {team.members.join(', ')} - Course {team.course}
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => navigate('/menu')}
              style={{
                flex: 1,
                padding: '10px 12px',
                fontFamily: 'monospace',
                fontSize: '13px',
                background: '#1a3a1a',
                border: '1px solid #44aa66',
                borderRadius: '6px',
                color: '#55dd77',
                cursor: 'pointer',
              }}
            >
              Continue Team
            </button>
            <button
              onClick={clearSavedSession}
              style={{
                flex: 1,
                padding: '10px 12px',
                fontFamily: 'monospace',
                fontSize: '13px',
                background: '#2a1a1a',
                border: '1px solid #884444',
                borderRadius: '6px',
                color: '#ff9f9f',
                cursor: 'pointer',
              }}
            >
              New Team
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          width: '100%',
          maxWidth: '360px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          marginBottom: '20px',
        }}
      >
        <label style={{ color: '#aab', fontSize: '13px' }}>Team Members:</label>

        {members.map((name, index) => (
          <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={name}
              onChange={(event) => handleMemberChange(index, event.target.value)}
              placeholder={`Member ${index + 1}`}
              style={{
                flex: 1,
                padding: '10px 12px',
                fontFamily: 'monospace',
                fontSize: '14px',
                border: '1px solid #334',
                borderRadius: '6px',
                background: '#1a1a2e',
                color: '#dde',
                outline: 'none',
              }}
            />
            {members.length > 1 && (
              <button
                onClick={() => removeMember(index)}
                disabled={isSubmitting}
                style={{
                  padding: '8px 12px',
                  background: '#2a1a1a',
                  border: '1px solid #443',
                  borderRadius: '6px',
                  color: '#a66',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                }}
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
            style={{
              padding: '8px',
              background: '#111',
              border: '1px dashed #445',
              borderRadius: '6px',
              color: '#778',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: '13px',
            }}
          >
            + Add member
          </button>
        )}
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '360px',
          marginBottom: '24px',
        }}
      >
        <label style={{ color: '#aab', fontSize: '13px', display: 'block', marginBottom: '8px' }}>
          Course:
        </label>
        <select
          value={course}
          onChange={(event) => setCourse(event.target.value)}
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontFamily: 'monospace',
            fontSize: '14px',
            border: '1px solid #334',
            borderRadius: '6px',
            background: '#1a1a2e',
            color: course ? '#dde' : '#667',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="">Select your course...</option>
          <option value="8A">8A</option>
          <option value="8B">8B</option>
          <option value="8C">8C</option>
        </select>
      </div>

      {error && (
        <p
          style={{
            color: '#ff6655',
            fontSize: '13px',
            marginBottom: '16px',
          }}
        >
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        style={{
          padding: '14px 48px',
          fontSize: '16px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          background: '#1a3a1a',
          border: '2px solid #44aa66',
          borderRadius: '10px',
          color: '#55dd77',
          cursor: isSubmitting ? 'wait' : 'pointer',
          opacity: isSubmitting ? 0.7 : 1,
          letterSpacing: '0.05em',
        }}
      >
        {isSubmitting ? 'Saving Team...' : 'Start Game'}
      </button>
    </div>
  );
}
