# API Reference

Technical reference documentation for Shep AI CLI interfaces and models.

## Contents

| Document                                               | Description             |
| ------------------------------------------------------ | ----------------------- |
| [repository-interfaces.md](./repository-interfaces.md) | Data access interfaces  |
| [domain-models.md](./domain-models.md)                 | Core entity definitions |
| [agent-interfaces.md](./agent-interfaces.md)           | Agent system interfaces |

## Overview

This directory contains technical specifications for:

- **Repository Interfaces** - Ports for data persistence
- **Domain Models** - Business entities and value objects
- **Agent Interfaces** - Multi-agent system contracts

## Audience

This documentation is for:

- Contributors implementing new repositories
- Developers extending the agent system
- Anyone working with the domain layer

## Usage Notes

- All interfaces use TypeScript
- Examples show typical implementation patterns
- Related docs link to architectural context

## Quick Links

### Domain

- [Feature](./domain-models.md#feature)
- [Task](./domain-models.md#task)
- [ActionItem](./domain-models.md#actionitem)
- [Artifact](./domain-models.md#artifact)
- [Requirement](./domain-models.md#requirement)

### Repositories

- [IFeatureRepository](./repository-interfaces.md#ifeaturerepository)
- [ITaskRepository](./repository-interfaces.md#itaskrepository)
- [IArtifactRepository](./repository-interfaces.md#iartifactrepository)

### Agents

- [IAgent](./agent-interfaces.md#iagent)
- [AgentMessage](./agent-interfaces.md#agentmessage)
- [AgentOrchestrator](./agent-interfaces.md#agentorchestrator)

---

## Maintaining This Directory

**Update when:**

- New interfaces are added
- Existing interfaces change
- New models are introduced

**Format:**

- Use TypeScript code blocks
- Include JSDoc comments
- Show example implementations
