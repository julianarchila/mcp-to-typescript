import { test, expect, describe } from "bun:test";
import {
  executeWithTools,
  type Tool,
} from "../../src/agent/index.ts";

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
