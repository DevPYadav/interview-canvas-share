import { useState, useEffect, useRef } from 'react';
import type { InterviewSession, User, CanvasDocument, CanvasElement } from '../types';
import { apiService } from '../services';
import Canvas from './Canvas';
import SessionHeader from './SessionHeader';
import ParticipantList from './ParticipantList';
import PromptPanel from './PromptPanel';
import './SessionView.css';

interface SessionViewProps {
  session: InterviewSession;
  user: User;
  onBack: () => void;
}

function SessionView({ session, user, onBack }: SessionViewProps) {
  const [canvas, setCanvas] = useState<CanvasDocument | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    loadCanvas();
    loadParticipants();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [session.id]);

  const loadCanvas = async () => {
    const canvasData = await apiService.getCanvas(session.id);
    setCanvas(canvasData);
  };

  const loadParticipants = async () => {
    const participantsData = await apiService.getParticipants(session.id);
    setParticipants(participantsData);
  };

  const connectWebSocket = () => {
    try {
      const ws = apiService.connectToSession(session.id, 'mock-token');
      wsRef.current = ws as any;
      
      ws.on('connect', () => {
        setIsConnected(true);
      });

      ws.on('document_update', (data: any) => {
        if (canvas) {
          setCanvas({ ...canvas, elements: data.elements || canvas.elements });
        }
      });

      ws.on('presence_update', (data: any) => {
        setParticipants(prev => prev.map(p => 
          p.id === data.participant_id ? { ...p, ...data } : p
        ));
      });

      setIsConnected(true);
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      setIsConnected(false);
    }
  };

  const handleCanvasUpdate = async (updatedCanvas: CanvasDocument) => {
    setCanvas(updatedCanvas);
    await apiService.updateCanvas(session.id, updatedCanvas);
    
    // Send update via WebSocket
    if (wsRef.current) {
      wsRef.current.send({ type: 'document_update', elements: updatedCanvas.elements });
    }
  };

  const handleEndSession = async () => {
    if (window.confirm('Are you sure you want to end this session?')) {
      await apiService.endSession(session.id);
      onBack();
    }
  };

  return (
    <div className="session-view">
      <SessionHeader
        session={session}
        user={user}
        isConnected={isConnected}
        onBack={onBack}
        onEndSession={handleEndSession}
      />
      <div className="session-content">
        <ParticipantList participants={participants} />
        <div className="canvas-container">
          {canvas && (
            <Canvas
              canvas={canvas}
              readonly={session.state === 'ended' || !session.candidate_editing_enabled}
              onUpdate={handleCanvasUpdate}
            />
          )}
        </div>
        <PromptPanel prompt={session.prompt} />
      </div>
    </div>
  );
}

export default SessionView;
