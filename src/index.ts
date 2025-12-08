/**
 * MCP to TypeScript
 * Library for converting JSON Schema to TypeScript types and executing AI-generated code with tools
 */

// ============================================================================
// Schema Module - JSON Schema to TypeScript transpiler
// ============================================================================

export {
  parseSchema,
  generateTypeScript,
  type JSONSchema,
  type ASTNode,
  type GeneratorOptions,
  ParserError,
} from "./schema/index.ts";

// Backward compatibility: keep the main conversion functions at top level
import { parseSchema } from "./schema/parser.ts";
import { generateTypeScript, type GeneratorOptions } from "./schema/generator.ts";
import { ParserError } from "./schema/errors.ts";
import type { JSONSchema } from "./schema/parser.ts";
import type { ASTNode } from "./schema/ast.ts";

/**
 * Options for the complete conversion
 */
export interface ConversionOptions extends GeneratorOptions {
  /** If true, returns the AST instead of TypeScript code */
  returnAST?: boolean;
}

/**
 * Result of the conversion
 */
export interface ConversionResult {
  /** Generated TypeScript code (if returnAST is false) */
  code?: string;
  /** Generated AST (if returnAST is true) */
  ast?: ASTNode;
}

/**
 * Validates that input is a valid JSON Schema
 * @throws {ParserError} If validation fails
 */
function validateJSONSchema(input: unknown): asserts input is JSONSchema {
  if (input === null || input === undefined) {
    throw new ParserError("Schema cannot be null or undefined");
  }

  if (typeof input !== "object") {
    throw new ParserError(`Schema must be an object, got ${typeof input}`);
  }

  if (Array.isArray(input)) {
    throw new ParserError("Schema must be an object, got array");
  }
}

/**
 * Converts a JSON Schema to TypeScript
 * 
 * @param schema - Valid JSON Schema (any object will be validated internally)
 * @param options - Generation options
 * @returns TypeScript code or AST
 * 
 * @example
 * ```ts
 * const schema = {
 *   type: "object",
 *   properties: {
 *     name: { type: "string" },
 *     age: { type: "number" }
 *   },
 *   required: ["name"]
 * };
 * 
 * const result = jsonSchemaToTypeScript(schema, { typeName: "User" });
 * console.log(result.code);
 * // Output:
 * // export type User = {
 * //   name: string;
 * //   age?: number;
 * // };
 * ```
 */
export function jsonSchemaToTypeScript(
  schema: unknown,
  options: ConversionOptions = {}
): ConversionResult {
  // Validate and cast the schema
  validateJSONSchema(schema);

  // Parse schema to AST
  const ast = parseSchema(schema);

  // If only AST is needed
  if (options.returnAST) {
    return { ast };
  }

  // Generate TypeScript code
  const code = generateTypeScript(ast, options);

  return { code };
}

/**
 * Simplified version that returns the code directly
 * 
 * @param schema - Valid JSON Schema (any object will be validated internally)
 * @param typeName - Optional name of the type to generate
 * @returns Generated TypeScript code
 */
export function convert(
  schema: unknown,
  typeName?: string
): string {
  const result = jsonSchemaToTypeScript(schema, { typeName });
  return result.code || "";
}

// ============================================================================
// Agent Module - Code execution with tools
// ============================================================================

export {
  createCodeExecutionTool,
  type Tool,
  type ToolCall,
  type SandboxResult,
  type CodeExecutionOptions,
  type CodeExecutionResult,
  createToolSandbox,
  executeInSandbox,
  executeWithTools,
  generateToolTypes,
  generateToolSummary,
} from "./agent/index.ts";

// ============================================================================
// Adapters Module - External service integrations
// ============================================================================

export {
  getComposioTools,
  listComposioToolkits,
  type ComposioToolsOptions,
} from "./adapters/index.ts";
