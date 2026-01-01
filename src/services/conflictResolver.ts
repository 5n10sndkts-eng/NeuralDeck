/**
 * Conflict Resolver Service - Story 4-3
 *
 * Core conflict detection and resolution service for Developer Swarm.
 * Detects file conflicts when multiple developers attempt to modify the same file,
 * and provides both automatic (LLM-assisted) and manual resolution workflows.
 */

import { ChatMessage, LlmConfig, AgentNodeState } from '../types';
import { sendChat, readFile, writeFile } from './api';
import { AGENT_DEFINITIONS } from './agent';

// --- INTERFACES ---

export type ConflictStatus = 'pending' | 'auto-resolving' | 'manual-required' | 'resolved' | 'failed';
export type ResolutionMethod = 'auto' | 'manual' | 'append' | 'replace' | 'combine';

export interface DeveloperChange {
    nodeId: string;
    storyId: string;
    content: string;
    timestamp: number;
}

export interface ConflictResolution {
    content: string;
    method: ResolutionMethod;
    resolvedAt: number;
    resolvedBy?: string;  // 'system' or nodeId
}

export interface ConflictEvent {
    id: string;
    filePath: string;
    originalContent: string;
    developerA: DeveloperChange;
    developerB: DeveloperChange;
    status: ConflictStatus;
    createdAt: number;
    updatedAt: number;
    resolution?: ConflictResolution;
    error?: string;
    logs: string[];
}

export interface ConflictFile {
    filePath: string;
    conflictFilePath: string;
    content: string;
    markers: {
        startA: number;
        endA: number;
        startB: number;
        endB: number;
    };
}

export interface ConflictStats {
    totalConflicts: number;
    autoResolved: number;
    manualResolved: number;
    pending: number;
    failed: number;
    byFile: Map<string, number>;
    byDeveloper: Map<string, number>;
}

export interface ConflictResolverConfig {
    enableAutoResolution: boolean;
    maxAutoAttempts: number;
    conflictFileExtension: string;
    notifyOnConflict: boolean;
}

// --- DEFAULT CONFIG ---

export const DEFAULT_CONFLICT_CONFIG: ConflictResolverConfig = {
    enableAutoResolution: true,
    maxAutoAttempts: 2,
    conflictFileExtension: '.conflict',
    notifyOnConflict: true,
};

// --- CONFLICT RESOLVER CLASS ---

export class ConflictResolver {
    private conflicts: Map<string, ConflictEvent> = new Map();
    private config: ConflictResolverConfig;
    private stats: ConflictStats;
    private onConflictDetected?: (conflict: ConflictEvent) => void;
    private onConflictResolved?: (conflict: ConflictEvent) => void;
    private onConflictFailed?: (conflict: ConflictEvent) => void;

    constructor(config: Partial<ConflictResolverConfig> = {}) {
        this.config = { ...DEFAULT_CONFLICT_CONFIG, ...config };
        this.stats = {
            totalConflicts: 0,
            autoResolved: 0,
            manualResolved: 0,
            pending: 0,
            failed: 0,
            byFile: new Map(),
            byDeveloper: new Map(),
        };
    }

    /**
     * Set event callbacks
     */
    public setCallbacks(callbacks: {
        onConflictDetected?: (conflict: ConflictEvent) => void;
        onConflictResolved?: (conflict: ConflictEvent) => void;
        onConflictFailed?: (conflict: ConflictEvent) => void;
    }): void {
        this.onConflictDetected = callbacks.onConflictDetected;
        this.onConflictResolved = callbacks.onConflictResolved;
        this.onConflictFailed = callbacks.onConflictFailed;
    }

