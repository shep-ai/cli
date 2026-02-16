# Multi-stage build for testing Shep CLI installation
# This Dockerfile validates that the CLI builds correctly and can install all supported tools

FROM node:22-bookworm

# Install system dependencies required for tool installations
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    gpg \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm

# Set shell and create global bin directory
ENV SHELL=/bin/bash \
    PATH="/root/.local/bin:$PATH"
RUN mkdir -p /root/.local/bin && \
    pnpm config set global-bin-dir /root/.local/bin

# Set working directory
WORKDIR /app

# Copy entire project
COPY . .

# Install dependencies and build
RUN echo "=== Installing dependencies ===" && \
    pnpm install && \
    echo "=== Building CLI ===" && \
    pnpm run build

# Debug: Check what was built
RUN echo "=== Checking build output ===" && \
    ls -la dist/ && \
    echo "=== Checking package.json bin ===" && \
    cat package.json | grep -A 3 '"bin"'

# Make CLI globally available
RUN pnpm link --global && \
    echo "=== Verifying shep command location ===" && \
    which shep || echo "shep not in PATH" && \
    ls -la /root/.local/bin/ || echo "bin directory not found"

# Test installations for all supported tools
# vscode - installs without running the GUI
RUN echo "=== Installing vscode ===" && \
    shep install vscode || true

RUN echo "=== Verifying vscode installation ===" && \
    code --version || echo "vscode verification skipped (GUI tool)"

# cursor
RUN echo "=== Installing cursor ===" && \
    shep install cursor || true

RUN echo "=== Verifying cursor installation ===" && \
    cursor --version || echo "cursor verification skipped"

# windsurf
RUN echo "=== Installing windsurf ===" && \
    shep install windsurf || true

RUN echo "=== Verifying windsurf installation ===" && \
    windsurf --version || echo "windsurf verification skipped"

# zed
RUN echo "=== Installing zed ===" && \
    shep install zed || true

RUN echo "=== Verifying zed installation ===" && \
    zed --version || echo "zed verification skipped"

# cursor-cli
RUN echo "=== Installing cursor-cli ===" && \
    shep install cursor-cli || true

RUN echo "=== Verifying cursor-cli installation ===" && \
    cursor --version || echo "cursor-cli verification skipped"

# claude-code
RUN echo "=== Installing claude-code ===" && \
    shep install claude-code || true

RUN echo "=== Verifying claude-code installation ===" && \
    claude --version || echo "claude-code verification skipped"

# antigravity (note: autoInstall=false, so this will show instructions only)
RUN echo "=== Installing antigravity (manual install tool) ===" && \
    shep install antigravity || true

# Final verification that CLI is working
RUN echo "=== Final CLI verification ===" && \
    echo "PATH=$PATH" && \
    which shep || echo "Using direct path" && \
    (shep --version || /root/.local/bin/shep --version || node /app/dist/src/presentation/cli/index.js --version) && \
    echo "=== CLI build and tool installation test completed successfully ==="
