/**
 * useStoryWatcher.ts - Story File Detection Service
 * Story 4-1: Dynamic Developer Node Spawning
 *
 * Watches the stories/ directory for new story files and parses metadata
 * to enable dynamic developer node spawning.
 */

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';

export interface StoryMetadata {
    id: string;           // Unique identifier (e.g., 'story-1-auth')
    path: string;         // Full file path
    title: string;        // Story title extracted from file
    status: 'pending' | 'in-progress' | 'done';
    acceptanceCriteriaCount: number;
    taskCount: number;
    lastModified: number;
}

export interface StoryWatcherState {
    stories: StoryMetadata[];
    isWatching: boolean;
    lastUpdate: number | null;
    error: string | null;
}

/**
 * Parse story file content to extract metadata
 */
export const parseStoryMetadata = (content: string, path: string): Partial<StoryMetadata> => {
    const lines = content.split('\n');

    // Extract title from first H1 heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled Story';

    // Extract story ID from filename
    const filename = path.split('/').pop() || '';
    const id = filename.replace(/\.md$/, '');

    // Count acceptance criteria (numbered list items under AC section)
    const acMatch = content.match(/## Acceptance Criteria\n([\s\S]*?)(?=\n## |$)/);
    let acceptanceCriteriaCount = 0;
    if (acMatch) {
        const acSection = acMatch[1];
        acceptanceCriteriaCount = (acSection.match(/^\d+\./gm) || []).length;
    }

    // Count tasks (checkbox items)
    const taskMatches = content.match(/- \[[x ]\]/gi) || [];
    const taskCount = taskMatches.length;

    // Determine status from content
    let status: StoryMetadata['status'] = 'pending';
    const statusMatch = content.match(/Status:\s*(done|in-progress|pending|ready-for-dev)/i);
    if (statusMatch) {
        const rawStatus = statusMatch[1].toLowerCase();
        if (rawStatus === 'done') status = 'done';
        else if (rawStatus === 'in-progress') status = 'in-progress';
        else status = 'pending';
    }

    return {
        id,
        path,
        title,
        status,
        acceptanceCriteriaCount,
        taskCount,
    };
};

export const useStoryWatcher = () => {
    const { socket, isConnected } = useSocket();
    const [state, setState] = useState<StoryWatcherState>({
        stories: [],
        isWatching: false,
        lastUpdate: null,
        error: null,
    });

    // Fetch initial stories list
    const fetchStories = useCallback(async () => {
        try {
            const response = await fetch('http://localhost:3001/api/stories');
            if (!response.ok) {
                throw new Error(`Failed to fetch stories: ${response.statusText}`);
            }
            const data = await response.json();

            const stories: StoryMetadata[] = (data.stories || []).map((story: any) => ({
                id: story.id || story.path?.split('/').pop()?.replace('.md', '') || `story-${Date.now()}`,
                path: story.path,
                title: story.title || 'Untitled',
                status: story.status || 'pending',
                acceptanceCriteriaCount: story.acceptanceCriteriaCount || 0,
                taskCount: story.taskCount || 0,
                lastModified: story.lastModified || Date.now(),
            }));

            setState(prev => ({
                ...prev,
                stories,
                isWatching: true,
                lastUpdate: Date.now(),
                error: null,
            }));
        } catch (err) {
            console.error('[useStoryWatcher] Error fetching stories:', err);
            setState(prev => ({
                ...prev,
                error: err instanceof Error ? err.message : 'Unknown error',
            }));
        }
    }, []);

    // Handle story file events from WebSocket
    useEffect(() => {
        if (!socket || !isConnected) return;

        const handleStoryCreated = (data: { path: string; content?: string }) => {
            console.log('[useStoryWatcher] Story created:', data.path);

            const metadata = data.content
                ? parseStoryMetadata(data.content, data.path)
                : { id: data.path.split('/').pop()?.replace('.md', '') || `story-${Date.now()}`, path: data.path };

            const newStory: StoryMetadata = {
                id: metadata.id || `story-${Date.now()}`,
                path: data.path,
                title: metadata.title || 'New Story',
                status: metadata.status || 'pending',
                acceptanceCriteriaCount: metadata.acceptanceCriteriaCount || 0,
                taskCount: metadata.taskCount || 0,
                lastModified: Date.now(),
            };

            setState(prev => ({
                ...prev,
                stories: [...prev.stories.filter(s => s.path !== data.path), newStory],
                lastUpdate: Date.now(),
            }));
        };

        const handleStoryDeleted = (data: { path: string }) => {
            console.log('[useStoryWatcher] Story deleted:', data.path);

            setState(prev => ({
                ...prev,
                stories: prev.stories.filter(s => s.path !== data.path),
                lastUpdate: Date.now(),
            }));
        };

        const handleStoryUpdated = (data: { path: string; content?: string }) => {
            console.log('[useStoryWatcher] Story updated:', data.path);

            const metadata = data.content
                ? parseStoryMetadata(data.content, data.path)
                : {};

            setState(prev => ({
                ...prev,
                stories: prev.stories.map(s =>
                    s.path === data.path
                        ? { ...s, ...metadata, lastModified: Date.now() }
                        : s
                ),
                lastUpdate: Date.now(),
            }));
        };

        // Register event listeners
        socket.on('story:created', handleStoryCreated);
        socket.on('story:deleted', handleStoryDeleted);
        socket.on('story:updated', handleStoryUpdated);

        // Fetch initial stories
        fetchStories();

        return () => {
            socket.off('story:created', handleStoryCreated);
            socket.off('story:deleted', handleStoryDeleted);
            socket.off('story:updated', handleStoryUpdated);
        };
    }, [socket, isConnected, fetchStories]);

    // Get stories ready for development (pending status)
    const getPendingStories = useCallback(() => {
        return state.stories.filter(s => s.status === 'pending');
    }, [state.stories]);

    // Get stories in progress
    const getInProgressStories = useCallback(() => {
        return state.stories.filter(s => s.status === 'in-progress');
    }, [state.stories]);

    // Refresh stories manually
    const refresh = useCallback(() => {
        fetchStories();
    }, [fetchStories]);

    return {
        stories: state.stories,
        isWatching: state.isWatching,
        lastUpdate: state.lastUpdate,
        error: state.error,
        getPendingStories,
        getInProgressStories,
        refresh,
    };
};
