import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from '../components/Dashboard';
import { User } from '../types';

describe('Dashboard', () => {
  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    display_name: 'Test User',
    created_at: '2024-01-01T00:00:00Z',
  };

  it('renders dashboard header', () => {
    render(
      <Dashboard
        user={mockUser}
        onCreateSession={() => {}}
        onSelectSession={() => {}}
        onJoinSession={() => {}}
      />
    );
    expect(screen.getByText('Interview Sessions')).toBeInTheDocument();
  });

  it('renders create button', () => {
    render(
      <Dashboard
        user={mockUser}
        onCreateSession={() => {}}
        onSelectSession={() => {}}
        onJoinSession={() => {}}
      />
    );
    expect(screen.getByText('+ New Session')).toBeInTheDocument();
  });

  it('renders join form', () => {
    render(
      <Dashboard
        user={mockUser}
        onCreateSession={() => {}}
        onSelectSession={() => {}}
        onJoinSession={() => {}}
      />
    );
    expect(screen.getByPlaceholderText('Enter join token')).toBeInTheDocument();
  });
});
