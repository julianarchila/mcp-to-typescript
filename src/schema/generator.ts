/**
 * Generator: Converts AST to TypeScript code
 */

import type { ASTNode } from "./ast.ts";

export interface GeneratorOptions {
  /** Type name (for named exports) */
  typeName?: string;
  /** Use 'type' instead of 'interface' for objects */
  useTypeAlias?: boolean;
  /** Initial indentation level */
  indent?: number;
  /** Add explanatory comments */
  addComments?: boolean;
}

const INDENT = "  "; // 2 spaces

/**
 * Generates TypeScript code from an AST node
 */
export function generateTypeScript(
  node: ASTNode,
  options: GeneratorOptions = {}
): string {
  const { typeName, useTypeAlias = true, indent = 0, addComments = false } = options;

  const typeDefinition = generateNode(node, indent);

  // If a name is provided, create a complete declaration
  if (typeName) {
    const keyword = useTypeAlias || node.kind !== "object" ? "type" : "interface";
    const assignment = useTypeAlias || node.kind !== "object" ? " = " : " ";
    return `export ${keyword} ${typeName}${assignment}${typeDefinition};`;
  }

  return typeDefinition;
}

function generateNode(node: ASTNode, indent: number): string {
  switch (node.kind) {
    case "primitive":
      return node.type;

    case "any":
      return "any";

    case "never":
      return "never";

    case "const":
      return JSON.stringify(node.value);

    case "literal":
      return JSON.stringify(node.value);

    case "enum":
      return node.values.map((v) => JSON.stringify(v)).join(" | ");

    case "union":
      return generateUnion(node.types, indent);

    case "intersection":
      return generateIntersection(node.types, indent);

    case "array":
      return generateArray(node.items, indent);

    case "tuple":
      return generateTuple(node.items, indent);

    case "object":
      return generateObject(node, indent);
  }
}

function generateUnion(types: ASTNode[], indent: number): string {
  if (types.length === 0) {
    return "never";
  }
  if (types.length === 1 && types[0]) {
    return generateNode(types[0], indent);
  }

  // If all types are primitives or literals, join them on one line
  const allSimple = types.every(
    (t) =>
      t.kind === "primitive" ||
      t.kind === "literal" ||
      t.kind === "const" ||
      t.kind === "any" ||
      t.kind === "never"
  );

  if (allSimple) {
    return types.map((t) => generateNode(t, indent)).join(" | ");
  }

  // For complex types, use line breaks
  const parts = types.map((t) => {
    const generated = generateNode(t, indent);
    // If the type has multiple lines, wrap in parentheses
    if (generated.includes("\n") && t.kind === "object") {
      return `(${generated})`;
    }
    return generated;
  });

  return parts.join(" | ");
}

function generateIntersection(types: ASTNode[], indent: number): string {
  if (types.length === 0) {
    return "never";
  }
  if (types.length === 1 && types[0]) {
    return generateNode(types[0], indent);
  }

  const parts = types.map((t) => {
    const generated = generateNode(t, indent);
    // Wrap in parentheses if necessary
    if (t.kind === "union" || (generated.includes("\n") && t.kind === "object")) {
      return `(${generated})`;
    }
    return generated;
  });

  return parts.join(" & ");
}

function generateArray(items: ASTNode, indent: number): string {
  const itemType = generateNode(items, indent);

  // If the type is simple, use T[] syntax
  if (
    items.kind === "primitive" ||
    items.kind === "any" ||
    items.kind === "never" ||
    items.kind === "literal" ||
    items.kind === "const"
  ) {
    return `${itemType}[]`;
  }

  // For complex types, wrap in parentheses
  if (items.kind === "union" || items.kind === "intersection" || items.kind === "enum") {
    return `(${itemType})[]`;
  }

  // For objects and nested arrays, use T[]
  return `${itemType}[]`;
}

function generateTuple(items: ASTNode[], indent: number): string {
  if (items.length === 0) {
    return "[]";
  }

  const elements = items.map((item) => generateNode(item, indent));
  return `[${elements.join(", ")}]`;
}

function generateObject(
  node: { properties: Record<string, { type: ASTNode; required: boolean }>; additionalProperties?: ASTNode | boolean },
  indent: number
): string {
  const entries = Object.entries(node.properties);

  // Empty object without additionalProperties
  if (entries.length === 0 && !node.additionalProperties) {
    return "{}";
  }

  const lines: string[] = [];
  const currentIndent = INDENT.repeat(indent);
  const nextIndent = INDENT.repeat(indent + 1);

  lines.push("{");

  // Generate properties
  for (const [key, prop] of entries) {
    const optional = prop.required ? "" : "?";
    const propType = generateNode(prop.type, indent + 1);
    
    // Escape keys that aren't valid identifiers
    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
    
    lines.push(`${nextIndent}${safeKey}${optional}: ${propType};`);
  }

  // Generate additionalProperties
  if (node.additionalProperties !== undefined) {
    if (node.additionalProperties === false) {
      // Do nothing, additional properties not allowed
    } else if (node.additionalProperties === true) {
      lines.push(`${nextIndent}[key: string]: any;`);
    } else {
      const addType = generateNode(node.additionalProperties, indent + 1);
      lines.push(`${nextIndent}[key: string]: ${addType};`);
    }
  }

  lines.push(`${currentIndent}}`);

  return lines.join("\n");
}
