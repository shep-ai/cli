/**
 * Mock Repository Helper
 *
 * Provides mock implementations of repository interfaces for unit testing.
 * Allows tests to control repository behavior without database dependencies.
 */

import type { Settings } from '../../src/domain/generated/output.js';

/**
 * Mock implementation of ISettingsRepository interface.
 * Used in use case unit tests to avoid database dependencies.
 */
export class MockSettingsRepository {
  private settings: Settings | null = null;
  private initializeCalled = false;
  private loadCalled = false;
  private updateCalled = false;

  /**
   * Mock initialize method.
   * Stores the provided settings in memory.
   */
  async initialize(settings: Settings): Promise<void> {
    this.initializeCalled = true;
    this.settings = settings;
  }

  /**
   * Mock load method.
   * Returns the stored settings or null if none exist.
   */
  async load(): Promise<Settings | null> {
    this.loadCalled = true;
    return this.settings;
  }

  /**
   * Mock update method.
   * Updates the stored settings in memory.
   */
  async update(settings: Settings): Promise<void> {
    this.updateCalled = true;
    this.settings = settings;
  }

  /**
   * Test helper: Set the settings that will be returned by load()
   */
  setSettings(settings: Settings | null): void {
    this.settings = settings;
  }

  /**
   * Test helper: Check if initialize() was called
   */
  wasInitializeCalled(): boolean {
    return this.initializeCalled;
  }

  /**
   * Test helper: Check if load() was called
   */
  wasLoadCalled(): boolean {
    return this.loadCalled;
  }

  /**
   * Test helper: Check if update() was called
   */
  wasUpdateCalled(): boolean {
    return this.updateCalled;
  }

  /**
   * Test helper: Reset all tracking flags
   */
  reset(): void {
    this.settings = null;
    this.initializeCalled = false;
    this.loadCalled = false;
    this.updateCalled = false;
  }
}
