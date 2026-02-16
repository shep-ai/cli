# Multi-stage build for testing Shep CLI installation
# This Dockerfile validates that the CLI builds correctly and can install all supported tools

FROM node:22-bookworm

# Install system dependencies required for tool installations
RUN apt-get update && apt-get install -y \
    sudo \
    curl \
    wget \
    git \
    gpg \
    libfuse2

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
    which shep && \
    ls -la /root/.local/bin/

# Test installations for all supported tools (excluding manual-install-only tools)
# vscode
RUN echo "=== Installing vscode ===" && \
    shep install vscode

RUN echo "=== Verifying vscode installation ===" && \
    code --version --no-sandbox --user-data-dir=/tmp/vscode-test

# windsurf
RUN echo "=== Installing windsurf ===" && \
    shep install windsurf

RUN echo "=== Verifying windsurf installation ===" && \
    windsurf --version --no-sandbox --user-data-dir=/tmp/windsurf-test

# zed
RUN echo "=== Installing zed ===" && \
    shep install zed

RUN echo "=== Verifying zed installation ===" && \
    ZED_ALLOW_ROOT=true zed --version

# cursor-cli
RUN echo "=== Installing cursor-cli ===" && \
    shep install cursor-cli

RUN echo "=== Verifying cursor-cli installation ===" && \
    cursor-agent --version

# claude-code
RUN echo "=== Installing claude-code ===" && \
    shep install claude-code

RUN echo "=== Verifying claude-code installation ===" && \
    claude --version

# antigravity (note: autoInstall=false, so this will show instructions only)
RUN echo "=== Installing antigravity (manual install tool) ===" && \
    shep install antigravity

# Manual installation tests for tools that require manual download
# cursor IDE (manual AppImage installation for testing)
RUN echo "=== Manually installing Cursor IDE for testing ===" && \
    wget -O /root/.local/bin/cursor.appimage https://download.cursor.sh/linux/appImage/x64 && \
    chmod +x /root/.local/bin/cursor.appimage && \
    echo "=== Verifying manual Cursor IDE installation ===" && \
    cursor.appimage --appimage-extract-and-run --version || echo "Cursor IDE installed but requires GUI"

# Final verification that CLI is working
RUN echo "=== Final CLI verification ===" && \
    shep --version && \
    echo "=== CLI build and tool installation test completed successfully ==="
