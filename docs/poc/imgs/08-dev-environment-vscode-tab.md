# Development Environment - VS Code Tab

![Screenshot](08-dev-environment-vscode-tab.png)

## Summary

The **Development Environment** window for "Dark Mode Support", showing the embedded **VS Code** tab with a code editor and file explorer.

## Key Elements

- **Tab bar**: Web Preview, VS Code (active), Terminal
- **Context bar**: Git branch `feat/dark-mode-support`, worktree `.worktrees/feat/dark-mode-support`, PR #237 badge
- **VS Code Explorer** (left sidebar): Shows a project structure with `src/`, `public/`, `package.json`, `README.md`
- **Editor pane**: Open file `index.js` containing a simple Express.js server:
  ```js
  import express from 'express';
  const app = express();
  app.get('/', (req, res) => {
    res.send('Hello World!');
  });
  ```
- **VS Code sidebar icons**: File explorer, search, source control, and extensions
- This demonstrates the embedded code editing capability within the feature's development environment, using a git worktree for branch isolation
