import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OpenCodeStatus } from '../../src/components/OpenCodeStatus';

jest.mock('../../src/services/api', () => ({
  getOpenCodeHealth: jest.fn(),
  getOpenCodeSessions: jest.fn()
}));

const { getOpenCodeHealth, getOpenCodeSessions } = require('../../src/services/api');

describe('OpenCodeStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[P0] renders online status and session count', async () => {
    getOpenCodeHealth.mockResolvedValue({ success: true, healthy: true, version: '1.1.56' });
    getOpenCodeSessions.mockResolvedValue({
      sessions: [{ id: 's1' }, { id: 's2' }],
      cache: { sessions: { architect: { session_id: 's1' } } }
    });

    render(<OpenCodeStatus onOpenChat={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/OPENCODE ONLINE/i)).toBeInTheDocument();
      expect(screen.getByText(/SESSIONS:2/i)).toBeInTheDocument();
    });
  });

  it('[P0] triggers chat open callback', async () => {
    getOpenCodeHealth.mockResolvedValue({ success: true, healthy: true });
    getOpenCodeSessions.mockResolvedValue({ sessions: [], cache: { sessions: {} } });

    const onOpenChat = jest.fn();
    render(<OpenCodeStatus onOpenChat={onOpenChat} />);

    const button = await screen.findByText(/AGENT CHAT/i);
    fireEvent.click(button);

    expect(onOpenChat).toHaveBeenCalledTimes(1);
  });
});