    /**
     * Generate unique conflict ID
     */
    public generateConflictId(): string {
        return `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Detect and register a conflict when a second developer tries to modify a locked file
     */
    public async detectConflict(
        filePath: string,
        developerA: DeveloperChange,
        developerB: DeveloperChange
    ): Promise<ConflictEvent> {
        const conflictId = this.generateConflictId();
        const now = Date.now();

        // Read original file content
        let originalContent = '';
        try {
            originalContent = await readFile(filePath);
        } catch (e) {
            console.warn(`[ConflictResolver] Could not read original file: ${filePath}`);
        }

        const conflict: ConflictEvent = {
            id: conflictId,
            filePath,
            originalContent,
            developerA,
            developerB,
            status: 'pending',
            createdAt: now,
            updatedAt: now,
            logs: [
                `[${new Date(now).toISOString()}] Conflict detected between ${developerA.nodeId} and ${developerB.nodeId}`,
            ],
        };

        this.conflicts.set(conflictId, conflict);
        this.updateStats('pending', filePath, developerA.nodeId, developerB.nodeId);

        console.log(`[ConflictResolver] Conflict detected: ${conflictId} on file ${filePath}`);
        this.onConflictDetected?.(conflict);

        return conflict;
    }

    /**
     * Attempt automatic conflict resolution using LLM
     */
    public async resolveAuto(
        conflictId: string,
        llmConfig: LlmConfig
    ): Promise<ConflictEvent> {
        const conflict = this.conflicts.get(conflictId);
        if (!conflict) {
            throw new Error(`Conflict not found: ${conflictId}`);
        }

        conflict.status = 'auto-resolving';
        conflict.updatedAt = Date.now();
        this.log(conflict, 'Starting automatic resolution...');

        try {
            // Build merger agent prompt
            const mergerDef = AGENT_DEFINITIONS['merger'] || {
                name: 'Merger',
                role: 'Merge Conflict Resolver',
                systemPrompt: 'You are an expert at resolving code merge conflicts.',
            };

            const systemPrompt = `${mergerDef.systemPrompt}

You are resolving a merge conflict between two developers.

FILE: ${conflict.filePath}

ORIGINAL CONTENT:
\`\`\`
${conflict.originalContent}
\`\`\`

DEVELOPER A (${conflict.developerA.nodeId}) CHANGES:
\`\`\`
${conflict.developerA.content}
\`\`\`

DEVELOPER B (${conflict.developerB.nodeId}) CHANGES:
\`\`\`
${conflict.developerB.content}
\`\`\`

INSTRUCTIONS:
1. Analyze both sets of changes
2. Determine if they can be merged automatically
3. If yes, provide the merged content
4. If no, explain why manual intervention is needed

Return JSON:
{
    "canMerge": boolean,
    "mergedContent": "string (the merged file content if canMerge is true)",
    "strategy": "append" | "replace" | "combine",
    "explanation": "string explaining the merge decision",
    "requiresManual": boolean
}`;

            const messages: ChatMessage[] = [
                { role: 'system', content: systemPrompt, timestamp: Date.now() },
                { role: 'user', content: 'Please analyze and resolve this merge conflict.', timestamp: Date.now() },
            ];

            this.log(conflict, 'Querying LLM for merge resolution...');
            const response = await sendChat(messages, llmConfig);
            const responseText = response.content || '';

            this.log(conflict, `Received LLM response (${responseText.length} chars)`);

            // Parse response
            let mergeResult: {
                canMerge: boolean;
                mergedContent?: string;
                strategy?: ResolutionMethod;
                explanation?: string;
                requiresManual?: boolean;
            } | null = null;

            try {
                const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                const firstBrace = cleanText.indexOf('{');
                const lastBrace = cleanText.lastIndexOf('}');

                if (firstBrace !== -1 && lastBrace !== -1) {
                    const jsonStr = cleanText.substring(firstBrace, lastBrace + 1);
                    mergeResult = JSON.parse(jsonStr);
                }
            } catch (parseError) {
                this.log(conflict, 'Could not parse JSON from LLM response');
            }

            if (mergeResult?.canMerge && mergeResult.mergedContent) {
                // Successful auto-resolution
                conflict.resolution = {
                    content: mergeResult.mergedContent,
                    method: mergeResult.strategy || 'combine',
                    resolvedAt: Date.now(),
                    resolvedBy: 'system',
                };
                conflict.status = 'resolved';
                conflict.updatedAt = Date.now();

                // Write resolved file
                await writeFile(conflict.filePath, mergeResult.mergedContent);

                this.log(conflict, `Auto-resolved using ${mergeResult.strategy} strategy`);
                this.stats.autoResolved++;
                this.stats.pending--;

                this.onConflictResolved?.(conflict);

            } else {
                // Needs manual resolution
                conflict.status = 'manual-required';
                conflict.updatedAt = Date.now();
                this.log(conflict, `Manual resolution required: ${mergeResult?.explanation || 'Complex conflict'}`);

                // Create conflict file with markers
                await this.createConflictFile(conflict);
            }

            return conflict;

        } catch (error: any) {
            conflict.status = 'failed';
            conflict.error = error.message;
            conflict.updatedAt = Date.now();
            this.log(conflict, `Auto-resolution failed: ${error.message}`);
            this.stats.failed++;
            this.stats.pending--;

            this.onConflictFailed?.(conflict);

            return conflict;
        }
    }

    /**
     * Create a conflict file with merge markers for manual resolution
     */
    public async createConflictFile(conflict: ConflictEvent): Promise<ConflictFile> {
        const conflictFilePath = conflict.filePath + this.config.conflictFileExtension;

        const contentA = conflict.developerA.content;
        const contentB = conflict.developerB.content;

        // Create conflict file with markers
        const conflictContent = `<<<<<<< ${conflict.developerA.nodeId} (Story: ${conflict.developerA.storyId})
${contentA}
=======
${contentB}
>>>>>>> ${conflict.developerB.nodeId} (Story: ${conflict.developerB.storyId})

/* CONFLICT INFO
 * File: ${conflict.filePath}
 * Conflict ID: ${conflict.id}
 * Created: ${new Date(conflict.createdAt).toISOString()}
 *
 * To resolve:
 * 1. Choose which changes to keep (or merge manually)
 * 2. Remove the conflict markers (<<<<, ====, >>>>)
 * 3. Save this file, then call POST /api/conflicts/${conflict.id}/resolve
 */`;

        await writeFile(conflictFilePath, conflictContent);

        this.log(conflict, `Created conflict file: ${conflictFilePath}`);

        return {
            filePath: conflict.filePath,
            conflictFilePath,
            content: conflictContent,
            markers: {
                startA: 0,
                endA: contentA.split('\n').length,
                startB: contentA.split('\n').length + 1,
                endB: contentA.split('\n').length + 1 + contentB.split('\n').length,
            },
        };
    }

    /**
     * Resolve conflict manually with user-provided content
     */
    public async resolveManually(
        conflictId: string,
        resolvedContent: string,
        resolvedBy?: string
    ): Promise<ConflictEvent> {
        const conflict = this.conflicts.get(conflictId);
        if (!conflict) {
            throw new Error(`Conflict not found: ${conflictId}`);
        }

        conflict.resolution = {
            content: resolvedContent,
            method: 'manual',
            resolvedAt: Date.now(),
            resolvedBy: resolvedBy || 'user',
        };
        conflict.status = 'resolved';
        conflict.updatedAt = Date.now();

        // Write resolved file
        await writeFile(conflict.filePath, resolvedContent);

        // Clean up conflict file if it exists
        try {
            const conflictFilePath = conflict.filePath + this.config.conflictFileExtension;
            // Note: We don't delete the conflict file, just log
            this.log(conflict, `Conflict file can be deleted: ${conflictFilePath}`);
        } catch (e) {
            // Ignore
        }

        this.log(conflict, 'Manually resolved by ' + (resolvedBy || 'user'));
        this.stats.manualResolved++;
        this.stats.pending--;

        this.onConflictResolved?.(conflict);

        return conflict;
    }

    /**
     * Get conflict by ID
     */
    public getConflict(conflictId: string): ConflictEvent | undefined {
        return this.conflicts.get(conflictId);
    }

    /**
     * Get all conflicts
     */
    public getAllConflicts(): ConflictEvent[] {
        return Array.from(this.conflicts.values());
    }

    /**
     * Get pending conflicts
     */
    public getPendingConflicts(): ConflictEvent[] {
        return this.getAllConflicts().filter(c =>
            c.status === 'pending' || c.status === 'manual-required'
        );
    }

    /**
     * Get conflicts by file path
     */
    public getConflictsByFile(filePath: string): ConflictEvent[] {
        return this.getAllConflicts().filter(c => c.filePath === filePath);
    }

    /**
     * Get conflicts by developer node ID
     */
    public getConflictsByDeveloper(nodeId: string): ConflictEvent[] {
        return this.getAllConflicts().filter(c =>
            c.developerA.nodeId === nodeId || c.developerB.nodeId === nodeId
        );
    }

    /**
     * Get statistics
     */
    public getStats(): ConflictStats {
        return { ...this.stats };
    }

    /**
     * Clear resolved conflicts
     */
    public clearResolved(): number {
        let cleared = 0;
        for (const [id, conflict] of this.conflicts) {
            if (conflict.status === 'resolved') {
                this.conflicts.delete(id);
                cleared++;
            }
        }
        return cleared;
    }

    /**
     * Reset all state
     */
    public reset(): void {
        this.conflicts.clear();
        this.stats = {
            totalConflicts: 0,
            autoResolved: 0,
            manualResolved: 0,
            pending: 0,
            failed: 0,
            byFile: new Map(),
            byDeveloper: new Map(),
        };
    }

    // --- PRIVATE HELPERS ---

    private log(conflict: ConflictEvent, message: string): void {
        const logEntry = `[${new Date().toISOString()}] ${message}`;
        conflict.logs.push(logEntry);
        console.log(`[ConflictResolver] [${conflict.id}] ${message}`);
    }

    private updateStats(type: 'pending' | 'resolved' | 'failed', filePath: string, ...nodeIds: string[]): void {
        this.stats.totalConflicts++;
        if (type === 'pending') {
            this.stats.pending++;
        }

        // Track by file
        const fileCount = this.stats.byFile.get(filePath) || 0;
        this.stats.byFile.set(filePath, fileCount + 1);

        // Track by developer
        for (const nodeId of nodeIds) {
            const devCount = this.stats.byDeveloper.get(nodeId) || 0;
            this.stats.byDeveloper.set(nodeId, devCount + 1);
        }
    }
}

