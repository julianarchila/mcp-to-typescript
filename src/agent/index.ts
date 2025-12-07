/**
 * Agent Module
 * Exports the code execution tool and related types
 */

// Main tool creator
export { createCodeExecutionTool } from "./code-execution-tool.ts";

// Types
export type {
  Tool,
  ToolCall,
  SandboxResult,
  CodeExecutionOptions,
} from "./types.ts";

// Sandbox utilities (for advanced usage)
export {
  createToolSandbox,
  executeInSandbox,
  executeWithTools,
} from "../sandbox/vm-executor.ts";

// Type generation utilities
export {
  generateToolTypes,
  generateToolSummary,
} from "../generator/tool-types.ts";

