/**
 * V3 Swarm WebSocket Integration
 *
 * Backend WebSocket handlers for V3 swarm coordination.
 * Provides real-time swarm status updates to clients.
 */

const { getSwarmIntegrationService } = require('../services/swarmIntegration');

/**
 * Setup V3 swarm WebSocket handlers
 */
function setupV3SwarmWebSocket(io, socket) {
  console.log('[V3SwarmWebSocket] Client connected:', socket.id);

  // Initialize swarm service for this connection
  const swarmService = getSwarmIntegrationService({
    enableRealtimeUpdates: true,
    enableLegacyIntegration: true,
    enableEfficiencyMonitoring: true,
  });

  // Handle swarm status request
  socket.on('swarm:status:request', () => {
    try {
      const status = swarmService.getStatus();
      socket.emit('swarm:status:update', status);
    } catch (error) {
      console.error('[V3SwarmWebSocket] Error getting status:', error);
      socket.emit('swarm:error', { message: 'Failed to get swarm status' });
    }
  });

  // Handle swarm commands
  socket.on('swarm:command', async (command) => {
    try {
      switch (command.type) {
        case 'start':
          console.log('[V3SwarmWebSocket] Starting V3 swarm execution');
          // Note: Actual execution should be triggered via HTTP API
          socket.emit('swarm:command:ack', { type: 'start', status: 'acknowledged' });
          break;

        case 'reset':
          console.log('[V3SwarmWebSocket] Resetting swarm');
          swarmService.reset();
          socket.emit('swarm:command:ack', { type: 'reset', status: 'completed' });
          break;

        case 'rebalance':
          console.log('[V3SwarmWebSocket] Rebalancing workload');
          await swarmService.rebalanceWorkload();
          socket.emit('swarm:command:ack', { type: 'rebalance', status: 'completed' });
          break;

        case 'getMetrics':
          console.log('[V3SwarmWebSocket] Getting efficiency metrics');
          const metrics = await swarmService.getEfficiencyMetrics();
          socket.emit('swarm:metrics', metrics);
          break;

        default:
          console.warn('[V3SwarmWebSocket] Unknown command:', command.type);
          socket.emit('swarm:error', { message: `Unknown command: ${command.type}` });
      }
    } catch (error) {
      console.error('[V3SwarmWebSocket] Command error:', error);
      socket.emit('swarm:error', { message: error.message });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('[V3SwarmWebSocket] Client disconnected:', socket.id);
  });
}

/**
 * Broadcast swarm update to all connected clients
 */
function broadcastSwarmUpdate(io, update) {
  io.emit('swarm:status:update', update);
}

module.exports = {
  setupV3SwarmWebSocket,
  broadcastSwarmUpdate,
};
