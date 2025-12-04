/**
 * Parser: Convierte JSON Schema a AST
 */

import type { ASTNode } from "../ast/types.ts";

export interface JSONSchema {
  type?: string | string[];
  properties?: Record<string, JSONSchema>;
  required?: string[];
  additionalProperties?: boolean | JSONSchema;
  items?: JSONSchema | JSONSchema[];
  enum?: (string | number | boolean)[];
  const?: string | number | boolean | null;
  oneOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  allOf?: JSONSchema[];
  minItems?: number;
  maxItems?: number;
  [key: string]: unknown; // Para permitir keywords adicionales que ignoraremos
}

export class ParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParserError";
  }
}

/**
 * Función principal que convierte JSON Schema a AST
 */
export function parseSchema(schema: JSONSchema): ASTNode {
  // Manejar const primero (mayor prioridad)
  if (schema.const !== undefined) {
    return {
      kind: "const",
      value: schema.const,
    };
  }

  // Manejar enum
  if (schema.enum) {
    return {
      kind: "enum",
      values: schema.enum,
    };
  }

  // Manejar combinadores
  if (schema.allOf) {
    const types = schema.allOf.map(parseSchema);
    // Optimización: si solo hay un tipo, retornarlo directamente
    if (types.length === 1 && types[0]) {
      return types[0];
    }
    return {
      kind: "intersection",
      types,
    };
  }

  if (schema.oneOf || schema.anyOf) {
    const schemas = schema.oneOf || schema.anyOf || [];
    const types = schemas.map(parseSchema);
    // Optimización: si solo hay un tipo, retornarlo directamente
    if (types.length === 1 && types[0]) {
      return types[0];
    }
    return {
      kind: "union",
      types,
    };
  }

  // Manejar type
  if (schema.type) {
    return parseType(schema);
  }

  // Si no hay type, retornar any
  return { kind: "any" };
}

function parseType(schema: JSONSchema): ASTNode {
  const { type } = schema;

  // Si type es un array (union de tipos)
  if (Array.isArray(type)) {
    if (type.length === 0) {
      return { kind: "never" };
    }
    if (type.length === 1 && type[0]) {
      return parseType({ ...schema, type: type[0] });
    }
    const types = type.map((t) => parseType({ ...schema, type: t }));
    return {
      kind: "union",
      types,
    };
  }

  // Tipos primitivos
  switch (type) {
    case "string":
    case "number":
    case "boolean":
    case "null":
      return { kind: "primitive", type };

    case "integer":
      // integer se convierte a number en TypeScript
      return { kind: "primitive", type: "number" };

    case "object":
      return parseObject(schema);

    case "array":
      return parseArray(schema);

    default:
      throw new ParserError(`Tipo desconocido: ${type}`);
  }
}

function parseObject(schema: JSONSchema): ASTNode {
  const properties: Record<string, { type: ASTNode; required: boolean }> = {};
  const requiredFields = new Set(schema.required || []);

  // Procesar propiedades
  if (schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      properties[key] = {
        type: parseSchema(propSchema),
        required: requiredFields.has(key),
      };
    }
  }

  // Procesar additionalProperties
  let additionalProperties: ASTNode | boolean | undefined;
  if (schema.additionalProperties !== undefined) {
    if (typeof schema.additionalProperties === "boolean") {
      additionalProperties = schema.additionalProperties;
    } else {
      additionalProperties = parseSchema(schema.additionalProperties);
    }
  }

  return {
    kind: "object",
    properties,
    additionalProperties,
  };
}

function parseArray(schema: JSONSchema): ASTNode {
  if (!schema.items) {
    // Array sin items especificados -> any[]
    return {
      kind: "array",
      items: { kind: "any" },
    };
  }

  // Si items es un array -> tupla
  if (Array.isArray(schema.items)) {
    const items = schema.items.map(parseSchema);
    return {
      kind: "tuple",
      items,
    };
  }

  // Si items es un objeto -> array homogéneo
  return {
    kind: "array",
    items: parseSchema(schema.items),
  };
}
