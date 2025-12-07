import { test, expect, describe, beforeEach, mock } from "bun:test";
import {
  createCodeExecutionTool,
  createToolSandbox,
  executeInSandbox,
  executeWithTools,
  generateToolTypes,
  generateToolSummary,
  type Tool,
  type ToolCall,
  type SandboxResult,
} from "../src/agent/index.ts";

// ============================================================================
// Test Tools
// ============================================================================

const createTestTools = (): Tool[] => [
  {
    name: "add",
    description: "Adds two numbers together",
    parameters: {
      type: "object",
      properties: {
        a: { type: "number", description: "First number" },
        b: { type: "number", description: "Second number" },
      },
      required: ["a", "b"],
    },
    execute: (args: { a: number; b: number }) => args.a + args.b,
  },
  {
    name: "multiply",
    description: "Multiplies two numbers",
    parameters: {
      type: "object",
      properties: {
        x: { type: "number", description: "First factor" },
        y: { type: "number", description: "Second factor" },
      },
      required: ["x", "y"],
    },
    execute: (args: { x: number; y: number }) => args.x * args.y,
  },
  {
    name: "greet",
    description: "Returns a greeting message",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name to greet" },
        formal: { type: "boolean", description: "Use formal greeting" },
      },
      required: ["name"],
    },
    execute: (args: { name: string; formal?: boolean }) =>
      args.formal ? `Good day, ${args.name}.` : `Hello, ${args.name}!`,
  },
];

const createAsyncTools = (): Tool[] => [
  {
    name: "fetchData",
    description: "Fetches data asynchronously",
    parameters: {
      type: "object",
      properties: {
        id: { type: "number", description: "ID to fetch" },
      },
      required: ["id"],
    },
    execute: async (args: { id: number }) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { id: args.id, data: `Data for ${args.id}` };
    },
  },
  {
    name: "slowOperation",
    description: "A slow async operation",
    parameters: {
      type: "object",
      properties: {
        delay: { type: "number", description: "Delay in ms" },
      },
      required: ["delay"],
    },
    execute: async (args: { delay: number }) => {
      await new Promise((resolve) => setTimeout(resolve, args.delay));
      return { completed: true, delay: args.delay };
    },
  },
];

const createErrorTools = (): Tool[] => [
  {
    name: "alwaysFails",
    description: "A tool that always throws an error",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: () => {
      throw new Error("Intentional failure");
    },
  },
  {
    name: "conditionalError",
    description: "Throws error if shouldFail is true",
    parameters: {
      type: "object",
      properties: {
        shouldFail: { type: "boolean" },
      },
      required: ["shouldFail"],
    },
    execute: (args: { shouldFail: boolean }) => {
      if (args.shouldFail) {
        throw new Error("Conditional failure");
      }
      return { success: true };
    },
  },
];

// ============================================================================
// Sandbox Execution Tests
// ============================================================================

