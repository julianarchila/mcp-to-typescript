import { test, expect, describe } from "bun:test";
import {
  createCodeExecutionTool,
  createToolSandbox,
  executeInSandbox,
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
    ) as CodeExecutionResult;

    expect(result.success).toBe(true);
    expect(result.output).toBe(3);
    expect(result.error).toBeUndefined();
    expect(result.toolCallSummary).toEqual({ add: 1 });
  });

  test("execute returns structured result on error", async () => {
    const tools = createTestTools();
    const executeTool = createCodeExecutionTool(tools);

    const result = await executeTool.execute!(
      { code: "undefinedVariable;", reasoning: "This will fail" },
      { toolCallId: "test-2", messages: [] }
    ) as CodeExecutionResult;

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
    ) as CodeExecutionResult;

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
