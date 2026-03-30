---
id: installation
title: Installation
sidebar_position: 1
---

# Installation

Shep requires **Node.js 18+** and is installed globally via npm or your preferred package manager.

## Prerequisites

- **Node.js** v18.0.0 or higher
- **npm**, **pnpm**, or **yarn**
- A **GitHub account** (for repo and PR features)
- An **AI provider API key** (Anthropic Claude recommended)

## Install via npm

```bash
npm install -g shep
```

## Install via pnpm

```bash
pnpm add -g shep
```

## Verify Installation

```bash
shep version
```

You should see the installed version number printed to your terminal.

## Initial Setup

After installing, run the setup wizard to configure your API keys and preferences:

```bash
shep install
```

This will prompt you for:

- Your AI provider API key (Anthropic, OpenAI, etc.)
- GitHub token (for PR creation and repo operations)
- Default settings for agent behavior

You can also configure settings manually at any time:

```bash
shep settings
```

## Updating Shep

To upgrade to the latest version:

```bash
shep upgrade
```

Or manually:

```bash
npm update -g shep
```

## Next Steps

- [Quick Start](/getting-started/quick-start) — run your first automated feature
- [Configuration](/getting-started/configuration) — customize Shep for your workflow
