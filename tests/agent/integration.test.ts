import { test, expect, describe } from "bun:test";
import {
  createCodeExecutionTool,
  executeWithTools,
  generateToolTypes,
  type Tool,
  type CodeExecutionResult,
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

// ============================================================================
// Log Capture and Context Management Tests
// ============================================================================

describe("Log Capture and Context Management", () => {
  test("captures console.log output in logs array", async () => {
    const tools = createTestTools();
    const result = await executeWithTools(
      `
      console.log("First log");
      const sum = await add({ a: 1, b: 2 });
      console.log("Sum is:", sum);
      return sum;
      `,
      tools
    );

    expect(result.logs).toHaveLength(2);
    expect(result.logs[0]).toBe("First log");
    expect(result.logs[1]).toBe("Sum is: 3");
  });

  test("captures console.error and console.warn with prefixes", async () => {
    const result = await executeWithTools(
      `
      console.log("normal log");
      console.error("error log");
      console.warn("warning log");
      return "done";
      `,
      []
    );

    expect(result.logs).toHaveLength(3);
    expect(result.logs[0]).toBe("normal log");
    expect(result.logs[1]).toBe("ERROR: error log");
    expect(result.logs[2]).toBe("WARN: warning log");
  });

  test("formats objects in console.log as JSON", async () => {
    const result = await executeWithTools(
      `
      const obj = { name: "test", count: 42 };
      console.log("Object:", obj);
      return "done";
      `,
      []
    );

    expect(result.logs).toHaveLength(1);
    expect(result.logs[0]).toContain('"name": "test"');
    expect(result.logs[0]).toContain('"count": 42');
  });

  test("returns empty logs array when no console calls", async () => {
    const result = await executeWithTools("return 42;", []);

    expect(result.logs).toHaveLength(0);
  });

  test("does not print logs to stdout", async () => {
    // This test verifies that logs are captured, not printed
    const originalLog = console.log;
    let stdoutCalls = 0;
    
    console.log = (...args: any[]) => {
      if (!args[0]?.includes("[executeCode]")) {
        stdoutCalls++;
      }
    };

    const result = await executeWithTools(
      'console.log("test"); return "done";',
      []
    );

    console.log = originalLog;

    expect(result.logs).toHaveLength(1);
    expect(stdoutCalls).toBe(0); // No stdout calls except from executeCode
  });
});

describe("Code Execution Tool - Minimal Context Mode", () => {
  test("returns minimal response by default (no full tool results)", async () => {
    const tools = createTestTools();
    const executeTool = createCodeExecutionTool(tools);

    const result = await executeTool.execute!(
      {
        code: `
          const sum = await add({ a: 5, b: 3 });
          const product = await multiply({ x: 2, y: 4 });
          return { sum, product };
        `,
        reasoning: "Testing minimal context",
      },
      { toolCallId: "test-1", messages: [] }
    ) as CodeExecutionResult;

    expect(result.success).toBe(true);
    expect(result.output).toEqual({ sum: 8, product: 8 });
    
    // Should have tool call summary with counts
    expect(result.toolCallSummary).toEqual({
      add: 1,
      multiply: 1,
    });
  });

  test("includes logs in response", async () => {
    const tools = createTestTools();
    const executeTool = createCodeExecutionTool(tools);

    const result = await executeTool.execute!(
      {
        code: `
          console.log("Starting calculation");
          const sum = await add({ a: 5, b: 3 });
          console.log("Sum:", sum);
          return sum;
        `,
        reasoning: "Testing logs",
      },
      { toolCallId: "test-2", messages: [] }
    ) as CodeExecutionResult;

    expect(result.logs).toHaveLength(2);
    expect(result.logs[0]).toBe("Starting calculation");
    expect(result.logs[1]).toBe("Sum: 8");
  });

  test("counts multiple calls to same tool", async () => {
    const tools = createTestTools();
    const executeTool = createCodeExecutionTool(tools);

    const result = await executeTool.execute!(
      {
        code: `
          await add({ a: 1, b: 2 });
          await add({ a: 3, b: 4 });
          await add({ a: 5, b: 6 });
          return "done";
        `,
        reasoning: "Testing tool call counting",
      },
      { toolCallId: "test-3", messages: [] }
    ) as CodeExecutionResult;

    expect(result.toolCallSummary).toEqual({ add: 3 });
  });
});

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
