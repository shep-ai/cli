# Research: semantic-release-cicd

> Technical analysis for 002-semantic-release-cicd

## Status

- **Phase:** Research
- **Updated:** 2026-02-02

## Technology Decisions

### Multi-Registry Publishing Approach

**Options considered:**

1. **Sequential workflows** - Separate GitHub Actions jobs for each registry
2. **@amanda-mitchell/semantic-release-npm-multiple** - Plugin wrapper for multi-registry
3. **semantic-release-npm-github-publish** - Shareable config for dual publishing
4. **Manual npm publish steps** - Custom scripts after semantic-release

**Decision:** @amanda-mitchell/semantic-release-npm-multiple

**Rationale:** Purpose-built for this use case, thin wrapper around @semantic-release/npm, supports registry-specific environment variables, actively maintained, minimal configuration overhead.

### Configuration Format

**Options considered:**

1. `.releaserc.json` - JSON format
2. `release.config.mjs` - ESM JavaScript module
3. `release.config.cjs` - CommonJS module
4. `package.json` "release" key - Inline config

**Decision:** release.config.mjs

**Rationale:** Project uses ESM (`"type": "module"`), allows comments for documentation, TypeScript-style type hints via JSDoc, more flexible than JSON.

### Plugin Stack

**Options considered:**

1. Minimal (analyzer + npm only)
2. Standard (analyzer + notes + changelog + npm + github + git)
3. Extended (add assets, labels, comments)

**Decision:** Standard plugin stack

**Rationale:** Provides complete automation (changelog, GitHub releases, version commit) without over-engineering. Matches project's existing conventional commits setup.

### Changelog Strategy

**Options considered:**

1. No changelog file (GitHub Releases only)
2. CHANGELOG.md in repo (committed by semantic-release)
3. Both

**Decision:** CHANGELOG.md in repo

**Rationale:** Provides offline-accessible changelog, useful for contributors, standard practice for npm packages.

## Library Analysis

| Library                                        | Version | Purpose                   | Pros                              | Cons                         |
| ---------------------------------------------- | ------- | ------------------------- | --------------------------------- | ---------------------------- |
| semantic-release                               | ^24.x   | Core release automation   | Industry standard, excellent docs | Learning curve               |
| @semantic-release/commit-analyzer              | ^13.x   | Determine version bump    | Works with conventional commits   | None                         |
| @semantic-release/release-notes-generator      | ^14.x   | Generate release notes    | Automatic from commits            | None                         |
| @semantic-release/changelog                    | ^6.x    | Update CHANGELOG.md       | Standard format                   | None                         |
| @amanda-mitchell/semantic-release-npm-multiple | ^3.x    | Multi-registry publishing | Purpose-built, env var separation | Additional dependency        |
| @semantic-release/github                       | ^11.x   | Create GitHub releases    | Native integration, asset uploads | None                         |
| @semantic-release/git                          | ^10.x   | Commit version/changelog  | Automates version tracking        | Requires contents:write perm |

## Security Considerations

- **NPM_TOKEN storage**: Must be stored as GitHub Actions secret, never in code
- **GITHUB_TOKEN**: Use built-in token with minimal required permissions
- **OIDC trusted publishing**: Recommended for npm, requires `id-token: write` permission
- **npm audit signatures**: Verify dependency integrity before publishing
- **Scoped package**: `@shep-ai/cli` requires npm org membership for publishing
- **Branch protection**: Releases only from `main` branch prevents unauthorized releases

## Performance Implications

- **CI time**: Adds ~2-3 minutes to main branch pushes for release job
- **No impact on PR workflows**: Release job only runs on main
- **Conditional execution**: semantic-release skips if no releasable commits
- **Parallel with existing CI**: Release job can run after build completes

## Resolved Questions

- [x] Which plugin for multi-registry? → @amanda-mitchell/semantic-release-npm-multiple
- [x] Config format? → release.config.mjs (ESM project)
- [x] Changelog strategy? → CHANGELOG.md committed to repo
- [x] npm provenance? → Yes, use OIDC trusted publishing

## References

- [semantic-release docs](https://semantic-release.gitbook.io/)
- [GitHub Actions recipe](https://github.com/semantic-release/semantic-release/blob/master/docs/recipes/ci-configurations/github-actions.md)
- [@amanda-mitchell/semantic-release-npm-multiple](https://github.com/amanda-mitchell/semantic-release-npm-multiple)
- [npm trusted publishing](https://docs.npmjs.com/generating-provenance-statements)

---

_Updated by `/shep-kit:research` — proceed with `/shep-kit:plan`_
