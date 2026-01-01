/**
 * UIContext Tests - Story 5-1: War Room Mode
 * Tests for theme state management and War Room toggle functionality
 */

import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { UIProvider, useUI, ThemeMode } from '../../src/contexts/UIContext';

// Mock the sound effects module
jest.mock('../../src/services/sound', () => ({
    SoundEffects: {
        hover: jest.fn(),
        click: jest.fn(),
        boot: jest.fn(),
        alert: jest.fn(),
        typing: jest.fn(),
        success: jest.fn(),
        error: jest.fn(),
    }
}));

// Test component to access UIContext
const TestConsumer: React.FC = () => {
    const { themeMode, isWarRoomActive, toggleWarRoomMode, setThemeMode } = useUI();
    return (
        <div>
            <span data-testid="theme-mode">{themeMode}</span>
            <span data-testid="war-room-active">{isWarRoomActive ? 'true' : 'false'}</span>
            <button data-testid="toggle-btn" onClick={toggleWarRoomMode}>Toggle</button>
            <button data-testid="set-default" onClick={() => setThemeMode('default')}>Set Default</button>
            <button data-testid="set-warroom" onClick={() => setThemeMode('war-room')}>Set War Room</button>
        </div>
    );
};

describe('UIContext - Story 5-1: War Room Mode', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        // Remove data-theme attribute
        document.documentElement.removeAttribute('data-theme');
    });

    describe('Default State', () => {
        it('[P0] should start with default theme mode', () => {
            render(
                <UIProvider>
                    <TestConsumer />
                </UIProvider>
            );

            expect(screen.getByTestId('theme-mode').textContent).toBe('default');
            expect(screen.getByTestId('war-room-active').textContent).toBe('false');
        });

        it('[P0] should not have data-theme attribute by default', () => {
            render(
                <UIProvider>
                    <TestConsumer />
                </UIProvider>
            );

            expect(document.documentElement.getAttribute('data-theme')).toBeNull();
        });
    });

    describe('toggleWarRoomMode', () => {
        it('[P0] should toggle to war-room mode', async () => {
            render(
                <UIProvider>
                    <TestConsumer />
                </UIProvider>
            );

            const toggleBtn = screen.getByTestId('toggle-btn');

            await act(async () => {
                fireEvent.click(toggleBtn);
            });

            expect(screen.getByTestId('theme-mode').textContent).toBe('war-room');
            expect(screen.getByTestId('war-room-active').textContent).toBe('true');
        });

        it('[P0] should toggle back to default mode', async () => {
            render(
                <UIProvider>
                    <TestConsumer />
                </UIProvider>
            );

            const toggleBtn = screen.getByTestId('toggle-btn');

            // Toggle to war-room
            await act(async () => {
                fireEvent.click(toggleBtn);
            });
            expect(screen.getByTestId('theme-mode').textContent).toBe('war-room');

            // Toggle back to default
            await act(async () => {
                fireEvent.click(toggleBtn);
            });
            expect(screen.getByTestId('theme-mode').textContent).toBe('default');
        });

        it('[P1] should apply data-theme attribute when war-room is active', async () => {
            render(
                <UIProvider>
                    <TestConsumer />
                </UIProvider>
            );

            const toggleBtn = screen.getByTestId('toggle-btn');

            await act(async () => {
                fireEvent.click(toggleBtn);
            });

            expect(document.documentElement.getAttribute('data-theme')).toBe('war-room');
        });

        it('[P1] should remove data-theme attribute when war-room is deactivated', async () => {
            render(
                <UIProvider>
                    <TestConsumer />
                </UIProvider>
            );

            const toggleBtn = screen.getByTestId('toggle-btn');

            // Toggle on
            await act(async () => {
                fireEvent.click(toggleBtn);
            });
            expect(document.documentElement.getAttribute('data-theme')).toBe('war-room');

            // Toggle off
            await act(async () => {
                fireEvent.click(toggleBtn);
            });
            expect(document.documentElement.getAttribute('data-theme')).toBeNull();
        });
    });

    describe('setThemeMode', () => {
        it('[P0] should set theme mode directly to war-room', async () => {
            render(
                <UIProvider>
                    <TestConsumer />
                </UIProvider>
            );

            const setWarRoomBtn = screen.getByTestId('set-warroom');

            await act(async () => {
                fireEvent.click(setWarRoomBtn);
            });

            expect(screen.getByTestId('theme-mode').textContent).toBe('war-room');
            expect(screen.getByTestId('war-room-active').textContent).toBe('true');
        });

        it('[P0] should set theme mode directly to default', async () => {
            render(
                <UIProvider>
                    <TestConsumer />
                </UIProvider>
            );

            // First set to war-room
            const setWarRoomBtn = screen.getByTestId('set-warroom');
            await act(async () => {
                fireEvent.click(setWarRoomBtn);
            });

            // Then set back to default
            const setDefaultBtn = screen.getByTestId('set-default');
            await act(async () => {
                fireEvent.click(setDefaultBtn);
            });

            expect(screen.getByTestId('theme-mode').textContent).toBe('default');
            expect(screen.getByTestId('war-room-active').textContent).toBe('false');
        });
    });

    describe('localStorage Persistence', () => {
        it('[P0] should persist theme to localStorage', async () => {
            render(
                <UIProvider>
                    <TestConsumer />
                </UIProvider>
            );

            const toggleBtn = screen.getByTestId('toggle-btn');

            await act(async () => {
                fireEvent.click(toggleBtn);
            });

            expect(localStorage.getItem('neuraldeck-theme')).toBe('war-room');
        });

        it('[P0] should load persisted theme on mount', () => {
            // Pre-set localStorage
            localStorage.setItem('neuraldeck-theme', 'war-room');

            render(
                <UIProvider>
                    <TestConsumer />
                </UIProvider>
            );

            expect(screen.getByTestId('theme-mode').textContent).toBe('war-room');
            expect(screen.getByTestId('war-room-active').textContent).toBe('true');
        });

        it('[P1] should handle invalid localStorage value gracefully', () => {
            // Set invalid value
            localStorage.setItem('neuraldeck-theme', 'invalid-theme');

            render(
                <UIProvider>
                    <TestConsumer />
                </UIProvider>
            );

            // Should default to 'default'
            expect(screen.getByTestId('theme-mode').textContent).toBe('default');
        });
    });

    describe('isWarRoomActive computed property', () => {
        it('[P0] should return true when theme is war-room', async () => {
            render(
                <UIProvider>
                    <TestConsumer />
                </UIProvider>
            );

            const setWarRoomBtn = screen.getByTestId('set-warroom');

            await act(async () => {
                fireEvent.click(setWarRoomBtn);
            });

            expect(screen.getByTestId('war-room-active').textContent).toBe('true');
        });

        it('[P0] should return false when theme is default', () => {
            render(
                <UIProvider>
                    <TestConsumer />
                </UIProvider>
            );

            expect(screen.getByTestId('war-room-active').textContent).toBe('false');
        });
    });
});

describe('UIContext - useUI Hook', () => {
    it('[P0] should throw error when used outside UIProvider', () => {
        // Suppress console.error for this test
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => {
            render(<TestConsumer />);
        }).toThrow('useUI must be used within a UIProvider');

        consoleSpy.mockRestore();
    });
});
