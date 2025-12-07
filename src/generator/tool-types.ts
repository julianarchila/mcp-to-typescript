/**
 * Tool Type Generator
 * Converts tool schemas to TypeScript function signatures for LLM prompts
 */

import type { Tool } from "../agent/types.ts";
import { parseSchema } from "../parser/index.ts";
import { generateTypeScript } from "./index.ts";

/**
 * Generates TypeScript function signatures from an array of tools
 * These signatures are used in the LLM prompt to describe available tools
 */
export function generateToolTypes(tools: Tool[]): string {
  const signatures: string[] = [];

  for (const tool of tools) {
    const signature = generateToolSignature(tool);
    signatures.push(signature);
  }

  return signatures.join("\n\n");
}

/**
 * Generates a TypeScript function signature for a single tool
 */
function generateToolSignature(tool: Tool): string {
  // Parse the parameters schema to get the TypeScript type
  let paramsType: string;

  try {
    const ast = parseSchema(tool.parameters);
    paramsType = generateTypeScript(ast);
  } catch {
    // Fallback for invalid schemas
    paramsType = "any";
  }

  // Format the description as a JSDoc comment
  const description = tool.description
    .split("\n")
    .map((line) => ` * ${line}`)
    .join("\n");

  // Generate parameter documentation from schema properties
  const paramDocs = generateParamDocs(tool.parameters);

  return `/**
${description}
${paramDocs} */
declare function ${tool.name}(args: ${paramsType}): Promise<any>;`;
}

/**
 * Generates @param documentation from schema properties
 */
function generateParamDocs(schema: Tool["parameters"]): string {
  if (!schema.properties) {
    return "";
  }

  const docs: string[] = [];
  const required = new Set(schema.required || []);

  for (const [name, propSchema] of Object.entries(schema.properties)) {
    const isRequired = required.has(name);
    const description = (propSchema as any).description || "";
    const optionalMarker = isRequired ? "" : " (optional)";
    docs.push(` * @param args.${name}${optionalMarker} - ${description}`);
  }

  return docs.length > 0 ? docs.join("\n") + "\n" : "";
}

/**
 * Generates a summary of available tools (shorter format for context)
 */
export function generateToolSummary(tools: Tool[]): string {
  return tools
    .map((tool) => `- ${tool.name}: ${tool.description.split("\n")[0]}`)
    .join("\n");
}

