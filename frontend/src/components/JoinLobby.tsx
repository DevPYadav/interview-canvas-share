import { useState } from 'react';
import { apiService } from '../services';
import './JoinLobby.css';

interface JoinLobbyProps {
  token: string;
  onJoinSuccess: (session: any) => void;
  onCancel: () => void;
}

function JoinLobby({ token, onJoinSuccess, onCancel }: JoinLobbyProps) {
  const [displayName, setDisplayName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      const result = await apiService.joinSession(token, displayName);
      onJoinSuccess(result.session);
    } catch (err) {
      setError('Failed to join session. Please check the link and try again.');
      setIsJoining(false);
    }
  };

  return (
    <div className="join-lobby">
      <div className="join-card">
        <h1>Join Interview Session</h1>
        <p className="join-subtitle">Enter your name to join the collaborative canvas</p>
        
        <form onSubmit={handleJoin}>
          <div className="form-group">
            <label htmlFor="displayName">Your Name</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., Jane Doe"
              required
              maxLength={50}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={isJoining}>
              {isJoining ? 'Joining...' : 'Join Session'}
            </button>
          </div>
        </form>

        <div className="privacy-notice">
          <p>By joining, you agree that your canvas activity will be saved for the interviewer to review.</p>
        </div>
      </div>
    </div>
  );
}

export default JoinLobby;
