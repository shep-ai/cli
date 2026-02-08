#!/usr/bin/env bash
# tests/scripts/cli/_helpers.sh
# Shared helper functions for CLI E2E shell scripts.
# Source this file at the top of every test script.
#
# Provides: logging, assertions, Docker helpers, cleanup, test summary.

# --- Colors (when stdout is a terminal) ---
if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  BOLD='\033[1m'
  NC='\033[0m'
else
  RED='' GREEN='' YELLOW='' BOLD='' NC=''
fi

# --- Test tracking ---
_TEST_PASS=0
_TEST_FAIL=0

# --- Logging ---
log_info()    { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
log_section() { echo -e "\n${BOLD}=== $* ===${NC}"; }

# --- Assertions ---

assert_eq() {
  local expected="$1" actual="$2" msg="${3:-values should be equal}"
  if [ "$expected" = "$actual" ]; then
    _TEST_PASS=$((_TEST_PASS + 1))
    log_info "PASS: $msg"
  else
    _TEST_FAIL=$((_TEST_FAIL + 1))
    log_error "FAIL: $msg"
    log_error "  expected: '$expected'"
    log_error "  actual:   '$actual'"
  fi
}

assert_contains() {
  local haystack="$1" needle="$2" msg="${3:-output should contain '$needle'}"
  if echo "$haystack" | grep -qF "$needle"; then
    _TEST_PASS=$((_TEST_PASS + 1))
    log_info "PASS: $msg"
  else
    _TEST_FAIL=$((_TEST_FAIL + 1))
    log_error "FAIL: $msg"
    log_error "  needle: '$needle'"
    log_error "  output (first 500 chars): ${haystack:0:500}"
  fi
}

assert_not_contains() {
  local haystack="$1" needle="$2" msg="${3:-output should not contain '$needle'}"
  if ! echo "$haystack" | grep -qF "$needle"; then
    _TEST_PASS=$((_TEST_PASS + 1))
    log_info "PASS: $msg"
  else
    _TEST_FAIL=$((_TEST_FAIL + 1))
    log_error "FAIL: $msg"
    log_error "  unexpected needle: '$needle'"
  fi
}

assert_exit_code() {
  local expected="$1" actual="$2" msg="${3:-exit code should be $expected}"
  assert_eq "$expected" "$actual" "$msg"
}

assert_file_exists() {
  local path="$1" msg="${2:-file should exist: $path}"
  if [ -e "$path" ]; then
    _TEST_PASS=$((_TEST_PASS + 1))
    log_info "PASS: $msg"
  else
    _TEST_FAIL=$((_TEST_FAIL + 1))
    log_error "FAIL: $msg"
  fi
}

# --- Docker helpers ---

docker_available() {
  command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1
}

# Run a Docker container and capture output + exit code.
# Usage: output=$(docker_run_capture "image-tag" "command" "args...")
#        echo "exit: $?"
docker_run_capture() {
  local tag="$1"
  shift
  docker run --rm "$tag" "$@" 2>&1
}

# --- Cleanup tracking ---
_CLEANUP_ITEMS=()

cleanup_register() {
  _CLEANUP_ITEMS+=("$1")
}

cleanup_run() {
  for item in "${_CLEANUP_ITEMS[@]:-}"; do
    if [ -n "$item" ]; then
      eval "$item" 2>/dev/null || true
    fi
  done
}

# Register cleanup trap
trap cleanup_run EXIT

# --- Test summary ---

test_summary() {
  echo ""
  log_section "Test Summary"
  log_info "Passed: $_TEST_PASS"
  if [ "$_TEST_FAIL" -gt 0 ]; then
    log_error "Failed: $_TEST_FAIL"
    return 1
  else
    log_info "Failed: 0"
    return 0
  fi
}
