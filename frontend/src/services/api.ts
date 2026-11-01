import { User, InterviewSession, Participant, CanvasDocument, GuestLink } from '../types';

export interface ApiService {
  // Authentication
  getCurrentUser(): Promise<User>;
  
  // Sessions
  createSession(title: string, prompt: string): Promise<InterviewSession>;
  getSessions(): Promise<InterviewSession[]>;
  getSession(sessionId: string): Promise<InterviewSession>;
  updateSession(sessionId: string, updates: Partial<InterviewSession>): Promise<InterviewSession>;
  startSession(sessionId: string): Promise<InterviewSession>;
  endSession(sessionId: string): Promise<InterviewSession>;
  duplicateSession(sessionId: string): Promise<InterviewSession>;
  
  // Guest Links
  createGuestLink(sessionId: string, role: 'candidate' | 'observer'): Promise<GuestLink>;
  revokeGuestLink(sessionId: string, linkId: string): Promise<void>;
  
  // Participants
  getParticipants(sessionId: string): Promise<Participant[]>;
  joinSession(token: string, displayName: string): Promise<{ session: InterviewSession; participant: Participant }>;
  
  // Canvas
  getCanvas(sessionId: string): Promise<CanvasDocument>;
  updateCanvas(sessionId: string, canvas: CanvasDocument): Promise<CanvasDocument>;
  
  // WebSocket (mock interface)
  connectToSession(sessionId: string, token: string): WebSocket;
}
