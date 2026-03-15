/**
 * @module Shep.Common.Enums.Terminal
 *
 * Defines the TerminalType enum for supported terminal emulator selections.
 * Controls which terminal Shep uses to open shell sessions.
 */
/**
 * Supported terminal emulator types.
 *
 * Each value corresponds to the terminal's tool metadata identifier
 * used in launcher registry lookups and settings persistence.
 * "system" maps to the OS default terminal (Terminal.app on macOS,
 * x-terminal-emulator on Linux, powershell on Windows).
 */
@doc("Supported terminal emulator type")
enum TerminalType {
  @doc("System default terminal (Terminal.app / x-terminal-emulator / PowerShell)")
  System: "system",

  @doc("Warp modern AI terminal")
  Warp: "warp",

  @doc("iTerm2 macOS terminal")
  ITerm2: "iterm2",

  @doc("Alacritty GPU-accelerated terminal")
  Alacritty: "alacritty",

  @doc("Kitty GPU-based terminal")
  Kitty: "kitty",
}
