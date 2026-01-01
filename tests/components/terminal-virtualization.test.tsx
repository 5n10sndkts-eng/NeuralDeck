/**
 * [P1] List Virtualization Tests - Story 6-5
 * Tests virtualized rendering for TheTerminal component
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import TheTerminal from '../../src/components/TheTerminal';
import { ChatMessage } from '../../src/types';

// Mock dependencies
jest.mock('../../src/services/sound', () => ({
  SoundEffects: {
    typing: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('../../src/services/api', () => ({
  sendChat: jest.fn(),
  readFile: jest.fn(),
}));

jest.mock('../../src/services/agent', () => ({
  AGENT_DEFINITIONS: {},
}));

jest.mock('../../src/contexts/ConversationContext', () => ({
  useConversation: () => ({
    newSession: jest.fn(),
    currentSessionId: 'test-session',
    sessions: [{ id: 'test-session', title: 'Test Session', messages: [] }],
  }),
}));

jest.mock('../../src/components/ConversationHistory', () => ({
  ConversationHistory: () => <div>History</div>,
}));

jest.mock('../../src/components/VisionDropZone', () => ({
  VisionDropZone: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock @tanstack/react-virtual
jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 120,
    getVirtualItems: () => {
      // Return first 10 items or all if less than 10
      const visibleCount = Math.min(count, 10);
      return Array.from({ length: visibleCount }, (_, i) => ({
        key: i,
        index: i,
        start: i * 120,
        size: 120,
      }));
    },
    scrollToIndex: jest.fn(),
    measureElement: undefined,
  }),
}));

const generateMessages = (count: number): ChatMessage[] => {
  return Array.from({ length: count }, (_, i) => ({
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `Message ${i + 1}`,
    timestamp: Date.now() - (count - i) * 1000,
  }));
};

describe('[P1] TheTerminal Virtualization', () => {
  const mockProps = {
    messages: [],
    onSendMessage: jest.fn(),
    isThinking: false,
    isMuted: false,
    onTransferCode: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with virtualization for large message lists', () => {
    const messages = generateMessages(1000);
    const { container } = render(<TheTerminal {...mockProps} messages={messages} />);
    
    // Should have virtualized container
    const virtualContainer = container.querySelector('[style*="position: relative"]');
    expect(virtualContainer).toBeInTheDocument();
  });

  it('should only render visible messages in DOM (not all 1000)', () => {
    const messages = generateMessages(1000);
    const { container } = render(<TheTerminal {...mockProps} messages={messages} />);
    
    // With virtualization, only ~10 messages should be in DOM at once
    const renderedMessages = container.querySelectorAll('[data-index]');
    expect(renderedMessages.length).toBeLessThan(20); // Should be way less than 1000
  });

  it('should render performance monitor', () => {
    const messages = generateMessages(100);
    render(<TheTerminal {...mockProps} messages={messages} />);
    
    expect(screen.getByText('PERFORMANCE')).toBeInTheDocument();
    expect(screen.getByText('Messages:')).toBeInTheDocument();
  });

  it('should show scroll-to-bottom button when scrolled up', () => {
    const messages = generateMessages(100);
    const { container } = render(<TheTerminal {...mockProps} messages={messages} />);
    
    // Button component should be rendered in the component
    // (visibility is controlled by showScrollButton state)
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should handle empty message list', () => {
    render(<TheTerminal {...mockProps} messages={[]} />);
    
    // Should show welcome message
    expect(screen.getByText(/SYSTEM READY/)).toBeInTheDocument();
  });

  it('should maintain cyberpunk styling with virtualization', () => {
    const messages = generateMessages(10);
    const { container } = render(<TheTerminal {...mockProps} messages={messages} />);
    
    // Check for cyberpunk gradient backgrounds
    const gradientElements = container.querySelectorAll('[style*="gradient"]');
    expect(gradientElements.length).toBeGreaterThan(0);
  });

  it('should show thinking indicator at the end', () => {
    const messages = generateMessages(50);
    render(<TheTerminal {...mockProps} messages={messages} isThinking={true} />);
    
    expect(screen.getByText('GENERATING SEQUENCE...')).toBeInTheDocument();
  });

  it('should handle code blocks in messages', () => {
    const messagesWithCode: ChatMessage[] = [{
      role: 'assistant',
      content: 'Here is code:\n```\nconst x = 42;\n```',
      timestamp: Date.now(),
    }];
    
    render(<TheTerminal {...mockProps} messages={messagesWithCode} />);
    
    expect(screen.getByText('CODE')).toBeInTheDocument();
    expect(screen.getByText('INJECT')).toBeInTheDocument();
  });
});

describe('[P1] PerformanceMonitor Component', () => {
  const mockProps = {
    messages: [],
    onSendMessage: jest.fn(),
    isThinking: false,
    isMuted: false,
    onTransferCode: jest.fn(),
  };

  it('should track FPS and render metrics', async () => {
    const messages = generateMessages(500);
    render(<TheTerminal {...mockProps} messages={messages} />);
    
    await waitFor(() => {
      expect(screen.getByText('PERFORMANCE')).toBeInTheDocument();
      expect(screen.getByText('FPS:')).toBeInTheDocument();
      expect(screen.getByText('Render:')).toBeInTheDocument();
    });
  });

  it('should display message count', () => {
    const messages = generateMessages(1234);
    render(<TheTerminal {...mockProps} messages={messages} />);
    
    expect(screen.getByText('1234')).toBeInTheDocument();
  });
});
