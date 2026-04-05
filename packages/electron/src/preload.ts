/**
 * Electron Preload Script
 *
 * Runs in the renderer process with contextIsolation=true and sandbox=true.
 * Exposes a minimal API via contextBridge for the web UI to communicate
 * with the main process.
 *
 * Phase 3 will add IPC channels here. For now this is a placeholder that
 * ensures the preload path referenced by main.ts resolves correctly.
 */

// Placeholder — Phase 3 will add contextBridge.exposeInMainWorld() calls
export {};
