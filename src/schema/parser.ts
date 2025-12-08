/**
 * Parser: Converts JSON Schema to AST
 */

import type { ASTNode } from "./ast.ts";
import { ParserError } from "./errors.ts";

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
  nullable?: boolean;
  [key: string]: unknown; // Allow additional keywords that we'll ignore
}

export { ParserError };

/**
 * Main function that converts JSON Schema to AST
 */
export function parseSchema(schema: JSONSchema): ASTNode {
  // First parse the schema without considering nullable
  let node = parseSchemaWithoutNullable(schema);
  
  // If the schema is nullable, wrap in union with null
  if (schema.nullable === true) {
    node = {
      kind: "union",
      types: [node, { kind: "primitive", type: "null" }],
    };
  }
  
  return node;
}

/**
 * Parses the schema without considering the nullable property
 */
function parseSchemaWithoutNullable(schema: JSONSchema): ASTNode {
  // Handle const first (highest priority)
  if (schema.const !== undefined) {
    return {
      kind: "const",
      value: schema.const,
    };
  }

  // Handle enum
  if (schema.enum) {
    return {
      kind: "enum",
      values: schema.enum,
    };
  }

  // Handle combinators
  if (schema.allOf) {
    const types = schema.allOf.map(parseSchema);
    // Optimization: if only one type, return it directly
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
    // Optimization: if only one type, return it directly
    if (types.length === 1 && types[0]) {
      return types[0];
    }
    return {
      kind: "union",
      types,
    };
  }

  // Handle type
  if (schema.type) {
    return parseType(schema);
  }

  // If no type, return any
  return { kind: "any" };
}

function parseType(schema: JSONSchema): ASTNode {
  const { type } = schema;

  // If type is an array (union of types)
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

  // Primitive types
  switch (type) {
    case "string":
    case "number":
    case "boolean":
    case "null":
      return { kind: "primitive", type };

    case "integer":
      // integer converts to number in TypeScript
      return { kind: "primitive", type: "number" };

    case "object":
      return parseObject(schema);

    case "array":
      return parseArray(schema);

    default:
      throw new ParserError(`Unknown type: ${type}`);
  }
}

function parseObject(schema: JSONSchema): ASTNode {
  const properties: Record<string, { type: ASTNode; required: boolean }> = {};
  const requiredFields = new Set(schema.required || []);

  // Process properties
  if (schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      properties[key] = {
        type: parseSchema(propSchema),
        required: requiredFields.has(key),
      };
    }
  }

  // Process additionalProperties
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
    // Array without specified items -> any[]
    return {
      kind: "array",
      items: { kind: "any" },
    };
  }

  // If items is an array -> tuple
  if (Array.isArray(schema.items)) {
    const items = schema.items.map(parseSchema);
    return {
      kind: "tuple",
      items,
    };
  }

  // If items is an object -> homogeneous array
  return {
    kind: "array",
    items: parseSchema(schema.items),
  };
}
