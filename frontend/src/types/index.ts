export interface User {
  id: string;
  email: string;
  display_name: string;
  organization_id?: string;
  created_at: string;
}

export interface InterviewSession {
  id: string;
  owner_user_id: string;
  title: string;
  prompt: string;
  state: 'draft' | 'live' | 'ended' | 'archived';
  candidate_editing_enabled: boolean;
  scheduled_at?: string;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SessionMembership {
  session_id: string;
  user_id?: string;
  guest_participant_id?: string;
  role: 'owner' | 'interviewer' | 'candidate' | 'observer';
  created_at: string;
}

export interface GuestLink {
  id: string;
  session_id: string;
  token_hash: string;
  role_granted: 'candidate' | 'observer';
  expires_at?: string;
  max_uses?: number;
  revoked_at?: string;
  created_at: string;
}

export interface Participant {
  id: string;
  session_id: string;
  user_id?: string;
  display_name: string;
  role: 'owner' | 'interviewer' | 'candidate' | 'observer';
  joined_at: string;
  left_at?: string;
  color: string;
  is_online: boolean;
}

export interface CanvasElement {
  id: string;
  type: 'rectangle' | 'rounded-rectangle' | 'text' | 'sticky-note' | 'database' | 'cache' | 'queue' | 'client' | 'server' | 'llm' | 'connector' | 'freehand';
  x: number;
  y: number;
  width?: number;
  height?: number;
  label?: string;
  description?: string;
  color?: string;
  style?: string;
  connections?: string[];
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CanvasDocument {
  id: string;
  session_id: string;
  schema_version: string;
  elements: CanvasElement[];
  updated_at: string;
}

export interface PresenceUpdate {
  participant_id: string;
  cursor_x?: number;
  cursor_y?: number;
  selected_element_ids?: string[];
  viewport_x?: number;
  viewport_y?: number;
  viewport_zoom?: number;
}
