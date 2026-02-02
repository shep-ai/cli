# Research: cicd-security-gates

> Technical analysis for 003-cicd-security-gates

## Status

- **Phase:** Planning
- **Updated:** 2026-02-02

## Technology Decisions

### 1. Dependency/Container Vulnerability Scanner

**Options considered:**

1. **Trivy** (Aqua Security) - All-in-one scanner for deps, containers, IaC, secrets
2. **Grype** (Anchore) - Focused vulnerability scanner, pairs with Syft for SBOMs
3. **OWASP Dependency-Check** - Traditional SCA tool, NVD-based

**Decision:** Trivy

**Rationale:** Trivy is the clear winner for our use case:

- All-in-one: covers dependencies, containers, IaC, and secrets in one tool
- Fastest scanning speed among the three options
- Better vulnerability coverage than Dependency-Check with fewer false positives
- Native GitHub Actions support (`aquasecurity/trivy-action`)
- Apache 2.0 licensed, fully open source
- Already scans our Dockerfile and can replace multiple tools

Grype is equivalent in quality but requires pairing with Syft for full functionality. OWASP Dependency-Check is slower and produces more false positives.

**Sources:**

- [Top 23 DevSecOps Tools in 2026 | Aikido](https://www.aikido.dev/blog/top-devsecops-tools)
- [Open-Source SCA Tools Comparison | Planet Crust](https://www.planetcrust.com/open-source-software-composition-analysis-tools-comparison)

---

### 2. Secret Detection Scanner

**Options considered:**

1. **Gitleaks** - Lightweight, fast, excellent CI/CD integration
2. **TruffleHog** - Deep scanning with entropy analysis, more resource-intensive
3. **detect-secrets** (Yelp) - Precision-focused, lower false positives

**Decision:** Gitleaks

**Rationale:** Gitleaks is optimal for CI/CD pipelines:

- Fastest scanning speed (critical for CI pipelines)
- Highest recall in research studies (86-88%)
- Excellent GitHub Actions support (`gitleaks/gitleaks-action`)
- Lightweight with minimal CI overhead
- Customizable detection rules via `.gitleaks.toml`
- Active development and community

TruffleHog has deeper scanning but is slower and has higher false positive rates. detect-secrets prioritizes precision over recall, missing more actual secrets.

**Sources:**

- [TruffleHog vs Gitleaks Comparison | Jit](https://www.jit.io/resources/appsec-tools/trufflehog-vs-gitleaks-a-detailed-comparison-of-secret-scanning-tools)
- [Top 8 Git Secrets Scanners in 2026 | Jit](https://www.jit.io/resources/appsec-tools/git-secrets-scanners-key-features-and-top-tools-)

---

### 3. Static Application Security Testing (SAST)

**Options considered:**

1. **Semgrep** - Pattern-based SAST, fast, custom rules in YAML
2. **CodeQL** - GitHub's deep semantic analysis, highest accuracy
3. **SonarQube Community** - Code quality + security, self-hosted

**Decision:** Semgrep

**Rationale:** Semgrep fits our needs best:

- Fast execution with pattern matching (no database creation like CodeQL)
- 82% accuracy with manageable 12% false positive rate
- Supports TypeScript/JavaScript with extensive rule library
- Native GitHub Actions (`returntocorp/semgrep-action`)
- Custom rules in readable YAML syntax
- Fully open source for basic scanning
- Lower setup complexity than CodeQL

CodeQL has higher accuracy (88%) but requires GitHub Advanced Security for private repos and is slower. SonarQube requires self-hosting infrastructure.

**Note:** Semgrep recently moved some features behind commercial licensing; Opengrep is a community fork if needed.

**Sources:**

- [Best 6 SAST Tools Like Semgrep in 2026 | Aikido](https://www.aikido.dev/blog/semgrep-alternatives)
- [2025 AI Code Security Benchmark | sanj.dev](https://sanj.dev/post/ai-code-security-tools-comparison)

---

### 4. Dockerfile Linting

**Options considered:**

1. **Hadolint** - Dockerfile linter with ShellCheck integration
2. **Dockle** - Security-focused image linter (post-build)
3. **Trivy** - Also supports Dockerfile misconfiguration scanning

**Decision:** Hadolint

**Rationale:** Hadolint is the standard for Dockerfile linting:

- Parses Dockerfile into AST for comprehensive analysis
- Integrates ShellCheck for RUN instruction bash analysis
- Catches issues early (pre-build) vs Dockle (post-build)
- Native GitHub Action (`hadolint/hadolint-action`)
- Complements Trivy (Trivy checks vulnerabilities, Hadolint checks best practices)

Dockle is valuable for post-build image auditing but doesn't replace pre-build linting. We already have Trivy for container vulnerability scanning.

**Sources:**

- [Hadolint GitHub](https://github.com/hadolint/hadolint)
- [Dockerfile Linting | Equinor AppSec](https://appsec.equinor.com/toolbox/guidelines/dockerfile-linting/)

---

## Final Tool Selection

| Tool         | Purpose                                       | GitHub Action                 |
| ------------ | --------------------------------------------- | ----------------------------- |
| **Trivy**    | Dependencies, containers, IaC vulnerabilities | `aquasecurity/trivy-action`   |
| **Gitleaks** | Secret detection in git history               | `gitleaks/gitleaks-action`    |
| **Semgrep**  | SAST for TypeScript/JavaScript                | `returntocorp/semgrep-action` |
| **Hadolint** | Dockerfile best practices                     | `hadolint/hadolint-action`    |

## Security Considerations

- All tools run in isolated GitHub Actions runners (no secrets exposure)
- Scan results visible in Actions logs (no external reporting required)
- Tools configured to fail on HIGH/CRITICAL severity only
- Configuration files (`.gitleaks.toml`, etc.) allow allowlisting false positives

## Performance Implications

- All 4 scanners run in parallel within a single `security` job
- Estimated additional CI time: 2-4 minutes (parallelized)
- Trivy caches vulnerability database between runs (faster subsequent scans)
- No impact on build/test jobs (independent parallel job)

## Open Questions

All questions resolved.

---

_Updated by `/shep-kit:research` — proceed with `/shep-kit:plan`_
