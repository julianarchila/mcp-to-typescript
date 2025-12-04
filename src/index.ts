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
 * @param schema - JSON Schema válido
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
  schema: JSONSchema,
  options: ConversionOptions = {}
): ConversionResult {
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
 */
export function convert(
  schema: JSONSchema,
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
