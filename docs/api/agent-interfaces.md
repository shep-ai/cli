# Agent Interfaces

Technical specifications for the multi-agent system.

## Core Interfaces

### IAgent

Base interface for all agents.

```typescript
/**
 * Base interface that all agents must implement.
 */
export interface IAgent {
  /** Unique agent instance identifier */
  readonly id: string;

  /** Agent type identifier */
  readonly type: AgentType;

  /** Current agent status */
  readonly status: AgentStatus;

  /** List of agent capabilities */
  readonly capabilities: AgentCapability[];

  /**
   * Initialize the agent with context.
   * @param context - Shared agent context
   */
  initialize(context: AgentContext): Promise<void>;

  /**
   * Execute an assigned task.
   * @param task - Task to execute
   * @returns Execution result
   */
  execute(task: AgentTask): Promise<AgentResult>;

  /**
   * Handle an incoming message.
   * @param message - Message to handle
   */
  handleMessage(message: AgentMessage): Promise<void>;

  /**
   * Pause agent execution.
   */
  pause(): Promise<void>;

  /**
   * Resume agent execution.
   */
  resume(): Promise<void>;

  /**
   * Shutdown the agent gracefully.
   */
  shutdown(): Promise<void>;
}
```

### AgentType

Agent type identifiers.

```typescript
/**
 * Identifies the type of agent.
 */
export type AgentType =
  | 'repository-analysis'
  | 'requirements'
  | 'planning'
  | 'implementation';
```

### AgentStatus

Agent lifecycle states.

```typescript
/**
 * Agent execution status.
 */
export type AgentStatus =
  | 'idle'         // Ready to accept tasks
  | 'initializing' // Setting up
  | 'executing'    // Processing a task
  | 'paused'       // Temporarily stopped
  | 'error'        // Error state
  | 'shutdown';    // Terminated
```

### AgentCapability

Agent capability descriptors.

```typescript
/**
 * Describes what an agent can do.
 */
export type AgentCapability =
  // Repository Analysis
  | 'file_traversal'
  | 'pattern_detection'
  | 'dependency_analysis'
  | 'documentation_generation'
  // Requirements
  | 'conversation'
  | 'option_generation'
  | 'ambiguity_detection'
  | 'requirement_validation'
  // Planning
  | 'task_decomposition'
  | 'artifact_generation'
  | 'effort_estimation'
  // Implementation
  | 'code_generation'
  | 'code_modification'
  | 'test_creation'
  | 'parallel_execution';
```

## Context and Configuration

### AgentContext

Shared context provided to agents.

```typescript
/**
 * Context provided to agents during initialization.
 */
export interface AgentContext {
  /** Absolute path to repository being analyzed */
  repoPath: string;

  /** Path to analysis documents */
  analysisPath: string;

  /** Agent configuration */
  config: AgentConfig;

  /** Logger instance */
  logger: ILogger;

  /** Message bus for inter-agent communication */
  messageBus: IMessageBus;

  /** LLM client for AI operations */
  llmClient: ILLMClient;

  /** Repository access */
  repositories: {
    features: IFeatureRepository;
    tasks: ITaskRepository;
    artifacts: IArtifactRepository;
  };
}
```

### AgentConfig

Agent configuration options.

```typescript
/**
 * Configuration options for agents.
 */
export interface AgentConfig {
  /** Maximum concurrent operations */
  maxConcurrency: number;

  /** Operation timeout in milliseconds */
  timeoutMs: number;

  /** Retry policy */
  retry: RetryPolicy;

  /** Logging configuration */
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    includeMessages: boolean;
    includePayloads: boolean;
  };

  /** Agent-specific configuration */
  specific: Record<string, unknown>;
}

/**
 * Retry policy configuration.
 */
export interface RetryPolicy {
  /** Maximum retry attempts */
  maxAttempts: number;

  /** Initial backoff in milliseconds */
  backoffMs: number;

  /** Backoff multiplier */
  backoffMultiplier: number;

  /** Error types to retry */
  retryableErrors: string[];
}
```

## Task and Result Types

### AgentTask

Task assigned to an agent.

```typescript
/**
 * Task to be executed by an agent.
 */
export interface AgentTask {
  /** Unique task identifier */
  id: string;

  /** Task type identifier */
  type: string;

  /** Task-specific payload */
  payload: unknown;

  /** Execution priority (higher = more urgent) */
  priority: number;

  /** Optional timeout override */
  timeout?: number;

  /** Optional retry policy override */
  retryPolicy?: RetryPolicy;

  /** Correlation ID for tracking */
  correlationId?: string;
}
```

### AgentResult

Result of task execution.

```typescript
/**
 * Result returned from agent task execution.
 */
export interface AgentResult {
  /** Task ID this result corresponds to */
  taskId: string;

  /** Execution status */
  status: 'success' | 'failure' | 'partial';

  /** Result data (type depends on task) */
  data?: unknown;

  /** Error information if failed */
  error?: AgentError;

  /** Execution metrics */
  metrics: ExecutionMetrics;
}

/**
 * Error information from agent execution.
 */
export interface AgentError {
  /** Error code */
  code: string;

  /** Human-readable message */
  message: string;

  /** Stack trace (development only) */
  stack?: string;

  /** Whether error is retryable */
  retryable: boolean;

  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Execution metrics.
 */
export interface ExecutionMetrics {
  /** Total duration in milliseconds */
  durationMs: number;

  /** Number of LLM API calls */
  llmCalls?: number;

  /** Total tokens used */
  tokensUsed?: number;

  /** Files processed */
  filesProcessed?: number;

  /** Retry attempts made */
  retryCount?: number;
}
```

## Messaging

### AgentMessage

Inter-agent message format.

