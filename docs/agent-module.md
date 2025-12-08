# Agent Module

The Agent module provides a secure way for LLMs to execute code with access to custom tools. It creates an AI SDK-compatible tool that runs LLM-generated JavaScript in a sandboxed VM environment.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Agent Architecture                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌───────┐                                                             │
│   │  LLM  │  Generates code that calls your tools                       │
│   └───┬───┘                                                             │
│       │                                                                 │
│       ▼                                                                 │
│   ┌───────────────────┐                                                 │
│   │ executeCode Tool  │  AI SDK tool wrapping the sandbox               │
│   └─────────┬─────────┘                                                 │
│             │                                                           │
│             ▼                                                           │
│   ┌───────────────────┐     ┌────────────────────┐                      │
│   │   VM Sandbox      │ ──▶ │   Tool Proxies     │                      │
│   │  (Isolated env)   │     │ (Track all calls)  │                      │
│   └─────────┬─────────┘     └────────────────────┘                      │
│             │                                                           │
│             ▼                                                           │
│   ┌───────────────────┐                                                 │
│   │     Results       │  output + toolCalls[] + error                   │
│   └───────────────────┘                                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Define Your Tools

```typescript
import type { Tool } from "./src/agent/types.ts";

const tools: Tool[] = [
  {
    name: "fetchWeather",
    description: "Gets current weather for a city",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "City name" }
      },
      required: ["city"]
    },
    execute: async ({ city }) => {
      const response = await fetch(`https://api.weather.com/${city}`);
      return response.json();
    }
  },
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
    execute: ({ expression }) => {
      // Safe math evaluation
      return { result: eval(expression) };
    }
  }
];
```

### 2. Create the Code Execution Tool

```typescript
import { createCodeExecutionTool } from "./src/agent/index.ts";

const executeCode = createCodeExecutionTool(tools, {
  maxExecutionTime: 30000  // 30 second timeout
});
```

### 3. Use with AI SDK

```typescript
import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

const result = await generateText({
  model: openrouter.chat("anthropic/claude-sonnet-4"),
  messages: [
    { role: "user", content: "What's the weather in Tokyo and convert 68°F to Celsius" }
  ],
  tools: { executeCode },
  maxSteps: 10
});

console.log(result.text);
```

The LLM will generate and execute code like:

```javascript
const weather = await fetchWeather({ city: "Tokyo" });
const celsius = await calculate({ expression: "(68 - 32) * 5/9" });
return { weather, celsius: celsius.result };
```

## Tool Definition

### Tool Interface

```typescript
type Tool = {
  /** Unique name (used as function name in sandbox) */
  name: string;
  
  /** Description shown to LLM */
  description: string;
  
  /** JSON Schema for parameters */
  parameters: {
    type: "object";
    properties: Record<string, JSONSchema>;
    required?: string[];
  };
  
  /** Implementation function */
  execute: (args: any) => Promise<any> | any;
};
```

### Parameter Schema

Tool parameters use JSON Schema format. The transpiler generates TypeScript signatures from these schemas for the LLM prompt:

```typescript
const tool: Tool = {
  name: "createUser",
  description: "Creates a new user account",
  parameters: {
    type: "object",
    properties: {
      username: { type: "string", description: "Unique username" },
      email: { type: "string", description: "Email address" },
      age: { type: "integer", description: "User age" },
      roles: {
        type: "array",
        items: { enum: ["admin", "user", "moderator"] },
        description: "User roles"
      }
    },
    required: ["username", "email"]
  },
  execute: async (args) => { /* ... */ }
};
```

This generates the following for the LLM:

```typescript
/**
 * Creates a new user account
 * @param args.username - Unique username
 * @param args.email - Email address
 * @param args.age (optional) - User age
 * @param args.roles (optional) - User roles
 */
declare function createUser(args: {
  username: string;
  email: string;
  age?: number;
  roles?: ("admin" | "user" | "moderator")[];
}): Promise<any>;
```

## Sandbox Environment

### Safe Globals

The sandbox provides limited, safe globals:

| Global | Notes |
|--------|-------|
| `console.log/error/warn` | Prefixed with `[sandbox]` |
| `JSON` | Full `JSON` object |
| `Math` | Full `Math` object |
| `Date` | Full `Date` constructor |
| `Array`, `Object`, `String`, `Number`, `Boolean` | Constructors |
| `Promise` | For async operations |
| `setTimeout` | Limited to 5 seconds max |

### Not Available

The following are **not** exposed (for security):

- `require` / `import`
- `process`
- `global` / `globalThis`
- `__dirname` / `__filename`
- `fetch` (unless provided as a tool)
- `eval` / `Function` constructor
- File system access
- Network access

### Execution Timeout

Code execution has a configurable timeout (default 30 seconds):

```typescript
const executeCode = createCodeExecutionTool(tools, {
  maxExecutionTime: 10000  // 10 seconds
});
```

If code exceeds this limit, execution terminates with an error.

## Execution Results

### Result Structure

```typescript
type SandboxResult = {
  /** All tool calls made during execution */
  toolCalls: ToolCall[];
  
  /** Final return value from the code */
  output: any;
  
  /** Error if execution failed */
  error?: Error;
};

