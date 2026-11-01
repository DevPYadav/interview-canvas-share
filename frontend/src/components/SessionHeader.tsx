import { FaPlay, FaStop, FaArrowLeft, FaShare } from 'react-icons/fa';
import type { InterviewSession, User } from '../types';
import './SessionHeader.css';

interface SessionHeaderProps {
  session: InterviewSession;
  user: User;
  isConnected: boolean;
  onBack: () => void;
  onEndSession: () => void;
}

function SessionHeader({ session, user, isConnected, onBack, onEndSession }: SessionHeaderProps) {
  return (
    <header className="session-header">
      <div className="header-left">
        <button className="icon-button" onClick={onBack} title="Back to Dashboard">
          <FaArrowLeft />
        </button>
        <div className="session-info">
          <h1>{session.title}</h1>
          <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '● Connected' : '○ Disconnected'}
          </span>
        </div>
      </div>
      <div className="header-right">
        <span className={`session-state-badge ${session.state}`}>
          {session.state.toUpperCase()}
        </span>
        {session.state === 'live' && user.id === session.owner_user_id && (
          <button className="danger-button" onClick={onEndSession}>
            <FaStop /> End Session
          </button>
        )}
        <button className="icon-button" title="Share Link">
          <FaShare />
        </button>
      </div>
    </header>
  );
}

export default SessionHeader;
