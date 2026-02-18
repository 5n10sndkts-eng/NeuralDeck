import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AgentChat } from '../../src/components/AgentChat';

jest.mock('../../src/services/api', () => ({
  getOpenCodeAgents: jest.fn(),
  sendOpenCodePrompt: jest.fn()
}));

const { getOpenCodeAgents, sendOpenCodePrompt } = require('../../src/services/api');

describe('AgentChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getOpenCodeAgents.mockResolvedValue({
      mappings: {
        architect: { routing: 'opencode' },
        qa_engineer: { routing: 'opencode' },
        developer: { routing: 'local' }
      }
    });
  });

  it('[P0] renders only when open and shows title', async () => {
    const { rerender } = render(<AgentChat isOpen={false} onClose={jest.fn()} />);
    expect(screen.queryByText(/OPENCODE AGENT CHAT/i)).not.toBeInTheDocument();

    rerender(<AgentChat isOpen={true} onClose={jest.fn()} />);
    expect(await screen.findByText(/OPENCODE AGENT CHAT/i)).toBeInTheDocument();
  });

  it('[P0] sends prompt and renders assistant response', async () => {
    sendOpenCodePrompt.mockResolvedValue({
      success: true,
      result: {
        content: 'Architect response',
        fallbackUsed: false,
        provider: 'opencode'
      }
    });

    render(<AgentChat isOpen={true} onClose={jest.fn()} defaultAgent="architect" />);

    const input = await screen.findByPlaceholderText(/Message The Architect/i);
    fireEvent.change(input, { target: { value: 'Design the system.' } });

    const sendButton = screen.getByText('SEND');
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(sendOpenCodePrompt).toHaveBeenCalledWith(
        'architect',
        expect.stringContaining('Design the system.'),
        { timeout: 30000 }
      );
      expect(screen.getByText('Architect response')).toBeInTheDocument();
    });
  });
});
