# CLI Commands and Tools

Storybook provides comprehensive command-line tools for project initialization, development, building, and management. The CLI is the primary interface for working with Storybook projects.

## Capabilities

### Development Server

Start the Storybook development server for interactive development and testing.

```bash { .api }
# Start development server
storybook dev [options]

# Options:
--port, -p <port>          Port to run Storybook on (default: 6006)
--host <host>              Host to run Storybook on (default: localhost)
--config-dir, -c <dir>     Directory where to load Storybook config from
--https                    Enable HTTPS
--ssl-cert <cert>          Path to SSL certificate
--ssl-key <key>            Path to SSL key
--ssl-ca <ca>              Path to SSL certificate authority
--ci                       CI mode (skip interactive prompts)
--no-open                  Do not open browser window automatically
--quiet                    Suppress verbose build output
--debug-webpack            Display webpack stats
--webpack-stats-json       Write Webpack stats to stats.json
```

**Usage Examples:**

```bash
# Basic development server
storybook dev

# Custom port and host
storybook dev --port 8080 --host 0.0.0.0

# HTTPS with custom certificates
storybook dev --https --ssl-cert ./cert.pem --ssl-key ./key.pem

# Custom config directory
storybook dev --config-dir ./.storybook-custom
```

### Build Production Version

Build static version of Storybook for deployment.

```bash { .api }
# Build static Storybook
storybook build [options]

# Options:
--output-dir, -o <dir>     Directory where to store built files (default: storybook-static)
--config-dir, -c <dir>     Directory where to load Storybook config from
--webpack-stats-json       Write Webpack stats to stats.json
--quiet                    Suppress verbose build output
--debug-webpack            Display webpack stats
--test                     Build test version for test runners
--disable-telemetry        Disable telemetry collection
```

**Usage Examples:**

```bash
# Basic build
storybook build

# Custom output directory
storybook build --output-dir ./dist

# Build for testing
storybook build --test
```

### Project Initialization

Initialize Storybook in an existing project with automatic framework detection.

```bash { .api }
# Initialize Storybook
storybook init [options]

# Options:
--type <type>              Manually specify project type
--builder <builder>        Specify builder (webpack5, vite)
--use-npm                  Use npm for package management
--use-pnp                  Use Yarn PnP for package management
--yes                      Skip prompts and use default values
--packageManager <pm>      Specify package manager (npm, yarn, pnpm)
--skip-install             Skip package installation
--dev                      Enable development mode
--disable-telemetry        Disable telemetry collection
```

**Usage Examples:**

```bash
# Automatic initialization
storybook init

# Force specific type and builder
storybook init --type react --builder vite

# Skip installation (manual install later)
storybook init --skip-install
```

### Addon Management

Add and remove Storybook addons from your project.

```bash { .api }
# Add an addon
storybook add <addon-name> [options]

# Remove an addon
storybook remove <addon-name> [options]

# Options:
--package-manager <pm>     Specify package manager
--skip-postinstall         Skip post-install steps
--config-dir, -c <dir>     Directory where Storybook config is located
```

**Usage Examples:**

```bash
# Add popular addons
storybook add @storybook/addon-docs
storybook add @storybook/addon-controls
storybook add @storybook/addon-actions

# Remove an addon
storybook remove @storybook/addon-docs
```

### Version Management

Upgrade Storybook packages and get version information.

```bash { .api }
# Upgrade Storybook packages
storybook upgrade [options]

# Get environment information
storybook info [options]

# Options for upgrade:
--package-manager <pm>     Specify package manager
--prerelease              Upgrade to prerelease versions
--skip-check              Skip version compatibility checks
--config-dir, -c <dir>     Directory where Storybook config is located

# Options for info:
--config-dir, -c <dir>     Directory where Storybook config is located
```

**Usage Examples:**

```bash
# Upgrade to latest stable
storybook upgrade

# Upgrade to prerelease
storybook upgrade --prerelease

# Get environment info for debugging
storybook info
```

### Migration and Codemods

Run migration scripts and codemods to update project configuration.

```bash { .api }
# Run migrations
storybook migrate <migration-name> [options]

# Auto-migrate (detect and fix issues)
storybook automigrate [fix-id] [options]

# Options:
--glob <pattern>           Glob pattern for files to migrate
--dry-run                  Show what would be changed without making changes
--parser <parser>          Parser to use (babel, tsx, ts)
--config-dir, -c <dir>     Directory where Storybook config is located
--list                     List available migrations
--yes                      Skip confirmation prompts
```

**Usage Examples:**

```bash
# List available migrations
storybook migrate --list

# Run specific migration
storybook migrate csf-2-to-3

# Auto-migrate with dry run
storybook automigrate --dry-run

# Run auto-migration for specific issue
storybook automigrate angular12
```

### Sandbox Management

Create and manage Storybook sandbox projects for testing and development.

```bash { .api }
# Create sandbox
storybook sandbox [template] [options]

# Options:
--output <dir>             Output directory for sandbox
--branch <branch>          Git branch to use
--init                     Initialize Storybook in sandbox
--no-install               Skip dependency installation
```

**Usage Examples:**

```bash
# Create React sandbox
storybook sandbox react-vite

# Create Vue sandbox in custom directory
storybook sandbox vue3-vite --output ./my-sandbox
```

### Development Utilities

Additional utilities for development and debugging.

```bash { .api }
# Link local Storybook for development
storybook link <repo-url-or-directory> [options]

# Doctor - health check for Storybook project
storybook doctor [options]

# Options for doctor:
--config-dir, -c <dir>     Directory where Storybook config is located
--package-manager <pm>     Specify package manager
```

**Usage Examples:**

```bash
# Link local Storybook development
storybook link ../storybook-repo

# Run health check
storybook doctor
```

## Configuration Files

The CLI commands work with standard Storybook configuration files:

```typescript { .api }
// .storybook/main.ts - Main configuration
export default {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
  },
};

// .storybook/preview.ts - Preview configuration
export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};
```

## Environment Variables

Control CLI behavior with environment variables:

```bash { .api }
# Disable telemetry
STORYBOOK_DISABLE_TELEMETRY=true

# Custom cache directory
STORYBOOK_CACHE_DIR=/custom/cache/path

# Debug mode
DEBUG=storybook:*

# Custom configuration directory
STORYBOOK_CONFIG_DIR=./.custom-storybook

# Force specific package manager
STORYBOOK_PACKAGE_MANAGER=pnpm
```

## Exit Codes

```typescript { .api }
// CLI exit codes
0; // Success
1; // General error
2; // Configuration error
3; // Build error
4; // Network error
130; // User interruption (Ctrl+C)
```

## Integration with Package Managers

Works seamlessly with all major package managers:

```bash
# NPM scripts integration
{
  "scripts": {
    "storybook": "storybook dev --port 6006",
    "build-storybook": "storybook build"
  }
}

# Yarn scripts
yarn storybook
yarn build-storybook

# PNPM scripts
pnpm storybook
pnpm build-storybook
```
