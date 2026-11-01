import { useState, useEffect } from 'react';
import { apiService } from './services';
import type { User, InterviewSession } from './types';
import Dashboard from './components/Dashboard';
import SessionView from './components/SessionView';
import JoinLobby from './components/JoinLobby';
import './App.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentSession, setCurrentSession] = useState<InterviewSession | null>(null);
  const [view, setView] = useState<'dashboard' | 'session' | 'join'>('dashboard');
  const [joinToken, setJoinToken] = useState<string | null>(null);

  useEffect(() => {
    // Load current user
    apiService.getCurrentUser().then(setUser);
  }, []);

  const handleCreateSession = async (title: string, prompt: string) => {
    const session = await apiService.createSession(title, prompt);
    setCurrentSession(session);
    setView('session');
  };

  const handleSelectSession = (session: InterviewSession) => {
    setCurrentSession(session);
    setView('session');
  };

  const handleJoinSession = (token: string) => {
    setJoinToken(token);
    setView('join');
  };

  const handleBackToDashboard = () => {
    setCurrentSession(null);
    setView('dashboard');
  };

  if (!user) {
    return <div className="loading">Loading...</div>;
  }

  if (view === 'join' && joinToken) {
    return <JoinLobby token={joinToken} onJoinSuccess={(session) => {
      setCurrentSession(session);
      setView('session');
    }} onCancel={() => setView('dashboard')} />;
  }

  if (view === 'session' && currentSession) {
    return (
      <SessionView
        session={currentSession}
        user={user}
        onBack={handleBackToDashboard}
      />
    );
  }

  return (
    <Dashboard
      user={user}
      onCreateSession={handleCreateSession}
      onSelectSession={handleSelectSession}
      onJoinSession={handleJoinSession}
    />
  );
}

export default App;
