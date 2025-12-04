/**
 * Generador: Convierte AST a código TypeScript
 */

import type { ASTNode } from "../ast/types.ts";

export interface GeneratorOptions {
  /** Nombre del tipo (para exportaciones nombradas) */
  typeName?: string;
  /** Usar 'type' en lugar de 'interface' para objetos */
  useTypeAlias?: boolean;
  /** Nivel de indentación inicial */
  indent?: number;
  /** Agregar comentarios explicativos */
  addComments?: boolean;
}

const INDENT = "  "; // 2 espacios

/**
 * Genera código TypeScript a partir de un nodo AST
 */
export function generateTypeScript(
  node: ASTNode,
  options: GeneratorOptions = {}
): string {
  const { typeName, useTypeAlias = true, indent = 0, addComments = false } = options;

  const typeDefinition = generateNode(node, indent);

  // Si se proporciona un nombre, crear una declaración completa
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

  // Si todos los tipos son primitivos o literales, unirlos en una línea
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

  // Para tipos complejos, usar saltos de línea
  const parts = types.map((t) => {
    const generated = generateNode(t, indent);
    // Si el tipo tiene múltiples líneas, envolverlo en paréntesis
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
    // Envolver en paréntesis si es necesario
    if (t.kind === "union" || (generated.includes("\n") && t.kind === "object")) {
      return `(${generated})`;
    }
    return generated;
  });

  return parts.join(" & ");
}

function generateArray(items: ASTNode, indent: number): string {
  const itemType = generateNode(items, indent);

  // Si el tipo es simple, usar la sintaxis T[]
  if (
    items.kind === "primitive" ||
    items.kind === "any" ||
    items.kind === "never" ||
    items.kind === "literal" ||
    items.kind === "const"
  ) {
    return `${itemType}[]`;
  }

  // Para tipos complejos, usar Array<T>
  if (items.kind === "union" || items.kind === "intersection") {
    return `Array<${itemType}>`;
  }

  // Para objetos y arrays anidados, usar T[]
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

  // Objeto vacío sin additionalProperties
  if (entries.length === 0 && !node.additionalProperties) {
    return "{}";
  }

  const lines: string[] = [];
  const currentIndent = INDENT.repeat(indent);
  const nextIndent = INDENT.repeat(indent + 1);

  lines.push("{");

  // Generar propiedades
  for (const [key, prop] of entries) {
    const optional = prop.required ? "" : "?";
    const propType = generateNode(prop.type, indent + 1);
    
    // Escapar keys que no son identificadores válidos
    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
    
    lines.push(`${nextIndent}${safeKey}${optional}: ${propType};`);
  }

  // Generar additionalProperties
  if (node.additionalProperties !== undefined) {
    if (node.additionalProperties === false) {
      // No hacer nada, no se permiten propiedades adicionales
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
