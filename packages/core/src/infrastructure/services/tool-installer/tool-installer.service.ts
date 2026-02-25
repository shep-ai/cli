/**
 * Tool Installer Service Implementation
 *
 * Provides tool availability checking, installation command resolution,
 * and installation execution with streaming output and timeout handling.
 *
 * Features:
 * - Check binary availability using 'which' command
 * - Retrieve platform-specific installation commands
 * - Execute installations with real-time output streaming
 * - Automatic timeout handling with process termination
 * - Immutable status objects via value object factory functions
 */

import { injectable } from 'tsyringe';
import { execFile, spawn } from 'node:child_process';
import { platform } from 'node:os';
import type { IToolInstallerService } from '../../../application/ports/output/services/tool-installer.service.js';
import type {
  ToolInstallationStatus,
  ToolInstallCommand,
  InstallationSuggestion,
} from '../../../domain/generated/output.js';
import {
  createAvailableStatus,
  createMissingStatus,
  createErrorStatus,
} from '../../../domain/value-objects/tool-installation-status.js';
import { TOOL_METADATA, type ToolMetadata } from './tool-metadata.js';

/**
 * Resolve binary name for the current platform.
 * Supports both simple string binaries and per-platform maps.
 */
function resolveBinary(metadata: ToolMetadata): string {
  if (typeof metadata.binary === 'string') return metadata.binary;
  return metadata.binary[platform()] ?? Object.values(metadata.binary)[0];
}

/**
 * Check if a binary exists in the system PATH using 'which' command.
 *
 * `which` exits with code 1 when the binary is simply not in PATH.
 * Node's execFile wraps that as an Error, but it's a normal "not found"
 * result. Only truly unexpected failures (ENOENT for `which` itself,
 * EACCES, signals, etc.) are surfaced via the `error` field.
 */
const checkBinaryExists = (
  binary: string
): Promise<{ found: boolean; notInPath?: boolean; error?: Error }> => {
  return new Promise((resolve) => {
    execFile('which', [binary], (err) => {
      if (!err) return resolve({ found: true });

      // execFile errors from a non-zero exit code have a numeric `code` property.
      // That's the normal "binary not found in PATH" case.
      const code = (err as NodeJS.ErrnoException).code;
      if (code === undefined || typeof code === 'number') {
        return resolve({ found: false, notInPath: true });
      }

      // Anything else (ENOENT for `which` itself, EACCES, etc.) is a real error.
      resolve({ found: false, error: err });
    });
  });
};

@injectable()
export class ToolInstallerServiceImpl implements IToolInstallerService {
  /**
   * Check if a tool binary is available on the system (PATH check)
   */
  async checkAvailability(toolName: string): Promise<ToolInstallationStatus> {
    const metadata = TOOL_METADATA[toolName];

    if (!metadata) {
      return createErrorStatus(toolName, `Unknown tool: ${toolName}`);
    }

    try {
      const result = await checkBinaryExists(resolveBinary(metadata));

      if (result.found) {
        return createAvailableStatus(toolName);
      }

      if (result.notInPath) {
        const suggestions = this.createInstallationSuggestions(metadata);
        return createMissingStatus(toolName, suggestions);
      }

      // Genuine error (e.g. `which` binary missing, permission denied)
      const errorMessage = result.error?.message ?? 'Unknown error checking availability';
      return createErrorStatus(toolName, errorMessage);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return createErrorStatus(toolName, `Failed to check availability: ${errorMessage}`);
    }
  }

  /**
   * Get the install command metadata for a tool on the current platform.
   * Returns null if tool is unknown or not supported on current platform.
   */
  getInstallCommand(toolName: string): ToolInstallCommand | null {
    const metadata = TOOL_METADATA[toolName];
    if (!metadata) {
      return null;
    }

    const currentPlatform = platform();
    const command = metadata.commands[currentPlatform];
    if (!command) {
      return null;
    }

    return {
      command,
      platform: currentPlatform,
      timeout: metadata.timeout,
      toolName,
      packageManager: metadata.packageManager,
    };
  }

  /**
   * Execute installation of a tool with live output streaming.
   * Streams stdout/stderr to optional callback and handles timeout automatically.
   */
  async executeInstall(
    toolName: string,
    onOutput?: (data: string) => void
  ): Promise<ToolInstallationStatus> {
    const installCommand = this.getInstallCommand(toolName);
    if (!installCommand) {
      return createErrorStatus(toolName, `No installation command available for ${toolName}`);
    }

    return new Promise((resolve) => {
      let output = '';

      const child = spawn('sh', ['-c', installCommand.command], {
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      // Stream output from stdout and stderr
      const pipeOutput = (stream: NodeJS.ReadableStream | null) => {
        if (!stream) return;
        stream.on('data', (data: Buffer) => {
          const text = data.toString();
          output += text;
          if (onOutput) {
            onOutput(text);
          }
        });
      };

      pipeOutput(child.stdout);
      pipeOutput(child.stderr);

      // Set up timeout to kill process if it takes too long
      const timeoutId = setTimeout(() => {
        child.kill();
      }, installCommand.timeout);

      // Handle process completion or error
      const cleanup = (errorMessage?: string) => {
        clearTimeout(timeoutId);
        const returnStatus = errorMessage
          ? createErrorStatus(toolName, errorMessage)
          : createAvailableStatus(toolName);
        resolve(returnStatus);
      };

      child.on('close', async (code: number) => {
        if (code === 0) {
          // Verify the installation by checking if binary exists
          const metadata = TOOL_METADATA[toolName];
          if (metadata) {
            const binary = resolveBinary(metadata);
            const verifyResult = await checkBinaryExists(binary);
            if (verifyResult.found) {
              cleanup();
            } else {
              cleanup(
                `Installation completed but binary '${binary}' not found in PATH. The installation may require a shell restart or PATH update.`
              );
            }
          } else {
            cleanup();
          }
        } else {
          cleanup(`Installation failed with exit code ${code}. Output: ${output.slice(0, 200)}`);
        }
      });

      child.on('error', (err: Error) => {
        cleanup(`Installation error: ${err.message}`);
      });
    });
  }

  /**
   * Create installation suggestions for a tool based on its metadata
   */
  private createInstallationSuggestions(
    metadata: (typeof TOOL_METADATA)[string]
  ): InstallationSuggestion[] {
    const suggestions: InstallationSuggestion[] = [];

    // Add suggestion for current platform if available
    const currentPlatform = platform();
    const command = metadata.commands[currentPlatform];

    if (command) {
      suggestions.push({
        packageManager: metadata.packageManager,
        command,
        documentationUrl: metadata.documentationUrl,
      });
    }

    // Add generic suggestion
    if (!suggestions.length) {
      suggestions.push({
        packageManager: metadata.packageManager,
        command: 'Visit official documentation',
        documentationUrl: metadata.documentationUrl,
      });
    }

    return suggestions;
  }
}