// --- SINGLETON ---

let resolverInstance: ConflictResolver | null = null;

export function getConflictResolver(config?: Partial<ConflictResolverConfig>): ConflictResolver {
    if (!resolverInstance) {
        resolverInstance = new ConflictResolver(config);
    }
    return resolverInstance;
}

export function resetConflictResolver(): void {
    if (resolverInstance) {
        resolverInstance.reset();
    }
    resolverInstance = null;
}

// --- SMART FILE ASSIGNMENT (AC: 5) ---

/**
 * Analyze conflict history to suggest optimal file assignments
 * to minimize future conflicts
 */
export function getSmartFileAssignments(
    conflicts: ConflictEvent[],
    files: string[],
    developerNodeIds: string[]
): Map<string, string> {
    const assignments = new Map<string, string>();
    const fileConflictCount = new Map<string, Map<string, number>>();

    // Count conflicts per file per developer
    for (const conflict of conflicts) {
        for (const file of [conflict.filePath]) {
            if (!fileConflictCount.has(file)) {
                fileConflictCount.set(file, new Map());
            }
            const devCounts = fileConflictCount.get(file)!;

            const countA = devCounts.get(conflict.developerA.nodeId) || 0;
            devCounts.set(conflict.developerA.nodeId, countA + 1);

            const countB = devCounts.get(conflict.developerB.nodeId) || 0;
            devCounts.set(conflict.developerB.nodeId, countB + 1);
        }
    }

    // Assign files to developers with lowest conflict counts
    for (const file of files) {
        const devCounts = fileConflictCount.get(file) || new Map();
        let bestDev = developerNodeIds[0];
        let lowestCount = Infinity;

        for (const nodeId of developerNodeIds) {
            const count = devCounts.get(nodeId) || 0;
            if (count < lowestCount) {
                lowestCount = count;
                bestDev = nodeId;
            }
        }

        assignments.set(file, bestDev);
    }

    return assignments;
}

export default {
    ConflictResolver,
    getConflictResolver,
    resetConflictResolver,
    getSmartFileAssignments,
    DEFAULT_CONFLICT_CONFIG,
};
