/**
 * Composio Adapter
 * Converts Composio tools to the generic Tool format
 */

import { Composio } from "@composio/core";
import type { Tool } from "../agent/types.ts";

/**
 * Options for fetching Composio tools
 */
export interface ComposioToolsOptions {
  /** Toolkits to fetch (e.g., ['GOOGLESHEETS', 'GITHUB']) */
  toolkits: string[];
  /** Composio user ID */
  userId: string;
  /** Optional: Filter to specific actions */
  actions?: string[];
}

/**
 * Fetches tools from Composio and adapts them to the generic Tool format
 *
 * @param options - Configuration for which tools to fetch
 * @returns Array of tools compatible with createCodeExecutionTool
 *
 * @example
 * ```ts
 * const tools = await getComposioTools({
 *   toolkits: ['GOOGLESHEETS'],
 *   userId: 'your-composio-user-id'
 * });
 *
 * const executeCode = createCodeExecutionTool(tools);
 * ```
 */
export async function getComposioTools(
  options: ComposioToolsOptions
): Promise<Tool[]> {
  const composio = new Composio({
    apiKey: process.env.COMPOSIO_API_KEY,
    toolkitVersions: {
      googlesheets: "20251202_00"
    }
  });

  // Fetch tools from Composio
  const composioTools = await composio.tools.get(options.userId, {
    toolkits: options.toolkits,
    ...(options.actions && { actions: options.actions }),
  });

  // Filter to function-type tools and adapt to our format
  return composioTools
    .filter((t: any) => t.type === "function")
    .map((t: any) => ({
      name: t.function.name,
      description: t.function.description || `Executes ${t.function.name}`,
      parameters: t.function.parameters || { type: "object", properties: {} },
      execute: async (args: any) => {
        const result = await composio.tools.execute(t.function.name, {
          userId: options.userId,
          arguments: args,
        });
        return result;
      },
    }));
}

/**
 * Lists available toolkits for a user
 */
export async function listComposioToolkits(userId: string): Promise<string[]> {
  const composio = new Composio({
    apiKey: process.env.COMPOSIO_API_KEY,
  });

  // Get all tools and extract unique toolkits
  const tools = await composio.tools.get(userId, { toolkits: [] });
  const toolkits = new Set<string>();

  for (const tool of tools) {
    // Extract toolkit from tool name (typically in format TOOLKIT_ACTION)
    const parts = (tool as any).function?.name?.split("_");
    if (parts && parts.length > 0) {
      toolkits.add(parts[0]);
    }
  }

  return Array.from(toolkits);
}