describe("Sandbox Execution", () => {
  describe("Basic execution", () => {
    test("executes simple code without tools", async () => {
      const result = await executeWithTools("const x = 1 + 2; return x;", []);
      expect(result.output).toBe(3);
      expect(result.error).toBeUndefined();
      expect(result.toolCalls).toHaveLength(0);
    });

    test("executes code with multiple statements", async () => {
      const code = `
        const a = 10;
        const b = 20;
        const c = a + b;
        return c * 2;
      `;
      const result = await executeWithTools(code, []);
      expect(result.output).toBe(60);
    });

    test("returns undefined for void code", async () => {
      const result = await executeWithTools("console.log('test');", []);
      expect(result.output).toBeUndefined();
    });

    test("handles syntax errors gracefully", async () => {
      const result = await executeWithTools("const x = ;", []);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("Unexpected token");
    });

    test("handles runtime errors gracefully", async () => {
      const result = await executeWithTools("nonExistentVariable;", []);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("not defined");
    });
  });

  describe("Tool execution", () => {
    test("calls sync tool and returns result", async () => {
      const tools = createTestTools();
      const result = await executeWithTools(
        "const sum = await add({ a: 5, b: 3 }); return sum;",
        tools
      );

      expect(result.output).toBe(8);
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0]!.name).toBe("add");
      expect(result.toolCalls[0]!.arguments).toEqual({ a: 5, b: 3 });
      expect(result.toolCalls[0]!.result).toBe(8);
    });

    test("calls multiple tools in sequence", async () => {
      const tools = createTestTools();
      const code = `
        const sum = await add({ a: 2, b: 3 });
        const product = await multiply({ x: sum, y: 4 });
        return product;
      `;
      const result = await executeWithTools(code, tools);

      expect(result.output).toBe(20); // (2+3) * 4
      expect(result.toolCalls).toHaveLength(2);
      expect(result.toolCalls[0]!.name).toBe("add");
      expect(result.toolCalls[1]!.name).toBe("multiply");
    });

    test("calls same tool multiple times", async () => {
      const tools = createTestTools();
      const code = `
        const a = await add({ a: 1, b: 2 });
        const b = await add({ a: 3, b: 4 });
        const c = await add({ a: a, b: b });
        return c;
      `;
      const result = await executeWithTools(code, tools);

      expect(result.output).toBe(10); // (1+2) + (3+4)
      expect(result.toolCalls).toHaveLength(3);
    });

    test("handles tool with optional parameters", async () => {
      const tools = createTestTools();

      // Without optional param
      const result1 = await executeWithTools(
        'return await greet({ name: "Alice" });',
        tools
      );
      expect(result1.toolCalls[0]!.result).toBe("Hello, Alice!");

      // With optional param
      const result2 = await executeWithTools(
        'return await greet({ name: "Bob", formal: true });',
        tools
      );
      expect(result2.toolCalls[0]!.result).toBe("Good day, Bob.");
    });
  });

  describe("Async tool execution", () => {
    test("waits for async tool to complete", async () => {
      const tools = createAsyncTools();
      const result = await executeWithTools(
        "const data = await fetchData({ id: 42 }); return data;",
        tools
      );

      expect(result.output).toEqual({ id: 42, data: "Data for 42" });
      expect(result.toolCalls[0]!.result).toEqual({ id: 42, data: "Data for 42" });
    });

    test("handles multiple async tools", async () => {
      const tools = createAsyncTools();
      const code = `
        const [a, b] = await Promise.all([
          fetchData({ id: 1 }),
          fetchData({ id: 2 })
        ]);
        return [a, b];
      `;
      const result = await executeWithTools(code, tools);

      expect(result.output).toHaveLength(2);
      expect(result.toolCalls).toHaveLength(2);
    });
  });

  describe("Error handling in tools", () => {
    test("captures tool errors and continues execution", async () => {
      const tools = createErrorTools();
      const result = await executeWithTools(
        `
        try {
          await alwaysFails({});
        } catch (e) {
          return 'caught';
        }
        `,
        tools
      );

      expect(result.output).toBe("caught");
      expect(result.toolCalls[0]!.error).toBe("Intentional failure");
      expect(result.toolCalls[0]!.result).toBeUndefined();
    });

    test("records error in tool call when tool throws", async () => {
      const tools = createErrorTools();
      const result = await executeWithTools(
        "return await conditionalError({ shouldFail: true });",
        tools
      );

      expect(result.error).toBeDefined();
      expect(result.toolCalls[0]!.error).toBe("Conditional failure");
    });

    test("records success when tool doesnt throw", async () => {
      const tools = createErrorTools();
      const result = await executeWithTools(
        "return await conditionalError({ shouldFail: false });",
        tools
      );

      expect(result.error).toBeUndefined();
      expect(result.toolCalls[0]!.result).toEqual({ success: true });
      expect(result.toolCalls[0]!.error).toBeUndefined();
    });
  });

  describe("Sandbox isolation", () => {
    test("does not expose Node.js globals", async () => {
      const result = await executeWithTools(
        "return typeof require !== 'undefined' ? 'exposed' : 'isolated';",
        []
      );
      expect(result.output).toBe("isolated");
    });

    test("does not expose process", async () => {
      const result = await executeWithTools(
        "return typeof process !== 'undefined' ? 'exposed' : 'isolated';",
        []
      );
      expect(result.output).toBe("isolated");
    });

    test("provides safe Math global", async () => {
      const result = await executeWithTools("return Math.floor(3.7);", []);
      expect(result.output).toBe(3);
    });

    test("provides safe JSON global", async () => {
      const result = await executeWithTools(
        'return JSON.stringify({ a: 1 });',
        []
      );
      expect(result.output).toBe('{"a":1}');
    });

    test("provides safe Date global", async () => {
      const result = await executeWithTools(
        "return new Date('2024-01-01').getFullYear();",
        []
      );
      expect(result.output).toBe(2024);
    });

    test("provides console.log", async () => {
      // Just ensure it doesn't throw
      const result = await executeWithTools(
        "console.log('test'); return 'done';",
        []
      );
      expect(result.output).toBe("done");
    });
  });

  describe("Execution options", () => {
    test("respects maxExecutionTime option for sync operations", async () => {
      // Test with a tight CPU-bound loop that will hit the sync timeout
      const result = await executeWithTools(
        "let i = 0; while(true) { i++; }", // Infinite loop
        [],
        { maxExecutionTime: 100 } // 100ms timeout
      );

      expect(result.error).toBeDefined();
      // The error message varies by runtime
    });
  });
});

// ============================================================================
// Tool Type Generation Tests
// ============================================================================

