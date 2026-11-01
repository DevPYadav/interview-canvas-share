import { useState, useEffect } from 'react';
import type { InterviewSession, User } from '../types';
import { apiService } from '../services';
import './Dashboard.css';

interface DashboardProps {
  user: User;
  onCreateSession: (title: string, prompt: string) => void;
  onSelectSession: (session: InterviewSession) => void;
  onJoinSession: (token: string) => void;
}

function Dashboard({ user, onCreateSession, onSelectSession, onJoinSession }: DashboardProps) {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [joinToken, setJoinToken] = useState('');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    const userSessions = await apiService.getSessions();
    setSessions(userSessions);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      onCreateSession(newTitle, newPrompt);
      setNewTitle('');
      setNewPrompt('');
      setShowCreateForm(false);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinToken.trim()) {
      onJoinSession(joinToken);
      setJoinToken('');
    }
  };

  const handleStartSession = async (sessionId: string) => {
    await apiService.startSession(sessionId);
    loadSessions();
  };

  const handleEndSession = async (sessionId: string) => {
    await apiService.endSession(sessionId);
    loadSessions();
  };

  const handleDuplicate = async (sessionId: string) => {
    await apiService.duplicateSession(sessionId);
    loadSessions();
  };

  const getStateClass = (state: string) => {
    switch (state) {
      case 'draft': return 'draft';
      case 'live': return 'live';
      case 'ended': return 'ended';
      default: return 'draft';
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Interview Sessions</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <form onSubmit={handleJoin} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Enter join token"
              value={joinToken}
              onChange={(e) => setJoinToken(e.target.value)}
              style={{ padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}
            />
            <button type="submit" className="create-button" style={{ padding: '0.5rem 1rem' }}>
              Join
            </button>
          </form>
          <button className="create-button" onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? 'Cancel' : '+ New Session'}
          </button>
        </div>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreate} className="create-form">
          <div className="form-group">
            <label htmlFor="title">Session Title</label>
            <input
              id="title"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g., System Design - Distributed Cache"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="prompt">Problem Statement</label>
            <textarea
              id="prompt"
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              placeholder="Describe the design problem..."
              rows={4}
            />
          </div>
          <button type="submit" className="create-button">Create Session</button>
        </form>
      )}

      <div className="sessions-grid">
        {sessions.map((session) => (
          <div key={session.id} className="session-card">
            <h3>{session.title}</h3>
            <span className={`session-state ${getStateClass(session.state)}`}>
              {session.state.toUpperCase()}
            </span>
            <p className="session-prompt">{session.prompt || 'No prompt'}</p>
            <div className="session-meta">
              Created: {new Date(session.created_at).toLocaleDateString()}
              {session.started_at && ` • Started: ${new Date(session.started_at).toLocaleDateString()}`}
            </div>
            <div className="session-actions">
              <button className="primary" onClick={() => onSelectSession(session)}>
                Open
              </button>
              {session.state === 'draft' && (
                <button onClick={() => handleStartSession(session.id)}>Start</button>
              )}
              {session.state === 'live' && (
                <button onClick={() => handleEndSession(session.id)}>End</button>
              )}
              <button onClick={() => handleDuplicate(session.id)}>Duplicate</button>
            </div>
          </div>
        ))}
      </div>

      {sessions.length === 0 && (
        <div className="empty-state">
          <p>No sessions yet. Create your first interview session to get started.</p>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
