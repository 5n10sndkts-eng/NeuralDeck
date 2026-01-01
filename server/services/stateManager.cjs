/**
 * State Manager Service - Story 6-6
 *
 * Manages versioned state for delta updates and reconnection resync.
 * Tracks state history and provides delta computation utilities.
 */

const MAX_HISTORY_SIZE = 100;

class StateManager {
    constructor() {
        this.version = 0;
        this.state = {
            agents: new Map(),
            files: new Map(),
            phase: 'idle',
            isAutoMode: false,
            swarm: null,
            security: null,
        };
        this.history = []; // Array of { version, timestamp, changes, removals }
        this.subscribers = new Set();
    }

    /**
     * Get current state version
     */
    getVersion() {
        return this.version;
    }

    /**
     * Get current state snapshot with version
     */
    getSnapshot() {
        return {
            version: this.version,
            timestamp: Date.now(),
            state: this.serializeState(),
        };
    }

    /**
     * Serialize state for transmission (convert Maps to objects)
     */
    serializeState() {
        return {
            agents: Object.fromEntries(this.state.agents),
            files: Object.fromEntries(this.state.files),
            phase: this.state.phase,
            isAutoMode: this.state.isAutoMode,
            swarm: this.state.swarm,
            security: this.state.security,
        };
    }

    /**
     * Update state and emit delta
     * @param {string} domain - State domain (agents, files, phase, etc.)
     * @param {object} changes - Changed fields
     * @param {string[]} removals - Removed keys (for Map domains)
     */
    updateState(domain, changes, removals = []) {
        const previousState = this.serializeState();
        this.version++;

        // Apply changes based on domain type
        if (domain === 'agents' || domain === 'files') {
            // Map-based domains
            const map = this.state[domain];
            for (const [key, value] of Object.entries(changes)) {
                if (value === null || value === undefined) {
                    map.delete(key);
                } else {
                    map.set(key, value);
                }
            }
            for (const key of removals) {
                map.delete(key);
            }
        } else {
            // Scalar domains
            this.state[domain] = changes;
        }

        // Create delta record
        const delta = {
            version: this.version,
            timestamp: Date.now(),
            domain,
            changes,
            removals,
        };

        // Add to history (with size limit)
        this.history.push(delta);
        if (this.history.length > MAX_HISTORY_SIZE) {
            this.history.shift();
        }

        // Notify subscribers
        this.notifySubscribers(delta);

        return delta;
    }

    /**
     * Get deltas since a specific version
     * @param {number} sinceVersion - Last known version
     * @returns {{ deltas: object[], fullResyncNeeded: boolean }}
     */
    getDeltasSince(sinceVersion) {
        if (sinceVersion >= this.version) {
            return { deltas: [], fullResyncNeeded: false };
        }

        // Check if we have history going back far enough
        const oldestVersion = this.history.length > 0
            ? this.history[0].version
            : this.version;

        if (sinceVersion < oldestVersion) {
            // Too far behind, need full resync
            return { deltas: [], fullResyncNeeded: true };
        }

        // Return all deltas since the requested version
        const deltas = this.history.filter(d => d.version > sinceVersion);
        return { deltas, fullResyncNeeded: false };
    }

    /**
     * Subscribe to state changes
     * @param {function} callback - Called with delta on state change
     * @returns {function} Unsubscribe function
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    /**
     * Notify all subscribers of a state change
     */
    notifySubscribers(delta) {
        for (const callback of this.subscribers) {
            try {
                callback(delta);
            } catch (err) {
                console.error('[StateManager] Subscriber error:', err);
            }
        }
    }

    /**
     * Compute diff between two objects (utility for custom diff needs)
     * @param {object} oldObj
     * @param {object} newObj
     * @returns {{ changes: object, removals: string[] }}
     */
    static computeDiff(oldObj, newObj) {
        const changes = {};
        const removals = [];

        // Find changed and new keys
        for (const [key, value] of Object.entries(newObj)) {
            if (JSON.stringify(oldObj[key]) !== JSON.stringify(value)) {
                changes[key] = value;
            }
        }

        // Find removed keys
        for (const key of Object.keys(oldObj)) {
            if (!(key in newObj)) {
                removals.push(key);
            }
        }

        return { changes, removals };
    }

    /**
     * Apply delta to a state object (utility for client-side use)
     * @param {object} state - Current state
     * @param {object} delta - Delta to apply
     * @returns {object} New state with delta applied
     */
    static applyDelta(state, delta) {
        const newState = { ...state };

        // Apply changes
        if (delta.domain) {
            if (delta.domain === 'agents' || delta.domain === 'files') {
                newState[delta.domain] = { ...state[delta.domain], ...delta.changes };
                for (const key of delta.removals || []) {
                    delete newState[delta.domain][key];
                }
            } else {
                newState[delta.domain] = delta.changes;
            }
        } else if (delta.changes) {
            Object.assign(newState, delta.changes);
            for (const key of delta.removals || []) {
                delete newState[key];
            }
        }

        return newState;
    }

    // --- Convenience methods for common state updates ---

    updatePhase(phase) {
        return this.updateState('phase', phase);
    }

    updateAutoMode(isAuto) {
        return this.updateState('isAutoMode', isAuto);
    }

    updateAgent(agentId, agentState) {
        return this.updateState('agents', { [agentId]: agentState });
    }

    removeAgent(agentId) {
        return this.updateState('agents', {}, [agentId]);
    }

    updateFile(filePath, fileState) {
        return this.updateState('files', { [filePath]: fileState });
    }

    removeFile(filePath) {
        return this.updateState('files', {}, [filePath]);
    }

    updateSwarm(swarmState) {
        return this.updateState('swarm', swarmState);
    }

    updateSecurity(securityState) {
        return this.updateState('security', securityState);
    }
}

// Singleton instance
const stateManager = new StateManager();

module.exports = { stateManager, StateManager };
