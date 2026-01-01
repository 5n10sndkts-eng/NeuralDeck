const fs = require('fs').promises;
const path = require('path');
const { runAgentCycle } = require('./core.cjs');
const { broadcast } = require('../services/socket.cjs');

let isAuto = false;
let intervalId = null;

// Helper to flatten file structure
async function getFiles(dir) {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        if (dirent.isDirectory()) return getFiles(res);
        return res;
    }));
    return files.flat();
}

const determinePhase = async () => {
    try {
        const allFiles = await getFiles(process.cwd());
        const relativeFiles = allFiles.map(f => f.replace(process.cwd(), ''));

        if (relativeFiles.some(f => f.includes('stories/'))) return 'swarm'; // Implementation
        if (relativeFiles.some(f => f.includes('docs/architecture.md'))) return 'sm'; // Planning
        if (relativeFiles.some(f => f.includes('docs/prd.md'))) return 'architect'; // Architecture
        if (relativeFiles.some(f => f.includes('docs/project_brief.md'))) return 'pm'; // PRD
        return 'analyst'; // Start
    } catch (e) {
        return 'analyst';
    }
};

const tick = async () => {
    if (!isAuto) return;

    const agentId = await determinePhase();
    broadcast('phase:update', agentId); // Using agentId as phase proxy for now

    console.log(`[NEURAL CORTEX] Tick. Active Agent: ${agentId}`);

    // Provide relevant context based on agent
    let contextFiles = [];
    if (agentId === 'pm') contextFiles = ['docs/project_brief.md'];
    if (agentId === 'architect') contextFiles = ['docs/prd.md'];
    if (agentId === 'sm') contextFiles = ['docs/architecture.md'];

    await runAgentCycle(agentId, contextFiles);
};

const startRunner = () => {
    if (intervalId) return;
    console.log("[NEURAL CORTEX] Engine Started.");
    intervalId = setInterval(tick, 10000); // 10s Loop
};

const setAutoMode = (enabled) => {
    isAuto = enabled;
    broadcast('status:auto', isAuto);
    console.log(`[NEURAL CORTEX] Auto Mode: ${isAuto}`);
};

module.exports = { startRunner, setAutoMode };
