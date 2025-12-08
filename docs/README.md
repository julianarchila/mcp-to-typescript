# JSON Schema to TypeScript Transpiler

A modular TypeScript library that converts JSON Schemas into TypeScript type definitions, with an additional agent module for LLM-powered code execution.

## Features

- **JSON Schema → TypeScript**: Convert JSON Schemas to clean, readable TypeScript types
- **Custom AST**: Internal abstract syntax tree for extensibility
- **LLM Agent Tools**: Execute LLM-generated code in a sandboxed environment
- **Composio Integration**: Connect to external APIs via Composio

## Quick Start

### Installation

```bash
bun install
```

### Basic Usage: JSON Schema to TypeScript

```typescript
import { convert, jsonSchemaToTypeScript } from "json-schema-to-typescript-transpiler";

// Simple conversion
const schema = {
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "number" },
    email: { type: "string" }
  },
  required: ["name", "email"]
};

const typeScript = convert(schema, "User");
console.log(typeScript);
// Output:
// export type User = {
//   name: string;
//   age?: number;
//   email: string;
// };
```

### Advanced Usage: Get the AST

```typescript
const result = jsonSchemaToTypeScript(schema, { returnAST: true });
console.log(result.ast);
// { kind: "object", properties: { ... } }
```

### Agent Module: LLM Code Execution

```typescript
import { createCodeExecutionTool, type Tool } from "./src/agent/index.ts";
import { generateText } from "ai";

// Define tools the LLM can use
const tools: Tool[] = [
  {
    name: "calculate",
    description: "Performs math calculations",
    parameters: {
      type: "object",
      properties: {
        expression: { type: "string" }
      },
      required: ["expression"]
    },
    execute: ({ expression }) => eval(expression) // simplified
  }
];

// Create the code execution tool
const executeCode = createCodeExecutionTool(tools);

// Use with AI SDK
const result = await generateText({
  model: yourModel,
  messages: [{ role: "user", content: "What is 42 * 1337?" }],
  tools: { executeCode }
});
```

## Documentation

- [Architecture](./architecture.md) - System design and module structure
- [JSON Schema Transpiler](./json-schema-transpiler.md) - Transpiler details and supported features
- [Agent Module](./agent-module.md) - LLM code execution and tool system
- [API Reference](./api-reference.md) - Complete API documentation

## Project Structure

```
src/
├── index.ts           # Public API entry point
├── parser/            # JSON Schema → AST conversion
├── ast/               # AST type definitions
├── generator/         # AST → TypeScript code generation
├── agent/             # LLM code execution tool
├── sandbox/           # VM-based code execution
└── composio/          # Composio adapter for external tools
```

## Running Tests

```bash
bun test
```

## License

Private

