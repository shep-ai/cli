/**
 * @module Shep.Common.Enums.Telegram
 *
 * Defines enums for the Telegram remote control subsystem.
 * These enums classify the types of commands that can be received
 * from a paired Telegram chat.
 */
/**
 * Types of commands accepted from Telegram.
 *
 * The Telegram bot recognises a fixed set of slash commands that
 * map to Shep operations. Unrecognised messages are echoed back
 * as an "unknown command" message.
 */
@doc("Types of commands accepted via the Telegram bot")
enum TelegramCommandType {
  @doc("Start / pair a new session")
  Start: "start",

  @doc("Show current agent and feature status")
  Status: "status",

  @doc("Approve a pending approval gate")
  Approve: "approve",

  @doc("Reject a pending approval gate with optional feedback")
  Reject: "reject",

  @doc("List features in the current repository")
  ListFeatures: "list_features",

  @doc("Show help text listing available commands")
  Help: "help",
}
