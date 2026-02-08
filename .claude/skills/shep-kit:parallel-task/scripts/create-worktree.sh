#!/usr/bin/env bash
#
# create-worktree.sh - Create a git worktree in .worktrees/ from origin/main
#
# Usage: create-worktree.sh <dir-name> <branch-name>
# Example: create-worktree.sh fix-version-display fix/version-display
#
# Creates .worktrees/<dir-name> with <branch-name> based on origin/main

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Validate arguments
if [ $# -ne 2 ]; then
    echo -e "${RED}Error: Expected 2 arguments${NC}"
    echo "Usage: $0 <dir-name> <branch-name>"
    echo "Example: $0 fix-version-display fix/version-display"
    exit 1
fi

DIR_NAME="$1"
BRANCH_NAME="$2"

# Validate dir name (kebab-case)
if ! [[ "$DIR_NAME" =~ ^[a-z][a-z0-9]*(-[a-z0-9]+)*$ ]]; then
    echo -e "${RED}Error: dir-name must be kebab-case (e.g., fix-auth-bug, add-validation)${NC}"
    exit 1
fi

# Get repo root
REPO_ROOT=$(git rev-parse --show-toplevel)
WORKTREE_DIR="${REPO_ROOT}/.worktrees"
WORKTREE_PATH="${WORKTREE_DIR}/${DIR_NAME}"

# Ensure .worktrees/ exists
if [ ! -d "$WORKTREE_DIR" ]; then
    echo -e "${YELLOW}Creating .worktrees/ directory${NC}"
    mkdir -p "$WORKTREE_DIR"
fi

# Check if worktree path already exists
if [ -d "$WORKTREE_PATH" ]; then
    echo -e "${RED}Error: Worktree already exists at ${WORKTREE_PATH}${NC}"
    echo "To remove it: git worktree remove .worktrees/${DIR_NAME}"
    exit 1
fi

# Check if branch already exists - append timestamp if so
if git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}" 2>/dev/null; then
    TIMESTAMP=$(date +%s)
    BRANCH_NAME="${BRANCH_NAME}-${TIMESTAMP}"
    echo -e "${YELLOW}Branch existed, using: ${BRANCH_NAME}${NC}"
fi

# Fetch latest main
echo -e "${YELLOW}Fetching latest main...${NC}"
git fetch origin main

# Create worktree from origin/main
echo -e "${YELLOW}Creating worktree...${NC}"
echo -e "  Path:   .worktrees/${DIR_NAME}"
echo -e "  Branch: ${BRANCH_NAME}"
echo -e "  Base:   origin/main"

git worktree add "${WORKTREE_PATH}" -b "${BRANCH_NAME}" origin/main

echo ""
echo -e "${GREEN}Worktree created!${NC}"
echo ""
echo "  Path:   .worktrees/${DIR_NAME}"
echo "  Branch: ${BRANCH_NAME} (from origin/main)"
echo ""
echo "Next steps:"
echo "  cd ${WORKTREE_PATH} && pnpm install"
echo ""
echo "Cleanup when done:"
echo "  git worktree remove .worktrees/${DIR_NAME}"
echo "  git branch -d ${BRANCH_NAME}"
