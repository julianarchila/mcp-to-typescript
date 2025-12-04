/**
 * AST (Abstract Syntax Tree) para representar tipos de manera independiente
 * del JSON Schema original.
 * 
 * Este AST es exhaustivo mediante discriminantes `kind`.
 */

export type ASTNode =
  | PrimitiveNode
  | ObjectNode
  | ArrayNode
  | TupleNode
  | UnionNode
  | IntersectionNode
  | EnumNode
  | ConstNode
  | LiteralNode
  | AnyNode
  | NeverNode;

/**
 * Tipos primitivos básicos
 */
export interface PrimitiveNode {
  kind: "primitive";
  type: "string" | "number" | "boolean" | "null";
}

/**
 * Objetos con propiedades
 */
export interface ObjectNode {
  kind: "object";
  properties: Record<string, PropertyDefinition>;
  additionalProperties?: ASTNode | boolean;
}

export interface PropertyDefinition {
  type: ASTNode;
  required: boolean;
}

/**
 * Arrays homogéneos
 */
export interface ArrayNode {
  kind: "array";
  items: ASTNode;
}

/**
 * Tuplas (arrays con tipos específicos por posición)
 */
export interface TupleNode {
  kind: "tuple";
  items: ASTNode[];
}

/**
 * Uniones de tipos (A | B | C)
 * Para oneOf, anyOf, enum con valores de tipos mixtos, etc.
 */
export interface UnionNode {
  kind: "union";
  types: ASTNode[];
}

/**
 * Intersecciones de tipos (A & B & C)
 * Para allOf
 */
export interface IntersectionNode {
  kind: "intersection";
  types: ASTNode[];
}

/**
 * Enum con valores literales del mismo tipo
 */
export interface EnumNode {
  kind: "enum";
  values: (string | number | boolean)[];
}

/**
 * Constante con un valor específico
 */
export interface ConstNode {
  kind: "const";
  value: string | number | boolean | null;
}

/**
 * Literal de tipo específico (usado internamente)
 */
export interface LiteralNode {
  kind: "literal";
  value: string | number | boolean | null;
}

/**
 * Tipo any (cuando no se puede determinar)
 */
export interface AnyNode {
  kind: "any";
}

/**
 * Tipo never (para casos imposibles o additionalProperties: false)
 */
export interface NeverNode {
  kind: "never";
}
