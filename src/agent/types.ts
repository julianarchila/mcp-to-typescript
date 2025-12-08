/**
 * Type definitions for the generic tool execution agent
 */

import type { JSONSchema } from "../parser/index.ts";

/**
 * A tool that can be executed by the agent
 */
export type Tool = {
  /** Unique name of the tool */
  name: string;
  /** Description of what the tool does */
  description: string;
  /** JSON Schema describing the tool's parameters */
  parameters: JSONSchema;
  /** Function to execute the tool */
  execute: (args: any) => Promise<any> | any;
};

/**
 * Record of a tool call made during code execution
 */
export type ToolCall = {
  /** Name of the tool that was called */
  name: string;
  /** Arguments passed to the tool */
  arguments: any;
  /** Result of the tool call (if successful) */
  result?: any;
  /** Error from the tool call (if failed) */
  error?: any;
  /** Timestamp of when the call was made */
  timestamp: number;
};

/**
 * Result from executing code in the sandbox
 */
export type SandboxResult = {
  /** All tool calls made during execution */
  toolCalls: ToolCall[];
  /** Final output/return value from the code */
  output: any;
  /** Console logs captured during execution */
  logs: string[];
  /** Error if execution failed */
  error?: Error;
};

/**
 * Options for the code execution tool
 */
export type CodeExecutionOptions = {
  /** Maximum time (ms) to allow execution */
  maxExecutionTime?: number;
  /** Additional globals to expose to the sandbox */
  allowedGlobals?: string[];
};

/**
 * Result from the code execution tool
 */
export type CodeExecutionResult = {
  /** Whether execution was successful */
  success: boolean;
  /** Final output/return value from the code */
  output: any;
  /** Console logs captured during execution */
  logs: string[];
  /** Summary of tool calls made (tool name -> count) */
  toolCallSummary: Record<string, number>;
  /** Error message if execution failed */
  error?: string;
};

