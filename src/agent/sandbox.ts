/**
 * VM Sandbox Executor
 * Executes LLM-generated code in a sandboxed environment with tool interception
 */

import * as vm from "node:vm";
import type { Tool, ToolCall, SandboxResult, CodeExecutionOptions } from "./types.ts";

/**
 * Creates a sandbox context with tool proxies that intercept and track all calls
 */
export function createToolSandbox(tools: Tool[]): {
  context: vm.Context;
  toolCalls: ToolCall[];
  pendingPromises: Promise<any>[];
  logs: string[];
} {
  const toolCalls: ToolCall[] = [];
  const pendingPromises: Promise<any>[] = [];
  const logs: string[] = [];

  // Create wrapper functions for each tool
  const toolProxies: Record<string, (...args: any[]) => any> = {};

  for (const tool of tools) {
    toolProxies[tool.name] = (...args: any[]) => {
      const timestamp = Date.now();
      // For tools with a single object parameter, use the first arg
      // For tools with multiple args, pass them as-is
      const toolArgs = args.length === 1 ? args[0] : args;

      try {
        const result = tool.execute(toolArgs);

        // Handle async tools
        if (result instanceof Promise) {
          const trackedPromise = result
            .then((resolvedResult) => {
              toolCalls.push({
                name: tool.name,
                arguments: toolArgs,
                result: resolvedResult,
                timestamp,
              });
              return resolvedResult;
            })
            .catch((error) => {
              toolCalls.push({
                name: tool.name,
                arguments: toolArgs,
                error: error?.message || String(error),
                timestamp,
              });
              throw error;
            });

          pendingPromises.push(trackedPromise);
          return trackedPromise;
        }

        // Sync tool
        toolCalls.push({
          name: tool.name,
          arguments: toolArgs,
          result,
          timestamp,
        });
        return result;
      } catch (error: any) {
        toolCalls.push({
          name: tool.name,
          arguments: toolArgs,
          error: error?.message || String(error),
          timestamp,
        });
        throw error;
      }
    };
  }

  // Helper to format log arguments
  const formatLogArgs = (args: any[]): string => {
    return args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
  };

  // Create the VM context with tool proxies and safe globals
  const context = vm.createContext({
    // Tool functions available directly by name
    ...toolProxies,
    // Common safe globals
    console: {
      log: (...args: any[]) => {
        logs.push(formatLogArgs(args));
      },
      error: (...args: any[]) => {
        logs.push(`ERROR: ${formatLogArgs(args)}`);
      },
      warn: (...args: any[]) => {
        logs.push(`WARN: ${formatLogArgs(args)}`);
      },
    },
    JSON,
    Math,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Promise,
    setTimeout: (fn: () => void, ms: number) => {
      // Limited setTimeout for async operations
      return setTimeout(fn, Math.min(ms, 5000));
    },
    // Result holder
    __result__: undefined,
  });

  return { context, toolCalls, pendingPromises, logs };
}

/**
 * Executes code in a sandboxed VM environment
 */
export async function executeInSandbox(
  code: string,
  sandbox: ReturnType<typeof createToolSandbox>,
  options: CodeExecutionOptions = {}
): Promise<SandboxResult> {
  const { maxExecutionTime = 30000 } = options;
  const { context, toolCalls, pendingPromises, logs } = sandbox;

  try {
    // Wrap code in async IIFE - the LLM should use `return` for the final result
    const wrappedCode = `
      (async () => {
        ${code}
      })()
    `;

    const script = new vm.Script(wrappedCode, {
      filename: "sandbox-code.js",
    });

    // Execute with timeout
    const output = await script.runInContext(context, {
      timeout: maxExecutionTime,
    });

    // Wait for any pending tool promises
    if (pendingPromises.length > 0) {
      await Promise.allSettled(pendingPromises);
    }

    return {
      toolCalls,
      output,
      logs,
    };
  } catch (error: any) {
    return {
      toolCalls,
      output: undefined,
      logs,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Convenience function to execute code with tools in one call
 */
export async function executeWithTools(
  code: string,
  tools: Tool[],
  options: CodeExecutionOptions = {}
): Promise<SandboxResult> {
  const sandbox = createToolSandbox(tools);
  return executeInSandbox(code, sandbox, options);
}
