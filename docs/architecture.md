# Architecture

This document describes the architecture and design of the JSON Schema to TypeScript transpiler.

## Overview

The system follows a classic compiler pipeline architecture:

```
┌──────────────┐     ┌────────┐     ┌─────┐     ┌───────────┐     ┌────────┐
│ JSON Schema  │ ──▶ │ Parser │ ──▶ │ AST │ ──▶ │ Generator │ ──▶ │   TS   │
└──────────────┘     └────────┘     └─────┘     └───────────┘     └────────┘
```

This architecture provides:
- **Separation of concerns**: Each stage has a single responsibility
- **Extensibility**: New output formats can be added without modifying the parser
- **Testability**: Each component can be tested in isolation

## Module Structure

### Core Transpiler Modules

#### `/src/parser/`

Converts JSON Schema objects into the internal AST representation.

```typescript
// Input: JSON Schema
{
  type: "object",
  properties: {
    name: { type: "string" }
  },
  required: ["name"]
}

// Output: AST Node
{
  kind: "object",
  properties: {
    name: { type: { kind: "primitive", type: "string" }, required: true }
  }
}
```

**Key responsibilities:**
- Validate schema structure
- Map JSON Schema keywords to AST nodes
- Handle combinators (`oneOf`, `anyOf`, `allOf`)
- Process nullable types

#### `/src/ast/`

Defines the Abstract Syntax Tree types. The AST is designed to be:
- **Exhaustive**: Uses discriminated unions with `kind` field
- **Independent**: No reference to JSON Schema specifics
- **Extensible**: Easy to add new node types

**Node Types:**
| Node | Description |
|------|-------------|
| `PrimitiveNode` | `string`, `number`, `boolean`, `null` |
| `ObjectNode` | Objects with properties |
| `ArrayNode` | Homogeneous arrays (`T[]`) |
| `TupleNode` | Fixed-length typed arrays (`[T1, T2]`) |
| `UnionNode` | Union types (`A \| B`) |
| `IntersectionNode` | Intersection types (`A & B`) |
| `EnumNode` | Enum values |
| `ConstNode` | Literal constant values |
| `AnyNode` | `any` type |
| `NeverNode` | `never` type |

#### `/src/generator/`

Converts AST nodes into TypeScript code strings.

**Features:**
- Proper indentation and formatting
- Optional/required property markers (`?`)
- Index signatures for `additionalProperties`
- Key escaping for invalid identifiers

### Agent Modules

#### `/src/agent/`

Provides an AI SDK-compatible tool for executing LLM-generated code.

```
┌─────────────────────────────────────────────────────────────────┐
│                        LLM Agent Flow                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────┐      ┌──────────────┐      ┌─────────┐               │
│   │ LLM │ ──▶  │ executeCode  │ ──▶  │ Sandbox │               │
│   └─────┘      │    Tool      │      │   VM    │               │
│      ▲         └──────────────┘      └────┬────┘               │
│      │                                    │                     │
│      │         ┌──────────────┐           │                     │
│      └──────── │   Results    │ ◀─────────┘                     │
│                └──────────────┘                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Components:**
- `createCodeExecutionTool()`: Creates an AI SDK tool
- `generateToolTypes()`: Generates TypeScript signatures for LLM context

#### `/src/sandbox/`

Secure VM-based code execution environment using Node.js `vm` module.

**Security features:**
- No access to `require`, `process`, or Node.js APIs
- Limited `setTimeout` (max 5s)
- Execution timeout protection
- Only safe globals exposed (`Math`, `JSON`, `Date`, etc.)

**Tool interception:**
- All tool calls are wrapped in proxies
- Every call is recorded with arguments, result, and timestamp
- Supports both sync and async tools

#### `/src/composio/`

Adapter for Composio's tool integration platform.

**Capabilities:**
- Fetch tools from Composio toolkits (Google Sheets, GitHub, etc.)
- Adapt Composio tool format to internal `Tool` type
- Execute tools through Composio's API

## Data Flow Examples

### Example 1: Schema to TypeScript

```typescript
// 1. Input JSON Schema
const schema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    name: { type: "string" },
    tags: { type: "array", items: { type: "string" } }
  },
  required: ["id", "name"]
};

// 2. Parser creates AST
const ast = {
  kind: "object",
  properties: {
    id: { type: { kind: "primitive", type: "number" }, required: true },
    name: { type: { kind: "primitive", type: "string" }, required: true },
    tags: { 
      type: { kind: "array", items: { kind: "primitive", type: "string" } }, 
      required: false 
    }
  }
};

// 3. Generator produces TypeScript
export type MyType = {
  id: number;
  name: string;
  tags?: string[];
};
```

### Example 2: LLM Code Execution

```typescript
// 1. Define tools
const tools = [
  { name: "add", execute: ({a, b}) => a + b, ... },
  { name: "multiply", execute: ({x, y}) => x * y, ... }
];

// 2. LLM generates code
const llmCode = `
  const sum = await add({ a: 2, b: 3 });
  const result = await multiply({ x: sum, y: 4 });
  return result;
`;

// 3. Sandbox executes and tracks
{
  output: 20,
  toolCalls: [
    { name: "add", arguments: { a: 2, b: 3 }, result: 5 },
    { name: "multiply", arguments: { x: 5, y: 4 }, result: 20 }
  ]
}
```

## Extension Points

### Adding a New Output Format (e.g., Zod)

1. Create `/src/generators/zod-generator.ts`
2. Implement `generateZod(node: ASTNode): string`
3. Export from `/src/index.ts`

The parser and AST remain unchanged.

### Adding New JSON Schema Keywords

1. Update `JSONSchema` interface in `/src/parser/index.ts`
2. Add AST node type in `/src/ast/types.ts`
3. Handle in parser switch statement
4. Handle in generator switch statement

### Adding New Tool Capabilities

1. Create new tool definition following the `Tool` interface
2. Pass to `createCodeExecutionTool()`
3. The sandbox automatically exposes it to LLM-generated code

