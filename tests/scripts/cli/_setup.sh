#!/usr/bin/env bash
# tests/scripts/cli/_setup.sh
# Shared setup for CLI script tests. Handles npm pack tarball creation.
# Source this AFTER _helpers.sh.
#
# Exports:
#   PROJECT_ROOT  - absolute path to the repo root
#   TARBALL_PATH  - absolute path to the .tgz after create_tarball()
#
# Functions:
#   create_tarball  - runs npm pack (cached by version)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Location for test artifacts (overridable via env)
TEST_ARTIFACTS_DIR="${TEST_ARTIFACTS_DIR:-$PROJECT_ROOT/.test-artifacts}"

# Set after create_tarball
TARBALL_PATH=""

# Run npm pack and set TARBALL_PATH.
# Reuses existing tarball only when build artifacts exist (so cache is valid).
# Ensures build is run before pack so dist/ and web/ are included.
create_tarball() {
  mkdir -p "$TEST_ARTIFACTS_DIR"

  # Require build artifacts so the tarball contains dist/ and web/
  if [ ! -d "$PROJECT_ROOT/dist" ] || [ ! -d "$PROJECT_ROOT/web/.next" ]; then
    log_info "Building (dist or web missing)..."
    (cd "$PROJECT_ROOT" && pnpm run build) || { log_error "Build failed"; return 1; }
  fi

  local version
  version=$(node -p "require('$PROJECT_ROOT/package.json').version")
  local expected="$TEST_ARTIFACTS_DIR/shepai-cli-${version}.tgz"

  if [ -f "$expected" ]; then
    log_info "Reusing cached tarball: $expected"
    TARBALL_PATH="$expected"
    return 0
  fi

  log_info "Creating npm pack tarball (v${version})..."
  # Clean old tarballs
  rm -f "$TEST_ARTIFACTS_DIR"/shepai-cli-*.tgz

  local packed_name
  packed_name=$(cd "$PROJECT_ROOT" && npm pack --pack-destination "$TEST_ARTIFACTS_DIR" 2>/dev/null | tail -1)
  TARBALL_PATH="$TEST_ARTIFACTS_DIR/$packed_name"

  if [ ! -f "$TARBALL_PATH" ]; then
    log_error "npm pack failed — tarball not found at $TARBALL_PATH"
    return 1
  fi

  log_info "Tarball created: $TARBALL_PATH ($(du -h "$TARBALL_PATH" | cut -f1))"
}