type ToolCall = {
  name: string;
  arguments: any;
  result?: any;
  error?: any;
  timestamp: number;
};
```

### Tool Response Format

When used as an AI SDK tool, the response includes:

```typescript
{
  success: boolean;
  output: any;          // Return value from code
  error?: string;       // Error message if failed
  toolCalls: [{
    name: string;
    arguments: any;
    result?: any;
    error?: any;
  }]
}
```

## Low-Level API

For advanced use cases, you can use the sandbox directly:

### `executeWithTools(code, tools, options)`

Execute code with tools in a single call:

```typescript
import { executeWithTools } from "./src/agent/index.ts";

const result = await executeWithTools(
  `
    const a = await add({ a: 5, b: 3 });
    const b = await multiply({ x: a, y: 2 });
    return b;
  `,
  tools,
  { maxExecutionTime: 5000 }
);

console.log(result.output);     // 16
console.log(result.toolCalls);  // [{ name: "add", ... }, { name: "multiply", ... }]
```

### `createToolSandbox(tools)` + `executeInSandbox(code, sandbox)`

For multiple executions sharing the same context:

```typescript
import { createToolSandbox, executeInSandbox } from "./src/agent/index.ts";

const sandbox = createToolSandbox(tools);

// First execution
await executeInSandbox("const x = await add({ a: 1, b: 2 });", sandbox);

// Second execution - toolCalls accumulate
await executeInSandbox("const y = await multiply({ x: 3, y: 4 });", sandbox);

console.log(sandbox.toolCalls.length);  // 2
```

## Type Generation Utilities

### `generateToolTypes(tools)`

Generates TypeScript function signatures for LLM prompts:

```typescript
import { generateToolTypes } from "./src/agent/index.ts";

const types = generateToolTypes(tools);
// Returns:
// /**
//  * Gets current weather for a city
//  * @param args.city - City name
//  */
// declare function fetchWeather(args: { city: string; }): Promise<any>;
```

### `generateToolSummary(tools)`

Generates a brief summary list:

```typescript
import { generateToolSummary } from "./src/agent/index.ts";

const summary = generateToolSummary(tools);
// Returns:
// - fetchWeather: Gets current weather for a city
// - calculate: Performs math calculations
```

## Composio Integration

Connect to external APIs using Composio:

```typescript
import { getComposioTools } from "./src/composio/adapter.ts";

// Fetch tools from Composio
const composioTools = await getComposioTools({
  toolkits: ["GOOGLESHEETS", "GITHUB"],
  userId: "your-composio-user-id"
});

// Use like any other tools
const executeCode = createCodeExecutionTool(composioTools);
```

### Available Toolkits

- `GOOGLESHEETS` - Google Sheets operations
- `GITHUB` - GitHub API
- Many more via Composio platform

### Environment Variables

```bash
COMPOSIO_API_KEY=your_api_key
COMPOSIO_USER_ID=your_user_id
```

## Error Handling

### Syntax Errors

```typescript
const result = await executeWithTools("const x = ;", []);
// result.error.message contains "Unexpected token"
```

### Runtime Errors

```typescript
const result = await executeWithTools("undefinedVariable;", []);
// result.error.message contains "not defined"
```

### Tool Errors

```typescript
const tools: Tool[] = [{
  name: "failingTool",
  execute: () => { throw new Error("Tool failed"); },
  // ...
}];

const result = await executeWithTools(
  "try { await failingTool({}); } catch (e) { return 'caught'; }",
  tools
);
// result.output === 'caught'
// result.toolCalls[0].error === 'Tool failed'
```

## Best Practices

### 1. Keep Tools Focused

Each tool should do one thing well:

```typescript
// Good: Single responsibility
{ name: "getUser", execute: (args) => db.users.find(args.id) }
{ name: "updateUser", execute: (args) => db.users.update(args) }

// Bad: Too broad
{ name: "manageUsers", execute: (args) => { /* many operations */ } }
```

### 2. Provide Clear Descriptions

The LLM uses descriptions to decide when/how to use tools:

```typescript
{
  name: "searchProducts",
  description: "Searches products by name, category, or price range. Returns up to 10 results sorted by relevance.",
  // ...
}
```

### 3. Return Structured Data

Tools should return objects, not strings:

```typescript
// Good: Structured response
execute: () => ({ status: "success", count: 42, items: [...] })

// Bad: String response  
execute: () => "Found 42 items"
```

### 4. Handle Errors Gracefully

Return error information instead of throwing when possible:

```typescript
execute: async (args) => {
  try {
    const result = await riskyOperation(args);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
```

