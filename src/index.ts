/**
 * JSON Schema to TypeScript Transpiler
 * 
 * API pública para convertir JSON Schemas en tipos TypeScript
 */

import { parseSchema, type JSONSchema, ParserError } from "./parser/index.ts";
import { generateTypeScript, type GeneratorOptions } from "./generator/index.ts";
import type { ASTNode } from "./ast/types.ts";

export { type JSONSchema, type ASTNode, type GeneratorOptions, ParserError };

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

  // Basic validation - the parser will handle more detailed validation
  // We just need to ensure it's a plain object that could be a schema
}

/**
 * Opciones para la conversión completa
 */
export interface ConversionOptions extends GeneratorOptions {
  /** Si true, retorna el AST en lugar del código TypeScript */
  returnAST?: boolean;
}

/**
 * Resultado de la conversión
 */
export interface ConversionResult {
  /** Código TypeScript generado (si returnAST es false) */
  code?: string;
  /** AST generado (si returnAST es true) */
  ast?: ASTNode;
}

/**
 * Convierte un JSON Schema en TypeScript
 * 
 * @param schema - JSON Schema válido (cualquier objeto será validado internamente)
 * @param options - Opciones de generación
 * @returns Código TypeScript o AST
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
  // Validar y castear el schema
  validateJSONSchema(schema);

  // Parsear schema a AST
  const ast = parseSchema(schema);

  // Si solo se necesita el AST
  if (options.returnAST) {
    return { ast };
  }

  // Generar código TypeScript
  const code = generateTypeScript(ast, options);

  return { code };
}

/**
 * Versión simplificada que retorna directamente el código
 * 
 * @param schema - JSON Schema válido (cualquier objeto será validado internamente)
 * @param typeName - Nombre opcional del tipo a generar
 * @returns Código TypeScript generado
 */
export function convert(
  schema: unknown,
  typeName?: string
): string {
  const result = jsonSchemaToTypeScript(schema, { typeName });
  return result.code || "";
}

/**
 * Exportaciones adicionales para uso avanzado
 */
export { parseSchema } from "./parser/index.ts";
export { generateTypeScript } from "./generator/index.ts";
