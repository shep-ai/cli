#!/bin/bash
# Hook: Auto-format TypeSpec files after Edit/Write operations
#
# This hook runs after any Edit or Write tool use. It checks if the
# modified file is a TypeSpec file (.tsp) and formats it if so.
#
# Input: JSON on stdin with tool_input containing file_path
# Output: Exit 0 (success) or non-zero (error, non-blocking)

set -e

# Read the JSON input from stdin
INPUT=$(cat)

# Extract the file path from the tool input
# Works for both Edit (file_path) and Write (file_path) tools
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# If no file path found, exit silently
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Check if it's a TypeSpec file
if [[ "$FILE_PATH" == *.tsp ]]; then
  # Get the project directory
  PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // empty')

  if [ -n "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"

    # Format the specific TypeSpec file
    if command -v pnpm &> /dev/null; then
      # Use project's prettier with TypeSpec plugin
      pnpm exec prettier --write "$FILE_PATH" 2>/dev/null || true
    fi
  fi
fi

exit 0
