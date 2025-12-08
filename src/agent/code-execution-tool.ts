/**
 * Code Execution Tool
 * Creates an AI SDK tool that executes LLM-generated code with access to provided tools
 */

import { tool } from "ai";
import { z } from "zod";
import type { Tool, CodeExecutionOptions, CodeExecutionResult } from "./types.ts";
import { createToolSandbox, executeInSandbox } from "../sandbox/vm-executor.ts";
import { generateToolTypes } from "../generator/tool-types.ts";

/**
 * Creates an AI SDK tool that executes TypeScript/JavaScript code
 * with access to the provided tools in a sandboxed environment
 *
 * @param tools - Array of tools to make available in the sandbox
 * @param options - Execution options (timeout, allowed globals)
 * @returns An AI SDK tool that can be passed to generateText/streamText
 *
 * @example
 * ```ts
 * const executeCode = createCodeExecutionTool([
 *   {
 *     name: 'fetchData',
 *     description: 'Fetches data from an API',
 *     parameters: { type: 'object', properties: { url: { type: 'string' } } },
 *     execute: async ({ url }) => fetch(url).then(r => r.json())
 *   }
 * ]);
 *
 * const result = await generateText({
 *   model: openrouter.chat('anthropic/claude-sonnet-4'),
 *   messages: [{ role: 'user', content: 'Fetch data from...' }],
 *   tools: { executeCode },
 *   maxSteps: 10
 * });
 * ```
 */
export function createCodeExecutionTool(
  tools: Tool[],
  options: CodeExecutionOptions = {}
) {
  // Generate TypeScript type definitions for the LLM
  const typeDefinitions = generateToolTypes(tools);

  // Build the tool description with available functions
  const description = `Execute JavaScript code with tools available as async functions. Use this to orchestrate multiple tool calls, loop over data, or combine tool results.

Available tools:
${typeDefinitions}

IMPORTANT:
- All tool functions are async and return objects (not primitive strings)
- Always access specific properties or use JSON.stringify() when you need string output
- Use \`return\` statement for the final result
- Use console.log() for debugging output

Example:
\`\`\`javascript
const result = await someFunction({ param: value });
return result.data;
\`\`\``;

  const inputSchema = z.object({
    code: z
      .string()
      .describe(
        "JavaScript/TypeScript code to execute. All tool functions are available as global async functions."
      ),
    reasoning: z
      .string()
      .describe(
        "Brief explanation of what this code does and why it solves the task"
      ),
  });

  return tool({
    description,
    inputSchema,
    execute: async ({ code, reasoning }): Promise<CodeExecutionResult> => {
      // Log reasoning for debugging
      console.log(`[executeCode] Reasoning: ${reasoning}`);
      console.log(`[executeCode] Executing code:\n${code}`);

      // Create sandbox with tool proxies
      const sandbox = createToolSandbox(tools);

      // Execute code in VM
      const result = await executeInSandbox(code, sandbox, options);

      // Count tool calls for summary
      const toolCallCounts: Record<string, number> = {};
      for (const tc of result.toolCalls) {
        toolCallCounts[tc.name] = (toolCallCounts[tc.name] || 0) + 1;
      }

      // Format the response - minimal context
      return {
        success: !result.error,
        output: result.output,
        logs: result.logs,
        toolCallSummary: toolCallCounts,
        error: result.error?.message,
      };
    },
  });
}