```typescript
/**
 * Message passed between agents.
 */
export interface AgentMessage {
  /** Unique message identifier */
  id: string;

  /** Message timestamp */
  timestamp: Date;

  /** Sender identifier (agent ID or 'orchestrator') */
  from: string;

  /** Recipient (agent ID, 'orchestrator', or 'broadcast') */
  to: string;

  /** Message type */
  type: MessageType;

  /** Message payload */
  payload: unknown;

  /** Correlation ID for request/response */
  correlationId?: string;

  /** Reply-to address for responses */
  replyTo?: string;
}

/**
 * Message type identifiers.
 */
export type MessageType =
  | 'task_assigned'
  | 'task_started'
  | 'task_progress'
  | 'task_completed'
  | 'task_failed'
  | 'clarification_request'
  | 'clarification_response'
  | 'context_update'
  | 'status_change'
  | 'abort';
```

### IMessageBus

Message bus interface.

```typescript
/**
 * Message bus for inter-agent communication.
 */
export interface IMessageBus {
  /**
   * Publish a message.
   * @param message - Message to publish
   */
  publish(message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<void>;

  /**
   * Subscribe to messages of a type.
   * @param type - Message type to subscribe to
   * @param handler - Handler function
   * @returns Unsubscribe function
   */
  subscribe(
    type: MessageType,
    handler: (message: AgentMessage) => Promise<void>
  ): () => void;

  /**
   * Send a request and wait for response.
   * @param message - Request message
   * @param timeout - Timeout in milliseconds
   * @returns Response message
   */
  request(
    message: Omit<AgentMessage, 'id' | 'timestamp'>,
    timeout?: number
  ): Promise<AgentMessage>;
}
```

## Orchestrator

### IAgentOrchestrator

Orchestrator interface.

```typescript
/**
 * Orchestrates agent lifecycle and execution.
 */
export interface IAgentOrchestrator {
  /**
   * Create and register an agent.
   * @param type - Agent type to create
   * @returns Created agent instance
   */
  createAgent(type: AgentType): Promise<IAgent>;

  /**
   * Get an agent by ID.
   * @param id - Agent ID
   */
  getAgent(id: string): IAgent | undefined;

  /**
   * Get all agents of a type.
   * @param type - Agent type
   */
  getAgentsByType(type: AgentType): IAgent[];

  /**
   * Execute a workflow.
   * @param workflow - Workflow definition
   * @returns Workflow execution result
   */
  executeWorkflow(workflow: Workflow): Promise<WorkflowResult>;

  /**
   * Shutdown all agents.
   */
  shutdown(): Promise<void>;
}

/**
 * Workflow definition.
 */
export interface Workflow {
  /** Workflow identifier */
  id: string;

  /** Required agent types */
  requiredAgents: AgentType[];

  /** Workflow steps */
  steps: WorkflowStep[];
}

/**
 * Single workflow step.
 */
export interface WorkflowStep {
  /** Step identifier */
  id: string;

  /** Target agent type */
  agentType: AgentType;

  /** Task to execute */
  task: Omit<AgentTask, 'id'>;

  /** Steps this depends on */
  dependsOn?: string[];
}

/**
 * Workflow execution result.
 */
export interface WorkflowResult {
  /** Overall status */
  status: 'success' | 'failure' | 'partial';

  /** Results per step */
  stepResults: Map<string, AgentResult>;

  /** Total duration */
  durationMs: number;
}
```

## Specific Agent Interfaces

### IRepositoryAnalysisAgent

```typescript
export interface IRepositoryAnalysisAgent extends IAgent {
  readonly type: 'repository-analysis';

  /**
   * Analyze repository structure.
   * @param repoPath - Repository path
   * @returns Analysis result
   */
  analyze(repoPath: string): Promise<AnalysisResult>;
}

export interface AnalysisResult {
  summary: AnalysisSummary;
  documents: AnalysisDocument[];
}

export interface AnalysisSummary {
  repoPath: string;
  analyzedAt: Date;
  fileCount: number;
  techStack: string[];
  patterns: string[];
  architecture: string;
}

export interface AnalysisDocument {
  name: string;
  perspective: string;
  content: string;
}
```

### IRequirementsAgent

```typescript
export interface IRequirementsAgent extends IAgent {
  readonly type: 'requirements';

  /**
   * Gather requirements through conversation.
   * @param feature - Feature to gather requirements for
   * @param context - Analysis context
   * @returns Gathered requirements
   */
  gatherRequirements(
    feature: Feature,
    context: AnalysisSummary
  ): Promise<Requirement[]>;
}
```

### IPlanningAgent

```typescript
export interface IPlanningAgent extends IAgent {
  readonly type: 'planning';

  /**
   * Generate plan from requirements.
   * @param feature - Feature with requirements
   * @returns Plan with tasks and artifacts
   */
  generatePlan(feature: Feature): Promise<Plan>;
}

export interface Plan {
  tasks: Task[];
  artifacts: Artifact[];
}
```

### IImplementationAgent

```typescript
export interface IImplementationAgent extends IAgent {
  readonly type: 'implementation';

  /**
   * Execute implementation plan.
   * @param feature - Feature to implement
   * @returns Implementation result
   */
  implement(feature: Feature): Promise<ImplementationResult>;
}

export interface ImplementationResult {
  completedTasks: string[];
  failedTasks: string[];
  filesChanged: string[];
}
```

---

## Maintaining This Document

**Update when:**
- Agent interfaces change
- New agent types are added
- Message types change
- Orchestrator API evolves

**Related docs:**
- [AGENTS.md](../../AGENTS.md) - High-level agent overview
- [../architecture/agent-system.md](../architecture/agent-system.md) - Implementation details
