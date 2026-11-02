import type { User, InterviewSession, Participant, CanvasDocument, GuestLink } from '../types';
import type { ApiService, SessionSocket } from './api';

const BASE = '/v1';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${options.method || 'GET'} ${path} failed (${res.status}): ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// The backend has no WebSocket endpoint yet, so this is a no-op socket.
class NoopSocket implements SessionSocket {
  on(_event: string, _cb: (data: any) => void): void {}
  send(_data: any): void {}
  close(): void {}
}

export const httpApiService: ApiService = {
  getCurrentUser: () => request<User>('/users/me'),

  createSession: (title, prompt) =>
    request<InterviewSession>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ title, prompt }),
    }),
  getSessions: () => request<InterviewSession[]>('/sessions'),
  getSession: (id) => request<InterviewSession>(`/sessions/${id}`),
  updateSession: (id, updates) =>
    request<InterviewSession>(`/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  startSession: (id) => request<InterviewSession>(`/sessions/${id}/start`, { method: 'POST' }),
  endSession: (id) => request<InterviewSession>(`/sessions/${id}/end`, { method: 'POST' }),
  duplicateSession: (id) =>
    request<InterviewSession>(`/sessions/${id}/duplicate`, { method: 'POST' }),

  createGuestLink: (id, role) =>
    request<GuestLink>(`/sessions/${id}/guest-links`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),
  revokeGuestLink: (id, linkId) =>
    request<void>(`/sessions/${id}/guest-links/${linkId}`, { method: 'DELETE' }),

  getParticipants: (id) => request<Participant[]>(`/sessions/${id}/participants`),
  joinSession: (token, display_name) =>
    request<{ session: InterviewSession; participant: Participant }>(`/join/${token}`, {
      method: 'POST',
      body: JSON.stringify({ display_name }),
    }),

  getCanvas: (id) => request<CanvasDocument>(`/sessions/${id}/canvas`),
  updateCanvas: (id, canvas) =>
    request<CanvasDocument>(`/sessions/${id}/canvas`, {
      method: 'POST',
      body: JSON.stringify(canvas),
    }),

  connectToSession: () => new NoopSocket(),
};
