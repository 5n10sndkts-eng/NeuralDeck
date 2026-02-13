/**
 * V3 Swarm Coordination Module
 *
 * Advanced 15-agent hierarchical mesh swarm orchestration for NeuralDeck.
 * Provides dependency management, load balancing, and performance optimization.
 */

// Agent Registry
export {
  AgentRegistry,
  SWARM_AGENTS,
} from './agent-registry';
export type {
  Agent,
  AgentTask,
  AgentStatus,
  AgentDomain,
} from './agent-registry';

// Swarm Coordinator
export {
  SwarmCoordinator,
  DEFAULT_SWARM_CONFIG,
  SWARM_PHASES,
} from './swarm-coordinator';
export type {
  SwarmPhase,
  SwarmExecutionConfig,
  SwarmExecutionResult,
  SwarmMetrics,
} from './swarm-coordinator';

// Communication Bus
export {
  CommunicationBus,
} from './communication-bus';
export type {
  MessagePriority,
  MessageType,
  SwarmMessage,
  MessageHandler,
  BusMetrics,
} from './communication-bus';

// Load Balancer
export {
  LoadBalancer,
  DEFAULT_LB_CONFIG,
} from './load-balancer';
export type {
  LoadDistribution,
  LoadBalancerConfig,
} from './load-balancer';

// Efficiency Monitor
export {
  EfficiencyMonitor,
} from './efficiency-monitor';
export type {
  EfficiencyReport,
  Bottleneck,
  EfficiencySnapshot,
} from './efficiency-monitor';
