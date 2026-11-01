import { Participant } from '../types';
import './ParticipantList.css';

interface ParticipantListProps {
  participants: Participant[];
}

function ParticipantList({ participants }: ParticipantListProps) {
  return (
    <div className="participant-list">
      <h3>Participants ({participants.length})</h3>
      <div className="participants">
        {participants.map((participant) => (
          <div key={participant.id} className="participant-item">
            <div
              className="participant-avatar"
              style={{ backgroundColor: participant.color }}
            >
              {participant.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="participant-info">
              <div className="participant-name">{participant.display_name}</div>
              <div className="participant-role">{participant.role}</div>
            </div>
            <div className={`participant-status ${participant.is_online ? 'online' : 'offline'}`}>
              {participant.is_online ? '●' : '○'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ParticipantList;
