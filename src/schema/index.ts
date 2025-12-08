/**
 * JSON Schema Module
 * Converts JSON Schema to TypeScript types
 */

// Core functions
export { parseSchema } from "./parser.ts";
export { generateTypeScript } from "./generator.ts";

// Types
export type { JSONSchema } from "./parser.ts";
export type { GeneratorOptions } from "./generator.ts";
export type { ASTNode } from "./ast.ts";

// Errors
export { ParserError } from "./errors.ts";
