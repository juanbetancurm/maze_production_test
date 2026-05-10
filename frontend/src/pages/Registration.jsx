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

export default function Registration() {
  const navigate = useNavigate();
  const { team, isHydrating, registerTeam, clearSavedSession } = useGame();
  const [members, setMembers] = useState(['', '']);
  const [course, setCourse] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          marginBottom: '32px',
        }}
      >
        Register your team to start playing
      </p>

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
