/**
 * Electron Main Process Entry Point
 *
 * Thin shell that wires real Electron dependencies into startApp().
 * All testable logic lives in app.ts.
 *
 * Security: nodeIntegration=false, contextIsolation=true, sandbox=true
 * Window close hides to tray. Cmd+Q / Quit triggers graceful shutdown.
 */

// IMPORTANT: reflect-metadata must be imported first for tsyringe DI
import 'reflect-metadata';

import { app, BrowserWindow, nativeImage, Tray, Menu } from 'electron';
import path from 'node:path';
import windowStateKeeper from 'electron-window-state';
import { startApp, type AppDeps } from './app.js';
import { initializeContainer, container } from '@shepai/core/infrastructure/di/container.js';
import { initializeSettings } from '@shepai/core/infrastructure/services/settings.service.js';
import { setVersionEnvVars } from '@shepai/core/infrastructure/services/version.service.js';
import {
  initializeNotificationWatcher,
  getNotificationWatcher,
} from '@shepai/core/infrastructure/services/notifications/notification-watcher.service.js';
import {
  initializePrSyncWatcher,
  getPrSyncWatcher,
} from '@shepai/core/infrastructure/services/pr-sync/pr-sync-watcher.service.js';
import {
  initializeAutoArchiveWatcher,
  getAutoArchiveWatcher,
} from '@shepai/core/infrastructure/services/auto-archive/auto-archive-watcher.service.js';
import { getExistingConnection } from '@shepai/core/infrastructure/persistence/sqlite/connection.js';
import {
  findAvailablePort,
  DEFAULT_PORT,
} from '@shepai/core/infrastructure/services/port.service.js';
import fs from 'node:fs';

/* eslint-disable no-console */

const deps = {
  electron: { app, BrowserWindow, Tray, Menu, nativeImage },
  windowStateKeeper,
  bootstrapDeps: {
    initializeContainer,
    container,
    initializeSettings,
    setVersionEnvVars,
    initializeNotificationWatcher,
    getNotificationWatcher,
    initializePrSyncWatcher,
    getPrSyncWatcher,
    initializeAutoArchiveWatcher,
    getAutoArchiveWatcher,
    getExistingConnection,
  },
  findAvailablePort,
  defaultPort: DEFAULT_PORT,
  resolveWebDirDeps: {
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    existsSync: fs.existsSync,
    basedir: import.meta.dirname,
  },
  resourcesDir: path.join(import.meta.dirname, '..', 'resources'),
  splashHtmlPath: path.join(import.meta.dirname, 'splash.html'),
  preloadPath: path.join(import.meta.dirname, 'preload.js'),
};

startApp(deps as AppDeps).catch((error) => {
  console.error('[electron] Unhandled error:', error);
  process.exit(1);
});
