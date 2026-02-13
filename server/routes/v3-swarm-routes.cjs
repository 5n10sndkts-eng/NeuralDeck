/**
 * V3 Swarm API Routes
 *
 * REST API endpoints for V3 swarm coordination.
 */

const { getSwarmIntegrationService } = require('../services/swarmIntegration');

/**
 * Setup V3 swarm routes
 */
function setupV3SwarmRoutes(fastify) {
  // Get current swarm status
  fastify.get('/api/v3/swarm/status', async (request, reply) => {
    try {
      const service = getSwarmIntegrationService();
      const status = service.getStatus();
      
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      request.log.error('Error getting swarm status:', error);
      reply.status(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // Execute V3 swarm
  fastify.post('/api/v3/swarm/execute', async (request, reply) => {
    try {
      const { llmConfig } = request.body || {};
      
      const service = getSwarmIntegrationService();
      
      // Start execution in background
      service.executeSwarm({ llmConfig }).then(result => {
        console.log('[V3SwarmAPI] Execution completed:', result.success);
      }).catch(error => {
        console.error('[V3SwarmAPI] Execution error:', error);
      });
      
      return {
        success: true,
        message: 'V3 swarm execution started',
      };
    } catch (error) {
      request.log.error('Error starting swarm execution:', error);
      reply.status(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // Execute developer swarm for stories
  fastify.post('/api/v3/swarm/developer', async (request, reply) => {
    try {
      const { stories, llmConfig } = request.body || {};
      
      if (!stories || !Array.isArray(stories)) {
        reply.status(400);
        return {
          success: false,
          error: 'Stories array is required',
        };
      }
      
      const service = getSwarmIntegrationService();
      
      // Execute developer swarm
      const results = await service.executeDeveloperSwarm(stories, llmConfig);
      
      return {
        success: true,
        data: results,
      };
    } catch (error) {
      request.log.error('Error executing developer swarm:', error);
      reply.status(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // Get efficiency metrics
  fastify.get('/api/v3/swarm/metrics', async (request, reply) => {
    try {
      const service = getSwarmIntegrationService();
      const metrics = await service.getEfficiencyMetrics();
      
      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      request.log.error('Error getting efficiency metrics:', error);
      reply.status(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // Reset swarm
  fastify.post('/api/v3/swarm/reset', async (request, reply) => {
    try {
      const service = getSwarmIntegrationService();
      service.reset();
      
      return {
        success: true,
        message: 'Swarm reset successfully',
      };
    } catch (error) {
      request.log.error('Error resetting swarm:', error);
      reply.status(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // Rebalance workload
  fastify.post('/api/v3/swarm/rebalance', async (request, reply) => {
    try {
      const service = getSwarmIntegrationService();
      await service.rebalanceWorkload();
      
      return {
        success: true,
        message: 'Workload rebalanced successfully',
      };
    } catch (error) {
      request.log.error('Error rebalancing workload:', error);
      reply.status(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });
}

module.exports = { setupV3SwarmRoutes };
