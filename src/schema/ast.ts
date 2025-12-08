/**
 * AST (Abstract Syntax Tree) for representing types independently
 * from the original JSON Schema.
 * 
 * This AST is exhaustive using discriminated unions with `kind`.
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
 * Basic primitive types
 */
export interface PrimitiveNode {
  kind: "primitive";
  type: "string" | "number" | "boolean" | "null";
}

/**
 * Objects with properties
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
 * Homogeneous arrays
 */
export interface ArrayNode {
  kind: "array";
  items: ASTNode;
}

/**
 * Tuples (arrays with specific types by position)
 */
export interface TupleNode {
  kind: "tuple";
  items: ASTNode[];
}

/**
 * Type unions (A | B | C)
 * For oneOf, anyOf, enum with mixed type values, etc.
 */
export interface UnionNode {
  kind: "union";
  types: ASTNode[];
}

/**
 * Type intersections (A & B & C)
 * For allOf
 */
export interface IntersectionNode {
  kind: "intersection";
  types: ASTNode[];
}

/**
 * Enum with literal values of the same type
 */
export interface EnumNode {
  kind: "enum";
  values: (string | number | boolean)[];
}

/**
 * Constant with a specific value
 */
export interface ConstNode {
  kind: "const";
  value: string | number | boolean | null;
}

/**
 * Literal of a specific type (used internally)
 */
export interface LiteralNode {
  kind: "literal";
  value: string | number | boolean | null;
}

/**
 * Any type (when type cannot be determined)
 */
export interface AnyNode {
  kind: "any";
}

/**
 * Never type (for impossible cases or additionalProperties: false)
 */
export interface NeverNode {
  kind: "never";
}