describe("Tool Type Generation", () => {
  describe("generateToolTypes", () => {
    test("generates function signature for simple tool", () => {
      const tools: Tool[] = [
        {
          name: "simpleFunc",
          description: "A simple function",
          parameters: {
            type: "object",
            properties: {
              input: { type: "string" },
            },
            required: ["input"],
          },
          execute: () => {},
        },
      ];

      const result = generateToolTypes(tools);

      expect(result).toContain("declare function simpleFunc");
      expect(result).toContain("A simple function");
      expect(result).toContain("input: string");
      expect(result).toContain("Promise<any>");
    });

    test("generates signatures for multiple tools", () => {
      const tools = createTestTools();
      const result = generateToolTypes(tools);

      expect(result).toContain("declare function add");
      expect(result).toContain("declare function multiply");
      expect(result).toContain("declare function greet");
    });

    test("includes parameter documentation", () => {
      const tools: Tool[] = [
        {
          name: "documented",
          description: "Well documented function",
          parameters: {
            type: "object",
            properties: {
              param1: { type: "string", description: "First parameter" },
              param2: { type: "number", description: "Second parameter" },
            },
            required: ["param1"],
          },
          execute: () => {},
        },
      ];

      const result = generateToolTypes(tools);

      expect(result).toContain("@param args.param1 - First parameter");
      expect(result).toContain("@param args.param2 (optional) - Second parameter");
    });

    test("handles tool with no parameters", () => {
      const tools: Tool[] = [
        {
          name: "noParams",
          description: "Takes no parameters",
          parameters: {
            type: "object",
            properties: {},
          },
          execute: () => "result",
        },
      ];

      const result = generateToolTypes(tools);

      expect(result).toContain("declare function noParams");
      expect(result).toContain("{}");
    });

    test("handles complex nested parameters", () => {
      const tools: Tool[] = [
        {
          name: "complexTool",
          description: "Has complex parameters",
          parameters: {
            type: "object",
            properties: {
              config: {
                type: "object",
                properties: {
                  enabled: { type: "boolean" },
                  value: { type: "number" },
                },
              },
              items: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["config"],
          },
          execute: () => {},
        },
      ];

      const result = generateToolTypes(tools);

      expect(result).toContain("config:");
      expect(result).toContain("enabled?: boolean");
      expect(result).toContain("items?: string[]");
    });
  });

  describe("generateToolSummary", () => {
    test("generates brief summary of tools", () => {
      const tools = createTestTools();
      const result = generateToolSummary(tools);

      expect(result).toContain("- add: Adds two numbers together");
      expect(result).toContain("- multiply: Multiplies two numbers");
      expect(result).toContain("- greet: Returns a greeting message");
    });

    test("handles multiline descriptions", () => {
      const tools: Tool[] = [
        {
          name: "multiLine",
          description: "First line\nSecond line\nThird line",
          parameters: { type: "object", properties: {} },
          execute: () => {},
        },
      ];

      const result = generateToolSummary(tools);

      // Should only include first line
      expect(result).toBe("- multiLine: First line");
    });
  });
});

// ============================================================================
// Code Execution Tool Tests
// ============================================================================

describe("createCodeExecutionTool", () => {
  test("creates a tool with correct structure", () => {
    const tools = createTestTools();
    const executeTool = createCodeExecutionTool(tools);

    expect(executeTool).toBeDefined();
    expect(executeTool.description).toBeDefined();
    expect(executeTool.inputSchema).toBeDefined();
    expect(executeTool.execute).toBeDefined();
  });

  test("description includes tool type definitions", () => {
    const tools = createTestTools();
    const executeTool = createCodeExecutionTool(tools);

    expect(executeTool.description).toContain("declare function add");
    expect(executeTool.description).toContain("declare function multiply");
    expect(executeTool.description).toContain("declare function greet");
  });

  test("description includes usage instructions", () => {
    const tools = createTestTools();
    const executeTool = createCodeExecutionTool(tools);

    expect(executeTool.description).toContain("async");
    expect(executeTool.description).toContain("await");
    expect(executeTool.description).toContain("return");
  });

  test("execute returns structured result on success", async () => {
    const tools = createTestTools();
    const executeTool = createCodeExecutionTool(tools);

    const result = await executeTool.execute!(
      { code: "const sum = await add({ a: 1, b: 2 }); return sum;", reasoning: "Adding two numbers" },
      { toolCallId: "test-1", messages: [] }
    ) as { success: boolean; toolCalls: any[]; output: any; error?: string };

    expect(result.success).toBe(true);
    expect(result.output).toBe(3);
    expect(result.error).toBeUndefined();
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]!.name).toBe("add");
  });

  test("execute returns structured result on error", async () => {
    const tools = createTestTools();
    const executeTool = createCodeExecutionTool(tools);

    const result = await executeTool.execute!(
      { code: "undefinedVariable;", reasoning: "This will fail" },
      { toolCallId: "test-2", messages: [] }
    ) as { success: boolean; toolCalls: any[]; output: any; error?: string };

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("passes options to sandbox", async () => {
    const executeTool = createCodeExecutionTool([], {
      maxExecutionTime: 50,
    });

    // Test with a sync infinite loop to trigger timeout
    const result = await executeTool.execute!(
      { code: "let i = 0; while(true) { i++; }", reasoning: "Testing timeout" },
      { toolCallId: "test-3", messages: [] }
    ) as { success: boolean; toolCalls: any[]; output: any; error?: string };

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================================================
// Sandbox Creation Tests
// ============================================================================

describe("createToolSandbox", () => {
  test("creates context with tool functions", () => {
    const tools = createTestTools();
    const sandbox = createToolSandbox(tools);

    expect(sandbox.context).toBeDefined();
    expect(sandbox.toolCalls).toEqual([]);
    expect(sandbox.pendingPromises).toEqual([]);
  });

  test("tool calls are tracked in toolCalls array", async () => {
    const tools = createTestTools();
    const sandbox = createToolSandbox(tools);

    await executeInSandbox(
      "return await add({ a: 1, b: 2 });",
      sandbox
    );

    expect(sandbox.toolCalls).toHaveLength(1);
    expect(sandbox.toolCalls[0]!.name).toBe("add");
    expect(sandbox.toolCalls[0]!.timestamp).toBeDefined();
  });

  test("multiple executions accumulate tool calls", async () => {
    const tools = createTestTools();
    const sandbox = createToolSandbox(tools);

    await executeInSandbox("return await add({ a: 1, b: 2 });", sandbox);
    await executeInSandbox("return await multiply({ x: 3, y: 4 });", sandbox);

    expect(sandbox.toolCalls).toHaveLength(2);
    expect(sandbox.toolCalls[0]!.name).toBe("add");
    expect(sandbox.toolCalls[1]!.name).toBe("multiply");
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Integration", () => {
  test("complete workflow: define tools, generate types, execute code", async () => {
    // 1. Define tools
    const tools: Tool[] = [
      {
        name: "getUser",
        description: "Gets a user by ID",
        parameters: {
          type: "object",
          properties: {
            userId: { type: "number", description: "User ID" },
          },
          required: ["userId"],
        },
        execute: (args: { userId: number }) => ({
          id: args.userId,
          name: `User ${args.userId}`,
          email: `user${args.userId}@example.com`,
        }),
      },
      {
        name: "sendEmail",
        description: "Sends an email",
        parameters: {
          type: "object",
          properties: {
            to: { type: "string", description: "Recipient email" },
            subject: { type: "string", description: "Email subject" },
            body: { type: "string", description: "Email body" },
          },
          required: ["to", "subject", "body"],
        },
        execute: (args: { to: string; subject: string; body: string }) => ({
          sent: true,
          to: args.to,
          subject: args.subject,
        }),
      },
    ];

    // 2. Generate type definitions
    const types = generateToolTypes(tools);
    expect(types).toContain("declare function getUser");
    expect(types).toContain("declare function sendEmail");

    // 3. Execute code that uses the tools (JavaScript, not TypeScript)
    const code = `
      const user = await getUser({ userId: 123 });
      const emailResult = await sendEmail({
        to: user.email,
        subject: "Welcome!",
        body: "Hello " + user.name
      });
      return { user: user, emailResult: emailResult };
    `;

    const result = await executeWithTools(code, tools);

    expect(result.error).toBeUndefined();
    expect(result.output.user).toEqual({
      id: 123,
      name: "User 123",
      email: "user123@example.com",
    });
    expect(result.output.emailResult.sent).toBe(true);
    expect(result.output.emailResult.to).toBe("user123@example.com");

    expect(result.toolCalls).toHaveLength(2);
    expect(result.toolCalls[0]!.name).toBe("getUser");
    expect(result.toolCalls[1]!.name).toBe("sendEmail");
  });

  test("handles complex data transformations", async () => {
    const tools: Tool[] = [
      {
        name: "getData",
        description: "Gets array of numbers",
        parameters: { type: "object", properties: {} },
        execute: () => [1, 2, 3, 4, 5],
      },
    ];

    const code = `
      const numbers = await getData({});
      const doubled = numbers.map(function(n) { return n * 2; });
      const sum = doubled.reduce(function(a, b) { return a + b; }, 0);
      return { numbers: numbers, doubled: doubled, sum: sum };
    `;

    const result = await executeWithTools(code, tools);

    expect(result.output.numbers).toEqual([1, 2, 3, 4, 5]);
    expect(result.output.doubled).toEqual([2, 4, 6, 8, 10]);
    expect(result.output.sum).toBe(30);
  });
});

