# Development Documentation

Guides for developing and contributing to Shep AI CLI.

## Contents

| Document | Description |
|----------|-------------|
| [setup.md](./setup.md) | Development environment setup |
| [testing.md](./testing.md) | Testing strategy and commands |
| [building.md](./building.md) | Build process and tooling |

## Quick Start for Contributors

```bash
# Clone repository
git clone https://github.com/shep-ai/cli.git
cd cli

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Start development mode
npm run dev
```

## Development Workflow

1. **Setup** - Configure your development environment
2. **Branch** - Create a feature branch from `main`
3. **Develop** - Write code following architecture guidelines
4. **Test** - Ensure all tests pass
5. **Lint** - Check code style
6. **Commit** - Use conventional commits
7. **PR** - Open pull request for review

## Key Guidelines

- Follow [Clean Architecture](../architecture/clean-architecture.md) principles
- Write tests for new functionality
- Keep commits atomic and well-described
- Update documentation for user-facing changes

## Related Documents

- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Contribution guidelines
- [Architecture docs](../architecture/) - System design
- [CLAUDE.md](../../CLAUDE.md) - AI tooling guidance

---

## Maintaining This Directory

**Update when:**
- Development workflow changes
- New tooling is adopted
- Setup process changes

**File naming:**
- Use kebab-case
- Be descriptive
- Match process names
