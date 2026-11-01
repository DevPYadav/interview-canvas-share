import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockApiService } from '../services/mockApi';
import { User, InterviewSession } from '../types';

describe('MockApiService', () => {
  beforeEach(() => {
    // Reset mock data before each test
    vi.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('should return the current user', async () => {
      const user = await mockApiService.getCurrentUser();
      expect(user).toBeDefined();
      expect(user.email).toBe('interviewer@example.com');
      expect(user.display_name).toBe('Interviewer User');
    });
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const session = await mockApiService.createSession(
        'Test Session',
        'Test prompt'
      );
      expect(session).toBeDefined();
      expect(session.title).toBe('Test Session');
      expect(session.prompt).toBe('Test prompt');
      expect(session.state).toBe('draft');
    });
  });

  describe('getSessions', () => {
    it('should return list of sessions', async () => {
      const sessions = await mockApiService.getSessions();
      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBeGreaterThan(0);
    });
  });

  describe('getSession', () => {
    it('should return a specific session', async () => {
      const session = await mockApiService.getSession('session-1');
      expect(session).toBeDefined();
      expect(session.id).toBe('session-1');
    });

    it('should throw error for non-existent session', async () => {
      await expect(mockApiService.getSession('invalid-id')).rejects.toThrow(
        'Session not found'
      );
    });
  });

  describe('updateSession', () => {
    it('should update session properties', async () => {
      const updated = await mockApiService.updateSession('session-1', {
        title: 'Updated Title',
      });
      expect(updated.title).toBe('Updated Title');
    });
  });

  describe('startSession', () => {
    it('should start a session', async () => {
      const session = await mockApiService.startSession('session-1');
      expect(session.state).toBe('live');
      expect(session.started_at).toBeDefined();
    });
  });

  describe('endSession', () => {
    it('should end a session', async () => {
      const session = await mockApiService.endSession('session-1');
      expect(session.state).toBe('ended');
      expect(session.ended_at).toBeDefined();
      expect(session.candidate_editing_enabled).toBe(false);
    });
  });

  describe('getCanvas', () => {
    it('should return canvas document', async () => {
      const canvas = await mockApiService.getCanvas('session-1');
      expect(canvas).toBeDefined();
      expect(canvas.session_id).toBe('session-1');
      expect(Array.isArray(canvas.elements)).toBe(true);
    });
  });

  describe('updateCanvas', () => {
    it('should update canvas elements', async () => {
      const canvas = await mockApiService.getCanvas('session-1');
      const updated = await mockApiService.updateCanvas('session-1', {
        ...canvas,
        elements: [...canvas.elements, {
          id: 'new-element',
          type: 'rectangle',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
      });
      expect(updated.elements.length).toBe(canvas.elements.length + 1);
    });
  });
});
