# API Reference

Complete API documentation for all exported functions and types.

## Table of Contents

- [Transpiler API](#transpiler-api)
  - [convert()](#convert)
  - [jsonSchemaToTypeScript()](#jsonschematotypescript)
  - [parseSchema()](#parseschema)
  - [generateTypeScript()](#generatetypescript)
- [Agent API](#agent-api)
  - [createCodeExecutionTool()](#createcodeexecutiontool)
  - [executeWithTools()](#executewithtools)
  - [createToolSandbox()](#createtoolsandbox)
  - [executeInSandbox()](#executeinsandbox)
  - [generateToolTypes()](#generatetooltypes)
  - [generateToolSummary()](#generatetoolsummary)
- [Composio API](#composio-api)
  - [getComposioTools()](#getcomposiotools)
  - [listComposioToolkits()](#listcomposiotoolkits)
- [Types](#types)

---

## Transpiler API

### `convert()`

Simplified conversion from JSON Schema to TypeScript code.

```typescript
function convert(schema: unknown, typeName?: string): string
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `schema` | `unknown` | Yes | JSON Schema object |
| `typeName` | `string` | No | Name for the exported type |

**Returns:** `string` - TypeScript code

**Throws:** `ParserError` if schema is invalid

**Examples:**

```typescript
import { convert } from "./src/index.ts";

// Without type name - returns inline type
convert({ type: "string" });
// → "string"

// With type name - returns export declaration
convert({ type: "string" }, "MyString");
// → "export type MyString = string;"

// Complex schema
convert({
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "number" }
  },
  required: ["name"]
}, "User");
// → "export type User = {\n  name: string;\n  age?: number;\n};"
```

---

### `jsonSchemaToTypeScript()`

Full-featured conversion with options, can return AST or code.

```typescript
function jsonSchemaToTypeScript(
  schema: unknown,
  options?: ConversionOptions
): ConversionResult
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `schema` | `unknown` | Yes | JSON Schema object |
| `options` | `ConversionOptions` | No | Conversion options |

**ConversionOptions:**
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `typeName` | `string` | - | Name for exported type |
| `useTypeAlias` | `boolean` | `true` | Use `type` vs `interface` |
| `indent` | `number` | `0` | Initial indent level |
| `addComments` | `boolean` | `false` | Add explanatory comments |
| `returnAST` | `boolean` | `false` | Return AST instead of code |

**Returns:** `ConversionResult`

```typescript
interface ConversionResult {
  code?: string;   // TypeScript code (if returnAST is false)
  ast?: ASTNode;   // AST node (if returnAST is true)
}
```

**Examples:**

```typescript
import { jsonSchemaToTypeScript } from "./src/index.ts";

// Get TypeScript code
const result = jsonSchemaToTypeScript(
  { type: "object", properties: { id: { type: "number" } } },
  { typeName: "MyType" }
);
console.log(result.code);
// → "export type MyType = {\n  id?: number;\n};"

// Get AST
const astResult = jsonSchemaToTypeScript(
  { type: "string" },
  { returnAST: true }
);
console.log(astResult.ast);
// → { kind: "primitive", type: "string" }
```

---

### `parseSchema()`

Low-level parser converting JSON Schema to AST.

```typescript
function parseSchema(schema: JSONSchema): ASTNode
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `schema` | `JSONSchema` | Yes | Valid JSON Schema object |

**Returns:** `ASTNode` - AST representation

**Example:**

```typescript
import { parseSchema } from "./src/parser/index.ts";

const ast = parseSchema({
  type: "object",
  properties: {
    name: { type: "string" }
  },
  required: ["name"]
});

// Result:
// {
//   kind: "object",
//   properties: {
//     name: { type: { kind: "primitive", type: "string" }, required: true }
//   }
// }
```

---

### `generateTypeScript()`

Low-level generator converting AST to TypeScript.

```typescript
function generateTypeScript(
  node: ASTNode,
  options?: GeneratorOptions
): string
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `node` | `ASTNode` | Yes | AST node to convert |
| `options` | `GeneratorOptions` | No | Generator options |

**GeneratorOptions:**
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `typeName` | `string` | - | Name for exported type |
| `useTypeAlias` | `boolean` | `true` | Use `type` vs `interface` |
| `indent` | `number` | `0` | Initial indent level |
| `addComments` | `boolean` | `false` | Add comments |

**Returns:** `string` - TypeScript code

**Example:**

```typescript
import { generateTypeScript } from "./src/generator/index.ts";

const code = generateTypeScript(
  { kind: "primitive", type: "string" },
  { typeName: "MyString" }
);
// → "export type MyString = string;"

const unionCode = generateTypeScript({
  kind: "union",
  types: [
    { kind: "primitive", type: "string" },
    { kind: "primitive", type: "number" }
  ]
});
// → "string | number"
```

---

## Agent API

### `createCodeExecutionTool()`

Creates an AI SDK-compatible tool for executing LLM-generated code.

```typescript
function createCodeExecutionTool(
  tools: Tool[],
  options?: CodeExecutionOptions
): AISDKTool
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tools` | `Tool[]` | Yes | Tools to expose in sandbox |
| `options` | `CodeExecutionOptions` | No | Execution options |

**CodeExecutionOptions:**
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `maxExecutionTime` | `number` | `30000` | Timeout in milliseconds |
| `allowedGlobals` | `string[]` | - | Additional globals to expose |

**Returns:** AI SDK Tool object with:
- `description` - Tool description including type definitions
- `inputSchema` - Zod schema for `{ code: string, reasoning: string }`
- `execute` - Async function executing code in sandbox

**Example:**

```typescript
import { createCodeExecutionTool } from "./src/agent/index.ts";

const tools: Tool[] = [
  {
    name: "add",
    description: "Adds two numbers",
    parameters: {
      type: "object",
      properties: {
        a: { type: "number" },
        b: { type: "number" }
      },
      required: ["a", "b"]
    },
    execute: ({ a, b }) => a + b
  }
];

const executeCode = createCodeExecutionTool(tools, {
  maxExecutionTime: 10000
});

// Use with AI SDK
const result = await generateText({
  model: yourModel,
  tools: { executeCode },
  messages: [{ role: "user", content: "Add 5 and 3" }]
});
```

---

### `executeWithTools()`

Convenience function to execute code with tools in a single call.

```typescript
function executeWithTools(
  code: string,
  tools: Tool[],
  options?: CodeExecutionOptions
): Promise<SandboxResult>
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `code` | `string` | Yes | JavaScript code to execute |
| `tools` | `Tool[]` | Yes | Available tools |
| `options` | `CodeExecutionOptions` | No | Execution options |

**Returns:** `Promise<SandboxResult>`

```typescript
interface SandboxResult {
  toolCalls: ToolCall[];  // All tool calls made
  output: any;            // Return value
  error?: Error;          // Error if failed
}

interface ToolCall {
  name: string;
  arguments: any;
  result?: any;
  error?: any;
  timestamp: number;
}
```

**Example:**

```typescript
import { executeWithTools } from "./src/agent/index.ts";

const result = await executeWithTools(
  `
    const sum = await add({ a: 5, b: 3 });
    const product = await multiply({ x: sum, y: 2 });
    return product;
  `,
  [addTool, multiplyTool]
);

console.log(result.output);     // 16
console.log(result.toolCalls);  // Array of 2 calls
```

---

### `createToolSandbox()`

Creates a reusable sandbox context with tool proxies.

```typescript
function createToolSandbox(tools: Tool[]): {
  context: vm.Context;
  toolCalls: ToolCall[];
  pendingPromises: Promise<any>[];
}
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tools` | `Tool[]` | Yes | Tools to expose |

**Returns:** Sandbox object with:
- `context` - VM context for execution
- `toolCalls` - Mutable array tracking calls
- `pendingPromises` - Array of pending async operations

**Example:**

```typescript
import { createToolSandbox, executeInSandbox } from "./src/agent/index.ts";

const sandbox = createToolSandbox(tools);

// Execute multiple times, sharing state
await executeInSandbox("const x = 1;", sandbox);
await executeInSandbox("return x + 1;", sandbox);

console.log(sandbox.toolCalls); // All calls from both executions
```

---

### `executeInSandbox()`

Executes code in an existing sandbox.

```typescript
function executeInSandbox(
  code: string,
  sandbox: ReturnType<typeof createToolSandbox>,
  options?: CodeExecutionOptions
): Promise<SandboxResult>
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `code` | `string` | Yes | JavaScript code |
| `sandbox` | Sandbox | Yes | Created by `createToolSandbox` |
| `options` | `CodeExecutionOptions` | No | Execution options |

**Returns:** `Promise<SandboxResult>`

---

### `generateToolTypes()`

Generates TypeScript function signatures from tools for LLM prompts.

```typescript
function generateToolTypes(tools: Tool[]): string
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tools` | `Tool[]` | Yes | Tools to generate types for |

**Returns:** `string` - TypeScript declarations

**Example:**

```typescript
import { generateToolTypes } from "./src/agent/index.ts";

const types = generateToolTypes([{
  name: "fetchData",
  description: "Fetches data from API",
  parameters: {
    type: "object",
    properties: {
      url: { type: "string", description: "API endpoint" }
    },
    required: ["url"]
  },
  execute: () => {}
}]);

// Output:
// /**
//  * Fetches data from API
//  * @param args.url - API endpoint
//  */
// declare function fetchData(args: {
//   url: string;
// }): Promise<any>;
```

---

### `generateToolSummary()`

Generates a brief summary of available tools.

```typescript
function generateToolSummary(tools: Tool[]): string
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tools` | `Tool[]` | Yes | Tools to summarize |

**Returns:** `string` - Bullet-point list

**Example:**

```typescript
import { generateToolSummary } from "./src/agent/index.ts";

const summary = generateToolSummary(tools);
// - add: Adds two numbers
// - multiply: Multiplies two numbers
// - greet: Returns a greeting
```

---

## Composio API

### `getComposioTools()`

Fetches tools from Composio and adapts them to the internal format.

```typescript
function getComposioTools(
  options: ComposioToolsOptions
): Promise<Tool[]>
```

**Parameters:**

**ComposioToolsOptions:**
| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `toolkits` | `string[]` | Yes | Toolkit names (e.g., `["GOOGLESHEETS"]`) |
| `userId` | `string` | Yes | Composio user ID |
| `actions` | `string[]` | No | Filter to specific actions |

**Returns:** `Promise<Tool[]>` - Tools compatible with agent

**Environment:** Requires `COMPOSIO_API_KEY`

**Example:**

```typescript
import { getComposioTools } from "./src/composio/adapter.ts";

const tools = await getComposioTools({
  toolkits: ["GOOGLESHEETS", "GITHUB"],
  userId: "your-user-id"
});

const executeCode = createCodeExecutionTool(tools);
```

---

### `listComposioToolkits()`

Lists available toolkits for a user.

```typescript
function listComposioToolkits(userId: string): Promise<string[]>
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `userId` | `string` | Yes | Composio user ID |

**Returns:** `Promise<string[]>` - Available toolkit names

---

## Types

### JSONSchema

```typescript
interface JSONSchema {
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
  [key: string]: unknown;
}
```

### ASTNode

```typescript
type ASTNode =
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

interface PrimitiveNode {
  kind: "primitive";
  type: "string" | "number" | "boolean" | "null";
}

interface ObjectNode {
  kind: "object";
  properties: Record<string, PropertyDefinition>;
  additionalProperties?: ASTNode | boolean;
}

interface PropertyDefinition {
  type: ASTNode;
  required: boolean;
}

interface ArrayNode {
  kind: "array";
  items: ASTNode;
}

interface TupleNode {
  kind: "tuple";
  items: ASTNode[];
}

interface UnionNode {
  kind: "union";
  types: ASTNode[];
}

interface IntersectionNode {
  kind: "intersection";
  types: ASTNode[];
}

interface EnumNode {
  kind: "enum";
  values: (string | number | boolean)[];
}

interface ConstNode {
  kind: "const";
  value: string | number | boolean | null;
}

interface LiteralNode {
  kind: "literal";
  value: string | number | boolean | null;
}

interface AnyNode {
  kind: "any";
}

interface NeverNode {
  kind: "never";
}
```

### Tool

```typescript
type Tool = {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (args: any) => Promise<any> | any;
};
```

### ToolCall

```typescript
type ToolCall = {
  name: string;
  arguments: any;
  result?: any;
  error?: any;
  timestamp: number;
};
```

### SandboxResult

```typescript
type SandboxResult = {
  toolCalls: ToolCall[];
  output: any;
  error?: Error;
};
```

### CodeExecutionOptions

```typescript
type CodeExecutionOptions = {
  maxExecutionTime?: number;
  allowedGlobals?: string[];
};
```

### ParserError

```typescript
class ParserError extends Error {
  name: "ParserError";
}
```

Custom error thrown when parsing invalid JSON Schema input.

