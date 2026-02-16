# Docker E2E Tests

End-to-end tests for the Shep CLI, run manually via Docker.

Each subdirectory is a standalone test. To run from **project root**:

```bash
docker build -f tests/dockers/<test-dir>/Dockerfile .
```

The build either **fails** (test failed) or **finishes green** (test passed).

## Test Directories

- **ide-installer-test** - Validates CLI build and IDE/tool installation process
