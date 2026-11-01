import { mockUser, mockSessions, mockParticipants, mockCanvasDocument, mockGuestLink } from './mockData';
import type { User, InterviewSession, Participant, CanvasDocument, GuestLink } from '../types';
import type { ApiService } from './api';

class MockWebSocket {
  private handlers: Map<string, (data: any) => void> = new Map();
  private interval: NodeJS.Timeout | null = null;

  constructor(private sessionId: string) {
    // Simulate real-time updates
    this.interval = setInterval(() => {
      this.emit('presence_update', {
        participant_id: 'participant-2',
        cursor_x: Math.random() * 800,
        cursor_y: Math.random() * 600,
      });
    }, 2000);
  }

  on(event: string, handler: (data: any) => void) {
    this.handlers.set(event, handler);
  }

  off(event: string) {
    this.handlers.delete(event);
  }

  emit(event: string, data: any) {
    const handler = this.handlers.get(event);
    if (handler) {
      handler(data);
    }
  }

  send(data: any) {
    // Simulate server response
    setTimeout(() => {
      if (data.type === 'document_update') {
        this.emit('document_update', data);
      }
    }, 100);
  }

  close() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}

class MockApiService implements ApiService {
  private currentUser: User = mockUser;
  private sessions: InterviewSession[] = [...mockSessions];
  private participants: Map<string, Participant[]> = new Map();
  private canvasDocuments: Map<string, CanvasDocument> = new Map();

  constructor() {
    this.participants.set('session-1', [...mockParticipants]);
    this.canvasDocuments.set('session-1', mockCanvasDocument);
  }

  async getCurrentUser(): Promise<User> {
    return this.currentUser;
  }

  async createSession(title: string, prompt: string): Promise<InterviewSession> {
    const newSession: InterviewSession = {
      id: `session-${Date.now()}`,
      owner_user_id: this.currentUser.id,
      title,
      prompt,
      state: 'draft',
      candidate_editing_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.sessions.push(newSession);
    return newSession;
  }

  async getSessions(): Promise<InterviewSession[]> {
    return this.sessions.filter(s => s.owner_user_id === this.currentUser.id);
  }

  async getSession(sessionId: string): Promise<InterviewSession> {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    return session;
  }

  async updateSession(sessionId: string, updates: Partial<InterviewSession>): Promise<InterviewSession> {
    const index = this.sessions.findIndex(s => s.id === sessionId);
    if (index === -1) {
      throw new Error('Session not found');
    }
    this.sessions[index] = { ...this.sessions[index], ...updates, updated_at: new Date().toISOString() };
    return this.sessions[index];
  }

  async startSession(sessionId: string): Promise<InterviewSession> {
    return this.updateSession(sessionId, {
      state: 'live',
      started_at: new Date().toISOString(),
    });
  }

  async endSession(sessionId: string): Promise<InterviewSession> {
    return this.updateSession(sessionId, {
      state: 'ended',
      ended_at: new Date().toISOString(),
      candidate_editing_enabled: false,
    });
  }

  async duplicateSession(sessionId: string): Promise<InterviewSession> {
    const original = await this.getSession(sessionId);
    const newSession = await this.createSession(
      `${original.title} (Copy)`,
      original.prompt
    );
    // Copy canvas
    const originalCanvas = this.canvasDocuments.get(sessionId);
    if (originalCanvas) {
      this.canvasDocuments.set(newSession.id, {
        ...originalCanvas,
        id: `canvas-${Date.now()}`,
        session_id: newSession.id,
      });
    }
    return newSession;
  }

  async createGuestLink(sessionId: string, role: 'candidate' | 'observer'): Promise<GuestLink> {
    return {
      ...mockGuestLink,
      id: `link-${Date.now()}`,
      session_id: sessionId,
      role_granted: role,
      created_at: new Date().toISOString(),
    };
  }

  async revokeGuestLink(sessionId: string, linkId: string): Promise<void> {
    // Mock implementation - would remove link in real implementation
  }

  async getParticipants(sessionId: string): Promise<Participant[]> {
    return this.participants.get(sessionId) || [];
  }

  async joinSession(token: string, displayName: string): Promise<{ session: InterviewSession; participant: Participant }> {
    const session = this.sessions[0]; // Mock: always join first session
    const participant: Participant = {
      id: `participant-${Date.now()}`,
      session_id: session.id,
      display_name,
      role: 'candidate',
      joined_at: new Date().toISOString(),
      color: '#EF4444',
      is_online: true,
    };
    
    const participants = this.participants.get(session.id) || [];
    participants.push(participant);
    this.participants.set(session.id, participants);
    
    return { session, participant };
  }

  async getCanvas(sessionId: string): Promise<CanvasDocument> {
    const canvas = this.canvasDocuments.get(sessionId);
    if (!canvas) {
      // Return empty canvas if none exists
      return {
        id: `canvas-${Date.now()}`,
        session_id: sessionId,
        schema_version: '1.0',
        elements: [],
        updated_at: new Date().toISOString(),
      };
    }
    return canvas;
  }

  async updateCanvas(sessionId: string, canvas: CanvasDocument): Promise<CanvasDocument> {
    this.canvasDocuments.set(sessionId, {
      ...canvas,
      updated_at: new Date().toISOString(),
    });
    return canvas;
  }

  connectToSession(sessionId: string, token: string): WebSocket {
    return new MockWebSocket(sessionId) as any;
  }
}

export const mockApiService = new MockApiService();
