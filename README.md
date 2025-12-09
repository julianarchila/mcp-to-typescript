# MCP to TypeScript

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-f9f1e1.svg)](https://bun.sh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A library for converting JSON Schemas to TypeScript types and executing LLM-generated code with tool access in a sandboxed environment.

## Features

- **JSON Schema → TypeScript Transpiler**: Converts JSON Schemas to clean, readable TypeScript type definitions with an intermediate AST
- **Code Execution Sandbox**: Enables AI agents to execute code with access to tools in a secure sandbox
- **Composio Integration**: Seamlessly connect to external services via Composio toolkits

## Installation

```bash
bun install
```

**Requirements:**
- [Bun](https://bun.sh/) 1.0+
- TypeScript 5+

## Quick Start

### Schema Transpiler

Convert JSON Schemas to TypeScript types:

```typescript
import { convert } from "mcp-to-typescript";

const userSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    name: { type: "string" },
    email: { type: "string" },
    age: { type: "number" },
  },
  required: ["id", "name", "email"],
};

console.log(convert(userSchema, "User"));
// Output:
// export type User = {
//   id: number;
//   name: string;
//   email: string;
//   age?: number;
// };
```

### Code Execution Agent

Create an AI agent that can execute code with access to custom tools:

```typescript
import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createCodeExecutionTool, type Tool } from "mcp-to-typescript";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Define custom tools
const tools: Tool[] = [
  {
    name: "calculate",
    description: "Performs mathematical calculations",
    parameters: {
      type: "object",
      properties: {
        expression: { type: "string", description: "Math expression to evaluate" },
      },
      required: ["expression"],
    },
    execute: (args: { expression: string }) => {
      const result = new Function(`return ${args.expression}`)();
      return { result };
    },
  },
  {
    name: "getCurrentTime",
    description: "Gets the current date and time",
    parameters: {
      type: "object",
      properties: {
        format: { type: "string", enum: ["iso", "unix", "human"] },
      },
    },
    execute: (args: { format?: string }) => {
      const now = new Date();
      if (args.format === "unix") return { timestamp: Math.floor(now.getTime() / 1000) };
      if (args.format === "human") return { time: now.toLocaleString() };
      return { time: now.toISOString() };
    },
  },
];

const executeCode = createCodeExecutionTool(tools);

const result = await generateText({
  model: openrouter.chat("anthropic/claude-sonnet-4"),
  messages: [{ role: "user", content: "What is 42 * 1337? Also, what time is it?" }],
  tools: { executeCode },
  maxSteps: 5,
});

console.log(result.text);
```

## API Reference

### Schema Module

#### `convert(schema, typeName?): string`

Simplified function that converts a JSON Schema to TypeScript code.

```typescript
import { convert } from "mcp-to-typescript";

const code = convert({ type: "string" }, "MyString");
// => "export type MyString = string;"
```

#### `jsonSchemaToTypeScript(schema, options?): ConversionResult`

Full conversion function with options.

```typescript
import { jsonSchemaToTypeScript } from "mcp-to-typescript";

// Get TypeScript code
const { code } = jsonSchemaToTypeScript(schema, { typeName: "User" });

// Get the intermediate AST
const { ast } = jsonSchemaToTypeScript(schema, { returnAST: true });
```

**Options:**
- `typeName?: string` - Name for the generated type
- `returnAST?: boolean` - Return AST instead of code

#### `parseSchema(schema): ASTNode`

Parses a JSON Schema into the intermediate AST.

#### `generateTypeScript(ast, options?): string`

Generates TypeScript code from an AST node.

### Agent Module

#### `createCodeExecutionTool(tools, options?)`

Creates an AI SDK tool that executes code with access to the provided tools.

```typescript
import { createCodeExecutionTool } from "mcp-to-typescript";

const executeCode = createCodeExecutionTool(tools, {
  timeout: 30000, // 30 seconds
});
```

#### `Tool` Interface

```typescript
interface Tool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, JSONSchema>;
    required?: string[];
  };
  execute: (args: any) => any | Promise<any>;
}
```

#### `generateToolTypes(tools): string`

Generates TypeScript function signatures from tools (used internally for LLM prompts).

#### `generateToolSummary(tools): string`

Generates a brief summary of available tools.

### Adapters

#### `getComposioTools(options): Promise<Tool[]>`

Fetches tools from Composio.

```typescript
import { getComposioTools } from "mcp-to-typescript";

const tools = await getComposioTools({
  toolkits: ["GOOGLESHEETS", "SLACK"],
  userId: "your-composio-user-id",
});
```

#### `listComposioToolkits(): Promise<string[]>`

Lists available Composio toolkits.

## Supported JSON Schema Keywords

| Category | Keywords | TypeScript Output |
|----------|----------|-------------------|
| **Primitives** | `string`, `number`, `integer`, `boolean`, `null` | `string`, `number`, `number`, `boolean`, `null` |
| **Objects** | `type: "object"`, `properties`, `required` | `{ prop: T; optionalProp?: T; }` |
| **Additional Properties** | `additionalProperties` | `{ [key: string]: T }` or `never` |
| **Arrays** | `type: "array"`, `items` (object) | `T[]` |
| **Tuples** | `items` (array) | `[T1, T2, T3]` |
| **Enums** | `enum`, `const` | `"a" \| "b" \| "c"`, literal type |
| **Unions** | `oneOf`, `anyOf`, `type: [...]` | `T1 \| T2 \| T3` |
| **Intersections** | `allOf` | `T1 & T2 & T3` |
| **Nullable** | `type: ["string", "null"]` | `string \| null` |

## Examples

See the `example/` directory for complete working examples:

- **[`transpiler.ts`](example/transpiler.ts)** - JSON Schema to TypeScript conversion examples
- **[`agent-custom.ts`](example/agent-custom.ts)** - Code execution with custom tools
- **[`agent-composio.ts`](example/agent-composio.ts)** - Code execution with Composio integration

Run examples with:

```bash
bun run example/transpiler.ts
bun run example/agent-custom.ts
bun run example/agent-composio.ts
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Run tests in watch mode
bun test --watch

# Type check
bun run typecheck
```

## References

- [Code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp) - Anthropic Engineering
- [Advanced tool use](https://www.anthropic.com/engineering/advanced-tool-use) - Anthropic Engineering
- [Code Mode](https://blog.cloudflare.com/code-mode/) - Cloudflare Blog

## Authors

- Julián Archila
- Santiago Botero

## License

MIT
