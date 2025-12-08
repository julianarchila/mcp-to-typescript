# JSON Schema to TypeScript Transpiler

This document covers the JSON Schema transpilation capabilities in detail.

## Supported JSON Schema Features

### Primitive Types

| JSON Schema | TypeScript |
|-------------|------------|
| `{ type: "string" }` | `string` |
| `{ type: "number" }` | `number` |
| `{ type: "integer" }` | `number` |
| `{ type: "boolean" }` | `boolean` |
| `{ type: "null" }` | `null` |

```typescript
convert({ type: "string" }, "MyString");
// → export type MyString = string;
```

### Union Types

Multiple types can be specified as an array:

```typescript
convert({ type: ["string", "number"] }, "StringOrNumber");
// → export type StringOrNumber = string | number;

convert({ type: ["string", "null"] }, "NullableString");
// → export type NullableString = string | null;
```

### Objects

#### Basic Object

```typescript
convert({
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "number" }
  },
  required: ["name"]
}, "User");

// → export type User = {
//     name: string;
//     age?: number;
//   };
```

#### Additional Properties

```typescript
// Allow any additional properties
convert({
  type: "object",
  properties: { id: { type: "string" } },
  additionalProperties: true
});
// → { id?: string; [key: string]: any; }

// Typed additional properties
convert({
  type: "object",
  additionalProperties: { type: "number" }
});
// → { [key: string]: number; }

// No additional properties (strict)
convert({
  type: "object",
  properties: { id: { type: "string" } },
  additionalProperties: false
});
// → { id?: string; }
```

#### Key Escaping

Invalid JavaScript identifiers are automatically quoted:

```typescript
convert({
  type: "object",
  properties: {
    "my-key": { type: "string" },
    "123": { type: "number" }
  }
});
// → { "my-key"?: string; "123"?: number; }
```

### Arrays

#### Homogeneous Arrays

```typescript
convert({
  type: "array",
  items: { type: "string" }
});
// → string[]

convert({
  type: "array",
  items: {
    type: "object",
    properties: { id: { type: "number" } }
  }
});
// → { id?: number; }[]
```

#### Tuples

When `items` is an array, it produces a tuple:

```typescript
convert({
  type: "array",
  items: [
    { type: "string" },
    { type: "number" },
    { type: "boolean" }
  ]
});
// → [string, number, boolean]
```

### Enums and Constants

#### Enum

```typescript
convert({ enum: ["red", "green", "blue"] });
// → "red" | "green" | "blue"

convert({ enum: [1, 2, 3] });
// → 1 | 2 | 3

convert({ enum: ["hello", 42, true] });
// → "hello" | 42 | true
```

#### Const

```typescript
convert({ const: "hello" });
// → "hello"

convert({ const: 42 });
// → 42

convert({ const: null });
// → null
```

### Combinators

#### `oneOf` / `anyOf` (Union)

Both produce union types:

```typescript
convert({
  oneOf: [
    { type: "string" },
    { type: "number" }
  ]
});
// → string | number

convert({
  anyOf: [
    { type: "object", properties: { type: { const: "a" } } },
    { type: "object", properties: { type: { const: "b" } } }
  ]
});
// → { type?: "a"; } | { type?: "b"; }
```

#### `allOf` (Intersection)

```typescript
convert({
  allOf: [
    { type: "object", properties: { name: { type: "string" } } },
    { type: "object", properties: { age: { type: "number" } } }
  ]
});
// → { name?: string; } & { age?: number; }
```

### Nullable Types

The `nullable: true` keyword wraps the type in a union with `null`:

```typescript
convert({ type: "string", nullable: true });
// → string | null

convert({
  type: "object",
  properties: {
    name: { type: "string", nullable: true }
  },
  required: ["name"]
});
// → { name: string | null; }

convert({
  type: "array",
  items: { type: "string", nullable: true }
});
// → (string | null)[]
```

### Edge Cases

#### Empty or Missing Type

```typescript
convert({});
// → any

convert({ type: "object" });
// → {}
```

#### Unknown Type

```typescript
convert({ type: "unknown-type" });
// → Throws ParserError: "Tipo desconocido: unknown-type"
```

#### Empty Array Type

```typescript
convert({ type: [] });
// → never
```

## API Usage

### `convert(schema, typeName?)`

Quick conversion returning TypeScript code string.

```typescript
import { convert } from "./src/index.ts";

// Without name - returns inline type
convert({ type: "string" });
// → "string"

// With name - returns exported type declaration
convert({ type: "string" }, "MyString");
// → "export type MyString = string;"
```

### `jsonSchemaToTypeScript(schema, options)`

Full-featured conversion with options.

```typescript
import { jsonSchemaToTypeScript } from "./src/index.ts";

// Return TypeScript code
const result = jsonSchemaToTypeScript(schema, {
  typeName: "User",
  useTypeAlias: true  // Use 'type' instead of 'interface'
});
console.log(result.code);

// Return AST instead
const astResult = jsonSchemaToTypeScript(schema, {
  returnAST: true
});
console.log(astResult.ast);
```

### `parseSchema(schema)`

Low-level parser - converts JSON Schema to AST.

```typescript
import { parseSchema } from "./src/parser/index.ts";

const ast = parseSchema({ type: "string" });
// → { kind: "primitive", type: "string" }
```

### `generateTypeScript(ast, options)`

Low-level generator - converts AST to TypeScript.

```typescript
import { generateTypeScript } from "./src/generator/index.ts";

const code = generateTypeScript(
  { kind: "primitive", type: "string" },
  { typeName: "MyType" }
);
// → "export type MyType = string;"
```

## Generator Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `typeName` | `string` | - | Name for exported type declaration |
| `useTypeAlias` | `boolean` | `true` | Use `type` instead of `interface` |
| `indent` | `number` | `0` | Initial indentation level |
| `addComments` | `boolean` | `false` | Add explanatory comments |

## Error Handling

The parser throws `ParserError` for invalid schemas:

```typescript
import { convert, ParserError } from "./src/index.ts";

try {
  convert(null);
} catch (e) {
  if (e instanceof ParserError) {
    console.error("Invalid schema:", e.message);
  }
}
```

**Error cases:**
- `null` or `undefined` schema
- Schema is not an object (string, number, array)
- Unknown type value

## Not Supported

The following JSON Schema features are **not** currently supported:

- `$ref` (references)
- `$id` / `$schema`
- `definitions` / `$defs`
- `if` / `then` / `else`
- `patternProperties`
- `minLength`, `maxLength`, `pattern` (string constraints)
- `minimum`, `maximum`, `multipleOf` (number constraints)
- `uniqueItems`, `contains` (array constraints)
- `format` keywords

These are planned for future versions.

