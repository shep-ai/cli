# Building Guide

Guide to building Shep AI CLI for development and distribution.

## Build System

Shep uses **Vite** for building:

- Fast cold starts
- Instant HMR in development
- Optimized production builds
- Native TypeScript support

## Build Commands

### Development Build

```bash
# Watch mode with hot reload
pnpm dev
```

This starts Vite in watch mode, rebuilding on file changes.

### Production Build

```bash
pnpm build
```

Output goes to `dist/`:

```
dist/
├── index.js          # Main entry point
├── cli.js            # CLI entry
├── index.d.ts        # Type declarations
└── chunks/           # Code-split chunks
```

### Type Checking

```bash
# Check types without emitting
pnpm typecheck

# Watch mode
pnpm typecheck:watch
```

### Full CI Build

```bash
pnpm build:ci
```

Runs: typecheck → lint → test → build

## Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        cli: resolve(__dirname, 'src/presentation/cli/index.ts')
      },
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: [
        // Node built-ins
        'fs', 'path', 'os', 'crypto', 'child_process',
        // External dependencies
        'better-sqlite3', 'commander'
      ]
    },
    target: 'node18',
    minify: false,
    sourcemap: true
  },
  plugins: [
    dts({ rollupTypes: true })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
```

## TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

## Build Outputs

### ESM Bundle

```javascript
// dist/index.js
export { Feature } from './domain/entities/feature.js';
export { CreatePlanUseCase } from './application/use-cases/create-plan.js';
// ...
```

### CommonJS Bundle

```javascript
// dist/index.cjs
const { Feature } = require('./domain/entities/feature.cjs');
// ...
```

### Type Declarations

```typescript
// dist/index.d.ts
export declare class Feature {
  readonly id: string;
  readonly name: string;
  // ...
}
```

## CLI Executable

The CLI entry point includes a shebang:

```javascript
#!/usr/bin/env node
// dist/cli.js
import { program } from './presentation/cli/index.js';
program.parse();
```

Package.json bin configuration:

```json
{
  "bin": {
    "shep": "./dist/cli.js"
  }
}
```

## Dependencies

### Runtime Dependencies

Only essential dependencies for production:

```json
{
  "dependencies": {
    "commander": "^12.0.0",
    "better-sqlite3": "^9.0.0"
  }
}
```

### Build Dependencies

Development-only:

```json
{
  "devDependencies": {
    "vite": "^5.0.0",
    "typescript": "^5.3.0",
    "vite-plugin-dts": "^3.0.0",
    "@types/node": "^20.0.0",
    "@types/better-sqlite3": "^7.0.0"
  }
}
```

## Native Modules

`better-sqlite3` requires native compilation:

```bash
# Rebuild for current platform
npm rebuild better-sqlite3

# Or during install
npm install --build-from-source
```

For distribution, we use `prebuild`:

```json
{
  "scripts": {
    "install": "prebuild-install || node-gyp rebuild"
  }
}
```

## Build Scripts

### Clean Build

```bash
pnpm clean && pnpm build
```

Clean script:

```json
{
  "scripts": {
    "clean": "rimraf dist coverage"
  }
}
```

### Package for npm

```bash
pnpm build
npm pack
```

Creates `shep-ai-cli-x.x.x.tgz`.

### Publish

```bash
pnpm build
npm publish --access public
```

## Build Optimization

### Tree Shaking

Vite automatically tree-shakes unused exports. Ensure:

- Use named exports
- Avoid side effects in module scope
- Mark pure functions

### Code Splitting

Automatic code splitting for dynamic imports:

```typescript
// Lazy load heavy modules
const { HeavyModule } = await import('./heavy-module');
```

### Source Maps

Enabled in production for debugging:

```typescript
build: {
  sourcemap: true
}
```

## Debugging Builds

### Analyze Bundle

```bash
pnpm build -- --debug
```

Or use rollup-plugin-visualizer:

```typescript
import { visualizer } from 'rollup-plugin-visualizer';

plugins: [
  visualizer({ open: true })
]
```

### Check Output Size

```bash
pnpm build
du -sh dist/*
```

Target sizes:
- `index.js`: < 200KB
- `cli.js`: < 50KB

## Continuous Integration

### Build Matrix

```yaml
# .github/workflows/build.yml
jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [18, 20]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: pnpm build
```

### Release Build

```yaml
# .github/workflows/release.yml
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: pnpm build:ci
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Maintaining This Document

**Update when:**
- Build tooling changes
- Vite configuration changes
- New build targets added
- Dependency requirements change

**Related docs:**
- [setup.md](./setup.md) - Development setup
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Release process
