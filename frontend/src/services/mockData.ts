import { User, InterviewSession, Participant, CanvasDocument, CanvasElement, GuestLink } from '../types';

export const mockUser: User = {
  id: 'user-1',
  email: 'interviewer@example.com',
  display_name: 'Interviewer User',
  organization_id: 'org-1',
  created_at: '2024-01-01T00:00:00Z',
};

export const mockSessions: InterviewSession[] = [
  {
    id: 'session-1',
    owner_user_id: 'user-1',
    title: 'System Design - Distributed Cache',
    prompt: 'Design a distributed caching system for a high-traffic web application.',
    state: 'draft',
    candidate_editing_enabled: true,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'session-2',
    owner_user_id: 'user-1',
    title: 'Microservices Architecture',
    prompt: 'Design a microservices architecture for an e-commerce platform.',
    state: 'live',
    candidate_editing_enabled: true,
    started_at: '2024-01-20T14:00:00Z',
    created_at: '2024-01-20T13:00:00Z',
    updated_at: '2024-01-20T14:30:00Z',
  },
];

export const mockParticipants: Participant[] = [
  {
    id: 'participant-1',
    session_id: 'session-1',
    user_id: 'user-1',
    display_name: 'Interviewer User',
    role: 'owner',
    joined_at: '2024-01-15T10:00:00Z',
    color: '#3B82F6',
    is_online: true,
  },
  {
    id: 'participant-2',
    session_id: 'session-1',
    display_name: 'Candidate Jane',
    role: 'candidate',
    joined_at: '2024-01-15T10:05:00Z',
    color: '#10B981',
    is_online: true,
  },
];

export const mockCanvasElements: CanvasElement[] = [
  {
    id: 'element-1',
    type: 'client',
    x: 100,
    y: 100,
    width: 120,
    height: 80,
    label: 'Web Client',
    color: '#3B82F6',
    created_at: '2024-01-15T10:10:00Z',
    updated_at: '2024-01-15T10:10:00Z',
  },
  {
    id: 'element-2',
    type: 'server',
    x: 300,
    y: 100,
    width: 120,
    height: 80,
    label: 'API Server',
    color: '#10B981',
    created_at: '2024-01-15T10:11:00Z',
    updated_at: '2024-01-15T10:11:00Z',
  },
  {
    id: 'element-3',
    type: 'cache',
    x: 500,
    y: 100,
    width: 120,
    height: 80,
    label: 'Redis Cache',
    color: '#F59E0B',
    created_at: '2024-01-15T10:12:00Z',
    updated_at: '2024-01-15T10:12:00Z',
  },
  {
    id: 'element-4',
    type: 'database',
    x: 300,
    y: 250,
    width: 120,
    height: 80,
    label: 'PostgreSQL',
    color: '#8B5CF6',
    created_at: '2024-01-15T10:13:00Z',
    updated_at: '2024-01-15T10:13:00Z',
  },
  {
    id: 'connector-1',
    type: 'connector',
    x: 220,
    y: 140,
    label: 'HTTPS',
    connections: ['element-1', 'element-2'],
    created_at: '2024-01-15T10:14:00Z',
    updated_at: '2024-01-15T10:14:00Z',
  },
];

export const mockCanvasDocument: CanvasDocument = {
  id: 'canvas-1',
  session_id: 'session-1',
  schema_version: '1.0',
  elements: mockCanvasElements,
  updated_at: '2024-01-15T10:15:00Z',
};

export const mockGuestLink: GuestLink = {
  id: 'link-1',
  session_id: 'session-1',
  token_hash: 'abc123',
  role_granted: 'candidate',
  created_at: '2024-01-15T10:00:00Z',
};
